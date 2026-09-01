"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { Icons } from "./icons";

/* ══════════════════════════════════════════════════════════════════════
   Rich dashboard primitives — the dense, graphics-heavy building blocks
   (donuts, area charts with hover tooltips, metric cards, agent panel,
   insight rows, ranked bar lists, avatars) shared by every agent page.
   ══════════════════════════════════════════════════════════════════════ */

export const SERIES_COLORS = ["#7c3aed", "#3b82f6", "#22c55e", "#f59e0b", "#ec4899", "#06b6d4", "#f43f5e", "#8b5cf6"];

export function Svg({ path, size = 20, strokeWidth = 1.8 }: { path: ReactNode; size?: number; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {path}
    </svg>
  );
}

/* ── Metric card: circular icon + value + change vs previous ─────────── */
export function MetricCard({
  icon,
  title,
  value,
  change,
  changeLabel = "vs last 30 days",
  tone = "purple",
}: {
  icon: ReactNode;
  title: string;
  value: ReactNode;
  change?: number | null;
  changeLabel?: string;
  tone?: "purple" | "green" | "blue" | "gold" | "pink" | "red" | "accent";
}) {
  const up = (change ?? 0) >= 0;
  return (
    <div className="ag-metric">
      <div className={`ag-metric-icon tone-${tone}`}>{icon}</div>
      <div className="ag-metric-main">
        <div className="ag-metric-title">{title}</div>
        <div className="ag-metric-value ag-display">{value}</div>
        {change !== undefined && change !== null && (
          <div className={`ag-metric-change ${up ? "up" : "down"}`}>
            <span>{up ? "↑" : "↓"}</span> {Math.abs(change)}% <em>{changeLabel}</em>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Donut chart with center total + legend ─────────────────────────── */
export function DonutChart({
  data,
  total,
  totalLabel = "Total",
  size = 168,
}: {
  data: Array<{ label: string; value: number; color?: string }>;
  total?: number;
  totalLabel?: string;
  size?: number;
}) {
  const sum = data.reduce((a, b) => a + b.value, 0);
  const shown = total ?? sum;
  let acc = 0;
  const stops = data.map((d, i) => {
    const color = d.color ?? SERIES_COLORS[i % SERIES_COLORS.length];
    const from = sum > 0 ? (acc / sum) * 100 : 0;
    acc += d.value;
    const to = sum > 0 ? (acc / sum) * 100 : 0;
    return `${color} ${from}% ${to}%`;
  });
  const gradient = sum > 0 ? `conic-gradient(${stops.join(",")})` : "conic-gradient(var(--ag-track) 0 100%)";

  return (
    <div className="ag-donut-row">
      <div className="ag-donut" style={{ width: size, height: size, background: gradient }}>
        <div className="ag-donut-hole">
          <strong className="ag-display">{shown.toLocaleString()}</strong>
          <span>{totalLabel}</span>
        </div>
      </div>
      <div className="ag-legend">
        {data.map((d, i) => {
          const pct = sum > 0 ? Math.round((d.value / sum) * 1000) / 10 : 0;
          return (
            <div className="ag-legend-row" key={d.label}>
              <i style={{ background: d.color ?? SERIES_COLORS[i % SERIES_COLORS.length] }} />
              <span>{d.label} <em>({pct}%)</em></span>
              <b>{d.value.toLocaleString()}</b>
            </div>
          );
        })}
        {data.length === 0 && <div className="ag-legend-empty">No data yet.</div>}
      </div>
    </div>
  );
}

/* ── Area chart: grid, y-axis labels, x-axis labels, hover tooltip ──── */
export function AreaChart({
  series,
  labels,
  height = 230,
  yTicks = 5,
  valueSuffix = "",
}: {
  series: Array<{ name: string; data: number[]; color?: string }>;
  labels: string[];
  height?: number;
  yTicks?: number;
  valueSuffix?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 720;
  const padL = 38;
  const padR = 12;
  const padT = 14;
  const padB = 26;
  const plotW = W - padL - padR;
  const plotH = height - padT - padB;

  const allValues = series.flatMap((s) => s.data);
  const rawMax = Math.max(1, ...allValues);
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawMax)));
  const max = Math.ceil(rawMax / magnitude) * magnitude || 1;
  const n = Math.max(1, labels.length - 1);
  const xAt = (i: number) => padL + (i / n) * plotW;
  const yAt = (v: number) => padT + plotH - (v / max) * plotH;

  function smooth(data: number[]) {
    const pts = data.map((v, i) => [xAt(i), yAt(v)] as [number, number]);
    if (pts.length < 2) return { line: "", area: "" };
    let d = `M ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[i + 1];
      const mx = (x0 + x1) / 2;
      d += ` C ${mx} ${y0}, ${mx} ${y1}, ${x1} ${y1}`;
    }
    return { line: d, area: `${d} L ${pts[pts.length - 1][0]} ${padT + plotH} L ${pts[0][0]} ${padT + plotH} Z`, pts };
  }

  const gridYs = Array.from({ length: yTicks }, (_, i) => padT + (i / (yTicks - 1)) * plotH);

  return (
    <div className="ag-chart">
      <svg viewBox={`0 0 ${W} ${height}`} width="100%" height={height} preserveAspectRatio="none" onMouseLeave={() => setHover(null)}>
        <defs>
          {series.map((s, i) => {
            const c = s.color ?? SERIES_COLORS[i % SERIES_COLORS.length];
            return (
              <linearGradient key={i} id={`ag-area-${i}-${c.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={c} stopOpacity="0.26" />
                <stop offset="100%" stopColor={c} stopOpacity="0.01" />
              </linearGradient>
            );
          })}
        </defs>

        {gridYs.map((y, i) => (
          <line key={i} x1={padL} x2={W - padR} y1={y} y2={y} stroke="var(--ag-border-soft)" strokeWidth="1" />
        ))}
        {gridYs.map((y, i) => (
          <text key={`t${i}`} x={padL - 8} y={y + 3.5} textAnchor="end" fontSize="10" fill="var(--ag-ink-faint)">
            {Math.round(max - (i / (yTicks - 1)) * max).toLocaleString()}
          </text>
        ))}

        {series.map((s, i) => {
          const c = s.color ?? SERIES_COLORS[i % SERIES_COLORS.length];
          const { line, area } = smooth(s.data);
          return (
            <g key={i}>
              <path d={area} fill={`url(#ag-area-${i}-${c.replace("#", "")})`} />
              <path d={line} fill="none" stroke={c} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              {s.data.map((v, j) => (
                <circle key={j} cx={xAt(j)} cy={yAt(v)} r={hover === j ? 5 : 3} fill="#fff" stroke={c} strokeWidth="2.2" />
              ))}
            </g>
          );
        })}

        {labels.map((_, i) => (
          <rect key={i} x={xAt(i) - plotW / n / 2} y={padT} width={plotW / n} height={plotH} fill="transparent" onMouseEnter={() => setHover(i)} />
        ))}
        {hover !== null && <line x1={xAt(hover)} x2={xAt(hover)} y1={padT} y2={padT + plotH} stroke="var(--ag-border)" strokeWidth="1" strokeDasharray="3 3" />}
      </svg>

      {hover !== null && (
        <div className="ag-chart-tip" style={{ left: `${(xAt(hover) / W) * 100}%` }}>
          <b>{labels[hover]}</b>
          {series.map((s, i) => (
            <span key={i}>
              <i style={{ background: s.color ?? SERIES_COLORS[i % SERIES_COLORS.length] }} />
              {s.name}: <strong>{(s.data[hover] ?? 0).toLocaleString()}{valueSuffix}</strong>
            </span>
          ))}
        </div>
      )}

      <div className="ag-chart-x" style={{ paddingLeft: `${(padL / W) * 100}%`, paddingRight: `${(padR / W) * 100}%` }}>
        {labels.map((l, i) => <span key={i}>{l}</span>)}
      </div>

      {series.length > 1 && (
        <div className="ag-chart-legend">
          {series.map((s, i) => (
            <span key={i}><i style={{ background: s.color ?? SERIES_COLORS[i % SERIES_COLORS.length] }} />{s.name}</span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Ranked horizontal bar list ─────────────────────────────────────── */
export function BarList({
  rows,
  color,
  emptyText = "No data yet.",
  ranked = false,
}: {
  rows: Array<{ label: string; value: number }>;
  color?: string;
  emptyText?: string;
  ranked?: boolean;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (rows.length === 0) return <div className="ag-legend-empty">{emptyText}</div>;
  return (
    <div className="ag-barlist">
      {rows.map((r, i) => (
        <div className="ag-barlist-row" key={r.label}>
          <div className="ag-barlist-head">
            <span>
              {ranked && <b className="ag-rank" style={{ background: color ?? SERIES_COLORS[i % SERIES_COLORS.length] }}>{i + 1}</b>}
              {r.label}
            </span>
            <strong>{r.value.toLocaleString()}</strong>
          </div>
          <div className="ag-barlist-track">
            <div className="ag-barlist-fill" style={{ width: `${(r.value / max) * 100}%`, background: color ?? SERIES_COLORS[i % SERIES_COLORS.length] }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Agent side panel: robot + greeting + today cards + ask chips ────── */
export function AgentSidePanel({
  agentLabel,
  greeting,
  blurb,
  todayStats,
  suggestions,
  onAsk,
}: {
  agentLabel: string;
  greeting: string;
  blurb: ReactNode;
  todayStats: Array<{ label: string; value: ReactNode; icon: ReactNode; tone?: "purple" | "green" | "gold" | "blue" }>;
  suggestions?: string[];
  onAsk?: (q: string) => void;
}) {
  return (
    <div className="ag-panel ag-agentpanel">
      <div className="ag-panel-head">
        <div className="ag-panel-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "var(--ag-accent)", display: "grid" }}><Svg path={Icons.bot} size={17} /></span>
          {agentLabel}
        </div>
      </div>

      <div className="ag-agentpanel-top">
        <div className="ag-robot"><span /><i /><i /></div>
        <div className="ag-robot-copy">
          <b>{greeting}</b>
          <p>{blurb}</p>
        </div>
      </div>

      <div className="ag-today">
        {todayStats.map((s) => (
          <div className={`ag-today-card tone-${s.tone ?? "purple"}`} key={s.label}>
            <div className="ag-today-icon">{s.icon}</div>
            <div>
              <div className="ag-today-label">{s.label}</div>
              <div className="ag-today-value ag-display">{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {suggestions && suggestions.length > 0 && (
        <div className="ag-ask">
          <h4>Ask AI Agent</h4>
          <div className="ag-ask-chips">
            {suggestions.map((s) => (
              <button key={s} type="button" className="ag-ask-chip" onClick={() => onAsk?.(s)}>{s}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Insights list ──────────────────────────────────────────────────── */
export function InsightsPanel({ title = "Insights", rows }: { title?: string; rows: Array<{ icon: ReactNode; label: string; value: ReactNode }> }) {
  return (
    <div className="ag-panel">
      <div className="ag-panel-head">
        <div className="ag-panel-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "var(--ag-accent)", display: "grid" }}><Svg path={Icons.lightbulb} size={16} /></span>
          {title}
        </div>
      </div>
      <div className="ag-panel-body ag-insights">
        {rows.map((r) => (
          <div className="ag-insight" key={r.label}>
            <div className="ag-insight-icon">{r.icon}</div>
            <div>
              <b>{r.label}</b>
              <span>{r.value}</span>
            </div>
          </div>
        ))}
        {rows.length === 0 && <div className="ag-legend-empty">Nothing to report yet.</div>}
      </div>
    </div>
  );
}

/* ── Avatar (initials, deterministic gradient) ──────────────────────── */
const AVATAR_GRADIENTS = [
  "linear-gradient(145deg,#7c3aed,#4c1d95)",
  "linear-gradient(145deg,#e0619b,#8d2dc8)",
  "linear-gradient(145deg,#0ea5e9,#1e40af)",
  "linear-gradient(145deg,#22c55e,#15803d)",
  "linear-gradient(145deg,#f59e0b,#b45309)",
  "linear-gradient(145deg,#f43f5e,#9f1239)",
];

export function Avatar({ name, size = 34 }: { name?: string | null; size?: number }) {
  const label = (name ?? "").trim();
  const initials = label ? label.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase() : "?";
  let hash = 0;
  for (let i = 0; i < label.length; i++) hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
  return (
    <div className="ag-avatar" style={{ width: size, height: size, fontSize: size * 0.36, background: AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length] }}>
      {initials}
    </div>
  );
}

/* ── Activity feed row ──────────────────────────────────────────────── */
export function FeedRow({ icon, title, sub, time, tone = "accent" }: { icon: ReactNode; title: ReactNode; sub?: ReactNode; time?: string; tone?: "accent" | "green" | "red" | "gold" }) {
  return (
    <div className="ag-feed-row">
      <div className={`ag-feed-icon tone-${tone}`}>{icon}</div>
      <div className="ag-feed-main">
        <b>{title}</b>
        {sub && <span>{sub}</span>}
      </div>
      {time && <div className="ag-feed-time">{time}</div>}
    </div>
  );
}
