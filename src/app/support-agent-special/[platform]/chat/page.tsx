"use client";

/**
 * Support Agent — Chat.
 *
 * A conversation with the platform's own support agent, alongside a panel of
 * the live queue context the agent is being asked about. The suggestion chips
 * are written from the real snapshot (actual open count, actual escalation
 * count, actual busiest category), so they only ever propose questions the
 * data can answer — and they are suppressed entirely when the queue failed to
 * load, rather than inviting questions about numbers nobody has.
 */

import { useEffect, useRef, useState } from "react";
import { usePlatformParam, platformLabel, agentChat } from "@/lib/agent-data";
import { useSupportSnapshot, type SupportSnapshot } from "@/lib/support-data";
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
  { label: "Tickets", icon: "posts", slug: "tickets" },
  { label: "Escalations", icon: "alert", slug: "escalations" },
  { label: "Performance", icon: "trend", slug: "performance" },
  { label: "Chat with AI Agent", icon: "chat", slug: "chat" },
];

interface Msg {
  role: "user" | "assistant";
  content: string;
}

export default function SupportChatPage({ params }: { params: Promise<{ platform: string }> }) {
  const platform = usePlatformParam(params);
  const s = useSupportSnapshot(platform);
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
      const reply = await agentChat(platform, "support", "Support Agent", content, history);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : `Could not reach the ${label} support agent.`);
    } finally {
      setBusy(false);
    }
  }

  const chips = buildChips(s, label);

  return (
    <SpecialShell
      platform={platform}
      agentLabel="Support Agent"
      tagline="Support workspace"
      basePath="/support-agent-special"
      nav={NAV}
      headerIcon="chat"
      assistantBlurb="I read the live support queue and only report what the backend actually records."
      title="Chat"
      subtitle={`Ask the support agent about the live ${label} queue`}
      actions={
        <Pill tone={s.error ? "red" : "green"}>
          <Icon name={s.error ? "alert" : "check"} size={12} />
          {s.error ? "Queue offline" : "Queue loaded"}
        </Pill>
      }
    >
      <style>{CHAT_CSS}</style>

      <div className="cs-row-2">
        <Card title="Conversation" pad={false}>
          <div className="cs-support-log">
            {messages.length === 0 && !busy && (
              <div className="cs-support-intro">
                <b>Ask about the {label} support queue.</b>
                <p>
                  I can read every ticket the backend returns, its status, age and category. I answer from that data,
                  not from memory.
                </p>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "cs-support-turn cs-support-turn-user" : "cs-support-turn"}>
                <span className="cs-support-who">{m.role === "user" ? "You" : "Support Agent"}</span>
                <div className={m.role === "user" ? "cs-support-bubble cs-support-bubble-user" : "cs-support-bubble"}>
                  {m.content}
                </div>
              </div>
            ))}

            {busy && (
              <div className="cs-support-turn">
                <span className="cs-support-who">Support Agent</span>
                <div className="cs-support-bubble">
                  <span className="cs-support-typing" aria-label="Thinking"><i /><i /><i /></span>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {error && <div className="cs-support-error">{error}</div>}

          {chips.length > 0 && messages.length === 0 && (
            <div className="cs-support-chips">
              {chips.map((c) => (
                <button key={c} type="button" className="cs-support-chip" onClick={() => send(c)} disabled={busy}>
                  {c}
                </button>
              ))}
            </div>
          )}

          <div className="cs-support-input">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Ask about a ticket, a backlog or a trend…"
              disabled={busy}
              aria-label="Message the support agent"
            />
            <button type="button" className="cs-btn cs-btn-primary" onClick={() => send()} disabled={busy || !input.trim()} aria-label="Send message">
              <Icon name="send" size={15} />Send
            </button>
          </div>
        </Card>

        <Card title="Queue in Context">
          {s.loading ? (
            <Empty>Loading live queue…</Empty>
          ) : s.error ? (
            <Empty>The queue could not be read, so nothing here can be verified against real data.</Empty>
          ) : s.isEmpty ? (
            <Empty>{label} returned an empty support queue — the agent has no tickets to reason about.</Empty>
          ) : (
            <div className="cs-support-facts">
              {s.metrics.map((m) => (
                <div className="cs-support-fact" key={m.key}>
                  <span>{m.label}</span>
                  <b className="cs-num">{m.value === null ? "Not tracked" : m.kind === "pct" ? `${m.value}%` : m.value.toLocaleString()}</b>
                </div>
              ))}
              <div className="cs-support-facts-head">Escalations</div>
              <div className="cs-support-fact">
                <span>{s.escalationRule}</span>
                <b className="cs-num">{s.escalations.length.toLocaleString()}</b>
              </div>
              {s.dimensions.slice(0, 2).map((d) => (
                <div key={d.key}>
                  <div className="cs-support-facts-head">{d.title}</div>
                  {d.rows.slice(0, 4).map((r) => (
                    <div className="cs-support-fact" key={r.label}>
                      <span>{r.label}</span>
                      <b className="cs-num">{r.value.toLocaleString()}</b>
                    </div>
                  ))}
                </div>
              ))}
              <p className="cs-support-note">{s.coverageNote}</p>
            </div>
          )}
        </Card>
      </div>

      {s.error && <ErrorNote error={s.error} platform={platform} />}
    </SpecialShell>
  );
}

/** Chips are only offered for questions the loaded data can actually answer. */
function buildChips(s: SupportSnapshot, label: string): string[] {
  if (s.loading || s.error || s.isEmpty) return [];
  const out: string[] = [];
  const open = s.tickets.filter((t) => t.statusGroup === "open" || t.statusGroup === "investigating").length;
  if (open > 0) out.push(`What are the ${open} open items about?`);
  if (s.escalations.length > 0) out.push(`Why are ${s.escalations.length} items escalated?`);
  const topCategory = s.dimensions[0]?.rows[0];
  if (topCategory) out.push(`Why is “${topCategory.label}” the biggest category?`);
  if (s.resolutionRate.value !== null) out.push(`How can we improve the ${s.resolutionRate.value}% resolution rate?`);
  if (out.length === 0) out.push(`Summarise the ${label} support queue.`);
  return out.slice(0, 4);
}

const CHAT_CSS = `
.cs-support-log{height:430px;overflow-y:auto;padding:18px 19px;display:flex;flex-direction:column;gap:16px}
.cs-support-intro{margin:auto;text-align:center;max-width:330px}
.cs-support-intro b{font-size:13px;display:block;margin-bottom:6px}
.cs-support-intro p{margin:0;font-size:11.5px;line-height:19px;color:#69738c}
.cs-support-turn{display:flex;flex-direction:column;gap:5px;align-items:flex-start}
.cs-support-turn-user{align-items:flex-end}
.cs-support-who{font-size:10px;font-weight:650;color:#69738c;letter-spacing:.02em}
.cs-support-bubble{max-width:82%;background:#f5f6fa;border:1px solid #eef0f5;border-radius:12px;padding:11px 13px;font-size:12.5px;line-height:20px;white-space:pre-wrap;word-break:break-word}
.cs-support-bubble-user{background:linear-gradient(90deg,#7238df,#8b5cf6);border-color:transparent;color:#fff}
.cs-support-typing{display:inline-flex;gap:4px;align-items:center;height:14px}
.cs-support-typing i{width:6px;height:6px;border-radius:50%;background:#a9b0c4;animation:cs-support-bounce 1.1s infinite ease-in-out}
.cs-support-typing i:nth-child(2){animation-delay:.15s}
.cs-support-typing i:nth-child(3){animation-delay:.3s}
@keyframes cs-support-bounce{0%,60%,100%{transform:translateY(0);opacity:.55}30%{transform:translateY(-4px);opacity:1}}
.cs-support-chips{display:flex;flex-wrap:wrap;gap:7px;padding:0 19px 14px}
.cs-support-chip{border:1px solid #dfe2ea;background:#fff;border-radius:20px;padding:7px 12px;font-size:11.5px;color:#4c5470}
.cs-support-chip:hover:not(:disabled){background:#f7f8fc;border-color:#c9cede}
.cs-support-chip:disabled{opacity:.5;cursor:default}
.cs-support-error{margin:0 19px 12px;border:1px solid #f6d5d8;background:#fff5f5;color:#a32732;border-radius:10px;padding:10px 13px;font-size:11.5px}
.cs-support-input{display:flex;gap:9px;padding:14px 19px;border-top:1px solid #eef0f5}
.cs-support-input input{flex:1;height:38px;border:1px solid #dfe2ea;border-radius:9px;padding:0 13px;font-size:12.5px;background:#fff;color:#11162d}
.cs-support-input input:focus{outline:2px solid #7c3aed;outline-offset:1px}
.cs-support-input input:disabled{background:#f7f8fc}
.cs-support-facts{display:flex;flex-direction:column;gap:9px}
.cs-support-facts-head{font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#8891a8;margin-top:8px}
.cs-support-fact{display:flex;justify-content:space-between;gap:12px;align-items:baseline;font-size:11.5px}
.cs-support-fact span{color:#4c5470;min-width:0}
.cs-support-fact b{font-weight:730;white-space:nowrap}
.cs-support-note{margin:10px 0 0;font-size:10.5px;line-height:17px;color:#8891a8}
`;
