"use client";

/**
 * Payment & Wallet Agent — normalized snapshot for the special workspace.
 *
 * This agent exists on GhrFix ONLY. `PLATFORMS.shadilife.agents` in
 * src/lib/platforms.ts registers no `payment-wallet` entry, so there is no
 * `/ai-agents/payment-wallet` mount on that backend at all. Rather than fire
 * doomed requests and dress the failure up as an error, the hook
 * short-circuits on ShadiLife with `supported: false` and every page renders
 * an honest "not available here" state.
 *
 * Real endpoints, all read-only, all discovered from the existing dashboard
 * views rather than guessed:
 *
 *   GET /ai-agents/payment-wallet/summary
 *       → walletTotals, cashSettledPKR, tokensCirculatedInBookings,
 *         economy settings, pendingTopups[]
 *       (src/components/agents/views/ghrfix/payment-wallet.tsx)
 *   GET /ai-agents/payment-wallet/trend
 *       → [{ date, total }] — 14 real days of ledger credits
 *       (same file)
 *   GET /ai-agents/payment-wallet/topups?status&page&pageSize
 *       → TopUp[] with a Paginated meta
 *       (src/components/agents/views/domain/ghrfix/payment-wallet.tsx)
 *   GET /admin/wallet/transactions?type&page&pageSize
 *       → the platform-wide credit/debit ledger, Paginated
 *       (src/components/agents/views/domain/ghrfix/finance.tsx)
 *
 * The agent also owns three real, audited money writes — POST
 * /topups/:id/approve, POST /topups/:id/reject and PATCH /settings — which
 * this file now exposes as `approveTopUp`, `rejectTopUp` and
 * `updateEconomySettings` below. Each is a real write that GhrFix's own audit
 * log records (`auditToolAction` in payment-wallet-agent/router.ts); none of
 * them is called automatically, and every call site requires an explicit
 * admin confirmation before firing. GhrFix Coins are the only currency these
 * touch — no other agent, and no page on ShadiLife, gains a write from this.
 *
 * Money is never guessed. A figure the backend did not return stays `null` and
 * the pages print "—" or "Not tracked"; a zero here would read as a real
 * balance. `error` and `isEmpty` are kept strictly apart so a failed fetch can
 * never render as "nothing pending, all healthy".
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch, ApiError, type Paginated } from "./api";
import { platformLabel } from "./agent-data";
import type { PlatformKey } from "./platforms";

/* ── Raw backend shapes (only the fields these pages consume) ────────── */

interface RawEconomy {
  signupTokenGrant?: string | number;
  acceptFeeTokens?: string | number;
  bankAccountName?: string | null;
  bankAccountNumber?: string | null;
  bankName?: string | null;
  updatedAt?: string;
}

interface RawUser {
  id?: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: string;
}

interface RawTopUp {
  id?: string;
  userId?: string;
  amount?: string | number;
  receiptUrl?: string;
  bankReference?: string | null;
  status?: string;
  reviewNote?: string | null;
  reviewedAt?: string | null;
  createdAt?: string;
  user?: RawUser | null;
}

interface RawSummary {
  walletTotals?: {
    acceptFeesCollected?: number;
    topUpsApproved?: number;
    refunds?: number;
    totalCredits?: number;
    totalDebits?: number;
    totalTransactions?: number;
  };
  cashSettledPKR?: number;
  tokensCirculatedInBookings?: number;
  economy?: RawEconomy;
  pendingTopups?: RawTopUp[];
  pendingTopupsCount?: number;
}

interface RawTrendPoint {
  date?: string;
  total?: number;
}

interface RawLedgerRow {
  id?: string;
  type?: string;
  reason?: string;
  amount?: string | number;
  balanceAfter?: string | number;
  note?: string | null;
  createdAt?: string;
  user?: RawUser | null;
}

/* ── Public shape ───────────────────────────────────────────────────── */

export type TopUpStatus = "PENDING" | "APPROVED" | "REJECTED" | "OTHER";

export interface TopUpRequest {
  id: string;
  /** Best human handle the backend gave for the requester. */
  requester: string;
  /** Secondary contact line — email or phone, whichever came back. */
  contact: string;
  /** Coins requested. `null` when the backend returned no parseable amount — never 0. */
  amount: number | null;
  bankReference: string | null;
  status: TopUpStatus;
  /** The backend's own status string, shown verbatim where space allows. */
  rawStatus: string;
  reviewNote: string | null;
  createdAt: string | null;
  reviewedAt: string | null;
  /** Whole days since the request was raised; null when no timestamp came back. */
  ageDays: number | null;
}

export type LedgerType = "CREDIT" | "DEBIT" | "OTHER";

export interface LedgerRow {
  id: string;
  type: LedgerType;
  /** Machine reason (e.g. TOP_UP_APPROVED) kept for grouping. */
  reason: string;
  /** Same reason, humanised for display. */
  reasonLabel: string;
  amount: number | null;
  balanceAfter: number | null;
  note: string | null;
  holder: string;
  contact: string;
  createdAt: string | null;
  ageDays: number | null;
}

/** A headline figure. `value: null` means the backend did not report it. */
export interface WalletMetric {
  key: string;
  label: string;
  value: number | null;
  kind: "coins" | "pkr" | "count";
  note: string;
  tone: string;
  icon: string;
}

export interface WalletDim {
  label: string;
  value: number;
}

export interface WalletDimension {
  key: string;
  title: string;
  unit: string;
  /** One line of provenance — which endpoint field this cut came from. */
  note: string;
  rows: WalletDim[];
  total: number;
}

export interface WalletRate {
  label: string;
  value: number | null;
  max: number;
  note: string;
}

export interface WalletSeries {
  labels: string[];
  series: Array<{ name: string; data: number[] }>;
  granularity: string;
}

/** The token-economy configuration, read-only. Strings kept verbatim. */
export interface EconomyConfig {
  signupTokenGrant: number | null;
  acceptFeeTokens: number | null;
  bankName: string | null;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  updatedAt: string | null;
}

export interface WalletSnapshot {
  platform: PlatformKey;
  /** False on ShadiLife: the agent is not registered there, so nothing was fetched. */
  supported: boolean;
  /** Plain-English reason, used verbatim by the unsupported state. */
  unsupportedReason: string;
  /** What this workspace is fundamentally reading. */
  domain: string;
  /** Named so every page can state exactly where its numbers came from. */
  sourceNote: string;
  /** How much of each collection was actually fetched. */
  coverageNote: string;

  metrics: WalletMetric[];
  /** Credits minus debits — coins outstanding in user wallets. Null if either side is missing. */
  float: number | null;

  topups: TopUpRequest[];
  /** Server-reported total for /topups, which may exceed what was fetched. */
  topupsTotal: number | null;
  topupStatusMix: WalletDimension;
  topupAmountByStatus: WalletDimension;
  topupAgeBuckets: WalletDimension;
  topTopUpRequesters: WalletDimension;
  approvalRate: WalletRate;
  avgApprovedTopUp: number | null;

  ledger: LedgerRow[];
  ledgerTotal: number | null;
  /** True when /admin/wallet/transactions itself failed while the rest loaded. */
  ledgerError: string | null;
  ledgerDirectionMix: WalletDimension;
  ledgerReasonMix: WalletDimension;
  ledgerAmountByReason: WalletDimension;
  topLedgerHolders: WalletDimension;
  creditSourceMix: WalletDimension;
  debitDestinationMix: WalletDimension;

  economy: EconomyConfig | null;
  economyNote: string;

  /** 14 real days of credited coins from /trend; null when the route returned nothing. */
  series: WalletSeries | null;
  seriesNote: string;
  creditedInWindow: number | null;
  /** Last 7 days vs the 7 before, in percent. Null when the window is too short. */
  windowChangePct: number | null;

  /** True once a fetch finished and every collection came back genuinely empty. */
  isEmpty: boolean;
  loading: boolean;
  error: string | null;

  /**
   * Patches one already-loaded top-up in place after a real approve/reject
   * write, so every derived figure that reads from it — the status mix
   * donut, the pending count, the approval rate — updates immediately
   * without a full refetch. A no-op if `id` isn't among the loaded rows.
   */
  applyTopUpDecision: (result: TopUpDecisionResult) => void;
  /**
   * Replaces the economy settings in place after a real PATCH /settings
   * write, so the fee-share ring and every config row reflect the new
   * values immediately without a full refetch.
   */
  applyEconomyUpdate: (economy: EconomyConfig) => void;
}

/* ── Honest helpers ─────────────────────────────────────────────────── */

/** Number or null — never coerces a missing field into 0. */
function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function ageInDays(iso: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / 86_400_000));
}

function statusOf(raw: string): TopUpStatus {
  const s = raw.toUpperCase();
  if (s === "PENDING" || s === "APPROVED" || s === "REJECTED") return s;
  return "OTHER";
}

function typeOf(raw: string): LedgerType {
  const s = raw.toUpperCase();
  return s === "CREDIT" || s === "DEBIT" ? s : "OTHER";
}

/** Shared by the initial snapshot and by `updateEconomySettings`'s own response, so both normalize identically. */
function normalizeEconomy(raw: RawEconomy | null | undefined): EconomyConfig | null {
  if (!raw) return null;
  return {
    signupTokenGrant: num(raw.signupTokenGrant),
    acceptFeeTokens: num(raw.acceptFeeTokens),
    bankName: raw.bankName ?? null,
    bankAccountName: raw.bankAccountName ?? null,
    bankAccountNumber: raw.bankAccountNumber ?? null,
    updatedAt: raw.updatedAt ?? null,
  };
}

export function humanReason(reason: string): string {
  if (!reason) return "Unspecified";
  return reason.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

/** Coins, or an em dash. Money is never printed as a guessed zero. */
export function coins(v: number | null | undefined): string {
  return v === null || v === undefined ? "—" : `${Math.round(v).toLocaleString()} GC`;
}

export function pkr(v: number | null | undefined): string {
  return v === null || v === undefined ? "—" : `PKR ${Math.round(v).toLocaleString()}`;
}

export function formatMetric(m: WalletMetric): string {
  if (m.value === null) return "Not tracked";
  if (m.kind === "coins") return coins(m.value);
  if (m.kind === "pkr") return pkr(m.value);
  return m.value.toLocaleString();
}

export function formatAge(days: number | null): string {
  if (days === null) return "—";
  if (days === 0) return "today";
  if (days === 1) return "1 day";
  return `${days} days`;
}

export function shortDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function dateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function dim(key: string, title: string, unit: string, note: string, rows: WalletDim[]): WalletDimension {
  const kept = rows.filter((r) => r.value > 0);
  return { key, title, unit, note, rows: kept, total: kept.reduce((a, b) => a + b.value, 0) };
}

/** Count rows by a key, ranked biggest first. */
function tallyBy<T>(items: T[], pick: (t: T) => string | null): WalletDim[] {
  const map = new Map<string, number>();
  for (const it of items) {
    const k = pick(it);
    if (!k) continue;
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

/** Sum a numeric field by a key, ranked biggest first. Rows with no amount are skipped, not zeroed. */
function sumBy<T>(items: T[], pick: (t: T) => string | null, amount: (t: T) => number | null): WalletDim[] {
  const map = new Map<string, number>();
  for (const it of items) {
    const k = pick(it);
    const a = amount(it);
    if (!k || a === null) continue;
    map.set(k, (map.get(k) ?? 0) + a);
  }
  return [...map.entries()].map(([label, value]) => ({ label, value: Math.round(value) })).sort((a, b) => b.value - a.value);
}

const AGE_BUCKETS: Array<{ label: string; test: (d: number) => boolean }> = [
  { label: "Today", test: (d) => d === 0 },
  { label: "1–3 days", test: (d) => d >= 1 && d <= 3 },
  { label: "4–7 days", test: (d) => d >= 4 && d <= 7 },
  { label: "8–30 days", test: (d) => d >= 8 && d <= 30 },
  { label: "Over 30 days", test: (d) => d > 30 },
];

function bucketAges(key: string, title: string, note: string, rows: Array<{ ageDays: number | null }>): WalletDimension {
  return dim(
    key,
    title,
    "requests",
    note,
    AGE_BUCKETS.map((b) => ({ label: b.label, value: rows.filter((r) => r.ageDays !== null && b.test(r.ageDays)).length })),
  );
}

/* ── Fetch ──────────────────────────────────────────────────────────── */

const TOPUP_PAGE_SIZE = 200;
const LEDGER_PAGE_SIZE = 200;
const AGENT_BASE = "/ai-agents/payment-wallet";

interface RawState {
  summary: RawSummary | null;
  trend: RawTrendPoint[] | null;
  topups: RawTopUp[] | null;
  topupsTotal: number | null;
  ledger: RawLedgerRow[] | null;
  ledgerTotal: number | null;
  ledgerError: string | null;
}

const EMPTY_RAW: RawState = {
  summary: null,
  trend: null,
  topups: null,
  topupsTotal: null,
  ledger: null,
  ledgerTotal: null,
  ledgerError: null,
};

export function useWalletSnapshot(platform: PlatformKey): WalletSnapshot {
  const [raw, setRaw] = useState<RawState>(EMPTY_RAW);
  const [loading, setLoading] = useState(platform === "ghrfix");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // ShadiLife registers no payment-wallet agent, so there is nothing to
    // call. Short-circuit rather than fire requests that must 404.
    if (platform !== "ghrfix") {
      setRaw(EMPTY_RAW);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setRaw(EMPTY_RAW);
    setLoading(true);
    setError(null);

    async function run(): Promise<RawState> {
      const [summary, trend, topups, ledger] = await Promise.allSettled([
        apiFetch<RawSummary>("ghrfix", `${AGENT_BASE}/summary`),
        apiFetch<RawTrendPoint[]>("ghrfix", `${AGENT_BASE}/trend`),
        apiFetch<RawTopUp[], Paginated>("ghrfix", `${AGENT_BASE}/topups`, { query: { page: 1, pageSize: TOPUP_PAGE_SIZE } }),
        apiFetch<RawLedgerRow[], Paginated>("ghrfix", "/admin/wallet/transactions", { query: { page: 1, pageSize: LEDGER_PAGE_SIZE } }),
      ]);

      // /summary and /topups are the spine of the workspace. If both are gone
      // there is nothing honest to render, so surface the failure.
      if (summary.status === "rejected" && topups.status === "rejected") throw summary.reason;

      return {
        summary: summary.status === "fulfilled" ? (summary.value.data ?? null) : null,
        trend: trend.status === "fulfilled" && Array.isArray(trend.value.data) ? trend.value.data : null,
        topups: topups.status === "fulfilled" && Array.isArray(topups.value.data) ? topups.value.data : null,
        topupsTotal: topups.status === "fulfilled" ? (topups.value.meta?.total ?? null) : null,
        ledger: ledger.status === "fulfilled" && Array.isArray(ledger.value.data) ? ledger.value.data : null,
        ledgerTotal: ledger.status === "fulfilled" ? (ledger.value.meta?.total ?? null) : null,
        ledgerError:
          ledger.status === "rejected"
            ? ledger.reason instanceof ApiError
              ? ledger.reason.message
              : "The platform wallet ledger could not be read."
            : null,
      };
    }

    run()
      .then((next) => {
        if (!cancelled) setRaw(next);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Could not reach the GhrFix backend.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [platform]);

  /**
   * Patches the raw top-up list `derive` reads from, so a real approve/reject
   * write updates every dependent figure (status mix, pending count, approval
   * rate, average approved amount) in one pass — exactly as a refetch would,
   * without firing one. A decision for an id that isn't loaded is a no-op.
   */
  const applyTopUpDecision = useCallback((result: TopUpDecisionResult) => {
    setRaw((prev) =>
      prev.topups
        ? {
            ...prev,
            topups: prev.topups.map((t) =>
              t.id === result.id ? { ...t, status: result.rawStatus, reviewedAt: result.reviewedAt, reviewNote: result.reviewNote } : t,
            ),
          }
        : prev,
    );
  }, []);

  /** Same idea for the economy block a real PATCH /settings write just changed. */
  const applyEconomyUpdate = useCallback((economy: EconomyConfig) => {
    setRaw((prev) =>
      prev.summary
        ? {
            ...prev,
            summary: {
              ...prev.summary,
              economy: {
                signupTokenGrant: economy.signupTokenGrant ?? undefined,
                acceptFeeTokens: economy.acceptFeeTokens ?? undefined,
                bankName: economy.bankName,
                bankAccountName: economy.bankAccountName,
                bankAccountNumber: economy.bankAccountNumber,
                updatedAt: economy.updatedAt ?? undefined,
              },
            },
          }
        : prev,
    );
  }, []);

  const snapshot = useMemo(() => derive(platform, raw, loading, error), [platform, raw, loading, error]);
  return { ...snapshot, applyTopUpDecision, applyEconomyUpdate };
}

/* ── Normalization ──────────────────────────────────────────────────── */

function emptyDim(key: string, title: string, unit: string, note: string): WalletDimension {
  return { key, title, unit, note, rows: [], total: 0 };
}

function unsupported(platform: PlatformKey): WalletSnapshot {
  const label = platformLabel(platform);
  const reason = `${label} does not register a Payment & Wallet agent — there is no /ai-agents/payment-wallet route on its backend, so no request was made and no figure on this page could be real.`;
  return {
    platform,
    supported: false,
    unsupportedReason: reason,
    domain: `Not available on ${label}`,
    sourceNote: reason,
    coverageNote: "Nothing was fetched.",
    metrics: [],
    float: null,
    topups: [],
    topupsTotal: null,
    topupStatusMix: emptyDim("status", "Requests by status", "requests", reason),
    topupAmountByStatus: emptyDim("amount-status", "Coins by status", "GC", reason),
    topupAgeBuckets: emptyDim("age", "Queue age", "requests", reason),
    topTopUpRequesters: emptyDim("requesters", "Top requesters", "GC", reason),
    approvalRate: { label: "Approval rate", value: null, max: 100, note: reason },
    avgApprovedTopUp: null,
    ledger: [],
    ledgerTotal: null,
    ledgerError: null,
    ledgerDirectionMix: emptyDim("direction", "Credits vs debits", "entries", reason),
    ledgerReasonMix: emptyDim("reason", "Entries by reason", "entries", reason),
    ledgerAmountByReason: emptyDim("reason-amount", "Coins by reason", "GC", reason),
    topLedgerHolders: emptyDim("holders", "Most active wallets", "entries", reason),
    creditSourceMix: emptyDim("credit-src", "Where credits come from", "GC", reason),
    debitDestinationMix: emptyDim("debit-dst", "Where coins go", "GC", reason),
    economy: null,
    economyNote: reason,
    series: null,
    seriesNote: reason,
    creditedInWindow: null,
    windowChangePct: null,
    isEmpty: false,
    loading: false,
    error: null,
    // Real hook-level implementations replace these once `useWalletSnapshot`
    // spreads its own state-backed versions over this object. Unreachable on
    // ShadiLife regardless — the pages never render a control that calls
    // either while `supported` is false.
    applyTopUpDecision: () => {},
    applyEconomyUpdate: () => {},
  };
}

function derive(platform: PlatformKey, raw: RawState, loading: boolean, error: string | null): WalletSnapshot {
  if (platform !== "ghrfix") return unsupported(platform);

  const wt = raw.summary?.walletTotals;
  const totalCredits = num(wt?.totalCredits);
  const totalDebits = num(wt?.totalDebits);
  const acceptFees = num(wt?.acceptFeesCollected);
  const topUpsApproved = num(wt?.topUpsApproved);
  const refunds = num(wt?.refunds);
  const totalTransactions = num(wt?.totalTransactions);
  const cashSettled = num(raw.summary?.cashSettledPKR);
  const circulated = num(raw.summary?.tokensCirculatedInBookings);
  const pendingCount = num(raw.summary?.pendingTopupsCount);

  const float = totalCredits !== null && totalDebits !== null ? totalCredits - totalDebits : null;

  /* Top-ups ─────────────────────────────────────────────────────────── */
  const topups: TopUpRequest[] = (raw.topups ?? []).map((t, i) => {
    const createdAt = t.createdAt ?? null;
    return {
      id: t.id ?? `topup-${i}`,
      requester: t.user?.name?.trim() || "Unknown user",
      contact: t.user?.email ?? t.user?.phone ?? "—",
      amount: num(t.amount),
      bankReference: t.bankReference ?? null,
      status: statusOf(t.status ?? ""),
      rawStatus: t.status ?? "UNKNOWN",
      reviewNote: t.reviewNote ?? null,
      createdAt,
      reviewedAt: t.reviewedAt ?? null,
      ageDays: ageInDays(createdAt),
    };
  }).sort((a, b) => {
    const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bt - at;
  });

  const topupSource = `GET ${AGENT_BASE}/topups`;
  const topupStatusMix = dim(
    "status",
    "Requests by status",
    "requests",
    `Counted over the ${topups.length} request${topups.length === 1 ? "" : "s"} returned by ${topupSource}.`,
    tallyBy(topups, (t) => (t.status === "OTHER" ? t.rawStatus : t.status.charAt(0) + t.status.slice(1).toLowerCase())),
  );

  const topupAmountByStatus = dim(
    "amount-status",
    "Coins requested by status",
    "GC",
    `Summed from each request's own \`amount\` field. Requests whose amount was missing are excluded, not zeroed.`,
    sumBy(topups, (t) => (t.status === "OTHER" ? t.rawStatus : t.status.charAt(0) + t.status.slice(1).toLowerCase()), (t) => t.amount),
  );

  const topupAgeBuckets = bucketAges(
    "age",
    "How old the requests are",
    "Bucketed from each request's real `createdAt`. Rows with no timestamp are excluded.",
    topups,
  );

  const topTopUpRequesters = dim(
    "requesters",
    "Largest requesters",
    "GC",
    "Coins requested per named user across every loaded request.",
    sumBy(topups, (t) => t.requester, (t) => t.amount).slice(0, 8),
  );

  const decided = topups.filter((t) => t.status === "APPROVED" || t.status === "REJECTED");
  const approvedCount = topups.filter((t) => t.status === "APPROVED").length;
  const approvalRate: WalletRate = {
    label: "Top-up approval rate",
    value: decided.length > 0 ? Math.round((approvedCount / decided.length) * 1000) / 10 : null,
    max: 100,
    note:
      decided.length > 0
        ? `${approvedCount} of ${decided.length} decided request${decided.length === 1 ? "" : "s"} were approved. Pending requests are excluded — they have no verdict yet.`
        : "No loaded top-up has been decided yet, so no rate can be computed.",
  };

  const approvedAmounts = topups.filter((t) => t.status === "APPROVED" && t.amount !== null).map((t) => t.amount as number);
  const avgApprovedTopUp = approvedAmounts.length > 0 ? Math.round(approvedAmounts.reduce((a, b) => a + b, 0) / approvedAmounts.length) : null;

  /* Ledger ──────────────────────────────────────────────────────────── */
  const ledger: LedgerRow[] = (raw.ledger ?? []).map((r, i) => {
    const createdAt = r.createdAt ?? null;
    const reason = r.reason ?? "";
    return {
      id: r.id ?? `ledger-${i}`,
      type: typeOf(r.type ?? ""),
      reason,
      reasonLabel: humanReason(reason),
      amount: num(r.amount),
      balanceAfter: num(r.balanceAfter),
      note: r.note ?? null,
      holder: r.user?.name?.trim() || "Unknown",
      contact: r.user?.phone ?? r.user?.email ?? "—",
      createdAt,
      ageDays: ageInDays(createdAt),
    };
  }).sort((a, b) => {
    const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bt - at;
  });

  const ledgerSource = "GET /admin/wallet/transactions";
  const ledgerDirectionMix = dim(
    "direction",
    "Credits vs debits",
    "entries",
    `Entry counts over the ${ledger.length} row${ledger.length === 1 ? "" : "s"} loaded from ${ledgerSource}.`,
    tallyBy(ledger, (r) => (r.type === "OTHER" ? "Other" : r.type === "CREDIT" ? "Credit" : "Debit")),
  );

  const ledgerReasonMix = dim(
    "reason",
    "Entries by reason",
    "entries",
    `Grouped on the ledger's own \`reason\` enum.`,
    tallyBy(ledger, (r) => r.reasonLabel).slice(0, 8),
  );

  const ledgerAmountByReason = dim(
    "reason-amount",
    "Coins moved by reason",
    "GC",
    "Summed from each entry's own `amount`. Entries with no amount are excluded.",
    sumBy(ledger, (r) => r.reasonLabel, (r) => r.amount).slice(0, 8),
  );

  const topLedgerHolders = dim(
    "holders",
    "Busiest wallets",
    "entries",
    "Ledger entries per named wallet holder across the loaded page.",
    tallyBy(ledger, (r) => r.holder).slice(0, 8),
  );

  /* Credit and debit composition come from /summary's authoritative totals,
     not from the loaded ledger page — the page is a sample, the totals are
     the whole book. Anything the summary omitted is left out entirely. */
  const creditSourceMix = dim(
    "credit-src",
    "Where credits come from",
    "GC",
    `From \`walletTotals\` on GET ${AGENT_BASE}/summary — platform-wide, not just the loaded ledger page.`,
    [
      { label: "Approved top-ups", value: topUpsApproved ?? 0 },
      {
        label: "Other credits",
        value: totalCredits !== null && topUpsApproved !== null ? Math.max(0, totalCredits - topUpsApproved) : 0,
      },
    ],
  );

  const debitDestinationMix = dim(
    "debit-dst",
    "Where coins go",
    "GC",
    `From \`walletTotals\` plus \`tokensCirculatedInBookings\` on GET ${AGENT_BASE}/summary.`,
    [
      { label: "Accept fees collected", value: acceptFees ?? 0 },
      { label: "Refunds issued", value: refunds ?? 0 },
      { label: "Coins applied to bookings", value: circulated ?? 0 },
    ],
  );

  /* Trend ───────────────────────────────────────────────────────────── */
  const trendPoints = (raw.trend ?? []).filter((p): p is { date: string; total: number } => typeof p.date === "string" && num(p.total) !== null)
    .map((p) => ({ date: p.date, total: Number(p.total) }));

  const series: WalletSeries | null =
    trendPoints.length > 1
      ? {
          labels: trendPoints.map((p) => shortDate(p.date)),
          series: [{ name: "Coins credited", data: trendPoints.map((p) => p.total) }],
          granularity: `Daily · ${trendPoints.length} real days`,
        }
      : null;

  const seriesNote =
    trendPoints.length > 1
      ? `Real daily credit totals from GET ${AGENT_BASE}/trend.`
      : raw.trend === null
        ? `GET ${AGENT_BASE}/trend did not return, so no time series is shown. Nothing here is interpolated.`
        : `GET ${AGENT_BASE}/trend returned ${trendPoints.length} usable point${trendPoints.length === 1 ? "" : "s"} — not enough to draw a line, and none will be invented.`;

  const creditedInWindow = trendPoints.length > 0 ? trendPoints.reduce((a, b) => a + b.total, 0) : null;

  let windowChangePct: number | null = null;
  if (trendPoints.length >= 4) {
    const half = Math.floor(trendPoints.length / 2);
    const prev = trendPoints.slice(0, half).reduce((a, b) => a + b.total, 0);
    const curr = trendPoints.slice(trendPoints.length - half).reduce((a, b) => a + b.total, 0);
    if (prev > 0) windowChangePct = Math.round(((curr - prev) / prev) * 1000) / 10;
  }

  /* Economy ─────────────────────────────────────────────────────────── */
  const economy = normalizeEconomy(raw.summary?.economy);

  /* Metrics ─────────────────────────────────────────────────────────── */
  const metrics: WalletMetric[] = [
    { key: "credits", label: "Total credits", value: totalCredits, kind: "coins", note: "Every coin ever credited, platform-wide.", tone: "green", icon: "trend" },
    { key: "debits", label: "Total debits", value: totalDebits, kind: "coins", note: "Every coin ever spent or clawed back.", tone: "red", icon: "arrow" },
    { key: "float", label: "Coin float outstanding", value: float, kind: "coins", note: "Credits minus debits — coins still sitting in user wallets.", tone: "purple", icon: "target" },
    { key: "fees", label: "Accept fees collected", value: acceptFees, kind: "coins", note: "The flat per-job fee, as totalled by the backend.", tone: "amber", icon: "tag" },
    { key: "cash", label: "Cash settled (jobs)", value: cashSettled, kind: "pkr", note: "Settled directly between customer and provider — never touches the wallet.", tone: "blue", icon: "check" },
    { key: "pending", label: "Top-ups awaiting review", value: pendingCount, kind: "count", note: "Manual bank transfers the backend reports as PENDING.", tone: "cyan", icon: "clock" },
    { key: "entries", label: "Ledger entries", value: totalTransactions, kind: "count", note: "Total wallet transactions on record.", tone: "purple", icon: "posts" },
  ];

  const fetchedNothing = !raw.summary && (raw.topups?.length ?? 0) === 0 && (raw.ledger?.length ?? 0) === 0 && trendPoints.length === 0;
  const isEmpty = !loading && error === null && fetchedNothing;

  const coverageNote = [
    raw.topups
      ? `Top-ups: ${topups.length} loaded${raw.topupsTotal !== null ? ` of ${raw.topupsTotal.toLocaleString()} on record` : ""} (page size ${TOPUP_PAGE_SIZE}).`
      : "Top-ups: the request queue did not load.",
    raw.ledger
      ? `Ledger: ${ledger.length} entr${ledger.length === 1 ? "y" : "ies"} loaded${raw.ledgerTotal !== null ? ` of ${raw.ledgerTotal.toLocaleString()} on record` : ""} (page size ${LEDGER_PAGE_SIZE}).`
      : "Ledger: /admin/wallet/transactions did not load, so ledger-derived charts are unavailable.",
  ].join(" ");

  return {
    platform,
    supported: true,
    unsupportedReason: "",
    domain: "GhrFix Coins — wallet totals, the top-up queue and the token economy",
    sourceNote: `GET ${AGENT_BASE}/summary, /trend and /topups, plus the platform-wide ${ledgerSource}. The Top-Ups and Token Economy pages can also call this agent's real writes — POST .../topups/:id/approve|reject and PATCH .../settings — each behind an explicit confirmation and permanently audit-logged.`,
    coverageNote,
    metrics,
    float,
    topups,
    topupsTotal: raw.topupsTotal,
    topupStatusMix,
    topupAmountByStatus,
    topupAgeBuckets,
    topTopUpRequesters,
    approvalRate,
    avgApprovedTopUp,
    ledger,
    ledgerTotal: raw.ledgerTotal,
    ledgerError: raw.ledgerError,
    ledgerDirectionMix,
    ledgerReasonMix,
    ledgerAmountByReason,
    topLedgerHolders,
    creditSourceMix,
    debitDestinationMix,
    economy,
    economyNote: economy
      ? `Read from \`economy\` on GET ${AGENT_BASE}/summary. Saving new values on the Token Economy page calls the real, audited PATCH ${AGENT_BASE}/settings.`
      : `GET ${AGENT_BASE}/summary did not return the economy block, so the accept fee and signup grant cannot be shown.`,
    series,
    seriesNote,
    creditedInWindow,
    windowChangePct,
    isEmpty,
    loading,
    error,
    // Placeholders — `useWalletSnapshot` overwrites both with real
    // state-backed versions before returning. Kept here only so `derive`'s
    // return type is a complete WalletSnapshot on its own.
    applyTopUpDecision: () => {},
    applyEconomyUpdate: () => {},
  };
}

/* ── Real writes ────────────────────────────────────────────────────────
   The three audited money writes this agent owns. Each hits GhrFix only —
   there is nothing to call on ShadiLife, which is why every call site in
   the Top-Ups and Token Economy pages sits behind `w.supported`. Every one
   of these requires an explicit admin confirmation before it fires and is
   recorded in GhrFix's own audit log (`auditToolAction`, payment-wallet-
   agent/router.ts) — never invoked automatically from this file.
   ────────────────────────────────────────────────────────────────────── */

/** What a page needs after a real approve/reject write to patch its own row and hand back to `applyTopUpDecision`. */
export interface TopUpDecisionResult {
  id: string;
  status: TopUpStatus;
  rawStatus: string;
  reviewedAt: string | null;
  reviewNote: string | null;
}

function toDecisionResult(id: string, raw: RawTopUp): TopUpDecisionResult {
  return {
    id: raw.id ?? id,
    status: statusOf(raw.status ?? ""),
    rawStatus: raw.status ?? "UNKNOWN",
    reviewedAt: raw.reviewedAt ?? null,
    reviewNote: raw.reviewNote ?? null,
  };
}

/** POST /ai-agents/payment-wallet/topups/:id/approve — credits `amount` real coins to the requester. GhrFix only. */
export async function approveTopUp(id: string, note?: string): Promise<TopUpDecisionResult> {
  const { data } = await apiFetch<RawTopUp>("ghrfix", `${AGENT_BASE}/topups/${id}/approve`, {
    method: "POST",
    body: note ? { note } : {},
  });
  return toDecisionResult(id, data);
}

/** POST /ai-agents/payment-wallet/topups/:id/reject — a final, audited denial. GhrFix only. */
export async function rejectTopUp(id: string, note?: string): Promise<TopUpDecisionResult> {
  const { data } = await apiFetch<RawTopUp>("ghrfix", `${AGENT_BASE}/topups/${id}/reject`, {
    method: "POST",
    body: note ? { note } : {},
  });
  return toDecisionResult(id, data);
}

/** Only the fields the Token Economy page actually lets an admin edit. */
export interface EconomySettingsInput {
  signupTokenGrant?: number;
  acceptFeeTokens?: number;
}

/** PATCH /ai-agents/payment-wallet/settings — changes what every provider is charged, platform-wide. GhrFix only. */
export async function updateEconomySettings(input: EconomySettingsInput): Promise<EconomyConfig> {
  const { data } = await apiFetch<RawEconomy>("ghrfix", `${AGENT_BASE}/settings`, {
    method: "PATCH",
    body: input,
  });
  // The route always returns the full, current settings row, so this is never null.
  return normalizeEconomy(data) as EconomyConfig;
}
