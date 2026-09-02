"use client";

/**
 * Site Chat Agent — Chat.
 *
 * IMPORTANT distinction, and it is spelled out on the page itself: this is a
 * conversation with the *operations* agent that reports on the website
 * assistant. It is not the customer-facing widget, and nothing typed here is
 * ever seen by a site visitor.
 *
 * Messages go to `agentChat(platform, "site-chat", …)`, which POSTs to
 * GhrFix's /ai-agents/site-chat/chat. That is the one endpoint in this
 * workspace that costs money per call, so it fires only when a person presses
 * send or clicks a chip — never on mount.
 *
 * The chips are written from the live snapshot (the real cache rate, the real
 * caller, the real spend), so they only propose questions the data can answer,
 * and they disappear entirely when the snapshot failed. On ShadiLife there is
 * no site-chat agent behind this route at all, so no composer is rendered.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePlatformParam, platformLabel, agentChat } from "@/lib/agent-data";
import { useSiteChatSnapshot, type SiteChatSnapshot } from "@/lib/sitechat-data";
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
  { label: "Conversations", icon: "chat", slug: "conversations" },
  { label: "Usage & Cost", icon: "trend", slug: "usage" },
  { label: "Quality", icon: "target", slug: "quality" },
  { label: "Chat with AI Agent", icon: "bot", slug: "chat" },
];

interface Msg {
  role: "user" | "assistant";
  content: string;
}

export default function SiteChatChatPage({ params }: { params: Promise<{ platform: string }> }) {
  const platform = usePlatformParam(params);
  const s = useSiteChatSnapshot(platform);
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
    if (!content || busy || !s.supported) return;
    setError(null);
    setInput("");
    const history: ChatTurn[] = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content }]);
    setBusy(true);
    try {
      const reply = await agentChat(platform, "site-chat", "Site Chat Agent", content, history);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : `Could not reach the ${label} site chat agent.`);
    } finally {
      setBusy(false);
    }
  }

  const chips = buildChips(s, label);

  return (
    <SpecialShell
      platform={platform}
      agentLabel="Site Chat Agent"
      tagline="Website assistant"
      basePath="/sitechat-agent-special"
      nav={NAV}
      headerIcon="bot"
      assistantBlurb="I don't answer your customers — I report on the assistant that does: volume, cache efficiency and spend."
      title="Chat"
      subtitle={`Ask the operations agent about the ${label} website assistant — visitors never see this thread`}
      actions={
        <Pill tone={!s.supported ? "amber" : s.error ? "red" : "green"}>
          <Icon name={!s.supported ? "alert" : s.error ? "alert" : "check"} size={12} />
          {!s.supported ? "Agent not mounted" : s.error ? "Snapshot offline" : "Snapshot loaded"}
        </Pill>
      }
    >
      <style>{CHAT_CSS}</style>

      {!s.supported ? (
        <Card title={`Site Chat Agent is not available on ${label}`}>
          <div className="cs-sitechat-unsupported">
            <span><Icon name="alert" size={18} /></span>
            <div>
              <p>{s.unsupportedReason}</p>
              <p>
                There is no agent behind this route on {label}, so no message box is shown — a composer here would send
                into nothing.
              </p>
              <Link href="/sitechat-agent-special/ghrfix/chat" className="cs-btn cs-btn-primary">
                <Icon name="arrow" size={15} />Open the GhrFix workspace
              </Link>
            </div>
          </div>
        </Card>
      ) : (
        <>
          <p className="cs-sitechat-banner">
            <Icon name="alert" size={14} />
            <span>
              This is the internal operations agent, not the customer-facing chat widget. Nothing you type here reaches
              a site visitor, and no visitor conversation is answered from this page.
            </span>
          </p>

          <div className="cs-row-2">
            <Card title="Conversation" pad={false}>
              <div className="cs-sitechat-log">
                {messages.length === 0 && !busy && (
                  <div className="cs-sitechat-intro">
                    <b>Ask about the {label} website assistant.</b>
                    <p>
                      I read the same snapshot these pages do — call volume, cache hit rate, token flow and this
                      agent&apos;s own spend. I answer from that data, not from memory, and I have no transcripts to
                      quote because the backend stores none.
                    </p>
                  </div>
                )}

                {messages.map((m, i) => (
                  <div key={i} className={m.role === "user" ? "cs-sitechat-turn cs-sitechat-turn-user" : "cs-sitechat-turn"}>
                    <span className="cs-sitechat-who">{m.role === "user" ? "You" : "Site Chat Agent"}</span>
                    <div className={m.role === "user" ? "cs-sitechat-bubble cs-sitechat-bubble-user" : "cs-sitechat-bubble"}>
                      {m.content}
                    </div>
                  </div>
                ))}

                {busy && (
                  <div className="cs-sitechat-turn">
                    <span className="cs-sitechat-who">Site Chat Agent</span>
                    <div className="cs-sitechat-bubble">
                      <span className="cs-sitechat-typing" aria-label="Thinking"><i /><i /><i /></span>
                    </div>
                  </div>
                )}
                <div ref={endRef} />
              </div>

              {error && <div className="cs-sitechat-error">{error}</div>}

              {chips.length > 0 && messages.length === 0 && (
                <div className="cs-sitechat-chips">
                  {chips.map((c) => (
                    <button key={c} type="button" className="cs-sitechat-chip" onClick={() => send(c)} disabled={busy}>
                      {c}
                    </button>
                  ))}
                </div>
              )}

              <div className="cs-sitechat-input">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  placeholder="Ask about volume, cache efficiency or spend…"
                  disabled={busy}
                  aria-label="Message the site chat operations agent"
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

            <Card title="Assistant in Context">
              {s.loading ? (
                <Empty>Loading live snapshot…</Empty>
              ) : s.error ? (
                <Empty>The snapshot could not be read, so nothing here can be verified against real data. The agent may still answer, but this panel will not vouch for it.</Empty>
              ) : s.isEmpty ? (
                <Empty>{label} returned an empty snapshot — the assistant has served no logged calls for the agent to reason about.</Empty>
              ) : (
                <div className="cs-sitechat-facts">
                  {s.metrics.map((m) => (
                    <div className="cs-sitechat-fact" key={m.key}>
                      <span>{m.label}</span>
                      <b className="cs-num">
                        {m.value === null
                          ? "Not tracked"
                          : m.kind === "pct"
                            ? `${m.value}%`
                            : m.kind === "usd"
                              ? `$${m.value.toFixed(2)}`
                              : m.value.toLocaleString()}
                      </b>
                    </div>
                  ))}

                  <div className="cs-sitechat-facts-head">Runtime</div>
                  <div className="cs-sitechat-fact">
                    <span>Model</span>
                    <b className="cs-num">{s.model ?? "Not tracked"}</b>
                  </div>
                  <div className="cs-sitechat-fact">
                    <span>Rate limit</span>
                    <b className="cs-num">{s.rateLimitPerMinute === null ? "Not tracked" : `${s.rateLimitPerMinute}/min`}</b>
                  </div>

                  {s.callers.length > 0 && (
                    <>
                      <div className="cs-sitechat-facts-head">Busiest callers</div>
                      {s.callers.slice(0, 4).map((c) => (
                        <div className="cs-sitechat-fact" key={c.id}>
                          <span>{c.name}</span>
                          <b className="cs-num">{c.calls.toLocaleString()}</b>
                        </div>
                      ))}
                    </>
                  )}

                  <p className="cs-sitechat-note">{s.coverageNote}</p>
                </div>
              )}
            </Card>
          </div>

          {s.error && <ErrorNote error={s.error} platform={platform} />}
        </>
      )}
    </SpecialShell>
  );
}

/** Chips are only offered for questions the loaded data can actually answer. */
function buildChips(s: SiteChatSnapshot, label: string): string[] {
  if (!s.supported || s.loading || s.error || s.isEmpty) return [];
  const out: string[] = [];
  if (s.cacheHitRate !== null) out.push(`Why is the cache hit rate ${s.cacheHitRate}%?`);
  if (s.callsToday !== null) out.push(`What drove the ${s.callsToday.toLocaleString()} calls today?`);
  if (s.callers.length > 0) out.push(`What is ${s.callers[0].name} using the assistant for?`);
  if (s.spendThisMonthUsd !== null) out.push(`How can we reduce the $${s.spendThisMonthUsd.toFixed(2)} spent this month?`);
  if (s.avgTokensPerCall !== null) out.push(`Is ${s.avgTokensPerCall.toLocaleString()} tokens per call high?`);
  if (out.length === 0) out.push(`Summarise the ${label} website assistant's performance.`);
  return out.slice(0, 4);
}

const CHAT_CSS = `
.cs-sitechat-banner{display:flex;gap:9px;align-items:flex-start;margin:0 0 12px;border:1px solid #e3ddf7;background:#faf9ff;color:#5b4a8f;border-radius:10px;padding:11px 13px;font-size:11.5px;line-height:19px}
.cs-sitechat-banner svg{flex:0 0 auto;margin-top:2px}
.cs-sitechat-log{height:430px;overflow-y:auto;padding:18px 19px;display:flex;flex-direction:column;gap:16px}
.cs-sitechat-intro{margin:auto;text-align:center;max-width:360px}
.cs-sitechat-intro b{font-size:13px;display:block;margin-bottom:6px}
.cs-sitechat-intro p{margin:0;font-size:11.5px;line-height:19px;color:#69738c}
.cs-sitechat-turn{display:flex;flex-direction:column;gap:5px;align-items:flex-start}
.cs-sitechat-turn-user{align-items:flex-end}
.cs-sitechat-who{font-size:10px;font-weight:650;color:#69738c;letter-spacing:.02em}
.cs-sitechat-bubble{max-width:82%;background:#f5f6fa;border:1px solid #eef0f5;border-radius:12px;padding:11px 13px;font-size:12.5px;line-height:20px;white-space:pre-wrap;word-break:break-word}
.cs-sitechat-bubble-user{background:linear-gradient(90deg,#7238df,#8b5cf6);border-color:transparent;color:#fff}
.cs-sitechat-typing{display:inline-flex;gap:4px;align-items:center;height:14px}
.cs-sitechat-typing i{width:6px;height:6px;border-radius:50%;background:#a9b0c4;animation:cs-sitechat-bounce 1.1s infinite ease-in-out}
.cs-sitechat-typing i:nth-child(2){animation-delay:.15s}
.cs-sitechat-typing i:nth-child(3){animation-delay:.3s}
@keyframes cs-sitechat-bounce{0%,60%,100%{transform:translateY(0);opacity:.55}30%{transform:translateY(-4px);opacity:1}}
.cs-sitechat-chips{display:flex;flex-wrap:wrap;gap:7px;padding:0 19px 14px}
.cs-sitechat-chip{border:1px solid #dfe2ea;background:#fff;border-radius:20px;padding:7px 12px;font-size:11.5px;color:#4c5470}
.cs-sitechat-chip:hover:not(:disabled){background:#f7f8fc;border-color:#c9cede}
.cs-sitechat-chip:disabled{opacity:.5;cursor:default}
.cs-sitechat-error{margin:0 19px 12px;border:1px solid #f6d5d8;background:#fff5f5;color:#a32732;border-radius:10px;padding:10px 13px;font-size:11.5px}
.cs-sitechat-input{display:flex;gap:9px;padding:14px 19px;border-top:1px solid #eef0f5}
.cs-sitechat-input input{flex:1;height:38px;border:1px solid #dfe2ea;border-radius:9px;padding:0 13px;font-size:12.5px;background:#fff;color:#11162d}
.cs-sitechat-input input:focus{outline:2px solid #7c3aed;outline-offset:1px}
.cs-sitechat-input input:disabled{background:#f7f8fc}
.cs-sitechat-facts{display:flex;flex-direction:column;gap:9px}
.cs-sitechat-facts-head{font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#8891a8;margin-top:8px}
.cs-sitechat-fact{display:flex;justify-content:space-between;gap:12px;align-items:baseline;font-size:11.5px}
.cs-sitechat-fact span{color:#4c5470;min-width:0}
.cs-sitechat-fact b{font-weight:730;white-space:nowrap}
.cs-sitechat-note{margin:10px 0 0;font-size:10.5px;line-height:17px;color:#8891a8}
.cs-sitechat-unsupported{display:flex;gap:14px;align-items:flex-start}
.cs-sitechat-unsupported>span{width:36px;height:36px;border-radius:11px;flex:0 0 auto;display:grid;place-items:center;background:#fff6e6;color:#c9860f}
.cs-sitechat-unsupported p{margin:0 0 10px;font-size:12.5px;line-height:21px;color:#4c5470}
`;
