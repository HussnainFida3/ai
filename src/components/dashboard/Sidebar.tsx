"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Bot,
  ListChecks,
  Radar,
  Database,
  BarChart3,
  Puzzle,
  Bell,
  Settings,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Overview", href: "/", icon: LayoutGrid },
  { label: "AI Agents", href: "/ai-agents", icon: Bot },
  { label: "Usage ", href: "/credit-usage", icon: ListChecks },

  { label: "Alerts & Logs", href: "/alerts", icon: Bell },
  { label: "Settings", href: "/settings", icon: Settings },
];

const SYSTEM_STATS = [
  { label: "Uptime", value: "99.98%" },
  { label: "Response Time", value: "320ms" },
  { label: "Active Agents", value: "24/50" },
  { label: "Completed Tasks", value: "1,842" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="dc-sidebar">
      <div className="dc-brand">
        <div className="dc-brand-logo">AI</div>
        <div className="dc-brand-text">
          <div className="dc-brand-title">AI AGENTS</div>
          <div className="dc-brand-sub">COMMAND CENTRE</div>
        </div>
      </div>

      <nav className="dc-nav">
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className={`dc-nav-item ${active ? "active" : ""}`}>
              <Icon size={17} strokeWidth={2} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="dc-system-status">
        <div className="dc-system-status-head">
          <span>SYSTEM STATUS</span>
          <span className="dc-dot dc-dot-green" />
        </div>
        <div className="dc-system-status-label">All Systems Operational</div>

        <div className="dc-system-rows">
          {SYSTEM_STATS.map((row) => (
            <div className="dc-system-row" key={row.label}>
              <span>{row.label}</span>
              <span>{row.value}</span>
            </div>
          ))}
          <div className="dc-system-row">
            <span>System Load</span>
            <span>45%</span>
          </div>
          <div className="dc-load-bar">
            <div className="dc-load-bar-fill" style={{ width: "45%" }} />
          </div>
        </div>

        <button type="button" className="dc-view-logs">
          View System Logs
        </button>
      </div>
    </aside>
  );
}
