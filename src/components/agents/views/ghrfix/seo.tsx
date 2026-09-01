"use client";

/**
 * GhrFix — SEO Agent.
 *
 * `/audit` re-scores every published post on the spot, so nothing here is a
 * cached or invented "site score". The rule-level panel is built by pulling
 * each post's real `/score/:id` breakdown and counting which of the seven
 * scoring rules actually pass — and "Improve" is the agent's real
 * `POST /improve/:id` write, which rewrites and re-scores the metadata.
 */

import { useMemo } from "react";
import Link from "next/link";
import { AreaChart, BarList, DonutChart, InsightsPanel, MetricCard, AgentSidePanel, Svg } from "@/components/agents/rich";
import { RadialGauge } from "@/components/agents/charts";
import { Icons } from "@/components/agents/icons";
import type { AgentStats } from "@/lib/api";
import type { AgentViewProps } from "../registry";
import { AskAnswer, Empty, ErrorNote, KeyRow, Panel, Pill, TableWrap, dec, num, share, useAsk, useLoad } from "./_kit-core";

interface ScoreRule {
  rule: string;
  points: number;
  maxPoints: number;
  note: string;
}

interface Audit {
  publishedCount: number;
  averageScore: number;
  maxScore: number;
  needsImprovement: Array<{ id: string; title: string; score: number }>;
  posts: Array<{ id: string; title: string; score: number }>;
}

interface ScoreDetail {
  post: { id: string; title: string; slug: string; seoTitle: string | null; seoDescription: string | null; coverImageUrl: string | null; category: string };
  score: number;
  maxScore: number;
  breakdown: ScoreRule[];
}

/** How many posts we pull full rule breakdowns for — enough for a real rule-pass picture without hammering the API. */
const BREAKDOWN_SAMPLE = 12;

function bandOf(score: number, max: number) {
  if (score >= max - 0.5) return "Excellent";
  if (score >= 7) return "Healthy";
  if (score >= 5.5) return "Needs work";
  return "Weak";
}

const BAND_COLOR: Record<string, string> = { Excellent: "#22c55e", Healthy: "#3b82f6", "Needs work": "#f59e0b", Weak: "#f43f5e" };

export default function SeoView({ platform, agent, api }: AgentViewProps) {
  const load = useLoad(async () => {
    const [audit, stats] = await Promise.allSettled([api.get<Audit>("/audit"), api.stats()]);
    if (audit.status === "rejected") throw audit.reason;
    const a = audit.value.data;

    // Rule-level pass counts come from the real per-post breakdowns, not a guess.
    const sample = a.posts.slice(0, BREAKDOWN_SAMPLE);
    const details = await Promise.all(
      sample.map((p) =>
        api
          .get<ScoreDetail>(`/score/${p.id}`)
          .then((r) => r.data)
          .catch(() => null),
      ),
    );

    return {
      audit: a,
      details: details.filter((x): x is ScoreDetail => x !== null),
      stats: stats.status === "fulfilled" ? (stats.value.data as AgentStats) : null,
    };
  }, [platform.key, agent.key]);

  const ask = useAsk(api);
  const a = load.data?.audit ?? null;
  const details = load.data?.details ?? [];
  const maxScore = a?.maxScore ?? 9.5;

  const bands = useMemo(() => {
    if (!a) return [];
    const map = new Map<string, number>();
    for (const p of a.posts) {
      const b = bandOf(p.score, a.maxScore);
      map.set(b, (map.get(b) ?? 0) + 1);
    }
    return ["Excellent", "Healthy", "Needs work", "Weak"]
      .filter((b) => (map.get(b) ?? 0) > 0)
      .map((b) => ({ label: b, value: map.get(b) ?? 0, color: BAND_COLOR[b] }));
  }, [a]);

  /** Real score histogram across half-point buckets. */
  const histogram = useMemo(() => {
    if (!a || a.posts.length === 0) return null;
    const buckets = [4, 5, 6, 7, 8, 9];
    const counts = buckets.map((lo) => a.posts.filter((p) => p.score >= lo && p.score < lo + 1).length);
    const top = a.posts.filter((p) => p.score >= 9).length;
    counts[counts.length - 1] = top;
    return { labels: buckets.map((b) => (b === 9 ? "9–9.5" : `${b}–${b + 1}`)), data: counts };
  }, [a]);

  const ruleRows = useMemo(() => {
    if (details.length === 0) return [];
    const map = new Map<string, number>();
    for (const d of details) for (const r of d.breakdown) if (r.points >= r.maxPoints) map.set(r.rule, (map.get(r.rule) ?? 0) + 1);
    // Include rules that nobody passes so the gap is visible, not hidden.
    for (const r of details[0].breakdown) if (!map.has(r.rule)) map.set(r.rule, 0);
    return Array.from(map.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((x, y) => y.value - x.value);
  }, [details]);

  const weakestRule = ruleRows.length > 0 ? ruleRows[ruleRows.length - 1] : null;
  const ranked = a ? [...a.posts].sort((x, y) => y.score - x.score) : [];
  const best = ranked[0] ?? null;
  const worst = ranked[ranked.length - 1] ?? null;
  const healthShare = a && a.publishedCount > 0 ? share(a.publishedCount - a.needsImprovement.length, a.publishedCount) : null;
  const gap = a && a.publishedCount > 0 ? Math.round((a.maxScore - a.averageScore) * 10) / 10 : null;

  return (
    <>
      {load.error && <ErrorNote error={load.error} hint={`The SEO Agent audits ${platform.apiBase}${agent.base}/audit. Connect ${platform.label} first if this persists.`} />}

      <div className="ag-metrics">
        <MetricCard icon={<Svg path={Icons.seo} size={24} />} tone="gold" title="Average score" value={load.loading ? "—" : a && a.publishedCount > 0 ? `${a.averageScore} / ${maxScore}` : "—"} />
        <MetricCard icon={<Svg path={Icons.eye} size={24} />} tone="blue" title="Published posts audited" value={load.loading ? "—" : num(a?.publishedCount)} />
        <MetricCard icon={<Svg path={Icons.alert} size={24} />} tone="red" title="Below the 7.0 line" value={load.loading ? "—" : num(a?.needsImprovement.length)} />
        <MetricCard icon={<Svg path={Icons.check} size={24} />} tone="green" title="Healthy posts" value={load.loading ? "—" : a ? num(a.publishedCount - a.needsImprovement.length) : "—"} />
        <MetricCard icon={<Svg path={Icons.crown} size={24} />} tone="purple" title="Best scoring post" value={load.loading ? "—" : best ? `${best.score}` : "—"} />
        <MetricCard icon={<Svg path={Icons.target} size={24} />} tone="pink" title="Gap to the cap" value={load.loading || gap === null ? "—" : `${gap} pts`} />
      </div>

      <div className="ag-split">
        <div className="ag-stack">
          <Panel
            title="Site SEO health"
            sub={`Every published post re-scored live. The scale is hard-capped at ${maxScore} — never a flat 10.`}
            actions={
              <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" onClick={load.reload} disabled={load.loading}>
                <Svg path={Icons.refresh} size={14} /> Re-run audit
              </button>
            }
          >
            {a && a.publishedCount > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 26, alignItems: "center", justifyContent: "center" }}>
                <RadialGauge value={a.averageScore} max={maxScore} size={150} color={agent.accent} label={`of ${maxScore}`} />
                <div style={{ flex: 1, minWidth: 180 }}>
                  <DonutChart data={bands} total={a.publishedCount} totalLabel="Posts" size={140} />
                </div>
              </div>
            ) : (
              <Empty>{load.loading ? "Running the audit…" : "No published posts to audit yet — publish a post from the Content Agent and the score appears here."}</Empty>
            )}
          </Panel>

          <div className="ag-duo">
            <Panel title="Score distribution" sub="Real count of posts per score band">
              {histogram ? (
                <AreaChart labels={histogram.labels} series={[{ name: "Posts", data: histogram.data, color: agent.accent }]} height={200} />
              ) : (
                <Empty>{load.loading ? "Loading…" : "Nothing scored yet."}</Empty>
              )}
            </Panel>

            <Panel title="Rules passing across the library" sub={details.length > 0 ? `Counted from ${details.length} real breakdown${details.length === 1 ? "" : "s"}` : "From each post's /score breakdown"}>
              <BarList rows={ruleRows} color="#22c55e" emptyText={load.loading ? "Loading breakdowns…" : "No breakdowns to summarise yet."} />
            </Panel>
          </div>

          <Panel
            title="Posts needing the most work"
            sub="Full ranked table, band filters and the Improve action live in Audit"
            noBody
            actions={<Link href={`/${platform.key}/${agent.key}/audit`} className="ag-btn ag-btn-ghost ag-btn-sm">Open full Audit →</Link>}
          >
            <TableWrap>
              <table className="ag-table">
                <thead>
                  <tr>
                    <th>Post</th>
                    <th>Score</th>
                    <th>Band</th>
                  </tr>
                </thead>
                <tbody>
                  {[...ranked]
                    .sort((x, y) => x.score - y.score)
                    .slice(0, 5)
                    .map((p) => {
                      const band = bandOf(p.score, maxScore);
                      return (
                        <tr key={p.id}>
                          <td style={{ minWidth: 200, fontWeight: 650 }}>{p.title}</td>
                          <td style={{ minWidth: 140 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                              <strong className="ag-display" style={{ fontSize: 13, minWidth: 30 }}>{p.score}</strong>
                              <div className="ag-barlist-track" style={{ flex: 1, minWidth: 60 }}>
                                <div className="ag-barlist-fill" style={{ width: `${(p.score / maxScore) * 100}%`, background: BAND_COLOR[band] }} />
                              </div>
                            </div>
                          </td>
                          <td><Pill text={band} tone={band === "Excellent" || band === "Healthy" ? "green" : band === "Needs work" ? "amber" : "red"} /></td>
                        </tr>
                      );
                    })}
                  {ranked.length === 0 && (
                    <tr>
                      <td colSpan={3}><Empty>{load.loading ? "Running the audit…" : "No published posts yet."}</Empty></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </TableWrap>
          </Panel>
        </div>

        <div className="ag-stack">
          <AgentSidePanel
            agentLabel={`${platform.label} — ${agent.name}`}
            greeting="Nothing is ever a perfect 10"
            blurb={`I re-score every published post against seven concrete content rules, capped at ${maxScore}, so the number always traces back to something you can fix.`}
            todayStats={[
              { label: "Average score", value: a && a.publishedCount > 0 ? `${a.averageScore}` : "—", icon: <Svg path={Icons.seo} size={17} />, tone: "gold" },
              { label: "Posts below 7.0", value: a ? num(a.needsImprovement.length) : "—", icon: <Svg path={Icons.alert} size={17} />, tone: "purple" },
              { label: "Agent calls today", value: load.data?.stats ? num(load.data.stats.callsToday) : "—", icon: <Svg path={Icons.chat} size={17} />, tone: "green" },
            ]}
            suggestions={["Which posts hurt our search visibility most?", "What SEO rule do we fail most often?", "How do I lift the average score above 8?"]}
            onAsk={ask.ask}
          />

          <AskAnswer state={ask} />

          <InsightsPanel
            rows={[
              {
                icon: <Svg path={Icons.check} size={15} />,
                label: "Library health",
                value: healthShare === null ? "No published posts to audit yet." : `${healthShare}% of ${a?.publishedCount} published post${a?.publishedCount === 1 ? "" : "s"} score 7.0 or better.`,
              },
              {
                icon: <Svg path={Icons.alert} size={15} />,
                label: "Weakest rule",
                value: weakestRule ? `“${weakestRule.label}” passes on only ${weakestRule.value} of ${details.length} sampled post${details.length === 1 ? "" : "s"}.` : "No breakdowns sampled yet.",
              },
              {
                icon: <Svg path={Icons.crown} size={15} />,
                label: "Best post",
                value: best ? `“${best.title}” at ${best.score} / ${maxScore}.` : "Nothing scored yet.",
              },
              {
                icon: <Svg path={Icons.target} size={15} />,
                label: "Lowest post",
                value: worst && ranked.length > 1 ? `“${worst.title}” at ${worst.score} / ${maxScore} — start here.` : "Nothing to prioritise yet.",
              },
              {
                icon: <Svg path={Icons.trendUp} size={15} />,
                label: "Headroom",
                value: gap === null ? "—" : `${gap} points of average headroom remain before the ${maxScore} cap.`,
              },
            ]}
          />

          <Panel title="Agent runtime" sub="Real usage from the shared agent log">
            <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
              {load.data?.stats ? (
                <>
                  <KeyRow label="Model" value={load.data.stats.model} />
                  <KeyRow label="Calls this month" value={num(load.data.stats.callsThisMonth)} />
                  <KeyRow label="Tokens this month" value={num(load.data.stats.tokensThisMonth)} />
                  <KeyRow label="Spend this month" value={`$${(dec(load.data.stats.spendThisMonthUsd) ?? 0).toFixed(2)}`} />
                </>
              ) : (
                <Empty>{load.loading ? "Loading…" : "Runtime stats unavailable."}</Empty>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
