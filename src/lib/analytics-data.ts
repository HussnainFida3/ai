"use client";

/**
 * Analytics Agent — normalized snapshot for the special workspace.
 *
 * The two backends answer the same question through genuinely different
 * routes and shapes:
 *
 *   GhrFix    GET  /ai-agents/analytics/summary   → { overview, userStats, providerStats, bookingStats }
 *             GET  /ai-agents/analytics/trend     → 14 real daily booking buckets
 *             GET  /ai-agents/analytics/breakdown → { byCity, byCategory }
 *   ShadiLife POST /ai-agents/analytics/insights  → { snapshot, insights }
 *
 * (Found in src/components/agents/views/ghrfix/analytics.tsx and
 * src/components/agents/views/shadilife/analytics.tsx respectively.)
 *
 * GhrFix is a marketplace — users, providers, bookings, cities, service
 * categories, and a real daily time series. ShadiLife is a matrimonial
 * product — members, views, interests, matches, sect/age/city demographics
 * and a 30-day-vs-previous-30-day growth pair, but *no* time series at all.
 *
 * Rather than force one backend's vocabulary on the other, everything below
 * collapses into one shape of labelled metrics, labelled dimensions and an
 * optional series. A figure the platform genuinely does not measure stays
 * `null` and carries a `note` naming the platform — it is never zero-filled,
 * because a zero here would read as a real measurement of "none".
 */

import { useEffect, useMemo, useState } from "react";
import { apiFetch, ApiError } from "./api";
import { platformLabel } from "./agent-data";
import type { PlatformKey } from "./platforms";

/* ── Public shape ───────────────────────────────────────────────────── */

/** One labelled slice of a categorical cut (city, category, sect, status…). */
export interface AnalyticsDim {
  label: string;
  value: number;
}

/** A named categorical cut, ready to hand straight to Donut / BarRows. */
export interface AnalyticsDimension {
  key: string;
  title: string;
  /** What the numbers actually count, e.g. "bookings" or "members". */
  unit: string;
  /** One line of provenance — which endpoint field this cut came from. */
  note: string;
  rows: AnalyticsDim[];
  total: number;
}

/** A headline figure. `value: null` means "the platform does not track it". */
export interface AnalyticsMetric {
  key: string;
  label: string;
  value: number | null;
  kind: "count" | "pct" | "rating";
  note: string;
  tone: string;
  icon: string;
  /** Only present where a real series exists behind the number. */
  spark: number[] | null;
}

/** A rate computed as arithmetic over two real counts — never estimated. */
export interface AnalyticsRate {
  label: string;
  value: number | null;
  note: string;
}

export interface AnalyticsSeries {
  labels: string[];
  series: Array<{ name: string; data: number[] }>;
  /** Human description of the bucket, e.g. "14 daily buckets". */
  granularity: string;
}

/** One row of the period-over-period comparison table. */
export interface AnalyticsPeriod {
  label: string;
  current: number | null;
  previous: number | null;
  deltaPct: number | null;
  note: string;
}

/** A flat, table-friendly projection of every dimension at once. */
export interface AnalyticsTableRow {
  id: string;
  dimension: string;
  label: string;
  value: number;
  sharePct: number;
  rank: number;
  unit: string;
}

export interface AnalyticsSnapshot {
  platform: PlatformKey;
  /** What this platform's analytics are fundamentally about. */
  domain: string;
  metrics: AnalyticsMetric[];
  rates: AnalyticsRate[];
  dimensions: AnalyticsDimension[];
  tableRows: AnalyticsTableRow[];
  /** null when the backend genuinely returns no time series. */
  series: AnalyticsSeries | null;
  /** Stated on the trends page when `series` is null, so the gap is explained. */
  seriesNote: string;
  periods: AnalyticsPeriod[];
  /** The single rate the overview ring shows, with its own scale. */
  headlineRate: AnalyticsRate & { max: number };
  /** Ranked table of individual records, where the backend returns any. */
  recent: Array<{ id: string; title: string; sub: string; status: string; when: string | null }>;
  /** True once a fetch has finished and produced no countable figures at all. */
  isEmpty: boolean;
  loading: boolean;
  error: string | null;
}

/* ── Raw backend shapes ─────────────────────────────────────────────── */

interface GhrSummary {
  overview?: {
    totalUsers?: number;
    providers?: { total?: number; verified?: number };
    bookings?: { total?: number; completed?: number; active?: number; cashSettledPKR?: number; tokensCirculatedInBookings?: number };
    openEmergencies?: number;
    activePromoCodes?: number;
    recentBookings?: Array<{
      id?: string;
      bookingNumber?: string;
      status?: string;
      createdAt?: string;
      category?: { name?: string } | null;
      customer?: { name?: string | null } | null;
      address?: { city?: string | null } | null;
    }>;
    topServices?: Array<{ category?: string; bookings?: number }>;
  };
  userStats?: { total?: number; active?: number; suspended?: number; banned?: number; pendingVerification?: number; providers?: number; newThisWeek?: number };
  providerStats?: { total?: number; verified?: number; pending?: number; rejected?: number; suspended?: number; available?: number; avgRating?: number };
  bookingStats?: { total?: number; pending?: number; active?: number; completed?: number; cancelled?: number };
}

interface GhrTrendPoint {
  date?: string;
  total?: number;
  completed?: number;
  cancelled?: number;
}

interface GhrBreakdown {
  byCity?: Array<{ city?: string | null; count?: number }>;
  byCategory?: Array<{ category?: string | null; bookings?: number }>;
}

interface ShadiSnapshot {
  totalUsers?: number;
  totalViews?: number;
  totalInterests?: number;
  totalMessages?: number;
  totalMatches?: number;
  verifiedCount?: number;
  premiumUsers?: number;
  premiumConversionPct?: number;
  engagement?: { viewsToInterestsPct?: number; matchesPerHundredInterests?: number; avgMessagesPerMatch?: number };
  newUsersLast30d?: number;
  newUsersPrev30d?: number;
  growth30dPct?: number | null;
  sectDistribution?: Array<{ sect?: string | null; count?: number }>;
  topCities?: Array<{ city?: string | null; count?: number }>;
  ageDistribution?: Array<{ range?: string; male?: number; female?: number }>;
}

/* ── Small honest helpers ───────────────────────────────────────────── */

/** Number or null — never coerces a missing field into 0. */
function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Percentage share of two real counts; null when the base is unknown or zero. */
function share(part: number | null, whole: number | null): number | null {
  if (part === null || whole === null || whole <= 0) return null;
  return Math.round((part / whole) * 1000) / 10;
}

function pctChange(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function dim(rows: Array<{ label: string; value: number | null }>): AnalyticsDim[] {
  return rows
    .filter((r): r is { label: string; value: number } => r.value !== null && r.value > 0)
    .map((r) => ({ label: r.label, value: r.value }))
    .sort((a, b) => b.value - a.value);
}

function sum(rows: AnalyticsDim[]): number {
  return rows.reduce((a, b) => a + b.value, 0);
}

function makeDimension(key: string, title: string, unit: string, note: string, rows: AnalyticsDim[]): AnalyticsDimension {
  return { key, title, unit, note, rows, total: sum(rows) };
}

/** Splits a real series in half and compares the two halves — no smoothing, no estimation. */
function halves(data: number[]): { current: number | null; previous: number | null } {
  if (data.length < 2) return { current: null, previous: null };
  const mid = Math.floor(data.length / 2);
  const prev = data.slice(0, mid);
  const cur = data.slice(mid);
  return { previous: prev.reduce((a, b) => a + b, 0), current: cur.reduce((a, b) => a + b, 0) };
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Format a metric for display, honouring the "not tracked" case. */
export function formatMetric(m: Pick<AnalyticsMetric, "value" | "kind">): string {
  if (m.value === null) return "Not tracked";
  if (m.kind === "pct") return `${m.value}%`;
  if (m.kind === "rating") return m.value.toFixed(2);
  return m.value.toLocaleString();
}

/* ── The hook ───────────────────────────────────────────────────────── */

interface RawState {
  ghr: { summary: GhrSummary; trend: GhrTrendPoint[] | null; breakdown: GhrBreakdown | null } | null;
  shadi: ShadiSnapshot | null;
}

const EMPTY_RAW: RawState = { ghr: null, shadi: null };

export function useAnalyticsSnapshot(platform: PlatformKey): AnalyticsSnapshot {
  const [raw, setRaw] = useState<RawState>(EMPTY_RAW);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRaw(EMPTY_RAW);
    setLoading(true);
    setError(null);

    async function run() {
      if (platform === "ghrfix") {
        // /summary is the page's spine; /trend and /breakdown are additive, so
        // a failure in either leaves the rest of the page honest rather than blank.
        const [summary, trend, breakdown] = await Promise.allSettled([
          apiFetch<GhrSummary>(platform, "/ai-agents/analytics/summary"),
          apiFetch<GhrTrendPoint[]>(platform, "/ai-agents/analytics/trend"),
          apiFetch<GhrBreakdown>(platform, "/ai-agents/analytics/breakdown"),
        ]);
        if (summary.status === "rejected") throw summary.reason;
        return {
          ghr: {
            summary: summary.value.data ?? {},
            trend: trend.status === "fulfilled" && Array.isArray(trend.value.data) ? trend.value.data : null,
            breakdown: breakdown.status === "fulfilled" ? (breakdown.value.data ?? null) : null,
          },
          shadi: null,
        } satisfies RawState;
      }
      // ShadiLife computes the whole snapshot in one deterministic Prisma
      // aggregate behind a POST; the AI narration it also returns is ignored
      // here, because this workspace charts measurements, not prose.
      const { data } = await apiFetch<{ snapshot?: ShadiSnapshot }>(platform, "/ai-agents/analytics/insights", { method: "POST" });
      return { ghr: null, shadi: data?.snapshot ?? {} } satisfies RawState;
    }

    run()
      .then((next) => {
        if (!cancelled) setRaw(next);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Could not reach the backend.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [platform]);

  return useMemo(() => derive(platform, raw, loading, error), [platform, raw, loading, error]);
}

/* ── Normalization ──────────────────────────────────────────────────── */

function derive(platform: PlatformKey, raw: RawState, loading: boolean, error: string | null): AnalyticsSnapshot {
  const label = platformLabel(platform);
  const base = platform === "ghrfix" ? deriveGhrfix(raw.ghr, label) : deriveShadilife(raw.shadi, label);

  const tableRows: AnalyticsTableRow[] = base.dimensions.flatMap((d) =>
    d.rows.map((r, i) => ({
      id: `${d.key}:${r.label}`,
      dimension: d.title,
      label: r.label,
      value: r.value,
      sharePct: d.total > 0 ? Math.round((r.value / d.total) * 1000) / 10 : 0,
      rank: i + 1,
      unit: d.unit,
    })),
  );

  const isEmpty =
    !loading &&
    error === null &&
    base.metrics.every((m) => m.value === null || m.value === 0) &&
    base.dimensions.every((d) => d.rows.length === 0);

  return { platform, ...base, tableRows, isEmpty, loading, error };
}

type Derived = Omit<AnalyticsSnapshot, "platform" | "tableRows" | "isEmpty" | "loading" | "error">;

function deriveGhrfix(ghr: RawState["ghr"], label: string): Derived {
  const s = ghr?.summary ?? {};
  const ov = s.overview ?? {};
  const us = s.userStats ?? {};
  const ps = s.providerStats ?? {};
  const bs = s.bookingStats ?? {};

  const totalUsers = num(us.total) ?? num(ov.totalUsers);
  const totalProviders = num(ps.total) ?? num(ov.providers?.total);
  const verifiedProviders = num(ps.verified) ?? num(ov.providers?.verified);
  const totalBookings = num(bs.total) ?? num(ov.bookings?.total);
  const completed = num(bs.completed) ?? num(ov.bookings?.completed);
  const cancelled = num(bs.cancelled);
  const active = num(bs.active) ?? num(ov.bookings?.active);
  const pending = num(bs.pending);
  const newThisWeek = num(us.newThisWeek);
  const avgRating = num(ps.avgRating);

  /* Time series — 14 real daily buckets from /trend. */
  const trend = ghr?.trend ?? null;
  const series: AnalyticsSeries | null =
    trend && trend.length > 1
      ? {
          labels: trend.map((p) => (p.date ? shortDate(p.date) : "—")),
          series: [
            { name: "All bookings", data: trend.map((p) => num(p.total) ?? 0) },
            { name: "Completed", data: trend.map((p) => num(p.completed) ?? 0) },
            { name: "Cancelled", data: trend.map((p) => num(p.cancelled) ?? 0) },
          ],
          granularity: `${trend.length} daily buckets from /ai-agents/analytics/trend`,
        }
      : null;

  const totalSpark = series?.series[0]?.data ?? null;

  const metrics: AnalyticsMetric[] = [
    { key: "users", label: "Total Users", value: totalUsers, kind: "count", note: "Every registered account, from userStats.total.", tone: "purple", icon: "users", spark: null },
    { key: "providers", label: "Providers", value: totalProviders, kind: "count", note: verifiedProviders === null ? "From providerStats.total." : `${verifiedProviders.toLocaleString()} verified.`, tone: "cyan", icon: "check", spark: null },
    { key: "bookings", label: "Total Bookings", value: totalBookings, kind: "count", note: "Lifetime bookings from bookingStats.total.", tone: "blue", icon: "posts", spark: totalSpark },
    { key: "completed", label: "Completed", value: completed, kind: "count", note: "Bookings that reached COMPLETED.", tone: "green", icon: "check", spark: series?.series[1]?.data ?? null },
    { key: "active", label: "In Flight", value: active, kind: "count", note: "Bookings currently active.", tone: "amber", icon: "clock", spark: null },
    { key: "new-week", label: "New This Week", value: newThisWeek, kind: "count", note: "New user accounts, from userStats.newThisWeek.", tone: "red", icon: "trend", spark: null },
  ];

  const rates: AnalyticsRate[] = [
    { label: "Booking completion rate", value: share(completed, totalBookings), note: "completed ÷ total bookings." },
    { label: "Cancellation rate", value: share(cancelled, totalBookings), note: "cancelled ÷ total bookings." },
    { label: "Provider verification rate", value: share(verifiedProviders, totalProviders), note: "verified ÷ total providers." },
    { label: "Provider availability", value: share(num(ps.available), totalProviders), note: "available ÷ total providers." },
    { label: "Providers as share of users", value: share(totalProviders, totalUsers), note: "providers ÷ all users." },
  ];

  const cityRows = dim((ghr?.breakdown?.byCity ?? []).map((c) => ({ label: c.city?.trim() || "Unspecified", value: num(c.count) })));
  const categoryRows = dim(
    (ghr?.breakdown?.byCategory ?? []).map((c) => ({ label: c.category?.trim() || "Uncategorised", value: num(c.bookings) })),
  );
  const topServiceRows = dim((ov.topServices ?? []).map((t) => ({ label: t.category?.trim() || "Uncategorised", value: num(t.bookings) })));

  const dimensions: AnalyticsDimension[] = [
    makeDimension("booking-status", "Bookings by status", "bookings", "bookingStats — the live status counters.", dim([
      { label: "Completed", value: completed },
      { label: "Active", value: active },
      { label: "Pending", value: pending },
      { label: "Cancelled", value: cancelled },
    ])),
    makeDimension("user-status", "Users by account state", "users", "userStats — real account-state counters.", dim([
      { label: "Active", value: num(us.active) },
      { label: "Pending verification", value: num(us.pendingVerification) },
      { label: "Suspended", value: num(us.suspended) },
      { label: "Banned", value: num(us.banned) },
    ])),
    makeDimension("provider-status", "Providers by review state", "providers", "providerStats — verification pipeline counters.", dim([
      { label: "Verified", value: verifiedProviders },
      { label: "Pending", value: num(ps.pending) },
      { label: "Rejected", value: num(ps.rejected) },
      { label: "Suspended", value: num(ps.suspended) },
    ])),
    makeDimension("city", "Users by city", "users", "A live groupBy over User.city from /breakdown.", cityRows),
    makeDimension("category", "Bookings by service category", "bookings", "byCategory from /breakdown.", categoryRows),
    makeDimension("top-services", "Top services", "bookings", "overview.topServices — the backend's own ranking.", topServiceRows),
  ].filter((d) => d.rows.length > 0);

  const bookingHalves = halves(series?.series[0]?.data ?? []);
  const completedHalves = halves(series?.series[1]?.data ?? []);
  const cancelledHalves = halves(series?.series[2]?.data ?? []);
  const periodNote = series ? "Second half of the real 14-day window vs the first half." : "";

  const periods: AnalyticsPeriod[] = series
    ? [
        { label: "All bookings", current: bookingHalves.current, previous: bookingHalves.previous, deltaPct: pctChange(bookingHalves.current, bookingHalves.previous), note: periodNote },
        { label: "Completed", current: completedHalves.current, previous: completedHalves.previous, deltaPct: pctChange(completedHalves.current, completedHalves.previous), note: periodNote },
        { label: "Cancelled", current: cancelledHalves.current, previous: cancelledHalves.previous, deltaPct: pctChange(cancelledHalves.current, cancelledHalves.previous), note: periodNote },
      ]
    : [];

  const recent = (ov.recentBookings ?? []).map((b, i) => ({
    id: b.id ?? `booking-${i}`,
    title: b.bookingNumber ? `#${b.bookingNumber}` : "Booking",
    sub: [b.category?.name, b.address?.city, b.customer?.name].filter(Boolean).join(" · ") || "No details returned",
    status: b.status ?? "UNKNOWN",
    when: b.createdAt ?? null,
  }));

  return {
    domain: "Users, providers and bookings",
    metrics,
    rates,
    dimensions,
    series,
    seriesNote: series
      ? `${label} returns ${series.granularity}.`
      : `${label}'s /ai-agents/analytics/trend returned no usable buckets, so no time series can be drawn.`,
    periods,
    headlineRate: {
      label: "Completion rate",
      value: share(completed, totalBookings),
      max: 100,
      note: "Completed bookings as a share of all bookings.",
    },
    recent,
  };
}

function deriveShadilife(snap: ShadiSnapshot | null, label: string): Derived {
  const s = snap ?? {};
  const totalUsers = num(s.totalUsers);
  const views = num(s.totalViews);
  const interests = num(s.totalInterests);
  const messages = num(s.totalMessages);
  const matches = num(s.totalMatches);
  const verified = num(s.verifiedCount);
  const premium = num(s.premiumUsers);
  const premiumPct = num(s.premiumConversionPct);
  const last30 = num(s.newUsersLast30d);
  const prev30 = num(s.newUsersPrev30d);
  const growth = num(s.growth30dPct);

  const metrics: AnalyticsMetric[] = [
    { key: "members", label: "Total Members", value: totalUsers, kind: "count", note: "Every registered member, from snapshot.totalUsers.", tone: "purple", icon: "users", spark: null },
    { key: "views", label: "Profile Views", value: views, kind: "count", note: "Lifetime profile views recorded by the platform.", tone: "blue", icon: "eye", spark: null },
    { key: "interests", label: "Interests Sent", value: interests, kind: "count", note: "Interest expressions — the middle of the funnel.", tone: "cyan", icon: "heart", spark: null },
    { key: "matches", label: "Matches", value: matches, kind: "count", note: "Mutual matches formed.", tone: "green", icon: "check", spark: null },
    { key: "messages", label: "Messages", value: messages, kind: "count", note: "Messages exchanged across all matches.", tone: "amber", icon: "chat", spark: null },
    {
      key: "growth",
      label: "30-Day Growth",
      value: growth,
      kind: "pct",
      note: last30 === null ? `${label} returned no 30-day growth figure.` : `${last30.toLocaleString()} new in the last 30 days.`,
      tone: "red",
      icon: "trend",
      spark: null,
    },
  ];

  const rates: AnalyticsRate[] = [
    { label: "Views → interests", value: num(s.engagement?.viewsToInterestsPct), note: "Share of profile views that became an interest." },
    { label: "Matches per 100 interests", value: num(s.engagement?.matchesPerHundredInterests), note: "Backend-computed funnel conversion." },
    { label: "Avg messages per match", value: num(s.engagement?.avgMessagesPerMatch), note: "Conversation depth once a match forms." },
    { label: "Verified members", value: share(verified, totalUsers), note: "verifiedCount ÷ total members." },
    { label: "Premium conversion", value: premiumPct, note: premium === null ? "From snapshot.premiumConversionPct." : `${premium.toLocaleString()} premium members.` },
  ];

  const ageBuckets = s.ageDistribution ?? [];
  const maleTotal = ageBuckets.reduce((a, b) => a + (num(b.male) ?? 0), 0);
  const femaleTotal = ageBuckets.reduce((a, b) => a + (num(b.female) ?? 0), 0);

  const dimensions: AnalyticsDimension[] = [
    makeDimension("funnel", "Engagement funnel", "events", "The real view → interest → match → message counters.", dim([
      { label: "Profile views", value: views },
      { label: "Interests", value: interests },
      { label: "Matches", value: matches },
      { label: "Messages", value: messages },
    ])),
    makeDimension("membership", "Membership standing", "members", "verifiedCount and premiumUsers against the member total.", dim([
      { label: "Verified", value: verified },
      { label: "Premium", value: premium },
      { label: "Standard", value: totalUsers !== null && verified !== null ? Math.max(0, totalUsers - verified) : null },
    ])),
    makeDimension("city", "Members by city", "members", "topCities — a live groupBy over member city.", dim((s.topCities ?? []).map((c) => ({ label: c.city?.trim() || "Unspecified", value: num(c.count) })))),
    makeDimension("sect", "Members by sect", "members", "sectDistribution from the snapshot.", dim((s.sectDistribution ?? []).map((x) => ({ label: x.sect?.trim() || "Unspecified", value: num(x.count) })))),
    makeDimension("age", "Members by age band", "members", "ageDistribution, male + female per band.", dim(ageBuckets.map((b) => ({ label: b.range ?? "Unknown", value: (num(b.male) ?? 0) + (num(b.female) ?? 0) })))),
    makeDimension("gender", "Members by gender", "members", "Summed across every ageDistribution band.", dim([
      { label: "Male", value: maleTotal || null },
      { label: "Female", value: femaleTotal || null },
    ])),
  ].filter((d) => d.rows.length > 0);

  const periods: AnalyticsPeriod[] =
    last30 === null && prev30 === null
      ? []
      : [
          {
            label: "New members",
            current: last30,
            previous: prev30,
            deltaPct: growth ?? pctChange(last30, prev30),
            note: "Last 30 days vs the 30 days before — the only period pair the backend returns.",
          },
        ];

  return {
    domain: "Members, matches and engagement",
    metrics,
    rates,
    dimensions,
    // ShadiLife's snapshot is a set of aggregates, not a bucketed series.
    // Inventing daily points from a 30-day total would be fabrication.
    series: null,
    seriesNote: `${label}'s analytics snapshot returns aggregate totals plus one 30-day growth pair — it exposes no bucketed time series, so no trend line can honestly be drawn.`,
    periods,
    headlineRate: {
      label: "Premium conversion",
      value: premiumPct,
      max: 100,
      note: "Premium members as a share of all members, as reported by the backend.",
    },
    recent: [],
  };
}
