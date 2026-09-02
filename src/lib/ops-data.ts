"use client";

/**
 * Ops Agent — one normalized operational snapshot across two very different
 * backends.
 *
 * Real endpoints, all discovered from the existing agent views (never guessed):
 *
 *   GhrFix   GET /ai-agents/ops/summary
 *              → { providerStats, bookingStats, openEmergencies }
 *            GET /ai-agents/ops/queue?pageSize=…
 *              → { pendingProviders[], openEmergencies[], …Total/…Page/…TotalPages }
 *            (src/components/agents/views/ghrfix/ops.tsx,
 *             src/components/agents/views/domain/ghrfix/ops.tsx)
 *
 *   ShadiLife GET /ai-agents/ops/schedule-health
 *              → AgentSchedule[]  — the real scheduled-job table, loads free
 *             GET /ai-agents/ops/health-summary
 *              → { summary, server, security } — costs one AI call, so it is
 *                NEVER auto-fired; the pages expose it behind an explicit
 *                button via `runHealthCheck()`
 *             (src/components/agents/views/shadilife/ops.tsx,
 *              src/components/agents/views/domain/shadilife/ops.tsx)
 *             GET /ai-agents/verification/summary
 *             GET /ai-agents/verification/pending
 *              → ShadiLife's real verification queue. It belongs to the
 *                Verification Agent, not Ops — every page that shows it says
 *                so, because ShadiLife's Ops Agent has no verification queue
 *                of its own.
 *
 * The two shapes have almost nothing in common, so everything collapses into
 * one `OpsItem` backlog plus derived aggregates. Where a platform genuinely
 * does not have a concept (ShadiLife has no "emergency"), the flag says so
 * and the note names the platform — a zero would read as a measurement.
 *
 * WRITES — GhrFix only, both real and audited on the backend:
 *   POST /ai-agents/ops/providers/:id/verify     — verifyProvider()
 *   POST /ai-agents/ops/emergencies/:id/status   — updateEmergencyStatus()
 * `applyStatusUpdate` lets a page patch the matching item's status locally
 * right after a successful write, so every derived stat/chart recomputes
 * without a refetch.
 *
 * ShadiLife has NO equivalent write on either its Ops Agent (confirmed by
 * reading ops-agent/router.ts — health-summary, schedule-health and ask only)
 * or its Verification Agent (confirmed by reading verification-agent/router.ts
 * — it only records an AI suggestion and a global require-human-verification
 * flag; the actual approve/reject decision is made by a human through the
 * plain /admin/moderation queue, which sits outside every AI agent). So
 * ShadiLife stays read-only here — verifyProvider/updateEmergencyStatus are
 * never called for it, and the pages say exactly why.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch, ApiError } from "./api";
import type { PlatformKey } from "./platforms";

/* ── Shared shapes ──────────────────────────────────────────────────── */

export type OpsKind = "verification" | "incident" | "job";
export type OpsTone = "purple" | "blue" | "green" | "amber" | "red" | "cyan";

export interface OpsItem {
  id: string;
  kind: OpsKind;
  /** Human word for the kind, e.g. "Verification". Used in tables and legends. */
  kindLabel: string;
  title: string;
  sub: string;
  category: string;
  /** Raw backend status string, uppercased. */
  status: string;
  statusLabel: string;
  tone: OpsTone;
  /** Kit icon name — status is never carried by color alone. */
  glyph: string;
  /** The timestamp the age column is measured from, or null when absent. */
  timestamp: string | null;
  /** What that timestamp means, e.g. "waiting since" / "last ran". */
  ageBasis: string;
  ageDays: number | null;
  ageBucket: string;
  /** true when `timestamp` is an arrival time and so can be bucketed into a series. */
  arrival: boolean;
  /** 0–3, higher is more urgent. Drives the incidents sort. */
  urgency: number;
}

export interface OpsSlice {
  label: string;
  value: number;
}

export interface OpsDist {
  key: string;
  title: string;
  unit: string;
  rows: OpsSlice[];
  total: number;
  note: string;
}

export interface OpsMetric {
  key: string;
  label: string;
  /** null means the platform genuinely does not report this — render "Not tracked". */
  value: number | null;
  display: string;
  note: string;
  tone: OpsTone;
  icon: string;
}

export interface OpsRate {
  label: string;
  value: number | null;
  max: number;
  suffix: string;
  note: string;
}

export interface OpsSeries {
  labels: string[];
  series: Array<{ name: string; data: number[] }>;
}

export interface OpsSource {
  label: string;
  path: string;
  ok: boolean;
  detail: string;
}

export interface OpsSecurity {
  eventCountLast24h: number | null;
  eventCountLast7d: number | null;
  eventCountLast30d: number | null;
  failedLoginCountLast30d: number | null;
  activeIpBlocks: number | null;
  bySeverity: OpsSlice[];
  byType: OpsSlice[];
  suspiciousIps: Array<{ ip: string; failedLogins: number }>;
}

export interface OpsSnapshot {
  platform: PlatformKey;
  loading: boolean;
  error: string | null;
  /** True only when at least one queue endpoint answered. Never infer health without it. */
  loaded: boolean;

  items: OpsItem[];
  verifications: OpsItem[];
  incidents: OpsItem[];
  jobs: OpsItem[];
  /** Every item, oldest first. Items with no timestamp sort last. */
  oldestFirst: OpsItem[];
  /** Every item, most urgent first. */
  byUrgency: OpsItem[];

  metrics: OpsMetric[];
  distributions: OpsDist[];
  rankings: OpsDist[];
  ageRows: OpsSlice[];
  verificationAgeRows: OpsSlice[];
  incidentAgeRows: OpsSlice[];
  kindRows: OpsSlice[];
  statusRows: OpsSlice[];

  clearedRate: OpsRate;
  rates: OpsRate[];

  series: OpsSeries | null;
  seriesNote: string;

  /** Whether this platform's ops agent has a verification queue / incident concept at all. */
  verificationsSupported: boolean;
  verificationsNote: string;
  incidentsSupported: boolean;
  incidentsNote: string;

  queueNote: string;
  sources: OpsSource[];

  /** ShadiLife only: the AI-costing health check, never auto-fired. */
  healthAvailable: boolean;
  healthNote: string;
  health: {
    ran: boolean;
    loading: boolean;
    error: string | null;
    summary: string | null;
    security: OpsSecurity | null;
  };
  runHealthCheck: () => void;

  /** Patch one item's status locally right after a real write succeeds (GhrFix only). */
  applyStatusUpdate: (id: string, patch: ItemStatusPatch) => void;
}

/* ── Small helpers ──────────────────────────────────────────────────── */

const asText = (v: unknown): string => (typeof v === "string" ? v : "");
const asNum = (v: unknown): number | null =>
  v === null || v === undefined || v === "" || Number.isNaN(Number(v)) ? null : Number(v);

const DAY_MS = 86_400_000;

function ageDaysFrom(iso: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / DAY_MS));
}

export const AGE_BUCKETS = ["Under 1 day", "1–3 days", "4–7 days", "8–30 days", "Over 30 days", "No timestamp"] as const;

function bucketFor(days: number | null): string {
  if (days === null) return "No timestamp";
  if (days < 1) return "Under 1 day";
  if (days <= 3) return "1–3 days";
  if (days <= 7) return "4–7 days";
  if (days <= 30) return "8–30 days";
  return "Over 30 days";
}

/** Buckets in fixed declared order, so a category keeps its colour across filters. */
function ageRowsOf(items: OpsItem[]): OpsSlice[] {
  return AGE_BUCKETS.map((label) => ({ label, value: items.filter((i) => i.ageBucket === label).length })).filter(
    (r) => r.value > 0,
  );
}

function countBy(items: OpsItem[], pick: (i: OpsItem) => string): OpsSlice[] {
  const map = new Map<string, number>();
  for (const i of items) {
    const key = pick(i).trim();
    if (!key) continue;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

/** 8 weekly buckets from real arrival timestamps. Not an endpoint series — the pages say so. */
function weeklySeries(items: OpsItem[]): OpsSeries | null {
  const arrivals = items.filter((i) => i.arrival && i.timestamp);
  if (arrivals.length === 0) return null;

  const weeks = 8;
  const now = Date.now();
  const labels: string[] = [];
  const starts: number[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = now - (i + 1) * 7 * DAY_MS;
    starts.push(start);
    labels.push(new Date(start + 7 * DAY_MS).toLocaleDateString(undefined, { month: "short", day: "numeric" }));
  }

  const kinds = [...new Set(arrivals.map((i) => i.kindLabel))];
  const series = kinds.map((name) => ({
    name,
    data: starts.map((start, idx) => {
      const end = idx === starts.length - 1 ? now + DAY_MS : starts[idx + 1];
      return arrivals.filter((i) => {
        if (i.kindLabel !== name) return false;
        const t = new Date(i.timestamp as string).getTime();
        return !Number.isNaN(t) && t >= start && t < end;
      }).length;
    }),
  }));

  // Every bucket empty means the returned rows are all older than the window.
  if (series.every((s) => s.data.every((v) => v === 0))) return null;
  return { labels, series };
}

function pct(part: number, whole: number): number | null {
  if (whole <= 0) return null;
  return Math.round((part / whole) * 100);
}

/* ── GhrFix raw shapes ──────────────────────────────────────────────── */

interface GhrProviderStats {
  total: number;
  verified: number;
  pending: number;
  rejected: number;
  suspended: number;
  available: number;
  avgRating: number;
}
interface GhrBookingStats {
  total: number;
  pending: number;
  active: number;
  completed: number;
  cancelled: number;
}
interface GhrSummary {
  providerStats?: GhrProviderStats;
  bookingStats?: GhrBookingStats;
  openEmergencies?: number;
}
interface GhrPendingProvider {
  id: string;
  verificationStatus?: string;
  rating?: number;
  isAvailable?: boolean;
  createdAt?: string;
  user?: { id?: string; name?: string | null; phone?: string | null; email?: string | null };
  services?: Array<{ category?: { name?: string } }>;
}
interface GhrEmergency {
  id: string;
  category?: string;
  description?: string | null;
  status?: string;
  createdAt?: string;
  resolvedAt?: string | null;
  user?: { id?: string; name?: string | null; phone?: string | null };
  assignedProvider?: { id?: string; user?: { name?: string | null; phone?: string | null } } | null;
}
interface GhrQueue {
  pendingProviders?: GhrPendingProvider[];
  pendingProvidersTotal?: number;
  openEmergencies?: GhrEmergency[];
  openEmergenciesTotal?: number;
}

/* ── ShadiLife raw shapes ───────────────────────────────────────────── */

interface SlSchedule {
  id: string;
  agentKey?: string;
  label?: string;
  cronExpression?: string;
  enabled?: boolean;
  lastRunAt?: string | null;
  lastRunError?: string | null;
}
interface SlVerificationSummary {
  pendingProfiles?: number;
  pendingDocuments?: number;
  approved30d?: number;
  rejected30d?: number;
  humanReviewed30d?: number;
  aiAutoApproved30d?: number;
  agreementRate?: number | null;
}
interface SlPendingVerification {
  userId?: string;
  fullName?: string | null;
  city?: string | null;
  submittedAt?: string | null;
}
interface SlHealthSummary {
  summary?: string;
  security?: {
    eventCountLast24h?: number;
    eventCountLast7d?: number;
    eventCountLast30d?: number;
    failedLoginCountLast30d?: number;
    eventsBySeverityLast30d?: Record<string, number>;
    eventTypeCountsLast30d?: Record<string, number>;
    suspiciousIps?: Array<{ ipAddress?: string; failedLoginCount?: number }>;
    activeIpBlocks?: number;
  };
}

/* ── Normalizers ────────────────────────────────────────────────────── */

const EMERGENCY_TONE: Record<string, OpsTone> = { OPEN: "red", ASSIGNED: "amber", RESOLVED: "green", CANCELLED: "cyan" };
const EMERGENCY_GLYPH: Record<string, string> = { OPEN: "alert", ASSIGNED: "clock", RESOLVED: "check", CANCELLED: "eye" };
const EMERGENCY_URGENCY: Record<string, number> = { OPEN: 3, ASSIGNED: 2, RESOLVED: 0, CANCELLED: 0 };

/* ── Real writes — GhrFix only (see the file banner above) ───────────── */

export type ItemStatusPatch = Pick<OpsItem, "status" | "statusLabel" | "tone" | "glyph" | "urgency">;

/** What a pending-provider row should look like right after a real decision. */
export function verificationPatchFor(status: "VERIFIED" | "REJECTED"): ItemStatusPatch {
  return {
    status,
    statusLabel: status.charAt(0) + status.slice(1).toLowerCase(),
    tone: status === "VERIFIED" ? "green" : "red",
    glyph: status === "VERIFIED" ? "check" : "alert",
    urgency: 0,
  };
}

/** What an emergency row should look like right after a real status change. */
export function emergencyPatchFor(status: "OPEN" | "ASSIGNED" | "RESOLVED" | "CANCELLED"): ItemStatusPatch {
  return {
    status,
    statusLabel: status.charAt(0) + status.slice(1).toLowerCase(),
    tone: EMERGENCY_TONE[status] ?? "amber",
    glyph: EMERGENCY_GLYPH[status] ?? "alert",
    urgency: EMERGENCY_URGENCY[status] ?? 2,
  };
}

/**
 * Real, audited write: POST /ai-agents/ops/providers/:id/verify.
 * GhrFix only — see the file banner for why ShadiLife has no equivalent.
 * `note` lands in the audit log (verifyProviderSchema caps it at 300 chars);
 * it is never shown to the provider.
 */
export async function verifyProvider(providerId: string, status: "VERIFIED" | "REJECTED", note?: string): Promise<void> {
  const body: Record<string, unknown> = { status };
  if (note && note.trim()) body.note = note.trim().slice(0, 300);
  await apiFetch("ghrfix", `/ai-agents/ops/providers/${providerId}/verify`, { method: "POST", body });
}

/**
 * Real, audited write: POST /ai-agents/ops/emergencies/:id/status.
 * GhrFix only — ShadiLife has no emergency concept at all. Re-assigning a
 * provider (POST .../emergencies/:id/assign) is a separate real endpoint on
 * the same agent, deliberately left out of this workspace's scope.
 */
export async function updateEmergencyStatus(emergencyId: string, status: "OPEN" | "ASSIGNED" | "RESOLVED" | "CANCELLED"): Promise<void> {
  await apiFetch("ghrfix", `/ai-agents/ops/emergencies/${emergencyId}/status`, { method: "POST", body: { status } });
}

function providerItem(p: GhrPendingProvider, idx: number): OpsItem {
  const created = asText(p.createdAt) || null;
  const days = ageDaysFrom(created);
  const status = (asText(p.verificationStatus) || "PENDING").toUpperCase();
  const services = (p.services ?? []).map((s) => asText(s.category?.name)).filter(Boolean);
  return {
    id: asText(p.id) || `provider-${idx}`,
    kind: "verification",
    kindLabel: "Verification",
    title: asText(p.user?.name) || "Unnamed provider",
    sub: asText(p.user?.phone) || asText(p.user?.email) || "No contact on record",
    category: services[0] || "No service listed",
    status,
    statusLabel: status.charAt(0) + status.slice(1).toLowerCase(),
    tone: status === "VERIFIED" ? "green" : status === "REJECTED" ? "red" : status === "SUSPENDED" ? "cyan" : "amber",
    glyph: status === "VERIFIED" ? "check" : status === "REJECTED" ? "alert" : "clock",
    timestamp: created,
    ageBasis: "waiting since",
    ageDays: days,
    ageBucket: bucketFor(days),
    arrival: true,
    urgency: status === "PENDING" ? (days !== null && days > 7 ? 3 : days !== null && days > 3 ? 2 : 1) : 0,
  };
}

function emergencyItem(e: GhrEmergency, idx: number): OpsItem {
  const created = asText(e.createdAt) || null;
  const days = ageDaysFrom(created);
  const status = (asText(e.status) || "OPEN").toUpperCase();
  return {
    id: asText(e.id) || `emergency-${idx}`,
    kind: "incident",
    kindLabel: "Emergency",
    title: asText(e.category) || "Uncategorised emergency",
    sub: asText(e.description) || asText(e.user?.name) || "No description recorded",
    category: asText(e.category) || "Uncategorised",
    status,
    statusLabel: status.charAt(0) + status.slice(1).toLowerCase(),
    tone: EMERGENCY_TONE[status] ?? "amber",
    glyph: EMERGENCY_GLYPH[status] ?? "alert",
    timestamp: created,
    ageBasis: "open since",
    ageDays: days,
    ageBucket: bucketFor(days),
    arrival: true,
    urgency: EMERGENCY_URGENCY[status] ?? 2,
  };
}

function scheduleItem(s: SlSchedule, idx: number): OpsItem {
  const last = asText(s.lastRunAt) || null;
  const days = ageDaysFrom(last);
  const failing = Boolean(asText(s.lastRunError));
  const enabled = s.enabled !== false;
  const status = failing ? "FAILING" : enabled ? "ENABLED" : "PAUSED";
  return {
    id: asText(s.id) || `schedule-${idx}`,
    kind: "job",
    kindLabel: "Scheduled job",
    title: asText(s.label) || asText(s.agentKey) || "Unnamed job",
    sub: failing ? asText(s.lastRunError) : asText(s.cronExpression) || "No cron expression recorded",
    category: asText(s.agentKey) || "Unassigned agent",
    status,
    statusLabel: failing ? "Failing" : enabled ? "Enabled" : "Paused",
    tone: failing ? "red" : enabled ? "green" : "amber",
    glyph: failing ? "alert" : enabled ? "check" : "clock",
    timestamp: last,
    ageBasis: "last ran",
    ageDays: days,
    ageBucket: bucketFor(days),
    // A last-run time is not an arrival, so these never feed the arrival series.
    arrival: false,
    urgency: failing ? 3 : enabled ? 0 : 2,
  };
}

function pendingVerificationItem(p: SlPendingVerification, idx: number): OpsItem {
  const submitted = asText(p.submittedAt) || null;
  const days = ageDaysFrom(submitted);
  return {
    id: asText(p.userId) || `verification-${idx}`,
    kind: "verification",
    kindLabel: "Verification",
    title: asText(p.fullName) || "Unnamed member",
    sub: asText(p.city) ? `${asText(p.city)}` : "No city on record",
    category: asText(p.city) || "No city recorded",
    status: "UNDER_REVIEW",
    statusLabel: "Under review",
    tone: "amber",
    glyph: "clock",
    timestamp: submitted,
    ageBasis: "waiting since",
    ageDays: days,
    ageBucket: bucketFor(days),
    arrival: true,
    urgency: days !== null && days > 7 ? 3 : days !== null && days > 3 ? 2 : 1,
  };
}

function normalizeSecurity(raw: SlHealthSummary["security"]): OpsSecurity {
  return {
    eventCountLast24h: asNum(raw?.eventCountLast24h),
    eventCountLast7d: asNum(raw?.eventCountLast7d),
    eventCountLast30d: asNum(raw?.eventCountLast30d),
    failedLoginCountLast30d: asNum(raw?.failedLoginCountLast30d),
    activeIpBlocks: asNum(raw?.activeIpBlocks),
    bySeverity: Object.entries(raw?.eventsBySeverityLast30d ?? {}).map(([label, value]) => ({ label, value: Number(value) || 0 })),
    byType: Object.entries(raw?.eventTypeCountsLast30d ?? {})
      .map(([label, value]) => ({ label, value: Number(value) || 0 }))
      .sort((a, b) => b.value - a.value),
    suspiciousIps: (raw?.suspiciousIps ?? []).map((ip) => ({
      ip: asText(ip.ipAddress) || "Unknown IP",
      failedLogins: Number(ip.failedLoginCount) || 0,
    })),
  };
}

/* ── Loaded state carried between fetch and derivation ──────────────── */

interface RawState {
  items: OpsItem[];
  ghrSummary: GhrSummary | null;
  ghrQueueTotals: { verifications: number | null; emergencies: number | null };
  slVerification: SlVerificationSummary | null;
  sources: OpsSource[];
  loaded: boolean;
}

const EMPTY_RAW: RawState = {
  items: [],
  ghrSummary: null,
  ghrQueueTotals: { verifications: null, emergencies: null },
  slVerification: null,
  sources: [],
  loaded: false,
};

const errText = (e: unknown): string => (e instanceof ApiError ? e.message : "Could not reach the backend.");

/* ── The hook ───────────────────────────────────────────────────────── */

export function useOpsSnapshot(platform: PlatformKey): OpsSnapshot {
  const [raw, setRaw] = useState<RawState>(EMPTY_RAW);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [healthRan, setHealthRan] = useState(false);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [healthSummary, setHealthSummary] = useState<string | null>(null);
  const [healthSecurity, setHealthSecurity] = useState<OpsSecurity | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRaw(EMPTY_RAW);
    setLoading(true);
    setError(null);
    setHealthRan(false);
    setHealthError(null);
    setHealthSummary(null);
    setHealthSecurity(null);

    async function loadGhrfix(): Promise<RawState> {
      const [summaryRes, queueRes] = await Promise.allSettled([
        apiFetch<GhrSummary>("ghrfix", "/ai-agents/ops/summary"),
        apiFetch<GhrQueue>("ghrfix", "/ai-agents/ops/queue", { query: { pageSize: 100 } }),
      ]);

      if (summaryRes.status === "rejected" && queueRes.status === "rejected") throw summaryRes.reason;

      const summary = summaryRes.status === "fulfilled" ? summaryRes.value.data ?? null : null;
      const queue = queueRes.status === "fulfilled" ? queueRes.value.data ?? null : null;

      const items = [
        ...(queue?.pendingProviders ?? []).map(providerItem),
        ...(queue?.openEmergencies ?? []).map(emergencyItem),
      ];

      return {
        items,
        ghrSummary: summary,
        ghrQueueTotals: {
          verifications: asNum(queue?.pendingProvidersTotal),
          emergencies: asNum(queue?.openEmergenciesTotal),
        },
        slVerification: null,
        loaded: true,
        sources: [
          {
            label: "Ops summary",
            path: "/ai-agents/ops/summary",
            ok: summaryRes.status === "fulfilled",
            detail: summaryRes.status === "fulfilled" ? "Provider, booking and emergency counters" : errText(summaryRes.reason),
          },
          {
            label: "Ops queue",
            path: "/ai-agents/ops/queue",
            ok: queueRes.status === "fulfilled",
            detail: queueRes.status === "fulfilled" ? `${items.length} rows returned` : errText(queueRes.reason),
          },
        ],
      };
    }

    async function loadShadilife(): Promise<RawState> {
      const [scheduleRes, verSummaryRes, verPendingRes] = await Promise.allSettled([
        apiFetch<SlSchedule[]>("shadilife", "/ai-agents/ops/schedule-health"),
        apiFetch<SlVerificationSummary>("shadilife", "/ai-agents/verification/summary"),
        apiFetch<SlPendingVerification[]>("shadilife", "/ai-agents/verification/pending"),
      ]);

      if (scheduleRes.status === "rejected" && verPendingRes.status === "rejected") throw scheduleRes.reason;

      const schedules = scheduleRes.status === "fulfilled" && Array.isArray(scheduleRes.value.data) ? scheduleRes.value.data : [];
      const pending = verPendingRes.status === "fulfilled" && Array.isArray(verPendingRes.value.data) ? verPendingRes.value.data : [];

      return {
        items: [...schedules.map(scheduleItem), ...pending.map(pendingVerificationItem)],
        ghrSummary: null,
        ghrQueueTotals: { verifications: null, emergencies: null },
        slVerification: verSummaryRes.status === "fulfilled" ? verSummaryRes.value.data ?? null : null,
        loaded: true,
        sources: [
          {
            label: "Schedule health",
            path: "/ai-agents/ops/schedule-health",
            ok: scheduleRes.status === "fulfilled",
            detail: scheduleRes.status === "fulfilled" ? `${schedules.length} scheduled jobs` : errText(scheduleRes.reason),
          },
          {
            label: "Verification queue",
            path: "/ai-agents/verification/pending",
            ok: verPendingRes.status === "fulfilled",
            detail: verPendingRes.status === "fulfilled" ? `${pending.length} members under review` : errText(verPendingRes.reason),
          },
          {
            label: "Verification summary",
            path: "/ai-agents/verification/summary",
            ok: verSummaryRes.status === "fulfilled",
            detail: verSummaryRes.status === "fulfilled" ? "30-day approve/reject counters" : errText(verSummaryRes.reason),
          },
        ],
      };
    }

    (platform === "ghrfix" ? loadGhrfix() : loadShadilife())
      .then((next) => {
        if (!cancelled) setRaw(next);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(errText(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [platform]);

  /**
   * Patches one item's status fields in `raw.items` right after a real write
   * succeeds — no refetch. Every derived list/stat/chart is recomputed from
   * `raw` on the next render, so this one patch is enough to update the whole
   * page (the item leaving PENDING, the counters, the status donuts, all of
   * it) consistently.
   */
  const applyStatusUpdate = useCallback((id: string, patch: ItemStatusPatch) => {
    setRaw((prev) => ({ ...prev, items: prev.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));
  }, []);

  /* The AI-costing health check — explicitly triggered, never on mount. */
  const runHealthCheck = useCallback(() => {
    if (platform !== "shadilife") return;
    setHealthLoading(true);
    setHealthError(null);
    apiFetch<SlHealthSummary>("shadilife", "/ai-agents/ops/health-summary")
      .then(({ data }) => {
        setHealthRan(true);
        setHealthSummary(asText(data?.summary) || null);
        setHealthSecurity(normalizeSecurity(data?.security));
      })
      .catch((err: unknown) => setHealthError(errText(err)))
      .finally(() => setHealthLoading(false));
  }, [platform]);

  return useMemo<OpsSnapshot>(() => {
    const items = raw.items;
    const verifications = items.filter((i) => i.kind === "verification");
    const incidents = items.filter((i) => i.kind === "incident");
    const jobs = items.filter((i) => i.kind === "job");

    const oldestFirst = [...items].sort((a, b) => {
      if (a.ageDays === null && b.ageDays === null) return 0;
      if (a.ageDays === null) return 1;
      if (b.ageDays === null) return -1;
      return b.ageDays - a.ageDays;
    });
    const byUrgency = [...items].sort((a, b) => b.urgency - a.urgency || (b.ageDays ?? -1) - (a.ageDays ?? -1));

    const p = raw.ghrSummary?.providerStats;
    const b = raw.ghrSummary?.bookingStats;
    const v = raw.slVerification;

    const metrics: OpsMetric[] =
      platform === "ghrfix"
        ? [
            mk("pending", "Pending verifications", p ? p.pending : null, "Providers awaiting a decision", "amber", "clock"),
            mk("emergencies", "Open emergencies", asNum(raw.ghrSummary?.openEmergencies), "Reported and not yet resolved", "red", "alert"),
            mk("verified", "Verified providers", p ? p.verified : null, "Cleared verification", "green", "check"),
            mk("available", "Available right now", p ? p.available : null, p ? `of ${p.verified.toLocaleString()} verified` : "", "blue", "users"),
            mk("activeBookings", "Active bookings", b ? b.active : null, "Currently in progress", "purple", "trend"),
            mk("rating", "Avg provider rating", p && p.avgRating > 0 ? p.avgRating : null, "Out of 5, across all providers", "cyan", "target"),
          ]
        : [
            mk("jobs", "Scheduled jobs", raw.loaded ? jobs.length : null, "Rows in the AgentSchedule table", "purple", "calendar"),
            mk("enabled", "Enabled jobs", raw.loaded ? jobs.filter((j) => j.status === "ENABLED").length : null, "Running on their cron", "green", "check"),
            mk("failing", "Failing last run", raw.loaded ? jobs.filter((j) => j.status === "FAILING").length : null, "Recorded an error on their last run", "red", "alert"),
            mk("paused", "Paused jobs", raw.loaded ? jobs.filter((j) => j.status === "PAUSED").length : null, "Disabled, not scheduled", "amber", "clock"),
            mk(
              "pendingVerifications",
              "Members under review",
              raw.loaded ? verifications.length : null,
              "From the Verification Agent's queue",
              "blue",
              "users",
            ),
            mk("approved30d", "Approved (30 days)", v ? asNum(v.approved30d) : null, "Verification decisions in the last 30 days", "cyan", "trend"),
          ];

    const kindRows = countBy(items, (i) => i.kindLabel);
    const statusRows = countBy(items, (i) => i.statusLabel);

    const distributions: OpsDist[] =
      platform === "ghrfix"
        ? [
            {
              key: "providerMix",
              title: "Provider verification mix",
              unit: "providers",
              rows: p
                ? [
                    { label: "Verified", value: p.verified },
                    { label: "Pending", value: p.pending },
                    { label: "Rejected", value: p.rejected },
                    { label: "Suspended", value: p.suspended },
                  ].filter((r) => r.value > 0)
                : [],
              total: p?.total ?? 0,
              note: p
                ? "Every provider on GhrFix by real verification status, from /ai-agents/ops/summary."
                : "GhrFix's ops summary did not load, so the provider mix cannot be assessed.",
            },
            {
              key: "bookingPipeline",
              title: "Booking pipeline",
              unit: "bookings",
              rows: b
                ? [
                    { label: "Pending", value: b.pending },
                    { label: "Active", value: b.active },
                    { label: "Completed", value: b.completed },
                    { label: "Cancelled", value: b.cancelled },
                  ].filter((r) => r.value > 0)
                : [],
              total: b?.total ?? 0,
              note: b
                ? "Real booking counts across every status the ops summary reports."
                : "GhrFix's ops summary did not load, so the booking pipeline cannot be assessed.",
            },
            {
              key: "queueMix",
              title: "Queue mix by item type",
              unit: "items",
              rows: kindRows,
              total: items.length,
              note: "The rows /ai-agents/ops/queue actually returned this session, split by type.",
            },
            {
              key: "emergencyStatus",
              title: "Emergencies by status",
              unit: "emergencies",
              rows: countBy(incidents, (i) => i.statusLabel),
              total: incidents.length,
              note: "Status of every emergency the queue returned — open work is not resolved work.",
            },
          ]
        : [
            {
              key: "jobState",
              title: "Scheduled jobs by state",
              unit: "jobs",
              rows: countBy(jobs, (i) => i.statusLabel),
              total: jobs.length,
              note: "Real AgentSchedule rows: failing means the last run recorded an error.",
            },
            {
              key: "verificationDecisions",
              title: "Verification decisions (30 days)",
              unit: "decisions",
              rows: v
                ? [
                    { label: "Approved", value: asNum(v.approved30d) ?? 0 },
                    { label: "Rejected", value: asNum(v.rejected30d) ?? 0 },
                  ].filter((r) => r.value > 0)
                : [],
              total: (asNum(v?.approved30d) ?? 0) + (asNum(v?.rejected30d) ?? 0),
              note: v
                ? "From the Verification Agent's 30-day summary — ShadiLife's Ops Agent reports no decision counters of its own."
                : "ShadiLife's verification summary did not load, so decision counts cannot be shown.",
            },
            {
              key: "queueMix",
              title: "Queue mix by item type",
              unit: "items",
              rows: kindRows,
              total: items.length,
              note: "Scheduled jobs plus members under review — the two real backlogs ShadiLife exposes.",
            },
            {
              key: "reviewMix",
              title: "Human vs AI review (30 days)",
              unit: "reviews",
              rows: v
                ? [
                    { label: "Human reviewed", value: asNum(v.humanReviewed30d) ?? 0 },
                    { label: "AI auto-approved", value: asNum(v.aiAutoApproved30d) ?? 0 },
                  ].filter((r) => r.value > 0)
                : [],
              total: (asNum(v?.humanReviewed30d) ?? 0) + (asNum(v?.aiAutoApproved30d) ?? 0),
              note: v
                ? "Who actually made each verification call over the last 30 days."
                : "ShadiLife's verification summary did not load, so the review split is unknown.",
            },
          ];

    const rankings: OpsDist[] =
      platform === "ghrfix"
        ? [
            {
              key: "emergencyCategories",
              title: "Emergency categories",
              unit: "emergencies",
              rows: countBy(incidents, (i) => i.category).slice(0, 7),
              total: incidents.length,
              note: "Ranked by how many open emergencies the queue returned per category.",
            },
            {
              key: "verificationServices",
              title: "Services awaiting verification",
              unit: "providers",
              rows: countBy(verifications, (i) => i.category).slice(0, 7),
              total: verifications.length,
              note: "The first service category listed on each waiting provider.",
            },
          ]
        : [
            {
              key: "jobsByAgent",
              title: "Scheduled jobs by owning agent",
              unit: "jobs",
              rows: countBy(jobs, (i) => i.category).slice(0, 7),
              total: jobs.length,
              note: "Which agent each real scheduled job belongs to.",
            },
            {
              key: "verificationCities",
              title: "Members under review by city",
              unit: "members",
              rows: countBy(verifications, (i) => i.category).slice(0, 7),
              total: verifications.length,
              note: "City recorded on each member currently waiting for a verification decision.",
            },
          ];

    const clearedRate: OpsRate =
      platform === "ghrfix"
        ? {
            label: "Providers cleared verification",
            value: p ? pct(p.verified, p.total) : null,
            max: 100,
            suffix: "%",
            note: p
              ? `${p.verified.toLocaleString()} of ${p.total.toLocaleString()} providers have been verified; ${p.pending.toLocaleString()} are still waiting.`
              : "GhrFix's ops summary did not load, so the cleared share cannot be computed.",
          }
        : {
            label: "Scheduled jobs running clean",
            value: raw.loaded ? pct(jobs.filter((j) => j.status === "ENABLED").length, jobs.length) : null,
            max: 100,
            suffix: "%",
            note: raw.loaded
              ? `${jobs.filter((j) => j.status === "ENABLED").length} of ${jobs.length} scheduled jobs are enabled with no error on their last run.`
              : "The schedule-health table did not load, so job health cannot be assessed.",
          };

    const rates: OpsRate[] =
      platform === "ghrfix"
        ? [
            clearedRate,
            {
              label: "Bookings completed",
              value: b ? pct(b.completed, b.total) : null,
              max: 100,
              suffix: "%",
              note: b ? `${b.completed.toLocaleString()} of ${b.total.toLocaleString()} bookings reached completion.` : "Ops summary unavailable.",
            },
            {
              label: "Verified providers available now",
              value: p ? pct(p.available, p.verified) : null,
              max: 100,
              suffix: "%",
              note: p ? `${p.available.toLocaleString()} of ${p.verified.toLocaleString()} verified providers are marked available.` : "Ops summary unavailable.",
            },
            {
              label: "Queue that is an emergency",
              value: raw.loaded ? pct(incidents.length, items.length) : null,
              max: 100,
              suffix: "%",
              note: raw.loaded
                ? `${incidents.length} of ${items.length} returned queue rows are emergencies rather than verifications.`
                : "The queue did not load.",
            },
          ]
        : [
            clearedRate,
            {
              label: "Jobs enabled",
              value: raw.loaded ? pct(jobs.filter((j) => j.status !== "PAUSED").length, jobs.length) : null,
              max: 100,
              suffix: "%",
              note: raw.loaded ? `${jobs.filter((j) => j.status !== "PAUSED").length} of ${jobs.length} jobs are not paused.` : "Schedule health unavailable.",
            },
            {
              label: "AI / human agreement",
              value: v && v.agreementRate != null ? Math.round(Number(v.agreementRate)) : null,
              max: 100,
              suffix: "%",
              note:
                v && v.agreementRate != null
                  ? "How often the AI verification suggestion matched the human decision over 30 days."
                  : "ShadiLife did not return an agreement rate in this snapshot.",
            },
            {
              label: "Approved share (30 days)",
              value: v ? pct(asNum(v.approved30d) ?? 0, (asNum(v.approved30d) ?? 0) + (asNum(v.rejected30d) ?? 0)) : null,
              max: 100,
              suffix: "%",
              note: v ? "Approvals as a share of all verification decisions in the last 30 days." : "Verification summary unavailable.",
            },
          ];

    const series = raw.loaded ? weeklySeries(items) : null;
    const seriesNote = !raw.loaded
      ? "Nothing loaded, so no trend can be drawn or assessed."
      : series
        ? "Neither backend returns a bucketed time series. This is derived from the real createdAt / submittedAt timestamps on the rows the queue returned — the last 8 weeks of arrivals only."
        : platform === "ghrfix"
          ? "No trend can be drawn: the returned queue rows carry no arrival timestamps inside the last 8 weeks, and GhrFix's ops agent exposes no time-series endpoint."
          : "No trend can be drawn: ShadiLife's schedule-health rows carry a last-run time rather than an arrival time, and its ops agent exposes no time-series endpoint.";

    return {
      platform,
      loading,
      error,
      loaded: raw.loaded,

      items,
      verifications,
      incidents,
      jobs,
      oldestFirst,
      byUrgency,

      metrics,
      distributions,
      rankings,
      ageRows: ageRowsOf(items),
      verificationAgeRows: ageRowsOf(verifications),
      incidentAgeRows: ageRowsOf(platform === "ghrfix" ? incidents : jobs.filter((j) => j.urgency > 0)),
      kindRows,
      statusRows,

      clearedRate,
      rates,

      series,
      seriesNote,

      verificationsSupported: true,
      verificationsNote:
        platform === "ghrfix"
          ? "GhrFix's Ops Agent owns provider verification directly — /ai-agents/ops/queue returns the pending providers below."
          : "ShadiLife's Ops Agent has no verification queue. The rows below come from the Verification Agent's own real endpoints (/ai-agents/verification/pending and /summary).",

      incidentsSupported: platform === "ghrfix",
      incidentsNote:
        platform === "ghrfix"
          ? "GhrFix models emergencies as first-class operational incidents, returned by /ai-agents/ops/queue with a real status and category."
          : "ShadiLife has no incident or emergency concept. Its Ops Agent exposes scheduled-job health and a security event snapshot instead, and both are shown here in place of incidents — no incident count is invented.",

      queueNote:
        platform === "ghrfix"
          ? "Pending provider verifications and open emergencies, from /ai-agents/ops/queue."
          : "Scheduled background jobs from /ai-agents/ops/schedule-health, plus members awaiting a verification decision.",
      sources: raw.sources,

      healthAvailable: platform === "shadilife",
      healthNote:
        platform === "shadilife"
          ? "ShadiLife's /ai-agents/ops/health-summary reads real server resources and the security event log, and spends one AI call doing it — so it only runs when you ask for it."
          : "GhrFix's Ops Agent exposes no server-health or security endpoint.",
      health: {
        ran: healthRan,
        loading: healthLoading,
        error: healthError,
        summary: healthSummary,
        security: healthSecurity,
      },
      runHealthCheck,
      applyStatusUpdate,
    };
  }, [platform, raw, loading, error, healthRan, healthLoading, healthError, healthSummary, healthSecurity, runHealthCheck, applyStatusUpdate]);
}

function mk(key: string, label: string, value: number | null, note: string, tone: OpsTone, icon: string): OpsMetric {
  return {
    key,
    label,
    value,
    display: value === null ? "Not tracked" : value.toLocaleString(),
    note,
    tone,
    icon,
  };
}

/** "3d waiting" / "Not recorded" — never a bare 0 for an unknown age. */
export function ageLabel(item: OpsItem): string {
  if (item.ageDays === null) return "Not recorded";
  if (item.ageDays === 0) return "Today";
  return `${item.ageDays}d`;
}
