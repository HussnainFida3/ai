"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { usePlatformParam, platformLabel } from "@/lib/agent-data";

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
    diamond:<><path d="m3 9 5-6h8l5 6-9 12Z"/><path d="m3 9h18M8 3l4 18 4-18"/></>,
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
    arrowUp:<><path d="M12 19V5M6 11l6-6 6 6"/></>,
    sparkle:<><path d="m12 2 1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7Z"/><path d="m20 17 .6 2.4L23 20l-2.4.6L20 23l-.6-2.4L17 20l2.4-.6Z"/></>,
    send:<><path d="m3 3 18 9-18 9 4-9z"/><path d="M7 12h14"/></>,
    more:<><circle cx="12" cy="5" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="19" r="1" fill="currentColor"/></>,
    close:<><path d="m6 6 12 12M18 6 6 18"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{p[name]||p.file}</svg>;
};

const MiniLine=({color="#6532e9", expense=false}:{color?:string;expense?:boolean})=>(
  <svg className="mini-line" viewBox="0 0 190 55" preserveAspectRatio="none">
    <defs><linearGradient id={expense?"expfill":"revfill"} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".13"/><stop offset="1" stopColor={color} stopOpacity=".01"/></linearGradient></defs>
    <path d={expense?"M0 42 L20 39 L40 30 L60 32 L80 23 L100 27 L120 21 L140 20 L160 13 L175 14 L190 7 L190 55 L0 55Z":"M0 37 L20 36 L40 22 L60 23 L80 17 L100 10 L120 16 L140 7 L160 12 L175 3 L190 0 L190 55 L0 55Z"} fill={`url(#${expense?"expfill":"revfill"})`}/>
    <polyline points={expense?"0,42 20,39 40,30 60,32 80,23 100,27 120,21 140,20 160,13 175,14 190,7":"0,37 20,36 40,22 60,23 80,17 100,10 120,16 140,7 160,12 175,3 190,0"} fill="none" stroke={color} strokeWidth="2.2"/>
  </svg>
);

export default function FinanceReportsPage({ params }: { params: Promise<{ platform: string }> }){
  const platform = usePlatformParam(params);
  const pathname = usePathname();
  const router = useRouter();
  const [range,setRange]=React.useState("May 1 – May 31, 2025");
  const [month,setMonth]=React.useState("This Month");
  const [openDate,setOpenDate]=React.useState(false);
  const [notice,setNotice]=React.useState("");
  const [chat,setChat]=React.useState("");
  const [sent,setSent]=React.useState<string[]>([]);

  const toast=(x:string)=>{setNotice(x);window.setTimeout(()=>setNotice(""),2200)};
  const nav: Array<[string, string, string]> = [
    ["home", "Dashboard", "dashboard"],
    ["card", "Transactions", "transactions"],
    ["file", "Reports", "reports"],
    ["finance", "Payouts", "payouts"],
    ["bot", "Chat", "chat"],
  ];

  const exportReport=()=>{
    const text=`${platformLabel(platform)} Finance Report\nPeriod: ${range}\n\nTotal Revenue: PKR 8,742,500\nNet Profit: PKR 2,457,300\nTotal Expenses: PKR 6,285,200\nCash Balance: PKR 5,312,400`;
    const b=new Blob([text],{type:"text/plain"});const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=`${platform}-finance-report.txt`;a.click();URL.revokeObjectURL(a.href);toast("Reports exported successfully");
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
      .brand svg{width:38px;height:42px;color:#cf399f}
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
      .linechart{height:193px;position:relative;padding:8px 0 22px 40px}.grid{position:absolute;left:40px;right:0;top:8px;bottom:23px;display:flex;flex-direction:column;justify-content:space-between}.grid i{height:1px;background:#edf0f5}.ylabels{position:absolute;left:0;top:5px;bottom:21px;display:flex;flex-direction:column;justify-content:space-between;font-size:9px;color:#515b78}.xlabels{position:absolute;left:40px;right:0;bottom:0;display:flex;justify-content:space-between;font-size:8.5px;color:#525d7a}.linechart svg{position:absolute;left:40px;right:0;top:8px;width:calc(100% - 40px);height:158px}.revline{fill:none;stroke:#6631e5;stroke-width:2.2}.expline{fill:none;stroke:#e9368f;stroke-width:2.2}
      .profit-body{display:flex;align-items:center;height:210px;gap:25px}.donut{width:177px;height:177px;border-radius:50%;background:conic-gradient(#6524d9 0 56%,#e32e91 56% 78%,#f37c25 78% 92%,#3c78ed 92% 100%);display:grid;place-items:center;flex:0 0 auto}.donut-hole{width:115px;height:115px;border-radius:50%;background:#fff;display:grid;place-items:center;align-content:center;text-align:center}.donut-hole span{font-size:11px;color:#3c425a}.donut-hole strong{font-size:15px;margin-top:5px}.profit-list{display:flex;flex-direction:column;gap:15px;font-size:10px}.profit-row{display:grid;grid-template-columns:12px 1fr;gap:8px}.profit-row b{font-size:11px;font-weight:500}.profit-row small{display:block;font-size:9.5px;color:#4e5771;margin-top:3px}.p1{background:#6524d9}.p2{background:#e32e91}.p3{background:#f37c25}.p4{background:#3c78ed}
      .reports{height:411px;background:#fff;border:1px solid #edf0f5;border-radius:8px;box-shadow:0 2px 8px rgba(31,35,70,.035);padding:17px 15px}.reports-desc{font-size:10px;color:#3f465e;margin:6px 0 12px}.table{width:100%;border-collapse:collapse;table-layout:fixed}.table th{height:31px;background:#fafbfe;font-size:9px;font-weight:550;color:#39415e;text-align:left;padding:0 7px}.table td{height:47px;border-bottom:1px solid #edf0f4;font-size:9px;color:#303750;padding:0 7px}.table th:nth-child(1){width:21%}.table th:nth-child(2){width:27%}.table th:nth-child(3){width:20%}.table th:nth-child(4){width:15%}.table th:nth-child(5){width:17%}.report-name{display:flex;align-items:center;gap:10px;font-weight:700;color:#11162a}.report-icon{width:31px;height:31px;border-radius:8px;display:grid;place-items:center}.ri1{background:#f0e7ff;color:#6730e6}.ri2{background:#e3f8ec;color:#10a969}.ri3{background:#ffe5e7;color:#f34a52}.ri4{background:#e8efff;color:#3579ed}.ri5{background:#fff0df;color:#ff891e}.period{height:30px;border:1px solid #e1e4eb;border-radius:6px;background:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 8px;font-size:9px;color:#323b57}.view{height:29px;border:1px solid #d5aaf4;background:#fff;color:#6023ce;border-radius:6px;padding:0 9px;font-size:9px;display:inline-flex;align-items:center;gap:7px;cursor:pointer}.dots{border:0;background:none;cursor:pointer;color:#525a72}.pagination{height:50px;display:flex;align-items:center;justify-content:space-between;font-size:10px;color:#343c56}.pages{display:flex;align-items:center;gap:15px}.page-btn{width:32px;height:31px;border:1px solid #e3e5ec;background:#fff;border-radius:6px;color:#333c59;cursor:pointer}.page-btn.active{background:linear-gradient(135deg,#7030ee,#5e2be2);color:#fff;border-color:#7030ee}
      .agent{background:#fff;border:1px solid #edf0f5;border-radius:8px;box-shadow:0 2px 8px rgba(31,35,70,.04);min-height:906px;padding:16px 10px}.agent-title{font-size:12.5px;font-weight:750;display:flex;justify-content:space-between}.online{font-size:10px;color:#0aa96a;margin-top:6px}.online i{width:9px;height:9px;background:#09ad6c;border-radius:50%;display:inline-block;margin-right:5px}.robot{height:132px;display:grid;place-items:center;position:relative}.robot-head{width:95px;height:86px;border-radius:45px 45px 34px 34px;background:linear-gradient(145deg,#fff,#d8d4ff);box-shadow:0 7px 15px rgba(102,67,213,.16);position:relative;border:2px solid #a397ef}.robot-head:before{content:"";position:absolute;left:21px;top:27px;width:53px;height:37px;border-radius:18px;background:#17142d;box-shadow:inset 0 0 15px #42347f}.robot-head:after{content:"••";position:absolute;left:31px;top:29px;color:#c178ff;font-size:18px;letter-spacing:11px}.robot-tie{position:absolute;bottom:5px;left:45px;width:13px;height:34px;background:#6731df;clip-path:polygon(20% 0,80% 0,100% 100%,50% 76%,0 100%)}.robot-ear{position:absolute;width:13px;height:34px;border-radius:8px;background:#ddd8ff;top:33px}.ear-l{left:59px}.ear-r{right:59px}.agent-text{font-size:11px;line-height:19px;color:#171a2d}.agent-text strong{font-size:12px}.quick{border-top:1px solid #f0f1f5;margin-top:14px;padding-top:12px}.quick-title{font-size:12px;font-weight:750;margin-bottom:8px}.quick button{height:32px;width:100%;border:1px solid #bb86ef;background:#fff;border-radius:6px;color:#5e21cf;text-align:left;padding:0 10px;display:flex;align-items:center;gap:8px;font-size:9.5px;margin-bottom:6px;cursor:pointer}.insights{margin-top:14px;border-top:1px solid #f0f1f5;padding-top:13px}.insights-title{font-size:12px;font-weight:750;margin-bottom:11px}.insight{display:flex;gap:9px;margin:10px 0;font-size:9.5px;line-height:15px}.insight-icon{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;flex:0 0 auto}.ig{background:#e8faee;color:#08a96a}.io{background:#fff0df;color:#f18b25}.ib{background:#e9f1ff;color:#377eea}.ip{background:#f0e8ff;color:#7131e8}.chat{margin-top:17px;height:48px;border:1px solid #e0e4ec;border-radius:8px;display:flex;align-items:center;padding:0 7px 0 11px}.chat input{border:0;outline:0;flex:1;font-size:9.5px;color:#555d74;background:transparent}.send{width:31px;height:31px;border-radius:50%;border:0;background:#6424d8;color:#fff;display:grid;place-items:center;cursor:pointer}.disclaimer{text-align:center;font-size:8px;color:#697087;line-height:14px;margin-top:20px}
      .date-menu{position:absolute;right:165px;top:62px;width:220px;background:#fff;border:1px solid #e0e3eb;border-radius:8px;box-shadow:0 12px 30px rgba(30,33,65,.13);padding:6px;z-index:50}.date-menu button{width:100%;border:0;background:#fff;text-align:left;padding:9px;border-radius:5px;font-size:11px;cursor:pointer;color:#343b55}.date-menu button:hover{background:#f4efff;color:#5f24d2}
      .toast{position:fixed;right:24px;bottom:22px;background:#171a31;color:#fff;border-radius:8px;padding:11px 15px;font-size:11px;box-shadow:0 14px 35px rgba(20,22,50,.25);z-index:100;animation:in .22s ease-out}@keyframes in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
      @media(max-width:1200px){.page{grid-template-columns:1fr}.right-agent{display:none}.metrics{grid-template-columns:repeat(2,1fr)}.sidebar{width:210px}.main{margin-left:210px;width:calc(100% - 210px)}}
      @media(max-width:800px){.sidebar{display:none}.main{margin-left:0;width:100%}.page{padding:14px}.top{padding:0 14px}.top-date{width:180px}.profile{display:none}.charts{grid-template-columns:1fr}.metrics{grid-template-columns:1fr}.table{min-width:760px}.reports{overflow:auto}.title-row{height:auto;gap:10px;flex-wrap:wrap}.top-right{gap:7px}}
    `}</style>

    <aside className="sidebar">
      <div className="brand">
        <svg viewBox="0 0 44 46" fill="none"><path d="M22 42S5 31.5 5 17.5C5 10.3 10.1 6 15.8 6c3.5 0 5.1 2 6.2 4.7C23.1 8 25 6 28.5 6 34.1 6 39 10.4 39 17.5 39 31.5 22 42 22 42Z" stroke="currentColor" strokeWidth="3"/><path d="M12 18h7l3 5 3-8 3 5h5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/><circle cx="22" cy="5" r="2.5" fill="currentColor"/></svg>
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
        <div className="ai-header"><div className="ai-head-icon"><I name="trend"/></div><div><div className="ai-heading">{platformLabel(platform)} — Finance Manager AI Agent <span className="spark">✦</span></div><div className="ai-sub">Your intelligent finance partner for smarter decisions</div></div></div>
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
            <div className="metric"><div className="metric-top"><div className="micon m-purple"><I name="revenue" size={19}/></div><div><div className="m-label">Total Revenue</div><div className="m-value">PKR 8,742,500</div><span className="m-growth">↑ 24.6%</span><div className="m-sub">vs Apr 1 – Apr 30, 2025</div></div></div></div>
            <div className="metric"><div className="metric-top"><div className="micon m-green"><I name="profit" size={19}/></div><div><div className="m-label">Net Profit</div><div className="m-value">PKR 2,457,300</div><span className="m-growth">↑ 18.7%</span><div className="m-sub">vs Apr 1 – Apr 30, 2025</div></div></div></div>
            <div className="metric"><div className="metric-top"><div className="micon m-red"><I name="expense" size={19}/></div><div><div className="m-label">Total Expenses</div><div className="m-value">PKR 6,285,200</div><span className="m-growth red">↑ 12.4%</span><div className="m-sub">vs Apr 1 – Apr 30, 2025</div></div></div></div>
            <div className="metric cash"><div className="metric-top"><div className="micon m-blue"><I name="cash" size={19}/></div><div><div className="m-label">Cash Balance</div><div className="m-value">PKR 5,312,400</div><div className="m-sub">Available Balance</div></div></div></div>
          </div>

          <div className="charts">
            <div className="chart-card">
              <div className="card-head"><div className="card-title">Revenue vs Expenses</div><button className="select" onClick={()=>toast(`${month} selected`)}>{month}<I name="chevron" size={11}/></button></div>
              <div className="legend"><span><i className="purple-dot"/>Revenue</span><span><i className="pink-dot"/>Expenses</span></div>
              <div className="linechart">
                <div className="ylabels"><span>10M</span><span>8M</span><span>6M</span><span>4M</span><span>2M</span><span>0</span></div>
                <div className="grid">{[0,1,2,3,4,5].map(i=><i key={i}/>)}</div>
                <svg viewBox="0 0 520 160" preserveAspectRatio="none">
                  <defs><linearGradient id="rfill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7132e8" stopOpacity=".13"/><stop offset="1" stopColor="#7132e8" stopOpacity=".01"/></linearGradient><linearGradient id="efill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e73691" stopOpacity=".12"/><stop offset="1" stopColor="#e73691" stopOpacity=".01"/></linearGradient></defs>
                  <path d="M0 112L40 112 80 96 120 97 160 87 200 65 240 78 280 57 320 66 360 48 400 35 440 27 480 18 520 9V160H0Z" fill="url(#rfill)"/>
                  <path d="M0 112L40 112 80 96 120 97 160 87 200 65 240 78 280 57 320 66 360 48 400 35 440 27 480 18 520 9" className="revline"/>
                  <path d="M0 137L40 132 80 119 120 121 160 109 200 108 240 109 280 101 320 105 360 102 400 91 440 90 480 75 520 67V160H0Z" fill="url(#efill)"/>
                  <path d="M0 137L40 132 80 119 120 121 160 109 200 108 240 109 280 101 320 105 360 102 400 91 440 90 480 75 520 67" className="expline"/>
                  {[0,40,80,120,160,200,240,280,320,360,400,440,480,520].map((x,i)=><circle key={i} cx={x} cy={([112,112,96,97,87,65,78,57,66,48,35,27,18,9][i])} r="2.4" fill="#6631e5"/>)}
                </svg>
                <div className="xlabels"><span>May 1</span><span>May 6</span><span>May 11</span><span>May 16</span><span>May 21</span><span>May 26</span><span>May 31</span></div>
              </div>
            </div>

            <div className="chart-card">
              <div className="card-head"><div className="card-title">Profit Breakdown</div><button className="select" onClick={()=>toast(`${month} selected`)}>{month}<I name="chevron" size={11}/></button></div>
              <div className="profit-body"><div className="donut"><div className="donut-hole"><span>Total</span><strong>PKR 2.46M</strong></div></div><div className="profit-list">
                <div className="profit-row"><i className="dot p1"/><div><b>Operating Profit</b><small><strong>56%</strong> &nbsp;(PKR 1,376,088)</small></div></div>
                <div className="profit-row"><i className="dot p2"/><div><b>Marketing Profit</b><small><strong>22%</strong> &nbsp;(PKR 540,606)</small></div></div>
                <div className="profit-row"><i className="dot p3"/><div><b>Subscription Profit</b><small><strong>14%</strong> &nbsp;(PKR 343,058)</small></div></div>
                <div className="profit-row"><i className="dot p4"/><div><b>Other Income</b><small><strong>8%</strong> &nbsp;(PKR 197,548)</small></div></div>
              </div></div>
            </div>
          </div>

          <div className="reports">
            <div className="card-title">Available Reports</div>
            <div className="reports-desc">View and download detailed financial reports.</div>
            <table className="table">
              <thead><tr><th>Report Name</th><th>Description</th><th>Period</th><th>Generated On</th><th>Action</th></tr></thead>
              <tbody>
                {[
                  ["Profit & Loss Statement","Summary of revenues, expenses and net profit.","ri1","revenue"],
                  ["Revenue Report","Detailed breakdown of all income sources.","ri2","profit"],
                  ["Expense Report","Detailed breakdown of all expenses.","ri3","expense"],
                  ["Cash Flow Statement","Cash inflows and outflows summary.","ri4","cash"],
                  ["Tax Summary Report","Taxable income and tax summary.","ri5","calculator"],
                ].map(([name,desc,cls,icon],i)=><tr key={name}>
                  <td><div className="report-name"><span className={`report-icon ${cls}`}><I name={icon}/></span>{name}</div></td>
                  <td>{desc}</td><td><button className="period" onClick={()=>toast(`Period: ${range}`)}>{range}<I name="chevron" size={10}/></button></td>
                  <td>May 31, 2025<br/>10:30 AM</td><td><button className="view" onClick={()=>toast(`${name} opened`)}>View Report <I name="chevron" size={10}/></button><button className="dots" onClick={()=>toast("More report actions")}><I name="more" size={15}/></button></td>
                </tr>)}
              </tbody>
            </table>
            <div className="pagination"><span>Showing 1 to 5 of 12 reports</span><div className="pages"><button className="page-btn" onClick={()=>toast("Previous page")}>‹</button><button className="page-btn active">1</button><button className="page-btn" onClick={()=>toast("Page 2")}>2</button><button className="page-btn" onClick={()=>toast("Page 3")}>3</button><span>…</span><button className="page-btn" onClick={()=>toast("Page 12")}>12</button><button className="page-btn" onClick={()=>toast("Next page")}>›</button></div></div>
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
            <div className="insights"><div className="insights-title">Insights for May 2025</div>
              <div className="insight"><span className="insight-icon ig"><I name="arrowUp" size={15}/></span><span>Revenue is up by 24.6% compared to last month.</span></div>
              <div className="insight"><span className="insight-icon io"><I name="expense" size={14}/></span><span>Marketing spend is 39% of total expenses. Consider optimizing.</span></div>
              <div className="insight"><span className="insight-icon ib"><I name="sparkle" size={14}/></span><span>Net profit margin is 28.1%. Good job! Keep it up.</span></div>
              <div className="insight"><span className="insight-icon ip"><I name="finance" size={14}/></span><span>You have 14 pending payouts totaling PKR 312,500.</span></div>
            </div>
            <div className="chat"><input value={chat} onChange={e=>setChat(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")sendChat()}} placeholder="Ask me anything..."/><button className="send" onClick={sendChat}><I name="send" size={15}/></button></div>
            <div className="disclaimer">AI responses can make mistakes.<br/>Please verify important information.</div>
            {sent.length>0&&<div style={{display:"none"}}>{sent.join("|")}</div>}
          </div>
        </aside>
      </div>
    </main>
    {notice&&<div className="toast">{notice}</div>}
  </div>
}
