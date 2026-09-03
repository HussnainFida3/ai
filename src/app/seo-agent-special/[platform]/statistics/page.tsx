"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePlatformParam, platformLabel, platformLogoUrl, useSeoAudit, improveSeoPost, type SeoPostRow } from "@/lib/agent-data";

/**
 * ShadiLife.com — Statistics dashboard clone
 * Everything is contained in this single TSX file:
 * - JSX / HTML structure
 * - CSS
 * - SVG icons
 * - SVG charts
 * - Interactions for navigation, filters, export and AI card
 *
 * Designed to visually match the supplied 1536 × 1024 reference.
 */

const Icon = ({
  name,
  size = 18,
  stroke = 1.8,
}: {
  name: string;
  size?: number;
  stroke?: number;
}) => {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: stroke,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  const paths: Record<string, React.ReactNode> = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    trend: <><path d="M3 17l6-6 4 4 8-9"/><path d="M17 6h4v4"/></>,
    edit: <><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.8 1.8 0 0 0 .36 2l.06.06-1.8 1.8-.06-.06a1.8 1.8 0 0 0-2-.36 1.8 1.8 0 0 0-1.1 1.66V20h-2.55v-.1A1.8 1.8 0 0 0 11.2 18.2a1.8 1.8 0 0 0-2 .36l-.06.06-1.8-1.8.06-.06a1.8 1.8 0 0 0 .36-2A1.8 1.8 0 0 0 6.1 13H6v-2h.1A1.8 1.8 0 0 0 7.8 9.9a1.8 1.8 0 0 0-.36-2l-.06-.06 1.8-1.8.06.06a1.8 1.8 0 0 0 2 .36A1.8 1.8 0 0 0 12.3 4.8V4h2.55v.1a1.8 1.8 0 0 0 1.1 1.66 1.8 1.8 0 0 0 2-.36l.06-.06 1.8 1.8-.06.06a1.8 1.8 0 0 0-.36 2A1.8 1.8 0 0 0 21 11h.1v2H21a1.8 1.8 0 0 0-1.6 2Z"/></>,
    link: <><path d="M10 13a5 5 0 0 0 7.54.54l2-2a5 5 0 0 0-7.07-7.07l-1.15 1.15"/><path d="M14 11a5 5 0 0 0-7.54-.54l-2 2a5 5 0 0 0 7.07 7.07l1.15-1.15"/></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    report: <><path d="M4 3h12l4 4v14H4Z"/><path d="M16 3v5h5"/><path d="M8 12h8M8 16h6"/></>,
    ai: <><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/><circle cx="12" cy="12" r="4"/></>,
    tasks: <><rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8 12 2.5 2.5L16 9"/></>,
    download: <><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M4 21h16"/></>,
    calendar: <><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 9h18"/></>,
    chevron: <path d="m7 10 5 5 5-5"/>,
    sparkle: <><path d="m12 2 1.5 5.5L19 9l-5.5 1.5L12 16l-1.5-5.5L5 9l5.5-1.5Z"/><path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7Z"/></>,
    trophy: <><path d="M8 21h8M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0Z"/><path d="M7 6H4v2a4 4 0 0 0 4 4M17 6h3v2a4 4 0 0 1-4 4"/></>,
    target: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></>,
    cart: <><path d="M3 4h2l2 11h11l2-8H6"/><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/></>,
    users2: <><circle cx="9" cy="8" r="4"/><path d="M3 21v-1a6 6 0 0 1 12 0v1"/><path d="M17 4a4 4 0 0 1 0 8"/><path d="M21 21v-1a6 6 0 0 0-4-5.65"/></>,
    chart: <><path d="M4 19V5M4 19h17"/><path d="M7 15l4-5 3 3 5-7"/></>,
    eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>,
    arrow: <><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>,
    globe: <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></>,
  };

  return <svg {...common}>{paths[name] || paths.chart}</svg>;
};

const Sparkline = ({
  points,
  fill = false,
}: {
  points: string;
  fill?: boolean;
}) => (
  <svg className="sparkline" viewBox="0 0 170 42" preserveAspectRatio="none">
    {fill && <path d={`${points} L170 42 L0 42 Z`} className="spark-fill" />}
    <polyline points={points} className="spark-line" />
  </svg>
);

const Donut = ({
  segments,
  center,
  small = false,
}: {
  segments: string;
  center: string;
  small?: boolean;
}) => (
  <div className={`donut-wrap ${small ? "small-donut" : ""}`}>
    <div className="donut" style={{ background: `conic-gradient(${segments})` }}>
      <div className="donut-hole">
        <strong>{center}</strong>
        <span>{small ? "/100" : "Total"}</span>
      </div>
    </div>
  </div>
);

/** Real per-post score chart — one bar per scored post, sorted worst-first, height = score/maxScore. Replaces the fake "Organic Traffic" line chart with something the SEO Agent can actually back up. */
const ScoreBarChart = ({ posts, maxScore }: { posts: SeoPostRow[]; maxScore: number }) => {
  if (posts.length === 0) {
    return <div className="score-bars-empty">No scored posts yet.</div>;
  }
  const sorted = [...posts].sort((a, b) => a.score - b.score);
  return (
    <div className="score-bars">
      {sorted.map((p) => {
        const pct = Math.max(3, Math.round((p.score / maxScore) * 100));
        const tone = p.score >= maxScore - 1 ? "good" : p.score >= maxScore - 3 ? "warn" : "bad";
        return (
          <div className="score-bar-col" key={p.id} title={`${p.title}: ${p.score}/${maxScore}`}>
            <div className={`score-bar-fill ${tone}`} style={{ height: `${pct}%` }} />
          </div>
        );
      })}
    </div>
  );
};

const NavItem = ({
  icon,
  label,
  href,
  active,
}: {
  icon: string;
  label: string;
  href: string;
  active?: boolean;
}) => (
  <Link href={href} className={`nav-item ${active ? "active" : ""}`}>
    <Icon name={icon} size={17}/>
    <span>{label}</span>
  </Link>
);

export default function StatisticsPage({ params }: { params: Promise<{ platform: string }> }) {
  const platform = usePlatformParam(params);
  const pathname = usePathname();
  const audit = useSeoAudit(platform);
  const [range, setRange] = React.useState("May 22, 2025  -  Jun 22, 2025");
  const [showRange, setShowRange] = React.useState(false);
  const [notice, setNotice] = React.useState("");
  const [scoreOverrides, setScoreOverrides] = React.useState<Record<string, number>>({});
  const [fixingId, setFixingId] = React.useState<string | null>(null);

  const nav: Array<[string, string, string]> = [
    ["dashboard", "Overview", "overview"],
    ["ai", "Chat", "chat"],
    ["trend", "Statistics", "statistics"],
    ["report", "AI Recommendations", "recommendations"],
    ["edit", "Blog Optimization", "blog-optimization"],
  ];

  const toast = (text: string) => {
    setNotice(text);
    window.setTimeout(() => setNotice(""), 2300);
  };

  const posts = React.useMemo(
    () => audit.posts.map((p) => (scoreOverrides[p.id] !== undefined ? { ...p, score: scoreOverrides[p.id] } : p)),
    [audit.posts, scoreOverrides],
  );
  const needsAttention = React.useMemo(
    () => posts.filter((p) => p.score < audit.maxScore).sort((a, b) => a.score - b.score),
    [posts, audit.maxScore],
  );
  const healthPct = audit.averageScore == null ? null : Math.round((audit.averageScore / audit.maxScore) * 100);

  const buckets = React.useMemo(() => {
    let b9 = 0, b7 = 0, b5 = 0, bLow = 0;
    for (const p of posts) {
      if (p.score >= 9) b9++;
      else if (p.score >= 7) b7++;
      else if (p.score >= 5) b5++;
      else bLow++;
    }
    return { b9, b7, b5, bLow, total: posts.length };
  }, [posts]);
  const bucketPct = (n: number) => (buckets.total ? Math.round((n / buckets.total) * 1000) / 10 : 0);
  const distSegments = React.useMemo(() => {
    if (!buckets.total) return "rgba(255,255,255,.08) 0% 100%";
    const parts: string[] = [];
    let acc = 0;
    const push = (n: number, color: string) => {
      const start = acc;
      acc += (n / buckets.total) * 100;
      parts.push(`${color} ${start}% ${acc}%`);
    };
    push(buckets.b9, "#22c55e");
    push(buckets.b7, "#38bdf8");
    push(buckets.b5, "#f59e0b");
    push(buckets.bLow, "#f43f5e");
    return parts.join(", ");
  }, [buckets]);

  async function applyFix(row: SeoPostRow) {
    setFixingId(row.id);
    try {
      const newScore = await improveSeoPost(platform, row.id);
      setScoreOverrides((prev) => ({ ...prev, [row.id]: newScore }));
      toast(`Applied AI fix to "${row.title}" — new score ${newScore}/${audit.maxScore}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not apply the AI fix.");
    } finally {
      setFixingId(null);
    }
  }

  const exportReport = () => {
    const lines = [
      `${platformLabel(platform)}.com SEO Statistics Report`,
      "",
      `SEO Score: ${audit.averageScore ?? "—"} / ${audit.maxScore}`,
      `Posts Checked: ${audit.checkedCount ?? "—"} (${audit.checkedScopeLabel || "live scope"})`,
      `Needs Improvement: ${needsAttention.length}`,
      `Most Common Issue: ${audit.topIssue ? `${audit.topIssue.label} (${audit.topIssue.failingPercent ?? "—"}% of checked posts)` : "None detected"}`,
      "",
      "Posts needing attention:",
      ...(needsAttention.length ? needsAttention.map((p) => `- ${p.title}: ${p.score}/${audit.maxScore}`) : ["- None — every checked post is at the maximum score."]),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${platform}-seo-report.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast(audit.loading ? "Report exported (live data still loading)" : "Report exported successfully");
  };

  return (
    <div className="seo-app">
      <style>{`
        *{box-sizing:border-box}
        html,body,#root{margin:0;min-height:100%;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#f1f5f9;background:#030712}
        button{font:inherit}
        .seo-app{min-height:1024px;background:#030712;display:flex;overflow-x:hidden}
        .sidebar{position:fixed;left:0;top:0;bottom:0;width:232px;background:#05080f;border-right:1px solid rgba(255,255,255,.07);z-index:10}
        .brand{height:94px;padding:30px 20px 18px;display:flex;align-items:flex-start;gap:10px}
        .brand-mark{width:32px;height:28px;position:relative;color:#f43f5e}
        .brand-mark img{width:32px;height:32px;object-fit:contain}
        .brand-text{font-size:22px;line-height:22px;font-weight:800;letter-spacing:-.7px;background:linear-gradient(90deg,#8b5cf6,#38bdf8);-webkit-background-clip:text;color:transparent;white-space:nowrap}
        .brand-sub{font-size:10.5px;color:#94a3b8;margin-top:3px;letter-spacing:.1px}
        .nav{padding:13px 17px 0}
        .nav-item{border:0;background:transparent;width:197px;height:41px;border-radius:6px;display:flex;align-items:center;gap:16px;padding:0 14px;color:#94a3b8;font-size:14px;text-align:left;cursor:pointer;margin-bottom:1px}
        .nav-item svg{flex:0 0 auto}
        .nav-item:hover{background:rgba(139,92,246,.14);color:#8b5cf6}
        .nav-item.active{color:#fff;background:linear-gradient(96deg,#7c3aed,#8b5cf6);box-shadow:0 5px 12px rgba(139,92,246,.3)}
        .ai-card{position:absolute;left:13px;right:19px;bottom:18px;height:281px;border:1px solid rgba(255,255,255,.07);border-radius:10px;background:linear-gradient(180deg,#0d1526 0,#0b1220 100%);text-align:center;padding:15px 11px}
        .ai-title{font-size:13px;color:#8b5cf6;font-weight:700;margin-bottom:5px}
        .bot{width:98px;height:98px;margin:0 auto 4px;border-radius:50%;background:radial-gradient(circle at 48% 42%,#241b3d 0 23%,#1a1433 24% 39%,#2a2145 40% 51%,#7c3aed 52% 59%,transparent 60%),linear-gradient(135deg,#0d1526,#1a1433);box-shadow:0 6px 16px rgba(139,92,246,.3);position:relative}
        .bot:before,.bot:after{content:"";position:absolute;top:40px;width:10px;height:22px;border-radius:7px;background:#2a2145}
        .bot:before{left:-5px}.bot:after{right:-5px}
        .bot-face{position:absolute;left:25px;top:35px;width:48px;height:30px;border-radius:15px;background:#05080f;box-shadow:inset 0 0 12px rgba(139,92,246,.3)}
        .bot-face:after{content:"••";color:#22d3ee;letter-spacing:7px;font-size:19px;position:absolute;left:10px;top:-1px}
        .ai-hi{font-size:12px;color:#8b5cf6;font-weight:600;margin:5px 0 8px}
        .ai-copy{font-size:12px;line-height:20px;color:#94a3b8;margin:0 auto 11px;max-width:170px}
        .ai-button{border:0;border-radius:6px;background:linear-gradient(96deg,#7c3aed,#8b5cf6);color:#fff;width:176px;height:33px;font-size:12px;font-weight:600;cursor:pointer}
        .main{margin-left:232px;width:calc(100% - 232px);min-height:1024px}
        .topbar{height:91px;display:flex;align-items:center;justify-content:space-between;padding:0 21px 0 27px;background:#030712}
        .heading h1{font-size:25px;line-height:30px;margin:0;font-weight:750;letter-spacing:-.65px;display:flex;align-items:center;gap:9px}
        .heading h1 svg{color:#8b5cf6;width:23px}
        .heading p{font-size:13.5px;color:#94a3b8;margin:6px 0 0}
        .top-actions{display:flex;align-items:center;gap:10px}
        .bell{border:0;background:transparent;color:#94a3b8;width:34px;height:34px;display:grid;place-items:center;cursor:pointer;margin-right:1px}
        .profile{display:flex;align-items:center;gap:9px;margin-left:0}
        .avatar{width:32px;height:32px;border-radius:50%;background:linear-gradient(145deg,#2a2145,#1a1433);overflow:hidden;position:relative}
        .avatar:before{content:"";position:absolute;width:12px;height:12px;background:#94a3b8;border-radius:50%;left:10px;top:6px}
        .avatar:after{content:"";position:absolute;width:23px;height:15px;background:#94a3b8;border-radius:15px 15px 4px 4px;left:4px;bottom:-1px}
        .profile-copy{min-width:73px}.profile-name{font-size:12px;font-weight:700}.profile-role{font-size:9px;color:#94a3b8;margin-top:2px}
        .profile svg{color:#94a3b8;margin-left:2px}
        .toolbar{height:48px;display:flex;align-items:center;justify-content:flex-end;padding:0 21px 8px 27px;gap:10px}
        .date-btn{height:33px;width:250px;border:1px solid rgba(255,255,255,.07);background:#0b1220;border-radius:6px;display:flex;align-items:center;padding:0 12px;color:#f1f5f9;font-size:12px;cursor:pointer;justify-content:space-between}
        .date-inner{display:flex;align-items:center;gap:9px}
        .date-btn svg{color:#94a3b8}
        .export{height:33px;border:0;border-radius:6px;background:linear-gradient(105deg,#7c3aed,#8b5cf6);color:#fff;padding:0 14px;display:flex;align-items:center;gap:8px;font-size:11.5px;font-weight:650;cursor:pointer;box-shadow:0 3px 7px rgba(139,92,246,.3)}
        .date-menu{position:absolute;right:167px;top:80px;width:250px;background:#0d1526;border:1px solid rgba(255,255,255,.07);border-radius:8px;padding:7px;box-shadow:0 12px 35px rgba(0,0,0,.45);z-index:20}
        .date-menu button{display:block;width:100%;border:0;background:#0d1526;text-align:left;padding:9px 10px;border-radius:5px;font-size:12px;color:#f1f5f9;cursor:pointer}
        .date-menu button:hover{background:rgba(139,92,246,.16);color:#8b5cf6}
        .content{padding:0 21px 20px 27px}
        .metric-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:10px}
        .card{background:#0b1220;border:1px solid rgba(255,255,255,.07);border-radius:11px;box-shadow:0 2px 9px rgba(0,0,0,.35)}
        .metric{height:149px;padding:15px 14px 8px;position:relative;overflow:hidden}
        .metric-top{display:flex;align-items:flex-start;gap:12px}
        .metric-icon{width:42px;height:42px;border-radius:12px;display:grid;place-items:center;flex:0 0 auto}
        .metric-icon.purple{background:rgba(139,92,246,.16);color:#8b5cf6}.metric-icon.blue{background:rgba(56,189,248,.16);color:#38bdf8}.metric-icon.green{background:rgba(34,197,94,.16);color:#22c55e}.metric-icon.orange{background:rgba(245,158,11,.16);color:#f59e0b}
        .metric-label{font-size:12px;font-weight:700;color:#f1f5f9;margin-top:3px}
        .metric-value{font-size:23px;font-weight:780;letter-spacing:-.7px;margin-top:5px;color:#f1f5f9}
        .growth{font-size:10px;color:#22c55e;margin-left:5px;white-space:nowrap;font-weight:600;vertical-align:middle}
        .metric-sub{font-size:9.5px;color:#94a3b8;margin:6px 0 0 54px}
        .metric-chart{position:absolute;left:67px;right:13px;bottom:7px;height:37px}
        .sparkline{width:100%;height:37px;display:block}.spark-line{fill:none;stroke:#8b5cf6;stroke-width:2}.spark-fill{fill:url(#x)}
        .score-card{display:flex;flex-direction:column}
        .score-content{display:flex;align-items:center;gap:10px;margin-top:3px}
        .score-ring{width:71px;height:71px;border-radius:50%;background:rgba(255,255,255,.08);position:relative;display:grid;place-items:center}
        .score-ring:after{content:"";position:absolute;inset:7px;border-radius:50%;background:#0b1220}
        .score-number{position:relative;z-index:1;text-align:center}.score-number strong{display:block;font-size:20px}.score-number span{font-size:8px;color:#94a3b8}
        .excellent{font-size:11px;color:#22c55e;font-weight:650;margin-bottom:4px}.points{font-size:9px;color:#22c55e}.score-sub{font-size:8.5px;color:#94a3b8;margin-top:4px}
        .row1{display:grid;grid-template-columns:1fr;gap:10px;margin-bottom:10px}
        .traffic-card{height:275px;padding:17px 25px 12px}
        .card-head{display:flex;justify-content:space-between;align-items:center}
        .card-title{font-size:12.5px;font-weight:750;color:#f1f5f9}
        .select{height:26px;min-width:95px;border:1px solid rgba(255,255,255,.07);border-radius:5px;background:#0b1220;font-size:10px;color:#f1f5f9;padding:0 8px;display:flex;align-items:center;justify-content:space-between;cursor:pointer}
        .legend{display:flex;align-items:center;gap:23px;margin:15px 0 6px 16px;font-size:10px;color:#94a3b8}
        .dot{width:8px;height:8px;border-radius:50%;display:inline-block;margin-right:7px}.dot.p{background:#8b5cf6}.dot.g{background:#22c55e}.dot.b{background:#38bdf8}.dot.o{background:#f59e0b}.dot.r{background:#f43f5e}
        .score-bars{height:197px;display:flex;align-items:flex-end;gap:3px;padding:4px 4px 0;overflow-x:auto}
        .score-bar-col{flex:1 1 6px;max-width:26px;height:100%;display:flex;align-items:flex-end}
        .score-bar-fill{width:100%;border-radius:3px 3px 0 0;background:#f59e0b}
        .score-bar-fill.good{background:#22c55e}
        .score-bar-fill.warn{background:#f59e0b}
        .score-bar-fill.bad{background:#f43f5e}
        .score-bars-empty{height:197px;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:12px}
        .traffic-chart{height:197px;position:relative;padding-left:43px;padding-right:38px}
        .chart-y{position:absolute;top:7px;bottom:25px;display:flex;flex-direction:column;justify-content:space-between;font-size:9px;color:#94a3b8}.chart-y.left{left:0}.chart-y.right{right:0;text-align:left}
        .grid-lines{position:absolute;left:43px;right:38px;top:7px;bottom:25px;display:flex;flex-direction:column;justify-content:space-between}.grid-lines i{height:1px;background:rgba(255,255,255,.07);width:100%}
        .traffic-svg{position:absolute;left:43px;right:38px;top:7px;width:calc(100% - 81px);height:168px}
        .chart-x{position:absolute;left:43px;right:38px;bottom:2px;display:flex;justify-content:space-between;font-size:8.5px;color:#94a3b8}
        .channel-card{height:275px;padding:17px 21px 13px}
        .channel-body{display:flex;align-items:center;gap:15px;height:195px}
        .channel-list{flex:1;display:flex;flex-direction:column;gap:13px;margin-top:1px}.channel-row{display:grid;grid-template-columns:10px 1fr 34px 40px;gap:8px;align-items:center;font-size:10px;color:#94a3b8}.channel-row .pct{text-align:right}.channel-row .num{text-align:right;color:#f1f5f9}
        .channel-link,.view-link{font-size:9.5px;color:#8b5cf6;text-decoration:none;font-weight:500;cursor:pointer;display:inline-flex;align-items:center;gap:6px}
        .row2{display:grid;grid-template-columns:1fr 1.6fr;gap:10px;margin-bottom:10px}
        .small-card{height:226px;padding:17px 17px 12px}
        .distribution{display:flex;align-items:center;height:157px;gap:18px}
        .donut-wrap{width:145px;height:145px;display:grid;place-items:center;flex:0 0 auto}
        .donut{width:145px;height:145px;border-radius:50%;display:grid;place-items:center}
        .donut-hole{width:89px;height:89px;background:#0b1220;border-radius:50%;display:grid;place-items:center;align-content:center;text-align:center}.donut-hole strong{font-size:16px;letter-spacing:-.4px}.donut-hole span{font-size:8px;color:#94a3b8;margin-top:2px}
        .dist-legend{display:flex;flex-direction:column;gap:13px;font-size:9.5px;color:#94a3b8;min-width:135px}.dist-row{display:grid;grid-template-columns:10px 1fr 36px 38px;gap:6px;align-items:center}.dist-row b{font-weight:500}.dist-row .pct{text-align:right}.dist-row .val{text-align:right;color:#f1f5f9}
        .ranking-card{padding-left:19px}.ranking-card .legend{margin-left:0;margin-top:14px;gap:18px}.ranking-chart{height:156px;position:relative;margin-top:0;padding-left:29px;padding-bottom:19px}.ranking-y{position:absolute;left:0;top:4px;bottom:23px;display:flex;flex-direction:column;justify-content:space-between;font-size:8px;color:#94a3b8}.ranking-bars{position:absolute;left:29px;right:4px;bottom:23px;top:4px;display:flex;gap:6px;align-items:flex-end;border-top:1px solid rgba(255,255,255,.07);background:repeating-linear-gradient(to bottom,transparent 0,transparent 20px,rgba(255,255,255,.07) 21px)}.stack{width:15px;display:flex;flex-direction:column-reverse;justify-content:flex-start;height:100%;align-items:stretch}.stack i{display:block;width:100%}.s1{background:#22c55e}.s2{background:#38bdf8}.s3{background:#f59e0b}.s4{background:#f43f5e}.ranking-x{position:absolute;left:29px;right:4px;bottom:0;display:flex;justify-content:space-between;font-size:8px;color:#94a3b8}
        .pages-card{padding:17px 13px 11px}.view-all{height:25px;padding:0 10px;border:1px solid rgba(139,92,246,.35);background:#0b1220;border-radius:5px;color:#8b5cf6;font-size:9px;cursor:pointer}.pages-table{width:100%;border-collapse:collapse;margin-top:15px}.pages-table th{text-align:left;color:#94a3b8;font-size:8.5px;font-weight:500;border-bottom:1px solid rgba(255,255,255,.05);padding:0 0 8px}.pages-table th:nth-child(2),.pages-table th:nth-child(3){text-align:right}.pages-table td{height:38px;border-bottom:1px solid rgba(255,255,255,.05);font-size:9.5px;color:#f1f5f9;vertical-align:middle}.pages-table td:nth-child(2),.pages-table td:nth-child(3){text-align:right}.up{color:#22c55e;font-size:9px;margin-left:6px}
        .mini-fix-btn{height:22px;padding:0 10px;border:1px solid rgba(139,92,246,.35);background:#0b1220;border-radius:5px;color:#8b5cf6;font-size:9px;cursor:pointer}.mini-fix-btn:disabled{opacity:.6;cursor:default}
        .row3{display:grid;grid-template-columns:1fr;gap:10px}
        .health-card{height:226px;padding:17px}
        .health-body{display:flex;align-items:center;gap:14px;height:153px}.health-ring{width:83px;height:83px;border-radius:50%;background:rgba(255,255,255,.08);display:grid;place-items:center;flex:0 0 auto;position:relative}.health-ring:after{content:"";position:absolute;inset:7px;border-radius:50%;background:#0b1220}.health-score{position:relative;z-index:1;text-align:center}.health-score strong{display:block;font-size:22px}.health-score span{font-size:8px;color:#94a3b8}.health-copy{min-width:0}.health-excellent{font-size:10px;color:#22c55e;font-weight:650}.health-note{font-size:8.5px;color:#94a3b8;line-height:14px;margin:4px 0 9px}.health-items{display:grid;grid-template-columns:1fr auto;gap:7px 10px;font-size:8px;color:#94a3b8}.good{color:#22c55e}.warn{color:#f59e0b}.bad{color:#f43f5e}.status-icon{display:inline-grid;place-items:center;width:12px;height:12px;border-radius:3px;margin-right:5px;color:#22c55e}.backlink-body{height:157px;display:flex;align-items:center;gap:10px}.backlink-stats{width:158px}.stat-label{font-size:8.5px;color:#94a3b8;margin-top:9px}.stat-value{font-size:15px;font-weight:750;margin-top:3px}.stat-growth{font-size:8.5px;color:#22c55e;margin-left:6px}.backlink-chart{height:118px;flex:1;border-left:1px solid rgba(255,255,255,.05);border-bottom:1px solid rgba(255,255,255,.05);position:relative;background:repeating-linear-gradient(to bottom,transparent 0,transparent 28px,rgba(255,255,255,.05) 29px)}.backlink-chart svg{width:100%;height:100%}.backlink-chart .area{fill:#8b5cf6;opacity:.12}.backlink-chart .line{fill:none;stroke:#8b5cf6;stroke-width:2}
        .country-list{margin-top:13px;display:flex;flex-direction:column;gap:11px}.country-row{display:grid;grid-template-columns:16px 1fr 40px 160px 34px;gap:6px;align-items:center;font-size:9px;color:#94a3b8}.flag{font-size:15px}.country-number{text-align:right;color:#f1f5f9}.progress{height:5px;background:rgba(255,255,255,.07);border-radius:8px;overflow:hidden}.progress i{display:block;height:100%;background:linear-gradient(90deg,#7c3aed,#8b5cf6);border-radius:8px}.country-pct{text-align:right;color:#94a3b8}
        .bottom-link{margin-top:4px}
        .toast{position:fixed;right:25px;bottom:25px;background:#0b1220;color:#fff;padding:11px 16px;border-radius:8px;font-size:12px;box-shadow:0 15px 35px rgba(0,0,0,.45);z-index:50;animation:toastIn .25s ease-out}
        @keyframes toastIn{from{transform:translateY(10px);opacity:0}to{transform:translateY(0);opacity:1}}
        @media(max-width:1100px){
          .sidebar{width:205px}.main{margin-left:205px;width:calc(100% - 205px)}.nav-item{width:173px}.metric-grid{grid-template-columns:repeat(2,1fr)}.row1{grid-template-columns:1fr}.row2{grid-template-columns:1fr 1fr}.row3{grid-template-columns:1fr}.country-row{grid-template-columns:16px 1fr 40px minmax(100px,160px) 34px}
        }
        @media(max-width:760px){
          .seo-app{min-height:100vh}.sidebar{position:relative;width:0;overflow:hidden;border:0}.main{margin-left:0;width:100%}.topbar{padding-left:16px}.toolbar{padding-left:16px}.content{padding-left:12px;padding-right:12px}.metric-grid,.row2,.row3{grid-template-columns:1fr}.topbar{height:auto;padding-top:18px;padding-bottom:8px;align-items:flex-start}.heading p{max-width:260px}.profile{display:none}.toolbar{height:auto;justify-content:flex-start;padding-bottom:12px;overflow:auto}.date-btn{min-width:250px}.export{min-width:130px}.row1{grid-template-columns:1fr}.traffic-card,.channel-card,.small-card,.health-card,.backlink-card,.countries-card{height:auto;min-height:225px}.metric{height:149px}
        }
      `}</style>

      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <img src={platformLogoUrl(platform)} alt={`${platformLabel(platform)} logo`} />
          </div>
          <div>
            <div className="brand-text">{platformLabel(platform)}.com</div>
            <div className="brand-sub">SEO Agent Special</div>
          </div>
        </div>

        <nav className="nav">
          {nav.map(([icon, label, slug]) => {
            const href = `/seo-agent-special/${platform}/${slug}`;
            return <NavItem key={label} icon={icon} label={label} href={href} active={pathname === href} />;
          })}
        </nav>

        <div className="ai-card">
          <div className="ai-title">SEO AI Agent</div>
          <div className="bot"><div className="bot-face"/></div>
          <div className="ai-hi">Hi! I'm your SEO AI Agent.</div>
          <p className="ai-copy">I analyze, optimize &amp;<br/>grow your traffic.</p>
          <Link href={`/seo-agent-special/${platform}/chat`} className="ai-button" style={{ display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>Chat with AI Agent</Link>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="heading">
            <h1>Statistics <Icon name="sparkle" size={23} stroke={1.5}/></h1>
            <p>Track your SEO performance and growth over time</p>
          </div>
          <div className="top-actions">
            <button className="bell" onClick={()=>toast("No new notifications")}><Icon name="bell" size={19}/></button>
            <div className="profile">
              <div className="avatar"/>
              <div className="profile-copy"><div className="profile-name">Admin</div><div className="profile-role">SEO Manager</div></div>
              <Icon name="chevron" size={13}/>
            </div>
          </div>
        </header>

        <div className="toolbar">
          <div style={{position:"relative"}}>
            <button className="date-btn" onClick={()=>setShowRange(!showRange)}>
              <span className="date-inner"><Icon name="calendar" size={16}/>{range}</span><Icon name="chevron" size={13}/>
            </button>
            {showRange && (
              <div className="date-menu">
                {["May 22, 2025  -  Jun 22, 2025","Apr 22, 2025  -  May 21, 2025","Last 7 Days","Last 90 Days"].map(v=>
                  <button key={v} onClick={()=>{setRange(v);setShowRange(false);toast(`Date range: ${v}`)}}>{v}</button>
                )}
              </div>
            )}
          </div>
          <button className="export" onClick={exportReport}><Icon name="download" size={14}/><span>Export Report</span></button>
        </div>

        <section className="content">
          <div className="metric-grid">
            <div className="card metric score-card">
              <div className="metric-top"><div className="metric-icon purple"><Icon name="target" size={21}/></div><div><div className="metric-label">SEO Score</div></div></div>
              <div className="score-content">
                <div
                  className="score-ring"
                  style={
                    healthPct == null
                      ? { background: "rgba(255,255,255,.08)" }
                      : { background: `conic-gradient(#8b5cf6 0deg ${Math.round((healthPct / 100) * 360)}deg, rgba(255,255,255,.08) ${Math.round((healthPct / 100) * 360)}deg 360deg)` }
                  }
                >
                  <div className="score-number"><strong>{audit.loading ? "…" : (audit.averageScore ?? "—")}</strong><span>/{audit.maxScore}</span></div>
                </div>
                <div>
                  <div className="excellent">{healthPct == null ? "—" : healthPct >= 80 ? "Excellent" : healthPct >= 60 ? "Good" : "Needs work"}</div>
                  <div className="score-sub">Real, live average across {audit.checkedScopeLabel || "checked posts"}</div>
                </div>
              </div>
            </div>
            <div className="card metric">
              <div className="metric-top"><div className="metric-icon blue"><Icon name="report" size={21}/></div><div><div className="metric-label">Published Posts</div><div className="metric-value">{audit.loading ? "…" : (audit.checkedCount ?? "—")}</div></div></div>
              <div className="metric-sub">{audit.error ? `Live data unavailable: ${audit.error}` : audit.checkedScopeLabel ? `Real count — ${audit.checkedScopeLabel}` : "Real, live count"}</div>
            </div>
            <div className="card metric">
              <div className="metric-top"><div className="metric-icon orange"><Icon name="tasks" size={21}/></div><div><div className="metric-label">Needs Improvement</div><div className="metric-value">{audit.loading ? "…" : needsAttention.length}</div></div></div>
              <div className="metric-sub">Posts scoring below {audit.maxScore}</div>
            </div>
            <div className="card metric">
              <div className="metric-top"><div className="metric-icon green"><Icon name="search" size={21}/></div><div><div className="metric-label">Most Common Issue</div></div></div>
              <div className="metric-sub" style={{ margin: "10px 0 0 54px", fontSize: 12.5, color: "#f1f5f9", fontWeight: 650, lineHeight: "17px" }}>
                {audit.loading ? "…" : audit.topIssue ? audit.topIssue.label : "None detected"}
              </div>
              {!audit.loading && audit.topIssue && (
                <div className="metric-sub" style={{ margin: "4px 0 0 54px" }}>{`Failing on ${audit.topIssue.failingPercent ?? "—"}% of checked posts`}</div>
              )}
            </div>
          </div>

          <div className="row1">
            <div className="card traffic-card">
              <div className="card-head"><div className="card-title">Post Scores Overview</div></div>
              <div className="legend"><span><i className="dot g"/>Healthy (≥ {(audit.maxScore - 1).toFixed(1)})</span><span><i className="dot o"/>Needs work</span><span><i className="dot r"/>Low (&lt; {(audit.maxScore - 3).toFixed(1)})</span></div>
              <ScoreBarChart posts={posts} maxScore={audit.maxScore}/>
            </div>
          </div>

          <div className="row2">
            <div className="card small-card">
              <div className="card-title">Score Distribution</div>
              <div className="distribution">
                <Donut center={String(buckets.total)} segments={distSegments}/>
                <div className="dist-legend">
                  <div className="dist-row"><i className="dot g"/><b>9+</b><span className="val">{buckets.b9}</span><span className="pct">({bucketPct(buckets.b9)}%)</span></div>
                  <div className="dist-row"><i className="dot b"/><b>7 – 8.9</b><span className="val">{buckets.b7}</span><span className="pct">({bucketPct(buckets.b7)}%)</span></div>
                  <div className="dist-row"><i className="dot o"/><b>5 – 6.9</b><span className="val">{buckets.b5}</span><span className="pct">({bucketPct(buckets.b5)}%)</span></div>
                  <div className="dist-row"><i className="dot r"/><b>Below 5</b><span className="val">{buckets.bLow}</span><span className="pct">({bucketPct(buckets.bLow)}%)</span></div>
                </div>
              </div>
              <a className="view-link" onClick={()=>toast("Real distribution of every checked post's live SEO score")}>How this is built <Icon name="arrow" size={12}/></a>
            </div>

            <div className="card small-card pages-card">
              <div className="card-head"><div className="card-title">Posts Needing Attention</div><button className="view-all" onClick={()=>toast(`${needsAttention.length} post(s) below ${audit.maxScore}`)}>View All</button></div>
              <table className="pages-table">
                <thead><tr><th>Post</th><th>Score</th><th>Action</th></tr></thead>
                <tbody>
                  {audit.loading ? (
                    <tr><td colSpan={3} style={{textAlign:"center",color:"#94a3b8"}}>Loading…</td></tr>
                  ) : needsAttention.length === 0 ? (
                    <tr><td colSpan={3} style={{textAlign:"center",color:"#94a3b8"}}>Every checked post is at the maximum score.</td></tr>
                  ) : needsAttention.slice(0,6).map((p)=>(
                    <tr key={p.id}>
                      <td><strong style={{display:"block",fontWeight:650}}>{p.title}</strong><span style={{fontSize:9,color:"#94a3b8"}}>{p.reasons[0] ?? (audit.topIssue ? `Common site issue: ${audit.topIssue.label}` : "—")}</span></td>
                      <td>{p.score}/{audit.maxScore}</td>
                      <td>{p.canFix ? <button className="mini-fix-btn" disabled={fixingId===p.id} onClick={()=>applyFix(p)}>{fixingId===p.id ? "…" : "Fix"}</button> : <span style={{color:"#94a3b8"}}>—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="row3">
            <div className="card health-card">
              <div className="card-title">SEO Health Overview</div>
              <div className="health-body">
                <div
                  className="health-ring"
                  style={
                    healthPct == null
                      ? { background: "rgba(255,255,255,.08)" }
                      : { background: `conic-gradient(#22c55e 0deg ${Math.round((healthPct / 100) * 360)}deg, rgba(255,255,255,.08) ${Math.round((healthPct / 100) * 360)}deg 360deg)` }
                  }
                >
                  <div className="health-score"><strong>{healthPct ?? "—"}</strong><span>/100</span></div>
                </div>
                <div className="health-copy">
                  <div className="health-excellent">{healthPct == null ? "—" : healthPct >= 80 ? "Excellent" : healthPct >= 60 ? "Good" : "Needs work"}</div>
                  <div className="health-note">{audit.checkedCount ? `Computed live from ${audit.checkedCount} checked posts.` : "Computed live from checked posts."}</div>
                  <div className="health-items">
                    {audit.issueCategories.length === 0 ? (
                      <span style={{gridColumn:"1 / -1"}}>No recurring issues detected across checked posts.</span>
                    ) : audit.issueCategories.slice(0,5).map((c)=>(
                      <React.Fragment key={c.label}>
                        <span>▣ &nbsp;{c.label}</span>
                        <b className={c.failingPercent == null || c.failingPercent < 20 ? "good" : c.failingPercent < 50 ? "warn" : "bad"}>
                          {c.failingCount} post{c.failingCount===1?"":"s"}{c.failingPercent!=null?` (${c.failingPercent}%)`:""}
                        </b>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>
              <a className="view-link" onClick={()=>toast("Health score = real average score ÷ max score. Categories come from real per-post issues.")}>How this is calculated <Icon name="arrow" size={12}/></a>
            </div>
          </div>
        </section>
      </main>

      {notice && <div className="toast">{notice}</div>}
    </div>
  );
}
