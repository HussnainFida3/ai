"use client";

/**
 * Content Agent — Overview.
 *
 * Every figure on this page is derived from the platform's real blog
 * library (`useContentSnapshot`). Where a platform genuinely does not track
 * something — GhrFix has no per-post view counter — the tile says so rather
 * than showing a zero that would read as "no reach".
 */

import { usePlatformParam, useContentSnapshot, platformLabel } from "@/lib/agent-data";
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
  ScoreRing,
  SERIES,
  StatCard,
  TrendChart,
  TONE,
} from "@/components/content-special/kit";

const STATUS_COLOR: Record<string, string> = { Published: "#0f9e69", Draft: "#c9860f", Other: "#69738c" };

export default function ContentOverviewPage({ params }: { params: Promise<{ platform: string }> }) {
  const platform = usePlatformParam(params);
  const c = useContentSnapshot(platform);
  const label = platformLabel(platform);

  const total = c.posts.length;
  const optimisedPct = total > 0 ? Math.round((c.fullyOptimised / total) * 100) : 0;

  /* Metadata completeness, counted field by field across the real library. */
  const completeness = [
    { label: "Meta title", value: c.posts.filter((p) => p.hasMetaTitle).length },
    { label: "Meta description", value: c.posts.filter((p) => p.hasMetaDescription).length },
    { label: "Keywords", value: c.posts.filter((p) => p.hasKeywords).length },
    { label: "Cover image", value: c.posts.filter((p) => p.hasCover).length },
  ];

  const statusSlices = c.byStatus.map((s) => ({ ...s, color: STATUS_COLOR[s.label] ?? "#69738c" }));

  const recent = [...c.posts]
    .sort((a, b) => (b.publishedAt ?? b.createdAt ?? "").localeCompare(a.publishedAt ?? a.createdAt ?? ""))
    .slice(0, 6);

  const publishedThisPeriod = c.monthly.published.at(-1) ?? 0;
  const publishedPrev = c.monthly.published.at(-2) ?? 0;
  const delta = publishedPrev > 0 ? Math.round(((publishedThisPeriod - publishedPrev) / publishedPrev) * 100) : null;

  return (
    <ContentShell
      platform={platform}
      title="Content Agent"
      subtitle="Library health, publishing cadence and what needs writing next"
      actions={<button type="button" className="cs-btn"><Icon name="download" size={15} />Export</button>}
    >
      {c.error && <ErrorNote error={c.error} platform={platform} />}

      <div className="cs-stats">
        <StatCard
          label="Total Posts"
          value={c.loading ? "—" : total.toLocaleString()}
          sub={`${c.byCategory.length} categories`}
          tone="purple"
          icon="posts"
        />
        <StatCard
          label="Published"
          value={c.loading ? "—" : c.published.length.toLocaleString()}
          sub={
            delta === null ? "Live on the site" : (
              <>
                <span className={delta >= 0 ? "up" : "down"}>{delta >= 0 ? "↑" : "↓"} {Math.abs(delta)}%</span> vs last month
              </>
            )
          }
          tone="green"
          icon="check"
          spark={c.monthly.published}
        />
        <StatCard
          label="Drafts Waiting"
          value={c.loading ? "—" : c.drafts.length.toLocaleString()}
          sub={c.drafts.length > 0 ? "Unpublished — needs review" : "Nothing queued"}
          tone="amber"
          icon="edit"
        />
        <StatCard
          label="Fully Optimised"
          value={c.loading ? "—" : `${optimisedPct}%`}
          sub={`${c.fullyOptimised} of ${total} have full metadata`}
          tone="blue"
          icon="target"
        />
        <StatCard
          label="Total Views"
          value={c.loading ? "—" : c.totalViews === null ? "Not tracked" : c.totalViews.toLocaleString()}
          sub={c.totalViews === null ? `${label} has no per-post view counter` : "Across the whole library"}
          tone="cyan"
          icon="eye"
        />
      </div>

      <div className="cs-row-2">
        <Card
          title="Publishing Trend"
          action={<span style={{ fontSize: 11, color: "#69738c" }}>Last 8 months</span>}
        >
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

        <Card title="Library Status">
          <div className="cs-donut-row">
            <Donut data={statusSlices} center={c.loading ? "—" : total.toLocaleString()} centerLabel="Posts" />
            <Legend data={statusSlices} />
          </div>
        </Card>
      </div>

      <div className="cs-row-3">
        <Card title="Posts by Category">
          {c.loading ? <Empty>Loading…</Empty> : <BarRows rows={c.byCategory} />}
        </Card>

        <Card title="SEO Metadata Completeness">
          {c.loading ? (
            <Empty>Loading…</Empty>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                <ScoreRing value={optimisedPct} max={100} label="% complete" color={optimisedPct >= 70 ? "#0f9e69" : optimisedPct >= 40 ? "#c9860f" : "#e04452"} />
              </div>
              <BarRows rows={completeness.map((r) => ({ ...r, color: SERIES[1] }))} colored={false} />
            </>
          )}
        </Card>

        <Card title="Agent Insights">
          <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
            {c.loading ? (
              <Empty>Loading…</Empty>
            ) : (
              buildInsights(c, label).map((i) => (
                <div key={i.text} style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
                  <span
                    style={{
                      width: 29, height: 29, borderRadius: 9, flex: "0 0 auto", display: "grid", placeItems: "center",
                      background: TONE[i.tone].bg, color: TONE[i.tone].fg,
                    }}
                  >
                    <Icon name={i.icon} size={15} />
                  </span>
                  <p style={{ margin: 0, fontSize: 11.5, lineHeight: "19px", color: "#4c5470" }}>{i.text}</p>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <Card title="Recently Touched" action={<span style={{ fontSize: 11, color: "#69738c" }}>{recent.length} of {total}</span>} pad={false}>
        <div className="cs-table-wrap">
          <table className="cs-table">
            <thead>
              <tr>
                <th style={{ paddingLeft: 19 }}>Post</th>
                <th>Category</th>
                <th>Status</th>
                <th>Metadata</th>
                <th className="cs-num" style={{ paddingRight: 19 }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {c.loading && <tr><td colSpan={5} style={{ padding: 19 }}><Empty>Loading live library…</Empty></td></tr>}
              {!c.loading && recent.length === 0 && (
                <tr><td colSpan={5} style={{ padding: 19 }}><Empty>No posts yet — use Chat to have the agent draft the first one.</Empty></td></tr>
              )}
              {recent.map((p) => {
                const done = [p.hasMetaTitle, p.hasMetaDescription, p.hasKeywords, p.hasCover].filter(Boolean).length;
                return (
                  <tr key={p.id}>
                    <td style={{ paddingLeft: 19 }}>
                      <div className="title">{p.title}</div>
                      {p.slug && <div className="sub">/{p.slug}</div>}
                    </td>
                    <td style={{ color: "#4c5470" }}>{p.category}</td>
                    <td><Pill tone={p.status === "PUBLISHED" ? "green" : p.status === "DRAFT" ? "amber" : "purple"}>{p.status === "OTHER" ? "Other" : p.status[0] + p.status.slice(1).toLowerCase()}</Pill></td>
                    <td><Pill tone={done === 4 ? "green" : done >= 2 ? "amber" : "red"}>{done}/4 fields</Pill></td>
                    <td className="cs-num" style={{ paddingRight: 19, color: "#69738c" }}>
                      {(p.publishedAt ?? p.createdAt) ? new Date((p.publishedAt ?? p.createdAt) as string).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </ContentShell>
  );
}

/** Insights are statements about the real library, not canned copy. */
function buildInsights(c: ReturnType<typeof useContentSnapshot>, label: string) {
  const out: Array<{ icon: string; tone: keyof typeof TONE; text: string }> = [];
  const total = c.posts.length;

  if (total === 0) {
    return [{ icon: "alert" as const, tone: "amber" as const, text: `No posts found in the ${label} library yet.` }];
  }
  if (c.drafts.length > 0) {
    out.push({ icon: "edit", tone: "amber", text: `${c.drafts.length} draft${c.drafts.length === 1 ? "" : "s"} ${c.drafts.length === 1 ? "is" : "are"} written but not published.` });
  }
  const noMeta = c.posts.filter((p) => !p.hasMetaDescription).length;
  if (noMeta > 0) {
    out.push({ icon: "alert", tone: "red", text: `${noMeta} post${noMeta === 1 ? "" : "s"} ${noMeta === 1 ? "is" : "are"} missing a meta description — the single most common gap.` });
  }
  const noCover = c.posts.filter((p) => !p.hasCover).length;
  if (noCover > 0) {
    out.push({ icon: "posts", tone: "blue", text: `${noCover} post${noCover === 1 ? "" : "s"} ${noCover === 1 ? "has" : "have"} no cover image, which weakens social sharing.` });
  }
  if (c.byCategory.length > 0) {
    const top = c.byCategory[0];
    out.push({ icon: "tag", tone: "purple", text: `“${top.label}” is your biggest category at ${top.value} post${top.value === 1 ? "" : "s"}.` });
  }
  if (c.fullyOptimised === total && total > 0) {
    out.push({ icon: "check", tone: "green", text: "Every post has complete metadata. Nothing to fix." });
  }
  return out.slice(0, 4);
}
