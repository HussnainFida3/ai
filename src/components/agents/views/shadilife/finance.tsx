"use client";

/**
 * ShadiLife — Finance Agent.
 *
 * Real endpoints behind this page:
 *   GET  /api/ai-agents/finance/summary  → { snapshot, summary, bullets, marketingNudge } (real data + one AI call)
 *   GET  /api/ai-agents/finance/forecast → { historical, projected, projectedNext30dTotalPkr } (real data, no AI)
 *   POST /api/ai-agents/finance/ask      { question } → { answer }
 *
 * The forecast is a plain least-squares projection off the real last-90-days
 * daily revenue — loaded automatically since it costs nothing. The summary
 * narrates the same real numbers with one OpenAI call, so — same rule as
 * every other AI-costing page here — it only runs when the owner presses
 * "Run financial summary."
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { AgentHeading } from "@/components/agents/AgentShell";
import { AreaChart, BarList, DonutChart, InsightsPanel, MetricCard, Svg } from "@/components/agents/rich";
import { Icons } from "@/components/agents/icons";
import type { AgentViewProps } from "../registry";
import { AiBullets, Empty, ErrorPanel, Panel, arr, describeError, fmtInt, fmtPkr, n0, useAsync, weeklyTotals } from "./_shadilife-console-kit";

interface FinanceSnapshot {
  membershipTiers?: { tier?: string | null; count?: number }[];
  approvedRevenueByTier?: { tier?: string | null; totalAmountPkr?: number; count?: number }[];
  revenueThisMonthPkr?: number;
  revenueLastMonthPkr?: number;
  monthOverMonthChangePct?: number | null;
  revenueThisYearPkr?: number;
  pendingPaymentsCount?: number;
  agentPayoutsThisMonthPkr?: number;
}
interface SummaryResponse {
  snapshot?: FinanceSnapshot;
  summary?: string;
  bullets?: string[];
  marketingNudge?: string;
}
interface ForecastPoint {
  date?: string;
  amountPkr?: number;
}
interface ForecastResponse {
  historical?: ForecastPoint[];
  projected?: ForecastPoint[];
  projectedNext30dTotalPkr?: number;
}

export default function ShadiLifeFinanceView({ platform, agent, api }: AgentViewProps) {
  const forecast = useAsync<ForecastResponse>(platform, async () => (await api.get<ForecastResponse>("/forecast")).data ?? {}, true);

  const [summaryData, setSummaryData] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);

  function runSummary() {
    setLoading(true);
    setError(null);
    api
      .get<SummaryResponse>("/summary")
      .then(({ data }) => setSummaryData(data ?? {}))
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

  const snapshot = summaryData?.snapshot ?? null;
  const hasRun = summaryData !== null;

  const tierRows = useMemo(
    () => (snapshot?.membershipTiers ?? []).map((t) => ({ label: t.tier ?? "FREE", value: n0(t.count) })),
    [snapshot],
  );
  const revenueByTierRows = useMemo(
    () => (snapshot?.approvedRevenueByTier ?? []).map((t) => ({ label: t.tier ?? "—", value: n0(t.totalAmountPkr) })),
    [snapshot],
  );

  const revenueChart = useMemo(() => {
    const hist = arr<ForecastPoint>(forecast.data?.historical);
    const proj = arr<ForecastPoint>(forecast.data?.projected);
    const h = weeklyTotals(hist, 13);
    const p = weeklyTotals(proj, 5);
    return {
      labels: [...h.labels, ...p.labels],
      historical: [...h.data, ...p.data.map(() => 0)].slice(0, h.labels.length),
      projected: [...h.data.map(() => 0), ...p.data],
    };
  }, [forecast.data]);

  return (
    <>
      <AgentHeading
        platform={platform}
        agent={agent}
        blurb="Real month-to-date and year-to-date revenue, a plain linear projection off actual daily totals, and a narrated summary the owner triggers on demand."
        actions={
          <>
            <button type="button" className="ag-btn ag-btn-solid" onClick={runSummary} disabled={loading}>
              <Svg path={Icons.dollar} size={14} /> {loading ? "Summarizing…" : hasRun ? "Re-run summary" : "Run financial summary"}
            </button>
            <Link href={`/${platform.key}/${agent.key}/chat`} className="ag-btn ag-btn-ghost">Ask this agent →</Link>
          </>
        }
      />

      {error && <p style={{ margin: "0 0 16px", fontSize: 12, color: "var(--ag-red)" }}>{error}</p>}
      {forecast.error && <ErrorPanel message={forecast.error} platform={platform} what="Revenue forecast" />}

      <div className="ag-metrics">
        <MetricCard icon={<Svg path={Icons.dollar} size={24} />} tone="green" title="Revenue this month" value={hasRun ? fmtPkr(snapshot?.revenueThisMonthPkr) : "—"} change={snapshot?.monthOverMonthChangePct ?? null} changeLabel="vs last month" />
        <MetricCard icon={<Svg path={Icons.trendUp} size={24} />} tone="blue" title="Revenue this year" value={hasRun ? fmtPkr(snapshot?.revenueThisYearPkr) : "—"} />
        <MetricCard icon={<Svg path={Icons.alert} size={24} />} tone="gold" title="Pending payments" value={hasRun ? fmtInt(snapshot?.pendingPaymentsCount) : "—"} />
        <MetricCard icon={<Svg path={Icons.wallet} size={24} />} tone="purple" title="Agent payouts this month" value={hasRun ? fmtPkr(snapshot?.agentPayoutsThisMonthPkr) : "—"} />
        <MetricCard icon={<Svg path={Icons.sparkle} size={24} />} tone="pink" title="Next-30d projection" value={forecast.data?.projectedNext30dTotalPkr !== undefined ? fmtPkr(forecast.data.projectedNext30dTotalPkr) : "—"} />
      </div>

      <div className="ag-split">
        <div className="ag-stack">
          <Panel
            title="Revenue trend"
            sub="Last 8 weeks — the Forecast tab has the full daily/weekly chart plus every projected day"
            actions={<Link href={`/${platform.key}/${agent.key}/forecast`} className="ag-btn ag-btn-ghost ag-btn-sm">View full forecast →</Link>}
          >
            {revenueChart.labels.length > 0 ? (
              <AreaChart
                labels={revenueChart.labels.slice(-8)}
                series={[{ name: "Actual", data: revenueChart.historical.slice(-8), color: agent.accent }]}
                height={160}
              />
            ) : (
              <Empty>{forecast.loading ? "Loading…" : "No payment history available."}</Empty>
            )}
          </Panel>

          <Panel title="Financial summary" sub="One AI call narrating the real numbers above">
            {summaryData?.summary ? (
              <>
                <p style={{ margin: "0 0 14px", fontSize: 13.5, fontWeight: 700 }}>{summaryData.summary}</p>
                <AiBullets body={summaryData.bullets} />
                {summaryData.marketingNudge && (
                  <div style={{ marginTop: 16, padding: 13, borderRadius: 11, background: "color-mix(in srgb, var(--ag-accent) 8%, #fff)", border: "1px solid color-mix(in srgb, var(--ag-accent) 20%, var(--ag-border))", fontSize: 12, fontStyle: "italic", color: "var(--ag-ink-soft)" }}>
                    {summaryData.marketingNudge}
                  </div>
                )}
              </>
            ) : (
              <Empty>{loading ? "Summarizing revenue, tiers and payouts…" : "No summary run yet this session."}</Empty>
            )}
          </Panel>

          <Panel title="Ask a question" sub="POST /finance/ask">
            <div className="ag-field">
              <label htmlFor="fin-q">Question</label>
              <input id="fin-q" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="e.g. How much came in from Gold vs Silver this month?" />
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
          <Panel title="Membership tiers" sub="Real user counts by tier">
            {tierRows.length > 0 ? (
              <DonutChart data={tierRows} totalLabel="Members" />
            ) : (
              <Empty>{loading ? "Loading…" : "Run the summary to populate this."}</Empty>
            )}
          </Panel>

          <Panel title="Approved revenue by tier" sub="All-time approved payments">
            <BarList rows={revenueByTierRows} ranked color={agent.accent} emptyText={loading ? "Loading…" : "Run the summary to populate this."} />
          </Panel>

          <InsightsPanel
            rows={[
              ...(snapshot?.monthOverMonthChangePct != null
                ? [{ icon: <Svg path={Icons.trendUp} size={15} />, label: "Month over month", value: `Revenue is ${snapshot.monthOverMonthChangePct >= 0 ? "up" : "down"} ${Math.abs(snapshot.monthOverMonthChangePct)}% vs last month.` }]
                : []),
              ...((snapshot?.pendingPaymentsCount ?? 0) > 0
                ? [{ icon: <Svg path={Icons.alert} size={15} />, label: "Needs review", value: `${fmtInt(snapshot?.pendingPaymentsCount)} payment(s) are pending manual review.` }]
                : []),
              ...(forecast.data?.projectedNext30dTotalPkr !== undefined
                ? [{ icon: <Svg path={Icons.sparkle} size={15} />, label: "Projection, not a guarantee", value: `A linear model off the last 90 days projects ${fmtPkr(forecast.data.projectedNext30dTotalPkr)} over the next 30 days.` }]
                : []),
            ]}
          />
        </div>
      </div>
    </>
  );
}
