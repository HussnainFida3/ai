"use client";

/**
 * Master AI — Activity.
 *
 * The real event log, paginated, with three cuts over it: what kind of events
 * they were, how recent they are, and which agent produced them.
 *
 * The scope of this feed differs by platform, and the page says which it is
 * looking at rather than implying both are fleet-wide:
 *   ShadiLife  GET /ai-agents/_meta/activity — one shared stream covering
 *              every agent, with real `createdAt` timestamps, so a genuine
 *              per-day series is derived from it.
 *   GhrFix     GET /ai-agents/master/activity — the Master agent's OWN
 *              audited writes. GhrFix keeps audit logs per agent, so there is
 *              no fleet-wide stream to read and no time series is invented.
 */

import { useMemo, useState } from "react";
import { useMasterSnapshot, usd, count, dateTime, ago } from "@/lib/master-data";
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
  SpecialShell,
  StatCard,
  TrendChart,
  type NavItem,
  type Slice,
} from "@/components/special/kit";

const NAV: NavItem[] = [
  { label: "Overview", icon: "dashboard", slug: "overview" },
  { label: "Fleet", icon: "users", slug: "fleet" },
  { label: "Spend", icon: "trend", slug: "spend" },
  { label: "Activity", icon: "pulse", slug: "activity" },
  { label: "Chat with AI Agent", icon: "chat", slug: "chat" },
];

const PAGE_SIZE = 12;

export default function MasterActivityPage({ params }: { params: Promise<{ platform: string }> }) {
  const platform = usePlatformParam(params);
  const s = useMasterSnapshot(platform);
  const label = platformLabel(platform);

  const [kind, setKind] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const kinds = useMemo(() => ["all", ...[...new Set(s.events.map((e) => e.kind))].sort()], [s.events]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return s.events
      .filter((e) => kind === "all" || e.kind === kind)
      .filter(
        (e) =>
          q === "" ||
          e.agentName.toLowerCase().includes(q) ||
          (e.endpoint ?? "").toLowerCase().includes(q) ||
          (e.status ?? "").toLowerCase().includes(q),
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [s.events, kind, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const shown = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const newest = s.events.reduce<string | null>(
    (acc, e) => (acc === null || new Date(e.createdAt).getTime() > new Date(acc).getTime() ? e.createdAt : acc),
    null,
  );
  const loggedCost = s.events.reduce<number | null>(
    (acc, e) => (e.costUsd === null ? acc : (acc ?? 0) + e.costUsd),
    null,
  );
  const last24h = s.recencyBuckets.slice(0, 3).reduce((a, b) => a + b.value, 0);

  return (
    <SpecialShell
      platform={platform}
      agentLabel="Master AI"
      tagline="Fleet telemetry"
      basePath="/master-agent-special"
      nav={NAV}
      headerIcon="pulse"
      assistantBlurb="I watch every other agent on this platform — calls, spend and activity — and only report what the backend records."
      title="Activity"
      subtitle={`The real ${label} AI event log`}
      actions={
        <Pill tone={s.error ? "red" : s.events.length > 0 ? "green" : "amber"}>
          <Icon name={s.error ? "alert" : s.events.length > 0 ? "check" : "clock"} size={12} />
          {s.error ? "Feed unreadable" : s.loading ? "Loading" : `${s.events.length.toLocaleString()} events`}
        </Pill>
      }
    >
      <style>{CSS}</style>

      {s.error && <ErrorNote error={s.error} platform={platform} />}

      {s.error ? (
        <Card title="Event feed">
          <Empty>
            The {label} activity feed could not be read. This page cannot say the fleet was quiet — it has no events to
            inspect, which is a different thing entirely.
          </Empty>
        </Card>
      ) : s.loading ? (
        <Card title="Event feed">
          <Empty>Loading the {label} event feed…</Empty>
        </Card>
      ) : (
        <>
          <div className="cs-stats">
            <StatCard label="Events returned" value={s.events.length.toLocaleString()} sub="Rows in the feed as returned" tone="purple" icon="pulse" />
            <StatCard label="Last 24 hours" value={last24h.toLocaleString()} sub="From real createdAt timestamps" tone="blue" icon="clock" />
            <StatCard
              label="Newest event"
              value={newest ? ago(newest) : "—"}
              sub={newest ? dateTime(newest) : "The feed returned no rows"}
              tone="cyan"
              icon="calendar"
            />
            <StatCard
              label="Distinct agents"
              value={s.eventsByAgent.length}
              sub={s.eventsByAgent.length > 0 ? "Appearing in the feed" : "No agent appears in the feed"}
              tone="green"
              icon="users"
            />
            <StatCard
              label="Cost logged on events"
              value={loggedCost === null ? "Not tracked" : usd(loggedCost, 4)}
              sub={loggedCost === null ? `${label} events carry no per-event cost` : "Summed from costUsd on each event"}
              tone={loggedCost === null ? "amber" : "purple"}
              icon="tag"
            />
          </div>

          <Card title="Feed scope">
            <p className="cs-master-scope">{s.eventScopeNote}</p>
          </Card>

          <Card title={s.series ? "Events per day" : "Event trend"}>
            {s.series ? (
              <TrendChart series={[{ name: "Events", data: s.series.calls }]} labels={s.series.labels} height={205} />
            ) : (
              <Empty>{s.seriesNote}</Empty>
            )}
            <p className="cs-master-note">{s.seriesNote}</p>
          </Card>

          <div className="cs-row-half">
            <Card title="Events by kind">
              {s.eventsByKind.length === 0 ? (
                <Empty>The feed returned no events, so there are no kinds to break down.</Empty>
              ) : (
                <div className="cs-donut-row">
                  <Donut data={s.eventsByKind as Slice[]} center={s.events.length} centerLabel="Events" />
                  <Legend data={s.eventsByKind as Slice[]} />
                </div>
              )}
              <p className="cs-master-note">Kind is the backend&apos;s own classification of each row, unmodified.</p>
            </Card>

            <Card title="How recent the feed is">
              {s.events.length === 0 ? (
                <Empty>No events to place in time.</Empty>
              ) : (
                <BarRows rows={s.recencyBuckets as Slice[]} />
              )}
              <p className="cs-master-note">
                Buckets are computed against the browser clock from each event&apos;s real createdAt value. Empty buckets
                are genuine zeros: the feed was read, and nothing fell in them.
              </p>
            </Card>
          </div>

          <Card title="Events per agent">
            {s.eventsByAgent.length === 0 ? (
              <Empty>No agent appears in the feed.</Empty>
            ) : (
              <BarRows rows={s.eventsByAgent.slice(0, 12) as Slice[]} colored={false} />
            )}
            <p className="cs-master-note">
              Counts rows in the feed, which is not the same as total calls this month — the fleet call counts on the
              Overview page come from the usage route instead. {s.coverageNote}
            </p>
          </Card>

          <Card
            title="Event log"
            action={
              <label className="cs-search">
                <Icon name="search" size={14} />
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search agent, endpoint, status…"
                  aria-label="Search events"
                />
              </label>
            }
          >
            <div className="cs-tabs">
              {kinds.map((k) => (
                <button
                  key={k}
                  type="button"
                  className={k === kind ? "cs-tab active" : "cs-tab"}
                  onClick={() => {
                    setKind(k);
                    setPage(1);
                  }}
                >
                  {k === "all" ? `All (${s.events.length})` : `${k} (${s.events.filter((e) => e.kind === k).length})`}
                </button>
              ))}
            </div>

            {shown.length === 0 ? (
              <Empty>
                {s.events.length === 0
                  ? `${label} returned an empty event feed. That is a real empty result, not a failed read.`
                  : "No event matches that filter."}
              </Empty>
            ) : (
              <div className="cs-table-wrap">
                <table className="cs-table">
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>Agent</th>
                      <th>Kind</th>
                      <th>Endpoint / target</th>
                      <th>Status</th>
                      <th className="cs-num">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((e) => (
                      <tr key={e.id}>
                        <td>
                          <div className="title">{ago(e.createdAt)}</div>
                          <div className="sub">{dateTime(e.createdAt)}</div>
                        </td>
                        <td className="title">{e.agentName}</td>
                        <td>
                          <Pill tone={e.kind === "call" ? "blue" : "purple"}>
                            <Icon name={e.kind === "call" ? "pulse" : "sparkle"} size={11} />
                            {e.kind}
                          </Pill>
                        </td>
                        <td>{e.endpoint ?? e.targetType ?? "—"}</td>
                        <td>{e.status ?? "—"}</td>
                        <td className="cs-num">{e.costUsd === null ? "—" : usd(e.costUsd, 4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {totalPages > 1 && (
              <div className="cs-master-pager">
                <button type="button" className="cs-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1} aria-label="Previous page">
                  <Icon name="back" size={13} />
                </button>
                <span>
                  Page {safePage} of {totalPages} · {filtered.length.toLocaleString()} events
                </span>
                <button type="button" className="cs-btn" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} aria-label="Next page">
                  <Icon name="arrow" size={13} />
                </button>
              </div>
            )}

            <p className="cs-master-note">
              Total fleet calls this month: {count(s.totalCalls)} — the feed above is what the log route returned, and on
              some platforms it is a window rather than the full month.
            </p>
            <p className="cs-master-note">{s.sourceNote}</p>
          </Card>
        </>
      )}
    </SpecialShell>
  );
}

const CSS = `
.cs-master-note{margin:12px 0 0;font-size:10.5px;line-height:17px;color:#94a3b8}
.cs-master-scope{margin:0;font-size:12px;line-height:20px;color:#cbd5e1}
.cs-master-pager{display:flex;align-items:center;gap:12px;justify-content:flex-end;margin-top:14px;font-size:11.5px;color:#94a3b8}
.cs-master-pager .cs-btn:disabled{opacity:.45;cursor:default}
`;
