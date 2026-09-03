"use client";

/**
 * Site Chat Agent — Conversations.
 *
 * An important honesty note lives on this page: the customer-facing assistant
 * stores no transcripts. GET /ai-agents/site-chat/conversations returns its own
 * `note` saying so, plus aggregate call metadata grouped by user — there is no
 * per-conversation table anywhere in this API. So this page shows the two kinds
 * of real record that DO exist:
 *
 *   1. the backend's grouped top-caller rows (/conversations, /summary), and
 *   2. the agent's own audited event log (/activity), which is the only
 *      timestamped data in the workspace,
 *
 * and states the transcript gap outright instead of inventing conversations to
 * fill a table. Everything is read from `useSiteChatSnapshot`.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  useSiteChatSnapshot,
  formatAge,
  formatWhen,
} from "@/lib/sitechat-data";
import { usePlatformParam, platformLabel } from "@/lib/agent-data";
import {
  BarRows,
  Card,
  Donut,
  Empty,
  ErrorNote,
  Icon,
  Legend,
  Pill,
  SERIES,
  SpecialShell,
  StatCard,
  type NavItem,
} from "@/components/special/kit";

const NAV: NavItem[] = [
  { label: "Overview", icon: "dashboard", slug: "overview" },
  { label: "Conversations", icon: "chat", slug: "conversations" },
  { label: "Usage & Cost", icon: "trend", slug: "usage" },
  { label: "Quality", icon: "target", slug: "quality" },
  { label: "Chat with AI Agent", icon: "bot", slug: "chat" },
];

const TABS = ["All events", "Carrying a cost", "No cost recorded"] as const;
const PAGE_SIZE = 12;

export default function SiteChatConversationsPage({ params }: { params: Promise<{ platform: string }> }) {
  const platform = usePlatformParam(params);
  const s = useSiteChatSnapshot(platform);
  const label = platformLabel(platform);

  const [tab, setTab] = useState<(typeof TABS)[number]>("All events");
  const [kind, setKind] = useState("All types");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const kinds = useMemo(() => {
    const set = new Set<string>();
    for (const e of s.events) if (e.targetType) set.add(e.targetType);
    return ["All types", ...[...set].sort()];
  }, [s.events]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return s.events.filter((e) => {
      const costed = e.costUsd !== null && e.costUsd > 0;
      if (tab === "Carrying a cost" && !costed) return false;
      if (tab === "No cost recorded" && costed) return false;
      if (kind !== "All types" && e.targetType !== kind) return false;
      if (q && !`${e.action} ${e.targetType ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [s.events, tab, kind, search]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const visible = rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  function reset<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setPage(1);
    };
  }

  const callerDim = s.dimensions.find((d) => d.key === "callers");
  const cacheDim = s.dimensions.find((d) => d.key === "cache");

  return (
    <SpecialShell
      platform={platform}
      agentLabel="Site Chat Agent"
      tagline="Website assistant"
      basePath="/sitechat-agent-special"
      nav={NAV}
      headerIcon="chat"
      assistantBlurb="I don't answer your customers — I report on the assistant that does: volume, cache efficiency and spend."
      title="Conversations"
      subtitle={`What ${label} actually records about who is chatting with the assistant`}
      actions={
        <Pill tone={!s.supported ? "amber" : s.error ? "red" : "green"}>
          <Icon name={!s.supported ? "alert" : s.error ? "alert" : "check"} size={12} />
          {!s.supported ? "Not on this platform" : s.error ? "Could not load" : `${s.events.length.toLocaleString()} audit rows`}
        </Pill>
      }
    >
      <style>{CONVERSATIONS_CSS}</style>

      {!s.supported ? (
        <UnsupportedNotice reason={s.unsupportedReason} label={label} />
      ) : (
        <>
          {s.error && <ErrorNote error={s.error} platform={platform} />}
          {s.partialNote && <p className="cs-sitechat-warn">{s.partialNote}</p>}

          <Card title="There is no transcript table to page through">
            <p className="cs-sitechat-callout">{s.conversationsNote}</p>
            <p className="cs-sitechat-note">
              Everything below is a real record: the grouped caller rows the backend itself returns, and the agent&apos;s
              own audited event log. No conversation rows are synthesised to make this page look fuller.
            </p>
          </Card>

          <div className="cs-stats">
            <StatCard
              label="All-Time Calls"
              value={s.loading || s.error ? "—" : s.totalCalls === null ? "Not tracked" : s.totalCalls.toLocaleString()}
              sub={s.error ? "Could not be read this session" : "Assistant calls logged by /summary"}
              tone="purple"
              icon="chat"
            />
            <StatCard
              label="Callers Grouped"
              value={s.loading || s.error ? "—" : s.callers.length.toLocaleString()}
              sub={s.error ? "Could not be read this session" : "Users the backend's own top-N list names"}
              tone="blue"
              icon="users"
            />
            <StatCard
              label="Agent Audit Rows"
              value={s.loading || s.error ? "—" : s.events.length.toLocaleString()}
              sub={s.error ? "Could not be read this session" : "Timestamped rows loaded from /activity"}
              tone="cyan"
              icon="posts"
            />
            <StatCard
              label="Matching Filters"
              value={s.loading || s.error ? "—" : rows.length.toLocaleString()}
              sub={s.error ? "Could not be read this session" : `Showing ${visible.length} on this page`}
              tone="amber"
              icon="search"
            />
          </div>

          <div className="cs-row-half">
            <Card
              title={cacheDim ? cacheDim.title : "Cached vs generated calls"}
              action={<span className="cs-sitechat-meta">{cacheDim ? `${cacheDim.total.toLocaleString()} ${cacheDim.unit}` : "None returned"}</span>}
            >
              {s.loading ? (
                <Empty>Loading live snapshot…</Empty>
              ) : s.error ? (
                <Empty>The snapshot failed, so the cache split cannot be assessed.</Empty>
              ) : cacheDim ? (
                <>
                  <div className="cs-donut-row">
                    <Donut data={cacheDim.rows} center={cacheDim.total.toLocaleString()} centerLabel={cacheDim.unit} />
                    <Legend data={cacheDim.rows} />
                  </div>
                  <p className="cs-sitechat-note">{cacheDim.note}</p>
                </>
              ) : (
                <Empty>{`${label} returned no cached-call counters to split.`}</Empty>
              )}
            </Card>

            <Card
              title={s.recencyBuckets.title}
              action={<span className="cs-sitechat-meta">{s.recencyBuckets.total.toLocaleString()} {s.recencyBuckets.unit}</span>}
            >
              {s.loading ? (
                <Empty>Loading live snapshot…</Empty>
              ) : s.error ? (
                <Empty>The snapshot failed, so event recency cannot be assessed.</Empty>
              ) : s.recencyBuckets.rows.length > 0 ? (
                <>
                  <div className="cs-donut-row">
                    <Donut data={s.recencyBuckets.rows} center={s.recencyBuckets.total.toLocaleString()} centerLabel="events" />
                    <Legend data={s.recencyBuckets.rows} />
                  </div>
                  <p className="cs-sitechat-note">{s.recencyBuckets.note}</p>
                </>
              ) : (
                <Empty>No audit row carried a usable timestamp, so recency cannot be bucketed.</Empty>
              )}
            </Card>
          </div>

          <div className="cs-row-half">
            <Card
              title="Busiest callers"
              action={<span className="cs-sitechat-meta">Backend&apos;s own grouped top-N</span>}
            >
              {s.loading ? (
                <Empty>Loading…</Empty>
              ) : s.error ? (
                <Empty>The snapshot failed, so callers cannot be ranked.</Empty>
              ) : callerDim ? (
                <>
                  <BarRows rows={callerDim.rows.map((r, i) => ({ ...r, color: SERIES[i % SERIES.length] }))} colored suffix=" calls" />
                  <p className="cs-sitechat-note">{callerDim.note}</p>
                </>
              ) : (
                <Empty>{`${label} grouped no callers with a non-zero call count.`}</Empty>
              )}
            </Card>

            <Card title="Caller detail" pad={false}>
              <div className="cs-table-wrap">
                <table className="cs-table">
                  <thead>
                    <tr>
                      <th style={{ paddingLeft: 19 }}>#</th>
                      <th>User</th>
                      <th>Phone</th>
                      <th className="cs-num">Calls</th>
                      <th className="cs-num" style={{ paddingRight: 19 }}>Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.loading && <tr><td colSpan={5} style={{ padding: 19 }}><Empty>Loading live snapshot…</Empty></td></tr>}
                    {!s.loading && s.error && (
                      <tr><td colSpan={5} style={{ padding: 19 }}><Empty>Callers could not be read, so this table cannot say whether there are any.</Empty></td></tr>
                    )}
                    {!s.loading && !s.error && s.callers.length === 0 && (
                      <tr><td colSpan={5} style={{ padding: 19 }}><Empty>{`${label} loaded successfully and grouped no callers — the assistant has served nobody yet.`}</Empty></td></tr>
                    )}
                    {!s.loading && !s.error && s.callers.map((c, i) => (
                      <tr key={c.id}>
                        <td style={{ paddingLeft: 19, color: "#94a3b8", fontWeight: 700 }}>{i + 1}</td>
                        <td><span className="title">{c.name}</span></td>
                        <td style={{ color: "#cbd5e1" }}>{c.phone ?? "—"}</td>
                        <td className="cs-num">{c.calls.toLocaleString()}</td>
                        <td className="cs-num" style={{ paddingRight: 19, color: "#94a3b8" }}>{c.share === null ? "—" : `${c.share}%`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          <Card pad={false}>
            <div className="cs-sitechat-toolbar">
              <div className="cs-tabs" style={{ border: 0, flex: 1, minWidth: 260 }}>
                {TABS.map((t) => (
                  <button key={t} type="button" className={tab === t ? "cs-tab active" : "cs-tab"} onClick={() => reset(setTab)(t)}>
                    {t}
                  </button>
                ))}
              </div>

              <select className="cs-btn" value={kind} onChange={(e) => reset(setKind)(e.target.value)} aria-label="Filter audit rows by type">
                {kinds.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>

              <label className="cs-search">
                <Icon name="search" size={15} />
                <input
                  value={search}
                  onChange={(e) => reset(setSearch)(e.target.value)}
                  placeholder="Search actions…"
                  aria-label="Search audit rows"
                />
              </label>
            </div>

            <div className="cs-table-wrap" style={{ marginTop: 12 }}>
              <table className="cs-table">
                <thead>
                  <tr>
                    <th style={{ paddingLeft: 19 }}>Action</th>
                    <th>Type</th>
                    <th>Cost recorded</th>
                    <th className="cs-num">Age</th>
                    <th className="cs-num" style={{ paddingRight: 19 }}>When</th>
                  </tr>
                </thead>
                <tbody>
                  {s.loading && <tr><td colSpan={5} style={{ padding: 19 }}><Empty>Loading the agent&apos;s audit log…</Empty></td></tr>}
                  {!s.loading && s.error && (
                    <tr><td colSpan={5} style={{ padding: 19 }}><Empty>The snapshot failed, so this log cannot be read or assessed — this is not a claim that it is empty.</Empty></td></tr>
                  )}
                  {!s.loading && !s.error && s.events.length === 0 && (
                    <tr><td colSpan={5} style={{ padding: 19 }}><Empty>{`/activity loaded and returned no rows — this agent has no audited events on ${label} yet.`}</Empty></td></tr>
                  )}
                  {!s.loading && !s.error && s.events.length > 0 && visible.length === 0 && (
                    <tr><td colSpan={5} style={{ padding: 19 }}><Empty>No audit rows match these filters.</Empty></td></tr>
                  )}
                  {!s.loading && !s.error && visible.map((e) => {
                    const costed = e.costUsd !== null && e.costUsd > 0;
                    return (
                      <tr key={e.id}>
                        <td style={{ paddingLeft: 19, maxWidth: 340 }}><span className="title">{e.action}</span></td>
                        <td style={{ color: "#cbd5e1", whiteSpace: "nowrap" }}>{e.targetType ?? "—"}</td>
                        <td>
                          {costed ? (
                            <Pill tone="green"><Icon name="check" size={12} />{`$${(e.costUsd as number).toFixed(4)}`}</Pill>
                          ) : (
                            <Pill tone="cyan"><Icon name="alert" size={12} />None recorded</Pill>
                          )}
                        </td>
                        <td className="cs-num" style={{ color: "#cbd5e1", whiteSpace: "nowrap" }}>{formatAge(e.ageDays)}</td>
                        <td className="cs-num" style={{ paddingRight: 19, color: "#94a3b8", whiteSpace: "nowrap" }}>{formatWhen(e.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {rows.length > PAGE_SIZE && (
              <div className="cs-sitechat-pager">
                <span>
                  Showing {(current - 1) * PAGE_SIZE + 1}–{Math.min(current * PAGE_SIZE, rows.length)} of {rows.length}
                </span>
                <div>
                  <button type="button" className="cs-btn" onClick={() => setPage(Math.max(1, current - 1))} disabled={current === 1}>
                    Previous
                  </button>
                  <span className="cs-sitechat-pageno">{current} / {totalPages}</span>
                  <button type="button" className="cs-btn" onClick={() => setPage(Math.min(totalPages, current + 1))} disabled={current === totalPages}>
                    Next
                  </button>
                </div>
              </div>
            )}
          </Card>

          <Card title="Coverage">
            <p className="cs-sitechat-note">{s.sourceNote}</p>
            <p className="cs-sitechat-note">{s.coverageNote}</p>
          </Card>
        </>
      )}
    </SpecialShell>
  );
}

/** Shown on a platform that never registered this agent. */
function UnsupportedNotice({ reason, label }: { reason: string | null; label: string }) {
  return (
    <Card title={`Site Chat Agent is not available on ${label}`}>
      <div className="cs-sitechat-unsupported">
        <span><Icon name="alert" size={18} /></span>
        <div>
          <p>{reason}</p>
          <p>No conversation, caller or audit data is shown here, because none exists to fetch on this platform.</p>
          <Link href="/sitechat-agent-special/ghrfix/conversations" className="cs-btn cs-btn-primary">
            <Icon name="arrow" size={15} />Open the GhrFix workspace
          </Link>
        </div>
      </div>
    </Card>
  );
}

const CONVERSATIONS_CSS = `
.cs-sitechat-meta{font-size:11px;color:#94a3b8}
.cs-sitechat-note{margin:10px 0 0;font-size:10.5px;line-height:17px;color:#94a3b8}
.cs-sitechat-callout{margin:0;font-size:12.5px;line-height:21px;color:#cbd5e1}
.cs-sitechat-warn{margin:0 0 12px;border:1px solid rgba(245,158,11,.3);background:rgba(245,158,11,.13);color:#fbbf24;border-radius:10px;padding:10px 13px;font-size:11.5px;line-height:18px}
.cs-sitechat-toolbar{display:flex;align-items:center;gap:12px;padding:14px 19px 0;flex-wrap:wrap}
.cs-sitechat-pager{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 19px;border-top:1px solid rgba(255,255,255,.07);font-size:11.5px;color:#cbd5e1;flex-wrap:wrap}
.cs-sitechat-pager>div{display:flex;gap:6px}
.cs-sitechat-pageno{display:grid;place-items:center;padding:0 10px;font-weight:650}
.cs-sitechat-unsupported{display:flex;gap:14px;align-items:flex-start}
.cs-sitechat-unsupported>span{width:36px;height:36px;border-radius:11px;flex:0 0 auto;display:grid;place-items:center;background:rgba(245,158,11,.13);color:#fbbf24}
.cs-sitechat-unsupported p{margin:0 0 10px;font-size:12.5px;line-height:21px;color:#cbd5e1}
`;
