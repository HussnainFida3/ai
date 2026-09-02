"use client";

/**
 * Owner Chat Agent — Directory.
 *
 * The real people the agent can reach. GhrFix serves two independent
 * server-paginated rosters (`/admin/users` and `/admin/providers`);
 * ShadiLife serves `/admin/users` plus the full `/admin/agents` list. Each
 * tab reports its own load state, so one roster failing while the other
 * succeeds is shown as a partial picture rather than a complete one.
 *
 * Above the table: a status donut and a ranked group bar list, both computed
 * from the rows actually fetched. Below: search, a status filter and 12-row
 * pagination. Nothing here writes.
 */

import { useMemo, useState } from "react";
import { useOwnerChatSnapshot, relativeTime } from "@/lib/owner-chat-data";
import type { OwnerDirectory } from "@/lib/owner-chat-data";
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
  type Slice,
} from "@/components/special/kit";

const NAV: NavItem[] = [
  { label: "Overview", icon: "dashboard", slug: "overview" },
  { label: "Directory", icon: "users", slug: "directory" },
  { label: "Capabilities", icon: "target", slug: "capabilities" },
  { label: "Audit Trail", icon: "clock", slug: "audit" },
  { label: "Chat with AI Agent", icon: "chat", slug: "chat" },
];

const PAGE_SIZE = 12;

/** A glyph beside every status word — status is never carried by color alone. */
const STATUS_GLYPH: Record<string, string> = {
  green: "●",
  amber: "◐",
  red: "▲",
  blue: "○",
  purple: "◆",
  cyan: "◇",
};

function tallyBy(dir: OwnerDirectory, pick: (r: OwnerDirectory["rows"][number]) => string): Slice[] {
  const map = new Map<string, number>();
  for (const r of dir.rows) map.set(pick(r), (map.get(pick(r)) ?? 0) + 1);
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .map((r, i) => ({ ...r, color: SERIES[i % SERIES.length] }));
}

export default function OwnerChatDirectoryPage({ params }: { params: Promise<{ platform: string }> }) {
  const platform = usePlatformParam(params);
  const s = useOwnerChatSnapshot(platform);
  const label = platformLabel(platform);

  const [tabKey, setTabKey] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);

  const active: OwnerDirectory | null =
    s.directories.find((d) => d.key === tabKey) ?? s.directories[0] ?? null;

  const filtered = useMemo(() => {
    if (!active) return [];
    const q = query.trim().toLowerCase();
    return active.rows.filter((r) => {
      if (status !== "ALL" && r.status !== status) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        (r.handle ?? "").toLowerCase().includes(q) ||
        r.group.toLowerCase().includes(q)
      );
    });
  }, [active, query, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const statusSlices = active ? tallyBy(active, (r) => r.statusLabel) : [];
  const groupSlices = active ? tallyBy(active, (r) => r.group).slice(0, 8) : [];

  function switchTab(key: string) {
    setTabKey(key);
    setPage(1);
    setStatus("ALL");
    setQuery("");
  }

  const loadedDirs = s.directories.filter((d) => d.loaded);
  const failedDirs = s.directories.filter((d) => !d.loaded);

  return (
    <SpecialShell
      platform={platform}
      agentLabel="Owner Chat Agent"
      tagline="Orchestration workspace"
      basePath="/owner-chat-agent-special"
      nav={NAV}
      headerIcon="users"
      assistantBlurb="These are the real rosters my tools read. I can look anyone up — I do not change anything from this page."
      title="Directory"
      subtitle={`The people Owner Chat can reach on ${label}`}
      actions={
        <Pill tone={s.loading ? "amber" : failedDirs.length === s.directories.length && s.directories.length > 0 ? "red" : failedDirs.length > 0 ? "amber" : "green"}>
          <Icon name={s.loading ? "clock" : failedDirs.length > 0 ? "alert" : "check"} size={12} />
          {s.loading
            ? "Loading rosters"
            : s.directories.length === 0
              ? "No rosters"
              : failedDirs.length === 0
                ? `${loadedDirs.length} roster${loadedDirs.length === 1 ? "" : "s"} loaded`
                : `${failedDirs.length} of ${s.directories.length} rosters failed`}
        </Pill>
      }
    >
      <style>{OWNER_DIR_CSS}</style>

      {s.error && <ErrorNote error={s.error} platform={platform} />}

      {!s.loading && failedDirs.length > 0 && loadedDirs.length > 0 && (
        <div className="cs-owner-partial">
          <Icon name="alert" size={15} />
          <div>
            <b>Partial directory.</b>
            <span>
              {failedDirs.map((d) => `${d.label} (${d.route})`).join(" and ")} did not load. Only {loadedDirs.map((d) => d.label).join(" and ")} can be
              spoken for here — treat totals as covering that alone.
            </span>
          </div>
        </div>
      )}

      <div className="cs-stats">
        {s.directories.map((d) => (
          <StatCard
            key={`${d.key}-total`}
            label={`${d.label} — server total`}
            value={d.loaded ? (d.serverTotal === null ? "Not reported" : d.serverTotal.toLocaleString()) : "—"}
            sub={d.loaded ? `${d.route} · ${d.fetched.toLocaleString()} rows pulled here` : (d.error ?? "Did not load this session")}
            tone={d.loaded ? "purple" : "red"}
            icon={d.loaded ? "users" : "alert"}
          />
        ))}
        {s.loading && (
          <>
            <StatCard label="Loading…" value="—" sub="Reading the live rosters" tone="purple" icon="clock" />
            <StatCard label="Loading…" value="—" sub="Reading the live rosters" tone="blue" icon="clock" />
          </>
        )}
      </div>

      <div className="cs-row-2">
        <Card title={active ? `${active.label} by Status` : "Status Mix"}>
          {s.loading ? (
            <Empty>Loading the roster…</Empty>
          ) : !active ? (
            <Empty>No roster is available for {label}.</Empty>
          ) : !active.loaded ? (
            <Empty>{active.error ?? `${active.label} did not load.`} No status mix can be shown or assessed.</Empty>
          ) : statusSlices.length === 0 ? (
            <Empty>{active.route} returned no rows — genuinely empty, not a failed read.</Empty>
          ) : (
            <>
              <div className="cs-owner-donut-wrap">
                <Donut data={statusSlices} centerLabel="rows" />
                <Legend data={statusSlices} />
              </div>
              <p className="cs-owner-note">Counted over the {active.fetched.toLocaleString()} rows fetched here, not the whole server-side roster.</p>
            </>
          )}
        </Card>

        <Card title={active ? `Top ${active.groupLabel}` : "Groups"}>
          {s.loading ? (
            <Empty>Loading the roster…</Empty>
          ) : !active ? (
            <Empty>No roster is available for {label}.</Empty>
          ) : !active.loaded ? (
            <Empty>{active.error ?? `${active.label} did not load.`} No ranking can be shown.</Empty>
          ) : groupSlices.length === 0 ? (
            <Empty>No rows to rank — the roster came back empty.</Empty>
          ) : (
            <>
              <BarRows rows={groupSlices} />
              <Legend data={groupSlices} showPct={false} />
              <p className="cs-owner-note">Ranked by row count across the fetched page.</p>
            </>
          )}
        </Card>
      </div>

      <Card
        title="Roster"
        pad={false}
        action={<span style={{ fontSize: 11, color: "#69738c" }}>{active ? active.route : "—"}</span>}
      >
        <div className="cs-owner-controls">
          <div className="cs-tabs" style={{ border: 0, flex: 1, minWidth: 220 }}>
            {s.directories.map((d) => (
              <button
                key={d.key}
                type="button"
                className={active?.key === d.key ? "cs-tab active" : "cs-tab"}
                onClick={() => switchTab(d.key)}
              >
                {d.loaded ? "" : "▲ "}
                {d.label}
              </button>
            ))}
            {s.directories.length === 0 && <span className="cs-owner-note">No rosters</span>}
          </div>

          <select
            className="cs-btn"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by status"
            disabled={!active || !active.loaded}
          >
            <option value="ALL">All statuses</option>
            {(active?.statuses ?? []).map((st) => (
              <option key={st} value={st}>
                {st.replace(/_/g, " ")}
              </option>
            ))}
          </select>

          <label className="cs-search">
            <Icon name="search" size={14} />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search name, contact or group…"
              aria-label="Search the roster"
              disabled={!active || !active.loaded}
            />
          </label>
        </div>

        <div className="cs-table-wrap">
          <table className="cs-table">
            <thead>
              <tr>
                <th style={{ paddingLeft: 19 }}>Name</th>
                <th>Contact</th>
                <th>Status</th>
                <th>{active?.groupLabel ?? "Group"}</th>
                <th className="cs-num">{active?.metricLabel ?? "—"}</th>
                <th className="cs-num" style={{ paddingRight: 19 }}>Joined</th>
              </tr>
            </thead>
            <tbody>
              {s.loading && (
                <tr><td colSpan={6} style={{ padding: 19 }}><Empty>Loading the live roster…</Empty></td></tr>
              )}
              {!s.loading && !active && (
                <tr><td colSpan={6} style={{ padding: 19 }}><Empty>{label} exposes no roster to this workspace.</Empty></td></tr>
              )}
              {!s.loading && active && !active.loaded && (
                <tr><td colSpan={6} style={{ padding: 19 }}><Empty>{active.error ?? `${active.label} did not load.`} Nothing can be listed or assessed here.</Empty></td></tr>
              )}
              {!s.loading && active && active.loaded && visible.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: 19 }}>
                    <Empty>
                      {active.rows.length === 0
                        ? `${active.route} returned no rows — a genuinely empty roster.`
                        : "No rows match this search and filter."}
                    </Empty>
                  </td>
                </tr>
              )}
              {visible.map((r) => (
                <tr key={r.id}>
                  <td style={{ paddingLeft: 19, maxWidth: 280 }}>
                    <div className="cs-owner-name">{r.name}</div>
                    <div className="cs-owner-sub">{r.id.slice(0, 12)}</div>
                  </td>
                  <td style={{ color: "#4c5470" }}>{r.handle ?? "—"}</td>
                  <td>
                    <Pill tone={r.statusTone}>
                      {STATUS_GLYPH[r.statusTone] ?? "○"} {r.statusLabel}
                    </Pill>
                  </td>
                  <td style={{ color: "#4c5470" }}>{r.group}</td>
                  <td className="cs-num" style={{ color: "#4c5470" }}>
                    {active?.metricLabel === null || r.metric === null ? "—" : r.metric.toLocaleString()}
                  </td>
                  <td className="cs-num" style={{ paddingRight: 19, color: "#69738c", whiteSpace: "nowrap" }}>
                    {r.createdAt ? relativeTime(r.createdAt) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {active && active.loaded && filtered.length > 0 && (
          <div className="cs-owner-pager">
            <span>
              {filtered.length.toLocaleString()} of {active.fetched.toLocaleString()} fetched rows · page {current} of {totalPages}
            </span>
            <div>
              <button type="button" className="cs-btn" onClick={() => setPage(Math.max(1, current - 1))} disabled={current === 1} aria-label="Previous page">
                <Icon name="back" size={13} />Prev
              </button>
              <button type="button" className="cs-btn" onClick={() => setPage(Math.min(totalPages, current + 1))} disabled={current === totalPages} aria-label="Next page">
                Next<Icon name="arrow" size={13} />
              </button>
            </div>
          </div>
        )}
      </Card>

      <Card title="Coverage">
        <p className="cs-owner-prov-line">{s.coverageNote || "Loading…"}</p>
        <p className="cs-owner-prov-line">
          <b>Read-only.</b> This page browses the rosters. The member and provider writes Owner Chat holds are documented on the
          Capabilities page and are not wired into this workspace.
        </p>
      </Card>
    </SpecialShell>
  );
}

const OWNER_DIR_CSS = `
.cs-owner-partial{display:flex;gap:10px;align-items:flex-start;border:1px solid #f2dfb4;background:#fffaf0;border-radius:12px;padding:12px 14px;margin-bottom:16px;color:#7a5410}
.cs-owner-partial b{display:block;font-size:12.5px;margin-bottom:3px}
.cs-owner-partial span{font-size:11.5px;line-height:18px;color:#8a6520}
.cs-owner-donut-wrap{display:flex;gap:18px;align-items:center;flex-wrap:wrap}
.cs-owner-note{margin:12px 0 0;font-size:10.5px;line-height:17px;color:#8891a8}
.cs-owner-controls{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:14px 19px;border-bottom:1px solid #eef0f5}
.cs-owner-name{font-size:12.5px;font-weight:660;color:#11162d}
.cs-owner-sub{font-size:10.5px;color:#8891a8;margin-top:2px;font-variant-numeric:tabular-nums}
.cs-owner-pager{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 19px;border-top:1px solid #eef0f5}
.cs-owner-pager span{font-size:11px;color:#69738c}
.cs-owner-pager div{display:flex;gap:7px}
.cs-owner-prov-line{margin:0 0 9px;font-size:11.5px;line-height:19px;color:#4c5470}
.cs-owner-prov-line:last-child{margin-bottom:0}
.cs-owner-prov-line b{color:#11162d}
`;
