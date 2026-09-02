"use client";

/**
 * Content Agent — AI Recommendations.
 *
 * Nothing on this page is canned advice. Every recommendation is a rule run
 * over the platform's real blog library (`useContentSnapshot`): a rule only
 * appears when it actually matches posts, and it names those posts. Rules
 * that depend on a field a platform genuinely does not expose — `words` is
 * null when the backend returns no body HTML — are skipped for those posts
 * rather than guessed at.
 */

import { useMemo, useState } from "react";
import { usePlatformParam, useContentSnapshot, platformLabel } from "@/lib/agent-data";
import type { ContentPost } from "@/lib/agent-data";
import {
  Card,
  ContentShell,
  Donut,
  Empty,
  ErrorNote,
  Icon,
  Legend,
  Pill,
  StatCard,
} from "@/components/content-special/kit";

type Priority = "High" | "Medium" | "Low";

interface Recommendation {
  id: string;
  title: string;
  why: string;
  priority: Priority;
  icon: string;
  /** Titles of the posts this recommendation applies to. */
  affected: string[];
}

const PRIORITY_TONE: Record<Priority, string> = { High: "red", Medium: "amber", Low: "blue" };
const PRIORITY_COLOR: Record<Priority, string> = { High: "#e04452", Medium: "#c9860f", Low: "#3b7fd1" };
const PRIORITY_ICON: Record<Priority, string> = { High: "alert", Medium: "clock", Low: "check" };
const PRIORITY_ORDER: Priority[] = ["High", "Medium", "Low"];

const THIN_WORDS = 400;
const STALE_DRAFT_DAYS = 14;

/** How many affected titles to show inline before collapsing into "+N more". */
const PREVIEW = 5;

export default function ContentRecommendationsPage({ params }: { params: Promise<{ platform: string }> }) {
  const platform = usePlatformParam(params);
  const c = useContentSnapshot(platform);
  const label = platformLabel(platform);

  const [open, setOpen] = useState<string | null>(null);

  const recs = useMemo(() => buildRecommendations(c.posts), [c.posts]);

  const total = c.posts.length;
  const highCount = recs.filter((r) => r.priority === "High").length;

  /* A post is "affected" once, however many rules it trips. */
  const affectedTitles = useMemo(() => new Set(recs.flatMap((r) => r.affected)), [recs]);
  const healthyPct = total > 0 ? Math.round(((total - affectedTitles.size) / total) * 100) : 0;

  const byPriority = PRIORITY_ORDER.map((p) => ({
    label: p,
    value: recs.filter((r) => r.priority === p).length,
    color: PRIORITY_COLOR[p],
  })).filter((s) => s.value > 0);

  return (
    <ContentShell
      platform={platform}
      title="AI Recommendations"
      subtitle={`Prioritised fixes derived from the live ${label} library`}
      actions={<button type="button" className="cs-btn"><Icon name="download" size={15} />Export</button>}
    >
      {c.error && <ErrorNote error={c.error} platform={platform} />}

      <div className="cs-stats">
        <StatCard
          label="Recommendations"
          value={c.loading ? "—" : recs.length.toLocaleString()}
          sub={recs.length === 0 ? "Nothing outstanding" : "Rules matching real posts"}
          tone="purple"
          icon="sparkle"
        />
        <StatCard
          label="High Priority"
          value={c.loading ? "—" : highCount.toLocaleString()}
          sub={highCount > 0 ? "Fix these first" : "None outstanding"}
          tone="red"
          icon="alert"
        />
        <StatCard
          label="Posts Affected"
          value={c.loading ? "—" : affectedTitles.size.toLocaleString()}
          sub={`Out of ${total} in the library`}
          tone="amber"
          icon="posts"
        />
        <StatCard
          label="Library Healthy"
          value={c.loading ? "—" : `${healthyPct}%`}
          sub="Posts tripping no rule at all"
          tone="green"
          icon="check"
        />
      </div>

      <div className="cs-row-2">
        <Card
          title="Prioritised Fixes"
          action={<span style={{ fontSize: 11, color: "#69738c" }}>{recs.length} open</span>}
        >
          {c.loading ? (
            <Empty>Loading live library…</Empty>
          ) : c.error ? (
            /* An unreachable library is not an empty library — say so, rather
               than reporting "nothing to recommend" as if the check had run. */
            <Empty>
              The library could not be read, so no recommendations can be produced. This is not a clean bill of health.
            </Empty>
          ) : total === 0 ? (
            <Empty>No posts in the library yet — there is nothing to recommend against.</Empty>
          ) : recs.length === 0 ? (
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "6px 0" }}>
              <span style={{ width: 32, height: 32, borderRadius: 10, flex: "0 0 auto", display: "grid", placeItems: "center", background: "#e9faf3", color: "#0f9e69" }}>
                <Icon name="check" size={17} />
              </span>
              <p style={{ margin: 0, fontSize: 12.5, lineHeight: "20px", color: "#4c5470" }}>
                <b>Nothing to fix.</b> All {total} post{total === 1 ? "" : "s"} in the {label} library have full
                metadata, cover images, no stale drafts and no thin content. This is a genuine clean bill of
                health, not an empty list.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {recs.map((r) => (
                <RecRow key={r.id} rec={r} open={open === r.id} onToggle={() => setOpen(open === r.id ? null : r.id)} />
              ))}
            </div>
          )}
        </Card>

        <Card title="By Priority">
          {c.loading ? (
            <Empty>Loading…</Empty>
          ) : byPriority.length === 0 ? (
            <Empty>No open recommendations to break down.</Empty>
          ) : (
            <div className="cs-donut-row">
              <Donut data={byPriority} center={recs.length.toLocaleString()} centerLabel="Fixes" />
              <Legend data={byPriority} />
            </div>
          )}
        </Card>
      </div>

      <Card title="All Recommendations" pad={false}>
        <div className="cs-table-wrap">
          <table className="cs-table">
            <thead>
              <tr>
                <th style={{ paddingLeft: 19 }}>Recommendation</th>
                <th>Priority</th>
                <th className="cs-num" style={{ paddingRight: 19 }}>Posts affected</th>
              </tr>
            </thead>
            <tbody>
              {c.loading && <tr><td colSpan={3} style={{ padding: 19 }}><Empty>Loading live library…</Empty></td></tr>}
              {!c.loading && recs.length === 0 && (
                <tr><td colSpan={3} style={{ padding: 19 }}><Empty>No open recommendations.</Empty></td></tr>
              )}
              {recs.map((r) => (
                <tr key={r.id}>
                  <td style={{ paddingLeft: 19, maxWidth: 460 }}>
                    <div className="title">{r.title}</div>
                    <div className="sub">{r.why}</div>
                  </td>
                  <td>
                    <Pill tone={PRIORITY_TONE[r.priority]}>
                      <Icon name={PRIORITY_ICON[r.priority]} size={12} />
                      {r.priority}
                    </Pill>
                  </td>
                  <td className="cs-num" style={{ paddingRight: 19, fontWeight: 700 }}>{r.affected.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </ContentShell>
  );
}

/** One expandable recommendation: headline, reason, impact pill, affected posts. */
function RecRow({ rec, open, onToggle }: { rec: Recommendation; open: boolean; onToggle: () => void }) {
  const preview = open ? rec.affected : rec.affected.slice(0, PREVIEW);
  const hidden = rec.affected.length - preview.length;

  return (
    <div style={{ border: "1px solid #eef0f5", borderRadius: 11, padding: "13px 14px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 11 }}>
        <span
          style={{
            width: 30, height: 30, borderRadius: 9, flex: "0 0 auto", display: "grid", placeItems: "center",
            background: `${PRIORITY_COLOR[rec.priority]}18`, color: PRIORITY_COLOR[rec.priority],
          }}
        >
          <Icon name={rec.icon} size={15} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
            <b style={{ fontSize: 12.5 }}>{rec.title}</b>
            <Pill tone={PRIORITY_TONE[rec.priority]}>
              <Icon name={PRIORITY_ICON[rec.priority]} size={12} />
              {rec.priority}
            </Pill>
            <span className="cs-num" style={{ fontSize: 11, color: "#69738c" }}>
              {rec.affected.length} post{rec.affected.length === 1 ? "" : "s"}
            </span>
          </div>
          <p style={{ margin: "5px 0 0", fontSize: 11.5, lineHeight: "19px", color: "#4c5470" }}>{rec.why}</p>

          <ul style={{ margin: "9px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 5 }}>
            {preview.map((t) => (
              <li key={t} style={{ fontSize: 11, color: "#69738c", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                • {t}
              </li>
            ))}
          </ul>

          {rec.affected.length > PREVIEW && (
            <button
              type="button"
              className="cs-btn"
              onClick={onToggle}
              aria-expanded={open}
              style={{ height: 28, marginTop: 9, fontSize: 11 }}
            >
              {open ? "Show fewer" : `+${hidden} more`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * The rule set. Each rule filters the real library; empty matches drop out so
 * the page never lists a recommendation with nothing behind it.
 */
function buildRecommendations(posts: ContentPost[]): Recommendation[] {
  const out: Recommendation[] = [];
  const titles = (list: ContentPost[]) => list.map((p) => p.title);

  const push = (id: string, title: string, why: string, priority: Priority, icon: string, list: ContentPost[]) => {
    if (list.length > 0) out.push({ id, title, why, priority, icon, affected: titles(list) });
  };

  push(
    "meta-desc",
    "Write the missing meta descriptions",
    "Search engines fall back to a scraped snippet when a description is absent, which lowers click-through on results you already rank for.",
    "High",
    "alert",
    posts.filter((p) => !p.hasMetaDescription),
  );

  push(
    "meta-title",
    "Add the missing meta titles",
    "Without an explicit meta title the post heading is used verbatim, so the keyword phrasing you want in the result is left to chance.",
    "High",
    "target",
    posts.filter((p) => !p.hasMetaTitle),
  );

  push(
    "keywords",
    "Tag posts that carry no keywords",
    "Keywords drive internal related-post links and category surfacing, so untagged posts stay isolated in the library.",
    "Medium",
    "tag",
    posts.filter((p) => !p.hasKeywords),
  );

  push(
    "cover",
    "Add a cover image",
    "Posts with no cover image render as a bare link when shared to social or messaging apps, which measurably reduces shares.",
    "Medium",
    "posts",
    posts.filter((p) => !p.hasCover),
  );

  const cutoff = Date.now() - STALE_DRAFT_DAYS * 86_400_000;
  push(
    "stale-drafts",
    `Publish or retire drafts older than ${STALE_DRAFT_DAYS} days`,
    "These posts are written but invisible — they earn nothing until they are either published or deliberately closed out.",
    "Medium",
    "clock",
    posts.filter((p) => p.status === "DRAFT" && p.createdAt !== null && new Date(p.createdAt).getTime() < cutoff),
  );

  /* `words` is null when the backend returns no body HTML — skip, never guess. */
  push(
    "thin",
    `Expand thin posts under ${THIN_WORDS} words`,
    "Short posts rarely cover a topic well enough to rank, and they give the reader little reason to stay on the page.",
    "Low",
    "edit",
    posts.filter((p) => p.words !== null && p.words < THIN_WORDS),
  );

  const counts = new Map<string, ContentPost[]>();
  for (const p of posts) {
    const key = p.category.trim() || "Uncategorised";
    counts.set(key, [...(counts.get(key) ?? []), p]);
  }
  const lonely = [...counts.values()].filter((list) => list.length === 1).flat();
  push(
    "thin-category",
    "Build out single-post categories",
    "A category holding one post signals thin coverage to readers and to search engines, and gives no internal links to follow.",
    "Low",
    "tag",
    lonely,
  );

  return out.sort(
    (a, b) =>
      PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority) || b.affected.length - a.affected.length,
  );
}
