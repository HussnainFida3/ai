"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Crown, Send, CalendarClock, Layers3, Activity, Power, Trash2,
  CheckCircle2, AlertTriangle, Loader2, Sparkles, ChevronRight,
} from "lucide-react";

import { PLATFORMS, PLATFORM_LIST } from "@/lib/platforms";
import { apiFetch, ApiError } from "@/lib/api";

/**
 * The CEO command deck.
 *
 * Every other workspace in this console drives ONE agent on ONE platform.
 * This one sits above both, so the page is built around authority rather than
 * a dashboard of numbers: who reports to whom, what standing orders are
 * running unattended, and a command box that can reach any of it.
 *
 * The CEO tier is gold throughout, deliberately distinct from the purple used
 * by every agent workspace — at a glance you always know you are at the top of
 * the hierarchy and that what you type here carries real authority.
 */

interface PlatformNode {
  key: string;
  label: string;
  connection: string;
  connected: boolean;
}

interface CommandStructure {
  platforms: PlatformNode[];
  capabilities: {
    delegate: boolean;
    schedule: boolean;
    editContent: boolean;
    publishContent: boolean;
    crossPlatform: boolean;
  };
}

interface ScheduledTask {
  id: string;
  agentKey: string;
  label: string | null;
  brief: string;
  nextRunAt: string;
  repeatEveryMinutes: number | null;
  enabled: boolean;
  lastRunAt: string | null;
  lastStatus: string | null;
  lastResult: string | null;
  runCount: number;
  failureCount: number;
}

interface Msg {
  role: "user" | "assistant";
  content: string;
  tools?: string[];
}

const SUGGESTIONS = [
  "Give me an SEO report covering both sites",
  "Post 2 blogs a day at 10:00 and 18:00",
  "What needs my attention today across both platforms?",
  "Show me every standing order you're running",
];

function repeatLabel(mins: number | null) {
  if (!mins) return "Once";
  if (mins === 1440) return "Daily";
  if (mins === 10080) return "Weekly";
  if (mins === 60) return "Hourly";
  if (mins % 1440 === 0) return `Every ${mins / 1440} days`;
  if (mins % 60 === 0) return `Every ${mins / 60} hours`;
  return `Every ${mins} min`;
}

function whenLabel(iso: string) {
  const d = new Date(iso);
  const diff = d.getTime() - Date.now();
  const hrs = Math.round(Math.abs(diff) / 36e5);
  const rel = hrs < 1 ? "under an hour" : hrs < 48 ? `${hrs}h` : `${Math.round(hrs / 24)}d`;
  return `${d.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} · ${diff > 0 ? `in ${rel}` : `${rel} ago`}`;
}

export default function CeoPage() {
  const [structure, setStructure] = useState<CommandStructure | null>(null);
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyTask, setBusyTask] = useState<string | null>(null);

  const endRef = useRef<HTMLDivElement>(null);

  const loadStructure = useCallback(async () => {
    try {
      const res = await apiFetch<CommandStructure>("ghrfix", "/ai-agents/ceo/command-structure");
      setStructure(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not read the command structure.");
    }
  }, []);

  const loadTasks = useCallback(async () => {
    try {
      const res = await apiFetch<ScheduledTask[]>("ghrfix", "/ai-agents/ceo/scheduled-tasks");
      setTasks(res.data);
    } catch {
      // Standing orders are secondary — a failure here must not blank the page.
    }
  }, []);

  useEffect(() => {
    void loadStructure();
    void loadTasks();
  }, [loadStructure, loadTasks]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setDraft("");
    setSending(true);
    setError(null);

    try {
      const res = await apiFetch<{ reply: string; toolCallsExecuted: Array<{ name: string }> }>(
        "ghrfix",
        "/ai-agents/ceo/chat",
        { method: "POST", body: { message: trimmed, history } },
      );
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.data.reply, tools: res.data.toolCallsExecuted.map((t) => t.name) },
      ]);
      // The CEO may well have just scheduled something — reflect it immediately.
      void loadTasks();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The CEO could not be reached.");
    } finally {
      setSending(false);
    }
  }

  async function toggleTask(id: string) {
    if (busyTask) return;
    setBusyTask(id);
    try {
      await apiFetch("ghrfix", `/ai-agents/ceo/scheduled-tasks/${id}/toggle`, { method: "PATCH" });
      await loadTasks();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not change that order.");
    } finally {
      setBusyTask(null);
    }
  }

  async function deleteTask(id: string) {
    if (busyTask) return;
    setBusyTask(id);
    try {
      await apiFetch("ghrfix", `/ai-agents/ceo/scheduled-tasks/${id}`, { method: "DELETE" });
      await loadTasks();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not remove that order.");
    } finally {
      setBusyTask(null);
    }
  }

  const activeOrders = tasks.filter((t) => t.enabled).length;
  const totalAgents = PLATFORM_LIST.reduce((n, p) => n + p.agents.length, 0);

  return (
    <main className="ceo">
      <style jsx global>{`
        html, body { margin: 0; background: #05070e; }

        .ceo {
          min-height: 100vh;
          color: #eef2fb;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
          background:
            radial-gradient(circle at 12% -5%, rgba(245, 185, 66, 0.13), transparent 34%),
            radial-gradient(circle at 88% 4%, rgba(124, 58, 237, 0.11), transparent 30%),
            linear-gradient(180deg, #070a14 0%, #05070e 55%, #04060c 100%);
        }
        .ceo-shell { width: min(1400px, calc(100% - 44px)); margin: 0 auto; padding: 28px 0 72px; }

        .ceo-back {
          display: inline-flex; align-items: center; gap: 7px; margin-bottom: 22px;
          color: #8a94ad; text-decoration: none; font-size: 12px; font-weight: 650;
        }
        .ceo-back:hover { color: #f5b942; }

        /* ── Crown header ─────────────────────────────────────────── */
        .ceo-hero {
          position: relative; overflow: hidden; padding: 30px 32px; margin-bottom: 18px;
          border: 1px solid rgba(245, 185, 66, 0.2); border-radius: 24px;
          background:
            radial-gradient(circle at 0% 0%, rgba(245, 185, 66, 0.14), transparent 42%),
            linear-gradient(135deg, rgba(24, 21, 14, 0.96), rgba(10, 13, 24, 0.97));
          box-shadow: 0 26px 70px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(245, 185, 66, 0.12);
        }
        .ceo-hero::after {
          content: ""; position: absolute; right: -180px; top: -260px;
          width: 460px; height: 460px; border-radius: 50%; pointer-events: none;
          border: 1px solid rgba(245, 185, 66, 0.14);
          box-shadow: 0 0 0 54px rgba(245, 185, 66, 0.025), 0 0 0 110px rgba(245, 185, 66, 0.014);
        }
        .ceo-hero-row { position: relative; z-index: 1; display: flex; align-items: center; gap: 22px; flex-wrap: wrap; }
        .ceo-crown {
          width: 78px; height: 78px; flex: 0 0 auto; display: grid; place-items: center;
          border-radius: 24px; color: #0b0a06;
          background: linear-gradient(145deg, #f7cd6b, #d99a1f);
          box-shadow: 0 16px 40px rgba(217, 154, 31, 0.32), inset 0 1px 0 rgba(255, 255, 255, 0.45);
        }
        .ceo-eyebrow {
          display: flex; align-items: center; gap: 8px; margin-bottom: 8px;
          color: #f5b942; font-size: 10.5px; font-weight: 800; letter-spacing: 0.17em; text-transform: uppercase;
        }
        .ceo-title { margin: 0; font-size: clamp(27px, 3.1vw, 40px); font-weight: 830; letter-spacing: -0.042em; line-height: 1.05; }
        .ceo-title span { background: linear-gradient(90deg, #f7cd6b, #f0a63c); -webkit-background-clip: text; background-clip: text; color: transparent; }
        .ceo-sub { margin: 11px 0 0; max-width: 620px; color: #97a2ba; font-size: 13.5px; line-height: 1.7; }

        .ceo-stats { position: relative; z-index: 1; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 11px; margin-top: 26px; }
        .ceo-stat { padding: 14px 15px; border: 1px solid rgba(255,255,255,.07); border-radius: 15px; background: rgba(255,255,255,.028); }
        .ceo-stat-k { display: flex; align-items: center; gap: 6px; color: #7c879f; font-size: 9.5px; font-weight: 750; letter-spacing: .06em; text-transform: uppercase; }
        .ceo-stat-v { margin-top: 7px; font-size: 21px; font-weight: 820; letter-spacing: -0.035em; }

        /* ── Layout ───────────────────────────────────────────────── */
        .ceo-grid { display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(0, 1fr); gap: 18px; }
        .card {
          border: 1px solid rgba(255,255,255,.075); border-radius: 20px; overflow: hidden;
          background: linear-gradient(150deg, rgba(19,24,40,.8), rgba(10,14,26,.86));
          box-shadow: 0 16px 48px rgba(0,0,0,.2);
        }
        .card-head { display: flex; align-items: center; gap: 10px; padding: 16px 18px; border-bottom: 1px solid rgba(255,255,255,.06); }
        .card-head h2 { margin: 0; font-size: 13.5px; font-weight: 760; }
        .card-head .hint { margin-left: auto; color: #6b768e; font-size: 10.5px; font-weight: 600; }

        /* ── Chain of command ─────────────────────────────────────── */
        .realm { padding: 14px 16px; border-bottom: 1px solid rgba(255,255,255,.05); }
        .realm:last-child { border-bottom: 0; }
        .realm-top { display: flex; align-items: center; gap: 10px; }
        .realm-logo { width: 30px; height: 30px; border-radius: 9px; object-fit: contain; flex: 0 0 auto; }
        .realm-name { font-size: 13px; font-weight: 750; }
        .realm-meta { margin-top: 2px; color: #6b768e; font-size: 10.5px; }
        .pill { display: inline-flex; align-items: center; gap: 5px; padding: 4px 9px; border-radius: 999px; font-size: 9.5px; font-weight: 780; white-space: nowrap; }
        .pill.on { color: #7de2a5; background: rgba(34,197,94,.09); border: 1px solid rgba(34,197,94,.2); }
        .pill.off { color: #fbbf24; background: rgba(251,191,36,.09); border: 1px solid rgba(251,191,36,.22); }
        .agents { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 11px; padding-left: 40px; }
        .agent-chip {
          padding: 4px 9px; border-radius: 7px; font-size: 10px; font-weight: 650;
          color: #b6c0d4; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.055);
        }

        /* ── Command box ──────────────────────────────────────────── */
        .log { display: flex; flex-direction: column; gap: 14px; padding: 18px; min-height: 300px; max-height: 46vh; overflow-y: auto; }
        .empty { margin: auto; max-width: 400px; text-align: center; }
        .empty h3 { margin: 12px 0 5px; font-size: 14px; font-weight: 760; }
        .empty p { margin: 0; color: #6b768e; font-size: 11.5px; line-height: 1.7; }
        .turn { display: flex; flex-direction: column; gap: 5px; max-width: 84%; }
        .turn.me { align-self: flex-end; align-items: flex-end; }
        .who { color: #6b768e; font-size: 9.5px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
        .bubble { padding: 11px 14px; border-radius: 14px 14px 14px 4px; font-size: 12.5px; line-height: 1.75; white-space: pre-wrap; word-break: break-word;
          color: #dfe6f4; background: rgba(255,255,255,.045); border: 1px solid rgba(255,255,255,.06); }
        .turn.me .bubble { border-radius: 14px 14px 4px 14px; color: #120e04; border: 0; background: linear-gradient(135deg, #f7cd6b, #e9a833); font-weight: 600; }
        .used { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 2px; }
        .used span { padding: 2px 7px; border-radius: 5px; font-family: ui-monospace, monospace; font-size: 9px;
          color: #f5b942; background: rgba(245,185,66,.09); border: 1px solid rgba(245,185,66,.16); }
        .typing { display: flex; gap: 5px; padding: 14px 16px; }
        .typing i { width: 6px; height: 6px; border-radius: 50%; background: #f5b942; animation: blink 1.2s infinite; }
        .typing i:nth-child(2) { animation-delay: .18s } .typing i:nth-child(3) { animation-delay: .36s }
        @keyframes blink { 0%,80%,100% { opacity:.25 } 40% { opacity:1 } }

        .chips { display: flex; flex-wrap: wrap; gap: 6px; padding: 12px 18px 0; border-top: 1px solid rgba(255,255,255,.055); }
        .chip { display: inline-flex; align-items: center; gap: 6px; padding: 7px 11px; border-radius: 999px; cursor: pointer;
          color: #b6c0d4; background: rgba(255,255,255,.035); border: 1px solid rgba(255,255,255,.07); font-size: 10.5px; font-weight: 650; font-family: inherit; }
        .chip:hover:not(:disabled) { color: #f5b942; border-color: rgba(245,185,66,.3); background: rgba(245,185,66,.07); }
        .chip:disabled { opacity: .45; cursor: default; }

        .composer { display: flex; gap: 9px; padding: 13px 18px 16px; }
        .composer input {
          flex: 1; height: 44px; padding: 0 14px; border-radius: 12px; outline: 0; font-size: 12.5px; font-family: inherit;
          color: #eef2fb; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.09);
        }
        .composer input:focus { border-color: rgba(245,185,66,.5); box-shadow: 0 0 0 3px rgba(245,185,66,.09); }
        .composer input::placeholder { color: #5c6883; }
        .go { display: inline-flex; align-items: center; gap: 7px; height: 44px; padding: 0 17px; border: 0; border-radius: 12px; cursor: pointer;
          color: #120e04; font-size: 12px; font-weight: 780; font-family: inherit;
          background: linear-gradient(135deg, #f7cd6b, #e9a833); box-shadow: 0 10px 24px rgba(233,168,51,.24); }
        .go:disabled { opacity: .5; cursor: default; box-shadow: none; }
        .spin { animation: spin 0.9s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Standing orders ──────────────────────────────────────── */
        .order { padding: 13px 16px; border-bottom: 1px solid rgba(255,255,255,.05); }
        .order:last-child { border-bottom: 0; }
        .order-top { display: flex; align-items: center; gap: 8px; }
        .order-name { flex: 1; min-width: 0; font-size: 12px; font-weight: 720; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .order-brief { margin-top: 5px; color: #7c879f; font-size: 10.5px; line-height: 1.6; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .order-foot { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 9px; color: #6b768e; font-size: 10px; }
        .tag { padding: 3px 7px; border-radius: 6px; background: rgba(255,255,255,.045); border: 1px solid rgba(255,255,255,.06); font-weight: 680; }
        .tag.gold { color: #f5b942; background: rgba(245,185,66,.09); border-color: rgba(245,185,66,.18); }
        .tag.ok { color: #7de2a5; background: rgba(34,197,94,.08); border-color: rgba(34,197,94,.16); }
        .tag.bad { color: #fda4af; background: rgba(244,63,94,.08); border-color: rgba(244,63,94,.18); }
        .icon-btn { display: grid; place-items: center; width: 27px; height: 27px; border-radius: 8px; cursor: pointer;
          color: #8a94ad; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.07); }
        .icon-btn:hover:not(:disabled) { color: #f5b942; border-color: rgba(245,185,66,.3); }
        .icon-btn.danger:hover:not(:disabled) { color: #fda4af; border-color: rgba(244,63,94,.3); }
        .icon-btn:disabled { opacity: .4; cursor: default; }

        .none { padding: 26px 18px; text-align: center; color: #6b768e; font-size: 11.5px; line-height: 1.7; }
        .err { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; padding: 11px 14px; border-radius: 12px;
          color: #fda4af; background: rgba(244,63,94,.07); border: 1px solid rgba(244,63,94,.2); font-size: 11.5px; }

        @media (max-width: 1080px) {
          .ceo-grid { grid-template-columns: 1fr; }
          .ceo-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 620px) {
          .ceo-shell { width: calc(100% - 26px); }
          .ceo-hero { padding: 22px; }
          .agents { padding-left: 0; }
        }
      `}</style>

      <div className="ceo-shell">
        <Link href="/ai-agents" className="ceo-back">
          <ArrowLeft size={14} /> All agents
        </Link>

        {error && (
          <div className="err">
            <AlertTriangle size={15} /> {error}
          </div>
        )}

        {/* ── Crown ── */}
        <section className="ceo-hero">
          <div className="ceo-hero-row">
            <div className="ceo-crown">
              <Crown size={38} strokeWidth={2} />
            </div>
            <div style={{ flex: 1, minWidth: 260 }}>
              <div className="ceo-eyebrow">
                <Sparkles size={12} /> Executive tier
              </div>
              <h1 className="ceo-title">
                CEO Agent — <span>both platforms, one command.</span>
              </h1>
              <p className="ceo-sub">
                Above both Masters. It can question any agent on either platform, rewrite and publish site
                content, and set standing orders that run whether or not anyone is watching.
              </p>
            </div>
          </div>

          <div className="ceo-stats">
            <div className="ceo-stat">
              <div className="ceo-stat-k"><Layers3 size={11} /> Platforms</div>
              <div className="ceo-stat-v">
                {structure ? `${structure.platforms.filter((p) => p.connected).length}/${structure.platforms.length}` : "—"}
              </div>
            </div>
            <div className="ceo-stat">
              <div className="ceo-stat-k"><Activity size={11} /> Agents commanded</div>
              <div className="ceo-stat-v">{totalAgents}</div>
            </div>
            <div className="ceo-stat">
              <div className="ceo-stat-k"><CalendarClock size={11} /> Standing orders</div>
              <div className="ceo-stat-v">{activeOrders}</div>
            </div>
            <div className="ceo-stat">
              <div className="ceo-stat-k"><Crown size={11} /> Authority</div>
              <div className="ceo-stat-v" style={{ fontSize: 15, color: "#f5b942" }}>
                {structure?.capabilities.crossPlatform ? "Full" : "GhrFix only"}
              </div>
            </div>
          </div>
        </section>

        <div className="ceo-grid">
          {/* ── Command box ── */}
          <section className="card">
            <div className="card-head">
              <Crown size={15} color="#f5b942" />
              <h2>Command</h2>
              <span className="hint">Acts on live platforms</span>
            </div>

            <div className="log" role="log" aria-live="polite">
              {messages.length === 0 && !sending && (
                <div className="empty">
                  <Crown size={30} color="#f5b942" style={{ opacity: 0.6 }} />
                  <h3>Give an order.</h3>
                  <p>
                    Ask across both platforms, set a recurring instruction, or have content written and
                    published. What you type here is carried out, not simulated.
                  </p>
                </div>
              )}

              {messages.map((m, i) => (
                <div key={i} className={m.role === "user" ? "turn me" : "turn"}>
                  <span className="who">{m.role === "user" ? "You" : "CEO"}</span>
                  <div className="bubble">{m.content}</div>
                  {m.tools && m.tools.length > 0 && (
                    <div className="used">
                      {m.tools.map((t, j) => (
                        <span key={j}>{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {sending && (
                <div className="turn">
                  <span className="who">CEO</span>
                  <div className="bubble typing" aria-label="Working">
                    <i /><i /><i />
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            {messages.length === 0 && (
              <div className="chips">
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="button" className="chip" onClick={() => void send(s)} disabled={sending}>
                    <ChevronRight size={11} /> {s}
                  </button>
                ))}
              </div>
            )}

            <div className="composer">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send(draft);
                  }
                }}
                placeholder={sending ? "Working…" : "Order the CEO — it reaches every agent on both platforms"}
                aria-label="Command the CEO agent"
                disabled={sending}
              />
              <button type="button" className="go" onClick={() => void send(draft)} disabled={sending || !draft.trim()}>
                {sending ? <Loader2 size={14} className="spin" /> : <Send size={14} />}
                Send
              </button>
            </div>
          </section>

          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {/* ── Chain of command ── */}
            <section className="card">
              <div className="card-head">
                <Layers3 size={15} color="#f5b942" />
                <h2>Chain of command</h2>
              </div>

              {PLATFORM_LIST.map((p) => {
                const node = structure?.platforms.find((x) => x.key === p.key);
                const connected = node?.connected ?? false;
                return (
                  <div className="realm" key={p.key}>
                    <div className="realm-top">
                      <img className="realm-logo" src={p.logoUrl} alt="" aria-hidden="true" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="realm-name">{p.label}</div>
                        <div className="realm-meta">
                          {p.agents.length} agents · {node?.connection === "in-process" ? "same process" : "linked"}
                        </div>
                      </div>
                      <span className={`pill ${connected ? "on" : "off"}`}>
                        {connected ? <CheckCircle2 size={10} /> : <AlertTriangle size={10} />}
                        {connected ? "Under command" : "Unreachable"}
                      </span>
                    </div>
                    <div className="agents">
                      {p.agents.map((a) => (
                        <span className="agent-chip" key={a.key}>{a.name}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </section>

            {/* ── Standing orders ── */}
            <section className="card">
              <div className="card-head">
                <CalendarClock size={15} color="#f5b942" />
                <h2>Standing orders</h2>
                <span className="hint">{tasks.length} total</span>
              </div>

              {tasks.length === 0 ? (
                <div className="none">
                  No standing orders yet.
                  <br />
                  Try “post 2 blogs a day at 10:00 and 18:00”.
                </div>
              ) : (
                tasks.map((t) => (
                  <div className="order" key={t.id}>
                    <div className="order-top">
                      <div className="order-name">{t.label ?? t.agentKey}</div>
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => void toggleTask(t.id)}
                        disabled={busyTask !== null}
                        title={t.enabled ? "Pause this order" : "Resume this order"}
                        aria-label={t.enabled ? "Pause" : "Resume"}
                      >
                        <Power size={13} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn danger"
                        onClick={() => void deleteTask(t.id)}
                        disabled={busyTask !== null}
                        title="Remove this order"
                        aria-label="Remove"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    <div className="order-brief">{t.brief}</div>

                    <div className="order-foot">
                      <span className="tag gold">{t.agentKey}</span>
                      <span className="tag">{repeatLabel(t.repeatEveryMinutes)}</span>
                      {t.enabled ? (
                        <span className="tag">Next {whenLabel(t.nextRunAt)}</span>
                      ) : (
                        <span className="tag">Paused</span>
                      )}
                      {t.lastStatus && (
                        <span className={`tag ${t.lastStatus === "OK" ? "ok" : "bad"}`}>
                          Last run {t.lastStatus === "OK" ? "OK" : "failed"}
                        </span>
                      )}
                      {t.runCount > 0 && <span className="tag">{t.runCount}×</span>}
                    </div>
                  </div>
                ))
              )}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
