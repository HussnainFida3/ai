"use client";

/**
 * Content Agent — Engagement.
 *
 * Only one of the two backends records per-post views: ShadiLife returns a
 * `views` column, GhrFix has no view counter at all (`views` and
 * `ContentSnapshot.totalViews` are both null there). Rather than paper over
 * that with zeros — which would read as "nobody visited" instead of "nobody
 * measured" — this page says plainly which mode it is in and, when views are
 * absent, falls back to signals the library really does carry: reading time,
 * word count, publishing cadence, category spread and metadata completeness
 * as a proxy for discoverability.
 */

import { useMemo } from "react";
import { usePlatformParam, useContentSnapshot, platformLabel } from "@/lib/agent-data";
import type { ContentPost } from "@/lib/agent-data";
import {
  BarRows,
  Card,
  ContentShell,
  Donut,
  Empty,
  ErrorNote,
  Icon,
  Legend,
  Pill,
  SERIES,
  StatCard,
  TrendChart,
} from "@/components/content-special/kit";

export default function ContentEngagementPage({ params }: { params: Promise<{ platform: string }> }) {
  const platform = usePlatformParam(params);
  const c = useContentSnapshot(platform);
  const label = platformLabel(platform);

  const tracksViews = c.totalViews !== null;
  const total = c.posts.length;

  const viewed = useMemo(() => c.posts.filter((p) => p.views !== null), [c.posts]);

  const avgViews = viewed.length > 0 ? Math.round((c.totalViews ?? 0) / viewed.length) : 0;
  const medianViews = useMemo(() => median(viewed.map((p) => p.views ?? 0)), [viewed]);

  const topByViews = useMemo(
    () =>
      [...viewed]
        .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
        .slice(0, 8)
        .map((p) => ({ label: p.title, value: p.views ?? 0 })),
    [viewed],
  );

  /* Views by category — real sums, only over posts that actually carry views. */
  const viewsByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of viewed) map.set(p.category, (map.get(p.category) ?? 0) + (p.views ?? 0));
    return [...map.entries()]
      .map(([label2, value]) => ({ label: label2, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [viewed]);

  /* Fallback signals — every one of these is stored, none are modelled. */
  const withRead = c.posts.filter((p) => p.readMinutes !== null);
  const withWords = c.posts.filter((p) => p.words !== null);
  const avgRead = withRead.length > 0 ? Math.round(withRead.reduce((s, p) => s + (p.readMinutes ?? 0), 0) / withRead.length) : null;
  const avgWords = withWords.length > 0 ? Math.round(withWords.reduce((s, p) => s + (p.words ?? 0), 0) / withWords.length) : null;

  const longestRead = useMemo(
    () =>
      [...(withRead.length > 0 ? withRead : withWords)]
        .sort((a, b) => depth(b) - depth(a))
        .slice(0, 8)
        .map((p) => ({ label: p.title, value: depth(p) })),
    [withRead, withWords],
  );

  const discoverability = [
    { label: "Meta title", value: c.posts.filter((p) => p.hasMetaTitle).length },
    { label: "Meta description", value: c.posts.filter((p) => p.hasMetaDescription).length },
    { label: "Keywords", value: c.posts.filter((p) => p.hasKeywords).length },
    { label: "Cover image", value: c.posts.filter((p) => p.hasCover).length },
  ];

  const categorySlices = c.byCategory.map((s, i) => ({ ...s, color: SERIES[i % SERIES.length] }));
  const donutData = tracksViews && viewsByCategory.length > 0 ? viewsByCategory : categorySlices;
  const donutTitle = tracksViews && viewsByCategory.length > 0 ? "Views by Category" : "Library Spread by Category";

  return (
    <ContentShell
      platform={platform}
      title="Engagement"
      subtitle={
        tracksViews
          ? `Real per-post view data from the ${label} library`
          : `${label} records no per-post views — reach signals shown instead`
      }
      actions={<button type="button" className="cs-btn"><Icon name="download" size={15} />Export</button>}
    >
      {c.error && <ErrorNote error={c.error} platform={platform} />}

      {!c.loading && !tracksViews && (
        <div className="cs-error" style={{ borderColor: "#e6dcfa", background: "#faf8ff" }}>
          <span className="cs-error-icon" style={{ background: "#f2edff", color: "#7c3aed" }}>
            <Icon name="eye" size={15} />
          </span>
          <div>
            <b style={{ color: "#5b2ca8" }}>{label} does not record per-post views.</b>
            <span>
              The panels below use publishing reach signals the library genuinely stores — reading time, word
              count, publishing cadence, category spread and metadata completeness. No view numbers are
              estimated or filled in.
            </span>
          </div>
        </div>
      )}

      <div className="cs-stats">
        <StatCard
          label="Total Views"
          value={c.loading ? "—" : tracksViews ? (c.totalViews ?? 0).toLocaleString() : "Not tracked"}
          sub={tracksViews ? `Across ${viewed.length} measured posts` : `${label} has no view counter`}
          tone="cyan"
          icon="eye"
        />
        <StatCard
          label={tracksViews ? "Average Views" : "Average Read Time"}
          value={c.loading ? "—" : tracksViews ? avgViews.toLocaleString() : avgRead === null ? "Not stored" : `${avgRead} min`}
          sub={tracksViews ? "Mean per measured post" : avgRead === null ? "No stored read time" : "Mean across the library"}
          tone="purple"
          icon={tracksViews ? "trend" : "clock"}
        />
        <StatCard
          label={tracksViews ? "Median Views" : "Average Length"}
          value={c.loading ? "—" : tracksViews ? medianViews.toLocaleString() : avgWords === null ? "Not stored" : `${avgWords.toLocaleString()} words`}
          sub={tracksViews ? "Half the library sits below this" : avgWords === null ? "Backend returns no body HTML" : "Mean word count"}
          tone="blue"
          icon="posts"
        />
        <StatCard
          label="Published Reach"
          value={c.loading ? "—" : c.published.length.toLocaleString()}
          sub={`${total} in library, ${c.drafts.length} still draft`}
          tone="green"
          icon="check"
          spark={c.monthly.published}
        />
      </div>

      <div className="cs-row-2">
        <Card title="Publishing Cadence" action={<span style={{ fontSize: 11, color: "#69738c" }}>Last 8 months</span>}>
          {c.loading ? (
            <Empty>Loading live data…</Empty>
          ) : total === 0 ? (
            <Empty>No posts in the library yet.</Empty>
          ) : (
            <TrendChart
              labels={c.monthly.labels}
              series={[
                { name: "Created", data: c.monthly.created, color: SERIES[0] },
                { name: "Published", data: c.monthly.published, color: SERIES[2] },
              ]}
            />
          )}
        </Card>

        <Card title={donutTitle}>
          {c.loading ? (
            <Empty>Loading…</Empty>
          ) : donutData.length === 0 ? (
            <Empty>No categories in the library yet.</Empty>
          ) : (
            <div className="cs-donut-row">
              <Donut
                data={donutData}
                center={donutData.reduce((s, d) => s + d.value, 0).toLocaleString()}
                centerLabel={tracksViews && viewsByCategory.length > 0 ? "Views" : "Posts"}
              />
              <Legend data={donutData} />
            </div>
          )}
        </Card>
      </div>

      <div className="cs-row-half">
        <Card
          title={tracksViews ? "Top Posts by Views" : "Deepest Posts by Reading Depth"}
          action={
            <Pill tone={tracksViews ? "green" : "purple"}>
              <Icon name={tracksViews ? "check" : "alert"} size={12} />
              {tracksViews ? "Measured" : "Proxy signal"}
            </Pill>
          }
        >
          {c.loading ? (
            <Empty>Loading…</Empty>
          ) : tracksViews ? (
            topByViews.length === 0 ? <Empty>No posts carry a view count yet.</Empty> : <BarRows rows={topByViews} suffix=" views" />
          ) : longestRead.length === 0 ? (
            <Empty>Neither reading time nor word count is exposed for this library.</Empty>
          ) : (
            <BarRows rows={longestRead} suffix={withRead.length > 0 ? " min" : " words"} />
          )}
        </Card>

        <Card
          title="Discoverability Signals"
          action={<span style={{ fontSize: 11, color: "#69738c" }}>of {total} posts</span>}
        >
          {c.loading ? (
            <Empty>Loading…</Empty>
          ) : total === 0 ? (
            <Empty>No posts to measure.</Empty>
          ) : (
            <>
              <p style={{ margin: "0 0 12px", fontSize: 11.5, lineHeight: "19px", color: "#4c5470" }}>
                Metadata completeness is the closest honest stand-in for how findable a post is — it is what
                search and social actually read.
              </p>
              <BarRows rows={discoverability.map((r) => ({ ...r, color: SERIES[1] }))} colored={false} />
            </>
          )}
        </Card>
      </div>

      <Card
        title={tracksViews ? "Engagement by Post" : "Reach Signals by Post"}
        action={<span style={{ fontSize: 11, color: "#69738c" }}>{Math.min(12, total)} of {total}</span>}
        pad={false}
      >
        <div className="cs-table-wrap">
          <table className="cs-table">
            <thead>
              <tr>
                <th style={{ paddingLeft: 19 }}>Post</th>
                <th>Category</th>
                <th>Status</th>
                <th className="cs-num">{tracksViews ? "Views" : "Read time"}</th>
                <th className="cs-num">Words</th>
                <th className="cs-num" style={{ paddingRight: 19 }}>Published</th>
              </tr>
            </thead>
            <tbody>
              {c.loading && <tr><td colSpan={6} style={{ padding: 19 }}><Empty>Loading live library…</Empty></td></tr>}
              {!c.loading && total === 0 && (
                <tr><td colSpan={6} style={{ padding: 19 }}><Empty>No posts in the library yet.</Empty></td></tr>
              )}
              {tableRows(c.posts, tracksViews).map((p) => (
                <tr key={p.id}>
                  <td style={{ paddingLeft: 19, maxWidth: 340 }}>
                    <div className="title">{p.title}</div>
                    {p.slug && <div className="sub">/{p.slug}</div>}
                  </td>
                  <td style={{ color: "#4c5470", whiteSpace: "nowrap" }}>{p.category}</td>
                  <td>
                    <Pill tone={p.status === "PUBLISHED" ? "green" : p.status === "DRAFT" ? "amber" : "purple"}>
                      <Icon name={p.status === "PUBLISHED" ? "check" : "edit"} size={12} />
                      {p.status === "OTHER" ? "Other" : p.status[0] + p.status.slice(1).toLowerCase()}
                    </Pill>
                  </td>
                  <td className="cs-num" style={{ color: "#4c5470" }}>
                    {tracksViews ? (p.views?.toLocaleString() ?? "—") : p.readMinutes !== null ? `${p.readMinutes} min` : "—"}
                  </td>
                  <td className="cs-num" style={{ color: "#4c5470" }}>{p.words?.toLocaleString() ?? "—"}</td>
                  <td className="cs-num" style={{ paddingRight: 19, color: "#69738c", whiteSpace: "nowrap" }}>
                    {p.publishedAt ? new Date(p.publishedAt).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </ContentShell>
  );
}

/** Reading depth: stored read time where the platform keeps one, else word count. */
function depth(p: ContentPost): number {
  return p.readMinutes ?? p.words ?? 0;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? Math.round((s[mid - 1] + s[mid]) / 2) : s[mid];
}

/** Ranked by whichever signal the platform actually has. */
function tableRows(posts: ContentPost[], tracksViews: boolean): ContentPost[] {
  return [...posts]
    .sort((a, b) => (tracksViews ? (b.views ?? 0) - (a.views ?? 0) : depth(b) - depth(a)))
    .slice(0, 12);
}
