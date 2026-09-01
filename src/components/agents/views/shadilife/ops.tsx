"use client";

/**
 * ShadiLife — Ops Agent.
 *
 * Real endpoints behind this page:
 *   GET  /api/ai-agents/ops/health-summary  → real server (CPU/RAM/disk/uptime) + security snapshot, plus one AI call
 *   GET  /api/ai-agents/ops/schedule-health → the real AgentSchedule table (loads free, no AI)
 *   POST /api/ai-agents/ops/ask             { question } → { answer }
 *
 * The health summary reads real OS-level stats (os.loadavg, os.totalmem,
 * fs.statfsSync) and real SecurityEvent history, then spends one OpenAI
 * call narrating them — so, like every other AI-costing page here, it
 * only runs when the owner presses "Run health check."
 */

import { useState } from "react";
import Link from "next/link";
import { BarList, DonutChart, InsightsPanel, MetricCard, Svg } from "@/components/agents/rich";
import { AgentHeading } from "@/components/agents/AgentShell";
import { Icons } from "@/components/agents/icons";
import type { AgentViewProps } from "../registry";
import { AiBullets, Badge, Empty, ErrorPanel, Panel, TableScroll, describeError, fmtDateTime, fmtInt, fmtPct, useAsync } from "./_shadilife-console-kit";

interface ServerStats {
  cpuLoadPct?: number;
  cpuCount?: number;
  memoryUsedPct?: number;
  memoryTotalGb?: number;
  memoryFreeGb?: number;
  diskUsedPct?: number;
  diskTotalGb?: number;
  diskFreeGb?: number;
  uptimeHours?: number;
  platform?: string;
}
interface SuspiciousIp {
  ipAddress?: string;
  failedLoginCount?: number;
}
interface SecurityStats {
  eventCountLast24h?: number;
  eventCountLast7d?: number;
  eventCountLast30d?: number;
  failedLoginCountLast30d?: number;
  eventsBySeverityLast30d?: Record<string, number>;
  eventTypeCountsLast30d?: Record<string, number>;
  suspiciousIps?: SuspiciousIp[];
  activeIpBlocks?: number;
}
interface HealthSummary {
  summary?: string;
  server?: ServerStats;
  security?: SecurityStats;
}
interface AgentSchedule {
  id: string;
  agentKey?: string;
  label?: string;
  cronExpression?: string;
  enabled?: boolean;
  lastRunAt?: string | null;
  lastRunError?: string | null;
}

const SEVERITY_COLOR: Record<string, string> = { INFO: "#38bdf8", WARNING: "#f59e0b", CRITICAL: "#ef4444" };

export default function ShadiLifeOpsView({ platform, agent, api }: AgentViewProps) {
  const schedules = useAsync<AgentSchedule[]>(platform, async () => (await api.get<AgentSchedule[]>("/schedule-health")).data ?? [], true);

  const [health, setHealth] = useState<HealthSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);

  function runHealthCheck() {
    setLoading(true);
    setError(null);
    api
      .get<HealthSummary>("/health-summary")
      .then(({ data }) => setHealth(data ?? {}))
      .catch((e: unknown) => setError(describeError(e, platform)))
      .finally(() => setLoading(false));
  }

  function ask() {
    if (!question.trim() || asking) return;
    setAsking(true);
    setAskError(null);
    api
      .post<{ answer?: string }>("/ask", { question: question.trim() })
      .then(({ data }) => setAnswer(data?.answer ?? ""))
      .catch((e: unknown) => setAskError(describeError(e, platform)))
      .finally(() => setAsking(false));
  }

  const server = health?.server ?? null;
  const security = health?.security ?? null;
  const hasRun = health !== null;

  const severityRows = Object.entries(security?.eventsBySeverityLast30d ?? {}).map(([label, value]) => ({ label, value, color: SEVERITY_COLOR[label] }));
  const typeRows = Object.entries(security?.eventTypeCountsLast30d ?? {}).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);

  return (
    <>
      <AgentHeading
        platform={platform}
        agent={agent}
        blurb="Real server resources (CPU/RAM/disk/uptime) plus real 24h/7d/30d security events and per-IP failed-login patterns — read-only, never deploys or restarts anything."
        actions={
          <>
            <button type="button" className="ag-btn ag-btn-solid" onClick={runHealthCheck} disabled={loading}>
              <Svg path={Icons.server} size={14} /> {loading ? "Checking…" : hasRun ? "Re-run health check" : "Run health check"}
            </button>
            <Link href={`/${platform.key}/${agent.key}/chat`} className="ag-btn ag-btn-ghost">Ask this agent →</Link>
          </>
        }
      />

      {error && <p style={{ margin: "0 0 16px", fontSize: 12, color: "var(--ag-red)" }}>{error}</p>}

      <div className="ag-metrics">
        <MetricCard icon={<Svg path={Icons.server} size={24} />} tone="blue" title="CPU load" value={hasRun ? fmtPct(server?.cpuLoadPct) : "—"} />
        <MetricCard icon={<Svg path={Icons.database} size={24} />} tone="purple" title="Memory used" value={hasRun ? fmtPct(server?.memoryUsedPct) : "—"} />
        <MetricCard icon={<Svg path={Icons.document} size={24} />} tone="gold" title="Disk used" value={hasRun && server?.diskUsedPct !== undefined ? fmtPct(server.diskUsedPct) : "—"} />
        <MetricCard icon={<Svg path={Icons.clock} size={24} />} tone="green" title="Uptime" value={hasRun ? `${fmtInt(server?.uptimeHours)}h` : "—"} />
        <MetricCard icon={<Svg path={Icons.shield} size={24} />} tone="red" title="Failed logins (30d)" value={hasRun ? fmtInt(security?.failedLoginCountLast30d) : "—"} />
      </div>

      <div className="ag-split">
        <div className="ag-stack">
          <Panel title="Health summary" sub="One AI call narrating the real snapshot below">
            {health?.summary ? (
              <AiBullets body={health.summary} />
            ) : (
              <Empty>{loading ? "Reading server resources and the security event log…" : "No health check run yet this session."}</Empty>
            )}
          </Panel>

          <div className="ag-duo">
            <Panel title="Security events by severity" sub="Last 30 days">
              {severityRows.length > 0 ? (
                <DonutChart data={severityRows} totalLabel="Events" />
              ) : (
                <Empty>{loading ? "Loading…" : "Run the health check to populate this."}</Empty>
              )}
            </Panel>
            <Panel title="Event types" sub="Last 30 days">
              <BarList rows={typeRows} ranked color={agent.accent} emptyText={loading ? "Loading…" : "Run the health check to populate this."} />
            </Panel>
          </div>

          <Panel
            title="Suspicious IPs"
            sub="Top 5 — the Queue tab has the full list plus every scheduled job"
            flush
            actions={<Link href={`/${platform.key}/${agent.key}/queue`} className="ag-btn ag-btn-ghost ag-btn-sm">View all in Queue →</Link>}
          >
            {(security?.suspiciousIps ?? []).length > 0 ? (
              <TableScroll>
                <table className="ag-table">
                  <thead>
                    <tr><th>IP address</th><th style={{ textAlign: "right" }}>Failed logins</th></tr>
                  </thead>
                  <tbody>
                    {[...(security?.suspiciousIps ?? [])].sort((a, b) => (b.failedLoginCount ?? 0) - (a.failedLoginCount ?? 0)).slice(0, 5).map((ip) => (
                      <tr key={ip.ipAddress}>
                        <td style={{ fontWeight: 650 }}>{ip.ipAddress}</td>
                        <td style={{ textAlign: "right" }}>{fmtInt(ip.failedLoginCount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableScroll>
            ) : (
              <div style={{ padding: "0 20px 20px" }}>
                <Empty>{loading ? "Loading…" : hasRun ? "No IP shows a repeated failed-login pattern." : "Run the health check to populate this."}</Empty>
              </div>
            )}
          </Panel>

          <Panel title="Ask a question" sub="POST /ops/ask">
            <div className="ag-field">
              <label htmlFor="ops-q">Question</label>
              <input id="ops-q" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="e.g. Is any IP address showing a brute-force pattern?" />
            </div>
            <div style={{ marginTop: 12 }}>
              <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" onClick={ask} disabled={asking || !question.trim()}>
                {asking ? "Thinking…" : "Ask"}
              </button>
            </div>
            {askError && <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--ag-red)" }}>{askError}</p>}
            {answer && <p style={{ margin: "12px 0 0", fontSize: 12.5, lineHeight: 1.7, color: "var(--ag-ink-soft)" }}>{answer}</p>}
          </Panel>
        </div>

        <div className="ag-stack">
          <Panel
            title="Scheduled jobs"
            sub="Top 5 — the Queue tab lets you filter by status and search"
            flush
            actions={<Link href={`/${platform.key}/${agent.key}/queue`} className="ag-btn ag-btn-ghost ag-btn-sm">View all in Queue →</Link>}
          >
            {(schedules.data ?? []).length > 0 ? (
              <TableScroll>
                <table className="ag-table">
                  <thead>
                    <tr><th>Job</th><th>Status</th><th>Last run</th></tr>
                  </thead>
                  <tbody>
                    {(schedules.data ?? []).slice(0, 5).map((s) => (
                      <tr key={s.id}>
                        <td>
                          <div style={{ fontWeight: 650 }}>{s.label || s.agentKey}</div>
                          <div style={{ fontSize: 10.5, color: "var(--ag-ink-faint)" }}>{s.cronExpression}</div>
                        </td>
                        <td><Badge tone={s.enabled ? "green" : "mute"}>{s.enabled ? "Enabled" : "Paused"}</Badge></td>
                        <td style={{ fontSize: 11, color: s.lastRunError ? "var(--ag-red)" : "var(--ag-ink-faint)" }}>
                          {s.lastRunError ? "Failed" : fmtDateTime(s.lastRunAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableScroll>
            ) : (
              <div style={{ padding: "0 20px 20px" }}>
                <Empty>{schedules.loading ? "Loading…" : "No scheduled jobs found."}</Empty>
              </div>
            )}
          </Panel>

          {schedules.error && <ErrorPanel message={schedules.error} platform={platform} what="Schedule health" />}

          <InsightsPanel
            rows={[
              ...((security?.activeIpBlocks ?? 0) > 0
                ? [{ icon: <Svg path={Icons.shield} size={15} />, label: "Active IP blocks", value: `${fmtInt(security?.activeIpBlocks)} IP range(s) are currently blocked.` }]
                : []),
              ...(typeRows.length > 0
                ? [{ icon: <Svg path={Icons.alert} size={15} />, label: "Most common event", value: `${typeRows[0].label} accounts for ${fmtInt(typeRows[0].value)} of the last 30 days' events.` }]
                : []),
              ...((schedules.data ?? []).some((s) => s.lastRunError)
                ? [{ icon: <Svg path={Icons.alert} size={15} />, label: "Job failure", value: `${(schedules.data ?? []).filter((s) => s.lastRunError).length} scheduled job(s) failed on their last run.` }]
                : []),
            ]}
          />
        </div>
      </div>
    </>
  );
}
