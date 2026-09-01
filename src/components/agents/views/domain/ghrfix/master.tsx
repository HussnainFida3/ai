"use client";

/**
 * GhrFix — Master AI — Fleet (5th tab).
 *
 * The full, interactive fleet roster the Dashboard only teases the top of:
 * every AI Owner Agent from the same `/overview` endpoint, now searchable,
 * sortable and broken out with a cost-per-call figure the Dashboard table
 * never showed. Nothing here is a separate data source — it is the same
 * `/overview` + `/budget` the Dashboard reads, just the deep-dive version.
 */

import { useMemo, useState } from "react";
import { AgentHeading } from "@/components/agents/AgentShell";
import { BarList, InsightsPanel, MetricCard, SERIES_COLORS, Svg } from "@/components/agents/rich";
import { Icons } from "@/components/agents/icons";
import type { AgentStats } from "@/lib/api";
import type { AgentViewProps } from "../../registry";
import { Badge, Empty, KeyValue, LoadError, Meter, Panel, TableWrap, dash, fmt, money, num, share, soft, useAgentData } from "../../ghrfix/_master-suite";

interface FleetRow {
  agentKey: string;
  label: string;
  callsToday: number;
  callsThisMonth: number;
  spendThisMonthUsd: number;
}

interface Budget {
  spentUsd: number;
  budgetUsd: number;
  pctUsed: number;
}

interface FleetData {
  fleet: FleetRow[];
  budget: Budget | null;
  stats: AgentStats | null;
}

type SortKey = "calls" | "spend" | "name" | "cost-per-call";

export default function GhrfixMasterFleetView({ platform, agent, api }: AgentViewProps) {
  const { data, loading, error, reload } = useAgentData<FleetData>(async () => {
    const [fleet, budget, stats] = await Promise.all([
      api.get<FleetRow[]>("/overview"),
      soft(api.get<Budget>("/budget")),
      soft(api.stats()),
    ]);
    return { fleet: Array.isArray(fleet.data) ? fleet.data : [], budget, stats };
  }, `${platform.key}:${agent.key}:fleet`);

  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("calls");
  const [activeOnly, setActiveOnly] = useState(false);

  const fleet = data?.fleet ?? [];
  const budget = data?.budget ?? null;

  const callsMonth = fleet.reduce((a, r) => a + num(r.callsThisMonth), 0);
  const spendMonth = fleet.reduce((a, r) => a + num(r.spendThisMonthUsd), 0);
  const activeAgents = fleet.filter((r) => num(r.callsThisMonth) > 0).length;
  const idleAgents = fleet.filter((r) => num(r.callsThisMonth) === 0);

  const rows = useMemo(() => {
    let list = fleet.filter((r) => r.label.toLowerCase().includes(search.trim().toLowerCase()) || r.agentKey.toLowerCase().includes(search.trim().toLowerCase()));
    if (activeOnly) list = list.filter((r) => num(r.callsThisMonth) > 0);
    const costPerCall = (r: FleetRow) => (num(r.callsThisMonth) > 0 ? num(r.spendThisMonthUsd) / num(r.callsThisMonth) : -1);
    list = [...list].sort((a, b) => {
      switch (sortKey) {
        case "spend":
          return num(b.spendThisMonthUsd) - num(a.spendThisMonthUsd);
        case "name":
          return a.label.localeCompare(b.label);
        case "cost-per-call":
          return costPerCall(b) - costPerCall(a);
        default:
          return num(b.callsThisMonth) - num(a.callsThisMonth);
      }
    });
    return list;
  }, [fleet, search, sortKey, activeOnly]);

  const mostExpensivePerCall = [...fleet]
    .filter((r) => num(r.callsThisMonth) > 0)
    .sort((a, b) => num(b.spendThisMonthUsd) / num(b.callsThisMonth) - num(a.spendThisMonthUsd) / num(a.callsThisMonth))[0] ?? null;

  const idleShareRows = idleAgents.map((r) => ({ label: r.label, value: 1 }));

  return (
    <>
      <AgentHeading
        platform={platform}
        agent={agent}
        blurb="Every AI Owner Agent, searchable and sortable — the same live usage log the Dashboard summarises, broken out agent by agent."
        actions={
          <button type="button" className="ag-btn ag-btn-ghost" onClick={reload} disabled={loading}>
            <Svg path={Icons.refresh} size={15} /> {loading ? "Refreshing…" : "Refresh"}
          </button>
        }
      />

      {error && <LoadError error={error} platformLabel={platform.label} />}

      <div className="ag-metrics">
        <MetricCard icon={<Svg path={Icons.bot} size={24} />} tone="purple" title="Fleet size" value={loading ? "—" : fmt(fleet.length)} />
        <MetricCard icon={<Svg path={Icons.sparkle} size={24} />} tone="blue" title="Active this month" value={loading ? "—" : `${activeAgents}/${fleet.length}`} />
        <MetricCard icon={<Svg path={Icons.gauge} size={24} />} tone="gold" title="Idle agents" value={loading ? "—" : fmt(idleAgents.length)} />
        <MetricCard icon={<Svg path={Icons.dollar} size={24} />} tone="green" title="Avg spend / active agent" value={loading ? "—" : activeAgents > 0 ? money(spendMonth / activeAgents) : "—"} />
      </div>

      <div className="ag-split">
        <div className="ag-stack">
          <Panel
            title="Fleet roster"
            sub={`${rows.length} of ${fleet.length} agents shown`}
            flush
            actions={
              <span style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search agent…"
                  style={{ fontSize: 11.5, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--ag-border)", background: "var(--ag-panel)", color: "var(--ag-ink)", minWidth: 140 }}
                />
                <select
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value as SortKey)}
                  style={{ fontSize: 11.5, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--ag-border)", background: "var(--ag-panel)", color: "var(--ag-ink)" }}
                >
                  <option value="calls">Sort: calls</option>
                  <option value="spend">Sort: spend</option>
                  <option value="cost-per-call">Sort: cost / call</option>
                  <option value="name">Sort: name</option>
                </select>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--ag-ink-soft)" }}>
                  <input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} />
                  Active only
                </label>
              </span>
            }
          >
            <TableWrap>
              <table className="ag-table">
                <thead>
                  <tr>
                    <th>Agent</th>
                    <th>Key</th>
                    <th style={{ textAlign: "right" }}>Today</th>
                    <th style={{ textAlign: "right" }}>This month</th>
                    <th style={{ textAlign: "right" }}>Spend</th>
                    <th style={{ textAlign: "right" }}>Cost / call</th>
                    <th style={{ textAlign: "right" }}>Share</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const pct = share(r.callsThisMonth, callsMonth);
                    const costPerCall = num(r.callsThisMonth) > 0 ? num(r.spendThisMonthUsd) / num(r.callsThisMonth) : null;
                    return (
                      <tr key={r.agentKey}>
                        <td>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 9 }}>
                            <i style={{ width: 9, height: 9, borderRadius: 3, background: SERIES_COLORS[i % SERIES_COLORS.length], display: "block", flex: "0 0 auto" }} />
                            <b style={{ fontWeight: 650 }}>{r.label}</b>
                          </span>
                        </td>
                        <td style={{ color: "var(--ag-ink-faint)", fontSize: 11.5 }}>{r.agentKey}</td>
                        <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmt(r.callsToday)}</td>
                        <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmt(r.callsThisMonth)}</td>
                        <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{money(r.spendThisMonthUsd, 3)}</td>
                        <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{costPerCall === null ? "—" : money(costPerCall, 4)}</td>
                        <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{dash(pct, "%")}</td>
                        <td>{num(r.callsThisMonth) > 0 ? <Badge kind="green">Active</Badge> : <Badge kind="mute">Idle</Badge>}</td>
                      </tr>
                    );
                  })}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={8}><Empty text={loading ? "Loading the fleet…" : "No agent matches this search."} /></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </TableWrap>
          </Panel>

          <Panel title="Idle agents" sub="Ran zero calls this calendar month">
            {idleShareRows.length > 0 ? (
              <BarList rows={idleAgents.map((r) => ({ label: r.label, value: 1 }))} color="var(--ag-ink-faint)" />
            ) : (
              <Empty text={loading ? "Loading…" : "Every agent in the fleet ran at least one call this month."} />
            )}
          </Panel>
        </div>

        <div className="ag-stack">
          <Panel title="Monthly AI budget" sub="Shared across every agent in the fleet">
            {budget ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <Meter
                  value={num(budget.spentUsd)}
                  max={num(budget.budgetUsd)}
                  color={num(budget.pctUsed) >= 80 ? "var(--ag-red)" : num(budget.pctUsed) >= 50 ? "var(--ag-amber)" : "var(--ag-green)"}
                  caption={`${fmt(budget.pctUsed)}% of ${money(budget.budgetUsd, 0)} consumed`}
                />
                <KeyValue label="Spent so far" value={money(budget.spentUsd)} />
                <KeyValue label="Remaining" value={money(Math.max(0, num(budget.budgetUsd) - num(budget.spentUsd)))} />
              </div>
            ) : (
              <Empty text={loading ? "Loading…" : "Budget endpoint unavailable."} />
            )}
          </Panel>

          <InsightsPanel
            title="Fleet insights"
            rows={[
              {
                icon: <Svg path={Icons.gauge} size={15} />,
                label: "Least efficient agent",
                value: mostExpensivePerCall
                  ? `${mostExpensivePerCall.label} costs ${money(num(mostExpensivePerCall.spendThisMonthUsd) / num(mostExpensivePerCall.callsThisMonth), 4)} per call, the highest in the fleet.`
                  : "No agent has logged a call this month.",
              },
              {
                icon: <Svg path={Icons.bot} size={15} />,
                label: "Idle roster",
                value: idleAgents.length > 0 ? `${idleAgents.map((a) => a.label).slice(0, 3).join(", ")}${idleAgents.length > 3 ? `, +${idleAgents.length - 3} more` : ""} haven't been called this month.` : "No idle agents — the whole fleet is working.",
              },
              {
                icon: <Svg path={Icons.target} size={15} />,
                label: "Search tip",
                value: "Filter by agent name or key above, or sort by cost per call to spot the least efficient agent fast.",
              },
            ]}
          />
        </div>
      </div>
    </>
  );
}
