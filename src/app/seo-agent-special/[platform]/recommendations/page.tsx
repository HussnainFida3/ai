/* app/ai-recommendations/page.tsx
   Single-file recreation of the supplied ShadiLife.com AI Recommendations dashboard.
   No external CSS or icon package is required.
*/

"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePlatformParam, platformLabel, platformLogoUrl, useSeoAudit, improveSeoPost, categorizeReason, type SeoPostRow, type SeoIssueCategory } from "@/lib/agent-data";
import type { PlatformKey } from "@/lib/platforms";

type IconName =
  | "heart" | "grid" | "bell" | "search" | "chart" | "edit" | "gear"
  | "users" | "file" | "shield" | "spark" | "download" | "calendar"
  | "filter" | "chevron" | "wand" | "alert" | "target" | "check"
  | "document" | "link" | "image" | "code" | "dots" | "arrow"
  | "message" | "list";

function Icon({ name, size = 18, stroke = 1.8 }: { name: IconName; size?: number; stroke?: number }) {
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
  switch (name) {
    case "heart": return <svg {...common}><path d="M20.8 8.9c0 5.5-8.8 10.2-8.8 10.2S3.2 14.4 3.2 8.9A4.6 4.6 0 0 1 12 6.5a4.6 4.6 0 0 1 8.8 2.4Z"/><path d="M7 10.5h3l1.1-2.2 2 5 1.2-2.3H17"/></svg>;
    case "grid": return <svg {...common}><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg>;
    case "bell": return <svg {...common}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>;
    case "search": return <svg {...common}><circle cx="11" cy="11" r="6.8"/><path d="m16 16 4.2 4.2"/></svg>;
    case "chart": return <svg {...common}><path d="M4 19V5"/><path d="M4 19h16"/><path d="m7 15 4-4 3 2 5-7"/><path d="M16 6h3v3"/></svg>;
    case "edit": return <svg {...common}><path d="m4 20 4.2-.9L19 8.3a2 2 0 0 0-3.3-2.3L4.9 16.8 4 20Z"/><path d="m14.5 7.5 2 2"/></svg>;
    case "gear": return <svg {...common}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.9 1.9-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V22h-2.7v-.2a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1-1.9-1.9.1-.1A1.7 1.7 0 0 0 7.7 15a1.7 1.7 0 0 0-1.6-1H5.9v-2.7h.2a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 1.9-1.9.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V5h2.7v.2a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.9 1.9-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2V14h-.2a1.7 1.7 0 0 0-1.6 1Z"/></svg>;
    case "users": return <svg {...common}><circle cx="9" cy="8" r="3"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/><path d="M16 5.5a3 3 0 0 1 0 5.8"/><path d="M17 14.5a5 5 0 0 1 4 5"/></svg>;
    case "file": return <svg {...common}><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h4"/><path d="M9 13h6M9 17h6"/></svg>;
    case "shield": return <svg {...common}><path d="M12 3 20 6v5c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6l8-3Z"/><path d="m9 12 2 2 4-4"/></svg>;
    case "spark": return <svg {...common}><path d="m12 2 1.6 6.4L20 10l-6.4 1.6L12 18l-1.6-6.4L4 10l6.4-1.6L12 2Z"/><path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z"/></svg>;
    case "download": return <svg {...common}><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M4 20h16"/></svg>;
    case "calendar": return <svg {...common}><rect x="3.5" y="5" width="17" height="16" rx="2"/><path d="M7 3v4M17 3v4M3.5 9h17"/><path d="M8 13h2M14 13h2M8 17h2"/></svg>;
    case "filter": return <svg {...common}><path d="M4 5h16l-6.2 7.2V19l-3.6 2v-8.8L4 5Z"/></svg>;
    case "chevron": return <svg {...common}><path d="m8 10 4 4 4-4"/></svg>;
    case "wand": return <svg {...common}><path d="m15 4 5 5"/><path d="m14 5-9 9a2 2 0 0 0 0 3l2 2a2 2 0 0 0 3 0l9-9"/><path d="M4 4v4M2 6h4M19 16v4M17 18h4"/></svg>;
    case "alert": return <svg {...common}><path d="m12 3 9 17H3L12 3Z"/><path d="M12 9v5M12 17h.01"/></svg>;
    case "target": return <svg {...common}><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="m12 12 6-6"/><path d="M18 6h-4M18 6v4"/></svg>;
    case "check": return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/></svg>;
    case "document": return <svg {...common}><path d="M7 3h8l3 3v15H7z"/><path d="M15 3v4h3M10 11h5M10 15h5M10 19h3"/></svg>;
    case "link": return <svg {...common}><path d="M10 13.5 14 9.5"/><path d="M7.5 17.5h-1a4 4 0 0 1 0-8h3"/><path d="M16.5 6.5h1a4 4 0 0 1 0 8h-3"/></svg>;
    case "image": return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m4 17 5-5 3.5 3 2.5-2 5 4"/></svg>;
    case "code": return <svg {...common}><path d="m9 7-5 5 5 5M15 7l5 5-5 5M13 5l-2 14"/></svg>;
    case "dots": return <svg {...common} fill="currentColor" stroke="none"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>;
    case "arrow": return <svg {...common}><path d="M5 12h14"/><path d="m14 7 5 5-5 5"/></svg>;
    case "message": return <svg {...common}><path d="M5 5h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-4 3v-3H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"/><path d="M8 11h8M8 14h5"/></svg>;
    case "list": return <svg {...common}><path d="M8 6h12M8 12h12M8 18h12"/><path d="M4 6h.01M4 12h.01M4 18h.01"/></svg>;
  }
}

function Logo({ platform }: { platform: PlatformKey }) {
  return (
    <div className="brand">
      <div className="brandMark"><img src={platformLogoUrl(platform)} alt={`${platformLabel(platform)} logo`} /></div>
      <div>
        <div className="brandName">{platformLabel(platform)}.com</div>
        <div className="brandTag">SEO Agent Special</div>
      </div>
    </div>
  );
}

function Robot({ small = false }: { small?: boolean }) {
  return (
    <div className={small ? "robot robotSmall" : "robot"}>
      <div className="robotGlow"/>
      <div className="robotHead">
        <div className="robotFace">
          <span className="robotEye"/><span className="robotEye"/>
        </div>
      </div>
      <div className="robotEar left"/>
      <div className="robotEar right"/>
      <div className="robotBody">
        <div className="robotCore"/>
      </div>
    </div>
  );
}

const nav = [
  ["Overview", "grid", "overview"],
  ["Chat", "shield", "chat"],
  ["Statistics", "chart", "statistics"],
  ["AI Recommendations", "spark", "recommendations"],
  ["Blog Optimization", "edit", "blog-optimization"],
] as const;

type DisplayRow = SeoPostRow & {
  priority: "High" | "Medium";
  desc: string;
  tags: string[];
  issueCount: number | null;
};

/** Turns one real, backend-scored post into everything this page's row needs to render — no invented fields. */
function buildDisplayRow(p: SeoPostRow, maxScore: number, topIssue: SeoIssueCategory | null, platform: PlatformKey): DisplayRow {
  const priority: "High" | "Medium" = p.score < maxScore - 3 ? "High" : "Medium";
  const issueCount = platform === "shadilife" ? p.reasons.length : null;
  let desc: string;
  let tags: string[];
  if (p.reasons.length > 0) {
    desc = p.reasons.slice(0, 3).join(" · ");
    tags = Array.from(new Set(p.reasons.map(categorizeReason))).slice(0, 3);
  } else if (topIssue) {
    desc = `Scores ${p.score}/${maxScore}. Site-wide, the most common issue is "${topIssue.label}" (failing on ${topIssue.failingPercent ?? "—"}% of checked posts) — apply the AI fix to regenerate this post's title and description.`;
    tags = [];
  } else {
    desc = `Scores ${p.score}/${maxScore}. Apply the AI fix to regenerate this post's title and description.`;
    tags = [];
  }
  return { ...p, priority, desc, tags, issueCount };
}

function iconForCategory(label?: string): IconName {
  switch (label) {
    case "Meta Title":
    case "Meta Description": return "document";
    case "Keywords": return "search";
    case "Content Length": return "file";
    case "Headings / Structure": return "code";
    case "Images": return "image";
    case "URL / Slug": return "link";
    default: return "document";
  }
}

function ScoreRing({ score, maxScore, label }: { score: number; maxScore: number; label: string }) {
  const deg = Math.round((score / maxScore) * 360);
  return (
    <div className="scoreBox">
      <div className="scoreRing" style={{ background: `conic-gradient(#22c55e 0deg ${deg}deg, rgba(255,255,255,.08) ${deg}deg 360deg)` }}>
        <div className="scoreInner">{score}</div>
      </div>
      <div className="scoreLabel">{label}</div>
    </div>
  );
}

function IssueCount({ count }: { count: number | null }) {
  return (
    <div className="effortBox">
      {count === null ? (
        <div className="scoreInner" style={{ background: "transparent", fontSize: 15, color: "#94a3b8" }}>—</div>
      ) : (
        <div className="effortDots">{[0,1,2].map(i => <span key={i} className={i < Math.min(count,3) ? "filled" : ""}/>)}</div>
      )}
      <div className="scoreLabel">{count === null ? "Not tracked" : `${count} issue${count===1?"":"s"}`}</div>
    </div>
  );
}

function StatCard({ title, value, sub, icon, tone }: { title:string; value:string; sub:string; icon:IconName; tone:string }) {
  return (
    <div className="statCard">
      <div>
        <div className="statTitle">{title}</div>
        <div className="statValue">{value}</div>
        <div className={`statSub ${tone === "green" ? "positive" : ""}`}>{sub}</div>
      </div>
      <div className={`statIcon ${tone}`}><Icon name={icon} size={28} stroke={1.8}/></div>
    </div>
  );
}

function PriorityOverview({ high, medium, total }: { high:number; medium:number; total:number }) {
  const highPct = total ? Math.round((high/total)*1000)/10 : 0;
  const medPct = total ? Math.round((medium/total)*1000)/10 : 0;
  const highDeg = total ? Math.round((high/total)*360) : 0;
  return (
    <section className="sideCard priorityCard">
      <h3>Priority Overview</h3>
      <div className="priorityContent">
        <div className="donut" style={{ background: total ? `conic-gradient(#f43f5e 0deg ${highDeg}deg, #f59e0b ${highDeg}deg 360deg)` : "rgba(255,255,255,.08)" }}>
          <div className="donutHole"><strong>{total}</strong><span>Total</span></div>
        </div>
        <div className="legend">
          <div><i className="dot redDot"/><span>High Priority</span><b>{high} ({highPct}%)</b></div>
          <div><i className="dot orangeDot"/><span>Medium Priority</span><b>{medium} ({medPct}%)</b></div>
        </div>
      </div>
    </section>
  );
}

function IssuePrevalence({ categories }: { categories: SeoIssueCategory[] }) {
  const top = categories.slice(0, 4);
  return (
    <section className="sideCard impactCard">
      <h3>Most Common Issues</h3>
      {top.length === 0 ? <div className="scoreLabel">No recurring SEO issues detected.</div> : top.map((c) => (
        <div className="impactRow" key={c.label}>
          <div className="impactMeta"><span>{c.label}</span><b>{c.failingPercent != null ? `${c.failingPercent}%` : c.failingCount}</b></div>
          <div className="impactTrack"><span style={{ width: `${Math.min(100, c.failingPercent ?? 0)}%` }}/></div>
        </div>
      ))}
    </section>
  );
}

function CategoryCard({ categories }: { categories: SeoIssueCategory[] }) {
  const tones = ["purple","green","orange","blue"];
  const top = categories.slice(0, 4);
  return (
    <section className="sideCard categoriesCard">
      <h3>Top Issue Categories</h3>
      {top.length === 0 ? <div className="scoreLabel">No issues found — every checked post is clean.</div> : top.map((c, i) => (
        <div className="catRow" key={c.label}>
          <span className={`catIcon ${tones[i % tones.length]}`}><Icon name={iconForCategory(c.label)} size={15}/></span><span>{c.label}</span><b>{c.failingCount}</b>
        </div>
      ))}
    </section>
  );
}

export default function AIRecommendationsPage({ params }: { params: Promise<{ platform: string }> }) {
  const platform = usePlatformParam(params);
  const pathname = usePathname();
  const audit = useSeoAudit(platform);
  const [tab, setTab] = useState("All Recommendations");
  const [page, setPage] = useState(1);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [scoreOverrides, setScoreOverrides] = useState<Record<string, number>>({});
  const [fixingId, setFixingId] = useState<string | null>(null);
  const tabs = ["All Recommendations","High Priority","Medium Priority"];
  const PAGE_SIZE = 8;

  const rows = useMemo<DisplayRow[]>(() => {
    return audit.needsImprovement
      .map((p) => (scoreOverrides[p.id] !== undefined ? { ...p, score: scoreOverrides[p.id] } : p))
      .filter((p) => p.score < audit.maxScore)
      .map((p) => buildDisplayRow(p, audit.maxScore, audit.topIssue, platform));
  }, [audit.needsImprovement, audit.maxScore, audit.topIssue, scoreOverrides, platform]);

  const highCount = rows.filter((r) => r.priority === "High").length;
  const mediumCount = rows.length - highCount;

  const filteredRows = useMemo(() => {
    if (tab === "High Priority") return rows.filter(r => r.priority === "High");
    if (tab === "Medium Priority") return rows.filter(r => r.priority === "Medium");
    return rows;
  }, [rows, tab]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedRows = filteredRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function notify(message:string) {
    setToast(message);
    window.setTimeout(()=>setToast(""),2200);
  }

  async function applyFix(row: DisplayRow) {
    setFixingId(row.id);
    try {
      const newScore = await improveSeoPost(platform, row.id);
      setScoreOverrides((prev) => ({ ...prev, [row.id]: newScore }));
      notify(`Applied AI fix to "${row.title}" — new score ${newScore}/${audit.maxScore}`);
    } catch (err) {
      notify(err instanceof Error ? err.message : "Could not apply the AI fix.");
    } finally {
      setFixingId(null);
    }
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <Logo platform={platform}/>
        <nav className="nav">
          {nav.map(([label,icon,slug])=>{
            const href = `/seo-agent-special/${platform}/${slug}`;
            return (
            <Link key={label} href={href} className={`navItem ${pathname===href ? "active":""}`}>
              <Icon name={icon as IconName} size={18}/><span>{label}</span>
            </Link>
            );
          })}
        </nav>
        <div className="agentCard">
          <div className="agentTitle">SEO AI Agent</div>
          <Robot/>
          <div className="agentHello">Hi! I'm your SEO AI Agent.</div>
          <div className="agentText">I analyze, optimize &<br/>grow your traffic.</div>
          <Link href={`/seo-agent-special/${platform}/chat`} className="primaryButton agentButton" style={{textDecoration:"none"}}><Icon name="message" size={15}/>Chat with AI Agent</Link>
        </div>
      </aside>

      <main className="main">
        <header className="header">
          <div>
            <h1>AI Recommendations <span className="titleSpark"><Icon name="spark" size={23}/></span></h1>
            <p>Personalized SEO recommendations to boost your rankings and traffic</p>
          </div>
          <div className="headerRight">
            <button className="iconButton"><Icon name="bell" size={19}/></button>
            <div className="profile">
              <div className="avatar">A</div>
              <div><b>Admin</b><span>SEO Manager</span></div>
              <Icon name="chevron" size={15}/>
            </div>
            <div className="headerActions">
              <button className="dateButton"><Icon name="calendar" size={16}/>May 22, 2025 - Jun 22, 2025</button>
              <button className="exportButton" onClick={()=>notify("Recommendations exported")}><Icon name="download" size={16}/>Export Recommendations</button>
            </div>
          </div>
        </header>

        {audit.error && (
          <div className="empty" style={{ height:"auto", padding:"14px 18px", border:"1px solid rgba(244,63,94,.3)", background:"rgba(244,63,94,.14)", borderRadius:10, marginBottom:14, color:"#f43f5e", fontSize:12, textAlign:"left" }}>
            {audit.error}
            <div style={{ marginTop:6, fontSize:11, color:"#94a3b8" }}>
              Connect {platformLabel(platform)} on the <Link href="/connect" style={{ color:"#8b5cf6", fontWeight:650 }}>Connect</Link> page, and make sure its backend is running.
            </div>
          </div>
        )}

        <div className="stats">
          <StatCard title="Total Recommendations" value={audit.loading ? "…" : String(rows.length)} sub="Posts scoring below the maximum" icon="wand" tone="purple"/>
          <StatCard title="High Priority" value={audit.loading ? "…" : String(highCount)} sub="More than 3 points below max" icon="alert" tone="red"/>
          <StatCard title="Avg. SEO Impact Score" value={audit.loading ? "…" : `${audit.averageScore ?? "—"}/${audit.maxScore}`} sub="Live average across checked posts" icon="target" tone="purple"/>
          <StatCard title="Posts Checked" value={audit.loading ? "…" : String(audit.checkedCount ?? "—")} sub={audit.checkedScopeLabel || "Live count"} icon="check" tone="blue"/>
        </div>

        <div className="workspace">
          <section className="recommendationCard">
            <div className="tabsRow">
              <div className="tabs">
                {tabs.map(t=><button key={t} onClick={()=>{setTab(t);setPage(1)}} className={tab===t ? "tab activeTab":"tab"}>{t}</button>)}
              </div>
              <div className="categoryWrap">
                <button className="categorySelect" onClick={()=>setCategoryOpen(v=>!v)}><Icon name="filter" size={15}/><span>All Categories</span><Icon name="chevron" size={14}/></button>
                {categoryOpen && <div className="categoryMenu">{["All Categories","On-Page SEO","Technical SEO","Backlinks","Keyword Research"].map(x=><button key={x} onClick={()=>{setCategoryOpen(false);notify(`${x} selected`)}}>{x}</button>)}</div>}
              </div>
            </div>

            <div className="tableHeader">
              <div>Recommendation</div><div>SEO Score</div><div>Issues Found</div><div>Priority</div><div>Action</div>
            </div>

            <div className="rows">
              {audit.loading ? (
                <div className="empty">Loading live recommendations…</div>
              ) : pagedRows.length === 0 ? (
                <div className="empty">{rows.length === 0 ? "Every checked post is already at the maximum score." : "No recommendations in this category."}</div>
              ) : pagedRows.map((r)=>(
                <div className="recRow" key={r.id}>
                  <div className="recommendation">
                    <div className={`recIcon ${r.priority === "High" ? "red" : "orange"}`}><Icon name={iconForCategory(r.tags[0])} size={24}/></div>
                    <div className="recText">
                      <b>{r.title}</b>
                      <p>{r.desc}</p>
                      {r.tags.length > 0 && <div className="tags">{r.tags.map((tag)=><span key={tag} className="tag purple">{tag}</span>)}</div>}
                    </div>
                  </div>
                  <ScoreRing score={r.score} maxScore={audit.maxScore} label="SEO Score"/>
                  <IssueCount count={r.issueCount}/>
                  <div><span className={`priority ${r.priority.toLowerCase()}`}>{r.priority}</span></div>
                  <div className="actionCell">
                    {r.canFix ? (
                      <button className="details" disabled={fixingId===r.id} onClick={()=>applyFix(r)}>{fixingId===r.id ? "Applying…" : "Apply AI Fix"}</button>
                    ) : (
                      <span className="muted-note">No auto-fix available</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="tableFooter">
              <span>Showing {filteredRows.length === 0 ? 0 : (safePage-1)*PAGE_SIZE+1} to {Math.min(safePage*PAGE_SIZE, filteredRows.length)} of {filteredRows.length} recommendations</span>
              <div className="pagination">
                <button onClick={()=>setPage(Math.max(1,safePage-1))}><Icon name="chevron" size={15}/></button>
                {Array.from({length: totalPages}, (_, i) => i + 1).map(n=><button key={n} className={safePage===n ? "page activePage":"page"} onClick={()=>setPage(n)}>{n}</button>)}
                <button onClick={()=>setPage(Math.min(totalPages,safePage+1))}><Icon name="chevron" size={15}/></button>
              </div>
            </div>
          </section>

          <aside className="rightRail">
            <PriorityOverview high={highCount} medium={mediumCount} total={rows.length}/>
            <IssuePrevalence categories={audit.issueCategories}/>
            <CategoryCard categories={audit.issueCategories}/>
            <section className="sideCard insightCard">
              <div className="insightRobot"><Robot small/></div>
              <div><h3>AI Powered Insights</h3><p>Recommendations are based on your website's real published content, scored live by the SEO Agent.</p><button onClick={()=>notify("How it works opened")}>How it works <Icon name="arrow" size={15}/></button></div>
            </section>
          </aside>
        </div>

        <section className="bottomHelp">
          <div className="tinyRobot"><Robot small/></div>
          <div><b>Need help implementing these recommendations?</b><span>Chat with our AI Agent to get step-by-step guidance.</span></div>
          <Link href={`/seo-agent-special/${platform}/chat`} className="primaryButton" style={{textDecoration:"none"}}><Icon name="message" size={16}/>Chat with AI Agent</Link>
        </section>
      </main>

      {toast && <div className="toast">{toast}</div>}

      <style jsx global>{`
        *{box-sizing:border-box}
        html,body{margin:0;padding:0;background:#030712;color:#f1f5f9;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif}
        button{font:inherit}
        .app{width:100%;min-height:100vh;background:#030712;display:flex;overflow:hidden}
        .sidebar{width:242px;min-width:242px;border-right:1px solid rgba(255,255,255,.07);background:#05080f;position:relative;padding:39px 14px 28px}
        .brand{height:67px;display:flex;align-items:center;padding-left:12px;gap:8px}
        .brandMark{width:35px;height:35px;display:flex;align-items:center}
        .brandMark img{width:100%;height:100%;object-fit:contain}
        .brandName{font-size:23px;font-weight:800;letter-spacing:-.7px;background:linear-gradient(90deg,#8b5cf6,#38bdf8);-webkit-background-clip:text;background-clip:text;color:transparent;white-space:nowrap}
        .brandTag{font-size:11px;color:#94a3b8;margin-top:2px;letter-spacing:.1px}
        .nav{margin-top:19px;display:flex;flex-direction:column;gap:3px}
        .navItem{height:39px;width:100%;border:0;background:transparent;border-radius:6px;display:flex;align-items:center;gap:16px;padding:0 15px;color:#94a3b8;font-size:14px;text-align:left;cursor:pointer}
        .navItem svg{color:#94a3b8}
        .navItem.active{background:linear-gradient(90deg,#7c3aed,#8b5cf6);color:#fff;box-shadow:0 5px 12px rgba(139,92,246,.3)}
        .navItem.active svg{color:#fff}
        .agentCard{position:absolute;left:22px;right:22px;bottom:29px;height:293px;border:1px solid rgba(255,255,255,.07);border-radius:10px;background:linear-gradient(180deg,#0d1526 0%,#0b1220 100%);text-align:center;padding-top:16px;overflow:hidden}
        .agentTitle{font-size:14px;font-weight:700;color:#8b5cf6}
        .agentHello{font-size:12px;color:#8b5cf6;font-weight:700;margin-top:5px}
        .agentText{font-size:12px;line-height:21px;color:#94a3b8;margin-top:5px}
        .primaryButton{border:0;border-radius:6px;background:linear-gradient(90deg,#7c3aed,#8b5cf6);color:#fff;height:33px;padding:0 16px;display:inline-flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;box-shadow:0 5px 12px rgba(139,92,246,.3)}
        .agentButton{position:absolute;left:16px;right:16px;bottom:15px;width:calc(100% - 32px)}
        .main{flex:1;min-width:0;padding:31px 24px 18px 29px;background:#030712}
        .header{height:96px;display:flex;justify-content:space-between}
        .header h1{margin:2px 0 4px;font-size:26px;line-height:32px;letter-spacing:-.7px;font-weight:750;color:#f1f5f9}
        .header p{margin:0;color:#94a3b8;font-size:13.5px}
        .titleSpark{color:#8b5cf6;vertical-align:2px;margin-left:2px}
        .headerRight{display:flex;align-items:flex-start;gap:20px;position:relative;padding-top:0}
        .iconButton{border:0;background:transparent;color:#94a3b8;width:25px;height:34px;margin-top:0;cursor:pointer}
        .profile{display:flex;gap:10px;align-items:center;min-width:137px;margin-top:-1px}
        .avatar{width:35px;height:35px;border-radius:50%;background:linear-gradient(145deg,#2a2145,#05080f);color:#fff;display:flex;align-items:flex-end;justify-content:center;font-size:12px;font-weight:800;padding-bottom:7px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.15)}
        .profile b{display:block;font-size:12px;color:#f1f5f9;line-height:15px}
        .profile span{display:block;font-size:11px;color:#94a3b8}
        .profile svg{margin-left:auto;color:#94a3b8}
        .headerActions{position:absolute;right:0;top:37px;display:flex;gap:13px}
        .dateButton,.exportButton{height:34px;border:1px solid rgba(255,255,255,.07);border-radius:6px;background:#0b1220;color:#f1f5f9;font-size:12px;display:flex;align-items:center;justify-content:center;gap:9px;white-space:nowrap;padding:0 13px;cursor:pointer}
        .dateButton{width:220px}
        .exportButton{width:179px;background:linear-gradient(90deg,#7c3aed,#8b5cf6);border-color:#7c3aed;color:#fff;box-shadow:0 4px 10px rgba(139,92,246,.3)}
        .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-bottom:18px}
        .statCard{height:110px;border:1px solid rgba(255,255,255,.07);border-radius:9px;background:#0b1220;box-shadow:0 3px 14px rgba(0,0,0,.35);padding:18px 15px;display:flex;justify-content:space-between}
        .statTitle{font-size:11px;font-weight:650;color:#f1f5f9}
        .statValue{font-size:25px;font-weight:750;line-height:34px;color:#f1f5f9}
        .statSub{font-size:10.5px;color:#94a3b8;white-space:nowrap}
        .statSub.positive{color:#22c55e}
        .statIcon{width:56px;height:56px;border-radius:10px;display:flex;align-items:center;justify-content:center;margin-top:9px}
        .statIcon.purple{color:#8b5cf6;background:rgba(139,92,246,.16)}.statIcon.red{color:#f43f5e;background:rgba(244,63,94,.16)}.statIcon.green{color:#22c55e;background:rgba(34,197,94,.16)}.statIcon.blue{color:#38bdf8;background:rgba(56,189,248,.16)}
        .workspace{display:grid;grid-template-columns:minmax(0,1fr) 313px;gap:26px;align-items:start}
        @media(max-width:1180px){.workspace{grid-template-columns:minmax(0,1fr)}}
        .recommendationCard,.sideCard,.bottomHelp{border:1px solid rgba(255,255,255,.07);background:#0b1220;border-radius:10px;box-shadow:0 3px 14px rgba(0,0,0,.35)}
        .recommendationCard{height:666px;overflow:hidden}
        .tabsRow{height:67px;border-bottom:1px solid rgba(255,255,255,.05);display:flex;align-items:flex-end;justify-content:space-between;padding:0 10px 0 13px}
        .tabs{height:100%;display:flex;align-items:flex-end}
        .tab{height:45px;border:0;border-bottom:2px solid transparent;background:transparent;color:#94a3b8;font-size:11px;padding:0 19px;cursor:pointer}
        .activeTab{color:#8b5cf6;border-bottom-color:#8b5cf6}
        .categoryWrap{position:relative;margin-bottom:8px}
        .categorySelect{height:28px;width:198px;border:1px solid rgba(255,255,255,.07);border-radius:6px;background:#0b1220;color:#f1f5f9;font-size:11px;display:flex;align-items:center;gap:8px;padding:0 10px;cursor:pointer}
        .categorySelect span{flex:1;text-align:left}
        .categoryMenu{position:absolute;z-index:10;right:0;top:33px;width:198px;border:1px solid rgba(255,255,255,.07);border-radius:7px;background:#0d1526;box-shadow:0 12px 30px rgba(0,0,0,.45);padding:5px}
        .categoryMenu button{width:100%;border:0;background:#0d1526;text-align:left;padding:8px;border-radius:4px;font-size:11px;color:#f1f5f9;cursor:pointer}
        .categoryMenu button:hover{background:rgba(139,92,246,.16);color:#8b5cf6}
        .tableHeader{height:41px;background:#0d1526;display:grid;grid-template-columns:1fr 101px 103px 104px 100px;align-items:center;padding:0 14px 0 34px;color:#f1f5f9;font-size:10px;font-weight:700}
        .tableHeader>div:nth-child(n+2){text-align:center}
        .rows{height:509px}
        .recRow{height:102px;border-bottom:1px solid rgba(255,255,255,.05);display:grid;grid-template-columns:1fr 101px 103px 104px 100px;align-items:center;padding:0 10px 0 20px}
        .recommendation{display:flex;align-items:center;gap:18px;min-width:0}
        .recIcon{width:49px;height:49px;border-radius:12px;display:flex;align-items:center;justify-content:center;flex:none}
        .recIcon.red{background:rgba(244,63,94,.16);color:#f43f5e}.recIcon.orange{background:rgba(245,158,11,.16);color:#f59e0b}.recIcon.green{background:rgba(34,197,94,.16);color:#22c55e}.recIcon.blue{background:rgba(56,189,248,.16);color:#38bdf8}.recIcon.purple{background:rgba(139,92,246,.16);color:#8b5cf6}
        .recText{min-width:0}
        .recText b{display:block;font-size:12px;color:#f1f5f9;margin-bottom:3px}
        .recText p{margin:0;color:#94a3b8;font-size:10.5px;line-height:16px;max-width:410px}
        .tags{display:flex;gap:8px;margin-top:6px}
        .tag{font-size:9px;border-radius:4px;padding:3px 9px;border:1px solid}
        .tag.purple{color:#8b5cf6;border-color:rgba(139,92,246,.3);background:rgba(139,92,246,.14)}.tag.green{color:#22c55e;border-color:rgba(34,197,94,.3);background:rgba(34,197,94,.14)}.tag.orange{color:#f59e0b;border-color:rgba(245,158,11,.3);background:rgba(245,158,11,.14)}.tag.red{color:#f43f5e;border-color:rgba(244,63,94,.3);background:rgba(244,63,94,.14)}
        .scoreBox,.effortBox{display:flex;flex-direction:column;align-items:center;justify-content:center}
        .scoreRing{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center}
        .scoreInner{width:34px;height:34px;border-radius:50%;background:#0b1220;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#f1f5f9}
        .scoreLabel{font-size:9px;color:#94a3b8;margin-top:3px}
        .effortDots{display:flex;gap:4px;margin-bottom:4px}
        .effortDots span{width:13px;height:13px;border-radius:50%;border:1px solid rgba(255,255,255,.15);background:#0b1220}
        .effortDots span.filled{border-color:#8b5cf6;background:#8b5cf6}
        .priority{font-size:9px;border-radius:5px;padding:5px 12px;display:inline-block}
        .priority.high{color:#f43f5e;background:rgba(244,63,94,.16);border:1px solid rgba(244,63,94,.3)}.priority.medium{color:#f59e0b;background:rgba(245,158,11,.16);border:1px solid rgba(245,158,11,.3)}
        .actionCell{display:flex;align-items:center;justify-content:center;gap:7px}
        .details{height:28px;border:1px solid rgba(139,92,246,.4);border-radius:5px;background:#0b1220;color:#8b5cf6;font-size:10px;padding:0 11px;cursor:pointer;white-space:nowrap}
        .details:disabled{opacity:.6;cursor:default}
        .muted-note{font-size:10px;color:#94a3b8;white-space:nowrap}
        .dots{border:0;background:transparent;color:#94a3b8;padding:3px;cursor:pointer}
        .empty{height:509px;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:12px}
        .tableFooter{height:48px;display:flex;align-items:center;justify-content:space-between;padding:0 17px 0 20px;color:#94a3b8;font-size:10px}
        .pagination{display:flex;align-items:center;gap:4px}
        .pagination button{width:27px;height:27px;border:1px solid rgba(255,255,255,.07);border-radius:6px;background:#0b1220;color:#f1f5f9;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:10px}
        .pagination button svg{transform:rotate(90deg)}
        .pagination button:last-child svg{transform:rotate(-90deg)}
        .pagination .activePage{background:#8b5cf6;color:#fff;border-color:#8b5cf6;box-shadow:0 4px 10px rgba(139,92,246,.3)}
        .pagination span{padding:0 6px}
        .rightRail{display:flex;flex-direction:column;gap:14px}
        .sideCard{padding:20px 18px}
        .sideCard h3{margin:0 0 21px;font-size:12px;color:#f1f5f9;font-weight:750}
        .priorityCard{height:176px}.priorityContent{display:flex;align-items:center;gap:21px}
        .donut{width:89px;height:89px;border-radius:50%;background:conic-gradient(#f43f5e 0 33%,#f59e0b 33% 75%,#22c55e 75% 100%);position:relative;transform:rotate(-28deg);flex:none}
        .donut:after{content:"";position:absolute;inset:9px;border-radius:50%;background:#0b1220}
        .donutHole{position:absolute;z-index:2;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;transform:rotate(28deg)}
        .donutHole strong{font-size:19px;line-height:21px}.donutHole span{font-size:9px;color:#94a3b8}
        .legend{width:100%;display:flex;flex-direction:column;gap:13px}
        .legend>div{display:grid;grid-template-columns:12px 1fr auto;align-items:center;gap:8px;font-size:10px;color:#94a3b8}
        .legend b{font-size:9px;color:#f1f5f9}
        .dot{width:9px;height:9px;border-radius:50%;display:block}.redDot{background:#f43f5e}.orangeDot{background:#f59e0b}.greenDot{background:#22c55e}
        .impactCard{height:184px;padding-top:20px}.impactCard h3{margin-bottom:23px}
        .impactRow{margin-bottom:10px}.impactMeta{display:flex;justify-content:space-between;font-size:9.5px;color:#94a3b8;margin-bottom:5px}.impactMeta b{font-weight:500;color:#f1f5f9}
        .impactTrack{height:6px;background:rgba(255,255,255,.07);border-radius:9px;overflow:hidden}.impactTrack span{height:100%;display:block;background:#8b5cf6;border-radius:9px}.impactTrack.health{background:transparent}.impactTrack.health span{width:90%!important;background:#a78bfa}
        .categoriesCard{height:173px;padding-top:20px}.categoriesCard h3{margin-bottom:17px}
        .catRow{height:29px;display:grid;grid-template-columns:23px 1fr auto;align-items:center;font-size:10px;color:#94a3b8}
        .catRow b{font-size:10px;color:#f1f5f9}
        .catIcon{width:17px;height:17px;border-radius:5px;display:flex;align-items:center;justify-content:center}.catIcon.purple{color:#8b5cf6;background:rgba(139,92,246,.16)}.catIcon.green{color:#22c55e;background:rgba(34,197,94,.16)}.catIcon.orange{color:#f59e0b;background:rgba(245,158,11,.16)}.catIcon.blue{color:#38bdf8;background:rgba(56,189,248,.16)}
        .insightCard{height:151px;background:linear-gradient(135deg,#0d1526,#0b1220);border-color:rgba(255,255,255,.07);display:flex;gap:14px;padding:20px 17px}
        .insightRobot{width:74px;flex:none;display:flex;justify-content:center}
        .insightCard h3{margin:4px 0 8px;font-size:12px}.insightCard p{font-size:9.5px;line-height:17px;color:#94a3b8;margin:0 0 7px}.insightCard button{border:0;background:transparent;color:#8b5cf6;font-size:10px;padding:0;display:flex;align-items:center;gap:6px;cursor:pointer}
        .bottomHelp{height:72px;margin-top:14px;display:flex;align-items:center;padding:0 19px;gap:14px}
        .tinyRobot{width:53px;height:57px;display:flex;align-items:center;justify-content:center;overflow:hidden}
        .bottomHelp>div:nth-child(2){display:flex;flex-direction:column;gap:5px;flex:1}.bottomHelp b{font-size:12px;color:#f1f5f9}.bottomHelp span{font-size:10px;color:#94a3b8}
        .bottomHelp .primaryButton{height:33px;margin-right:0}
        .robot{width:100px;height:106px;position:relative;margin:8px auto 0;filter:drop-shadow(0 5px 5px rgba(0,0,0,.3));transform:scale(.84)}
        .robotGlow{position:absolute;width:78px;height:55px;left:11px;top:1px;border-radius:50%;background:radial-gradient(circle,rgba(139,92,246,.35) 0,rgba(139,92,246,.1) 54%,transparent 72%);filter:blur(2px)}
        .robotHead{position:absolute;left:17px;top:20px;width:66px;height:49px;border-radius:18px 18px 21px 21px;background:linear-gradient(145deg,#0d1526,#1a1433);box-shadow:inset 0 -5px 9px rgba(0,0,0,.35),0 5px 8px rgba(0,0,0,.3)}
        .robotFace{position:absolute;left:7px;top:9px;width:52px;height:31px;border-radius:13px;background:#05080f;display:flex;align-items:center;justify-content:center;gap:14px;box-shadow:inset 0 0 13px rgba(139,92,246,.3)}
        .robotEye{width:7px;height:7px;border-radius:50%;background:#22d3ee;box-shadow:0 0 7px #22d3ee}
        .robotEar{position:absolute;top:34px;width:17px;height:25px;border-radius:9px;background:#2a2145}.robotEar.left{left:7px}.robotEar.right{right:7px}
        .robotBody{position:absolute;left:28px;top:69px;width:44px;height:36px;border-radius:14px 14px 18px 18px;background:linear-gradient(145deg,#0d1526,#1a1433);box-shadow:inset 0 -5px 8px rgba(0,0,0,.35)}
        .robotCore{width:14px;height:14px;border-radius:50%;background:#8b5cf6;position:absolute;left:15px;top:8px;box-shadow:inset 0 2px 4px rgba(255,255,255,.2)}
        .robotSmall{transform:scale(.62);transform-origin:center;margin:-10px 0 0 -12px;width:100px;height:106px}
        .toast{position:fixed;z-index:100;left:50%;bottom:25px;transform:translateX(-50%);background:#0b1220;color:#fff;border-radius:7px;padding:10px 17px;font-size:11px;box-shadow:0 10px 25px rgba(0,0,0,.45)}
        
      `}</style>
    </div>
  );
}
