"use client";

/**
 * Owner Chat Agent — normalized snapshot for both platforms.
 *
 * Owner Chat is the orchestration agent: it answers the owner's questions by
 * calling real tools against the live database, and it holds a scoped set of
 * audited writes. This hook reads exactly the endpoints the existing Owner
 * Chat views already call — nothing is guessed and nothing is invented:
 *
 *   GhrFix   (src/components/agents/views/ghrfix/owner-chat.tsx and
 *             src/components/agents/views/domain/ghrfix/owner-chat.tsx)
 *     GET /admin/reports/overview            → the same overview its
 *                                              `get_platform_stats` tool reads
 *     GET /admin/users/stats                 → member status breakdown
 *     GET /admin/providers/stats             → provider verification breakdown
 *     GET /admin/users        (paginated)    → the real member directory
 *     GET /admin/providers    (paginated)    → the real provider directory
 *     GET /admin/bookings/trend?days=14      → a genuine 14-day time series
 *
 *   ShadiLife (src/components/agents/views/shadilife/owner-chat.tsx and
 *              src/components/agents/views/domain/shadilife/owner-chat.tsx)
 *     GET /admin/dashboard                   → the live platform figures,
 *                                              including a real registration
 *                                              trend and city distribution
 *     GET /admin/users        (paginated)    → the real member directory
 *     GET /admin/agents                      → marriage-bureau agents
 *
 *   Both, through `agentClient` (src/lib/api.ts):
 *     stats()    → GhrFix /ai-agents/owner-chat/stats,
 *                  ShadiLife /ai-agents/_meta/usage filtered to owner-chat
 *     activity() → GhrFix /ai-agents/owner-chat/activity,
 *                  ShadiLife /ai-agents/_meta/activity filtered to owner-chat
 *
 * Every source is loaded with `Promise.allSettled`, so one directory failing
 * never silently degrades another into a "complete" picture. `failures` names
 * each source that did not load; `error` is set only when nothing loaded at
 * all. Pages are expected to check both — a value of `null` means "not
 * measured by this platform", never "zero".
 *
 * This hook performs READS ONLY. No write endpoint is called anywhere here.
 */

import { useEffect, useState } from "react";
import { ApiError, agentClient, apiFetch, type AgentActivityEntry, type AgentStats, type Paginated } from "./api";
import type { PlatformKey } from "./platforms";

/* ══ Raw backend shapes (copied from the live views, not invented) ══════ */

interface GfOverview {
  totalUsers: number;
  providers: { total: number; verified: number };
  bookings: { total: number; completed: number; active: number; cashSettledPKR: number; tokensCirculatedInBookings: number };
  pendingTopUps: number;
  openEmergencies: number;
  activePromoCodes: number;
  walletTotals: {
    acceptFeesCollected: number;
    topUpsApproved: number;
    refunds: number;
    totalCredits: number;
    totalDebits: number;
    totalTransactions: number;
  };
  topServices: Array<{ category: string; bookings: number }>;
}

interface GfUserStats {
  total: number;
  active: number;
  suspended: number;
  banned: number;
  pendingVerification: number;
  providers: number;
  newThisWeek: number;
}

interface GfProviderStats {
  total: number;
  verified: number;
  pending: number;
  rejected: number;
  suspended: number;
  available: number;
  avgRating: number;
}

interface GfTrendPoint {
  date: string;
  total: number;
  completed: number;
  cancelled: number;
}

interface GfMemberRow {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  role: string;
  status: string;
  walletBalance: string | number;
  createdAt: string;
  provider: { id: string; verificationStatus: string } | null;
}

interface GfProviderRow {
  id: string;
  verificationStatus: string;
  isAvailable: boolean;
  rating: string | number | null;
  createdAt: string;
  user: { id: string; name: string | null; phone: string | null; email: string | null } | null;
  services: Array<{ category?: { name: string } | null }>;
}

interface SlDashboard {
  stats?: {
    totalUsers?: number;
    activeToday?: number;
    newRegistrations7d?: number;
    pendingApprovals?: number;
    matchesMade?: number;
    matchSuccessRate?: number;
    premiumSubscribers?: number;
    totalRevenue7d?: number;
    interestsSent?: number;
  };
  pendingApprovalsBreakdown?: { newProfiles?: number; verifications?: number; agentApplications?: number; openReports?: number };
  registrationTrend?: Array<{ day?: string; users?: number; verified?: number; matches?: number }>;
  cityDistribution?: Array<{ city?: string; users?: number }>;
  aiAgentUsage?: Array<{ agent?: string; calls?: number; costUsd?: number }>;
  fraudSummary?: { openReports?: number; autoFlaggedReports?: number; pendingModeration?: number; resolvedAllTime?: number };
  premiumBreakdown?: { silver?: number; gold?: number };
}

interface SlUser {
  id: string;
  email: string;
  phone: string | null;
  status: string;
  membershipTier: string;
  createdAt: string;
  lastActiveAt: string | null;
  profile: { fullName: string; city: string; profileCode: string } | null;
  verification: { tier: string } | null;
}

interface SlUsersResponse {
  users: SlUser[];
  total: number;
  page: number;
  pageSize: number;
}

interface SlAgent {
  id: string;
  agentCode: string;
  email: string;
  phone: string | null;
  fullName: string;
  bureauName: string | null;
  city: string | null;
  tier: string;
  commissionRate: number;
  status: string;
  createdAt: string;
  managedProfilesCount: number;
}

/* ══ Normalized shapes the pages render ════════════════════════════════ */

export type Tone = "purple" | "blue" | "green" | "amber" | "red" | "cyan";

/** A headline tile. `value === null` means the platform does not measure it. */
export interface OwnerMetric {
  key: string;
  label: string;
  value: number | null;
  /** How to render `value`. */
  format: "int" | "pct" | "usd" | "pkr" | "rating";
  /** One line explaining what it is, or why it is absent. */
  note: string;
  tone: Tone;
  icon: string;
}

/** One row of a categorical chart. */
export interface OwnerSlice {
  label: string;
  value: number;
}

/** A named categorical breakdown — rendered as a donut or a ranked bar list. */
export interface OwnerDimension {
  key: string;
  title: string;
  /** What one unit is, e.g. "members". */
  unit: string;
  rows: OwnerSlice[];
  /** Set when the source of this dimension failed — pages must not read it as empty. */
  failed: boolean;
  note: string;
}

/** A real time series, or absent. Never fabricated. */
export interface OwnerSeries {
  labels: string[];
  series: Array<{ name: string; data: number[] }>;
  granularity: string;
}

/** One person the agent can actually reach through a real directory route. */
export interface OwnerPerson {
  id: string;
  name: string;
  /** email / phone / code — whatever the backend really returns. */
  handle: string | null;
  /** Raw backend status token, kept for filtering. */
  status: string;
  statusLabel: string;
  statusTone: Tone;
  /** Role, tier or city — whatever this directory groups by. */
  group: string;
  /** A per-row number the backend really returns, or null. */
  metric: number | null;
  createdAt: string | null;
}

/** One real, server-side directory. Kept separate so a partial load stays visible. */
export interface OwnerDirectory {
  key: string;
  label: string;
  /** The route this set came from, shown to the user. */
  route: string;
  rows: OwnerPerson[];
  /** Server-reported total across all pages, or null if the route reports none. */
  serverTotal: number | null;
  /** How many rows this workspace actually pulled (one page). */
  fetched: number;
  loaded: boolean;
  error: string | null;
  /** Column header for `group`. */
  groupLabel: string;
  /** Column header for `metric`, or null when the route returns no per-row number. */
  metricLabel: string | null;
  /** Distinct status tokens present, in a stable order. */
  statuses: string[];
}

/** A read or write the agent is capable of. */
export interface OwnerCapability {
  key: string;
  title: string;
  /** The literal route, or an honest note when this workspace has no route for it. */
  route: string;
  description: string;
  /** True when the route is one this workspace itself calls. */
  wiredHere: boolean;
}

export interface OwnerAuditEntry {
  id: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  admin: string | null;
  createdAt: string;
  /** Whole hours since the entry, or null when the timestamp is unparseable. */
  ageHours: number | null;
}

export interface OwnerRuntime {
  agent: string;
  model: string;
  rateLimitPerMinute: number;
  monthlyBudgetUsd: number;
  callsToday: number | null;
  callsThisMonth: number;
  spendThisMonthUsd: number;
  tokensThisMonth: number | null;
}

export interface OwnerChatSnapshot {
  platform: PlatformKey;
  loading: boolean;
  /** Set only when every source failed — pages must then refuse to assess health. */
  error: string | null;
  /** Human names of the sources that did not load. Empty means a complete picture. */
  failures: string[];
  /** True when at least one source loaded but not all of them. */
  partial: boolean;

  metrics: OwnerMetric[];
  dimensions: OwnerDimension[];
  series: OwnerSeries | null;
  seriesNote: string;

  headlineRate: { label: string; value: number | null; max: number; note: string };

  directories: OwnerDirectory[];

  audit: OwnerAuditEntry[];
  auditError: string | null;
  auditTotal: number | null;
  auditActionTypes: OwnerSlice[];
  auditRecencyBuckets: OwnerSlice[];

  runtime: OwnerRuntime | null;
  runtimeError: string | null;

  reads: OwnerCapability[];
  writes: OwnerCapability[];

  /** Provenance strings the pages print verbatim. */
  sourceNote: string;
  coverageNote: string;
  timingNote: string;
}

/* ══ Helpers ═══════════════════════════════════════════════════════════ */

const DIRECTORY_PAGE = 100;

function human(token: string): string {
  return token.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

function toneForStatus(token: string): Tone {
  const t = token.toUpperCase();
  if (t === "ACTIVE" || t === "VERIFIED" || t === "COMPLETED") return "green";
  if (t === "PENDING" || t === "PENDING_VERIFICATION" || t === "SUSPENDED") return "amber";
  if (t === "BANNED" || t === "REJECTED") return "red";
  return "blue";
}

function reason(err: unknown, what: string): string {
  return err instanceof ApiError ? err.message : `${what} could not be read.`;
}

function num(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : null;
}

function tally(values: string[]): OwnerSlice[] {
  const map = new Map<string, number>();
  for (const v of values) map.set(v, (map.get(v) ?? 0) + 1);
  return [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

/** Whole hours between now and an ISO timestamp, or null if unparseable. */
function ageHours(iso: string): number | null {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / 3_600_000));
}

/**
 * Buckets an audited action's age. Buckets are fixed and always all present
 * (a zero here is a real count of a loaded feed, not a missing measurement).
 */
function recencyBuckets(entries: OwnerAuditEntry[]): OwnerSlice[] {
  const out: OwnerSlice[] = [
    { label: "Last 24h", value: 0 },
    { label: "1–7 days", value: 0 },
    { label: "8–30 days", value: 0 },
    { label: "Over 30 days", value: 0 },
    { label: "Undated", value: 0 },
  ];
  for (const e of entries) {
    if (e.ageHours === null) out[4].value += 1;
    else if (e.ageHours < 24) out[0].value += 1;
    else if (e.ageHours < 24 * 7) out[1].value += 1;
    else if (e.ageHours < 24 * 30) out[2].value += 1;
    else out[3].value += 1;
  }
  return out;
}

/** Collapses "Called /x" / "Suspended user abc" into a coarse action family. */
function actionFamily(action: string): string {
  const a = action.toLowerCase();
  if (a.startsWith("called")) return "Tool call";
  if (a.includes("suggestion")) return "Suggestion";
  if (a.includes("suspend")) return "Suspend";
  if (a.includes("verif")) return "Verification";
  if (a.includes("approve")) return "Approval";
  if (a.includes("reject")) return "Rejection";
  if (a.includes("update") || a.includes("chang")) return "Update";
  if (a.includes("chat") || a.includes("message") || a.includes("ask")) return "Conversation";
  return "Other";
}

/* ══ Capability catalogues ═════════════════════════════════════════════ */
/* Derived strictly from the routes the existing Owner Chat views call and
   from what those views state the agent can do. Where a write has no client
   route in this codebase, that is said outright rather than guessed at. */

const GF_READS: OwnerCapability[] = [
  { key: "overview", title: "Platform overview", route: "GET /admin/reports/overview", description: "Users, providers, bookings, wallet totals and top services — the same report the agent's get_platform_stats tool reads.", wiredHere: true },
  { key: "user-stats", title: "Member status breakdown", route: "GET /admin/users/stats", description: "Totals for active, suspended, banned and pending-verification members, plus new-this-week.", wiredHere: true },
  { key: "users", title: "Member directory", route: "GET /admin/users", description: "Server-side paginated and searchable member roster, filterable by status.", wiredHere: true },
  { key: "provider-stats", title: "Provider verification breakdown", route: "GET /admin/providers/stats", description: "Verified, pending, rejected, suspended and available provider counts with average rating.", wiredHere: true },
  { key: "providers", title: "Provider directory", route: "GET /admin/providers", description: "Server-side paginated provider roster with verification status and service categories.", wiredHere: true },
  { key: "trend", title: "Booking trend", route: "GET /admin/bookings/trend?days=14", description: "A genuine 14-day daily series of total, completed and cancelled bookings.", wiredHere: true },
  { key: "agent-stats", title: "Agent runtime", route: "GET /ai-agents/owner-chat/stats", description: "Model, rate limit, monthly budget and this agent's own call and spend counters.", wiredHere: true },
  { key: "agent-activity", title: "Audited action log", route: "GET /ai-agents/owner-chat/activity", description: "Every action this agent has taken, with target, admin and timestamp.", wiredHere: true },
  { key: "chat", title: "Conversation", route: "POST /ai-agents/owner-chat/chat", description: "The tool-calling conversation itself. It is a POST, but it writes no platform record — it asks the agent a question.", wiredHere: true },
];

const SL_READS: OwnerCapability[] = [
  { key: "dashboard", title: "Admin dashboard", route: "GET /admin/dashboard", description: "Live member, match, premium, revenue and approval figures, plus a registration trend and city distribution.", wiredHere: true },
  { key: "users", title: "Member directory", route: "GET /admin/users", description: "Server-side paginated member roster with status, membership tier, city and verification tier.", wiredHere: true },
  { key: "agents", title: "Marriage bureau agents", route: "GET /admin/agents", description: "Every bureau agent with tier, commission rate, city and managed-profile count.", wiredHere: true },
  { key: "usage", title: "Agent runtime", route: "GET /ai-agents/_meta/usage", description: "Platform-wide AI budget and per-agent call and spend rows; this workspace reads the owner-chat row.", wiredHere: true },
  { key: "activity", title: "Audited action log", route: "GET /ai-agents/_meta/activity", description: "The shared call and suggestion log, filtered to this agent's own rows.", wiredHere: true },
  { key: "chat", title: "Conversation", route: "POST /ai-agents/ask", description: "The question route this workspace uses for the conversation. The agent's own console posts to /ai-agents/owner-chat/message and receives the list of tools it ran.", wiredHere: true },
];

/* The audited writes. NONE of these are wired in this workspace — no page
   here calls any of them. They are documented because knowing the agent's
   write surface is the point of the capabilities page. */
const GF_WRITES: OwnerCapability[] = [
  { key: "w-member-status", title: "Change a member's status", route: "No client route in this workspace — executed by the agent's own tool layer against the admin member routes.", description: "Suspend, unsuspend or ban a member in response to an explicit owner instruction. Recorded in the audit log.", wiredHere: false },
  { key: "w-provider-verification", title: "Set a provider's verification", route: "No client route in this workspace — executed by the agent's own tool layer against the admin provider routes.", description: "Move a provider between pending, verified and rejected after the owner asks for it.", wiredHere: false },
  { key: "w-audited", title: "Every write is audited", route: "Read back at GET /ai-agents/owner-chat/activity", description: "Whatever the agent writes appears in the same activity feed the Audit page renders, with action, target, admin and timestamp.", wiredHere: false },
];

const SL_WRITES: OwnerCapability[] = [
  { key: "w-member", title: "Change a member's status or membership", route: "No client route in this workspace — executed by the agent's own tool layer against the admin member routes.", description: "Suspend or reinstate a member, or move a membership tier, on an explicit owner instruction.", wiredHere: false },
  { key: "w-agent-tier", title: "Update a bureau agent's tier", route: "No client route in this workspace — executed by the agent's own tool layer against the admin agent routes.", description: "Adjust an agent's tier or standing after the owner asks for it in conversation.", wiredHere: false },
  { key: "w-suggestion", title: "Raise a suggestion for approval", route: "Read back at GET /ai-agents/_meta/activity", description: "The agent logs suggestions that a human approves or rejects; the outcome lands in the shared activity feed.", wiredHere: false },
];

/* ══ Empty snapshot ════════════════════════════════════════════════════ */

function emptySnapshot(platform: PlatformKey): OwnerChatSnapshot {
  return {
    platform,
    loading: true,
    error: null,
    failures: [],
    partial: false,
    metrics: [],
    dimensions: [],
    series: null,
    seriesNote: "",
    headlineRate: { label: "Rate", value: null, max: 100, note: "" },
    directories: [],
    audit: [],
    auditError: null,
    auditTotal: null,
    auditActionTypes: [],
    auditRecencyBuckets: [],
    runtime: null,
    runtimeError: null,
    reads: platform === "ghrfix" ? GF_READS : SL_READS,
    writes: platform === "ghrfix" ? GF_WRITES : SL_WRITES,
    sourceNote: "",
    coverageNote: "",
    timingNote: "",
  };
}

/* ══ The hook ══════════════════════════════════════════════════════════ */

export function useOwnerChatSnapshot(platform: PlatformKey): OwnerChatSnapshot {
  const [snap, setSnap] = useState<OwnerChatSnapshot>(() => emptySnapshot(platform));

  useEffect(() => {
    let cancelled = false;
    setSnap(emptySnapshot(platform));

    const api = agentClient(platform, "/ai-agents/owner-chat");

    async function run() {
      const next = platform === "ghrfix" ? await loadGhrFix(api) : await loadShadiLife(api);
      if (!cancelled) setSnap(next);
    }

    run().catch((err) => {
      if (cancelled) return;
      setSnap({
        ...emptySnapshot(platform),
        loading: false,
        error: reason(err, "The platform"),
        failures: ["Every source"],
      });
    });

    return () => {
      cancelled = true;
    };
  }, [platform]);

  return snap;
}

type Client = ReturnType<typeof agentClient>;

/* ── GhrFix ─────────────────────────────────────────────────────────── */

async function loadGhrFix(api: Client): Promise<OwnerChatSnapshot> {
  const base = emptySnapshot("ghrfix");

  const [overviewR, userStatsR, providerStatsR, trendR, usersR, providersR, statsR, activityR] = await Promise.allSettled([
    apiFetch<GfOverview>("ghrfix", "/admin/reports/overview"),
    apiFetch<GfUserStats>("ghrfix", "/admin/users/stats"),
    apiFetch<GfProviderStats>("ghrfix", "/admin/providers/stats"),
    apiFetch<GfTrendPoint[]>("ghrfix", "/admin/bookings/trend", { query: { days: 14 } }),
    apiFetch<GfMemberRow[], Paginated>("ghrfix", "/admin/users", { query: { page: 1, pageSize: DIRECTORY_PAGE } }),
    apiFetch<GfProviderRow[], Paginated>("ghrfix", "/admin/providers", { query: { page: 1, pageSize: DIRECTORY_PAGE } }),
    api.stats(),
    api.activity({ pageSize: DIRECTORY_PAGE }),
  ]);

  const overview = overviewR.status === "fulfilled" ? overviewR.value.data : null;
  const us = userStatsR.status === "fulfilled" ? userStatsR.value.data : null;
  const ps = providerStatsR.status === "fulfilled" ? providerStatsR.value.data : null;
  const trend = trendR.status === "fulfilled" ? trendR.value.data : null;

  const failures: string[] = [];
  if (!overview) failures.push("Platform overview (/admin/reports/overview)");
  if (!us) failures.push("Member status breakdown (/admin/users/stats)");
  if (!ps) failures.push("Provider breakdown (/admin/providers/stats)");
  if (!trend) failures.push("Booking trend (/admin/bookings/trend)");
  if (usersR.status !== "fulfilled") failures.push("Member directory (/admin/users)");
  if (providersR.status !== "fulfilled") failures.push("Provider directory (/admin/providers)");

  /* ── Metrics ── */
  const metrics: OwnerMetric[] = [
    {
      key: "members",
      label: "Members",
      value: us?.total ?? overview?.totalUsers ?? null,
      format: "int",
      note: us ? `${us.newThisWeek.toLocaleString()} joined this week` : "Member totals did not load this session",
      tone: "purple",
      icon: "users",
    },
    {
      key: "providers",
      label: "Providers",
      value: ps?.total ?? overview?.providers.total ?? null,
      format: "int",
      note: ps ? `${ps.verified.toLocaleString()} verified, ${ps.available.toLocaleString()} available now` : "Provider totals did not load this session",
      tone: "blue",
      icon: "check",
    },
    {
      key: "bookings",
      label: "Bookings (all time)",
      value: overview?.bookings.total ?? null,
      format: "int",
      note: overview ? `${overview.bookings.active.toLocaleString()} currently active` : "The overview report did not load this session",
      tone: "cyan",
      icon: "posts",
    },
    {
      key: "accept-fees",
      label: "Accept Fees Collected",
      value: overview ? Math.round(overview.walletTotals.acceptFeesCollected) : null,
      format: "pkr",
      note: overview ? `${overview.walletTotals.totalTransactions.toLocaleString()} wallet transactions` : "Wallet totals did not load this session",
      tone: "green",
      icon: "trend",
    },
    {
      key: "pending-topups",
      label: "Pending Top-ups",
      value: overview?.pendingTopUps ?? null,
      format: "int",
      note: overview ? "Awaiting an admin decision" : "The overview report did not load this session",
      tone: "amber",
      icon: "clock",
    },
    {
      key: "emergencies",
      label: "Open Emergencies",
      value: overview?.openEmergencies ?? null,
      format: "int",
      note: overview ? "Live emergency jobs on the platform" : "The overview report did not load this session",
      tone: "red",
      icon: "alert",
    },
  ];

  /* ── Dimensions ── */
  const dimensions: OwnerDimension[] = [
    {
      key: "member-status",
      title: "Members by Status",
      unit: "members",
      failed: !us,
      note: us ? "From /admin/users/stats — every member, not a page sample." : "The member status breakdown did not load, so this cannot be shown.",
      rows: us
        ? [
            { label: "Active", value: us.active },
            { label: "Pending verification", value: us.pendingVerification },
            { label: "Suspended", value: us.suspended },
            { label: "Banned", value: us.banned },
          ].filter((r) => r.value > 0)
        : [],
    },
    {
      key: "provider-verification",
      title: "Providers by Verification",
      unit: "providers",
      failed: !ps,
      note: ps ? "From /admin/providers/stats — the whole provider base." : "The provider breakdown did not load, so this cannot be shown.",
      rows: ps
        ? [
            { label: "Verified", value: ps.verified },
            { label: "Pending", value: ps.pending },
            { label: "Rejected", value: ps.rejected },
            { label: "Suspended", value: ps.suspended },
          ].filter((r) => r.value > 0)
        : [],
    },
    {
      key: "top-services",
      title: "Top Service Categories",
      unit: "bookings",
      failed: !overview,
      note: overview ? "Ranked by real booking volume from /admin/reports/overview." : "The overview report did not load, so no ranking can be shown.",
      rows: (overview?.topServices ?? []).map((s) => ({ label: s.category, value: s.bookings })).slice(0, 8),
    },
    {
      key: "wallet",
      title: "Wallet Flow (PKR)",
      unit: "PKR",
      failed: !overview,
      note: overview ? "Real wallet totals — credits, debits, top-ups approved and refunds." : "Wallet totals did not load, so no flow can be shown.",
      rows: overview
        ? [
            { label: "Total credits", value: Math.round(overview.walletTotals.totalCredits) },
            { label: "Total debits", value: Math.round(overview.walletTotals.totalDebits) },
            { label: "Top-ups approved", value: Math.round(overview.walletTotals.topUpsApproved) },
            { label: "Accept fees", value: Math.round(overview.walletTotals.acceptFeesCollected) },
            { label: "Refunds", value: Math.round(overview.walletTotals.refunds) },
          ].filter((r) => r.value > 0)
        : [],
    },
    {
      key: "booking-state",
      title: "Bookings by State",
      unit: "bookings",
      failed: !overview,
      note: overview
        ? "Completed and active come straight from the overview; the remainder is every other state the report does not split out."
        : "The overview report did not load, so booking states cannot be shown.",
      rows: overview
        ? [
            { label: "Completed", value: overview.bookings.completed },
            { label: "Active", value: overview.bookings.active },
            { label: "Other states", value: Math.max(0, overview.bookings.total - overview.bookings.completed - overview.bookings.active) },
          ].filter((r) => r.value > 0)
        : [],
    },
  ];

  /* ── Series — GhrFix genuinely returns one ── */
  const series: OwnerSeries | null =
    trend && trend.length > 0
      ? {
          labels: trend.map((p) => p.date.slice(5)),
          series: [
            { name: "Total", data: trend.map((p) => p.total) },
            { name: "Completed", data: trend.map((p) => p.completed) },
            { name: "Cancelled", data: trend.map((p) => p.cancelled) },
          ],
          granularity: "Daily, last 14 days",
        }
      : null;

  const seriesNote = trend
    ? trend.length === 0
      ? "GhrFix returned an empty 14-day booking trend — the window holds no bookings."
      : ""
    : "The GhrFix booking trend did not load this session, so no series can be drawn or assessed.";

  /* ── Directories ── */
  const memberRows: OwnerPerson[] =
    usersR.status === "fulfilled"
      ? usersR.value.data.map((m) => ({
          id: m.id,
          name: m.name ?? "Unnamed member",
          handle: m.phone ?? m.email ?? null,
          status: m.status,
          statusLabel: human(m.status),
          statusTone: toneForStatus(m.status),
          group: human(m.role),
          metric: num(m.walletBalance),
          createdAt: m.createdAt,
        }))
      : [];

  const providerRows: OwnerPerson[] =
    providersR.status === "fulfilled"
      ? providersR.value.data.map((p) => ({
          id: p.id,
          name: p.user?.name ?? "Unnamed provider",
          handle: p.user?.phone ?? p.user?.email ?? null,
          status: p.verificationStatus,
          statusLabel: human(p.verificationStatus),
          statusTone: toneForStatus(p.verificationStatus),
          group: p.services.find((s) => s.category?.name)?.category?.name ?? "No category listed",
          metric: num(p.rating),
          createdAt: p.createdAt,
        }))
      : [];

  const directories: OwnerDirectory[] = [
    {
      key: "members",
      label: "Members",
      route: "GET /admin/users",
      rows: memberRows,
      serverTotal: usersR.status === "fulfilled" ? usersR.value.meta.total ?? null : null,
      fetched: memberRows.length,
      loaded: usersR.status === "fulfilled",
      error: usersR.status === "rejected" ? reason(usersR.reason, "The member directory") : null,
      groupLabel: "Role",
      metricLabel: "Wallet",
      statuses: tally(memberRows.map((r) => r.status)).map((r) => r.label),
    },
    {
      key: "providers",
      label: "Providers",
      route: "GET /admin/providers",
      rows: providerRows,
      serverTotal: providersR.status === "fulfilled" ? providersR.value.meta.total ?? null : null,
      fetched: providerRows.length,
      loaded: providersR.status === "fulfilled",
      error: providersR.status === "rejected" ? reason(providersR.reason, "The provider directory") : null,
      groupLabel: "Service category",
      metricLabel: "Rating",
      statuses: tally(providerRows.map((r) => r.status)).map((r) => r.label),
    },
  ];

  const headlineRate = {
    label: "Provider Verification Rate",
    value: ps && ps.total > 0 ? Math.round((ps.verified / ps.total) * 100) : null,
    max: 100,
    note: ps
      ? ps.total > 0
        ? `${ps.verified.toLocaleString()} of ${ps.total.toLocaleString()} providers are verified.`
        : "GhrFix returned zero providers, so a verification rate has no denominator."
      : "The provider breakdown did not load, so this rate cannot be computed.",
  };

  return finish(base, {
    metrics,
    dimensions,
    series,
    seriesNote,
    headlineRate,
    directories,
    failures,
    statsR,
    activityR,
    sourceNote:
      "GhrFix: /admin/reports/overview, /admin/users(/stats), /admin/providers(/stats), /admin/bookings/trend and the agent's own /ai-agents/owner-chat stats and activity.",
    coverageNote: `Directory tables show the first ${DIRECTORY_PAGE} rows of each server-paginated route; the status and verification donuts come from the /stats routes and cover the whole base.`,
    timingNote: "The booking trend is a real 14-day daily series returned by GhrFix; every other figure is a point-in-time total with no history attached.",
  });
}

/* ── ShadiLife ──────────────────────────────────────────────────────── */

async function loadShadiLife(api: Client): Promise<OwnerChatSnapshot> {
  const base = emptySnapshot("shadilife");

  const [dashR, usersR, agentsR, statsR, activityR] = await Promise.allSettled([
    apiFetch<SlDashboard>("shadilife", "/admin/dashboard"),
    apiFetch<SlUsersResponse>("shadilife", "/admin/users", { query: { page: 1, pageSize: DIRECTORY_PAGE } }),
    apiFetch<SlAgent[]>("shadilife", "/admin/agents"),
    api.stats(),
    api.activity({ pageSize: DIRECTORY_PAGE }),
  ]);

  const dash = dashR.status === "fulfilled" ? dashR.value.data : null;
  const st = dash?.stats ?? null;

  const failures: string[] = [];
  if (!dash) failures.push("Admin dashboard (/admin/dashboard)");
  if (usersR.status !== "fulfilled") failures.push("Member directory (/admin/users)");
  if (agentsR.status !== "fulfilled") failures.push("Bureau agents (/admin/agents)");

  const agents = agentsR.status === "fulfilled" ? agentsR.value.data : [];

  const metrics: OwnerMetric[] = [
    {
      key: "members",
      label: "Members",
      value: st?.totalUsers ?? null,
      format: "int",
      note: st?.newRegistrations7d !== undefined ? `${st.newRegistrations7d.toLocaleString()} registered in the last 7 days` : "The dashboard did not load this session",
      tone: "purple",
      icon: "users",
    },
    {
      key: "active-today",
      label: "Active Today",
      value: st?.activeToday ?? null,
      format: "int",
      note: dash ? "Members ShadiLife saw active today" : "The dashboard did not load this session",
      tone: "cyan",
      icon: "pulse",
    },
    {
      key: "matches",
      label: "Matches Made",
      value: st?.matchesMade ?? null,
      format: "int",
      note: st?.interestsSent !== undefined ? `${st.interestsSent.toLocaleString()} interests sent` : "The dashboard did not load this session",
      tone: "blue",
      icon: "heart",
    },
    {
      key: "premium",
      label: "Premium Subscribers",
      value: st?.premiumSubscribers ?? null,
      format: "int",
      note: dash?.premiumBreakdown
        ? `${(dash.premiumBreakdown.gold ?? 0).toLocaleString()} gold, ${(dash.premiumBreakdown.silver ?? 0).toLocaleString()} silver`
        : "The dashboard did not load this session",
      tone: "green",
      icon: "sparkle",
    },
    {
      key: "revenue",
      label: "Revenue (7 days)",
      value: st?.totalRevenue7d ?? null,
      format: "pkr",
      note: dash ? "Rolling 7-day revenue reported by the dashboard" : "The dashboard did not load this session",
      tone: "green",
      icon: "trend",
    },
    {
      key: "approvals",
      label: "Pending Approvals",
      value: st?.pendingApprovals ?? null,
      format: "int",
      note: dash ? "Everything currently waiting on an admin" : "The dashboard did not load this session",
      tone: "amber",
      icon: "clock",
    },
  ];

  const pab = dash?.pendingApprovalsBreakdown ?? null;
  const memberStatusRows = usersR.status === "fulfilled" ? tally(usersR.value.data.users.map((u) => human(u.status))) : [];
  const tierRows = usersR.status === "fulfilled" ? tally(usersR.value.data.users.map((u) => human(u.membershipTier))) : [];

  const dimensions: OwnerDimension[] = [
    {
      key: "approvals",
      title: "Pending Approvals by Kind",
      unit: "items",
      failed: !dash,
      note: pab ? "Straight from the dashboard's own approvals breakdown." : dash ? "The dashboard returned no approvals breakdown." : "The dashboard did not load, so this cannot be shown.",
      rows: pab
        ? [
            { label: "New profiles", value: pab.newProfiles ?? 0 },
            { label: "Verifications", value: pab.verifications ?? 0 },
            { label: "Agent applications", value: pab.agentApplications ?? 0 },
            { label: "Open reports", value: pab.openReports ?? 0 },
          ].filter((r) => r.value > 0)
        : [],
    },
    {
      key: "member-status",
      title: "Members by Status",
      unit: "members",
      failed: usersR.status !== "fulfilled",
      note:
        usersR.status === "fulfilled"
          ? `Counted across the ${usersR.value.data.users.length.toLocaleString()} members on the first page — ShadiLife exposes no whole-base status breakdown.`
          : "The member directory did not load, so no status split can be shown.",
      rows: memberStatusRows,
    },
    {
      key: "cities",
      title: "Top Cities",
      unit: "members",
      failed: !dash,
      note: dash?.cityDistribution?.length ? "The dashboard's real city distribution." : dash ? "The dashboard returned no city distribution." : "The dashboard did not load, so no city ranking can be shown.",
      rows: (dash?.cityDistribution ?? [])
        .map((c) => ({ label: c.city ?? "Unknown", value: c.users ?? 0 }))
        .filter((r) => r.value > 0)
        .slice(0, 8),
    },
    {
      key: "tiers",
      title: "Membership Tiers",
      unit: "members",
      failed: usersR.status !== "fulfilled",
      note:
        usersR.status === "fulfilled"
          ? "Counted across the first page of the member directory, not the whole base."
          : "The member directory did not load, so tiers cannot be counted.",
      rows: tierRows,
    },
    {
      key: "agent-tiers",
      title: "Bureau Agents by Tier",
      unit: "agents",
      failed: agentsR.status !== "fulfilled",
      note: agentsR.status === "fulfilled" ? "Every bureau agent /admin/agents returns." : "The bureau agent list did not load, so tiers cannot be counted.",
      rows: tally(agents.map((a) => human(a.tier))),
    },
    {
      key: "ai-usage",
      title: "AI Calls by Agent",
      unit: "calls",
      failed: !dash,
      note: dash?.aiAgentUsage?.length ? "Platform-wide AI usage the dashboard reports, all agents included." : dash ? "The dashboard returned no AI usage rows." : "The dashboard did not load, so AI usage cannot be shown.",
      rows: (dash?.aiAgentUsage ?? [])
        .map((a) => ({ label: a.agent ?? "unknown", value: a.calls ?? 0 }))
        .filter((r) => r.value > 0)
        .slice(0, 8),
    },
  ];

  /* ShadiLife's dashboard genuinely carries a registration trend. */
  const rt = dash?.registrationTrend ?? [];
  const series: OwnerSeries | null =
    rt.length > 0
      ? {
          labels: rt.map((p) => p.day ?? ""),
          series: [
            { name: "Registrations", data: rt.map((p) => p.users ?? 0) },
            { name: "Verified", data: rt.map((p) => p.verified ?? 0) },
            { name: "Matches", data: rt.map((p) => p.matches ?? 0) },
          ],
          granularity: `Daily, ${rt.length} points as returned`,
        }
      : null;

  const seriesNote = dash
    ? rt.length === 0
      ? "ShadiLife's dashboard returned no registration trend this session, so no series can be drawn."
      : ""
    : "The ShadiLife dashboard did not load this session, so no series can be drawn or assessed.";

  const memberRows: OwnerPerson[] =
    usersR.status === "fulfilled"
      ? usersR.value.data.users.map((u) => ({
          id: u.id,
          name: u.profile?.fullName ?? u.email,
          handle: u.email,
          status: u.status,
          statusLabel: human(u.status),
          statusTone: toneForStatus(u.status),
          group: u.profile?.city ?? "No city on profile",
          metric: null,
          createdAt: u.createdAt,
        }))
      : [];

  const agentRows: OwnerPerson[] = agents.map((a) => ({
    id: a.id,
    name: a.fullName,
    handle: a.agentCode,
    status: a.status,
    statusLabel: human(a.status),
    statusTone: toneForStatus(a.status),
    group: a.bureauName ?? a.city ?? "No bureau listed",
    metric: a.managedProfilesCount,
    createdAt: a.createdAt,
  }));

  const directories: OwnerDirectory[] = [
    {
      key: "members",
      label: "Members",
      route: "GET /admin/users",
      rows: memberRows,
      serverTotal: usersR.status === "fulfilled" ? usersR.value.data.total : null,
      fetched: memberRows.length,
      loaded: usersR.status === "fulfilled",
      error: usersR.status === "rejected" ? reason(usersR.reason, "The member directory") : null,
      groupLabel: "City",
      metricLabel: null,
      statuses: tally(memberRows.map((r) => r.status)).map((r) => r.label),
    },
    {
      key: "agents",
      label: "Bureau Agents",
      route: "GET /admin/agents",
      rows: agentRows,
      serverTotal: agentsR.status === "fulfilled" ? agentRows.length : null,
      fetched: agentRows.length,
      loaded: agentsR.status === "fulfilled",
      error: agentsR.status === "rejected" ? reason(agentsR.reason, "The bureau agent list") : null,
      groupLabel: "Bureau",
      metricLabel: "Managed profiles",
      statuses: tally(agentRows.map((r) => r.status)).map((r) => r.label),
    },
  ];

  const headlineRate = {
    label: "Match Success Rate",
    value: st?.matchSuccessRate === undefined ? null : Math.round(st.matchSuccessRate),
    max: 100,
    note:
      st?.matchSuccessRate === undefined
        ? dash
          ? "ShadiLife's dashboard did not report a match success rate this session."
          : "The dashboard did not load, so this rate cannot be computed."
        : "Reported directly by ShadiLife's admin dashboard.",
  };

  return finish(base, {
    metrics,
    dimensions,
    series,
    seriesNote,
    headlineRate,
    directories,
    failures,
    statsR,
    activityR,
    sourceNote: "ShadiLife: /admin/dashboard, /admin/users, /admin/agents and the shared /ai-agents/_meta usage and activity feeds filtered to owner-chat.",
    coverageNote: `The member table shows the first ${DIRECTORY_PAGE} rows of the server-paginated /admin/users; status and tier splits are therefore page-level, while the dashboard figures cover the whole platform.`,
    timingNote: "The registration trend is a real daily series from ShadiLife's dashboard. Revenue is a rolling 7-day figure; the rest are point-in-time totals.",
  });
}

/* ── Shared tail: runtime, audit and the honesty flags ───────────────── */

interface Partials {
  metrics: OwnerMetric[];
  dimensions: OwnerDimension[];
  series: OwnerSeries | null;
  seriesNote: string;
  headlineRate: OwnerChatSnapshot["headlineRate"];
  directories: OwnerDirectory[];
  failures: string[];
  statsR: PromiseSettledResult<{ data: AgentStats; meta: unknown }>;
  activityR: PromiseSettledResult<{ data: AgentActivityEntry[]; meta: Paginated }>;
  sourceNote: string;
  coverageNote: string;
  timingNote: string;
}

function finish(base: OwnerChatSnapshot, p: Partials): OwnerChatSnapshot {
  const runtime: OwnerRuntime | null =
    p.statsR.status === "fulfilled"
      ? {
          agent: p.statsR.value.data.agent,
          model: p.statsR.value.data.model,
          rateLimitPerMinute: p.statsR.value.data.rateLimitPerMinute,
          monthlyBudgetUsd: p.statsR.value.data.monthlyBudgetUsd,
          callsToday: p.statsR.value.data.callsToday ?? null,
          callsThisMonth: p.statsR.value.data.callsThisMonth,
          spendThisMonthUsd: p.statsR.value.data.spendThisMonthUsd,
          tokensThisMonth: p.statsR.value.data.tokensThisMonth ?? null,
        }
      : null;

  const runtimeError = p.statsR.status === "rejected" ? reason(p.statsR.reason, "The agent runtime stats") : null;

  const audit: OwnerAuditEntry[] =
    p.activityR.status === "fulfilled"
      ? p.activityR.value.data.map((e) => ({
          id: e.id,
          action: e.action,
          targetType: e.targetType,
          targetId: e.targetId,
          admin: e.admin?.name ?? null,
          createdAt: e.createdAt,
          ageHours: ageHours(e.createdAt),
        }))
      : [];

  const auditError = p.activityR.status === "rejected" ? reason(p.activityR.reason, "The audited action log") : null;

  const failures = [...p.failures];
  if (runtimeError) failures.push("Agent runtime stats");
  if (auditError) failures.push("Audited action log");

  /* If nothing at all came back, `error` is set and every page must refuse
     to assess health rather than show a reassuring empty state. */
  const anythingLoaded =
    runtime !== null ||
    p.activityR.status === "fulfilled" ||
    p.directories.some((d) => d.loaded) ||
    p.metrics.some((m) => m.value !== null) ||
    p.dimensions.some((d) => !d.failed);

  return {
    ...base,
    loading: false,
    error: anythingLoaded ? null : "Nothing could be read from this platform, so none of the figures below can be assessed.",
    failures,
    partial: anythingLoaded && failures.length > 0,
    metrics: p.metrics,
    dimensions: p.dimensions,
    series: p.series,
    seriesNote: p.seriesNote,
    headlineRate: p.headlineRate,
    directories: p.directories,
    audit,
    auditError,
    auditTotal: p.activityR.status === "fulfilled" ? p.activityR.value.meta.total ?? audit.length : null,
    auditActionTypes: auditError ? [] : tally(audit.map((e) => actionFamily(e.action))),
    auditRecencyBuckets: auditError ? [] : recencyBuckets(audit),
    runtime,
    runtimeError,
    sourceNote: p.sourceNote,
    coverageNote: p.coverageNote,
    timingNote: p.timingNote,
  };
}

/* ══ Formatting ════════════════════════════════════════════════════════ */

/** Renders a metric honestly: `null` is never printed as a zero. */
export function formatOwnerMetric(m: OwnerMetric): string {
  if (m.value === null) return "Not tracked";
  switch (m.format) {
    case "pct":
      return `${m.value}%`;
    case "usd":
      return `$${m.value.toFixed(2)}`;
    case "pkr":
      return `PKR ${m.value.toLocaleString()}`;
    case "rating":
      return m.value.toFixed(2);
    default:
      return m.value.toLocaleString();
  }
}

export function relativeTime(iso: string): string {
  const h = ageHours(iso);
  if (h === null) return "—";
  if (h < 1) return "under an hour ago";
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "yesterday" : `${d}d ago`;
}
