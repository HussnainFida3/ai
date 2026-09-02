"use client";

/**
 * Master AI — Fleet.
 *
 * The per-agent roster: every agent in the registry (except Master itself),
 * with its calls, spend, share of the fleet and reporting status. Data comes
 * from `useMasterSnapshot` — GhrFix's /ai-agents/master/overview (falling back
 * to a per-agent /stats fan-out) or ShadiLife's /ai-agents/_meta/usage.
 *
 * The distinction this page exists to make: a row that says "0 calls" is an
 * agent that answered and genuinely did nothing; a row marked "No report" is
 * an agent nobody heard from. The two are never merged, and unreported rows
 * are excluded from the charts and rankings above the table.
 */

import { useMemo, useState } from "react";
import { useMasterSnapshot, usd, count, ago, type FleetAgentRow } from "@/lib/master-data";
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

const PAGE_SIZE = 8;
type SortKey = "calls" | "spend" | "name" | "cost";

export default function MasterFleetPage({ params }: { params: Promise<{ platform: string }> }) {
  const platform = usePlatformParam(params);
  const s = useMasterSnapshot(platform);
  const label = platformLabel(platform);

  const [tag, setTag] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("calls");
  const [page, setPage] = useState(1);

  const tags = useMemo(() => {
    const set = new Set(s.rows.map((r) => r.tag));
    return ["all", ...[...set].sort()];
  }, [s.rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = s.rows.filter(
      (r) => (tag === "all" || r.tag === tag) && (q === "" || r.name.toLowerCase().includes(q) || r.key.includes(q)),
    );
    return [...list].sort((a, b) => {
      /* Unreported rows sort last on every numeric key — they have no value
         to compare, and ranking them as 0 would be exactly the lie this page
         is built to avoid. */
      if (sort !== "name" && a.reported !== b.reported) return a.reported ? -1 : 1;
      switch (sort) {
        case "spend":
          return (b.spendUsd ?? 0) - (a.spendUsd ?? 0);
        case "name":
          return a.name.localeCompare(b.name);
        case "cost":
          return (b.costPerCallUsd ?? -1) - (a.costPerCallUsd ?? -1);
        default:
          return (b.calls ?? 0) - (a.calls ?? 0);
      }
    });
  }, [s.rows, tag, search, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const shown = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const agentsByTag: Slice[] = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of s.rows.filter((x) => x.reported)) m.set(r.tag, (m.get(r.tag) ?? 0) + 1);
    return [...m.entries()].map(([lbl, value]) => ({ label: lbl, value })).sort((a, b) => b.value - a.value);
  }, [s.rows]);

  const unreported = s.rows.filter((r) => !r.reported);

  return (
    <SpecialShell
      platform={platform}
      agentLabel="Master AI"
      tagline="Fleet telemetry"
      basePath="/master-agent-special"
      nav={NAV}
      headerIcon="users"
      assistantBlurb="I watch every other agent on this platform — calls, spend and activity — and only report what the backend records."
      title="Fleet"
      subtitle={`All ${s.registryCount} ${label} agents under Master AI`}
      actions={
        <Pill tone={s.error ? "red" : s.unreportedCount > 0 ? "amber" : "green"}>
          <Icon name={s.error ? "alert" : s.unreportedCount > 0 ? "clock" : "check"} size={12} />
          {s.error ? "Roster unreadable" : s.loading ? "Loading" : `${s.reportedCount}/${s.registryCount} reporting`}
        </Pill>
      }
    >
      <style>{CSS}</style>

      {s.error && <ErrorNote error={s.error} platform={platform} />}

      {s.error ? (
        <Card title="Fleet roster">
          <Empty>
            The {label} fleet roster could not be read. This page cannot tell you whether any agent is healthy, idle or
            busy — it has no data, which is not the same as no activity.
          </Empty>
        </Card>
      ) : s.loading ? (
        <Card title="Fleet roster">
          <Empty>Loading the {label} roster…</Empty>
        </Card>
      ) : (
        <>
          <div className="cs-stats">
            <StatCard label="In registry" value={s.registryCount} sub="Agents besides Master AI" tone="purple" icon="users" />
            <StatCard label="Reported" value={s.reportedCount} sub="Returned a usable row" tone="green" icon="check" />
            <StatCard
              label="Did not report"
              value={s.unreportedCount}
              sub={s.unreportedCount > 0 ? "Excluded from all totals" : "None missing"}
              tone={s.unreportedCount > 0 ? "red" : "green"}
              icon="alert"
            />
            <StatCard label="Active" value={s.activeCount} sub="Reported at least one call" tone="blue" icon="pulse" />
            <StatCard label="Idle (true zero)" value={s.idleCount} sub="Answered, made no calls" tone="amber" icon="clock" />
          </div>

          <div className="cs-row-half">
            <Card title="Calls by agent">
              {s.callsByAgent.length === 0 ? (
                <Empty>No reporting agent made a call this month.</Empty>
              ) : (
                <div className="cs-donut-row">
                  <Donut data={s.callsByAgent as Slice[]} center={count(s.totalCalls)} centerLabel="Calls" />
                  <Legend data={s.callsByAgent as Slice[]} />
                </div>
              )}
              <p className="cs-master-note">Top five plus a folded &ldquo;Other&rdquo; slice — six colours, never extended.</p>
            </Card>

            <Card title="Reporting agents by category">
              {agentsByTag.length === 0 ? (
                <Empty>No agent reported, so there is no category mix to show.</Empty>
              ) : (
                <div className="cs-donut-row">
                  <Donut data={agentsByTag} center={s.reportedCount} centerLabel="Agents" />
                  <Legend data={agentsByTag} />
                </div>
              )}
              <p className="cs-master-note">Counts reporting agents only. Unreported agents are omitted rather than attributed to a category with zero activity.</p>
            </Card>
          </div>

          <Card title="Spend ranking">
            {s.spendByAgent.length === 0 ? (
              <Empty>No reporting agent recorded spend this month.</Empty>
            ) : (
              <BarRows rows={s.spendByAgent as Slice[]} />
            )}
            <p className="cs-master-note">{s.coverageNote}</p>
          </Card>

          {unreported.length > 0 && (
            <Card title={`${unreported.length} agents did not report`}>
              <div className="cs-master-unreported">
                {unreported.map((r) => (
                  <div className="cs-master-unreported-row" key={r.key}>
                    <b>{r.name}</b>
                    <span>{r.failureReason ?? "No response"}</span>
                  </div>
                ))}
              </div>
              <p className="cs-master-note">
                These agents are shown as unknown everywhere on this workspace. They are not drawn in any chart and not
                added to any total — a missing measurement is not a measurement of zero.
              </p>
            </Card>
          )}

          <Card
            title="Fleet roster"
            action={
              <div className="cs-master-controls">
                <label className="cs-search">
                  <Icon name="search" size={14} />
                  <input
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Search agents…"
                    aria-label="Search fleet agents"
                  />
                </label>
                <select
                  className="cs-master-select"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  aria-label="Sort roster"
                >
                  <option value="calls">Most calls</option>
                  <option value="spend">Most spend</option>
                  <option value="cost">Cost per call</option>
                  <option value="name">Name</option>
                </select>
              </div>
            }
          >
            <div className="cs-tabs">
              {tags.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={t === tag ? "cs-tab active" : "cs-tab"}
                  onClick={() => {
                    setTag(t);
                    setPage(1);
                  }}
                >
                  {t === "all" ? `All (${s.rows.length})` : `${t} (${s.rows.filter((r) => r.tag === t).length})`}
                </button>
              ))}
            </div>

            {shown.length === 0 ? (
              <Empty>No agent matches that filter.</Empty>
            ) : (
              <div className="cs-table-wrap">
                <table className="cs-table">
                  <thead>
                    <tr>
                      <th>Agent</th>
                      <th>Status</th>
                      <th className="cs-num">Calls (month)</th>
                      <th className="cs-num">Calls (today)</th>
                      <th className="cs-num">Spend</th>
                      <th className="cs-num">Share of calls</th>
                      <th className="cs-num">Cost / call</th>
                      <th>Last event</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((r) => (
                      <tr key={r.key}>
                        <td>
                          <div className="title">{r.name}</div>
                          <div className="sub">{r.tag}</div>
                        </td>
                        <td>{statusPill(r)}</td>
                        <td className="cs-num">{r.reported ? count(r.calls) : "—"}</td>
                        <td className="cs-num">{!s.callsTodayTracked ? "Not tracked" : r.reported ? count(r.callsToday) : "—"}</td>
                        <td className="cs-num">{r.reported ? usd(r.spendUsd) : "—"}</td>
                        <td className="cs-num">{r.callSharePct === null ? "—" : `${r.callSharePct}%`}</td>
                        <td className="cs-num">{r.costPerCallUsd === null ? "—" : usd(r.costPerCallUsd, 4)}</td>
                        <td>{r.lastActivityIso ? ago(r.lastActivityIso) : "—"}</td>
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
                  Page {safePage} of {totalPages} · {filtered.length} agents
                </span>
                <button type="button" className="cs-btn" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} aria-label="Next page">
                  <Icon name="arrow" size={13} />
                </button>
              </div>
            )}

            <p className="cs-master-note">
              {s.callsTodayTracked
                ? "Calls (today) comes from the same fleet route."
                : `${label} reports monthly totals only, so "Calls (today)" is marked Not tracked rather than 0.`}{" "}
              {s.rows.some((r) => r.lastActivityIso)
                ? "Last event is the newest row for that agent in the shared activity feed."
                : `${label} has no fleet-wide event feed keyed by agent, so "Last event" is blank rather than guessed.`}
            </p>
            <p className="cs-master-note">{s.sourceNote}</p>
          </Card>
        </>
      )}
    </SpecialShell>
  );
}

/** Status is always a word plus a glyph — never colour alone. */
function statusPill(r: FleetAgentRow) {
  if (!r.reported) {
    return (
      <Pill tone="red">
        <Icon name="alert" size={11} />No report
      </Pill>
    );
  }
  if ((r.calls ?? 0) > 0) {
    return (
      <Pill tone="green">
        <Icon name="check" size={11} />Active
      </Pill>
    );
  }
  return (
    <Pill tone="amber">
      <Icon name="clock" size={11} />Idle (0)
    </Pill>
  );
}

const CSS = `
.cs-master-note{margin:12px 0 0;font-size:10.5px;line-height:17px;color:#8891a8}
.cs-master-controls{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.cs-master-select{height:36px;border:1px solid #dfe2ea;border-radius:8px;background:#fff;padding:0 10px;font-size:12px;color:#11162d}
.cs-master-pager{display:flex;align-items:center;gap:12px;justify-content:flex-end;margin-top:14px;font-size:11.5px;color:#69738c}
.cs-master-pager .cs-btn:disabled{opacity:.45;cursor:default}
.cs-master-unreported{display:flex;flex-direction:column;gap:8px}
.cs-master-unreported-row{display:flex;justify-content:space-between;gap:14px;font-size:11.5px;padding:8px 11px;border:1px solid #f6d5d8;background:#fff7f7;border-radius:9px}
.cs-master-unreported-row b{font-weight:700;color:#a32732;white-space:nowrap}
.cs-master-unreported-row span{color:#69738c;text-align:right}
`;
