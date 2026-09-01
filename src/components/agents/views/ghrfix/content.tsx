"use client";

/**
 * GhrFix — Content Agent.
 *
 * Reads the real blog library from `/ai-agents/content/posts` and derives
 * every chart from the returned records: status split, category mix, a
 * publishing timeline built from real `createdAt` / `publishedAt` stamps, and
 * SEO-metadata completeness counted field by field. Drafting, publishing and
 * unpublishing are the agent's real write endpoints.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { AreaChart, BarList, DonutChart, InsightsPanel, MetricCard, AgentSidePanel, Svg } from "@/components/agents/rich";
import { Icons } from "@/components/agents/icons";
import { ApiError, type AgentStats, type Paginated } from "@/lib/api";
import type { AgentViewProps } from "../registry";
import {
  AskAnswer,
  Empty,
  ErrorNote,
  KeyRow,
  Panel,
  Pill,
  TableWrap,
  dateTime,
  dec,
  num,
  share,
  shortDate,
  useAsk,
  useLoad,
} from "./_kit-core";

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  coverImageUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  readMinutes: number;
  status: "DRAFT" | "PUBLISHED";
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

/** Buckets real post timestamps into the last 6 calendar months. */
function monthlySeries(posts: Post[], pick: (p: Post) => string | null) {
  const months: Array<{ key: string; label: string }> = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: d.toLocaleDateString(undefined, { month: "short" }) });
  }
  const counts = new Map(months.map((m) => [m.key, 0]));
  for (const p of posts) {
    const iso = pick(p);
    if (!iso) continue;
    const key = iso.slice(0, 7);
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return { labels: months.map((m) => m.label), data: months.map((m) => counts.get(m.key) ?? 0) };
}

export default function ContentView({ platform, agent, api }: AgentViewProps) {
  const load = useLoad(async () => {
    const [posts, stats] = await Promise.allSettled([api.get<Post[], Paginated>("/posts", { pageSize: 100 }), api.stats()]);
    if (posts.status === "rejected") throw posts.reason;
    return {
      posts: posts.value.data ?? [],
      total: posts.value.meta?.total ?? null,
      stats: stats.status === "fulfilled" ? (stats.value.data as AgentStats) : null,
    };
  }, [platform.key, agent.key]);

  const ask = useAsk(api);
  const posts = load.data?.posts ?? [];

  const published = posts.filter((p) => p.status === "PUBLISHED");
  const drafts = posts.filter((p) => p.status === "DRAFT");

  const categoryRows = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of posts) map.set(p.category, (map.get(p.category) ?? 0) + 1);
    return Array.from(map.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [posts]);

  const created = useMemo(() => monthlySeries(posts, (p) => p.createdAt), [posts]);
  const publishedSeries = useMemo(() => monthlySeries(posts, (p) => p.publishedAt), [posts]);

  const withSeoTitle = posts.filter((p) => Boolean(p.seoTitle)).length;
  const withSeoDesc = posts.filter((p) => Boolean(p.seoDescription)).length;
  const withCover = posts.filter((p) => Boolean(p.coverImageUrl)).length;
  const readMinutes = posts.map((p) => dec(p.readMinutes) ?? 0);
  const avgRead = readMinutes.length > 0 ? Math.round((readMinutes.reduce((a, b) => a + b, 0) / readMinutes.length) * 10) / 10 : null;
  const totalWords = posts.reduce((a, p) => a + p.content.trim().split(/\s+/).filter(Boolean).length, 0);

  const oldestDraft = drafts.length > 0 ? drafts.reduce((a, b) => (a.createdAt < b.createdAt ? a : b)) : null;

  return (
    <>
      {load.error && <ErrorNote error={load.error} hint={`The Content Agent reads ${platform.apiBase}${agent.base}/posts. Connect ${platform.label} first if this persists.`} />}

      <div className="ag-metrics">
        <MetricCard icon={<Svg path={Icons.content} size={24} />} tone="blue" title="Posts in library" value={load.loading ? "—" : num(load.data?.total ?? posts.length)} />
        <MetricCard icon={<Svg path={Icons.eye} size={24} />} tone="green" title="Published" value={load.loading ? "—" : num(published.length)} />
        <MetricCard icon={<Svg path={Icons.posts} size={24} />} tone="gold" title="Drafts waiting" value={load.loading ? "—" : num(drafts.length)} />
        <MetricCard icon={<Svg path={Icons.clock} size={24} />} tone="purple" title="Avg read time" value={load.loading || avgRead === null ? "—" : `${avgRead} min`} />
        <MetricCard icon={<Svg path={Icons.seo} size={24} />} tone="pink" title="With SEO metadata" value={load.loading ? "—" : posts.length === 0 ? "—" : `${withSeoTitle} / ${posts.length}`} />
        <MetricCard icon={<Svg path={Icons.sparkle} size={24} />} tone="accent" title="Words written" value={load.loading ? "—" : num(totalWords)} />
      </div>

      <div className="ag-split">
        <div className="ag-stack">
          <Panel
            title="Publishing timeline — last 6 months"
            sub="Drafted vs published, counted from real post timestamps"
            actions={
              <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" onClick={load.reload} disabled={load.loading}>
                <Svg path={Icons.refresh} size={14} /> Refresh
              </button>
            }
          >
            {posts.length > 0 ? (
              <AreaChart
                labels={created.labels}
                series={[
                  { name: "Drafted", data: created.data, color: "#3b82f6" },
                  { name: "Published", data: publishedSeries.data, color: "#22c55e" },
                ]}
              />
            ) : (
              <Empty>{load.loading ? "Loading the content library…" : "No posts yet — draft the first one below and the timeline fills itself."}</Empty>
            )}
          </Panel>

          <div className="ag-duo">
            <Panel title="Library status" sub="Published vs draft">
              {posts.length > 0 ? (
                <DonutChart
                  data={[
                    { label: "Published", value: published.length, color: "#22c55e" },
                    { label: "Draft", value: drafts.length, color: "#f59e0b" },
                  ].filter((r) => r.value > 0)}
                  total={posts.length}
                  totalLabel="Posts"
                  size={150}
                />
              ) : (
                <Empty>{load.loading ? "Loading…" : "No posts yet."}</Empty>
              )}
            </Panel>

            <Panel title="Coverage by category" sub="Posts per GhrFix service category">
              <BarList rows={categoryRows} ranked color="#3b82f6" emptyText={load.loading ? "Loading…" : "No categories covered yet."} />
            </Panel>
          </div>

          <Panel title="SEO metadata completeness" sub="Counted field by field across every post">
            {posts.length > 0 ? (
              <BarList
                rows={[
                  { label: "SEO title set", value: withSeoTitle },
                  { label: "Meta description set", value: withSeoDesc },
                  { label: "Cover image set", value: withCover },
                  { label: "Posts in library", value: posts.length },
                ]}
                color="#8b5cf6"
              />
            ) : (
              <Empty>{load.loading ? "Loading…" : "Nothing to measure yet."}</Empty>
            )}
          </Panel>

          <Panel
            title="Recently updated posts"
            sub={`${posts.length} post${posts.length === 1 ? "" : "s"} loaded — full library, filters and publish actions live in Library`}
            noBody
            actions={<Link href={`/${platform.key}/${agent.key}/library`} className="ag-btn ag-btn-ghost ag-btn-sm">View all in Library →</Link>}
          >
            <TableWrap>
              <table className="ag-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>SEO</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {[...posts]
                    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
                    .slice(0, 5)
                    .map((p) => {
                      const seoOk = Boolean(p.seoTitle) && Boolean(p.seoDescription);
                      return (
                        <tr key={p.id}>
                          <td style={{ minWidth: 200 }}>
                            <b style={{ display: "block", fontWeight: 650 }}>{p.title}</b>
                            <span style={{ fontSize: 10.5, color: "var(--ag-ink-faint)" }}>/{p.slug}</span>
                          </td>
                          <td>{p.category}</td>
                          <td><Pill text={p.status} tone={p.status === "PUBLISHED" ? "green" : "amber"} /></td>
                          <td><Pill text={seoOk ? "Complete" : p.seoTitle || p.seoDescription ? "Partial" : "Missing"} tone={seoOk ? "green" : p.seoTitle || p.seoDescription ? "amber" : "red"} /></td>
                          <td style={{ whiteSpace: "nowrap", color: "var(--ag-ink-faint)" }}>{shortDate(p.updatedAt)}</td>
                        </tr>
                      );
                    })}
                  {posts.length === 0 && (
                    <tr>
                      <td colSpan={5}>
                        <Empty>{load.loading ? "Loading posts…" : "The blog library is empty."}</Empty>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </TableWrap>
          </Panel>
        </div>

        <div className="ag-stack">
          <DraftPanel api={api} onDrafted={load.reload} />

          <AgentSidePanel
            agentLabel={`${platform.label} — ${agent.name}`}
            greeting="Let's fill the blog"
            blurb="I draft real articles for Pakistani homeowners with SEO metadata attached. Publishing is always your deliberate click, never mine."
            todayStats={[
              { label: "Drafts waiting", value: load.loading ? "—" : num(drafts.length), icon: <Svg path={Icons.posts} size={17} />, tone: "gold" },
              { label: "Live posts", value: load.loading ? "—" : num(published.length), icon: <Svg path={Icons.eye} size={17} />, tone: "green" },
              { label: "Agent calls today", value: load.data?.stats ? num(load.data.stats.callsToday) : "—", icon: <Svg path={Icons.chat} size={17} />, tone: "purple" },
            ]}
            suggestions={["Which service categories have no blog coverage?", "What should we write about next month?", "Which drafts are worth publishing first?"]}
            onAsk={ask.ask}
          />

          <AskAnswer state={ask} />

          <InsightsPanel
            rows={[
              {
                icon: <Svg path={Icons.eye} size={15} />,
                label: "Publish rate",
                value: posts.length === 0 ? "No posts in the library yet." : `${share(published.length, posts.length)}% of ${posts.length} post${posts.length === 1 ? "" : "s"} are live.`,
              },
              {
                icon: <Svg path={Icons.seo} size={15} />,
                label: "Missing meta descriptions",
                value: posts.length === 0 ? "Nothing to check yet." : `${posts.length - withSeoDesc} of ${posts.length} post${posts.length === 1 ? "" : "s"} have no meta description.`,
              },
              {
                icon: <Svg path={Icons.sparkle} size={15} />,
                label: "Missing cover images",
                value: posts.length === 0 ? "Nothing to check yet." : `${posts.length - withCover} post${posts.length - withCover === 1 ? "" : "s"} still need a cover image.`,
              },
              {
                icon: <Svg path={Icons.clock} size={15} />,
                label: "Oldest waiting draft",
                value: oldestDraft ? `“${oldestDraft.title}” has been in draft since ${dateTime(oldestDraft.createdAt)}.` : "No drafts are waiting.",
              },
              {
                icon: <Svg path={Icons.target} size={15} />,
                label: "Category spread",
                value: categoryRows.length === 0 ? "No categories covered yet." : `${categoryRows.length} categor${categoryRows.length === 1 ? "y is" : "ies are"} covered; “${categoryRows[0].label}” leads with ${categoryRows[0].value}.`,
              },
            ]}
          />

          <Panel title="Agent runtime" sub="Real usage from the shared agent log">
            <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
              {load.data?.stats ? (
                <>
                  <KeyRow label="Model" value={load.data.stats.model} />
                  <KeyRow label="Calls this month" value={num(load.data.stats.callsThisMonth)} />
                  <KeyRow label="Tokens this month" value={num(load.data.stats.tokensThisMonth)} />
                  <KeyRow label="Spend this month" value={`$${(dec(load.data.stats.spendThisMonthUsd) ?? 0).toFixed(2)}`} />
                </>
              ) : (
                <Empty>{load.loading ? "Loading…" : "Runtime stats unavailable."}</Empty>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}

/* ── Real draft action: POST /draft writes a genuine post record ─────── */

function DraftPanel({ api, onDrafted }: { api: AgentViewProps["api"]; onDrafted: () => void }) {
  const [topic, setTopic] = useState("");
  const [category, setCategory] = useState("Home Maintenance");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function draft() {
    if (topic.trim().length < 2) return;
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      const { data } = await api.post<{ title: string }>("/draft", { topic: topic.trim(), category: category.trim() || "Home Maintenance" });
      setMsg(`Drafted “${data?.title ?? topic.trim()}” — review it below, then publish when you're happy.`);
      setTopic("");
      onDrafted();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "The agent could not draft that post.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel title="Draft a new post" sub="The agent writes a real article and saves it as a draft">
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="ag-field">
          <label htmlFor="content-topic">Topic</label>
          <input id="content-topic" placeholder="e.g. How to spot unsafe wiring at home" value={topic} onChange={(e) => setTopic(e.target.value)} />
        </div>
        <div className="ag-field">
          <label htmlFor="content-category">Category</label>
          <input id="content-category" value={category} onChange={(e) => setCategory(e.target.value)} />
        </div>
        <button type="button" className="ag-btn ag-btn-accent" onClick={draft} disabled={busy || topic.trim().length < 2}>
          <Svg path={Icons.sparkle} size={15} /> {busy ? "Writing…" : "Draft with AI"}
        </button>
        {(msg || err) && <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.6, fontWeight: 600, color: err ? "var(--ag-red)" : "var(--ag-green)" }}>{err ?? msg}</p>}
      </div>
    </Panel>
  );
}
