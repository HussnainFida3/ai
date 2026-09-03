"use client";

/**
 * Owner Chat Agent — Chat.
 *
 * The conversation itself, beside the live snapshot the agent is being asked
 * about. Suggestion chips are computed from that snapshot (a real directory
 * total, a real top category, a real rate), so they only ever propose
 * questions the loaded data can actually answer — and they disappear entirely
 * when nothing loaded, rather than inviting questions about figures nobody
 * has.
 *
 * The POST here is `agentChat(...)`, which asks the agent a question. It
 * records no platform change, and no write endpoint is wired on this page.
 */

import { useEffect, useRef, useState } from "react";
import { usePlatformParam, platformLabel, agentChat } from "@/lib/agent-data";
import { useOwnerChatSnapshot, formatOwnerMetric } from "@/lib/owner-chat-data";
import type { OwnerChatSnapshot } from "@/lib/owner-chat-data";
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
  { label: "Directory", icon: "users", slug: "directory" },
  { label: "Capabilities", icon: "target", slug: "capabilities" },
  { label: "Audit Trail", icon: "clock", slug: "audit" },
  { label: "Chat with AI Agent", icon: "chat", slug: "chat" },
];

interface Msg {
  role: "user" | "assistant";
  content: string;
}

export default function OwnerChatChatPage({ params }: { params: Promise<{ platform: string }> }) {
  const platform = usePlatformParam(params);
  const s = useOwnerChatSnapshot(platform);
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
      const reply = await agentChat(platform, "owner-chat", "Owner Chat", content, history);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : `Could not reach the ${label} Owner Chat agent.`);
    } finally {
      setBusy(false);
    }
  }

  const chips = buildChips(s, label);

  return (
    <SpecialShell
      platform={platform}
      agentLabel="Owner Chat Agent"
      tagline="Orchestration workspace"
      basePath="/owner-chat-agent-special"
      nav={NAV}
      headerIcon="chat"
      assistantBlurb="Ask me anything about the live platform. I call a real tool for every figure — I never estimate one."
      title="Chat"
      subtitle={`Ask Owner Chat about live ${label} data`}
      actions={
        <Pill tone={s.error ? "red" : s.loading ? "amber" : s.partial ? "amber" : "green"}>
          <Icon name={s.error ? "alert" : s.loading ? "clock" : s.partial ? "alert" : "check"} size={12} />
          {s.error ? "▲ Snapshot offline" : s.loading ? "Loading context" : s.partial ? "◐ Partial context" : "● Context loaded"}
        </Pill>
      }
    >
      <style>{OWNER_CHAT_CSS}</style>

      <div className="cs-row-2">
        <Card title="Conversation" pad={false}>
          <div className="cs-owner-log">
            {messages.length === 0 && !busy && (
              <div className="cs-owner-intro">
                <b>Ask about live {label} data.</b>
                <p>
                  Owner Chat reads the real admin routes — members, providers or bureau agents, approvals, revenue and its own
                  audit trail. It answers from that data, not from memory. This page only asks questions; it fires no write.
                </p>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "cs-owner-turn cs-owner-turn-user" : "cs-owner-turn"}>
                <span className="cs-owner-who">{m.role === "user" ? "You" : "Owner Chat"}</span>
                <div className={m.role === "user" ? "cs-owner-bubble cs-owner-bubble-user" : "cs-owner-bubble"}>{m.content}</div>
              </div>
            ))}

            {busy && (
              <div className="cs-owner-turn">
                <span className="cs-owner-who">Owner Chat</span>
                <div className="cs-owner-bubble">
                  <span className="cs-owner-typing" aria-label="Thinking"><i /><i /><i /></span>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {error && <div className="cs-owner-chat-error">{error}</div>}

          {chips.length > 0 && messages.length === 0 && (
            <div className="cs-owner-chips">
              {chips.map((c) => (
                <button key={c} type="button" className="cs-owner-chip" onClick={() => send(c)} disabled={busy}>
                  {c}
                </button>
              ))}
            </div>
          )}

          <div className="cs-owner-input">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Ask about a member, a figure or a trend…"
              disabled={busy}
              aria-label="Message the Owner Chat agent"
            />
            <button type="button" className="cs-btn cs-btn-primary" onClick={() => send()} disabled={busy || !input.trim()} aria-label="Send message">
              <Icon name="send" size={15} />Send
            </button>
          </div>
        </Card>

        <Card title="Platform in Context">
          {s.loading ? (
            <Empty>Loading the live snapshot…</Empty>
          ) : s.error ? (
            <Empty>Nothing loaded from {label}, so none of the context beside this conversation can be verified against real data.</Empty>
          ) : (
            <div className="cs-owner-facts">
              {s.partial && (
                <p className="cs-owner-warn">
                  ◐ Partial context — these sources failed: {s.failures.join("; ")}. Anything they feed is missing here, not zero.
                </p>
              )}

              {s.metrics.map((m) => (
                <div className="cs-owner-fact" key={m.key}>
                  <span>{m.label}</span>
                  <b className="cs-num">{formatOwnerMetric(m)}</b>
                </div>
              ))}

              <div className="cs-owner-facts-head">Directories</div>
              {s.directories.map((d) => (
                <div className="cs-owner-fact" key={d.key}>
                  <span>{d.label}</span>
                  <b className="cs-num">
                    {d.loaded ? (d.serverTotal === null ? `${d.fetched.toLocaleString()} pulled` : d.serverTotal.toLocaleString()) : "▲ Failed"}
                  </b>
                </div>
              ))}

              <div className="cs-owner-facts-head">{s.headlineRate.label}</div>
              <div className="cs-owner-fact">
                <span>{s.headlineRate.value === null ? "Not measured" : "Current"}</span>
                <b className="cs-num">{s.headlineRate.value === null ? "—" : `${s.headlineRate.value}%`}</b>
              </div>

              {s.dimensions.filter((d) => !d.failed && d.rows.length > 0).slice(0, 2).map((d) => (
                <div key={d.key}>
                  <div className="cs-owner-facts-head">{d.title}</div>
                  {d.rows.slice(0, 4).map((r) => (
                    <div className="cs-owner-fact" key={r.label}>
                      <span>{r.label}</span>
                      <b className="cs-num">{r.value.toLocaleString()}</b>
                    </div>
                  ))}
                </div>
              ))}

              <div className="cs-owner-facts-head">Audit trail</div>
              <div className="cs-owner-fact">
                <span>{s.auditError ? "Could not be read" : "Recorded actions"}</span>
                <b className="cs-num">{s.auditError ? "▲ Failed" : (s.auditTotal ?? s.audit.length).toLocaleString()}</b>
              </div>

              <p className="cs-owner-chat-note">{s.coverageNote}</p>
            </div>
          )}
        </Card>
      </div>

      {s.error && <ErrorNote error={s.error} platform={platform} />}
    </SpecialShell>
  );
}

/** Only offers questions the loaded snapshot can actually answer. */
function buildChips(s: OwnerChatSnapshot, label: string): string[] {
  if (s.loading || s.error) return [];
  const out: string[] = [];

  const people = s.metrics.find((m) => m.key === "members");
  if (people?.value !== null && people !== undefined) out.push(`What changed across the ${people.value.toLocaleString()} members recently?`);

  const dir = s.directories.find((d) => d.loaded && d.serverTotal !== null);
  if (dir && dir.serverTotal !== null) out.push(`Break down the ${dir.serverTotal.toLocaleString()} ${dir.label.toLowerCase()} by status.`);

  const dim = s.dimensions.find((d) => !d.failed && d.rows.length > 0);
  if (dim) out.push(`Why does "${dim.rows[0].label}" lead ${dim.title.toLowerCase()}?`);

  if (s.headlineRate.value !== null) out.push(`How do we improve the ${s.headlineRate.value}% ${s.headlineRate.label.toLowerCase()}?`);

  if (!s.auditError && s.audit.length > 0) out.push(`Summarise your last ${Math.min(10, s.audit.length)} recorded actions.`);

  if (out.length === 0) out.push(`Summarise the state of ${label} right now.`);
  return out.slice(0, 4);
}

const OWNER_CHAT_CSS = `
.cs-owner-log{height:430px;overflow-y:auto;padding:18px 19px;display:flex;flex-direction:column;gap:16px}
.cs-owner-intro{margin:auto;text-align:center;max-width:340px}
.cs-owner-intro b{font-size:13px;display:block;margin-bottom:6px}
.cs-owner-intro p{margin:0;font-size:11.5px;line-height:19px;color:#94a3b8}
.cs-owner-turn{display:flex;flex-direction:column;gap:5px;align-items:flex-start}
.cs-owner-turn-user{align-items:flex-end}
.cs-owner-who{font-size:10px;font-weight:650;color:#94a3b8;letter-spacing:.02em}
.cs-owner-bubble{max-width:82%;background:#0d1526;border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:11px 13px;font-size:12.5px;line-height:20px;white-space:pre-wrap;word-break:break-word}
.cs-owner-bubble-user{background:linear-gradient(90deg,#7238df,#8b5cf6);border-color:transparent;color:#fff}
.cs-owner-typing{display:inline-flex;gap:4px;align-items:center;height:14px}
.cs-owner-typing i{width:6px;height:6px;border-radius:50%;background:#a9b0c4;animation:cs-owner-bounce 1.1s infinite ease-in-out}
.cs-owner-typing i:nth-child(2){animation-delay:.15s}
.cs-owner-typing i:nth-child(3){animation-delay:.3s}
@keyframes cs-owner-bounce{0%,60%,100%{transform:translateY(0);opacity:.55}30%{transform:translateY(-4px);opacity:1}}
.cs-owner-chips{display:flex;flex-wrap:wrap;gap:7px;padding:0 19px 14px}
.cs-owner-chip{border:1px solid rgba(255,255,255,.09);background:#0b1220;border-radius:20px;padding:7px 12px;font-size:11.5px;color:#cbd5e1}
.cs-owner-chip:hover:not(:disabled){background:#0d1526;border-color:#c9cede}
.cs-owner-chip:disabled{opacity:.5;cursor:default}
.cs-owner-chat-error{margin:0 19px 12px;border:1px solid rgba(244,63,94,.32);background:rgba(244,63,94,.12);color:#fda4af;border-radius:10px;padding:10px 13px;font-size:11.5px}
.cs-owner-input{display:flex;gap:9px;padding:14px 19px;border-top:1px solid rgba(255,255,255,.07)}
.cs-owner-input input{flex:1;height:38px;border:1px solid rgba(255,255,255,.09);border-radius:9px;padding:0 13px;font-size:12.5px;background:#0b1220;color:#11162d}
.cs-owner-input input:focus{outline:2px solid #7c3aed;outline-offset:1px}
.cs-owner-input input:disabled{background:#0d1526}
.cs-owner-facts{display:flex;flex-direction:column;gap:9px}
.cs-owner-facts-head{font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#94a3b8;margin-top:8px}
.cs-owner-fact{display:flex;justify-content:space-between;gap:12px;align-items:baseline;font-size:11.5px}
.cs-owner-fact span{color:#cbd5e1;min-width:0}
.cs-owner-fact b{font-weight:730;white-space:nowrap}
.cs-owner-warn{margin:0;border:1px solid rgba(245,158,11,.3);background:rgba(245,158,11,.13);border-radius:9px;padding:9px 11px;font-size:11px;line-height:18px;color:#7a5410}
.cs-owner-chat-note{margin:10px 0 0;font-size:10.5px;line-height:17px;color:#94a3b8}
`;
