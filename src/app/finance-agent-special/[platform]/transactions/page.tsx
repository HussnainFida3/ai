/* app/finance/transactions/page.tsx */
"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePlatformParam, platformLabel } from "@/lib/agent-data";

const nav: Array<[string, string, string]> = [
  ["⌂", "Dashboard", "dashboard"],
  ["▤", "Transactions", "transactions"],
  ["▥", "Reports", "reports"],
  ["▣", "Payouts", "payouts"],
  ["✧", "Chat", "chat"],
];

const tx = [
  ["♛","orange","Premium Subscription","by Member #SL12598","Income","Subscriptions","May 31, 2025","10:30 AM","+ PKR 2,999","green","Completed","JazzCash"],
  ["✪","orange","Membership Plan – Gold","by Member #SL12602","Income","Memberships","May 31, 2025","09:45 AM","+ PKR 4,999","green","Completed","Credit Card"],
  ["▧","pink","Marketing Campaign","Facebook Ads","Expense","Marketing","May 31, 2025","08:20 AM","– PKR 2,450","red","Completed","Bank Transfer"],
  ["➤","green","Boost Profile Purchase","by Member #SL12610","Income","Boost & Visibility","May 30, 2025","06:15 PM","+ PKR 1,499","green","Completed","EasyPaisa"],
  ["♜","blue","Payout to Partner","Partner #PR556","Payout","Partner Payouts","May 30, 2025","05:40 PM","– PKR 25,000","red","Completed","Bank Transfer"],
  ["▤","pink","Payment Gateway Fee","Transaction Charge","Expense","Bank Charges","May 30, 2025","05:10 PM","– PKR 3,210","red","Completed","—"],
  ["↻","purple","Ad Campaign Refund","Google Ads","Refund","Refunds","May 29, 2025","11:30 AM","+ PKR 1,250","green","Completed","Bank Transfer"],
  ["▣","gray","Withdrawal Request","by Admin","Payout","Admin Withdrawal","May 29, 2025","10:00 AM","– PKR 50,000","red","Pending","Bank Transfer"],
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

function Stat({icon,tone,title,value,change,negative=false}:{icon:string;tone:string;title:string;value:string;change:string;negative?:boolean}) {
 return <div className="stat"><div><div className="statTitle">{title}</div><div className="statValue">{value}</div><div className={"change "+(negative?"negative":"")}>{change}</div><div className="note">vs Apr 1 – Apr 30, 2025</div></div><div className={"statIcon "+tone}><Icon size={19}>{icon}</Icon></div></div>
}

function Insight({icon,tone,children}:{icon:string;tone:string;children:React.ReactNode}) {
 return <div className="insight"><span className={"insightIcon "+tone}><Icon size={15}>{icon}</Icon></span><p>{children}</p></div>
}

export default function Page({ params }: { params: Promise<{ platform: string }> }) {
 const platform = usePlatformParam(params);
 const pathname = usePathname();
 const [tab,setTab]=useState("All Transactions");
 const [search,setSearch]=useState("");
 const [page,setPage]=useState(1);
 const [toast,setToast]=useState("");
 const show=(s:string)=>{setToast(s);window.setTimeout(()=>setToast(""),1800)};
 const rows=useMemo(()=>tx.filter(x=>
   (tab==="All Transactions" || x[4]===tab.slice(0,-1) || x[4]===tab) &&
   (!search || x.join(" ").toLowerCase().includes(search.toLowerCase()))
 ),[tab,search]);

 return <div className="screen">
  <header className="topbar">
   <div className="logo"><div className="heartLogo">♡<i/><i/></div><div><strong>{platformLabel(platform)}.com</strong><small>Finance Agent Special</small></div></div>
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
     <div><h2>Transactions</h2><p>Track and manage all your financial transactions in one place.</p></div>
     <div className="tools">
      <div className="search"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search transactions..."/><Icon>⌕</Icon></div>
      <button onClick={()=>show("Filters opened")}>⚱ Filters</button><button onClick={()=>show("Transactions exported")}>⇩ Export</button>
     </div>
    </div>
    <div className="tabs">{["All Transactions","Income","Expenses","Payouts","Refunds"].map(x=><button key={x} className={tab===x?"active":""} onClick={()=>{setTab(x);setPage(1)}}>{x}</button>)}</div>

    <div className="stats">
      <Stat icon="▣" tone="purple" title="Total Transactions" value="312" change="↑ 18.7%"/>
      <Stat icon="♧" tone="green" title="Total Income" value="PKR 11,199,800" change="↑ 24.6%"/>
      <Stat icon="▤" tone="red" title="Total Expenses" value="PKR 6,285,200" change="↓ 12.4%" negative/>
      <Stat icon="▥" tone="blue" title="Total Payouts" value="PKR 4,125,000" change="↑ 16.3%"/>
      <Stat icon="⌁" tone="purple" title="Net Cash Flow" value="PKR 5,312,400" change="↑ 21.8%"/>
    </div>

    <section className="table">
     <div className="thead"><span>Transaction</span><span>Type</span><span>Category</span><span>Date</span><span>Amount</span><span>Status</span><span>Payment Method</span><span>Action</span></div>
     {rows.map((x:any[])=> <div className="row" key={x[2]}>
       <div className="transaction"><i className={"txIcon "+x[1]}>{x[0]}</i><div><strong>{x[2]}</strong><small>{x[3]}</small></div></div>
       <div><label className={"type "+x[4].toLowerCase()}>{x[4]}</label></div><div className="muted">{x[5]}</div>
       <div className="dateCell">{x[6]}<small>{x[7]}</small></div><div className={"amount "+x[9]}>{x[8]}</div>
       <div><label className={"status "+x[10].toLowerCase()}>{x[10]}</label></div><div className="muted">{x[11]}</div>
       <button className="dots" onClick={()=>show("Actions for "+x[2])}>⋮</button>
     </div>)}
     <div className="footer"><span>Showing {rows.length?1:0} to {rows.length} of 312 transactions</span><div className="pagination">
       <button onClick={()=>setPage(Math.max(1,page-1))}>‹</button>{[1,2,3].map(n=><button key={n} className={page===n?"current":""} onClick={()=>setPage(n)}>{n}</button>)}<em>…</em><button className={page===39?"current":""} onClick={()=>setPage(39)}>39</button><button onClick={()=>setPage(Math.min(39,page+1))}>›</button>
     </div></div>
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
    <section className="insights card"><h3>Insights for May 2025</h3>
      <Insight icon="↑" tone="green">Revenue is up by <b>24.6%</b> compared<br/>to last month.</Insight>
      <Insight icon="▤" tone="orange">Marketing spend is <b>39%</b> of total<br/>expenses. Consider optimizing.</Insight>
      <Insight icon="♧" tone="blue">Net profit margin is <b>28.1%</b>.<br/>Good job! Keep it up.</Insight>
      <Insight icon="▤" tone="purple">You have <b>14</b> pending payouts<br/>totaling PKR 312,500.</Insight>
    </section>
    <div className="chat"><span>Ask me anything...</span><button onClick={()=>show("AI Agent message sent")}>→</button></div>
    <div className="disclaimer">AI responses can make mistakes.<br/>Please verify important information.</div>
   </aside>
  </div>

  {toast&&<div className="toast">{toast}</div>}

  <style jsx global>{`
   *{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff;color:#11152b;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif}
   button,input{font:inherit}button{cursor:pointer}.screen{width:1536px;min-width:1536px;height:1024px;overflow:hidden;background:#fff}
   .topbar{height:88px;border-bottom:1px solid #e9ebf1;display:flex;align-items:center;padding:0 20px}
   .logo{width:226px;display:flex;align-items:center;gap:5px}.heartLogo{width:41px;height:45px;position:relative;color:#ef4d83;font-size:48px;line-height:43px}.heartLogo i{position:absolute;width:7px;height:7px;border-radius:50%;background:#cc2182;right:0;top:4px}.heartLogo i+i{right:-5px;top:14px;width:5px;height:5px}
   .logo strong{display:block;font-size:22px;letter-spacing:-.8px;background:linear-gradient(90deg,#6425be,#dd2c89);color:transparent;background-clip:text;-webkit-background-clip:text}.logo small{display:block;font-size:10.5px;text-align:center;color:#6726c2;margin-top:2px}
   .title{display:flex;align-items:center;gap:15px;margin-left:7px}.trendCircle{width:45px;height:45px;border-radius:50%;background:#f5f6f9;display:flex;align-items:center;justify-content:center;font-size:32px;color:#101114;font-weight:800}.title h1{font-size:21px;margin:0;line-height:24px;letter-spacing:-.5px;color:#0d0e13}.title h1 span{color:#6a30e8}.title p{font-size:12px;margin:4px 0;color:#171925}
   .topRight{margin-left:auto;display:flex;align-items:center;gap:15px}.date{width:218px;height:43px;border:1px solid #dfe3eb;border-radius:8px;background:#fff;color:#18213b;font-size:12px;display:flex;align-items:center;justify-content:space-between;padding:0 14px 0 20px}.notify{width:45px;height:45px;border-radius:50%;border:1px solid #edf0f5;background:#fff;position:relative;font-size:22px}.notify b{position:absolute;right:-1px;top:-3px;width:16px;height:16px;border-radius:50%;background:#ff3341;color:#fff;font-size:9px}.userCircle{width:42px;height:42px;border-radius:50%;background:#f0f1f7;color:#858ca0;text-align:center;padding-top:6px;font-size:19px}.user strong,.user small{display:block}.user strong{font-size:12px}.user small{font-size:10px;color:#505a75;margin-top:3px}
   .layout{height:936px;display:flex}.sidebar{width:227px;min-width:227px;height:936px;background:linear-gradient(180deg,#1c123b,#25134e);color:#fff;padding:20px 12px;position:relative}.sidebar nav{display:flex;flex-direction:column;gap:3px}.sidebar button,.sidebar a{border:0;color:#fff;background:transparent;height:39px;border-radius:7px;width:100%;display:flex;align-items:center;gap:16px;padding:0 12px;text-align:left;font-size:13px;text-decoration:none;box-sizing:border-box;cursor:pointer}.sidebar button:hover,.sidebar a:hover{background:rgba(115,61,225,.28)}.sidebar a.sel{background:linear-gradient(90deg,#5b2bd0,#6724ba)}.finance{background:linear-gradient(90deg,#6030d9,#6929c4)!important}.finance span{flex:1}.sub{border-left:1px solid rgba(255,255,255,.45);margin-left:25px;padding:4px 0 0 10px;margin-bottom:8px}.sub button{height:36px;padding-left:8px}.sub .sel{background:linear-gradient(90deg,#5b2bd0,#6724ba)}.sidebar small{margin-left:auto;background:#6330cc;border-radius:5px;padding:3px 6px;font-size:9px}.logout{position:absolute;bottom:22px;left:12px;width:calc(100% - 24px)!important}
   .main{width:1054px;padding:22px 17px 23px 23px}.heading{height:67px;display:flex;justify-content:space-between}.heading h2{font-size:19px;margin:0 0 5px;letter-spacing:-.4px}.heading p{font-size:11.5px;color:#4b5675;margin:0}.tools{display:flex;gap:9px;margin-top:36px}.tools>button,.search{height:36px;border:1px solid #dfe3eb;border-radius:7px;background:#fff;color:#18213e;font-size:10px;display:flex;align-items:center;justify-content:center;gap:8px}.tools>button{padding:0 12px}.search{width:210px;padding:0 11px}.search input{border:0;outline:0;width:100%;font-size:10px}.search input::placeholder{color:#69738b}
   .tabs{height:44px;border-bottom:1px solid #e8ebf1;display:flex;align-items:flex-end}.tabs button{height:39px;border:0;border-bottom:2px solid transparent;background:#fff;color:#303a58;font-size:10.5px;padding:0 20px}.tabs .active{color:#5e25dc;border-color:#5d28e7}
   .stats{height:122px;display:grid;grid-template-columns:repeat(5,1fr);gap:7px;padding-top:16px}.stat{height:122px;border:1px solid #e7eaf0;border-radius:8px;box-shadow:0 2px 10px rgba(30,35,65,.045);display:flex;justify-content:space-between;padding:14px 12px}.statTitle{font-size:9.5px;color:#202945;margin-top:2px}.statValue{font-size:16px;font-weight:750;margin-top:6px;white-space:nowrap;letter-spacing:-.35px}.change{font-size:9px;color:#0aa873;margin-top:12px}.change.negative{color:#fa3242}.note{font-size:8.5px;color:#58627d;margin-top:8px;white-space:nowrap}.statIcon{width:37px;height:37px;border-radius:9px;display:flex;align-items:center;justify-content:center}.purple{background:#f0ebff;color:#6630dd}.green{background:#e9faf3;color:#13ae78}.red{background:#ffedef;color:#ff3d4a}.blue{background:#edf4ff;color:#367fff}
   .table{margin-top:17px;height:632px;border:1px solid #e8ebf0;border-radius:8px;box-shadow:0 3px 12px rgba(30,35,65,.04);overflow:hidden}.thead,.row{display:grid;grid-template-columns:2.15fr .85fr 1.15fr 1.12fr 1.02fr 1.03fr 1.25fr .34fr;align-items:center}.thead{height:40px;background:#fafbfc;padding:0 13px;font-size:9px;color:#1d2641}.row{height:65px;border-top:1px solid #eef0f4;padding:0 13px}.transaction{display:flex;align-items:center;gap:11px}.transaction strong{display:block;font-size:10px;white-space:nowrap}.transaction small{display:block;font-size:8.5px;color:#56617c;margin-top:4px;white-space:nowrap}.txIcon{width:31px;height:31px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-style:normal;flex:none}.txIcon.orange{background:#fff4e4;color:#ff9419}.txIcon.pink{background:#ffedf1;color:#ff4560}.txIcon.green{background:#e9faf3;color:#16ae7c}.txIcon.blue{background:#edf4ff;color:#287cf2}.txIcon.purple{background:#f0ebff;color:#6730e8}.txIcon.gray{background:#f1f3f7;color:#63708b}.type,.status{font-size:8.5px;border-radius:5px;padding:5px 10px;display:inline-block}.type.income{color:#0b9e6c;background:#effaf5;border:1px solid #d2eee2}.type.expense{color:#f33748;background:#fff0f2;border:1px solid #ffdce0}.type.payout{color:#317bf0;background:#eff5ff;border:1px solid #dce9ff}.type.refund{color:#6830e6;background:#f4efff;border:1px solid #e5dcff}.muted{font-size:9px;color:#4f5975}.dateCell{font-size:9px}.dateCell small{display:block;font-size:8px;color:#59647e;margin-top:3px}.amount{font-size:9px}.amount.green{color:#04a66f}.amount.red{color:#ff2538}.status.completed{color:#0b9d6d;background:#effaf5;border:1px solid #d2eee2}.status.pending{color:#ed9017;background:#fff7e9;border:1px solid #ffe2b7}.dots{border:0;background:#fff;color:#5f6a85;font-size:18px}.footer{height:65px;border-top:1px solid #eef0f4;display:flex;align-items:center;justify-content:space-between;padding:0 14px;color:#25304c;font-size:9.5px}.pagination{display:flex;gap:4px;align-items:center}.pagination button{width:31px;height:31px;border:1px solid #e4e7ed;border-radius:7px;background:#fff;font-size:10px}.pagination .current{background:#6330e7;border-color:#6330e7;color:#fff}.pagination em{font-style:normal;padding:0 5px}
   .right{width:251px;border-left:1px solid #f0f1f5;padding:7px 15px 0 0}.card{border:1px solid #e8eaf0;border-radius:8px;box-shadow:0 2px 9px rgba(35,40,70,.035);background:#fff;margin-bottom:10px}.ai{height:286px;padding:16px 14px}.ai h3{font-size:13px;margin:0}.ai h3 span{float:right;color:#a5adbf}.online{font-size:9px;color:#069d6c;margin-top:7px}.robotBox{height:126px;display:flex;justify-content:center;align-items:center}.ai>strong{font-size:12px}.ai>p{font-size:10px;line-height:19px;margin:6px 0}.quick{height:190px;padding:13px 8px}.card h3{font-size:13px;margin:0 3px 10px}.quick button{height:32px;width:100%;border:1px solid #cfc0fa;background:#fff;border-radius:6px;color:#5c24cf;display:block;text-align:left;padding:0 11px;margin-bottom:6px;font-size:10px}.insights{height:267px;padding:14px 9px}.insight{display:flex;gap:10px;margin-bottom:13px}.insightIcon{width:29px;height:29px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex:none}.insight p{margin:0;font-size:9.5px;line-height:17px;color:#161c30}.insightIcon.green{background:#eaf9f3;color:#0aac73}.insightIcon.orange{background:#fff2e7;color:#ff891d}.insightIcon.blue{background:#edf4ff;color:#307cf2}.insightIcon.purple{background:#f1ebff;color:#7134ea}.chat{height:47px;border:1px solid #e0e3eb;border-radius:8px;display:flex;align-items:center;padding-left:13px;font-size:10px;color:#45516e}.chat span{flex:1}.chat button{width:32px;height:32px;border:0;border-radius:50%;background:#6328d9;color:#fff;margin-right:5px}.disclaimer{text-align:center;color:#68728a;font-size:8px;line-height:16px;margin-top:18px}
   .robot{width:135px;height:135px;position:relative;transform:scale(.88)}.halo{position:absolute;width:112px;height:88px;left:11px;top:3px;border-radius:50%;background:radial-gradient(circle,#fff,#f0eaff 50%,transparent 72%)}.antenna{position:absolute;left:64px;top:3px;width:7px;height:15px;background:#d8cef7;border-radius:6px}.antenna i{position:absolute;width:9px;height:9px;border-radius:50%;background:#8052ed;left:-1px;top:-4px}.head{position:absolute;left:27px;top:17px;width:82px;height:65px;border-radius:25px 25px 28px 28px;background:linear-gradient(145deg,#fff,#e4def5);box-shadow:inset 0 -7px 12px rgba(79,50,150,.12),0 6px 8px rgba(50,35,110,.12)}.face{position:absolute;left:9px;top:12px;width:64px;height:41px;border-radius:17px;background:#090d32;display:flex;align-items:center;justify-content:center;gap:19px}.face b{width:8px;height:8px;border-radius:50%;background:#9b60ff;box-shadow:0 0 8px #8e50ff}.face em{position:absolute;color:#ae65ff;font-size:14px;left:28px;top:22px;font-style:normal}.ear{position:absolute;top:39px;width:17px;height:30px;border-radius:9px;background:#d7cdf4}.ear.l{left:18px}.ear.r{right:18px}.bodyRobot{position:absolute;left:42px;top:77px;width:52px;height:52px;border-radius:16px 16px 20px 20px;background:linear-gradient(145deg,#fff,#e4def5);box-shadow:inset 0 -7px 9px rgba(79,50,150,.12)}.tie{position:absolute;top:4px;left:18px;width:16px;height:31px;background:#6540dc;clip-path:polygon(25% 0,75% 0,100% 45%,50% 100%,0 45%)}.chest{position:absolute;width:17px;height:17px;border-radius:50%;background:#cfc1f3;left:18px;top:29px}.arm{position:absolute;width:20px;height:42px;border-radius:14px;background:#e4def5;top:82px}.arm.l{left:24px;transform:rotate(20deg)}.arm.r{right:24px;transform:rotate(-20deg)}
   .toast{position:fixed;z-index:99;left:50%;bottom:24px;transform:translateX(-50%);background:#11162f;color:#fff;padding:10px 18px;border-radius:7px;font-size:11px;box-shadow:0 12px 30px rgba(0,0,0,.18)}
  `}</style>
 </div>
}
