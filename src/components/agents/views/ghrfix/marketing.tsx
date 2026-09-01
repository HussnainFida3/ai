"use client";

/**
 * GhrFix — Marketing Agent.
 *
 * `/summary` and `/campaigns` read the real promo-code table and the real
 * AdminBroadcast log — powering the quick preview below. The full campaign
 * management surface (every promo code, create/toggle, every broadcast,
 * send) lives on the Campaigns tab
 * (components/agents/views/domain/ghrfix/marketing.tsx).
 */

import Link from "next/link";
import { AgentSidePanel, BarList, DonutChart, InsightsPanel, MetricCard, Svg } from "@/components/agents/rich";
import { Icons } from "@/components/agents/icons";
import { type AgentStats } from "@/lib/api";
import type { AgentViewProps } from "../registry";
import { AskAnswer, Empty, ErrorNote, KeyRow, Panel, Pill, TableWrap, num, share, useAsk, useLoad } from "./_kit-core";

type PromoType = "FLAT" | "PERCENT";
type Audience = "ALL" | "CUSTOMER_MODE" | "PROVIDER_MODE";

interface PromoCode {
  id: string;
  code: string;
  type: PromoType;
  value: string;
  minOrder: string | null;
  maxDiscount: string | null;
  usageLimit: number | null;
  perUserLimit: number;
  usedCount: number;
  validFrom: string;
  validTo: string | null;
  isActive: boolean;
  createdAt: string;
}

interface Broadcast {
  id: string;
  title: string;
  body: string;
  audience: Audience;
  recipientCount: number;
  createdAt: string;
  sentBy: { id: string; name: string | null };
}

interface Summary {
  activePromoCodes: number;
  recentBroadcastsCount: number;
  recentBroadcasts: Broadcast[];
}

interface Campaigns {
  promoCodes: PromoCode[];
  broadcasts: Broadcast[];
}

const AUDIENCE_LABEL: Record<Audience, string> = { ALL: "Everyone", CUSTOMER_MODE: "Customers", PROVIDER_MODE: "Providers" };

export default function MarketingView({ platform, agent, api }: AgentViewProps) {
  const load = useLoad(async () => {
    const [summary, campaigns, stats] = await Promise.allSettled([
      api.get<Summary>("/summary"),
      api.get<Campaigns>("/campaigns"),
      api.stats(),
    ]);
    if (summary.status === "rejected" && campaigns.status === "rejected") throw summary.reason;
    return {
      summary: summary.status === "fulfilled" ? summary.value.data : null,
      campaigns: campaigns.status === "fulfilled" ? campaigns.value.data : null,
      stats: stats.status === "fulfilled" ? (stats.value.data as AgentStats) : null,
    };
  }, [platform.key, agent.key]);

  const ask = useAsk(api);
  const s = load.data?.summary ?? null;
  const c = load.data?.campaigns ?? null;
  const promos = c?.promoCodes ?? [];
  const broadcasts = c?.broadcasts ?? [];

  const activeCount = promos.filter((p) => p.isActive).length;
  const typeRows = [
    { label: "Flat discounts", value: promos.filter((p) => p.type === "FLAT").length, color: "#3b82f6" },
    { label: "Percent discounts", value: promos.filter((p) => p.type === "PERCENT").length, color: "#d946ef" },
  ].filter((r) => r.value > 0);

  const usageRows = [...promos]
    .filter((p) => p.usedCount > 0)
    .sort((a, b) => b.usedCount - a.usedCount)
    .map((p) => ({ label: p.code, value: p.usedCount }));

  const totalRecipients = broadcasts.reduce((a, b) => a + b.recipientCount, 0);
  const topPromo = usageRows[0] ?? null;
  const totalRedemptions = promos.reduce((a, b) => a + b.usedCount, 0);

  return (
    <>
      {load.error && <ErrorNote error={load.error} hint={`The Marketing Agent reads ${platform.apiBase}${agent.base}/summary. Connect ${platform.label} first if this persists.`} />}

      <div className="ag-metrics">
        <MetricCard icon={<Svg path={Icons.target} size={24} />} tone="purple" title="Active promo codes" value={load.loading ? "—" : num(s?.activePromoCodes)} />
        <MetricCard icon={<Svg path={Icons.sparkle} size={24} />} tone="pink" title="Total promo codes" value={load.loading ? "—" : num(promos.length)} />
        <MetricCard icon={<Svg path={Icons.megaphone} size={24} />} tone="blue" title="Broadcasts sent" value={load.loading ? "—" : num(s?.recentBroadcastsCount)} />
        <MetricCard icon={<Svg path={Icons.users} size={24} />} tone="green" title="Recipients reached" value={load.loading ? "—" : num(totalRecipients)} />
      </div>

      <div className="ag-split">
        <div className="ag-stack">
          <div className="ag-duo">
            <Panel title="Promo code mix" sub="Real codes by discount type">
              {typeRows.length > 0 ? (
                <DonutChart data={typeRows} total={promos.length} totalLabel="Codes" size={150} />
              ) : (
                <Empty>{load.loading ? "Loading…" : "No promo codes created yet."}</Empty>
              )}
            </Panel>
            <Panel title="Most redeemed codes" sub="Real usedCount from the promo table">
              <BarList rows={usageRows} ranked color={agent.accent} emptyText={load.loading ? "Loading…" : "No promo code has been redeemed yet."} />
            </Panel>
          </div>

          <Panel
            title="Promo codes — top redeemed"
            sub={`${promos.length} on record · ${activeCount} active`}
            noBody
            actions={
              <Link href={`/${platform.key}/${agent.key}/campaigns`} className="ag-btn ag-btn-ghost ag-btn-sm">
                View full Campaigns →
              </Link>
            }
          >
            <TableWrap>
              <table className="ag-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Used</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[...promos].sort((a, b) => b.usedCount - a.usedCount).slice(0, 4).map((p) => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 700, fontFamily: "monospace" }}>{p.code}</td>
                      <td>{p.usedCount}{p.usageLimit ? ` / ${p.usageLimit}` : ""}</td>
                      <td><Pill text={p.isActive ? "Active" : "Inactive"} tone={p.isActive ? "green" : "mute"} /></td>
                    </tr>
                  ))}
                  {promos.length === 0 && (
                    <tr>
                      <td colSpan={3}><Empty>{load.loading ? "Loading promo codes…" : "No promo codes created yet."}</Empty></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </TableWrap>
          </Panel>

          <Panel title="Recent broadcasts" sub={`${broadcasts.length} on record`} noBody>
            <TableWrap>
              <table className="ag-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Audience</th>
                    <th>Recipients</th>
                    <th>Sent</th>
                  </tr>
                </thead>
                <tbody>
                  {broadcasts.slice(0, 4).map((b) => (
                    <tr key={b.id}>
                      <td style={{ fontWeight: 650 }}>{b.title}</td>
                      <td>{AUDIENCE_LABEL[b.audience]}</td>
                      <td>{b.recipientCount.toLocaleString()}</td>
                      <td style={{ whiteSpace: "nowrap", color: "var(--ag-ink-faint)" }}>{b.createdAt.slice(0, 10)}</td>
                    </tr>
                  ))}
                  {broadcasts.length === 0 && (
                    <tr>
                      <td colSpan={4}><Empty>{load.loading ? "Loading broadcasts…" : "No broadcast has been sent yet."}</Empty></td>
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
            greeting="Campaigns, live"
            blurb="I manage real promo codes and send real broadcast notifications — every create, toggle and send here is a live, audited write."
            todayStats={[
              { label: "Active promo codes", value: s ? num(s.activePromoCodes) : "—", icon: <Svg path={Icons.target} size={17} />, tone: "purple" },
              { label: "Recipients reached", value: num(totalRecipients), icon: <Svg path={Icons.users} size={17} />, tone: "green" },
              { label: "Agent calls today", value: load.data?.stats ? num(load.data.stats.callsToday) : "—", icon: <Svg path={Icons.chat} size={17} />, tone: "gold" },
            ]}
            suggestions={["Which promo code has been redeemed the most?", "How many people have we reached with broadcasts?", "What promo codes are still active?"]}
            onAsk={ask.ask}
          />

          <AskAnswer state={ask} />

          <InsightsPanel
            rows={[
              {
                icon: <Svg path={Icons.crown} size={15} />,
                label: "Top performing code",
                value: topPromo ? `${topPromo.label} has been redeemed ${topPromo.value} time${topPromo.value === 1 ? "" : "s"}.` : "No promo code has been redeemed yet.",
              },
              {
                icon: <Svg path={Icons.target} size={15} />,
                label: "Redemption total",
                value: totalRedemptions > 0 ? `${totalRedemptions} redemptions across ${promos.length} code${promos.length === 1 ? "" : "s"}.` : "No redemptions recorded yet.",
              },
              {
                icon: <Svg path={Icons.megaphone} size={15} />,
                label: "Broadcast reach",
                value: broadcasts.length > 0 ? `${totalRecipients.toLocaleString()} recipients across ${broadcasts.length} broadcast${broadcasts.length === 1 ? "" : "s"}.` : "No broadcast has been sent yet.",
              },
              {
                icon: <Svg path={Icons.sparkle} size={15} />,
                label: "Active vs total",
                value: promos.length > 0 ? `${share(activeCount, promos.length)}% of ${promos.length} promo codes are currently active.` : "No promo codes yet.",
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
