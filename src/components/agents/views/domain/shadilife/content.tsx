"use client";

/**
 * ShadiLife — Content Agent — Library (5th tab).
 *
 * The full, filterable, sortable, paginated blog library the Dashboard only
 * ranks the top 10 of. Same `GET /api/admin/content/blog` the Dashboard
 * reads (it returns every post — filtering/sorting/paging below all happen
 * client-side over that one real list). Status changes (Publish / Archive /
 * back to Draft) are a real write against the existing
 * `PUT /api/admin/content/blog/:id/status` endpoint — not something the
 * Dashboard exposed, but the same live table it already reads from.
 */

import { useMemo, useState } from "react";
import { AgentHeading } from "@/components/agents/AgentShell";
import { InsightsPanel, MetricCard, Svg } from "@/components/agents/rich";
import { Icons } from "@/components/agents/icons";
import { apiFetch, ApiError } from "@/lib/api";
import type { AgentViewProps } from "../../registry";
import {
  Badge,
  Empty,
  ErrorPanel,
  Panel,
  TableScroll,
  arr,
  countBy,
  describeError,
  fmtDate,
  fmtInt,
  n0,
  text,
  useAsync,
} from "../../shadilife/_shadilife-console-kit";

interface BlogPost {
  id?: string;
  title?: string;
  slug?: string;
  category?: string;
  contentHtml?: string;
  coverImageUrl?: string | null;
  views?: number;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED" | string;
  publishedAt?: string | null;
  createdAt?: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  keywords?: string[];
}

const stripHtml = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const wordCount = (html: unknown) => {
  const t = stripHtml(text(html));
  return t ? t.split(/\s+/).length : 0;
};
const statusTone = (s: string): "green" | "amber" | "mute" => (s === "PUBLISHED" ? "green" : s === "DRAFT" ? "amber" : "mute");

type SortKey = "views" | "newest" | "oldest" | "title";
type StatusFilter = "ALL" | "DRAFT" | "PUBLISHED" | "ARCHIVED";

const PAGE_SIZE = 10;

export default function ShadiLifeContentLibraryView({ platform, agent }: AgentViewProps) {
  const library = useAsync<BlogPost[]>(
    platform,
    async () => arr<BlogPost>((await apiFetch<BlogPost[]>(platform.key, "/admin/content/blog")).data),
    true,
  );

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("views");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const posts = library.data ?? [];
  const categories = useMemo(() => countBy(posts, (p) => text(p.category) || null).map((c) => c.label), [posts]);

  const filtered = useMemo(() => {
    let list = posts;
    if (statusFilter !== "ALL") list = list.filter((p) => text(p.status) === statusFilter);
    if (category) list = list.filter((p) => text(p.category) === category);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((p) => text(p.title).toLowerCase().includes(q));
    }
    const sorted = [...list].sort((a, b) => {
      switch (sort) {
        case "newest":
          return new Date(text(b.createdAt)).getTime() - new Date(text(a.createdAt)).getTime();
        case "oldest":
          return new Date(text(a.createdAt)).getTime() - new Date(text(b.createdAt)).getTime();
        case "title":
          return text(a.title).localeCompare(text(b.title));
        default:
          return n0(b.views) - n0(a.views);
      }
    });
    return sorted;
  }, [posts, statusFilter, category, search, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const byStatus = useMemo(() => countBy(posts, (p) => text(p.status) || "UNKNOWN"), [posts]);
  const publishedCount = posts.filter((p) => text(p.status) === "PUBLISHED").length;
  const draftCount = posts.filter((p) => text(p.status) === "DRAFT").length;
  const totalViews = posts.reduce((s, p) => s + n0(p.views), 0);

  function resetPage<T>(setter: (v: T) => void) {
    return (v: T) => { setter(v); setPage(1); };
  }

  async function setStatus(post: BlogPost, status: "DRAFT" | "PUBLISHED" | "ARCHIVED") {
    if (!post.id) return;
    setBusyId(post.id);
    setActionErr(null);
    setActionMsg(null);
    try {
      await apiFetch(platform.key, `/admin/content/blog/${post.id}/status`, { method: "PUT", body: { status } });
      setActionMsg(`"${text(post.title) || "Post"}" is now ${status.toLowerCase()}.`);
      void library.run();
    } catch (e) {
      setActionErr(e instanceof ApiError ? e.message : describeError(e, platform));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <AgentHeading
        platform={platform}
        agent={agent}
        blurb="Every post in the real BlogPost table — filter by status or category, search by title, sort by views or date, and change a post's status directly."
      />

      {library.error && <ErrorPanel message={library.error} platform={platform} what="The blog library" />}

      <div className="ag-metrics">
        <MetricCard icon={<Svg path={Icons.content} size={24} />} tone="purple" title="Posts in library" value={posts.length ? fmtInt(posts.length) : "—"} />
        <MetricCard icon={<Svg path={Icons.check} size={24} />} tone="green" title="Published" value={posts.length ? fmtInt(publishedCount) : "—"} />
        <MetricCard icon={<Svg path={Icons.wand} size={24} />} tone="gold" title="Drafts" value={posts.length ? fmtInt(draftCount) : "—"} />
        <MetricCard icon={<Svg path={Icons.eye} size={24} />} tone="blue" title="Total views" value={posts.length ? fmtInt(totalViews) : "—"} />
      </div>

      {(actionMsg || actionErr) && (
        <div style={{ margin: "0 0 14px" }}>
          <p style={{ margin: 0, fontSize: 11.5, fontWeight: 650, color: actionErr ? "var(--ag-red)" : "var(--ag-green)" }}>{actionErr ?? actionMsg}</p>
        </div>
      )}

      <div className="ag-split">
        <div className="ag-stack">
          <Panel
            title="Library"
            sub={`${filtered.length} of ${posts.length} posts match this filter`}
            actions={
              <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input
                  value={search}
                  onChange={(e) => resetPage(setSearch)(e.target.value)}
                  placeholder="Search title…"
                  style={{ fontSize: 11.5, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--ag-border)", background: "var(--ag-panel)", color: "var(--ag-ink)", minWidth: 150 }}
                />
                <select value={statusFilter} onChange={(e) => resetPage(setStatusFilter)(e.target.value as StatusFilter)} style={{ fontSize: 11.5, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--ag-border)", background: "var(--ag-panel)", color: "var(--ag-ink)" }}>
                  <option value="ALL">All statuses</option>
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
                <select value={category} onChange={(e) => resetPage(setCategory)(e.target.value)} style={{ fontSize: 11.5, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--ag-border)", background: "var(--ag-panel)", color: "var(--ag-ink)" }}>
                  <option value="">All categories</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} style={{ fontSize: 11.5, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--ag-border)", background: "var(--ag-panel)", color: "var(--ag-ink)" }}>
                  <option value="views">Sort: views</option>
                  <option value="newest">Sort: newest</option>
                  <option value="oldest">Sort: oldest</option>
                  <option value="title">Sort: title</option>
                </select>
              </span>
            }
            flush
          >
            {pageRows.length > 0 ? (
              <TableScroll>
                <table className="ag-table">
                  <thead>
                    <tr>
                      <th>Post</th>
                      <th>Category</th>
                      <th>Status</th>
                      <th style={{ textAlign: "right" }}>Views</th>
                      <th>Published</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((p, i) => (
                      <tr key={text(p.id) || `post-${i}`}>
                        <td style={{ maxWidth: 260 }}>
                          <div style={{ fontWeight: 650 }}>{text(p.title) || "Untitled"}</div>
                          <div style={{ fontSize: 10.5, color: "var(--ag-ink-faint)" }}>
                            {fmtInt(wordCount(p.contentHtml))} words · {arr<string>(p.keywords).length} keyword{arr<string>(p.keywords).length === 1 ? "" : "s"}
                          </div>
                        </td>
                        <td>{text(p.category) || "—"}</td>
                        <td><Badge tone={statusTone(text(p.status))}>{text(p.status) || "—"}</Badge></td>
                        <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtInt(p.views)}</td>
                        <td style={{ whiteSpace: "nowrap" }}>{fmtDate(p.publishedAt ?? p.createdAt)}</td>
                        <td>
                          <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {text(p.status) !== "PUBLISHED" && (
                              <button type="button" className="ag-btn ag-btn-accent ag-btn-sm" disabled={busyId === p.id} onClick={() => void setStatus(p, "PUBLISHED")}>
                                {busyId === p.id ? "…" : "Publish"}
                              </button>
                            )}
                            {text(p.status) !== "ARCHIVED" && (
                              <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" disabled={busyId === p.id} onClick={() => void setStatus(p, "ARCHIVED")}>
                                Archive
                              </button>
                            )}
                            {text(p.status) !== "DRAFT" && (
                              <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" disabled={busyId === p.id} onClick={() => void setStatus(p, "DRAFT")}>
                                Unpublish
                              </button>
                            )}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableScroll>
            ) : (
              <div style={{ padding: "18px 20px" }}>
                <Empty>{library.loading ? "Loading the blog library…" : "No post matches this filter."}</Empty>
              </div>
            )}
            {totalPages > 1 && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "flex-end", padding: "10px 20px" }}>
                <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
                <span style={{ fontSize: 11, color: "var(--ag-ink-faint)" }}>Page {page} of {totalPages}</span>
                <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next →</button>
              </div>
            )}
          </Panel>
        </div>

        <div className="ag-stack">
          <Panel title="Library by status" sub="Every post, real counts">
            {byStatus.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {byStatus.map((s) => (
                  <div key={s.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                    <span style={{ color: "var(--ag-ink-soft)" }}>{s.label}</span>
                    <b>{s.value}</b>
                  </div>
                ))}
              </div>
            ) : (
              <Empty>{library.loading ? "Loading…" : "No posts yet."}</Empty>
            )}
          </Panel>

          <InsightsPanel
            title="Library insights"
            rows={
              posts.length === 0
                ? []
                : [
                    {
                      icon: <Svg path={Icons.filter} size={15} />,
                      label: "Filter tip",
                      value: `${categories.length} categor${categories.length === 1 ? "y" : "ies"} in the library — narrow by category and status together to find stale drafts fast.`,
                    },
                    {
                      icon: <Svg path={Icons.eye} size={15} />,
                      label: "Average views per post",
                      value: posts.length ? fmtInt(Math.round(totalViews / posts.length)) : "—",
                    },
                    {
                      icon: <Svg path={Icons.wand} size={15} />,
                      label: "Status changes here are real",
                      value: "Publish / Archive / Unpublish write directly to the live BlogPost table via the same endpoint the admin panel itself uses.",
                    },
                  ]
            }
          />
        </div>
      </div>
    </>
  );
}
