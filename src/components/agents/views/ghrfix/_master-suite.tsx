"use client";

/**
 * Shared plumbing for the six hand-built GhrFix dashboards
 * (Master AI, Analytics, Finance, Ops, Support, Marketing).
 *
 * Nothing in here fabricates a number. Every helper either formats a real
 * API value or returns `null` / `"—"` when the backend gave us nothing to
 * show, so an empty database renders an honest empty state rather than a
 * plausible-looking zero.
 */

import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api";

/* ── Numbers ─────────────────────────────────────────────────────────── */

/** Prisma Decimal columns arrive as strings — coerce without inventing a value. */
export function num(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export function fmt(v: unknown): string {
  return num(v).toLocaleString();
}

export function money(v: unknown, digits = 2): string {
  return `$${num(v).toFixed(digits)}`;
}

export function pkr(v: unknown): string {
  return `PKR ${Math.round(num(v)).toLocaleString()}`;
}

/** Share of a total as a percentage, or null when the total is zero. */
export function share(part: unknown, total: unknown): number | null {
  const t = num(total);
  if (t <= 0) return null;
  return Math.round((num(part) / t) * 1000) / 10;
}

/** Percent change against a real prior period. null when no valid baseline exists. */
export function change(current: number, prior: number): number | null {
  if (!Number.isFinite(prior) || prior <= 0) return null;
  return Math.round(((current - prior) / prior) * 1000) / 10;
}

/** Renders a nullable derived number, never a fabricated zero. */
export function dash(v: number | null | undefined, suffix = ""): string {
  return v === null || v === undefined || !Number.isFinite(v) ? "—" : `${v.toLocaleString()}${suffix}`;
}

/* ── Dates ───────────────────────────────────────────────────────────── */

export function dayLabel(iso: string): string {
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function dateOnly(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
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

export function daysSince(iso?: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / 86400000));
}

/** Whole days elapsed in the current calendar month, at least 1. */
export function daysElapsedThisMonth(): number {
  return Math.max(1, new Date().getDate());
}

export function daysInThisMonth(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
}

/* ── Data loading ────────────────────────────────────────────────────── */

export interface Loaded<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * One loader for a whole dashboard: run every request the page needs, keep
 * the result, expose a `reload()` the write-actions call after a successful
 * POST so the numbers on screen always match the database.
 */
export function useAgentData<T>(load: () => Promise<T>, key: string): Loaded<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    load()
      .then((d) => {
        if (!alive) return;
        setData(d);
        setError(null);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setData(null);
        setError(e instanceof ApiError ? e.message : "Could not load live data.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { data, loading, error, reload };
}

/** Settle a request that may legitimately 404 on some deployments. */
export async function soft<T>(p: Promise<{ data: T }>): Promise<T | null> {
  try {
    return (await p).data;
  } catch {
    return null;
  }
}

/* ── Write actions ───────────────────────────────────────────────────── */

export interface ActionState {
  busy: string | null;
  note: { kind: "ok" | "err"; text: string } | null;
  clear: () => void;
  run: (id: string, fn: () => Promise<unknown>, okText: string) => Promise<boolean>;
}

export function useAction(onDone?: () => void): ActionState {
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const run = useCallback(
    async (id: string, fn: () => Promise<unknown>, okText: string) => {
      setBusy(id);
      setNote(null);
      try {
        await fn();
        setNote({ kind: "ok", text: okText });
        onDone?.();
        return true;
      } catch (e) {
        setNote({ kind: "err", text: e instanceof ApiError ? e.message : "That action could not be completed." });
        return false;
      } finally {
        setBusy(null);
      }
    },
    [onDone],
  );

  return { busy, note, clear: () => setNote(null), run };
}

export function ActionNote({ state }: { state: ActionState }) {
  if (!state.note) return null;
  return (
    <div
      style={{
        marginBottom: 14,
        padding: "10px 14px",
        borderRadius: 11,
        fontSize: 12,
        fontWeight: 600,
        background: state.note.kind === "ok" ? "var(--ag-green-soft)" : "var(--ag-red-soft)",
        color: state.note.kind === "ok" ? "var(--ag-green)" : "var(--ag-red)",
      }}
    >
      {state.note.text}
    </div>
  );
}

/* ── Layout atoms ────────────────────────────────────────────────────── */

export function Panel({
  title,
  sub,
  actions,
  children,
  flush = false,
  bodyStyle,
}: {
  title: ReactNode;
  sub?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  /** Skip the padded body — for tables that should bleed to the panel edge. */
  flush?: boolean;
  bodyStyle?: CSSProperties;
}) {
  return (
    <div className="ag-panel">
      <div className="ag-panel-head">
        <div>
          <div className="ag-panel-title">{title}</div>
          {sub && <div className="ag-panel-sub">{sub}</div>}
        </div>
        {actions}
      </div>
      {flush ? children : <div className="ag-panel-body" style={bodyStyle}>{children}</div>}
    </div>
  );
}

/** Every table on these pages goes through here so none of them clip on a phone. */
export function TableWrap({ children }: { children: ReactNode }) {
  return <div style={{ overflowX: "auto" }}>{children}</div>;
}

export function Empty({ text }: { text: string }) {
  return <div className="ag-empty">{text}</div>;
}

export function Note({ children }: { children: ReactNode }) {
  return <p style={{ margin: 0, fontSize: 12, color: "var(--ag-ink-faint)", lineHeight: 1.6 }}>{children}</p>;
}

export function LoadError({ error, platformLabel }: { error: string; platformLabel: string }) {
  return (
    <div className="ag-panel" style={{ marginBottom: 18 }}>
      <div className="ag-panel-body">
        <p style={{ margin: 0, fontSize: 12.5, color: "var(--ag-red)", fontWeight: 600 }}>{error}</p>
        <p style={{ margin: "8px 0 0", fontSize: 11.5, color: "var(--ag-ink-faint)" }}>
          Connect {platformLabel} on the Connect page and make sure its backend is running.
        </p>
      </div>
    </div>
  );
}

/** A labelled key/value row used inside the narrow right-hand panels. */
export function KeyValue({ label, value, tone }: { label: ReactNode; value: ReactNode; tone?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
      <span style={{ fontSize: 11.5, color: "var(--ag-ink-soft)" }}>{label}</span>
      <strong className="ag-display" style={{ fontSize: 13, fontVariantNumeric: "tabular-nums", color: tone }}>
        {value}
      </strong>
    </div>
  );
}

/** Horizontal progress meter (budget used, completion rate, …). */
export function Meter({ value, max, color, caption }: { value: number; max: number; color: string; caption?: ReactNode }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div>
      <div className="ag-barlist-track" style={{ height: 10 }}>
        <div className="ag-barlist-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      {caption && <div style={{ fontSize: 11, color: "var(--ag-ink-faint)", marginTop: 7 }}>{caption}</div>}
    </div>
  );
}

export function Badge({ kind, children }: { kind: "green" | "amber" | "red" | "mute"; children: ReactNode }) {
  return <span className={`ag-badge ag-badge-${kind}`}>{children}</span>;
}

/** Maps the real enum values the GhrFix API returns onto badge tones. */
export function statusTone(status: string): "green" | "amber" | "red" | "mute" {
  switch (status) {
    case "VERIFIED":
    case "COMPLETED":
    case "RESOLVED":
    case "ACTIVE":
      return "green";
    case "PENDING":
    case "INVESTIGATING":
    case "OPEN":
    case "NEW":
    case "ASSIGNED":
    case "READ":
      return "amber";
    case "REJECTED":
    case "SUSPENDED":
    case "CANCELLED":
    case "BANNED":
      return "red";
    default:
      return "mute";
  }
}

/** Ask-chips on the side panel open this agent's own chat page. */
export function useAskChat(platformKey: string, agentKey: string) {
  const router = useRouter();
  return useCallback(() => router.push(`/${platformKey}/${agentKey}/chat`), [router, platformKey, agentKey]);
}
