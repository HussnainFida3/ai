"use client";

/**
 * Analytics Agent — Breakdown.
 *
 * Every dimensional cut the backend genuinely returns, side by side: GhrFix's
 * status counters plus its city / service-category groupBys, ShadiLife's
 * funnel, membership standing and sect / age / city / gender distributions.
 * The cuts are not hardcoded — the page renders whatever `useAnalyticsSnapshot`
 * found, and says so plainly when a platform returned none.
 */

import { useMemo, useState } from "react";
import { useAnalyticsSnapshot } from "@/lib/analytics-data";
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
  { label: "Breakdown", icon: "tag", slug: "breakdown" },
  { label: "Trends", icon: "trend", slug: "trends" },
  { label: "Chat with AI Agent", icon: "chat", slug: "chat" },
];

type SortKey = "value" | "label" | "share";

export default function AnalyticsBreakdownPage({ params }: { params: Promise<{ platform: string }> }) {
  const platform = usePlatformParam(params);
  const a = useAnalyticsSnapshot(platform);
  const label = platformLabel(platform);

  const [tab, setTab] = useState("All cuts");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("value");
  const [desc, setDesc] = useState(true);

  const tabs = useMemo(() => ["All cuts", ...a.dimensions.map((d) => d.title)], [a.dimensions]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = a.tableRows.filter((r) => {
      if (tab !== "All cuts" && r.dimension !== tab) return false;
      if (q && !`${r.label} ${r.dimension}`.toLowerCase().includes(q)) return false;
      return true;
    });
    const dir = desc ? -1 : 1;
    return [...filtered].sort((x, y) => {
      if (sort === "label") return dir * y.label.localeCompare(x.label);
      if (sort === "share") return dir * (x.sharePct - y.sharePct);
      return dir * (x.value - y.value);
    });
  }, [a.tableRows, tab, search, sort, desc]);

  function toggleSort(key: SortKey) {
    if (key === sort) setDesc((d) => !d);
    else {
      setSort(key);
      setDesc(true);
    }
  }

  const widest = a.dimensions.reduce<number>((m, d) => Math.max(m, d.rows.length), 0);
  const largestCut = [...a.dimensions].sort((x, y) => y.total - x.total)[0] ?? null;

  return (
    <SpecialShell
      platform={platform}
      agentLabel="Analytics Agent"
      tagline="Analytics workspace"
      basePath="/analytics-agent-special"
      nav={NAV}
      headerIcon="tag"
      assistantBlurb="Ask me why one city, category or segment is pulling ahead of the others."
      title="Breakdown"
      subtitle={`Every dimensional cut ${label} returns`}
      actions={
        <Pill tone={a.error ? "red" : a.loading ? "amber" : "green"}>
          <Icon name={a.error ? "alert" : a.loading ? "clock" : "check"} size={12} />
          {a.error ? "Snapshot failed" : a.loading ? "Loading" : `${a.dimensions.length} cuts available`}
        </Pill>
      }
    >
      {a.error && <ErrorNote error={a.error} platform={platform} />}

      <div className="cs-stats">
        <StatCard label="Dimensions" value={a.loading || a.error ? "—" : a.dimensions.length.toLocaleString()} sub="Distinct cuts returned by the backend" tone="purple" icon="tag" />
        <StatCard label="Segments" value={a.loading || a.error ? "—" : a.tableRows.length.toLocaleString()} sub="Individual labelled rows across all cuts" tone="blue" icon="dashboard" />
        <StatCard label="Widest Cut" value={a.loading || a.error ? "—" : widest.toLocaleString()} sub="Labels in the most granular dimension" tone="cyan" icon="search" />
        <StatCard
          label="Largest Cut"
          value={a.loading || a.error ? "—" : largestCut ? largestCut.total.toLocaleString() : "—"}
          sub={largestCut && !a.error ? `${largestCut.title} (${largestCut.unit})` : "Nothing counted yet"}
          tone="green"
          icon="trend"
        />
        <StatCard
          label="Matching Filters"
          value={a.loading || a.error ? "—" : rows.length.toLocaleString()}
          sub={tab === "All cuts" ? "No cut filter applied" : `Filtered to ${tab}`}
          tone="amber"
          icon="target"
        />
      </div>

      {a.loading && <Card title="Distributions"><Empty>Loading the live snapshot…</Empty></Card>}

      {!a.loading && a.error && (
        <Card title="Distributions">
          <Empty>The {label} snapshot failed to load. No breakdown can be shown, and no claim about the distribution can be made until it does.</Empty>
        </Card>
      )}

      {!a.loading && !a.error && a.dimensions.length === 0 && (
        <Card title="Distributions">
          <Empty>The snapshot loaded, but {label} returned no categorical breakdowns at all.</Empty>
        </Card>
      )}

      {!a.loading && !a.error && a.dimensions.length > 0 && (
        <>
          <div className="cs-row-half">
            {a.dimensions.slice(0, 4).map((d) => (
              <Card key={d.key} title={d.title} action={<span style={{ fontSize: 11, color: "#94a3b8" }}>{d.rows.length} segments</span>}>
                <div className="cs-donut-row">
                  <Donut data={d.rows.slice(0, 6)} center={d.total.toLocaleString()} centerLabel={d.unit} />
                  <Legend data={d.rows.slice(0, 6)} />
                </div>
                <p className="cs-analytics-note">{d.note}</p>
              </Card>
            ))}
          </div>

          <div className="cs-row-half">
            {a.dimensions.map((d, i) => (
              <Card key={`bars-${d.key}`} title={`${d.title} — ranked`}>
                <BarRows rows={d.rows.slice(0, 8).map((r) => ({ ...r, color: SERIES[i % SERIES.length] }))} colored />
                <p className="cs-analytics-note">
                  Top {Math.min(8, d.rows.length)} of {d.rows.length}, counted in {d.unit}.
                </p>
              </Card>
            ))}
          </div>
        </>
      )}

      <Card pad={false}>
        <div className="cs-analytics-toolbar">
          <div className="cs-tabs" style={{ border: 0, flex: 1, minWidth: 240 }}>
            {tabs.map((t) => (
              <button key={t} type="button" className={tab === t ? "cs-tab active" : "cs-tab"} onClick={() => setTab(t)}>
                {t}
              </button>
            ))}
          </div>
          <div className="cs-search">
            <Icon name="search" size={15} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search segments…"
              aria-label="Search breakdown segments"
            />
          </div>
        </div>

        <div className="cs-table-wrap">
          <table className="cs-table">
            <thead>
              <tr>
                <th style={{ paddingLeft: 19 }}>
                  <button type="button" className="cs-analytics-sort" onClick={() => toggleSort("label")} aria-label="Sort by segment name">
                    Segment {sort === "label" ? (desc ? "▼" : "▲") : ""}
                  </button>
                </th>
                <th>Dimension</th>
                <th>Rank</th>
                <th className="cs-num">
                  <button type="button" className="cs-analytics-sort" onClick={() => toggleSort("value")} aria-label="Sort by count">
                    Count {sort === "value" ? (desc ? "▼" : "▲") : ""}
                  </button>
                </th>
                <th className="cs-num" style={{ paddingRight: 19 }}>
                  <button type="button" className="cs-analytics-sort" onClick={() => toggleSort("share")} aria-label="Sort by share of cut">
                    Share {sort === "share" ? (desc ? "▼" : "▲") : ""}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {a.loading && <tr><td colSpan={5} style={{ padding: 19 }}><Empty>Loading live snapshot…</Empty></td></tr>}
              {!a.loading && a.error && (
                <tr><td colSpan={5} style={{ padding: 19 }}><Empty>Table unavailable — the snapshot request failed.</Empty></td></tr>
              )}
              {!a.loading && !a.error && rows.length === 0 && (
                <tr><td colSpan={5} style={{ padding: 19 }}><Empty>No segments match this filter.</Empty></td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={{ paddingLeft: 19 }}>
                    <div className="title">{r.label}</div>
                    <div className="sub">{r.unit}</div>
                  </td>
                  <td style={{ color: "#cbd5e1" }}>{r.dimension}</td>
                  <td>
                    <Pill tone={r.rank === 1 ? "green" : r.rank <= 3 ? "blue" : "purple"}>
                      <Icon name={r.rank === 1 ? "trend" : "tag"} size={12} />
                      {r.rank === 1 ? "Top" : `#${r.rank}`}
                    </Pill>
                  </td>
                  <td className="cs-num">{r.value.toLocaleString()}</td>
                  <td className="cs-num" style={{ paddingRight: 19, color: "#94a3b8" }}>{r.sharePct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <style>{BREAKDOWN_CSS}</style>
    </SpecialShell>
  );
}

/* Page-local styles only, all `cs-analytics-*` prefixed. */
const BREAKDOWN_CSS = `
.cs-analytics-note{margin:12px 0 0;font-size:10.5px;line-height:17px;color:#94a3b8}
.cs-analytics-toolbar{display:flex;align-items:center;gap:12px;padding:14px 19px 0;flex-wrap:wrap}
.cs-analytics-sort{border:0;background:none;padding:0;font:inherit;font-size:10.5px;font-weight:650;color:#94a3b8}
.cs-analytics-sort:hover{color:#7c3aed}
`;
