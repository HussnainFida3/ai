"use client";

import Link from "next/link";
import { AgentHeading } from "@/components/agents/AgentShell";
import {
  AgentSidePanel,
  BarList,
  DonutChart,
  FeedRow,
  InsightsPanel,
  MetricCard,
  SERIES_COLORS,
  Svg,
} from "@/components/agents/rich";
import { Icons } from "@/components/agents/icons";
import type { AgentActivityEntry, AgentStats } from "@/lib/api";
import type { AgentViewProps } from "../registry";
import {
  ActionNote,
  Badge,
  Empty,
  KeyValue,
  LoadError,
  Meter,
  Note,
  Panel,
  TableWrap,
  ago,
  change,
  dash,
  daysElapsedThisMonth,
  daysInThisMonth,
  fmt,
  money,
  num,
  share,
  soft,
  useAction,
  useAgentData,
  useAskChat,
} from "./_master-suite";

/* ── Shapes returned by /ai-agents/master/* ──────────────────────────── */

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

interface MasterData {
  fleet: FleetRow[];
  budget: Budget | null;
  stats: AgentStats | null;
  activity: AgentActivityEntry[];
}

/**
 * GhrFix — Master AI.
 *
 * The meta-view: one row per AI Owner Agent from /overview, the shared
 * monthly budget from /budget, this agent's own runtime from /stats and its
 * audited writes from /activity. Every figure below is one of those fields
 * or arithmetic over them — nothing is estimated.
 */
export default function GhrFixMasterView({ platform, agent, api }: AgentViewProps) {
  const ask = useAskChat(platform.key, agent.key);
  const { data, loading, error, reload } = useAgentData<MasterData>(async () => {
    const [fleet, budget, stats, activity] = await Promise.all([
      api.get<FleetRow[]>("/overview"),
      soft(api.get<Budget>("/budget")),
      soft(api.stats()),
      soft(api.activity({ pageSize: 8 })),
    ]);
    return {
      fleet: Array.isArray(fleet.data) ? fleet.data : [],
      budget,
      stats,
      activity: Array.isArray(activity) ? activity : [],
    };
  }, `${platform.key}:${agent.key}`);

  const action = useAction(reload);

  const fleet = data?.fleet ?? [];
  const budget = data?.budget ?? null;
  const stats = data?.stats ?? null;

  const callsToday = fleet.reduce((a, r) => a + num(r.callsToday), 0);
  const callsMonth = fleet.reduce((a, r) => a + num(r.callsThisMonth), 0);
  const spendMonth = fleet.reduce((a, r) => a + num(r.spendThisMonthUsd), 0);
  const activeAgents = fleet.filter((r) => num(r.callsThisMonth) > 0).length;
  const idleAgents = fleet.length - activeAgents;

  // Today vs the average of the month's earlier days — a real baseline, and
  // omitted entirely on the 1st of the month when no earlier day exists.
  const elapsed = daysElapsedThisMonth();
  const priorAvg = elapsed > 1 ? (callsMonth - callsToday) / (elapsed - 1) : 0;
  const todayChange = change(callsToday, priorAvg);

  const byCalls = [...fleet].sort((a, b) => num(b.callsThisMonth) - num(a.callsThisMonth));
  const callRows = byCalls.filter((r) => num(r.callsThisMonth) > 0).map((r) => ({ label: r.label, value: num(r.callsThisMonth) }));
  const spendRows = [...fleet]
    .filter((r) => num(r.spendThisMonthUsd) > 0)
    .sort((a, b) => num(b.spendThisMonthUsd) - num(a.spendThisMonthUsd))
    .map((r) => ({ label: r.label, value: Math.round(num(r.spendThisMonthUsd) * 100) }));

  const busiest = byCalls[0] && num(byCalls[0].callsThisMonth) > 0 ? byCalls[0] : null;
  const topSpender = fleet.filter((r) => num(r.spendThisMonthUsd) > 0).sort((a, b) => num(b.spendThisMonthUsd) - num(a.spendThisMonthUsd))[0] ?? null;

  const budgetUsd = num(budget?.budgetUsd ?? stats?.monthlyBudgetUsd ?? 0);
  const spentUsd = budget ? num(budget.spentUsd) : spendMonth;
  const projectedMonthEnd = elapsed > 0 && spentUsd > 0 ? (spentUsd / elapsed) * daysInThisMonth() : null;

  const insights = [
    {
      icon: <Svg path={Icons.crown} size={15} />,
      label: "Busiest agent this month",
      value: busiest
        ? `${busiest.label} — ${fmt(busiest.callsThisMonth)} calls (${dash(share(busiest.callsThisMonth, callsMonth), "%")} of the fleet)`
        : "No agent has been called yet this month.",
    },
    {
      icon: <Svg path={Icons.dollar} size={15} />,
      label: "Spend concentration",
      value: topSpender
        ? `${topSpender.label} accounts for ${dash(share(topSpender.spendThisMonthUsd, spendMonth), "%")} of ${money(spendMonth)} spent.`
        : "No AI spend recorded this month.",
    },
    {
      icon: <Svg path={Icons.bot} size={15} />,
      label: "Fleet utilisation",
      value: fleet.length
        ? `${activeAgents} of ${fleet.length} agents ran at least one call this month; ${idleAgents} idle.`
        : "The fleet roster is empty.",
    },
    {
      icon: <Svg path={Icons.trendUp} size={15} />,
      label: "Budget pace",
      value:
        projectedMonthEnd !== null && budgetUsd > 0
          ? `At ${money(spentUsd / elapsed)}/day the month lands near ${money(projectedMonthEnd)} against a ${money(budgetUsd, 0)} budget.`
          : budgetUsd > 0
            ? `Nothing spent yet against the ${money(budgetUsd, 0)} monthly budget.`
            : "No monthly budget is configured.",
    },
    {
      icon: <Svg path={Icons.shield} size={15} />,
      label: "Runtime",
      value: stats ? `Model ${stats.model}, capped at ${stats.rateLimitPerMinute} calls/min.` : "Runtime stats unavailable.",
    },
  ];

  return (
    <>
      <AgentHeading
        platform={platform}
        agent={agent}
        blurb="Every AI Owner Agent on GhrFix, ranked by real call volume and real spend from the shared usage log."
        actions={
          <>
            <Link href={`/${platform.key}/${agent.key}/chat`} className="ag-btn ag-btn-solid">Ask Master AI →</Link>
            <button type="button" className="ag-btn ag-btn-ghost" onClick={reload} disabled={loading}>
              <Svg path={Icons.refresh} size={15} /> {loading ? "Refreshing…" : "Refresh"}
            </button>
          </>
        }
      />

      {error && <LoadError error={error} platformLabel={platform.label} />}
      <ActionNote state={action} />

      <div className="ag-metrics">
        <MetricCard
          icon={<Svg path={Icons.sparkle} size={24} />}
          tone="purple"
          title="Agent calls today"
          value={loading ? "—" : fmt(callsToday)}
          change={todayChange}
          changeLabel="vs this month's daily average"
        />
        <MetricCard icon={<Svg path={Icons.chat} size={24} />} tone="blue" title="Calls this month" value={loading ? "—" : fmt(callsMonth)} />
        <MetricCard icon={<Svg path={Icons.dollar} size={24} />} tone="green" title="AI spend this month" value={loading ? "—" : money(spendMonth)} />
        <MetricCard
          icon={<Svg path={Icons.wallet} size={24} />}
          tone="gold"
          title="Monthly budget used"
          value={loading ? "—" : budget ? `${fmt(budget.pctUsed)}%` : "—"}
        />
        <MetricCard
          icon={<Svg path={Icons.bot} size={24} />}
          tone="pink"
          title="Agents active"
          value={loading ? "—" : fleet.length ? `${activeAgents}/${fleet.length}` : "—"}
        />
      </div>

      <div className="ag-split">
        <div className="ag-stack">
          <Panel title="Call volume by agent" sub={`This calendar month · ${fmt(callsMonth)} calls across the fleet`}>
            {loading ? (
              <Note>Loading live usage…</Note>
            ) : callRows.length > 0 ? (
              <BarList rows={callRows} ranked />
            ) : (
              <Empty text="No agent has logged a call this month yet. Volume appears here the moment one runs." />
            )}
          </Panel>

          <div className="ag-duo">
            <Panel title="Spend split" sub="US cents this month, by agent">
              {spendRows.length > 0 ? (
                <DonutChart data={spendRows} total={Math.round(spendMonth * 100)} totalLabel="cents" size={150} />
              ) : (
                <Empty text={loading ? "Loading…" : "No AI spend recorded this month."} />
              )}
            </Panel>

            <Panel title="Monthly AI budget" sub="Shared across every agent">
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
                  <KeyValue label="Projected month end" value={projectedMonthEnd === null ? "—" : money(projectedMonthEnd)} />
                  <KeyValue label="Day of month" value={`${elapsed} / ${daysInThisMonth()}`} />
                </div>
              ) : (
                <Empty text={loading ? "Loading…" : "Budget endpoint unavailable."} />
              )}
            </Panel>
          </div>

          <Panel
            title="Fleet roster — top 5"
            sub={`${fleet.length} agents in the fleet`}
            flush
            actions={
              <Link href={`/${platform.key}/${agent.key}/fleet`} className="ag-btn ag-btn-ghost ag-btn-sm">
                View full Fleet →
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
                  {byCalls.slice(0, 5).map((r, i) => (
                    <tr key={r.agentKey}>
                      <td>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 9 }}>
                          <i
                            style={{
                              width: 9,
                              height: 9,
                              borderRadius: 3,
                              background: SERIES_COLORS[i % SERIES_COLORS.length],
                              display: "block",
                              flex: "0 0 auto",
                            }}
                          />
                          <b style={{ fontWeight: 650 }}>{r.label}</b>
                        </span>
                      </td>
                      <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmt(r.callsThisMonth)}</td>
                      <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{money(r.spendThisMonthUsd, 3)}</td>
                      <td>{num(r.callsThisMonth) > 0 ? <Badge kind="green">Active</Badge> : <Badge kind="mute">Idle</Badge>}</td>
                    </tr>
                  ))}
                  {byCalls.length === 0 && (
                    <tr>
                      <td colSpan={4}>
                        <Empty text={loading ? "Loading the fleet…" : "The overview endpoint returned no agents."} />
                      </td>
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
            greeting="Fleet is under control."
            blurb={
              busiest
                ? `${busiest.label} is doing the most work this month with ${fmt(busiest.callsThisMonth)} calls.`
                : "No agent has run a call this month, so there is nothing to rank yet."
            }
            todayStats={[
              { label: "Calls today", value: loading ? "—" : fmt(callsToday), icon: <Svg path={Icons.sparkle} size={17} />, tone: "purple" },
              { label: "Spend this month", value: loading ? "—" : money(spendMonth), icon: <Svg path={Icons.dollar} size={17} />, tone: "green" },
              {
                label: "Budget used",
                value: loading ? "—" : budget ? `${fmt(budget.pctUsed)}%` : "—",
                icon: <Svg path={Icons.wallet} size={17} />,
                tone: "gold",
              },
            ]}
            suggestions={["Which agent costs the most?", "Are we on track for the AI budget?", "Summarise platform health"]}
            onAsk={ask}
          />

          <InsightsPanel title="Fleet insights" rows={insights} />

          <Panel title="Master AI writes" sub="Audited actions this agent performed">
            {(data?.activity.length ?? 0) > 0 ? (
              <div>
                {data!.activity.map((a) => (
                  <FeedRow
                    key={a.id}
                    icon={<Svg path={Icons.audit} size={15} />}
                    title={a.action}
                    sub={a.targetType ? `${a.targetType}${a.targetId ? ` · ${a.targetId.slice(0, 8)}` : ""}` : undefined}
                    time={ago(a.createdAt)}
                  />
                ))}
              </div>
            ) : (
              <Note>{loading ? "Loading…" : "Master AI has not written anything yet — it is read-only until you ask it to act."}</Note>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
