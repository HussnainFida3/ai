"use client";

/**
 * ShadiLife — Developer & QA Agent — Health (domain tab).
 *
 * The deep-dive companion to the Dashboard's lighter overview: the real
 * type-check runner plus the FULL real AdminAuditLog feed (up to 100 rows,
 * the backend's own cap), searchable and paginated client-side.
 *
 * Real endpoints:
 *   POST /api/ai-agents/devqa/health-check          → spawns `npx tsc --noEmit`, real pass/fail
 *   GET  /api/ai-agents/devqa/activity-log?limit=100 → real AdminAuditLog rows
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { AgentHeading } from "@/components/agents/AgentShell";
import { BarList, InsightsPanel, MetricCard, Svg } from "@/components/agents/rich";
import { Icons } from "@/components/agents/icons";
import type { AgentViewProps } from "../../registry";
import { Badge, Empty, ErrorPanel, Panel, TableScroll, describeError, fmtDateTime, fmtInt, useAsync } from "../../shadilife/_shadilife-console-kit";

function humanizeAction(a: string): string {
  const s = a.replace(/[._-]+/g, " ").trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "—";
}

interface HealthCheckResult {
  passed?: boolean;
  errorCount?: number;
  output?: string;
}
interface AuditLogRow {
  id: string;
  adminId?: string;
  action?: string;
  targetType?: string;
  targetId?: string | null;
  createdAt?: string;
}

const PAGE_SIZE = 15;

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

export default function ShadiLifeDevQaHealthView({ platform, agent, api }: AgentViewProps) {
  const activity = useAsync<AuditLogRow[]>(platform, async () => (await api.get<AuditLogRow[]>("/activity-log", { limit: 100 })).data ?? [], true);

  const [result, setResult] = useState<HealthCheckResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  function runHealthCheck() {
    setRunning(true);
    setError(null);
    api
      .post<HealthCheckResult>("/health-check")
      .then(({ data }) => setResult(data ?? {}))
      .catch((e: unknown) => setError(describeError(e, platform)))
      .finally(() => setRunning(false));
  }

  const rows = activity.data ?? [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      humanizeAction(r.action ?? "").toLowerCase().includes(q) ||
      (r.targetType ?? "").toLowerCase().includes(q) ||
      (r.targetId ?? "").toLowerCase().includes(q),
    );
  }, [rows, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(pageSafe * PAGE_SIZE, pageSafe * PAGE_SIZE + PAGE_SIZE);

  const actionRows = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) map.set(r.action ?? "unknown", (map.get(r.action ?? "unknown") ?? 0) + 1);
    return [...map.entries()].map(([label, value]) => ({ label: humanizeAction(label), value })).sort((a, b) => b.value - a.value).slice(0, 10);
  }, [rows]);

  const hasRun = result !== null;

  return (
    <>
      <AgentHeading
        platform={platform}
        agent={agent}
        blurb="Full read-only engineering health: the real TypeScript compile pass, and every real admin action recorded — searchable, all 100 most recent rows the backend keeps."
        actions={
          <>
            <button type="button" className="ag-btn ag-btn-solid" onClick={runHealthCheck} disabled={running}>
              <Svg path={Icons.audit} size={14} /> {running ? "Type-checking…" : "Run type-check"}
            </button>
            <Link href={`/${platform.key}/${agent.key}`} className="ag-btn ag-btn-ghost">← Dashboard</Link>
          </>
        }
      />

      {error && <p style={{ margin: "0 0 16px", fontSize: 12, color: "var(--ag-red)" }}>{error}</p>}

      <div className="ag-metrics">
        <MetricCard icon={<Svg path={Icons.check} size={24} />} tone={hasRun ? (result?.passed ? "green" : "red") : "purple"} title="Last type-check" value={hasRun ? (result?.passed ? "Passed" : "Failed") : "—"} />
        <MetricCard icon={<Svg path={Icons.alert} size={24} />} tone="red" title="Errors found" value={hasRun ? fmtInt(result?.errorCount) : "—"} />
        <MetricCard icon={<Svg path={Icons.inbox} size={24} />} tone="blue" title="Audit rows loaded" value={activity.loading || activity.error ? "—" : fmtInt(rows.length)} />
        <MetricCard icon={<Svg path={Icons.gauge} size={24} />} tone="gold" title="Distinct action types" value={activity.loading || activity.error ? "—" : fmtInt(actionRows.length)} />
      </div>

      <div className="ag-split">
        <div className="ag-stack">
          <Panel title="Type-check output" sub="npx tsc --noEmit, run in the backend directory">
            {hasRun ? (
              <>
                <div style={{ marginBottom: 12 }}>
                  <Badge tone={result?.passed ? "green" : "red"}>{result?.passed ? "No compile errors" : `${result?.errorCount ?? 0} error(s)`}</Badge>
                </div>
                <pre style={{ margin: 0, padding: 14, borderRadius: 10, background: "var(--ag-bg)", border: "1px solid var(--ag-border)", fontSize: 11, lineHeight: 1.6, overflowX: "auto", maxHeight: 340, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {result?.output || "No output."}
                </pre>
              </>
            ) : (
              <Empty>{running ? "Compiling — this can take up to two minutes…" : "Not run yet this session."}</Empty>
            )}
          </Panel>

          <Panel
            title="Admin activity log"
            sub={`${filtered.length} of ${rows.length} row(s) shown — the real AdminAuditLog table, not a CI/CD release log`}
            actions={
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                placeholder="Search action, target…"
                style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--ag-border)", background: "var(--ag-bg)", color: "var(--ag-ink)", minWidth: 180 }}
              />
            }
            flush
          >
            {pageRows.length > 0 ? (
              <>
                <TableScroll>
                  <table className="ag-table">
                    <thead>
                      <tr><th>Action</th><th>Target</th><th>When</th></tr>
                    </thead>
                    <tbody>
                      {pageRows.map((r) => (
                        <tr key={r.id}>
                          <td style={{ fontWeight: 650 }}>{humanizeAction(r.action ?? "—")}</td>
                          <td style={{ color: "var(--ag-ink-soft)", fontSize: 11.5 }}>{r.targetType}{r.targetId ? ` · ${r.targetId.slice(0, 10)}…` : ""}</td>
                          <td style={{ color: "var(--ag-ink-faint)", whiteSpace: "nowrap" }}>{fmtDateTime(r.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableScroll>
                <div style={{ padding: "0 20px 16px" }}>
                  <Pager page={pageSafe} pageCount={pageCount} onChange={setPage} />
                </div>
              </>
            ) : (
              <div className="ag-panel-body"><Empty>{activity.loading ? "Loading…" : search ? "No rows match that search." : "No admin activity recorded yet."}</Empty></div>
            )}
          </Panel>

          {activity.error && <ErrorPanel message={activity.error} platform={platform} what="The activity log" />}
        </div>

        <div className="ag-stack">
          <Panel title="Most common actions" sub="Across the loaded activity log">
            <BarList rows={actionRows} ranked color={agent.accent} emptyText={activity.loading ? "Loading…" : "No activity recorded yet."} />
          </Panel>

          <InsightsPanel
            rows={[
              ...(hasRun
                ? [{ icon: <Svg path={Icons.check} size={15} />, label: result?.passed ? "Codebase is clean" : "Compile errors present", value: result?.passed ? "The last type-check found no compile errors." : `${result?.errorCount ?? 0} TypeScript error(s) need attention.` }]
                : []),
              ...(actionRows.length > 0
                ? [{ icon: <Svg path={Icons.audit} size={15} />, label: "Most frequent action", value: `${actionRows[0].label} occurred ${fmtInt(actionRows[0].value)} time(s) in the loaded log.` }]
                : []),
              ...(rows.length >= 100
                ? [{ icon: <Svg path={Icons.inbox} size={15} />, label: "Log is capped", value: "Showing the 100 most recent rows — the backend's own limit for this endpoint." }]
                : []),
            ]}
          />
        </div>
      </div>
    </>
  );
}
