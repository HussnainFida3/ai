"use client";

/**
 * Ops Agent — Chat.
 *
 * A conversation with the platform's own ops agent, alongside a panel of
 * the live queue context the agent is being asked about. The suggestion chips
 * are written from the real snapshot (actual open count, actual escalation
 * count, actual busiest category), so they only ever propose questions the
 * data can answer — and they are suppressed entirely when the queue failed to
 * load, rather than inviting questions about numbers nobody has.
 */

import { useEffect, useRef, useState } from "react";
import { usePlatformParam, platformLabel, agentChat } from "@/lib/agent-data";
import { useOpsSnapshot, type OpsSnapshot } from "@/lib/ops-data";
import { ApiError, type ChatTurn } from "@/lib/api";
import {
  Card,
  Empty,
  ErrorNote,
  Icon,
  Pill,
  SpecialShell,
  type NavItem,
} from "@/components/special/kit";

const NAV: NavItem[] = [
  { label: "Overview", icon: "dashboard", slug: "overview" },
  { label: "Operational Queue", icon: "posts", slug: "queue" },
  { label: "Verifications", icon: "check", slug: "verifications" },
  { label: "Incidents", icon: "alert", slug: "incidents" },
  { label: "Chat with AI Agent", icon: "chat", slug: "chat" },
];

interface Msg {
  role: "user" | "assistant";
  content: string;
}

export default function OpsChatPage({ params }: { params: Promise<{ platform: string }> }) {
  const platform = usePlatformParam(params);
  const s = useOpsSnapshot(platform);
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
      const reply = await agentChat(platform, "ops", "Ops Agent", content, history);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : `Could not reach the ${label} ops agent.`);
    } finally {
      setBusy(false);
    }
  }

  const chips = buildChips(s, label);

  return (
    <SpecialShell
      platform={platform}
      agentLabel="Ops Agent"
      tagline="Ops workspace"
      basePath="/ops-agent-special"
      nav={NAV}
      headerIcon="chat"
      assistantBlurb="I read the live operational backlog and only report what the backend actually records."
      title="Chat"
      subtitle={`Ask the ops agent about the live ${label} queue`}
      actions={
        <Pill tone={s.error ? "red" : "green"}>
          <Icon name={s.error ? "alert" : "check"} size={12} />
          {s.error ? "Backlog offline" : "Backlog loaded"}
        </Pill>
      }
    >
      <style>{CHAT_CSS}</style>

      <div className="cs-row-2">
        <Card title="Conversation" pad={false}>
          <div className="cs-ops-log">
            {messages.length === 0 && !busy && (
              <div className="cs-ops-intro">
                <b>Ask about the {label} operational queue.</b>
                <p>
                  I can read every queue item the backend returns, its status, age and kind. I answer from that data,
                  not from memory.
                </p>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "cs-ops-turn cs-ops-turn-user" : "cs-ops-turn"}>
                <span className="cs-ops-who">{m.role === "user" ? "You" : "Support Agent"}</span>
                <div className={m.role === "user" ? "cs-ops-bubble cs-ops-bubble-user" : "cs-ops-bubble"}>
                  {m.content}
                </div>
              </div>
            ))}

            {busy && (
              <div className="cs-ops-turn">
                <span className="cs-ops-who">Ops Agent</span>
                <div className="cs-ops-bubble">
                  <span className="cs-ops-typing" aria-label="Thinking"><i /><i /><i /></span>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {error && <div className="cs-ops-error">{error}</div>}

          {chips.length > 0 && messages.length === 0 && (
            <div className="cs-ops-chips">
              {chips.map((c) => (
                <button key={c} type="button" className="cs-ops-chip" onClick={() => send(c)} disabled={busy}>
                  {c}
                </button>
              ))}
            </div>
          )}

          <div className="cs-ops-input">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Ask about the queue, a verification or an incident…"
              disabled={busy}
              aria-label="Message the ops agent"
            />
            <button type="button" className="cs-btn cs-btn-primary" onClick={() => send()} disabled={busy || !input.trim()} aria-label="Send message">
              <Icon name="send" size={15} />Send
            </button>
          </div>
        </Card>

        <Card title="Backlog in Context">
          {s.loading ? (
            <Empty>Loading live backlog…</Empty>
          ) : s.error ? (
            <Empty>The backlog could not be read, so nothing here can be verified against real data.</Empty>
          ) : !s.loaded ? (
            <Empty>No queue endpoint answered, so the agent has no backlog to reason about.</Empty>
          ) : s.items.length === 0 ? (
            <Empty>{label} returned an empty operational queue. Nothing is pending.</Empty>
          ) : (
            <div className="cs-ops-facts">
              {s.metrics.map((m) => (
                <div className="cs-ops-fact" key={m.key}>
                  <span>{m.label}</span>
                  <b className="cs-num">{m.value === null ? "Not tracked" : m.display}</b>
                </div>
              ))}
              <div className="cs-ops-facts-head">Queue Composition</div>
              {s.kindRows.map((r) => (
                <div className="cs-ops-fact" key={r.label}>
                  <span>{r.label}</span>
                  <b className="cs-num">{r.value.toLocaleString()}</b>
                </div>
              ))}
              <div className="cs-ops-facts-head">Age</div>
              {s.ageRows.slice(0, 4).map((r) => (
                <div className="cs-ops-fact" key={r.label}>
                  <span>{r.label}</span>
                  <b className="cs-num">{r.value.toLocaleString()}</b>
                </div>
              ))}
              <p className="cs-ops-note">{s.queueNote}</p>
            </div>
          )}
        </Card>
      </div>

      {s.error && <ErrorNote error={s.error} platform={platform} />}
    </SpecialShell>
  );
}

/** Chips are only offered for questions the loaded data can actually answer. */
function buildChips(s: OpsSnapshot, label: string): string[] {
  if (s.loading || s.error || !s.loaded || s.items.length === 0) return [];
  const out: string[] = [];
  if (s.verificationsSupported && s.verifications.length > 0) {
    out.push(`What is holding up the ${s.verifications.length} pending verifications?`);
  }
  if (s.incidentsSupported && s.incidents.length > 0) {
    out.push(`Walk me through the ${s.incidents.length} open incidents.`);
  }
  const oldest = s.oldestFirst.find((i) => i.ageDays !== null);
  if (oldest?.ageDays != null) out.push(`Why has the oldest item waited ${oldest.ageDays} days?`);
  if (s.clearedRate.value !== null) out.push(`How do we improve the ${s.clearedRate.value}${s.clearedRate.suffix} cleared rate?`);
  if (out.length === 0) out.push(`Summarise the ${label} operational queue.`);
  return out.slice(0, 4);
}

const CHAT_CSS = `
.cs-ops-log{height:430px;overflow-y:auto;padding:18px 19px;display:flex;flex-direction:column;gap:16px}
.cs-ops-intro{margin:auto;text-align:center;max-width:330px}
.cs-ops-intro b{font-size:13px;display:block;margin-bottom:6px}
.cs-ops-intro p{margin:0;font-size:11.5px;line-height:19px;color:#94a3b8}
.cs-ops-turn{display:flex;flex-direction:column;gap:5px;align-items:flex-start}
.cs-ops-turn-user{align-items:flex-end}
.cs-ops-who{font-size:10px;font-weight:650;color:#94a3b8;letter-spacing:.02em}
.cs-ops-bubble{max-width:82%;background:#0d1526;border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:11px 13px;font-size:12.5px;line-height:20px;white-space:pre-wrap;word-break:break-word}
.cs-ops-bubble-user{background:linear-gradient(90deg,#7238df,#8b5cf6);border-color:transparent;color:#fff}
.cs-ops-typing{display:inline-flex;gap:4px;align-items:center;height:14px}
.cs-ops-typing i{width:6px;height:6px;border-radius:50%;background:#a9b0c4;animation:cs-ops-bounce 1.1s infinite ease-in-out}
.cs-ops-typing i:nth-child(2){animation-delay:.15s}
.cs-ops-typing i:nth-child(3){animation-delay:.3s}
@keyframes cs-ops-bounce{0%,60%,100%{transform:translateY(0);opacity:.55}30%{transform:translateY(-4px);opacity:1}}
.cs-ops-chips{display:flex;flex-wrap:wrap;gap:7px;padding:0 19px 14px}
.cs-ops-chip{border:1px solid rgba(255,255,255,.09);background:#0b1220;border-radius:20px;padding:7px 12px;font-size:11.5px;color:#cbd5e1}
.cs-ops-chip:hover:not(:disabled){background:#0d1526;border-color:#c9cede}
.cs-ops-chip:disabled{opacity:.5;cursor:default}
.cs-ops-error{margin:0 19px 12px;border:1px solid rgba(244,63,94,.32);background:rgba(244,63,94,.12);color:#fda4af;border-radius:10px;padding:10px 13px;font-size:11.5px}
.cs-ops-input{display:flex;gap:9px;padding:14px 19px;border-top:1px solid rgba(255,255,255,.07)}
.cs-ops-input input{flex:1;height:38px;border:1px solid rgba(255,255,255,.09);border-radius:9px;padding:0 13px;font-size:12.5px;background:#0b1220;color:#11162d}
.cs-ops-input input:focus{outline:2px solid #7c3aed;outline-offset:1px}
.cs-ops-input input:disabled{background:#0d1526}
.cs-ops-facts{display:flex;flex-direction:column;gap:9px}
.cs-ops-facts-head{font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#94a3b8;margin-top:8px}
.cs-ops-fact{display:flex;justify-content:space-between;gap:12px;align-items:baseline;font-size:11.5px}
.cs-ops-fact span{color:#cbd5e1;min-width:0}
.cs-ops-fact b{font-weight:730;white-space:nowrap}
.cs-ops-note{margin:10px 0 0;font-size:10.5px;line-height:17px;color:#94a3b8}
`;
