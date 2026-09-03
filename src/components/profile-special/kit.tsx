"use client";

/**
 * Profile Agent Special — shared UI kit.
 *
 * The sibling of the Content Agent Special kit, and deliberately a near-copy
 * of it: same components, same layout system, same validated palette, so the
 * two sections read as one product rather than two. Nothing is shared by
 * import, because each "special" section owns its own stylesheet and the
 * Content kit is not ours to change. Every class name below is namespaced
 * under `.ps-` so nothing here can collide with `cs-*`, `ag-*`, `dc-*`, or
 * the unnamespaced globals the earlier special pages declare.
 *
 * Layout follows the established 1536-wide composition: a fixed 232px
 * sidebar with the assistant card pinned to its base, and a fluid main column
 * beside it. Below 1180px the sidebar retracts so the page reflows instead of
 * clipping — the composition is preserved at full size, not enforced past it.
 */

import type { ReactNode } from "react";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { platformLabel, platformLogoUrl } from "@/lib/agent-data";
import type { PlatformKey } from "@/lib/platforms";
import {
  VERIFICATION_ICON,
  VERIFICATION_LABEL,
  VERIFICATION_TONE,
  type ProfileRow,
  type VerificationState,
} from "@/lib/profile-data";

/* ── Series colors ────────────────────────────────────────────────────
   Mirrors the Command Centre's own accent palette (dashboard.css) so
   every chart in this kit reads as part of the same product on the
   dark #0b1220 card surface. Assigned in fixed order and never cycled,
   so a category keeps its color when the set is filtered. Every chart
   drawn from these ships a directly-labelled legend, which is also what
   makes the one adjacent pair sitting in the CVD floor band legible.
   ─────────────────────────────────────────────────────────────────── */
export const SERIES = ["#8b5cf6", "#38bdf8", "#22c55e", "#f59e0b", "#f43f5e", "#22d3ee"];

export const TONE: Record<string, { fg: string; bg: string }> = {
  purple: { fg: "#8b5cf6", bg: "rgba(139,92,246,.14)" },
  blue: { fg: "#38bdf8", bg: "rgba(56,189,248,.14)" },
  green: { fg: "#22c55e", bg: "rgba(34,197,94,.14)" },
  amber: { fg: "#f59e0b", bg: "rgba(245,158,11,.14)" },
  red: { fg: "#f43f5e", bg: "rgba(244,63,94,.14)" },
  cyan: { fg: "#22d3ee", bg: "rgba(34,211,238,.14)" },
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
    stops.push(`${color} ${from}% ${to}%`, `#0b1220 ${to}% ${Math.min(100, to + 0.6)}%`);
  });
  const bg = sum > 0 ? `conic-gradient(${stops.join(",")})` : "conic-gradient(rgba(255,255,255,.08) 0 100%)";
  return (
    <div className="ps-donut" style={{ width: size, height: size, background: bg }}>
      <div className="ps-donut-hole" style={{ inset: size * 0.19 }}>
        <strong>{center ?? sum.toLocaleString()}</strong>
        <span>{centerLabel}</span>
      </div>
    </div>
  );
}

export function Legend({ data, showPct = true }: { data: Slice[]; showPct?: boolean }) {
  const sum = data.reduce((a, b) => a + b.value, 0);
  if (data.length === 0) return <p className="ps-empty">No data yet.</p>;
  return (
    <div className="ps-legend">
      {data.map((d, i) => (
        <div className="ps-legend-row" key={d.label}>
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
export function ScoreRing({ value, max = 100, size = 118, color = "#8b5cf6", label = "Score" }: { value: number; max?: number; size?: number; color?: string; label?: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="ps-donut" style={{ width: size, height: size, background: `conic-gradient(${color} 0 ${pct}%, rgba(255,255,255,.08) ${pct}% 100%)` }}>
      <div className="ps-donut-hole" style={{ inset: size * 0.115 }}>
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
    <div className="ps-chart">
      <svg viewBox={`0 0 ${W} ${height}`} width="100%" height={height} preserveAspectRatio="none" onMouseLeave={() => setHover(null)}>
        <defs>
          {series.map((s, i) => {
            const c = s.color ?? SERIES[i % SERIES.length];
            return (
              <linearGradient key={i} id={`ps-fill-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={c} stopOpacity="0.22" />
                <stop offset="100%" stopColor={c} stopOpacity="0.01" />
              </linearGradient>
            );
          })}
        </defs>

        {gridY.map((y, i) => <line key={i} x1={padL} x2={W - padR} y1={y} y2={y} stroke="rgba(255,255,255,.07)" strokeWidth="1" />)}
        {gridY.map((y, i) => (
          <text key={`y${i}`} x={padL - 9} y={y + 3.5} textAnchor="end" fontSize="10" fill="#5b6780">
            {Math.round(max - (i / (ticks - 1)) * max).toLocaleString()}
          </text>
        ))}

        {series.map((s, i) => {
          const c = s.color ?? SERIES[i % SERIES.length];
          const { line, area } = path(s.data);
          return (
            <g key={i}>
              <path d={area} fill={`url(#ps-fill-${i})`} />
              <path d={line} fill="none" stroke={c} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              {s.data.map((v, j) => (
                <circle key={j} cx={xAt(j)} cy={yAt(v)} r={hover === j ? 5 : 3.2} fill="#0b1220" stroke={c} strokeWidth="2.2" />
              ))}
            </g>
          );
        })}

        {hover !== null && <line x1={xAt(hover)} x2={xAt(hover)} y1={padT} y2={padT + plotH} stroke="rgba(255,255,255,.18)" strokeWidth="1" strokeDasharray="3 3" />}
        {labels.map((_, i) => (
          <rect key={i} x={xAt(i) - plotW / n / 2} y={padT} width={plotW / n} height={plotH} fill="transparent" onMouseEnter={() => setHover(i)} />
        ))}
      </svg>

      {hover !== null && (
        <div className="ps-tip" style={{ left: `${(xAt(hover) / W) * 100}%` }}>
          <b>{labels[hover]}</b>
          {series.map((s, i) => (
            <span key={i}>
              <i style={{ background: s.color ?? SERIES[i % SERIES.length] }} />
              {s.name}: <strong>{(s.data[hover] ?? 0).toLocaleString()}{suffix}</strong>
            </span>
          ))}
        </div>
      )}

      <div className="ps-chart-x" style={{ paddingLeft: `${(padL / W) * 100}%`, paddingRight: `${(padR / W) * 100}%` }}>
        {labels.map((l, i) => <span key={i}>{l}</span>)}
      </div>

      <div className="ps-chart-legend">
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
  if (rows.length === 0) return <p className="ps-empty">No data yet.</p>;
  return (
    <div className="ps-bars">
      {rows.map((r, i) => (
        <div className="ps-bar-row" key={r.label}>
          <div className="ps-bar-head">
            <span>{r.label}</span>
            <b>{r.value.toLocaleString()}{suffix}</b>
          </div>
          <div className="ps-bar-track">
            <div className="ps-bar-fill" style={{ width: `${(r.value / max) * 100}%`, background: colored ? r.color ?? SERIES[i % SERIES.length] : "#8b5cf6" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Sparkline ──────────────────────────────────────────────────────── */
export function Sparkline({ data, color = "#8b5cf6" }: { data: number[]; color?: string }) {
  if (data.length < 2) return null;
  const max = Math.max(1, ...data);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 170},${42 - (v / max) * 36}`).join(" ");
  return (
    <svg className="ps-spark" viewBox="0 0 170 42" preserveAspectRatio="none">
      <polygon points={`${pts} 170,42 0,42`} fill={color} opacity="0.1" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Cards, pills, tables ───────────────────────────────────────────── */
export function Card({ title, action, children, className = "", pad = true }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; pad?: boolean }) {
  return (
    <section className={`ps-card ${pad ? "ps-card-pad" : ""} ${className}`}>
      {(title || action) && (
        <header className="ps-card-head">
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
    <div className="ps-stat">
      <div className="ps-stat-top">
        <span className="ps-stat-label">{label}</span>
        <span className="ps-stat-icon" style={{ background: t.bg, color: t.fg }}><Icon name={icon} size={16} /></span>
      </div>
      <div className="ps-stat-value">{value}</div>
      {sub && <div className="ps-stat-sub">{sub}</div>}
      {spark && spark.length > 1 && <div className="ps-stat-spark"><Sparkline data={spark} color={t.fg} /></div>}
    </div>
  );
}

export function Pill({ children, tone = "green" }: { children: ReactNode; tone?: keyof typeof TONE | string }) {
  const t = TONE[tone] ?? TONE.green;
  return <span className="ps-pill" style={{ background: t.bg, color: t.fg, borderColor: `${t.fg}33` }}>{children}</span>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="ps-empty">{children}</p>;
}

/** Banner for a failed backend call — states the platform and what to do. */
export function ErrorNote({ error, platform }: { error: string; platform: PlatformKey }) {
  return (
    <div className="ps-error">
      <span className="ps-error-icon"><Icon name="alert" size={15} /></span>
      <div>
        <b>{error}</b>
        <span>
          Connect {platformLabel(platform)} on the <Link href="/connect">Connect page</Link>, and check its backend is running.
        </span>
      </div>
    </div>
  );
}

/**
 * Not an error — a partial or explanatory notice. Shown when one leg of a
 * multi-endpoint fetch failed (so the page is showing a genuine but incomplete
 * picture), or when the active platform simply does not track a field. Amber,
 * glyphed and worded, never colour alone.
 */
export function PartialNote({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="ps-note" role="status">
      <span className="ps-note-icon"><Icon name="alert" size={15} /></span>
      <div>
        <b>{title}</b>
        <span>{children}</span>
      </div>
    </div>
  );
}

/**
 * A value the active platform genuinely does not track. Never a zero, which
 * would read as a real measurement of "none".
 */
export function NotTracked({ what, platform }: { what: string; platform: PlatformKey }) {
  return (
    <span className="ps-nottracked">
      <Icon name="search" size={12} />
      Not tracked — {platformLabel(platform)} exposes no {what}.
    </span>
  );
}

/**
 * Verification state as a pill. Colour is never the only signal: every state
 * also carries its own glyph and its own words.
 */
export function VerificationMark({ state }: { state: VerificationState }) {
  return (
    <Pill tone={VERIFICATION_TONE[state]}>
      <Icon name={VERIFICATION_ICON[state]} size={12} />
      {VERIFICATION_LABEL[state]}
    </Pill>
  );
}

/** Present / missing / unknown — never colour alone, always a glyph and a word. */
export function FieldMark({ ok, unknownLabel = "Not audited" }: { ok: boolean | null; unknownLabel?: string }) {
  if (ok === null) return <Pill tone="purple"><Icon name="search" size={12} />{unknownLabel}</Pill>;
  return ok ? (
    <Pill tone="green"><Icon name="check" size={12} />Present</Pill>
  ) : (
    <Pill tone="red"><Icon name="alert" size={12} />Missing</Pill>
  );
}

/** The row's ranking score with its band spelled out beside it, never colour alone. */
export function StrengthPill({ row }: { row: ProfileRow }) {
  const tone =
    row.strengthBand === "Strong"
      ? "green"
      : row.strengthBand === "Moderate"
        ? "blue"
        : row.strengthBand === "Weak"
          ? "amber"
          : "red";
  return (
    <Pill tone={tone}>
      {row.strengthPct === null ? "—" : `${row.strengthPct}%`} · {row.strengthBand}
    </Pill>
  );
}

/* ── Shell ──────────────────────────────────────────────────────────── */
export interface NavItem {
  label: string;
  icon: string;
  slug: string;
}

export const PROFILE_NAV: NavItem[] = [
  { label: "Overview", icon: "dashboard", slug: "overview" },
  { label: "Profiles", icon: "users", slug: "profiles" },
  { label: "AI Recommendations", icon: "sparkle", slug: "recommendations" },
  { label: "Chat", icon: "bot", slug: "chat" },
];

export function ProfileShell({
  platform,
  title,
  subtitle,
  actions,
  children,
}: {
  platform: PlatformKey;
  title: string;
  subtitle: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const label = platformLabel(platform);
  const logoUrl = platformLogoUrl(platform);

  return (
    <div className="ps-app">
      <style>{CSS}</style>

      <aside className="ps-sidebar">
        <div className="ps-brand">
          <img className="ps-brand-mark" src={logoUrl} alt={`${label} logo`} style={{ objectFit: "contain" }} />
          <div>
            <div className="ps-brand-name">{label}</div>
            <div className="ps-brand-tag">Profile Agent Special</div>
          </div>
        </div>

        <Link href="/ai-agents" className="ps-back"><Icon name="back" size={13} />All agents</Link>

        <nav className="ps-nav">
          {PROFILE_NAV.map((item) => {
            const href = `/profile-agent-special/${platform}/${item.slug}`;
            return (
              <Link key={item.slug} href={href} className={pathname === href ? "ps-nav-item active" : "ps-nav-item"}>
                <Icon name={item.icon} size={17} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ps-assistant">
          <div className="ps-assistant-title">Profile AI Agent</div>
          <Robot />
          <p>I score every member profile, find the gaps, and tell you which ones to nudge first.</p>
          <Link href={`/profile-agent-special/${platform}/chat`} className="ps-assistant-btn">Ask the agent</Link>
        </div>
      </aside>

      <main className="ps-main">
        <header className="ps-topbar">
          <div className="ps-topbar-title">
            <span className="ps-topbar-mark"><Icon name="users" size={20} /></span>
            <div>
              <h1>{label} — {title}</h1>
              <p>{subtitle}</p>
            </div>
          </div>
          <div className="ps-topbar-actions">
            {actions}
            <button type="button" className="ps-icon-btn" aria-label="Notifications"><Icon name="bell" size={17} /></button>
            <div className="ps-user">
              <span className="ps-avatar">AU</span>
              <div>
                <b>Admin</b>
                <small>Super Admin</small>
              </div>
            </div>
          </div>
        </header>

        <div className="ps-content">{children}</div>
      </main>
    </div>
  );
}

/** The assistant mascot used in the sidebar card. */
export function Robot({ scale = 1 }: { scale?: number }) {
  return (
    <div className="ps-robot" style={{ transform: `scale(${scale})` }}>
      <span className="ps-robot-antenna" />
      <span className="ps-robot-head">
        <span className="ps-robot-face"><i /><i /></span>
      </span>
      <span className="ps-robot-ear l" />
      <span className="ps-robot-ear r" />
      <span className="ps-robot-body" />
      <span className="ps-robot-arm l" />
      <span className="ps-robot-arm r" />
    </div>
  );
}

/* ── Stylesheet ─────────────────────────────────────────────────────── */
const CSS = `
.ps-app{--ps-purple:#8b5cf6;--ps-ink:#f1f5f9;--ps-ink-soft:#94a3b8;--ps-muted:#5b6780;--ps-line:rgba(255,255,255,.07);--ps-line-soft:rgba(255,255,255,.05);--ps-bg:#030712;--ps-green:#22c55e;--ps-red:#f43f5e;--ps-amber:#f59e0b;
  min-height:100vh;background:var(--ps-bg);color:var(--ps-ink);display:flex;
  font-family:var(--font-inter),Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;letter-spacing:-.005em}
.ps-app *{box-sizing:border-box;min-width:0}
.ps-app button,.ps-app input,.ps-app select,.ps-app textarea{font:inherit;color:inherit}
.ps-app button{cursor:pointer}
.ps-app a{color:inherit;text-decoration:none}
.ps-app :focus-visible{outline:2px solid var(--ps-purple);outline-offset:2px;border-radius:6px}

/* Sidebar */
.ps-sidebar{position:fixed;left:0;top:0;bottom:0;width:232px;background:#05080f;border-right:1px solid var(--ps-line);padding:20px 14px;display:flex;flex-direction:column;z-index:10;overflow-y:auto}
.ps-brand{display:flex;align-items:center;gap:10px;padding:0 4px}
.ps-brand-mark{width:36px;height:36px;border-radius:11px;object-fit:contain;flex:0 0 auto}
.ps-brand-name{font-size:15px;font-weight:780;letter-spacing:-.3px}
.ps-brand-tag{font-size:10px;color:var(--ps-muted);margin-top:1px}
.ps-back{display:flex;align-items:center;gap:7px;font-size:11px;font-weight:600;color:var(--ps-muted);padding:8px 10px;border-radius:8px;margin:14px 0 6px}
.ps-back:hover{background:rgba(255,255,255,.06);color:var(--ps-ink)}
.ps-nav{display:flex;flex-direction:column;gap:3px}
.ps-nav-item{height:41px;border-radius:8px;display:flex;align-items:center;gap:13px;padding:0 12px;font-size:13px;font-weight:550;color:var(--ps-ink-soft);transition:background .15s ease,color .15s ease}
.ps-nav-item svg{color:var(--ps-muted);flex:0 0 auto}
.ps-nav-item:hover{background:rgba(255,255,255,.04);color:var(--ps-ink)}
.ps-nav-item.active{background:linear-gradient(90deg,#7c3aed,#8b5cf6);color:#fff;font-weight:670;box-shadow:0 6px 14px rgba(139,92,246,.35)}
.ps-nav-item.active svg{color:#fff}

.ps-assistant{margin-top:auto;border:1px solid rgba(139,92,246,.18);border-radius:12px;background:linear-gradient(180deg,rgba(139,92,246,.06),#0b1220);padding:15px 13px;text-align:center}
.ps-assistant-title{font-size:13px;font-weight:750;color:var(--ps-purple)}
.ps-assistant p{font-size:11px;line-height:18px;color:var(--ps-ink-soft);margin:8px 0 12px}
.ps-assistant-btn{display:block;height:35px;line-height:35px;border-radius:8px;background:linear-gradient(90deg,#7c3aed,#8b5cf6);color:#fff;font-size:12px;font-weight:650;box-shadow:0 5px 12px rgba(139,92,246,.35)}

/* Robot */
.ps-robot{width:96px;height:92px;position:relative;margin:10px auto 2px}
.ps-robot span{position:absolute}
.ps-robot-antenna{left:45px;top:0;width:6px;height:13px;background:#423868;border-radius:5px}
.ps-robot-antenna:after{content:"";position:absolute;width:9px;height:9px;border-radius:50%;background:#8b5cf6;left:-1.5px;top:-5px}
.ps-robot-head{left:22px;top:11px;width:53px;height:44px;border-radius:17px;background:linear-gradient(145deg,#262b45,#14172a);box-shadow:inset 0 -5px 9px rgba(0,0,0,.35),0 5px 8px rgba(0,0,0,.3)}
.ps-robot-face{position:absolute;left:7px;top:9px;width:39px;height:26px;border-radius:11px;background:#0d1233;display:flex;align-items:center;justify-content:center;gap:11px}
.ps-robot-face i{width:6px;height:6px;border-radius:50%;background:#a78bfa;box-shadow:0 0 7px #8b5cf6}
.ps-robot-ear{top:26px;width:11px;height:20px;border-radius:6px;background:#423868}
.ps-robot-ear.l{left:14px}.ps-robot-ear.r{right:14px}
.ps-robot-body{left:33px;top:52px;width:31px;height:33px;border-radius:11px 11px 14px 14px;background:linear-gradient(145deg,#262b45,#14172a);box-shadow:inset 0 -5px 8px rgba(0,0,0,.35)}
.ps-robot-arm{width:13px;height:28px;border-radius:9px;background:#423868;top:55px}
.ps-robot-arm.l{left:18px;transform:rotate(20deg)}.ps-robot-arm.r{right:18px;transform:rotate(-20deg)}

/* Main */
.ps-main{margin-left:232px;width:calc(100% - 232px);min-height:100vh;display:flex;flex-direction:column}
.ps-topbar{min-height:86px;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px 24px;background:#0b1220;border-bottom:1px solid var(--ps-line);position:sticky;top:0;z-index:9;flex-wrap:wrap}
.ps-topbar-title{display:flex;align-items:center;gap:13px;min-width:0}
.ps-topbar-mark{width:44px;height:44px;border-radius:13px;background:rgba(139,92,246,.14);color:var(--ps-purple);display:grid;place-items:center;flex:0 0 auto}
.ps-topbar h1{margin:0;font-size:19px;font-weight:770;letter-spacing:-.4px}
.ps-topbar p{margin:3px 0 0;font-size:12px;color:var(--ps-muted)}
.ps-topbar-actions{display:flex;align-items:center;gap:11px;margin-left:auto}
.ps-icon-btn{width:38px;height:38px;border-radius:10px;border:1px solid var(--ps-line);background:#0b1220;color:var(--ps-ink-soft);display:grid;place-items:center}
.ps-icon-btn:hover{background:rgba(255,255,255,.06)}
.ps-user{display:flex;align-items:center;gap:9px}
.ps-avatar{width:36px;height:36px;border-radius:50%;background:linear-gradient(145deg,#8b5cf6,#4c1d95);color:#fff;display:grid;place-items:center;font-size:11px;font-weight:700}
.ps-user b{display:block;font-size:12px}
.ps-user small{display:block;font-size:10px;color:var(--ps-muted);margin-top:1px}
.ps-btn{height:36px;padding:0 14px;border-radius:8px;border:1px solid var(--ps-line);background:#0b1220;color:var(--ps-ink);font-size:12px;font-weight:600;display:inline-flex;align-items:center;gap:7px}
.ps-btn:hover{background:rgba(255,255,255,.06)}
.ps-btn-primary{border:0;background:linear-gradient(90deg,#7c3aed,#8b5cf6);color:#fff;box-shadow:0 5px 12px rgba(139,92,246,.35)}
.ps-content{padding:20px 24px 32px;display:flex;flex-direction:column;gap:14px}

/* Cards */
.ps-card{background:#0b1220;border:1px solid var(--ps-line);border-radius:12px}
.ps-card-pad{padding:17px 19px}
.ps-card-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px}
.ps-card-head h3{margin:0;font-size:13px;font-weight:750;letter-spacing:-.2px}
.ps-grid{display:grid;gap:12px}
.ps-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px}
.ps-stat{background:#0b1220;border:1px solid var(--ps-line);border-radius:12px;padding:16px 17px 13px;position:relative;overflow:hidden}
.ps-stat-top{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}
.ps-stat-label{font-size:11.5px;font-weight:640;color:var(--ps-ink-soft)}
.ps-stat-icon{width:32px;height:32px;border-radius:9px;display:grid;place-items:center;flex:0 0 auto}
.ps-stat-value{font-size:25px;font-weight:790;letter-spacing:-.9px;margin-top:9px;font-variant-numeric:tabular-nums}
.ps-stat-sub{font-size:11px;color:var(--ps-muted);margin-top:4px}
.ps-stat-sub .up{color:var(--ps-green);font-weight:700}
.ps-stat-sub .down{color:var(--ps-red);font-weight:700}
.ps-stat-spark{height:40px;margin:8px -17px -13px}
.ps-spark{width:100%;height:100%;display:block}

/* Donut + legend */
.ps-donut{border-radius:50%;display:grid;place-items:center;position:relative;flex:0 0 auto}
.ps-donut-hole{position:absolute;background:#0b1220;border-radius:50%;display:grid;place-items:center;align-content:center;text-align:center}
.ps-donut-hole strong{font-size:19px;font-weight:790;letter-spacing:-.5px;font-variant-numeric:tabular-nums}
.ps-donut-hole span{font-size:9.5px;color:var(--ps-muted);margin-top:2px}
.ps-donut-row{display:flex;align-items:center;gap:20px;flex-wrap:wrap}
.ps-legend{display:flex;flex-direction:column;gap:9px;flex:1;min-width:150px}
.ps-legend-row{display:flex;align-items:center;gap:9px;font-size:11.5px}
.ps-legend-row i{width:10px;height:10px;border-radius:3px;flex:0 0 auto}
.ps-legend-row span{color:var(--ps-ink-soft);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ps-legend-row b{font-weight:730;font-variant-numeric:tabular-nums}
.ps-legend-row em{font-style:normal;color:var(--ps-muted);font-size:10.5px;width:34px;text-align:right}

/* Chart */
.ps-chart{position:relative}
.ps-chart svg{display:block;overflow:visible}
.ps-chart-x{display:flex;justify-content:space-between;font-size:10px;color:var(--ps-muted);margin-top:6px}
.ps-chart-legend{display:flex;gap:16px;font-size:11px;color:var(--ps-ink-soft);margin-top:10px;flex-wrap:wrap}
.ps-chart-legend i{width:9px;height:9px;border-radius:50%;display:inline-block;margin-right:6px}
.ps-tip{position:absolute;top:0;transform:translateX(-50%);background:#161b36;border:1px solid rgba(255,255,255,.08);color:#fff;border-radius:8px;padding:8px 11px;font-size:10.5px;line-height:17px;pointer-events:none;box-shadow:0 12px 28px rgba(0,0,0,.5);white-space:nowrap;z-index:3}
.ps-tip b{display:block;margin-bottom:3px;font-size:10px;color:#b9bed4}
.ps-tip span{display:block}
.ps-tip i{width:8px;height:8px;border-radius:50%;display:inline-block;margin-right:6px}

/* Bars */
.ps-bars{display:flex;flex-direction:column;gap:12px}
.ps-bar-head{display:flex;justify-content:space-between;gap:10px;font-size:11.5px;margin-bottom:5px}
.ps-bar-head span{color:var(--ps-ink-soft);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ps-bar-head b{font-weight:730;font-variant-numeric:tabular-nums}
.ps-bar-track{height:7px;border-radius:5px;background:rgba(255,255,255,.08);overflow:hidden}
.ps-bar-fill{height:100%;border-radius:5px}

/* Table */
.ps-table-wrap{overflow-x:auto}
.ps-table{width:100%;border-collapse:collapse;font-size:12px}
.ps-table th{text-align:left;font-size:10.5px;font-weight:650;color:var(--ps-muted);padding:0 12px 10px;white-space:nowrap}
.ps-table td{padding:12px;border-top:1px solid var(--ps-line);vertical-align:middle}
.ps-table tbody tr:hover{background:rgba(255,255,255,.03)}
.ps-table .title{font-weight:660;color:var(--ps-ink)}
.ps-table .sub{font-size:10.5px;color:var(--ps-muted);margin-top:3px}
.ps-num{font-variant-numeric:tabular-nums;text-align:right}

.ps-pill{display:inline-flex;align-items:center;gap:5px;height:23px;padding:0 9px;border-radius:6px;border:1px solid;font-size:10.5px;font-weight:640;white-space:nowrap}
.ps-empty{margin:0;font-size:12px;color:var(--ps-muted);padding:10px 0}

.ps-error{display:flex;gap:11px;align-items:flex-start;border:1px solid rgba(244,63,94,.25);background:rgba(244,63,94,.08);border-radius:11px;padding:13px 15px}
.ps-error-icon{width:28px;height:28px;border-radius:8px;background:rgba(244,63,94,.14);color:var(--ps-red);display:grid;place-items:center;flex:0 0 auto}
.ps-error b{display:block;font-size:12.5px;color:var(--ps-red)}
.ps-error span{display:block;font-size:11.5px;color:var(--ps-ink-soft);margin-top:3px}
.ps-error a{color:var(--ps-purple);font-weight:650;text-decoration:underline}

.ps-note{display:flex;gap:11px;align-items:flex-start;border:1px solid rgba(245,158,11,.25);background:rgba(245,158,11,.08);border-radius:11px;padding:13px 15px}
.ps-note-icon{width:28px;height:28px;border-radius:8px;background:rgba(245,158,11,.14);color:var(--ps-amber);display:grid;place-items:center;flex:0 0 auto}
.ps-note b{display:block;font-size:12.5px;color:var(--ps-amber)}
.ps-note span{display:block;font-size:11.5px;color:var(--ps-ink-soft);margin-top:3px}
.ps-note a{color:var(--ps-purple);font-weight:650;text-decoration:underline}
.ps-nottracked{display:inline-flex;align-items:center;gap:5px;font-size:11px;color:var(--ps-muted);font-style:italic}

/* Tabs + search */
.ps-tabs{display:flex;gap:4px;border-bottom:1px solid var(--ps-line);flex-wrap:wrap}
.ps-tab{height:36px;padding:0 14px;border:0;background:none;color:var(--ps-ink-soft);font-size:12px;font-weight:600;border-bottom:2px solid transparent}
.ps-tab.active{color:var(--ps-purple);border-color:var(--ps-purple)}
.ps-search{height:36px;display:flex;align-items:center;gap:8px;padding:0 12px;border:1px solid var(--ps-line);border-radius:8px;background:#0b1220;min-width:200px;color:var(--ps-muted)}
.ps-search input{border:0;outline:0;width:100%;font-size:12px;background:transparent;color:var(--ps-ink)}

/* Layout helpers */
.ps-row-2{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);gap:12px}
.ps-row-3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.ps-row-half{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}

@media (max-width:1180px){
  .ps-sidebar{position:relative;width:100%;height:auto;inset:auto;border-right:0;border-bottom:1px solid var(--ps-line);flex-direction:column}
  .ps-app{flex-direction:column}
  .ps-main{margin-left:0;width:100%}
  .ps-assistant{margin-top:14px}
  .ps-row-2,.ps-row-3,.ps-row-half{grid-template-columns:1fr}
}
@media (prefers-reduced-motion:reduce){
  .ps-app *{transition:none!important;animation:none!important}
}
`;
