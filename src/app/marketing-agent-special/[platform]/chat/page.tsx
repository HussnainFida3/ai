"use client";

/**
 * Marketing Agent — Chat.
 *
 * Wired to the real backend through `agentChat(platform, "marketing", …)`,
 * which absorbs the difference between GhrFix's per-agent chat route and
 * ShadiLife's shared ask route. The suggestion chips and the side panel are
 * both computed from the live snapshot, so every prompt offered names a code,
 * a broadcast or a segment that actually exists.
 *
 * Chat is the only network write on this page, and it is user-initiated.
 * No promo is created and no broadcast is sent from here.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { usePlatformParam, agentChat, platformLabel } from "@/lib/agent-data";
import { useMarketingSnapshot, type MarketingSnapshot } from "@/lib/marketing-data";
import type { ChatTurn } from "@/lib/api";
import {
  Card,
  Empty,
  ErrorNote,
  Icon,
  Pill,
  Robot,
  SpecialShell,
  type NavItem,
} from "@/components/special/kit";

const NAV: NavItem[] = [
  { label: "Overview", icon: "dashboard", slug: "overview" },
  { label: "Campaigns", icon: "tag", slug: "campaigns" },
  { label: "Audience", icon: "users", slug: "audience" },
  { label: "Chat with AI Agent", icon: "chat", slug: "chat" },
];

interface Msg {
  role: "user" | "assistant";
  content: string;
}

export default function MarketingChatPage({ params }: { params: Promise<{ platform: string }> }) {
  const platform = usePlatformParam(params);
  const m = useMarketingSnapshot(platform);
  const label = platformLabel(platform);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages, sending]);

  /* Chips are questions the live snapshot can actually ground. */
  const suggestions = useMemo(() => buildSuggestions(m, label), [m, label]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const history: ChatTurn[] = messages.map((x) => ({ role: x.role, content: x.content }));
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setDraft("");
    setSending(true);
    setChatError(null);

    try {
      const reply = await agentChat(platform, "marketing", "Marketing Agent", trimmed, history);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      setChatError(err instanceof Error ? err.message : "The agent could not be reached.");
    } finally {
      setSending(false);
    }
  }

  const contextCount = m.capabilities.promoCodes ? m.promos.length + m.broadcasts.length : m.events.length + m.segments.length;

  return (
    <SpecialShell
      platform={platform}
      agentLabel="Marketing Agent"
      tagline="Marketing workspace"
      basePath="/marketing-agent-special"
      nav={NAV}
      headerIcon="chat"
      assistantBlurb="I can read every promo code, broadcast and segment this platform exposes."
      title="Chat"
      subtitle={`Ask the marketing agent about the live ${label} campaign data`}
      actions={
        <Pill tone={m.error ? "red" : m.loading ? "amber" : "green"}>
          <Icon name={m.error ? "alert" : m.loading ? "clock" : "check"} size={12} />
          {m.error ? "Data unavailable" : m.loading ? "Loading data" : `${contextCount} records in context`}
        </Pill>
      }
    >
      <style>{CSS}</style>

      {m.error && <ErrorNote error={m.error} platform={platform} />}

      <div className="cs-row-2">
        <Card title="Conversation" pad={false}>
          <div className="cs-marketing-log" role="log" aria-live="polite" aria-label="Conversation with the marketing agent">
            {messages.length === 0 && (
              <div className="cs-marketing-intro">
                <Robot scale={0.9} />
                <b>Ask about {label} marketing.</b>
                <p>
                  I can read what this platform exposes — promo codes, broadcasts, segments and this agent&apos;s own
                  activity. Pick a starting point below or type your own question.
                </p>
              </div>
            )}

            {messages.map((x, i) => (
              <div key={i} className={x.role === "user" ? "cs-marketing-turn cs-marketing-turn-user" : "cs-marketing-turn"}>
                <span className="cs-marketing-who">{x.role === "user" ? "You" : "Marketing Agent"}</span>
                <div className={x.role === "user" ? "cs-marketing-bubble cs-marketing-bubble-user" : "cs-marketing-bubble"}>
                  {x.content}
                </div>
              </div>
            ))}

            {sending && (
              <div className="cs-marketing-turn">
                <span className="cs-marketing-who">Marketing Agent</span>
                <div className="cs-marketing-bubble cs-marketing-typing" aria-label="The agent is typing">
                  <i /><i /><i />
                </div>
              </div>
            )}

            <div ref={endRef} />
          </div>

          {chatError && (
            <div className="cs-marketing-chat-error">
              <div className="cs-error" style={{ borderRadius: 10 }}>
                <span className="cs-error-icon"><Icon name="alert" size={15} /></span>
                <div>
                  <b>{chatError}</b>
                  <span>The message was not delivered. Check the {label} backend is running, then send it again.</span>
                </div>
              </div>
            </div>
          )}

          {suggestions.length > 0 && (
            <div className="cs-marketing-chips">
              {suggestions.map((s) => (
                <button key={s} type="button" className="cs-marketing-chip" onClick={() => void send(s)} disabled={sending}>
                  <Icon name="sparkle" size={12} />
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className="cs-marketing-input">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(draft);
                }
              }}
              placeholder={sending ? "Waiting for the agent…" : "Ask about a code, a broadcast or who to target next…"}
              aria-label="Message the marketing agent"
              disabled={sending}
            />
            <button
              type="button"
              className="cs-btn cs-btn-primary"
              onClick={() => void send(draft)}
              disabled={sending || draft.trim().length === 0}
              aria-label="Send message"
            >
              <Icon name="send" size={15} />
              Send
            </button>
          </div>
        </Card>

        <Card title="Marketing Data in Context">
          {m.loading ? (
            <Empty>Loading live marketing data…</Empty>
          ) : m.error ? (
            <Empty>
              The {label} marketing endpoints did not respond, so the agent has no live campaign data to reason
              about here. It can still answer, but nothing on this panel can be verified.
            </Empty>
          ) : (
            <div className="cs-marketing-facts">
              <Fact label="Promo codes" value={m.promoCount === null ? "Not exposed" : m.promoCount.toLocaleString()} />
              <Fact label="Active codes" value={m.activePromoCount === null ? "Not exposed" : m.activePromoCount.toLocaleString()} />
              <Fact label="Total redemptions" value={m.totalRedemptions === null ? "Not exposed" : m.totalRedemptions.toLocaleString()} />
              <Fact label="Redemption rate" value={m.redemptionRatePct === null ? "No capped code" : `${m.redemptionRatePct}%`} />
              <Fact label="Broadcasts in log" value={m.broadcastCount === null ? "Not exposed" : m.broadcastCount.toLocaleString()} />
              <Fact label="People reached" value={m.totalRecipients === null ? "Not exposed" : m.totalRecipients.toLocaleString()} />
              <Fact label="Named segments" value={m.capabilities.segments ? m.segments.length.toLocaleString() : "Not exposed"} />
              <Fact label="Agent events logged" value={m.capabilities.activityLog ? m.events.length.toLocaleString() : "Not exposed"} />

              {m.topRedeemed.length > 0 && (
                <>
                  <div className="cs-marketing-facts-head">Most redeemed codes</div>
                  {m.topRedeemed.slice(0, 5).map((r) => (
                    <Fact key={r.label} label={r.label} value={r.value.toLocaleString()} />
                  ))}
                </>
              )}

              {m.capabilities.segments && m.segments.length > 0 && (
                <>
                  <div className="cs-marketing-facts-head">Segments</div>
                  {m.segments.slice(0, 6).map((s) => (
                    <Fact key={s} label={s} value="Name only" />
                  ))}
                </>
              )}

              <p className="cs-marketing-note">
                {m.capabilities.promoCodes
                  ? "Everything above is read straight from the live promo and broadcast tables."
                  : `${label} exposes no campaign listing, so the agent's context here is its segment list and its own activity log.`}
              </p>
            </div>
          )}
        </Card>
      </div>
    </SpecialShell>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="cs-marketing-fact">
      <span>{label}</span>
      <b className="cs-num">{value}</b>
    </div>
  );
}

/** Prompts derived from the real snapshot, so every chip is answerable. */
function buildSuggestions(m: MarketingSnapshot, label: string): string[] {
  if (m.loading || m.error) return [];
  const out: string[] = [];

  if ((m.unusedPromoCount ?? 0) > 0) out.push(`Why have ${m.unusedPromoCount} promo codes never been redeemed?`);
  if (m.topRedeemed.length > 0) out.push(`What makes ${m.topRedeemed[0].label} my best performing code?`);
  if ((m.expiredPromoCount ?? 0) > 0) out.push(`Should I renew the ${m.expiredPromoCount} expired promo codes?`);
  if (m.largestBroadcast) out.push(`How did “${m.largestBroadcast.title}” perform?`);
  if (m.byAudience.length > 0) out.push(`Which audience am I under-targeting on ${label}?`);
  if (m.segments.length > 0) out.push(`What campaign would work for the ${m.segments[0]} segment?`);
  if (out.length === 0) out.push(`What marketing data does ${label} expose right now?`);

  return out.slice(0, 5);
}

/* Chat-only styles. Every selector is `cs-marketing-*` prefixed so nothing
   here escapes this page onto the other special workspaces. */
const CSS = `
.cs-marketing-log{padding:18px 19px;display:flex;flex-direction:column;gap:15px;min-height:340px;max-height:52vh;overflow-y:auto}
.cs-marketing-intro{text-align:center;margin:auto;max-width:340px}
.cs-marketing-intro b{display:block;font-size:13px;margin-top:6px}
.cs-marketing-intro p{margin:6px 0 0;font-size:11.5px;line-height:19px;color:#94a3b8}
.cs-marketing-turn{display:flex;flex-direction:column;align-items:flex-start;gap:4px;max-width:78%}
.cs-marketing-turn-user{align-self:flex-end;align-items:flex-end}
.cs-marketing-who{font-size:10px;font-weight:650;color:#94a3b8}
.cs-marketing-bubble{background:#0d1526;border:1px solid rgba(255,255,255,.07);border-radius:13px 13px 13px 4px;padding:11px 14px;font-size:12px;line-height:20px;color:#f1f5f9;white-space:pre-wrap;word-break:break-word}
.cs-marketing-bubble-user{background:linear-gradient(90deg,#7440df,#8b5cf6);border:0;color:#fff;border-radius:13px 13px 4px 13px}
.cs-marketing-typing{display:flex;gap:5px;align-items:center;padding:14px}
.cs-marketing-typing i{width:6px;height:6px;border-radius:50%;background:#a9b0c6;animation:cs-marketing-blink 1.2s infinite}
.cs-marketing-typing i:nth-child(2){animation-delay:.18s}
.cs-marketing-typing i:nth-child(3){animation-delay:.36s}
@keyframes cs-marketing-blink{0%,80%,100%{opacity:.3}40%{opacity:1}}
.cs-marketing-chat-error{padding:0 19px 4px}
.cs-marketing-chips{display:flex;flex-wrap:wrap;gap:7px;padding:12px 19px 0;border-top:1px solid rgba(255,255,255,.07)}
.cs-marketing-chip{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 11px;border-radius:999px;border:1px solid rgba(255,255,255,.07);background:#0b1220;color:#cbd5e1;font-size:11px;font-weight:600}
.cs-marketing-chip:hover:not(:disabled){background:rgba(139,92,246,.14);border-color:rgba(139,92,246,.45);color:#c4b5fd}
.cs-marketing-chip:disabled{opacity:.5;cursor:not-allowed}
.cs-marketing-input{display:flex;gap:9px;align-items:center;padding:13px 19px 16px}
.cs-marketing-input input{flex:1;height:40px;border:1px solid rgba(255,255,255,.09);border-radius:10px;padding:0 13px;font-size:12px;background:#0b1220;outline:0}
.cs-marketing-input input:focus{border-color:#8b5cf6}
.cs-marketing-input input:disabled{background:#0d1526;color:#94a3b8}
.cs-marketing-input .cs-btn:disabled{opacity:.55;cursor:not-allowed;box-shadow:none}
.cs-marketing-facts{display:flex;flex-direction:column;gap:2px}
.cs-marketing-fact{display:flex;justify-content:space-between;gap:12px;align-items:baseline;font-size:11.5px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.05)}
.cs-marketing-fact span{color:#cbd5e1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cs-marketing-fact b{font-weight:730;white-space:nowrap}
.cs-marketing-facts-head{font-size:10.5px;font-weight:650;color:#94a3b8;margin-top:14px;padding-bottom:4px}
.cs-marketing-note{margin:12px 0 0;font-size:11px;line-height:18px;color:#94a3b8}
`;
