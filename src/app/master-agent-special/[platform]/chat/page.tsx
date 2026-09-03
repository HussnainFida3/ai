"use client";

/**
 * Master AI — Chat.
 *
 * A conversation with the platform's own Master agent, next to a panel of the
 * live fleet context it is being asked about. `agentChat` routes to GhrFix's
 * POST /ai-agents/master/chat or ShadiLife's shared POST /ai-agents/ask.
 *
 * The suggestion chips are written from the loaded snapshot — the actual
 * busiest agent, the actual budget percentage, the actual number of agents
 * that failed to report — so they only ever propose questions the data can
 * answer, and they disappear entirely when the fleet failed to load rather
 * than inviting questions about numbers nobody has.
 */

import { useEffect, useRef, useState } from "react";
import { usePlatformParam, platformLabel, agentChat } from "@/lib/agent-data";
import { useMasterSnapshot, usd, count, type MasterSnapshot } from "@/lib/master-data";
import { ApiError, type ChatTurn } from "@/lib/api";
import { Card, Empty, ErrorNote, Icon, Pill, SpecialShell, type NavItem } from "@/components/special/kit";

const NAV: NavItem[] = [
  { label: "Overview", icon: "dashboard", slug: "overview" },
  { label: "Fleet", icon: "users", slug: "fleet" },
  { label: "Spend", icon: "trend", slug: "spend" },
  { label: "Activity", icon: "pulse", slug: "activity" },
  { label: "Chat with AI Agent", icon: "chat", slug: "chat" },
];

interface Msg {
  role: "user" | "assistant";
  content: string;
}

export default function MasterChatPage({ params }: { params: Promise<{ platform: string }> }) {
  const platform = usePlatformParam(params);
  const s = useMasterSnapshot(platform);
  const label = platformLabel(platform);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || busy) return;
    setError(null);
    setInput("");
    const history: ChatTurn[] = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content }]);
    setBusy(true);
    try {
      const reply = await agentChat(platform, "master", "Master AI", content, history);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : `Could not reach the ${label} Master agent.`);
    } finally {
      setBusy(false);
    }
  }

  const chips = buildChips(s, label);

  return (
    <SpecialShell
      platform={platform}
      agentLabel="Master AI"
      tagline="Fleet telemetry"
      basePath="/master-agent-special"
      nav={NAV}
      headerIcon="chat"
      assistantBlurb="I watch every other agent on this platform — calls, spend and activity — and only report what the backend records."
      title="Chat"
      subtitle={`Ask the Master agent about the live ${label} fleet`}
      actions={
        <Pill tone={s.error ? "red" : s.unreportedCount > 0 ? "amber" : "green"}>
          <Icon name={s.error ? "alert" : s.unreportedCount > 0 ? "clock" : "check"} size={12} />
          {s.error ? "Fleet offline" : s.loading ? "Loading fleet" : `${s.reportedCount}/${s.registryCount} reporting`}
        </Pill>
      }
    >
      <style>{CSS}</style>

      <div className="cs-row-2">
        <Card title="Conversation" pad={false}>
          <div className="cs-master-log">
            {messages.length === 0 && !busy && (
              <div className="cs-master-intro">
                <b>Ask about the {label} agent fleet.</b>
                <p>
                  I can read what every other agent on this platform did this month — its calls, its spend and its
                  events. I answer from that data, and I say so when an agent did not report rather than calling it zero.
                </p>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "cs-master-turn cs-master-turn-user" : "cs-master-turn"}>
                <span className="cs-master-who">{m.role === "user" ? "You" : "Master AI"}</span>
                <div className={m.role === "user" ? "cs-master-bubble cs-master-bubble-user" : "cs-master-bubble"}>
                  {m.content}
                </div>
              </div>
            ))}

            {busy && (
              <div className="cs-master-turn">
                <span className="cs-master-who">Master AI</span>
                <div className="cs-master-bubble">
                  <span className="cs-master-typing" aria-label="Thinking"><i /><i /><i /></span>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {error && <div className="cs-master-chat-error">{error}</div>}

          {chips.length > 0 && messages.length === 0 && (
            <div className="cs-master-chips">
              {chips.map((c) => (
                <button key={c} type="button" className="cs-master-chip" onClick={() => send(c)} disabled={busy}>
                  {c}
                </button>
              ))}
            </div>
          )}

          <div className="cs-master-input">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Ask about an agent, the budget or a spike…"
              disabled={busy}
              aria-label="Message the Master agent"
            />
            <button
              type="button"
              className="cs-btn cs-btn-primary"
              onClick={() => send()}
              disabled={busy || !input.trim()}
              aria-label="Send message"
            >
              <Icon name="send" size={15} />Send
            </button>
          </div>
        </Card>

        <Card title="Fleet in Context">
          {s.loading ? (
            <Empty>Loading the live fleet…</Empty>
          ) : s.error ? (
            <Empty>
              The fleet could not be read, so nothing here can be verified against real data. Treat anything the agent
              says about totals as unconfirmed.
            </Empty>
          ) : (
            <div className="cs-master-facts">
              <div className="cs-master-fact"><span>Agents reporting</span><b className="cs-num">{s.reportedCount} / {s.registryCount}</b></div>
              <div className="cs-master-fact"><span>Did not report</span><b className="cs-num">{s.unreportedCount}</b></div>
              <div className="cs-master-fact"><span>Active / idle</span><b className="cs-num">{s.activeCount} / {s.idleCount}</b></div>
              <div className="cs-master-fact"><span>Calls this month</span><b className="cs-num">{count(s.totalCalls)}</b></div>
              <div className="cs-master-fact"><span>Spend this month</span><b className="cs-num">{usd(s.totalSpendUsd)}</b></div>
              <div className="cs-master-fact"><span>Monthly budget</span><b className="cs-num">{s.monthlyBudgetUsd === null ? "Not published" : usd(s.monthlyBudgetUsd, 0)}</b></div>
              <div className="cs-master-fact"><span>Budget used</span><b className="cs-num">{s.budgetUsedPct === null ? "—" : `${s.budgetUsedPct}%`}</b></div>
              <div className="cs-master-fact"><span>Cost / call</span><b className="cs-num">{s.fleetCostPerCallUsd === null ? "—" : usd(s.fleetCostPerCallUsd, 4)}</b></div>
              <div className="cs-master-fact"><span>Model</span><b>{s.model ?? "Not reported"}</b></div>
              <div className="cs-master-fact"><span>Events in feed</span><b className="cs-num">{s.events.length.toLocaleString()}</b></div>

              <div className="cs-master-facts-head">Top agents by calls</div>
              {s.callsByAgent.length === 0 ? (
                <Empty>No reporting agent made a call.</Empty>
              ) : (
                s.callsByAgent.slice(0, 5).map((r) => (
                  <div className="cs-master-fact" key={r.label}>
                    <span>{r.label}</span>
                    <b className="cs-num">{r.value.toLocaleString()}</b>
                  </div>
                ))
              )}

              {s.unreportedCount > 0 && (
                <>
                  <div className="cs-master-facts-head">Unreported</div>
                  {s.rows.filter((r) => !r.reported).slice(0, 5).map((r) => (
                    <div className="cs-master-fact" key={r.key}>
                      <span>{r.name}</span>
                      <b>Unknown</b>
                    </div>
                  ))}
                </>
              )}

              <p className="cs-master-chat-note">{s.coverageNote}</p>
              <p className="cs-master-chat-note">{s.sourceNote}</p>
            </div>
          )}
        </Card>
      </div>

      {s.error && <ErrorNote error={s.error} platform={platform} />}
    </SpecialShell>
  );
}

/** Chips are only offered for questions the loaded snapshot can actually answer. */
function buildChips(s: MasterSnapshot, label: string): string[] {
  if (s.loading || s.error) return [];
  const out: string[] = [];
  if (s.busiest && (s.busiest.calls ?? 0) > 0) {
    out.push(`Why is ${s.busiest.name} making ${count(s.busiest.calls)} calls this month?`);
  }
  if (s.topSpender && (s.topSpender.spendUsd ?? 0) > 0) {
    out.push(`Can we reduce ${s.topSpender.name}'s ${usd(s.topSpender.spendUsd)} of spend?`);
  }
  if (s.budgetUsedPct !== null) out.push(`We are at ${s.budgetUsedPct}% of budget — will we finish the month inside it?`);
  if (s.unreportedCount > 0) out.push(`Which ${s.unreportedCount} agents are not reporting, and why?`);
  if (s.idleCount > 0) out.push(`${s.idleCount} agents made no calls at all — should they be switched off?`);
  if (out.length === 0) out.push(`Summarise the ${label} agent fleet.`);
  return out.slice(0, 4);
}

const CSS = `
.cs-master-log{height:430px;overflow-y:auto;padding:18px 19px;display:flex;flex-direction:column;gap:16px}
.cs-master-intro{margin:auto;text-align:center;max-width:340px}
.cs-master-intro b{font-size:13px;display:block;margin-bottom:6px}
.cs-master-intro p{margin:0;font-size:11.5px;line-height:19px;color:#94a3b8}
.cs-master-turn{display:flex;flex-direction:column;gap:5px;align-items:flex-start}
.cs-master-turn-user{align-items:flex-end}
.cs-master-who{font-size:10px;font-weight:650;color:#94a3b8;letter-spacing:.02em}
.cs-master-bubble{max-width:82%;background:#0d1526;border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:11px 13px;font-size:12.5px;line-height:20px;white-space:pre-wrap;word-break:break-word}
.cs-master-bubble-user{background:linear-gradient(90deg,#7238df,#8b5cf6);border-color:transparent;color:#fff}
.cs-master-typing{display:inline-flex;gap:4px;align-items:center;height:14px}
.cs-master-typing i{width:6px;height:6px;border-radius:50%;background:#a9b0c4;animation:cs-master-bounce 1.1s infinite ease-in-out}
.cs-master-typing i:nth-child(2){animation-delay:.15s}
.cs-master-typing i:nth-child(3){animation-delay:.3s}
@keyframes cs-master-bounce{0%,60%,100%{transform:translateY(0);opacity:.55}30%{transform:translateY(-4px);opacity:1}}
.cs-master-chips{display:flex;flex-wrap:wrap;gap:7px;padding:0 19px 14px}
.cs-master-chip{border:1px solid rgba(255,255,255,.09);background:#0b1220;border-radius:20px;padding:7px 12px;font-size:11.5px;color:#cbd5e1}
.cs-master-chip:hover:not(:disabled){background:#0d1526;border-color:#c9cede}
.cs-master-chip:disabled{opacity:.5;cursor:default}
.cs-master-chat-error{margin:0 19px 12px;border:1px solid rgba(244,63,94,.32);background:rgba(244,63,94,.12);color:#fda4af;border-radius:10px;padding:10px 13px;font-size:11.5px}
.cs-master-input{display:flex;gap:9px;padding:14px 19px;border-top:1px solid rgba(255,255,255,.07)}
.cs-master-input input{flex:1;height:38px;border:1px solid rgba(255,255,255,.09);border-radius:9px;padding:0 13px;font-size:12.5px;background:#0b1220;color:#11162d}
.cs-master-input input:focus{outline:2px solid #7c3aed;outline-offset:1px}
.cs-master-input input:disabled{background:#0d1526}
.cs-master-facts{display:flex;flex-direction:column;gap:9px}
.cs-master-facts-head{font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#94a3b8;margin-top:8px}
.cs-master-fact{display:flex;justify-content:space-between;gap:12px;align-items:baseline;font-size:11.5px}
.cs-master-fact span{color:#cbd5e1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cs-master-fact b{font-weight:730;white-space:nowrap}
.cs-master-chat-note{margin:10px 0 0;font-size:10.5px;line-height:17px;color:#94a3b8}
`;
