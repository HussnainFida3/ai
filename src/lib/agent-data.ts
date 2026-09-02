"use client";

import { use, useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { apiFetch, ApiError, type ChatTurn } from "./api";
import { PLATFORMS, type PlatformKey } from "./platforms";

/**
 * GhrFix and ShadiLife each expose real AI-agent data, but through two
 * genuinely different backend shapes (built independently). Rather than
 * force one interface on both, each hook below normalizes into a small
 * common shape the pixel-perfect UI components can render directly,
 * leaving fields with no honest equivalent on one platform as `null`.
 */

/** Matches this project's existing /[platform]/[agent] convention: params is a Promise, unwrapped with `use()`. */
export function usePlatformParam(params: Promise<{ platform: string }>): PlatformKey {
  const { platform } = use(params);
  if (platform !== "ghrfix" && platform !== "shadilife") notFound();
  return platform;
}

export interface FinanceSnapshot {
  totalRevenuePkr: number | null;
  totalRevenueLabel: string;
  secondaryPkr: number | null;
  secondaryLabel: string;
  cashOrPendingValue: string | null;
  cashOrPendingLabel: string;
  changePct: number | null;
  loading: boolean;
  error: string | null;
}

export function useFinanceSnapshot(platform: PlatformKey): FinanceSnapshot {
  const [state, setState] = useState<Omit<FinanceSnapshot, "loading" | "error">>({
    totalRevenuePkr: null,
    totalRevenueLabel: "Total Revenue",
    secondaryPkr: null,
    secondaryLabel: "Accept Fees Collected",
    cashOrPendingValue: null,
    cashOrPendingLabel: "Cash Settled",
    changePct: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    apiFetch<Record<string, unknown>>(platform, "/ai-agents/finance/summary")
      .then(({ data }) => {
        if (cancelled) return;
        if (platform === "ghrfix") {
          const walletTotals = data.walletTotals as
            | { acceptFeesCollected: number; totalCredits: number; totalDebits: number }
            | undefined;
          const bookings = data.bookings as { cashSettledPKR: number } | undefined;
          setState({
            totalRevenuePkr: walletTotals ? Math.round(walletTotals.totalCredits - walletTotals.totalDebits) : null,
            totalRevenueLabel: "Net Token Flow",
            secondaryPkr: walletTotals ? Math.round(walletTotals.acceptFeesCollected) : null,
            secondaryLabel: "Accept Fees Collected",
            cashOrPendingValue: bookings ? `PKR ${Math.round(bookings.cashSettledPKR).toLocaleString()}` : null,
            cashOrPendingLabel: "Cash Settled (bookings)",
            changePct: null,
          });
        } else {
          // ShadiLife's /summary responds with a raw {snapshot, summary, bullets,
          // marketingNudge} body — no {success,data} envelope like GhrFix's ok()
          // helper — so apiFetch's unwrap falls back to the whole payload. The
          // real numeric fields live one level down, under `snapshot`.
          const snap = (data.snapshot as Record<string, unknown>) ?? data;
          setState({
            totalRevenuePkr: Math.round(Number(snap.revenueThisMonthPkr ?? 0)),
            totalRevenueLabel: "Revenue This Month",
            secondaryPkr: Math.round(Number(snap.revenueThisYearPkr ?? 0)),
            secondaryLabel: "Revenue This Year",
            cashOrPendingValue: String(snap.pendingPaymentsCount ?? 0),
            cashOrPendingLabel: "Pending Payments",
            changePct: snap.monthOverMonthChangePct == null ? null : Number(snap.monthOverMonthChangePct),
          });
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Could not reach the backend.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [platform]);

  return { ...state, loading, error };
}

export interface RevenueByCategoryRow {
  label: string;
  acceptFees: number;
  cashSettled: number;
  tokensApplied: number;
  bookings: number;
}
export interface RevenueByCityRow {
  label: string;
  acceptFees: number;
  cashSettled: number;
  bookings: number;
}
export interface SettlementMix {
  cashOnlyBookings: number;
  cashPlusTokenBookings: number;
  totalCashSettledPKR: number;
  totalTokensApplied: number;
  totalAcceptFees: number;
}
export interface TrendPoint {
  date: string;
  total: number;
}
export interface PaymentsByStatusRow {
  status: string;
  count: number;
  totalAmountPkr: number;
}
export interface RevenueByTierRow {
  tier: string;
  totalAmountPkr: number;
  count: number;
}
export interface AgentPayoutRow {
  status: string;
  totalAmount: number;
  count: number;
}

/**
 * The real substitute for "grouped transactions" / "payout recipients" / "profit
 * breakdown" wherever those used to be fabricated per-row mock data. GhrFix has
 * no per-transaction or per-provider-payout list endpoint, so /breakdown's
 * category/city/settlement aggregates (computed live off the most recent 3000
 * completed ServiceBooking rows) stand in. ShadiLife has no per-transaction or
 * per-recipient-payout list either, so /summary's grouped payments/tier/
 * agentPayout aggregates stand in there. Both are real and aggregate — just
 * honestly not a row-per-item table like the mockups implied.
 */
export interface FinanceBreakdown {
  // GhrFix only (from /breakdown) — null on ShadiLife.
  revenueByCategory: RevenueByCategoryRow[] | null;
  revenueByCity: RevenueByCityRow[] | null;
  settlementMix: SettlementMix | null;
  settlementTrend: TrendPoint[] | null;
  sampledBookings: number | null;
  // ShadiLife only (from /summary) — null on GhrFix.
  payments: PaymentsByStatusRow[] | null;
  approvedRevenueByTier: RevenueByTierRow[] | null;
  agentPayouts: AgentPayoutRow[] | null;
  revenueThisYearPkr: number | null;
  agentPayoutsThisMonthPkr: number | null;
  pendingPaymentsCount: number | null;
  // Real AI-written copy grounded in the real snapshot (ShadiLife only; GhrFix's
  // finance-agent has no equivalent summary field, so this stays null there
  // rather than being faked).
  aiSummary: string | null;
  aiBullets: string[];
  loading: boolean;
  error: string | null;
}

export function useFinanceBreakdown(platform: PlatformKey): FinanceBreakdown {
  const [state, setState] = useState<Omit<FinanceBreakdown, "loading" | "error">>({
    revenueByCategory: null,
    revenueByCity: null,
    settlementMix: null,
    settlementTrend: null,
    sampledBookings: null,
    payments: null,
    approvedRevenueByTier: null,
    agentPayouts: null,
    revenueThisYearPkr: null,
    agentPayoutsThisMonthPkr: null,
    pendingPaymentsCount: null,
    aiSummary: null,
    aiBullets: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const call =
      platform === "ghrfix"
        ? apiFetch<Record<string, unknown>>(platform, "/ai-agents/finance/breakdown")
        : apiFetch<Record<string, unknown>>(platform, "/ai-agents/finance/summary");

    call
      .then(({ data }) => {
        if (cancelled) return;
        if (platform === "ghrfix") {
          setState({
            revenueByCategory: Array.isArray(data.revenueByCategory) ? (data.revenueByCategory as RevenueByCategoryRow[]) : [],
            revenueByCity: Array.isArray(data.revenueByCity) ? (data.revenueByCity as RevenueByCityRow[]) : [],
            settlementMix: (data.settlementMix as SettlementMix) ?? null,
            settlementTrend: Array.isArray(data.settlementTrend) ? (data.settlementTrend as TrendPoint[]) : [],
            sampledBookings: data.sampledBookings == null ? null : Number(data.sampledBookings),
            payments: null,
            approvedRevenueByTier: null,
            agentPayouts: null,
            revenueThisYearPkr: null,
            agentPayoutsThisMonthPkr: null,
            pendingPaymentsCount: null,
            aiSummary: null,
            aiBullets: [],
          });
        } else {
          // Same envelope quirk as useFinanceSnapshot: ShadiLife's /summary has no
          // {success,data} wrapper, so the real fields live under `data.snapshot`.
          const snap = (data.snapshot as Record<string, unknown>) ?? {};
          setState({
            revenueByCategory: null,
            revenueByCity: null,
            settlementMix: null,
            settlementTrend: null,
            sampledBookings: null,
            payments: Array.isArray(snap.payments) ? (snap.payments as PaymentsByStatusRow[]) : [],
            approvedRevenueByTier: Array.isArray(snap.approvedRevenueByTier) ? (snap.approvedRevenueByTier as RevenueByTierRow[]) : [],
            agentPayouts: Array.isArray(snap.agentPayouts) ? (snap.agentPayouts as AgentPayoutRow[]) : [],
            revenueThisYearPkr: snap.revenueThisYearPkr == null ? null : Number(snap.revenueThisYearPkr),
            agentPayoutsThisMonthPkr: snap.agentPayoutsThisMonthPkr == null ? null : Number(snap.agentPayoutsThisMonthPkr),
            pendingPaymentsCount: snap.pendingPaymentsCount == null ? null : Number(snap.pendingPaymentsCount),
            aiSummary: typeof data.summary === "string" ? data.summary : null,
            aiBullets: Array.isArray(data.bullets) ? (data.bullets as string[]) : [],
          });
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Could not reach the backend.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [platform]);

  return { ...state, loading, error };
}

export interface FinanceTrendPoint {
  date: string;
  value: number;
}

/**
 * The real time series behind "revenue over time" style charts. GhrFix has no
 * PKR-denominated daily revenue series, so /trend's daily wallet-CREDIT totals
 * (token amounts, not PKR) stand in, clearly unit-labeled. ShadiLife's
 * /forecast already returns real daily PKR revenue for the last 90 days plus
 * a real linear-regression projection for the next 30.
 */
export interface FinanceTrend {
  points: FinanceTrendPoint[];
  unit: "tokens" | "PKR";
  label: string;
  projected: FinanceTrendPoint[];
  projectedNext30dTotalPkr: number | null;
  loading: boolean;
  error: string | null;
}

export function useFinanceTrend(platform: PlatformKey): FinanceTrend {
  const [state, setState] = useState<Omit<FinanceTrend, "loading" | "error">>({
    points: [],
    unit: "PKR",
    label: "",
    projected: [],
    projectedNext30dTotalPkr: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const call =
      platform === "ghrfix"
        ? apiFetch<Array<{ date: string; total: number }>>(platform, "/ai-agents/finance/trend")
        : apiFetch<Record<string, unknown>>(platform, "/ai-agents/finance/forecast");

    call
      .then(({ data }) => {
        if (cancelled) return;
        if (platform === "ghrfix") {
          const arr = Array.isArray(data) ? data : [];
          setState({
            points: arr.map((d) => ({ date: d.date, value: d.total })),
            unit: "tokens",
            label: "Daily wallet credits — last 30 days (real)",
            projected: [],
            projectedNext30dTotalPkr: null,
          });
        } else {
          const d = data as {
            label?: string;
            historical?: Array<{ date: string; amountPkr: number }>;
            projected?: Array<{ date: string; amountPkr: number }>;
            projectedNext30dTotalPkr?: number;
          };
          const hist = Array.isArray(d.historical) ? d.historical : [];
          const proj = Array.isArray(d.projected) ? d.projected : [];
          setState({
            points: hist.map((h) => ({ date: h.date, value: h.amountPkr })),
            unit: "PKR",
            label: d.label ?? "Daily revenue — last 90 days (real)",
            projected: proj.map((p) => ({ date: p.date, value: p.amountPkr })),
            projectedNext30dTotalPkr: d.projectedNext30dTotalPkr == null ? null : Number(d.projectedNext30dTotalPkr),
          });
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Could not reach the backend.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [platform]);

  return { ...state, loading, error };
}

/**
 * The one real write action a read-only Finance Agent can safely take on
 * GhrFix: pull every live figure into a timestamped snapshot and permanently
 * audit-log it (see finance-agent/router.ts POST /report/generate). ShadiLife's
 * finance-agent has no equivalent endpoint, so its Reports page instead builds
 * an honestly-labeled client-side snapshot from already-fetched real data
 * rather than pretending to call a server report generator that doesn't exist.
 */
export interface GhrfixFinanceReportSnapshot {
  generatedAt: string;
  generatedBy: string;
  note: string | null;
  walletTotals: Record<string, unknown>;
  bookings: Record<string, unknown>;
  economy: Record<string, unknown>;
  breakdown: Record<string, unknown>;
}

export async function generateGhrfixFinanceReport(note?: string): Promise<GhrfixFinanceReportSnapshot> {
  const { data } = await apiFetch<GhrfixFinanceReportSnapshot>("ghrfix", "/ai-agents/finance/report/generate", {
    method: "POST",
    body: note ? { note } : {},
  });
  return data;
}

export interface SeoSnapshot {
  averageScore: number | null;
  maxScore: number;
  publishedCount: number | null;
  needsImprovement: Array<{ id: string; title: string; score: number }>;
  mostCommonIssue: { rule: string; failingPercent: number } | null;
  loading: boolean;
  error: string | null;
}

export function useSeoSnapshot(platform: PlatformKey): SeoSnapshot {
  const [state, setState] = useState<Omit<SeoSnapshot, "loading" | "error">>({
    averageScore: null,
    maxScore: 9.5,
    publishedCount: null,
    needsImprovement: [],
    mostCommonIssue: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const call =
      platform === "ghrfix"
        ? apiFetch<Record<string, unknown>>(platform, "/ai-agents/seo/audit")
        : apiFetch<Record<string, unknown>>(platform, "/ai-agents/seo/site-audit", { method: "POST" });

    call
      .then(({ data }) => {
        if (cancelled) return;
        setState({
          averageScore: data.averageScore == null ? null : Number(data.averageScore),
          maxScore: data.maxScore == null ? 9.5 : Number(data.maxScore),
          publishedCount: data.publishedCount == null ? null : Number(data.publishedCount),
          needsImprovement: Array.isArray(data.needsImprovement) ? (data.needsImprovement as SeoSnapshot["needsImprovement"]) : [],
          mostCommonIssue: (data.mostCommonIssue as SeoSnapshot["mostCommonIssue"]) ?? null,
        });
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Could not reach the backend.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [platform]);

  return { ...state, loading, error };
}

export interface SeoPostRow {
  id: string;
  title: string;
  slug: string | null;
  score: number;
  /** Every real point deduction for this post. Always empty on GhrFix — only a site-wide aggregate exists there (see `SeoAudit.issueCategories`). Real per-post text on ShadiLife. */
  reasons: string[];
  /** Subset of `reasons` an AI fix can actually address. Same GhrFix/ShadiLife split as `reasons`. */
  issues: string[];
  /** True when a real one-click Improve endpoint can act on this exact post right now. */
  canFix: boolean;
}

export interface SeoIssueCategory {
  label: string;
  failingCount: number;
  failingPercent: number | null;
}

export interface SeoAudit {
  maxScore: number;
  averageScore: number | null;
  checkedCount: number | null;
  /** What `checkedCount` actually covers — the two backends check a different real scope. */
  checkedScopeLabel: string;
  /** Every post the backend scored, in the order returned. */
  posts: SeoPostRow[];
  /** Posts that genuinely need attention — below max score, real per-platform rule. */
  needsImprovement: SeoPostRow[];
  /** Real per-category failure counts, worst first: GhrFix's own `ruleFailures`, or (ShadiLife) grouped from every post's real `reasons` text. */
  issueCategories: SeoIssueCategory[];
  topIssue: SeoIssueCategory | null;
  loading: boolean;
  error: string | null;
}

const ISSUE_CATEGORY_RULES: Array<{ label: string; test: (t: string) => boolean }> = [
  { label: "Meta Description", test: (t) => t.includes("meta description") || t.includes("description") },
  { label: "Meta Title", test: (t) => t.includes("meta title") || t.includes("title") },
  { label: "Keywords", test: (t) => t.includes("keyword") },
  { label: "Content Length", test: (t) => t.includes("word count") || t.includes("content length") || t.includes("short") || t.includes("thin") },
  { label: "Headings / Structure", test: (t) => t.includes("heading") || t.includes("h1") || t.includes("h2") || t.includes("structure") },
  { label: "Images", test: (t) => t.includes("image") || t.includes("alt text") },
  { label: "URL / Slug", test: (t) => t.includes("slug") || t.includes("url") },
];

/** Best-effort, text-based grouping of one real deduction reason into a human category — used only where the backend doesn't already hand us a rule name (ShadiLife; GhrFix's `ruleFailures` already comes pre-grouped). */
export function categorizeReason(reason: string): string {
  const t = reason.toLowerCase();
  for (const rule of ISSUE_CATEGORY_RULES) {
    if (rule.test(t)) return rule.label;
  }
  return "Other";
}

/**
 * Full per-post SEO audit, normalized across GhrFix's flatter GET /audit (site-wide
 * `ruleFailures`, no per-post reasons) and ShadiLife's richer POST /site-audit
 * (per-post `reasons`/`issues`, no backend-computed average or per-rule aggregate).
 * Every derived number below (ShadiLife's average, its issue categories) is computed
 * client-side from the real per-post data the backend returns — never invented.
 */
export function useSeoAudit(platform: PlatformKey): SeoAudit {
  const [state, setState] = useState<Omit<SeoAudit, "loading" | "error">>({
    maxScore: 9.5,
    averageScore: null,
    checkedCount: null,
    checkedScopeLabel: "",
    posts: [],
    needsImprovement: [],
    issueCategories: [],
    topIssue: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const call =
      platform === "ghrfix"
        ? apiFetch<Record<string, unknown>>(platform, "/ai-agents/seo/audit")
        : apiFetch<Record<string, unknown>>(platform, "/ai-agents/seo/site-audit", { method: "POST" });

    call
      .then(({ data }) => {
        if (cancelled) return;
        const maxScore = data.maxScore == null ? 9.5 : Number(data.maxScore);

        if (platform === "ghrfix") {
          type GhrPost = { id: string; title: string; score: number };
          const toRow = (p: GhrPost): SeoPostRow => ({
            id: p.id,
            title: p.title,
            slug: null,
            score: Number(p.score),
            reasons: [],
            issues: [],
            canFix: Number(p.score) < maxScore,
          });
          const posts = Array.isArray(data.posts) ? (data.posts as GhrPost[]).map(toRow) : [];
          const needsImprovement = Array.isArray(data.needsImprovement)
            ? (data.needsImprovement as GhrPost[]).map(toRow)
            : [];

          type RuleFailure = { rule: string; failingCount: number; failingPercent: number };
          const ruleFailures = Array.isArray(data.ruleFailures) ? (data.ruleFailures as RuleFailure[]) : [];
          const issueCategories: SeoIssueCategory[] = ruleFailures.map((rf) => ({
            label: rf.rule,
            failingCount: rf.failingCount,
            failingPercent: rf.failingPercent,
          }));
          const mostCommon = data.mostCommonIssue as RuleFailure | null | undefined;

          setState({
            maxScore,
            averageScore: data.averageScore == null ? null : Number(data.averageScore),
            checkedCount: data.publishedCount == null ? null : Number(data.publishedCount),
            checkedScopeLabel: "every published post",
            posts,
            needsImprovement,
            issueCategories,
            topIssue: mostCommon
              ? { label: mostCommon.rule, failingCount: mostCommon.failingCount, failingPercent: mostCommon.failingPercent }
              : issueCategories[0] ?? null,
          });
        } else {
          type ShadiResult = {
            postId: string; title: string; slug?: string; score: number;
            issues?: string[]; reasons?: string[]; suggestedFix?: unknown;
          };
          const rawResults = Array.isArray(data.results) ? (data.results as ShadiResult[]) : [];
          const posts: SeoPostRow[] = rawResults.map((r) => ({
            id: r.postId,
            title: r.title,
            slug: r.slug ?? null,
            score: Number(r.score),
            reasons: Array.isArray(r.reasons) ? r.reasons : [],
            issues: Array.isArray(r.issues) ? r.issues : [],
            canFix: r.suggestedFix != null && Number(r.score) < maxScore,
          }));
          const needsImprovement = posts.filter((p) => p.issues.length > 0 || p.score < maxScore);

          const counts = new Map<string, number>();
          for (const p of posts) {
            const seen = new Set<string>();
            for (const reason of p.reasons) {
              const label = categorizeReason(reason);
              if (seen.has(label)) continue;
              seen.add(label);
              counts.set(label, (counts.get(label) ?? 0) + 1);
            }
          }
          const issueCategories: SeoIssueCategory[] = Array.from(counts.entries())
            .map(([label, failingCount]) => ({
              label,
              failingCount,
              failingPercent: posts.length ? Math.round((failingCount / posts.length) * 1000) / 10 : null,
            }))
            .sort((a, b) => b.failingCount - a.failingCount);

          const averageScore = posts.length
            ? Math.round((posts.reduce((sum, p) => sum + p.score, 0) / posts.length) * 100) / 100
            : null;

          setState({
            maxScore,
            averageScore,
            checkedCount: data.postsChecked == null ? posts.length : Number(data.postsChecked),
            checkedScopeLabel: "the 25 most recently published posts",
            posts,
            needsImprovement,
            issueCategories,
            topIssue: issueCategories[0] ?? null,
          });
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Could not reach the backend.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [platform]);

  return { ...state, loading, error };
}

/**
 * Real one-click AI fix. GhrFix always regenerates + saves a better title/description
 * for the post; ShadiLife only works when the audit already produced a `suggestedFix`
 * for that post (see `SeoPostRow.canFix`). Returns the post's updated real score.
 */
export async function improveSeoPost(platform: PlatformKey, postId: string): Promise<number> {
  if (platform === "ghrfix") {
    const { data } = await apiFetch<{ score: number }>(platform, `/ai-agents/seo/improve/${postId}`, { method: "POST" });
    return Number(data.score);
  }
  const { data } = await apiFetch<{ score: number }>(platform, `/ai-agents/seo/audit-blog/${postId}/improve`, { method: "POST" });
  return Number(data.score);
}

/**
 * GhrFix gives every agent its own POST /ai-agents/<key>/chat (message + history,
 * returns {reply}). ShadiLife instead runs one shared POST /ai-agents/ask for every
 * agent page (agentKey + agentLabel + question, returns {reply}) — different shape,
 * same job. This is the one place that difference is absorbed.
 */
export async function agentChat(
  platform: PlatformKey,
  agentKey: string,
  agentLabel: string,
  message: string,
  history: ChatTurn[],
): Promise<string> {
  if (platform === "ghrfix") {
    const { data } = await apiFetch<{ reply: string }>(platform, `/ai-agents/${agentKey}/chat`, {
      method: "POST",
      body: { message, history },
    });
    return data.reply;
  }
  const { data } = await apiFetch<{ reply: string }>(platform, "/ai-agents/ask", {
    method: "POST",
    body: { agentKey, agentLabel, question: message },
  });
  return data.reply;
}

export function platformLabel(platform: PlatformKey): string {
  return PLATFORMS[platform].label;
}

/** The platform's real brand-mark image (Cloudinary) — always use in an <img>, never a CSS background. */
export function platformLogoUrl(platform: PlatformKey): string {
  return PLATFORMS[platform].logoUrl;
}

/* ══════════════════════════════════════════════════════════════════════
   Content Agent — normalized blog library.

   The two backends expose their blog libraries through genuinely different
   routes and field names: GhrFix serves the agent's own paginated
   `/ai-agents/content/posts` (seoTitle / seoDescription / readMinutes, no
   view counter), ShadiLife serves the admin route `/admin/content/blog`
   (metaTitle / metaDescription / keywords / views). Both collapse into the
   one `ContentPost` shape below so a single set of UI components can render
   either platform, with fields the platform genuinely lacks left `null`
   rather than faked as zero.
   ══════════════════════════════════════════════════════════════════════ */

export interface ContentPost {
  id: string;
  title: string;
  slug: string;
  category: string;
  status: "PUBLISHED" | "DRAFT" | "OTHER";
  createdAt: string | null;
  publishedAt: string | null;
  /** null on GhrFix — it does not track per-post views. */
  views: number | null;
  hasMetaTitle: boolean;
  hasMetaDescription: boolean;
  hasKeywords: boolean;
  hasCover: boolean;
  /** null on ShadiLife — it stores raw HTML, not a stored read time. */
  readMinutes: number | null;
  words: number | null;
}

export interface ContentSnapshot {
  posts: ContentPost[];
  published: ContentPost[];
  drafts: ContentPost[];
  totalViews: number | null;
  fullyOptimised: number;
  byCategory: Array<{ label: string; value: number }>;
  byStatus: Array<{ label: string; value: number }>;
  /** Last 8 months of created / published counts, for the trend chart. */
  monthly: { labels: string[]; created: number[]; published: number[] };
  loading: boolean;
  error: string | null;
}

const stripTags = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const asText = (v: unknown) => (typeof v === "string" ? v : "");
const asNum = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number(v));

function normalizeStatus(s: string): ContentPost["status"] {
  const up = s.toUpperCase();
  return up === "PUBLISHED" ? "PUBLISHED" : up === "DRAFT" ? "DRAFT" : "OTHER";
}

function countBy(posts: ContentPost[], pick: (p: ContentPost) => string): Array<{ label: string; value: number }> {
  const map = new Map<string, number>();
  for (const p of posts) {
    const key = pick(p).trim();
    if (!key) continue;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

function monthlyBuckets(posts: ContentPost[], months = 8) {
  const keys: Array<{ key: string; label: string }> = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: d.toLocaleDateString(undefined, { month: "short" }) });
  }
  const tally = (pick: (p: ContentPost) => string | null) => {
    const counts = new Map(keys.map((k) => [k.key, 0]));
    for (const p of posts) {
      const iso = pick(p);
      if (!iso) continue;
      const key = iso.slice(0, 7);
      if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return keys.map((k) => counts.get(k.key) ?? 0);
  };
  return { labels: keys.map((k) => k.label), created: tally((p) => p.createdAt), published: tally((p) => p.publishedAt) };
}

export function useContentSnapshot(platform: PlatformKey): ContentSnapshot {
  const [posts, setPosts] = useState<ContentPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const call =
      platform === "ghrfix"
        ? apiFetch<Array<Record<string, unknown>>>(platform, "/ai-agents/content/posts", { query: { pageSize: 100 } })
        : apiFetch<Array<Record<string, unknown>>>(platform, "/admin/content/blog");

    call
      .then(({ data }) => {
        if (cancelled) return;
        const rows = Array.isArray(data) ? data : [];
        setPosts(
          rows.map((r, i): ContentPost => {
            const html = asText(r.contentHtml) || asText(r.content);
            const words = html ? stripTags(html).split(/\s+/).filter(Boolean).length : null;
            return {
              id: asText(r.id) || `post-${i}`,
              title: asText(r.title) || "Untitled post",
              slug: asText(r.slug),
              category: asText(r.category) || "Uncategorised",
              status: normalizeStatus(asText(r.status)),
              createdAt: asText(r.createdAt) || null,
              publishedAt: asText(r.publishedAt) || null,
              views: asNum(r.views),
              hasMetaTitle: Boolean(asText(r.metaTitle).trim() || asText(r.seoTitle).trim()),
              hasMetaDescription: Boolean(asText(r.metaDescription).trim() || asText(r.seoDescription).trim()),
              hasKeywords: Array.isArray(r.keywords) && r.keywords.length > 0,
              hasCover: Boolean(asText(r.coverImageUrl).trim()),
              readMinutes: asNum(r.readMinutes),
              words,
            };
          }),
        );
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Could not reach the backend.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [platform]);

  const published = posts.filter((p) => p.status === "PUBLISHED");
  const drafts = posts.filter((p) => p.status === "DRAFT");
  // Whether views exist is a property of the PLATFORM, not of the current
  // rows: GhrFix's post model has no view counter at all, while ShadiLife's
  // does. Deriving this from the data would make an empty ShadiLife library
  // claim the platform doesn't track views, which is untrue.
  const viewsSupported = platform === "shadilife";

  return {
    posts,
    published,
    drafts,
    totalViews: viewsSupported ? posts.reduce((s, p) => s + (p.views ?? 0), 0) : null,
    fullyOptimised: posts.filter((p) => p.hasMetaTitle && p.hasMetaDescription && p.hasKeywords).length,
    byCategory: countBy(posts, (p) => p.category).slice(0, 6),
    byStatus: countBy(posts, (p) => (p.status === "OTHER" ? "Other" : p.status === "PUBLISHED" ? "Published" : "Draft")),
    monthly: monthlyBuckets(posts),
    loading,
    error,
  };
}
