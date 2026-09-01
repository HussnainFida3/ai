"use client";

/**
 * GhrFix — Owner Chat.
 *
 * Owner Chat's whole job is conversational access to the real platform, so
 * its dashboard shows exactly what its own `get_platform_stats` tool sees:
 * `GET /admin/reports/overview` (the same `overviewReport()` the tool calls),
 * plus the user-status breakdown, the real 14-day booking trend, and the
 * audited writes this agent itself has made via `/ai-agents/owner-chat/activity`.
 */

import { useMemo } from "react";
import Link from "next/link";
import { AreaChart, BarList, DonutChart, InsightsPanel, MetricCard, AgentSidePanel, FeedRow, Avatar, Svg } from "@/components/agents/rich";
import { Icons } from "@/components/agents/icons";
import { apiFetch, type AgentActivityEntry, type AgentStats, type Paginated } from "@/lib/api";
import type { AgentViewProps } from "../registry";
import {
  AskAnswer,
  Empty,
  ErrorNote,
  KeyRow,
  Panel,
  Pill,
  TableWrap,
  dec,
  halfOverHalf,
  humanAction,
  num,
  pctChange,
  pkr,
  share,
  shortDate,
  timeAgo,
  useAsk,
  useLoad,
} from "./_kit-core";

interface Overview {
  totalUsers: number;
  providers: { total: number; verified: number };
  bookings: { total: number; completed: number; active: number; cashSettledPKR: number; tokensCirculatedInBookings: number };
  pendingTopUps: number;
  openEmergencies: number;
  activePromoCodes: number;
  walletTotals: {
    acceptFeesCollected: number;
    topUpsApproved: number;
    refunds: number;
    totalCredits: number;
    totalDebits: number;
    totalTransactions: number;
  };
  recentBookings: Array<{
    id: string;
    bookingNumber: string;
    status: string;
    createdAt: string;
    tokensApplied: string | null;
    providerReportedCash: string | null;
    category?: { name: string } | null;
    customer?: { name: string | null } | null;
    address?: { city: string | null } | null;
  }>;
  recentProviders: Array<{
    id: string;
    verificationStatus: string;
    createdAt: string;
    user?: { name: string | null } | null;
    services?: Array<{ category?: { name: string } | null }>;
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

interface TrendPoint {
  date: string;
  total: number;
  completed: number;
  cancelled: number;
}

const STATUS_TONE: Record<string, "green" | "amber" | "red" | "mute"> = {
  COMPLETED: "green",
  ASSIGNED: "amber",
  ON_THE_WAY: "amber",
  IN_PROGRESS: "amber",
  CANCELLED: "red",
  REQUESTED: "mute",
};

export default function OwnerChatView({ platform, agent, api }: AgentViewProps) {
  const load = useLoad(async () => {
    const [overview, users, trend, stats, activity] = await Promise.allSettled([
      apiFetch<Overview>(platform.key, "/admin/reports/overview"),
      apiFetch<UserStats>(platform.key, "/admin/users/stats"),
      apiFetch<TrendPoint[]>(platform.key, "/admin/bookings/trend", { query: { days: 14 } }),
      api.stats(),
      api.activity({ pageSize: 8 }),
    ]);
    if (overview.status === "rejected" && stats.status === "rejected") throw overview.reason;
    return {
      overview: overview.status === "fulfilled" ? overview.value.data : null,
      users: users.status === "fulfilled" ? users.value.data : null,
      trend: trend.status === "fulfilled" ? trend.value.data : null,
      stats: stats.status === "fulfilled" ? (stats.value.data as AgentStats) : null,
      activity: activity.status === "fulfilled" ? (activity.value.data as AgentActivityEntry[]) : null,
      activityTotal: activity.status === "fulfilled" ? (activity.value.meta as Paginated)?.total ?? null : null,
    };
  }, [platform.key, agent.key]);

  const ask = useAsk(api);
  const d = load.data;
  const o = d?.overview ?? null;
  const trend = d?.trend ?? null;

  const bookingChange = useMemo(() => (trend ? halfOverHalf(trend.map((t) => t.total)) : null), [trend]);
  const completedChange = useMemo(() => (trend ? halfOverHalf(trend.map((t) => t.completed)) : null), [trend]);

  const verifiedShare = o ? share(o.providers.verified, o.providers.total) : null;
  const completionShare = o ? share(o.bookings.completed, o.bookings.total) : null;

  const statusRows = d?.users
    ? [
        { label: "Active", value: d.users.active, color: "#22c55e" },
        { label: "Pending verification", value: d.users.pendingVerification, color: "#f59e0b" },
        { label: "Suspended", value: d.users.suspended, color: "#f97316" },
        { label: "Banned", value: d.users.banned, color: "#f43f5e" },
      ].filter((r) => r.value > 0)
    : [];

  const ledgerRows = o
    ? [
        { label: "Top-ups approved", value: o.walletTotals.topUpsApproved },
        { label: "Accept fees collected", value: o.walletTotals.acceptFeesCollected },
        { label: "Refunds", value: o.walletTotals.refunds },
        { label: "Tokens used in bookings", value: o.bookings.tokensCirculatedInBookings },
      ].filter((r) => r.value > 0)
    : [];

  return (
    <>
      {load.error && (
        <ErrorNote
          error={load.error}
          hint={
            <>
              Connect {platform.label} on the{" "}
              <Link href="/connect" style={{ color: "var(--ag-accent)", fontWeight: 650 }}>Connect</Link> page, and make sure its
              backend is reachable at {platform.apiBase}.
            </>
          }
        />
      )}

      <div className="ag-metrics">
        <MetricCard
          icon={<Svg path={Icons.users} size={24} />}
          tone="purple"
          title="Total users"
          value={load.loading ? "—" : num(o?.totalUsers)}
          change={d?.users && d.users.total > d.users.newThisWeek ? pctChange(d.users.total, d.users.total - d.users.newThisWeek) : null}
          changeLabel="new in the last 7 days"
        />
        <MetricCard
          icon={<Svg path={Icons.shield} size={24} />}
          tone="green"
          title="Verified providers"
          value={load.loading ? "—" : `${num(o?.providers.verified)} / ${num(o?.providers.total)}`}
        />
        <MetricCard
          icon={<Svg path={Icons.receipt} size={24} />}
          tone="blue"
          title="Bookings (all time)"
          value={load.loading ? "—" : num(o?.bookings.total)}
          change={bookingChange}
          changeLabel="last 7 days vs prior 7"
        />
        <MetricCard
          icon={<Svg path={Icons.dollar} size={24} />}
          tone="gold"
          title="Cash settled"
          value={load.loading ? "—" : pkr(o?.bookings.cashSettledPKR)}
        />
        <MetricCard
          icon={<Svg path={Icons.check} size={24} />}
          tone="pink"
          title="Completed jobs"
          value={load.loading ? "—" : num(o?.bookings.completed)}
          change={completedChange}
          changeLabel="last 7 days vs prior 7"
        />
        <MetricCard
          icon={<Svg path={Icons.alert} size={24} />}
          tone="red"
          title="Open emergencies"
          value={load.loading ? "—" : num(o?.openEmergencies)}
        />
      </div>

      <div className="ag-split">
        <div className="ag-stack">
          <Panel
            title="Booking volume — last 14 days"
            sub="Real daily counts from /admin/bookings/trend"
            actions={
              <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" onClick={load.reload} disabled={load.loading}>
                <Svg path={Icons.refresh} size={14} /> Refresh
              </button>
            }
          >
            {trend && trend.length > 0 ? (
              <AreaChart
                labels={trend.map((t) => shortDate(t.date))}
                series={[
                  { name: "Booked", data: trend.map((t) => t.total), color: "#8b5cf6" },
                  { name: "Completed", data: trend.map((t) => t.completed), color: "#22c55e" },
                  { name: "Cancelled", data: trend.map((t) => t.cancelled), color: "#f43f5e" },
                ]}
              />
            ) : (
              <Empty>{load.loading ? "Loading live booking trend…" : "No booking activity recorded in the last 14 days."}</Empty>
            )}
          </Panel>

          <div className="ag-duo">
            <Panel
              title="Members by account status"
              sub="From /admin/users/stats"
              actions={<Link href={`/${platform.key}/${agent.key}/directory`} className="ag-btn ag-btn-ghost ag-btn-sm">Full directory →</Link>}
            >
              {statusRows.length > 0 ? (
                <DonutChart data={statusRows} total={d?.users?.total} totalLabel="Members" size={150} />
              ) : (
                <Empty>{load.loading ? "Loading…" : "No member records yet."}</Empty>
              )}
            </Panel>

            <Panel title="Most booked categories" sub="Top 5 by real booking count">
              <BarList
                rows={(o?.topServices ?? []).map((s) => ({ label: s.category, value: s.bookings }))}
                ranked
                emptyText={load.loading ? "Loading…" : "No bookings recorded yet."}
              />
            </Panel>
          </div>

          <Panel title="Token economy movement" sub="GhrFix Coins across the real wallet ledger">
            <BarList
              rows={ledgerRows}
              color="#22d3a3"
              emptyText={load.loading ? "Loading…" : "No wallet ledger movement yet."}
            />
          </Panel>

          <Panel
            title="Latest bookings"
            sub="The five most recent jobs on the platform"
            noBody
            actions={<span className="ag-plat-badge" style={{ background: platform.color }}>{platform.label}</span>}
          >
            <TableWrap>
              <table className="ag-table">
                <thead>
                  <tr>
                    <th>Booking</th>
                    <th>Customer</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Cash</th>
                    <th>Coins</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {(o?.recentBookings ?? []).map((b) => (
                    <tr key={b.id}>
                      <td style={{ fontWeight: 650, whiteSpace: "nowrap" }}>{b.bookingNumber}</td>
                      <td>
                        <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
                          <Avatar name={b.customer?.name} size={26} />
                          {b.customer?.name ?? "—"}
                        </span>
                      </td>
                      <td>{b.category?.name ?? "—"}</td>
                      <td><Pill text={b.status} tone={STATUS_TONE[b.status] ?? "mute"} /></td>
                      <td>{pkr(b.providerReportedCash)}</td>
                      <td>{num(b.tokensApplied)}</td>
                      <td style={{ whiteSpace: "nowrap", color: "var(--ag-ink-faint)" }}>{shortDate(b.createdAt)}</td>
                    </tr>
                  ))}
                  {(!o || o.recentBookings.length === 0) && (
                    <tr>
                      <td colSpan={7}><Empty>{load.loading ? "Loading bookings…" : "No bookings on the platform yet."}</Empty></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </TableWrap>
          </Panel>

          <Panel
            title="Audited writes by this agent"
            sub={d?.activityTotal !== null && d?.activityTotal !== undefined ? `${d.activityTotal} logged action${d.activityTotal === 1 ? "" : "s"}` : "From /ai-agents/owner-chat/activity"}
            actions={<Link href={`/${platform.key}/${agent.key}/activity`} className="ag-btn ag-btn-ghost ag-btn-sm">Full log</Link>}
          >
            {d?.activity && d.activity.length > 0 ? (
              d.activity.map((a) => (
                <FeedRow
                  key={a.id}
                  icon={<Svg path={Icons.audit} size={15} />}
                  tone="accent"
                  title={humanAction(a.action)}
                  sub={`${a.targetType ?? "—"}${a.admin?.name ? ` · by ${a.admin.name}` : ""}`}
                  time={timeAgo(a.createdAt)}
                />
              ))
            ) : (
              <Empty>{load.loading ? "Loading…" : "Owner Chat has not written any change yet — every write it makes is logged here."}</Empty>
            )}
          </Panel>
        </div>

        <div className="ag-stack">
          <AgentSidePanel
            agentLabel={`${platform.label} — ${agent.name}`}
            greeting="Ask me anything about GhrFix"
            blurb="I read live platform data through real tools and can make a small set of audited writes — never a guess, never a deploy."
            todayStats={[
              { label: "Agent calls today", value: d?.stats ? num(d.stats.callsToday) : "—", icon: <Svg path={Icons.chat} size={17} />, tone: "purple" },
              { label: "Active jobs right now", value: o ? num(o.bookings.active) : "—", icon: <Svg path={Icons.clock} size={17} />, tone: "gold" },
              { label: "Pending top-ups", value: o ? num(o.pendingTopUps) : "—", icon: <Svg path={Icons.wallet} size={17} />, tone: "green" },
            ]}
            suggestions={[
              "How many bookings completed this month?",
              "Which providers are still unverified?",
              "What is the wallet balance across all users?",
            ]}
            onAsk={ask.ask}
          />

          <AskAnswer state={ask} />

          <InsightsPanel
            rows={[
              {
                icon: <Svg path={Icons.shield} size={15} />,
                label: "Provider verification",
                value:
                  verifiedShare === null
                    ? "No providers registered yet."
                    : `${verifiedShare}% of ${num(o?.providers.total)} providers are verified — ${num((o?.providers.total ?? 0) - (o?.providers.verified ?? 0))} still waiting.`,
              },
              {
                icon: <Svg path={Icons.check} size={15} />,
                label: "Job completion",
                value:
                  completionShare === null
                    ? "No bookings recorded yet."
                    : `${completionShare}% of ${num(o?.bookings.total)} bookings reached COMPLETED.`,
              },
              {
                icon: <Svg path={Icons.wallet} size={15} />,
                label: "Coin float",
                value: o
                  ? `${num(o.walletTotals.totalCredits - o.walletTotals.totalDebits)} GC outstanding across ${num(o.walletTotals.totalTransactions)} ledger entries.`
                  : "Wallet ledger unavailable.",
              },
              {
                icon: <Svg path={Icons.alert} size={15} />,
                label: "Queue right now",
                value: o
                  ? `${num(o.pendingTopUps)} top-up${o.pendingTopUps === 1 ? "" : "s"} awaiting review, ${num(o.openEmergencies)} open emergenc${o.openEmergencies === 1 ? "y" : "ies"}.`
                  : "Queue unavailable.",
              },
              {
                icon: <Svg path={Icons.megaphone} size={15} />,
                label: "Active promo codes",
                value: o ? `${num(o.activePromoCodes)} currently redeemable.` : "—",
              },
            ]}
          />

          <Panel title="Agent runtime" sub="Real usage from the shared agent log">
            <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
              {d?.stats ? (
                <>
                  <KeyRow label="Model" value={d.stats.model} />
                  <KeyRow label="Calls today" value={num(d.stats.callsToday)} />
                  <KeyRow label="Calls this month" value={num(d.stats.callsThisMonth)} />
                  <KeyRow label="Tokens this month" value={num(d.stats.tokensThisMonth)} />
                  <KeyRow
                    label="Spend this month"
                    value={`$${(dec(d.stats.spendThisMonthUsd) ?? 0).toFixed(2)} / $${(dec(d.stats.monthlyBudgetUsd) ?? 0).toFixed(0)}`}
                  />
                  <KeyRow label="Rate limit" value={`${d.stats.rateLimitPerMinute}/min`} />
                </>
              ) : (
                <Empty>{load.loading ? "Loading…" : "Runtime stats unavailable."}</Empty>
              )}
            </div>
          </Panel>

          <Panel
            title="Newest providers"
            sub="Most recent sign-ups"
            actions={<Link href={`/${platform.key}/${agent.key}/directory`} className="ag-btn ag-btn-ghost ag-btn-sm">Full directory →</Link>}
          >
            {o && o.recentProviders.length > 0 ? (
              o.recentProviders.slice(0, 3).map((p) => (
                <FeedRow
                  key={p.id}
                  icon={<Svg path={Icons.users} size={15} />}
                  tone={p.verificationStatus === "VERIFIED" ? "green" : "gold"}
                  title={p.user?.name ?? "Unnamed provider"}
                  sub={`${p.services?.[0]?.category?.name ?? "No service listed"} · ${p.verificationStatus}`}
                  time={timeAgo(p.createdAt)}
                />
              ))
            ) : (
              <Empty>{load.loading ? "Loading…" : "No providers registered yet."}</Empty>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
