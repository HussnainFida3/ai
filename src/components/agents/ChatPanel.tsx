"use client";

import { useEffect, useRef, useState } from "react";
import { ApiError, type AgentChatResult, type ChatTurn } from "@/lib/api";

interface Message extends ChatTurn {
  toolCalls?: Array<{ name: string; result: unknown }>;
}

export function ChatPanel({
  title,
  placeholder = "Ask anything about this platform…",
  suggestions = [],
  onSend,
}: {
  /** Fully-qualified agent name, e.g. "GhrFix — SEO Agent". */
  title: string;
  placeholder?: string;
  suggestions?: string[];
  onSend: (message: string, history: ChatTurn[]) => Promise<AgentChatResult>;
}) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: `Hi — I'm ${title}. Ask me anything; I look up real data before answering.` },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setError(null);
    setInput("");
    const history: ChatTurn[] = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content }]);
    setLoading(true);
    try {
      const result = await onSend(content, history);
      setMessages((prev) => [...prev, { role: "assistant", content: result.reply, toolCalls: result.toolCallsExecuted }]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reach the agent.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ag-chat">
      <div className="ag-chat-body" ref={bodyRef}>
        {messages.map((m, i) => (
          <div key={i} className={`ag-msg ${m.role === "user" ? "user" : ""}`}>
            <div className={`ag-msg-avatar ${m.role === "user" ? "user" : "agent"}`}>{m.role === "user" ? "You" : "✦"}</div>
            <div>
              <div className="ag-msg-bubble">
                {m.content}
                {m.toolCalls && m.toolCalls.length > 0 && (
                  <div className="ag-tool-row">
                    {m.toolCalls.map((t, j) => (
                      <span key={j} className="ag-tool-chip">✓ {t.name.replace(/_/g, " ")}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="ag-msg">
            <div className="ag-msg-avatar agent">✦</div>
            <div className="ag-msg-bubble"><span className="ag-typing"><i /><i /><i /></span></div>
          </div>
        )}
      </div>

      {suggestions.length > 0 && (
        <div className="ag-suggestions">
          {suggestions.map((s) => (
            <button key={s} type="button" className="ag-suggestion" onClick={() => send(s)} disabled={loading}>{s}</button>
          ))}
        </div>
      )}

      {error && <div className="ag-error-banner">{error}</div>}

      <div className="ag-chat-input-row">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={placeholder}
          disabled={loading}
        />
        <button type="button" className="ag-send-btn" onClick={() => send()} disabled={loading || !input.trim()} aria-label="Send">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2 11 13" /><path d="m22 2-7 20-4-9-9-4Z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
