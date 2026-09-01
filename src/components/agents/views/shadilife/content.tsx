"use client";

/**
 * ShadiLife — Content Agent.
 *
 * Real endpoints behind this page:
 *   GET  /api/admin/content/blog                 → BlogPost[] (the live library)
 *   POST /api/ai-agents/content/draft-blog       → { title, contentHtml, metaTitle,
 *                                                    metaDescription, keywords[],
 *                                                    coverImageUrl, imageCredit }
 *   POST /api/ai-agents/content/publish          → the created BlogPost (real write)
 *
 * The library GET is the only auto-loaded call — drafting spends an OpenAI
 * call, so it only ever runs when the owner asks for it, and publishing is a
 * separate deliberate click, exactly as the router intends.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { AgentHeading } from "@/components/agents/AgentShell";
import { AreaChart, BarList, DonutChart, InsightsPanel, MetricCard, Svg } from "@/components/agents/rich";
import { Icons } from "@/components/agents/icons";
import { apiFetch } from "@/lib/api";
import type { AgentViewProps } from "../registry";
import {
  AiBullets,
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
  fmtDate,
  fmtInt,
  fmtPct,
  monthlySeries,
  n0,
  share,
  text,
  useAsync,
} from "./_shadilife-console-kit";

/** Prisma BlogPost, as `GET /api/admin/content/blog` returns it. */
interface BlogPost {
  id?: string;
  title?: string;
  slug?: string;
  category?: string;
  contentHtml?: string;
  coverImageUrl?: string | null;
  views?: number;
  status?: string;
  publishedAt?: string | null;
  createdAt?: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  keywords?: string[];
}

interface BlogDraft {
  title?: string;
  contentHtml?: string;
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  coverImageUrl?: string;
  imageCredit?: string;
}

const stripHtml = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const wordCount = (html: unknown) => {
  const t = stripHtml(text(html));
  return t ? t.split(/\s+/).length : 0;
};
const statusTone = (s: string): "green" | "amber" | "mute" =>
  s === "PUBLISHED" ? "green" : s === "DRAFT" ? "amber" : "mute";

export default function ShadiLifeContentView({ platform, agent, api }: AgentViewProps) {
  const library = useAsync<BlogPost[]>(
    platform,
    async () => arr<BlogPost>((await apiFetch<BlogPost[]>(platform.key, "/admin/content/blog")).data),
    true,
  );

  const [topic, setTopic] = useState("");
  const [category, setCategory] = useState("");
  const [instructions, setInstructions] = useState("");
  const [draft, setDraft] = useState<BlogDraft | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [publishedNote, setPublishedNote] = useState<string | null>(null);

  const posts = library.data ?? [];

  const stats = useMemo(() => {
    const published = posts.filter((p) => text(p.status) === "PUBLISHED");
    const totalViews = posts.reduce((s, p) => s + n0(p.views), 0);
    const withMetaTitle = posts.filter((p) => text(p.metaTitle).trim()).length;
    const withMetaDesc = posts.filter((p) => text(p.metaDescription).trim()).length;
    const withKeywords = posts.filter((p) => arr<string>(p.keywords).length > 0).length;
    const withCover = posts.filter((p) => text(p.coverImageUrl).trim()).length;
    const fullyOptimised = posts.filter(
      (p) => text(p.metaTitle).trim() && text(p.metaDescription).trim() && arr<string>(p.keywords).length > 0,
    ).length;
    const topByViews = [...posts].sort((a, b) => n0(b.views) - n0(a.views));
    return { published, totalViews, withMetaTitle, withMetaDesc, withKeywords, withCover, fullyOptimised, topByViews };
  }, [posts]);

  const byStatus = useMemo(() => countBy(posts, (p) => text(p.status) || "UNKNOWN"), [posts]);
  const byCategory = useMemo(() => countBy(posts, (p) => text(p.category) || null).slice(0, 7), [posts]);
  const created = useMemo(() => monthlySeries(posts, (p) => p.createdAt, 8), [posts]);
  const publishedSeries = useMemo(() => monthlySeries(posts.filter((p) => p.publishedAt), (p) => p.publishedAt, 8), [posts]);

  async function runDraft() {
    if (!topic.trim()) return;
    setDrafting(true);
    setComposerError(null);
    setPublishedNote(null);
    try {
      const res = await api.post<BlogDraft>("/draft-blog", {
        topic: topic.trim(),
        category: category.trim() || undefined,
        instructions: instructions.trim() || undefined,
      });
      setDraft(res.data ?? null);
    } catch (e) {
      setComposerError(describeError(e, platform));
    } finally {
      setDrafting(false);
    }
  }

  async function publishDraft() {
    if (!draft?.title || !draft?.contentHtml) return;
    setPublishing(true);
    setComposerError(null);
    try {
      const res = await api.post<BlogPost>("/publish", {
        title: draft.title,
        contentHtml: draft.contentHtml,
        category: category.trim() || "General",
        metaTitle: draft.metaTitle,
        metaDescription: draft.metaDescription,
        keywords: arr<string>(draft.keywords),
        coverImageUrl: draft.coverImageUrl,
      });
      setPublishedNote(`Published “${text(res.data?.title) || draft.title}” to the live blog.`);
      setDraft(null);
      void library.run();
    } catch (e) {
      setComposerError(describeError(e, platform));
    } finally {
      setPublishing(false);
    }
  }

  const draftWords = draft ? wordCount(draft.contentHtml) : 0;
  const metaTitleLen = text(draft?.metaTitle).length;
  const metaDescLen = text(draft?.metaDescription).length;
  const draftKeywords = arr<string>(draft?.keywords);
  const keywordsInBody = draft
    ? draftKeywords.filter((k) => stripHtml(text(draft.contentHtml)).toLowerCase().includes(k.toLowerCase()))
    : [];

  return (
    <>
      <AgentHeading
        platform={platform}
        agent={agent}
        blurb="Drafts blog posts with their SEO metadata in one call, then publishes only when you click Publish. The library below is the live BlogPost table."
        actions={
          <>
            <Link href={`/${platform.key}/${agent.key}/chat`} className="ag-btn ag-btn-solid">Ask this agent →</Link>
            <button type="button" className="ag-btn ag-btn-ghost" onClick={() => void library.run()} disabled={library.loading}>
              <Svg path={Icons.refresh} size={14} /> {library.loading ? "Refreshing…" : "Refresh library"}
            </button>
          </>
        }
      />

      {library.error && <ErrorPanel message={library.error} platform={platform} what="The blog library" />}

      <div className="ag-metrics">
        <MetricCard icon={<Svg path={Icons.content} size={24} />} tone="purple" title="Posts in library" value={library.loading && posts.length === 0 ? "—" : fmtInt(posts.length)} />
        <MetricCard icon={<Svg path={Icons.check} size={24} />} tone="green" title="Published" value={posts.length ? fmtInt(stats.published.length) : "—"} />
        <MetricCard icon={<Svg path={Icons.eye} size={24} />} tone="blue" title="Total post views" value={posts.length ? fmtInt(stats.totalViews) : "—"} />
        <MetricCard icon={<Svg path={Icons.seo} size={24} />} tone="gold" title="Full SEO metadata" value={posts.length ? `${fmtInt(stats.fullyOptimised)} / ${fmtInt(posts.length)}` : "—"} />
        <MetricCard icon={<Svg path={Icons.sparkle} size={24} />} tone="pink" title="With cover image" value={posts.length ? fmtInt(stats.withCover) : "—"} />
      </div>

      <div className="ag-split">
        <div className="ag-stack">
          <Panel
            title="Publishing cadence"
            sub="Posts created vs posts published, by month — counted from createdAt / publishedAt on the real records"
          >
            {posts.length > 0 ? (
              <>
                <AreaChart
                  labels={created.labels}
                  series={[
                    { name: "Created", data: created.data, color: agent.accent },
                    { name: "Published", data: publishedSeries.data, color: "#22c55e" },
                  ]}
                  height={230}
                />
                <SourceNote>Every point is a count of real BlogPost rows in that calendar month. Empty months are genuinely empty.</SourceNote>
              </>
            ) : (
              <Empty>{library.loading ? "Loading the blog library…" : "No posts returned by /admin/content/blog."}</Empty>
            )}
          </Panel>

          <div className="ag-duo">
            <Panel title="Library by status" sub="BlogPost.status">
              <DonutChart data={byStatus} totalLabel="Posts" />
            </Panel>
            <Panel title="Top categories" sub="Posts per BlogPost.category">
              <BarList rows={byCategory} ranked emptyText={library.loading ? "Loading…" : "No categories returned."} />
            </Panel>
          </div>

          <Panel
            title="Most-read posts"
            sub="Ranked by the BlogPost.views counter"
            flush
          >
            {stats.topByViews.length > 0 ? (
              <TableScroll>
                <table className="ag-table">
                  <thead>
                    <tr>
                      <th>Post</th>
                      <th>Category</th>
                      <th>Status</th>
                      <th style={{ textAlign: "right" }}>Views</th>
                      <th style={{ textAlign: "right" }}>Keywords</th>
                      <th>Published</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.topByViews.slice(0, 10).map((p, i) => (
                      <tr key={text(p.id) || `post-${i}`}>
                        <td style={{ maxWidth: 280 }}>
                          <div style={{ fontWeight: 650 }}>{text(p.title) || "Untitled"}</div>
                          <div style={{ fontSize: 10.5, color: "var(--ag-ink-faint)" }}>
                            {text(p.metaDescription).trim() ? "meta description set" : "no meta description"} · {fmtInt(wordCount(p.contentHtml))} words
                          </div>
                        </td>
                        <td>{text(p.category) || "—"}</td>
                        <td><Badge tone={statusTone(text(p.status))}>{text(p.status) || "—"}</Badge></td>
                        <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtInt(p.views)}</td>
                        <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtInt(arr<string>(p.keywords).length)}</td>
                        <td style={{ whiteSpace: "nowrap" }}>{fmtDate(p.publishedAt ?? p.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableScroll>
            ) : (
              <Empty>{library.loading ? "Loading the blog library…" : "Nothing to rank yet."}</Empty>
            )}
          </Panel>

          <Panel
            title="Draft a post"
            sub="POST /ai-agents/content/draft-blog — one OpenAI call, returns the post and its SEO metadata together"
          >
            <div className="ag-form-grid">
              <div className="ag-field">
                <label htmlFor="sl-content-topic">Topic</label>
                <input id="sl-content-topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. How families vet a rishta proposal" />
              </div>
              <div className="ag-field">
                <label htmlFor="sl-content-cat">Category</label>
                <input id="sl-content-cat" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="General" />
              </div>
            </div>
            <div className="ag-field" style={{ marginTop: 14 }}>
              <label htmlFor="sl-content-instr">Custom instructions (optional)</label>
              <textarea id="sl-content-instr" rows={2} value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Target length, structure, tone, SEO focus…" />
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
              <button type="button" className="ag-btn ag-btn-solid" onClick={() => void runDraft()} disabled={drafting || !topic.trim()}>
                <Svg path={Icons.sparkle} size={14} /> {drafting ? "Drafting…" : "Draft blog post"}
              </button>
              {draft && (
                <button type="button" className="ag-btn ag-btn-accent" onClick={() => void publishDraft()} disabled={publishing}>
                  <Svg path={Icons.send} size={14} /> {publishing ? "Publishing…" : "Publish to the live blog"}
                </button>
              )}
            </div>

            {composerError && <p style={{ margin: "13px 0 0", fontSize: 12, color: "var(--ag-red)" }}>{composerError}</p>}
            {publishedNote && <p style={{ margin: "13px 0 0", fontSize: 12, color: "var(--ag-green)", fontWeight: 600 }}>{publishedNote}</p>}

            {draft && (
              <div style={{ marginTop: 18, borderTop: "1px solid var(--ag-border-soft)", paddingTop: 16 }}>
                <div className="ag-form-grid" style={{ marginBottom: 14 }}>
                  <StatRow label="Body length" value={`${fmtInt(draftWords)} words`} hint="stripped of HTML" />
                  <StatRow label="Meta title" value={metaTitleLen ? `${fmtInt(metaTitleLen)} / 60 chars` : "—"} />
                  <StatRow label="Meta description" value={metaDescLen ? `${fmtInt(metaDescLen)} / 160 chars` : "—"} />
                  <StatRow label="Keywords in body" value={draftKeywords.length ? `${fmtInt(keywordsInBody.length)} / ${fmtInt(draftKeywords.length)}` : "—"} />
                </div>
                <h4 className="ag-display" style={{ margin: "0 0 6px", fontSize: 15 }}>{text(draft.title) || "Untitled draft"}</h4>
                {text(draft.metaDescription) && <p style={{ margin: "0 0 10px", fontSize: 12, color: "var(--ag-ink-soft)" }}>{draft.metaDescription}</p>}
                {draftKeywords.length > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                    {draftKeywords.map((k) => <Badge key={k} tone={keywordsInBody.includes(k) ? "green" : "amber"}>{k}</Badge>)}
                  </div>
                )}
                {text(draft.coverImageUrl) && (
                  <p style={{ margin: "0 0 10px", fontSize: 11, color: "var(--ag-ink-faint)" }}>
                    Cover image found: <a href={draft.coverImageUrl} target="_blank" rel="noreferrer" style={{ color: "var(--ag-accent)" }}>open</a>
                    {text(draft.imageCredit) && ` · ${draft.imageCredit}`}
                  </p>
                )}
                <div
                  style={{ fontSize: 12.5, lineHeight: 1.75, color: "var(--ag-ink-soft)", maxHeight: 280, overflowY: "auto", overflowX: "auto" }}
                  dangerouslySetInnerHTML={{ __html: text(draft.contentHtml) }}
                />
                <SourceNote>This is a draft returned by the API. Nothing is written to the blog until you press Publish.</SourceNote>
              </div>
            )}
          </Panel>
        </div>

        <div className="ag-stack">
          <InsightsPanel
            title="Library insights"
            rows={
              posts.length === 0
                ? []
                : [
                    {
                      icon: <Svg path={Icons.seo} size={15} />,
                      label: "Metadata coverage",
                      value: `${fmtPct(share(stats.fullyOptimised, posts.length) ?? 0)} of posts have a meta title, description and keywords`,
                    },
                    {
                      icon: <Svg path={Icons.alert} size={15} />,
                      label: "Missing meta description",
                      value: `${fmtInt(posts.length - stats.withMetaDesc)} post(s)`,
                    },
                    {
                      icon: <Svg path={Icons.eye} size={15} />,
                      label: "Average views per post",
                      value: posts.length ? fmtInt(Math.round(stats.totalViews / posts.length)) : "—",
                    },
                    {
                      icon: <Svg path={Icons.crown} size={15} />,
                      label: "Most-read post",
                      value: stats.topByViews[0]
                        ? `${text(stats.topByViews[0].title) || "Untitled"} — ${fmtInt(stats.topByViews[0].views)} views`
                        : "—",
                    },
                    {
                      icon: <Svg path={Icons.clock} size={15} />,
                      label: "Newest post",
                      value: fmtDate(
                        [...posts].sort((a, b) => new Date(text(b.createdAt)).getTime() - new Date(text(a.createdAt)).getTime())[0]?.createdAt,
                      ),
                    },
                  ]
            }
          />

          <Panel title="Metadata completeness" sub="Counted field by field across every post">
            {posts.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
                <StatRow label="Meta title set" value={`${fmtInt(stats.withMetaTitle)} / ${fmtInt(posts.length)}`} />
                <StatRow label="Meta description set" value={`${fmtInt(stats.withMetaDesc)} / ${fmtInt(posts.length)}`} />
                <StatRow label="Keywords set" value={`${fmtInt(stats.withKeywords)} / ${fmtInt(posts.length)}`} />
                <StatRow label="Cover image set" value={`${fmtInt(stats.withCover)} / ${fmtInt(posts.length)}`} />
                <StatRow label="Published share" value={fmtPct(share(stats.published.length, posts.length) ?? 0)} />
              </div>
            ) : (
              <Empty>{library.loading ? "Loading…" : "No posts to measure."}</Empty>
            )}
          </Panel>

          <Panel title="What this agent can write" sub="Only these two calls change anything">
            <AiBullets
              body={[
                "POST /content/draft-blog — returns a draft only. Nothing is saved.",
                "POST /content/publish — creates a PUBLISHED BlogPost and writes an audit-log entry. Fired only by the Publish button above.",
              ]}
            />
          </Panel>
        </div>
      </div>
    </>
  );
}
