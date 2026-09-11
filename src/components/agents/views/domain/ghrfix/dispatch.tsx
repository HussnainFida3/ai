"use client";

/**
 * GhrFix — Dispatch Agent — Matching Funnel.
 *
 * The health of dispatch: of the jobs requested, how many reach a provider,
 * how fast, what's stuck unaccepted right now, and where coverage is failing.
 *   GET /funnel?windowDays  · GET /unaccepted  · GET /coverage-gaps
 */

import { useState } from "react";
import Link from "next/link";
import { InsightsPanel, MetricCard, Svg } from "@/components/agents/rich";
import { Icons } from "@/components/agents/icons";
import type { AgentViewProps } from "../../registry";
import { Empty, ErrorNote, Panel, Pill, TableWrap, useLoad } from "../../ghrfix/_kit-core";

interface Funnel {
  windowDays: number;
  total: number;
  accepted: number;
  completed: number;
  cancelled: number;
  openNow: number;
  acceptanceRate: number;
  completionRate: number;
  avgAcceptMinutes: number | null;
  byStatus: Record<string, number>;
}
interface OpenJob {
  id: string;
  bookingNumber: string;
  category: string | null;
  city: string | null;
  providersNotified: number;
  ageMinutes: number;
}
interface Gaps {
  byCategory: Array<{ name: string; count: number }>;
  byCity: Array<{ name: string; count: number }>;
}

function ageTone(min: number): "green" | "amber" | "red" {
  if (min < 5) return "green";
  if (min < 30) return "amber";
  return "red";
}

export default function GhrfixDispatchView({ platform, agent, api }: AgentViewProps) {
  const [days, setDays] = useState(30);
  const funnel = useLoad<Funnel>(() => api.get<Funnel>("/funnel", { windowDays: days }).then((r) => r.data), [days]);
  const openJobs = useLoad<OpenJob[]>(() => api.get<OpenJob[]>("/unaccepted").then((r) => r.data), []);
  const gaps = useLoad<Gaps>(() => api.get<Gaps>("/coverage-gaps").then((r) => r.data), []);

  const f = funnel.data;

  return (
    <>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 18 }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 750, color: "var(--ag-ink)" }}>Matching Funnel</h1>
          <p style={{ margin: 0, fontSize: 12.5, color: "var(--ag-ink-soft)", maxWidth: 560, lineHeight: 1.6 }}>
            Of the jobs customers request, how many reach a provider, how fast, and where coverage is failing — the
            numbers a dispatch platform lives on.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            style={{ fontSize: 12, padding: "7px 10px", borderRadius: 8, border: "1px solid var(--ag-border)", background: "var(--ag-bg)", color: "var(--ag-ink)" }}
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <Link href={`/${platform.key}/${agent.key}`} className="ag-btn ag-btn-ghost">← Dashboard</Link>
        </div>
      </div>

      {funnel.error && <ErrorNote error={funnel.error} />}

      <div className="ag-metrics">
        <MetricCard icon={<Svg path={Icons.check} size={24} />} tone={f && f.acceptanceRate < 60 ? "gold" : "green"} title="Acceptance rate" value={f ? `${f.acceptanceRate}%` : "—"} />
        <MetricCard icon={<Svg path={Icons.clock} size={24} />} tone="blue" title="Avg time to accept" value={f ? (f.avgAcceptMinutes == null ? "—" : `${f.avgAcceptMinutes}m`) : "—"} />
        <MetricCard icon={<Svg path={Icons.alert} size={24} />} tone={f && f.openNow > 0 ? "red" : "green"} title="Open right now" value={f ? String(f.openNow) : "—"} />
        <MetricCard icon={<Svg path={Icons.target} size={24} />} tone="purple" title={`Requested (${days}d)`} value={f ? String(f.total) : "—"} />
      </div>

      <Panel title="This window" sub={`Requested → accepted → completed, last ${days} days`}>
        {f ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px,1fr))", gap: 12, padding: 4 }}>
            {[
              ["Requested", f.total],
              ["Accepted", f.accepted],
              ["Completed", f.completed],
              ["Cancelled", f.cancelled],
              ["Completion rate", `${f.completionRate}%`],
            ].map(([k, v]) => (
              <div key={String(k)} style={{ padding: "10px 12px", borderRadius: 10, background: "var(--ag-bg)", border: "1px solid var(--ag-border)" }}>
                <div style={{ fontSize: 10.5, color: "var(--ag-ink-faint)", textTransform: "uppercase", letterSpacing: ".04em" }}>{k}</div>
                <div style={{ fontSize: 18, fontWeight: 750, marginTop: 4 }}>{v}</div>
              </div>
            ))}
          </div>
        ) : (
          <Empty>{funnel.loading ? "Loading…" : "No data."}</Empty>
        )}
      </Panel>

      <div style={{ marginTop: 18 }}>
        <Panel title="Unaccepted right now" sub={`${openJobs.data?.length ?? 0} job(s) waiting for a provider`} noBody>
          {openJobs.data && openJobs.data.length > 0 ? (
            <TableWrap>
              <table className="ag-table">
                <thead><tr><th>Job</th><th>Category</th><th>City</th><th>Notified</th><th>Waiting</th></tr></thead>
                <tbody>
                  {openJobs.data.map((j) => (
                    <tr key={j.id}>
                      <td style={{ fontWeight: 650 }}>#{j.bookingNumber}</td>
                      <td>{j.category ?? "—"}</td>
                      <td>{j.city ?? "—"}</td>
                      <td>{j.providersNotified}</td>
                      <td><Pill text={`${j.ageMinutes}m`} tone={ageTone(j.ageMinutes)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          ) : (
            <div className="ag-panel-body"><Empty>{openJobs.loading ? "Loading…" : "Nothing unaccepted — every job has a provider. 🎉"}</Empty></div>
          )}
        </Panel>
      </div>

      {gaps.data && (gaps.data.byCategory.length > 0 || gaps.data.byCity.length > 0) && (
        <div style={{ marginTop: 18 }}>
          <InsightsPanel
            rows={[
              ...gaps.data.byCity.slice(0, 4).map((c) => ({ icon: <Svg path={Icons.alert} size={15} />, label: `Unmet demand — ${c.name}`, value: `${c.count} open job(s)` })),
              ...gaps.data.byCategory.slice(0, 4).map((c) => ({ icon: <Svg path={Icons.target} size={15} />, label: `Recruit — ${c.name}`, value: `${c.count} open job(s)` })),
            ]}
          />
        </div>
      )}
    </>
  );
}
