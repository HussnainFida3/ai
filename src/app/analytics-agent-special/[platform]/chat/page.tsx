"use client";

/**
 * Analytics Agent — Chat.
 *
 * Wired to the real backend through `agentChat(platform, "analytics", …)`,
 * which absorbs the difference between GhrFix's per-agent chat route and
 * ShadiLife's shared ask route. The suggestion chips and the side panel are
 * both computed from the live snapshot, so every prompt offered names a
 * figure the agent can actually look up — and none are offered at all when
 * the snapshot failed to load.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useAnalyticsSnapshot, formatMetric } from "@/lib/analytics-data";
import type { AnalyticsSnapshot } from "@/lib/analytics-data";
import { usePlatformParam, agentChat, platformLabel } from "@/lib/agent-data";
import type { ChatTurn } from "@/lib/api";
import { Card, Empty, ErrorNote, Icon, Pill, Robot, SpecialShell, type NavItem } from "@/components/special/kit";

const NAV: NavItem[] = [
  { label: "Overview", icon: "dashboard", slug: "overview" },
  { label: "Breakdown", icon: "tag", slug: "breakdown" },
  { label: "Trends", icon: "trend", slug: "trends" },
  { label: "Chat with AI Agent", icon: "chat", slug: "chat" },
];

interface Msg {
  role: "user" | "assistant";
  content: string;
}

export default function AnalyticsChatPage({ params }: { params: Promise<{ platform: string }> }) {
  const platform = usePlatformParam(params);
  const a = useAnalyticsSnapshot(platform);
  const label = platformLabel(platform);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages, sending]);

  const suggestions = useMemo(() => buildSuggestions(a, label), [a, label]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const history: ChatTurn[] = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setDraft("");
    setSending(true);
    setChatError(null);

    try {
      const reply = await agentChat(platform, "analytics", "Analytics Agent", trimmed, history);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      setChatError(err instanceof Error ? err.message : "The agent could not be reached.");
    } finally {
      setSending(false);
    }
  }

  const measured = a.metrics.filter((m) => m.value !== null);

  return (
    <SpecialShell
      platform={platform}
      agentLabel="Analytics Agent"
      tagline="Analytics workspace"
      basePath="/analytics-agent-special"
      nav={NAV}
      headerIcon="chat"
      assistantBlurb="Ask me about the live snapshot — I answer from the numbers on these pages."
      title="Chat"
      subtitle={`Ask the analytics agent about live ${label} data`}
      actions={
        <Pill tone={a.error ? "red" : a.loading ? "amber" : "green"}>
          <Icon name={a.error ? "alert" : a.loading ? "clock" : "check"} size={12} />
          {a.error ? "Snapshot offline" : a.loading ? "Loading snapshot" : `${measured.length} metrics in context`}
        </Pill>
      }
    >
      <style>{CHAT_CSS}</style>

      {a.error && <ErrorNote error={a.error} platform={platform} />}

      <div className="cs-row-2">
        <Card title="Conversation" pad={false}>
          <div className="cs-analytics-log" role="log" aria-live="polite" aria-label="Conversation with the analytics agent">
            {messages.length === 0 && (
              <div className="cs-analytics-intro">
                <Robot scale={0.9} />
                <b>Ask about {label}&apos;s numbers.</b>
                <p>
                  {a.error
                    ? "The snapshot failed to load, so I cannot suggest grounded questions right now — but you can still ask, and I will tell you what I can reach."
                    : `I can read ${a.domain.toLowerCase()}. Pick a starting point below or type your own question.`}
                </p>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "cs-analytics-turn cs-analytics-turn-user" : "cs-analytics-turn"}>
                <span className="cs-analytics-who">{m.role === "user" ? "You" : "Analytics Agent"}</span>
                <div className={m.role === "user" ? "cs-analytics-bubble cs-analytics-bubble-user" : "cs-analytics-bubble"}>
                  {m.content}
                </div>
              </div>
            ))}

            {sending && (
              <div className="cs-analytics-turn">
                <span className="cs-analytics-who">Analytics Agent</span>
                <div className="cs-analytics-bubble cs-analytics-typing" aria-label="The agent is typing">
                  <i /><i /><i />
                </div>
              </div>
            )}

            <div ref={endRef} />
          </div>

          {chatError && (
            <div className="cs-analytics-chat-error">
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
            <div className="cs-analytics-chips">
              {suggestions.map((s) => (
                <button key={s} type="button" className="cs-analytics-chip" onClick={() => void send(s)} disabled={sending}>
                  <Icon name="sparkle" size={12} />
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className="cs-analytics-input">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(draft);
                }
              }}
              placeholder={sending ? "Waiting for the agent…" : "Ask about a metric, a city, a segment or a trend…"}
              aria-label="Message the analytics agent"
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

        <Card title="Snapshot in Context">
          {a.loading ? (
            <Empty>Loading the live snapshot…</Empty>
          ) : a.error ? (
            <Empty>
              The {label} snapshot could not be loaded, so the agent has no live figures in context. Nothing about
              this platform&apos;s current state can be shown here until it loads.
            </Empty>
          ) : a.isEmpty ? (
            <Empty>The snapshot loaded successfully but contained no countable figures yet.</Empty>
          ) : (
            <div className="cs-analytics-facts">
              {a.metrics.map((m) => (
                <Fact key={m.key} label={m.label} value={formatMetric(m)} />
              ))}

              <div className="cs-analytics-facts-head">Computed rates</div>
              {a.rates.map((r) => (
                <Fact key={r.label} label={r.label} value={r.value === null ? "Not tracked" : r.value.toLocaleString()} />
              ))}

              <div className="cs-analytics-facts-head">Dimensions available</div>
              {a.dimensions.length === 0 && <Fact label="Categorical cuts" value="None returned" />}
              {a.dimensions.map((d) => (
                <Fact key={d.key} label={d.title} value={`${d.rows.length} segments`} />
              ))}

              <div className="cs-analytics-facts-head">Time series</div>
              <Fact label="Bucketed series" value={a.series ? a.series.granularity.split(" from ")[0] : "Not available"} />
              <p className="cs-analytics-chat-note">{a.seriesNote}</p>
            </div>
          )}
        </Card>
      </div>
    </SpecialShell>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="cs-analytics-fact">
      <span>{label}</span>
      <b className="cs-num">{value}</b>
    </div>
  );
}

/** Prompts derived from the live snapshot, so every chip is answerable. */
function buildSuggestions(a: AnalyticsSnapshot, label: string): string[] {
  if (a.loading || a.error || a.isEmpty) return [];
  const out: string[] = [];

  const topDim = a.dimensions.find((d) => d.rows.length > 1);
  if (topDim) out.push(`Why is ${topDim.rows[0].label} the largest in ${topDim.title.toLowerCase()}?`);

  const secondDim = a.dimensions.filter((d) => d.rows.length > 2)[1];
  if (secondDim) out.push(`Break down ${secondDim.title.toLowerCase()} for me`);

  const rate = a.rates.find((r) => r.value !== null);
  if (rate) out.push(`Is a ${rate.label.toLowerCase()} of ${rate.value} healthy for ${label}?`);

  const period = a.periods.find((p) => p.deltaPct !== null);
  if (period) out.push(`What changed in ${period.label.toLowerCase()} this period?`);

  const untracked = a.metrics.find((m) => m.value === null);
  if (untracked) out.push(`What can you tell me about ${untracked.label.toLowerCase()} without a stored counter?`);

  return out.slice(0, 5);
}

/* Chat-only styles. Every selector is `cs-analytics-*` prefixed so nothing
   here escapes this page onto the other special workspaces. */
const CHAT_CSS = `
.cs-analytics-log{padding:18px 19px;display:flex;flex-direction:column;gap:15px;min-height:340px;max-height:52vh;overflow-y:auto}
.cs-analytics-intro{text-align:center;margin:auto;max-width:340px}
.cs-analytics-intro b{display:block;font-size:13px;margin-top:6px}
.cs-analytics-intro p{margin:6px 0 0;font-size:11.5px;line-height:19px;color:#69738c}
.cs-analytics-turn{display:flex;flex-direction:column;align-items:flex-start;gap:4px;max-width:78%}
.cs-analytics-turn-user{align-self:flex-end;align-items:flex-end}
.cs-analytics-who{font-size:10px;font-weight:650;color:#8891a8}
.cs-analytics-bubble{background:#f5f6fb;border:1px solid #eef0f5;border-radius:13px 13px 13px 4px;padding:11px 14px;font-size:12px;line-height:20px;color:#28304d;white-space:pre-wrap;word-break:break-word}
.cs-analytics-bubble-user{background:linear-gradient(90deg,#7440df,#8b5cf6);border:0;color:#fff;border-radius:13px 13px 4px 13px}
.cs-analytics-typing{display:flex;gap:5px;align-items:center;padding:14px}
.cs-analytics-typing i{width:6px;height:6px;border-radius:50%;background:#a9b0c6;animation:cs-analytics-blink 1.2s infinite}
.cs-analytics-typing i:nth-child(2){animation-delay:.18s}
.cs-analytics-typing i:nth-child(3){animation-delay:.36s}
@keyframes cs-analytics-blink{0%,80%,100%{opacity:.3}40%{opacity:1}}
.cs-analytics-chat-error{padding:0 19px 4px}
.cs-analytics-chips{display:flex;flex-wrap:wrap;gap:7px;padding:12px 19px 0;border-top:1px solid #eef0f5}
.cs-analytics-chip{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 11px;border-radius:999px;border:1px solid #e4e7ef;background:#fff;color:#4c5470;font-size:11px;font-weight:600}
.cs-analytics-chip:hover:not(:disabled){background:#faf8ff;border-color:#d9cdf7;color:#5b2ca8}
.cs-analytics-chip:disabled{opacity:.5;cursor:not-allowed}
.cs-analytics-input{display:flex;gap:9px;align-items:center;padding:13px 19px 16px}
.cs-analytics-input input{flex:1;height:40px;border:1px solid #dfe2ea;border-radius:10px;padding:0 13px;font-size:12px;background:#fff;outline:0}
.cs-analytics-input input:focus{border-color:#8b5cf6}
.cs-analytics-input input:disabled{background:#f7f8fc;color:#8891a8}
.cs-analytics-input .cs-btn:disabled{opacity:.55;cursor:not-allowed;box-shadow:none}
.cs-analytics-facts{display:flex;flex-direction:column;gap:2px}
.cs-analytics-fact{display:flex;justify-content:space-between;gap:12px;align-items:baseline;font-size:11.5px;padding:7px 0;border-bottom:1px solid #f4f5f9}
.cs-analytics-fact span{color:#4c5470;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cs-analytics-fact b{font-weight:730;white-space:nowrap}
.cs-analytics-facts-head{font-size:10.5px;font-weight:650;color:#69738c;margin-top:14px;padding-bottom:4px}
.cs-analytics-chat-note{margin:12px 0 0;font-size:11px;line-height:18px;color:#69738c}
`;
