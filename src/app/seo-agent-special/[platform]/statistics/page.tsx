"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePlatformParam, platformLabel } from "@/lib/agent-data";

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

const MiniTrend = ({ kind = "purple" }: { kind?: "purple" | "green" }) => (
  <svg viewBox="0 0 185 62" className={`mini-trend ${kind}`}>
    <path d="M0 49 C18 48 18 43 31 46 C44 49 45 37 58 40 C70 44 72 29 84 35 C96 41 99 25 111 32 C122 39 123 23 136 29 C149 35 153 18 163 25 C171 31 176 17 185 7 L185 62 L0 62 Z" className="mini-area"/>
    <path d="M0 49 C18 48 18 43 31 46 C44 49 45 37 58 40 C70 44 72 29 84 35 C96 41 99 25 111 32 C122 39 123 23 136 29 C149 35 153 18 163 25 C171 31 176 17 185 7" className="mini-line"/>
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

const BarChart = () => {
  const values = [36, 39, 41, 46, 48, 47, 52, 57, 55, 51, 52, 54, 58, 60, 65, 70, 77, 69, 64, 68, 70, 70, 73, 80, 86, 84, 87, 88, 93, 98];
  const keywords = [23, 25, 27, 31, 33, 32, 35, 38, 44, 42, 39, 40, 44, 47, 50, 57, 64, 57, 53, 56, 60, 59, 61, 67, 72, 71, 75, 78, 80, 84];
  return (
    <div className="traffic-chart">
      <div className="chart-y left"><span>200K</span><span>150K</span><span>100K</span><span>50K</span><span>0</span></div>
      <div className="chart-y right"><span>8K</span><span>6K</span><span>4K</span><span>2K</span><span>0</span></div>
      <div className="grid-lines">{[0,1,2,3,4].map(i=><i key={i}/>)}</div>
      <svg viewBox="0 0 720 205" preserveAspectRatio="none" className="traffic-svg">
        <defs>
          <linearGradient id="trafficFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6940f6" stopOpacity=".20"/>
            <stop offset="100%" stopColor="#6940f6" stopOpacity=".03"/>
          </linearGradient>
          <linearGradient id="keywordFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#18b77a" stopOpacity=".16"/>
            <stop offset="100%" stopColor="#18b77a" stopOpacity=".03"/>
          </linearGradient>
        </defs>
        <path d={`M0 112 ${values.map((v,i)=>`L${i*24.8} ${190-v*1.58}`).join(" ")} L720 205 L0 205 Z`} fill="url(#trafficFill)"/>
        <polyline points={values.map((v,i)=>`${i*24.8},${190-v*1.58}`).join(" ")} fill="none" stroke="#6741f5" strokeWidth="2.4"/>
        <path d={`M0 163 ${keywords.map((v,i)=>`L${i*24.8} ${190-v*1.32}`).join(" ")} L720 205 L0 205 Z`} fill="url(#keywordFill)"/>
        <polyline points={keywords.map((v,i)=>`${i*24.8},${190-v*1.32}`).join(" ")} fill="none" stroke="#12b878" strokeWidth="2"/>
        {values.map((v,i)=><circle key={`p${i}`} cx={i*24.8} cy={190-v*1.58} r="2.2" fill="#6741f5"/>)}
      </svg>
      <div className="chart-x"><span>May 22</span><span>May 26</span><span>May 30</span><span>Jun 3</span><span>Jun 7</span><span>Jun 11</span><span>Jun 15</span><span>Jun 19</span><span>Jun 22</span></div>
    </div>
  );
};

const RankingBars = () => {
  const bars = [74,78,80,83,76,88,85,90,87,91,93,95,97,96,94,100,99];
  return (
    <div className="ranking-chart">
      <div className="ranking-y"><span>7K</span><span>6K</span><span>5K</span><span>4K</span><span>3K</span><span>2K</span><span>1K</span><span>0</span></div>
      <div className="ranking-bars">
        {bars.map((h,i)=>(
          <div className="stack" key={i}>
            <i style={{height:`${h*.20}%`}} className="s1"/>
            <i style={{height:`${h*.28}%`}} className="s2"/>
            <i style={{height:`${h*.29}%`}} className="s3"/>
            <i style={{height:`${h*.13}%`}} className="s4"/>
          </div>
        ))}
      </div>
      <div className="ranking-x"><span>May 22</span><span>May 30</span><span>Jun 7</span><span>Jun 15</span><span>Jun 22</span></div>
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
  const [range, setRange] = React.useState("May 22, 2025  -  Jun 22, 2025");
  const [showRange, setShowRange] = React.useState(false);
  const [notice, setNotice] = React.useState("");
  const [report, setReport] = React.useState(false);

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

  const exportReport = () => {
    const blob = new Blob(
      ["ShadiLife.com SEO Statistics Report\n\nOrganic Sessions: 128.6K\nTotal Keywords: 5,842\nTop 3 Rankings: 1,256\nSEO Score: 87/100\nConversions: 2,845"],
      {type:"text/plain"}
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "shadilife-seo-report.txt";
    a.click();
    URL.revokeObjectURL(a.href);
    toast("Report exported successfully");
  };

  return (
    <div className="seo-app">
      <style>{`
        *{box-sizing:border-box}
        html,body,#root{margin:0;min-height:100%;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#10142a;background:#f8f9fc}
        button{font:inherit}
        .seo-app{min-height:1024px;background:#fafbfe;display:flex;overflow-x:hidden}
        .sidebar{position:fixed;left:0;top:0;bottom:0;width:232px;background:#fff;border-right:1px solid #edf0f6;z-index:10}
        .brand{height:94px;padding:30px 20px 18px;display:flex;align-items:flex-start;gap:10px}
        .brand-mark{width:32px;height:28px;position:relative;color:#d13da0}
        .brand-mark svg{width:32px;height:32px}
        .brand-text{font-size:22px;line-height:22px;font-weight:800;letter-spacing:-.7px;background:linear-gradient(90deg,#bc36a0,#3e42e7);-webkit-background-clip:text;color:transparent;white-space:nowrap}
        .brand-sub{font-size:10.5px;color:#525b79;margin-top:3px;letter-spacing:.1px}
        .nav{padding:13px 17px 0}
        .nav-item{border:0;background:transparent;width:197px;height:41px;border-radius:6px;display:flex;align-items:center;gap:16px;padding:0 14px;color:#4d587d;font-size:14px;text-align:left;cursor:pointer;margin-bottom:1px}
        .nav-item svg{flex:0 0 auto}
        .nav-item:hover{background:#f7f4ff;color:#5534df}
        .nav-item.active{color:#fff;background:linear-gradient(96deg,#6930ed,#6e48f4);box-shadow:0 5px 12px rgba(101,56,236,.18)}
        .ai-card{position:absolute;left:13px;right:19px;bottom:18px;height:281px;border:1px solid #eeeafa;border-radius:10px;background:linear-gradient(180deg,#faf9ff 0,#fff 100%);text-align:center;padding:15px 11px}
        .ai-title{font-size:13px;color:#5c31e6;font-weight:700;margin-bottom:5px}
        .bot{width:98px;height:98px;margin:0 auto 4px;border-radius:50%;background:radial-gradient(circle at 48% 42%,#fff 0 23%,#dad8ff 24% 39%,#b7b3ef 40% 51%,#7773e8 52% 59%,transparent 60%),linear-gradient(135deg,#f8f7ff,#bdbaf5);box-shadow:0 6px 16px rgba(87,67,208,.17);position:relative}
        .bot:before,.bot:after{content:"";position:absolute;top:40px;width:10px;height:22px;border-radius:7px;background:#8e89f1}
        .bot:before{left:-5px}.bot:after{right:-5px}
        .bot-face{position:absolute;left:25px;top:35px;width:48px;height:30px;border-radius:15px;background:#202552;box-shadow:inset 0 0 12px #272d7a}
        .bot-face:after{content:"••";color:#6de8ef;letter-spacing:7px;font-size:19px;position:absolute;left:10px;top:-1px}
        .ai-hi{font-size:12px;color:#5a2cf1;font-weight:600;margin:5px 0 8px}
        .ai-copy{font-size:12px;line-height:20px;color:#56607e;margin:0 auto 11px;max-width:170px}
        .ai-button{border:0;border-radius:6px;background:linear-gradient(96deg,#6231f0,#6531e9);color:#fff;width:176px;height:33px;font-size:12px;font-weight:600;cursor:pointer}
        .main{margin-left:232px;width:calc(100% - 232px);min-height:1024px}
        .topbar{height:91px;display:flex;align-items:center;justify-content:space-between;padding:0 21px 0 27px;background:#fbfcff}
        .heading h1{font-size:25px;line-height:30px;margin:0;font-weight:750;letter-spacing:-.65px;display:flex;align-items:center;gap:9px}
        .heading h1 svg{color:#7440f4;width:23px}
        .heading p{font-size:13.5px;color:#4f5a7c;margin:6px 0 0}
        .top-actions{display:flex;align-items:center;gap:10px}
        .bell{border:0;background:transparent;color:#536083;width:34px;height:34px;display:grid;place-items:center;cursor:pointer;margin-right:1px}
        .profile{display:flex;align-items:center;gap:9px;margin-left:0}
        .avatar{width:32px;height:32px;border-radius:50%;background:linear-gradient(145deg,#e3c0a8,#6f6f7a);overflow:hidden;position:relative}
        .avatar:before{content:"";position:absolute;width:12px;height:12px;background:#e9b08d;border-radius:50%;left:10px;top:6px}
        .avatar:after{content:"";position:absolute;width:23px;height:15px;background:#171923;border-radius:15px 15px 4px 4px;left:4px;bottom:-1px}
        .profile-copy{min-width:73px}.profile-name{font-size:12px;font-weight:700}.profile-role{font-size:9px;color:#66708e;margin-top:2px}
        .profile svg{color:#64708f;margin-left:2px}
        .toolbar{height:48px;display:flex;align-items:center;justify-content:flex-end;padding:0 21px 8px 27px;gap:10px}
        .date-btn{height:33px;width:250px;border:1px solid #dfe3ed;background:#fff;border-radius:6px;display:flex;align-items:center;padding:0 12px;color:#17203b;font-size:12px;cursor:pointer;justify-content:space-between}
        .date-inner{display:flex;align-items:center;gap:9px}
        .date-btn svg{color:#4f5d7f}
        .export{height:33px;border:0;border-radius:6px;background:linear-gradient(105deg,#6b32ed,#7147ef);color:#fff;padding:0 14px;display:flex;align-items:center;gap:8px;font-size:11.5px;font-weight:650;cursor:pointer;box-shadow:0 3px 7px rgba(101,50,235,.16)}
        .date-menu{position:absolute;right:167px;top:80px;width:250px;background:#fff;border:1px solid #e2e5ef;border-radius:8px;padding:7px;box-shadow:0 12px 35px rgba(28,33,70,.12);z-index:20}
        .date-menu button{display:block;width:100%;border:0;background:#fff;text-align:left;padding:9px 10px;border-radius:5px;font-size:12px;color:#37415f;cursor:pointer}
        .date-menu button:hover{background:#f5f1ff;color:#6034ea}
        .content{padding:0 21px 20px 27px}
        .metric-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin-bottom:10px}
        .card{background:#fff;border:1px solid #eef0f5;border-radius:11px;box-shadow:0 2px 9px rgba(25,34,75,.035)}
        .metric{height:149px;padding:15px 14px 8px;position:relative;overflow:hidden}
        .metric-top{display:flex;align-items:flex-start;gap:12px}
        .metric-icon{width:42px;height:42px;border-radius:12px;display:grid;place-items:center;flex:0 0 auto}
        .metric-icon.purple{background:#f0ebff;color:#6338ef}.metric-icon.blue{background:#edf4ff;color:#347ce7}.metric-icon.green{background:#e8f9f3;color:#13a873}.metric-icon.orange{background:#fff1df;color:#ef971d}
        .metric-label{font-size:12px;font-weight:700;color:#11152a;margin-top:3px}
        .metric-value{font-size:23px;font-weight:780;letter-spacing:-.7px;margin-top:5px;color:#10142a}
        .growth{font-size:10px;color:#0cab6e;margin-left:5px;white-space:nowrap;font-weight:600;vertical-align:middle}
        .metric-sub{font-size:9.5px;color:#606a88;margin:6px 0 0 54px}
        .metric-chart{position:absolute;left:67px;right:13px;bottom:7px;height:37px}
        .sparkline{width:100%;height:37px;display:block}.spark-line{fill:none;stroke:#6a3ff5;stroke-width:2}.spark-fill{fill:url(#x)}
        .score-card{display:flex;flex-direction:column}
        .score-content{display:flex;align-items:center;gap:10px;margin-top:3px}
        .score-ring{width:71px;height:71px;border-radius:50%;background:conic-gradient(#6741ef 0 61%,#238ee7 61% 77%,#10b878 77% 87%,#e9edf2 87% 100%);position:relative;display:grid;place-items:center}
        .score-ring:after{content:"";position:absolute;inset:7px;border-radius:50%;background:#fff}
        .score-number{position:relative;z-index:1;text-align:center}.score-number strong{display:block;font-size:20px}.score-number span{font-size:8px;color:#7b849e}
        .excellent{font-size:11px;color:#08a96b;font-weight:650;margin-bottom:4px}.points{font-size:9px;color:#06a76c}.score-sub{font-size:8.5px;color:#6d7691;margin-top:4px}
        .row1{display:grid;grid-template-columns:minmax(0,1.9fr) minmax(350px,1.1fr);gap:10px;margin-bottom:10px}
        .traffic-card{height:275px;padding:17px 25px 12px}
        .card-head{display:flex;justify-content:space-between;align-items:center}
        .card-title{font-size:12.5px;font-weight:750;color:#11162d}
        .select{height:26px;min-width:95px;border:1px solid #e1e4ed;border-radius:5px;background:#fff;font-size:10px;color:#2e3856;padding:0 8px;display:flex;align-items:center;justify-content:space-between;cursor:pointer}
        .legend{display:flex;align-items:center;gap:23px;margin:15px 0 6px 16px;font-size:10px;color:#4e5879}
        .dot{width:8px;height:8px;border-radius:50%;display:inline-block;margin-right:7px}.dot.p{background:#6741ef}.dot.g{background:#14b77b}.dot.b{background:#3288ed}.dot.o{background:#f4a528}.dot.r{background:#ee636e}
        .traffic-chart{height:197px;position:relative;padding-left:43px;padding-right:38px}
        .chart-y{position:absolute;top:7px;bottom:25px;display:flex;flex-direction:column;justify-content:space-between;font-size:9px;color:#4e5a7e}.chart-y.left{left:0}.chart-y.right{right:0;text-align:left}
        .grid-lines{position:absolute;left:43px;right:38px;top:7px;bottom:25px;display:flex;flex-direction:column;justify-content:space-between}.grid-lines i{height:1px;background:#edf0f5;width:100%}
        .traffic-svg{position:absolute;left:43px;right:38px;top:7px;width:calc(100% - 81px);height:168px}
        .chart-x{position:absolute;left:43px;right:38px;bottom:2px;display:flex;justify-content:space-between;font-size:8.5px;color:#53607e}
        .channel-card{height:275px;padding:17px 21px 13px}
        .channel-body{display:flex;align-items:center;gap:15px;height:195px}
        .channel-list{flex:1;display:flex;flex-direction:column;gap:13px;margin-top:1px}.channel-row{display:grid;grid-template-columns:10px 1fr 34px 40px;gap:8px;align-items:center;font-size:10px;color:#46506e}.channel-row .pct{text-align:right}.channel-row .num{text-align:right;color:#18203b}
        .channel-link,.view-link{font-size:9.5px;color:#6032ee;text-decoration:none;font-weight:500;cursor:pointer;display:inline-flex;align-items:center;gap:6px}
        .row2{display:grid;grid-template-columns:1.05fr 1.12fr 1.22fr;gap:10px;margin-bottom:10px}
        .small-card{height:226px;padding:17px 17px 12px}
        .distribution{display:flex;align-items:center;height:157px;gap:18px}
        .donut-wrap{width:145px;height:145px;display:grid;place-items:center;flex:0 0 auto}
        .donut{width:145px;height:145px;border-radius:50%;display:grid;place-items:center}
        .donut-hole{width:89px;height:89px;background:#fff;border-radius:50%;display:grid;place-items:center;align-content:center;text-align:center}.donut-hole strong{font-size:16px;letter-spacing:-.4px}.donut-hole span{font-size:8px;color:#65708e;margin-top:2px}
        .dist-legend{display:flex;flex-direction:column;gap:13px;font-size:9.5px;color:#4c5675;min-width:135px}.dist-row{display:grid;grid-template-columns:10px 1fr 36px 38px;gap:6px;align-items:center}.dist-row b{font-weight:500}.dist-row .pct{text-align:right}.dist-row .val{text-align:right;color:#252e4a}
        .ranking-card{padding-left:19px}.ranking-card .legend{margin-left:0;margin-top:14px;gap:18px}.ranking-chart{height:156px;position:relative;margin-top:0;padding-left:29px;padding-bottom:19px}.ranking-y{position:absolute;left:0;top:4px;bottom:23px;display:flex;flex-direction:column;justify-content:space-between;font-size:8px;color:#64708e}.ranking-bars{position:absolute;left:29px;right:4px;bottom:23px;top:4px;display:flex;gap:6px;align-items:flex-end;border-top:1px solid #eef0f5;background:repeating-linear-gradient(to bottom,transparent 0,transparent 20px,#eef0f5 21px)}.stack{width:15px;display:flex;flex-direction:column-reverse;justify-content:flex-start;height:100%;align-items:stretch}.stack i{display:block;width:100%}.s1{background:#16b77a}.s2{background:#4385e8}.s3{background:#f3a52a}.s4{background:#ed6670}.ranking-x{position:absolute;left:29px;right:4px;bottom:0;display:flex;justify-content:space-between;font-size:8px;color:#65708e}
        .pages-card{padding:17px 13px 11px}.view-all{height:25px;padding:0 10px;border:1px solid #d8cfff;background:#fff;border-radius:5px;color:#6332ee;font-size:9px;cursor:pointer}.pages-table{width:100%;border-collapse:collapse;margin-top:15px}.pages-table th{text-align:left;color:#53607f;font-size:8.5px;font-weight:500;border-bottom:1px solid #e9ebf1;padding:0 0 8px}.pages-table th:nth-child(2),.pages-table th:nth-child(3){text-align:right}.pages-table td{height:28px;border-bottom:1px solid #eef0f4;font-size:9.5px;color:#18203c}.pages-table td:nth-child(2),.pages-table td:nth-child(3){text-align:right}.up{color:#0bae70;font-size:9px;margin-left:6px}
        .row3{display:grid;grid-template-columns:1.05fr 1.12fr 1.22fr;gap:10px}
        .health-card,.backlink-card,.countries-card{height:226px;padding:17px}
        .health-body{display:flex;align-items:center;gap:14px;height:153px}.health-ring{width:83px;height:83px;border-radius:50%;background:conic-gradient(#16b77b 0 76%,#cbd0d7 76% 100%);display:grid;place-items:center;flex:0 0 auto;position:relative}.health-ring:after{content:"";position:absolute;inset:7px;border-radius:50%;background:#fff}.health-score{position:relative;z-index:1;text-align:center}.health-score strong{display:block;font-size:22px}.health-score span{font-size:8px;color:#68718b}.health-copy{min-width:0}.health-excellent{font-size:10px;color:#08a96c;font-weight:650}.health-note{font-size:8.5px;color:#56617f;line-height:14px;margin:4px 0 9px}.health-items{display:grid;grid-template-columns:1fr auto;gap:7px 10px;font-size:8px;color:#485370}.good{color:#09aa6e}.status-icon{display:inline-grid;place-items:center;width:12px;height:12px;border-radius:3px;margin-right:5px;color:#13b77b}.backlink-body{height:157px;display:flex;align-items:center;gap:10px}.backlink-stats{width:158px}.stat-label{font-size:8.5px;color:#65708c;margin-top:9px}.stat-value{font-size:15px;font-weight:750;margin-top:3px}.stat-growth{font-size:8.5px;color:#0aaa6b;margin-left:6px}.backlink-chart{height:118px;flex:1;border-left:1px solid #eef0f4;border-bottom:1px solid #eef0f4;position:relative;background:repeating-linear-gradient(to bottom,transparent 0,transparent 28px,#eef0f4 29px)}.backlink-chart svg{width:100%;height:100%}.backlink-chart .area{fill:#6741ef;opacity:.12}.backlink-chart .line{fill:none;stroke:#6741ef;stroke-width:2}
        .country-list{margin-top:13px;display:flex;flex-direction:column;gap:11px}.country-row{display:grid;grid-template-columns:16px 1fr 40px 160px 34px;gap:6px;align-items:center;font-size:9px;color:#35405e}.flag{font-size:15px}.country-number{text-align:right;color:#17203c}.progress{height:5px;background:#eceef3;border-radius:8px;overflow:hidden}.progress i{display:block;height:100%;background:linear-gradient(90deg,#6a3bf0,#8864f4);border-radius:8px}.country-pct{text-align:right;color:#596481}
        .bottom-link{margin-top:4px}
        .toast{position:fixed;right:25px;bottom:25px;background:#161b35;color:#fff;padding:11px 16px;border-radius:8px;font-size:12px;box-shadow:0 15px 35px rgba(20,24,50,.22);z-index:50;animation:toastIn .25s ease-out}
        @keyframes toastIn{from{transform:translateY(10px);opacity:0}to{transform:translateY(0);opacity:1}}
        @media(max-width:1100px){
          .sidebar{width:205px}.main{margin-left:205px;width:calc(100% - 205px)}.nav-item{width:173px}.metric-grid{grid-template-columns:repeat(3,1fr)}.row1{grid-template-columns:1fr}.row2,.row3{grid-template-columns:1fr 1fr}.country-row{grid-template-columns:16px 1fr 40px minmax(100px,160px) 34px}
        }
        @media(max-width:760px){
          .seo-app{min-height:100vh}.sidebar{position:relative;width:0;overflow:hidden;border:0}.main{margin-left:0;width:100%}.topbar{padding-left:16px}.toolbar{padding-left:16px}.content{padding-left:12px;padding-right:12px}.metric-grid,.row2,.row3{grid-template-columns:1fr}.topbar{height:auto;padding-top:18px;padding-bottom:8px;align-items:flex-start}.heading p{max-width:260px}.profile{display:none}.toolbar{height:auto;justify-content:flex-start;padding-bottom:12px;overflow:auto}.date-btn{min-width:250px}.export{min-width:130px}.row1{grid-template-columns:1fr}.traffic-card,.channel-card,.small-card,.health-card,.backlink-card,.countries-card{height:auto;min-height:225px}.metric{height:149px}
        }
      `}</style>

      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <svg viewBox="0 0 40 36" fill="none">
              <path d="M20 32S4 23 4 12.5C4 6.8 8.3 3 13.3 3c3.2 0 5.4 1.8 6.7 4.3C21.3 4.8 23.5 3 26.7 3 31.7 3 36 6.8 36 12.5 36 23 20 32 20 32Z" stroke="currentColor" strokeWidth="3.2" strokeLinejoin="round"/>
              <path d="M10 13h6l3 4 3-5 3 4h5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
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
            <div className="card metric">
              <div className="metric-top"><div className="metric-icon purple"><Icon name="users2" size={21}/></div><div><div className="metric-label">Organic Sessions</div><div className="metric-value">128.6K <span className="growth">↑ 28.5%</span></div></div></div>
              <div className="metric-sub">vs Apr 22 - May 21, 2025</div>
              <div className="metric-chart"><MiniTrend/></div>
            </div>
            <div className="card metric">
              <div className="metric-top"><div className="metric-icon blue"><Icon name="search" size={21}/></div><div><div className="metric-label">Total Keywords</div><div className="metric-value">5,842 <span className="growth">↑ 15.3%</span></div></div></div>
              <div className="metric-sub">vs Apr 22 - May 21, 2025</div>
              <div className="metric-chart"><MiniTrend/></div>
            </div>
            <div className="card metric">
              <div className="metric-top"><div className="metric-icon green"><Icon name="trophy" size={21}/></div><div><div className="metric-label">Top 3 Rankings</div><div className="metric-value">1,256 <span className="growth">↑ 22.1%</span></div></div></div>
              <div className="metric-sub">vs Apr 22 - May 21, 2025</div>
              <div className="metric-chart"><MiniTrend kind="green"/></div>
            </div>
            <div className="card metric score-card">
              <div className="metric-top"><div className="metric-icon purple"><Icon name="target" size={21}/></div><div><div className="metric-label">SEO Score</div></div></div>
              <div className="score-content"><div className="score-ring"><div className="score-number"><strong>87</strong><span>/100</span></div></div><div><div className="excellent">Excellent</div><div className="points">↑ 12 pts</div><div className="score-sub">vs last 30 days</div></div></div>
            </div>
            <div className="card metric">
              <div className="metric-top"><div className="metric-icon orange"><Icon name="cart" size={21}/></div><div><div className="metric-label">Conversions</div><div className="metric-value">2,845 <span className="growth">↑ 31.7%</span></div></div></div>
              <div className="metric-sub">vs Apr 22 - May 21, 2025</div>
              <div className="metric-chart"><MiniTrend/></div>
            </div>
          </div>

          <div className="row1">
            <div className="card traffic-card">
              <div className="card-head"><div className="card-title">Organic Traffic Overview</div><button className="select" onClick={()=>toast("Showing Last 30 Days")}>Last 30 Days <Icon name="chevron" size={11}/></button></div>
              <div className="legend"><span><i className="dot p"/>Organic Traffic</span><span><i className="dot g"/>Organic Keywords</span></div>
              <BarChart/>
            </div>

            <div className="card channel-card">
              <div className="card-title">Traffic by Channel</div>
              <div className="channel-body">
                <Donut center="128.6K" segments="#6741ef 0 76.2%, #3988ed 76.2% 88.7%, #12b77b 88.7% 95%, #f3a52b 95% 98.1%, #aeb4be 98.1% 100%"/>
                <div className="channel-list">
                  <div className="channel-row"><i className="dot p"/><span>Organic Search</span><span className="pct">76.2%</span><span className="num">98.1K</span></div>
                  <div className="channel-row"><i className="dot b"/><span>Direct</span><span className="pct">12.5%</span><span className="num">16.1K</span></div>
                  <div className="channel-row"><i className="dot g"/><span>Referral</span><span className="pct">6.3%</span><span className="num">8.1K</span></div>
                  <div className="channel-row"><i className="dot o"/><span>Social Media</span><span className="pct">3.1%</span><span className="num">4.0K</span></div>
                  <div className="channel-row"><i className="dot" style={{background:"#adb2bc"}}/><span>Others</span><span className="pct">1.9%</span><span className="num">2.3K</span></div>
                </div>
              </div>
              <a className="channel-link" onClick={()=>toast("Full traffic report opened")}>View full report <Icon name="arrow" size={12}/></a>
            </div>
          </div>

          <div className="row2">
            <div className="card small-card">
              <div className="card-title">Keyword Position Distribution</div>
              <div className="distribution">
                <Donut center="5,842" segments="#15b77b 0 21.5%, #3e82e7 21.5% 58%, #f4a52b 58% 91.2%, #ed626c 91.2% 100%"/>
                <div className="dist-legend">
                  <div className="dist-row"><i className="dot g"/><b>Top 3</b><span className="val">1,256</span><span className="pct">(21.5%)</span></div>
                  <div className="dist-row"><i className="dot b"/><b>4 - 10</b><span className="val">2,134</span><span className="pct">(36.5%)</span></div>
                  <div className="dist-row"><i className="dot o"/><b>11 - 50</b><span className="val">1,942</span><span className="pct">(33.2%)</span></div>
                  <div className="dist-row"><i className="dot r"/><b>51 - 100</b><span className="val">510</span><span className="pct">(8.8%)</span></div>
                </div>
              </div>
              <a className="view-link" onClick={()=>toast("Keyword distribution report opened")}>View full report <Icon name="arrow" size={12}/></a>
            </div>

            <div className="card small-card ranking-card">
              <div className="card-head"><div className="card-title">Rankings Over Time</div><button className="select" onClick={()=>toast("Showing Last 30 Days")}>Last 30 Days <Icon name="chevron" size={11}/></button></div>
              <div className="legend"><span><i className="dot g"/>Top 3</span><span><i className="dot b"/>4-10</span><span><i className="dot o"/>11-50</span><span><i className="dot r"/>51-100</span></div>
              <RankingBars/>
              <a className="view-link" onClick={()=>toast("Rankings report opened")}>View full report <Icon name="arrow" size={12}/></a>
            </div>

            <div className="card small-card pages-card">
              <div className="card-head"><div className="card-title">Top Performing Pages</div><button className="view-all" onClick={()=>toast("All pages opened")}>View All</button></div>
              <table className="pages-table">
                <thead><tr><th>Page</th><th>Sessions</th><th>Change</th></tr></thead>
                <tbody>
                  {[["/","12.4K","3"],["/rishta","8.9K","5"],["/search","7.2K","2"],["/success-stories","5.6K","4"],["/membership","4.3K","6"]].map(r=><tr key={r[0]}><td>{r[0]}</td><td>{r[1]}</td><td><span className="up">↑ {r[2]}</span></td></tr>)}
                </tbody>
              </table>
            </div>
          </div>

          <div className="row3">
            <div className="card health-card">
              <div className="card-title">SEO Health Overview</div>
              <div className="health-body">
                <div className="health-ring"><div className="health-score"><strong>92</strong><span>/100</span></div></div>
                <div className="health-copy">
                  <div className="health-excellent">Excellent</div>
                  <div className="health-note">Your website's SEO health<br/>is excellent. Keep it up!</div>
                  <div className="health-items">
                    <span>▣ &nbsp;Technical SEO</span><b className="good">Good</b>
                    <span>◈ &nbsp;Content Quality</span><b className="good">Good</b>
                    <span>⊙ &nbsp;On-Page SEO</span><b className="good">Excellent</b>
                    <span>⌁ &nbsp;Backlinks</span><b className="good">Good</b>
                    <span>◌ &nbsp;User Experience</span><b className="good">Good</b>
                  </div>
                </div>
              </div>
              <a className="view-link" onClick={()=>toast("SEO health report opened")}>View full report <Icon name="arrow" size={12}/></a>
            </div>

            <div className="card backlink-card">
              <div className="card-title">Backlink Overview</div>
              <div className="backlink-body">
                <div className="backlink-stats">
                  <div className="stat-label">Total Backlinks</div><div className="stat-value">24.8K <span className="stat-growth">↑ 18.6%</span></div>
                  <div className="stat-label">Referring Domains</div><div className="stat-value">3.2K <span className="stat-growth">↑ 12.4%</span></div>
                  <div className="stat-label">Domain Authority</div><div className="stat-value">46 <span className="stat-growth">↑ 5 pts</span></div>
                </div>
                <div className="backlink-chart">
                  <svg viewBox="0 0 280 120" preserveAspectRatio="none">
                    <path className="area" d="M0 94 L25 86 L48 82 L70 84 L95 73 L118 76 L140 67 L164 65 L186 56 L208 62 L231 48 L255 56 L280 42 L280 120 L0 120Z"/>
                    <polyline className="line" points="0,94 25,86 48,82 70,84 95,73 118,76 140,67 164,65 186,56 208,62 231,48 255,56 280,42"/>
                  </svg>
                </div>
              </div>
              <a className="view-link" onClick={()=>toast("Backlink report opened")}>View full report <Icon name="arrow" size={12}/></a>
            </div>

            <div className="card countries-card">
              <div className="card-head"><div className="card-title">Top Countries</div><button className="select" onClick={()=>toast("Sessions selected")}>Sessions <Icon name="chevron" size={11}/></button></div>
              <div className="country-list">
                {[
                  ["🇵🇰","Pakistan","68.5K",53.2, "53.2%"],
                  ["🇺🇸","United States","18.7K",27.2, "14.5%"],
                  ["🇮🇳","India","12.4K",18.1, "9.6%"],
                  ["🇬🇧","United Kingdom","6.3K",9.2, "4.9%"],
                  ["🇨🇦","Canada","4.1K",6.0, "3.2%"],
                ].map(([flag,name,num,pct,label])=><div className="country-row" key={String(name)}><span className="flag">{flag}</span><span>{name}</span><span className="country-number">{num}</span><div className="progress"><i style={{width:`${pct}%`}}/></div><span className="country-pct">{label}</span></div>)}
              </div>
              <a className="view-link bottom-link" onClick={()=>toast("Countries report opened")}>View full report <Icon name="arrow" size={12}/></a>
            </div>
          </div>
        </section>
      </main>

      {notice && <div className="toast">{notice}</div>}
    </div>
  );
}
