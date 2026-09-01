"use client";

/**
 * ShadiLife — Moderation Agent — Queue (domain tab).
 *
 * The deep-dive companion to the Dashboard's lighter overview: the full real
 * profile-moderation queue AND the full open-reports inbox, switchable by
 * tab, each searchable/filterable, with the same AI-assisted triage and the
 * same human writes as before.
 *
 * Real endpoints:
 *   GET  /api/admin/moderation/queue                          → real UNDER_REVIEW profiles
 *   GET  /api/admin/reports?status=OPEN                        → real open reports
 *   GET  /api/ai-agents/moderation/:userId/suggestion          → AI fake-profile plausibility check (advisory)
 *   GET  /api/ai-agents/moderation/reports/:reportId/suggestion → AI severity triage (advisory)
 *   POST /api/admin/moderation/:userId/approve | /reject       → the real human decision (real write)
 *   PUT  /api/admin/reports/:id { status }                      → the real report decision (real write)
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { AgentHeading } from "@/components/agents/AgentShell";
import { InsightsPanel, MetricCard, Svg } from "@/components/agents/rich";
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
  platGet,
  platPost,
  platPut,
  severityTone,
  timeAgo,
  useLoad,
  type AdminReport,
} from "../../shadilife/_kit";

interface QueueProfile {
  userId: string;
  fullName?: string | null;
  city?: string | null;
  bio?: string | null;
  updatedAt?: string | null;
}
interface ProfileSuggestion {
  recommendation?: "approve" | "reject" | "needs_human_review" | string;
  confidence?: number;
  reasoning?: string;
}
interface ReportSuggestion {
  suggestedSeverity?: string;
  confidence?: number;
  reasoning?: string;
}

function recTone(r: string | undefined): "green" | "amber" | "red" | "mute" {
  if (r === "approve") return "green";
  if (r === "reject") return "red";
  if (r === "needs_human_review") return "amber";
  return "mute";
}

type Tab = "profiles" | "reports";

export default function ShadiLifeModerationQueueView({ platform, agent, api }: AgentViewProps) {
  const load = useLoad<{ queue: QueueProfile[]; reports: AdminReport[] }>(async () => {
    const [queue, reports] = await Promise.allSettled([
      platGet<QueueProfile[]>(platform, "/admin/moderation/queue"),
      platGet<AdminReport[]>(platform, "/admin/reports", { status: "OPEN" }),
    ]);
    const q = queue.status === "fulfilled" ? queue.value ?? [] : [];
    const r = reports.status === "fulfilled" ? reports.value ?? [] : [];
    if (queue.status === "rejected" && reports.status === "rejected") throw queue.reason;
    return { queue: q, reports: r };
  }, [platform.key]);

  const queue = load.data?.queue ?? [];
  const reports = load.data?.reports ?? [];

  const [tab, setTab] = useState<Tab>("profiles");
  const [profileSuggestions, setProfileSuggestions] = useState<Record<string, ProfileSuggestion>>({});
  const [reportSuggestions, setReportSuggestions] = useState<Record<string, ReportSuggestion>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [decidedProfiles, setDecidedProfiles] = useState<Record<string, "approve" | "reject">>({});
  const [resolvedReports, setResolvedReports] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");

  function suggestProfile(userId: string) {
    setLoadingId(userId);
    setActionError(null);
    api
      .get<ProfileSuggestion>(`/${encodeURIComponent(userId)}/suggestion`)
      .then(({ data }) => setProfileSuggestions((prev) => ({ ...prev, [userId]: data ?? {} })))
      .catch((e: unknown) => setActionError(errText(e, "Could not get an AI suggestion for this profile.")))
      .finally(() => setLoadingId(null));
  }
  function decideProfile(userId: string, action: "approve" | "reject") {
    setBusyId(userId);
    setActionError(null);
    platPost(platform, `/admin/moderation/${encodeURIComponent(userId)}/${action}`, {})
      .then(() => setDecidedProfiles((prev) => ({ ...prev, [userId]: action })))
      .catch((e: unknown) => setActionError(errText(e, `Could not ${action} this profile.`)))
      .finally(() => setBusyId(null));
  }
  function suggestReport(reportId: string) {
    setLoadingId(reportId);
    setActionError(null);
    api
      .get<ReportSuggestion>(`/reports/${encodeURIComponent(reportId)}/suggestion`)
      .then(({ data }) => setReportSuggestions((prev) => ({ ...prev, [reportId]: data ?? {} })))
      .catch((e: unknown) => setActionError(errText(e, "Could not triage this report.")))
      .finally(() => setLoadingId(null));
  }
  function resolveReport(reportId: string, status: "INVESTIGATING" | "RESOLVED") {
    setBusyId(reportId);
    setActionError(null);
    platPut(platform, `/admin/reports/${encodeURIComponent(reportId)}`, { status })
      .then(() => setResolvedReports((prev) => ({ ...prev, [reportId]: status })))
      .catch((e: unknown) => setActionError(errText(e, "Could not update this report.")))
      .finally(() => setBusyId(null));
  }

  const visibleQueue = useMemo(() => {
    const notDecided = queue.filter((p) => !decidedProfiles[p.userId]);
    const q = search.trim().toLowerCase();
    if (tab !== "profiles" || !q) return notDecided;
    return notDecided.filter((p) => (p.fullName ?? "").toLowerCase().includes(q) || (p.city ?? "").toLowerCase().includes(q));
  }, [queue, decidedProfiles, search, tab]);

  const visibleReports = useMemo(() => {
    let rows = reports.filter((r) => !resolvedReports[r.id ?? ""]);
    if (severityFilter) rows = rows.filter((r) => (r.severity ?? "").toUpperCase() === severityFilter);
    const q = search.trim().toLowerCase();
    if (tab === "reports" && q) rows = rows.filter((r) => (r.reason ?? "").toLowerCase().includes(q) || (r.description ?? "").toLowerCase().includes(q));
    return rows;
  }, [reports, resolvedReports, severityFilter, search, tab]);

  const actionedCount = Object.keys(decidedProfiles).length + Object.keys(resolvedReports).length;

  return (
    <>
      <AgentHeading
        platform={platform}
        agent={agent}
        blurb="Both real moderation queues in one deep-dive — profile decisions and the open-reports inbox — each with AI-assisted triage, search, and the exact same human writes as before."
        actions={
          <>
            <button type="button" className="ag-btn ag-btn-solid" onClick={load.reload} disabled={load.loading}>
              <Svg path={Icons.refresh} size={14} /> {load.loading ? "Refreshing…" : "Refresh"}
            </button>
            <Link href={`/${platform.key}/${agent.key}`} className="ag-btn ag-btn-ghost">← Dashboard</Link>
          </>
        }
      />

      {load.error && <ErrorNote platform={platform} error={load.error} what="Moderation queues could not load" />}
      <ActionNote error={actionError} />

      <div className="ag-metrics">
        <MetricCard icon={<Svg path={Icons.flag} size={24} />} tone="gold" title="Profiles pending" value={load.loading ? "—" : String(visibleQueue.length)} />
        <MetricCard icon={<Svg path={Icons.alert} size={24} />} tone="red" title="Open reports" value={load.loading ? "—" : String(visibleReports.length)} />
        <MetricCard icon={<Svg path={Icons.check} size={24} />} tone="green" title="Actioned this session" value={String(actionedCount)} />
        <MetricCard icon={<Svg path={Icons.stack} size={24} />} tone="purple" title="AI checks requested" value={String(Object.keys(profileSuggestions).length + Object.keys(reportSuggestions).length)} />
      </div>

      <div className="ag-tabs" style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <button type="button" className={`ag-btn ag-btn-sm ${tab === "profiles" ? "ag-btn-accent" : "ag-btn-ghost"}`} onClick={() => { setTab("profiles"); setSearch(""); }}>
          Profiles ({visibleQueue.length})
        </button>
        <button type="button" className={`ag-btn ag-btn-sm ${tab === "reports" ? "ag-btn-accent" : "ag-btn-ghost"}`} onClick={() => { setTab("reports"); setSearch(""); }}>
          Reports ({visibleReports.length})
        </button>
      </div>

      {tab === "profiles" ? (
        <Panel
          title="Profile moderation queue"
          sub={`${visibleQueue.length} profile(s) waiting`}
          actions={
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or city…"
              style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--ag-border)", background: "var(--ag-bg)", color: "var(--ag-ink)", minWidth: 180 }}
            />
          }
          noBody
        >
          {visibleQueue.length > 0 ? (
            <TableWrap>
              <table className="ag-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>City</th>
                    <th>AI check</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {visibleQueue.map((p) => {
                    const s = profileSuggestions[p.userId];
                    return (
                      <tr key={p.userId}>
                        <td style={{ fontWeight: 650 }}>{p.fullName || "—"}</td>
                        <td>{p.city || "—"}</td>
                        <td style={{ maxWidth: 260 }}>
                          {s ? (
                            <div>
                              <Pill text={s.recommendation ?? "—"} tone={recTone(s.recommendation)} />
                              {s.reasoning && <div style={{ fontSize: 11, color: "var(--ag-ink-soft)", marginTop: 5, lineHeight: 1.5 }}>{s.reasoning}</div>}
                            </div>
                          ) : (
                            <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" onClick={() => suggestProfile(p.userId)} disabled={loadingId === p.userId}>
                              {loadingId === p.userId ? "Checking…" : "Get AI check"}
                            </button>
                          )}
                        </td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" onClick={() => decideProfile(p.userId, "approve")} disabled={busyId === p.userId}>Approve</button>
                            <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" onClick={() => decideProfile(p.userId, "reject")} disabled={busyId === p.userId}>Reject</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableWrap>
          ) : (
            <div className="ag-panel-body"><Empty>{load.loading ? "Loading the queue…" : search ? "No profiles match that search." : "No profiles waiting on moderation."}</Empty></div>
          )}
        </Panel>
      ) : (
        <Panel
          title="Open reports"
          sub={`${visibleReports.length} report(s) open`}
          actions={
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search reason…"
                style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--ag-border)", background: "var(--ag-bg)", color: "var(--ag-ink)", minWidth: 160 }}
              />
              <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--ag-border)", background: "var(--ag-bg)", color: "var(--ag-ink)" }}>
                <option value="">All severities</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          }
          noBody
        >
          {visibleReports.length > 0 ? (
            <TableWrap>
              <table className="ag-table">
                <thead>
                  <tr>
                    <th>Reason</th>
                    <th>Severity</th>
                    <th>Reported</th>
                    <th>AI triage</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {visibleReports.map((r) => {
                    const id = r.id ?? "";
                    const s = reportSuggestions[id];
                    return (
                      <tr key={id}>
                        <td style={{ maxWidth: 220 }}>{r.reason || "—"}</td>
                        <td><Pill text={r.severity ?? "—"} tone={severityTone(r.severity)} /></td>
                        <td style={{ color: "var(--ag-ink-faint)" }}>{timeAgo(r.createdAt)}</td>
                        <td style={{ maxWidth: 240 }}>
                          {s ? (
                            <div>
                              <Pill text={s.suggestedSeverity ?? "—"} tone={severityTone(s.suggestedSeverity)} />
                              {s.reasoning && <div style={{ fontSize: 11, color: "var(--ag-ink-soft)", marginTop: 5, lineHeight: 1.5 }}>{s.reasoning}</div>}
                            </div>
                          ) : (
                            <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" onClick={() => suggestReport(id)} disabled={loadingId === id}>
                              {loadingId === id ? "Triaging…" : "Get AI triage"}
                            </button>
                          )}
                        </td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" onClick={() => resolveReport(id, "INVESTIGATING")} disabled={busyId === id}>Investigate</button>
                            <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" onClick={() => resolveReport(id, "RESOLVED")} disabled={busyId === id}>Resolve</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableWrap>
          ) : (
            <div className="ag-panel-body"><Empty>{load.loading ? "Loading reports…" : "No open reports match this filter."}</Empty></div>
          )}
        </Panel>
      )}

      <div style={{ marginTop: 18 }}>
        <InsightsPanel
          rows={[
            ...(visibleQueue.length > 0
              ? [{ icon: <Svg path={Icons.flag} size={15} />, label: "Profiles queue depth", value: `${visibleQueue.length} profile(s) are waiting on a moderation decision.` }]
              : []),
            ...(visibleReports.length > 0
              ? [{ icon: <Svg path={Icons.alert} size={15} />, label: "Reports open", value: `${visibleReports.length} report(s) are currently open.` }]
              : []),
            ...(actionedCount > 0
              ? [{ icon: <Svg path={Icons.check} size={15} />, label: "Actioned this session", value: `${Object.keys(decidedProfiles).length} profile(s), ${Object.keys(resolvedReports).length} report(s).` }]
              : []),
          ]}
        />
      </div>
    </>
  );
}
