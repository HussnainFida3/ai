"use client";

/**
 * ShadiLife — Ops Agent — Queue (domain tab).
 *
 * Real endpoints behind this page:
 *   GET /api/ai-agents/ops/schedule-health → the real AgentSchedule table (loads free, no AI)
 *   GET /api/ai-agents/ops/health-summary  → real server + security snapshot, plus one AI call (owner-triggered)
 *
 * The Dashboard tab keeps the server-health headline; this page is the
 * operational queue itself — every scheduled job (filterable by status,
 * searchable) and every suspicious IP the security snapshot flags — with
 * its own independent fetch of both endpoints.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { BarList, MetricCard, Svg } from "@/components/agents/rich";
import { AgentHeading } from "@/components/agents/AgentShell";
import { Icons } from "@/components/agents/icons";
import type { AgentViewProps } from "../../registry";
import { Badge, Empty, ErrorPanel, Panel, TableScroll, describeError, fmtDateTime, fmtInt, useAsync } from "../../shadilife/_shadilife-console-kit";

interface SuspiciousIp {
  ipAddress?: string;
  failedLoginCount?: number;
}
interface SecurityStats {
  eventTypeCountsLast30d?: Record<string, number>;
  suspiciousIps?: SuspiciousIp[];
  activeIpBlocks?: number;
}
interface HealthSummary {
  summary?: string;
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

type StatusFilter = "all" | "enabled" | "paused" | "failed";

export default function ShadiLifeOpsQueueView({ platform, agent, api }: AgentViewProps) {
  const schedules = useAsync<AgentSchedule[]>(platform, async () => (await api.get<AgentSchedule[]>("/schedule-health")).data ?? [], true);

  const [health, setHealth] = useState<HealthSummary | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [healthError, setHealthError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  function runHealthCheck() {
    setLoadingHealth(true);
    setHealthError(null);
    api
      .get<HealthSummary>("/health-summary")
      .then(({ data }) => setHealth(data ?? {}))
      .catch((e: unknown) => setHealthError(describeError(e, platform)))
      .finally(() => setLoadingHealth(false));
  }

  const rows = schedules.data ?? [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((s) => {
      if (statusFilter === "enabled" && !s.enabled) return false;
      if (statusFilter === "paused" && s.enabled) return false;
      if (statusFilter === "failed" && !s.lastRunError) return false;
      if (q) {
        const hay = `${s.label ?? ""} ${s.agentKey ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, statusFilter, search]);

  const enabledCount = rows.filter((s) => s.enabled).length;
  const failedCount = rows.filter((s) => s.lastRunError).length;

  const suspiciousIps = health?.security?.suspiciousIps ?? [];
  const typeRows = Object.entries(health?.security?.eventTypeCountsLast30d ?? {}).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);

  return (
    <>
      <AgentHeading
        platform={platform}
        agent={agent}
        blurb="The real operational queue — every scheduled background job and every IP address the security snapshot flags — filterable and searchable."
        actions={
          <>
            <button type="button" className="ag-btn ag-btn-solid" onClick={runHealthCheck} disabled={loadingHealth}>
              <Svg path={Icons.shield} size={14} /> {loadingHealth ? "Checking…" : health ? "Re-run security check" : "Run security check"}
            </button>
            <Link href={`/${platform.key}/${agent.key}`} className="ag-btn ag-btn-ghost">← Dashboard</Link>
          </>
        }
      />

      {schedules.error && <ErrorPanel message={schedules.error} platform={platform} what="Schedule health" />}
      {healthError && <p style={{ margin: "0 0 16px", fontSize: 12, color: "var(--ag-red)" }}>{healthError}</p>}

      <div className="ag-metrics">
        <MetricCard icon={<Svg path={Icons.stack} size={24} />} tone="purple" title="Scheduled jobs" value={fmtInt(rows.length)} />
        <MetricCard icon={<Svg path={Icons.check} size={24} />} tone="green" title="Enabled" value={fmtInt(enabledCount)} />
        <MetricCard icon={<Svg path={Icons.alert} size={24} />} tone="red" title="Failed last run" value={fmtInt(failedCount)} />
        <MetricCard icon={<Svg path={Icons.fingerprint} size={24} />} tone="gold" title="Suspicious IPs" value={health ? fmtInt(suspiciousIps.length) : "—"} />
        <MetricCard icon={<Svg path={Icons.shield} size={24} />} tone="blue" title="Active IP blocks" value={health ? fmtInt(health.security?.activeIpBlocks) : "—"} />
      </div>

      <div className="ag-split">
        <div className="ag-stack">
          <Panel
            title="Scheduled jobs"
            sub="The real AgentSchedule table"
            flush
            actions={
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {(["all", "enabled", "paused", "failed"] as StatusFilter[]).map((f) => (
                  <button key={f} type="button" className={`ag-btn ag-btn-sm ${statusFilter === f ? "ag-btn-solid" : "ag-btn-ghost"}`} onClick={() => setStatusFilter(f)}>
                    {f === "all" ? "All" : f === "enabled" ? "Enabled" : f === "paused" ? "Paused" : "Failed"}
                  </button>
                ))}
              </div>
            }
          >
            <div style={{ padding: "14px 20px 0" }}>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by job or agent key…" style={{ width: "100%", maxWidth: 280 }} />
            </div>
            {filtered.length > 0 ? (
              <TableScroll>
                <table className="ag-table">
                  <thead>
                    <tr><th>Job</th><th>Status</th><th>Last run</th></tr>
                  </thead>
                  <tbody>
                    {filtered.map((s) => (
                      <tr key={s.id}>
                        <td>
                          <div style={{ fontWeight: 650 }}>{s.label || s.agentKey}</div>
                          <div style={{ fontSize: 10.5, color: "var(--ag-ink-faint)" }}>{s.cronExpression}</div>
                        </td>
                        <td><Badge tone={s.enabled ? "green" : "mute"}>{s.enabled ? "Enabled" : "Paused"}</Badge></td>
                        <td style={{ fontSize: 11, color: s.lastRunError ? "var(--ag-red)" : "var(--ag-ink-faint)" }}>
                          {s.lastRunError ? `Failed — ${s.lastRunError.slice(0, 60)}` : fmtDateTime(s.lastRunAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableScroll>
            ) : (
              <div style={{ padding: "0 20px 20px" }}>
                <Empty>{schedules.loading ? "Loading…" : "No job matches this filter."}</Empty>
              </div>
            )}
          </Panel>

          <Panel title="Event types" sub="Last 30 days, from the security snapshot">
            <BarList rows={typeRows} ranked color={agent.accent} emptyText={loadingHealth ? "Loading…" : "Run the security check to populate this."} />
          </Panel>
        </div>

        <div className="ag-stack">
          <Panel title="Suspicious IPs" sub="3+ failed logins in the last 30 days" flush>
            {suspiciousIps.length > 0 ? (
              <TableScroll>
                <table className="ag-table">
                  <thead>
                    <tr><th>IP address</th><th style={{ textAlign: "right" }}>Failed logins</th></tr>
                  </thead>
                  <tbody>
                    {[...suspiciousIps].sort((a, b) => (b.failedLoginCount ?? 0) - (a.failedLoginCount ?? 0)).map((ip) => (
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
                <Empty>{loadingHealth ? "Loading…" : health ? "No IP shows a repeated failed-login pattern." : "Run the security check to populate this."}</Empty>
              </div>
            )}
          </Panel>

          {health?.summary && (
            <Panel title="Latest health note" sub="From the security check run above">
              <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.7, color: "var(--ag-ink-soft)", whiteSpace: "pre-wrap" }}>{health.summary}</p>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
