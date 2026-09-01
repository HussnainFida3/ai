"use client";

/**
 * ShadiLife — Verification Agent — Queue (domain tab).
 *
 * The deep-dive companion to the Dashboard's lighter overview: the full real
 * UNDER_REVIEW queue, searchable by name/city, paginated, with the AI
 * plausibility assist and the same human Approve/Reject writes.
 *
 * Real endpoints:
 *   GET  /api/ai-agents/verification/pending             → the real UNDER_REVIEW queue, oldest first
 *   GET  /api/ai-agents/verification/:userId/suggestion  → AI plausibility check (assist only, on demand)
 *   POST /api/admin/moderation/:userId/approve | /reject → the real human decision (real write)
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { AgentHeading } from "@/components/agents/AgentShell";
import { InsightsPanel, MetricCard, Svg } from "@/components/agents/rich";
import { Icons } from "@/components/agents/icons";
import type { AgentViewProps } from "../../registry";
import { ActionNote, Empty, ErrorNote, Panel, Pill, TableWrap, errText, platPost, shortDate, useLoad } from "../../shadilife/_kit";

interface PendingItem {
  userId: string;
  fullName?: string | null;
  city?: string | null;
  submittedAt?: string | null;
}
interface Suggestion {
  recommendation?: "approve" | "reject" | "needs_human_review" | string;
  confidence?: number;
  reasoning?: string;
}

function recTone(r: string | undefined): "green" | "amber" | "red" | "mute" {
  if (r === "approve") return "green";
  if (r === "reject") return "red";
  if (r === "needs_human_review") return "amber";
  return "mute";
}

const PAGE_SIZE = 10;

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

export default function ShadiLifeVerificationQueueView({ platform, agent, api }: AgentViewProps) {
  const load = useLoad<PendingItem[]>(async () => (await api.get<PendingItem[]>("/pending")).data ?? [], [platform.key]);
  const pending = load.data ?? [];

  const [suggestions, setSuggestions] = useState<Record<string, Suggestion>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [decided, setDecided] = useState<Record<string, "approve" | "reject">>({});
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  function getSuggestion(userId: string) {
    setLoadingId(userId);
    setActionError(null);
    api
      .get<Suggestion>(`/${encodeURIComponent(userId)}/suggestion`)
      .then(({ data }) => setSuggestions((prev) => ({ ...prev, [userId]: data ?? {} })))
      .catch((e: unknown) => setActionError(errText(e, "Could not get an AI suggestion for this profile.")))
      .finally(() => setLoadingId(null));
  }

  function decide(userId: string, action: "approve" | "reject") {
    setDecidingId(userId);
    setActionError(null);
    platPost(platform, `/admin/moderation/${encodeURIComponent(userId)}/${action}`, {})
      .then(() => setDecided((prev) => ({ ...prev, [userId]: action })))
      .catch((e: unknown) => setActionError(errText(e, `Could not ${action} this profile.`)))
      .finally(() => setDecidingId(null));
  }

  const visiblePending = useMemo(() => {
    const notDecided = pending.filter((p) => !decided[p.userId]);
    const q = search.trim().toLowerCase();
    if (!q) return notDecided;
    return notDecided.filter((p) => (p.fullName ?? "").toLowerCase().includes(q) || (p.city ?? "").toLowerCase().includes(q));
  }, [pending, decided, search]);

  const pageCount = Math.max(1, Math.ceil(visiblePending.length / PAGE_SIZE));
  const pageSafe = Math.min(page, pageCount - 1);
  const pageRows = visiblePending.slice(pageSafe * PAGE_SIZE, pageSafe * PAGE_SIZE + PAGE_SIZE);

  const suggestedCount = Object.keys(suggestions).length;
  const decidedCount = Object.keys(decided).length;

  return (
    <>
      <AgentHeading
        platform={platform}
        agent={agent}
        blurb="The full real UNDER_REVIEW queue — search, page through it, get an AI plausibility assist per profile, and Approve/Reject with the same write the moderation queue uses."
        actions={
          <>
            <button type="button" className="ag-btn ag-btn-solid" onClick={load.reload} disabled={load.loading}>
              <Svg path={Icons.refresh} size={14} /> {load.loading ? "Refreshing…" : "Refresh"}
            </button>
            <Link href={`/${platform.key}/${agent.key}`} className="ag-btn ag-btn-ghost">← Dashboard</Link>
          </>
        }
      />

      {load.error && <ErrorNote platform={platform} error={load.error} what="The verification queue could not load" />}
      <ActionNote error={actionError} />

      <div className="ag-metrics">
        <MetricCard icon={<Svg path={Icons.document} size={24} />} tone="gold" title="Waiting right now" value={load.loading ? "—" : String(visiblePending.length)} />
        <MetricCard icon={<Svg path={Icons.fingerprint} size={24} />} tone="purple" title="AI suggestions requested" value={String(suggestedCount)} />
        <MetricCard icon={<Svg path={Icons.check} size={24} />} tone="green" title="Decided this session" value={String(decidedCount)} />
        <MetricCard icon={<Svg path={Icons.filter} size={24} />} tone="blue" title="Matching search" value={search ? String(visiblePending.length) : "—"} />
      </div>

      <Panel
        title="Verification queue"
        sub={`${visiblePending.length} profile(s) waiting, oldest first`}
        actions={
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
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
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>City</th>
                    <th>Submitted</th>
                    <th>AI suggestion</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((p) => {
                    const s = suggestions[p.userId];
                    return (
                      <tr key={p.userId}>
                        <td style={{ fontWeight: 650 }}>{p.fullName || "—"}</td>
                        <td>{p.city || "—"}</td>
                        <td style={{ color: "var(--ag-ink-faint)" }}>{shortDate(p.submittedAt)}</td>
                        <td style={{ maxWidth: 280 }}>
                          {s ? (
                            <div>
                              <Pill text={s.recommendation ?? "—"} tone={recTone(s.recommendation)} />
                              {s.reasoning && <div style={{ fontSize: 11, color: "var(--ag-ink-soft)", marginTop: 5, lineHeight: 1.5 }}>{s.reasoning}</div>}
                            </div>
                          ) : (
                            <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" onClick={() => getSuggestion(p.userId)} disabled={loadingId === p.userId}>
                              {loadingId === p.userId ? "Asking…" : "Get AI suggestion"}
                            </button>
                          )}
                        </td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" onClick={() => decide(p.userId, "approve")} disabled={decidingId === p.userId}>
                              Approve
                            </button>
                            <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" onClick={() => decide(p.userId, "reject")} disabled={decidingId === p.userId}>
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableWrap>
            <div style={{ padding: "0 20px 16px" }}>
              <Pager page={pageSafe} pageCount={pageCount} onChange={setPage} />
            </div>
          </>
        ) : (
          <div className="ag-panel-body">
            <Empty>{load.loading ? "Loading the queue…" : search ? "No profiles match that search." : "Nothing waiting on verification right now."}</Empty>
          </div>
        )}
      </Panel>

      <div style={{ marginTop: 18 }}>
        <InsightsPanel
          rows={[
            ...((visiblePending.length ?? 0) > 0
              ? [{ icon: <Svg path={Icons.alert} size={15} />, label: "Queue depth", value: `${visiblePending.length} profile(s) are waiting right now.` }]
              : []),
            ...(decidedCount > 0
              ? [{ icon: <Svg path={Icons.check} size={15} />, label: "Decided this session", value: `${decidedCount} profile(s) moved out of the queue.` }]
              : []),
            ...(suggestedCount > 0
              ? [{ icon: <Svg path={Icons.fingerprint} size={15} />, label: "AI assists requested", value: `${suggestedCount} profile(s) got an AI plausibility check this session.` }]
              : []),
          ]}
        />
      </div>
    </>
  );
}
