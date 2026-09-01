"use client";

/**
 * ShadiLife — Support Agent.
 *
 * Real endpoints behind this page:
 *   POST /api/ai-agents/support/draft-reply       { userQuestion, context } → { draft }
 *   POST /api/ai-agents/support/summarize-thread   { conversationId }        → { summary, messageCount }
 *   POST /api/ai-agents/support/faq-suggest        { question }              → { answer }
 *   GET  /api/admin/reports                                                   → real disputes/escalations queue
 *
 * There is no separate "support ticket" model in ShadiLife — member disputes
 * and escalations live in the same Report table Moderation works, which is
 * what the metrics and table below are built from. Every AI tool here
 * produces a draft only; the router itself never sends anything or resolves
 * a real ticket.
 */

import { useState } from "react";
import Link from "next/link";
import { AgentHeading } from "@/components/agents/AgentShell";
import { DonutChart, InsightsPanel, MetricCard, Svg } from "@/components/agents/rich";
import { Icons } from "@/components/agents/icons";
import type { AgentViewProps } from "../registry";
import {
  ActionNote,
  Empty,
  ErrorNote,
  Panel,
  Pill,
  TableWrap,
  errText,
  num,
  platGet,
  severityTone,
  statusTone,
  tally,
  timeAgo,
  useLoad,
  type AdminReport,
} from "./_kit";

export default function ShadiLifeSupportView({ platform, agent, api }: AgentViewProps) {
  const load = useLoad<AdminReport[]>(() => platGet<AdminReport[]>(platform, "/admin/reports"), [platform.key]);
  const reports = load.data ?? [];
  const statusRows = tally(reports, (r) => r.status ?? null);
  const openCount = reports.filter((r) => r.status === "OPEN").length;
  const investigatingCount = reports.filter((r) => r.status === "INVESTIGATING").length;
  const resolvedCount = reports.filter((r) => r.status === "RESOLVED").length;

  /* ── tool 1: draft a reply ─────────────────────────────────────── */
  const [question, setQuestion] = useState("");
  const [context, setContext] = useState("");
  const [draft, setDraft] = useState<string | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);

  function draftReply() {
    if (!question.trim() || drafting) return;
    setDrafting(true);
    setDraftError(null);
    api
      .post<{ draft?: string }>("/draft-reply", { userQuestion: question.trim(), context: context.trim() || undefined })
      .then(({ data }) => setDraft(data?.draft ?? ""))
      .catch((e: unknown) => setDraftError(errText(e, "Could not draft a reply.")))
      .finally(() => setDrafting(false));
  }

  /* ── tool 2: summarize a conversation ─────────────────────────────── */
  const [conversationId, setConversationId] = useState("");
  const [summary, setSummary] = useState<{ summary?: string; messageCount?: number } | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  function summarizeThread() {
    if (!conversationId.trim() || summarizing) return;
    setSummarizing(true);
    setSummaryError(null);
    api
      .post<{ summary?: string; messageCount?: number }>("/summarize-thread", { conversationId: conversationId.trim() })
      .then(({ data }) => setSummary(data ?? {}))
      .catch((e: unknown) => setSummaryError(errText(e, "Could not summarize this thread.")))
      .finally(() => setSummarizing(false));
  }

  /* ── tool 3: FAQ suggestion ─────────────────────────────────────── */
  const [faqQuestion, setFaqQuestion] = useState("");
  const [faqAnswer, setFaqAnswer] = useState<string | null>(null);
  const [faqing, setFaqing] = useState(false);
  const [faqError, setFaqError] = useState<string | null>(null);

  function suggestFaq() {
    if (!faqQuestion.trim() || faqing) return;
    setFaqing(true);
    setFaqError(null);
    api
      .post<{ answer?: string }>("/faq-suggest", { question: faqQuestion.trim() })
      .then(({ data }) => setFaqAnswer(data?.answer ?? ""))
      .catch((e: unknown) => setFaqError(errText(e, "Could not suggest an answer.")))
      .finally(() => setFaqing(false));
  }

  return (
    <>
      <AgentHeading
        platform={platform}
        agent={agent}
        blurb="Draft-only support tools grounded in ShadiLife's real plans, verification and payment process — every draft is reviewed and edited by a human before it's sent."
        actions={<Link href={`/${platform.key}/${agent.key}/chat`} className="ag-btn ag-btn-ghost">Ask this agent →</Link>}
      />

      {load.error && <ErrorNote platform={platform} error={load.error} what="The reports queue could not load" />}

      <div className="ag-metrics">
        <MetricCard icon={<Svg path={Icons.alert} size={24} />} tone="red" title="Open disputes" value={load.loading || load.error ? "—" : num(openCount)} />
        <MetricCard icon={<Svg path={Icons.clock} size={24} />} tone="gold" title="Investigating" value={load.loading || load.error ? "—" : num(investigatingCount)} />
        <MetricCard icon={<Svg path={Icons.check} size={24} />} tone="green" title="Resolved" value={load.loading || load.error ? "—" : num(resolvedCount)} />
        <MetricCard icon={<Svg path={Icons.message} size={24} />} tone="blue" title="Total on file" value={load.loading || load.error ? "—" : num(reports.length)} />
      </div>

      <div className="ag-split">
        <div className="ag-stack">
          <Panel title="Draft a reply" sub="POST /support/draft-reply — grounded in the real site process, never invents policy">
            <div className="ag-field">
              <label htmlFor="sup-q">Member's question</label>
              <textarea id="sup-q" rows={2} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="e.g. My manual bank transfer hasn't activated my plan yet." />
            </div>
            <div className="ag-field" style={{ marginTop: 10 }}>
              <label htmlFor="sup-ctx">Extra context (optional)</label>
              <input id="sup-ctx" value={context} onChange={(e) => setContext(e.target.value)} placeholder="e.g. Gold member, submitted transfer 2 days ago" />
            </div>
            <div style={{ marginTop: 12 }}>
              <button type="button" className="ag-btn ag-btn-accent ag-btn-sm" onClick={draftReply} disabled={drafting || !question.trim()}>
                <Svg path={Icons.sparkle} size={13} /> {drafting ? "Drafting…" : "Draft reply"}
              </button>
            </div>
            <ActionNote error={draftError} />
            {draft && (
              <div style={{ marginTop: 14, padding: 14, borderRadius: 12, background: "var(--ag-bg)", border: "1px solid var(--ag-border)", fontSize: 12.5, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                {draft || "No draft returned."}
              </div>
            )}
          </Panel>

          <Panel title="Summarize a conversation" sub="POST /support/summarize-thread — for picking up a thread mid-conversation">
            <div className="ag-field">
              <label htmlFor="sup-conv">Conversation ID</label>
              <input id="sup-conv" value={conversationId} onChange={(e) => setConversationId(e.target.value)} placeholder="cuid…" />
            </div>
            <div style={{ marginTop: 12 }}>
              <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" onClick={summarizeThread} disabled={summarizing || !conversationId.trim()}>
                {summarizing ? "Summarizing…" : "Summarize"}
              </button>
            </div>
            <ActionNote error={summaryError} />
            {summary && (
              <div style={{ marginTop: 14, padding: 14, borderRadius: 12, background: "var(--ag-bg)", border: "1px solid var(--ag-border)" }}>
                <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.7 }}>{summary.summary}</p>
                {summary.messageCount !== undefined && <p style={{ margin: "8px 0 0", fontSize: 11, color: "var(--ag-ink-faint)" }}>{summary.messageCount} message(s) in this thread.</p>}
              </div>
            )}
          </Panel>

          <Panel title="FAQ-style answer" sub="POST /support/faq-suggest — reusable answer, not a personal reply">
            <div className="ag-field">
              <label htmlFor="sup-faq">Question</label>
              <input id="sup-faq" value={faqQuestion} onChange={(e) => setFaqQuestion(e.target.value)} placeholder="e.g. How do I get CNIC verified?" />
            </div>
            <div style={{ marginTop: 12 }}>
              <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" onClick={suggestFaq} disabled={faqing || !faqQuestion.trim()}>
                {faqing ? "Writing…" : "Suggest answer"}
              </button>
            </div>
            <ActionNote error={faqError} />
            {faqAnswer && (
              <div style={{ marginTop: 14, padding: 14, borderRadius: 12, background: "var(--ag-bg)", border: "1px solid var(--ag-border)", fontSize: 12.5, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                {faqAnswer || "No answer returned."}
              </div>
            )}
          </Panel>

          <Panel
            title="Disputes & escalations"
            sub="Top 5 — the Tickets tab has the full queue, filters and a draft-reply panel"
            noBody
            actions={<Link href={`/${platform.key}/${agent.key}/tickets`} className="ag-btn ag-btn-ghost ag-btn-sm">View all in Tickets →</Link>}
          >
            {reports.length > 0 ? (
              <TableWrap>
                <table className="ag-table">
                  <thead>
                    <tr>
                      <th>Reason</th>
                      <th>Severity</th>
                      <th>Status</th>
                      <th>Filed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.slice(0, 5).map((r) => (
                      <tr key={r.id}>
                        <td style={{ maxWidth: 260 }}>{r.reason || "—"}</td>
                        <td><Pill text={r.severity ?? "—"} tone={severityTone(r.severity)} /></td>
                        <td><Pill text={r.status ?? "—"} tone={statusTone(r.status)} /></td>
                        <td style={{ color: "var(--ag-ink-faint)", whiteSpace: "nowrap" }}>{timeAgo(r.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            ) : (
              <div className="ag-panel-body"><Empty>{load.loading ? "Loading…" : "Nothing on file."}</Empty></div>
            )}
          </Panel>
        </div>

        <div className="ag-stack">
          <Panel title="Status breakdown" sub="All disputes/escalations on file">
            {statusRows.length > 0 ? (
              <DonutChart
                data={statusRows.map((r) => ({ label: r.label, value: r.value, color: r.label === "OPEN" ? "#ef4444" : r.label === "INVESTIGATING" ? "#f59e0b" : "#22c55e" }))}
                totalLabel="Reports"
              />
            ) : (
              <Empty>{load.loading ? "Loading…" : "Nothing on file."}</Empty>
            )}
          </Panel>

          <InsightsPanel
            rows={[
              ...(openCount > 0
                ? [{ icon: <Svg path={Icons.alert} size={15} />, label: "Needs attention", value: `${openCount} dispute(s) are still open.` }]
                : []),
              ...(reports.length > 0
                ? [{ icon: <Svg path={Icons.check} size={15} />, label: "Resolution rate", value: `${resolvedCount} of ${reports.length} on file are resolved.` }]
                : []),
            ]}
          />
        </div>
      </div>
    </>
  );
}
