"use client";

/**
 * Local helpers shared by the six hand-built GhrFix dashboards
 * (owner-chat, payment-wallet, content, seo, site-chat, devqa).
 *
 * Nothing here invents a number: the formatters render `—` for anything
 * missing, and `pctChange` returns null when there is no valid prior period
 * to compare against, so a MetricCard simply omits its trend line instead of
 * showing a made-up one.
 */

import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, type AgentChatResult, type agentClient } from "@/lib/api";

export type Api = ReturnType<typeof agentClient>;

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
        if (!alive) return;
        setError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Request failed.");
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

/* ── formatting ────────────────────────────────────────────────────── */

/** Prisma Decimal columns arrive as strings — coerce, but never turn missing into 0. */
export function dec(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export function num(v: unknown, fallback = "—"): string {
  const n = dec(v);
  return n === null ? fallback : n.toLocaleString();
}

export function pkr(v: unknown, fallback = "—"): string {
  const n = dec(v);
  return n === null ? fallback : `Rs ${n.toLocaleString()}`;
}

export function usd(v: unknown, digits = 2, fallback = "—"): string {
  const n = dec(v);
  return n === null ? fallback : `$${n.toFixed(digits)}`;
}

export function coins(v: unknown, fallback = "—"): string {
  const n = dec(v);
  return n === null ? fallback : `${n.toLocaleString()} GC`;
}

export function pct(v: unknown, digits = 1, fallback = "—"): string {
  const n = dec(v);
  return n === null ? fallback : `${Math.round(n * 10 ** digits) / 10 ** digits}%`;
}

/** "2026-08-19" / ISO → "19 Aug". */
export function shortDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function dateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
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

/**
 * Percentage change between two real periods, rounded to one decimal.
 * Returns null when the prior period is empty or absent — the caller then
 * omits the trend rather than printing an unbounded or invented figure.
 */
export function pctChange(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

/** Splits a real daily series in half and compares the two halves. */
export function halfOverHalf(values: number[]): number | null {
  if (values.length < 4) return null;
  const mid = Math.floor(values.length / 2);
  const prev = values.slice(0, mid).reduce((a, b) => a + b, 0);
  const cur = values.slice(mid).reduce((a, b) => a + b, 0);
  return pctChange(cur, prev);
}

export function share(part: number, whole: number): number | null {
  if (!Number.isFinite(part) || !Number.isFinite(whole) || whole <= 0) return null;
  return Math.round((part / whole) * 1000) / 10;
}

/** Turns "topup.approve" / "resolve_contact_message" into "Topup approve". */
export function humanAction(action: string): string {
  const s = action.replace(/[._-]+/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
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

export function ErrorNote({ error, hint }: { error: string; hint?: ReactNode }) {
  return (
    <div className="ag-panel" style={{ marginBottom: 18 }}>
      <div className="ag-panel-body">
        <p style={{ margin: 0, fontSize: 12.5, color: "var(--ag-red)", fontWeight: 650 }}>{error}</p>
        {hint && <p style={{ margin: "8px 0 0", fontSize: 11.5, color: "var(--ag-ink-faint)", lineHeight: 1.6 }}>{hint}</p>}
      </div>
    </div>
  );
}

/** Small labelled key/value row used inside side panels. */
export function KeyRow({ label, value, tone }: { label: ReactNode; value: ReactNode; tone?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
      <span style={{ fontSize: 11.5, color: "var(--ag-ink-soft)" }}>{label}</span>
      <strong className="ag-display" style={{ fontSize: 13, fontVariantNumeric: "tabular-nums", color: tone }}>{value}</strong>
    </div>
  );
}

export function Pill({ text, tone }: { text: string; tone: "green" | "amber" | "red" | "mute" }) {
  return <span className={`ag-badge ag-badge-${tone}`}>{text}</span>;
}

/* ── inline "ask this agent" ───────────────────────────────────────── */

export interface AskState {
  question: string | null;
  answer: string | null;
  tools: string[];
  asking: boolean;
  error: string | null;
  ask: (q: string) => void;
  clear: () => void;
}

/** Runs a suggestion chip through the agent's real /chat endpoint. */
export function useAsk(api: Api): AskState {
  const [question, setQuestion] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [tools, setTools] = useState<string[]>([]);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ask = useCallback(
    (q: string) => {
      setQuestion(q);
      setAnswer(null);
      setTools([]);
      setError(null);
      setAsking(true);
      api
        .chat(q)
        .then(({ data }: { data: AgentChatResult }) => {
          setAnswer(data.reply);
          setTools((data.toolCallsExecuted ?? []).map((t) => t.name));
        })
        .catch((e: unknown) => setError(e instanceof ApiError ? e.message : "The agent could not answer that."))
        .finally(() => setAsking(false));
    },
    [api],
  );

  return { question, answer, tools, asking, error, ask, clear: () => setQuestion(null) };
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
      {state.asking && (
        <span className="ag-typing"><i /><i /><i /></span>
      )}
      {state.error && <p style={{ margin: 0, fontSize: 12, color: "var(--ag-red)" }}>{state.error}</p>}
      {state.answer && <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.7, color: "var(--ag-ink)" }}>{state.answer}</p>}
      {state.tools.length > 0 && (
        <div className="ag-tool-row">
          {state.tools.map((t, i) => (
            <span className="ag-tool-chip" key={`${t}-${i}`}>{t}</span>
          ))}
        </div>
      )}
    </Panel>
  );
}
