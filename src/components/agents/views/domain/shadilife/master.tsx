"use client";

/**
 * ShadiLife — Master AI — Fleet (domain tab).
 *
 * Real endpoints consumed (same shared meta layer the Dashboard reads):
 *   GET /api/ai-agents/_meta/usage             → spend + calls per agent, this month
 *   GET /api/ai-agents/_meta/system            → agents/schedules/admins totals
 *   GET /api/ai-agents/_meta/dashboard-summary → pending suggestions per agent
 *   GET /api/ai-agents/_meta/activity          → the real AI event log (calls + suggestions)
 *   GET /api/admin/dashboard                   → 7-day per-agent call volume
 *
 * The Dashboard tab shows spend/calls/backlog as three separate charts;
 * this page is the actual fleet roster — every agent joined into one
 * searchable table (spend, 7-day calls, pending suggestions), plus the
 * full event log with kind/agent filters that the Dashboard has no room
 * for. Independent fetch — reloading this tab never depends on Dashboard
 * having been visited first.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { AgentHeading } from "@/components/agents/AgentShell";
import { MetricCard, Svg } from "@/components/agents/rich";
import { Icons } from "@/components/agents/icons";
import type { AgentViewProps } from "../../registry";
import {
  Empty,
  ErrorNote,
  Panel,
  Pill,
  TableWrap,
  dateTime,
  humanAction,
  num,
  pct,
  platGet,
  share,
  statusTone,
  usd,
  useLoad,
  type AdminDashboard,
  type MetaActivity,
  type MetaSummary,
  type MetaSystem,
  type MetaUsage,
} from "../../shadilife/_kit";

interface Bundle {
  usage: MetaUsage | null;
  system: MetaSystem | null;
  summary: MetaSummary | null;
  activity: MetaActivity | null;
  dash: AdminDashboard | null;
}

interface RosterRow {
  agent: string;
  spendMonthUsd: number;
  calls7d: number;
  pending: number;
}

type KindFilter = "all" | "call" | "suggestion";

export default function ShadiLifeMasterFleetView({ platform, agent }: AgentViewProps) {
  const load = useLoad<Bundle>(async () => {
    const [usage, system, summary, activity, dash] = await Promise.allSettled([
      platGet<MetaUsage>(platform, "/ai-agents/_meta/usage"),
      platGet<MetaSystem>(platform, "/ai-agents/_meta/system"),
      platGet<MetaSummary>(platform, "/ai-agents/_meta/dashboard-summary"),
      platGet<MetaActivity>(platform, "/ai-agents/_meta/activity"),
      platGet<AdminDashboard>(platform, "/admin/dashboard"),
    ]);
    const ok = <T,>(r: PromiseSettledResult<T>) => (r.status === "fulfilled" ? r.value : null);
    const bundle: Bundle = { usage: ok(usage), system: ok(system), summary: ok(summary), activity: ok(activity), dash: ok(dash) };
    if (!bundle.usage && !bundle.system && !bundle.summary && !bundle.activity && !bundle.dash) {
      throw usage.status === "rejected" ? usage.reason : new Error(`${platform.label} returned nothing.`);
    }
    return bundle;
  }, [platform.key]);

  const usage = load.data?.usage ?? null;
  const system = load.data?.system ?? null;
  const summary = load.data?.summary ?? null;
  const events = load.data?.activity?.events ?? [];
  const dash = load.data?.dash ?? null;

  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [agentFilter, setAgentFilter] = useState("all");

  const roster = useMemo<RosterRow[]>(() => {
    const map = new Map<string, RosterRow>();
    for (const a of usage?.byAgent ?? []) {
      const key = a.agent ?? "—";
      map.set(key, { agent: key, spendMonthUsd: a.spendUsd ?? 0, calls7d: 0, pending: 0 });
    }
    for (const a of dash?.aiAgentUsage ?? []) {
      const key = a.agent ?? "—";
      const row = map.get(key) ?? { agent: key, spendMonthUsd: 0, calls7d: 0, pending: 0 };
      row.calls7d = a.calls ?? 0;
      map.set(key, row);
    }
    for (const p of summary?.pendingByAgent ?? []) {
      const key = p.agent ?? "—";
      const row = map.get(key) ?? { agent: key, spendMonthUsd: 0, calls7d: 0, pending: 0 };
      row.pending = p.pending ?? 0;
      map.set(key, row);
    }
    return [...map.values()].sort((a, b) => b.spendMonthUsd - a.spendMonthUsd || b.calls7d - a.calls7d);
  }, [usage, dash, summary]);

  const filteredRoster = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? roster.filter((r) => humanAction(r.agent).toLowerCase().includes(q)) : roster;
  }, [roster, search]);

  const agentOptions = useMemo(() => {
    const set = new Set(events.map((e) => e.agent ?? "—"));
    return ["all", ...[...set].sort()];
  }, [events]);

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (kindFilter !== "all" && e.kind !== kindFilter) return false;
      if (agentFilter !== "all" && e.agent !== agentFilter) return false;
      return true;
    });
  }, [events, kindFilter, agentFilter]);

  const totalPending = (summary?.pendingByAgent ?? []).reduce((a, b) => a + (b.pending ?? 0), 0);
  const busiest = roster.length > 0 ? [...roster].sort((a, b) => b.calls7d - a.calls7d)[0] : null;
  const budgetUsedPct = share(usage?.monthlySpendUsd, usage?.monthlyBudgetUsd);

  return (
    <>
      <AgentHeading
        platform={platform}
        agent={agent}
        blurb="Every agent joined into one roster — spend, 7-day call volume and pending suggestions — plus the full, filterable AI event log."
        actions={
          <>
            <button type="button" className="ag-btn ag-btn-ghost" onClick={load.reload} disabled={load.loading}>
              <Svg path={Icons.refresh} size={15} /> {load.loading ? "Refreshing…" : "Refresh"}
            </button>
            <Link href={`/${platform.key}/${agent.key}`} className="ag-btn ag-btn-ghost">← Dashboard</Link>
          </>
        }
      />

      {load.error && <ErrorNote platform={platform} error={load.error} what="Fleet data could not load" />}

      <div className="ag-metrics">
        <MetricCard icon={<Svg path={Icons.bot} size={24} />} tone="accent" title="Agents registered" value={load.loading ? "—" : num(system?.totalAgents)} />
        <MetricCard icon={<Svg path={Icons.clock} size={24} />} tone="green" title="Schedules active" value={load.loading ? "—" : system?.activeSchedules === undefined ? "—" : `${system.activeSchedules} / ${num(system?.totalSchedules)}`} />
        <MetricCard icon={<Svg path={Icons.alert} size={24} />} tone="gold" title="Pending suggestions" value={load.loading ? "—" : totalPending.toLocaleString()} />
        <MetricCard icon={<Svg path={Icons.crown} size={24} />} tone="purple" title="Busiest agent (7d)" value={busiest ? humanAction(busiest.agent) : "—"} />
        <MetricCard icon={<Svg path={Icons.dollar} size={24} />} tone="blue" title="Budget used" value={load.loading ? "—" : budgetUsedPct === null ? "—" : pct(budgetUsedPct)} />
      </div>

      <div className="ag-split">
        <div className="ag-stack">
          <Panel
            title="Fleet roster"
            sub="Every agent this month — spend, 7-day calls, pending suggestions"
            noBody
            actions={<input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search an agent…" style={{ maxWidth: 200 }} />}
          >
            {filteredRoster.length > 0 ? (
              <TableWrap>
                <table className="ag-table">
                  <thead>
                    <tr>
                      <th>Agent</th>
                      <th style={{ textAlign: "right" }}>Spend (month)</th>
                      <th style={{ textAlign: "right" }}>Calls (7d)</th>
                      <th style={{ textAlign: "right" }}>Pending</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRoster.map((r) => (
                      <tr key={r.agent}>
                        <td style={{ fontWeight: 650 }}>{humanAction(r.agent)}</td>
                        <td style={{ textAlign: "right" }}>{usd(r.spendMonthUsd, 4)}</td>
                        <td style={{ textAlign: "right" }}>{r.calls7d.toLocaleString()}</td>
                        <td style={{ textAlign: "right" }}>
                          {r.pending > 0 ? <Pill text={r.pending} tone="amber" /> : <span style={{ color: "var(--ag-ink-faint)" }}>0</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            ) : (
              <div style={{ padding: 20 }}>
                <Empty>{load.loading ? "Loading the fleet roster…" : "No agent has recorded activity yet."}</Empty>
              </div>
            )}
          </Panel>

          <Panel
            title="AI event log"
            sub="Every real OpenAI call and suggestion, filterable by kind and agent"
            noBody
            actions={
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {(["all", "call", "suggestion"] as KindFilter[]).map((k) => (
                  <button key={k} type="button" className={`ag-btn ag-btn-sm ${kindFilter === k ? "ag-btn-solid" : "ag-btn-ghost"}`} onClick={() => setKindFilter(k)}>
                    {k === "all" ? "All" : k === "call" ? "Calls" : "Suggestions"}
                  </button>
                ))}
                <select value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)}>
                  {agentOptions.map((a) => <option key={a} value={a}>{a === "all" ? "All agents" : humanAction(a)}</option>)}
                </select>
              </div>
            }
          >
            {filteredEvents.length > 0 ? (
              <TableWrap>
                <table className="ag-table">
                  <thead>
                    <tr>
                      <th>Event</th>
                      <th>Agent</th>
                      <th>Detail</th>
                      <th>Cost</th>
                      <th>When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEvents.map((e, i) => (
                      <tr key={e.id ?? i}>
                        <td><Pill text={e.kind === "suggestion" ? "Suggestion" : "Call"} tone={e.kind === "suggestion" ? "amber" : "mute"} /></td>
                        <td style={{ fontWeight: 650 }}>{humanAction(e.agent)}</td>
                        <td style={{ color: "var(--ag-ink-soft)" }}>
                          {e.kind === "suggestion" ? (
                            <>{e.targetType ?? "—"} {e.status && <Pill text={e.status} tone={statusTone(e.status)} />}</>
                          ) : (
                            e.endpoint ?? "—"
                          )}
                        </td>
                        <td style={{ fontVariantNumeric: "tabular-nums" }}>{e.kind === "call" ? usd(e.costUsd, 4) : "—"}</td>
                        <td style={{ color: "var(--ag-ink-faint)", whiteSpace: "nowrap" }}>{dateTime(e.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            ) : (
              <div className="ag-panel-body"><Empty>{load.loading ? "Loading the event log…" : "No event matches this filter."}</Empty></div>
            )}
          </Panel>
        </div>

        <div className="ag-stack">
          <Panel title="AI layer" sub="Live configuration and budget" bodyStyle={{ display: "flex", flexDirection: "column", gap: 13 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11.5, color: "var(--ag-ink-soft)" }}>Model</span>
              <strong className="ag-display" style={{ fontSize: 13 }}>{usage?.model ?? "—"}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11.5, color: "var(--ag-ink-soft)" }}>Monthly budget</span>
              <strong className="ag-display" style={{ fontSize: 13 }}>{usd(usage?.monthlyBudgetUsd)}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11.5, color: "var(--ag-ink-soft)" }}>Spent so far</span>
              <strong className="ag-display" style={{ fontSize: 13 }}>{usd(usage?.monthlySpendUsd)}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11.5, color: "var(--ag-ink-soft)" }}>Agents in the roster</span>
              <strong className="ag-display" style={{ fontSize: 13 }}>{roster.length}</strong>
            </div>
          </Panel>

          <Panel title="Fleet insights" sub="Derived from the roster and event log above">
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {roster.length > 0 && roster[0].spendMonthUsd > 0 && (
                <div style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
                  <span style={{ color: "var(--ag-accent)", display: "grid", marginTop: 1 }}><Svg path={Icons.crown} size={15} /></span>
                  <span style={{ fontSize: 12.5, lineHeight: 1.7, color: "var(--ag-ink-soft)" }}>{humanAction(roster[0].agent)} accounts for the most spend this month, at {usd(roster[0].spendMonthUsd, 4)}.</span>
                </div>
              )}
              {busiest && busiest.calls7d > 0 && (
                <div style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
                  <span style={{ color: "var(--ag-accent)", display: "grid", marginTop: 1 }}><Svg path={Icons.trendUp} size={15} /></span>
                  <span style={{ fontSize: 12.5, lineHeight: 1.7, color: "var(--ag-ink-soft)" }}>{humanAction(busiest.agent)} ran the most calls in the last 7 days, at {busiest.calls7d.toLocaleString()}.</span>
                </div>
              )}
              {roster.filter((r) => r.pending > 0).length > 0 && (
                <div style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
                  <span style={{ color: "var(--ag-accent)", display: "grid", marginTop: 1 }}><Svg path={Icons.alert} size={15} /></span>
                  <span style={{ fontSize: 12.5, lineHeight: 1.7, color: "var(--ag-ink-soft)" }}>
                    {roster.filter((r) => r.pending > 0).length} agent(s) have suggestions waiting on a human, led by {humanAction([...roster].sort((a, b) => b.pending - a.pending)[0].agent)}.
                  </span>
                </div>
              )}
              {roster.length === 0 && <Empty>{load.loading ? "Loading…" : "No agent activity recorded yet."}</Empty>}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
