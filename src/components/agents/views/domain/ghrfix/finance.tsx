"use client";

/**
 * GhrFix — Finance Agent → Forecast.
 *
 * The interactive regression forecast that used to share space with three
 * other panels on the Dashboard, now full width, plus the real platform-wide
 * wallet ledger — `/admin/wallet/transactions`, genuinely paginated and
 * filterable by CREDIT/DEBIT — which the Dashboard never had room to show at
 * all.
 */

import { useState } from "react";
import Link from "next/link";
import { InsightsPanel, MetricCard, Svg } from "@/components/agents/rich";
import { RadialGauge } from "@/components/agents/charts";
import { Icons } from "@/components/agents/icons";
import { ApiError, apiFetch, type Paginated } from "@/lib/api";
import type { AgentViewProps } from "../../registry";
import { Empty, ErrorNote, KeyRow, Panel, Pill, TableWrap, coins, dateTime, useLoad } from "../../ghrfix/_kit-core";

interface Forecast {
  projectedNext30DaysTokens: number;
  dailyTrendSlope: number;
  target: number | null;
  confidence: number | null;
}

interface LedgerRow {
  id: string;
  type: "CREDIT" | "DEBIT";
  reason: string;
  amount: string | number;
  balanceAfter: string | number;
  note: string | null;
  createdAt: string;
  user: { id: string; name: string | null; phone: string | null; email: string | null; role: string } | null;
}

const TYPES = ["ALL", "CREDIT", "DEBIT"] as const;
type TypeFilter = (typeof TYPES)[number];
const PAGE_SIZE = 15;

function humanReason(r: string) {
  return r.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

export default function FinanceForecastView({ platform, agent, api }: AgentViewProps) {
  const [targetInput, setTargetInput] = useState("");
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [forecastBusy, setForecastBusy] = useState(false);
  const [forecastErr, setForecastErr] = useState<string | null>(null);

  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [page, setPage] = useState(1);

  const forecastLoad = useLoad(async () => {
    const { data } = await api.get<Forecast>("/forecast");
    return data;
  }, [platform.key]);

  const ledgerLoad = useLoad(async () => {
    const { data, meta } = await apiFetch<LedgerRow[], Paginated>(platform.key, "/admin/wallet/transactions", {
      query: { type: typeFilter === "ALL" ? undefined : typeFilter, page, pageSize: PAGE_SIZE },
    });
    return { items: data, meta };
  }, [platform.key, typeFilter, page]);

  const fc = forecast ?? forecastLoad.data ?? null;
  const maxScale = fc ? Math.max(1, Math.abs(fc.projectedNext30DaysTokens), fc.target ?? 0) * 1.2 : 1;

  async function runForecast() {
    const target = Number(targetInput);
    if (!targetInput || !Number.isFinite(target) || target <= 0) return;
    setForecastBusy(true);
    setForecastErr(null);
    try {
      const { data } = await api.get<Forecast>("/forecast", { target });
      setForecast(data);
    } catch (e) {
      setForecastErr(e instanceof ApiError ? e.message : "Could not run the forecast.");
    } finally {
      setForecastBusy(false);
    }
  }

  return (
    <>
      {forecastLoad.error && <ErrorNote error={forecastLoad.error} hint={`The Finance Agent forecasts from ${platform.apiBase}${agent.base}/forecast. Connect ${platform.label} first if this persists.`} />}

      <div className="ag-metrics">
        <MetricCard icon={<Svg path={Icons.sparkle} size={24} />} tone="pink" title="30-day projection" value={forecastLoad.loading ? "—" : fc ? coins(fc.projectedNext30DaysTokens) : "—"} />
        <MetricCard icon={<Svg path={Icons.trendUp} size={24} />} tone="purple" title="Daily trend slope" value={forecastLoad.loading ? "—" : fc ? `${fc.dailyTrendSlope >= 0 ? "+" : ""}${fc.dailyTrendSlope} GC/day` : "—"} />
        <MetricCard icon={<Svg path={Icons.gauge} size={24} />} tone="gold" title="Confidence vs target" value={fc?.confidence !== null && fc?.confidence !== undefined ? `${fc.confidence}%` : "No target set"} />
        <MetricCard icon={<Svg path={Icons.database} size={24} />} tone="blue" title="Ledger entries (page)" value={ledgerLoad.loading ? "—" : String(ledgerLoad.data?.items.length ?? 0)} />
      </div>

      <div className="ag-stack">
        <Panel title="30-day revenue forecast" sub="Real least-squares regression over the 30-day credit trend">
          {fc ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 30, alignItems: "center" }}>
              <RadialGauge value={fc.confidence ?? 0} max={100} size={160} color={agent.accent} label={fc.confidence === null ? "no target set" : "confidence"} />
              <div style={{ flex: 1, minWidth: 240, display: "flex", flexDirection: "column", gap: 12 }}>
                <KeyRow label="Projected next 30 days" value={coins(fc.projectedNext30DaysTokens)} />
                <KeyRow label="Daily trend slope" value={`${fc.dailyTrendSlope >= 0 ? "+" : ""}${fc.dailyTrendSlope} GC/day`} />
                <KeyRow label="Target compared" value={fc.target !== null ? coins(fc.target) : "None set"} />
                <div className="ag-form-grid" style={{ marginTop: 4 }}>
                  <div className="ag-field">
                    <label htmlFor="fc-target">Compare against a target (GC)</label>
                    <input id="fc-target" inputMode="numeric" placeholder="e.g. 10000" value={targetInput} onChange={(e) => setTargetInput(e.target.value)} />
                  </div>
                </div>
                <button type="button" className="ag-btn ag-btn-accent ag-btn-sm" style={{ alignSelf: "flex-start" }} onClick={runForecast} disabled={forecastBusy || !targetInput}>
                  {forecastBusy ? "Calculating…" : "Check confidence vs target"}
                </button>
                {forecastErr && <p style={{ margin: 0, fontSize: 11.5, color: "var(--ag-red)" }}>{forecastErr}</p>}
              </div>
            </div>
          ) : (
            <Empty>{forecastLoad.loading ? "Running the regression…" : "Not enough ledger history to forecast yet."}</Empty>
          )}
        </Panel>

        <Panel
          title="Platform wallet ledger"
          sub={ledgerLoad.data?.meta ? `${ledgerLoad.data.meta.total.toLocaleString()} entr${ledgerLoad.data.meta.total === 1 ? "y" : "ies"} — page ${ledgerLoad.data.meta.page} of ${Math.max(1, ledgerLoad.data.meta.totalPages)}` : "Every credit and debit, platform-wide"}
          noBody
          actions={
            <div className="ag-tabs">
              {TYPES.map((t) => (
                <button key={t} type="button" className={`ag-tab ${typeFilter === t ? "active" : ""}`} onClick={() => { setTypeFilter(t); setPage(1); }}>
                  {t === "ALL" ? "All" : t.charAt(0) + t.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          }
        >
          <TableWrap>
            <table className="ag-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Type</th>
                  <th>Reason</th>
                  <th>Amount</th>
                  <th>Balance after</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {(ledgerLoad.data?.items ?? []).map((r) => (
                  <tr key={r.id}>
                    <td>
                      <b style={{ display: "block", fontWeight: 650 }}>{r.user?.name ?? "Unknown"}</b>
                      <span style={{ fontSize: 10.5, color: "var(--ag-ink-faint)" }}>{r.user?.phone ?? r.user?.email ?? "—"}</span>
                    </td>
                    <td><Pill text={r.type} tone={r.type === "CREDIT" ? "green" : "red"} /></td>
                    <td style={{ fontSize: 11.5 }}>{humanReason(r.reason)}</td>
                    <td style={{ fontWeight: 650, whiteSpace: "nowrap" }}>{coins(r.amount)}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{coins(r.balanceAfter)}</td>
                    <td style={{ whiteSpace: "nowrap", color: "var(--ag-ink-faint)" }}>{dateTime(r.createdAt)}</td>
                  </tr>
                ))}
                {(!ledgerLoad.data || ledgerLoad.data.items.length === 0) && (
                  <tr>
                    <td colSpan={6}><Empty>{ledgerLoad.loading ? "Loading ledger…" : "No ledger entries match this filter."}</Empty></td>
                  </tr>
                )}
              </tbody>
            </table>
          </TableWrap>

          {ledgerLoad.data?.meta && ledgerLoad.data.meta.total > 0 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderTop: "1px solid var(--ag-border-soft)" }}>
              <span style={{ fontSize: 11, color: "var(--ag-ink-faint)" }}>
                Page {ledgerLoad.data.meta.page} of {Math.max(1, ledgerLoad.data.meta.totalPages)} · {ledgerLoad.data.meta.total.toLocaleString()} total
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
                <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" disabled={page >= ledgerLoad.data.meta.totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
              </div>
            </div>
          )}
        </Panel>

        <InsightsPanel
          rows={[
            {
              icon: <Svg path={Icons.trendUp} size={15} />,
              label: "Trend direction",
              value: fc ? `Daily credits are trending ${fc.dailyTrendSlope >= 0 ? "up" : "down"} ${Math.abs(fc.dailyTrendSlope).toLocaleString()} GC/day.` : "Not enough history yet.",
            },
            {
              icon: <Svg path={Icons.gauge} size={15} />,
              label: "Forecast confidence",
              value: fc?.confidence !== null && fc?.confidence !== undefined ? `${fc.confidence}% confidence against a target of ${coins(fc.target)}.` : "Set a target above to see confidence.",
            },
            {
              icon: <Svg path={Icons.dashboard} size={15} />,
              label: "Need the credit/debit mix?",
              value: (
                <>
                  Where credits come from and where coins go is on the{" "}
                  <Link href={`/${platform.key}/${agent.key}`} style={{ color: "var(--ag-accent)", fontWeight: 650 }}>Dashboard</Link> tab.
                </>
              ),
            },
          ]}
        />
      </div>
    </>
  );
}
