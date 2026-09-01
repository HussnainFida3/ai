"use client";

/**
 * ShadiLife — SEO Agent.
 *
 * Real endpoints behind this page:
 *   POST /api/ai-agents/seo/site-audit                  → { postsChecked, postsWithIssues,
 *                                                           maxScore, results[] }
 *   POST /api/ai-agents/seo/audit-blog/:id/improve      → { postId, score, metaTitle,
 *                                                           metaDescription, keywords } (real write)
 *   GET  /api/admin/content/blog                        → BlogPost[] (corpus context)
 *
 * The site audit is deliberately NOT auto-run: it scores the 25 most recent
 * published posts and spends an OpenAI call on each one that actually has a
 * metadata gap. Opening this page must never cost money, so the owner starts it.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { AgentHeading } from "@/components/agents/AgentShell";
import { AreaChart, BarList, DonutChart, InsightsPanel, MetricCard, Svg } from "@/components/agents/rich";
import { Icons } from "@/components/agents/icons";
import { apiFetch } from "@/lib/api";
import type { AgentViewProps } from "../registry";
import {
  Badge,
  Empty,
  ErrorPanel,
  Panel,
  SourceNote,
  StatRow,
  TableScroll,
  arr,
  countBy,
  describeError,
  fmtInt,
  fmtNum,
  fmtPct,
  n0,
  num,
  share,
  text,
  useAsync,
} from "./_shadilife-console-kit";

interface AuditResult {
  postId?: string;
  title?: string;
  slug?: string;
  score?: number;
  issues?: string[];
  reasons?: string[];
  suggestedFix?: { metaTitle?: string; metaDescription?: string; keywords?: string[] } | null;
}
interface SiteAudit {
  postsChecked?: number;
  postsWithIssues?: number;
  maxScore?: number;
  results?: AuditResult[];
}
interface ImproveResult {
  postId?: string;
  score?: number;
  metaTitle?: string | null;
  metaDescription?: string | null;
  keywords?: string[];
}
interface BlogPost {
  id?: string;
  status?: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  keywords?: string[];
}

const scoreTone = (s: number | null): "green" | "amber" | "red" | "mute" =>
  s === null ? "mute" : s >= 9 ? "green" : s >= 7 ? "amber" : "red";

/** Groups a deduction line back to the check that produced it. */
function reasonBucket(reason: string): string {
  const r = reason.toLowerCase();
  if (r.includes("meta title")) return "Meta title";
  if (r.includes("meta description")) return "Meta description";
  if (r.includes("keyword")) return "Target keywords";
  if (r.includes("thin content")) return "Content depth";
  if (r.includes("subheading")) return "Heading structure";
  if (r.includes("alt text")) return "Image alt text";
  if (r.includes("every check passed")) return "No deductions";
  return "Other";
}

export default function ShadiLifeSeoView({ platform, agent, api }: AgentViewProps) {
  const library = useAsync<BlogPost[]>(
    platform,
    async () => arr<BlogPost>((await apiFetch<BlogPost[]>(platform.key, "/admin/content/blog")).data),
    true,
  );
  const audit = useAsync<SiteAudit>(platform, async () => (await api.post<SiteAudit>("/site-audit")).data, false);

  const [improving, setImproving] = useState<string | null>(null);
  const [improved, setImproved] = useState<Record<string, ImproveResult>>({});
  const [improveError, setImproveError] = useState<string | null>(null);

  const posts = library.data ?? [];
  const published = posts.filter((p) => text(p.status) === "PUBLISHED");

  const results = useMemo(() => {
    const rows = arr<AuditResult>(audit.data?.results);
    // A post improved during this session reports the fresh score the improve
    // endpoint returned, not the stale one from the audit run.
    return rows.map((r) => {
      const fresh = improved[text(r.postId)];
      return fresh ? { ...r, score: num(fresh.score) ?? r.score } : r;
    });
  }, [audit.data, improved]);

  const scores = results.map((r) => num(r.score)).filter((s): s is number => s !== null);
  const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  const maxScore = num(audit.data?.maxScore);
  const clean = maxScore === null ? null : results.filter((r) => (num(r.score) ?? -1) >= maxScore).length;

  const ranked = useMemo(() => [...results].sort((a, b) => (num(a.score) ?? 99) - (num(b.score) ?? 99)), [results]);

  const deductionRows = useMemo(() => {
    const all = results.flatMap((r) => arr<string>(r.reasons));
    return countBy(all.filter((r) => !/every check passed/i.test(r)), (r) => reasonBucket(r));
  }, [results]);

  const curve = useMemo(() => {
    const top = ranked.slice(0, 12);
    return {
      labels: top.map((r) => {
        const t = text(r.title) || text(r.slug) || "Untitled";
        return t.length > 12 ? `${t.slice(0, 11)}…` : t;
      }),
      data: top.map((r) => num(r.score) ?? 0),
    };
  }, [ranked]);

  async function improve(postId: string) {
    setImproving(postId);
    setImproveError(null);
    try {
      const res = await api.post<ImproveResult>(`/audit-blog/${encodeURIComponent(postId)}/improve`);
      if (res.data) setImproved((prev) => ({ ...prev, [postId]: res.data }));
    } catch (e) {
      setImproveError(describeError(e, platform));
    } finally {
      setImproving(null);
    }
  }

  const hasRun = audit.data !== null;

  return (
    <>
      <AgentHeading
        platform={platform}
        agent={agent}
        blurb="Scores the 25 most recent published posts on real on-page signals — metadata, keyword usage in the body, content depth, headings, alt text. Capped at 9.5, never a flat 10."
        actions={
          <>
            <button type="button" className="ag-btn ag-btn-solid" onClick={() => void audit.run()} disabled={audit.loading}>
              <Svg path={Icons.seo} size={14} /> {audit.loading ? "Auditing…" : hasRun ? "Re-run site audit" : "Run site audit"}
            </button>
            <Link href={`/${platform.key}/${agent.key}/chat`} className="ag-btn ag-btn-ghost">Ask this agent →</Link>
          </>
        }
      />

      {audit.error && <ErrorPanel message={audit.error} platform={platform} what="The site audit" />}
      {!audit.error && library.error && <ErrorPanel message={library.error} platform={platform} what="The blog corpus" />}

      <div className="ag-metrics">
        <MetricCard icon={<Svg path={Icons.content} size={24} />} tone="purple" title="Published posts" value={posts.length ? fmtInt(published.length) : "—"} />
        <MetricCard icon={<Svg path={Icons.seo} size={24} />} tone="blue" title="Posts audited" value={fmtInt(audit.data?.postsChecked)} />
        <MetricCard icon={<Svg path={Icons.alert} size={24} />} tone="red" title="Posts with issues" value={fmtInt(audit.data?.postsWithIssues)} />
        <MetricCard icon={<Svg path={Icons.check} size={24} />} tone="green" title="Clean posts" value={clean === null ? "—" : fmtInt(clean)} />
        <MetricCard icon={<Svg path={Icons.trendUp} size={24} />} tone="gold" title="Average score" value={avgScore === null ? "—" : `${fmtNum(avgScore, 2)} / ${fmtNum(maxScore ?? 9.5, 1)}`} />
      </div>

      <div className="ag-split">
        <div className="ag-stack">
          <Panel
            title="Score curve — weakest posts first"
            sub="Each point is one audited post's real score out of the audit's own cap"
          >
            {curve.labels.length > 0 ? (
              <>
                <AreaChart labels={curve.labels} series={[{ name: "SEO score", data: curve.data, color: agent.accent }]} height={230} />
                <SourceNote>
                  Scores come straight from the audit response. The audit caps at {fmtNum(maxScore ?? 9.5, 1)} by design — a perfect 10 is never awarded.
                </SourceNote>
              </>
            ) : (
              <Empty>
                {audit.loading
                  ? "Running the site audit — this scores each recent published post and asks the model for a fix only where there is a real metadata gap…"
                  : "No audit has been run in this session. Press “Run site audit” above — it is not started automatically because each post with a gap costs an AI call."}
              </Empty>
            )}
          </Panel>

          <div className="ag-duo">
            <Panel title="Clean vs flagged" sub="Posts at the score cap vs posts that lost points">
              {hasRun && results.length > 0 ? (
                <DonutChart
                  data={[
                    { label: "At the cap", value: clean ?? 0, color: "#22c55e" },
                    { label: "Lost points", value: Math.max(0, results.length - (clean ?? 0)), color: "#f43f5e" },
                  ]}
                  totalLabel="Audited"
                />
              ) : (
                <Empty>{audit.loading ? "Loading…" : "Run the audit to populate this."}</Empty>
              )}
            </Panel>
            <Panel title="Corpus coverage" sub="How much of the blog the audit reaches">
              {posts.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
                  <StatRow label="Posts in the library" value={fmtInt(posts.length)} />
                  <StatRow label="Published (auditable)" value={fmtInt(published.length)} />
                  <StatRow label="Covered by the last run" value={fmtInt(audit.data?.postsChecked)} hint="the audit takes the 25 most recent" />
                </div>
              ) : (
                <Empty>{library.loading ? "Loading the blog corpus…" : "The blog library could not be read."}</Empty>
              )}
            </Panel>
          </div>

          <Panel
            title="Weakest posts"
            sub="Top 5 by score — the Audit tab has the full, searchable, paginated table"
            flush
            actions={<Link href={`/${platform.key}/${agent.key}/audit`} className="ag-btn ag-btn-ghost ag-btn-sm">View all in Audit →</Link>}
          >
            {improveError && <p style={{ margin: "0 20px 12px", fontSize: 12, color: "var(--ag-red)" }}>{improveError}</p>}
            {ranked.length > 0 ? (
              <TableScroll>
                <table className="ag-table">
                  <thead>
                    <tr>
                      <th>Post</th>
                      <th style={{ textAlign: "right" }}>Score</th>
                      <th>Top issue</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {ranked.slice(0, 5).map((r, i) => {
                      const id = text(r.postId);
                      const s = num(r.score);
                      const wasImproved = Boolean(improved[id]);
                      return (
                        <tr key={id || `res-${i}`}>
                          <td style={{ maxWidth: 260 }}>
                            <div style={{ fontWeight: 650 }}>{text(r.title) || "Untitled"}</div>
                            <div style={{ fontSize: 10.5, color: "var(--ag-ink-faint)" }}>/{text(r.slug) || "—"}</div>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <Badge tone={scoreTone(s)}>{s === null ? "—" : fmtNum(s, 1)}</Badge>
                          </td>
                          <td style={{ maxWidth: 260, fontSize: 11.5, color: "var(--ag-ink-soft)" }}>
                            {arr<string>(r.reasons)[0] ?? "—"}
                          </td>
                          <td style={{ whiteSpace: "nowrap" }}>
                            {arr<string>(r.issues).length > 0 && id ? (
                              <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" onClick={() => void improve(id)} disabled={improving === id}>
                                {improving === id ? "Writing…" : wasImproved ? "Improve again" : "Improve"}
                              </button>
                            ) : (
                              <span style={{ fontSize: 11, color: "var(--ag-ink-faint)" }}>
                                {wasImproved ? "Updated" : "No metadata gap"}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </TableScroll>
            ) : (
              <div style={{ padding: "0 20px 20px" }}>
                <Empty>{audit.loading ? "Auditing…" : "No audit results yet."}</Empty>
              </div>
            )}
          </Panel>
        </div>

        <div className="ag-stack">
          <InsightsPanel
            title="Audit insights"
            rows={
              !hasRun || results.length === 0
                ? []
                : [
                    {
                      icon: <Svg path={Icons.alert} size={15} />,
                      label: "Weakest post",
                      value: ranked[0] ? `${text(ranked[0].title) || "Untitled"} — ${fmtNum(ranked[0].score, 1)}` : "—",
                    },
                    {
                      icon: <Svg path={Icons.trendUp} size={15} />,
                      label: "Share at the cap",
                      value: fmtPct(share(clean ?? 0, results.length) ?? 0),
                    },
                    {
                      icon: <Svg path={Icons.wand} size={15} />,
                      label: "Fixable by this agent",
                      value: `${fmtInt(results.filter((r) => arr<string>(r.issues).length > 0).length)} post(s) have a metadata gap the Improve button can write`,
                    },
                  ]
            }
          />

          <Panel title="Where points are lost" sub="Every deduction line, grouped by check">
            <BarList rows={deductionRows.slice(0, 5)} ranked emptyText={audit.loading ? "Loading…" : hasRun ? "No deductions recorded." : "Run the audit to populate this."} />
            {deductionRows.length > 0 && (
              <SourceNote>
                <Link href={`/${platform.key}/${agent.key}/audit`} style={{ color: "var(--ag-accent)", fontWeight: 650 }}>
                  See the full breakdown and score bands in Audit →
                </Link>
              </SourceNote>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}

void n0;
