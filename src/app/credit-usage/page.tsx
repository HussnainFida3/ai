"use client";

import {
  Coins,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Bot,
  Zap,
  CircleDollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Download,
  Search,
  Filter,
  CalendarDays,
  Activity,
  Cpu,
  Database,
  Sparkles,
  ChevronRight,
  ReceiptText,
  ChartNoAxesCombined,
  CircleAlert,
  CheckCircle2,
  Clock3,
  WalletCards,
} from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { Donut, Sparkline, type DonutSlice } from "@/components/dashboard/charts";

const CREDIT_STATS = [
  {
    label: "AVAILABLE CREDITS",
    value: "48,750",
    sub: "Estimated 18 days remaining",
    icon: Coins,
    color: "#f59e0b",
    trend: "+12.4%",
    trendType: "up",
  },
  {
    label: "CREDITS USED TODAY",
    value: "2,842",
    sub: "1,842 tasks processed",
    icon: Zap,
    color: "#38bdf8",
    trend: "+8.6%",
    trendType: "up",
  },
  {
    label: "MONTHLY USAGE",
    value: "51,249",
    sub: "68.3% of monthly budget",
    icon: ChartNoAxesCombined,
    color: "#8b5cf6",
    trend: "+4.2%",
    trendType: "up",
  },
  {
    label: "ESTIMATED COST",
    value: "$1,247.80",
    sub: "$0.68 average per task",
    icon: CircleDollarSign,
    color: "#22c55e",
    trend: "-6.8%",
    trendType: "down",
  },
];

const CREDIT_DISTRIBUTION: DonutSlice[] = [
  { label: "Research", value: 14230, color: "#38bdf8" },
  { label: "Content", value: 11840, color: "#8b5cf6" },
  { label: "Analytics", value: 9460, color: "#22c55e" },
  { label: "Marketing", value: 7220, color: "#f59e0b" },
  { label: "Support", value: 4499, color: "#ec4899" },
];

const AGENT_USAGE = [
  {
    name: "Research Agent",
    tasks: "342 tasks",
    credits: "8,942",
    percentage: 87,
    color: "#38bdf8",
    icon: Search,
    change: "+14.2%",
  },
  {
    name: "Content Writer Agent",
    tasks: "286 tasks",
    credits: "7,814",
    percentage: 76,
    color: "#8b5cf6",
    icon: Sparkles,
    change: "+9.8%",
  },
  {
    name: "Data Analyst Agent",
    tasks: "298 tasks",
    credits: "6,928",
    percentage: 68,
    color: "#22c55e",
    icon: ChartNoAxesCombined,
    change: "+5.1%",
  },
  {
    name: "SEO Agent",
    tasks: "214 tasks",
    credits: "5,462",
    percentage: 53,
    color: "#f59e0b",
    icon: TrendingUp,
    change: "-2.4%",
  },
  {
    name: "Customer Support Agent",
    tasks: "391 tasks",
    credits: "4,826",
    percentage: 47,
    color: "#ec4899",
    icon: Activity,
    change: "+7.3%",
  },
];

const RECENT_TRANSACTIONS = [
  {
    title: "Research Agent task execution",
    agent: "Research Agent",
    credits: "-245",
    time: "2 min ago",
    icon: Search,
    color: "#38bdf8",
    type: "usage",
  },
  {
    title: "Monthly credit allocation",
    agent: "System",
    credits: "+50,000",
    time: "Today, 09:00 AM",
    icon: Plus,
    color: "#22c55e",
    type: "credit",
  },
  {
    title: "Content generation task",
    agent: "Content Writer Agent",
    credits: "-184",
    time: "8 min ago",
    icon: Sparkles,
    color: "#8b5cf6",
    type: "usage",
  },
  {
    title: "Analytics processing",
    agent: "Data Analyst Agent",
    credits: "-326",
    time: "14 min ago",
    icon: ChartNoAxesCombined,
    color: "#f59e0b",
    type: "usage",
  },
  {
    title: "Marketing campaign analysis",
    agent: "Marketing Agent",
    credits: "-128",
    time: "21 min ago",
    icon: TrendingUp,
    color: "#ec4899",
    type: "usage",
  },
];

const USAGE_HISTORY = [
  { day: "Mon", value: "1,842", height: 42, color: "#38bdf8" },
  { day: "Tue", value: "2,164", height: 54, color: "#38bdf8" },
  { day: "Wed", value: "1,756", height: 39, color: "#38bdf8" },
  { day: "Thu", value: "2,489", height: 67, color: "#38bdf8" },
  { day: "Fri", value: "2,842", height: 82, color: "#8b5cf6" },
  { day: "Sat", value: "2,274", height: 61, color: "#38bdf8" },
  { day: "Sun", value: "2,612", height: 73, color: "#38bdf8" },
];

const SYSTEM_USAGE = [
  {
    label: "AI Processing",
    value: "62%",
    detail: "31,742 credits",
    color: "#38bdf8",
    data: [22, 35, 29, 48, 44, 56, 51, 62],
    icon: Cpu,
  },
  {
    label: "Data Processing",
    value: "24%",
    detail: "12,294 credits",
    color: "#8b5cf6",
    data: [10, 14, 18, 16, 20, 22, 21, 24],
    icon: Database,
  },
  {
    label: "API & Integrations",
    value: "14%",
    detail: "7,213 credits",
    color: "#22c55e",
    data: [8, 9, 12, 11, 13, 12, 15, 14],
    icon: Zap,
  },
];

const BUDGETS = [
  {
    name: "Monthly AI Budget",
    used: "$1,247.80",
    total: "$2,000",
    percent: 62,
    color: "#38bdf8",
  },
  {
    name: "Research Operations",
    used: "14,230",
    total: "20,000",
    percent: 71,
    color: "#8b5cf6",
  },
  {
    name: "Content Generation",
    used: "11,840",
    total: "15,000",
    percent: 79,
    color: "#f59e0b",
  },
];

export default function CreditsUsagePage() {
  return (
    <AppShell>
      <div className="cu-page">
        <style jsx>{`
          .cu-page {
            width: 100%;
            display: flex;
            flex-direction: column;
            gap: 20px;
            padding-bottom: 28px;
          }

          .cu-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 20px;
            margin-bottom: 2px;
          }

          .cu-eyebrow {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #fbbf24;
            font-size: 10px;
            font-weight: 800;
            letter-spacing: 0.13em;
            text-transform: uppercase;
            margin-bottom: 8px;
          }

          .cu-eyebrow-dot {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background: #fbbf24;
            box-shadow: 0 0 16px rgba(251, 191, 36, 0.8);
          }

          .cu-title {
            margin: 0;
            color: var(--dc-ink, #f8fafc);
            font-size: clamp(24px, 2.2vw, 34px);
            font-weight: 800;
            letter-spacing: -0.04em;
            line-height: 1.1;
          }

          .cu-subtitle {
            margin: 9px 0 0;
            color: var(--dc-ink-soft, #94a3b8);
            font-size: 13px;
            line-height: 1.65;
          }

          .cu-actions {
            display: flex;
            align-items: center;
            gap: 9px;
            flex-wrap: wrap;
          }

          .cu-btn {
            height: 38px;
            border-radius: 10px;
            padding: 0 13px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            font-size: 12px;
            font-weight: 700;
            cursor: pointer;
            transition: 0.2s ease;
            border: 1px solid rgba(148, 163, 184, 0.14);
            background: rgba(15, 23, 42, 0.45);
            color: var(--dc-ink, #f8fafc);
          }

          .cu-btn:hover {
            transform: translateY(-1px);
            border-color: rgba(56, 189, 248, 0.35);
            background: rgba(30, 41, 59, 0.8);
          }

          .cu-btn-primary {
            border-color: rgba(245, 158, 11, 0.35);
            color: #fff;
            background: linear-gradient(135deg, #d97706, #f59e0b);
            box-shadow: 0 8px 24px rgba(245, 158, 11, 0.18);
          }

          .cu-btn-primary:hover {
            background: linear-gradient(135deg, #f59e0b, #fbbf24);
          }

          .cu-stats {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 14px;
          }

          .cu-stat {
            position: relative;
            overflow: hidden;
            min-height: 142px;
            border: 1px solid rgba(148, 163, 184, 0.1);
            border-radius: 16px;
            padding: 17px;
            background:
              radial-gradient(circle at 100% 0%, rgba(255, 255, 255, 0.035), transparent 38%),
              rgba(15, 23, 42, 0.48);
            transition: transform 0.25s ease, border-color 0.25s ease;
          }

          .cu-stat:hover {
            transform: translateY(-3px);
            border-color: rgba(148, 163, 184, 0.22);
          }

          .cu-stat-glow {
            position: absolute;
            width: 110px;
            height: 110px;
            border-radius: 50%;
            right: -42px;
            top: -42px;
            opacity: 0.1;
            filter: blur(10px);
          }

          .cu-stat-head {
            position: relative;
            z-index: 1;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .cu-stat-label {
            color: var(--dc-ink-faint, #64748b);
            font-size: 10px;
            font-weight: 800;
            letter-spacing: 0.1em;
          }

          .cu-stat-icon {
            width: 32px;
            height: 32px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 1px solid rgba(255, 255, 255, 0.06);
          }

          .cu-stat-value {
            margin-top: 18px;
            font-size: 26px;
            line-height: 1;
            font-weight: 800;
            color: var(--dc-ink, #f8fafc);
            letter-spacing: -0.04em;
          }

          .cu-stat-foot {
            margin-top: 12px;
            display: flex;
            align-items: center;
            gap: 7px;
            font-size: 10.5px;
          }

          .cu-stat-sub {
            color: var(--dc-ink-soft, #94a3b8);
          }

          .cu-trend {
            display: inline-flex;
            align-items: center;
            gap: 2px;
            font-weight: 800;
          }

          .cu-layout-top {
            display: grid;
            grid-template-columns: 1.1fr 1.55fr 1fr;
            gap: 14px;
          }

          .cu-layout-mid {
            display: grid;
            grid-template-columns: 1.15fr 1fr;
            gap: 14px;
          }

          .cu-layout-bottom {
            display: grid;
            grid-template-columns: 1.35fr 1fr;
            gap: 14px;
          }

          .cu-card {
            position: relative;
            overflow: hidden;
            min-width: 0;
            border-radius: 16px;
            border: 1px solid rgba(148, 163, 184, 0.1);
            background:
              linear-gradient(180deg, rgba(30, 41, 59, 0.32), rgba(15, 23, 42, 0.38));
            box-shadow: 0 18px 50px rgba(0, 0, 0, 0.08);
          }

          .cu-card-head {
            min-height: 60px;
            padding: 0 18px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            border-bottom: 1px solid rgba(148, 163, 184, 0.08);
          }

          .cu-card-title-wrap {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }

          .cu-card-title {
            color: var(--dc-ink, #f8fafc);
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 0.09em;
          }

          .cu-card-description {
            color: var(--dc-ink-faint, #64748b);
            font-size: 10px;
          }

          .cu-select {
            height: 31px;
            border-radius: 8px;
            padding: 0 9px;
            font-size: 10px;
            color: var(--dc-ink-soft, #94a3b8);
            background: rgba(15, 23, 42, 0.55);
            border: 1px solid rgba(148, 163, 184, 0.12);
            outline: none;
          }

          .cu-donut-content {
            padding: 20px;
            display: flex;
            align-items: center;
            gap: 24px;
          }

          .cu-donut-wrap {
            width: 154px;
            height: 154px;
            flex: 0 0 auto;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .cu-donut-wrap :global(svg) {
            width: 154px !important;
            height: 154px !important;
          }

          .cu-donut-center {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            pointer-events: none;
          }

          .cu-donut-value {
            color: var(--dc-ink, #f8fafc);
            font-size: 21px;
            font-weight: 800;
            letter-spacing: -0.04em;
          }

          .cu-donut-label {
            margin-top: 3px;
            color: var(--dc-ink-faint, #64748b);
            font-size: 9px;
          }

          .cu-legend {
            width: 100%;
            display: flex;
            flex-direction: column;
            gap: 10px;
          }

          .cu-legend-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            font-size: 10.5px;
          }

          .cu-legend-left {
            display: flex;
            align-items: center;
            gap: 7px;
            color: var(--dc-ink-soft, #94a3b8);
          }

          .cu-swatch {
            width: 7px;
            height: 7px;
            border-radius: 50%;
          }

          .cu-legend-value {
            color: var(--dc-ink, #f8fafc);
            font-weight: 700;
          }

          .cu-chart-body {
            height: 226px;
            padding: 18px 18px 14px;
            display: flex;
            flex-direction: column;
          }

          .cu-chart-summary {
            display: flex;
            align-items: flex-end;
            justify-content: space-between;
            margin-bottom: 20px;
          }

          .cu-chart-value {
            font-size: 24px;
            font-weight: 800;
            color: var(--dc-ink, #f8fafc);
            letter-spacing: -0.04em;
          }

          .cu-chart-meta {
            margin-top: 4px;
            font-size: 10px;
            color: var(--dc-ink-faint, #64748b);
          }

          .cu-chart-change {
            display: flex;
            align-items: center;
            gap: 5px;
            color: #22c55e;
            font-size: 10px;
            font-weight: 800;
            padding-bottom: 2px;
          }

          .cu-bars {
            flex: 1;
            min-height: 0;
            display: flex;
            align-items: flex-end;
            justify-content: space-between;
            gap: 10px;
            padding-top: 6px;
          }

          .cu-bar-group {
            height: 100%;
            flex: 1;
            min-width: 0;
            display: flex;
            align-items: center;
            flex-direction: column;
            justify-content: flex-end;
            gap: 8px;
          }

          .cu-bar-track {
            height: 118px;
            width: 100%;
            display: flex;
            align-items: flex-end;
            justify-content: center;
          }

          .cu-bar {
            width: min(24px, 72%);
            border-radius: 7px 7px 3px 3px;
            opacity: 0.85;
            box-shadow: 0 0 18px rgba(56, 189, 248, 0.16);
            transition: 0.25s ease;
          }

          .cu-bar:hover {
            opacity: 1;
            transform: scaleY(1.03);
            transform-origin: bottom;
          }

          .cu-bar-day {
            color: var(--dc-ink-faint, #64748b);
            font-size: 9px;
          }

          .cu-balance-body {
            padding: 17px;
          }

          .cu-balance-main {
            position: relative;
            overflow: hidden;
            padding: 16px;
            border-radius: 13px;
            border: 1px solid rgba(245, 158, 11, 0.16);
            background:
              radial-gradient(circle at 100% 0%, rgba(245, 158, 11, 0.18), transparent 50%),
              rgba(245, 158, 11, 0.055);
          }

          .cu-balance-label {
            color: #fbbf24;
            font-size: 10px;
            font-weight: 800;
            letter-spacing: 0.08em;
          }

          .cu-balance-value {
            margin-top: 9px;
            font-size: 28px;
            font-weight: 800;
            letter-spacing: -0.04em;
            color: var(--dc-ink, #f8fafc);
          }

          .cu-balance-progress {
            margin-top: 14px;
            height: 6px;
            overflow: hidden;
            border-radius: 99px;
            background: rgba(148, 163, 184, 0.1);
          }

          .cu-balance-progress > span {
            display: block;
            width: 68%;
            height: 100%;
            border-radius: inherit;
            background: linear-gradient(90deg, #f59e0b, #fbbf24);
            box-shadow: 0 0 15px rgba(245, 158, 11, 0.5);
          }

          .cu-balance-meta {
            margin-top: 8px;
            display: flex;
            justify-content: space-between;
            font-size: 9.5px;
            color: var(--dc-ink-faint, #64748b);
          }

          .cu-balance-actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 9px;
            margin-top: 12px;
          }

          .cu-small-btn {
            height: 35px;
            border-radius: 9px;
            border: 1px solid rgba(148, 163, 184, 0.12);
            background: rgba(30, 41, 59, 0.42);
            color: var(--dc-ink-soft, #94a3b8);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            font-size: 10px;
            font-weight: 700;
            cursor: pointer;
            transition: 0.2s ease;
          }

          .cu-small-btn:hover {
            color: #fff;
            border-color: rgba(56, 189, 248, 0.3);
            background: rgba(30, 41, 59, 0.7);
          }

          .cu-agent-list {
            padding: 6px 16px 12px;
          }

          .cu-agent-row {
            padding: 13px 2px;
            display: flex;
            align-items: center;
            gap: 11px;
            border-bottom: 1px solid rgba(148, 163, 184, 0.07);
          }

          .cu-agent-row:last-child {
            border-bottom: none;
          }

          .cu-agent-icon {
            width: 34px;
            height: 34px;
            flex: 0 0 auto;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .cu-agent-main {
            flex: 1;
            min-width: 0;
          }

          .cu-agent-name {
            color: var(--dc-ink, #f8fafc);
            font-size: 11px;
            font-weight: 700;
          }

          .cu-agent-sub {
            margin-top: 4px;
            color: var(--dc-ink-faint, #64748b);
            font-size: 9.5px;
          }

          .cu-agent-right {
            width: 132px;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 7px;
          }

          .cu-agent-credits {
            display: flex;
            align-items: center;
            gap: 5px;
            color: var(--dc-ink, #f8fafc);
            font-size: 11px;
            font-weight: 800;
          }

          .cu-agent-change {
            font-size: 9px;
            font-weight: 700;
            color: #22c55e;
          }

          .cu-agent-progress {
            width: 100%;
            height: 4px;
            border-radius: 20px;
            overflow: hidden;
            background: rgba(148, 163, 184, 0.09);
          }

          .cu-agent-progress > span {
            height: 100%;
            display: block;
            border-radius: inherit;
          }

          .cu-transactions {
            padding: 7px 16px 13px;
          }

          .cu-transaction {
            min-height: 60px;
            display: flex;
            align-items: center;
            gap: 10px;
            border-bottom: 1px solid rgba(148, 163, 184, 0.07);
          }

          .cu-transaction:last-child {
            border-bottom: none;
          }

          .cu-transaction-icon {
            width: 32px;
            height: 32px;
            border-radius: 9px;
            flex: 0 0 auto;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .cu-transaction-main {
            min-width: 0;
            flex: 1;
          }

          .cu-transaction-title {
            font-size: 10.5px;
            font-weight: 700;
            color: var(--dc-ink, #f8fafc);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .cu-transaction-sub {
            margin-top: 4px;
            font-size: 9px;
            color: var(--dc-ink-faint, #64748b);
          }

          .cu-transaction-right {
            text-align: right;
            flex: 0 0 auto;
          }

          .cu-transaction-credit {
            font-size: 11px;
            font-weight: 800;
          }

          .cu-transaction-time {
            margin-top: 4px;
            font-size: 8.5px;
            color: var(--dc-ink-faint, #64748b);
          }

          .cu-system-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            padding: 16px;
            gap: 11px;
          }

          .cu-system-item {
            min-width: 0;
            padding: 14px;
            border-radius: 12px;
            border: 1px solid rgba(148, 163, 184, 0.08);
            background: rgba(15, 23, 42, 0.28);
          }

          .cu-system-head {
            display: flex;
            justify-content: space-between;
            gap: 8px;
            align-items: center;
          }

          .cu-system-icon {
            width: 29px;
            height: 29px;
            border-radius: 9px;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .cu-system-value {
            color: var(--dc-ink, #f8fafc);
            font-size: 19px;
            font-weight: 800;
          }

          .cu-system-label {
            margin-top: 13px;
            font-size: 10px;
            font-weight: 700;
            color: var(--dc-ink-soft, #94a3b8);
          }

          .cu-system-detail {
            margin-top: 4px;
            font-size: 9px;
            color: var(--dc-ink-faint, #64748b);
          }

          .cu-system-spark {
            height: 38px;
            margin-top: 10px;
          }

          .cu-budget-list {
            padding: 12px 17px 16px;
            display: flex;
            flex-direction: column;
            gap: 16px;
          }

          .cu-budget-row-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            font-size: 10.5px;
          }

          .cu-budget-name {
            color: var(--dc-ink-soft, #94a3b8);
            font-weight: 700;
          }

          .cu-budget-value {
            color: var(--dc-ink, #f8fafc);
            font-weight: 700;
          }

          .cu-budget-track {
            margin-top: 8px;
            height: 6px;
            overflow: hidden;
            border-radius: 99px;
            background: rgba(148, 163, 184, 0.1);
          }

          .cu-budget-fill {
            height: 100%;
            border-radius: inherit;
          }

          .cu-budget-foot {
            margin-top: 6px;
            display: flex;
            justify-content: space-between;
            font-size: 9px;
            color: var(--dc-ink-faint, #64748b);
          }

          .cu-view-all {
            border: 0;
            background: transparent;
            color: #38bdf8;
            font-size: 10px;
            font-weight: 700;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 4px;
          }

          .cu-alert {
            margin: 0 16px 16px;
            padding: 11px 12px;
            border-radius: 10px;
            display: flex;
            align-items: flex-start;
            gap: 9px;
            border: 1px solid rgba(245, 158, 11, 0.16);
            background: rgba(245, 158, 11, 0.055);
          }

          .cu-alert-title {
            color: #fbbf24;
            font-size: 10px;
            font-weight: 800;
          }

          .cu-alert-text {
            margin-top: 3px;
            color: var(--dc-ink-soft, #94a3b8);
            font-size: 9px;
            line-height: 1.5;
          }

          @media (max-width: 1250px) {
            .cu-layout-top {
              grid-template-columns: 1fr 1fr;
            }

            .cu-layout-top > :last-child {
              grid-column: span 2;
            }
          }

          @media (max-width: 1000px) {
            .cu-stats {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .cu-layout-mid,
            .cu-layout-bottom {
              grid-template-columns: 1fr;
            }

            .cu-layout-top {
              grid-template-columns: 1fr;
            }

            .cu-layout-top > :last-child {
              grid-column: auto;
            }
          }

          @media (max-width: 700px) {
            .cu-header {
              flex-direction: column;
            }

            .cu-actions {
              width: 100%;
            }

            .cu-actions .cu-btn {
              flex: 1;
            }

            .cu-stats {
              grid-template-columns: 1fr;
            }

            .cu-donut-content {
              flex-direction: column;
            }

            .cu-system-grid {
              grid-template-columns: 1fr;
            }

            .cu-agent-right {
              width: 92px;
            }
          }
        `}</style>

        <header className="cu-header">
          <div>
            <div className="cu-eyebrow">
              <span className="cu-eyebrow-dot" />
              Credit Intelligence
            </div>

            <h1 className="cu-title">Credits Usage</h1>

            <p className="cu-subtitle">
              Monitor every credit consumed across your AI infrastructure, agents,
              workflows and automated operations.
            </p>
          </div>

          <div className="cu-actions">
            <button type="button" className="cu-btn">
              <CalendarDays size={15} />
              Last 30 Days
            </button>

            <button type="button" className="cu-btn">
              <Download size={15} />
              Export
            </button>

            <button type="button" className="cu-btn cu-btn-primary">
              <Plus size={15} />
              Add Credits
            </button>
          </div>
        </header>

        <section className="cu-stats">
          {CREDIT_STATS.map((stat) => {
            const Icon = stat.icon;
            const TrendIcon =
              stat.trendType === "down" ? ArrowDownRight : ArrowUpRight;

            return (
              <div className="cu-stat" key={stat.label}>
                <div
                  className="cu-stat-glow"
                  style={{ background: stat.color }}
                />

                <div className="cu-stat-head">
                  <span className="cu-stat-label">{stat.label}</span>

                  <span
                    className="cu-stat-icon"
                    style={{ background: `${stat.color}18` }}
                  >
                    <Icon size={16} color={stat.color} />
                  </span>
                </div>

                <div className="cu-stat-value">{stat.value}</div>

                <div className="cu-stat-foot">
                  <span
                    className="cu-trend"
                    style={{
                      color:
                        stat.trendType === "down" ? "#22c55e" : stat.color,
                    }}
                  >
                    <TrendIcon size={11} />
                    {stat.trend}
                  </span>

                  <span className="cu-stat-sub">{stat.sub}</span>
                </div>
              </div>
            );
          })}
        </section>

        <section className="cu-layout-top">
          <div className="cu-card">
            <div className="cu-card-head">
              <div className="cu-card-title-wrap">
                <span className="cu-card-title">CREDIT DISTRIBUTION</span>
                <span className="cu-card-description">
                  Usage by operation category
                </span>
              </div>

              <button type="button" className="cu-view-all">
                Details <ChevronRight size={13} />
              </button>
            </div>

            <div className="cu-donut-content">
              <div className="cu-donut-wrap">
                <Donut data={CREDIT_DISTRIBUTION} />

                <div className="cu-donut-center">
                  <span className="cu-donut-value">47.2K</span>
                  <span className="cu-donut-label">Credits Used</span>
                </div>
              </div>

              <div className="cu-legend">
                {CREDIT_DISTRIBUTION.map((item) => (
                  <div className="cu-legend-row" key={item.label}>
                    <div className="cu-legend-left">
                      <span
                        className="cu-swatch"
                        style={{ background: item.color }}
                      />
                      {item.label}
                    </div>

                    <span className="cu-legend-value">
                      {(item.value / 1000).toFixed(1)}K
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="cu-card">
            <div className="cu-card-head">
              <div className="cu-card-title-wrap">
                <span className="cu-card-title">CREDIT CONSUMPTION</span>
                <span className="cu-card-description">
                  Daily credit usage trend
                </span>
              </div>

              <select className="cu-select" defaultValue="week">
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
                <option value="quarter">Last 90 Days</option>
              </select>
            </div>

            <div className="cu-chart-body">
              <div className="cu-chart-summary">
                <div>
                  <div className="cu-chart-value">16,979</div>
                  <div className="cu-chart-meta">
                    Total credits consumed this week
                  </div>
                </div>

                <div className="cu-chart-change">
                  <TrendingUp size={13} />
                  +11.8%
                </div>
              </div>

              <div className="cu-bars">
                {USAGE_HISTORY.map((item, index) => (
                  <div className="cu-bar-group" key={item.day}>
                    <div className="cu-bar-track">
                      <div
                        className="cu-bar"
                        title={`${item.day}: ${item.value}`}
                        style={{
                          height: `${item.height}%`,
                          background:
                            index === 4
                              ? "linear-gradient(180deg, #a855f7, #7c3aed)"
                              : "linear-gradient(180deg, #38bdf8, #0284c7)",
                        }}
                      />
                    </div>

                    <span className="cu-bar-day">{item.day}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="cu-card">
            <div className="cu-card-head">
              <div className="cu-card-title-wrap">
                <span className="cu-card-title">CREDIT BALANCE</span>
                <span className="cu-card-description">
                  Current account availability
                </span>
              </div>

              <WalletCards size={16} color="#f59e0b" />
            </div>

            <div className="cu-balance-body">
              <div className="cu-balance-main">
                <div className="cu-balance-label">AVAILABLE BALANCE</div>

                <div className="cu-balance-value">48,750</div>

                <div className="cu-balance-progress">
                  <span />
                </div>

                <div className="cu-balance-meta">
                  <span>68.3% remaining</span>
                  <span>100,000 monthly</span>
                </div>
              </div>

              <div className="cu-balance-actions">
                <button type="button" className="cu-small-btn">
                  <CreditCard size={14} />
                  Purchase
                </button>

                <button type="button" className="cu-small-btn">
                  <ReceiptText size={14} />
                  Billing
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="cu-layout-mid">
          <div className="cu-card">
            <div className="cu-card-head">
              <div className="cu-card-title-wrap">
                <span className="cu-card-title">TOP CREDIT CONSUMERS</span>
                <span className="cu-card-description">
                  Agents ranked by total credit usage
                </span>
              </div>

              <button type="button" className="cu-view-all">
                View All <ChevronRight size={13} />
              </button>
            </div>

            <div className="cu-agent-list">
              {AGENT_USAGE.map((agent) => {
                const Icon = agent.icon;

                return (
                  <div className="cu-agent-row" key={agent.name}>
                    <span
                      className="cu-agent-icon"
                      style={{
                        background: `${agent.color}18`,
                        color: agent.color,
                      }}
                    >
                      <Icon size={16} />
                    </span>

                    <div className="cu-agent-main">
                      <div className="cu-agent-name">{agent.name}</div>

                      <div className="cu-agent-sub">{agent.tasks}</div>
                    </div>

                    <div className="cu-agent-right">
                      <div className="cu-agent-credits">
                        <Coins size={12} color={agent.color} />
                        {agent.credits}

                        <span
                          className="cu-agent-change"
                          style={{
                            color: agent.change.startsWith("-")
                              ? "#22c55e"
                              : "#f59e0b",
                          }}
                        >
                          {agent.change}
                        </span>
                      </div>

                      <div className="cu-agent-progress">
                        <span
                          style={{
                            width: `${agent.percentage}%`,
                            background: agent.color,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="cu-card">
            <div className="cu-card-head">
              <div className="cu-card-title-wrap">
                <span className="cu-card-title">RECENT TRANSACTIONS</span>
                <span className="cu-card-description">
                  Latest credit activity
                </span>
              </div>

              <button type="button" className="cu-view-all">
                <Filter size={12} />
                Filter
              </button>
            </div>

            <div className="cu-transactions">
              {RECENT_TRANSACTIONS.map((transaction) => {
                const Icon = transaction.icon;
                const positive = transaction.type === "credit";

                return (
                  <div
                    className="cu-transaction"
                    key={`${transaction.title}-${transaction.time}`}
                  >
                    <span
                      className="cu-transaction-icon"
                      style={{
                        background: `${transaction.color}18`,
                        color: transaction.color,
                      }}
                    >
                      <Icon size={15} />
                    </span>

                    <div className="cu-transaction-main">
                      <div className="cu-transaction-title">
                        {transaction.title}
                      </div>

                      <div className="cu-transaction-sub">
                        {transaction.agent}
                      </div>
                    </div>

                    <div className="cu-transaction-right">
                      <div
                        className="cu-transaction-credit"
                        style={{
                          color: positive ? "#22c55e" : "#f87171",
                        }}
                      >
                        {transaction.credits}
                      </div>

                      <div className="cu-transaction-time">
                        {transaction.time}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="cu-layout-bottom">
          <div className="cu-card">
            <div className="cu-card-head">
              <div className="cu-card-title-wrap">
                <span className="cu-card-title">SYSTEM CREDIT ALLOCATION</span>
                <span className="cu-card-description">
                  Where your AI infrastructure consumes resources
                </span>
              </div>

              <Activity size={16} color="#38bdf8" />
            </div>

            <div className="cu-system-grid">
              {SYSTEM_USAGE.map((system) => {
                const Icon = system.icon;

                return (
                  <div className="cu-system-item" key={system.label}>
                    <div className="cu-system-head">
                      <span
                        className="cu-system-icon"
                        style={{
                          background: `${system.color}18`,
                          color: system.color,
                        }}
                      >
                        <Icon size={14} />
                      </span>

                      <span
                        className="cu-system-value"
                        style={{ color: system.color }}
                      >
                        {system.value}
                      </span>
                    </div>

                    <div className="cu-system-label">{system.label}</div>

                    <div className="cu-system-detail">{system.detail}</div>

                    <div className="cu-system-spark">
                      <Sparkline data={system.data} color={system.color} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="cu-card">
            <div className="cu-card-head">
              <div className="cu-card-title-wrap">
                <span className="cu-card-title">BUDGET & LIMITS</span>
                <span className="cu-card-description">
                  Current spending thresholds
                </span>
              </div>

              <button type="button" className="cu-view-all">
                Manage <ChevronRight size={13} />
              </button>
            </div>

            <div className="cu-budget-list">
              {BUDGETS.map((budget) => (
                <div key={budget.name}>
                  <div className="cu-budget-row-head">
                    <span className="cu-budget-name">{budget.name}</span>

                    <span className="cu-budget-value">
                      {budget.used} / {budget.total}
                    </span>
                  </div>

                  <div className="cu-budget-track">
                    <div
                      className="cu-budget-fill"
                      style={{
                        width: `${budget.percent}%`,
                        background: budget.color,
                      }}
                    />
                  </div>

                  <div className="cu-budget-foot">
                    <span>{budget.percent}% consumed</span>
                    <span>{100 - budget.percent}% remaining</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="cu-alert">
              <CircleAlert size={15} color="#f59e0b" />

              <div>
                <div className="cu-alert-title">
                  Content Generation nearing budget limit
                </div>

                <div className="cu-alert-text">
                  You have consumed 79% of the allocated monthly credits.
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}