"use client";

/**
 * Credits Usage — a combined, cross-platform view of real AI spend.
 *
 * Unlike every other data file in src/lib, this one talks to BOTH backends at
 * once: the Credits Usage page has no [platform] segment, so it is the one
 * place in this app that answers "what is my AI budget doing across
 * everything I own" rather than one platform at a time.
 *
 * Sources, all real, all read-only:
 *
 *   GhrFix    GET /ai-agents/master/budget       -> { spentUsd, budgetUsd, pctUsed }
 *               The authoritative platform-wide total: one SUM over every
 *               AgentUsageLog row this month, independent of the registry
 *               below. Used for GhrFix's half of every headline total so a
 *               missing/renamed agent can never silently shrink "how much
 *               did GhrFix actually spend this month".
 *             GET /ai-agents/master/trend?days=N -> [{ date, calls, costUsd }]
 *               A real day-by-day series over the WHOLE GhrFix fleet — the
 *               only one of the two platforms with genuine daily
 *               granularity anywhere. Undocumented in this app's other data
 *               files (master-data.ts doesn't use it) but confirmed real by
 *               reading src/modules/ai-agents/master-ai/router.ts directly.
 *             GET /ai-agents/master/feed?limit=N -> AdminActionLog rows, each
 *               tagged with the agent that wrote it (server resolves
 *               meta.via). The real, fleet-wide "what did an agent just do"
 *               feed — also undocumented elsewhere in this app. It never
 *               carries a cost: AdminActionLog has no such column (that
 *               lives on AgentUsageLog, which has no row-level read endpoint
 *               anywhere), so GhrFix transactions always render cost as
 *               untracked, never $0.
 *             GET /ai-agents/<key>/stats (once per registry agent) -> real
 *               per-agent calls/spend this month, used for the per-agent
 *               breakdown. Hitting each agent's own URL sidesteps a real key
 *               mismatch found while building this file: /master/overview's
 *               hardcoded agent list spells agents like "content-agent",
 *               "master-ai" while this app's own registry (platforms.ts)
 *               spells them "content", "master" — a naive lookup between the
 *               two silently drops every agent but owner-chat. Per-agent
 *               /stats needs no such lookup at all: Express routing, not a
 *               dictionary, decides which router answers which URL.
 *
 *   ShadiLife GET /ai-agents/_meta/usage    -> { model, monthlyBudgetUsd,
 *               monthlySpendUsd, monthlyCallCount, byAgent:[{agent,
 *               spendUsd, calls}] }
 *               One call covers the whole platform: monthlySpendUsd /
 *               monthlyCallCount are the authoritative totals (a Prisma
 *               aggregate with no agent filter — present on the real
 *               response though not called out in this app's per-agent
 *               stats() wrapper in api.ts), byAgent is the real per-agent
 *               breakdown. ShadiLife has no per-agent /stats route at all,
 *               so this single shared endpoint stands in for GhrFix's 12
 *               separate calls.
 *             GET /ai-agents/_meta/activity -> { events:[{id, kind, agent,
 *               endpoint?, targetType?, status?, costUsd?, createdAt}] }
 *               A genuinely fleet-wide, already-merged feed of real OpenAI
 *               calls (kind "call", with a real cost) and agent suggestions
 *               (kind "suggestion" — no cost, since nothing was spent
 *               proposing one). Capped server-side at the newest 25 events.
 *
 * TWO REAL NAMING QUIRKS resolved below (confirmed by reading every
 * ai-agents/*\/router.ts and tools.ts in the ShadiLife backend, not
 * assumed): the Master agent logs its own usage under `agent:
 * "master-agent"`, not the registry's `"master"`; and matchmaking's daily
 * cron job logs separately under `agent: "matchmaking-daily"`, not
 * `"matchmaking"`. Both are folded into their real registry row so that
 * spend attributes correctly instead of silently vanishing from the
 * per-agent breakdown. Headline totals never depend on this fold — they
 * come straight from monthlySpendUsd/monthlyCallCount — so even a renamed
 * key this file doesn't know about yet can't understate "what ShadiLife
 * spent this month", only misattribute which agent it came from.
 *
 * THE SAME HONESTY RULE AS EVERY OTHER FILE HERE: an agent that made zero
 * calls this month must never render the same way as one that failed to
 * report. GhrFix tells the two apart directly (a rejected /stats call vs. a
 * fulfilled one reporting a real 0). ShadiLife's shared endpoint doesn't
 * list zero-activity agents in byAgent at all — but because ONE call
 * already speaks for the entire platform, an agent absent from byAgent is
 * read as a real, reported zero, not a failure; only a rejected
 * _meta/usage call marks every ShadiLife agent unreported at once.
 *
 * Both loaders below are designed to never throw — a failed call degrades
 * its own slice of the snapshot to null/empty with a reason attached, so one
 * dead endpoint (say, /master/feed) can never blank out data that loaded
 * fine from a sibling endpoint (say, /master/budget).
 *
 * READ-ONLY. Nothing here writes.
 */

import { useEffect, useMemo, useState } from "react";
import { apiFetch, ApiError } from "./api";
import { PLATFORMS, agentTitle, type PlatformKey, type AgentDef } from "./platforms";
import { foldTail, usd, count, ago, dateTime, type NamedValue } from "./master-data";

export { usd, count, ago, dateTime, foldTail };
export type { NamedValue };

/* ── Raw backend shapes (only the fields this file actually reads) ───── */

interface GhrFixStatsRaw {
  model?: string;
  callsToday?: number | string;
  callsThisMonth?: number | string;
  spendThisMonthUsd?: number | string;
  tokensThisMonth?: number | string;
}
interface GhrFixBudgetRaw {
  spentUsd?: number | string;
  budgetUsd?: number | string;
}
interface GhrFixTrendRaw {
  date: string;
  calls: number;
  costUsd: number | string;
}
interface GhrFixFeedItemRaw {
  id: string;
  action: string;
  createdAt: string;
  agent?: string | null;
}
interface ShadiUsageRaw {
  model?: string;
  monthlyBudgetUsd?: number | string;
  monthlySpendUsd?: number | string;
  monthlyCallCount?: number | string;
  byAgent?: Array<{ agent: string; spendUsd?: number | string; calls?: number | string }>;
}
interface ShadiEventRaw {
  id: string;
  kind?: "call" | "suggestion";
  agent?: string;
  endpoint?: string;
  targetType?: string;
  status?: string;
  costUsd?: number | string;
  createdAt: string;
}
interface ShadiActivityRaw {
  events?: ShadiEventRaw[];
}

/* ── Public shapes ──────────────────────────────────────────────────── */

export interface CreditAgentRow {
  platformKey: PlatformKey;
  platformLabel: string;
  key: string;
  name: string;
  /** "GhrFix — SEO Agent" — for lists that mix both platforms together. */
  fullName: string;
  tag: string;
  accent: string;
  icon: AgentDef["icon"];
  calls: number | null;
  /** GhrFix only — ShadiLife exposes no day-level granularity anywhere. */
  callsToday: number | null;
  spendUsd: number | null;
  reported: boolean;
  failureReason: string | null;
}

export interface CreditTransaction {
  id: string;
  platformKey: PlatformKey;
  platformLabel: string;
  agentName: string;
  accent: string;
  title: string;
  /** null when this platform genuinely does not record a cost for this row. */
  costUsd: number | null;
  createdAt: string;
}

export interface PlatformCreditSummary {
  platformKey: PlatformKey;
  label: string;
  spentUsd: number | null;
  budgetUsd: number | null;
  pctUsed: number | null;
  model: string | null;
  callsThisMonth: number | null;
  /** Non-null only when this platform contributed genuinely nothing. */
  error: string | null;
}

export interface CreditUsageSnapshot {
  loading: boolean;
  ghrfixError: string | null;
  shadilifeError: string | null;

  rows: CreditAgentRow[];
  reportedRows: CreditAgentRow[];
  registryCount: number;
  reportedCount: number;
  unreportedCount: number;

  totalSpendUsd: number | null;
  totalBudgetUsd: number | null;
  totalRemainingUsd: number | null;
  budgetUsedPct: number | null;
  totalCallsThisMonth: number | null;
  totalCallsToday: number | null;
  avgCostPerCallUsd: number | null;

  spendByAgent: NamedValue[];
  spendByTag: NamedValue[];
  spendByPlatform: NamedValue[];
  topAgents: CreditAgentRow[];

  platforms: PlatformCreditSummary[];

  dailyTrend: { labels: string[]; costUsd: number[]; calls: number[] } | null;
  dailyTrendDays: number;
  dailyTrendNote: string;

  transactions: CreditTransaction[];

  alerts: Array<{ platformLabel: string; pctUsed: number; spentUsd: number; budgetUsd: number }>;

  sourceNote: string;
}

/* ── Helpers ────────────────────────────────────────────────────────── */

/** Prisma Decimal columns arrive as strings on at least one of these routes — coerce without inventing a value. */
function num(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function errText(e: unknown, fallback: string): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error && e.message) return e.message;
  return fallback;
}

function sumOrNull(a: number | null | undefined, b: number | null | undefined): number | null {
  const an = a ?? null;
  const bn = b ?? null;
  if (an === null && bn === null) return null;
  return (an ?? 0) + (bn ?? 0);
}

/**
 * Every GhrFix agent's own router logs its usage under this key — confirmed
 * by reading every src/modules/ai-agents/<x>/router.ts: `${key}-agent` for
 * all of them except "owner-chat" (kept as-is) and "master" (kept as
 * "master-ai"). This is NOT used to fetch stats (each agent's own /stats
 * route needs no such mapping) — only to resolve which registry agent wrote
 * a /master/feed row, since that feed reports the raw internal key.
 */
function ghrfixInternalKey(frontendKey: string): string {
  if (frontendKey === "owner-chat") return "owner-chat";
  if (frontendKey === "master") return "master-ai";
  return `${frontendKey}-agent`;
}

/**
 * ShadiLife logs two real sub-processes under keys the registry doesn't
 * have: the Master agent's own chat under "master-agent", and matchmaking's
 * daily cron job under "matchmaking-daily". Confirmed by reading every
 * ai-agents/*\/router.ts and master-agent/tools.ts in the ShadiLife backend.
 * Folding both into their real registry agent keeps their spend attributed
 * correctly instead of vanishing from the per-agent breakdown.
 */
const SHADILIFE_AGENT_ALIAS: Record<string, string> = {
  "master-agent": "master",
  "matchmaking-daily": "matchmaking",
};

/** Real, backend-enforced ceiling on GhrFix's /master/trend?days= — its zod schema caps at 60. */
export const MAX_TREND_DAYS = 60;

/* ── GhrFix loader ──────────────────────────────────────────────────── */

interface RawRow {
  key: string;
  calls: number | null;
  spendUsd: number | null;
  callsToday: number | null;
  reported: boolean;
  failureReason: string | null;
}

interface GhrFixLoaded {
  rowsRaw: RawRow[];
  budgetUsd: number | null;
  spentUsd: number | null;
  model: string | null;
  trend: { labels: string[]; costUsd: number[]; calls: number[] } | null;
  transactions: CreditTransaction[];
  /** Non-null only when literally nothing came back from GhrFix. */
  error: string | null;
}

async function loadGhrFix(trendDays: number): Promise<GhrFixLoaded> {
  const agents = PLATFORMS.ghrfix.agents;

  // Fired together, not chained, so 12+ requests are genuinely concurrent
  // rather than serialized behind an intermediate await.
  const tripletP = Promise.allSettled([
    apiFetch<GhrFixBudgetRaw>("ghrfix", "/ai-agents/master/budget"),
    apiFetch<GhrFixTrendRaw[]>("ghrfix", "/ai-agents/master/trend", { query: { days: trendDays } }),
    apiFetch<GhrFixFeedItemRaw[]>("ghrfix", "/ai-agents/master/feed", { query: { limit: 12 } }),
  ]);
  const statsP = Promise.allSettled(agents.map((a) => apiFetch<GhrFixStatsRaw>("ghrfix", `${a.base}/stats`)));

  const [[budgetRes, trendRes, feedRes], statsSettled] = await Promise.all([tripletP, statsP]);

  const rowsRaw: RawRow[] = agents.map((a, i) => {
    const s = statsSettled[i];
    if (s.status !== "fulfilled") {
      return { key: a.key, calls: null, spendUsd: null, callsToday: null, reported: false, failureReason: errText(s.reason, "its /stats call failed") };
    }
    return {
      key: a.key,
      calls: num(s.value.data.callsThisMonth) ?? 0,
      spendUsd: num(s.value.data.spendThisMonthUsd) ?? 0,
      callsToday: num(s.value.data.callsToday) ?? 0,
      reported: true,
      failureReason: null,
    };
  });

  const everythingFailed = budgetRes.status === "rejected" && statsSettled.every((s) => s.status === "rejected");

  const model = (() => {
    const first = statsSettled.find((s): s is PromiseFulfilledResult<Awaited<ReturnType<typeof apiFetch<GhrFixStatsRaw>>>> => s.status === "fulfilled");
    return first && typeof first.value.data.model === "string" ? first.value.data.model : null;
  })();

  const trend =
    trendRes.status === "fulfilled" && Array.isArray(trendRes.value.data) && trendRes.value.data.length > 0
      ? {
          labels: trendRes.value.data.map((d) => new Date(`${d.date}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" })),
          costUsd: trendRes.value.data.map((d) => Math.round((num(d.costUsd) ?? 0) * 10000) / 10000),
          calls: trendRes.value.data.map((d) => num(d.calls) ?? 0),
        }
      : null;

  const byInternalKey = new Map(agents.map((a) => [ghrfixInternalKey(a.key), a]));
  const transactions: CreditTransaction[] =
    feedRes.status === "fulfilled" && Array.isArray(feedRes.value.data)
      ? feedRes.value.data
          .filter((it): it is GhrFixFeedItemRaw & { agent: string } => Boolean(it.agent))
          .map((it) => {
            const def = byInternalKey.get(it.agent);
            return {
              id: `ghrfix:${it.id}`,
              platformKey: "ghrfix" as const,
              platformLabel: "GhrFix",
              agentName: def?.name ?? it.agent,
              accent: def?.accent ?? PLATFORMS.ghrfix.color,
              title: it.action,
              costUsd: null, // AdminActionLog (the audit trail /feed reads) never carries a cost column
              createdAt: it.createdAt,
            };
          })
      : [];

  return {
    rowsRaw,
    budgetUsd: budgetRes.status === "fulfilled" ? num(budgetRes.value.data.budgetUsd) : null,
    spentUsd: budgetRes.status === "fulfilled" ? num(budgetRes.value.data.spentUsd) : null,
    model,
    trend,
    transactions,
    error: everythingFailed ? errText(budgetRes.status === "rejected" ? budgetRes.reason : null, "Could not reach GhrFix.") : null,
  };
}

/* ── ShadiLife loader ───────────────────────────────────────────────── */

interface ShadiLoaded {
  rowsRaw: RawRow[];
  budgetUsd: number | null;
  spentUsd: number | null;
  callCount: number | null;
  model: string | null;
  transactions: CreditTransaction[];
  error: string | null;
}

async function loadShadiLife(): Promise<ShadiLoaded> {
  const agents = PLATFORMS.shadilife.agents;

  const [usageRes, activityRes] = await Promise.allSettled([
    apiFetch<ShadiUsageRaw>("shadilife", "/ai-agents/_meta/usage"),
    apiFetch<ShadiActivityRaw>("shadilife", "/ai-agents/_meta/activity"),
  ]);

  if (usageRes.status !== "fulfilled") {
    return {
      rowsRaw: agents.map((a) => ({ key: a.key, calls: null, spendUsd: null, callsToday: null, reported: false, failureReason: "ShadiLife's shared usage endpoint did not respond" })),
      budgetUsd: null,
      spentUsd: null,
      callCount: null,
      model: null,
      transactions: [],
      error: errText(usageRes.reason, "Could not reach ShadiLife."),
    };
  }

  const usage = usageRes.value.data;

  // Fold the two known aliases (see SHADILIFE_AGENT_ALIAS docs above) before
  // grouping, so their real spend attributes to the right registry agent
  // instead of being dropped by the .find() below.
  const byKey = new Map<string, { spendUsd: number; calls: number }>();
  for (const r of usage.byAgent ?? []) {
    if (!r || typeof r.agent !== "string") continue;
    const key = SHADILIFE_AGENT_ALIAS[r.agent] ?? r.agent;
    const prev = byKey.get(key) ?? { spendUsd: 0, calls: 0 };
    byKey.set(key, { spendUsd: prev.spendUsd + (num(r.spendUsd) ?? 0), calls: prev.calls + (num(r.calls) ?? 0) });
  }

  // One call already speaks for the whole platform, so an agent absent from
  // byAgent made a real zero calls this month — not a failure to report.
  const rowsRaw: RawRow[] = agents.map((a) => {
    const r = byKey.get(a.key);
    return {
      key: a.key,
      calls: r ? Math.round(r.calls) : 0,
      spendUsd: r ? Math.round(r.spendUsd * 100) / 100 : 0,
      callsToday: null, // ShadiLife exposes no daily granularity anywhere
      reported: true,
      failureReason: null,
    };
  });

  const resolve = (rawKey: string) => agents.find((a) => a.key === (SHADILIFE_AGENT_ALIAS[rawKey] ?? rawKey));

  const transactions: CreditTransaction[] =
    activityRes.status === "fulfilled" && Array.isArray(activityRes.value.data?.events)
      ? (activityRes.value.data.events ?? []).map((e) => {
          const def = e.agent ? resolve(e.agent) : undefined;
          const title =
            e.kind === "call"
              ? `Called ${e.endpoint ?? "an endpoint"}`
              : `Suggestion ${(e.status ?? "pending").toLowerCase()} — ${e.targetType ?? "item"}`;
          return {
            id: `shadilife:${e.id}`,
            platformKey: "shadilife" as const,
            platformLabel: "ShadiLife",
            agentName: def?.name ?? e.agent ?? "Unknown agent",
            accent: def?.accent ?? PLATFORMS.shadilife.color,
            title,
            costUsd: e.kind === "call" ? num(e.costUsd) : null, // suggestions cost nothing to propose
            createdAt: e.createdAt,
          };
        })
      : [];

  return {
    rowsRaw,
    budgetUsd: num(usage.monthlyBudgetUsd),
    spentUsd: num(usage.monthlySpendUsd),
    callCount: num(usage.monthlyCallCount),
    model: typeof usage.model === "string" ? usage.model : null,
    transactions,
    error: null,
  };
}

/* ── Hook ───────────────────────────────────────────────────────────── */

const EMPTY: CreditUsageSnapshot = {
  loading: true,
  ghrfixError: null,
  shadilifeError: null,
  rows: [],
  reportedRows: [],
  registryCount: PLATFORMS.ghrfix.agents.length + PLATFORMS.shadilife.agents.length,
  reportedCount: 0,
  unreportedCount: 0,
  totalSpendUsd: null,
  totalBudgetUsd: null,
  totalRemainingUsd: null,
  budgetUsedPct: null,
  totalCallsThisMonth: null,
  totalCallsToday: null,
  avgCostPerCallUsd: null,
  spendByAgent: [],
  spendByTag: [],
  spendByPlatform: [],
  topAgents: [],
  platforms: [],
  dailyTrend: null,
  dailyTrendDays: 7,
  dailyTrendNote: "Loading…",
  transactions: [],
  alerts: [],
  sourceNote: "",
};

export function useCreditUsageSnapshot(trendDays: number = 7): CreditUsageSnapshot {
  const [loaded, setLoaded] = useState<{ ghrfix: GhrFixLoaded; shadi: ShadiLoaded } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    // eslint-disable-next-line no-console
    console.log("[credit-usage DEBUG] effect firing, trendDays=", trendDays);

    Promise.all([
      loadGhrFix(trendDays).then((r) => {
        // eslint-disable-next-line no-console
        console.log("[credit-usage DEBUG] loadGhrFix resolved", r);
        return r;
      }),
      loadShadiLife().then((r) => {
        // eslint-disable-next-line no-console
        console.log("[credit-usage DEBUG] loadShadiLife resolved", r);
        return r;
      }),
    ])
      .then(([ghrfix, shadi]) => {
        // eslint-disable-next-line no-console
        console.log("[credit-usage DEBUG] both resolved, cancelled=", cancelled);
        if (cancelled) return;
        setLoaded({ ghrfix, shadi });
        setLoading(false);
      })
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.error("[credit-usage DEBUG] load failed with exception", e);
      });

    return () => {
      cancelled = true;
    };
  }, [trendDays]);

  return useMemo<CreditUsageSnapshot>(() => {
    if (!loaded) return { ...EMPTY, loading };
    const { ghrfix, shadi } = loaded;

    const ghrfixRows: CreditAgentRow[] = PLATFORMS.ghrfix.agents.map((a) => {
      const raw = ghrfix.rowsRaw.find((r) => r.key === a.key);
      return {
        platformKey: "ghrfix",
        platformLabel: "GhrFix",
        key: a.key,
        name: a.name,
        fullName: agentTitle(PLATFORMS.ghrfix, a),
        tag: a.tag,
        accent: a.accent,
        icon: a.icon,
        calls: raw?.calls ?? null,
        callsToday: raw?.callsToday ?? null,
        spendUsd: raw?.spendUsd ?? null,
        reported: raw?.reported ?? false,
        failureReason: raw?.failureReason ?? null,
      };
    });

    const shadiRows: CreditAgentRow[] = PLATFORMS.shadilife.agents.map((a) => {
      const raw = shadi.rowsRaw.find((r) => r.key === a.key);
      return {
        platformKey: "shadilife",
        platformLabel: "ShadiLife",
        key: a.key,
        name: a.name,
        fullName: agentTitle(PLATFORMS.shadilife, a),
        tag: a.tag,
        accent: a.accent,
        icon: a.icon,
        calls: raw?.calls ?? null,
        callsToday: raw?.callsToday ?? null,
        spendUsd: raw?.spendUsd ?? null,
        reported: raw?.reported ?? false,
        failureReason: raw?.failureReason ?? null,
      };
    });

    const rows = [...ghrfixRows, ...shadiRows];
    const reportedRows = rows.filter((r) => r.reported);

    const ghrfixCallsThisMonth = ghrfix.rowsRaw.filter((r) => r.reported).length > 0 ? ghrfix.rowsRaw.reduce((a, r) => a + (r.reported ? r.calls ?? 0 : 0), 0) : null;
    const ghrfixCallsToday = ghrfix.rowsRaw.some((r) => r.reported) ? ghrfix.rowsRaw.reduce((a, r) => a + (r.reported ? r.callsToday ?? 0 : 0), 0) : null;

    const totalSpendUsd = sumOrNull(ghrfix.spentUsd, shadi.spentUsd);
    const totalBudgetUsd = sumOrNull(ghrfix.budgetUsd, shadi.budgetUsd);
    const totalCallsThisMonth = sumOrNull(ghrfixCallsThisMonth, shadi.callCount);
    const budgetUsedPct = totalBudgetUsd !== null && totalBudgetUsd > 0 && totalSpendUsd !== null ? Math.round((totalSpendUsd / totalBudgetUsd) * 1000) / 10 : null;
    const totalRemainingUsd = totalBudgetUsd !== null && totalSpendUsd !== null ? Math.max(0, totalBudgetUsd - totalSpendUsd) : null;
    const avgCostPerCallUsd = totalCallsThisMonth !== null && totalCallsThisMonth > 0 && totalSpendUsd !== null ? totalSpendUsd / totalCallsThisMonth : null;

    const spendByAgent = foldTail(reportedRows.map((r) => ({ label: r.fullName, value: Math.round((r.spendUsd ?? 0) * 100) / 100 })));

    const tagMap = new Map<string, number>();
    for (const r of reportedRows) tagMap.set(r.tag, (tagMap.get(r.tag) ?? 0) + (r.spendUsd ?? 0));
    const spendByTag = foldTail([...tagMap.entries()].map(([label, value]) => ({ label, value: Math.round(value * 100) / 100 })));

    const spendByPlatform: NamedValue[] = [
      ...(ghrfix.spentUsd !== null ? [{ label: "GhrFix", value: Math.round(ghrfix.spentUsd * 100) / 100 }] : []),
      ...(shadi.spentUsd !== null ? [{ label: "ShadiLife", value: Math.round(shadi.spentUsd * 100) / 100 }] : []),
    ];

    const topAgents = [...reportedRows].sort((a, b) => (b.spendUsd ?? 0) - (a.spendUsd ?? 0)).slice(0, 8);

    const platformPct = (spent: number | null, budget: number | null) => (spent !== null && budget !== null && budget > 0 ? Math.round((spent / budget) * 1000) / 10 : null);

    const platforms: PlatformCreditSummary[] = [
      {
        platformKey: "ghrfix",
        label: "GhrFix",
        spentUsd: ghrfix.spentUsd,
        budgetUsd: ghrfix.budgetUsd,
        pctUsed: platformPct(ghrfix.spentUsd, ghrfix.budgetUsd),
        model: ghrfix.model,
        callsThisMonth: ghrfixCallsThisMonth,
        error: ghrfix.error,
      },
      {
        platformKey: "shadilife",
        label: "ShadiLife",
        spentUsd: shadi.spentUsd,
        budgetUsd: shadi.budgetUsd,
        pctUsed: platformPct(shadi.spentUsd, shadi.budgetUsd),
        model: shadi.model,
        callsThisMonth: shadi.callCount,
        error: shadi.error,
      },
    ];

    const alerts = platforms
      .filter((p): p is PlatformCreditSummary & { pctUsed: number; spentUsd: number; budgetUsd: number } => p.pctUsed !== null && p.pctUsed >= 70 && p.spentUsd !== null && p.budgetUsd !== null)
      .map((p) => ({ platformLabel: p.label, pctUsed: p.pctUsed, spentUsd: p.spentUsd, budgetUsd: p.budgetUsd }));

    const transactions = [...ghrfix.transactions, ...shadi.transactions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10);

    const dailyTrendNote =
      ghrfix.trend === null
        ? ghrfix.error
          ? "GhrFix's daily trend could not be loaded."
          : "GhrFix reported no AI activity in this window."
        : `Real day-by-day spend across GhrFix's whole fleet, from GET /ai-agents/master/trend. ShadiLife has no day-level breakdown on any route this workspace reads, so it is not part of this chart — its month-to-date total appears in the stats above instead.`;

    const reportedCount = reportedRows.length;

    return {
      loading: false,
      ghrfixError: ghrfix.error,
      shadilifeError: shadi.error,
      rows,
      reportedRows,
      registryCount: rows.length,
      reportedCount,
      unreportedCount: rows.length - reportedCount,
      totalSpendUsd,
      totalBudgetUsd,
      totalRemainingUsd,
      budgetUsedPct,
      totalCallsThisMonth,
      totalCallsToday: ghrfixCallsToday,
      avgCostPerCallUsd,
      spendByAgent,
      spendByTag,
      spendByPlatform,
      topAgents,
      platforms,
      dailyTrend: ghrfix.trend,
      dailyTrendDays: trendDays,
      dailyTrendNote,
      transactions,
      alerts,
      sourceNote:
        "GhrFix: GET /ai-agents/master/budget, /master/trend, /master/feed, plus each agent's own GET /ai-agents/<key>/stats (12 calls). ShadiLife: GET /ai-agents/_meta/usage and /ai-agents/_meta/activity — one shared endpoint covers every agent.",
    };
  }, [loaded, loading, trendDays]);
}
