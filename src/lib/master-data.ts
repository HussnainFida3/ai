"use client";

/**
 * Master AI — normalized fleet telemetry for the special workspace.
 *
 * The Master agent is the only agent whose subject is the other agents, and
 * the two backends expose that fleet view through genuinely different routes.
 * This file is the one place that difference is absorbed:
 *
 *   GhrFix    GET /ai-agents/master/overview
 *               -> FleetRow[] { agentKey, label, callsToday, callsThisMonth, spendThisMonthUsd }
 *             GET /ai-agents/master/budget
 *               -> { spentUsd, budgetUsd, pctUsed }
 *             GET /ai-agents/master/activity?page&pageSize
 *               -> AgentActivityEntry[] — the MASTER agent's own audited writes,
 *                  not a fleet-wide event log. Labelled as such everywhere.
 *             (found in src/components/agents/views/ghrfix/master.tsx and
 *              src/components/agents/views/domain/ghrfix/master.tsx)
 *
 *             Fallback: if /overview is unavailable, every agent in the
 *             registry is asked for its own GET /ai-agents/<key>/stats via
 *             Promise.allSettled, so one dead agent degrades to "did not
 *             report" instead of blanking the whole fleet.
 *
 *   ShadiLife GET /ai-agents/_meta/usage
 *               -> { model, monthlyBudgetUsd, byAgent:[{agent, spendUsd, calls}] }
 *             GET /ai-agents/_meta/activity
 *               -> { events:[{id, kind, agent, endpoint, targetType, status, costUsd, createdAt}] }
 *             ShadiLife has NO per-agent stats route at all — the shared
 *             `_meta` layer already covers every agent, which is exactly the
 *             shape a fleet view wants. Its activity feed IS fleet-wide, so
 *             it is the only platform here with a real time series.
 *             (found in src/components/agents/views/shadilife/master.tsx,
 *              src/components/agents/views/domain/shadilife/master.tsx and
 *              documented in src/lib/api.ts)
 *
 * THE CENTRAL HONESTY RULE OF THIS FILE: an agent that failed to report is
 * not an agent with zero calls. `reported: false` rows carry `calls: null`
 * and `spendUsd: null`, are excluded from every total, chart and ranking,
 * and are counted separately in `unreportedCount` so the UI can name them.
 * A metric a platform genuinely does not track (GhrFix tokens, ShadiLife
 * per-day call counts) stays `null` with a note — never zero.
 *
 * READ-ONLY. Nothing here writes.
 */

import { useEffect, useMemo, useState } from "react";
import { apiFetch, ApiError } from "./api";
import { platformLabel } from "./agent-data";
import { PLATFORMS, type PlatformKey } from "./platforms";

/* ── Public shape ───────────────────────────────────────────────────── */

/** One agent in the fleet. `null` numbers mean "did not report", never "zero". */
export interface FleetAgentRow {
  key: string;
  name: string;
  tag: string;
  accent: string;
  /** Calls this month. null when this agent did not report. */
  calls: number | null;
  /** Spend this month, USD. null when this agent did not report. */
  spendUsd: number | null;
  /** GhrFix only — ShadiLife's usage route has no daily granularity. */
  callsToday: number | null;
  /** True when the backend returned a row for this agent. */
  reported: boolean;
  /** Why the row is missing, when it is. */
  failureReason: string | null;
  /** Newest event seen for this agent in a fleet-wide activity feed, if any. */
  lastActivityIso: string | null;
  /** Share of fleet calls, 0-100. null when unreported or the total is zero. */
  callSharePct: number | null;
  /** Share of fleet spend, 0-100. null when unreported or the total is zero. */
  spendSharePct: number | null;
  /** USD per call. null when unreported or the agent made no calls. */
  costPerCallUsd: number | null;
}

export interface MasterEvent {
  id: string;
  kind: string;
  agentKey: string;
  agentName: string;
  endpoint: string | null;
  targetType: string | null;
  status: string | null;
  costUsd: number | null;
  createdAt: string;
}

export interface NamedValue {
  label: string;
  value: number;
}

export interface MasterSnapshot {
  platform: PlatformKey;
  loading: boolean;
  error: string | null;

  /** Every registry agent except Master itself, reported or not. */
  rows: FleetAgentRow[];
  registryCount: number;
  reportedCount: number;
  unreportedCount: number;
  /** Reported AND with calls > 0. */
  activeCount: number;
  /** Reported AND genuinely zero — distinct from unreported. */
  idleCount: number;

  /** Totals over reported agents only. null when nothing reported. */
  totalCalls: number | null;
  totalSpendUsd: number | null;
  monthlyBudgetUsd: number | null;
  budgetUsedPct: number | null;
  fleetCostPerCallUsd: number | null;
  model: string | null;

  busiest: FleetAgentRow | null;
  topSpender: FleetAgentRow | null;

  /** Top 5 + folded "Other" — the palette is 6 colours and is never extended. */
  callsByAgent: NamedValue[];
  spendByAgent: NamedValue[];
  /** Registry categories — naturally low cardinality. */
  callsByTag: NamedValue[];
  spendByTag: NamedValue[];

  events: MasterEvent[];
  eventScopeNote: string;
  eventsByKind: NamedValue[];
  eventsByAgent: NamedValue[];
  recencyBuckets: NamedValue[];

  /** A real per-day series derived from event `createdAt`, or null. */
  series: { labels: string[]; calls: number[] } | null;
  seriesNote: string;

  /** Metrics this platform genuinely does not record. */
  callsTodayTracked: boolean;
  tokensTracked: boolean;

  sourceNote: string;
  coverageNote: string;
}

/* ── Raw backend shapes ─────────────────────────────────────────────── */

interface GhrFixFleetRow {
  agentKey: string;
  label: string;
  callsToday?: number;
  callsThisMonth?: number;
  spendThisMonthUsd?: number;
}
interface GhrFixBudget {
  spentUsd?: number;
  budgetUsd?: number;
  pctUsed?: number;
}
interface GhrFixActivityRow {
  id: string;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  createdAt: string;
}
interface ShadiUsage {
  model?: string;
  monthlyBudgetUsd?: number;
  byAgent?: Array<{ agent: string; spendUsd?: number; calls?: number }>;
}
interface ShadiEvent {
  id: string;
  kind?: string;
  agent?: string;
  endpoint?: string;
  targetType?: string;
  status?: string;
  costUsd?: number;
  createdAt: string;
}
interface ShadiActivity {
  events?: ShadiEvent[];
}
interface AgentStatsRow {
  callsThisMonth?: number;
  callsToday?: number;
  spendThisMonthUsd?: number;
  monthlyBudgetUsd?: number;
  model?: string;
  tokensThisMonth?: number;
}

/* ── Helpers ────────────────────────────────────────────────────────── */

/** Prisma Decimal columns arrive as strings — coerce without inventing a value. */
function num(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function pctOf(part: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.round((part / total) * 1000) / 10;
}

/**
 * The series palette is exactly six validated colours and is never extended,
 * so a cut with more than six categories keeps its top five and folds the
 * rest into one honest "Other" slice rather than inventing hues.
 */
export function foldTail(rows: NamedValue[], keep = 5): NamedValue[] {
  const sorted = [...rows].filter((r) => r.value > 0).sort((a, b) => b.value - a.value);
  if (sorted.length <= keep + 1) return sorted;
  const head = sorted.slice(0, keep);
  const tail = sorted.slice(keep);
  const rest = tail.reduce((a, r) => a + r.value, 0);
  return rest > 0 ? [...head, { label: `Other (${tail.length} agents)`, value: Math.round(rest * 100) / 100 }] : head;
}

export function usd(v: number | null | undefined, digits = 2): string {
  return v === null || v === undefined || !Number.isFinite(v) ? "—" : `$${v.toFixed(digits)}`;
}

export function count(v: number | null | undefined): string {
  return v === null || v === undefined || !Number.isFinite(v) ? "—" : v.toLocaleString();
}

export function ago(iso?: string | null): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const mins = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export function dateTime(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function errText(e: unknown, fallback: string): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error && e.message) return e.message;
  return fallback;
}

/* ── Loader ─────────────────────────────────────────────────────────── */

interface RawRow {
  key: string;
  calls: number | null;
  spendUsd: number | null;
  callsToday: number | null;
  reported: boolean;
  failureReason: string | null;
}

interface Loaded {
  rowsRaw: RawRow[];
  budgetUsd: number | null;
  spentUsdReported: number | null;
  model: string | null;
  events: MasterEvent[];
  eventScopeNote: string;
  /** True only when the event feed genuinely covers the whole fleet. */
  fleetWideEvents: boolean;
  callsTodayTracked: boolean;
  tokensTracked: boolean;
  sourceNote: string;
}

/** The fleet is every registry agent except Master itself — it does not audit itself. */
function fleetAgents(platform: PlatformKey) {
  return PLATFORMS[platform].agents.filter((a) => a.key !== "master");
}

async function loadGhrFix(): Promise<Loaded> {
  const agents = fleetAgents("ghrfix");

  const [overviewRes, budgetRes, activityRes] = await Promise.allSettled([
    apiFetch<GhrFixFleetRow[]>("ghrfix", "/ai-agents/master/overview"),
    apiFetch<GhrFixBudget>("ghrfix", "/ai-agents/master/budget"),
    apiFetch<GhrFixActivityRow[]>("ghrfix", "/ai-agents/master/activity", { query: { page: 1, pageSize: 100 } }),
  ]);

  let rowsRaw: RawRow[] = [];
  let sourceNote =
    "GhrFix: fleet from GET /ai-agents/master/overview, budget from GET /ai-agents/master/budget, events from GET /ai-agents/master/activity.";

  const overviewOk =
    overviewRes.status === "fulfilled" && Array.isArray(overviewRes.value.data) && overviewRes.value.data.length > 0;

  if (overviewOk) {
    const byKey = new Map<string, GhrFixFleetRow>();
    for (const r of overviewRes.value.data) if (r && typeof r.agentKey === "string") byKey.set(r.agentKey, r);
    rowsRaw = agents.map((a) => {
      const r = byKey.get(a.key);
      if (!r) {
        return {
          key: a.key,
          calls: null,
          spendUsd: null,
          callsToday: null,
          reported: false,
          failureReason: "Not present in /ai-agents/master/overview",
        };
      }
      return {
        key: a.key,
        calls: num(r.callsThisMonth) ?? 0,
        spendUsd: num(r.spendThisMonthUsd) ?? 0,
        callsToday: num(r.callsToday),
        reported: true,
        failureReason: null,
      };
    });
  } else {
    /* Fan-out fallback: ask every agent for its own /stats. One failure must
       degrade that single row to "did not report", never the whole fleet. */
    const reason =
      overviewRes.status === "rejected"
        ? errText(overviewRes.reason, "the call failed")
        : "it returned no rows";
    sourceNote = `GhrFix: /ai-agents/master/overview was unavailable (${reason}), so the fleet was rebuilt by calling each agent's own GET /ai-agents/<key>/stats individually.`;
    const settled = await Promise.allSettled(
      agents.map((a) => apiFetch<AgentStatsRow>("ghrfix", `/ai-agents/${a.key}/stats`)),
    );
    rowsRaw = agents.map((a, i) => {
      const s = settled[i];
      if (s.status !== "fulfilled") {
        return {
          key: a.key,
          calls: null,
          spendUsd: null,
          callsToday: null,
          reported: false,
          failureReason: errText(s.reason, "its /stats call failed"),
        };
      }
      return {
        key: a.key,
        calls: num(s.value.data.callsThisMonth) ?? 0,
        spendUsd: num(s.value.data.spendThisMonthUsd) ?? 0,
        callsToday: num(s.value.data.callsToday),
        reported: true,
        failureReason: null,
      };
    });
  }

  if (rowsRaw.every((r) => !r.reported)) {
    throw new ApiError("GhrFix returned no fleet data — not one agent reported.", "EMPTY", 0);
  }

  const budget = budgetRes.status === "fulfilled" ? budgetRes.value.data : null;

  const events: MasterEvent[] =
    activityRes.status === "fulfilled" && Array.isArray(activityRes.value.data)
      ? activityRes.value.data.map((e) => ({
          id: e.id,
          kind: e.targetType ?? "Audited write",
          agentKey: "master",
          agentName: "Master AI",
          endpoint: null,
          targetType: e.targetType ?? null,
          status: e.action ?? null,
          costUsd: null,
          createdAt: e.createdAt,
        }))
      : [];

  return {
    rowsRaw,
    budgetUsd: budget ? num(budget.budgetUsd) : null,
    spentUsdReported: budget ? num(budget.spentUsd) : null,
    model: null,
    events,
    eventScopeNote:
      "GhrFix keeps each agent's audit log under that agent, so this feed is the Master agent's own audited writes — not a fleet-wide event stream. Per-agent call volume comes from /ai-agents/master/overview instead.",
    fleetWideEvents: false,
    callsTodayTracked: true,
    tokensTracked: false,
    sourceNote,
  };
}

async function loadShadiLife(): Promise<Loaded> {
  const agents = fleetAgents("shadilife");
  const nameOf = (k: string) => agents.find((a) => a.key === k)?.name ?? k;

  const [usageRes, activityRes] = await Promise.allSettled([
    apiFetch<ShadiUsage>("shadilife", "/ai-agents/_meta/usage"),
    apiFetch<ShadiActivity>("shadilife", "/ai-agents/_meta/activity"),
  ]);

  if (usageRes.status !== "fulfilled") {
    throw usageRes.reason instanceof Error
      ? usageRes.reason
      : new ApiError("ShadiLife's shared usage endpoint failed.", "ERROR", 0);
  }

  const usage = usageRes.value.data;
  const byAgent = new Map<string, { spendUsd?: number; calls?: number }>();
  for (const r of usage.byAgent ?? []) if (r && typeof r.agent === "string") byAgent.set(r.agent, r);

  const rowsRaw: RawRow[] = agents.map((a) => {
    const r = byAgent.get(a.key);
    if (!r) {
      return {
        key: a.key,
        calls: null,
        spendUsd: null,
        callsToday: null,
        reported: false,
        failureReason: "Absent from the byAgent list in /ai-agents/_meta/usage",
      };
    }
    return {
      key: a.key,
      calls: num(r.calls) ?? 0,
      spendUsd: num(r.spendUsd) ?? 0,
      callsToday: null,
      reported: true,
      failureReason: null,
    };
  });

  const events: MasterEvent[] =
    activityRes.status === "fulfilled" && Array.isArray(activityRes.value.data?.events)
      ? (activityRes.value.data.events ?? []).map((e) => ({
          id: e.id,
          kind: e.kind ?? "call",
          agentKey: e.agent ?? "unknown",
          agentName: e.agent ? nameOf(e.agent) : "Unknown agent",
          endpoint: e.endpoint ?? null,
          targetType: e.targetType ?? null,
          status: e.status ?? null,
          costUsd: num(e.costUsd),
          createdAt: e.createdAt,
        }))
      : [];

  return {
    rowsRaw,
    budgetUsd: num(usage.monthlyBudgetUsd),
    spentUsdReported: null,
    model: typeof usage.model === "string" ? usage.model : null,
    events,
    eventScopeNote:
      "ShadiLife logs every AI call and suggestion for every agent in one shared feed, so this is a genuinely fleet-wide event stream.",
    fleetWideEvents: true,
    callsTodayTracked: false,
    tokensTracked: false,
    sourceNote:
      "ShadiLife: fleet from GET /ai-agents/_meta/usage, events from GET /ai-agents/_meta/activity. ShadiLife has no per-agent stats route — the shared _meta layer already covers every agent.",
  };
}

/* ── Hook ───────────────────────────────────────────────────────────── */

export function useMasterSnapshot(platform: PlatformKey): MasterSnapshot {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const label = platformLabel(platform);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setLoaded(null);

    (platform === "ghrfix" ? loadGhrFix() : loadShadiLife())
      .then((d) => {
        if (!cancelled) setLoaded(d);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(errText(e, `Could not reach the ${label} agent fleet.`));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [platform, label]);

  return useMemo<MasterSnapshot>(() => {
    const agents = fleetAgents(platform);

    if (!loaded) {
      return {
        platform,
        loading,
        error,
        rows: [],
        registryCount: agents.length,
        reportedCount: 0,
        unreportedCount: 0,
        activeCount: 0,
        idleCount: 0,
        totalCalls: null,
        totalSpendUsd: null,
        monthlyBudgetUsd: null,
        budgetUsedPct: null,
        fleetCostPerCallUsd: null,
        model: null,
        busiest: null,
        topSpender: null,
        callsByAgent: [],
        spendByAgent: [],
        callsByTag: [],
        spendByTag: [],
        events: [],
        eventScopeNote: "",
        eventsByKind: [],
        eventsByAgent: [],
        recencyBuckets: [],
        series: null,
        seriesNote: "",
        callsTodayTracked: false,
        tokensTracked: false,
        sourceNote: "",
        coverageNote: "",
      };
    }

    const meta = new Map(agents.map((a) => [a.key, a]));

    /* Newest event per agent — only a fleet-wide feed can answer this, so on
       GhrFix it stays null rather than pretending the master log covers all. */
    const lastSeen = new Map<string, string>();
    if (loaded.fleetWideEvents) {
      for (const e of loaded.events) {
        const prev = lastSeen.get(e.agentKey);
        if (!prev || new Date(e.createdAt).getTime() > new Date(prev).getTime()) lastSeen.set(e.agentKey, e.createdAt);
      }
    }

    const reportedRaw = loaded.rowsRaw.filter((r) => r.reported);
    const totalCalls = reportedRaw.length > 0 ? reportedRaw.reduce((a, r) => a + (r.calls ?? 0), 0) : null;
    const totalSpendUsd = reportedRaw.length > 0 ? reportedRaw.reduce((a, r) => a + (r.spendUsd ?? 0), 0) : null;

    const rows: FleetAgentRow[] = loaded.rowsRaw.map((r) => {
      const def = meta.get(r.key);
      return {
        key: r.key,
        name: def?.name ?? r.key,
        tag: def?.tag ?? "Uncategorised",
        accent: def?.accent ?? "#7c3aed",
        calls: r.calls,
        spendUsd: r.spendUsd,
        callsToday: r.callsToday,
        reported: r.reported,
        failureReason: r.failureReason,
        lastActivityIso: lastSeen.get(r.key) ?? null,
        callSharePct: r.reported && totalCalls !== null ? pctOf(r.calls ?? 0, totalCalls) : null,
        spendSharePct: r.reported && totalSpendUsd !== null ? pctOf(r.spendUsd ?? 0, totalSpendUsd) : null,
        costPerCallUsd: r.reported && (r.calls ?? 0) > 0 ? (r.spendUsd ?? 0) / (r.calls as number) : null,
      };
    });

    const reportedRows = rows.filter((r) => r.reported);
    const unreportedCount = rows.length - reportedRows.length;
    const activeCount = reportedRows.filter((r) => (r.calls ?? 0) > 0).length;

    const busiest = [...reportedRows].sort((a, b) => (b.calls ?? 0) - (a.calls ?? 0))[0] ?? null;
    const topSpender = [...reportedRows].sort((a, b) => (b.spendUsd ?? 0) - (a.spendUsd ?? 0))[0] ?? null;

    const callsByAgent = foldTail(reportedRows.map((r) => ({ label: r.name, value: r.calls ?? 0 })));
    const spendByAgent = foldTail(
      reportedRows.map((r) => ({ label: r.name, value: Math.round((r.spendUsd ?? 0) * 100) / 100 })),
    );

    const byTag = (pick: (r: FleetAgentRow) => number): NamedValue[] => {
      const m = new Map<string, number>();
      for (const r of reportedRows) m.set(r.tag, (m.get(r.tag) ?? 0) + pick(r));
      return foldTail([...m.entries()].map(([label, value]) => ({ label, value: Math.round(value * 100) / 100 })));
    };

    /* Event cuts — all straight counts over the real feed. */
    const kindMap = new Map<string, number>();
    const agentEventMap = new Map<string, number>();
    for (const e of loaded.events) {
      kindMap.set(e.kind, (kindMap.get(e.kind) ?? 0) + 1);
      agentEventMap.set(e.agentName, (agentEventMap.get(e.agentName) ?? 0) + 1);
    }

    const BUCKETS: Array<{ label: string; maxMins: number }> = [
      { label: "Under 1h", maxMins: 60 },
      { label: "1–6h", maxMins: 360 },
      { label: "6–24h", maxMins: 1440 },
      { label: "1–7d", maxMins: 10080 },
      { label: "Over 7d", maxMins: Number.POSITIVE_INFINITY },
    ];
    const bucketCounts: NamedValue[] = BUCKETS.map((b) => ({ label: b.label, value: 0 }));
    const now = Date.now();
    for (const e of loaded.events) {
      const t = new Date(e.createdAt).getTime();
      if (Number.isNaN(t)) continue;
      const mins = Math.max(0, (now - t) / 60000);
      const idx = BUCKETS.findIndex((b) => mins < b.maxMins);
      if (idx >= 0) bucketCounts[idx].value += 1;
    }

    /* A per-day series only exists where the feed is fleet-wide AND carries
       real timestamps. Nowhere else is one invented. */
    let series: MasterSnapshot["series"] = null;
    let seriesNote = `${label} exposes no per-day fleet time series, so none is drawn. Every figure here is a month-to-date total.`;
    if (loaded.fleetWideEvents && loaded.events.length > 0) {
      const dayMap = new Map<string, number>();
      for (const e of loaded.events) {
        const d = new Date(e.createdAt);
        if (Number.isNaN(d.getTime())) continue;
        const key = d.toISOString().slice(0, 10);
        dayMap.set(key, (dayMap.get(key) ?? 0) + 1);
      }
      const days = [...dayMap.keys()].sort().slice(-14);
      if (days.length >= 2) {
        series = {
          labels: days.map((d) =>
            new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" }),
          ),
          calls: days.map((d) => dayMap.get(d) ?? 0),
        };
        seriesNote = `Events per day, counted from the real createdAt timestamps on ${loaded.events.length.toLocaleString()} events in ${label}'s shared activity feed.`;
      } else {
        seriesNote = `${label}'s activity feed covers fewer than two distinct days, so no trend line is drawn.`;
      }
    }

    const budgetUsedPct =
      loaded.budgetUsd !== null && loaded.budgetUsd > 0 && (loaded.spentUsdReported !== null || totalSpendUsd !== null)
        ? Math.round((((loaded.spentUsdReported ?? totalSpendUsd) as number) / loaded.budgetUsd) * 1000) / 10
        : null;

    return {
      platform,
      loading,
      error,
      rows,
      registryCount: agents.length,
      reportedCount: reportedRows.length,
      unreportedCount,
      activeCount,
      idleCount: reportedRows.length - activeCount,
      totalCalls,
      totalSpendUsd,
      monthlyBudgetUsd: loaded.budgetUsd,
      budgetUsedPct,
      fleetCostPerCallUsd:
        totalCalls !== null && totalCalls > 0 && totalSpendUsd !== null ? totalSpendUsd / totalCalls : null,
      model: loaded.model,
      busiest,
      topSpender,
      callsByAgent,
      spendByAgent,
      callsByTag: byTag((r) => r.calls ?? 0),
      spendByTag: byTag((r) => r.spendUsd ?? 0),
      events: loaded.events,
      eventScopeNote: loaded.eventScopeNote,
      eventsByKind: foldTail([...kindMap.entries()].map(([l, v]) => ({ label: l, value: v }))),
      eventsByAgent: [...agentEventMap.entries()]
        .map(([l, v]) => ({ label: l, value: v }))
        .sort((a, b) => b.value - a.value),
      recencyBuckets: bucketCounts,
      series,
      seriesNote,
      callsTodayTracked: loaded.callsTodayTracked,
      tokensTracked: loaded.tokensTracked,
      sourceNote: loaded.sourceNote,
      coverageNote:
        unreportedCount > 0
          ? `${reportedRows.length} of ${rows.length} ${label} agents reported. The other ${unreportedCount} returned nothing and are excluded from every total, chart and ranking — they are not counted as zero.`
          : `All ${rows.length} ${label} agents in the registry reported. An agent showing 0 here genuinely made no calls.`,
    };
  }, [loaded, loading, error, platform, label]);
}
