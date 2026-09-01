"use client";

/**
 * ShadiLife — SEO Agent — Audit (domain tab).
 *
 * The deep-dive workbench for the same real audit the Dashboard teases:
 *   POST /api/ai-agents/seo/site-audit               → { postsChecked, postsWithIssues, maxScore, results[] }
 *   POST /api/ai-agents/seo/audit-blog/:id/improve    → { postId, score, metaTitle, metaDescription, keywords } (real write)
 *   GET  /api/admin/content/blog                      → BlogPost[] (corpus context)
 *
 * This page owns its own audit run — opening it never re-uses whatever the
 * Dashboard tab happened to have loaded, and running it here never re-bills
 * a run already paid for elsewhere. Adds what didn't fit on the Dashboard:
 * a searchable, score-band-filterable, paginated table over every audited
 * post instead of just the worst few.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { AgentHeading } from "@/components/agents/AgentShell";
import { AreaChart, BarList, DonutChart, InsightsPanel, MetricCard, Svg } from "@/components/agents/rich";
import { Icons } from "@/components/agents/icons";
import { apiFetch } from "@/lib/api";
import type { AgentViewProps } from "../../registry";
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
  num,
  share,
  text,
  useAsync,
} from "../../shadilife/_shadilife-console-kit";

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

const BANDS = [
  { key: "all", label: "All scores", test: () => true },
  { key: "9", label: "9.0 – 9.5", test: (s: number) => s >= 9 },
  { key: "8", label: "8.0 – 8.9", test: (s: number) => s >= 8 && s < 9 },
  { key: "7", label: "7.0 – 7.9", test: (s: number) => s >= 7 && s < 8 },
  { key: "5", label: "5.0 – 6.9", test: (s: number) => s >= 5 && s < 7 },
  { key: "0", label: "Below 5.0", test: (s: number) => s < 5 },
];

const PAGE_SIZE = 8;

export default function ShadiLifeSeoAuditView({ platform, agent, api }: AgentViewProps) {
  const library = useAsync<BlogPost[]>(
    platform,
    async () => arr<BlogPost>((await apiFetch<BlogPost[]>(platform.key, "/admin/content/blog")).data),
    true,
  );
  const audit = useAsync<SiteAudit>(platform, async () => (await api.post<SiteAudit>("/site-audit")).data, false);

  const [improving, setImproving] = useState<string | null>(null);
  const [improved, setImproved] = useState<Record<string, ImproveResult>>({});
  const [improveError, setImproveError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [band, setBand] = useState("all");
  const [dir, setDir] = useState<"worst" | "best">("worst");
  const [page, setPage] = useState(1);

  const posts = library.data ?? [];
  const published = posts.filter((p) => text(p.status) === "PUBLISHED");

  const results = useMemo(() => {
    const rows = arr<AuditResult>(audit.data?.results);
    return rows.map((r) => {
      const fresh = improved[text(r.postId)];
      return fresh ? { ...r, score: num(fresh.score) ?? r.score } : r;
    });
  }, [audit.data, improved]);

  const scores = results.map((r) => num(r.score)).filter((s): s is number => s !== null);
  const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  const maxScore = num(audit.data?.maxScore);
  const clean = maxScore === null ? null : results.filter((r) => (num(r.score) ?? -1) >= maxScore).length;

  const ranked = useMemo(() => {
    const sorted = [...results].sort((a, b) => (num(a.score) ?? 99) - (num(b.score) ?? 99));
    return dir === "worst" ? sorted : sorted.reverse();
  }, [results, dir]);

  const deductionRows = useMemo(() => {
    const all = results.flatMap((r) => arr<string>(r.reasons));
    return countBy(all.filter((r) => !/every check passed/i.test(r)), (r) => reasonBucket(r));
  }, [results]);

  const scoreBands = useMemo(() => {
    return BANDS.slice(1)
      .map((b) => ({ label: b.label, value: scores.filter(b.test).length }))
      .filter((b) => b.value > 0);
  }, [scores]);

  const curve = useMemo(() => {
    const rows = [...ranked].reverse().slice(-40); // chronological-ish, up to 40 points
    return {
      labels: rows.map((r) => {
        const t = text(r.title) || text(r.slug) || "Untitled";
        return t.length > 10 ? `${t.slice(0, 9)}…` : t;
      }),
      data: rows.map((r) => num(r.score) ?? 0),
    };
  }, [ranked]);

  const filtered = useMemo(() => {
    const bandDef = BANDS.find((b) => b.key === band) ?? BANDS[0];
    const q = search.trim().toLowerCase();
    return ranked.filter((r) => {
      const s = num(r.score);
      if (!bandDef.test(s ?? -1)) return false;
      if (q) {
        const hay = `${text(r.title)} ${text(r.slug)}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [ranked, band, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageClamped = Math.min(page, totalPages);
  const pageRows = filtered.slice((pageClamped - 1) * PAGE_SIZE, pageClamped * PAGE_SIZE);

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
        blurb="The full audit workbench — every scored post, searchable and filterable by score band, with the model's suggested fix one click away."
        actions={
          <>
            <button type="button" className="ag-btn ag-btn-solid" onClick={() => void audit.run()} disabled={audit.loading}>
              <Svg path={Icons.scan} size={14} /> {audit.loading ? "Auditing…" : hasRun ? "Re-run site audit" : "Run site audit"}
            </button>
            <Link href={`/${platform.key}/${agent.key}`} className="ag-btn ag-btn-ghost">← Dashboard</Link>
          </>
        }
      />

      {audit.error && <ErrorPanel message={audit.error} platform={platform} what="The site audit" />}
      {!audit.error && library.error && <ErrorPanel message={library.error} platform={platform} what="The blog corpus" />}

      <div className="ag-metrics">
        <MetricCard icon={<Svg path={Icons.content} size={24} />} tone="purple" title="Published posts" value={posts.length ? fmtInt(published.length) : "—"} />
        <MetricCard icon={<Svg path={Icons.scan} size={24} />} tone="blue" title="Posts audited" value={fmtInt(audit.data?.postsChecked)} />
        <MetricCard icon={<Svg path={Icons.filter} size={24} />} tone="red" title="Posts with issues" value={fmtInt(audit.data?.postsWithIssues)} />
        <MetricCard icon={<Svg path={Icons.check} size={24} />} tone="green" title="Clean posts" value={clean === null ? "—" : fmtInt(clean)} />
        <MetricCard icon={<Svg path={Icons.gauge} size={24} />} tone="gold" title="Average score" value={avgScore === null ? "—" : `${fmtNum(avgScore, 2)} / ${fmtNum(maxScore ?? 9.5, 1)}`} />
      </div>

      <div className="ag-split">
        <div className="ag-stack">
          <Panel title="Score curve" sub="Every audited post's real score, in table order">
            {curve.labels.length > 0 ? (
              <>
                <AreaChart labels={curve.labels} series={[{ name: "SEO score", data: curve.data, color: agent.accent }]} height={230} />
                <SourceNote>Scores come straight from the audit response, capped at {fmtNum(maxScore ?? 9.5, 1)} by design.</SourceNote>
              </>
            ) : (
              <Empty>
                {audit.loading
                  ? "Running the site audit — this scores each recent published post and asks the model for a fix only where there is a real metadata gap…"
                  : "No audit has been run in this session. Press “Run site audit” above."}
              </Empty>
            )}
          </Panel>

          <Panel
            title="Audited posts"
            sub="Search, filter by score band, and page through every result. “Improve” writes the suggested meta title, description and keywords."
            flush
            actions={
              hasRun && results.length > 0 ? (
                <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" onClick={() => setDir((d) => (d === "worst" ? "best" : "worst"))}>
                  {dir === "worst" ? "Worst first" : "Best first"}
                </button>
              ) : undefined
            }
          >
            {hasRun && results.length > 0 && (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", padding: "14px 20px 0" }}>
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search by title or slug…"
                  style={{ flex: "1 1 200px", minWidth: 160 }}
                />
                <select
                  value={band}
                  onChange={(e) => {
                    setBand(e.target.value);
                    setPage(1);
                  }}
                  style={{ flex: "0 0 auto" }}
                >
                  {BANDS.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}
                </select>
              </div>
            )}

            {improveError && <p style={{ margin: "12px 20px 0", fontSize: 12, color: "var(--ag-red)" }}>{improveError}</p>}

            {pageRows.length > 0 ? (
              <>
                <TableScroll>
                  <table className="ag-table">
                    <thead>
                      <tr>
                        <th>Post</th>
                        <th style={{ textAlign: "right" }}>Score</th>
                        <th>Why it lost points</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.map((r, i) => {
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
                            <td style={{ maxWidth: 380 }}>
                              {arr<string>(r.reasons).length > 0 ? (
                                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11.5, color: "var(--ag-ink-soft)", lineHeight: 1.6 }}>
                                  {arr<string>(r.reasons).slice(0, 4).map((reason, j) => <li key={j}>{reason}</li>)}
                                </ul>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td style={{ whiteSpace: "nowrap" }}>
                              {arr<string>(r.issues).length > 0 && id ? (
                                <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" onClick={() => void improve(id)} disabled={improving === id}>
                                  {improving === id ? "Writing…" : wasImproved ? "Improve again" : "Improve"}
                                </button>
                              ) : (
                                <span style={{ fontSize: 11, color: "var(--ag-ink-faint)" }}>{wasImproved ? "Updated" : "No metadata gap"}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </TableScroll>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px" }}>
                  <span style={{ fontSize: 11, color: "var(--ag-ink-faint)" }}>
                    {filtered.length} post{filtered.length === 1 ? "" : "s"} · page {pageClamped} of {totalPages}
                  </span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={pageClamped <= 1}>← Prev</button>
                    <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={pageClamped >= totalPages}>Next →</button>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ padding: "0 20px 20px" }}>
                <Empty>{audit.loading ? "Auditing…" : hasRun ? "No post matches this search/filter." : "No audit results yet."}</Empty>
              </div>
            )}
          </Panel>
        </div>

        <div className="ag-stack">
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

          <Panel title="Where points are lost" sub="Every deduction line, grouped by check">
            <BarList rows={deductionRows} ranked emptyText={audit.loading ? "Loading…" : hasRun ? "No deductions recorded." : "Run the audit to populate this."} />
          </Panel>

          <Panel title="Score bands" sub="How the audited posts spread across score ranges">
            <BarList rows={scoreBands} color={agent.accent} emptyText={hasRun ? "No scores returned." : "Run the audit to populate this."} />
          </Panel>

          <Panel title="Corpus coverage" sub="How much of the blog the audit reaches">
            {posts.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
                <StatRow label="Posts in the library" value={fmtInt(posts.length)} />
                <StatRow label="Published (auditable)" value={fmtInt(published.length)} />
                <StatRow label="Covered by the last run" value={fmtInt(audit.data?.postsChecked)} hint="the audit takes the 25 most recent" />
                <StatRow label="Missing a meta title" value={fmtInt(posts.filter((p) => !text(p.metaTitle).trim()).length)} />
                <StatRow label="No keywords set" value={fmtInt(posts.filter((p) => arr<string>(p.keywords).length === 0).length)} />
              </div>
            ) : (
              <Empty>{library.loading ? "Loading the blog corpus…" : "The blog library could not be read."}</Empty>
            )}
          </Panel>

          <InsightsPanel
            title="Audit insights"
            rows={
              !hasRun || results.length === 0
                ? []
                : [
                    { icon: <Svg path={Icons.alert} size={15} />, label: "Weakest post", value: ranked[dir === "worst" ? 0 : ranked.length - 1] ? `${text(ranked[dir === "worst" ? 0 : ranked.length - 1].title) || "Untitled"}` : "—" },
                    { icon: <Svg path={Icons.trendUp} size={15} />, label: "Share at the cap", value: fmtPct(share(clean ?? 0, results.length) ?? 0) },
                    { icon: <Svg path={Icons.seo} size={15} />, label: "Most common deduction", value: deductionRows[0] ? `${deductionRows[0].label} — ${fmtInt(deductionRows[0].value)} post(s)` : "None recorded" },
                    { icon: <Svg path={Icons.wand} size={15} />, label: "Fixable by this agent", value: `${fmtInt(results.filter((r) => arr<string>(r.issues).length > 0).length)} post(s) have a metadata gap` },
                    { icon: <Svg path={Icons.check} size={15} />, label: "Improved this session", value: `${fmtInt(Object.keys(improved).length)} post(s)` },
                  ]
            }
          />

          {Object.keys(improved).length > 0 && (
            <Panel title="Written this session" sub="Live results returned by the improve endpoint">
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {Object.entries(improved).map(([id, r]) => (
                  <div key={id}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                      <b style={{ fontSize: 12 }}>{text(r.metaTitle) || "Meta title updated"}</b>
                      <Badge tone={scoreTone(num(r.score))}>{fmtNum(r.score, 1)}</Badge>
                    </div>
                    {text(r.metaDescription) && (
                      <p style={{ margin: "5px 0 0", fontSize: 11.5, color: "var(--ag-ink-soft)", lineHeight: 1.6 }}>{r.metaDescription}</p>
                    )}
                    {arr<string>(r.keywords).length > 0 && (
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 7 }}>
                        {arr<string>(r.keywords).map((k) => <Badge key={k} tone="mute">{k}</Badge>)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
