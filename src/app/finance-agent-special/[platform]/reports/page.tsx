"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  usePlatformParam,
  platformLabel,
  platformLogoUrl,
  useFinanceSnapshot,
  useFinanceBreakdown,
  useFinanceTrend,
  generateGhrfixFinanceReport,
} from "@/lib/agent-data";

/**
 * ShadiLife Finance Manager — Reports
 * Single-file TSX clone of the supplied reference.
 * All layout, styling, icons, charts and interactions are embedded here.
 */

const I = ({name, size=18}: {name:string; size?:number}) => {
  const p:any = {
    home:<><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></>,
    users:<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/></>,
    heart:<><path d="M20.8 8.7c0 5.5-8.8 10.8-8.8 10.8S3.2 14.2 3.2 8.7A5 5 0 0 1 12 6.1a5 5 0 0 1 8.8 2.6Z"/><path d="M8 10h3l1.2-2.2L14 13l1.2-2H18"/></>,
    msg:<><rect x="3" y="4" width="18" height="15" rx="4"/><path d="m8 19-2 3 5-3"/><circle cx="8" cy="11.5" r=".7" fill="currentColor"/><circle cx="12" cy="11.5" r=".7" fill="currentColor"/><circle cx="16" cy="11.5" r=".7" fill="currentColor"/></>,
    diamond:<path d="m12 3 7 5-7 13L5 8l7-5Zm0 0 7 5H5l7-5Z"/>,
    card:<><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/></>,
    finance:<><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 7h6M9 11h6M9 15h2M13 15h2M9 18h2M13 18h2"/></>,
    bot:<><path d="M12 3v3"/><rect x="5" y="7" width="14" height="13" rx="4"/><path d="M9 12h.01M15 12h.01M9 16c1.5 1 4.5 1 6 0"/><path d="M3 12v4M21 12v4"/></>,
    settings:<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.8 1.8 0 0 0 .3 2l.1.1-1.8 1.8-.1-.1a1.8 1.8 0 0 0-2-.3 1.8 1.8 0 0 0-1.1 1.6v.1h-2.6v-.1a1.8 1.8 0 0 0-1.1-1.6 1.8 1.8 0 0 0-2 .3l-.1.1-1.8-1.8.1-.1a1.8 1.8 0 0 0 .3-2A1.8 1.8 0 0 0 6 13.1H5.8v-2.6H6a1.8 1.8 0 0 0 1.6-1.1 1.8 1.8 0 0 0-.3-2l-.1-.1L9 5.5l.1.1a1.8 1.8 0 0 0 2 .3A1.8 1.8 0 0 0 12.2 4v-.1h2.6V4a1.8 1.8 0 0 0 1.1 1.6 1.8 1.8 0 0 0 2-.3l.1-.1 1.8 1.8-.1.1a1.8 1.8 0 0 0-.3 2 1.8 1.8 0 0 0 1.6 1.1h.1v2.6H21a1.8 1.8 0 0 0-1.6 1.2Z"/></>,
    support:<><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.6 2.6 0 0 1 5 .8c0 1.8-2.5 2-2.5 4M12 17h.01"/></>,
    logout:<><path d="M10 17l5-5-5-5"/><path d="M15 12H3M21 19V5a2 2 0 0 0-2-2h-5"/></>,
    bell:<><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
    calendar:<><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 9h18"/></>,
    chevron:<path d="m7 10 5 5 5-5"/>,
    download:<><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M4 21h16"/></>,
    revenue:<><circle cx="12" cy="12" r="9"/><path d="M12 6v12M15 9.5c0-1.1-1.3-1.8-3-1.8s-3 .7-3 1.8 1.1 1.6 3 2 3 .9 3 2-1.3 2-3 2-3-.7-3-1.8"/></>,
    profit:<><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 9h8M8 13h8M8 17h4"/><path d="m15 4 2 3"/></>,
    expense:<><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 5V3h8v2M4 9h16M9 14h6"/></>,
    cash:<><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M7 6V4h10v2M12 10v5M10 12h4M10 15h4"/></>,
    file:<><path d="M6 3h9l4 4v14H6z"/><path d="M15 3v5h5M9 13h6M9 17h5"/></>,
    forecast:<><path d="M4 19V5M4 19h17"/><path d="M7 15l4-5 3 3 5-7"/></>,
    pie:<><path d="M12 3a9 9 0 1 0 9 9h-9Z"/><path d="M12 3v9h9A9 9 0 0 0 12 3Z"/></>,
    calculator:<><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h2M14 11h2M8 15h2M14 15h2M8 18h2M14 18h2"/></>,
    up:<path d="m7 14 5-5 5 5"/>,
    spark:<><path d="m12 2 1.5 5L18 9l-4.5 2L12 16l-1.5-5L6 9l4.5-2L12 2Z"/><path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z"/></>,
    send:<><path d="m3 3 18 9-18 9 4-9z"/><path d="M7 12h14"/></>,
    more:<><circle cx="12" cy="5" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="19" r="1" fill="currentColor"/></>,
    close:<><path d="m6 6 12 12M18 6 6 18"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{p[name]||p.file}</svg>;
};

/** Compact number formatting shared by the y-axis ticks and donut center. */
function compact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${Math.round(n)}`;
}

function formatShortDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

/** Top-N real entries plus a real "Other" bucket for whatever's left, so displayed
 * shares always sum to 100% of the real set actually returned by the backend —
 * never a fabricated percentage. */
function topNWithOther(items: Array<{ label: string; value: number }>, n = 4): Array<{ label: string; value: number }> {
  const sorted = [...items].sort((a, b) => b.value - a.value);
  const top = sorted.slice(0, n);
  const rest = sorted.slice(n);
  const restSum = rest.reduce((s, t) => s + t.value, 0);
  if (restSum > 0) top.push({ label: "Other", value: restSum });
  return top;
}

const DONUT_COLORS = ["#6524d9", "#e32e91", "#f37c25", "#3c78ed", "#8a8f9e"];

function buildConicGradient(source: Array<{ value: number }>, total: number): string {
  if (total <= 0 || source.length === 0) return "conic-gradient(#e5e7ef 0 100%)";
  let acc = 0;
  const stops = source.map((s, i) => {
    const startPct = (acc / total) * 100;
    acc += s.value;
    const endPct = (acc / total) * 100;
    return `${DONUT_COLORS[i % DONUT_COLORS.length]} ${startPct}% ${endPct}%`;
  });
  return `conic-gradient(${stops.join(",")})`;
}

export default function FinanceReportsPage({ params }: { params: Promise<{ platform: string }> }){
  const platform = usePlatformParam(params);
  const pathname = usePathname();
  const router = useRouter();
  const isGhrfix = platform === "ghrfix";
  const finance = useFinanceSnapshot(platform);
  const breakdown = useFinanceBreakdown(platform);
  const trend = useFinanceTrend(platform);

  const [range,setRange]=React.useState("May 1 – May 31, 2025");
  const [month,setMonth]=React.useState("This Month");
  const [openDate,setOpenDate]=React.useState(false);
  const [notice,setNotice]=React.useState("");
  const [chat,setChat]=React.useState("");

  const [reportSnapshot, setReportSnapshot] = React.useState<Record<string, unknown> | null>(null);
  const [reportGeneratedAt, setReportGeneratedAt] = React.useState<string | null>(null);
  const [reportBusy, setReportBusy] = React.useState(false);
  const [reportError, setReportError] = React.useState<string | null>(null);
  const [showSnapshot, setShowSnapshot] = React.useState(false);

  const toast=(x:string)=>{setNotice(x);window.setTimeout(()=>setNotice(""),2200)};
  const nav: Array<[string, string, string]> = [
    ["home", "Dashboard", "dashboard"],
    ["card", "Transactions", "transactions"],
    ["file", "Reports", "reports"],
    ["finance", "Payouts", "payouts"],
    ["bot", "Chat", "chat"],
  ];

  // ---- Metric cards: Total Revenue and (GhrFix) Cash Balance are real, live
  // numbers straight off /summary via the same useFinanceSnapshot the
  // dashboard page already uses. Net Profit and Total Expenses have no real
  // backend equivalent on either platform (no expense tracking exists
  // anywhere) — they keep the dashboard's own "Illustrative — not tracked
  // yet" pattern instead of a bare invented figure. ShadiLife has no literal
  // "cash balance" concept either, so that fourth card is honestly relabeled
  // to a real figure (Revenue This Year) instead of faking a balance.
  const totalRevenueValue = isGhrfix ? finance.secondaryPkr : finance.totalRevenuePkr;
  const totalRevenueDisplay = totalRevenueValue == null ? null : `PKR ${Math.round(totalRevenueValue).toLocaleString()}`;
  const totalRevenueCaption = isGhrfix ? "Accept fees collected — real, live data" : "Revenue this month — real, live data";

  const cashBalanceTitle = isGhrfix ? "Cash Balance" : "Revenue This Year";
  const cashBalanceDisplay = isGhrfix ? finance.cashOrPendingValue : (finance.secondaryPkr == null ? null : `PKR ${finance.secondaryPkr.toLocaleString()}`);
  const cashBalanceCaption = isGhrfix ? "Cash settled via bookings — real, live data" : "Real, live data";

  // ---- Revenue chart: real daily series only, Expenses line dropped entirely
  // (no real expense time series exists on either platform).
  const histValues = trend.points.map((p) => p.value);
  const projValues = trend.projected.map((p) => p.value);
  const totalCount = histValues.length + projValues.length;
  const CHART_W = 520, CHART_H = 160;
  const allValues = [...histValues, ...projValues];
  const maxV = Math.max(1, ...allValues);
  const minV = Math.min(0, ...allValues);
  const range_ = maxV - minV || 1;
  const stepX = totalCount > 1 ? CHART_W / (totalCount - 1) : CHART_W;
  const toXY = (v: number, i: number): [number, number] => [Math.round(i * stepX), Math.round(CHART_H - ((v - minV) / range_) * CHART_H)];
  const histPts = histValues.map((v, i) => toXY(v, i));
  const projPtsRaw = projValues.map((v, i) => toXY(v, i + Math.max(0, histValues.length - 1)));
  const projPts = histPts.length && projPtsRaw.length ? [histPts[histPts.length - 1], ...projPtsRaw] : projPtsRaw;
  const toPath = (pts: Array<[number, number]>) => (pts.length ? pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x} ${y}`).join(" ") : "");
  const histPath = toPath(histPts);
  const projPath = toPath(projPts);
  const histArea = histPts.length ? `${histPath} L${histPts[histPts.length - 1][0]} ${CHART_H} L0 ${CHART_H} Z` : "";
  const yTicks = allValues.length === 0 ? ["", "", "", "", "", ""] : Array.from({ length: 6 }, (_, i) => compact(maxV - (i * (maxV - minV)) / 5));
  const allDates = [...trend.points.map((p) => p.date), ...trend.projected.map((p) => p.date)];
  const xLabelCount = Math.min(7, allDates.length || 1);
  const xLabelIdxs = Array.from(new Set(Array.from({ length: xLabelCount }, (_, i) => Math.round((i / Math.max(1, xLabelCount - 1)) * (allDates.length - 1)))));

  // ---- Profit Breakdown donut: real revenue split by category (GhrFix) or
  // membership tier (ShadiLife) — no invented cost-center percentages.
  const donutSource = topNWithOther(
    isGhrfix
      ? (breakdown.revenueByCategory ?? []).map((r) => ({ label: r.label, value: r.acceptFees }))
      : (breakdown.approvedRevenueByTier ?? []).map((r) => ({ label: r.tier, value: r.totalAmountPkr })),
  );
  const donutTotal = donutSource.reduce((s, d) => s + d.value, 0);
  const donutTitle = isGhrfix ? "Revenue by Category" : "Revenue by Membership Tier";

  async function handleGenerateReport() {
    setReportBusy(true);
    setReportError(null);
    try {
      if (isGhrfix) {
        const snap = await generateGhrfixFinanceReport();
        setReportSnapshot(snap as unknown as Record<string, unknown>);
        setReportGeneratedAt(snap.generatedAt);
        toast(`Report generated by ${snap.generatedBy} — permanently audit-logged`);
      } else {
        const snap: Record<string, unknown> = {
          generatedAt: new Date().toISOString(),
          generatedBy: "Admin — client-compiled (ShadiLife's finance-agent has no server-side report log)",
          revenueThisMonthPkr: finance.totalRevenuePkr,
          revenueThisYearPkr: finance.secondaryPkr,
          monthOverMonthChangePct: finance.changePct,
          pendingPaymentsCount: breakdown.pendingPaymentsCount,
          payments: breakdown.payments,
          approvedRevenueByTier: breakdown.approvedRevenueByTier,
          agentPayouts: breakdown.agentPayouts,
          agentPayoutsThisMonthPkr: breakdown.agentPayoutsThisMonthPkr,
          revenueForecastNext30dPkr: trend.projectedNext30dTotalPkr,
        };
        setReportSnapshot(snap);
        setReportGeneratedAt(snap.generatedAt as string);
        toast("Snapshot compiled from real, currently-loaded data");
      }
      setShowSnapshot(true);
    } catch (err) {
      setReportError(err instanceof Error ? err.message : "Could not generate report.");
      toast("Report generation failed");
    } finally {
      setReportBusy(false);
    }
  }

  function downloadSnapshot(){
    if (!reportSnapshot) return;
    const text = JSON.stringify(reportSnapshot, null, 2);
    const b = new Blob([text], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = `${platform}-finance-report-${(reportGeneratedAt ?? new Date().toISOString()).slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const exportReport=()=>{
    const lines = [
      `${platformLabel(platform)} Finance Report`,
      `Exported: ${new Date().toLocaleString()}`,
      "",
      `Total Revenue (${totalRevenueCaption}): ${totalRevenueDisplay ?? "—"}`,
      `${cashBalanceTitle} (${cashBalanceCaption}): ${cashBalanceDisplay ?? "—"}`,
      "Net Profit: Illustrative — not tracked yet (no expense data exists to compute a real profit figure)",
      "Total Expenses: Illustrative — not tracked yet (no expense tracking exists on this platform)",
      "",
      `${donutTitle} (real):`,
      ...donutSource.map((d) => `  ${d.label}: PKR ${Math.round(d.value).toLocaleString()} (${donutTotal > 0 ? Math.round((d.value / donutTotal) * 100) : 0}%)`),
      "",
      reportSnapshot ? `Last generated report: ${reportGeneratedAt}` : "No report has been generated yet this session.",
    ];
    const text=lines.join("\n");
    const b=new Blob([text],{type:"text/plain"});const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=`${platform}-finance-report.txt`;a.click();URL.revokeObjectURL(a.href);toast("Exported the real numbers currently on screen");
  };
  const sendChat=()=>{if(!chat.trim())return;router.push(`/finance-agent-special/${platform}/chat?q=${encodeURIComponent(chat.trim())}`)};

  return <div className="fm-app">
    <style>{`
      *{box-sizing:border-box}
      html,body,#root{margin:0;min-height:100%;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;color:#11142a;background:#fafbfe}
      body{overflow-x:hidden}button,input{font:inherit}
      .fm-app{width:100%;min-height:1024px;background:#fbfcff;display:flex}
      .sidebar{position:fixed;left:0;top:0;bottom:0;width:223px;background:linear-gradient(180deg,#180d39 0%,#21104f 100%);color:#fff;z-index:20}
      .brand{height:83px;background:#fff;color:#ca319e;display:flex;align-items:center;padding:12px 20px 9px;gap:8px}
      .brand img{width:38px;height:42px;object-fit:contain}
      .brand-name{font-size:22px;font-weight:800;line-height:23px;letter-spacing:-.8px;background:linear-gradient(90deg,#bf2f9c,#4732e4);-webkit-background-clip:text;color:transparent}
      .brand-sub{font-size:10px;color:#bf35a0;text-align:center;margin-top:1px;letter-spacing:.05px}
      .nav{padding:22px 11px}
      .nav-btn{height:39px;width:195px;border:0;background:transparent;color:#fff;border-radius:6px;display:flex;align-items:center;gap:16px;padding:0 12px;margin-bottom:1px;font-size:14px;text-align:left;cursor:pointer;text-decoration:none;box-sizing:border-box}
      .logout{text-decoration:none;box-sizing:border-box}
      .nav-btn:hover{background:rgba(120,70,240,.18)}.nav-btn.active{background:linear-gradient(95deg,#6c24d5,#5e20c4);box-shadow:inset 0 0 0 1px rgba(255,255,255,.04)}
      .finance-wrap{margin-top:0}.finance-head{height:38px;width:195px;border:0;border-radius:6px;background:linear-gradient(95deg,#6c24d5,#5e20c4);color:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 12px;cursor:pointer;font-size:14px}
      .finance-head span{display:flex;align-items:center;gap:16px}.finance-sub{margin-left:24px;border-left:1px solid rgba(255,255,255,.32);padding:7px 0 5px 9px}
      .sub-btn{display:block;width:171px;height:37px;border:0;background:transparent;color:#fff;text-align:left;border-radius:6px;padding:0 9px;font-size:14px;cursor:pointer}
      .sub-btn:hover{background:rgba(118,63,231,.2)}.sub-btn.active{background:linear-gradient(95deg,#6622d0,#5c1ec3)}
      .bottom-nav{position:absolute;left:11px;right:11px;bottom:66px}.logout{position:absolute;left:11px;bottom:19px;width:195px;height:38px;border:0;background:transparent;color:#fff;display:flex;align-items:center;gap:16px;padding:0 12px;cursor:pointer;font-size:14px}
      .main{margin-left:223px;width:calc(100% - 223px);min-height:1024px}
      .top{height:84px;background:#fff;border-bottom:1px solid #edf0f5;display:flex;align-items:center;justify-content:space-between;padding:0 20px 0 25px}
      .ai-header{display:flex;align-items:center;gap:12px}.ai-head-icon{width:45px;height:45px;border-radius:50%;background:#f4f4f8;display:grid;place-items:center;color:#111}
      .ai-heading{font-size:20px;font-weight:760;line-height:22px;letter-spacing:-.3px}.ai-heading .spark{color:#7435ed;margin-left:4px}.ai-sub{font-size:12px;color:#34384c;margin-top:5px}
      .top-right{display:flex;align-items:center;gap:17px}.top-date{width:220px;height:43px;border:1px solid #dfe3eb;border-radius:8px;background:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 14px;color:#1e2640;font-size:13px;cursor:pointer}
      .top-date span{display:flex;align-items:center;gap:12px}.notification{position:relative;width:43px;height:43px;border-radius:50%;background:#fff;border:1px solid #e9ebf0;display:grid;place-items:center;color:#4e5670;cursor:pointer}.badge{position:absolute;right:-1px;top:-2px;background:#e8334d;color:#fff;font-size:9px;font-weight:700;width:16px;height:16px;border-radius:50%;display:grid;place-items:center;border:2px solid #fff}
      .profile{display:flex;align-items:center;gap:10px}.avatar{width:42px;height:42px;border-radius:50%;background:linear-gradient(145deg,#f2f3f7,#dfe1ea);position:relative;overflow:hidden}.avatar:before{content:"";position:absolute;left:14px;top:8px;width:15px;height:15px;border-radius:50%;background:#85889a}.avatar:after{content:"";position:absolute;left:8px;bottom:-1px;width:27px;height:19px;border-radius:16px 16px 5px 5px;background:#7c7f91}.profile-name{font-size:13px;font-weight:750}.profile-role{font-size:9px;color:#61677a;margin-top:3px}.profile .chev{margin-left:10px}
      .page{padding:17px 20px 30px 24px;display:grid;grid-template-columns:minmax(720px,1fr) 242px;gap:18px}
      .main-col{min-width:0}.right-agent{width:242px}
      .title-row{height:51px;display:flex;justify-content:space-between;align-items:flex-start}.title h1{font-size:21px;margin:0;font-weight:760;letter-spacing:-.4px}.title p{font-size:12px;color:#39405a;margin:5px 0 0}
      .actions{display:flex;gap:11px}.select{height:37px;min-width:111px;border:1px solid #dfe3eb;background:#fff;border-radius:7px;padding:0 12px;display:flex;align-items:center;justify-content:space-between;gap:16px;color:#222942;font-size:11px;cursor:pointer}.export{height:37px;border:1px solid #a96ef1;color:#5e20d1;background:#fff;border-radius:7px;padding:0 13px;display:flex;align-items:center;gap:7px;font-size:11px;font-weight:650;cursor:pointer}
      .metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin-bottom:11px}.metric{height:119px;background:#fff;border:1px solid #edf0f5;border-radius:8px;box-shadow:0 2px 8px rgba(31,35,70,.035);padding:16px 15px;position:relative}.metric-top{display:flex;gap:12px}.micon{width:40px;height:40px;border-radius:11px;display:grid;place-items:center;flex:0 0 auto}.m-purple{background:#f1e9ff;color:#7030e6}.m-green{background:#e5f8ed;color:#11a967}.m-red{background:#ffe7e8;color:#f3484d}.m-blue{background:#e8f0ff;color:#3678ed}.m-label{font-size:11px;color:#333b55;margin-top:1px}.m-value{font-size:18px;font-weight:780;letter-spacing:-.4px;margin-top:5px;white-space:nowrap}.m-growth{display:block;font-size:9.5px;color:#06a95e;margin-top:6px}.m-growth.red{color:#ef3347}.m-sub{font-size:8.5px;color:#59617a;margin-top:5px}.cash .m-sub{margin-left:52px;margin-top:12px}
      .charts{display:grid;grid-template-columns:1.05fr 1fr;gap:9px;margin-bottom:11px}.chart-card{height:281px;background:#fff;border:1px solid #edf0f5;border-radius:8px;box-shadow:0 2px 8px rgba(31,35,70,.035);padding:16px 19px}.card-head{display:flex;justify-content:space-between;align-items:center}.card-title{font-size:12.5px;font-weight:750}.legend{display:flex;gap:20px;font-size:9px;color:#4d5670;margin:11px 0 7px 34px}.legend i{width:8px;height:8px;border-radius:50%;display:inline-block;margin-right:6px}.purple-dot{background:#6530e4}.pink-dot{background:#e63391}
      .linechart{height:193px;position:relative;padding:8px 0 22px 40px}.grid{position:absolute;left:40px;right:0;top:8px;bottom:23px;display:flex;flex-direction:column;justify-content:space-between}.grid i{height:1px;background:#edf0f5}.ylabels{position:absolute;left:0;top:5px;bottom:21px;display:flex;flex-direction:column;justify-content:space-between;font-size:9px;color:#515b78}.xlabels{position:absolute;left:40px;right:0;bottom:0;display:flex;justify-content:space-between;font-size:8.5px;color:#525d7a}.linechart svg{position:absolute;left:40px;right:0;top:8px;width:calc(100% - 40px);height:158px}.revline{fill:none;stroke:#6631e5;stroke-width:2.2}.expline{fill:none;stroke:#e9368f;stroke-width:2.2;stroke-dasharray:5 4}
      .profit-body{display:flex;align-items:center;height:210px;gap:25px}.donut{width:177px;height:177px;border-radius:50%;display:grid;place-items:center;flex:0 0 auto}.donut-hole{width:115px;height:115px;border-radius:50%;background:#fff;display:grid;place-items:center;align-content:center;text-align:center}.donut-hole span{font-size:11px;color:#3c425a}.donut-hole strong{font-size:15px;margin-top:5px}.profit-list{display:flex;flex-direction:column;gap:15px;font-size:10px;overflow:auto;max-height:210px}.profit-row{display:grid;grid-template-columns:12px 1fr;gap:8px}.profit-row b{font-size:11px;font-weight:500}.profit-row small{display:block;font-size:9.5px;color:#4e5771;margin-top:3px}.profit-row .dot{width:9px;height:9px;border-radius:50%;display:inline-block;margin-top:3px}.p1{background:#6524d9}.p2{background:#e32e91}.p3{background:#f37c25}.p4{background:#3c78ed}.p5{background:#8a8f9e}
      .reports{min-height:200px;background:#fff;border:1px solid #edf0f5;border-radius:8px;box-shadow:0 2px 8px rgba(31,35,70,.035);padding:17px 15px}.reports-desc{font-size:10px;color:#3f465e;margin:6px 0 12px}.table{width:100%;border-collapse:collapse;table-layout:fixed}.table th{height:31px;background:#fafbfe;font-size:9px;font-weight:550;color:#39415e;text-align:left;padding:0 7px}.table td{padding:10px 7px;border-bottom:1px solid #edf0f4;font-size:9px;color:#303750;vertical-align:top}.table th:nth-child(1){width:19%}.table th:nth-child(2){width:33%}.table th:nth-child(3){width:26%}.table th:nth-child(4){width:14%}.table th:nth-child(5){width:8%}.report-name{display:flex;align-items:center;gap:10px;font-weight:700;color:#11162a}.report-icon{width:31px;height:31px;border-radius:8px;display:grid;place-items:center;flex:0 0 auto}.ri1{background:#f0e7ff;color:#6730e6}.view{height:29px;border:1px solid #d5aaf4;background:#fff;color:#6023ce;border-radius:6px;padding:0 9px;font-size:9px;display:inline-flex;align-items:center;gap:7px;cursor:pointer;white-space:nowrap}.view:disabled{opacity:.6;cursor:default}.dots{border:0;background:none;cursor:pointer;color:#525a72;margin-left:6px}
      .agent{background:#fff;border:1px solid #edf0f5;border-radius:8px;box-shadow:0 2px 8px rgba(31,35,70,.04);min-height:906px;padding:16px 10px}.agent-title{font-size:12.5px;font-weight:750;display:flex;justify-content:space-between}.online{font-size:10px;color:#0aa96a;margin-top:6px}.online i{width:9px;height:9px;background:#09ad6c;border-radius:50%;display:inline-block;margin-right:5px}.robot{height:132px;display:grid;place-items:center;position:relative}.robot-head{width:95px;height:86px;border-radius:45px 45px 34px 34px;background:linear-gradient(145deg,#fff,#d8d4ff);box-shadow:0 7px 15px rgba(102,67,213,.16);position:relative;border:2px solid #a397ef}.robot-head:before{content:"";position:absolute;left:21px;top:27px;width:53px;height:37px;border-radius:18px;background:#17142d;box-shadow:inset 0 0 15px #42347f}.robot-head:after{content:"••";position:absolute;left:31px;top:29px;color:#c178ff;font-size:18px;letter-spacing:11px}.robot-tie{position:absolute;bottom:5px;left:45px;width:13px;height:34px;background:#6731df;clip-path:polygon(20% 0,80% 0,100% 100%,50% 76%,0 100%)}.robot-ear{position:absolute;width:13px;height:34px;border-radius:8px;background:#ddd8ff;top:33px}.ear-l{left:59px}.ear-r{right:59px}.agent-text{font-size:11px;line-height:19px;color:#171a2d}.agent-text strong{font-size:12px}.quick{border-top:1px solid #f0f1f5;margin-top:14px;padding-top:12px}.quick-title{font-size:12px;font-weight:750;margin-bottom:8px}.quick button{height:32px;width:100%;border:1px solid #bb86ef;background:#fff;border-radius:6px;color:#5e21cf;text-align:left;padding:0 10px;display:flex;align-items:center;gap:8px;font-size:9.5px;margin-bottom:6px;cursor:pointer}.insights{margin-top:14px;border-top:1px solid #f0f1f5;padding-top:13px}.insights-title{font-size:12px;font-weight:750;margin-bottom:11px}.insight{display:flex;gap:9px;margin:10px 0;font-size:9.5px;line-height:15px}.insight-icon{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;flex:0 0 auto}.ig{background:#e8faee;color:#08a96a}.io{background:#fff0df;color:#f18b25}.ib{background:#e9f1ff;color:#377eea}.ip{background:#f0e8ff;color:#7131e8}.chat{margin-top:17px;height:48px;border:1px solid #e0e4ec;border-radius:8px;display:flex;align-items:center;padding:0 7px 0 11px}.chat input{border:0;outline:0;flex:1;font-size:9.5px;color:#555d74;background:transparent}.send{width:31px;height:31px;border-radius:50%;border:0;background:#6424d8;color:#fff;display:grid;place-items:center;cursor:pointer}.disclaimer{text-align:center;font-size:8px;color:#697087;line-height:14px;margin-top:20px}
      .date-menu{position:absolute;right:165px;top:62px;width:220px;background:#fff;border:1px solid #e0e3eb;border-radius:8px;box-shadow:0 12px 30px rgba(30,33,65,.13);padding:6px;z-index:50}.date-menu button{width:100%;border:0;background:#fff;text-align:left;padding:9px;border-radius:5px;font-size:11px;cursor:pointer;color:#343b55}.date-menu button:hover{background:#f4efff;color:#5f24d2}
      .toast{position:fixed;right:24px;bottom:22px;background:#171a31;color:#fff;border-radius:8px;padding:11px 15px;font-size:11px;box-shadow:0 14px 35px rgba(20,22,50,.25);z-index:100;animation:in .22s ease-out}@keyframes in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
      @media(max-width:1200px){.page{grid-template-columns:1fr}.right-agent{display:none}.metrics{grid-template-columns:repeat(2,1fr)}.sidebar{width:210px}.main{margin-left:210px;width:calc(100% - 210px)}}
      @media(max-width:800px){.sidebar{display:none}.main{margin-left:0;width:100%}.page{padding:14px}.top{padding:0 14px}.top-date{width:180px}.profile{display:none}.charts{grid-template-columns:1fr}.metrics{grid-template-columns:1fr}.table{min-width:760px}.reports{overflow:auto}.title-row{height:auto;gap:10px;flex-wrap:wrap}.top-right{gap:7px}}
    `}</style>

    <aside className="sidebar">
      <div className="brand">
        <img src={platformLogoUrl(platform)} alt={`${platformLabel(platform)} logo`} />
        <div><div className="brand-name">{platformLabel(platform)}.com</div><div className="brand-sub">Finance Agent Special</div></div>
      </div>
      <nav className="nav">
        {nav.map(([icon,label,slug])=>{
          const href = `/finance-agent-special/${platform}/${slug}`;
          return (
          <Link key={label} href={href} className={`nav-btn ${pathname===href?"active":""}`}><I name={icon}/>{label}</Link>
          );
        })}
      </nav>
      <Link href="/ai-agents" className="logout"><I name="logout"/>Back to Hub</Link>
    </aside>

    <main className="main">
      <header className="top">
        <div className="ai-header"><div className="ai-head-icon"><I name="trend"/></div><div><div className="ai-heading">{platformLabel(platform)} — Finance Manager AI Agent <span className="spark">✦</span></div><div className="ai-sub">{breakdown.loading||finance.loading ? "Loading real finance data…" : (finance.error||breakdown.error) ? `Live data unavailable: ${finance.error||breakdown.error}` : "Your intelligent finance partner for smarter decisions"}</div></div></div>
        <div className="top-right">
          <div style={{position:"relative"}}>
            <button className="top-date" onClick={()=>setOpenDate(!openDate)}><span>{range}</span><I name="calendar" size={17}/></button>
            {openDate&&<div className="date-menu">{["May 1 – May 31, 2025","Apr 1 – Apr 30, 2025","Jun 1 – Jun 30, 2025"].map(x=><button key={x} onClick={()=>{setRange(x);setOpenDate(false);toast(`Period changed to ${x}`)}}>{x}</button>)}</div>}
          </div>
          <button className="notification" onClick={()=>toast("3 notifications available")}><I name="bell" size={19}/><span className="badge">3</span></button>
          <div className="profile"><div className="avatar"/><div><div className="profile-name">Admin</div><div className="profile-role">Super Admin</div></div><span className="chev"><I name="chevron" size={14}/></span></div>
        </div>
      </header>

      <div className="page">
        <section className="main-col">
          <div className="title-row">
            <div className="title"><h1>Reports</h1><p>Generate and analyze detailed financial reports for better insights.</p></div>
            <div className="actions"><button className="select" onClick={()=>toast(`${month} selected`)}>{month}<I name="chevron" size={12}/></button><button className="export" onClick={exportReport}><I name="download" size={14}/>Export Reports</button></div>
          </div>

          <div className="metrics">
            <div className="metric"><div className="metric-top"><div className="micon m-purple"><I name="revenue" size={19}/></div><div>
              <div className="m-label">Total Revenue</div>
              <div className="m-value">{finance.loading ? "…" : totalRevenueDisplay ?? "—"}</div>
              {!isGhrfix && finance.changePct!=null && <span className={`m-growth ${finance.changePct<0?"red":""}`}>{finance.changePct>=0?"↑":"↓"} {Math.abs(finance.changePct)}%</span>}
              <div className="m-sub">{totalRevenueCaption}</div>
            </div></div></div>
            <div className="metric"><div className="metric-top"><div className="micon m-green"><I name="profit" size={19}/></div><div>
              <div className="m-label">Net Profit</div>
              <div className="m-value">PKR 2,457,300</div>
              <span className="m-growth">↑ 18.7%</span>
              <div className="m-sub">Illustrative — not tracked yet</div>
            </div></div></div>
            <div className="metric"><div className="metric-top"><div className="micon m-red"><I name="expense" size={19}/></div><div>
              <div className="m-label">Total Expenses</div>
              <div className="m-value">PKR 6,285,200</div>
              <span className="m-growth red">↑ 12.4%</span>
              <div className="m-sub">Illustrative — not tracked yet</div>
            </div></div></div>
            <div className="metric cash"><div className="metric-top"><div className="micon m-blue"><I name="cash" size={19}/></div><div>
              <div className="m-label">{cashBalanceTitle}</div>
              <div className="m-value">{finance.loading ? "…" : cashBalanceDisplay ?? "—"}</div>
              <div className="m-sub">{cashBalanceCaption}</div>
            </div></div></div>
          </div>

          <div className="charts">
            <div className="chart-card">
              <div className="card-head"><div className="card-title">{trend.unit==="tokens" ? "Wallet Credits Trend" : "Revenue Trend"}</div><button className="select" onClick={()=>toast(`${month} selected`)}>{month}<I name="chevron" size={11}/></button></div>
              <div className="legend">
                <span><i className="purple-dot"/>{trend.unit==="tokens" ? "Wallet credits (tokens, real)" : "Revenue (PKR, real)"}</span>
                {projValues.length>0 && <span><i className="pink-dot"/>Projected next 30 days (real forecast)</span>}
              </div>
              <div className="linechart">
                <div className="ylabels">{yTicks.map((t,i)=><span key={i}>{t}</span>)}</div>
                <div className="grid">{[0,1,2,3,4,5].map(i=><i key={i}/>)}</div>
                {breakdown.loading || trend.loading ? (
                  <div style={{position:"absolute",left:40,right:0,top:8,height:158,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#69738b"}}>Loading real data…</div>
                ) : trend.error ? (
                  <div style={{position:"absolute",left:40,right:0,top:8,height:158,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#ff2538"}}>Live data unavailable: {trend.error}</div>
                ) : histPts.length===0 ? (
                  <div style={{position:"absolute",left:40,right:0,top:8,height:158,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#69738b"}}>No data yet.</div>
                ) : (
                  <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} preserveAspectRatio="none">
                    <defs><linearGradient id="rfill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7132e8" stopOpacity=".13"/><stop offset="1" stopColor="#7132e8" stopOpacity=".01"/></linearGradient></defs>
                    {histArea && <path d={histArea} fill="url(#rfill)"/>}
                    <path d={histPath} className="revline"/>
                    {projPath && <path d={projPath} className="expline"/>}
                  </svg>
                )}
                <div className="xlabels">{xLabelIdxs.map((idx)=><span key={idx}>{allDates[idx] ? formatShortDate(allDates[idx]) : ""}</span>)}</div>
              </div>
            </div>

            <div className="chart-card">
              <div className="card-head"><div className="card-title">{donutTitle}</div><button className="select" onClick={()=>toast(`${month} selected`)}>{month}<I name="chevron" size={11}/></button></div>
              {breakdown.loading ? (
                <div style={{height:210,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#69738b"}}>Loading real data…</div>
              ) : breakdown.error ? (
                <div style={{height:210,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#ff2538"}}>Live data unavailable: {breakdown.error}</div>
              ) : donutSource.length===0 ? (
                <div style={{height:210,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#69738b"}}>No data yet.</div>
              ) : (
                <div className="profit-body">
                  <div className="donut" style={{background: buildConicGradient(donutSource, donutTotal)}}>
                    <div className="donut-hole"><span>Total</span><strong>PKR {compact(donutTotal)}</strong></div>
                  </div>
                  <div className="profit-list">
                    {donutSource.map((d,i)=>(
                      <div className="profit-row" key={d.label}>
                        <i className={`dot p${i+1<=4?i+1:5}`}/>
                        <div><b>{d.label}</b><small><strong>{donutTotal>0?Math.round((d.value/donutTotal)*100):0}%</strong> &nbsp;(PKR {Math.round(d.value).toLocaleString()})</small></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="reports" style={showSnapshot ? {height:"auto"} : undefined}>
            <div className="card-title">Available Reports</div>
            <div className="reports-desc">{isGhrfix ? "Pull every live figure into a timestamped, permanently audit-logged snapshot." : "Compile every real figure currently loaded on this page into a downloadable snapshot."}</div>
            <table className="table">
              <thead><tr><th>Report Name</th><th>Description</th><th>Data Source</th><th>Generated On</th><th>Action</th></tr></thead>
              <tbody>
                <tr>
                  <td><div className="report-name"><span className="report-icon ri1"><I name="file"/></span>Financial Snapshot Report</div></td>
                  <td>{isGhrfix ? "Every live wallet, booking and settlement figure, pulled fresh from the database." : "Every live revenue, payment-status and payout figure currently loaded on this page."}</td>
                  <td>{isGhrfix ? "POST /finance/report/generate — real, permanently audit-logged" : "Client-compiled from /summary + /forecast — real, not server-logged"}</td>
                  <td>{reportGeneratedAt ? new Date(reportGeneratedAt).toLocaleString() : "Not generated yet"}</td>
                  <td>
                    <button className="view" onClick={handleGenerateReport} disabled={reportBusy}>{reportBusy?"Generating…":"Generate"}<I name="chevron" size={10}/></button>
                    {reportSnapshot && <button className="dots" onClick={()=>setShowSnapshot((s)=>!s)}><I name="more" size={15}/></button>}
                  </td>
                </tr>
              </tbody>
            </table>
            {reportError && <p style={{color:"#f34a52",fontSize:10,marginTop:10}}>Report generation failed: {reportError}</p>}
            {showSnapshot && reportSnapshot && (
              <div style={{marginTop:12,padding:12,background:"#fafbfe",border:"1px solid #edf0f5",borderRadius:8}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,gap:8}}>
                  <strong style={{fontSize:11}}>{isGhrfix ? "Real snapshot — exact server response" : "Real snapshot — compiled client-side from real data"}</strong>
                  <button className="view" onClick={downloadSnapshot}><I name="download" size={12}/>Download JSON</button>
                </div>
                <pre style={{fontSize:9.5,maxHeight:220,overflow:"auto",margin:0,whiteSpace:"pre-wrap",wordBreak:"break-word"}}>{JSON.stringify(reportSnapshot,null,2)}</pre>
              </div>
            )}
          </div>
        </section>

        <aside className="right-agent">
          <div className="agent">
            <div className="agent-title">Finance Manager AI Agent <span style={{color:"#9299ac"}}>⌁</span></div>
            <div className="online"><i/>Online</div>
            <div className="robot"><div className="robot-head"><span className="robot-ear ear-l"/><span className="robot-ear ear-r"/><span className="robot-tie"/></div></div>
            <div className="agent-text"><strong>Hello Admin! 👋</strong><br/>I'm your Finance Manager AI Agent.<br/>I can help you with financial insights,<br/>reports, forecasting and more.</div>
            <div className="quick"><div className="quick-title">Quick Actions</div>
              {[
                ["file","Generate Financial Report"],["forecast","Revenue Forecast"],["pie","Expense Analysis"],["calculator","Tax Summary"]
              ].map(([ic,tx])=><button key={tx} onClick={()=>toast(`${tx} started`)}><I name={ic} size={15}/>{tx}</button>)}
            </div>
            <div className="insights"><div className="insights-title">AI Insights</div>
              {isGhrfix ? (
                <p style={{fontSize:9.5,color:"#4e5771"}}>GhrFix&apos;s Finance Agent has no AI-generated summary endpoint yet.</p>
              ) : breakdown.loading ? (
                <p style={{fontSize:9.5,color:"#4e5771"}}>Loading real AI insights…</p>
              ) : breakdown.aiSummary || breakdown.aiBullets.length>0 ? (
                <>
                  {breakdown.aiSummary && <div className="insight"><span className="insight-icon ip"><I name="spark" size={14}/></span><span><b>{breakdown.aiSummary}</b></span></div>}
                  {breakdown.aiBullets.map((b,i)=>(
                    <div className="insight" key={i}><span className={`insight-icon ${["ig","io","ib","ip"][i%4]}`}><I name={["up","expense","spark","finance"][i%4]} size={14}/></span><span>{b}</span></div>
                  ))}
                </>
              ) : (
                <p style={{fontSize:9.5,color:"#4e5771"}}>No AI insights available right now.</p>
              )}
            </div>
            <div className="chat"><input value={chat} onChange={e=>setChat(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")sendChat()}} placeholder="Ask me anything..."/><button className="send" onClick={sendChat}><I name="send" size={15}/></button></div>
            <div className="disclaimer">AI responses can make mistakes.<br/>Please verify important information.</div>
          </div>
        </aside>
      </div>
    </main>
    {notice&&<div className="toast">{notice}</div>}
  </div>
}
