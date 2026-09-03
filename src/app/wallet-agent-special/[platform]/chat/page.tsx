"use client";

/**
 * Payment & Wallet Agent — Chat.
 *
 * A conversation with GhrFix's own payment-wallet agent (POST
 * /ai-agents/payment-wallet/chat, via `agentChat`), beside a panel of the live
 * wallet context it is being asked about. The suggestion chips are computed
 * from the real snapshot — actual pending count, actual approval rate, actual
 * accept fee — so they only ever propose questions the data can answer, and
 * they disappear entirely when the snapshot failed.
 *
 * On ShadiLife there is no payment-wallet agent to talk to, so no composer is
 * rendered at all rather than offering an input that could only ever 404.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useWalletSnapshot, coins, formatMetric, type WalletSnapshot } from "@/lib/wallet-data";
import { usePlatformParam, platformLabel, agentChat } from "@/lib/agent-data";
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
  { label: "Top-Ups", icon: "posts", slug: "topups" },
  { label: "Ledger", icon: "pulse", slug: "ledger" },
  { label: "Token Economy", icon: "tag", slug: "economy" },
  { label: "Chat with AI Agent", icon: "chat", slug: "chat" },
];

interface Msg {
  role: "user" | "assistant";
  content: string;
}

export default function WalletChatPage({ params }: { params: Promise<{ platform: string }> }) {
  const platform = usePlatformParam(params);
  const w = useWalletSnapshot(platform);
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
    if (!content || busy || !w.supported) return;
    setError(null);
    setInput("");
    const history: ChatTurn[] = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content }]);
    setBusy(true);
    try {
      const reply = await agentChat(platform, "payment-wallet", "Payment & Wallet Agent", content, history);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : `Could not reach the ${label} payment & wallet agent.`);
    } finally {
      setBusy(false);
    }
  }

  const chips = buildChips(w);

  return (
    <SpecialShell
      platform={platform}
      agentLabel="Payment & Wallet Agent"
      tagline="Wallet workspace"
      basePath="/wallet-agent-special"
      nav={NAV}
      headerIcon="chat"
      assistantBlurb="Ask me about balances, the top-up queue or the accept fee. I answer from the live ledger, not from memory."
      title="Chat"
      subtitle={w.supported ? `Ask the wallet agent about the live ${label} coin economy` : `No wallet agent runs on ${label}`}
      actions={
        <Pill tone={!w.supported ? "amber" : w.error ? "red" : "green"}>
          <Icon name={w.supported && !w.error ? "check" : "alert"} size={12} />
          {!w.supported ? "Agent not on this platform" : w.error ? "Snapshot offline" : "Snapshot loaded"}
        </Pill>
      }
    >
      <style>{CHAT_CSS}</style>

      {!w.supported ? (
        <Card title={`There is no Payment & Wallet agent on ${label}`}>
          <div className="cs-wallet-unsupported">
            <span><Icon name="alert" size={18} /></span>
            <div>
              <p>{w.unsupportedReason}</p>
              <p>
                No composer is shown, because there is nothing behind it: a message sent from here could not reach any
                agent, and any answer it appeared to give would not be grounded in real data.
              </p>
              <Link href="/wallet-agent-special/ghrfix/chat" className="cs-btn cs-btn-primary">
                <Icon name="arrow" size={14} />Chat with the GhrFix wallet agent
              </Link>
            </div>
          </div>
        </Card>
      ) : (
        <div className="cs-row-2">
          <Card title="Conversation" pad={false}>
            <div className="cs-wallet-log">
              {messages.length === 0 && !busy && (
                <div className="cs-wallet-intro">
                  <b>Ask about the {label} coin economy.</b>
                  <p>
                    I read wallet totals, the top-up queue and the token-economy settings. I answer from that data.
                    I do not approve top-ups or change settings from this conversation.
                  </p>
                </div>
              )}

              {messages.map((m, i) => (
                <div key={i} className={m.role === "user" ? "cs-wallet-turn cs-wallet-turn-user" : "cs-wallet-turn"}>
                  <span className="cs-wallet-who">{m.role === "user" ? "You" : "Payment & Wallet Agent"}</span>
                  <div className={m.role === "user" ? "cs-wallet-bubble cs-wallet-bubble-user" : "cs-wallet-bubble"}>
                    {m.content}
                  </div>
                </div>
              ))}

              {busy && (
                <div className="cs-wallet-turn">
                  <span className="cs-wallet-who">Payment &amp; Wallet Agent</span>
                  <div className="cs-wallet-bubble">
                    <span className="cs-wallet-typing" aria-label="Thinking"><i /><i /><i /></span>
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            {error && <div className="cs-wallet-chat-error">{error}</div>}

            {chips.length > 0 && messages.length === 0 && (
              <div className="cs-wallet-chips">
                {chips.map((c) => (
                  <button key={c} type="button" className="cs-wallet-chip" onClick={() => send(c)} disabled={busy}>
                    {c}
                  </button>
                ))}
              </div>
            )}

            <div className="cs-wallet-input">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Ask about a balance, the queue or the accept fee…"
                disabled={busy}
                aria-label="Message the payment and wallet agent"
              />
              <button type="button" className="cs-btn cs-btn-primary" onClick={() => send()} disabled={busy || !input.trim()} aria-label="Send message">
                <Icon name="send" size={15} />Send
              </button>
            </div>
          </Card>

          <Card title="Wallet in Context">
            {w.loading ? (
              <Empty>Loading the live wallet snapshot…</Empty>
            ) : w.error ? (
              <Empty>The snapshot could not be read, so nothing the agent says here can be checked against real figures on this page.</Empty>
            ) : w.isEmpty ? (
              <Empty>{label} returned an empty wallet — no totals, requests or ledger entries for the agent to reason about.</Empty>
            ) : (
              <div className="cs-wallet-facts">
                {w.metrics.map((m) => (
                  <div className="cs-wallet-fact" key={m.key}>
                    <span>{m.label}</span>
                    <b className="cs-num">{formatMetric(m)}</b>
                  </div>
                ))}

                <div className="cs-wallet-facts-head">Top-up queue</div>
                <div className="cs-wallet-fact">
                  <span>Requests loaded</span>
                  <b className="cs-num">{w.topups.length.toLocaleString()}</b>
                </div>
                <div className="cs-wallet-fact">
                  <span>Approval rate</span>
                  <b className="cs-num">{w.approvalRate.value === null ? "No verdicts" : `${w.approvalRate.value}%`}</b>
                </div>
                <div className="cs-wallet-fact">
                  <span>Average approved</span>
                  <b className="cs-num">{coins(w.avgApprovedTopUp)}</b>
                </div>

                <div className="cs-wallet-facts-head">Token economy</div>
                <div className="cs-wallet-fact">
                  <span>Accept fee</span>
                  <b className="cs-num">{w.economy ? coins(w.economy.acceptFeeTokens) : "Not returned"}</b>
                </div>
                <div className="cs-wallet-fact">
                  <span>Signup grant</span>
                  <b className="cs-num">{w.economy ? coins(w.economy.signupTokenGrant) : "Not returned"}</b>
                </div>

                {w.ledgerReasonMix.rows.length > 0 && (
                  <>
                    <div className="cs-wallet-facts-head">Busiest ledger reasons</div>
                    {w.ledgerReasonMix.rows.slice(0, 4).map((r) => (
                      <div className="cs-wallet-fact" key={r.label}>
                        <span>{r.label}</span>
                        <b className="cs-num">{r.value.toLocaleString()}</b>
                      </div>
                    ))}
                  </>
                )}

                <p className="cs-wallet-note">{w.coverageNote}</p>
                <p className="cs-wallet-note">
                  This conversation is read-only. The agent&apos;s approve, reject and settings writes are not reachable
                  from this workspace.
                </p>
              </div>
            )}
          </Card>
        </div>
      )}

      {w.supported && w.error && <ErrorNote error={w.error} platform={platform} />}
    </SpecialShell>
  );
}

/** Chips are only offered for questions the loaded snapshot can actually answer. */
function buildChips(w: WalletSnapshot): string[] {
  if (!w.supported || w.loading || w.error || w.isEmpty) return [];
  const out: string[] = [];

  const pending = w.topups.filter((t) => t.status === "PENDING").length;
  if (pending > 0) out.push(`What are the ${pending} pending top-ups waiting on?`);
  if (w.approvalRate.value !== null) out.push(`Why is the top-up approval rate ${w.approvalRate.value}%?`);
  if (w.float !== null) out.push(`Is ${coins(w.float)} of coin float healthy?`);
  if (w.economy?.acceptFeeTokens !== null && w.economy?.acceptFeeTokens !== undefined) {
    out.push(`What does the ${coins(w.economy.acceptFeeTokens)} accept fee earn us?`);
  }
  const busiest = w.ledgerAmountByReason.rows[0];
  if (busiest) out.push(`Why does "${busiest.label}" move the most coins?`);

  if (out.length === 0) out.push("Summarise the GhrFix coin economy.");
  return out.slice(0, 4);
}

const CHAT_CSS = `
.cs-wallet-log{height:430px;overflow-y:auto;padding:18px 19px;display:flex;flex-direction:column;gap:16px}
.cs-wallet-intro{margin:auto;text-align:center;max-width:340px}
.cs-wallet-intro b{font-size:13px;display:block;margin-bottom:6px}
.cs-wallet-intro p{margin:0;font-size:11.5px;line-height:19px;color:#94a3b8}
.cs-wallet-turn{display:flex;flex-direction:column;gap:5px;align-items:flex-start}
.cs-wallet-turn-user{align-items:flex-end}
.cs-wallet-who{font-size:10px;font-weight:650;color:#94a3b8;letter-spacing:.02em}
.cs-wallet-bubble{max-width:82%;background:#0d1526;border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:11px 13px;font-size:12.5px;line-height:20px;white-space:pre-wrap;word-break:break-word}
.cs-wallet-bubble-user{background:linear-gradient(90deg,#7238df,#8b5cf6);border-color:transparent;color:#fff}
.cs-wallet-typing{display:inline-flex;gap:4px;align-items:center;height:14px}
.cs-wallet-typing i{width:6px;height:6px;border-radius:50%;background:#a9b0c4;animation:cs-wallet-bounce 1.1s infinite ease-in-out}
.cs-wallet-typing i:nth-child(2){animation-delay:.15s}
.cs-wallet-typing i:nth-child(3){animation-delay:.3s}
@keyframes cs-wallet-bounce{0%,60%,100%{transform:translateY(0);opacity:.55}30%{transform:translateY(-4px);opacity:1}}
.cs-wallet-chips{display:flex;flex-wrap:wrap;gap:7px;padding:0 19px 14px}
.cs-wallet-chip{border:1px solid rgba(255,255,255,.09);background:#0b1220;border-radius:20px;padding:7px 12px;font-size:11.5px;color:#cbd5e1}
.cs-wallet-chip:hover:not(:disabled){background:#0d1526;border-color:#c9cede}
.cs-wallet-chip:disabled{opacity:.5;cursor:default}
.cs-wallet-chat-error{margin:0 19px 12px;border:1px solid rgba(244,63,94,.32);background:rgba(244,63,94,.12);color:#fda4af;border-radius:10px;padding:10px 13px;font-size:11.5px}
.cs-wallet-input{display:flex;gap:9px;padding:14px 19px;border-top:1px solid rgba(255,255,255,.07)}
.cs-wallet-input input{flex:1;height:38px;border:1px solid rgba(255,255,255,.09);border-radius:9px;padding:0 13px;font-size:12.5px;background:#0b1220;color:#11162d}
.cs-wallet-input input:focus{outline:2px solid #7c3aed;outline-offset:1px}
.cs-wallet-input input:disabled{background:#0d1526}
.cs-wallet-facts{display:flex;flex-direction:column;gap:9px}
.cs-wallet-facts-head{font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#94a3b8;margin-top:8px}
.cs-wallet-fact{display:flex;justify-content:space-between;gap:12px;align-items:baseline;font-size:11.5px}
.cs-wallet-fact span{color:#cbd5e1;min-width:0}
.cs-wallet-fact b{font-weight:730;white-space:nowrap}
.cs-wallet-note{margin:10px 0 0;font-size:10.5px;line-height:17px;color:#94a3b8}
.cs-wallet-unsupported{display:flex;gap:13px;align-items:flex-start}
.cs-wallet-unsupported>span{width:34px;height:34px;border-radius:10px;flex:0 0 auto;display:grid;place-items:center;background:rgba(245,158,11,.13);color:#fbbf24}
.cs-wallet-unsupported p{margin:0 0 10px;font-size:12px;line-height:20px;color:#cbd5e1;max-width:640px}
`;
