"use client";

import {
  Bot,
  ArrowUpRight,
  CircleCheck,
  Users,
  Coins,
  Search,
  PenLine,
  Headset,
  ChartColumn,
  Share2,
  Mail,
  TriangleAlert,
  CircleAlert,
  Info,
  Plus,
  Download,
  Workflow,
  LayoutList,
} from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { Donut, TasksPerformanceChart, Sparkline, type DonutSlice } from "@/components/dashboard/charts";

const STATS = [
  { label: "TOTAL AGENTS", value: "24", sub: "Active", tone: "neutral" as const, icon: Bot, iconColor: "#38bdf8" },
  { label: "TASKS TODAY", value: "1,842", sub: "+12.5% vs yesterday", tone: "up" as const, icon: ArrowUpRight, iconColor: "#38bdf8" },
  { label: "SUCCESS RATE", value: "98.6%", sub: "+2.1% vs yesterday", tone: "up" as const, icon: CircleCheck, iconColor: "#22c55e" },
  { label: "TOTAL USERS", value: "1,203", sub: "+8.4% vs yesterday", tone: "up" as const, icon: Users, iconColor: "#f43f5e" },
  { label: "TOTAL COST (MONTH)", value: "$2,341.50", sub: "-5.3% vs last month", tone: "down" as const, icon: Coins, iconColor: "#f59e0b" },
];

const AGENTS_OVERVIEW: DonutSlice[] = [
  { label: "Active", value: 12, color: "#22c55e" },
  { label: "Idle", value: 6, color: "#38bdf8" },
  { label: "Busy", value: 3, color: "#f59e0b" },
  { label: "Offline", value: 2, color: "#f43f5e" },
  { label: "Maintenance", value: 1, color: "#8b5cf6" },
];

const TASKS_BY_CATEGORY: (DonutSlice & { pct: number })[] = [
  { label: "Research", value: 645, pct: 35, color: "#38bdf8" },
  { label: "Content", value: 461, pct: 25, color: "#6366f1" },
  { label: "Data Analysis", value: 368, pct: 20, color: "#8b5cf6" },
  { label: "Marketing", value: 276, pct: 15, color: "#f59e0b" },
  { label: "Support", value: 92, pct: 5, color: "#f43f5e" },
];

const LIVE_ACTIVITY = [
  { name: "Research Agent", detail: "Gathering market data", status: "Active", icon: Search, color: "#38bdf8" },
  { name: "Content Writer Agent", detail: "Writing blog post", status: "Active", icon: PenLine, color: "#8b5cf6" },
  { name: "Customer Support Agent", detail: "Handling customer query", status: "Busy", icon: Headset, color: "#f59e0b" },
  { name: "Data Analyst Agent", detail: "Analyzing sales data", status: "Active", icon: ChartColumn, color: "#6366f1" },
  { name: "Social Media Agent", detail: "Scheduling posts", status: "Idle", icon: Share2, color: "#ec4899" },
  { name: "Email Marketing Agent", detail: "Sending email campaigns", status: "Active", icon: Mail, color: "#22c55e" },
];

const STATUS_COLOR: Record<string, string> = { Active: "#22c55e", Busy: "#f59e0b", Idle: "#38bdf8" };

const TOP_PERFORMING = [
  { name: "Research Agent", tasks: 342, pct: "98.9%", icon: Search, color: "#38bdf8" },
  { name: "Data Analyst Agent", tasks: 298, pct: "98.1%", icon: ChartColumn, color: "#8b5cf6" },
  { name: "Content Writer Agent", tasks: 201, pct: "97.3%", icon: PenLine, color: "#f59e0b" },
  { name: "Email Marketing Agent", tasks: 187, pct: "96.8%", icon: Mail, color: "#22c55e" },
  { name: "Social Media Agent", tasks: 156, pct: "95.4%", icon: Share2, color: "#ec4899" },
];

const RECENT_TASKS = [
  { title: "Market research analysis", agent: "Research Agent", time: "2 min ago", icon: Search, color: "#38bdf8" },
  { title: "Write product description", agent: "Content Writer Agent", time: "5 min ago", icon: PenLine, color: "#8b5cf6" },
  { title: "Analyze sales performance", agent: "Data Analyst Agent", time: "8 min ago", icon: ChartColumn, color: "#f59e0b" },
  { title: "Customer support response", agent: "Customer Support Agent", time: "12 min ago", icon: Headset, color: "#22d3ee" },
  { title: "Social media post schedule", agent: "Social Media Agent", time: "15 min ago", icon: Share2, color: "#ec4899" },
];

const ALERTS = [
  { title: "High task volume detected", sub: "System", time: "2 min ago", icon: TriangleAlert, color: "#f59e0b" },
  { title: "API rate limit warning", sub: "Integration", time: "15 min ago", icon: TriangleAlert, color: "#f59e0b" },
  { title: "Agent offline: SEO Agent", sub: "System", time: "30 min ago", icon: CircleAlert, color: "#f43f5e" },
  { title: "Maintenance scheduled", sub: "System", time: "1 hr ago", icon: Info, color: "#38bdf8" },
];

const SYSTEM_PERFORMANCE = [
  { label: "CPU Usage", value: "45%", change: "+5.2%", color: "#38bdf8", data: [30, 34, 32, 38, 36, 42, 40, 45] },
  { label: "Memory Usage", value: "68%", change: "+3.1%", color: "#8b5cf6", data: [58, 60, 62, 61, 65, 64, 67, 68] },
  { label: "Storage Usage", value: "72%", change: "+2.4%", color: "#f59e0b", data: [66, 67, 68, 69, 70, 70, 71, 72] },
  { label: "Network I/O", value: "32%", change: "-1.3%", color: "#22c55e", data: [40, 38, 36, 35, 34, 33, 33, 32] },
];

const QUICK_ACTIONS = [
  { label: "Create New Agent", icon: Plus },
  { label: "Import Data", icon: Download },
  { label: "Create Workflow", icon: Workflow },
  { label: "View All Agents", icon: LayoutList },
];

export default function CommandCentrePage() {
  return (
    <AppShell>
      <section className="dc-stats">
        {STATS.map((s) => (
          <div className="dc-stat-card" key={s.label}>
            <div className="dc-stat-head">
              <span className="dc-stat-label">{s.label}</span>
              <span className="dc-stat-icon" style={{ background: `${s.iconColor}22` }}>
                <s.icon size={15} color={s.iconColor} />
              </span>
            </div>
            <div className="dc-stat-value-row">
              <span className="dc-stat-value">{s.value}</span>
            </div>
            <div className={`dc-stat-sub ${s.tone}`}>{s.sub}</div>
          </div>
        ))}
      </section>

      <section className="dc-row-1">
        <div className="dc-card">
          <div className="dc-card-head">
            <span className="dc-card-title">AI AGENTS OVERVIEW</span>
          </div>
          <div className="dc-donut-block">
            <div className="dc-donut-wrap">
              <Donut data={AGENTS_OVERVIEW} />
              <div className="dc-donut-center">
                <span className="dc-donut-center-value">24</span>
                <span className="dc-donut-center-label">Total Agents</span>
              </div>
            </div>
            <div className="dc-legend">
              {AGENTS_OVERVIEW.map((s) => (
                <div className="dc-legend-item" key={s.label}>
                  <span className="dc-legend-swatch" style={{ background: s.color }} />
                  <span className="dc-legend-value">{s.value}</span>
                  <span className="dc-legend-label">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="dc-card">
          <div className="dc-card-head">
            <span className="dc-card-title">TASKS &amp; PERFORMANCE</span>
            <select className="dc-select" defaultValue="24h">
              <option value="24h">24 Hours</option>
              <option value="7d">7 Days</option>
              <option value="30d">30 Days</option>
            </select>
          </div>
          <div style={{ display: "flex", gap: 16, marginBottom: 4 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--dc-ink-soft)" }}>
              <span style={{ width: 10, height: 2, background: "#22d3ee", display: "inline-block", borderRadius: 2 }} /> Tasks
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--dc-ink-soft)" }}>
              <span style={{ width: 10, height: 2, background: "#a855f7", display: "inline-block", borderRadius: 2 }} /> Success Rate
            </span>
          </div>
          <TasksPerformanceChart />
        </div>

        <div className="dc-card">
          <div className="dc-card-head">
            <span className="dc-card-title">LIVE AGENTS ACTIVITY</span>
            <button type="button" className="dc-card-link">View All</button>
          </div>
          <div className="dc-list">
            {LIVE_ACTIVITY.map((a) => (
              <div className="dc-list-row" key={a.name}>
                <span className="dc-list-icon" style={{ background: `${a.color}22`, color: a.color }}>
                  <a.icon size={16} />
                </span>
                <div className="dc-list-main">
                  <div className="dc-list-title">{a.name}</div>
                  <div className="dc-list-sub">{a.detail}</div>
                </div>
                <span className="dc-list-status" style={{ color: STATUS_COLOR[a.status] }}>
                  <span className="dc-dot" style={{ background: STATUS_COLOR[a.status] }} />
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="dc-row-2">
        <div className="dc-card">
          <div className="dc-card-head">
            <span className="dc-card-title">TOP PERFORMING AGENTS</span>
          </div>
          <div className="dc-list">
            {TOP_PERFORMING.map((a) => (
              <div className="dc-list-row" key={a.name}>
                <span className="dc-list-icon" style={{ background: `${a.color}22`, color: a.color }}>
                  <a.icon size={16} />
                </span>
                <div className="dc-list-main">
                  <div className="dc-list-title">{a.name}</div>
                  <div className="dc-list-sub">Tasks: {a.tasks}</div>
                </div>
                <span className="dc-pct">{a.pct}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="dc-card">
          <div className="dc-card-head">
            <span className="dc-card-title">TASKS BY CATEGORY</span>
          </div>
          <div className="dc-donut-block" style={{ flexDirection: "column", alignItems: "stretch", gap: 16 }}>
            <div className="dc-donut-wrap" style={{ alignSelf: "center" }}>
              <Donut data={TASKS_BY_CATEGORY} />
              <div className="dc-donut-center">
                <span className="dc-donut-center-value">1,842</span>
                <span className="dc-donut-center-label">Total</span>
              </div>
            </div>
            <div className="dc-legend">
              {TASKS_BY_CATEGORY.map((s) => (
                <div className="dc-legend-row" key={s.label}>
                  <span className="dc-legend-item">
                    <span className="dc-legend-swatch" style={{ background: s.color }} />
                    <span className="dc-legend-label">{s.label}</span>
                  </span>
                  <span>
                    <span className="dc-legend-pct">{s.pct}%</span>{" "}
                    <span className="dc-legend-count">({s.value})</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="dc-card">
          <div className="dc-card-head">
            <span className="dc-card-title">RECENT TASKS</span>
            <button type="button" className="dc-card-link">View All</button>
          </div>
          <div className="dc-list">
            {RECENT_TASKS.map((t) => (
              <div className="dc-list-row" key={t.title}>
                <span className="dc-list-icon" style={{ background: `${t.color}22`, color: t.color }}>
                  <t.icon size={16} />
                </span>
                <div className="dc-list-main">
                  <div className="dc-list-title">{t.title}</div>
                  <div className="dc-list-sub">{t.agent}</div>
                </div>
                <div className="dc-list-col-right">
                  <span className="dc-list-time">{t.time}</span>
                  <span className="dc-status-pill completed">Completed</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="dc-card">
          <div className="dc-card-head">
            <span className="dc-card-title">ALERTS &amp; NOTIFICATIONS</span>
            <button type="button" className="dc-card-link">View All</button>
          </div>
          <div className="dc-list">
            {ALERTS.map((a) => (
              <div className="dc-list-row" key={a.title}>
                <span className="dc-list-icon" style={{ background: `${a.color}22`, color: a.color }}>
                  <a.icon size={16} />
                </span>
                <div className="dc-list-main">
                  <div className="dc-list-title">{a.title}</div>
                  <div className="dc-list-sub">{a.sub}</div>
                </div>
                <span className="dc-list-time">{a.time}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="dc-row-3">
        <div className="dc-card">
          <div className="dc-card-head">
            <span className="dc-card-title">SYSTEM PERFORMANCE</span>
          </div>
          <div className="dc-perf-grid">
            {SYSTEM_PERFORMANCE.map((p) => (
              <div className="dc-perf-tile" key={p.label}>
                <div className="dc-perf-head">
                  <span>{p.label}</span>
                  <span style={{ color: p.change.startsWith("-") ? "var(--dc-green)" : "var(--dc-ink-faint)" }}>
                    {p.change}
                  </span>
                </div>
                <div className="dc-perf-value">{p.value}</div>
                <div className="dc-perf-sparkline">
                  <Sparkline data={p.data} color={p.color} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="dc-card">
          <div className="dc-card-head">
            <span className="dc-card-title">QUICK ACTIONS</span>
          </div>
          <div className="dc-quick-actions">
            {QUICK_ACTIONS.map((a) => (
              <button type="button" className="dc-quick-btn" key={a.label}>
                <a.icon size={16} />
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
