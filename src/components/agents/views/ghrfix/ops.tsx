"use client";

/**
 * GhrFix — Ops Agent.
 *
 * The daily overview: `/summary` gives real provider/booking stat blocks
 * plus the open-emergency count; `/queue` powers the quick preview below.
 * The full, filterable, paginated queue — with the real Verify/Reject and
 * emergency-status writes — lives on the Queue tab
 * (components/agents/views/domain/ghrfix/ops.tsx).
 */

import { useMemo } from "react";
import Link from "next/link";
import { AgentSidePanel, Avatar, BarList, DonutChart, InsightsPanel, MetricCard, Svg } from "@/components/agents/rich";
import { Icons } from "@/components/agents/icons";
import { type AgentStats } from "@/lib/api";
import type { AgentViewProps } from "../registry";
import { AskAnswer, Empty, ErrorNote, KeyRow, Panel, TableWrap, num, share, timeAgo, useAsk, useLoad } from "./_kit-core";

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
  providerStats: ProviderStats;
  bookingStats: BookingStats;
  openEmergencies: number;
}

interface PendingProvider {
  id: string;
  verificationStatus: "PENDING" | "VERIFIED" | "REJECTED" | "SUSPENDED";
  rating: number;
  isAvailable: boolean;
  createdAt: string;
  user: { id: string; name: string | null; phone: string | null; email: string | null };
  services: Array<{ category: { name: string } }>;
}

interface EmergencyItem {
  id: string;
  category: string;
  description: string | null;
  status: "OPEN" | "ASSIGNED" | "RESOLVED" | "CANCELLED";
  createdAt: string;
  resolvedAt: string | null;
  user: { id: string; name: string | null; phone: string | null };
  assignedProvider: { id: string; user: { name: string | null; phone: string | null } } | null;
}

interface Queue {
  pendingProviders: PendingProvider[];
  openEmergencies: EmergencyItem[];
}

export default function OpsView({ platform, agent, api }: AgentViewProps) {
  const load = useLoad(async () => {
    const [summary, queue, stats] = await Promise.allSettled([api.get<Summary>("/summary"), api.get<Queue>("/queue"), api.stats()]);
    if (summary.status === "rejected" && queue.status === "rejected") throw summary.reason;
    return {
      summary: summary.status === "fulfilled" ? summary.value.data : null,
      queue: queue.status === "fulfilled" ? queue.value.data : null,
      stats: stats.status === "fulfilled" ? (stats.value.data as AgentStats) : null,
    };
  }, [platform.key, agent.key]);

  const ask = useAsk(api);
  const s = load.data?.summary ?? null;
  const q = load.data?.queue ?? null;

  const providerStatusRows = s
    ? [
        { label: "Verified", value: s.providerStats.verified, color: "#22c55e" },
        { label: "Pending", value: s.providerStats.pending, color: "#d68b00" },
        { label: "Rejected", value: s.providerStats.rejected, color: "#e0393e" },
        { label: "Suspended", value: s.providerStats.suspended, color: "#8b8ea3" },
      ].filter((r) => r.value > 0)
    : [];

  const bookingRows = s
    ? [
        { label: "Pending", value: s.bookingStats.pending },
        { label: "Active", value: s.bookingStats.active },
        { label: "Completed", value: s.bookingStats.completed },
        { label: "Cancelled", value: s.bookingStats.cancelled },
      ].filter((r) => r.value > 0)
    : [];

  const availabilityShare = s ? share(s.providerStats.available, s.providerStats.verified) : null;

  const oldestPending = useMemo(() => {
    const list = q?.pendingProviders ?? [];
    if (list.length === 0) return null;
    return [...list].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];
  }, [q]);

  return (
    <>
      {load.error && <ErrorNote error={load.error} hint={`The Ops Agent reads ${platform.apiBase}${agent.base}/summary. Connect ${platform.label} first if this persists.`} />}

      <div className="ag-metrics">
        <MetricCard icon={<Svg path={Icons.clock} size={24} />} tone="gold" title="Pending verifications" value={load.loading ? "—" : num(s?.providerStats.pending)} />
        <MetricCard icon={<Svg path={Icons.alert} size={24} />} tone="red" title="Open emergencies" value={load.loading ? "—" : num(s?.openEmergencies)} />
        <MetricCard icon={<Svg path={Icons.shield} size={24} />} tone="green" title="Verified providers" value={load.loading ? "—" : num(s?.providerStats.verified)} />
        <MetricCard icon={<Svg path={Icons.users} size={24} />} tone="blue" title="Available right now" value={load.loading ? "—" : s ? `${s.providerStats.available}/${s.providerStats.verified}` : "—"} />
        <MetricCard icon={<Svg path={Icons.trendUp} size={24} />} tone="purple" title="Active bookings" value={load.loading ? "—" : num(s?.bookingStats.active)} />
        <MetricCard icon={<Svg path={Icons.crown} size={24} />} tone="pink" title="Avg provider rating" value={load.loading ? "—" : s && s.providerStats.avgRating > 0 ? `${s.providerStats.avgRating} / 5` : "—"} />
      </div>

      <div className="ag-split">
        <div className="ag-stack">
          <div className="ag-duo">
            <Panel title="Provider verification mix" sub="Every provider, by real status">
              {providerStatusRows.length > 0 ? (
                <DonutChart data={providerStatusRows} total={s?.providerStats.total} totalLabel="Providers" size={150} />
              ) : (
                <Empty>{load.loading ? "Loading…" : "No providers on the platform yet."}</Empty>
              )}
            </Panel>
            <Panel title="Booking pipeline" sub="Real counts across every status">
              <BarList rows={bookingRows} color={agent.accent} emptyText={load.loading ? "Loading…" : "No bookings recorded yet."} />
            </Panel>
          </div>

          <Panel
            title="Pending verifications — quick look"
            sub={q ? `${q.pendingProviders.length} shown of what's waiting · ${s?.openEmergencies ?? 0} open emergencies` : "Real queue from the admin provider list"}
            noBody
            actions={
              <Link href={`/${platform.key}/${agent.key}/queue`} className="ag-btn ag-btn-ghost ag-btn-sm">
                View full Queue →
              </Link>
            }
          >
            <TableWrap>
              <table className="ag-table">
                <thead>
                  <tr>
                    <th>Provider</th>
                    <th>Category</th>
                    <th>Applied</th>
                  </tr>
                </thead>
                <tbody>
                  {(q?.pendingProviders ?? []).slice(0, 4).map((p) => (
                    <tr key={p.id}>
                      <td>
                        <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
                          <Avatar name={p.user.name} size={26} />
                          <span style={{ minWidth: 0 }}>
                            <b style={{ display: "block", fontWeight: 650 }}>{p.user.name ?? "Unknown"}</b>
                            <span style={{ fontSize: 10.5, color: "var(--ag-ink-faint)" }}>{p.user.phone ?? p.user.email ?? "—"}</span>
                          </span>
                        </span>
                      </td>
                      <td>{p.services[0]?.category.name ?? "—"}</td>
                      <td style={{ whiteSpace: "nowrap", color: "var(--ag-ink-faint)" }}>{timeAgo(p.createdAt)}</td>
                    </tr>
                  ))}
                  {(q?.pendingProviders ?? []).length === 0 && (
                    <tr>
                      <td colSpan={3}><Empty>{load.loading ? "Loading queue…" : "Nothing pending — every provider has been reviewed."}</Empty></td>
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
            greeting="The daily queue, cleared"
            blurb="I surface every pending provider and open emergency so nothing sits unattended. Verify and status changes here are real, audited writes."
            todayStats={[
              { label: "Pending verifications", value: s ? num(s.providerStats.pending) : "—", icon: <Svg path={Icons.clock} size={17} />, tone: "gold" },
              { label: "Open emergencies", value: s ? num(s.openEmergencies) : "—", icon: <Svg path={Icons.alert} size={17} />, tone: "purple" },
              { label: "Agent calls today", value: load.data?.stats ? num(load.data.stats.callsToday) : "—", icon: <Svg path={Icons.chat} size={17} />, tone: "green" },
            ]}
            suggestions={["How many providers are waiting on verification?", "Are there any open emergencies right now?", "What share of verified providers are available?"]}
            onAsk={ask.ask}
          />

          <AskAnswer state={ask} />

          <InsightsPanel
            rows={[
              {
                icon: <Svg path={Icons.clock} size={15} />,
                label: "Oldest pending provider",
                value: oldestPending ? `${oldestPending.user.name ?? "A provider"} applied ${timeAgo(oldestPending.createdAt)} and is still waiting.` : "No providers waiting on review.",
              },
              {
                icon: <Svg path={Icons.alert} size={15} />,
                label: "Emergency backlog",
                value: s && s.openEmergencies > 0 ? `${s.openEmergencies} emergency request${s.openEmergencies === 1 ? "" : "s"} still open.` : "No open emergencies.",
              },
              {
                icon: <Svg path={Icons.shield} size={15} />,
                label: "Availability",
                value: availabilityShare === null ? "No verified providers yet." : `${availabilityShare}% of verified providers are marked available right now.`,
              },
              {
                icon: <Svg path={Icons.trendUp} size={15} />,
                label: "Booking throughput",
                value: s ? `${num(s.bookingStats.completed)} completed against ${num(s.bookingStats.cancelled)} cancelled, out of ${num(s.bookingStats.total)} total.` : "—",
              },
              {
                icon: <Svg path={Icons.check} size={15} />,
                label: "Verification pipeline",
                value: s ? `${num(s.providerStats.rejected)} rejected and ${num(s.providerStats.suspended)} suspended of ${num(s.providerStats.total)} total providers.` : "—",
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
