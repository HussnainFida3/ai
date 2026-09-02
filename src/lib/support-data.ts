"use client";

/**
 * Support Agent — normalized snapshot for the special workspace.
 *
 * The two backends model "a support ticket" completely differently, and this
 * file is the one place that difference is absorbed:
 *
 *   GhrFix    GET /ai-agents/support/summary
 *               → { openDisputes, investigatingDisputes, unresolvedMessages, newMessages }
 *             GET /ai-agents/support/tickets?page&pageSize
 *               → { disputes: Paged<Dispute>, messages: Paged<ContactMessage> }
 *             (found in src/components/agents/views/ghrfix/support.tsx and
 *              src/components/agents/views/domain/ghrfix/support.tsx)
 *
 *   ShadiLife GET /admin/reports → AdminReport[]
 *             ShadiLife has no separate support-ticket model: member disputes
 *             and escalations live in the same Report table Moderation works.
 *             (found in src/components/agents/views/shadilife/support.tsx and
 *              src/components/agents/views/domain/shadilife/support.tsx)
 *
 * GhrFix therefore has two ticket *kinds* (booking disputes and contact-form
 * messages) and no severity at all; ShadiLife has one kind and a real
 * severity scale but no contact-form channel. Both collapse into the single
 * `SupportTicket` shape below. Anything a platform genuinely does not record
 * stays `null` and carries a note naming the platform — never zero-filled,
 * because a zero here would read as a real measurement of "none".
 *
 * WRITES — GhrFix only, both real and audited on the backend:
 *   POST /ai-agents/support/disputes/:id/resolve  — resolveGhrfixDispute()
 *     Body: { status: "INVESTIGATING"|"RESOLVED"|"REJECTED", resolutionNote?,
 *     refundAmount? }. resolutionNote IS the reply — dispute.service.ts sends
 *     it straight to the customer as a real notification (falling back to a
 *     generic status message when left blank). refundAmount triggers a real
 *     wallet credit when status is RESOLVED; deliberately not exposed from
 *     this workspace to avoid crediting a wallet from a quick text prompt.
 *   POST /ai-agents/support/messages/:id/resolve  — resolveGhrfixMessage()
 *     Body: { status? }, defaults to RESOLVED server-side. No note field
 *     exists on this one — ContactMessage has no reply channel of its own.
 *
 * ShadiLife's AI Support Agent (ai-agents/support-agent/router.ts) exposes
 * NO resolve or reply-send endpoint at all — only draft-reply,
 * summarize-thread and faq-suggest, which are AI drafting aids that return
 * text and change nothing. The real way to close a Report is
 * PUT /admin/reports/:id, a plain CRUD route gated by a broader
 * (SUPER_ADMIN/MODERATOR) role check, not the SUPER_ADMIN-only AI-agent
 * router this workspace wraps — so it is deliberately left unwired here and
 * the pages say so, rather than reaching outside the Support Agent's own
 * surface to force symmetry with GhrFix.
 *
 * `applyGhrDisputeUpdate`/`applyGhrMessageUpdate` patch the matching raw row
 * right after a successful write, so every derived stat/chart/escalation
 * recomputes without a refetch.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch, ApiError } from "./api";
import { platformLabel } from "./agent-data";
import type { PlatformKey } from "./platforms";

/* ── Public shape ───────────────────────────────────────────────────── */

/** Coarse lifecycle bucket every backend status maps onto. */
export type StatusGroup = "open" | "investigating" | "resolved" | "rejected" | "other";

export interface SupportTicket {
  id: string;
  /** Short human handle — dispute category, message subject, or report reason. */
  title: string;
  /** "Booking dispute" | "Contact message" | "Member report". */
  kind: string;
  /** The backend's own status string, shown verbatim. */
  status: string;
  statusGroup: StatusGroup;
  /** Free-text body the backend returned, or null when it returned none. */
  detail: string | null;
  /** Who raised it, as far as the backend names them. */
  raisedBy: string;
  /** Category / reason cut used for the ranked bars. */
  category: string;
  /** Only ShadiLife records a severity scale; null on GhrFix. */
  severity: string | null;
  createdAt: string | null;
  /** Whole days since creation, null when the backend returned no timestamp. */
  ageDays: number | null;
  resolvedAt: string | null;
  /** True where this row meets the escalation rule described in `escalationRule`. */
  escalated: boolean;
}

export interface SupportDim {
  label: string;
  value: number;
}

export interface SupportDimension {
  key: string;
  title: string;
  unit: string;
  /** One line of provenance — which endpoint field this cut came from. */
  note: string;
  rows: SupportDim[];
  total: number;
}

/** A headline figure. `value: null` means "this platform does not record it". */
export interface SupportMetric {
  key: string;
  label: string;
  value: number | null;
  kind: "count" | "pct";
  note: string;
  tone: string;
  icon: string;
}

export interface SupportRate {
  label: string;
  value: number | null;
  note: string;
}

export interface SupportSeries {
  labels: string[];
  series: Array<{ name: string; data: number[] }>;
  granularity: string;
}

export interface SupportPeriod {
  label: string;
  current: number | null;
  previous: number | null;
  deltaPct: number | null;
  note: string;
}

export interface CategoryResolution {
  label: string;
  resolved: number;
  total: number;
  pct: number;
}

export interface SupportSnapshot {
  platform: PlatformKey;
  /** What this platform's support queue is fundamentally made of. */
  domain: string;
  /** Named so every page can say exactly where its numbers came from. */
  sourceNote: string;
  /** How much of the queue was actually fetched — pages state this openly. */
  coverageNote: string;
  metrics: SupportMetric[];
  rates: SupportRate[];
  dimensions: SupportDimension[];
  /** Every loaded ticket, newest first. */
  tickets: SupportTicket[];
  /** The escalated subset, worst (most severe, then oldest) first. */
  escalations: SupportTicket[];
  /** Plain-English statement of how `escalated` was decided on this platform. */
  escalationRule: string;
  ageBuckets: SupportDimension;
  /** Per-category resolution, computed only where a category has rows. */
  categoryResolution: CategoryResolution[];
  /** Derived from the real createdAt timestamps on the loaded rows; null when none carry one. */
  series: SupportSeries | null;
  seriesNote: string;
  periods: SupportPeriod[];
  /** Resolution rate for the overview ring. */
  resolutionRate: SupportRate & { max: number };
  /** Timing metrics neither backend exposes — stated, never invented. */
  timingNote: string;
  /** True once a fetch finished and the queue was genuinely empty. */
  isEmpty: boolean;
  loading: boolean;
  error: string | null;

  /** Patch one raw dispute's status locally right after a real resolve succeeds (GhrFix only). */
  applyGhrDisputeUpdate: (disputeId: string, patch: Partial<{ status: string; resolutionNote: string | null; refundAmount: string | null }>) => void;
  /** Patch one raw contact message's status locally right after a real resolve succeeds (GhrFix only). */
  applyGhrMessageUpdate: (messageId: string, patch: Partial<{ status: string }>) => void;
}

/* ── Raw backend shapes ─────────────────────────────────────────────── */

interface GhrPaged<T> {
  items?: T[];
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
}

interface GhrDispute {
  id?: string;
  category?: string;
  description?: string;
  status?: string;
  resolutionNote?: string | null;
  refundAmount?: string | null;
  createdAt?: string;
  raisedBy?: { id?: string; name?: string | null; phone?: string | null; email?: string | null } | null;
  booking?: { id?: string; bookingNumber?: string } | null;
}

interface GhrContactMessage {
  id?: string;
  name?: string;
  email?: string;
  phone?: string | null;
  subject?: string;
  message?: string;
  status?: string;
  createdAt?: string;
}

interface GhrTickets {
  disputes?: GhrPaged<GhrDispute>;
  messages?: GhrPaged<GhrContactMessage>;
}

interface GhrSummary {
  openDisputes?: number;
  investigatingDisputes?: number;
  unresolvedMessages?: number;
  newMessages?: number;
}

/** GET /admin/reports — the fields these pages consume. */
interface ShadiReport {
  id?: string;
  reason?: string;
  description?: string | null;
  severity?: string;
  status?: string;
  resolvedAt?: string | null;
  createdAt?: string;
  reporter?: { id?: string; email?: string; profile?: { fullName?: string; city?: string } | null } | null;
  reported?: { id?: string; email?: string; profile?: { fullName?: string; city?: string } | null } | null;
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

function pctChange(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function groupOf(status: string): StatusGroup {
  const s = status.toUpperCase();
  if (s === "OPEN" || s === "NEW" || s === "PENDING") return "open";
  if (s === "INVESTIGATING" || s === "READ" || s === "IN_PROGRESS") return "investigating";
  if (s === "RESOLVED" || s === "CLOSED") return "resolved";
  if (s === "REJECTED" || s === "DISMISSED") return "rejected";
  return "other";
}

/** Whole days between an ISO timestamp and now; null when unparseable. */
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

/** Human ticket age. "—" where the backend returned no timestamp at all. */
export function formatAge(days: number | null): string {
  if (days === null) return "—";
  if (days === 0) return "today";
  if (days === 1) return "1 day";
  return `${days} days`;
}

export function formatMetric(m: Pick<SupportMetric, "value" | "kind">): string {
  if (m.value === null) return "Not tracked";
  if (m.kind === "pct") return `${m.value}%`;
  return m.value.toLocaleString();
}

/** A short date for a table cell, or "—" where none was returned. */
export function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  return shortDate(iso);
}

function toDim(rows: Array<{ label: string; value: number | null }>): SupportDim[] {
  return rows
    .filter((r): r is { label: string; value: number } => r.value !== null && r.value > 0)
    .map((r) => ({ label: r.label, value: r.value }))
    .sort((a, b) => b.value - a.value);
}

function makeDimension(key: string, title: string, unit: string, note: string, rows: SupportDim[]): SupportDimension {
  return { key, title, unit, note, rows, total: rows.reduce((a, b) => a + b.value, 0) };
}

/** Count rows by a derived key, dropping rows that have no key at all. */
function tally<T>(rows: T[], pick: (row: T) => string | null): SupportDim[] {
  const map = new Map<string, number>();
  for (const row of rows) {
    const k = pick(row);
    if (!k) continue;
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

/**
 * Daily intake buckets built from the real `createdAt` on the loaded rows.
 * This is a re-projection of timestamps the backend actually returned, not a
 * synthesised series — and it is null when nothing lands inside the window.
 */
function buildSeries(tickets: SupportTicket[], days: number): SupportSeries | null {
  const dated = tickets.filter((t) => t.ageDays !== null);
  if (dated.length === 0) return null;

  const labels: string[] = [];
  const opened: number[] = [];
  const nowResolved: number[] = [];
  for (let d = days - 1; d >= 0; d--) {
    labels.push(shortDate(new Date(Date.now() - d * 86_400_000).toISOString()));
    const inBucket = dated.filter((t) => t.ageDays === d);
    opened.push(inBucket.length);
    nowResolved.push(inBucket.filter((t) => t.statusGroup === "resolved").length);
  }
  if (opened.every((v) => v === 0)) return null;

  return {
    labels,
    series: [
      { name: "Tickets raised", data: opened },
      { name: "…of those, now resolved", data: nowResolved },
    ],
    granularity: `${days} daily buckets, derived from the createdAt on each loaded row`,
  };
}

function halves(data: number[]): { current: number | null; previous: number | null } {
  if (data.length < 2) return { current: null, previous: null };
  const mid = Math.floor(data.length / 2);
  return {
    previous: data.slice(0, mid).reduce((a, b) => a + b, 0),
    current: data.slice(mid).reduce((a, b) => a + b, 0),
  };
}

const AGE_BANDS: Array<{ label: string; min: number; max: number }> = [
  { label: "Under 1 day", min: 0, max: 0 },
  { label: "1–3 days", min: 1, max: 3 },
  { label: "4–7 days", min: 4, max: 7 },
  { label: "8–30 days", min: 8, max: 30 },
  { label: "Over 30 days", min: 31, max: Number.POSITIVE_INFINITY },
];

function ageDimension(tickets: SupportTicket[], note: string): SupportDimension {
  const rows = AGE_BANDS.map((b) => ({
    label: b.label,
    value: tickets.filter((t) => t.ageDays !== null && t.ageDays >= b.min && t.ageDays <= b.max).length,
  })).filter((r) => r.value > 0);
  return makeDimension("age", "Unresolved tickets by age", "tickets", note, rows);
}

function severityWeight(sev: string | null): number {
  switch ((sev ?? "").toUpperCase()) {
    case "CRITICAL":
      return 4;
    case "HIGH":
      return 3;
    case "MEDIUM":
      return 2;
    case "LOW":
      return 1;
    default:
      return 0;
  }
}

/** Exported so the escalations table can rank severity the same way the hook does. */
export function severityRank(sev: string | null): number {
  return severityWeight(sev);
}

/* ── Real writes — GhrFix only (see the file banner above) ───────────── */

export type DisputeResolutionStatus = "INVESTIGATING" | "RESOLVED" | "REJECTED";

export interface ResolveDisputeInput {
  status: DisputeResolutionStatus;
  /** Sent to the customer verbatim as the resolution notification. Leave blank for a generic status message. */
  resolutionNote?: string;
}

/** Real, audited write: POST /ai-agents/support/disputes/:id/resolve. */
export async function resolveGhrfixDispute(disputeId: string, input: ResolveDisputeInput): Promise<void> {
  const body: Record<string, unknown> = { status: input.status };
  if (input.resolutionNote && input.resolutionNote.trim()) body.resolutionNote = input.resolutionNote.trim().slice(0, 2000);
  await apiFetch("ghrfix", `/ai-agents/support/disputes/${disputeId}/resolve`, { method: "POST", body });
}

/** Real, audited write: POST /ai-agents/support/messages/:id/resolve. No reply-text field exists on this endpoint. */
export async function resolveGhrfixMessage(messageId: string): Promise<void> {
  await apiFetch("ghrfix", `/ai-agents/support/messages/${messageId}/resolve`, { method: "POST", body: { status: "RESOLVED" } });
}

/* ── The hook ───────────────────────────────────────────────────────── */

interface RawState {
  ghr: { summary: GhrSummary | null; tickets: GhrTickets | null } | null;
  shadi: ShadiReport[] | null;
}

const EMPTY_RAW: RawState = { ghr: null, shadi: null };

/** How many rows the GhrFix queue is asked for in one page. */
const GHR_PAGE_SIZE = 100;

export function useSupportSnapshot(platform: PlatformKey): SupportSnapshot {
  const [raw, setRaw] = useState<RawState>(EMPTY_RAW);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRaw(EMPTY_RAW);
    setLoading(true);
    setError(null);

    async function run(): Promise<RawState> {
      if (platform === "ghrfix") {
        // /tickets is the spine of every page; /summary only adds the
        // backend's own authoritative open counters, so losing it alone
        // should not blank the workspace.
        const [summary, tickets] = await Promise.allSettled([
          apiFetch<GhrSummary>(platform, "/ai-agents/support/summary"),
          apiFetch<GhrTickets>(platform, "/ai-agents/support/tickets", { query: { page: 1, pageSize: GHR_PAGE_SIZE } }),
        ]);
        if (tickets.status === "rejected") throw tickets.reason;
        return {
          ghr: {
            summary: summary.status === "fulfilled" ? (summary.value.data ?? null) : null,
            tickets: tickets.value.data ?? null,
          },
          shadi: null,
        };
      }
      // ShadiLife's support queue is the admin report table — there is no
      // per-agent tickets route to call.
      const { data } = await apiFetch<ShadiReport[]>(platform, "/admin/reports");
      return { ghr: null, shadi: Array.isArray(data) ? data : [] };
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

  /**
   * Patch one raw dispute/message's status right after a real resolve
   * succeeds. `derive()` recomputes statusGroup/escalated/every stat from
   * this raw status string on the next render, so patching just this field
   * is enough for the whole page (including the item leaving the escalated
   * list once it is no longer open/investigating) to update with no refetch.
   */
  const applyGhrDisputeUpdate = useCallback((disputeId: string, patch: Partial<GhrDispute>) => {
    setRaw((prev) => {
      const disputesPage = prev.ghr?.tickets?.disputes;
      if (!prev.ghr || !disputesPage) return prev;
      return {
        ...prev,
        ghr: {
          ...prev.ghr,
          tickets: {
            ...prev.ghr.tickets,
            disputes: { ...disputesPage, items: (disputesPage.items ?? []).map((d) => (d.id === disputeId ? { ...d, ...patch } : d)) },
          },
        },
      };
    });
  }, []);

  const applyGhrMessageUpdate = useCallback((messageId: string, patch: Partial<GhrContactMessage>) => {
    setRaw((prev) => {
      const messagesPage = prev.ghr?.tickets?.messages;
      if (!prev.ghr || !messagesPage) return prev;
      return {
        ...prev,
        ghr: {
          ...prev.ghr,
          tickets: {
            ...prev.ghr.tickets,
            messages: { ...messagesPage, items: (messagesPage.items ?? []).map((m) => (m.id === messageId ? { ...m, ...patch } : m)) },
          },
        },
      };
    });
  }, []);

  const snapshot = useMemo(() => derive(platform, raw, loading, error), [platform, raw, loading, error]);
  return { ...snapshot, applyGhrDisputeUpdate, applyGhrMessageUpdate };
}

/* ── Normalization ──────────────────────────────────────────────────── */

type Derived = Omit<SupportSnapshot, "platform" | "isEmpty" | "loading" | "error" | "applyGhrDisputeUpdate" | "applyGhrMessageUpdate">;

type SnapshotWithoutWrites = Omit<SupportSnapshot, "applyGhrDisputeUpdate" | "applyGhrMessageUpdate">;

function derive(platform: PlatformKey, raw: RawState, loading: boolean, error: string | null): SnapshotWithoutWrites {
  const label = platformLabel(platform);
  const base = platform === "ghrfix" ? deriveGhrfix(raw.ghr, label) : deriveShadilife(raw.shadi, label);
  const isEmpty = !loading && error === null && base.tickets.length === 0;
  return { platform, ...base, isEmpty, loading, error };
}

type SharedDerived = Pick<
  Derived,
  "tickets" | "escalations" | "escalationRule" | "ageBuckets" | "categoryResolution" | "series" | "seriesNote" | "periods" | "timingNote"
>;

/** Everything downstream of the raw rows is identical for both platforms. */
function common(tickets: SupportTicket[], opts: { unit: string; sourceNote: string; escalationRule: string }): SharedDerived {
  const sorted = [...tickets].sort((a, b) => {
    const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bt - at;
  });

  const unresolved = sorted.filter((t) => t.statusGroup === "open" || t.statusGroup === "investigating");

  const escalations = sorted
    .filter((t) => t.escalated)
    .sort((a, b) => {
      const sev = severityWeight(b.severity) - severityWeight(a.severity);
      if (sev !== 0) return sev;
      return (b.ageDays ?? -1) - (a.ageDays ?? -1);
    });

  const categories = [...new Set(sorted.map((t) => t.category))];
  const categoryResolution = categories
    .map((label) => {
      const rows = sorted.filter((t) => t.category === label);
      const resolved = rows.filter((t) => t.statusGroup === "resolved").length;
      return { label, resolved, total: rows.length, pct: Math.round((resolved / rows.length) * 1000) / 10 };
    })
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);

  const series = buildSeries(sorted, 14);
  const intake = halves(series?.series[0]?.data ?? []);
  const resolvedHalves = halves(series?.series[1]?.data ?? []);

  return {
    tickets: sorted,
    escalations,
    escalationRule: opts.escalationRule,
    ageBuckets: ageDimension(unresolved, `Age of every still-unresolved ${opts.unit}, from its own createdAt timestamp.`),
    categoryResolution,
    series,
    seriesNote: series
      ? `Re-projected from the createdAt on each of the ${sorted.length.toLocaleString()} loaded rows — ${opts.sourceNote}`
      : `No loaded row carries a createdAt inside the last 14 days, so no intake trend can honestly be drawn.`,
    periods: series
      ? [
          {
            label: "Tickets raised",
            current: intake.current,
            previous: intake.previous,
            deltaPct: pctChange(intake.current, intake.previous),
            note: "Last 7 days vs the 7 before, over the real 14-day intake window.",
          },
          {
            label: "…of those, now resolved",
            current: resolvedHalves.current,
            previous: resolvedHalves.previous,
            deltaPct: pctChange(resolvedHalves.current, resolvedHalves.previous),
            note: "Current status of the rows raised in each half — not a same-period resolution count.",
          },
        ]
      : [],
    timingNote:
      "Neither backend returns a first-response time or a time-to-resolution figure on these endpoints, so no response-time metric is shown anywhere in this workspace. Ticket age, measured from the real createdAt timestamps, is the closest honest substitute.",
  };
}

/* ── GhrFix ─────────────────────────────────────────────────────────── */

function deriveGhrfix(ghr: RawState["ghr"], label: string): Derived {
  const summary = ghr?.summary ?? null;
  const disputesPage = ghr?.tickets?.disputes ?? null;
  const messagesPage = ghr?.tickets?.messages ?? null;

  const disputes: SupportTicket[] = (disputesPage?.items ?? []).map((d, i) => {
    const status = (d.status ?? "UNKNOWN").toUpperCase();
    const group = groupOf(status);
    const createdAt = d.createdAt ?? null;
    const age = ageInDays(createdAt);
    return {
      id: d.id ?? `dispute-${i}`,
      title: d.booking?.bookingNumber ? `Dispute on #${d.booking.bookingNumber}` : d.category?.trim() || "Booking dispute",
      kind: "Booking dispute",
      status,
      statusGroup: group,
      detail: d.description?.trim() || d.resolutionNote?.trim() || null,
      raisedBy: d.raisedBy?.name?.trim() || d.raisedBy?.email?.trim() || d.raisedBy?.phone?.trim() || "Unnamed customer",
      category: d.category?.trim() || "Uncategorised",
      severity: null, // GhrFix disputes carry no severity field at all.
      createdAt,
      ageDays: age,
      resolvedAt: null, // /tickets returns no closure timestamp.
      escalated: (group === "open" || group === "investigating") && (status === "INVESTIGATING" || (age !== null && age >= 3)),
    };
  });

  const messages: SupportTicket[] = (messagesPage?.items ?? []).map((m, i) => {
    const status = (m.status ?? "UNKNOWN").toUpperCase();
    const group = groupOf(status);
    const createdAt = m.createdAt ?? null;
    const age = ageInDays(createdAt);
    return {
      id: m.id ?? `message-${i}`,
      title: m.subject?.trim() || "Contact form message",
      kind: "Contact message",
      status,
      statusGroup: group,
      detail: m.message?.trim() || null,
      raisedBy: m.name?.trim() || m.email?.trim() || "Anonymous sender",
      category: m.subject?.trim() || "No subject",
      severity: null,
      createdAt,
      ageDays: age,
      resolvedAt: null,
      escalated: (group === "open" || group === "investigating") && age !== null && age >= 3,
    };
  });

  const all = [...disputes, ...messages];
  const shared = common(all, {
    unit: "ticket",
    sourceNote: "GhrFix's /ai-agents/support/tickets queue.",
    escalationRule:
      "GhrFix records no severity scale, so a row counts as escalated when it is still unresolved AND either sits in INVESTIGATING or has been open for 3 days or more — both read from real fields, never guessed.",
  });

  const disputeTotal = num(disputesPage?.total);
  const messageTotal = num(messagesPage?.total);
  const resolvedLoaded = all.filter((t) => t.statusGroup === "resolved").length;
  const rejectedLoaded = all.filter((t) => t.statusGroup === "rejected").length;
  const closedLoaded = resolvedLoaded + rejectedLoaded;
  const loadedBase = all.length || null;

  const summaryMissing = `${label} returned /support/summary unsuccessfully this session, so this counter is unavailable.`;

  const metrics: SupportMetric[] = [
    {
      key: "open-disputes",
      label: "Open Disputes",
      value: num(summary?.openDisputes),
      kind: "count",
      note: summary ? "summary.openDisputes — the backend's own live counter." : summaryMissing,
      tone: "red",
      icon: "alert",
    },
    {
      key: "investigating",
      label: "Investigating",
      value: num(summary?.investigatingDisputes),
      kind: "count",
      note: summary ? "summary.investigatingDisputes — disputes actively being worked." : summaryMissing,
      tone: "amber",
      icon: "clock",
    },
    {
      key: "unresolved-messages",
      label: "Unresolved Messages",
      value: num(summary?.unresolvedMessages),
      kind: "count",
      note: summary ? "summary.unresolvedMessages — contact-form messages still open." : summaryMissing,
      tone: "blue",
      icon: "chat",
    },
    {
      key: "new-messages",
      label: "New Messages",
      value: num(summary?.newMessages),
      kind: "count",
      note: summary ? "summary.newMessages — never opened by an admin." : summaryMissing,
      tone: "cyan",
      icon: "bell",
    },
    {
      key: "disputes-total",
      label: "Disputes On File",
      value: disputeTotal,
      kind: "count",
      note: "disputes.total from /tickets — the whole dispute table, not just this page.",
      tone: "purple",
      icon: "posts",
    },
    {
      key: "messages-total",
      label: "Messages On File",
      value: messageTotal,
      kind: "count",
      note: "messages.total from /tickets — the whole contact-message table.",
      tone: "green",
      icon: "posts",
    },
  ];

  const rates: SupportRate[] = [
    { label: "Closed rate (loaded rows)", value: share(closedLoaded, loadedBase), note: "Resolved or rejected ÷ every row loaded from /tickets." },
    { label: "Resolved rate (loaded rows)", value: share(resolvedLoaded, loadedBase), note: "RESOLVED only — rejected rows excluded." },
    { label: "Rejected share", value: share(rejectedLoaded, loadedBase), note: "Disputes closed as REJECTED, over all loaded rows." },
    { label: "Disputes as share of queue", value: share(disputes.length, loadedBase), note: "Booking disputes vs contact messages across the loaded page." },
    { label: "Escalated share", value: share(shared.escalations.length, loadedBase), note: "Rows meeting the escalation rule, over all loaded rows." },
    { label: "First-response time", value: null, note: `${label} exposes no response-time field on these endpoints.` },
  ];

  const dimensions: SupportDimension[] = [
    makeDimension("status", "Tickets by status", "tickets", "The raw status string on every loaded row.", tally(all, (t) => t.status)),
    makeDimension("kind", "Disputes vs contact messages", "tickets", "The two channels /tickets returns, side by side.", tally(all, (t) => t.kind)),
    makeDimension(
      "lifecycle",
      "Open vs closed",
      "tickets",
      "Every status mapped onto its lifecycle bucket.",
      toDim([
        { label: "Open", value: all.filter((t) => t.statusGroup === "open").length },
        { label: "Investigating", value: all.filter((t) => t.statusGroup === "investigating").length },
        { label: "Resolved", value: resolvedLoaded },
        { label: "Rejected", value: rejectedLoaded },
      ]),
    ),
    makeDimension("category", "Disputes by category", "disputes", "The dispute.category field, counted.", tally(disputes, (t) => t.category)),
    makeDimension("subject", "Messages by subject", "messages", "The contact-message subject line, counted.", tally(messages, (t) => t.category)),
  ].filter((d) => d.rows.length > 0);

  const onFile = disputeTotal === null && messageTotal === null ? null : (disputeTotal ?? 0) + (messageTotal ?? 0);

  return {
    domain: "Booking disputes and contact-form messages",
    sourceNote: "GhrFix — GET /ai-agents/support/summary and GET /ai-agents/support/tickets.",
    coverageNote:
      onFile === null
        ? `Loaded one page of up to ${GHR_PAGE_SIZE} rows per channel from /tickets; the backend returned no totals to compare against.`
        : `Loaded ${all.length.toLocaleString()} rows (page size ${GHR_PAGE_SIZE} per channel) out of ${onFile.toLocaleString()} on file. Every chart describes the loaded rows unless it names a /summary counter.`,
    metrics,
    rates,
    dimensions,
    resolutionRate: {
      label: "Resolution rate",
      value: share(closedLoaded, loadedBase),
      max: 100,
      note: "Resolved or rejected, as a share of every row loaded from /tickets.",
    },
    ...shared,
  };
}

/* ── ShadiLife ──────────────────────────────────────────────────────── */

function deriveShadilife(reports: ShadiReport[] | null, label: string): Derived {
  const rows = reports ?? [];

  const tickets: SupportTicket[] = rows.map((r, i) => {
    const status = (r.status ?? "UNKNOWN").toUpperCase();
    const group = groupOf(status);
    const severity = r.severity?.trim().toUpperCase() || null;
    const createdAt = r.createdAt ?? null;
    const age = ageInDays(createdAt);
    return {
      id: r.id ?? `report-${i}`,
      title: r.reason?.trim() || "Member report",
      kind: "Member report",
      status,
      statusGroup: group,
      detail: r.description?.trim() || null,
      raisedBy: r.reporter?.profile?.fullName?.trim() || r.reporter?.email?.trim() || "Unnamed member",
      category: r.reason?.trim() || "Unspecified reason",
      severity,
      createdAt,
      ageDays: age,
      resolvedAt: r.resolvedAt ?? null,
      escalated:
        (group === "open" || group === "investigating") &&
        (severityWeight(severity) >= 3 || status === "INVESTIGATING" || (age !== null && age >= 3)),
    };
  });

  const shared = common(tickets, {
    unit: "report",
    sourceNote: "ShadiLife's /admin/reports queue.",
    escalationRule:
      "ShadiLife records a real severity scale, so a row counts as escalated when it is still unresolved AND is HIGH or CRITICAL severity, sits in INVESTIGATING, or has been open for 3 days or more.",
  });

  const open = tickets.filter((t) => t.statusGroup === "open").length;
  const investigating = tickets.filter((t) => t.statusGroup === "investigating").length;
  const resolved = tickets.filter((t) => t.statusGroup === "resolved").length;
  const rejected = tickets.filter((t) => t.statusGroup === "rejected").length;
  const withSeverity = tickets.filter((t) => t.severity !== null).length;
  const critical = tickets.filter((t) => severityWeight(t.severity) >= 3).length;
  const base = tickets.length || null;

  const metrics: SupportMetric[] = [
    { key: "open", label: "Open Reports", value: open, kind: "count", note: "Rows sitting at OPEN in /admin/reports.", tone: "red", icon: "alert" },
    { key: "investigating", label: "Investigating", value: investigating, kind: "count", note: "Rows actively being worked by an admin.", tone: "amber", icon: "clock" },
    { key: "resolved", label: "Resolved", value: resolved, kind: "count", note: "Rows closed as RESOLVED.", tone: "green", icon: "check" },
    { key: "total", label: "Total On File", value: tickets.length, kind: "count", note: "Every row /admin/reports returned — this endpoint is not paginated.", tone: "purple", icon: "posts" },
    {
      key: "critical",
      label: "High / Critical",
      value: withSeverity > 0 ? critical : null,
      kind: "count",
      note: withSeverity > 0 ? "Rows at HIGH or CRITICAL severity." : `${label} returned no severity value on any loaded row.`,
      tone: "cyan",
      icon: "target",
    },
    {
      key: "escalated",
      label: "Escalated",
      value: shared.escalations.length,
      kind: "count",
      note: "Unresolved rows meeting the escalation rule shown on the Escalations page.",
      tone: "blue",
      icon: "trend",
    },
  ];

  const resolvedWithTimestamp = tickets.filter((t) => t.resolvedAt !== null).length;

  const rates: SupportRate[] = [
    { label: "Resolution rate", value: share(resolved, base), note: "RESOLVED ÷ every row in the queue." },
    { label: "Still open", value: share(open, base), note: "OPEN ÷ every row in the queue." },
    { label: "In investigation", value: share(investigating, base), note: "INVESTIGATING ÷ every row in the queue." },
    {
      label: "High / critical share",
      value: withSeverity > 0 ? share(critical, base) : null,
      note: withSeverity > 0 ? "HIGH or CRITICAL ÷ every row." : `${label} returned no severity values to compute this from.`,
    },
    {
      label: "Closed rows carrying a resolvedAt",
      value: share(resolvedWithTimestamp, resolved || null),
      note: "How many closed rows record when they were closed — the only closure timestamp available.",
    },
    { label: "First-response time", value: null, note: `${label} exposes no response-time field on /admin/reports.` },
  ];

  const dimensions: SupportDimension[] = [
    makeDimension("status", "Reports by status", "reports", "The raw status string on every row.", tally(tickets, (t) => t.status)),
    makeDimension(
      "severity",
      "Reports by severity",
      "reports",
      "The severity field — ShadiLife is the only one of the two platforms that records one.",
      tally(tickets, (t) => t.severity),
    ),
    makeDimension("reason", "Reports by reason", "reports", "The reason field, counted — the closest thing to a ticket category.", tally(tickets, (t) => t.category)),
    makeDimension(
      "lifecycle",
      "Open vs closed",
      "reports",
      "Every status mapped onto its lifecycle bucket.",
      toDim([
        { label: "Open", value: open },
        { label: "Investigating", value: investigating },
        { label: "Resolved", value: resolved },
        { label: "Rejected", value: rejected },
      ]),
    ),
  ].filter((d) => d.rows.length > 0);

  return {
    domain: "Member reports, disputes and escalations",
    sourceNote: "ShadiLife — GET /admin/reports (there is no per-agent tickets route on this platform).",
    coverageNote: `/admin/reports returns the whole queue in one unpaginated response — ${tickets.length.toLocaleString()} rows this session, so every chart describes the complete queue.`,
    metrics,
    rates,
    dimensions,
    resolutionRate: {
      label: "Resolution rate",
      value: share(resolved, base),
      max: 100,
      note: "Reports closed as RESOLVED, as a share of the whole queue.",
    },
    ...shared,
  };
}
