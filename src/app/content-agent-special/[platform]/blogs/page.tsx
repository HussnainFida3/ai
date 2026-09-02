"use client";

/**
 * Content Agent — Blogs.
 *
 * The full real library, filterable by status and category and searchable
 * across title, slug and category. Every row shows which SEO fields are
 * actually populated, because that is what the recommendations page acts on.
 */

import { useMemo, useState } from "react";
import { usePlatformParam, useContentSnapshot, platformLabel } from "@/lib/agent-data";
import {
  Card,
  ContentShell,
  Empty,
  ErrorNote,
  Icon,
  Pill,
  StatCard,
} from "@/components/content-special/kit";

const TABS = ["All", "Published", "Drafts"] as const;
const PAGE_SIZE = 12;

export default function ContentBlogsPage({ params }: { params: Promise<{ platform: string }> }) {
  const platform = usePlatformParam(params);
  const c = useContentSnapshot(platform);
  const label = platformLabel(platform);

  const [tab, setTab] = useState<(typeof TABS)[number]>("All");
  const [category, setCategory] = useState("All categories");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const categories = useMemo(() => ["All categories", ...c.byCategory.map((x) => x.label)], [c.byCategory]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return c.posts.filter((p) => {
      if (tab === "Published" && p.status !== "PUBLISHED") return false;
      if (tab === "Drafts" && p.status !== "DRAFT") return false;
      if (category !== "All categories" && p.category !== category) return false;
      if (q && !`${p.title} ${p.slug} ${p.category}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [c.posts, tab, category, search]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const visible = rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  function reset<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setPage(1);
    };
  }

  return (
    <ContentShell
      platform={platform}
      title="Blogs"
      subtitle={`Every post in the ${label} library, with its real SEO metadata`}
      actions={<button type="button" className="cs-btn cs-btn-primary"><Icon name="edit" size={15} />Draft a post</button>}
    >
      {c.error && <ErrorNote error={c.error} platform={platform} />}

      <div className="cs-stats">
        <StatCard label="In Library" value={c.loading ? "—" : c.posts.length.toLocaleString()} sub="All statuses" tone="purple" icon="posts" />
        <StatCard label="Published" value={c.loading ? "—" : c.published.length.toLocaleString()} sub="Live on the site" tone="green" icon="check" />
        <StatCard label="Drafts" value={c.loading ? "—" : c.drafts.length.toLocaleString()} sub="Not yet visible" tone="amber" icon="edit" />
        <StatCard label="Matching Filters" value={c.loading ? "—" : rows.length.toLocaleString()} sub={`Showing ${visible.length} on this page`} tone="blue" icon="search" />
      </div>

      <Card pad={false}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 19px 0", flexWrap: "wrap" }}>
          <div className="cs-tabs" style={{ border: 0, flex: 1, minWidth: 220 }}>
            {TABS.map((t) => (
              <button key={t} type="button" className={tab === t ? "cs-tab active" : "cs-tab"} onClick={() => reset(setTab)(t)}>
                {t}
              </button>
            ))}
          </div>

          <select
            className="cs-btn"
            value={category}
            onChange={(e) => reset(setCategory)(e.target.value)}
            style={{ paddingRight: 10 }}
            aria-label="Filter by category"
          >
            {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
          </select>

          <label className="cs-search">
            <Icon name="search" size={15} />
            <input
              value={search}
              onChange={(e) => reset(setSearch)(e.target.value)}
              placeholder="Search posts…"
              aria-label="Search posts"
            />
          </label>
        </div>

        <div className="cs-table-wrap" style={{ marginTop: 12 }}>
          <table className="cs-table">
            <thead>
              <tr>
                <th style={{ paddingLeft: 19 }}>Post</th>
                <th>Category</th>
                <th>Status</th>
                <th>Meta title</th>
                <th>Meta desc.</th>
                <th>Keywords</th>
                <th>Cover</th>
                <th className="cs-num">{c.totalViews === null ? "Words" : "Views"}</th>
                <th className="cs-num" style={{ paddingRight: 19 }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {c.loading && <tr><td colSpan={9} style={{ padding: 19 }}><Empty>Loading live library…</Empty></td></tr>}
              {!c.loading && visible.length === 0 && (
                <tr><td colSpan={9} style={{ padding: 19 }}><Empty>No posts match these filters.</Empty></td></tr>
              )}
              {visible.map((p) => (
                <tr key={p.id}>
                  <td style={{ paddingLeft: 19, maxWidth: 320 }}>
                    <div className="title">{p.title}</div>
                    {p.slug && <div className="sub">/{p.slug}</div>}
                  </td>
                  <td style={{ color: "#4c5470", whiteSpace: "nowrap" }}>{p.category}</td>
                  <td><Pill tone={p.status === "PUBLISHED" ? "green" : p.status === "DRAFT" ? "amber" : "purple"}>{p.status === "OTHER" ? "Other" : p.status[0] + p.status.slice(1).toLowerCase()}</Pill></td>
                  <td><FieldMark ok={p.hasMetaTitle} /></td>
                  <td><FieldMark ok={p.hasMetaDescription} /></td>
                  <td><FieldMark ok={p.hasKeywords} /></td>
                  <td><FieldMark ok={p.hasCover} /></td>
                  <td className="cs-num" style={{ color: "#4c5470" }}>
                    {c.totalViews === null ? (p.words?.toLocaleString() ?? "—") : (p.views?.toLocaleString() ?? "—")}
                  </td>
                  <td className="cs-num" style={{ paddingRight: 19, color: "#69738c", whiteSpace: "nowrap" }}>
                    {(p.publishedAt ?? p.createdAt) ? new Date((p.publishedAt ?? p.createdAt) as string).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {rows.length > PAGE_SIZE && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 19px", borderTop: "1px solid #eef0f5", fontSize: 11.5, color: "#4c5470", flexWrap: "wrap" }}>
            <span>
              Showing {(current - 1) * PAGE_SIZE + 1}–{Math.min(current * PAGE_SIZE, rows.length)} of {rows.length}
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <button type="button" className="cs-btn" onClick={() => setPage(Math.max(1, current - 1))} disabled={current === 1}>
                Previous
              </button>
              <span style={{ display: "grid", placeItems: "center", padding: "0 10px", fontWeight: 650 }}>
                {current} / {totalPages}
              </span>
              <button type="button" className="cs-btn" onClick={() => setPage(Math.min(totalPages, current + 1))} disabled={current === totalPages}>
                Next
              </button>
            </div>
          </div>
        )}
      </Card>
    </ContentShell>
  );
}

/** A populated/missing marker that is never color-alone — it carries a glyph and a label. */
function FieldMark({ ok }: { ok: boolean }) {
  return ok ? (
    <Pill tone="green"><Icon name="check" size={12} />Set</Pill>
  ) : (
    <Pill tone="red"><Icon name="alert" size={12} />Missing</Pill>
  );
}
