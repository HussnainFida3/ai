"use client";

/**
 * ShadiLife — Finance Agent — Forecast (domain tab).
 *
 * Real endpoint behind this page:
 *   GET /api/ai-agents/finance/forecast → { historical, projected, projectedNext30dTotalPkr } (real data, no AI)
 *
 * Free to load (a plain least-squares projection off real daily revenue),
 * so this fetches automatically. Deep-dives into the same forecast the
 * Dashboard teases: a daily/weekly toggle, a full historical + projected
 * table (paginated), and derived trend stats the Dashboard has no room for.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { AgentHeading } from "@/components/agents/AgentShell";
import { AreaChart, MetricCard, Svg } from "@/components/agents/rich";
import { Icons } from "@/components/agents/icons";
import type { AgentViewProps } from "../../registry";
import { Empty, ErrorPanel, Panel, StatRow, TableScroll, arr, fmtDate, fmtPkr, n0, useAsync, weeklyTotals } from "../../shadilife/_shadilife-console-kit";

interface ForecastPoint {
  date?: string;
  amountPkr?: number;
}
interface ForecastResponse {
  historical?: ForecastPoint[];
  projected?: ForecastPoint[];
  projectedNext30dTotalPkr?: number;
}

const PAGE_SIZE = 10;

export default function ShadiLifeFinanceForecastView({ platform, agent, api }: AgentViewProps) {
  const forecast = useAsync<ForecastResponse>(platform, async () => (await api.get<ForecastResponse>("/forecast")).data ?? {}, true);
  const [granularity, setGranularity] = useState<"daily" | "weekly">("weekly");
  const [histPage, setHistPage] = useState(1);
  const [projPage, setProjPage] = useState(1);

  const historical = useMemo(() => arr<ForecastPoint>(forecast.data?.historical), [forecast.data]);
  const projected = useMemo(() => arr<ForecastPoint>(forecast.data?.projected), [forecast.data]);

  const totalHistorical = useMemo(() => historical.reduce((s, p) => s + n0(p.amountPkr), 0), [historical]);
  const avgDaily = historical.length > 0 ? totalHistorical / historical.length : null;

  const trend = useMemo(() => {
    if (historical.length < 4) return null;
    const mid = Math.floor(historical.length / 2);
    const first = historical.slice(0, mid).reduce((s, p) => s + n0(p.amountPkr), 0);
    const second = historical.slice(mid).reduce((s, p) => s + n0(p.amountPkr), 0);
    if (first <= 0) return null;
    return Math.round(((second - first) / first) * 1000) / 10;
  }, [historical]);

  const chart = useMemo(() => {
    if (granularity === "weekly") {
      const h = weeklyTotals(historical, 13);
      const p = weeklyTotals(projected, 5);
      return {
        labels: [...h.labels, ...p.labels],
        historical: [...h.data, ...p.data.map(() => 0)].slice(0, h.labels.length),
        projected: [...h.data.map(() => 0), ...p.data],
      };
    }
    const hSlice = historical.slice(-45);
    const pSlice = projected.slice(0, 30);
    return {
      labels: [...hSlice.map((p) => fmtDate(p.date)), ...pSlice.map((p) => fmtDate(p.date))],
      historical: [...hSlice.map((p) => n0(p.amountPkr)), ...pSlice.map(() => 0)],
      projected: [...hSlice.map(() => 0), ...pSlice.map((p) => n0(p.amountPkr))],
    };
  }, [granularity, historical, projected]);

  const histTotalPages = Math.max(1, Math.ceil(historical.length / PAGE_SIZE));
  const histRows = [...historical].reverse().slice((histPage - 1) * PAGE_SIZE, histPage * PAGE_SIZE);
  const projTotalPages = Math.max(1, Math.ceil(projected.length / PAGE_SIZE));
  const projRows = projected.slice((projPage - 1) * PAGE_SIZE, projPage * PAGE_SIZE);

  return (
    <>
      <AgentHeading
        platform={platform}
        agent={agent}
        blurb="A plain linear projection off real daily revenue — the full historical series, the day-by-day projection, and the trend behind both."
        actions={
          <>
            <button type="button" className="ag-btn ag-btn-ghost" onClick={() => void forecast.run()} disabled={forecast.loading}>
              <Svg path={Icons.refresh} size={14} /> {forecast.loading ? "Refreshing…" : "Refresh"}
            </button>
            <Link href={`/${platform.key}/${agent.key}`} className="ag-btn ag-btn-ghost">← Dashboard</Link>
          </>
        }
      />

      {forecast.error && <ErrorPanel message={forecast.error} platform={platform} what="The revenue forecast" />}

      <div className="ag-metrics">
        <MetricCard icon={<Svg path={Icons.sparkle} size={24} />} tone="pink" title="Next-30d projection" value={forecast.data?.projectedNext30dTotalPkr !== undefined ? fmtPkr(forecast.data.projectedNext30dTotalPkr) : "—"} />
        <MetricCard icon={<Svg path={Icons.dollar} size={24} />} tone="green" title="Historical total" value={historical.length ? fmtPkr(totalHistorical) : "—"} />
        <MetricCard icon={<Svg path={Icons.gauge} size={24} />} tone="blue" title="Average daily revenue" value={avgDaily === null ? "—" : fmtPkr(avgDaily)} />
        <MetricCard icon={<Svg path={Icons.trendUp} size={24} />} tone="gold" title="Trend (first vs second half)" value={trend === null ? "—" : `${trend >= 0 ? "+" : ""}${trend}%`} change={trend} changeLabel="of the window shown" />
      </div>

      <div className="ag-split">
        <div className="ag-stack">
          <Panel
            title="Revenue — actual + projected"
            sub={granularity === "weekly" ? "Weekly totals, last 90 days actual then a 30-day linear projection" : "Daily totals, last 45 days actual then a 30-day linear projection"}
            actions={
              <div style={{ display: "flex", gap: 6 }}>
                <button type="button" className={`ag-btn ag-btn-sm ${granularity === "daily" ? "ag-btn-solid" : "ag-btn-ghost"}`} onClick={() => setGranularity("daily")}>Daily</button>
                <button type="button" className={`ag-btn ag-btn-sm ${granularity === "weekly" ? "ag-btn-solid" : "ag-btn-ghost"}`} onClick={() => setGranularity("weekly")}>Weekly</button>
              </div>
            }
          >
            {chart.labels.length > 0 ? (
              <AreaChart
                labels={chart.labels}
                series={[
                  { name: "Actual", data: chart.historical, color: agent.accent },
                  { name: "Projected", data: chart.projected, color: "#94a3b8" },
                ]}
              />
            ) : (
              <Empty>{forecast.loading ? "Loading…" : "No payment history available."}</Empty>
            )}
          </Panel>

          <Panel title="Historical daily revenue" sub="Every real day the forecast was built from, most recent first" flush>
            {histRows.length > 0 ? (
              <>
                <TableScroll>
                  <table className="ag-table">
                    <thead><tr><th>Date</th><th style={{ textAlign: "right" }}>Revenue</th></tr></thead>
                    <tbody>
                      {histRows.map((p, i) => (
                        <tr key={p.date ?? i}>
                          <td>{fmtDate(p.date)}</td>
                          <td style={{ textAlign: "right", fontWeight: 650 }}>{fmtPkr(p.amountPkr)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableScroll>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px" }}>
                  <span style={{ fontSize: 11, color: "var(--ag-ink-faint)" }}>{historical.length} day(s) · page {histPage} of {histTotalPages}</span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" onClick={() => setHistPage((p) => Math.max(1, p - 1))} disabled={histPage <= 1}>← Prev</button>
                    <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" onClick={() => setHistPage((p) => Math.min(histTotalPages, p + 1))} disabled={histPage >= histTotalPages}>Next →</button>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ padding: "0 20px 20px" }}><Empty>{forecast.loading ? "Loading…" : "No historical data."}</Empty></div>
            )}
          </Panel>
        </div>

        <div className="ag-stack">
          <Panel title="Forecast window" sub="Real basis for the projection">
            <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
              <StatRow label="Historical days used" value={historical.length} />
              <StatRow label="Days projected forward" value={projected.length} />
              <StatRow label="Total historical revenue" value={fmtPkr(totalHistorical)} />
              <StatRow label="Average daily revenue" value={avgDaily === null ? "—" : fmtPkr(avgDaily)} />
              <StatRow label="Next-30d projection" value={forecast.data?.projectedNext30dTotalPkr !== undefined ? fmtPkr(forecast.data.projectedNext30dTotalPkr) : "—"} />
            </div>
          </Panel>

          <Panel title="Projected days" sub="Day-by-day output of the linear model" flush>
            {projRows.length > 0 ? (
              <>
                <TableScroll>
                  <table className="ag-table">
                    <thead><tr><th>Date</th><th style={{ textAlign: "right" }}>Projected</th></tr></thead>
                    <tbody>
                      {projRows.map((p, i) => (
                        <tr key={p.date ?? i}>
                          <td>{fmtDate(p.date)}</td>
                          <td style={{ textAlign: "right", fontWeight: 650, color: "var(--ag-ink-soft)" }}>{fmtPkr(p.amountPkr)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableScroll>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px" }}>
                  <span style={{ fontSize: 11, color: "var(--ag-ink-faint)" }}>page {projPage} of {projTotalPages}</span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" onClick={() => setProjPage((p) => Math.max(1, p - 1))} disabled={projPage <= 1}>← Prev</button>
                    <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" onClick={() => setProjPage((p) => Math.min(projTotalPages, p + 1))} disabled={projPage >= projTotalPages}>Next →</button>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ padding: "0 20px 20px" }}><Empty>{forecast.loading ? "Loading…" : "No projection available."}</Empty></div>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
