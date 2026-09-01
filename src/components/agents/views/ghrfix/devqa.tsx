"use client";

/**
 * GhrFix — Developer & QA Agent.
 *
 * `/health` runs the exact same database/redis checks the public
 * `/health/ready` probe uses, just authenticated; `/usage` is real
 * AiUsageLog/AgentUsageLog aggregates. The re-runnable health breakdown and
 * the full per-agent/top-customer tables live on the Health tab
 * (components/agents/views/domain/ghrfix/devqa.tsx) — this page keeps the
 * at-a-glance metrics and a quick preview.
 */

import Link from "next/link";
import { AgentSidePanel, BarList, DonutChart, InsightsPanel, MetricCard, Svg } from "@/components/agents/rich";
import { Icons } from "@/components/agents/icons";
import { type AgentStats } from "@/lib/api";
import type { AgentViewProps } from "../registry";
import { AskAnswer, Empty, ErrorNote, KeyRow, Panel, Pill, TableWrap, num, share, useAsk, useLoad } from "./_kit-core";

interface Health {
  status: "ready" | "not_ready";
  ready: boolean;
  checks: { database: "ok" | "down"; redis: "ok" | "down" };
  configured: { email: boolean; storage: boolean };
}

interface CustomerAi {
  totalCalls: number;
  callsToday: number;
  callsThisMonth: number;
  cachedCalls: number;
  cacheHitRate: number;
  totalTokensIn: number;
  totalTokensOut: number;
  topUsers: Array<{ user: { id: string; name: string | null; phone: string | null } | null; calls: number }>;
}

interface AgentUsageRow {
  agent: string;
  calls: number;
  costUsd: number;
}

interface Usage {
  customerAi: CustomerAi;
  ownerAgents: { today: AgentUsageRow[]; month: AgentUsageRow[] };
}

function humanAgent(key: string) {
  return key
    .replace(/-agent$/, "")
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function DevQaView({ platform, agent, api }: AgentViewProps) {
  const load = useLoad(async () => {
    const [h, usage, stats] = await Promise.allSettled([api.get<Health>("/health"), api.get<Usage>("/usage"), api.stats()]);
    if (h.status === "rejected" && usage.status === "rejected") throw h.reason;
    return {
      health: h.status === "fulfilled" ? h.value.data : null,
      usage: usage.status === "fulfilled" ? usage.value.data : null,
      stats: stats.status === "fulfilled" ? (stats.value.data as AgentStats) : null,
    };
  }, [platform.key, agent.key]);

  const ask = useAsk(api);
  const h = load.data?.health ?? null;
  const u = load.data?.usage ?? null;

  const monthRows = u?.ownerAgents.month ?? [];

  const callRows = [...monthRows].filter((r) => r.calls > 0).sort((a, b) => b.calls - a.calls).map((r) => ({ label: humanAgent(r.agent), value: r.calls }));
  const spendTotal = monthRows.reduce((a, b) => a + b.costUsd, 0);
  const spendRows = [...monthRows]
    .filter((r) => r.costUsd > 0)
    .sort((a, b) => b.costUsd - a.costUsd)
    .map((r) => ({ label: humanAgent(r.agent), value: Math.round(r.costUsd * 100) }));

  const busiestAgent = callRows[0] ?? null;
  const topSpender = [...monthRows].sort((a, b) => b.costUsd - a.costUsd)[0] ?? null;
  const topUser = u?.customerAi.topUsers[0] ?? null;

  const allOk = h ? h.checks.database === "ok" && h.checks.redis === "ok" : null;

  return (
    <>
      {load.error && <ErrorNote error={load.error} hint={`The Developer & QA Agent reads ${platform.apiBase}${agent.base}/health. Connect ${platform.label} first if this persists.`} />}

      <div className="ag-metrics">
        <MetricCard icon={<Svg path={Icons.shield} size={24} />} tone={allOk === null ? "purple" : allOk ? "green" : "red"} title="System readiness" value={load.loading ? "—" : h ? (h.ready ? "Ready" : "Not ready") : "—"} />
        <MetricCard icon={<Svg path={Icons.database} size={24} />} tone={h?.checks.database === "ok" ? "green" : "red"} title="Database" value={load.loading ? "—" : h?.checks.database === "ok" ? "Online" : h ? "Down" : "—"} />
        <MetricCard icon={<Svg path={Icons.server} size={24} />} tone={h?.checks.redis === "ok" ? "green" : "red"} title="Redis" value={load.loading ? "—" : h?.checks.redis === "ok" ? "Online" : h ? "Down" : "—"} />
        <MetricCard icon={<Svg path={Icons.chat} size={24} />} tone="blue" title="Customer AI calls today" value={load.loading ? "—" : u ? num(u.customerAi.callsToday) : "—"} />
        <MetricCard icon={<Svg path={Icons.sparkle} size={24} />} tone="gold" title="Cache hit rate" value={load.loading ? "—" : u ? `${u.customerAi.cacheHitRate}%` : "—"} />
        <MetricCard icon={<Svg path={Icons.dollar} size={24} />} tone="pink" title="Owner-agent spend (month)" value={load.loading ? "—" : `$${spendTotal.toFixed(2)}`} />
      </div>

      <div className="ag-split">
        <div className="ag-stack">
          <div className="ag-duo">
            <Panel title="AI spend by agent" sub="This calendar month, from the real usage log">
              {spendRows.length > 0 ? (
                <DonutChart data={spendRows} total={Math.round(spendTotal * 100)} totalLabel="cents" size={150} />
              ) : (
                <Empty>{load.loading ? "Loading…" : "No AI spend recorded this month."}</Empty>
              )}
            </Panel>
            <Panel title="Call volume by agent" sub="This calendar month">
              <BarList rows={callRows} ranked color={agent.accent} emptyText={load.loading ? "Loading…" : "No agent has logged a call this month."} />
            </Panel>
          </div>

          <Panel
            title="Owner AI agents — top 5"
            sub={h ? `${h.ready ? "All systems ready" : "Something needs attention"} · full breakdown on the Health tab` : "Every agent's real call volume and spend"}
            noBody
            actions={
              <Link href={`/${platform.key}/${agent.key}/health`} className="ag-btn ag-btn-ghost ag-btn-sm">
                View full Health →
              </Link>
            }
          >
            <TableWrap>
              <table className="ag-table">
                <thead>
                  <tr>
                    <th>Agent</th>
                    <th style={{ textAlign: "right" }}>This month</th>
                    <th style={{ textAlign: "right" }}>Spend</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[...monthRows].sort((a, b) => b.calls - a.calls).slice(0, 5).map((r) => (
                    <tr key={r.agent}>
                      <td style={{ fontWeight: 650 }}>{humanAgent(r.agent)}</td>
                      <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{num(r.calls)}</td>
                      <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>${r.costUsd.toFixed(3)}</td>
                      <td>{r.calls > 0 ? <Pill text="Active" tone="green" /> : <Pill text="Idle" tone="mute" />}</td>
                    </tr>
                  ))}
                  {monthRows.length === 0 && (
                    <tr>
                      <td colSpan={4}><Empty>{load.loading ? "Loading usage…" : "No owner agent has logged a call this month."}</Empty></td>
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
            greeting="Systems, watched"
            blurb="I run the same readiness probe the public health endpoint uses, and roll up real spend and call volume across every owner AI agent."
            todayStats={[
              { label: "System readiness", value: h ? (h.ready ? "Ready" : "Not ready") : "—", icon: <Svg path={Icons.shield} size={17} />, tone: h?.ready ? "green" : "gold" },
              { label: "Cache hit rate", value: u ? `${u.customerAi.cacheHitRate}%` : "—", icon: <Svg path={Icons.sparkle} size={17} />, tone: "purple" },
              { label: "Agent calls today", value: load.data?.stats ? num(load.data.stats.callsToday) : "—", icon: <Svg path={Icons.chat} size={17} />, tone: "blue" },
            ]}
            suggestions={["Is the platform healthy right now?", "Which agent is spending the most this month?", "What's our AI cache hit rate?"]}
            onAsk={ask.ask}
          />

          <AskAnswer state={ask} />

          <InsightsPanel
            rows={[
              {
                icon: <Svg path={Icons.shield} size={15} />,
                label: "Readiness",
                value: h ? `Database ${h.checks.database}, Redis ${h.checks.redis} — overall ${h.ready ? "ready" : "not ready"}.` : "Health check unavailable.",
              },
              {
                icon: <Svg path={Icons.crown} size={15} />,
                label: "Busiest agent this month",
                value: busiestAgent ? `${busiestAgent.label} made ${busiestAgent.value.toLocaleString()} calls.` : "No agent has been called yet this month.",
              },
              {
                icon: <Svg path={Icons.dollar} size={15} />,
                label: "Spend concentration",
                value: topSpender && topSpender.costUsd > 0 ? `${humanAgent(topSpender.agent)} accounts for ${share(topSpender.costUsd, spendTotal)}% of $${spendTotal.toFixed(2)} spent.` : "No AI spend recorded this month.",
              },
              {
                icon: <Svg path={Icons.sparkle} size={15} />,
                label: "Cache efficiency",
                value: u && u.customerAi.totalCalls > 0 ? `${u.customerAi.cachedCalls.toLocaleString()} of ${u.customerAi.totalCalls.toLocaleString()} customer AI calls served from cache.` : "The customer assistant has not been used yet.",
              },
              {
                icon: <Svg path={Icons.chat} size={15} />,
                label: "Most active customer",
                value: topUser?.user ? `${topUser.user.name ?? "A user"} made ${topUser.calls} calls to the customer assistant.` : "No customer AI usage yet.",
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
