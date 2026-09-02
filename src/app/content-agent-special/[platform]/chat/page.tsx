"use client";

/**
 * Content Agent — Chat.
 *
 * A conversation workspace wired to the real backend through
 * `agentChat(platform, "content", …)`, which absorbs the difference between
 * GhrFix's per-agent chat route and ShadiLife's shared ask route. The
 * suggestion chips and the side panel are both computed from the live
 * library (`useContentSnapshot`), so the prompts offered describe posts that
 * actually exist rather than a canned demo script.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { usePlatformParam, useContentSnapshot, agentChat, platformLabel } from "@/lib/agent-data";
import type { ChatTurn } from "@/lib/api";
import {
  Card,
  ContentShell,
  Empty,
  ErrorNote,
  Icon,
  Pill,
  Robot,
} from "@/components/content-special/kit";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

export default function ContentChatPage({ params }: { params: Promise<{ platform: string }> }) {
  const platform = usePlatformParam(params);
  const c = useContentSnapshot(platform);
  const label = platformLabel(platform);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages, sending]);

  /* Chips are questions the live library can actually answer. */
  const suggestions = useMemo(() => buildSuggestions(c), [c]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const history: ChatTurn[] = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setDraft("");
    setSending(true);
    setChatError(null);

    try {
      const reply = await agentChat(platform, "content", "Content Agent", trimmed, history);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      setChatError(err instanceof Error ? err.message : "The agent could not be reached.");
    } finally {
      setSending(false);
    }
  }

  const topCategory = c.byCategory[0]?.label ?? null;

  return (
    <ContentShell
      platform={platform}
      title="Chat"
      subtitle={`Ask the content agent about the live ${label} library`}
      actions={
        <Pill tone={c.error ? "red" : c.loading ? "amber" : "green"}>
          <Icon name={c.error ? "alert" : c.loading ? "clock" : "check"} size={12} />
          {c.error ? "Library offline" : c.loading ? "Loading library" : `${c.posts.length} posts in context`}
        </Pill>
      }
    >
      <style>{CHAT_CSS}</style>

      {c.error && <ErrorNote error={c.error} platform={platform} />}

      <div className="cs-row-2">
        <Card title="Conversation" pad={false}>
          <div className="cs-chat-log" role="log" aria-live="polite" aria-label="Conversation with the content agent">
            {messages.length === 0 && (
              <div className="cs-chat-intro">
                <Robot scale={0.9} />
                <b>Ask about the {label} library.</b>
                <p>
                  I can read every post, its metadata and its publishing history. Pick a starting point below or
                  type your own question.
                </p>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "cs-chat-turn cs-chat-turn-user" : "cs-chat-turn"}>
                <span className="cs-chat-who">{m.role === "user" ? "You" : "Content Agent"}</span>
                <div className={m.role === "user" ? "cs-chat-bubble cs-chat-bubble-user" : "cs-chat-bubble"}>
                  {m.content}
                </div>
              </div>
            ))}

            {sending && (
              <div className="cs-chat-turn">
                <span className="cs-chat-who">Content Agent</span>
                <div className="cs-chat-bubble cs-chat-typing" aria-label="The agent is typing">
                  <i /><i /><i />
                </div>
              </div>
            )}

            <div ref={endRef} />
          </div>

          {chatError && (
            <div className="cs-chat-error">
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
            <div className="cs-chat-chips">
              {suggestions.map((s) => (
                <button key={s} type="button" className="cs-chat-chip" onClick={() => send(s)} disabled={sending}>
                  <Icon name="sparkle" size={12} />
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className="cs-chat-input">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(draft);
                }
              }}
              placeholder={sending ? "Waiting for the agent…" : "Ask about a post, a gap or what to write next…"}
              aria-label="Message the content agent"
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

        <Card title="Library in Context">
          {c.loading ? (
            <Empty>Loading live library…</Empty>
          ) : c.posts.length === 0 ? (
            <Empty>No posts found — the agent has no library to reason about yet.</Empty>
          ) : (
            <div className="cs-chat-facts">
              <Fact label="Posts in library" value={c.posts.length.toLocaleString()} />
              <Fact label="Published" value={c.published.length.toLocaleString()} />
              <Fact label="Drafts waiting" value={c.drafts.length.toLocaleString()} />
              <Fact label="Fully optimised" value={`${c.fullyOptimised} of ${c.posts.length}`} />
              <Fact
                label="Missing meta description"
                value={c.posts.filter((p) => !p.hasMetaDescription).length.toLocaleString()}
              />
              <Fact label="Total views" value={c.totalViews === null ? "Not tracked" : c.totalViews.toLocaleString()} />

              <div className="cs-chat-facts-head">Top categories</div>
              {c.byCategory.slice(0, 5).map((cat) => (
                <Fact key={cat.label} label={cat.label} value={cat.value.toLocaleString()} />
              ))}
              {topCategory && (
                <p className="cs-chat-note">
                  Ask about “{topCategory}” — it is the largest cluster the agent can compare against.
                </p>
              )}
            </div>
          )}
        </Card>
      </div>
    </ContentShell>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="cs-chat-fact">
      <span>{label}</span>
      <b className="cs-num">{value}</b>
    </div>
  );
}

/** Prompts derived from the real library, so every chip is answerable. */
function buildSuggestions(c: ReturnType<typeof useContentSnapshot>): string[] {
  if (c.loading || c.posts.length === 0) return [];
  const out: string[] = [];

  const noDesc = c.posts.filter((p) => !p.hasMetaDescription).length;
  if (noDesc > 0) out.push(`Which ${noDesc} posts are missing meta descriptions?`);

  if (c.drafts.length > 0) out.push(`Why are ${c.drafts.length} drafts still unpublished?`);

  const top = c.byCategory[0];
  if (top) out.push(`Draft a post about ${top.label}`);

  const noCover = c.posts.filter((p) => !p.hasCover).length;
  if (noCover > 0) out.push(`Suggest cover images for the ${noCover} posts without one`);

  if (c.byCategory.length > 1) out.push(`Which category should I write for next?`);

  return out.slice(0, 5);
}

/* Chat-only styles. Every selector is `cs-chat-*` prefixed so nothing here
   escapes this page and lands on the other special agents' unnamespaced CSS. */
const CHAT_CSS = `
.cs-chat-log{padding:18px 19px;display:flex;flex-direction:column;gap:15px;min-height:340px;max-height:52vh;overflow-y:auto}
.cs-chat-intro{text-align:center;margin:auto;max-width:340px}
.cs-chat-intro b{display:block;font-size:13px;margin-top:6px}
.cs-chat-intro p{margin:6px 0 0;font-size:11.5px;line-height:19px;color:#69738c}
.cs-chat-turn{display:flex;flex-direction:column;align-items:flex-start;gap:4px;max-width:78%}
.cs-chat-turn-user{align-self:flex-end;align-items:flex-end}
.cs-chat-who{font-size:10px;font-weight:650;color:#8891a8}
.cs-chat-bubble{background:#f5f6fb;border:1px solid #eef0f5;border-radius:13px 13px 13px 4px;padding:11px 14px;font-size:12px;line-height:20px;color:#28304d;white-space:pre-wrap;word-break:break-word}
.cs-chat-bubble-user{background:linear-gradient(90deg,#7440df,#8b5cf6);border:0;color:#fff;border-radius:13px 13px 4px 13px}
.cs-chat-typing{display:flex;gap:5px;align-items:center;padding:14px}
.cs-chat-typing i{width:6px;height:6px;border-radius:50%;background:#a9b0c6;animation:cs-chat-blink 1.2s infinite}
.cs-chat-typing i:nth-child(2){animation-delay:.18s}
.cs-chat-typing i:nth-child(3){animation-delay:.36s}
@keyframes cs-chat-blink{0%,80%,100%{opacity:.3}40%{opacity:1}}
.cs-chat-error{padding:0 19px 4px}
.cs-chat-chips{display:flex;flex-wrap:wrap;gap:7px;padding:12px 19px 0;border-top:1px solid #eef0f5}
.cs-chat-chip{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 11px;border-radius:999px;border:1px solid #e4e7ef;background:#fff;color:#4c5470;font-size:11px;font-weight:600}
.cs-chat-chip:hover:not(:disabled){background:#faf8ff;border-color:#d9cdf7;color:#5b2ca8}
.cs-chat-chip:disabled{opacity:.5;cursor:not-allowed}
.cs-chat-input{display:flex;gap:9px;align-items:center;padding:13px 19px 16px}
.cs-chat-input input{flex:1;height:40px;border:1px solid #dfe2ea;border-radius:10px;padding:0 13px;font-size:12px;background:#fff;outline:0}
.cs-chat-input input:focus{border-color:#8b5cf6}
.cs-chat-input input:disabled{background:#f7f8fc;color:#8891a8}
.cs-chat-input .cs-btn:disabled{opacity:.55;cursor:not-allowed;box-shadow:none}
.cs-chat-facts{display:flex;flex-direction:column;gap:2px}
.cs-chat-fact{display:flex;justify-content:space-between;gap:12px;align-items:baseline;font-size:11.5px;padding:7px 0;border-bottom:1px solid #f4f5f9}
.cs-chat-fact span{color:#4c5470;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cs-chat-fact b{font-weight:730;white-space:nowrap}
.cs-chat-facts-head{font-size:10.5px;font-weight:650;color:#69738c;margin-top:14px;padding-bottom:4px}
.cs-chat-note{margin:12px 0 0;font-size:11px;line-height:18px;color:#69738c}
`;
