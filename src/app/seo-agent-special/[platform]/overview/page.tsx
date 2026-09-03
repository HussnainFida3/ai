"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePlatformParam, useSeoSnapshot, platformLabel, platformLogoUrl } from "@/lib/agent-data";

/**
 * ShadiLife.com — SEO AI Agent dashboard
 * Single-file React/TSX implementation.
 *
 * No external CSS, icon package, chart package, or image dependency is required.
 * Everything is contained in this file.
 */

const Icon = ({
  name,
  size = 20,
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
  };

  const paths: Record<string, React.ReactNode> = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    bot: <><rect x="4" y="7" width="16" height="12" rx="4"/><path d="M12 3v4"/><path d="M8 12h.01M16 12h.01"/><path d="M8 16c2.2 1.3 5.8 1.3 8 0"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    trend: <><path d="M3 17l6-6 4 4 8-9"/><path d="M16 6h5v5"/></>,
    edit: <><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></>,
    gear: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.7 1.7-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.2h-2.4v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1L6 17l.1-.1A1.7 1.7 0 0 0 6.4 15a1.7 1.7 0 0 0-1.5-1H4.7v-2.4h.2a1.7 1.7 0 0 0 1.5-1A1.7 1.7 0 0 0 6.1 8.7L6 8.6l1.7-1.7.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5v-.2h2.4v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.7 1.7-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.2V14h-.2a1.7 1.7 0 0 0-1.5 1Z"/></>,
    link: <><path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.2 1.2"/><path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.2-1.2"/></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h6"/></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
    calendar: <><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></>,
    download: <><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></>,
    spark: <><path d="m12 2 1.2 5.8L19 9l-5.8 1.2L12 16l-1.2-5.8L5 9l5.8-1.2Z"/><path d="m19 15 .6 2.4L22 18l-2.4.6L19 21l-.6-2.4L16 18l2.4-.6Z"/></>,
    light: <><path d="M9 18h6M10 22h4"/><path d="M8.3 14.5A7 7 0 1 1 15.7 14c-.9.8-1.7 1.8-1.7 3h-4c0-1.2-.8-2.1-1.7-2.5Z"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    arrowUp: <><path d="m6 15 6-6 6 6"/></>,
    chevron: <path d="m8 10 4 4 4-4"/>,
    close: <><path d="M6 6l12 12M18 6 6 18"/></>,
    wrench: <><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-3 3-3-3Z"/></>,
  };

  return <svg {...common}>{paths[name] ?? paths.dashboard}</svg>;
};

const Sparkle = () => (
  <span className="titleSpark">
    <Icon name="spark" size={22} stroke={1.5}/>
  </span>
);

const MiniLine = ({ points, fill = true }: { points: string; fill?: boolean }) => (
  <svg className="miniChart" viewBox="0 0 250 55" preserveAspectRatio="none">
    {fill && <polygon points={`${points} 250,55 0,55`} className="miniFill"/>}
    <polyline points={points} className="miniStroke"/>
  </svg>
);

const StatusPill = ({ children, tone = "green" }: { children: React.ReactNode; tone?: "green"|"yellow"|"blue" }) => (
  <span className={`statusPill ${tone}`}><span>{children}</span></span>
);

const RobotArt = () => (
  <svg className="robotArt" viewBox="0 0 430 220" aria-hidden="true">
    <defs>
      <linearGradient id="purplePanel" x1="0" x2="1">
        <stop offset="0" stopColor="#8b5cf6"/>
        <stop offset="1" stopColor="#a78bfa"/>
      </linearGradient>
      <linearGradient id="robotBody" x1="0" x2="1">
        <stop offset="0" stopColor="#0d1526"/>
        <stop offset="1" stopColor="#1a1433"/>
      </linearGradient>
    </defs>
    <ellipse cx="218" cy="207" rx="185" ry="10" fill="rgba(0,0,0,.4)"/>
    <g transform="translate(12,15)">
      <rect x="26" y="30" width="210" height="142" rx="17" fill="#0b1220" stroke="rgba(139,92,246,.3)" strokeWidth="2"/>
      <rect x="43" y="47" width="176" height="72" rx="10" fill="#0d1526"/>
      <rect x="61" y="60" width="125" height="13" rx="6.5" fill="url(#purplePanel)" opacity=".85"/>
      <circle cx="57" cy="95" r="7" fill="#0b1220" stroke="rgba(139,92,246,.4)" strokeWidth="2"/>
      <path d="m53 95 3 3 6-7" stroke="#8b5cf6" strokeWidth="2" fill="none"/>
      <rect x="70" y="89" width="125" height="11" rx="5" fill="#1a1433"/>
      <circle cx="57" cy="117" r="7" fill="#0b1220" stroke="rgba(139,92,246,.4)" strokeWidth="2"/>
      <rect x="70" y="111" width="105" height="11" rx="5" fill="#1a1433"/>
      <rect x="48" y="132" width="9" height="25" rx="2" fill="#7c3aed"/>
      <rect x="62" y="143" width="9" height="14" rx="2" fill="#a78bfa"/>
      <rect x="76" y="125" width="9" height="32" rx="2" fill="#8b5cf6"/>
      <path d="M48 126c18-16 37-8 51-28 15-20 35-14 51-29" stroke="#8b5cf6" strokeWidth="3" fill="none"/>
      <path d="M198 132l18-18" stroke="rgba(139,92,246,.4)" strokeWidth="3"/>
      <circle cx="216" cy="114" r="7" fill="#0b1220" stroke="#8b5cf6" strokeWidth="3"/>
    </g>
    <g transform="translate(245,7)">
      <ellipse cx="83" cy="194" rx="51" ry="9" fill="rgba(0,0,0,.4)"/>
      <rect x="52" y="113" width="63" height="78" rx="25" fill="url(#robotBody)" stroke="rgba(139,92,246,.3)" strokeWidth="2"/>
      <rect x="45" y="50" width="78" height="79" rx="28" fill="url(#robotBody)" stroke="rgba(139,92,246,.3)" strokeWidth="2"/>
      <rect x="54" y="60" width="60" height="44" rx="19" fill="#05080f"/>
      <circle cx="75" cy="81" r="8" fill="#22d3ee"/>
      <circle cx="94" cy="81" r="8" fill="#22d3ee"/>
      <path d="M73 92c8 5 16 5 24 0" stroke="#22d3ee" strokeWidth="3" fill="none" strokeLinecap="round"/>
      <rect x="76" y="36" width="16" height="14" rx="6" fill="#2a2145"/>
      <circle cx="84" cy="29" r="6" fill="#8b5cf6"/>
      <path d="M50 126c-24 3-31 20-28 39" stroke="rgba(139,92,246,.4)" strokeWidth="14" fill="none" strokeLinecap="round"/>
      <circle cx="23" cy="166" r="9" fill="#8b5cf6"/>
      <path d="M116 126c24 2 32 20 28 38" stroke="rgba(139,92,246,.4)" strokeWidth="14" fill="none" strokeLinecap="round"/>
      <circle cx="144" cy="164" r="9" fill="#8b5cf6"/>
      <rect x="69" y="189" width="13" height="8" rx="4" fill="#2a2145"/>
      <rect x="92" y="189" width="13" height="8" rx="4" fill="#2a2145"/>
      <path d="M131 49c13-7 24 5 22 19" stroke="rgba(139,92,246,.4)" strokeWidth="9" fill="none" strokeLinecap="round"/>
      <circle cx="153" cy="68" r="16" fill="#2a2145" stroke="rgba(139,92,246,.3)" strokeWidth="2"/>
    </g>
  </svg>
);

const Donut = () => (
  <div className="donut">
    <div className="donutHole">
      <b>5,842</b>
      <span>Total Keywords</span>
    </div>
  </div>
);

const PerformanceChart = () => (
  <svg className="performanceChart" viewBox="0 0 500 230" preserveAspectRatio="none">
    <g className="grid">
      <line x1="48" y1="20" x2="488" y2="20"/><line x1="48" y1="67" x2="488" y2="67"/>
      <line x1="48" y1="114" x2="488" y2="114"/><line x1="48" y1="161" x2="488" y2="161"/><line x1="48" y1="208" x2="488" y2="208"/>
    </g>
    <text x="6" y="24">150K</text><text x="6" y="71">100K</text><text x="17" y="118">50K</text><text x="31" y="212">0</text>
    <path d="M48 126 L78 114 L108 118 L138 105 L168 98 L198 108 L228 91 L258 84 L288 72 L318 84 L348 79 L378 65 L408 48 L438 59 L468 35 L488 29 L488 208 L48 208Z" className="areaPurple"/>
    <polyline points="48,126 78,114 108,118 138,105 168,98 198,108 228,91 258,84 288,72 318,84 348,79 378,65 408,48 438,59 468,35 488,29" className="linePurple"/>
    <path d="M48 178 L78 169 L108 172 L138 160 L168 153 L198 160 L228 150 L258 146 L288 139 L318 151 L348 147 L378 133 L408 117 L438 125 L468 106 L488 111 L488 208 L48 208Z" className="areaGreen"/>
    <polyline points="48,178 78,169 108,172 138,160 168,153 198,160 228,150 258,146 288,139 318,151 348,147 378,133 408,117 438,125 468,106 488,111" className="lineGreen"/>
    {["May 22","May 29","Jun 5","Jun 12","Jun 19"].map((t,i)=><text key={t} x={[48,158,267,376,466][i]} y="226" textAnchor={i===4?"end":"middle"}>{t}</text>)}
  </svg>
);

export default function ShadiLifeSEOAgent({ params }: { params: Promise<{ platform: string }> }) {
  const platform = usePlatformParam(params);
  const pathname = usePathname();
  const seo = useSeoSnapshot(platform);
  const [showInsights, setShowInsights] = useState(false);

  const nav: Array<[string, string, string]> = [
    ["Overview", "dashboard", "overview"],
    ["Chat", "bot", "chat"],
    ["Statistics", "trend", "statistics"],
    ["AI Recommendations", "spark", "recommendations"],
    ["Blog Optimization", "edit", "blog-optimization"],
  ];

  return (
    <div className="app">
      <style>{`
        *{box-sizing:border-box}
        :root{
          --purple:#7c3aed;--purple2:#8b5cf6;--ink:#f1f5f9;--muted:#94a3b8;
          --line:rgba(255,255,255,.07);--green:#22c55e;--blue:#38bdf8;--yellow:#f59e0b;
          font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
        }
        body{margin:0;background:#030712;color:var(--ink)}
        button{font:inherit}
        .app{width:100%;min-height:100vh;background:#030712;display:flex;overflow:hidden}
        .sidebar{width:260px;flex:0 0 260px;background:#05080f;border-right:1px solid rgba(255,255,255,.07);min-height:100vh;padding:33px 15px 20px;position:relative}
        .brand{height:70px;padding-left:15px;display:flex;align-items:flex-start;gap:10px}
        .brandMark{width:39px;height:39px;object-fit:contain;margin-top:2px}
        .brandName{font-size:24px;line-height:28px;font-weight:750;letter-spacing:-.8px;color:#8b5cf6}
        .brandName b{color:#f43f5e;font-weight:650}
        .tagline{font-size:12px;color:#94a3b8;line-height:18px}
        .nav{margin-top:7px}
        .navItem{height:42px;border-radius:7px;display:flex;align-items:center;gap:16px;padding:0 14px;color:#94a3b8;font-size:14px;margin-bottom:4px;cursor:pointer}
        .navItem svg{color:#94a3b8}
        .navItem.active{background:linear-gradient(90deg,#7c3aed,#8b5cf6);color:#fff;box-shadow:0 6px 14px rgba(139,92,246,.3)}
        .navItem.active svg{color:#fff}
        .assistantCard{position:absolute;left:21px;right:21px;bottom:19px;height:300px;border:1px solid rgba(255,255,255,.07);border-radius:13px;background:linear-gradient(180deg,#0d1526,#0b1220);text-align:center;padding:17px 17px 15px;overflow:hidden}
        .assistantTitle{font-weight:750;color:#8b5cf6;font-size:15px}
        .assistantRobot{width:106px;height:106px;margin:8px auto 3px;position:relative}
        .assistantRobot .head{width:63px;height:51px;border-radius:22px;background:#2a2145;border:1px solid rgba(139,92,246,.3);position:absolute;left:21px;top:13px;box-shadow:inset 0 -4px 0 rgba(0,0,0,.3)}
        .assistantRobot .screen{position:absolute;left:28px;top:21px;width:49px;height:32px;background:#05080f;border-radius:13px}
        .assistantRobot .eye{position:absolute;width:7px;height:7px;border-radius:50%;background:#22d3ee;top:32px}
        .assistantRobot .eye.a{left:41px}.assistantRobot .eye.b{left:58px}
        .assistantRobot .body{position:absolute;left:31px;top:62px;width:43px;height:33px;border-radius:17px 17px 12px 12px;background:#2a2145;border:1px solid rgba(139,92,246,.3)}
        .assistantRobot .arm{position:absolute;top:68px;width:29px;height:8px;border-radius:8px;background:#2a2145}
        .assistantRobot .arm.a{left:7px;transform:rotate(24deg)}.assistantRobot .arm.b{right:7px;transform:rotate(-24deg)}
        .assistantCopy{font-size:13px;line-height:23px;color:#94a3b8;margin:4px 0 13px}
        .askBtn,.purpleBtn{border:0;border-radius:7px;background:linear-gradient(90deg,#7c3aed,#8b5cf6);color:#fff;font-weight:650;cursor:pointer;box-shadow:0 5px 10px rgba(139,92,246,.25)}
        .askBtn{height:38px;width:181px}
        .main{flex:1;min-width:0;padding:25px 24px 23px 31px}
        .topbar{height:66px;display:flex;align-items:flex-start;justify-content:space-between}
        .heading h1{margin:0;font-size:27px;line-height:34px;letter-spacing:-.5px;font-weight:760}
        .heading p{margin:2px 0 0;color:#94a3b8;font-size:14px}
        .titleSpark{display:inline-flex;color:#8b5cf6;vertical-align:2px;margin-left:4px}
        .actions{display:flex;align-items:center;gap:12px}
        .dateBtn{height:35px;padding:0 14px;border:1px solid rgba(255,255,255,.07);background:#0b1220;border-radius:7px;color:#f1f5f9;font-size:12px;display:flex;align-items:center;gap:9px}
        .exportBtn{height:35px;padding:0 14px;border:0;background:linear-gradient(90deg,#7c3aed,#8b5cf6);border-radius:7px;color:#fff;font-size:12px;display:flex;align-items:center;gap:7px;box-shadow:0 5px 12px rgba(139,92,246,.25)}
        .profile{display:flex;align-items:center;gap:9px;margin-left:2px}
        .bell{color:#94a3b8;margin-right:13px}
        .avatar{width:37px;height:37px;border-radius:50%;overflow:hidden;background:#0d1526;border:1px solid rgba(255,255,255,.07);display:flex;align-items:center;justify-content:center}
        .avatar:before{content:"";width:15px;height:15px;background:#94a3b8;border-radius:50%;position:absolute;margin-top:-13px}
        .avatar:after{content:"";width:22px;height:14px;background:#94a3b8;border-radius:12px 12px 4px 4px;position:absolute;margin-top:16px}
        .profileText{line-height:16px}.profileText b{font-size:12px}.profileText span{display:block;color:#94a3b8;font-size:11px}
        .profile svg{color:#94a3b8;margin-left:5px}
        .stats{display:grid;grid-template-columns:repeat(5,1fr);gap:11px;margin-top:7px}
        .card{background:#0b1220;border:1px solid rgba(255,255,255,.07);border-radius:14px;box-shadow:0 1px 2px rgba(0,0,0,.3)}
        .stat{height:170px;padding:19px 20px 13px;position:relative;overflow:hidden}
        .statLabel{font-size:13px;font-weight:650;margin-bottom:8px}
        .statValue{font-size:28px;font-weight:770;letter-spacing:-.8px}
        .up{font-size:12px;color:#22c55e;margin-left:7px;font-weight:700;vertical-align:5px}
        .statSub{font-size:11px;color:#94a3b8;margin-top:3px}
        .miniChart{position:absolute;left:18px;right:17px;bottom:11px;width:calc(100% - 35px);height:48px;overflow:visible}
        .miniStroke{fill:none;stroke:#8b5cf6;stroke-width:2.1}
        .miniFill{fill:url(#noGradient)}
        .miniChart .miniFill{fill:rgba(139,92,246,.22);opacity:.8}
        .seoScore{display:flex;align-items:center;gap:17px;margin-top:0}
        .scoreRing{width:91px;height:91px;border-radius:50%;background:conic-gradient(#8b5cf6 0 62%,#22c55e 62% 87%,rgba(255,255,255,.08) 87% 100%);position:relative}
        .scoreRing:after{content:"";position:absolute;inset:8px;background:#0b1220;border-radius:50%}
        .scoreCenter{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;z-index:2}
        .scoreCenter b{font-size:26px}.scoreCenter span{font-size:10px;color:#94a3b8}
        .excellent b{font-size:12px;color:#22c55e}.excellent span{display:block;color:#94a3b8;font-size:11px;margin-top:5px}
        .excellent .pts{color:#22c55e;font-weight:700}
        .row2{display:grid;grid-template-columns:2fr 1.12fr;gap:11px;margin-top:10px}
        .overview{height:253px;padding:19px 18px;display:flex;position:relative;overflow:hidden}
        .overviewCopy{width:56%;padding-left:1px}
        .sectionTitle{font-size:16px;font-weight:750;display:flex;align-items:center;gap:9px}
        .sectionTitle .robotIcon{width:29px;height:29px;border-radius:50%;background:rgba(139,92,246,.16);display:flex;align-items:center;justify-content:center;color:#8b5cf6}
        .overviewText{font-size:12px;line-height:22px;color:#94a3b8;margin:17px 0 12px;max-width:570px}
        .overviewText strong{color:#f1f5f9}
        .insightBtn{height:35px;padding:0 14px;font-size:12px}
        .overviewArt{position:absolute;right:5px;bottom:9px;width:430px;height:220px}
        .topPages{height:253px;padding:18px 19px}
        .cardHeader{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
        .cardHeader h3{margin:0;font-size:15px}
        .viewBtn{height:28px;border:1px solid rgba(139,92,246,.35);background:#0b1220;border-radius:6px;padding:0 11px;color:#8b5cf6;font-size:11px}
        .pagesTable{width:100%;border-collapse:collapse;font-size:12px}
        .pagesTable th{font-size:11px;color:#94a3b8;font-weight:500;text-align:left;padding:0 0 8px}
        .pagesTable th:nth-child(2),.pagesTable td:nth-child(2){text-align:right}
        .pagesTable th:last-child,.pagesTable td:last-child{text-align:right}
        .pagesTable td{height:31px;border-top:1px solid rgba(255,255,255,.05)}
        .greenUp{color:#22c55e;font-weight:650}
        .row3{display:grid;grid-template-columns:1.02fr 1.02fr .96fr;gap:11px;margin-top:10px}
        .rankCard,.performance,.tasks{height:275px;padding:18px 19px}
        .rankBody{display:flex;align-items:center;gap:19px;margin-top:16px}
        .donut{width:174px;height:174px;border-radius:50%;background:conic-gradient(#22c55e 0 21.5%,#38bdf8 21.5% 58%,#f59e0b 58% 91.2%,#f43f5e 91.2% 100%);position:relative;flex:0 0 174px}
        .donutHole{position:absolute;inset:38px;background:#0b1220;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-direction:column}
        .donutHole b{font-size:17px}.donutHole span{font-size:10px;margin-top:3px;color:#94a3b8}
        .legend{font-size:11px;line-height:31px;flex:1}
        .legendLine{display:flex;align-items:center;gap:9px;white-space:nowrap}
        .dot{width:11px;height:11px;border-radius:3px;display:inline-block}
        .dot.green{background:#22c55e}.dot.blue{background:#38bdf8}.dot.yellow{background:#f59e0b}.dot.red{background:#f43f5e}
        .legend b{font-size:12px;margin-right:3px}.legend span{color:#94a3b8}
        .performance .legendTop{display:flex;gap:22px;font-size:11px;color:#94a3b8;margin:13px 0 0 47px}
        .legendDot{width:9px;height:9px;border-radius:50%;display:inline-block;margin-right:7px}.legendDot.p{background:#8b5cf6}.legendDot.g{background:#22c55e}
        .performanceChart{width:100%;height:190px;margin-top:1px;overflow:visible}
        .performanceChart .grid line{stroke:rgba(255,255,255,.07);stroke-width:1}
        .performanceChart text{font-size:10px;fill:#94a3b8}
        .linePurple{fill:none;stroke:#8b5cf6;stroke-width:2.5}.lineGreen{fill:none;stroke:#22c55e;stroke-width:2.5}
        .areaPurple{fill:rgba(139,92,246,.2);opacity:.75}.areaGreen{fill:rgba(34,197,94,.2);opacity:.65}
        .tasks .task{height:52px;border-top:1px solid rgba(255,255,255,.05);display:flex;align-items:center;gap:10px}
        .tasks .task:first-of-type{border-top:0}
        .taskIcon{width:31px;height:31px;border-radius:8px;background:rgba(139,92,246,.16);color:#8b5cf6;display:flex;align-items:center;justify-content:center;flex:0 0 31px}
        .taskInfo{min-width:0;flex:1}.taskName{font-size:11px;font-weight:650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.taskMeta{font-size:10px;color:#94a3b8;margin-top:3px}
        .taskMeta.high{color:#22c55e}.taskMeta.medium{color:#94a3b8}
        .taskRight{display:flex;align-items:center;gap:6px}.taskRight svg{color:#22c55e}
        .statusPill{height:23px;padding:0 9px;border-radius:6px;font-size:10px;display:flex;align-items:center;border:1px solid}
        .statusPill.green{background:rgba(34,197,94,.16);border-color:rgba(34,197,94,.3);color:#22c55e}.statusPill.blue{background:rgba(56,189,248,.16);border-color:rgba(56,189,248,.3);color:#38bdf8}.statusPill.yellow{background:rgba(245,158,11,.16);border-color:rgba(245,158,11,.3);color:#f59e0b}
        .recommend{height:150px;margin-top:10px;padding:18px 18px 16px}
        .recommendGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:13px;margin-top:14px}
        .rec{height:88px;border:1px solid rgba(255,255,255,.07);border-radius:8px;background:#0b1220;display:grid;grid-template-columns:35px 1fr;grid-template-rows:auto 28px;padding:10px 12px;column-gap:7px}
        .recIcon{grid-row:1/3;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center}
        .rec:nth-child(1) .recIcon{color:#38bdf8;background:rgba(56,189,248,.16)}.rec:nth-child(2) .recIcon{color:#22c55e;background:rgba(34,197,94,.16)}.rec:nth-child(3) .recIcon{color:#f43f5e;background:rgba(244,63,94,.16)}.rec:nth-child(4) .recIcon{color:#8b5cf6;background:rgba(139,92,246,.16)}
        .rec h4{margin:0;font-size:12px;font-weight:700}.rec p{margin:2px 0 0;color:#94a3b8;font-size:10px}
        .rec button{align-self:end;justify-self:start;height:27px;border:1px solid rgba(139,92,246,.35);background:#0b1220;border-radius:6px;color:#8b5cf6;font-size:10px;padding:0 10px}
        .modalShade{position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:10}
        .modal{width:510px;background:#0b1220;border-radius:16px;border:1px solid rgba(255,255,255,.07);box-shadow:0 24px 70px rgba(0,0,0,.5);padding:23px}
        .modalHeader{display:flex;justify-content:space-between}.modal h2{margin:0;font-size:19px}.close{border:0;background:#0d1526;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#94a3b8}
        .modal p{font-size:12px;color:#94a3b8;line-height:20px}.insightList{display:grid;gap:9px;margin-top:14px}.insight{border:1px solid rgba(255,255,255,.07);border-radius:9px;padding:12px;display:flex;gap:10px}.insight b{font-size:12px}.insight span{display:block;color:#94a3b8;font-size:11px;margin-top:3px}
      `}</style>

      <aside className="sidebar">
        <div className="brand">
          <img className="brandMark" src={platformLogoUrl(platform)} alt={`${platformLabel(platform)} logo`} />
          <div>
            <div className="brandName">{platformLabel(platform)}<span>.com</span></div>
            <div className="tagline">SEO Agent Special</div>
          </div>
        </div>

        <nav className="nav">
          {nav.map(([label, icon, slug]) => {
            const href = `/seo-agent-special/${platform}/${slug}`;
            return (
              <Link key={label} href={href} className={`navItem ${pathname === href ? "active" : ""}`}>
                <Icon name={icon} size={19} /><span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="assistantCard">
          <div className="assistantTitle">SEO AI Agent</div>
          <div className="assistantRobot">
            <div className="head"/><div className="screen"/>
            <div className="eye a"/><div className="eye b"/>
            <div className="body"/><div className="arm a"/><div className="arm b"/>
          </div>
          <div className="assistantCopy">Hi! I’m your SEO AI Agent.<br/>I analyze, optimize &amp;<br/>grow your traffic.</div>
          <Link href={`/seo-agent-special/${platform}/chat`} className="askBtn" style={{ display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>Ask AI Agent</Link>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="heading">
            <h1>SEO AI Agent <Sparkle/></h1>
            <p>Intelligent SEO Automation for {platformLabel(platform)}.com</p>
          </div>
          <div className="actions">
            <button className="dateBtn"><Icon name="calendar" size={16}/>May 22, 2025&nbsp; - &nbsp;Jun 22, 2025</button>
            <button className="exportBtn"><Icon name="download" size={15}/>Export Report</button>
            <div className="profile">
              <div className="bell"><Icon name="bell" size={20}/></div>
              <div className="avatar"/>
              <div className="profileText"><b>Admin</b><span>SEO Manager</span></div>
              <Icon name="chevron" size={15}/>
            </div>
          </div>
        </header>

        <section className="stats">
          <div className="card stat">
            <div className="statLabel">Organic Sessions</div>
            <div className="statValue">128.6K <span className="up">↑ 28.5%</span></div>
            <div className="statSub">vs Apr 22 - May 21, 2025</div>
            <MiniLine points="0,42 10,37 22,43 35,32 48,36 61,26 73,31 86,22 97,36 108,12 120,32 133,21 146,29 160,18 173,32 186,21 199,31 212,18 225,22 237,4 250,11"/>
          </div>
          <div className="card stat">
            <div className="statLabel">Published Posts</div>
            <div className="statValue">{seo.loading ? "…" : (seo.publishedCount ?? "—")}</div>
            <div className="statSub">{seo.error ? `Live data unavailable: ${seo.error}` : "Real, live count"}</div>
          </div>
          <div className="card stat">
            <div className="statLabel">Needs Improvement</div>
            <div className="statValue">{seo.loading ? "…" : seo.needsImprovement.length}</div>
            <div className="statSub">{seo.mostCommonIssue ? `Most common: ${seo.mostCommonIssue.rule} (${seo.mostCommonIssue.failingPercent}%)` : "Posts scoring under 7/10"}</div>
          </div>
          <div className="card stat">
            <div className="statLabel">SEO Score</div>
            <div className="seoScore">
              <div
                className="scoreRing"
                style={
                  seo.averageScore === null
                    ? undefined
                    : { background: `conic-gradient(#8b5cf6 0 ${Math.round((seo.averageScore / seo.maxScore) * 360)}deg, rgba(255,255,255,.08) ${Math.round((seo.averageScore / seo.maxScore) * 360)}deg 360deg)` }
                }
              >
                <div className="scoreCenter">
                  <b>{seo.loading ? "…" : (seo.averageScore ?? "—")}</b>
                  <span>/{seo.maxScore}</span>
                </div>
              </div>
              <div className="excellent">
                <b>{seo.averageScore === null ? "—" : seo.averageScore >= seo.maxScore * 0.8 ? "Excellent" : seo.averageScore >= seo.maxScore * 0.6 ? "Good" : "Needs work"}</b>
                <span>Real, live average across every published post</span>
              </div>
            </div>
          </div>
          <div className="card stat">
            <div className="statLabel">Conversions</div>
            <div className="statValue">2,845 <span className="up">↑ 31.7%</span></div>
            <div className="statSub">vs Apr 22 - May 21, 2025</div>
            <MiniLine points="0,47 13,43 26,45 39,42 51,22 64,37 77,39 90,27 103,34 116,24 129,33 142,18 155,25 168,20 181,31 194,12 207,34 220,18 233,3 246,29 250,10"/>
          </div>
        </section>

        <section className="row2">
          <div className="card overview">
            <div className="overviewCopy">
              <div className="sectionTitle"><span className="robotIcon"><Icon name="bot" size={19}/></span>AI SEO Overview</div>
              <div className="overviewText">Your website is performing great! Organic traffic is up <strong>28.5%</strong> this month, we found <strong>1,248</strong> new keyword opportunities and <strong>18</strong> technical issues were fixed automatically.</div>
              <button className="askBtn insightBtn" onClick={()=>setShowInsights(true)}>View AI Insights</button>
            </div>
            <div className="overviewArt"><RobotArt/></div>
          </div>

          <div className="card topPages">
            <div className="cardHeader"><h3>Top Performing Pages</h3><button className="viewBtn">View All</button></div>
            {/* Neither platform tracks per-page sessions or search position, so
                this shows what the SEO audit genuinely returns — the real scored
                posts — rather than invented traffic figures (which previously
                also listed ShadiLife's own routes on GhrFix's dashboard). */}
            <table className="pagesTable">
              <thead><tr><th>Page</th><th>SEO score</th></tr></thead>
              <tbody>
                {seo.loading ? (
                  <tr><td colSpan={2}>Loading…</td></tr>
                ) : seo.needsImprovement.length > 0 ? (
                  seo.needsImprovement.slice(0, 5).map((post) => (
                    <tr key={post.id}>
                      <td>{post.title}</td>
                      <td className={post.score >= seo.maxScore * 0.8 ? "greenUp" : undefined}>
                        {post.score}/{seo.maxScore}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2}>
                      {seo.publishedCount === 0
                        ? `No published pages on ${platformLabel(platform)} yet.`
                        : "Every published page is scoring well."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="row3">
          <div className="card rankCard">
            <div className="cardHeader"><h3>Keyword Rankings</h3><button className="viewBtn">View Full Report</button></div>
            <div className="rankBody">
              <Donut/>
              <div className="legend">
                <div className="legendLine"><i className="dot green"/><b>1,256</b><span>Top 3</span><span>(21.5%)</span></div>
                <div className="legendLine"><i className="dot blue"/><b>2,134</b><span>Top 4-10</span><span>(36.5%)</span></div>
                <div className="legendLine"><i className="dot yellow"/><b>1,942</b><span>Top 11-50</span><span>(33.2%)</span></div>
                <div className="legendLine"><i className="dot red"/><b>510</b><span>Top 51-100</span><span>(8.8%)</span></div>
              </div>
            </div>
          </div>

          <div className="card performance">
            <div className="cardHeader"><h3>SEO Performance</h3></div>
            <div className="legendTop"><span><i className="legendDot p"/>Organic Traffic</span><span><i className="legendDot g"/>Organic Keywords</span></div>
            <PerformanceChart/>
          </div>

          <div className="card tasks">
            <div className="cardHeader"><h3>AI SEO Tasks</h3><button className="viewBtn">View All</button></div>
            <div className="task">
              <div className="taskIcon"><Icon name="edit" size={16}/></div>
              <div className="taskInfo"><div className="taskName">Optimize meta titles for 45 pages</div><div className="taskMeta high">High impact</div></div>
              <div className="taskRight"><StatusPill>Completed</StatusPill><Icon name="check" size={17}/></div>
            </div>
            <div className="task">
              <div className="taskIcon"><Icon name="edit" size={16}/></div>
              <div className="taskInfo"><div className="taskName">Generate content for new keywords</div><div className="taskMeta medium">Medium impact</div></div>
              <div className="taskRight"><StatusPill tone="blue">In Progress</StatusPill><Icon name="chevron" size={16}/></div>
            </div>
            <div className="task">
              <div className="taskIcon"><Icon name="wrench" size={16}/></div>
              <div className="taskInfo"><div className="taskName">Fix technical SEO issues</div><div className="taskMeta high">High impact</div></div>
              <div className="taskRight"><StatusPill>Completed</StatusPill><Icon name="check" size={17}/></div>
            </div>
            <div className="task">
              <div className="taskIcon"><Icon name="link" size={16}/></div>
              <div className="taskInfo"><div className="taskName">Build backlinks for priority pages</div><div className="taskMeta medium">Medium impact</div></div>
              <div className="taskRight"><StatusPill tone="yellow">Pending</StatusPill><Icon name="chevron" size={16}/></div>
            </div>
          </div>
        </section>

        <section className="card recommend">
          <div className="sectionTitle"><span style={{color:"#8b5cf6"}}><Icon name="light" size={20}/></span>AI Recommendations</div>
          <div className="recommendGrid">
            <div className="rec"><div className="recIcon"><Icon name="light" size={18}/></div><div><h4>Target 248 new keywords</h4><p>High potential keywords</p></div><button>View Keywords</button></div>
            <div className="rec"><div className="recIcon"><Icon name="edit" size={17}/></div><div><h4>Optimize 45 pages</h4><p>Improve on-page SEO</p></div><button>Optimize Now</button></div>
            <div className="rec"><div className="recIcon"><Icon name="wrench" size={17}/></div><div><h4>Fix 18 technical issues</h4><p>Improve site health</p></div><button>Fix Issues</button></div>
            <div className="rec"><div className="recIcon"><Icon name="link" size={17}/></div><div><h4>Build quality backlinks</h4><p>Increase domain authority</p></div><button>Build Backlinks</button></div>
          </div>
        </section>
      </main>

      {showInsights && (
        <div className="modalShade" onClick={()=>setShowInsights(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modalHeader"><h2>AI SEO Insights</h2><button className="close" onClick={()=>setShowInsights(false)}><Icon name="close" size={16}/></button></div>
            <p>Your SEO AI Agent has identified the highest-impact opportunities for {platformLabel(platform)}.com.</p>
            <div className="insightList">
              <div className="insight"><Icon name="trend" size={20}/><div><b>Organic growth is accelerating</b><span>Traffic is up 28.5% compared with the previous period.</span></div></div>
              <div className="insight"><Icon name="search" size={20}/><div><b>1,248 keyword opportunities</b><span>Prioritize high-intent queries where the site is already close to page one.</span></div></div>
              <div className="insight"><Icon name="wrench" size={20}/><div><b>18 technical issues fixed</b><span>Automation has already resolved the reported technical SEO issues.</span></div></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
