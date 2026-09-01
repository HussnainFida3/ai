"use client";

/**
 * GhrFix — Analytics Agent.
 *
 * Every number traces to `/summary` (the real admin overview + user/provider/
 * booking stat blocks), `/trend` (14 real daily booking buckets) and
 * `/breakdown` (a live groupBy over User.city plus the overview's real
 * topServices). Nothing here is estimated — shares and rates are arithmetic
 * over those same fields.
 */

import { useMemo } from "react";
import Link from "next/link";
import { AgentSidePanel, AreaChart, BarList, DonutChart, InsightsPanel, MetricCard, Svg } from "@/components/agents/rich";
import { Icons } from "@/components/agents/icons";
import type { AgentStats } from "@/lib/api";
import type { AgentViewProps } from "../registry";
import { AskAnswer, Empty, ErrorNote, KeyRow, Panel, Pill, TableWrap, halfOverHalf, num, pkr, share, shortDate, timeAgo, useAsk, useLoad } from "./_kit-core";

interface Overview {
  totalUsers: number;
  providers: { total: number; verified: number };
  bookings: { total: number; completed: number; active: number; cashSettledPKR: number; tokensCirculatedInBookings: number };
  openEmergencies: number;
  activePromoCodes: number;
  recentBookings: Array<{
    id: string;
    bookingNumber: string;
    status: string;
    createdAt: string;
    category: { name: string } | null;
    customer: { name: string | null } | null;
    address: { city: string | null } | null;
  }>;
  topServices: Array<{ category: string; bookings: number }>;
}

interface UserStats {
  total: number;
  active: number;
  suspended: number;
  banned: number;
  pendingVerification: number;
  providers: number;
  newThisWeek: number;
}

interface ProviderStats {
  total: number;
  verified: number;
  pending: number;
  rejected: number;
  suspended: number;
  available: number;
  avgRating: number;
}

interface BookingStats {
  total: number;
  pending: number;
  active: number;
  completed: number;
  cancelled: number;
}

interface Summary {
  overview: Overview;
  userStats: UserStats;
  providerStats: ProviderStats;
  bookingStats: BookingStats;
}

interface TrendPoint {
  date: string;
  total: number;
  completed: number;
  cancelled: number;
}

interface Breakdown {
  byCity: Array<{ city: string; count: number }>;
  byCategory: Array<{ category: string; bookings: number }>;
}

const STATUS_TONE: Record<string, "green" | "amber" | "red" | "mute"> = {
  COMPLETED: "green",
  CANCELLED: "red",
  REQUESTED: "amber",
  ASSIGNED: "amber",
  ON_THE_WAY: "amber",
  IN_PROGRESS: "amber",
  QUOTED: "amber",
};

export default function AnalyticsView({ platform, agent, api }: AgentViewProps) {
  const load = useLoad(async () => {
    const [summary, trend, breakdown, stats] = await Promise.allSettled([
      api.get<Summary>("/summary"),
      api.get<TrendPoint[]>("/trend"),
      api.get<Breakdown>("/breakdown"),
      api.stats(),
    ]);
    if (summary.status === "rejected") throw summary.reason;
    return {
      summary: summary.value.data,
      trend: trend.status === "fulfilled" ? trend.value.data : null,
      breakdown: breakdown.status === "fulfilled" ? breakdown.value.data : null,
      stats: stats.status === "fulfilled" ? (stats.value.data as AgentStats) : null,
    };
  }, [platform.key, agent.key]);

  const ask = useAsk(api);
  const s = load.data?.summary ?? null;
  const trend = load.data?.trend ?? null;
  const breakdown = load.data?.breakdown ?? null;

  const bookingChange = useMemo(() => (trend ? halfOverHalf(trend.map((t) => t.total)) : null), [trend]);

  const cityRows = breakdown?.byCity.map((c, i) => ({ label: c.city, value: c.count, color: undefined as string | undefined })) ?? [];
  const citySum = cityRows.reduce((a, b) => a + b.value, 0);
  const categoryRows = breakdown?.byCategory.map((c) => ({ label: c.category, value: c.bookings })) ?? [];

  const topCity = breakdown && breakdown.byCity.length > 0 ? breakdown.byCity[0] : null;
  const topCategory = breakdown && breakdown.byCategory.length > 0 ? breakdown.byCategory[0] : null;
  const categoryTotal = categoryRows.reduce((a, b) => a + b.value, 0);

  const completionRate = s ? share(s.bookingStats.completed, s.bookingStats.total) : null;
  const verificationRate = s ? share(s.providerStats.verified, s.providerStats.total) : null;
  const growthShare = s ? share(s.userStats.newThisWeek, s.userStats.total) : null;
  const cityShare = topCity ? share(topCity.count, citySum) : null;
  const categoryShare = topCategory ? share(topCategory.bookings, categoryTotal) : null;

  const recent = s?.overview.recentBookings ?? [];

  return (
    <>
      {load.error && <ErrorNote error={load.error} hint={`The Analytics Agent reads ${platform.apiBase}${agent.base}/summary. Connect ${platform.label} first if this persists.`} />}

      <div className="ag-metrics">
        <MetricCard icon={<Svg path={Icons.users} size={24} />} tone="blue" title="Total users" value={load.loading ? "—" : num(s?.userStats.total)} />
        <MetricCard icon={<Svg path={Icons.shield} size={24} />} tone="green" title="Verified providers" value={load.loading ? "—" : s ? `${s.providerStats.verified}/${s.providerStats.total}` : "—"} />
        <MetricCard
          icon={<Svg path={Icons.trendUp} size={24} />}
          tone="purple"
          title="Bookings (14 days)"
          value={load.loading ? "—" : trend ? num(trend.reduce((a, b) => a + b.total, 0)) : "—"}
          change={bookingChange}
          changeLabel="second week vs first"
        />
        <MetricCard icon={<Svg path={Icons.check} size={24} />} tone="gold" title="Completed bookings" value={load.loading ? "—" : num(s?.bookingStats.completed)} />
        <MetricCard icon={<Svg path={Icons.crown} size={24} />} tone="pink" title="Avg provider rating" value={load.loading ? "—" : s && s.providerStats.avgRating > 0 ? `${s.providerStats.avgRating} / 5` : "—"} />
        <MetricCard icon={<Svg path={Icons.sparkle} size={24} />} tone="accent" title="New users this week" value={load.loading ? "—" : num(s?.userStats.newThisWeek)} />
      </div>

      <div className="ag-split">
        <div className="ag-stack">
          <Panel
            title="Bookings trend — last 14 days"
            sub="Total, completed and cancelled counts, bucketed by real creation date"
            actions={
              <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" onClick={load.reload} disabled={load.loading}>
                <Svg path={Icons.refresh} size={14} /> Refresh
              </button>
            }
          >
            {trend && trend.some((t) => t.total > 0) ? (
              <AreaChart
                labels={trend.map((t) => shortDate(t.date))}
                series={[
                  { name: "Total", data: trend.map((t) => t.total), color: "#38bdf8" },
                  { name: "Completed", data: trend.map((t) => t.completed), color: "#22c55e" },
                  { name: "Cancelled", data: trend.map((t) => t.cancelled), color: "#f43f5e" },
                ]}
              />
            ) : (
              <Empty>{load.loading ? "Loading trend…" : "No bookings in the last 14 days."}</Empty>
            )}
          </Panel>

          <Panel
            title="Top city & category"
            sub="Full breakdown, search and the admin booking board live in Breakdown"
            actions={<Link href={`/${platform.key}/${agent.key}/breakdown`} className="ag-btn ag-btn-ghost ag-btn-sm">Open full Breakdown →</Link>}
          >
            <div className="ag-duo">
              <div>
                {cityRows.length > 0 ? (
                  <DonutChart data={cityRows.slice(0, 5)} total={citySum} totalLabel="Users" size={130} />
                ) : (
                  <Empty>{load.loading ? "Loading…" : "No city data recorded yet."}</Empty>
                )}
              </div>
              <BarList rows={categoryRows.slice(0, 5)} ranked color={agent.accent} emptyText={load.loading ? "Loading…" : "No bookings recorded yet."} />
            </div>
          </Panel>

          <Panel
            title="Most recent bookings"
            sub="Straight from the admin overview report"
            noBody
            actions={<Link href={`/${platform.key}/${agent.key}/breakdown`} className="ag-btn ag-btn-ghost ag-btn-sm">Full booking board →</Link>}
          >
            <TableWrap>
              <table className="ag-table">
                <thead>
                  <tr>
                    <th>Booking</th>
                    <th>Customer</th>
                    <th>Category</th>
                    <th>City</th>
                    <th>Status</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.slice(0, 5).map((b) => (
                    <tr key={b.id}>
                      <td style={{ fontWeight: 650, whiteSpace: "nowrap" }}>{b.bookingNumber}</td>
                      <td>{b.customer?.name ?? "—"}</td>
                      <td>{b.category?.name ?? "—"}</td>
                      <td>{b.address?.city ?? "—"}</td>
                      <td><Pill text={b.status} tone={STATUS_TONE[b.status] ?? "mute"} /></td>
                      <td style={{ whiteSpace: "nowrap", color: "var(--ag-ink-faint)" }}>{timeAgo(b.createdAt)}</td>
                    </tr>
                  ))}
                  {recent.length === 0 && (
                    <tr>
                      <td colSpan={6}><Empty>{load.loading ? "Loading recent bookings…" : "No bookings recorded yet."}</Empty></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </TableWrap>
          </Panel>
        </div>

        <div className="ag-stack">
          <AgentSidePanel
            agentLabel={`${platform.label} — ${agent.name}`}
            greeting="Every number, traced to a table"
            blurb="I read users, providers and bookings straight from the admin report and a live city groupBy — nothing here is a cached estimate."
            todayStats={[
              { label: "New users this week", value: s ? num(s.userStats.newThisWeek) : "—", icon: <Svg path={Icons.sparkle} size={17} />, tone: "purple" },
              { label: "Open emergencies", value: s ? num(s.overview.openEmergencies) : "—", icon: <Svg path={Icons.alert} size={17} />, tone: "gold" },
              { label: "Agent calls today", value: load.data?.stats ? num(load.data.stats.callsToday) : "—", icon: <Svg path={Icons.chat} size={17} />, tone: "green" },
            ]}
            suggestions={["Which city drives the most bookings?", "How healthy is our provider verification pipeline?", "What's our booking completion rate?"]}
            onAsk={ask.ask}
          />

          <AskAnswer state={ask} />

          <InsightsPanel
            rows={[
              {
                icon: <Svg path={Icons.seo} size={15} />,
                label: "City concentration",
                value: topCity && cityShare !== null ? `${topCity.city} accounts for ${cityShare}% of ${citySum} users with a known city.` : "No city data recorded yet.",
              },
              {
                icon: <Svg path={Icons.target} size={15} />,
                label: "Category leader",
                value: topCategory && categoryShare !== null ? `${topCategory.category} drives ${categoryShare}% of ${categoryTotal} recent bookings.` : "No category data yet.",
              },
              {
                icon: <Svg path={Icons.check} size={15} />,
                label: "Booking completion rate",
                value: completionRate === null ? "No bookings recorded yet." : `${completionRate}% of ${s?.bookingStats.total} bookings completed successfully.`,
              },
              {
                icon: <Svg path={Icons.shield} size={15} />,
                label: "Provider verification rate",
                value: verificationRate === null ? "No providers on the platform yet." : `${verificationRate}% of ${s?.providerStats.total} providers are verified.`,
              },
              {
                icon: <Svg path={Icons.trendUp} size={15} />,
                label: "User growth",
                value: growthShare === null ? "—" : `${growthShare}% of all ${s?.userStats.total} users joined in the last 7 days.`,
              },
            ]}
          />

          <Panel title="Agent runtime" sub="Real usage from the shared agent log">
            <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
              {load.data?.stats ? (
                <>
                  <KeyRow label="Model" value={load.data.stats.model} />
                  <KeyRow label="Calls this month" value={num(load.data.stats.callsThisMonth)} />
                  <KeyRow label="Cash settled off-platform" value={pkr(s?.overview.bookings.cashSettledPKR)} />
                  <KeyRow label="Spend this month" value={`$${(load.data.stats.spendThisMonthUsd ?? 0).toFixed(2)}`} />
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
