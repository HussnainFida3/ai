"use client";

/**
 * ShadiLife — Support Agent — Tickets (domain tab).
 *
 * Real endpoints behind this page:
 *   GET  /api/admin/reports                  → real disputes/escalations queue (the closest thing to a ticket)
 *   POST /api/ai-agents/support/draft-reply   { userQuestion, context } → { draft }
 *
 * The Dashboard tab keeps the general-purpose drafting tools; this page is
 * the queue itself — filterable by status and severity, searchable by
 * reason, paginated — with a click-through detail panel that drafts a
 * contextual reply seeded from the selected report's own reason text.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { AgentHeading } from "@/components/agents/AgentShell";
import { DonutChart, MetricCard, Svg } from "@/components/agents/rich";
import { Icons } from "@/components/agents/icons";
import type { AgentViewProps } from "../../registry";
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
} from "../../shadilife/_kit";

type StatusFilter = "all" | "OPEN" | "INVESTIGATING" | "RESOLVED";
type SeverityFilter = "all" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

const PAGE_SIZE = 10;

export default function ShadiLifeSupportTicketsView({ platform, agent, api }: AgentViewProps) {
  const load = useLoad<AdminReport[]>(() => platGet<AdminReport[]>(platform, "/admin/reports"), [platform.key]);
  const reports = load.data ?? [];

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AdminReport | null>(null);

  const [draft, setDraft] = useState<string | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reports.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (severityFilter !== "all" && r.severity !== severityFilter) return false;
      if (q && !(r.reason ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [reports, statusFilter, severityFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageClamped = Math.min(page, totalPages);
  const pageRows = filtered.slice((pageClamped - 1) * PAGE_SIZE, pageClamped * PAGE_SIZE);

  const statusRows = tally(reports, (r) => r.status ?? null);
  const openCount = reports.filter((r) => r.status === "OPEN").length;
  const investigatingCount = reports.filter((r) => r.status === "INVESTIGATING").length;
  const resolvedCount = reports.filter((r) => r.status === "RESOLVED").length;

  function selectReport(r: AdminReport) {
    setSelected(r);
    setDraft(null);
    setDraftError(null);
  }

  function draftForSelected() {
    if (!selected || drafting) return;
    setDrafting(true);
    setDraftError(null);
    api
      .post<{ draft?: string }>("/draft-reply", {
        userQuestion: selected.reason || "A member has an open dispute/escalation.",
        context: [selected.description, selected.severity ? `Severity: ${selected.severity}` : null].filter(Boolean).join(". ") || undefined,
      })
      .then(({ data }) => setDraft(data?.draft ?? ""))
      .catch((e: unknown) => setDraftError(errText(e, "Could not draft a reply.")))
      .finally(() => setDrafting(false));
  }

  return (
    <>
      <AgentHeading
        platform={platform}
        agent={agent}
        blurb="The real dispute/escalation queue — filter by status and severity, search by reason, and draft a contextual reply for any row."
        actions={
          <>
            <button type="button" className="ag-btn ag-btn-ghost" onClick={load.reload} disabled={load.loading}>
              <Svg path={Icons.refresh} size={14} /> {load.loading ? "Refreshing…" : "Refresh"}
            </button>
            <Link href={`/${platform.key}/${agent.key}`} className="ag-btn ag-btn-ghost">← Dashboard</Link>
          </>
        }
      />

      {load.error && <ErrorNote platform={platform} error={load.error} what="The reports queue could not load" />}

      <div className="ag-metrics">
        <MetricCard icon={<Svg path={Icons.alert} size={24} />} tone="red" title="Open disputes" value={load.loading || load.error ? "—" : num(openCount)} />
        <MetricCard icon={<Svg path={Icons.clock} size={24} />} tone="gold" title="Investigating" value={load.loading || load.error ? "—" : num(investigatingCount)} />
        <MetricCard icon={<Svg path={Icons.check} size={24} />} tone="green" title="Resolved" value={load.loading || load.error ? "—" : num(resolvedCount)} />
        <MetricCard icon={<Svg path={Icons.inbox} size={24} />} tone="blue" title="Total on file" value={load.loading || load.error ? "—" : num(reports.length)} />
      </div>

      <div className="ag-split">
        <div className="ag-stack">
          <Panel
            title="Disputes & escalations"
            sub="Real Report rows — click one to draft a contextual reply"
            noBody
            actions={
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as StatusFilter); setPage(1); }}>
                  <option value="all">All statuses</option>
                  <option value="OPEN">Open</option>
                  <option value="INVESTIGATING">Investigating</option>
                  <option value="RESOLVED">Resolved</option>
                </select>
                <select value={severityFilter} onChange={(e) => { setSeverityFilter(e.target.value as SeverityFilter); setPage(1); }}>
                  <option value="all">All severities</option>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
            }
          >
            <div style={{ padding: "14px 20px 0" }}>
              <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search by reason…" style={{ width: "100%", maxWidth: 280 }} />
            </div>
            {pageRows.length > 0 ? (
              <>
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
                      {pageRows.map((r) => (
                        <tr key={r.id} onClick={() => selectReport(r)} style={{ cursor: "pointer", background: selected?.id === r.id ? "color-mix(in srgb, var(--ag-accent) 8%, transparent)" : undefined }}>
                          <td style={{ maxWidth: 260 }}>{r.reason || "—"}</td>
                          <td><Pill text={r.severity ?? "—"} tone={severityTone(r.severity)} /></td>
                          <td><Pill text={r.status ?? "—"} tone={statusTone(r.status)} /></td>
                          <td style={{ color: "var(--ag-ink-faint)", whiteSpace: "nowrap" }}>{timeAgo(r.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableWrap>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px" }}>
                  <span style={{ fontSize: 11, color: "var(--ag-ink-faint)" }}>{filtered.length} on file · page {pageClamped} of {totalPages}</span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={pageClamped <= 1}>← Prev</button>
                    <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={pageClamped >= totalPages}>Next →</button>
                  </div>
                </div>
              </>
            ) : (
              <div className="ag-panel-body"><Empty>{load.loading ? "Loading…" : "No report matches this filter."}</Empty></div>
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

          <Panel title="Selected report" sub={selected ? "POST /support/draft-reply, seeded from this row" : "Click a row on the left to select it"}>
            {selected ? (
              <>
                <p style={{ margin: "0 0 6px", fontSize: 12.5, fontWeight: 650 }}>{selected.reason || "—"}</p>
                {selected.description && <p style={{ margin: "0 0 10px", fontSize: 11.5, color: "var(--ag-ink-soft)", lineHeight: 1.6 }}>{selected.description}</p>}
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  <Pill text={selected.severity ?? "—"} tone={severityTone(selected.severity)} />
                  <Pill text={selected.status ?? "—"} tone={statusTone(selected.status)} />
                </div>
                <button type="button" className="ag-btn ag-btn-accent ag-btn-sm" onClick={draftForSelected} disabled={drafting}>
                  <Svg path={Icons.sparkle} size={13} /> {drafting ? "Drafting…" : "Draft a reply"}
                </button>
                <ActionNote error={draftError} />
                {draft && (
                  <div style={{ marginTop: 14, padding: 14, borderRadius: 12, background: "var(--ag-bg)", border: "1px solid var(--ag-border)", fontSize: 12.5, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                    {draft || "No draft returned."}
                  </div>
                )}
              </>
            ) : (
              <Empty>No report selected.</Empty>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
