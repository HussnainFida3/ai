"use client";

/**
 * ShadiLife — Profile Agent — Nudges (domain tab).
 *
 * The deep-dive companion to the Dashboard's lighter overview: the full
 * incomplete-profile nudge workflow — find candidates below a completion
 * threshold, draft a reminder, send it — with the candidate list searchable
 * by city and paginated, plus a log of nudges sent this session.
 *
 * Real endpoints:
 *   GET  /api/ai-agents/profile/nudge-candidates?thresholdPct  → real Profile.completionPct query
 *   POST /api/ai-agents/profile/nudge-draft { thresholdPct }   → drafts one generic reminder (AI)
 *   POST /api/ai-agents/profile/nudge-send { userIds, title, body } → real Notification rows (real write)
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { AgentHeading } from "@/components/agents/AgentShell";
import { InsightsPanel, MetricCard, Svg } from "@/components/agents/rich";
import { Icons } from "@/components/agents/icons";
import type { AgentViewProps } from "../../registry";
import { ActionNote, Empty, Panel, TableWrap, errText, num } from "../../shadilife/_kit";

interface NudgeCandidate {
  userId: string;
  fullName?: string | null;
  city?: string | null;
  completionPct?: number | null;
}
interface NudgeDraft {
  userIds?: string[];
  count?: number;
  thresholdPct?: number;
  title?: string;
  body?: string;
}

const PAGE_SIZE = 12;

function Pager({ page, pageCount, onChange }: { page: number; pageCount: number; onChange: (p: number) => void }) {
  if (pageCount <= 1) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, marginTop: 12, fontSize: 11.5, color: "var(--ag-ink-faint)" }}>
      <span>Page {page + 1} of {pageCount}</span>
      <div style={{ display: "flex", gap: 6 }}>
        <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" onClick={() => onChange(Math.max(0, page - 1))} disabled={page === 0}>← Prev</button>
        <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" onClick={() => onChange(Math.min(pageCount - 1, page + 1))} disabled={page >= pageCount - 1}>Next →</button>
      </div>
    </div>
  );
}

export default function ShadiLifeProfileNudgesView({ platform, agent, api }: AgentViewProps) {
  const [threshold, setThreshold] = useState(50);
  const [candidates, setCandidates] = useState<NudgeCandidate[] | null>(null);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [candidatesError, setCandidatesError] = useState<string | null>(null);

  const [draft, setDraft] = useState<NudgeDraft | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<number | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendLog, setSendLog] = useState<Array<{ at: string; title: string; count: number; sent: number }>>([]);

  const [citySearch, setCitySearch] = useState("");
  const [page, setPage] = useState(0);

  function loadCandidates() {
    setLoadingCandidates(true);
    setCandidatesError(null);
    setPage(0);
    api
      .get<NudgeCandidate[]>("/nudge-candidates", { thresholdPct: threshold })
      .then(({ data }) => setCandidates(data ?? []))
      .catch((e: unknown) => setCandidatesError(errText(e, "Could not load nudge candidates.")))
      .finally(() => setLoadingCandidates(false));
  }

  function draftNudge() {
    setDrafting(true);
    setDraftError(null);
    setSendResult(null);
    api
      .post<NudgeDraft>("/nudge-draft", { thresholdPct: threshold })
      .then(({ data }) => setDraft(data ?? {}))
      .catch((e: unknown) => setDraftError(errText(e, "Could not draft a reminder.")))
      .finally(() => setDrafting(false));
  }

  function sendNudge() {
    if (!draft?.userIds?.length || !draft.title || !draft.body) return;
    setSending(true);
    setSendError(null);
    api
      .post<{ sent?: number }>("/nudge-send", { userIds: draft.userIds, title: draft.title, body: draft.body })
      .then(({ data }) => {
        const sent = data?.sent ?? 0;
        setSendResult(sent);
        setSendLog((prev) => [{ at: new Date().toISOString(), title: draft.title ?? "", count: draft.userIds?.length ?? 0, sent }, ...prev]);
      })
      .catch((e: unknown) => setSendError(errText(e, "Could not send the reminder.")))
      .finally(() => setSending(false));
  }

  const filteredCandidates = useMemo(() => {
    const rows = candidates ?? [];
    const q = citySearch.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((c) => (c.city ?? "").toLowerCase().includes(q) || (c.fullName ?? "").toLowerCase().includes(q));
  }, [candidates, citySearch]);

  const pageCount = Math.max(1, Math.ceil(filteredCandidates.length / PAGE_SIZE));
  const pageSafe = Math.min(page, pageCount - 1);
  const pageRows = filteredCandidates.slice(pageSafe * PAGE_SIZE, pageSafe * PAGE_SIZE + PAGE_SIZE);

  const totalSentThisSession = sendLog.reduce((s, l) => s + l.sent, 0);

  return (
    <>
      <AgentHeading
        platform={platform}
        agent={agent}
        blurb="The full incomplete-profile nudge workflow — find every candidate below a completion threshold, draft a reminder, and send real in-app notifications."
        actions={<Link href={`/${platform.key}/${agent.key}`} className="ag-btn ag-btn-ghost">← Dashboard</Link>}
      />

      <div className="ag-metrics">
        <MetricCard icon={<Svg path={Icons.users} size={24} />} tone="gold" title="Below threshold" value={candidates ? num(candidates.length) : "—"} />
        <MetricCard icon={<Svg path={Icons.filter} size={24} />} tone="blue" title="Matching search" value={citySearch ? num(filteredCandidates.length) : "—"} />
        <MetricCard icon={<Svg path={Icons.message} size={24} />} tone="purple" title="Nudges sent this session" value={totalSentThisSession ? num(totalSentThisSession) : "—"} />
        <MetricCard icon={<Svg path={Icons.wand} size={24} />} tone="green" title="Drafts made this session" value={num(sendLog.length + (draft && !sendResult ? 1 : 0))} />
      </div>

      <div className="ag-split">
        <div className="ag-stack">
          <Panel title="Find nudge candidates" sub="GET /nudge-candidates?thresholdPct — real Profile.completionPct query">
            <div className="ag-form-grid">
              <div className="ag-field">
                <label htmlFor="threshold">Completion threshold (%)</label>
                <input id="threshold" type="number" min={1} max={100} value={threshold} onChange={(e) => setThreshold(Math.max(1, Math.min(100, Number(e.target.value) || 50)))} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 9, flexWrap: "wrap", marginTop: 12 }}>
              <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" onClick={loadCandidates} disabled={loadingCandidates}>
                {loadingCandidates ? "Loading…" : "Find candidates"}
              </button>
              <button type="button" className="ag-btn ag-btn-accent ag-btn-sm" onClick={draftNudge} disabled={drafting}>
                <Svg path={Icons.sparkle} size={13} /> {drafting ? "Drafting…" : "Draft reminder"}
              </button>
            </div>
            <ActionNote error={candidatesError ?? draftError} />

            {draft && draft.count !== undefined && (
              <div style={{ marginTop: 14, padding: 14, borderRadius: 12, background: "var(--ag-bg)", border: "1px solid var(--ag-border)" }}>
                {draft.count === 0 ? (
                  <Empty>No profiles are below {draft.thresholdPct}% completion.</Empty>
                ) : (
                  <>
                    <b style={{ fontSize: 12.5 }}>{draft.title}</b>
                    <p style={{ margin: "6px 0 10px", fontSize: 12, color: "var(--ag-ink-soft)", lineHeight: 1.6 }}>{draft.body}</p>
                    <p style={{ margin: "0 0 10px", fontSize: 11, color: "var(--ag-ink-faint)" }}>Will notify {draft.count} member(s).</p>
                    <button type="button" className="ag-btn ag-btn-solid ag-btn-sm" onClick={sendNudge} disabled={sending}>
                      <Svg path={Icons.send} size={13} /> {sending ? "Sending…" : "Send now"}
                    </button>
                    <ActionNote error={sendError} ok={sendResult !== null ? `Sent to ${sendResult} member(s).` : null} />
                  </>
                )}
              </div>
            )}
          </Panel>

          <Panel
            title="Nudge candidates"
            sub={`${filteredCandidates.length} of ${candidates?.length ?? 0} profile(s) below ${threshold}%`}
            actions={
              <input
                value={citySearch}
                onChange={(e) => { setCitySearch(e.target.value); setPage(0); }}
                placeholder="Search name or city…"
                style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--ag-border)", background: "var(--ag-bg)", color: "var(--ag-ink)", minWidth: 180 }}
              />
            }
            noBody
          >
            {pageRows.length > 0 ? (
              <>
                <TableWrap>
                  <table className="ag-table">
                    <thead><tr><th>Member</th><th>City</th><th style={{ textAlign: "right" }}>Completion</th></tr></thead>
                    <tbody>
                      {pageRows.map((c) => (
                        <tr key={c.userId}>
                          <td style={{ fontWeight: 650 }}>{c.fullName || "—"}</td>
                          <td>{c.city || "—"}</td>
                          <td style={{ textAlign: "right" }}>{c.completionPct != null ? `${c.completionPct}%` : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableWrap>
                <div style={{ padding: "0 20px 16px" }}>
                  <Pager page={pageSafe} pageCount={pageCount} onChange={setPage} />
                </div>
              </>
            ) : (
              <div className="ag-panel-body"><Empty>{candidates === null ? "Press “Find candidates” to load the list." : "No candidates match this search."}</Empty></div>
            )}
          </Panel>
        </div>

        <div className="ag-stack">
          <Panel title="Nudges sent this session" sub="Real Notification rows created via /nudge-send">
            {sendLog.length > 0 ? (
              <TableWrap>
                <table className="ag-table">
                  <thead><tr><th>Title</th><th style={{ textAlign: "right" }}>Sent</th><th>When</th></tr></thead>
                  <tbody>
                    {sendLog.map((l, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 650, maxWidth: 180 }}>{l.title}</td>
                        <td style={{ textAlign: "right" }}>{num(l.sent)}</td>
                        <td style={{ color: "var(--ag-ink-faint)", fontSize: 11 }}>{new Date(l.at).toLocaleTimeString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            ) : (
              <Empty>No nudges sent yet this session.</Empty>
            )}
          </Panel>

          <InsightsPanel
            rows={[
              ...(candidates && candidates.length > 0
                ? [{ icon: <Svg path={Icons.users} size={15} />, label: "Nudge opportunity", value: `${candidates.length} member(s) are below ${threshold}% completion and could use a reminder.` }]
                : []),
              ...(totalSentThisSession > 0
                ? [{ icon: <Svg path={Icons.message} size={15} />, label: "Sent this session", value: `${totalSentThisSession} real notification(s) delivered across ${sendLog.length} send(s).` }]
                : []),
            ]}
          />
        </div>
      </div>
    </>
  );
}
