"use client";

import { useState } from "react";
import {
  Coins,
  Zap,
  CircleDollarSign,
  Download,
  CalendarDays,
  Activity,
  Cpu,
  Database,
  CircleAlert,
  CheckCircle2,
  WalletCards,
  TriangleAlert,
} from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { Donut, Sparkline } from "@/components/dashboard/charts";
import { Svg } from "@/components/agents/rich";
import { Icons } from "@/components/agents/icons";
import { PLATFORMS } from "@/lib/platforms";
import { useCreditUsageSnapshot, usd, count, ago, type CreditAgentRow } from "@/lib/credit-usage-data";

/** The six-colour palette this app's donut/legend pairs use everywhere spend
 * is folded into "top N + Other" — never extended past six slices. */
const PALETTE = ["#38bdf8", "#8b5cf6", "#22c55e", "#f59e0b", "#ec4899", "#64748b"];

const PLATFORM_COLORS: Record<"ghrfix" | "shadilife", string> = {
  ghrfix: PLATFORMS.ghrfix.color,
  shadilife: PLATFORMS.shadilife.color,
};

/** A genuine client-side export of the data already on screen — not a fake
 * button, since no purchase/export endpoint exists on either backend to wire
 * a real one to. */
function exportCsv(rows: CreditAgentRow[]) {
  const header = ["Platform", "Agent", "Category", "Calls This Month", "Calls Today", "Spend USD This Month", "Reported"];
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = rows.map((r) =>
    [
      r.platformLabel,
      r.name,
      r.tag,
      r.calls === null ? "" : String(r.calls),
      r.callsToday === null ? "" : String(r.callsToday),
      r.spendUsd === null ? "" : r.spendUsd.toFixed(4),
      r.reported ? "yes" : "no",
    ]
      .map((v) => escape(String(v)))
      .join(","),
  );
  const csv = [header.map(escape).join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `credit-usage-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function CreditsUsagePage() {
  const [days, setDays] = useState(7);
  const snapshot = useCreditUsageSnapshot(days);

  const bothFailed = Boolean(snapshot.ghrfixError && snapshot.shadilifeError);
  const oneFailed = !bothFailed && Boolean(snapshot.ghrfixError || snapshot.shadilifeError);
  const allReportedBudget = snapshot.platforms.length > 0 && snapshot.platforms.every((p) => p.pctUsed !== null);

  const stats = [
    {
      label: "COMBINED SPEND (MONTH)",
      value: snapshot.loading ? "—" : usd(snapshot.totalSpendUsd),
      sub: snapshot.loading ? "Loading…" : `${snapshot.reportedCount} of ${snapshot.registryCount} agents reporting`,
      icon: CircleDollarSign,
      color: "#22c55e",
    },
    {
      label: "COMBINED BUDGET",
      value: snapshot.loading ? "—" : usd(snapshot.totalBudgetUsd, 0),
      sub: snapshot.loading ? "Loading…" : snapshot.budgetUsedPct === null ? "No budget published" : `${snapshot.budgetUsedPct}% used across both platforms`,
      icon: WalletCards,
      color: "#f59e0b",
    },
    {
      label: "REMAINING BUDGET",
      value: snapshot.loading ? "—" : snapshot.totalRemainingUsd === null ? "—" : usd(snapshot.totalRemainingUsd),
      sub: snapshot.loading ? "Loading…" : snapshot.budgetUsedPct === null ? "Needs a published budget" : `${Math.max(0, Math.round((100 - snapshot.budgetUsedPct) * 10) / 10)}% left this month`,
      icon: Coins,
      color: "#38bdf8",
    },
    {
      label: "CALLS THIS MONTH",
      value: snapshot.loading ? "—" : count(snapshot.totalCallsThisMonth),
      sub: snapshot.loading ? "Loading…" : snapshot.avgCostPerCallUsd === null ? "No calls recorded yet" : `${usd(snapshot.avgCostPerCallUsd, 4)} average per call`,
      icon: Zap,
      color: "#8b5cf6",
    },
  ];

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

          .cu-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
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
            min-height: 154px;
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
            flex: 0 0 auto;
          }

          .cu-legend-value {
            color: var(--dc-ink, #f8fafc);
            font-weight: 700;
          }

          .cu-chart-body {
            min-height: 226px;
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

          .cu-bars {
            flex: 1;
            min-height: 0;
            display: flex;
            align-items: flex-end;
            justify-content: space-between;
            gap: 6px;
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
            white-space: nowrap;
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
            font-size: 26px;
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
            width: 0%;
            height: 100%;
            border-radius: inherit;
            background: linear-gradient(90deg, #f59e0b, #fbbf24);
            box-shadow: 0 0 15px rgba(245, 158, 11, 0.5);
            transition: width 0.4s ease;
          }

          .cu-balance-meta {
            margin-top: 8px;
            display: flex;
            justify-content: space-between;
            font-size: 9.5px;
            color: var(--dc-ink-faint, #64748b);
          }

          .cu-balance-facts {
            display: flex;
            flex-direction: column;
            gap: 9px;
            margin-top: 14px;
          }

          .cu-balance-fact-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            font-size: 10.5px;
            padding: 9px 11px;
            border-radius: 9px;
            background: rgba(148, 163, 184, 0.06);
            color: var(--dc-ink-soft, #94a3b8);
          }

          .cu-balance-fact-row b {
            color: var(--dc-ink, #f8fafc);
            font-weight: 700;
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

          .cu-platform-tag {
            font-weight: 800;
          }

          .cu-transaction-right {
            text-align: right;
            flex: 0 0 auto;
          }

          .cu-transaction-credit {
            font-size: 11px;
            font-weight: 800;
            white-space: nowrap;
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
            display: flex;
            align-items: center;
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
            transition: width 0.4s ease;
          }

          .cu-budget-foot {
            margin-top: 6px;
            display: flex;
            justify-content: space-between;
            font-size: 9px;
            color: var(--dc-ink-faint, #64748b);
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

          .cu-empty {
            width: 100%;
            padding: 20px 4px;
            text-align: center;
            color: var(--dc-ink-faint, #64748b);
            font-size: 11px;
            line-height: 1.6;
          }

          .cu-muted-note {
            margin: 10px 0 0;
            font-size: 9.5px;
            line-height: 1.6;
            color: var(--dc-ink-faint, #64748b);
          }

          .cu-warn-banner {
            display: flex;
            align-items: center;
            gap: 9px;
            padding: 11px 16px;
            border-radius: 12px;
            border: 1px solid rgba(245, 158, 11, 0.2);
            background: rgba(245, 158, 11, 0.07);
            color: #fbbf24;
            font-size: 11.5px;
            font-weight: 600;
          }

          .cu-error-panel {
            padding: 20px;
            display: flex;
            gap: 12px;
            align-items: flex-start;
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
              Real AI spend and call volume across both platforms — GhrFix and ShadiLife — pulled live from each
              backend&apos;s own usage log. Nothing below is estimated.
            </p>
          </div>

          <div className="cu-actions">
            <div className="cu-btn" style={{ cursor: "default" }}>
              <CalendarDays size={15} />
              Month to date
            </div>

            <button
              type="button"
              className="cu-btn"
              disabled={snapshot.loading || snapshot.reportedRows.length === 0}
              onClick={() => exportCsv(snapshot.rows)}
            >
              <Download size={15} />
              Export CSV
            </button>
          </div>
        </header>

        {bothFailed && (
          <div className="cu-card cu-error-panel">
            <TriangleAlert size={18} color="#f87171" style={{ flex: "0 0 auto", marginTop: 2 }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 12.5, color: "#f87171" }}>Neither platform responded</div>
              <p style={{ margin: "6px 0 0", fontSize: 11.5, color: "var(--dc-ink-soft)", lineHeight: 1.6 }}>
                GhrFix: {snapshot.ghrfixError}
                <br />
                ShadiLife: {snapshot.shadilifeError}
              </p>
              <p style={{ margin: "8px 0 0", fontSize: 11, color: "var(--dc-ink-faint)" }}>
                Make sure both backends are running and that this browser is signed in on the{" "}
                <a href="/connect" style={{ color: "#38bdf8", fontWeight: 700 }}>Connect</a> page.
              </p>
            </div>
          </div>
        )}

        {oneFailed && (
          <div className="cu-warn-banner">
            <TriangleAlert size={14} />
            {snapshot.ghrfixError ? `GhrFix: ${snapshot.ghrfixError}` : `ShadiLife: ${snapshot.shadilifeError}`} — every figure below reflects the other platform only until this is reconnected.
          </div>
        )}

        <section className="cu-stats">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div className="cu-stat" key={stat.label}>
                <div className="cu-stat-glow" style={{ background: stat.color }} />

                <div className="cu-stat-head">
                  <span className="cu-stat-label">{stat.label}</span>

                  <span className="cu-stat-icon" style={{ background: `${stat.color}18` }}>
                    <Icon size={16} color={stat.color} />
                  </span>
                </div>

                <div className="cu-stat-value">{stat.value}</div>

                <div className="cu-stat-foot">
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
                <span className="cu-card-description">Combined spend by agent category</span>
              </div>
            </div>

            <div className="cu-donut-content">
              {snapshot.loading ? (
                <div className="cu-empty">Loading…</div>
              ) : snapshot.spendByTag.length === 0 ? (
                <div className="cu-empty">No agent on either platform has recorded spend yet this month.</div>
              ) : (
                <>
                  <div className="cu-donut-wrap">
                    <Donut data={snapshot.spendByTag.map((s, i) => ({ label: s.label, value: s.value, color: PALETTE[i % PALETTE.length] }))} />
                    <div className="cu-donut-center">
                      <span className="cu-donut-value">{usd(snapshot.totalSpendUsd, 0)}</span>
                      <span className="cu-donut-label">Spend (Month)</span>
                    </div>
                  </div>

                  <div className="cu-legend">
                    {snapshot.spendByTag.map((item, i) => (
                      <div className="cu-legend-row" key={item.label}>
                        <div className="cu-legend-left">
                          <span className="cu-swatch" style={{ background: PALETTE[i % PALETTE.length] }} />
                          {item.label}
                        </div>
                        <span className="cu-legend-value">{usd(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="cu-card">
            <div className="cu-card-head">
              <div className="cu-card-title-wrap">
                <span className="cu-card-title">CREDIT CONSUMPTION</span>
                <span className="cu-card-description">Real daily spend — GhrFix fleet</span>
              </div>

              <select className="cu-select" value={days} onChange={(e) => setDays(Number(e.target.value))}>
                <option value={7}>Last 7 Days</option>
                <option value={30}>Last 30 Days</option>
                <option value={60}>Last 60 Days</option>
              </select>
            </div>

            <div className="cu-chart-body">
              {snapshot.loading ? (
                <div className="cu-empty">Loading…</div>
              ) : !snapshot.dailyTrend ? (
                <div className="cu-empty">{snapshot.dailyTrendNote}</div>
              ) : (
                <>
                  <div className="cu-chart-summary">
                    <div>
                      <div className="cu-chart-value">{usd(snapshot.dailyTrend.costUsd.reduce((a, b) => a + b, 0))}</div>
                      <div className="cu-chart-meta">
                        GhrFix spend, last {days} days · {count(snapshot.dailyTrend.calls.reduce((a, b) => a + b, 0))} calls
                      </div>
                    </div>
                  </div>

                  <div className="cu-bars">
                    {snapshot.dailyTrend.labels.map((label, i) => {
                      const value = snapshot.dailyTrend!.costUsd[i];
                      const max = Math.max(...snapshot.dailyTrend!.costUsd, 0.0001);
                      const heightPct = Math.max(2, Math.round((value / max) * 100));
                      return (
                        <div className="cu-bar-group" key={`${label}-${i}`}>
                          <div className="cu-bar-track">
                            <div
                              className="cu-bar"
                              title={`${label}: ${usd(value, 4)} · ${count(snapshot.dailyTrend!.calls[i])} calls`}
                              style={{ height: `${heightPct}%`, background: "linear-gradient(180deg, #38bdf8, #0284c7)" }}
                            />
                          </div>
                          {days <= 14 && <span className="cu-bar-day">{label}</span>}
                        </div>
                      );
                    })}
                  </div>

                  <p className="cu-muted-note">{snapshot.dailyTrendNote}</p>
                </>
              )}
            </div>
          </div>

          <div className="cu-card">
            <div className="cu-card-head">
              <div className="cu-card-title-wrap">
                <span className="cu-card-title">CREDIT BALANCE</span>
                <span className="cu-card-description">Combined budget across both platforms</span>
              </div>

              <WalletCards size={16} color="#f59e0b" />
            </div>

            <div className="cu-balance-body">
              <div className="cu-balance-main">
                <div className="cu-balance-label">REMAINING BUDGET</div>

                <div className="cu-balance-value">
                  {snapshot.loading ? "—" : snapshot.totalRemainingUsd === null ? "Not available" : usd(snapshot.totalRemainingUsd)}
                </div>

                <div className="cu-balance-progress">
                  <span style={{ width: `${Math.min(100, snapshot.budgetUsedPct ?? 0)}%` }} />
                </div>

                <div className="cu-balance-meta">
                  <span>{snapshot.budgetUsedPct === null ? "No budget published" : `${snapshot.budgetUsedPct}% used`}</span>
                  <span>{snapshot.totalBudgetUsd === null ? "—" : `${usd(snapshot.totalBudgetUsd, 0)} monthly`}</span>
                </div>
              </div>

              <div className="cu-balance-facts">
                {snapshot.platforms.map((p) => (
                  <div className="cu-balance-fact-row" key={p.platformKey}>
                    <span>{p.label}</span>
                    <b>{p.error ? "Unavailable" : p.budgetUsd === null ? "No budget set" : `${usd(p.spentUsd)} / ${usd(p.budgetUsd, 0)}`}</b>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="cu-layout-mid">
          <div className="cu-card">
            <div className="cu-card-head">
              <div className="cu-card-title-wrap">
                <span className="cu-card-title">TOP CREDIT CONSUMERS</span>
                <span className="cu-card-description">Agents ranked by real spend this month, both platforms</span>
              </div>
            </div>

            <div className="cu-agent-list">
              {snapshot.loading ? (
                <div className="cu-empty">Loading…</div>
              ) : snapshot.topAgents.length === 0 ? (
                <div className="cu-empty">No agent on either platform has recorded spend yet this month.</div>
              ) : (
                snapshot.topAgents.map((agent) => {
                  const maxSpend = snapshot.topAgents[0]?.spendUsd ?? 0;
                  const pct = maxSpend > 0 ? Math.round(((agent.spendUsd ?? 0) / maxSpend) * 100) : 0;

                  return (
                    <div className="cu-agent-row" key={`${agent.platformKey}-${agent.key}`}>
                      <span className="cu-agent-icon" style={{ background: `${agent.accent}18`, color: agent.accent }}>
                        <Svg path={Icons[agent.icon]} size={16} />
                      </span>

                      <div className="cu-agent-main">
                        <div className="cu-agent-name">{agent.fullName}</div>
                        <div className="cu-agent-sub">
                          {count(agent.calls)} calls this month
                          {agent.callsToday !== null ? ` · ${count(agent.callsToday)} today` : ""}
                        </div>
                      </div>

                      <div className="cu-agent-right">
                        <div className="cu-agent-credits">
                          <Coins size={12} color={agent.accent} />
                          {usd(agent.spendUsd)}
                        </div>

                        <div className="cu-agent-progress">
                          <span style={{ width: `${pct}%`, background: agent.accent }} />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {!snapshot.loading && snapshot.unreportedCount > 0 && (
              <p className="cu-muted-note" style={{ padding: "0 16px 14px" }}>
                {snapshot.unreportedCount} of {snapshot.registryCount} registered agents did not report this month and are excluded from this ranking.
              </p>
            )}
          </div>

          <div className="cu-card">
            <div className="cu-card-head">
              <div className="cu-card-title-wrap">
                <span className="cu-card-title">RECENT TRANSACTIONS</span>
                <span className="cu-card-description">Real AI calls, suggestions and agent actions</span>
              </div>
            </div>

            <div className="cu-transactions">
              {snapshot.loading ? (
                <div className="cu-empty">Loading…</div>
              ) : snapshot.transactions.length === 0 ? (
                <div className="cu-empty">No recent AI activity recorded on either platform.</div>
              ) : (
                snapshot.transactions.map((tx) => (
                  <div className="cu-transaction" key={tx.id}>
                    <span className="cu-transaction-icon" style={{ background: `${tx.accent}18`, color: tx.accent }}>
                      <Activity size={15} />
                    </span>

                    <div className="cu-transaction-main">
                      <div className="cu-transaction-title">{tx.title}</div>
                      <div className="cu-transaction-sub">
                        <span className="cu-platform-tag" style={{ color: PLATFORM_COLORS[tx.platformKey] }}>
                          {tx.platformLabel}
                        </span>
                        {" · "}
                        {tx.agentName}
                      </div>
                    </div>

                    <div className="cu-transaction-right">
                      <div className="cu-transaction-credit" style={{ color: tx.costUsd === null ? "var(--dc-ink-faint, #64748b)" : "#f87171" }}>
                        {tx.costUsd === null ? "Not tracked" : `-${usd(tx.costUsd, 4)}`}
                      </div>
                      <div className="cu-transaction-time">{ago(tx.createdAt)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="cu-layout-bottom">
          <div className="cu-card">
            <div className="cu-card-head">
              <div className="cu-card-title-wrap">
                <span className="cu-card-title">SYSTEM CREDIT ALLOCATION</span>
                <span className="cu-card-description">Real spend by platform, this month</span>
              </div>

              <Activity size={16} color="#38bdf8" />
            </div>

            <div className="cu-system-grid">
              {snapshot.platforms.map((p) => (
                <div className="cu-system-item" key={p.platformKey}>
                  <div className="cu-system-head">
                    <span className="cu-system-icon" style={{ background: `${PLATFORM_COLORS[p.platformKey]}18`, color: PLATFORM_COLORS[p.platformKey] }}>
                      {p.platformKey === "ghrfix" ? <Cpu size={14} /> : <Database size={14} />}
                    </span>
                    <span className="cu-system-value" style={{ color: PLATFORM_COLORS[p.platformKey] }}>
                      {snapshot.loading ? "—" : p.error ? "—" : usd(p.spentUsd)}
                    </span>
                  </div>

                  <div className="cu-system-label">{p.label}</div>

                  <div className="cu-system-detail">
                    {snapshot.loading ? "Loading…" : p.error ? p.error : `${count(p.callsThisMonth)} calls · ${p.model ?? "model not reported"}`}
                  </div>

                  <div className="cu-system-spark">
                    {p.platformKey === "ghrfix" && snapshot.dailyTrend && snapshot.dailyTrend.costUsd.length > 1 ? (
                      <Sparkline data={snapshot.dailyTrend.costUsd} color={PLATFORM_COLORS.ghrfix} />
                    ) : (
                      <span className="cu-muted-note" style={{ margin: 0 }}>
                        {p.platformKey === "ghrfix" ? "No daily data yet" : "Day-level spend not tracked"}
                      </span>
                    )}
                  </div>
                </div>
              ))}

              <div className="cu-system-item">
                <div className="cu-system-head">
                  <span className="cu-system-icon" style={{ background: "#8b5cf618", color: "#8b5cf6" }}>
                    <CheckCircle2 size={14} />
                  </span>
                  <span className="cu-system-value" style={{ color: "#8b5cf6" }}>
                    {snapshot.loading ? "—" : `${snapshot.reportedCount}/${snapshot.registryCount}`}
                  </span>
                </div>

                <div className="cu-system-label">Reporting Coverage</div>

                <div className="cu-system-detail">
                  {snapshot.loading
                    ? "Loading…"
                    : snapshot.unreportedCount > 0
                      ? `${snapshot.unreportedCount} registered agents did not respond`
                      : "Every registered agent responded"}
                </div>
              </div>
            </div>
          </div>

          <div className="cu-card">
            <div className="cu-card-head">
              <div className="cu-card-title-wrap">
                <span className="cu-card-title">BUDGET & LIMITS</span>
                <span className="cu-card-description">Real monthly AI budget, per platform</span>
              </div>
            </div>

            <div className="cu-budget-list">
              {snapshot.platforms.map((p) => {
                const pct = p.pctUsed ?? 0;
                const barColor = PLATFORM_COLORS[p.platformKey];
                return (
                  <div key={p.platformKey}>
                    <div className="cu-budget-row-head">
                      <span className="cu-budget-name">{p.label} Monthly AI Budget</span>
                      <span className="cu-budget-value">
                        {p.error ? "Unavailable" : p.budgetUsd === null ? "Not published" : `${usd(p.spentUsd)} / ${usd(p.budgetUsd, 0)}`}
                      </span>
                    </div>

                    <div className="cu-budget-track">
                      <div className="cu-budget-fill" style={{ width: p.pctUsed === null ? "0%" : `${Math.min(100, pct)}%`, background: barColor }} />
                    </div>

                    <div className="cu-budget-foot">
                      <span>{p.pctUsed === null ? "No usage data" : `${pct}% consumed`}</span>
                      <span>{p.pctUsed === null ? "—" : `${Math.max(0, Math.round((100 - pct) * 10) / 10)}% remaining`}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {!snapshot.loading &&
              (snapshot.alerts.length > 0 ? (
                snapshot.alerts.map((a) => (
                  <div className="cu-alert" key={a.platformLabel}>
                    <CircleAlert size={15} color="#f59e0b" />
                    <div>
                      <div className="cu-alert-title">{a.platformLabel} is nearing its budget limit</div>
                      <div className="cu-alert-text">
                        {a.platformLabel} has used {a.pctUsed}% of its {usd(a.budgetUsd, 0)} monthly AI budget ({usd(a.spentUsd)} spent so far).
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="cu-alert" style={{ borderColor: "rgba(34,197,94,0.16)", background: "rgba(34,197,94,0.055)" }}>
                  <CheckCircle2 size={15} color="#22c55e" />
                  <div>
                    <div className="cu-alert-title" style={{ color: "#4ade80" }}>
                      {allReportedBudget ? "Both platforms are within budget" : "No known budget overrun"}
                    </div>
                    <div className="cu-alert-text">
                      {allReportedBudget
                        ? "Neither GhrFix nor ShadiLife has crossed 70% of its published monthly AI budget."
                        : "No platform has crossed 70% of its published monthly AI budget, though at least one platform's budget figure is currently unavailable."}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
