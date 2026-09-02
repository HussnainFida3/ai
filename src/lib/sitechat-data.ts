"use client";

/**
 * Site Chat Agent — normalized snapshot for the special workspace.
 *
 * The Site Chat Agent reports on GhrFix's customer-facing website assistant:
 * how many calls it served, how many of those never reached the model
 * (cache), how many tokens moved, and what the agent itself costs to run.
 *
 * Real endpoints, and where each was found:
 *
 *   GET  /ai-agents/site-chat/summary
 *          → { totalCalls, callsToday, callsThisMonth, cachedCalls,
 *              cacheHitRate, totalTokensIn, totalTokensOut, topUsers[] }
 *          (src/components/agents/views/ghrfix/site-chat.tsx and
 *           src/components/agents/views/domain/ghrfix/site-chat.tsx)
 *   GET  /ai-agents/site-chat/conversations
 *          → { note, topUsers[] } — an explicit *proxy*. The backend's own
 *            `note` says it: there is no stored transcript table, so there
 *            are no per-conversation rows to page through. This file never
 *            manufactures any.
 *          (same two files)
 *   GET  /ai-agents/site-chat/stats     via agentClient().stats()
 *          → model, rateLimitPerMinute, monthlyBudgetUsd, callsToday,
 *            callsThisMonth, spendThisMonthUsd, tokensThisMonth
 *   GET  /ai-agents/site-chat/activity  via agentClient().activity()
 *          → the agent's own audited call log, with real `createdAt`
 *            timestamps — the ONLY genuine time dimension available here.
 *          (both declared in src/lib/api.ts)
 *
 * ShadiLife does not register a `site-chat` agent at all (see the
 * SHADILIFE_AGENTS list in src/lib/platforms.ts — there is no such key), so
 * every one of those paths would 404. The hook short-circuits before firing
 * anything and returns `supported: false` with the reason, rather than
 * producing a spurious network error or, worse, zeros.
 *
 * READ-ONLY. Nothing here POSTs, and in particular nothing calls the agent's
 * own /chat route (which costs money per call) outside of the Chat page,
 * where a person deliberately presses send.
 */

import { useEffect, useMemo, useState } from "react";
import { agentClient, ApiError, apiFetch, type AgentActivityEntry, type AgentStats } from "./api";
import { platformLabel } from "./agent-data";
import type { PlatformKey } from "./platforms";

/* ── Raw backend shapes ─────────────────────────────────────────────── */

interface RawTopUser {
  user?: { id?: string; name?: string | null; phone?: string | null } | null;
  calls?: number;
}

/** GET /ai-agents/site-chat/summary — admin.service.aiUsageStats(). */
interface RawSummary {
  totalCalls?: number;
  callsToday?: number;
  callsThisMonth?: number;
  cachedCalls?: number;
  cacheHitRate?: number;
  totalTokensIn?: number;
  totalTokensOut?: number;
  topUsers?: RawTopUser[];
}

/** GET /ai-agents/site-chat/conversations — aggregate proxy, not transcripts. */
interface RawConversations {
  note?: string;
  topUsers?: RawTopUser[];
}

/* ── Public shape ───────────────────────────────────────────────────── */

/** A headline figure. `value: null` means "this backend does not report it". */
export interface SiteChatMetric {
  key: string;
  label: string;
  value: number | null;
  kind: "count" | "pct" | "usd";
  note: string;
  tone: string;
  icon: string;
}

export interface SiteChatDim {
  label: string;
  value: number;
}

export interface SiteChatDimension {
  key: string;
  title: string;
  unit: string;
  /** One line of provenance — which endpoint field this cut came from. */
  note: string;
  rows: SiteChatDim[];
  total: number;
}

export interface SiteChatRate {
  label: string;
  value: number | null;
  /** Suffix used when rendering — "%", "$", or "" for a bare number. */
  unit: "%" | "$" | "";
  note: string;
}

/** One of the top callers the backend groups by user. */
export interface SiteChatCaller {
  id: string;
  name: string;
  phone: string | null;
  calls: number;
  /** Share of all top-caller volume; null when that total is zero. */
  share: number | null;
}

/** One row of the agent's own audit log — a real, timestamped event. */
export interface SiteChatEvent {
  id: string;
  action: string;
  targetType: string | null;
  createdAt: string | null;
  /** Whole days since the event; null when no timestamp was returned. */
  ageDays: number | null;
  /** Only present where the log row carried a cost; null otherwise. */
  costUsd: number | null;
}

export interface SiteChatSeries {
  labels: string[];
  series: Array<{ name: string; data: number[] }>;
  granularity: string;
}

export interface SiteChatSnapshot {
  platform: PlatformKey;
  /** False when this platform does not register the site-chat agent at all. */
  supported: boolean;
  /** Plain-English reason, set only when `supported` is false. */
  unsupportedReason: string | null;
  /** What this workspace is actually reporting on. */
  domain: string;
  /** Named so every page can say exactly where its numbers came from. */
  sourceNote: string;
  /** How much of the picture was really fetched — pages state this openly. */
  coverageNote: string;
  /** Why there is no per-conversation table, straight from the backend. */
  conversationsNote: string;

  metrics: SiteChatMetric[];
  rates: SiteChatRate[];
  dimensions: SiteChatDimension[];

  /** Top callers, busiest first. Empty when the backend grouped nothing. */
  callers: SiteChatCaller[];
  /** The agent's own audit rows, newest first. */
  events: SiteChatEvent[];
  /** Recency buckets over `events`, from their real timestamps. */
  recencyBuckets: SiteChatDimension;
  /** Daily event counts derived from real `createdAt` values; null when none. */
  series: SiteChatSeries | null;
  seriesNote: string;

  /* Named singletons the pages headline. Each is null when unreported. */
  cacheHitRate: number | null;
  cachedCalls: number | null;
  uncachedCalls: number | null;
  totalCalls: number | null;
  callsToday: number | null;
  callsThisMonth: number | null;
  tokensIn: number | null;
  tokensOut: number | null;
  totalTokens: number | null;
  /** From /stats — the agent's own runtime, not the assistant's traffic. */
  model: string | null;
  rateLimitPerMinute: number | null;
  monthlyBudgetUsd: number | null;
  spendThisMonthUsd: number | null;
  budgetUsedPct: number | null;
  costPerCallUsd: number | null;
  tokensThisMonth: number | null;
  avgTokensPerCall: number | null;

  /** Quality signals the backend genuinely does not expose. */
  qualityGaps: string[];

  /** True once a fetch finished and the assistant had served nothing at all. */
  isEmpty: boolean;
  loading: boolean;
  error: string | null;
  /** Set when /stats or /activity failed on their own — the page still loads. */
  partialNote: string | null;
}

/* ── Honest helpers ─────────────────────────────────────────────────── */

/** Number or null — never coerces a missing field into 0. */
function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function share(part: number | null, whole: number | null): number | null {
  if (part === null || whole === null || whole <= 0) return null;
  return Math.round((part / whole) * 1000) / 10;
}

function ageInDays(iso: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / 86_400_000));
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Formats a metric for display. Missing is stated, never shown as zero. */
export function formatMetric(m: Pick<SiteChatMetric, "value" | "kind">): string {
  if (m.value === null) return "Not tracked";
  if (m.kind === "pct") return `${m.value}%`;
  if (m.kind === "usd") return `$${m.value.toFixed(2)}`;
  return m.value.toLocaleString();
}

/** Formats a computed rate for display, with its own unit. */
export function formatRate(r: Pick<SiteChatRate, "value" | "unit">): string {
  if (r.value === null) return "Not tracked";
  if (r.unit === "$") return `$${r.value.toFixed(4)}`;
  if (r.unit === "%") return `${r.value}%`;
  return r.value.toLocaleString();
}

/** A short date for a table cell, or "—" where none was returned. */
export function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function formatAge(days: number | null): string {
  if (days === null) return "—";
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

function makeDimension(key: string, title: string, unit: string, note: string, rows: SiteChatDim[]): SiteChatDimension {
  return { key, title, unit, note, rows, total: rows.reduce((a, b) => a + b.value, 0) };
}

/** Keeps only figures the backend actually reported and that are non-zero. */
function toDim(rows: Array<{ label: string; value: number | null }>): SiteChatDim[] {
  return rows
    .filter((r): r is { label: string; value: number } => r.value !== null && r.value > 0)
    .map((r) => ({ label: r.label, value: r.value }));
}

/** Count rows by a derived key, dropping rows that have no key at all. */
function tally<T>(rows: T[], pick: (row: T) => string | null): SiteChatDim[] {
  const map = new Map<string, number>();
  for (const row of rows) {
    const k = pick(row);
    if (!k) continue;
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

const RECENCY_BANDS: Array<{ label: string; min: number; max: number }> = [
  { label: "Today", min: 0, max: 0 },
  { label: "1–3 days ago", min: 1, max: 3 },
  { label: "4–7 days ago", min: 4, max: 7 },
  { label: "8–30 days ago", min: 8, max: 30 },
  { label: "Over 30 days ago", min: 31, max: Number.POSITIVE_INFINITY },
];

/**
 * Daily buckets built from the real `createdAt` on the loaded audit rows.
 * This is a re-projection of timestamps the backend actually returned, not a
 * synthesised series — and it is null when nothing lands inside the window.
 */
function buildSeries(events: SiteChatEvent[], days: number): SiteChatSeries | null {
  const dated = events.filter((e) => e.ageDays !== null);
  if (dated.length === 0) return null;

  const labels: string[] = [];
  const all: number[] = [];
  const billed: number[] = [];
  for (let d = days - 1; d >= 0; d--) {
    labels.push(shortDate(new Date(Date.now() - d * 86_400_000).toISOString()));
    const inBucket = dated.filter((e) => e.ageDays === d);
    all.push(inBucket.length);
    billed.push(inBucket.filter((e) => e.costUsd !== null && e.costUsd > 0).length);
  }
  if (all.every((v) => v === 0)) return null;

  return {
    labels,
    series: [
      { name: "Logged agent events", data: all },
      { name: "…of those, carrying a cost", data: billed },
    ],
    granularity: `${days} daily buckets, derived from the createdAt on each loaded /activity row`,
  };
}

/* ── The hook ───────────────────────────────────────────────────────── */

interface RawState {
  summary: RawSummary | null;
  conversations: RawConversations | null;
  stats: AgentStats | null;
  activity: AgentActivityEntry[] | null;
  /** Which of the optional calls failed, for the partial-load note. */
  failed: string[];
}

const EMPTY_RAW: RawState = { summary: null, conversations: null, stats: null, activity: null, failed: [] };

/** How many audit rows to ask for in one page. */
const ACTIVITY_PAGE_SIZE = 100;
/** Width of the derived daily series. */
const SERIES_DAYS = 14;

/** The one platform that registers this agent. */
const SUPPORTED_PLATFORM: PlatformKey = "ghrfix";

export function useSiteChatSnapshot(platform: PlatformKey): SiteChatSnapshot {
  const [raw, setRaw] = useState<RawState>(EMPTY_RAW);
  const [loading, setLoading] = useState(platform === SUPPORTED_PLATFORM);
  const [error, setError] = useState<string | null>(null);

  const supported = platform === SUPPORTED_PLATFORM;

  useEffect(() => {
    // ShadiLife has no site-chat agent, so there is nothing to request.
    // Firing here would produce a 404 that reads like an outage.
    if (!supported) {
      setRaw(EMPTY_RAW);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setRaw(EMPTY_RAW);
    setLoading(true);
    setError(null);

    const client = agentClient(platform, "/ai-agents/site-chat");

    async function run(): Promise<RawState> {
      // /summary is the spine of every page. /conversations, /stats and
      // /activity each add a layer, so losing one of them alone must not
      // blank the whole workspace — it just narrows what can be shown.
      const [summary, conversations, stats, activity] = await Promise.allSettled([
        apiFetch<RawSummary>(platform, "/ai-agents/site-chat/summary"),
        apiFetch<RawConversations>(platform, "/ai-agents/site-chat/conversations"),
        client.stats(),
        client.activity({ page: 1, pageSize: ACTIVITY_PAGE_SIZE }),
      ]);
      if (summary.status === "rejected") throw summary.reason;

      const failed: string[] = [];
      if (conversations.status === "rejected") failed.push("/conversations");
      if (stats.status === "rejected") failed.push("/stats");
      if (activity.status === "rejected") failed.push("/activity");

      return {
        summary: summary.value.data ?? null,
        conversations: conversations.status === "fulfilled" ? (conversations.value.data ?? null) : null,
        stats: stats.status === "fulfilled" ? stats.value.data : null,
        activity: activity.status === "fulfilled" ? (activity.value.data ?? []) : null,
        failed,
      };
    }

    run()
      .then((next) => {
        if (!cancelled) setRaw(next);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setRaw(EMPTY_RAW);
        setError(err instanceof ApiError ? err.message : `Could not read the ${platformLabel(platform)} site-chat summary.`);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [platform, supported]);

  return useMemo(
    () => build(platform, supported, raw, loading, error),
    [platform, supported, raw, loading, error],
  );
}

/* ── Derivation ─────────────────────────────────────────────────────── */

function build(
  platform: PlatformKey,
  supported: boolean,
  raw: RawState,
  loading: boolean,
  error: string | null,
): SiteChatSnapshot {
  const label = platformLabel(platform);

  const empty: SiteChatSnapshot = {
    platform,
    supported,
    unsupportedReason: supported
      ? null
      : `${label} does not register a site-chat agent. Its agent list in src/lib/platforms.ts has no "site-chat" key, so there is no /ai-agents/site-chat backend on this platform to read — no request was sent and no figure below is estimated.`,
    domain: "The customer-facing website assistant: volume, cache efficiency and AI spend",
    sourceNote: supported
      ? "GhrFix — GET /ai-agents/site-chat/summary, /conversations, /stats and /activity."
      : `${label} — no site-chat endpoints exist on this platform.`,
    coverageNote: supported
      ? "Nothing loaded yet."
      : `Nothing was requested from ${label}, because this agent is not mounted there.`,
    conversationsNote:
      "The assistant stores no transcripts — /conversations returns aggregate call metadata grouped by user, not a per-conversation table. No conversation rows are invented to fill the gap.",
    metrics: [],
    rates: [],
    dimensions: [],
    callers: [],
    events: [],
    recencyBuckets: makeDimension("recency", "Agent events by recency", "events", "No events loaded.", []),
    series: null,
    seriesNote: "No time series available.",
    cacheHitRate: null,
    cachedCalls: null,
    uncachedCalls: null,
    totalCalls: null,
    callsToday: null,
    callsThisMonth: null,
    tokensIn: null,
    tokensOut: null,
    totalTokens: null,
    model: null,
    rateLimitPerMinute: null,
    monthlyBudgetUsd: null,
    spendThisMonthUsd: null,
    budgetUsedPct: null,
    costPerCallUsd: null,
    tokensThisMonth: null,
    avgTokensPerCall: null,
    qualityGaps: [],
    isEmpty: false,
    loading,
    error,
    partialNote: null,
  };

  if (!supported) return { ...empty, loading: false, error: null };
  if (loading || error || !raw.summary) return empty;

  const s = raw.summary;

  /* ── Assistant traffic, straight from /summary ── */
  const totalCalls = num(s.totalCalls);
  const callsToday = num(s.callsToday);
  const callsThisMonth = num(s.callsThisMonth);
  const cachedCalls = num(s.cachedCalls);
  const cacheHitRate = num(s.cacheHitRate);
  const tokensIn = num(s.totalTokensIn);
  const tokensOut = num(s.totalTokensOut);
  const totalTokens = tokensIn === null && tokensOut === null ? null : (tokensIn ?? 0) + (tokensOut ?? 0);
  const uncachedCalls = totalCalls !== null && cachedCalls !== null ? Math.max(0, totalCalls - cachedCalls) : null;

  /* ── Top callers — /conversations first, /summary as the fallback ── */
  const rawCallers = raw.conversations?.topUsers ?? s.topUsers ?? [];
  const callerTotal = rawCallers.reduce((a, u) => a + (num(u.calls) ?? 0), 0);
  const callers: SiteChatCaller[] = rawCallers
    .map((u, i) => {
      const calls = num(u.calls) ?? 0;
      return {
        id: u.user?.id ?? `caller-${i}`,
        name: u.user?.name ?? u.user?.phone ?? "Unnamed user",
        phone: u.user?.phone ?? null,
        calls,
        share: share(calls, callerTotal > 0 ? callerTotal : null),
      };
    })
    .sort((a, b) => b.calls - a.calls);

  /* ── The agent's own audit log — the only timestamped data here ── */
  const events: SiteChatEvent[] = (raw.activity ?? [])
    .map((e) => {
      const cost = e.meta && typeof e.meta.costUsd !== "undefined" ? num(e.meta.costUsd) : null;
      return {
        id: e.id,
        action: e.action,
        targetType: e.targetType,
        createdAt: e.createdAt ?? null,
        ageDays: ageInDays(e.createdAt ?? null),
        costUsd: cost,
      };
    })
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));

  const recencyRows = RECENCY_BANDS.map((b) => ({
    label: b.label,
    value: events.filter((e) => e.ageDays !== null && e.ageDays >= b.min && e.ageDays <= b.max).length,
  })).filter((r) => r.value > 0);
  const recencyBuckets = makeDimension(
    "recency",
    "Agent events by recency",
    "events",
    "The createdAt on each loaded /activity row, bucketed. Rows without a timestamp are excluded rather than assumed recent.",
    recencyRows,
  );

  const series = buildSeries(events, SERIES_DAYS);
  const seriesNote =
    raw.activity === null
      ? "The agent's /activity log could not be read this session, so no timeline can be drawn. /summary reports running totals only — it carries no per-day figures."
      : events.length === 0
        ? "The /activity log loaded but was empty, and /summary reports running totals with no per-day breakdown. There is no real time series to draw, so none is shown."
        : series === null
          ? `The loaded /activity rows all fall outside the last ${SERIES_DAYS} days, so a ${SERIES_DAYS}-day chart would be empty. Nothing is extrapolated to fill it.`
          : `Derived from ${events.length.toLocaleString()} real /activity timestamps over the last ${SERIES_DAYS} days. /summary itself reports no per-day figures.`;

  /* ── Runtime, from /stats ── */
  const stats = raw.stats;
  const model = stats?.model ?? null;
  const rateLimitPerMinute = num(stats?.rateLimitPerMinute);
  const monthlyBudgetUsd = num(stats?.monthlyBudgetUsd);
  const spendThisMonthUsd = num(stats?.spendThisMonthUsd);
  const statsCallsThisMonth = num(stats?.callsThisMonth);
  const tokensThisMonth = num(stats?.tokensThisMonth);
  const budgetUsedPct = share(spendThisMonthUsd, monthlyBudgetUsd);
  const costPerCallUsd =
    spendThisMonthUsd !== null && statsCallsThisMonth !== null && statsCallsThisMonth > 0
      ? Math.round((spendThisMonthUsd / statsCallsThisMonth) * 100000) / 100000
      : null;
  const avgTokensPerCall =
    totalTokens !== null && totalCalls !== null && totalCalls > 0 ? Math.round(totalTokens / totalCalls) : null;

  /* ── Headline metrics ── */
  const metrics: SiteChatMetric[] = [
    {
      key: "totalCalls",
      label: "All-Time Calls",
      value: totalCalls,
      kind: "count",
      note: totalCalls === null ? `${label} returned no totalCalls field.` : "Every assistant call the backend has logged.",
      tone: "purple",
      icon: "chat",
    },
    {
      key: "callsToday",
      label: "Calls Today",
      value: callsToday,
      kind: "count",
      note: callsToday === null ? `${label} returned no callsToday field.` : "Assistant calls logged since midnight.",
      tone: "blue",
      icon: "clock",
    },
    {
      key: "callsThisMonth",
      label: "Calls This Month",
      value: callsThisMonth,
      kind: "count",
      note: callsThisMonth === null ? `${label} returned no callsThisMonth field.` : "Assistant calls in the current billing month.",
      tone: "cyan",
      icon: "calendar",
    },
    {
      key: "cacheHitRate",
      label: "Cache Hit Rate",
      value: cacheHitRate,
      kind: "pct",
      note:
        cacheHitRate === null
          ? `${label} returned no cacheHitRate field.`
          : "Share of calls answered from cache without reaching the model.",
      tone: "green",
      icon: "check",
    },
    {
      key: "tokens",
      label: "Tokens Moved",
      value: totalTokens,
      kind: "count",
      note: totalTokens === null ? `${label} reported no token counters.` : "Prompt tokens in plus reply tokens out, all-time.",
      tone: "amber",
      icon: "trend",
    },
    {
      key: "spend",
      label: "Spend This Month",
      value: spendThisMonthUsd,
      kind: "usd",
      note:
        spendThisMonthUsd === null
          ? "The agent's /stats route did not load this session, so spend is unknown — not zero."
          : "This agent's own AI spend in the current month, from /stats.",
      tone: "red",
      icon: "target",
    },
  ];

  /* ── Computed rates ── */
  const rates: SiteChatRate[] = [
    {
      label: "Cache hit rate",
      value: cacheHitRate,
      unit: "%",
      note: "Reported directly by /summary as cacheHitRate.",
    },
    {
      label: "Calls that reached the model",
      value: share(uncachedCalls, totalCalls),
      unit: "%",
      note: "(totalCalls − cachedCalls) ÷ totalCalls — the share that actually cost money.",
    },
    {
      label: "Prompt share of token volume",
      value: share(tokensIn, totalTokens),
      unit: "%",
      note: "totalTokensIn ÷ (in + out). Above 50% means prompts outweigh replies.",
    },
    {
      label: "Today's share of the month",
      value: share(callsToday, callsThisMonth),
      unit: "%",
      note: "callsToday ÷ callsThisMonth — how much of the month's traffic landed today.",
    },
    {
      label: "Monthly budget consumed",
      value: budgetUsedPct,
      unit: "%",
      note:
        budgetUsedPct === null
          ? "Requires both spendThisMonthUsd and monthlyBudgetUsd from /stats; at least one was unavailable."
          : "spendThisMonthUsd ÷ monthlyBudgetUsd, from /stats.",
    },
    {
      label: "Cost per agent call",
      value: costPerCallUsd,
      unit: "$",
      note:
        costPerCallUsd === null
          ? "Requires spendThisMonthUsd and a non-zero callsThisMonth from /stats."
          : "spendThisMonthUsd ÷ callsThisMonth, from /stats. This is the agent's own cost, not the assistant's.",
    },
    {
      label: "Average tokens per assistant call",
      value: avgTokensPerCall,
      unit: "",
      note:
        avgTokensPerCall === null
          ? "Requires both token counters and a non-zero totalCalls from /summary."
          : "(tokensIn + tokensOut) ÷ totalCalls, all-time.",
    },
    {
      label: "Customer satisfaction",
      value: null,
      unit: "%",
      note: `${label} records no rating, thumbs or resolution flag on assistant calls — there is no satisfaction figure to compute.`,
    },
  ];

  /* ── Categorical cuts, each drawn only from reported figures ── */
  const dimensions: SiteChatDimension[] = [
    makeDimension(
      "cache",
      "Cached vs generated calls",
      "calls",
      "cachedCalls against (totalCalls − cachedCalls) from /summary.",
      toDim([
        { label: "Served from cache", value: cachedCalls },
        { label: "Generated by the model", value: uncachedCalls },
      ]),
    ),
    makeDimension(
      "tokens",
      "Token flow, in vs out",
      "tokens",
      "totalTokensIn and totalTokensOut from /summary.",
      toDim([
        { label: "Tokens in (prompts)", value: tokensIn },
        { label: "Tokens out (replies)", value: tokensOut },
      ]),
    ),
    makeDimension(
      "window",
      "Call volume by window",
      "calls",
      "The three call counters /summary reports. These windows overlap — today sits inside this month, which sits inside all-time.",
      toDim([
        { label: "Today", value: callsToday },
        { label: "This month", value: callsThisMonth },
        { label: "All time", value: totalCalls },
      ]),
    ),
    makeDimension(
      "callers",
      "Calls by top user",
      "calls",
      "The grouped topUsers list /conversations returns — the backend's own top-N, not the whole user base.",
      callers.map((c) => ({ label: c.name, value: c.calls })).filter((r) => r.value > 0),
    ),
    makeDimension(
      "eventKind",
      "Agent events by type",
      "events",
      "The targetType on each loaded /activity row.",
      tally(events, (e) => e.targetType),
    ),
    makeDimension(
      "eventAction",
      "Agent events by action",
      "events",
      "The action string on each loaded /activity row.",
      tally(events, (e) => e.action),
    ),
  ].filter((d) => d.rows.length > 0);

  /* ── What genuinely is not measured ── */
  const qualityGaps: string[] = [
    `${label} logs no rating, thumbs-up or feedback field on an assistant call, so satisfaction cannot be scored.`,
    `${label} stores no transcripts, so answer accuracy, hand-off rate and containment cannot be measured from this API.`,
    "/summary carries no error or failure counter, so a reliability rate cannot be computed.",
    "No response-latency field is returned by any of the four routes, so speed cannot be reported.",
  ];

  const measuredAnything =
    (totalCalls ?? 0) > 0 || (totalTokens ?? 0) > 0 || callers.length > 0 || events.length > 0;

  const partialNote =
    raw.failed.length > 0
      ? `${raw.failed.join(", ")} did not respond this session, so anything sourced from ${raw.failed.length > 1 ? "those routes" : "that route"} reads "Not tracked" rather than zero.`
      : null;

  return {
    ...empty,
    loading: false,
    error: null,
    coverageNote: `/summary reports running totals for the whole assistant. /conversations groups only the backend's own top ${callers.length || "N"} callers, not every user. /activity supplied ${events.length.toLocaleString()} audit rows (asked for up to ${ACTIVITY_PAGE_SIZE}), which is the only timestamped data in this workspace.`,
    conversationsNote:
      raw.conversations?.note ??
      "The assistant stores no transcripts — /conversations returns aggregate call metadata grouped by user, not a per-conversation table. No conversation rows are invented to fill the gap.",
    metrics,
    rates,
    dimensions,
    callers,
    events,
    recencyBuckets,
    series,
    seriesNote,
    cacheHitRate,
    cachedCalls,
    uncachedCalls,
    totalCalls,
    callsToday,
    callsThisMonth,
    tokensIn,
    tokensOut,
    totalTokens,
    model,
    rateLimitPerMinute,
    monthlyBudgetUsd,
    spendThisMonthUsd,
    budgetUsedPct,
    costPerCallUsd,
    tokensThisMonth,
    avgTokensPerCall,
    qualityGaps,
    isEmpty: !measuredAnything,
    partialNote,
  };
}
