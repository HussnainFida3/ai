/* app/finance/transactions/page.tsx */
"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePlatformParam, platformLabel, platformLogoUrl, useFinanceSnapshot, useFinanceBreakdown } from "@/lib/agent-data";

const nav: Array<[string, string, string]> = [
  ["⌂", "Dashboard", "dashboard"],
  ["▤", "Transactions", "transactions"],
  ["▥", "Reports", "reports"],
  ["▣", "Payouts", "payouts"],
  ["✧", "Chat", "chat"],
];

function Icon({children, size=18}:{children:React.ReactNode,size?:number}) {
  return <span style={{fontSize:size,lineHeight:1,display:"inline-flex",alignItems:"center",justifyContent:"center"}}>{children}</span>;
}

function Robot() {
  return <div className="robot">
    <div className="halo"/>
    <div className="antenna"><i/></div>
    <div className="head"><div className="face"><b/><b/><em>⌣</em></div></div>
    <div className="ear l"/><div className="ear r"/>
    <div className="bodyRobot"><div className="tie"/><div className="chest"/></div>
    <div className="arm l"/><div className="arm r"/>
  </div>;
}

/** `change` is optional now: cards backed by a real number with no real
 * period-over-period comparison available just show a plain real-data note
 * instead of an invented percentage. */
function Stat({icon,tone,title,value,change,negative=false,note}:{icon:string;tone:string;title:string;value:string;change?:string;negative?:boolean;note?:string}) {
 return <div className="stat"><div><div className="statTitle">{title}</div><div className="statValue">{value}</div>{change&&<div className={"change "+(negative?"negative":"")}>{change}</div>}<div className="note">{note ?? "Real, live data"}</div></div><div className={"statIcon "+tone}><Icon size={19}>{icon}</Icon></div></div>
}

function Insight({icon,tone,children}:{icon:string;tone:string;children:React.ReactNode}) {
 return <div className="insight"><span className={"insightIcon "+tone}><Icon size={15}>{icon}</Icon></span><p>{children}</p></div>
}

export default function Page({ params }: { params: Promise<{ platform: string }> }) {
 const platform = usePlatformParam(params);
 const pathname = usePathname();
 const isGhrfix = platform === "ghrfix";
 const finance = useFinanceSnapshot(platform);
 const breakdown = useFinanceBreakdown(platform);
 const isLoading = finance.loading || breakdown.loading;

 // GhrFix has no per-transaction list, so real revenue grouped by category or
 // city (from /ai-agents/finance/breakdown, computed off actual completed
 // bookings) stands in. ShadiLife has no per-transaction list either, so real
 // payments-by-status and approved-revenue-by-tier (from /ai-agents/finance/
 // summary) stand in there. Both are toggleable, real, aggregate views —
 // never invented per-row transactions.
 const [view, setView] = useState(isGhrfix ? "Category" : "Status");
 const viewTabs = isGhrfix ? ["Category", "City"] : ["Status", "Tier"];
 const [search, setSearch] = useState("");
 const [toast, setToast] = useState("");
 const show = (s: string) => { setToast(s); window.setTimeout(() => setToast(""), 1800); };

 const columns: string[] = isGhrfix
   ? view === "City"
     ? ["City", "Accept Fees", "Cash Settled", "Bookings"]
     : ["Category", "Accept Fees", "Cash Settled", "Tokens Applied", "Bookings"]
   : view === "Tier"
     ? ["Membership Tier", "Approved Payments", "Total Amount (PKR)"]
     : ["Status", "Payments", "Total Amount (PKR)"];

 type Row = { key: string; cells: string[] };

 const rows: Row[] = useMemo(() => {
   if (isGhrfix) {
     if (view === "City") {
       return (breakdown.revenueByCity ?? []).map((r) => ({
         key: r.label,
         cells: [r.label, `PKR ${Math.round(r.acceptFees).toLocaleString()}`, `PKR ${Math.round(r.cashSettled).toLocaleString()}`, r.bookings.toLocaleString()],
       }));
     }
     return (breakdown.revenueByCategory ?? []).map((r) => ({
       key: r.label,
       cells: [r.label, `PKR ${Math.round(r.acceptFees).toLocaleString()}`, `PKR ${Math.round(r.cashSettled).toLocaleString()}`, `${Math.round(r.tokensApplied).toLocaleString()} tokens`, r.bookings.toLocaleString()],
     }));
   }
   if (view === "Tier") {
     return (breakdown.approvedRevenueByTier ?? []).map((r) => ({
       key: r.tier,
       cells: [r.tier, r.count.toLocaleString(), `PKR ${Math.round(r.totalAmountPkr).toLocaleString()}`],
     }));
   }
   return (breakdown.payments ?? []).map((r) => ({
     key: r.status,
     cells: [r.status, r.count.toLocaleString(), `PKR ${Math.round(r.totalAmountPkr).toLocaleString()}`],
   }));
 }, [isGhrfix, view, breakdown.revenueByCity, breakdown.revenueByCategory, breakdown.approvedRevenueByTier, breakdown.payments]);

 const visibleRows = useMemo(
   () => rows.filter((r) => !search || r.cells.join(" ").toLowerCase().includes(search.toLowerCase())),
   [rows, search],
 );

 // ---- Stat cards. Every value here is either read straight off a real
 // endpoint, arithmetic on real numbers, or (Total Expenses only, where no
 // real expense tracking exists on either platform) the same explicit
 // "Illustrative — not tracked yet" pattern already shipped on the dashboard
 // page — never a bare invented figure.
 const totalTransactions = isGhrfix
   ? breakdown.sampledBookings
   : breakdown.payments == null
     ? null
     : breakdown.payments.reduce((s, p) => s + p.count, 0);
 const totalTransactionsNote = isGhrfix ? "Completed bookings (recent 3,000 sample)" : "All recorded payments — real, live data";

 const totalIncome = isGhrfix
   ? finance.secondaryPkr
   : breakdown.payments == null
     ? null
     : (breakdown.payments.find((p) => p.status === "APPROVED")?.totalAmountPkr ?? 0);
 const totalIncomeNote = isGhrfix ? "Accept fees collected — real, live data" : "Approved payments — real, live data";

 const totalPayoutsValue = isGhrfix
   ? breakdown.settlementMix?.totalTokensApplied ?? null
   : breakdown.agentPayouts == null
     ? null
     : breakdown.agentPayouts.reduce((s, p) => s + p.totalAmount, 0);
 const totalPayoutsTitle = isGhrfix ? "Tokens Applied" : "Total Payouts";
 const totalPayoutsFormatted =
   totalPayoutsValue == null ? "—" : isGhrfix ? `${Math.round(totalPayoutsValue).toLocaleString()} tokens` : `PKR ${Math.round(totalPayoutsValue).toLocaleString()}`;
 const totalPayoutsNote = isGhrfix ? "Settlement mix — real, live data" : "PAID + PENDING agent payouts — real, live data";

 const netCashFlow = isGhrfix
   ? finance.totalRevenuePkr
   : finance.totalRevenuePkr != null && breakdown.agentPayoutsThisMonthPkr != null
     ? finance.totalRevenuePkr - breakdown.agentPayoutsThisMonthPkr
     : null;
 const netCashFlowTitle = isGhrfix ? "Net Token Flow" : "Net Cash Flow (This Month)";
 const netCashFlowNote = isGhrfix ? "Total credits − debits — real, live data" : "Revenue − agent payouts this month — real, live data";

 const gridCols = columns.map(() => "1fr").join(" ");

 return <div className="screen">
  <header className="topbar">
   <div className="logo"><img className="heartLogo" src={platformLogoUrl(platform)} alt={`${platformLabel(platform)} logo`} /><div><strong>{platformLabel(platform)}.com</strong><small>Finance Agent Special</small></div></div>
   <div className="title"><div className="trendCircle">⌁</div><div><h1>{platformLabel(platform)} — Finance Manager AI Agent <span>✦</span></h1><p>Your intelligent finance partner for smarter decisions</p></div></div>
   <div className="topRight">
    <button className="date">May 1 – May 31, 2025 <span>│</span> ▣</button>
    <button className="notify" onClick={()=>show("You have 3 notifications")}>♧<b>3</b></button>
    <div className="userCircle">●</div><div className="user"><strong>Admin</strong><small>Super Admin</small></div><span>⌄</span>
   </div>
  </header>

  <div className="layout">
   <aside className="sidebar">
    <nav>
     {nav.map(([ic,label,slug])=>{
       const href = `/finance-agent-special/${platform}/${slug}`;
       return (
       <Link key={label} href={href} className={pathname===href?"sel":""}><Icon>{ic}</Icon>{label}</Link>
       );
     })}
    </nav>
    <Link href="/ai-agents" className="logout"><Icon>↪</Icon>Back to Hub</Link>
   </aside>

   <main className="main">
    <div className="heading">
     <div>
       <h2>Transactions</h2>
       <p>{breakdown.loading ? "Loading real transaction data…" : breakdown.error ? `Live data unavailable: ${breakdown.error}` : "Real, grouped financial activity — not individual mock rows."}</p>
     </div>
     <div className="tools">
      <div className="search"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..."/><Icon>⌕</Icon></div>
      <button onClick={()=>show("Filters opened")}>⚱ Filters</button><button onClick={()=>show("Transactions exported")}>⇩ Export</button>
     </div>
    </div>
    <div className="tabs">{viewTabs.map(x=><button key={x} className={view===x?"active":""} onClick={()=>setView(x)}>{x}</button>)}</div>

    <div className="stats">
      <Stat icon="▣" tone="purple" title="Total Transactions" value={isLoading ? "…" : totalTransactions == null ? "—" : totalTransactions.toLocaleString()} note={totalTransactionsNote}/>
      <Stat icon="♧" tone="green" title="Total Income" value={isLoading ? "…" : totalIncome == null ? "—" : `PKR ${Math.round(totalIncome).toLocaleString()}`} note={totalIncomeNote}/>
      <Stat icon="▤" tone="red" title="Total Expenses" value="PKR 6,285,200" change="↓ 12.4%" negative note="Illustrative — not tracked yet"/>
      <Stat icon="▥" tone="blue" title={totalPayoutsTitle} value={isLoading ? "…" : totalPayoutsFormatted} note={totalPayoutsNote}/>
      <Stat icon="⌁" tone="purple" title={netCashFlowTitle} value={isLoading ? "…" : netCashFlow == null ? "—" : `PKR ${Math.round(netCashFlow).toLocaleString()}`} note={netCashFlowNote}/>
    </div>

    <section className="table">
     <div className="thead" style={{gridTemplateColumns: gridCols}}>{columns.map(c=><span key={c}>{c}</span>)}</div>
     {breakdown.loading ? (
       <div style={{padding:"22px 15px",fontSize:11,color:"#94a3b8"}}>Loading real data…</div>
     ) : breakdown.error ? (
       <div style={{padding:"22px 15px",fontSize:11,color:"#f43f5e"}}>Live data unavailable: {breakdown.error}</div>
     ) : visibleRows.length === 0 ? (
       <div style={{padding:"22px 15px",fontSize:11,color:"#94a3b8"}}>No data yet.</div>
     ) : visibleRows.map((r)=> <div className="row" key={r.key} style={{gridTemplateColumns: gridCols}}>
       <div className="transaction"><strong>{r.cells[0]}</strong></div>
       {r.cells.slice(1).map((c,i)=><div key={i} className="muted">{c}</div>)}
     </div>)}
     <div className="footer"><span>{isGhrfix ? `Grouped by ${view.toLowerCase()} — real data from the most recent 3,000 completed bookings` : `Grouped by ${view.toLowerCase()} — real data`}</span></div>
    </section>
   </main>

   <aside className="right">
    <section className="ai card">
     <h3>Finance Manager AI Agent <span>⌁</span></h3><div className="online">● Online</div><div className="robotBox"><Robot/></div>
     <strong>Hello Admin! 👋</strong><p>I’m your Finance Manager AI Agent.<br/>I can help you with financial insights,<br/>reports, forecasting and more.</p>
    </section>
    <section className="quick card"><h3>Quick Actions</h3>
      {["▤  Generate Financial Report","⌁  Revenue Forecast","◔  Expense Analysis","▣  Tax Summary"].map(x=><button key={x} onClick={()=>show(x)}>{x}</button>)}
    </section>
    <section className="insights card"><h3>AI Insights</h3>
      {isGhrfix ? (
        <p style={{fontSize:9.5,color:"#94a3b8"}}>GhrFix&apos;s Finance Agent has no AI-generated summary endpoint yet.</p>
      ) : breakdown.loading ? (
        <p style={{fontSize:9.5,color:"#94a3b8"}}>Loading real AI insights…</p>
      ) : breakdown.aiSummary || breakdown.aiBullets.length > 0 ? (
        <>
          {breakdown.aiSummary && <Insight icon="✦" tone="purple"><b>{breakdown.aiSummary}</b></Insight>}
          {breakdown.aiBullets.map((b,i)=>(
            <Insight key={i} icon={["↑","♧","▤","▣"][i%4]} tone={["green","blue","orange","purple"][i%4]}>{b}</Insight>
          ))}
        </>
      ) : (
        <p style={{fontSize:9.5,color:"#94a3b8"}}>No AI insights available right now.</p>
      )}
    </section>
    <div className="chat"><span>Ask me anything...</span><button onClick={()=>show("AI Agent message sent")}>→</button></div>
    <div className="disclaimer">AI responses can make mistakes.<br/>Please verify important information.</div>
   </aside>
  </div>

  {toast&&<div className="toast">{toast}</div>}

  <style jsx global>{`
   *{box-sizing:border-box}html,body{margin:0;padding:0;background:#030712;color:#f1f5f9;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif}
   button,input{font:inherit}button{cursor:pointer}.screen{width:100%;min-height:100vh;background:#030712}
   .topbar{height:88px;border-bottom:1px solid rgba(255,255,255,.07);display:flex;align-items:center;padding:0 20px}
   .logo{width:226px;display:flex;align-items:center;gap:5px}.heartLogo{width:41px;height:45px;object-fit:contain;flex:0 0 auto}
   .logo strong{display:block;font-size:22px;letter-spacing:-.8px;background:linear-gradient(90deg,#8b5cf6,#38bdf8);color:transparent;background-clip:text;-webkit-background-clip:text}.logo small{display:block;font-size:10.5px;text-align:center;color:#8b5cf6;margin-top:2px}
   .title{display:flex;align-items:center;gap:15px;margin-left:7px}.trendCircle{width:45px;height:45px;border-radius:50%;background:#0d1526;display:flex;align-items:center;justify-content:center;font-size:32px;color:#f1f5f9;font-weight:800}.title h1{font-size:21px;margin:0;line-height:24px;letter-spacing:-.5px;color:#f1f5f9}.title h1 span{color:#8b5cf6}.title p{font-size:12px;margin:4px 0;color:#94a3b8}
   .topRight{margin-left:auto;display:flex;align-items:center;gap:15px}.date{width:218px;height:43px;border:1px solid rgba(255,255,255,.07);border-radius:8px;background:#0b1220;color:#f1f5f9;font-size:12px;display:flex;align-items:center;justify-content:space-between;padding:0 14px 0 20px}.notify{width:45px;height:45px;border-radius:50%;border:1px solid rgba(255,255,255,.07);background:#0b1220;position:relative;font-size:22px}.notify b{position:absolute;right:-1px;top:-3px;width:16px;height:16px;border-radius:50%;background:#f43f5e;color:#fff;font-size:9px}.userCircle{width:42px;height:42px;border-radius:50%;background:rgba(255,255,255,.08);color:#94a3b8;text-align:center;padding-top:6px;font-size:19px}.user strong,.user small{display:block}.user strong{font-size:12px}.user small{font-size:10px;color:#94a3b8;margin-top:3px}
   .layout{height:936px;display:flex}.sidebar{width:227px;min-width:227px;height:936px;background:linear-gradient(180deg,#0d1526,#05080f);color:#fff;padding:20px 12px;position:relative}.sidebar nav{display:flex;flex-direction:column;gap:3px}.sidebar button,.sidebar a{border:0;color:#fff;background:transparent;height:39px;border-radius:7px;width:100%;display:flex;align-items:center;gap:16px;padding:0 12px;text-align:left;font-size:13px;text-decoration:none;box-sizing:border-box;cursor:pointer}.sidebar button:hover,.sidebar a:hover{background:rgba(139,92,246,.28)}.sidebar a.sel{background:linear-gradient(90deg,#7c3aed,#8b5cf6)}.finance{background:linear-gradient(90deg,#7c3aed,#8b5cf6)!important}.finance span{flex:1}.sub{border-left:1px solid rgba(255,255,255,.45);margin-left:25px;padding:4px 0 0 10px;margin-bottom:8px}.sub button{height:36px;padding-left:8px}.sub .sel{background:linear-gradient(90deg,#7c3aed,#8b5cf6)}.sidebar small{margin-left:auto;background:#8b5cf6;border-radius:5px;padding:3px 6px;font-size:9px}.logout{position:absolute;bottom:22px;left:12px;width:calc(100% - 24px)!important}
   .main{width:1054px;padding:22px 17px 23px 23px}.heading{height:67px;display:flex;justify-content:space-between}.heading h2{font-size:19px;margin:0 0 5px;letter-spacing:-.4px}.heading p{font-size:11.5px;color:#94a3b8;margin:0}.tools{display:flex;gap:9px;margin-top:36px}.tools>button,.search{height:36px;border:1px solid rgba(255,255,255,.07);border-radius:7px;background:#0b1220;color:#f1f5f9;font-size:10px;display:flex;align-items:center;justify-content:center;gap:8px}.tools>button{padding:0 12px}.search{width:210px;padding:0 11px}.search input{border:0;outline:0;width:100%;font-size:10px}.search input::placeholder{color:#94a3b8}
   .tabs{height:44px;border-bottom:1px solid rgba(255,255,255,.07);display:flex;align-items:flex-end}.tabs button{height:39px;border:0;border-bottom:2px solid transparent;background:#030712;color:#94a3b8;font-size:10.5px;padding:0 20px}.tabs .active{color:#8b5cf6;border-color:#8b5cf6}
   .stats{height:122px;display:grid;grid-template-columns:repeat(5,1fr);gap:7px;padding-top:16px}.stat{height:122px;border:1px solid rgba(255,255,255,.07);border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,.35);display:flex;justify-content:space-between;padding:14px 12px}.statTitle{font-size:9.5px;color:#f1f5f9;margin-top:2px}.statValue{font-size:16px;font-weight:750;margin-top:6px;white-space:nowrap;letter-spacing:-.35px}.change{font-size:9px;color:#22c55e;margin-top:12px}.change.negative{color:#f43f5e}.note{font-size:8.5px;color:#94a3b8;margin-top:8px;white-space:nowrap}.statIcon{width:37px;height:37px;border-radius:9px;display:flex;align-items:center;justify-content:center}.purple{background:rgba(139,92,246,.16);color:#8b5cf6}.green{background:rgba(34,197,94,.16);color:#22c55e}.red{background:rgba(244,63,94,.16);color:#f43f5e}.blue{background:rgba(56,189,248,.16);color:#38bdf8}
   .table{margin-top:17px;height:632px;border:1px solid rgba(255,255,255,.07);border-radius:8px;box-shadow:0 3px 12px rgba(0,0,0,.35);overflow:auto}.thead,.row{display:grid;align-items:center}.thead{height:40px;background:#0d1526;padding:0 13px;font-size:9px;color:#f1f5f9}.row{min-height:65px;border-top:1px solid rgba(255,255,255,.05);padding:0 13px}.transaction{display:flex;align-items:center;gap:11px}.transaction strong{display:block;font-size:10.5px;white-space:nowrap}.transaction small{display:block;font-size:8.5px;color:#94a3b8;margin-top:4px;white-space:nowrap}.txIcon{width:31px;height:31px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-style:normal;flex:none}.txIcon.orange{background:rgba(245,158,11,.16);color:#f59e0b}.txIcon.pink{background:rgba(244,63,94,.16);color:#f43f5e}.txIcon.green{background:rgba(34,197,94,.16);color:#22c55e}.txIcon.blue{background:rgba(56,189,248,.16);color:#38bdf8}.txIcon.purple{background:rgba(139,92,246,.16);color:#8b5cf6}.txIcon.gray{background:rgba(255,255,255,.08);color:#94a3b8}.type,.status{font-size:8.5px;border-radius:5px;padding:5px 10px;display:inline-block}.type.income{color:#22c55e;background:rgba(34,197,94,.16);border:1px solid rgba(34,197,94,.3)}.type.expense{color:#f43f5e;background:rgba(244,63,94,.16);border:1px solid rgba(244,63,94,.3)}.type.payout{color:#38bdf8;background:rgba(56,189,248,.16);border:1px solid rgba(56,189,248,.3)}.type.refund{color:#8b5cf6;background:rgba(139,92,246,.16);border:1px solid rgba(139,92,246,.3)}.muted{font-size:10px;color:#94a3b8}.dateCell{font-size:9px}.dateCell small{display:block;font-size:8px;color:#94a3b8;margin-top:3px}.amount{font-size:9px}.amount.green{color:#22c55e}.amount.red{color:#f43f5e}.status.completed{color:#22c55e;background:rgba(34,197,94,.16);border:1px solid rgba(34,197,94,.3)}.status.pending{color:#f59e0b;background:rgba(245,158,11,.16);border:1px solid rgba(245,158,11,.3)}.dots{border:0;background:#030712;color:#94a3b8;font-size:18px}.footer{height:65px;border-top:1px solid rgba(255,255,255,.05);display:flex;align-items:center;justify-content:space-between;padding:0 14px;color:#94a3b8;font-size:9.5px}.pagination{display:flex;gap:4px;align-items:center}.pagination button{width:31px;height:31px;border:1px solid rgba(255,255,255,.07);border-radius:7px;background:#0b1220;font-size:10px}.pagination .current{background:#8b5cf6;border-color:#8b5cf6;color:#fff}.pagination em{font-style:normal;padding:0 5px}
   .right{width:251px;border-left:1px solid rgba(255,255,255,.07);padding:7px 15px 0 0}.card{border:1px solid rgba(255,255,255,.07);border-radius:8px;box-shadow:0 2px 9px rgba(0,0,0,.35);background:#0b1220;margin-bottom:10px}.ai{height:286px;padding:16px 14px}.ai h3{font-size:13px;margin:0}.ai h3 span{float:right;color:#5b6780}.online{font-size:9px;color:#22c55e;margin-top:7px}.robotBox{height:126px;display:flex;justify-content:center;align-items:center}.ai>strong{font-size:12px}.ai>p{font-size:10px;line-height:19px;margin:6px 0}.quick{height:190px;padding:13px 8px}.card h3{font-size:13px;margin:0 3px 10px}.quick button{height:32px;width:100%;border:1px solid rgba(139,92,246,.35);background:#0b1220;border-radius:6px;color:#8b5cf6;display:block;text-align:left;padding:0 11px;margin-bottom:6px;font-size:10px}.insights{min-height:120px;max-height:267px;overflow:auto;padding:14px 9px}.insight{display:flex;gap:10px;margin-bottom:13px}.insightIcon{width:29px;height:29px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex:none}.insight p{margin:0;font-size:9.5px;line-height:17px;color:#f1f5f9}.insightIcon.green{background:rgba(34,197,94,.16);color:#22c55e}.insightIcon.orange{background:rgba(245,158,11,.16);color:#f59e0b}.insightIcon.blue{background:rgba(56,189,248,.16);color:#38bdf8}.insightIcon.purple{background:rgba(139,92,246,.16);color:#8b5cf6}.chat{height:47px;border:1px solid rgba(255,255,255,.07);border-radius:8px;display:flex;align-items:center;padding-left:13px;font-size:10px;color:#94a3b8}.chat span{flex:1}.chat button{width:32px;height:32px;border:0;border-radius:50%;background:#8b5cf6;color:#fff;margin-right:5px}.disclaimer{text-align:center;color:#5b6780;font-size:8px;line-height:16px;margin-top:18px}
   .robot{width:135px;height:135px;position:relative;transform:scale(.88)}.halo{position:absolute;width:112px;height:88px;left:11px;top:3px;border-radius:50%;background:radial-gradient(circle,rgba(139,92,246,.35),rgba(139,92,246,.08) 50%,transparent 72%)}.antenna{position:absolute;left:64px;top:3px;width:7px;height:15px;background:#2a2145;border-radius:6px}.antenna i{position:absolute;width:9px;height:9px;border-radius:50%;background:#8b5cf6;left:-1px;top:-4px}.head{position:absolute;left:27px;top:17px;width:82px;height:65px;border-radius:25px 25px 28px 28px;background:linear-gradient(145deg,#0d1526,#1a1433);box-shadow:inset 0 -7px 12px rgba(0,0,0,.4),0 6px 8px rgba(0,0,0,.3)}.face{position:absolute;left:9px;top:12px;width:64px;height:41px;border-radius:17px;background:#05080f;display:flex;align-items:center;justify-content:center;gap:19px}.face b{width:8px;height:8px;border-radius:50%;background:#8b5cf6;box-shadow:0 0 8px #8b5cf6}.face em{position:absolute;color:#a78bfa;font-size:14px;left:28px;top:22px;font-style:normal}.ear{position:absolute;top:39px;width:17px;height:30px;border-radius:9px;background:#2a2145}.ear.l{left:18px}.ear.r{right:18px}.bodyRobot{position:absolute;left:42px;top:77px;width:52px;height:52px;border-radius:16px 16px 20px 20px;background:linear-gradient(145deg,#0d1526,#1a1433);box-shadow:inset 0 -7px 9px rgba(0,0,0,.4)}.tie{position:absolute;top:4px;left:18px;width:16px;height:31px;background:#7c3aed;clip-path:polygon(25% 0,75% 0,100% 45%,50% 100%,0 45%)}.chest{position:absolute;width:17px;height:17px;border-radius:50%;background:#2a2145;left:18px;top:29px}.arm{position:absolute;width:20px;height:42px;border-radius:14px;background:#2a2145;top:82px}.arm.l{left:24px;transform:rotate(20deg)}.arm.r{right:24px;transform:rotate(-20deg)}
   .toast{position:fixed;z-index:99;left:50%;bottom:24px;transform:translateX(-50%);background:#0b1220;color:#fff;padding:10px 18px;border-radius:7px;font-size:11px;box-shadow:0 12px 30px rgba(0,0,0,.4)}
  `}</style>
 </div>
}
