"use client";

/**
 * Local helpers shared by the nine hand-built ShadiLife dashboards
 * (master, owner-chat, matchmaking, verification, moderation, fraud,
 * chat-safety, profile, support).
 *
 * Every formatter here renders `—` for anything missing and every derived
 * figure returns null when there is no real basis for it, so a card omits a
 * number rather than inventing one. Nothing in this file fabricates data.
 */

import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, apiFetch, type agentClient } from "@/lib/api";
import type { PlatformDef } from "@/lib/platforms";

export type Api = ReturnType<typeof agentClient>;

/* ══════════════════════════════════════════════════════════════════
   Platform-level calls
   ------------------------------------------------------------------
   `api` from the route is bound to one agent's own mount
   (/ai-agents/<key>). Several ShadiLife agents legitimately read from
   shared, real endpoints outside that mount — the AI-layer meta router
   (/ai-agents/_meta/*), the moderation queue the Verification and
   Moderation agents assist (/admin/moderation/*), the reports queue the
   Support and Moderation agents work (/admin/reports), and the owner
   dashboard aggregate (/admin/dashboard). These helpers call those, on
   the same platform, with the same auth.
   ══════════════════════════════════════════════════════════════════ */

type Query = Record<string, string | number | boolean | undefined | null>;

export function platGet<T>(platform: PlatformDef, path: string, query?: Query): Promise<T> {
  return apiFetch<T>(platform, path, { query }).then((r) => r.data);
}
export function platPost<T>(platform: PlatformDef, path: string, body?: unknown): Promise<T> {
  return apiFetch<T>(platform, path, { method: "POST", body }).then((r) => r.data);
}
export function platPut<T>(platform: PlatformDef, path: string, body?: unknown): Promise<T> {
  return apiFetch<T>(platform, path, { method: "PUT", body }).then((r) => r.data);
}

export function errText(e: unknown, fallback = "Request failed."): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return fallback;
}

/* ── async loading ─────────────────────────────────────────────────── */

export interface Loaded<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/** Runs `fn` on mount and whenever `reload()` is called. Never sets state after unmount. */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[] = []): Loaded<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    fnRef
      .current()
      .then((d) => {
        if (alive) setData(d);
      })
      .catch((e: unknown) => {
        if (alive) setError(errText(e));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...deps]);

  return { data, loading, error, reload: useCallback(() => setTick((t) => t + 1), []) };
}

/* ── formatting — missing never becomes zero ───────────────────────── */

export function dec(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export function num(v: unknown, fallback = "—"): string {
  const n = dec(v);
  return n === null ? fallback : n.toLocaleString();
}

export function usd(v: unknown, digits = 2, fallback = "—"): string {
  const n = dec(v);
  return n === null ? fallback : `$${n.toFixed(digits)}`;
}

export function pkr(v: unknown, fallback = "—"): string {
  const n = dec(v);
  return n === null ? fallback : `Rs ${n.toLocaleString()}`;
}

export function pct(v: unknown, digits = 1, fallback = "—"): string {
  const n = dec(v);
  return n === null ? fallback : `${Math.round(n * 10 ** digits) / 10 ** digits}%`;
}

export function shortDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function dateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const secs = Math.max(0, Math.round((Date.now() - d.getTime()) / 1000));
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

/** Turns "chat_safety.escalate" / "matchmaking-daily" into "Chat safety escalate". */
export function humanAction(action: string | null | undefined): string {
  if (!action) return "—";
  const s = action.replace(/[._-]+/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Percentage change between two real periods. Null when there is no prior basis. */
export function pctChange(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export function share(part: number | null | undefined, whole: number | null | undefined): number | null {
  if (!Number.isFinite(part ?? NaN) || !Number.isFinite(whole ?? NaN) || (whole as number) <= 0) return null;
  return Math.round(((part as number) / (whole as number)) * 1000) / 10;
}

/** Splits a real daily series in half and compares the two halves. */
export function halfOverHalf(values: number[]): number | null {
  if (values.length < 4) return null;
  const mid = Math.floor(values.length / 2);
  const prev = values.slice(0, mid).reduce((a, b) => a + b, 0);
  const cur = values.slice(mid).reduce((a, b) => a + b, 0);
  return pctChange(cur, prev);
}

/** Counts real records by a key — a grouping of live rows, never a guess. */
export function tally<T>(rows: T[] | null | undefined, key: (r: T) => string | null | undefined): Array<{ label: string; value: number }> {
  const map = new Map<string, number>();
  for (const r of rows ?? []) {
    const k = key(r);
    if (!k) continue;
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

/* ── layout primitives ─────────────────────────────────────────────── */

export function Panel({
  title,
  sub,
  actions,
  children,
  bodyStyle,
  noBody = false,
}: {
  title: ReactNode;
  sub?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  bodyStyle?: React.CSSProperties;
  /** Set for tables that supply their own padding. */
  noBody?: boolean;
}) {
  return (
    <div className="ag-panel">
      <div className="ag-panel-head">
        <div style={{ minWidth: 0 }}>
          <div className="ag-panel-title">{title}</div>
          {sub && <div className="ag-panel-sub">{sub}</div>}
        </div>
        {actions}
      </div>
      {noBody ? children : <div className="ag-panel-body" style={bodyStyle}>{children}</div>}
    </div>
  );
}

/** Every table on these pages is wrapped in this — it is what keeps 375px honest. */
export function TableWrap({ children }: { children: ReactNode }) {
  return <div style={{ overflowX: "auto" }}>{children}</div>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="ag-empty">{children}</div>;
}

export function KeyRow({ label, value, tone }: { label: ReactNode; value: ReactNode; tone?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
      <span style={{ fontSize: 11.5, color: "var(--ag-ink-soft)" }}>{label}</span>
      <strong className="ag-display" style={{ fontSize: 13, fontVariantNumeric: "tabular-nums", color: tone }}>{value}</strong>
    </div>
  );
}

export type Tone = "green" | "amber" | "red" | "mute";

export function Pill({ text, tone }: { text: ReactNode; tone: Tone }) {
  return <span className={`ag-badge ag-badge-${tone}`}>{text}</span>;
}

/** Maps the real enum strings ShadiLife returns onto badge tones. */
export function statusTone(status: string | null | undefined): Tone {
  switch ((status ?? "").toUpperCase()) {
    case "APPROVED":
    case "ACTIVE":
    case "RESOLVED":
    case "ACCEPTED":
    case "PAID":
      return "green";
    case "PENDING":
    case "UNDER_REVIEW":
    case "INVESTIGATING":
    case "MEDIUM":
    case "WARNING":
      return "amber";
    case "REJECTED":
    case "OPEN":
    case "HIGH":
    case "CRITICAL":
    case "SUSPENDED":
      return "red";
    default:
      return "mute";
  }
}

export function severityTone(sev: string | null | undefined): Tone {
  switch ((sev ?? "").toUpperCase()) {
    case "HIGH":
    case "CRITICAL":
      return "red";
    case "MEDIUM":
      return "amber";
    case "LOW":
      return "green";
    default:
      return "mute";
  }
}

/* ── error / empty states ──────────────────────────────────────────── */

export function ErrorNote({ platform, error, what }: { platform: PlatformDef; error: string; what?: string }) {
  return (
    <div className="ag-panel" style={{ marginBottom: 18 }}>
      <div className="ag-panel-body">
        <p style={{ margin: 0, fontSize: 12.5, color: "var(--ag-red)", fontWeight: 650 }}>
          {what ? `${what}: ` : ""}
          {error}
        </p>
        <p style={{ margin: "8px 0 0", fontSize: 11.5, color: "var(--ag-ink-faint)", lineHeight: 1.6 }}>
          Every figure on this page comes from {platform.label}&apos;s live API — nothing is cached or simulated, so it stays blank until
          the backend at <code>{platform.apiBase}</code> answers. Sign in on the Connect page once it is running.
        </p>
      </div>
    </div>
  );
}

/** Inline banner for a failed write action. */
export function ActionNote({ error, ok }: { error?: string | null; ok?: string | null }) {
  if (!error && !ok) return null;
  return (
    <p style={{ margin: "12px 0 0", fontSize: 11.5, fontWeight: 650, color: error ? "var(--ag-red)" : "var(--ag-green)" }}>
      {error ?? ok}
    </p>
  );
}

/* ══════════════════════════════════════════════════════════════════
   "Ask this agent" — ShadiLife's real shared endpoint.
   POST /api/ai-agents/ask { agentKey, agentLabel, question, context }
   → { reply }.  Every agent page shares it (see _shared/agent-ask-router).
   ══════════════════════════════════════════════════════════════════ */

export interface AskState {
  question: string | null;
  answer: string | null;
  asking: boolean;
  error: string | null;
  ask: (q: string) => void;
  clear: () => void;
}

export function useAsk(platform: PlatformDef, agentKey: string, agentLabel: string, context?: () => string | undefined): AskState {
  const [question, setQuestion] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ctxRef = useRef(context);
  ctxRef.current = context;

  const ask = useCallback(
    (q: string) => {
      setQuestion(q);
      setAnswer(null);
      setError(null);
      setAsking(true);
      platPost<{ reply?: string }>(platform, "/ai-agents/ask", {
        agentKey,
        agentLabel,
        question: q,
        context: ctxRef.current?.()?.slice(0, 4000),
      })
        .then((d) => setAnswer(d?.reply ?? ""))
        .catch((e: unknown) => setError(errText(e, "The agent could not answer that.")))
        .finally(() => setAsking(false));
    },
    [platform, agentKey, agentLabel],
  );

  return { question, answer, asking, error, ask, clear: () => setQuestion(null) };
}

export function AskAnswer({ state }: { state: AskState }) {
  if (!state.question) return null;
  return (
    <Panel
      title="Agent answer"
      sub={state.question}
      actions={
        <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" onClick={state.clear}>
          Dismiss
        </button>
      }
    >
      {state.asking && <span className="ag-typing"><i /><i /><i /></span>}
      {state.error && <p style={{ margin: 0, fontSize: 12, color: "var(--ag-red)" }}>{state.error}</p>}
      {state.answer && <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{state.answer}</p>}
    </Panel>
  );
}

/* ══════════════════════════════════════════════════════════════════
   Shared response shapes, typed from the real ShadiLife routers.
   Every field optional — this console cannot verify a live payload, so
   it treats each one as possibly absent and renders "—" instead.
   ══════════════════════════════════════════════════════════════════ */

/** GET /api/ai-agents/_meta/usage */
export interface MetaUsage {
  configured?: boolean;
  model?: string;
  monthlyBudgetUsd?: number;
  monthlySpendUsd?: number;
  monthlyCallCount?: number;
  byAgent?: Array<{ agent?: string; spendUsd?: number; calls?: number }>;
}

/** GET /api/ai-agents/_meta/system */
export interface MetaSystem {
  totalAgents?: number;
  totalSchedules?: number;
  activeSchedules?: number;
  adminCount?: number;
  knowledgeBaseArticles?: number;
  totalUsers?: number;
}

/** GET /api/ai-agents/_meta/dashboard-summary */
export interface MetaSummary {
  pendingByAgent?: Array<{ agent?: string; pending?: number }>;
  agreementRate?: number | null;
}

/** GET /api/ai-agents/_meta/activity */
export interface MetaEvent {
  id?: string;
  kind?: "call" | "suggestion";
  agent?: string;
  endpoint?: string;
  costUsd?: number;
  targetType?: string;
  status?: string;
  createdAt?: string;
}
export interface MetaActivity {
  events?: MetaEvent[];
  lastEventAt?: string | null;
}

/** GET /api/admin/reports (+ ?status=) */
export interface AdminReport {
  id?: string;
  reporterId?: string;
  reportedId?: string;
  reason?: string;
  description?: string | null;
  severity?: string;
  status?: string;
  resolvedByAdminId?: string | null;
  resolvedAt?: string | null;
  createdAt?: string;
  reporter?: { id?: string; email?: string; profile?: { fullName?: string; city?: string } | null } | null;
  reported?: { id?: string; email?: string; profile?: { fullName?: string; city?: string } | null } | null;
}

/** GET /api/admin/dashboard — only the slices these views consume. */
export interface AdminDashboard {
  stats?: {
    totalUsers?: number;
    totalUsersDelta?: number;
    activeToday?: number;
    newRegistrations7d?: number;
    pendingApprovals?: number;
    matchesMade?: number;
    matchesMadeDelta?: number;
    matchSuccessRate?: number;
    premiumSubscribers?: number;
    premiumSubscribersDelta?: number;
    totalRevenue7d?: number;
    interestsSent?: number;
  };
  pendingApprovalsBreakdown?: { newProfiles?: number; verifications?: number; agentApplications?: number; openReports?: number };
  registrationTrend?: Array<{ day?: string; users?: number; verified?: number; matches?: number }>;
  cityDistribution?: Array<{ city?: string; users?: number }>;
  aiAgentUsage?: Array<{ agent?: string; calls?: number; costUsd?: number }>;
  fraudSummary?: { openReports?: number; autoFlaggedReports?: number; pendingModeration?: number; resolvedAllTime?: number; avgResponseHours?: number | null };
  premiumBreakdown?: { silver?: number; gold?: number };
  websiteHealth?: { apiStatus?: string; databaseStatus?: string; responseTimeMs?: number };
  employeeActivity?: Array<{ adminName?: string; role?: string | null; action?: string; targetType?: string | null; createdAt?: string }>;
}
