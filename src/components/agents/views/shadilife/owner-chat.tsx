"use client";

/**
 * ShadiLife — Owner Chat.
 *
 * Real endpoints consumed:
 *   POST /api/ai-agents/owner-chat/message  → { reply, toolsCalled } — the real tool-calling conversation
 *   GET  /api/ai-agents/_meta/usage         → this agent's own calls + spend inside the month's AI budget
 *   GET  /api/ai-agents/_meta/activity      → the real call log, filtered to owner-chat
 *   GET  /api/admin/dashboard               → the live platform figures the owner asks about
 */

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AgentHeading } from "@/components/agents/AgentShell";
import { AgentSidePanel, AreaChart, BarList, DonutChart, InsightsPanel, MetricCard, Svg, SERIES_COLORS } from "@/components/agents/rich";
import { Icons } from "@/components/agents/icons";
import type { AgentViewProps } from "../registry";
import {
  ActionNote,
  Empty,
  ErrorNote,
  KeyRow,
  Panel,
  Pill,
  TableWrap,
  dateTime,
  errText,
  halfOverHalf,
  num,
  pct,
  pkr,
  platGet,
  share,
  tally,
  timeAgo,
  usd,
  useLoad,
  type AdminDashboard,
  type MetaActivity,
  type MetaUsage,
} from "./_kit";

interface Bundle {
  usage: MetaUsage | null;
  activity: MetaActivity | null;
  dash: AdminDashboard | null;
}

interface Turn {
  role: "user" | "assistant";
  content: string;
  tools?: string[];
}

const STARTERS = [
  "How many members signed up this week?",
  "Which cities have the most active profiles?",
  "How much revenue came in over the last 7 days?",
  "What is waiting for admin approval right now?",
];

export default function ShadiLifeOwnerChatView({ platform, agent, api }: AgentViewProps) {
  const load = useLoad<Bundle>(async () => {
    const [usage, activity, dash] = await Promise.allSettled([
      platGet<MetaUsage>(platform, "/ai-agents/_meta/usage"),
      platGet<MetaActivity>(platform, "/ai-agents/_meta/activity"),
      platGet<AdminDashboard>(platform, "/admin/dashboard"),
    ]);
    const ok = <T,>(r: PromiseSettledResult<T>) => (r.status === "fulfilled" ? r.value : null);
    const bundle: Bundle = { usage: ok(usage), activity: ok(activity), dash: ok(dash) };
    if (!bundle.usage && !bundle.activity && !bundle.dash) {
      throw dash.status === "rejected" ? dash.reason : new Error(`${platform.label} returned nothing.`);
    }
    return bundle;
  }, [platform.key]);

  const usage = load.data?.usage ?? null;
  const dash = load.data?.dash ?? null;
  const stats = dash?.stats ?? null;

  const mine = useMemo(() => (usage?.byAgent ?? []).find((a) => a.agent === "owner-chat") ?? null, [usage]);
  const myEvents = useMemo(
    () => (load.data?.activity?.events ?? []).filter((e) => e.agent === "owner-chat"),
    [load.data],
  );
  const endpointRows = useMemo(() => tally(myEvents, (e) => e.endpoint ?? null).slice(0, 6), [myEvents]);

  const otherSpend = Math.max(0, (usage?.monthlySpendUsd ?? 0) - (mine?.spendUsd ?? 0));
  const spendSplit =
    (usage?.monthlySpendUsd ?? 0) > 0
      ? [
          { label: "Owner Chat", value: Math.round((mine?.spendUsd ?? 0) * 10000) / 10000, color: SERIES_COLORS[0] },
          { label: "Every other agent", value: Math.round(otherSpend * 10000) / 10000, color: SERIES_COLORS[5] },
        ]
      : [];

  const approvals = dash?.pendingApprovalsBreakdown ?? null;
  const approvalSlices = approvals
    ? [
        { label: "New profiles", value: approvals.newProfiles ?? 0 },
        { label: "Verifications", value: approvals.verifications ?? 0 },
        { label: "Agent applications", value: approvals.agentApplications ?? 0 },
        { label: "Open reports", value: approvals.openReports ?? 0 },
      ].filter((s) => s.value > 0)
    : [];

  const cityRows = (dash?.cityDistribution ?? []).slice(0, 7).map((c) => ({ label: c.city ?? "—", value: c.users ?? 0 }));

  const trend = useMemo(() => (dash?.registrationTrend ?? []).slice(-14), [dash]);
  const trendUsers = trend.map((t) => t.users ?? 0);
  const trendMatches = trend.map((t) => t.matches ?? 0);

  const spendShare = share(mine?.spendUsd, usage?.monthlySpendUsd);

  /* ── the real conversation ────────────────────────────────────── */
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  function sendText(text: string) {
    const msg = text.trim();
    if (!msg || sending) return;
    const history: Turn[] = [...turns, { role: "user", content: msg }];
    setTurns(history);
    setDraft("");
    setSendError(null);
    setSending(true);
    api
      .post<{ reply?: string; toolsCalled?: string[] }>("/message", {
        messages: history.slice(-20).map((t) => ({ role: t.role, content: t.content })),
      })
      .then(({ data }) => {
        setTurns((prev) => [...prev, { role: "assistant", content: data?.reply ?? "(no reply)", tools: data?.toolsCalled ?? [] }]);
        requestAnimationFrame(() => bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight }));
      })
      .catch((e: unknown) => setSendError(errText(e, "Owner Chat could not answer that.")))
      .finally(() => setSending(false));
  }

  return (
    <>
      <AgentHeading
        platform={platform}
        agent={agent}
        blurb="Ask about any real ShadiLife figure and it calls a tool to fetch it — never an estimate. It also holds a scoped set of audited writes."
        actions={
          <>
            <Link href={`/${platform.key}/${agent.key}/chat`} className="ag-btn ag-btn-solid">Full-screen chat →</Link>
            <button type="button" className="ag-btn ag-btn-ghost" onClick={load.reload} disabled={load.loading}>
              <Svg path={Icons.refresh} size={15} /> {load.loading ? "Refreshing…" : "Refresh"}
            </button>
          </>
        }
      />

      {load.error && <ErrorNote platform={platform} error={load.error} what="Owner Chat could not load its context" />}

      <div className="ag-metrics">
        <MetricCard icon={<Svg path={Icons.chat} size={24} />} tone="purple" title="Owner Chat calls" value={load.loading ? "—" : num(mine?.calls)} changeLabel="this month" />
        <MetricCard icon={<Svg path={Icons.dollar} size={24} />} tone="gold" title="Its AI spend" value={load.loading ? "—" : usd(mine?.spendUsd, 4)} />
        <MetricCard icon={<Svg path={Icons.target} size={24} />} tone="pink" title="Share of AI budget" value={load.loading ? "—" : spendShare === null ? "—" : pct(spendShare)} />
        <MetricCard icon={<Svg path={Icons.users} size={24} />} tone="blue" title="Members" value={load.loading ? "—" : num(stats?.totalUsers)} change={stats?.totalUsersDelta ?? undefined} changeLabel="vs previous 7 days" />
        <MetricCard icon={<Svg path={Icons.crown} size={24} />} tone="accent" title="Premium subscribers" value={load.loading ? "—" : num(stats?.premiumSubscribers)} change={stats?.premiumSubscribersDelta ?? undefined} changeLabel="vs previous 7 days" />
        <MetricCard icon={<Svg path={Icons.alert} size={24} />} tone="red" title="Awaiting approval" value={load.loading ? "—" : num(stats?.pendingApprovals)} />
      </div>

      <div className="ag-split">
        <div className="ag-stack">
          <div className="ag-panel">
            <div className="ag-panel-head">
              <div style={{ minWidth: 0 }}>
                <div className="ag-panel-title">Conversation</div>
                <div className="ag-panel-sub">POST /ai-agents/owner-chat/message — every tool call is logged to the audit trail</div>
              </div>
              {turns.length > 0 && (
                <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" onClick={() => setTurns([])}>Clear</button>
              )}
            </div>

            <div className="ag-chat">
              <div className="ag-chat-body" ref={bodyRef}>
                {turns.length === 0 && !sending && (
                  <p style={{ margin: 0, fontSize: 12.5, color: "var(--ag-ink-faint)", lineHeight: 1.75 }}>
                    Nothing asked yet. Every answer below is fetched live from {platform.label} by a real tool call — the chips under each
                    reply name exactly which tools ran.
                  </p>
                )}
                {turns.map((t, i) => (
                  <div className={`ag-msg ${t.role === "user" ? "user" : ""}`} key={i}>
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
                {sending && (
                  <div className="ag-msg">
                    <div className="ag-msg-avatar agent"><Svg path={Icons.bot} size={14} /></div>
                    <div className="ag-msg-bubble"><span className="ag-typing"><i /><i /><i /></span></div>
                  </div>
                )}
              </div>

              {sendError && <div className="ag-error-banner">{sendError}</div>}

              <div className="ag-suggestions">
                {STARTERS.map((s) => (
                  <button type="button" className="ag-suggestion" key={s} onClick={() => sendText(s)} disabled={sending}>{s}</button>
                ))}
              </div>

              <form
                className="ag-chat-input-row"
                onSubmit={(e) => {
                  e.preventDefault();
                  sendText(draft);
                }}
              >
                <div className="ag-field" style={{ flex: 1 }}>
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={`Ask ${platform.label} anything…`}
                    aria-label="Message Owner Chat"
                  />
                </div>
                <button type="submit" className="ag-send-btn" disabled={sending || draft.trim().length === 0} aria-label="Send">
                  <Svg path={Icons.send} size={17} />
                </button>
              </form>
            </div>
          </div>

          <Panel title="What the owner is asking about" sub={trend.length > 0 ? `Real daily counts, last ${trend.length} days` : "Live platform trend"}>
            {trend.length > 0 ? (
              <AreaChart
                labels={trend.map((t) => t.day ?? "")}
                series={[
                  { name: "New members", data: trendUsers, color: SERIES_COLORS[0] },
                  { name: "Matches", data: trendMatches, color: SERIES_COLORS[4] },
                ]}
              />
            ) : (
              <Empty>{load.loading ? "Loading live platform trend…" : "No trend data returned."}</Empty>
            )}
          </Panel>

          <div className="ag-duo">
            <Panel title="Approval queue" sub="What a human still has to decide">
              {approvalSlices.length > 0 ? (
                <DonutChart data={approvalSlices} totalLabel="Pending items" />
              ) : (
                <Empty>{load.loading ? "Loading…" : "Nothing is waiting for approval."}</Empty>
              )}
            </Panel>

            <Panel title="Members by city" sub="Top cities on the platform">
              <BarList rows={cityRows} ranked emptyText={load.loading ? "Loading…" : "No city data returned."} />
            </Panel>
          </div>

          <Panel title="Owner Chat call log" sub="Real OpenAI calls this agent made, newest first" noBody>
            {myEvents.length > 0 ? (
              <TableWrap>
                <table className="ag-table">
                  <thead>
                    <tr>
                      <th>Kind</th>
                      <th>Endpoint</th>
                      <th>Cost</th>
                      <th>When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myEvents.map((e, i) => (
                      <tr key={e.id ?? i}>
                        <td><Pill text={e.kind === "suggestion" ? "Suggestion" : "Call"} tone="mute" /></td>
                        <td style={{ fontWeight: 650 }}>{e.endpoint ?? "—"}</td>
                        <td style={{ fontVariantNumeric: "tabular-nums" }}>{usd(e.costUsd, 4)}</td>
                        <td style={{ color: "var(--ag-ink-faint)", whiteSpace: "nowrap" }}>{dateTime(e.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            ) : (
              <Empty>{load.loading ? "Loading the call log…" : "Owner Chat has not been used in the last 25 AI events."}</Empty>
            )}
          </Panel>
        </div>

        <div className="ag-stack">
          <AgentSidePanel
            agentLabel={`${platform.label} — ${agent.name}`}
            greeting="Ask, don't guess."
            blurb="Owner Chat never estimates a number — it calls a real tool against the live database for every answer."
            todayStats={[
              { label: "Active today", value: num(stats?.activeToday), icon: <Svg path={Icons.users} size={18} />, tone: "blue" },
              { label: "Revenue, last 7 days", value: pkr(stats?.totalRevenue7d), icon: <Svg path={Icons.dollar} size={18} />, tone: "green" },
              { label: "Interests sent, 7 days", value: num(stats?.interestsSent), icon: <Svg path={Icons.heart ?? Icons.sparkle} size={18} />, tone: "purple" },
            ]}
            suggestions={STARTERS.slice(0, 3)}
            onAsk={sendText}
          />

          <Panel title="Most-used lookups" sub="Endpoints this agent actually hit">
            <BarList rows={endpointRows} color={SERIES_COLORS[0]} emptyText={load.loading ? "Loading…" : "No recent Owner Chat calls in the log."} />
          </Panel>

          <Panel title="Runtime" sub="From the shared AI usage log" bodyStyle={{ display: "flex", flexDirection: "column", gap: 13 }}>
            <KeyRow label="Model" value={usage?.model ?? "—"} />
            <KeyRow label="Calls this month" value={num(mine?.calls)} />
            <KeyRow label="Spend this month" value={usd(mine?.spendUsd, 4)} />
            <KeyRow label="Platform AI spend" value={usd(usage?.monthlySpendUsd)} />
            <KeyRow label="Monthly budget" value={usd(usage?.monthlyBudgetUsd)} />
            <KeyRow label="Last AI event" value={timeAgo(load.data?.activity?.lastEventAt ?? null)} />
          </Panel>

          <Panel title="Budget split" sub="Owner Chat against everything else">
            {spendSplit.length > 0 ? (
              <DonutChart data={spendSplit} total={Math.round((usage?.monthlySpendUsd ?? 0) * 100) / 100} totalLabel="USD this month" size={148} />
            ) : (
              <Empty>{load.loading ? "Loading…" : "No AI spend recorded this month."}</Empty>
            )}
          </Panel>

          <InsightsPanel
            rows={[
              ...(mine
                ? [{
                    icon: <Svg path={Icons.chat} size={15} />,
                    label: "Usage this month",
                    value: `${num(mine.calls)} conversations costing ${usd(mine.spendUsd, 4)}${spendShare !== null ? ` — ${pct(spendShare)} of all AI spend.` : "."}`,
                  }]
                : []),
              ...(stats?.matchSuccessRate !== undefined
                ? [{
                    icon: <Svg path={Icons.target} size={15} />,
                    label: "Match success rate",
                    value: `${pct(stats.matchSuccessRate)} of interests sent this week were mutually accepted.`,
                  }]
                : []),
              ...(halfOverHalf(trendUsers) !== null
                ? [{
                    icon: <Svg path={Icons.trendUp} size={15} />,
                    label: "Signup momentum",
                    value: `New members are ${(halfOverHalf(trendUsers) ?? 0) >= 0 ? "up" : "down"} ${pct(Math.abs(halfOverHalf(trendUsers) ?? 0))} over the last ${trend.length} days.`,
                  }]
                : []),
              ...(approvalSlices.length > 0
                ? [{
                    icon: <Svg path={Icons.alert} size={15} />,
                    label: "Biggest queue",
                    value: `${approvalSlices.slice().sort((a, b) => b.value - a.value)[0].label} — ${num(approvalSlices.slice().sort((a, b) => b.value - a.value)[0].value)} item(s) waiting.`,
                  }]
                : []),
              ...(cityRows.length > 0
                ? [{
                    icon: <Svg path={Icons.users} size={15} />,
                    label: "Largest city",
                    value: `${cityRows[0].label} leads with ${num(cityRows[0].value)} members.`,
                  }]
                : []),
            ]}
          />

          <ActionNote error={null} />
        </div>
      </div>
    </>
  );
}
