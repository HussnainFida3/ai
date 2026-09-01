"use client";

/**
 * GhrFix — Content Agent → Library.
 *
 * The real, fully-paginated post library — `GET /posts` with a genuine
 * `status` + `page`/`pageSize` server round trip, not the Dashboard's
 * client-side slice of a capped 100-row fetch. Publish/unpublish here are the
 * same real writes the Dashboard used to expose; the per-status totals come
 * from three cheap `pageSize:1` calls so the counts are exact even though the
 * table itself never has to load more than one page at a time.
 */

import { useState } from "react";
import Link from "next/link";
import { InsightsPanel, MetricCard, Svg } from "@/components/agents/rich";
import { Icons } from "@/components/agents/icons";
import { ApiError, type Paginated } from "@/lib/api";
import type { AgentViewProps } from "../../registry";
import { Empty, ErrorNote, Panel, Pill, TableWrap, dateTime, shortDate, useLoad } from "../../ghrfix/_kit-core";

interface Post {
  id: string;
  title: string;
  slug: string;
  category: string;
  seoTitle: string | null;
  seoDescription: string | null;
  readMinutes: number;
  status: "DRAFT" | "PUBLISHED";
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

type Filter = "ALL" | "PUBLISHED" | "DRAFT";
const FILTERS: Filter[] = ["ALL", "PUBLISHED", "DRAFT"];
const PAGE_SIZE = 12;

export default function ContentLibraryView({ platform, agent, api }: AgentViewProps) {
  const [filter, setFilter] = useState<Filter>("ALL");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const totalsLoad = useLoad(async () => {
    const [all, pub, draft] = await Promise.allSettled([
      api.get<Post[], Paginated>("/posts", { pageSize: 1 }),
      api.get<Post[], Paginated>("/posts", { status: "PUBLISHED", pageSize: 1 }),
      api.get<Post[], Paginated>("/posts", { status: "DRAFT", pageSize: 1 }),
    ]);
    return {
      all: all.status === "fulfilled" ? all.value.meta?.total ?? 0 : 0,
      published: pub.status === "fulfilled" ? pub.value.meta?.total ?? 0 : 0,
      draft: draft.status === "fulfilled" ? draft.value.meta?.total ?? 0 : 0,
    };
  }, [platform.key]);

  const listLoad = useLoad(async () => {
    const { data, meta } = await api.get<Post[], Paginated>("/posts", {
      status: filter === "ALL" ? undefined : filter,
      page,
      pageSize: PAGE_SIZE,
    });
    return { items: data, meta };
  }, [platform.key, filter, page]);

  const t = totalsLoad.data;
  const avgReadOnPage = listLoad.data && listLoad.data.items.length > 0
    ? Math.round((listLoad.data.items.reduce((a, p) => a + (p.readMinutes || 0), 0) / listLoad.data.items.length) * 10) / 10
    : null;

  async function setStatus(id: string, verb: "publish" | "unpublish") {
    setBusyId(id);
    setMsg(null);
    setErr(null);
    try {
      await api.post(`/posts/${id}/${verb}`, {});
      setMsg(verb === "publish" ? "Post published — it is live on the GhrFix blog now." : "Post moved back to draft.");
      listLoad.reload();
      totalsLoad.reload();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : `Could not ${verb} that post.`);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      {listLoad.error && <ErrorNote error={listLoad.error} hint={`The Content Agent reads ${platform.apiBase}${agent.base}/posts. Connect ${platform.label} first if this persists.`} />}

      <div className="ag-metrics">
        <MetricCard icon={<Svg path={Icons.content} size={24} />} tone="blue" title="Posts in library" value={totalsLoad.loading ? "—" : t?.all.toLocaleString() ?? "—"} />
        <MetricCard icon={<Svg path={Icons.eye} size={24} />} tone="green" title="Published" value={totalsLoad.loading ? "—" : t?.published.toLocaleString() ?? "—"} />
        <MetricCard icon={<Svg path={Icons.posts} size={24} />} tone="gold" title="Drafts waiting" value={totalsLoad.loading ? "—" : t?.draft.toLocaleString() ?? "—"} />
        <MetricCard icon={<Svg path={Icons.clock} size={24} />} tone="purple" title="Avg read (this page)" value={avgReadOnPage === null ? "—" : `${avgReadOnPage} min`} />
      </div>

      <div className="ag-stack">
          <Panel
            title="Content library"
            sub={listLoad.data?.meta ? `${listLoad.data.meta.total.toLocaleString()} post${listLoad.data.meta.total === 1 ? "" : "s"} — page ${listLoad.data.meta.page} of ${Math.max(1, listLoad.data.meta.totalPages)}` : "Every post, real server-side pagination"}
            noBody
            actions={
              <div className="ag-tabs">
                {FILTERS.map((f) => (
                  <button key={f} type="button" className={`ag-tab ${filter === f ? "active" : ""}`} onClick={() => { setFilter(f); setPage(1); }}>
                    {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
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
                    <th>Title</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Read</th>
                    <th>SEO</th>
                    <th>Published</th>
                    <th>Updated</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(listLoad.data?.items ?? []).map((p) => {
                    const seoOk = Boolean(p.seoTitle) && Boolean(p.seoDescription);
                    return (
                      <tr key={p.id}>
                        <td style={{ minWidth: 200 }}>
                          <b style={{ display: "block", fontWeight: 650 }}>{p.title}</b>
                          <span style={{ fontSize: 10.5, color: "var(--ag-ink-faint)" }}>/{p.slug}</span>
                        </td>
                        <td>{p.category}</td>
                        <td><Pill text={p.status} tone={p.status === "PUBLISHED" ? "green" : "amber"} /></td>
                        <td style={{ whiteSpace: "nowrap" }}>{p.readMinutes} min</td>
                        <td><Pill text={seoOk ? "Complete" : p.seoTitle || p.seoDescription ? "Partial" : "Missing"} tone={seoOk ? "green" : p.seoTitle || p.seoDescription ? "amber" : "red"} /></td>
                        <td style={{ whiteSpace: "nowrap", color: "var(--ag-ink-faint)" }}>{p.publishedAt ? shortDate(p.publishedAt) : "—"}</td>
                        <td style={{ whiteSpace: "nowrap", color: "var(--ag-ink-faint)" }}>{dateTime(p.updatedAt)}</td>
                        <td>
                          <button
                            type="button"
                            className={`ag-btn ag-btn-sm ${p.status === "PUBLISHED" ? "ag-btn-ghost" : "ag-btn-accent"}`}
                            disabled={busyId === p.id}
                            onClick={() => setStatus(p.id, p.status === "PUBLISHED" ? "unpublish" : "publish")}
                          >
                            {busyId === p.id ? "Working…" : p.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {(!listLoad.data || listLoad.data.items.length === 0) && (
                    <tr>
                      <td colSpan={8}>
                        <Empty>{listLoad.loading ? "Loading posts…" : filter === "ALL" ? "The blog library is empty." : `No ${filter.toLowerCase()} posts.`}</Empty>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </TableWrap>
            {listLoad.data?.meta && listLoad.data.meta.total > 0 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderTop: "1px solid var(--ag-border-soft)" }}>
                <span style={{ fontSize: 11, color: "var(--ag-ink-faint)" }}>
                  Page {listLoad.data.meta.page} of {Math.max(1, listLoad.data.meta.totalPages)} · {listLoad.data.meta.total.toLocaleString()} total
                </span>
                <div style={{ display: "flex", gap: 6 }}>
                  <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
                  <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" disabled={page >= listLoad.data.meta.totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
                </div>
              </div>
            )}
          </Panel>

          <InsightsPanel
            rows={[
              {
                icon: <Svg path={Icons.eye} size={15} />,
                label: "Publish rate",
                value: t && t.all > 0 ? `${Math.round((t.published / t.all) * 1000) / 10}% of ${t.all} post${t.all === 1 ? "" : "s"} are live.` : "No posts in the library yet.",
              },
              {
                icon: <Svg path={Icons.posts} size={15} />,
                label: "Draft backlog",
                value: t ? `${t.draft} draft${t.draft === 1 ? "" : "s"} waiting for review.` : "—",
              },
              {
                icon: <Svg path={Icons.wand} size={15} />,
                label: "Need a new draft?",
                value: (
                  <>
                    Use the drafting tool on the{" "}
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
