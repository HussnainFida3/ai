"use client";

/**
 * ShadiLife — Analytics Agent.
 *
 * Real endpoint behind this page:
 *   POST /api/ai-agents/analytics/insights → { snapshot, insights }
 *   POST /api/ai-agents/analytics/ask      { question } → { answer }
 *
 * The snapshot itself (views, interests, matches, age/city/sect breakdowns,
 * 30-day growth) is a real, deterministic Prisma aggregate — the AI call
 * only narrates it into plain English. Since every run still costs one AI
 * call, this stays a manual "Run analytics snapshot" action rather than
 * firing on page load, same rule as every other audit-style page here.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { AgentHeading } from "@/components/agents/AgentShell";
import { DonutChart, InsightsPanel, MetricCard, Svg } from "@/components/agents/rich";
import { Icons } from "@/components/agents/icons";
import type { AgentViewProps } from "../registry";
import { AiBullets, Empty, Panel, describeError, fmtInt, fmtPct, n0 } from "./_shadilife-console-kit";

interface AgeBucket {
  range: string;
  male: number;
  female: number;
}
interface Snapshot {
  totalUsers?: number;
  totalViews?: number;
  totalInterests?: number;
  totalMessages?: number;
  totalMatches?: number;
  verifiedCount?: number;
  premiumUsers?: number;
  premiumConversionPct?: number;
  engagement?: { viewsToInterestsPct?: number; matchesPerHundredInterests?: number; avgMessagesPerMatch?: number };
  newUsersLast30d?: number;
  newUsersPrev30d?: number;
  growth30dPct?: number | null;
  sectDistribution?: { sect: string; count: number }[];
  topCities?: { city: string | null; count: number }[];
  ageDistribution?: AgeBucket[];
}

export default function ShadiLifeAnalyticsView({ platform, agent, api }: AgentViewProps) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [insights, setInsights] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);

  function runSnapshot() {
    setLoading(true);
    setError(null);
    api
      .post<{ snapshot?: Snapshot; insights?: string }>("/insights")
      .then(({ data }) => {
        setSnapshot(data?.snapshot ?? {});
        setInsights(data?.insights ?? "");
      })
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

  const hasRun = snapshot !== null;
  const sectRows = useMemo(
    () => (snapshot?.sectDistribution ?? []).map((s) => ({ label: s.sect, value: n0(s.count) })),
    [snapshot],
  );
  const cityRows = useMemo(
    () => (snapshot?.topCities ?? []).map((c) => ({ label: c.city ?? "Unspecified", value: n0(c.count) })),
    [snapshot],
  );
  const ageRows = useMemo(
    () => (snapshot?.ageDistribution ?? []).map((a) => ({ label: a.range, value: n0(a.male) + n0(a.female) })),
    [snapshot],
  );
  const genderTotals = useMemo(() => {
    const buckets = snapshot?.ageDistribution ?? [];
    return {
      male: buckets.reduce((s, b) => s + n0(b.male), 0),
      female: buckets.reduce((s, b) => s + n0(b.female), 0),
    };
  }, [snapshot]);

  return (
    <>
      <AgentHeading
        platform={platform}
        agent={agent}
        blurb="A real engagement funnel, age/city/sect breakdowns and 30-day growth — genuinely more detailed than the raw admin dashboard, narrated in plain English."
        actions={
          <>
            <button type="button" className="ag-btn ag-btn-solid" onClick={runSnapshot} disabled={loading}>
              <Svg path={Icons.seo} size={14} /> {loading ? "Analyzing…" : hasRun ? "Re-run snapshot" : "Run analytics snapshot"}
            </button>
            <Link href={`/${platform.key}/${agent.key}/chat`} className="ag-btn ag-btn-ghost">Ask this agent →</Link>
          </>
        }
      />

      {error && <p style={{ margin: "0 0 16px", fontSize: 12, color: "var(--ag-red)" }}>{error}</p>}

      <div className="ag-metrics">
        <MetricCard icon={<Svg path={Icons.users} size={24} />} tone="purple" title="Total members" value={hasRun ? fmtInt(snapshot?.totalUsers) : "—"} />
        <MetricCard icon={<Svg path={Icons.heart} size={24} />} tone="pink" title="Total matches" value={hasRun ? fmtInt(snapshot?.totalMatches) : "—"} />
        <MetricCard icon={<Svg path={Icons.check} size={24} />} tone="green" title="Verified members" value={hasRun ? fmtInt(snapshot?.verifiedCount) : "—"} />
        <MetricCard icon={<Svg path={Icons.crown} size={24} />} tone="gold" title="Premium conversion" value={hasRun ? fmtPct(snapshot?.premiumConversionPct) : "—"} />
        <MetricCard icon={<Svg path={Icons.trendUp} size={24} />} tone="blue" title="30-day growth" value={hasRun && snapshot?.growth30dPct != null ? fmtPct(snapshot.growth30dPct) : "—"} change={snapshot?.growth30dPct ?? null} />
      </div>

      <div className="ag-split">
        <div className="ag-stack">
          <Panel title="AI-narrated insights" sub="Factual reporting, not advice — states what the data shows">
            {insights ? (
              <AiBullets body={insights} />
            ) : (
              <Empty>{loading ? "Crunching engagement, growth and demographic data…" : "No snapshot run yet this session."}</Empty>
            )}
          </Panel>

          <div className="ag-duo">
            <Panel title="Engagement funnel" sub="Real ratios — matches and messages are independent totals, not downstream of interests">
              {hasRun ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12, color: "var(--ag-ink-soft)" }}>Views → interests</span>
                    <b>{fmtPct(snapshot?.engagement?.viewsToInterestsPct)}</b>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12, color: "var(--ag-ink-soft)" }}>Matches per 100 interests</span>
                    <b>{fmtInt(snapshot?.engagement?.matchesPerHundredInterests)}</b>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12, color: "var(--ag-ink-soft)" }}>Avg. messages per match</span>
                    <b>{snapshot?.engagement?.avgMessagesPerMatch ?? "—"}</b>
                  </div>
                </div>
              ) : (
                <Empty>Run the snapshot to populate this.</Empty>
              )}
            </Panel>
            <Panel title="Gender split" sub="Across all audited age buckets">
              {genderTotals.male + genderTotals.female > 0 ? (
                <DonutChart data={[{ label: "Male", value: genderTotals.male, color: "#3b82f6" }, { label: "Female", value: genderTotals.female, color: "#ec4899" }]} totalLabel="Members" />
              ) : (
                <Empty>{loading ? "Loading…" : "Run the snapshot to populate this."}</Empty>
              )}
            </Panel>
          </div>

          <Panel
            title="Top segments"
            sub="A quick read across cities, sects and age — the Breakdown tab has the full, searchable version"
            actions={<Link href={`/${platform.key}/${agent.key}/breakdown`} className="ag-btn ag-btn-ghost ag-btn-sm">View all in Breakdown →</Link>}
          >
            {hasRun ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, color: "var(--ag-ink-soft)" }}>Top city</span>
                  <b>{cityRows[0] ? `${cityRows[0].label} (${fmtInt(cityRows[0].value)})` : "—"}</b>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, color: "var(--ag-ink-soft)" }}>Largest sect</span>
                  <b>{[...sectRows].sort((a, b) => b.value - a.value)[0]?.label ?? "—"}</b>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, color: "var(--ag-ink-soft)" }}>Largest age bracket</span>
                  <b>{[...ageRows].sort((a, b) => b.value - a.value)[0]?.label ?? "—"}</b>
                </div>
              </div>
            ) : (
              <Empty>Run the snapshot to populate this.</Empty>
            )}
          </Panel>

          <Panel title="Ask a question" sub="POST /analytics/ask — answered from the same real snapshot">
            <div className="ag-field">
              <label htmlFor="an-q">Question</label>
              <input id="an-q" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="e.g. How does premium conversion compare to verified members?" />
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
          <InsightsPanel
            rows={
              !hasRun
                ? []
                : [
                    ...(cityRows.length > 0
                      ? [{ icon: <Svg path={Icons.trendUp} size={15} />, label: "Top city", value: `${cityRows[0].label} leads with ${fmtInt(cityRows[0].value)} member(s).` }]
                      : []),
                    ...(snapshot?.newUsersLast30d !== undefined
                      ? [{ icon: <Svg path={Icons.users} size={15} />, label: "New members", value: `${fmtInt(snapshot.newUsersLast30d)} joined in the last 30 days, vs ${fmtInt(snapshot.newUsersPrev30d)} the 30 before.` }]
                      : []),
                  ]
            }
          />
        </div>
      </div>
    </>
  );
}
