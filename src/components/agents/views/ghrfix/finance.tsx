"use client";

/**
 * GhrFix — Finance Agent.
 *
 * `/summary` gives the real wallet totals, booking settlement figures and the
 * live economy settings row. `/trend` is 30 real daily WalletLedger credit
 * totals, and `/forecast` is a real least-squares regression over that same
 * trend — never a guessed growth curve. The confidence figure only appears
 * once the owner supplies a real target to compare against.
 */

import { useMemo } from "react";
import Link from "next/link";
import { AgentSidePanel, AreaChart, BarList, DonutChart, InsightsPanel, MetricCard, Svg } from "@/components/agents/rich";
import { RadialGauge } from "@/components/agents/charts";
import { Icons } from "@/components/agents/icons";
import type { AgentStats } from "@/lib/api";
import type { AgentViewProps } from "../registry";
import { AskAnswer, Empty, ErrorNote, KeyRow, Panel, coins, halfOverHalf, num, pkr, share, shortDate, useAsk, useLoad } from "./_kit-core";

interface WalletTotals {
  acceptFeesCollected: number;
  topUpsApproved: number;
  refunds: number;
  totalCredits: number;
  totalDebits: number;
  totalTransactions: number;
}

interface EconomySettings {
  id: number;
  signupTokenGrant: string;
  acceptFeeTokens: string;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  bankName: string | null;
  updatedAt: string;
}

interface Summary {
  walletTotals: WalletTotals;
  bookings: { total: number; completed: number; active: number; cashSettledPKR: number; tokensCirculatedInBookings: number };
  economy: EconomySettings;
}

type TrendPoint = { date: string; total: number };

interface Forecast {
  projectedNext30DaysTokens: number;
  dailyTrendSlope: number;
  target: number | null;
  confidence: number | null;
}

export default function FinanceView({ platform, agent, api }: AgentViewProps) {
  const load = useLoad(async () => {
    const [summary, trend, fc, stats] = await Promise.allSettled([
      api.get<Summary>("/summary"),
      api.get<TrendPoint[]>("/trend"),
      api.get<Forecast>("/forecast"),
      api.stats(),
    ]);
    if (summary.status === "rejected") throw summary.reason;
    return {
      summary: summary.value.data,
      trend: trend.status === "fulfilled" ? trend.value.data : null,
      forecast: fc.status === "fulfilled" ? fc.value.data : null,
      stats: stats.status === "fulfilled" ? (stats.value.data as AgentStats) : null,
    };
  }, [platform.key, agent.key]);

  const ask = useAsk(api);
  const s = load.data?.summary ?? null;
  const trend = load.data?.trend ?? null;
  const fc = load.data?.forecast ?? null;

  const creditedIn30 = useMemo(() => (trend ? trend.reduce((a, b) => a + b.total, 0) : null), [trend]);
  const creditChange = useMemo(() => (trend ? halfOverHalf(trend.map((t) => t.total)) : null), [trend]);

  const float = s ? s.walletTotals.totalCredits - s.walletTotals.totalDebits : null;

  const creditMix = s
    ? [
        { label: "Top-ups approved", value: s.walletTotals.topUpsApproved, color: "#22c55e" },
        { label: "Other credits", value: Math.max(0, s.walletTotals.totalCredits - s.walletTotals.topUpsApproved), color: "#3b82f6" },
      ].filter((r) => r.value > 0)
    : [];

  const debitRows = s
    ? [
        { label: "Accept fees collected", value: s.walletTotals.acceptFeesCollected },
        { label: "Refunds issued", value: s.walletTotals.refunds },
        { label: "Coins applied to bookings", value: s.bookings.tokensCirculatedInBookings },
      ].filter((r) => r.value > 0)
    : [];

  const revenuePerBooking = s && s.bookings.completed > 0 ? s.walletTotals.acceptFeesCollected / s.bookings.completed : null;

  return (
    <>
      {load.error && <ErrorNote error={load.error} hint={`The Finance Agent reads ${platform.apiBase}${agent.base}/summary. Connect ${platform.label} first if this persists.`} />}

      <div className="ag-metrics">
        <MetricCard icon={<Svg path={Icons.wallet} size={24} />} tone="green" title="Total credits" value={load.loading ? "—" : coins(s?.walletTotals.totalCredits)} change={creditChange} changeLabel="second 15 days vs first" />
        <MetricCard icon={<Svg path={Icons.trendUp} size={24} />} tone="red" title="Total debits" value={load.loading ? "—" : coins(s?.walletTotals.totalDebits)} />
        <MetricCard icon={<Svg path={Icons.dollar} size={24} />} tone="purple" title="Coin float outstanding" value={load.loading ? "—" : float === null ? "—" : coins(float)} />
        <MetricCard icon={<Svg path={Icons.receipt} size={24} />} tone="gold" title="Accept fees collected" value={load.loading ? "—" : coins(s?.walletTotals.acceptFeesCollected)} />
        <MetricCard icon={<Svg path={Icons.crown} size={24} />} tone="blue" title="Cash settled (jobs)" value={load.loading ? "—" : pkr(s?.bookings.cashSettledPKR)} />
        <MetricCard icon={<Svg path={Icons.sparkle} size={24} />} tone="pink" title="30-day projection" value={load.loading ? "—" : fc ? coins(fc.projectedNext30DaysTokens) : "—"} />
      </div>

      <div className="ag-split">
        <div className="ag-stack">
          <Panel
            title="Coins credited — last 30 days"
            sub={creditedIn30 !== null ? `${creditedIn30.toLocaleString()} GC credited across the window` : "Real daily totals from the wallet ledger"}
            actions={
              <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" onClick={load.reload} disabled={load.loading}>
                <Svg path={Icons.refresh} size={14} /> Refresh
              </button>
            }
          >
            {trend && trend.some((t) => t.total > 0) ? (
              <AreaChart labels={trend.map((t) => shortDate(t.date))} series={[{ name: "Coins credited", data: trend.map((t) => t.total), color: agent.accent }]} valueSuffix=" GC" />
            ) : (
              <Empty>{load.loading ? "Loading ledger trend…" : "No ledger movement in the last 30 days."}</Empty>
            )}
          </Panel>

          <div className="ag-duo">
            <Panel title="Where credits come from" sub="Ledger credits by source">
              {creditMix.length > 0 ? (
                <DonutChart data={creditMix} total={s?.walletTotals.totalCredits} totalLabel="Credits (GC)" size={150} />
              ) : (
                <Empty>{load.loading ? "Loading…" : "No credits recorded yet."}</Empty>
              )}
            </Panel>
            <Panel title="Where coins go" sub="Real debit-side totals">
              <BarList rows={debitRows} color="#fb923c" emptyText={load.loading ? "Loading…" : "No debits recorded yet."} />
            </Panel>
          </div>

          <Panel
            title="30-day revenue forecast"
            sub="Real least-squares regression over the 30-day credit trend — the interactive target tool and the full wallet ledger live in Forecast"
            actions={<Link href={`/${platform.key}/${agent.key}/forecast`} className="ag-btn ag-btn-ghost ag-btn-sm">Open full Forecast →</Link>}
          >
            {fc ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 26, alignItems: "center" }}>
                <RadialGauge value={fc.confidence ?? 0} max={100} size={120} color={agent.accent} label={fc.confidence === null ? "no target set" : "confidence"} />
                <div style={{ flex: 1, minWidth: 220, display: "flex", flexDirection: "column", gap: 12 }}>
                  <KeyRow label="Projected next 30 days" value={coins(fc.projectedNext30DaysTokens)} />
                  <KeyRow label="Daily trend slope" value={`${fc.dailyTrendSlope >= 0 ? "+" : ""}${fc.dailyTrendSlope} GC/day`} />
                </div>
              </div>
            ) : (
              <Empty>{load.loading ? "Running the regression…" : "Not enough ledger history to forecast yet."}</Empty>
            )}
          </Panel>
        </div>

        <div className="ag-stack">
          <AgentSidePanel
            agentLabel={`${platform.label} — ${agent.name}`}
            greeting="The full money picture"
            blurb="I track the coin economy, the flat accept fee, and project the next 30 days from a real regression over the ledger — never a guessed curve."
            todayStats={[
              { label: "Accept fee", value: s ? coins(s.economy.acceptFeeTokens) : "—", icon: <Svg path={Icons.receipt} size={17} />, tone: "gold" },
              { label: "Signup grant", value: s ? coins(s.economy.signupTokenGrant) : "—", icon: <Svg path={Icons.wallet} size={17} />, tone: "purple" },
              { label: "Agent calls today", value: load.data?.stats ? num(load.data.stats.callsToday) : "—", icon: <Svg path={Icons.chat} size={17} />, tone: "green" },
            ]}
            suggestions={["What's the 30-day revenue forecast?", "How much float is outstanding in wallets?", "What's our accept fee revenue per completed job?"]}
            onAsk={ask.ask}
          />

          <AskAnswer state={ask} />

          <InsightsPanel
            rows={[
              {
                icon: <Svg path={Icons.wallet} size={15} />,
                label: "Outstanding float",
                value: float === null ? "Ledger unavailable." : `${float.toLocaleString()} GC sit in user wallets — credits ${num(s?.walletTotals.totalCredits)} minus debits ${num(s?.walletTotals.totalDebits)}.`,
              },
              {
                icon: <Svg path={Icons.trendUp} size={15} />,
                label: "Trend direction",
                value: fc ? `Daily credits are trending ${fc.dailyTrendSlope >= 0 ? "up" : "down"} ${Math.abs(fc.dailyTrendSlope).toLocaleString()} GC/day.` : "Not enough history yet.",
              },
              {
                icon: <Svg path={Icons.dollar} size={15} />,
                label: "Revenue per completed job",
                value: revenuePerBooking === null ? "No completed bookings yet." : `${Math.round(revenuePerBooking * 10) / 10} GC in accept fees per completed job, across ${s?.bookings.completed}.`,
              },
              {
                icon: <Svg path={Icons.receipt} size={15} />,
                label: "Fee revenue vs cash",
                value: s === null ? "—" : `${s.walletTotals.acceptFeesCollected.toLocaleString()} GC in accept fees against ${pkr(s.bookings.cashSettledPKR)} settled directly in cash.`,
              },
              {
                icon: <Svg path={Icons.sparkle} size={15} />,
                label: "Last 30 days",
                value: creditedIn30 === null ? "Trend unavailable." : `${creditedIn30.toLocaleString()} GC credited${creditChange === null ? "" : `, ${creditChange >= 0 ? "up" : "down"} ${Math.abs(creditChange)}% in the second half of the window`}.`,
              },
            ]}
          />

          <Panel title="Agent runtime" sub="Real usage from the shared agent log">
            <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
              {load.data?.stats ? (
                <>
                  <KeyRow label="Model" value={load.data.stats.model} />
                  <KeyRow label="Calls this month" value={num(load.data.stats.callsThisMonth)} />
                  <KeyRow label="Spend this month" value={`$${(load.data.stats.spendThisMonthUsd ?? 0).toFixed(2)}`} />
                  <KeyRow label="Monthly budget" value={`$${(load.data.stats.monthlyBudgetUsd ?? 0).toFixed(0)}`} />
                </>
              ) : (
                <Empty>{load.loading ? "Loading…" : "Runtime stats unavailable."}</Empty>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
