"use client";

/**
 * GhrFix — Site Chat Agent → Usage.
 *
 * The customer-facing assistant only logs aggregate call metadata (no stored
 * transcripts, no per-user pagination beyond the top 5 groupBy `aiUsageStats`
 * already returns) so there is no bigger real table to page through — this
 * page instead goes deeper on the numbers the Dashboard only summarised: a
 * cache-efficiency gauge, the token in/out split, and this agent's own
 * runtime spend, which the Dashboard never showed at all.
 */

import { InsightsPanel, DonutChart, MetricCard, Svg } from "@/components/agents/rich";
import { RadialGauge } from "@/components/agents/charts";
import { Icons } from "@/components/agents/icons";
import type { AgentStats } from "@/lib/api";
import type { AgentViewProps } from "../../registry";
import { Empty, ErrorNote, KeyRow, Panel, num, useLoad } from "../../ghrfix/_kit-core";

interface UsageSummary {
  totalCalls: number;
  callsToday: number;
  callsThisMonth: number;
  cachedCalls: number;
  cacheHitRate: number;
  totalTokensIn: number;
  totalTokensOut: number;
  topUsers: Array<{ user: { id: string; name: string | null; phone: string | null } | null; calls: number }>;
}

interface ConversationsProxy {
  note: string;
  topUsers: UsageSummary["topUsers"];
}

export default function SiteChatUsageView({ platform, agent, api }: AgentViewProps) {
  const load = useLoad(async () => {
    const [summary, proxy, stats] = await Promise.allSettled([
      api.get<UsageSummary>("/summary"),
      api.get<ConversationsProxy>("/conversations"),
      api.stats(),
    ]);
    if (summary.status === "rejected") throw summary.reason;
    return {
      summary: summary.value.data,
      proxy: proxy.status === "fulfilled" ? proxy.value.data : null,
      stats: stats.status === "fulfilled" ? (stats.value.data as AgentStats) : null,
    };
  }, [platform.key, agent.key]);

  const s = load.data?.summary ?? null;
  const proxy = load.data?.proxy ?? null;
  const cacheMiss = s ? s.totalCalls - s.cachedCalls : 0;
  const topUsers = proxy?.topUsers ?? s?.topUsers ?? [];
  const totalTokens = s ? s.totalTokensIn + s.totalTokensOut : 0;
  const tokenInShare = totalTokens > 0 && s ? Math.round((s.totalTokensIn / totalTokens) * 1000) / 10 : null;

  return (
    <>
      {load.error && <ErrorNote error={load.error} hint={`The Site Chat Agent reads ${platform.apiBase}${agent.base}/summary. Connect ${platform.label} first if this persists.`} />}

      <div className="ag-metrics">
        <MetricCard icon={<Svg path={Icons.chat} size={24} />} tone="purple" title="All-time calls" value={load.loading ? "—" : num(s?.totalCalls)} />
        <MetricCard icon={<Svg path={Icons.trendUp} size={24} />} tone="blue" title="Calls this month" value={load.loading ? "—" : num(s?.callsThisMonth)} />
        <MetricCard icon={<Svg path={Icons.check} size={24} />} tone="green" title="Cache hit rate" value={load.loading ? "—" : `${s?.cacheHitRate ?? 0}%`} />
        <MetricCard icon={<Svg path={Icons.database} size={24} />} tone="gold" title="Total tokens moved" value={load.loading ? "—" : num(totalTokens)} />
      </div>

      <div className="ag-stack">
        <Panel title="Cache efficiency" sub="Real calls served from cache vs regenerated, all-time">
          {s && s.totalCalls > 0 ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 30, alignItems: "center" }}>
              <RadialGauge value={s.cacheHitRate} max={100} size={150} color={agent.accent} label="cache hit rate" />
              <div style={{ flex: 1, minWidth: 200 }}>
                <DonutChart
                  data={[
                    { label: "Served from cache", value: s.cachedCalls, color: "#22c55e" },
                    { label: "Freshly generated", value: cacheMiss, color: "#f59e0b" },
                  ]}
                  total={s.totalCalls}
                  totalLabel="Calls"
                  size={150}
                />
              </div>
            </div>
          ) : (
            <Empty>{load.loading ? "Loading…" : "No calls logged yet."}</Empty>
          )}
        </Panel>

        <Panel title="Token flow" sub="Tokens sent to the model vs tokens generated back, all-time">
          {totalTokens > 0 && s ? (
            <DonutChart
              data={[
                { label: "Tokens in (prompts)", value: s.totalTokensIn, color: "#3b82f6" },
                { label: "Tokens out (replies)", value: s.totalTokensOut, color: "#8b5cf6" },
              ]}
              total={totalTokens}
              totalLabel="Tokens"
              size={150}
            />
          ) : (
            <Empty>{load.loading ? "Loading…" : "No token usage recorded yet."}</Empty>
          )}
        </Panel>

        <Panel title="Most active users" sub={proxy?.note ?? "Real users ranked by call count to the customer-facing assistant"}>
          <div style={{ overflowX: "auto" }}>
            <table className="ag-table">
              <thead><tr><th>#</th><th>User</th><th>Phone</th><th>Calls</th></tr></thead>
              <tbody>
                {load.loading && <tr><td colSpan={4} className="ag-empty">Loading…</td></tr>}
                {!load.loading && topUsers.length === 0 && <tr><td colSpan={4} className="ag-empty">No usage recorded yet.</td></tr>}
                {!load.loading && topUsers.map((u, i) => (
                  <tr key={u.user?.id ?? i}>
                    <td style={{ color: "var(--ag-ink-faint)", fontWeight: 700 }}>{i + 1}</td>
                    <td>{u.user?.name ?? "Unnamed"}</td>
                    <td style={{ color: "var(--ag-ink-faint)" }}>{u.user?.phone ?? "—"}</td>
                    <td style={{ fontWeight: 650 }}>{u.calls.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <InsightsPanel
          rows={[
            {
              icon: <Svg path={Icons.check} size={15} />,
              label: "Cache saving real spend",
              value: s && s.totalCalls > 0 ? `${s.cachedCalls.toLocaleString()} of ${s.totalCalls.toLocaleString()} calls (${s.cacheHitRate}%) never hit the model.` : "No calls logged yet.",
            },
            {
              icon: <Svg path={Icons.database} size={15} />,
              label: "Prompt vs reply weight",
              value: tokenInShare === null ? "No token usage recorded yet." : `Prompts account for ${tokenInShare}% of total token volume; replies the rest.`,
            },
            {
              icon: <Svg path={Icons.crown} size={15} />,
              label: "Busiest customer",
              value: topUsers.length > 0 ? `${topUsers[0].user?.name ?? topUsers[0].user?.phone ?? "Unknown"} — ${topUsers[0].calls.toLocaleString()} calls.` : "No usage recorded yet.",
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
                <KeyRow label="Rate limit" value={`${load.data.stats.rateLimitPerMinute}/min`} />
              </>
            ) : (
              <Empty>{load.loading ? "Loading…" : "Runtime stats unavailable."}</Empty>
            )}
          </div>
        </Panel>
      </div>
    </>
  );
}
