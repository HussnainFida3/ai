"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Bell,
  Bot,
  CalendarDays,
  ChevronDown,
  FileBarChart,
  FileText,
  Landmark,
  MessageSquare,
  PieChart,
  ReceiptText,
  Send,
  Sparkles,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { usePlatformParam, agentChat, platformLabel, platformLogoUrl } from "@/lib/agent-data";
import type { ChatTurn } from "@/lib/api";

const FINANCE_NAV = [
  { href: "dashboard", label: "Dashboard", icon: Landmark },
  { href: "transactions", label: "Transactions", icon: ReceiptText },
  { href: "reports", label: "Reports", icon: FileBarChart },
  { href: "payouts", label: "Payouts", icon: WalletCards },
  { href: "chat", label: "Chat", icon: Bot },
];

const QUICK_PROMPTS = [
  { icon: FileText, label: "Generate financial report" },
  { icon: TrendingUp, label: "Revenue forecast" },
  { icon: PieChart, label: "Expense analysis" },
  { icon: ReceiptText, label: "Tax summary" },
];

function Robot({ small = false }: { small?: boolean }) {
  return (
    <div className={`robot ${small ? "robot-small" : ""}`}>
      <div className="robot-glow" />
      <div className="robot-head">
        <div className="robot-face">
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}

interface Message {
  role: "user" | "assistant";
  content: string;
  error?: boolean;
}

export default function FinanceAgentChatPage({ params }: { params: Promise<{ platform: string }> }) {
  const platform = usePlatformParam(params);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const label = `${platformLabel(platform)} Finance Manager`;

  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: `Hello! I'm the ${label} AI Agent. Ask me about revenue, payouts, forecasts, or anything else on the books — I answer from real, live platform data.` },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const firedPrefill = useRef(false);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    const history: ChatTurn[] = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    setSending(true);
    try {
      const reply = await agentChat(platform, "finance", label, trimmed, history);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong reaching the AI.";
      setMessages((prev) => [...prev, { role: "assistant", content: msg, error: true }]);
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    const q = searchParams.get("q");
    if (q && !firedPrefill.current) {
      firedPrefill.current = true;
      send(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  return (
    <>
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }
        html, body {
          margin: 0;
          padding: 0;
          width: 100%;
          min-height: 100%;
          background: #030712;
          color: #f1f5f9;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        button, input, textarea { font: inherit; }
        button { cursor: pointer; }

        .fin-page {
          width: 100%;
          min-height: 100vh;
          background:
            radial-gradient(circle at 67% 8%, rgba(139, 92, 246, 0.10), transparent 25%),
            radial-gradient(circle at 16% 90%, rgba(139, 92, 246, 0.07), transparent 25%),
            #030712;
          display: flex;
          overflow: hidden;
        }

        .fin-sidebar {
          width: 240px;
          flex: 0 0 240px;
          min-height: 100vh;
          padding: 30px 18px 26px;
          border-right: 1px solid rgba(255, 255, 255, .07);
          background: linear-gradient(180deg, rgba(13, 21, 38, 0.92), rgba(5, 8, 15, 0.95));
          display: flex;
          flex-direction: column;
        }
        .fin-brand { padding: 4px 8px 26px; display: flex; align-items: center; gap: 10px; }
        .fin-brand-mark { width: 36px; height: 36px; object-fit: contain; flex: 0 0 auto; }
        .fin-brand-text { font-size: 21px; font-weight: 800; letter-spacing: -0.8px; color: #f1f5f9; }
        .fin-brand-text span { color: #f43f5e; }
        .fin-brand-sub { margin-top: 5px; color: #94a3b8; font-size: 11px; font-weight: 500; }
        .fin-nav { display: flex; flex-direction: column; gap: 4px; }
        .fin-nav-item {
          width: 100%; height: 41px; border: 0; background: transparent; display: flex; align-items: center;
          gap: 14px; padding: 0 10px; color: #94a3b8; border-radius: 10px; font-size: 14px; font-weight: 500;
          text-decoration: none; transition: 0.18s ease;
        }
        .fin-nav-item svg { width: 17px; height: 17px; color: #94a3b8; stroke-width: 1.7; }
        .fin-nav-item:hover { background: rgba(139, 92, 246, .14); color: #8b5cf6; }
        .fin-nav-item.active { background: linear-gradient(135deg, rgba(139, 92, 246, 0.20), rgba(139, 92, 246, 0.10)); color: #8b5cf6; }
        .fin-nav-item.active svg { color: #8b5cf6; }
        .fin-back { margin-top: auto; }

        .fin-main { min-width: 0; flex: 1; min-height: 100vh; display: flex; flex-direction: column; }
        .fin-topbar { height: 100px; padding: 22px 27px 12px 30px; display: flex; align-items: flex-start; justify-content: space-between; }
        .fin-heading h1 { margin: 6px 0 4px; color: #f1f5f9; font-size: 23px; font-weight: 750; display: flex; align-items: center; gap: 9px; }
        .fin-heading h1 svg { width: 21px; height: 21px; color: #8b5cf6; }
        .fin-heading p { margin: 0; color: #94a3b8; font-size: 13px; }
        .fin-top-actions { display: flex; align-items: center; gap: 12px; }
        .fin-date { min-width: 200px; height: 37px; border: 1px solid rgba(255, 255, 255, .07); background: #0b1220; border-radius: 7px; color: #f1f5f9; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 11.5px; }
        .fin-bell { width: 37px; height: 37px; border-radius: 50%; border: 1px solid rgba(255, 255, 255, .07); background: #0b1220; display: grid; place-items: center; color: #94a3b8; }

        .fin-body { flex: 1; min-height: 0; padding: 0 27px 27px 30px; display: grid; grid-template-columns: minmax(0, 1fr) 270px; gap: 16px; }
        .fin-chat-panel {
          min-width: 0; border: 1px solid rgba(255, 255, 255, .07); border-radius: 16px; overflow: hidden; display: flex; flex-direction: column;
          background: rgba(11, 18, 32, 0.7); box-shadow: 0 15px 40px rgba(0, 0, 0, 0.35);
        }
        .fin-chat-header { height: 82px; flex: 0 0 82px; border-bottom: 1px solid rgba(255, 255, 255, .05); padding: 14px 22px; display: flex; align-items: center; gap: 13px; }
        .fin-chat-avatar { width: 50px; height: 50px; flex: 0 0 50px; border-radius: 50%; background: radial-gradient(circle at center, rgba(139, 92, 246, 0.22), transparent 65%), #0d1526; display: flex; align-items: center; justify-content: center; }
        .fin-chat-info strong { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #f1f5f9; }
        .fin-online-dot { width: 6px; height: 6px; border-radius: 50%; background: #22c55e; }
        .fin-chat-info p { margin: 6px 0 0; color: #94a3b8; font-size: 11px; }

        .fin-messages { flex: 1; min-height: 0; padding: 22px 24px 6px; overflow: auto; display: flex; flex-direction: column; gap: 18px; }
        .fin-msg-row { display: flex; gap: 12px; align-items: flex-start; }
        .fin-msg-row.user { justify-content: flex-end; }
        .fin-msg-side { flex: 0 0 40px; }
        .fin-bubble {
          max-width: 68%; border-radius: 13px; padding: 14px 17px; font-size: 12.5px; line-height: 1.65;
          background: linear-gradient(145deg, rgba(11,18,32,0.95), rgba(13,21,38,0.85)); border: 1px solid rgba(255, 255, 255, .07);
          box-shadow: 0 7px 22px rgba(0, 0, 0, 0.3); white-space: pre-wrap;
        }
        .fin-msg-row.user .fin-bubble { background: linear-gradient(135deg, rgba(139,92,246,0.22), rgba(11,18,32,0.75)); border-color: rgba(139, 92, 246, .3); border-radius: 13px 13px 3px 13px; }
        .fin-msg-row.assistant .fin-bubble { border-radius: 3px 13px 13px 13px; }
        .fin-bubble.error { color: #f43f5e; background: rgba(244, 63, 94, .14); border-color: rgba(244, 63, 94, .3); }
        .fin-typing { display: inline-flex; gap: 4px; align-items: center; padding: 4px 0; }
        .fin-typing span { width: 6px; height: 6px; border-radius: 50%; background: #8b5cf6; animation: fin-blink 1.2s infinite ease-in-out; }
        .fin-typing span:nth-child(2) { animation-delay: 0.2s; }
        .fin-typing span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes fin-blink { 0%, 80%, 100% { opacity: 0.25; } 40% { opacity: 1; } }

        .fin-composer-section { flex: 0 0 auto; border-top: 1px solid rgba(255, 255, 255, .05); padding: 12px 18px 14px; background: rgba(11, 18, 32, 0.6); }
        .fin-quick-actions { display: flex; gap: 7px; margin-bottom: 10px; overflow-x: auto; }
        .fin-quick-action { flex: 1; min-width: 0; height: 34px; border: 1px solid rgba(255, 255, 255, .07); background: #0d1526; border-radius: 7px; color: #94a3b8; font-size: 9.5px; display: flex; align-items: center; justify-content: center; gap: 6px; white-space: nowrap; padding: 0 10px; }
        .fin-quick-action svg { width: 13px; color: #8b5cf6; }
        .fin-quick-action:disabled { opacity: 0.5; cursor: default; }
        .fin-composer { border: 1px solid rgba(255, 255, 255, .07); border-radius: 12px; background: rgba(11, 18, 32, 0.9); padding: 10px 10px 10px 15px; display: flex; align-items: center; gap: 10px; }
        .fin-composer input { flex: 1; border: 0; outline: 0; background: transparent; color: #f1f5f9; font-size: 12px; }
        .fin-send-button { width: 40px; height: 40px; flex: 0 0 auto; border: 0; border-radius: 9px; color: white; background: linear-gradient(135deg, #8b5cf6, #7c3aed); display: grid; place-items: center; }
        .fin-send-button:disabled { opacity: 0.5; }
        .fin-disclaimer { text-align: center; color: #5b6780; font-size: 8.5px; margin-top: 9px; }

        .fin-side { min-width: 0; display: flex; flex-direction: column; gap: 14px; padding-top: 4px; }
        .fin-card { border: 1px solid rgba(255, 255, 255, .07); border-radius: 12px; background: rgba(11, 18, 32, 0.86); padding: 15px 16px; box-shadow: 0 9px 25px rgba(0, 0, 0, 0.3); }
        .fin-card h3 { margin: 0 0 10px; color: #f1f5f9; font-size: 12.5px; font-weight: 700; }
        .fin-card p { margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.65; }

        .robot { position: relative; width: 46px; height: 46px; display: flex; align-items: center; justify-content: center; }
        .robot-glow { position: absolute; width: 40px; height: 40px; border-radius: 50%; background: radial-gradient(circle, rgba(139,92,246,0.3), transparent 70%); }
        .robot-head { position: relative; z-index: 2; width: 30px; height: 26px; border-radius: 45% 45% 40% 40%; background: linear-gradient(145deg, #0d1526, #1a1433); border: 2px solid rgba(139, 92, 246, .25); display: flex; align-items: center; justify-content: center; }
        .robot-face { width: 21px; height: 14px; border-radius: 7px; background: linear-gradient(145deg, #0d1526, #05080f); display: flex; align-items: center; justify-content: center; gap: 4px; }
        .robot-face span { width: 3px; height: 3px; border-radius: 50%; background: #22d3ee; box-shadow: 0 0 5px #22d3ee; }

        @media (max-width: 1100px) {
          .fin-body { grid-template-columns: minmax(0, 1fr); }
          .fin-side { display: none; }
        }
        @media (max-width: 760px) {
          .fin-sidebar { display: none; }
          .fin-topbar { flex-direction: column; gap: 12px; height: auto; }
        }
      `}</style>

      <main className="fin-page">
        <aside className="fin-sidebar">
          <div className="fin-brand">
            <img className="fin-brand-mark" src={platformLogoUrl(platform)} alt={`${platformLabel(platform)} logo`} />
            <div>
              <div className="fin-brand-text">
                {platformLabel(platform)}<span>.com</span>
              </div>
              <div className="fin-brand-sub">Finance Agent Special</div>
            </div>
          </div>

          <nav className="fin-nav">
            {FINANCE_NAV.map((item) => {
              const href = `/finance-agent-special/${platform}/${item.href}`;
              const Icon = item.icon;
              return (
                <Link key={item.href} href={href} className={`fin-nav-item ${pathname === href ? "active" : ""}`}>
                  <Icon />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <Link href="/ai-agents" className="fin-nav-item fin-back">
            <MessageSquare />
            <span>Back to Hub</span>
          </Link>
        </aside>

        <section className="fin-main">
          <header className="fin-topbar">
            <div className="fin-heading">
              <h1>
                Chat with AI Agent
                <Sparkles />
              </h1>
              <p>Real answers from {platformLabel(platform)}&apos;s live finance data</p>
            </div>
            <div className="fin-top-actions">
              <div className="fin-date">
                <CalendarDays size={15} />
                Live data
              </div>
              <button className="fin-bell">
                <Bell size={16} />
              </button>
            </div>
          </header>

          <div className="fin-body">
            <section className="fin-chat-panel">
              <header className="fin-chat-header">
                <div className="fin-chat-avatar">
                  <Robot />
                </div>
                <div className="fin-chat-info">
                  <strong>
                    {platformLabel(platform)} Finance Agent
                    <span className="fin-online-dot" />
                  </strong>
                  <p>Backed by real platform data{platform === "shadilife" ? " and OpenAI" : ""}</p>
                </div>
              </header>

              <div className="fin-messages">
                {messages.map((m, i) => (
                  <div key={i} className={`fin-msg-row ${m.role}`}>
                    {m.role === "assistant" && (
                      <div className="fin-msg-side">
                        <Robot small />
                      </div>
                    )}
                    <div className={`fin-bubble ${m.error ? "error" : ""}`}>{m.content}</div>
                  </div>
                ))}
                {sending && (
                  <div className="fin-msg-row assistant">
                    <div className="fin-msg-side">
                      <Robot small />
                    </div>
                    <div className="fin-bubble">
                      <span className="fin-typing">
                        <span />
                        <span />
                        <span />
                      </span>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              <div className="fin-composer-section">
                <div className="fin-quick-actions">
                  {QUICK_PROMPTS.map((q) => (
                    <button key={q.label} type="button" className="fin-quick-action" disabled={sending} onClick={() => send(q.label)}>
                      <q.icon />
                      {q.label}
                    </button>
                  ))}
                </div>

                <form
                  className="fin-composer"
                  onSubmit={(e) => {
                    e.preventDefault();
                    send(input);
                  }}
                >
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask about revenue, payouts, forecasts…"
                    disabled={sending}
                  />
                  <button type="submit" className="fin-send-button" disabled={sending || !input.trim()}>
                    <Send size={16} />
                  </button>
                </form>

                <div className="fin-disclaimer">AI responses can make mistakes. Please verify important information.</div>
              </div>
            </section>

            <aside className="fin-side">
              <div className="fin-card">
                <h3>What this agent can see</h3>
                <p>
                  {platform === "ghrfix"
                    ? "Wallet totals, accept fees, top-ups, bookings, and a 30-day token-flow forecast — pulled live from GhrFix's database."
                    : "Membership revenue, payment status, agent payouts, and month-over-month change — pulled live from ShadiLife's database."}
                </p>
              </div>
              <div className="fin-card">
                <h3>Try asking</h3>
                <p>
                  "What's our revenue this month?"
                  <br />
                  "How many payouts are pending?"
                  <br />
                  "Forecast the next 30 days."
                </p>
              </div>
            </aside>
          </div>
        </section>
      </main>
    </>
  );
}
