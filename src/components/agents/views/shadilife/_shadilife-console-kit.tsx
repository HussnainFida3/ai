"use client";

/**
 * Shared helpers for the bespoke ShadiLife agent dashboards
 * (content / seo / marketing / leadgen / analytics / finance / ops / devqa).
 *
 * Two rules run through everything here:
 *
 *  1. Nothing on screen is ever invented. Every helper below either formats a
 *     value that came back from the ShadiLife API or renders an em-dash. There
 *     is no placeholder data, no sample series, no "typical" number.
 *  2. Every field is treated as possibly absent. These views are built against
 *     the real router source, but a backend can always change, be an older
 *     build, or simply be down — so a missing field renders "—" and a missing
 *     array renders an empty state instead of throwing.
 */

import type { CSSProperties, ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ApiError } from "@/lib/api";
import type { PlatformDef } from "@/lib/platforms";
import { Svg } from "@/components/agents/rich";
import { Icons } from "@/components/agents/icons";

/* ── Defensive readers ───────────────────────────────────────────────── */

export function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
}
/** Numeric value or 0 — only for maths, never for display. */
export function n0(v: unknown): number {
  return num(v) ?? 0;
}
export function arr<T = unknown>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}
export function text(v: unknown): string {
  return typeof v === "string" ? v : "";
}
export function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

/* ── Formatters — all of them render "—" for anything missing ────────── */

export function fmtInt(v: unknown): string {
  const x = num(v);
  return x === null ? "—" : Math.round(x).toLocaleString();
}
export function fmtNum(v: unknown, digits = 1): string {
  const x = num(v);
  return x === null ? "—" : x.toLocaleString(undefined, { maximumFractionDigits: digits });
}
export function fmtPct(v: unknown, digits = 1): string {
  const x = num(v);
  return x === null ? "—" : `${x.toLocaleString(undefined, { maximumFractionDigits: digits })}%`;
}
export function fmtPkr(v: unknown): string {
  const x = num(v);
  return x === null ? "—" : `Rs ${Math.round(x).toLocaleString()}`;
}
function toDate(v: unknown): Date | null {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if (typeof v !== "string" || !v.trim()) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}
export function fmtDate(v: unknown): string {
  const d = toDate(v);
  return d ? d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) : "—";
}
export function fmtDateTime(v: unknown): string {
  const d = toDate(v);
  return d ? `${d.toLocaleDateString(undefined, { day: "2-digit", month: "short" })}, ${d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}` : "—";
}
export { toDate };

/** Percentage of `part` out of `whole`, or null when the base is unknown/zero. */
export function share(part: unknown, whole: unknown): number | null {
  const p = num(part);
  const w = num(whole);
  if (p === null || w === null || w === 0) return null;
  return Math.round((p / w) * 1000) / 10;
}

/** Counts occurrences of a key across records — used for every breakdown. */
export function countBy<T>(rows: T[], key: (row: T) => string | null | undefined): Array<{ label: string; value: number }> {
  const map = new Map<string, number>();
  for (const row of rows) {
    const k = key(row);
    if (!k) continue;
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

/** Sums a numeric field across records, grouped by a label. */
export function sumBy<T>(rows: T[], key: (row: T) => string | null | undefined, value: (row: T) => unknown): Array<{ label: string; value: number }> {
  const map = new Map<string, number>();
  for (const row of rows) {
    const k = key(row);
    if (!k) continue;
    map.set(k, (map.get(k) ?? 0) + n0(value(row)));
  }
  return [...map.entries()].map(([label, v]) => ({ label, value: v })).sort((a, b) => b.value - a.value);
}

/**
 * Buckets timestamped records into the last `months` calendar months.
 * Every bucket is a real count of real records; months with nothing in them
 * are genuinely zero, not filler.
 */
export function monthlySeries<T>(rows: T[], at: (row: T) => unknown, months = 8): { labels: string[]; data: number[] } {
  const now = new Date();
  const keys: string[] = [];
  const labels: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${d.getMonth()}`);
    labels.push(d.toLocaleDateString(undefined, { month: "short" }));
  }
  const counts = new Map<string, number>(keys.map((k) => [k, 0]));
  for (const row of rows) {
    const d = toDate(at(row));
    if (!d) continue;
    const k = `${d.getFullYear()}-${d.getMonth()}`;
    if (counts.has(k)) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return { labels, data: keys.map((k) => counts.get(k) ?? 0) };
}

/** Buckets timestamped records into the last `days` days. */
export function dailySeries<T>(rows: T[], at: (row: T) => unknown, days = 14): { labels: string[]; data: number[] } {
  const keys: string[] = [];
  const labels: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    keys.push(d.toISOString().slice(0, 10));
    labels.push(d.toLocaleDateString(undefined, { day: "numeric", month: "short" }));
  }
  const counts = new Map<string, number>(keys.map((k) => [k, 0]));
  for (const row of rows) {
    const d = toDate(at(row));
    if (!d) continue;
    const k = d.toISOString().slice(0, 10);
    if (counts.has(k)) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return { labels, data: keys.map((k) => counts.get(k) ?? 0) };
}

/** Collapses a dated {date, amount} series into weekly totals for readability. */
export function weeklyTotals(points: Array<{ date?: unknown; amountPkr?: unknown }>, maxBuckets = 13): { labels: string[]; data: number[] } {
  const clean = points
    .map((p) => ({ d: toDate(p?.date), v: n0(p?.amountPkr) }))
    .filter((p): p is { d: Date; v: number } => p.d !== null);
  if (clean.length === 0) return { labels: [], data: [] };
  clean.sort((a, b) => a.d.getTime() - b.d.getTime());

  const size = Math.max(1, Math.ceil(clean.length / maxBuckets));
  const labels: string[] = [];
  const data: number[] = [];
  for (let i = 0; i < clean.length; i += size) {
    const chunk = clean.slice(i, i + size);
    labels.push(chunk[0].d.toLocaleDateString(undefined, { day: "numeric", month: "short" }));
    data.push(chunk.reduce((s, p) => s + p.v, 0));
  }
  return { labels, data };
}

/* ── Async loading ───────────────────────────────────────────────────── */

export function describeError(e: unknown, platform: PlatformDef): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error && e.message) return e.message;
  return `${platform.label} could not be reached.`;
}

/**
 * One request, with its loading/error state. `auto` decides whether it fires
 * on mount — endpoints that spend an OpenAI call or run a real scan are left
 * manual so the page never bills the owner just for being opened.
 */
export function useAsync<T>(platform: PlatformDef, runner: () => Promise<T>, auto: boolean) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(auto);
  const runnerRef = useRef(runner);
  runnerRef.current = runner;
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const run = useCallback(async (): Promise<T | null> => {
    setLoading(true);
    setError(null);
    try {
      const d = await runnerRef.current();
      if (alive.current) setData(d);
      return d;
    } catch (e) {
      if (alive.current) setError(describeError(e, platform));
      return null;
    } finally {
      if (alive.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform.key]);

  useEffect(() => {
    if (auto) void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, auto]);

  return { data, error, loading, run, setData };
}

/* ── Chrome ──────────────────────────────────────────────────────────── */

export function Panel({
  title,
  sub,
  actions,
  children,
  bodyStyle,
  flush,
}: {
  title: ReactNode;
  sub?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  bodyStyle?: CSSProperties;
  /** Skip the body padding — for tables that draw their own. */
  flush?: boolean;
}) {
  return (
    <div className="ag-panel">
      <div className="ag-panel-head">
        <div style={{ minWidth: 0 }}>
          <div className="ag-panel-title">{title}</div>
          {sub && <div className="ag-panel-sub">{sub}</div>}
        </div>
        {actions && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{actions}</div>}
      </div>
      {flush ? children : <div className="ag-panel-body" style={bodyStyle}>{children}</div>}
    </div>
  );
}

/** The state this console spends most of its life in when a backend is down. */
export function ErrorPanel({ message, platform, what }: { message: string; platform: PlatformDef; what: string }) {
  return (
    <div className="ag-panel" style={{ marginBottom: 16 }}>
      <div className="ag-panel-body" style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <span style={{ color: "var(--ag-red)", display: "grid", flex: "0 0 auto", marginTop: 1 }}>
          <Svg path={Icons.alert} size={18} />
        </span>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 12.5, color: "var(--ag-red)", fontWeight: 650 }}>{message}</p>
          <p style={{ margin: "7px 0 0", fontSize: 11.5, color: "var(--ag-ink-faint)", lineHeight: 1.65 }}>
            {what} would be read from {platform.label} at <code style={{ fontSize: 11 }}>{platform.apiBase}</code>. Connect the platform on the{" "}
            <Link href="/connect" style={{ color: "var(--ag-accent)", fontWeight: 650 }}>Connect</Link> page and make sure that backend is running.
            Nothing is shown on this page unless it came back from that API.
          </p>
        </div>
      </div>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="ag-empty">{children}</div>;
}

/** Every table on these pages goes through here, so none of them can clip. */
export function TableScroll({ children }: { children: ReactNode }) {
  return (
    <div className="ag-table-scroll" style={{ overflowX: "auto" }}>
      {children}
    </div>
  );
}

export function Badge({ tone, children }: { tone: "green" | "amber" | "red" | "mute"; children: ReactNode }) {
  return <span className={`ag-badge ag-badge-${tone}`}>{children}</span>;
}

/** Label/value row used inside side panels. */
export function StatRow({ label, value, hint }: { label: ReactNode; value: ReactNode; hint?: ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
      <span style={{ fontSize: 11.5, color: "var(--ag-ink-soft)", minWidth: 0 }}>
        {label}
        {hint && <em style={{ display: "block", fontSize: 10.5, color: "var(--ag-ink-faint)", fontStyle: "normal" }}>{hint}</em>}
      </span>
      <strong className="ag-display" style={{ fontSize: 13, fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{value}</strong>
    </div>
  );
}

/**
 * Renders the model's prose exactly as the API returned it, split on its own
 * bullet markers. Never reformatted into numbers or claims of its own.
 */
export function AiBullets({ body, empty = "No commentary returned." }: { body: string | string[] | undefined; empty?: string }) {
  const lines = Array.isArray(body)
    ? body.filter((b) => typeof b === "string" && b.trim())
    : text(body)
        .split(/\r?\n/)
        .map((l) => l.replace(/^[-•*]\s*/, "").trim())
        .filter(Boolean);

  if (lines.length === 0) return <Empty>{empty}</Empty>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
      {lines.map((l, i) => (
        <div key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
          <span style={{ color: "var(--ag-accent)", display: "grid", flex: "0 0 auto", marginTop: 1 }}>
            <Svg path={Icons.sparkle} size={14} />
          </span>
          <span style={{ fontSize: 12.5, lineHeight: 1.7, color: "var(--ag-ink-soft)" }}>{l}</span>
        </div>
      ))}
    </div>
  );
}

/** Small inline note under a chart explaining exactly where the numbers came from. */
export function SourceNote({ children }: { children: ReactNode }) {
  return <p style={{ margin: "12px 0 0", fontSize: 10.5, color: "var(--ag-ink-faint)", lineHeight: 1.6 }}>{children}</p>;
}
