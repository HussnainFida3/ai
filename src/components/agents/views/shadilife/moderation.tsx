"use client";

/**
 * ShadiLife — Moderation Agent — Dashboard overview.
 *
 * Lighter overview than before: the full profile queue and open-reports
 * inbox, with AI-assisted triage and Approve/Reject/Resolve, now live on
 * the Queue tab (components/agents/views/domain/shadilife/moderation.tsx).
 * This page keeps the fraud-summary metrics, severity breakdown, response
 * time, and a short teaser of each queue.
 *
 *   GET  /api/admin/moderation/queue    → real UNDER_REVIEW profiles (teaser only)
 *   GET  /api/admin/reports?status=OPEN  → real open reports (teaser only)
 *   GET  /api/admin/dashboard             → fraudSummary (queue-depth context)
 */

import Link from "next/link";
import { AgentHeading } from "@/components/agents/AgentShell";
import { BarList, DonutChart, InsightsPanel, MetricCard, Svg } from "@/components/agents/rich";
import { Icons } from "@/components/agents/icons";
import type { AgentViewProps } from "../registry";
import {
  Empty,
  ErrorNote,
  Panel,
  Pill,
  TableWrap,
  num,
  platGet,
  severityTone,
  tally,
  timeAgo,
  useLoad,
  type AdminDashboard,
  type AdminReport,
} from "./_kit";

interface QueueProfile {
  userId: string;
  fullName?: string | null;
  city?: string | null;
  bio?: string | null;
  updatedAt?: string | null;
}

export default function ShadiLifeModerationView({ platform, agent }: AgentViewProps) {
  const load = useLoad<{ queue: QueueProfile[]; reports: AdminReport[]; dash: AdminDashboard | null }>(async () => {
    const [queue, reports, dash] = await Promise.allSettled([
      platGet<QueueProfile[]>(platform, "/admin/moderation/queue"),
      platGet<AdminReport[]>(platform, "/admin/reports", { status: "OPEN" }),
      platGet<AdminDashboard>(platform, "/admin/dashboard"),
    ]);
    const q = queue.status === "fulfilled" ? queue.value ?? [] : [];
    const r = reports.status === "fulfilled" ? reports.value ?? [] : [];
    const d = dash.status === "fulfilled" ? dash.value : null;
    if (queue.status === "rejected" && reports.status === "rejected" && dash.status === "rejected") throw queue.reason;
    return { queue: q, reports: r, dash: d };
  }, [platform.key]);

  const queue = load.data?.queue ?? [];
  const reports = load.data?.reports ?? [];
  const dash = load.data?.dash ?? null;

  const severityRows = tally(reports, (r) => r.severity ?? null);

  return (
    <>
      <AgentHeading
        platform={platform}
        agent={agent}
        blurb="Fraud-summary metrics and severity breakdown at a glance. The full profile queue and reports inbox with AI-assisted triage live on the Queue tab."
        actions={
          <>
            <Link href={`/${platform.key}/${agent.key}/queue`} className="ag-btn ag-btn-solid">
              <Svg path={Icons.flag} size={14} /> Open Queue
            </Link>
            <Link href={`/${platform.key}/${agent.key}/chat`} className="ag-btn ag-btn-ghost">Ask this agent →</Link>
          </>
        }
      />

      {load.error && <ErrorNote platform={platform} error={load.error} what="Moderation queues could not load" />}

      <div className="ag-metrics">
        <MetricCard icon={<Svg path={Icons.flag} size={24} />} tone="gold" title="Profiles pending" value={load.loading ? "—" : num(dash?.fraudSummary?.pendingModeration ?? queue.length)} />
        <MetricCard icon={<Svg path={Icons.alert} size={24} />} tone="red" title="Open reports" value={load.loading ? "—" : num(dash?.fraudSummary?.openReports ?? reports.length)} />
        <MetricCard icon={<Svg path={Icons.shield} size={24} />} tone="purple" title="Auto-flagged" value={load.loading ? "—" : num(dash?.fraudSummary?.autoFlaggedReports)} />
        <MetricCard icon={<Svg path={Icons.check} size={24} />} tone="green" title="Resolved (all time)" value={load.loading ? "—" : num(dash?.fraudSummary?.resolvedAllTime)} />
      </div>

      <div className="ag-split">
        <div className="ag-stack">
          <Panel
            title="Profile moderation queue"
            sub={`${queue.length} profile(s) waiting — showing the top 5`}
            actions={<Link href={`/${platform.key}/${agent.key}/queue`} className="ag-btn ag-btn-ghost ag-btn-sm">View all in Queue →</Link>}
            noBody
          >
            {queue.length > 0 ? (
              <TableWrap>
                <table className="ag-table">
                  <thead><tr><th>Member</th><th>City</th></tr></thead>
                  <tbody>
                    {queue.slice(0, 5).map((p) => (
                      <tr key={p.userId}>
                        <td style={{ fontWeight: 650 }}>{p.fullName || "—"}</td>
                        <td>{p.city || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            ) : (
              <div className="ag-panel-body"><Empty>{load.loading ? "Loading the queue…" : "No profiles waiting on moderation."}</Empty></div>
            )}
          </Panel>

          <Panel
            title="Open reports"
            sub={`${reports.length} report(s) open — showing the top 5`}
            actions={<Link href={`/${platform.key}/${agent.key}/queue`} className="ag-btn ag-btn-ghost ag-btn-sm">View all in Queue →</Link>}
            noBody
          >
            {reports.length > 0 ? (
              <TableWrap>
                <table className="ag-table">
                  <thead><tr><th>Reason</th><th>Severity</th><th>Reported</th></tr></thead>
                  <tbody>
                    {reports.slice(0, 5).map((r) => (
                      <tr key={r.id}>
                        <td style={{ maxWidth: 220 }}>{r.reason || "—"}</td>
                        <td><Pill text={r.severity ?? "—"} tone={severityTone(r.severity)} /></td>
                        <td style={{ color: "var(--ag-ink-faint)" }}>{timeAgo(r.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            ) : (
              <div className="ag-panel-body"><Empty>{load.loading ? "Loading reports…" : "No open reports."}</Empty></div>
            )}
          </Panel>
        </div>

        <div className="ag-stack">
          <Panel title="Open reports by severity" sub="Real Report rows, status = OPEN">
            {severityRows.length > 0 ? (
              <DonutChart
                data={severityRows.map((r) => ({ label: r.label, value: r.value, color: r.label === "HIGH" ? "#ef4444" : r.label === "MEDIUM" ? "#f59e0b" : "#22c55e" }))}
                totalLabel="Open reports"
              />
            ) : (
              <Empty>{load.loading ? "Loading…" : "No open reports."}</Empty>
            )}
          </Panel>

          <Panel title="Response time" sub="Average hours to resolve, all time">
            <BarList
              rows={dash?.fraudSummary?.avgResponseHours != null ? [{ label: "Avg. hours to resolve", value: Math.round((dash.fraudSummary.avgResponseHours ?? 0) * 10) / 10 }] : []}
              color={agent.accent}
              emptyText={load.loading ? "Loading…" : "No resolved reports yet."}
            />
          </Panel>

          <InsightsPanel
            rows={[
              ...(dash?.fraudSummary?.pendingModeration !== undefined
                ? [{ icon: <Svg path={Icons.flag} size={15} />, label: "Queue depth", value: `${num(dash?.fraudSummary?.pendingModeration)} profile(s) are waiting on a moderation decision.` }]
                : []),
              ...(severityRows.length > 0
                ? [{ icon: <Svg path={Icons.alert} size={15} />, label: "Most common severity", value: `${severityRows[0].label} accounts for ${num(severityRows[0].value)} of the open reports.` }]
                : []),
              { icon: <Svg path={Icons.check} size={15} />, label: "AI-assisted triage", value: "Get an AI check per profile and per report, then Approve/Reject/Resolve on the Queue tab." },
            ]}
          />
        </div>
      </div>
    </>
  );
}
