"use client";

/**
 * GhrFix — SEO Agent → Audit.
 *
 * The full ranked audit that used to be crammed under the Dashboard: every
 * published post re-scored live via `/audit`, filterable by score band, with
 * the real rule-by-rule `/score/:id` breakdown and the `/improve/:id` rewrite
 * action available inline. Nothing here is cached — re-running the audit
 * re-scores every post on the spot, same as the underlying endpoint always
 * has.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { BarList, InsightsPanel, MetricCard, Svg } from "@/components/agents/rich";
import { RadialGauge } from "@/components/agents/charts";
import { Icons } from "@/components/agents/icons";
import { ApiError, type AgentStats } from "@/lib/api";
import type { AgentViewProps } from "../../registry";
import { Empty, ErrorNote, KeyRow, Panel, Pill, TableWrap, num, useLoad } from "../../ghrfix/_kit-core";

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

const BREAKDOWN_SAMPLE = 20;
const PAGE_SIZE = 12;

function bandOf(score: number, max: number) {
  if (score >= max - 0.5) return "Excellent";
  if (score >= 7) return "Healthy";
  if (score >= 5.5) return "Needs work";
  return "Weak";
}

const BAND_COLOR: Record<string, string> = { Excellent: "#22c55e", Healthy: "#3b82f6", "Needs work": "#f59e0b", Weak: "#f43f5e" };
const BANDS = ["ALL", "Excellent", "Healthy", "Needs work", "Weak"] as const;
type Band = (typeof BANDS)[number];

export default function SeoAuditView({ platform, agent, api }: AgentViewProps) {
  const [band, setBand] = useState<Band>("ALL");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<ScoreDetail | null>(null);
  const [detailBusy, setDetailBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useLoad(async () => {
    const [audit, stats] = await Promise.allSettled([api.get<Audit>("/audit"), api.stats()]);
    if (audit.status === "rejected") throw audit.reason;
    const a = audit.value.data;

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

  const a = load.data?.audit ?? null;
  const details = load.data?.details ?? [];
  const maxScore = a?.maxScore ?? 9.5;

  const ranked = useMemo(() => (a ? [...a.posts].sort((x, y) => y.score - x.score) : []), [a]);
  const filtered = useMemo(() => (band === "ALL" ? ranked : ranked.filter((p) => bandOf(p.score, maxScore) === band)), [ranked, band, maxScore]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const ruleRows = useMemo(() => {
    if (details.length === 0) return [];
    const map = new Map<string, number>();
    for (const d of details) for (const r of d.breakdown) if (r.points >= r.maxPoints) map.set(r.rule, (map.get(r.rule) ?? 0) + 1);
    for (const r of details[0].breakdown) if (!map.has(r.rule)) map.set(r.rule, 0);
    return Array.from(map.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((x, y) => y.value - x.value);
  }, [details]);

  const bandCounts = useMemo(() => {
    if (!a) return [] as Array<{ label: Band; value: number }>;
    const map = new Map<string, number>();
    for (const p of a.posts) {
      const b = bandOf(p.score, a.maxScore);
      map.set(b, (map.get(b) ?? 0) + 1);
    }
    return (["Excellent", "Healthy", "Needs work", "Weak"] as const).map((b) => ({ label: b, value: map.get(b) ?? 0 }));
  }, [a]);

  async function openDetail(id: string) {
    setSelected(id);
    setDetail(null);
    setDetailBusy(true);
    try {
      const { data } = await api.get<ScoreDetail>(`/score/${id}`);
      setDetail(data);
    } catch {
      setDetail(null);
    } finally {
      setDetailBusy(false);
    }
  }

  async function improve(id: string) {
    setBusyId(id);
    setMsg(null);
    setErr(null);
    try {
      const { data } = await api.post<ScoreDetail>(`/improve/${id}`, {});
      setMsg(`Metadata rewritten and re-scored — "${data?.post?.title ?? "post"}" now scores ${data?.score ?? "—"} / ${maxScore}.`);
      if (selected === id) setDetail(data);
      load.reload();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "The agent could not improve that post.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      {load.error && <ErrorNote error={load.error} hint={`The SEO Agent audits ${platform.apiBase}${agent.base}/audit. Connect ${platform.label} first if this persists.`} />}

      <div className="ag-metrics">
        <MetricCard icon={<Svg path={Icons.scan} size={24} />} tone="gold" title="Average score" value={load.loading ? "—" : a && a.publishedCount > 0 ? `${a.averageScore} / ${maxScore}` : "—"} />
        <MetricCard icon={<Svg path={Icons.eye} size={24} />} tone="blue" title="Published posts audited" value={load.loading ? "—" : num(a?.publishedCount)} />
        <MetricCard icon={<Svg path={Icons.alert} size={24} />} tone="red" title="Below the 7.0 line" value={load.loading ? "—" : num(a?.needsImprovement.length)} />
        <MetricCard icon={<Svg path={Icons.filter} size={24} />} tone="purple" title="Rule breakdowns sampled" value={load.loading ? "—" : num(details.length)} />
      </div>

      <div className="ag-stack">
        <Panel
          title="Site SEO health"
          sub={`Every published post re-scored live. Hard-capped at ${maxScore} — never a flat 10.`}
          actions={
            <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" onClick={load.reload} disabled={load.loading}>
              <Svg path={Icons.refresh} size={14} /> Re-run audit
            </button>
          }
        >
          {a && a.publishedCount > 0 ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 26, alignItems: "center" }}>
              <RadialGauge value={a.averageScore} max={maxScore} size={140} color={agent.accent} label={`of ${maxScore}`} />
              <div style={{ flex: 1, minWidth: 220 }}>
                <BarList rows={ruleRows} color="#22c55e" emptyText={load.loading ? "Loading breakdowns…" : "No breakdowns to summarise yet."} />
              </div>
            </div>
          ) : (
            <Empty>{load.loading ? "Running the audit…" : "No published posts to audit yet."}</Empty>
          )}
        </Panel>

        <Panel
          title="Every published post, ranked"
          sub="Filter by health band, click a row for its rule-by-rule breakdown"
          noBody
          actions={
            <div className="ag-tabs">
              {BANDS.map((b) => (
                <button key={b} type="button" className={`ag-tab ${band === b ? "active" : ""}`} onClick={() => { setBand(b); setPage(1); }}>
                  {b === "ALL" ? "All" : b}
                  {b !== "ALL" && ` (${bandCounts.find((c) => c.label === b)?.value ?? 0})`}
                </button>
              ))}
            </div>
          }
        >
          {(msg || err) && (
            <div style={{ padding: "12px 20px 0" }}>
              <p style={{ margin: 0, fontSize: 11.5, fontWeight: 650, color: err ? "var(--ag-red)" : "var(--ag-green)" }}>{err ?? msg}</p>
            </div>
          )}
          <TableWrap>
            <table className="ag-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Post</th>
                  <th>Score</th>
                  <th>Band</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((p, i) => {
                  const bandName = bandOf(p.score, maxScore);
                  return (
                    <tr key={p.id} className="clickable" onClick={() => openDetail(p.id)}>
                      <td style={{ color: "var(--ag-ink-faint)", fontWeight: 700 }}>{(page - 1) * PAGE_SIZE + i + 1}</td>
                      <td style={{ minWidth: 200, fontWeight: 650 }}>{p.title}</td>
                      <td style={{ minWidth: 140 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                          <strong className="ag-display" style={{ fontSize: 13, minWidth: 30 }}>{p.score}</strong>
                          <div className="ag-barlist-track" style={{ flex: 1, minWidth: 60 }}>
                            <div className="ag-barlist-fill" style={{ width: `${(p.score / maxScore) * 100}%`, background: BAND_COLOR[bandName] }} />
                          </div>
                        </div>
                      </td>
                      <td><Pill text={bandName} tone={bandName === "Excellent" || bandName === "Healthy" ? "green" : bandName === "Needs work" ? "amber" : "red"} /></td>
                      <td>
                        <button
                          type="button"
                          className="ag-btn ag-btn-accent ag-btn-sm"
                          disabled={busyId === p.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            improve(p.id);
                          }}
                        >
                          {busyId === p.id ? "Rewriting…" : "Improve"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {paged.length === 0 && (
                  <tr>
                    <td colSpan={5}><Empty>{load.loading ? "Running the audit…" : "No posts in this band."}</Empty></td>
                  </tr>
                )}
              </tbody>
            </table>
          </TableWrap>
          {filtered.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderTop: "1px solid var(--ag-border-soft)" }}>
              <span style={{ fontSize: 11, color: "var(--ag-ink-faint)" }}>Page {page} of {pageCount} · {filtered.length} post{filtered.length === 1 ? "" : "s"}</span>
              <div style={{ display: "flex", gap: 6 }}>
                <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
                <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)}>Next</button>
              </div>
            </div>
          )}
        </Panel>

        {selected && (
          <Panel
            title={detail ? detail.post.title : "Rule breakdown"}
            sub={detail ? `${detail.score} / ${detail.maxScore} · ${detail.post.category}` : "Loading the live score…"}
            actions={
              <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" onClick={() => { setSelected(null); setDetail(null); }}>
                Close
              </button>
            }
          >
            {detailBusy && <Empty>Scoring…</Empty>}
            {detail &&
              detail.breakdown.map((r) => {
                const passed = r.points >= r.maxPoints;
                return (
                  <div className="ag-score-row" key={r.rule}>
                    <div className={`ag-score-check ${passed ? "pass" : "fail"}`}>{passed ? "✓" : "–"}</div>
                    <div className="ag-score-main">
                      <div className="ag-score-rule">{r.rule}</div>
                      <div className="ag-score-note">{r.note}</div>
                    </div>
                    <div className="ag-score-pts">{r.points} / {r.maxPoints}</div>
                  </div>
                );
              })}
            {!detailBusy && !detail && <Empty>Could not load that post's breakdown.</Empty>}
          </Panel>
        )}

        <InsightsPanel
          rows={[
            {
              icon: <Svg path={Icons.crown} size={15} />,
              label: "Best scoring post",
              value: ranked[0] ? `"${ranked[0].title}" at ${ranked[0].score} / ${maxScore}.` : "Nothing scored yet.",
            },
            {
              icon: <Svg path={Icons.alert} size={15} />,
              label: "Lowest scoring post",
              value: ranked.length > 1 ? `"${ranked[ranked.length - 1].title}" at ${ranked[ranked.length - 1].score} / ${maxScore} — start here.` : "Nothing to prioritise yet.",
            },
            {
              icon: <Svg path={Icons.dashboard} size={15} />,
              label: "Need the trend view?",
              value: (
                <>
                  Score distribution and rule pass-rate summary live on the{" "}
                  <Link href={`/${platform.key}/${agent.key}`} style={{ color: "var(--ag-accent)", fontWeight: 650 }}>Dashboard</Link> tab.
                </>
              ),
            },
          ]}
        />

        <Panel title="Agent runtime" sub="Real usage from the shared agent log">
          <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
            {load.data?.stats ? (
              <>
                <KeyRow label="Model" value={load.data.stats.model} />
                <KeyRow label="Calls this month" value={num(load.data.stats.callsThisMonth)} />
                <KeyRow label="Spend this month" value={`$${(load.data.stats.spendThisMonthUsd ?? 0).toFixed(2)}`} />
              </>
            ) : (
              <Empty>{load.loading ? "Loading…" : "Runtime stats unavailable."}</Empty>
            )}
          </div>
        </Panel>
      </div>
    </>
  );
}
