"use client";

/**
 * Special-agent UI kit — shared by every "special" agent workspace.
 *
 * Generalised from the Content Agent kit so a new special agent is a set of
 * page bodies plus a nav array, not another 600-line stylesheet. `SpecialShell`
 * takes the agent own name, tagline, nav and base path, so the chrome is
 * written once and every agent inherits the same composition.
 *
 * Every class is namespaced `cs-`, so nothing here can collide with `ag-*`,
 * `dc-*`, or the unnamespaced globals the older SEO/Finance special pages
 * declare. Those older pages are deliberately left alone.
 *
 * Layout follows the established 1536-wide composition: a fixed 232px sidebar
 * with the assistant card pinned to its base, and a fluid main column beside
 * it. Below 1180px the sidebar retracts so the page reflows rather than
 * clipping — the composition is preserved at full size, not enforced past it.
 */

import type { ReactNode } from "react";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { platformLabel } from "@/lib/agent-data";
import type { PlatformKey } from "@/lib/platforms";

/* ── Series colors ────────────────────────────────────────────────────
   Validated with the dataviz palette checker against a white surface:
   lightness band, chroma floor, CVD separation, normal-vision floor and
   3:1 contrast all pass. Assigned in fixed order and never cycled, so a
   category keeps its color when the set is filtered. Every chart drawn
   from these ships a directly-labelled legend, which is also what makes
   the one adjacent pair sitting in the CVD floor band legible.
   ─────────────────────────────────────────────────────────────────── */
export const SERIES = ["#7c3aed", "#3b7fd1", "#0f9e69", "#c9860f", "#e04452", "#0e8fa8"];

export const TONE: Record<string, { fg: string; bg: string }> = {
  purple: { fg: "#7c3aed", bg: "#f2edff" },
  blue: { fg: "#3b7fd1", bg: "#eef5ff" },
  green: { fg: "#0f9e69", bg: "#e9faf3" },
  amber: { fg: "#c9860f", bg: "#fff6e6" },
  red: { fg: "#e04452", bg: "#ffeef0" },
  cyan: { fg: "#0e8fa8", bg: "#e8f7fb" },
};

/* ── Icons ──────────────────────────────────────────────────────────── */
const PATHS: Record<string, ReactNode> = {
  dashboard: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  posts: <><path d="M4 3h11l5 5v13H4Z" /><path d="M15 3v5h5" /><path d="M8 12h8M8 16h5" /></>,
  sparkle: <><path d="m12 2 1.5 5.5L19 9l-5.5 1.5L12 16l-1.5-5.5L5 9l5.5-1.5Z" /><path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7Z" /></>,
  pulse: <><path d="M3 12h4l3-8 4 16 3-8h4" /></>,
  bot: <><rect x="4" y="7" width="16" height="12" rx="4" /><path d="M12 3v4" /><path d="M8 12h.01M16 12h.01" /><path d="M8 16c2.2 1.3 5.8 1.3 8 0" /></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
  trend: <><path d="M3 17l6-6 4 4 8-9" /><path d="M17 6h4v4" /></>,
  edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" /></>,
  eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
  check: <><circle cx="12" cy="12" r="9" /><path d="m8.5 12 2.5 2.5 4.5-5" /></>,
  alert: <><path d="M12 3 2 20h20Z" /><path d="M12 10v4M12 17h.01" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  tag: <><path d="M3 12V4h8l9 9-8 8Z" /><circle cx="7.5" cy="7.5" r="1.2" /></>,
  download: <><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M4 21h16" /></>,
  calendar: <><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M16 2v4M8 2v4M3 9h18" /></>,
  chevron: <path d="m7 10 5 5 5-5" />,
  arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
  back: <><path d="M19 12H5" /><path d="m11 18-6-6 6-6" /></>,
  send: <><path d="M22 2 11 13" /><path d="m22 2-7 20-4-9-9-4Z" /></>,
  share: <><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 13.5 6.8 4M15.4 6.5 8.6 10.5" /></>,
  heart: <><path d="M12 20s-7-4.4-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.6-7 9-7 9Z" /></>,
  chat: <><path d="M21 15a3 3 0 0 1-3 3H8l-5 3V6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3Z" /></>,
  users: <><circle cx="9" cy="8" r="4" /><path d="M3 21v-1a6 6 0 0 1 12 0v1" /><path d="M17 4a4 4 0 0 1 0 8" /><path d="M21 21v-1a6 6 0 0 0-4-5.65" /></>,
  target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>,
};

export function Icon({ name, size = 18, stroke = 1.8 }: { name: string; size?: number; stroke?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name] ?? PATHS.dashboard}
    </svg>
  );
}

/* ── Donut ──────────────────────────────────────────────────────────── */
export interface Slice {
  label: string;
  value: number;
  color?: string;
}

/**
 * Conic-gradient donut with a 2px surface gap between segments, matching
 * the ring used across the SEO special pages. Always paired with `Legend`,
 * which carries the direct labels.
 */
export function Donut({ data, size = 148, center, centerLabel = "Total" }: { data: Slice[]; size?: number; center?: ReactNode; centerLabel?: string }) {
  const sum = data.reduce((a, b) => a + b.value, 0);
  let acc = 0;
  const stops: string[] = [];
  data.forEach((d, i) => {
    const color = d.color ?? SERIES[i % SERIES.length];
    const from = sum > 0 ? (acc / sum) * 100 : 0;
    acc += d.value;
    const to = sum > 0 ? (acc / sum) * 100 : 0;
    stops.push(`${color} ${from}% ${to}%`, `#fff ${to}% ${Math.min(100, to + 0.6)}%`);
  });
  const bg = sum > 0 ? `conic-gradient(${stops.join(",")})` : "conic-gradient(#eef0f5 0 100%)";
  return (
    <div className="cs-donut" style={{ width: size, height: size, background: bg }}>
      <div className="cs-donut-hole" style={{ inset: size * 0.19 }}>
        <strong>{center ?? sum.toLocaleString()}</strong>
        <span>{centerLabel}</span>
      </div>
    </div>
  );
}

export function Legend({ data, showPct = true }: { data: Slice[]; showPct?: boolean }) {
  const sum = data.reduce((a, b) => a + b.value, 0);
  if (data.length === 0) return <p className="cs-empty">No data yet.</p>;
  return (
    <div className="cs-legend">
      {data.map((d, i) => (
        <div className="cs-legend-row" key={d.label}>
          <i style={{ background: d.color ?? SERIES[i % SERIES.length] }} />
          <span>{d.label}</span>
          <b>{d.value.toLocaleString()}</b>
          {showPct && <em>{sum > 0 ? Math.round((d.value / sum) * 100) : 0}%</em>}
        </div>
      ))}
    </div>
  );
}

/* ── Score ring (single value out of a max) ─────────────────────────── */
export function ScoreRing({ value, max = 100, size = 118, color = "#7c3aed", label = "Score" }: { value: number; max?: number; size?: number; color?: string; label?: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="cs-donut" style={{ width: size, height: size, background: `conic-gradient(${color} 0 ${pct}%, #edeff5 ${pct}% 100%)` }}>
      <div className="cs-donut-hole" style={{ inset: size * 0.115 }}>
        <strong style={{ fontSize: size * 0.23 }}>{value.toLocaleString()}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

/* ── Trend chart: grid, y labels, x labels, hover crosshair ─────────── */
export function TrendChart({
  series,
  labels,
  height = 210,
  suffix = "",
}: {
  series: Array<{ name: string; data: number[]; color?: string }>;
  labels: string[];
  height?: number;
  suffix?: string;
}) {
  const [hover, setHover] = React.useState<number | null>(null);
  const W = 720;
  const padL = 40;
  const padR = 14;
  const padT = 12;
  const padB = 26;
  const plotW = W - padL - padR;
  const plotH = height - padT - padB;

  const raw = Math.max(1, ...series.flatMap((s) => s.data));
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const max = Math.ceil(raw / mag) * mag || 1;
  const n = Math.max(1, labels.length - 1);
  const xAt = (i: number) => padL + (i / n) * plotW;
  const yAt = (v: number) => padT + plotH - (v / max) * plotH;

  const path = (data: number[]) => {
    const pts = data.map((v, i) => [xAt(i), yAt(v)] as const);
    if (pts.length < 2) return { line: "", area: "" };
    let d = `M ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[i + 1];
      const mx = (x0 + x1) / 2;
      d += ` C ${mx} ${y0}, ${mx} ${y1}, ${x1} ${y1}`;
    }
    return { line: d, area: `${d} L ${pts[pts.length - 1][0]} ${padT + plotH} L ${pts[0][0]} ${padT + plotH} Z` };
  };

  const ticks = 5;
  const gridY = Array.from({ length: ticks }, (_, i) => padT + (i / (ticks - 1)) * plotH);

  return (
    <div className="cs-chart">
      <svg viewBox={`0 0 ${W} ${height}`} width="100%" height={height} preserveAspectRatio="none" onMouseLeave={() => setHover(null)}>
        <defs>
          {series.map((s, i) => {
            const c = s.color ?? SERIES[i % SERIES.length];
            return (
              <linearGradient key={i} id={`cs-fill-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={c} stopOpacity="0.22" />
                <stop offset="100%" stopColor={c} stopOpacity="0.01" />
              </linearGradient>
            );
          })}
        </defs>

        {gridY.map((y, i) => <line key={i} x1={padL} x2={W - padR} y1={y} y2={y} stroke="#eef0f5" strokeWidth="1" />)}
        {gridY.map((y, i) => (
          <text key={`y${i}`} x={padL - 9} y={y + 3.5} textAnchor="end" fontSize="10" fill="#8891a8">
            {Math.round(max - (i / (ticks - 1)) * max).toLocaleString()}
          </text>
        ))}

        {series.map((s, i) => {
          const c = s.color ?? SERIES[i % SERIES.length];
          const { line, area } = path(s.data);
          return (
            <g key={i}>
              <path d={area} fill={`url(#cs-fill-${i})`} />
              <path d={line} fill="none" stroke={c} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              {s.data.map((v, j) => (
                <circle key={j} cx={xAt(j)} cy={yAt(v)} r={hover === j ? 5 : 3.2} fill="#fff" stroke={c} strokeWidth="2.2" />
              ))}
            </g>
          );
        })}

        {hover !== null && <line x1={xAt(hover)} x2={xAt(hover)} y1={padT} y2={padT + plotH} stroke="#c9cede" strokeWidth="1" strokeDasharray="3 3" />}
        {labels.map((_, i) => (
          <rect key={i} x={xAt(i) - plotW / n / 2} y={padT} width={plotW / n} height={plotH} fill="transparent" onMouseEnter={() => setHover(i)} />
        ))}
      </svg>

      {hover !== null && (
        <div className="cs-tip" style={{ left: `${(xAt(hover) / W) * 100}%` }}>
          <b>{labels[hover]}</b>
          {series.map((s, i) => (
            <span key={i}>
              <i style={{ background: s.color ?? SERIES[i % SERIES.length] }} />
              {s.name}: <strong>{(s.data[hover] ?? 0).toLocaleString()}{suffix}</strong>
            </span>
          ))}
        </div>
      )}

      <div className="cs-chart-x" style={{ paddingLeft: `${(padL / W) * 100}%`, paddingRight: `${(padR / W) * 100}%` }}>
        {labels.map((l, i) => <span key={i}>{l}</span>)}
      </div>

      <div className="cs-chart-legend">
        {series.map((s, i) => (
          <span key={i}><i style={{ background: s.color ?? SERIES[i % SERIES.length] }} />{s.name}</span>
        ))}
      </div>
    </div>
  );
}

/* ── Bars ───────────────────────────────────────────────────────────── */
export function BarRows({ rows, colored = true, suffix = "" }: { rows: Slice[]; colored?: boolean; suffix?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (rows.length === 0) return <p className="cs-empty">No data yet.</p>;
  return (
    <div className="cs-bars">
      {rows.map((r, i) => (
        <div className="cs-bar-row" key={r.label}>
          <div className="cs-bar-head">
            <span>{r.label}</span>
            <b>{r.value.toLocaleString()}{suffix}</b>
          </div>
          <div className="cs-bar-track">
            <div className="cs-bar-fill" style={{ width: `${(r.value / max) * 100}%`, background: colored ? r.color ?? SERIES[i % SERIES.length] : "#7c3aed" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Sparkline ──────────────────────────────────────────────────────── */
export function Sparkline({ data, color = "#7c3aed" }: { data: number[]; color?: string }) {
  if (data.length < 2) return null;
  const max = Math.max(1, ...data);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 170},${42 - (v / max) * 36}`).join(" ");
  return (
    <svg className="cs-spark" viewBox="0 0 170 42" preserveAspectRatio="none">
      <polygon points={`${pts} 170,42 0,42`} fill={color} opacity="0.1" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Cards, pills, tables ───────────────────────────────────────────── */
export function Card({ title, action, children, className = "", pad = true }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; pad?: boolean }) {
  return (
    <section className={`cs-card ${pad ? "cs-card-pad" : ""} ${className}`}>
      {(title || action) && (
        <header className="cs-card-head">
          <h3>{title}</h3>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function StatCard({ label, value, sub, tone = "purple", icon = "trend", spark }: { label: string; value: ReactNode; sub?: ReactNode; tone?: keyof typeof TONE | string; icon?: string; spark?: number[] }) {
  const t = TONE[tone] ?? TONE.purple;
  return (
    <div className="cs-stat">
      <div className="cs-stat-top">
        <span className="cs-stat-label">{label}</span>
        <span className="cs-stat-icon" style={{ background: t.bg, color: t.fg }}><Icon name={icon} size={16} /></span>
      </div>
      <div className="cs-stat-value">{value}</div>
      {sub && <div className="cs-stat-sub">{sub}</div>}
      {spark && spark.length > 1 && <div className="cs-stat-spark"><Sparkline data={spark} color={t.fg} /></div>}
    </div>
  );
}

export function Pill({ children, tone = "green" }: { children: ReactNode; tone?: keyof typeof TONE | string }) {
  const t = TONE[tone] ?? TONE.green;
  return <span className="cs-pill" style={{ background: t.bg, color: t.fg, borderColor: `${t.fg}33` }}>{children}</span>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="cs-empty">{children}</p>;
}

/** Banner for a failed backend call — states the platform and what to do. */
export function ErrorNote({ error, platform }: { error: string; platform: PlatformKey }) {
  return (
    <div className="cs-error">
      <span className="cs-error-icon"><Icon name="alert" size={15} /></span>
      <div>
        <b>{error}</b>
        <span>
          Connect {platformLabel(platform)} on the <Link href="/connect">Connect page</Link>, and check its backend is running.
        </span>
      </div>
    </div>
  );
}

/* ── Shell ──────────────────────────────────────────────────────────── */
export interface NavItem {
  label: string;
  icon: string;
  slug: string;
}

export function SpecialShell({
  platform,
  agentLabel,
  tagline,
  basePath,
  nav,
  headerIcon = "dashboard",
  assistantBlurb,
  title,
  subtitle,
  actions,
  children,
}: {
  platform: PlatformKey;
  /** The agent own name, e.g. "Analytics Agent". */
  agentLabel: string;
  /** Sidebar sub-label under the platform name. */
  tagline: string;
  /** Route root for this agent, e.g. "/analytics-agent-special". */
  basePath: string;
  nav: NavItem[];
  headerIcon?: string;
  assistantBlurb: string;
  title: string;
  subtitle: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const label = platformLabel(platform);

  return (
    <div className="cs-app">
      <style>{CSS}</style>

      <aside className="cs-sidebar">
        <div className="cs-brand">
          <span className="cs-brand-mark" style={{ background: platform === "ghrfix" ? "#7c3aed" : "#d61d8c" }}>
            {label.slice(0, 1)}
          </span>
          <div>
            <div className="cs-brand-name">{label}</div>
            <div className="cs-brand-tag">{tagline}</div>
          </div>
        </div>

        <Link href="/ai-agents" className="cs-back"><Icon name="back" size={13} />All agents</Link>

        <nav className="cs-nav">
          {nav.map((item) => {
            const href = `${basePath}/${platform}/${item.slug}`;
            return (
              <Link key={item.slug} href={href} className={pathname === href ? "cs-nav-item active" : "cs-nav-item"}>
                <Icon name={item.icon} size={17} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="cs-assistant">
          <div className="cs-assistant-title">{agentLabel}</div>
          <Robot />
          <p>{assistantBlurb}</p>
          <Link href={`${basePath}/${platform}/chat`} className="cs-assistant-btn">Ask the agent</Link>
        </div>
      </aside>

      <main className="cs-main">
        <header className="cs-topbar">
          <div className="cs-topbar-title">
            <span className="cs-topbar-mark"><Icon name={headerIcon} size={20} /></span>
            <div>
              <h1>{label} — {title}</h1>
              <p>{subtitle}</p>
            </div>
          </div>
          <div className="cs-topbar-actions">
            {actions}
            <button type="button" className="cs-icon-btn" aria-label="Notifications"><Icon name="bell" size={17} /></button>
            <div className="cs-user">
              <span className="cs-avatar">AU</span>
              <div>
                <b>Admin</b>
                <small>Super Admin</small>
              </div>
            </div>
          </div>
        </header>

        <div className="cs-content">{children}</div>
      </main>
    </div>
  );
}

/** The assistant mascot used in the sidebar card. */
export function Robot({ scale = 1 }: { scale?: number }) {
  return (
    <div className="cs-robot" style={{ transform: `scale(${scale})` }}>
      <span className="cs-robot-antenna" />
      <span className="cs-robot-head">
        <span className="cs-robot-face"><i /><i /></span>
      </span>
      <span className="cs-robot-ear l" />
      <span className="cs-robot-ear r" />
      <span className="cs-robot-body" />
      <span className="cs-robot-arm l" />
      <span className="cs-robot-arm r" />
    </div>
  );
}

/* ── Stylesheet ─────────────────────────────────────────────────────── */
const CSS = `
.cs-app{--cs-purple:#7c3aed;--cs-ink:#11162d;--cs-ink-soft:#4c5470;--cs-muted:#69738c;--cs-line:#eef0f5;--cs-line-soft:#f4f5f9;--cs-bg:#fafbfe;--cs-green:#0f9e69;--cs-red:#e04452;--cs-amber:#c9860f;
  min-height:100vh;background:var(--cs-bg);color:var(--cs-ink);display:flex;
  font-family:var(--font-inter),Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;letter-spacing:-.005em}
.cs-app *{box-sizing:border-box;min-width:0}
.cs-app button,.cs-app input,.cs-app select,.cs-app textarea{font:inherit;color:inherit}
.cs-app button{cursor:pointer}
.cs-app a{color:inherit;text-decoration:none}
.cs-app :focus-visible{outline:2px solid var(--cs-purple);outline-offset:2px;border-radius:6px}

/* Sidebar */
.cs-sidebar{position:fixed;left:0;top:0;bottom:0;width:232px;background:#fff;border-right:1px solid var(--cs-line);padding:20px 14px;display:flex;flex-direction:column;z-index:10;overflow-y:auto}
.cs-brand{display:flex;align-items:center;gap:10px;padding:0 4px}
.cs-brand-mark{width:36px;height:36px;border-radius:11px;color:#fff;display:grid;place-items:center;font-size:16px;font-weight:800;flex:0 0 auto}
.cs-brand-name{font-size:15px;font-weight:780;letter-spacing:-.3px}
.cs-brand-tag{font-size:10px;color:var(--cs-muted);margin-top:1px}
.cs-back{display:flex;align-items:center;gap:7px;font-size:11px;font-weight:600;color:var(--cs-muted);padding:8px 10px;border-radius:8px;margin:14px 0 6px}
.cs-back:hover{background:var(--cs-bg);color:var(--cs-ink)}
.cs-nav{display:flex;flex-direction:column;gap:3px}
.cs-nav-item{height:41px;border-radius:8px;display:flex;align-items:center;gap:13px;padding:0 12px;font-size:13px;font-weight:550;color:var(--cs-ink-soft);transition:background .15s ease,color .15s ease}
.cs-nav-item svg{color:#7b8399;flex:0 0 auto}
.cs-nav-item:hover{background:var(--cs-bg);color:var(--cs-ink)}
.cs-nav-item.active{background:linear-gradient(90deg,#7238df,#8b5cf6);color:#fff;font-weight:670;box-shadow:0 6px 14px rgba(113,59,230,.2)}
.cs-nav-item.active svg{color:#fff}

.cs-assistant{margin-top:auto;border:1px solid #eeeafa;border-radius:12px;background:linear-gradient(180deg,#faf9ff,#fff);padding:15px 13px;text-align:center}
.cs-assistant-title{font-size:13px;font-weight:750;color:#6941c6}
.cs-assistant p{font-size:11px;line-height:18px;color:var(--cs-ink-soft);margin:8px 0 12px}
.cs-assistant-btn{display:block;height:35px;line-height:35px;border-radius:8px;background:linear-gradient(90deg,#7137dc,#8b5cf6);color:#fff;font-size:12px;font-weight:650;box-shadow:0 5px 12px rgba(113,59,230,.2)}

/* Robot */
.cs-robot{width:96px;height:92px;position:relative;margin:10px auto 2px}
.cs-robot span{position:absolute}
.cs-robot-antenna{left:45px;top:0;width:6px;height:13px;background:#d8cef7;border-radius:5px}
.cs-robot-antenna:after{content:"";position:absolute;width:9px;height:9px;border-radius:50%;background:#8052ed;left:-1.5px;top:-5px}
.cs-robot-head{left:22px;top:11px;width:53px;height:44px;border-radius:17px;background:linear-gradient(145deg,#fff,#e6e0f8);box-shadow:inset 0 -5px 9px rgba(79,50,150,.12),0 5px 8px rgba(50,35,110,.1)}
.cs-robot-face{position:absolute;left:7px;top:9px;width:39px;height:26px;border-radius:11px;background:#0d1233;display:flex;align-items:center;justify-content:center;gap:11px}
.cs-robot-face i{width:6px;height:6px;border-radius:50%;background:#9b60ff;box-shadow:0 0 7px #8e50ff}
.cs-robot-ear{top:26px;width:11px;height:20px;border-radius:6px;background:#d7cdf4}
.cs-robot-ear.l{left:14px}.cs-robot-ear.r{right:14px}
.cs-robot-body{left:33px;top:52px;width:31px;height:33px;border-radius:11px 11px 14px 14px;background:linear-gradient(145deg,#fff,#e6e0f8);box-shadow:inset 0 -5px 8px rgba(79,50,150,.12)}
.cs-robot-arm{width:13px;height:28px;border-radius:9px;background:#e4def5;top:55px}
.cs-robot-arm.l{left:18px;transform:rotate(20deg)}.cs-robot-arm.r{right:18px;transform:rotate(-20deg)}

/* Main */
.cs-main{margin-left:232px;width:calc(100% - 232px);min-height:100vh;display:flex;flex-direction:column}
.cs-topbar{min-height:86px;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px 24px;background:#fff;border-bottom:1px solid var(--cs-line);position:sticky;top:0;z-index:9;flex-wrap:wrap}
.cs-topbar-title{display:flex;align-items:center;gap:13px;min-width:0}
.cs-topbar-mark{width:44px;height:44px;border-radius:13px;background:#f2edff;color:var(--cs-purple);display:grid;place-items:center;flex:0 0 auto}
.cs-topbar h1{margin:0;font-size:19px;font-weight:770;letter-spacing:-.4px}
.cs-topbar p{margin:3px 0 0;font-size:12px;color:var(--cs-muted)}
.cs-topbar-actions{display:flex;align-items:center;gap:11px;margin-left:auto}
.cs-icon-btn{width:38px;height:38px;border-radius:10px;border:1px solid #e4e7ef;background:#fff;color:var(--cs-ink-soft);display:grid;place-items:center}
.cs-icon-btn:hover{background:var(--cs-bg)}
.cs-user{display:flex;align-items:center;gap:9px}
.cs-avatar{width:36px;height:36px;border-radius:50%;background:linear-gradient(145deg,#7c3aed,#4c1d95);color:#fff;display:grid;place-items:center;font-size:11px;font-weight:700}
.cs-user b{display:block;font-size:12px}
.cs-user small{display:block;font-size:10px;color:var(--cs-muted);margin-top:1px}
.cs-btn{height:36px;padding:0 14px;border-radius:8px;border:1px solid #dfe2ea;background:#fff;color:var(--cs-ink);font-size:12px;font-weight:600;display:inline-flex;align-items:center;gap:7px}
.cs-btn:hover{background:var(--cs-bg)}
.cs-btn-primary{border:0;background:linear-gradient(90deg,#7440df,#8b5cf6);color:#fff;box-shadow:0 5px 12px rgba(116,64,223,.2)}
.cs-content{padding:20px 24px 32px;display:flex;flex-direction:column;gap:14px}

/* Cards */
.cs-card{background:#fff;border:1px solid var(--cs-line);border-radius:12px;box-shadow:0 2px 9px rgba(25,34,75,.035)}
.cs-card-pad{padding:17px 19px}
.cs-card-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px}
.cs-card-head h3{margin:0;font-size:13px;font-weight:750;letter-spacing:-.2px}
.cs-grid{display:grid;gap:12px}
.cs-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px}
.cs-stat{background:#fff;border:1px solid var(--cs-line);border-radius:12px;box-shadow:0 2px 9px rgba(25,34,75,.035);padding:16px 17px 13px;position:relative;overflow:hidden}
.cs-stat-top{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}
.cs-stat-label{font-size:11.5px;font-weight:640;color:var(--cs-ink-soft)}
.cs-stat-icon{width:32px;height:32px;border-radius:9px;display:grid;place-items:center;flex:0 0 auto}
.cs-stat-value{font-size:25px;font-weight:790;letter-spacing:-.9px;margin-top:9px;font-variant-numeric:tabular-nums}
.cs-stat-sub{font-size:11px;color:var(--cs-muted);margin-top:4px}
.cs-stat-sub .up{color:var(--cs-green);font-weight:700}
.cs-stat-sub .down{color:var(--cs-red);font-weight:700}
.cs-stat-spark{height:40px;margin:8px -17px -13px}
.cs-spark{width:100%;height:100%;display:block}

/* Donut + legend */
.cs-donut{border-radius:50%;display:grid;place-items:center;position:relative;flex:0 0 auto}
.cs-donut-hole{position:absolute;background:#fff;border-radius:50%;display:grid;place-items:center;align-content:center;text-align:center}
.cs-donut-hole strong{font-size:19px;font-weight:790;letter-spacing:-.5px;font-variant-numeric:tabular-nums}
.cs-donut-hole span{font-size:9.5px;color:var(--cs-muted);margin-top:2px}
.cs-donut-row{display:flex;align-items:center;gap:20px;flex-wrap:wrap}
.cs-legend{display:flex;flex-direction:column;gap:9px;flex:1;min-width:150px}
.cs-legend-row{display:flex;align-items:center;gap:9px;font-size:11.5px}
.cs-legend-row i{width:10px;height:10px;border-radius:3px;flex:0 0 auto}
.cs-legend-row span{color:var(--cs-ink-soft);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cs-legend-row b{font-weight:730;font-variant-numeric:tabular-nums}
.cs-legend-row em{font-style:normal;color:var(--cs-muted);font-size:10.5px;width:34px;text-align:right}

/* Chart */
.cs-chart{position:relative}
.cs-chart svg{display:block;overflow:visible}
.cs-chart-x{display:flex;justify-content:space-between;font-size:10px;color:var(--cs-muted);margin-top:6px}
.cs-chart-legend{display:flex;gap:16px;font-size:11px;color:var(--cs-ink-soft);margin-top:10px;flex-wrap:wrap}
.cs-chart-legend i{width:9px;height:9px;border-radius:50%;display:inline-block;margin-right:6px}
.cs-tip{position:absolute;top:0;transform:translateX(-50%);background:#11162f;color:#fff;border-radius:8px;padding:8px 11px;font-size:10.5px;line-height:17px;pointer-events:none;box-shadow:0 12px 28px rgba(20,20,45,.22);white-space:nowrap;z-index:3}
.cs-tip b{display:block;margin-bottom:3px;font-size:10px;color:#b9bed4}
.cs-tip span{display:block}
.cs-tip i{width:8px;height:8px;border-radius:50%;display:inline-block;margin-right:6px}

/* Bars */
.cs-bars{display:flex;flex-direction:column;gap:12px}
.cs-bar-head{display:flex;justify-content:space-between;gap:10px;font-size:11.5px;margin-bottom:5px}
.cs-bar-head span{color:var(--cs-ink-soft);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cs-bar-head b{font-weight:730;font-variant-numeric:tabular-nums}
.cs-bar-track{height:7px;border-radius:5px;background:#f0f2f7;overflow:hidden}
.cs-bar-fill{height:100%;border-radius:5px}

/* Table */
.cs-table-wrap{overflow-x:auto}
.cs-table{width:100%;border-collapse:collapse;font-size:12px}
.cs-table th{text-align:left;font-size:10.5px;font-weight:650;color:var(--cs-muted);padding:0 12px 10px;white-space:nowrap}
.cs-table td{padding:12px;border-top:1px solid var(--cs-line);vertical-align:middle}
.cs-table tbody tr:hover{background:#fbfbfe}
.cs-table .title{font-weight:660;color:var(--cs-ink)}
.cs-table .sub{font-size:10.5px;color:var(--cs-muted);margin-top:3px}
.cs-num{font-variant-numeric:tabular-nums;text-align:right}

.cs-pill{display:inline-flex;align-items:center;gap:5px;height:23px;padding:0 9px;border-radius:6px;border:1px solid;font-size:10.5px;font-weight:640;white-space:nowrap}
.cs-empty{margin:0;font-size:12px;color:var(--cs-muted);padding:10px 0}

.cs-error{display:flex;gap:11px;align-items:flex-start;border:1px solid #f6d5d8;background:#fff5f5;border-radius:11px;padding:13px 15px}
.cs-error-icon{width:28px;height:28px;border-radius:8px;background:#ffe3e5;color:var(--cs-red);display:grid;place-items:center;flex:0 0 auto}
.cs-error b{display:block;font-size:12.5px;color:#a32732}
.cs-error span{display:block;font-size:11.5px;color:var(--cs-ink-soft);margin-top:3px}
.cs-error a{color:var(--cs-purple);font-weight:650;text-decoration:underline}

/* Tabs + search */
.cs-tabs{display:flex;gap:4px;border-bottom:1px solid var(--cs-line);flex-wrap:wrap}
.cs-tab{height:36px;padding:0 14px;border:0;background:none;color:var(--cs-ink-soft);font-size:12px;font-weight:600;border-bottom:2px solid transparent}
.cs-tab.active{color:var(--cs-purple);border-color:var(--cs-purple)}
.cs-search{height:36px;display:flex;align-items:center;gap:8px;padding:0 12px;border:1px solid #dfe2ea;border-radius:8px;background:#fff;min-width:200px;color:var(--cs-muted)}
.cs-search input{border:0;outline:0;width:100%;font-size:12px;background:transparent;color:var(--cs-ink)}

/* Layout helpers */
.cs-row-2{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);gap:12px}
.cs-row-3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.cs-row-half{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}

@media (max-width:1180px){
  .cs-sidebar{position:relative;width:100%;height:auto;inset:auto;border-right:0;border-bottom:1px solid var(--cs-line);flex-direction:column}
  .cs-app{flex-direction:column}
  .cs-main{margin-left:0;width:100%}
  .cs-assistant{margin-top:14px}
  .cs-row-2,.cs-row-3,.cs-row-half{grid-template-columns:1fr}
}
@media (prefers-reduced-motion:reduce){
  .cs-app *{transition:none!important;animation:none!important}
}
`;
