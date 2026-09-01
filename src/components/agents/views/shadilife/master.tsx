"use client";

/**
 * ShadiLife — Master AI.
 *
 * Real endpoints consumed:
 *   GET  /api/ai-agents/_meta/usage             → model, monthly budget/spend/calls, spend+calls per agent
 *   GET  /api/ai-agents/_meta/system            → agents, schedules, admins, KB articles, member count
 *   GET  /api/ai-agents/_meta/dashboard-summary → pending AI suggestions per agent, human agreement rate
 *   GET  /api/ai-agents/_meta/activity          → the real AI event log (calls + suggestions)
 *   GET  /api/admin/dashboard                   → platform trend, 7-day per-agent call volume, health
 *   POST /api/ai-agents/master/message          → the orchestration console (real tool-calling write)
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { AgentHeading } from "@/components/agents/AgentShell";
import { AgentSidePanel, AreaChart, BarList, DonutChart, InsightsPanel, MetricCard, Svg, SERIES_COLORS } from "@/components/agents/rich";
import { Icons } from "@/components/agents/icons";
import type { AgentViewProps } from "../registry";
import {
  ActionNote,
  AskAnswer,
  Empty,
  ErrorNote,
  KeyRow,
  Panel,
  Pill,
  TableWrap,
  dateTime,
  errText,
  humanAction,
  halfOverHalf,
  num,
  pct,
  platGet,
  share,
  statusTone,
  timeAgo,
  usd,
  useAsk,
  useLoad,
  type AdminDashboard,
  type MetaActivity,
  type MetaSummary,
  type MetaSystem,
  type MetaUsage,
} from "./_kit";

interface Bundle {
  usage: MetaUsage | null;
  system: MetaSystem | null;
  summary: MetaSummary | null;
  activity: MetaActivity | null;
  dash: AdminDashboard | null;
}

interface Turn {
  role: "user" | "assistant";
  content: string;
  tools?: string[];
}

export default function ShadiLifeMasterView({ platform, agent, api }: AgentViewProps) {
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

  /* ── derived, entirely from real fields ───────────────────────── */
  const spendByAgent = useMemo(
    () =>
      (usage?.byAgent ?? [])
        .filter((a) => (a.spendUsd ?? 0) > 0)
        .sort((a, b) => (b.spendUsd ?? 0) - (a.spendUsd ?? 0))
        .slice(0, 7)
        .map((a) => ({ label: humanAction(a.agent), value: Math.round((a.spendUsd ?? 0) * 10000) / 10000 })),
    [usage],
  );

  const callsByAgent = useMemo(
    () =>
      (dash?.aiAgentUsage ?? [])
        .filter((a) => (a.calls ?? 0) > 0)
        .slice(0, 8)
        .map((a) => ({ label: humanAction(a.agent), value: a.calls ?? 0 })),
    [dash],
  );

  const pendingRows = useMemo(
    () =>
      (summary?.pendingByAgent ?? [])
        .filter((p) => (p.pending ?? 0) > 0)
        .sort((a, b) => (b.pending ?? 0) - (a.pending ?? 0))
        .map((p) => ({ label: humanAction(p.agent), value: p.pending ?? 0 })),
    [summary],
  );

  const trend = useMemo(() => (dash?.registrationTrend ?? []).slice(-14), [dash]);
  const trendLabels = trend.map((t) => t.day ?? "");
  const trendUsers = trend.map((t) => t.users ?? 0);
  const trendMatches = trend.map((t) => t.matches ?? 0);
  const trendVerified = trend.map((t) => t.verified ?? 0);

  const budgetUsedPct = share(usage?.monthlySpendUsd, usage?.monthlyBudgetUsd);
  const totalPending = pendingRows.reduce((a, b) => a + b.value, 0);

  const ask = useAsk(platform, agent.key, `${platform.label} — ${agent.name}`, () =>
    `AI spend this month ${usd(usage?.monthlySpendUsd)} of ${usd(usage?.monthlyBudgetUsd)} budget across ${num(usage?.monthlyCallCount)} calls. ${totalPending} suggestions pending review.`,
  );

  /* ── the real orchestration console ───────────────────────────── */
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  function send() {
    const text = draft.trim();
    if (!text || sending) return;
    const history: Turn[] = [...turns, { role: "user", content: text }];
    setTurns(history);
    setDraft("");
    setSendError(null);
    setSending(true);
    api
      .post<{ reply?: string; toolsCalled?: string[] }>("/message", {
        messages: history.slice(-20).map((t) => ({ role: t.role, content: t.content })),
      })
      .then(({ data }) =>
        setTurns((prev) => [...prev, { role: "assistant", content: data?.reply ?? "(no reply)", tools: data?.toolsCalled ?? [] }]),
      )
      .catch((e: unknown) => setSendError(errText(e, "Master AI could not answer that.")))
      .finally(() => setSending(false));
  }

  return (
    <>
      <AgentHeading
        platform={platform}
        agent={agent}
        blurb="Orchestration across every ShadiLife agent — real spend, real call volume, the real suggestion backlog, and a command console with full tool access."
        actions={
          <>
            <Link href={`/${platform.key}/${agent.key}/chat`} className="ag-btn ag-btn-solid">Open full chat →</Link>
            <button type="button" className="ag-btn ag-btn-ghost" onClick={load.reload} disabled={load.loading}>
              <Svg path={Icons.refresh} size={15} /> {load.loading ? "Refreshing…" : "Refresh"}
            </button>
          </>
        }
      />

      {load.error && <ErrorNote platform={platform} error={load.error} what="Master AI could not load" />}

      <div className="ag-metrics">
        <MetricCard icon={<Svg path={Icons.dollar} size={24} />} tone="purple" title="AI spend this month" value={load.loading ? "—" : usd(usage?.monthlySpendUsd)} />
        <MetricCard icon={<Svg path={Icons.target} size={24} />} tone="gold" title="Budget used" value={load.loading ? "—" : budgetUsedPct === null ? "—" : pct(budgetUsedPct)} />
        <MetricCard icon={<Svg path={Icons.sparkle} size={24} />} tone="blue" title="Calls this month" value={load.loading ? "—" : num(usage?.monthlyCallCount)} />
        <MetricCard icon={<Svg path={Icons.bot} size={24} />} tone="accent" title="Agents registered" value={load.loading ? "—" : num(system?.totalAgents)} />
        <MetricCard icon={<Svg path={Icons.clock} size={24} />} tone="green" title="Schedules active" value={load.loading ? "—" : system?.activeSchedules === undefined ? "—" : `${system.activeSchedules} / ${num(system?.totalSchedules)}`} />
        <MetricCard icon={<Svg path={Icons.check} size={24} />} tone="pink" title="Human agreement" value={load.loading ? "—" : summary?.agreementRate === null || summary?.agreementRate === undefined ? "—" : pct((summary.agreementRate ?? 0) * 100)} />
      </div>

      <div className="ag-split">
        <div className="ag-stack">
          <Panel
            title="Platform activity"
            sub={trend.length > 0 ? `Real daily counts, last ${trend.length} days` : "Live from the owner dashboard"}
          >
            {trend.length > 0 ? (
              <AreaChart
                labels={trendLabels}
                series={[
                  { name: "New members", data: trendUsers, color: SERIES_COLORS[0] },
                  { name: "Verified", data: trendVerified, color: SERIES_COLORS[2] },
                  { name: "Matches", data: trendMatches, color: SERIES_COLORS[4] },
                ]}
              />
            ) : (
              <Empty>{load.loading ? "Loading live platform trend…" : "No trend data returned."}</Empty>
            )}
          </Panel>

          <div className="ag-duo">
            <Panel title="AI spend by agent" sub="This calendar month, from the usage log">
              {spendByAgent.length > 0 ? (
                <DonutChart
                  data={spendByAgent}
                  total={Math.round((usage?.monthlySpendUsd ?? 0) * 100) / 100}
                  totalLabel="USD this month"
                />
              ) : (
                <Empty>{load.loading ? "Loading…" : "No AI spend recorded this month."}</Empty>
              )}
            </Panel>

            <Panel title="Call volume by agent" sub="Real calls in the last 7 days">
              <BarList rows={callsByAgent} ranked emptyText={load.loading ? "Loading…" : "No agent calls in the last 7 days."} />
            </Panel>
          </div>

          <Panel title="Suggestion backlog" sub="AI suggestions still awaiting a human decision">
            <BarList rows={pendingRows} ranked emptyText={load.loading ? "Loading…" : "Nothing pending — every suggestion has been resolved."} />
          </Panel>

          <Panel
            title="Recent AI events"
            sub={load.data?.activity?.lastEventAt ? `Last event ${timeAgo(load.data.activity.lastEventAt)} — the Fleet tab has the full, filterable log` : "The Fleet tab has the full, filterable event log"}
            noBody
            actions={<Link href={`/${platform.key}/${agent.key}/fleet`} className="ag-btn ag-btn-ghost ag-btn-sm">View all in Fleet →</Link>}
          >
            {events.length > 0 ? (
              <TableWrap>
                <table className="ag-table">
                  <thead>
                    <tr>
                      <th>Event</th>
                      <th>Agent</th>
                      <th>Detail</th>
                      <th>When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.slice(0, 5).map((e, i) => (
                      <tr key={e.id ?? i}>
                        <td>
                          <Pill text={e.kind === "suggestion" ? "Suggestion" : "Call"} tone={e.kind === "suggestion" ? "amber" : "mute"} />
                        </td>
                        <td style={{ fontWeight: 650 }}>{humanAction(e.agent)}</td>
                        <td style={{ color: "var(--ag-ink-soft)" }}>
                          {e.kind === "suggestion" ? (
                            <>
                              {e.targetType ?? "—"} {e.status && <Pill text={e.status} tone={statusTone(e.status)} />}
                            </>
                          ) : (
                            (e.endpoint ?? "—")
                          )}
                        </td>
                        <td style={{ color: "var(--ag-ink-faint)", whiteSpace: "nowrap" }}>{dateTime(e.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            ) : (
              <Empty>{load.loading ? "Loading the event log…" : "No AI events recorded yet."}</Empty>
            )}
          </Panel>

          <Panel
            title="Orchestration console"
            sub="POST /ai-agents/master/message — full read/write tool access, every write audited"
          >
            {turns.length === 0 && !sending && (
              <p style={{ margin: "0 0 14px", fontSize: 12, color: "var(--ag-ink-faint)", lineHeight: 1.7 }}>
                Ask Master AI anything about the platform, or tell it to act — change a schedule, run an agent now, draft and publish a
                post. It never triggers a deploy, migration or restart.
              </p>
            )}
            {turns.map((t, i) => (
              <div className={`ag-msg ${t.role === "user" ? "user" : ""}`} key={i} style={{ marginBottom: 12 }}>
                <div className={`ag-msg-avatar ${t.role === "user" ? "user" : "agent"}`}>
                  {t.role === "user" ? "🧑" : <Svg path={Icons.bot} size={14} />}
                </div>
                <div className="ag-msg-bubble">
                  <span style={{ whiteSpace: "pre-wrap" }}>{t.content}</span>
                  {t.tools && t.tools.length > 0 && (
                    <div className="ag-tool-row">
                      {t.tools.map((x, j) => (
                        <span className="ag-tool-chip" key={`${x}-${j}`}>{x}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {sending && <span className="ag-typing"><i /><i /><i /></span>}
            <div className="ag-field" style={{ marginTop: 12 }}>
              <label htmlFor="master-cmd">Command</label>
              <textarea
                id="master-cmd"
                rows={2}
                value={draft}
                placeholder="e.g. How many profiles are waiting on verification right now?"
                onChange={(e) => setDraft(e.target.value)}
              />
            </div>
            <div style={{ display: "flex", gap: 9, flexWrap: "wrap", marginTop: 12 }}>
              <button type="button" className="ag-btn ag-btn-accent ag-btn-sm" onClick={send} disabled={sending || draft.trim().length === 0}>
                <Svg path={Icons.send} size={14} /> {sending ? "Working…" : "Send to Master AI"}
              </button>
              {turns.length > 0 && (
                <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" onClick={() => setTurns([])}>Clear</button>
              )}
            </div>
            <ActionNote error={sendError} />
          </Panel>

          <AskAnswer state={ask} />
        </div>

        <div className="ag-stack">
          <AgentSidePanel
            agentLabel={`${platform.label} — ${agent.name}`}
            greeting="Everything, at once."
            blurb="Master AI sees every other agent's spend, call volume and suggestion backlog — and can act on any of them."
            todayStats={[
              { label: "Model in use", value: usage?.model ?? "—", icon: <Svg path={Icons.bot} size={18} />, tone: "purple" },
              { label: "Members on platform", value: num(system?.totalUsers), icon: <Svg path={Icons.users} size={18} />, tone: "blue" },
              { label: "Suggestions pending", value: load.loading ? "—" : totalPending.toLocaleString(), icon: <Svg path={Icons.alert} size={18} />, tone: "gold" },
            ]}
            suggestions={[
              "Which agent is costing the most this month?",
              "What is sitting in the verification queue right now?",
              "Summarise this week across every agent.",
            ]}
            onAsk={ask.ask}
          />

          <Panel title="AI layer" sub="Live configuration and budget" bodyStyle={{ display: "flex", flexDirection: "column", gap: 13 }}>
            <KeyRow label="OpenAI configured" value={usage?.configured === undefined ? "—" : usage.configured ? "Yes" : "No"} tone={usage?.configured === false ? "var(--ag-red)" : undefined} />
            <KeyRow label="Model" value={usage?.model ?? "—"} />
            <KeyRow label="Monthly budget" value={usd(usage?.monthlyBudgetUsd)} />
            <KeyRow label="Spent so far" value={usd(usage?.monthlySpendUsd)} />
            <KeyRow label="Admin accounts" value={num(system?.adminCount)} />
            <KeyRow label="Knowledge base" value={system?.knowledgeBaseArticles === undefined ? "—" : `${num(system.knowledgeBaseArticles)} articles`} />
            <KeyRow label="API status" value={dash?.websiteHealth?.apiStatus ?? "—"} />
            <KeyRow label="Database" value={dash?.websiteHealth?.databaseStatus ?? "—"} tone={dash?.websiteHealth?.databaseStatus === "unreachable" ? "var(--ag-red)" : undefined} />
          </Panel>

          <InsightsPanel
            rows={[
              ...(budgetUsedPct !== null
                ? [{
                    icon: <Svg path={Icons.dollar} size={15} />,
                    label: budgetUsedPct >= 80 ? "Budget running low" : "Budget healthy",
                    value: `${pct(budgetUsedPct)} of the ${usd(usage?.monthlyBudgetUsd)} monthly cap is spent (${usd(usage?.monthlySpendUsd)}).`,
                  }]
                : []),
              ...(spendByAgent.length > 0
                ? [{
                    icon: <Svg path={Icons.crown} size={15} />,
                    label: "Costliest agent",
                    value: `${spendByAgent[0].label} accounts for ${usd(spendByAgent[0].value, 4)} of this month's AI spend.`,
                  }]
                : []),
              ...(callsByAgent.length > 0
                ? [{
                    icon: <Svg path={Icons.trendUp} size={15} />,
                    label: "Busiest agent (7d)",
                    value: `${callsByAgent[0].label} ran ${num(callsByAgent[0].value)} calls in the last week.`,
                  }]
                : []),
              ...(totalPending > 0
                ? [{
                    icon: <Svg path={Icons.alert} size={15} />,
                    label: "Waiting on a human",
                    value: `${totalPending.toLocaleString()} suggestion${totalPending === 1 ? "" : "s"} still pending, led by ${pendingRows[0].label}.`,
                  }]
                : []),
              ...(halfOverHalf(trendMatches) !== null
                ? [{
                    icon: <Svg path={Icons.sparkle} size={15} />,
                    label: "Match momentum",
                    value: `Matches are ${(halfOverHalf(trendMatches) ?? 0) >= 0 ? "up" : "down"} ${pct(Math.abs(halfOverHalf(trendMatches) ?? 0))} across the last ${trend.length} days.`,
                  }]
                : []),
              ...(summary?.agreementRate !== null && summary?.agreementRate !== undefined
                ? [{
                    icon: <Svg path={Icons.check} size={15} />,
                    label: "Humans agree with the AI",
                    value: `${pct(summary.agreementRate * 100)} of resolved suggestions were accepted rather than dismissed.`,
                  }]
                : []),
            ]}
          />
        </div>
      </div>
    </>
  );
}
