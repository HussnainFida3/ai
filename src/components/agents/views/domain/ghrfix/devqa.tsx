"use client";

/**
 * GhrFix — Developer & QA Agent — Health (5th tab).
 *
 * The full system-diagnostics surface the Dashboard only teases: the live
 * database/redis/integration breakdown with a real re-run button, the
 * complete per-agent usage table (today + month + spend + cost/call), and
 * the full top-customer-AI-users ranking. Same `/health` and `/usage`
 * endpoints as the Dashboard — nothing new on the backend.
 */

import { useCallback, useMemo, useState } from "react";
import { AgentHeading } from "@/components/agents/AgentShell";
import { InsightsPanel, MetricCard, Svg } from "@/components/agents/rich";
import { Icons } from "@/components/agents/icons";
import { ApiError, type AgentStats } from "@/lib/api";
import type { AgentViewProps } from "../../registry";
import { Empty, ErrorNote, KeyRow, Panel, Pill, TableWrap, num, share, useLoad } from "../../ghrfix/_kit-core";

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

type AgentSort = "calls" | "spend" | "cost-per-call" | "name";

export default function GhrfixDevQaHealthView({ platform, agent, api }: AgentViewProps) {
  const [health, setHealth] = useState<Health | null>(null);
  const [healthBusy, setHealthBusy] = useState(false);
  const [healthErr, setHealthErr] = useState<string | null>(null);
  const [healthCheckedAt, setHealthCheckedAt] = useState<Date | null>(null);
  const [agentSort, setAgentSort] = useState<AgentSort>("calls");
  const [agentSearch, setAgentSearch] = useState("");

  const load = useLoad(async () => {
    const [h, usage, stats] = await Promise.allSettled([api.get<Health>("/health"), api.get<Usage>("/usage"), api.stats()]);
    if (h.status === "rejected" && usage.status === "rejected") throw h.reason;
    return {
      health: h.status === "fulfilled" ? h.value.data : null,
      usage: usage.status === "fulfilled" ? usage.value.data : null,
      stats: stats.status === "fulfilled" ? (stats.value.data as AgentStats) : null,
    };
  }, [platform.key, agent.key]);

  const h = health ?? load.data?.health ?? null;
  const u = load.data?.usage ?? null;

  const runHealthCheck = useCallback(async () => {
    setHealthBusy(true);
    setHealthErr(null);
    try {
      const { data } = await api.get<Health>("/health");
      setHealth(data);
      setHealthCheckedAt(new Date());
    } catch (e) {
      setHealthErr(e instanceof ApiError ? e.message : "Could not re-run the health check.");
    } finally {
      setHealthBusy(false);
    }
  }, [api]);

  const monthRows = u?.ownerAgents.month ?? [];
  const todayByAgent = new Map((u?.ownerAgents.today ?? []).map((r) => [r.agent, r.calls]));
  const spendTotal = monthRows.reduce((a, b) => a + b.costUsd, 0);
  const allOk = h ? h.checks.database === "ok" && h.checks.redis === "ok" : null;

  const agentRows = useMemo(() => {
    let list = monthRows.filter((r) => humanAgent(r.agent).toLowerCase().includes(agentSearch.trim().toLowerCase()));
    const costPerCall = (r: AgentUsageRow) => (r.calls > 0 ? r.costUsd / r.calls : -1);
    list = [...list].sort((a, b) => {
      switch (agentSort) {
        case "spend":
          return b.costUsd - a.costUsd;
        case "cost-per-call":
          return costPerCall(b) - costPerCall(a);
        case "name":
          return humanAgent(a.agent).localeCompare(humanAgent(b.agent));
        default:
          return b.calls - a.calls;
      }
    });
    return list;
  }, [monthRows, agentSort, agentSearch]);

  return (
    <>
      <AgentHeading
        platform={platform}
        agent={agent}
        blurb="The same database/redis probe as the public health endpoint, re-runnable on demand, plus every AI agent's usage and the customer assistant's top users — sortable and searchable."
        actions={
          <button type="button" className="ag-btn ag-btn-accent" onClick={runHealthCheck} disabled={healthBusy}>
            <Svg path={Icons.refresh} size={15} /> {healthBusy ? "Checking…" : "Re-run health check"}
          </button>
        }
      />

      {load.error && <ErrorNote error={load.error} hint={`Health reads ${platform.apiBase}${agent.base}/health. Connect ${platform.label} first if this persists.`} />}
      {healthErr && <p style={{ margin: "0 0 14px", fontSize: 11.5, color: "var(--ag-red)", fontWeight: 650 }}>{healthErr}</p>}

      <div className="ag-metrics">
        <MetricCard icon={<Svg path={Icons.shield} size={24} />} tone={allOk === null ? "purple" : allOk ? "green" : "red"} title="System readiness" value={load.loading ? "—" : h ? (h.ready ? "Ready" : "Not ready") : "—"} />
        <MetricCard icon={<Svg path={Icons.database} size={24} />} tone={h?.checks.database === "ok" ? "green" : "red"} title="Database" value={load.loading ? "—" : h?.checks.database === "ok" ? "Online" : h ? "Down" : "—"} />
        <MetricCard icon={<Svg path={Icons.server} size={24} />} tone={h?.checks.redis === "ok" ? "green" : "red"} title="Redis" value={load.loading ? "—" : h?.checks.redis === "ok" ? "Online" : h ? "Down" : "—"} />
        <MetricCard icon={<Svg path={Icons.dollar} size={24} />} tone="pink" title="Owner-agent spend (month)" value={load.loading ? "—" : `$${spendTotal.toFixed(2)}`} />
      </div>

      <div className="ag-split">
        <div className="ag-stack">
          <Panel
            title="System health"
            sub={healthCheckedAt ? `Last checked ${healthCheckedAt.toLocaleTimeString()}` : "Same database/redis probe as the public /health/ready endpoint"}
          >
            {h ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
                <KeyRow label="Overall status" value={<Pill text={h.ready ? "Ready" : "Not ready"} tone={h.ready ? "green" : "red"} />} />
                <KeyRow label="Database" value={<Pill text={h.checks.database === "ok" ? "OK" : "Down"} tone={h.checks.database === "ok" ? "green" : "red"} />} />
                <KeyRow label="Redis" value={<Pill text={h.checks.redis === "ok" ? "OK" : "Down"} tone={h.checks.redis === "ok" ? "green" : "red"} />} />
                <KeyRow label="Email integration" value={<Pill text={h.configured.email ? "Configured" : "Not configured"} tone={h.configured.email ? "green" : "amber"} />} />
                <KeyRow label="Storage integration" value={<Pill text={h.configured.storage ? "Configured" : "Not configured"} tone={h.configured.storage ? "green" : "amber"} />} />
              </div>
            ) : (
              <Empty>{load.loading ? "Running health checks…" : "Health endpoint unavailable."}</Empty>
            )}
          </Panel>

          <Panel
            title="Owner AI agents"
            sub={`${agentRows.length} of ${monthRows.length} agents shown, today's calls vs this month`}
            noBody
            actions={
              <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input
                  value={agentSearch}
                  onChange={(e) => setAgentSearch(e.target.value)}
                  placeholder="Search agent…"
                  style={{ fontSize: 11.5, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--ag-border)", background: "var(--ag-panel)", color: "var(--ag-ink)", minWidth: 140 }}
                />
                <select
                  value={agentSort}
                  onChange={(e) => setAgentSort(e.target.value as AgentSort)}
                  style={{ fontSize: 11.5, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--ag-border)", background: "var(--ag-panel)", color: "var(--ag-ink)" }}
                >
                  <option value="calls">Sort: calls</option>
                  <option value="spend">Sort: spend</option>
                  <option value="cost-per-call">Sort: cost / call</option>
                  <option value="name">Sort: name</option>
                </select>
              </span>
            }
          >
            <TableWrap>
              <table className="ag-table">
                <thead>
                  <tr>
                    <th>Agent</th>
                    <th style={{ textAlign: "right" }}>Today</th>
                    <th style={{ textAlign: "right" }}>This month</th>
                    <th style={{ textAlign: "right" }}>Spend (month)</th>
                    <th style={{ textAlign: "right" }}>Cost / call</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {agentRows.map((r) => (
                    <tr key={r.agent}>
                      <td style={{ fontWeight: 650 }}>{humanAgent(r.agent)}</td>
                      <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{num(todayByAgent.get(r.agent) ?? 0)}</td>
                      <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{num(r.calls)}</td>
                      <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>${r.costUsd.toFixed(3)}</td>
                      <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{r.calls > 0 ? `$${(r.costUsd / r.calls).toFixed(4)}` : "—"}</td>
                      <td>{r.calls > 0 ? <Pill text="Active" tone="green" /> : <Pill text="Idle" tone="mute" />}</td>
                    </tr>
                  ))}
                  {agentRows.length === 0 && (
                    <tr>
                      <td colSpan={6}><Empty>{load.loading ? "Loading usage…" : "No agent matches this search."}</Empty></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </TableWrap>
          </Panel>

          <Panel title="Top customer AI users" sub="By real call volume, platform-wide" noBody>
            <TableWrap>
              <table className="ag-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th style={{ textAlign: "right" }}>Calls</th>
                  </tr>
                </thead>
                <tbody>
                  {(u?.customerAi.topUsers ?? []).map((row, i) => (
                    <tr key={row.user?.id ?? i}>
                      <td style={{ fontWeight: 650 }}>{row.user?.name ?? "Unknown user"}</td>
                      <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{num(row.calls)}</td>
                    </tr>
                  ))}
                  {(u?.customerAi.topUsers ?? []).length === 0 && (
                    <tr>
                      <td colSpan={2}><Empty>{load.loading ? "Loading…" : "The customer assistant has not been used yet."}</Empty></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </TableWrap>
          </Panel>
        </div>

        <div className="ag-stack">
          <InsightsPanel
            title="Health detail"
            rows={[
              {
                icon: <Svg path={Icons.shield} size={15} />,
                label: "Readiness",
                value: h ? `Database ${h.checks.database}, Redis ${h.checks.redis} — overall ${h.ready ? "ready" : "not ready"}.` : "Health check unavailable.",
              },
              {
                icon: <Svg path={Icons.sparkle} size={15} />,
                label: "Cache efficiency",
                value: u && u.customerAi.totalCalls > 0 ? `${u.customerAi.cachedCalls.toLocaleString()} of ${u.customerAi.totalCalls.toLocaleString()} customer AI calls served from cache (${u.customerAi.cacheHitRate}%).` : "The customer assistant has not been used yet.",
              },
              {
                icon: <Svg path={Icons.compass} size={15} />,
                label: "Token volume",
                value: u ? `${num(u.customerAi.totalTokensIn)} tokens in, ${num(u.customerAi.totalTokensOut)} tokens out, all-time.` : "—",
              },
              {
                icon: <Svg path={Icons.gauge} size={15} />,
                label: "Spend concentration",
                value: agentRows[0] && agentRows[0].costUsd > 0 ? `${humanAgent(agentRows[0].agent)} accounts for ${share(agentRows[0].costUsd, spendTotal)}% of $${spendTotal.toFixed(2)} spent this month.` : "No AI spend recorded this month.",
              },
            ]}
          />
        </div>
      </div>
    </>
  );
}
