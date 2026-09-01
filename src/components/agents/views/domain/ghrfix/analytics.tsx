"use client";

/**
 * GhrFix — Analytics Agent → Breakdown.
 *
 * The full city/category breakdown from `/breakdown` at real size (not the
 * Dashboard's condensed pair), plus the real, searchable, filterable and
 * paginated booking board from `/admin/bookings` — the same monitoring table
 * GhrFix's own admin panel uses, not a five-row sample off the overview
 * report.
 */

import { useState } from "react";
import Link from "next/link";
import { AgentSidePanel, BarList, DonutChart, InsightsPanel, MetricCard, Svg } from "@/components/agents/rich";
import { Icons } from "@/components/agents/icons";
import { apiFetch, type Paginated } from "@/lib/api";
import type { AgentViewProps } from "../../registry";
import { Empty, ErrorNote, Panel, Pill, TableWrap, num, share, shortDate, useLoad } from "../../ghrfix/_kit-core";

interface Breakdown {
  byCity: Array<{ city: string; count: number }>;
  byCategory: Array<{ category: string; bookings: number }>;
}

interface BookingRow {
  id: string;
  bookingNumber: string;
  status: string;
  createdAt: string;
  customer: { id: string; name: string | null; phone: string | null } | null;
  category: { name: string } | null;
  provider: { id: string; user: { name: string | null } | null } | null;
}

const STATUSES = ["ALL", "REQUESTED", "ASSIGNED", "ON_THE_WAY", "IN_PROGRESS", "QUOTED", "COMPLETED", "CANCELLED"] as const;
type Status = (typeof STATUSES)[number];
const STATUS_TONE: Record<string, "green" | "amber" | "red" | "mute"> = {
  COMPLETED: "green",
  CANCELLED: "red",
  REQUESTED: "mute",
  ASSIGNED: "amber",
  ON_THE_WAY: "amber",
  IN_PROGRESS: "amber",
  QUOTED: "amber",
};
const PAGE_SIZE = 12;

export default function AnalyticsBreakdownView({ platform, agent, api }: AgentViewProps) {
  const [status, setStatus] = useState<Status>("ALL");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const breakdownLoad = useLoad(async () => {
    const { data } = await api.get<Breakdown>("/breakdown");
    return data;
  }, [platform.key]);

  const boardLoad = useLoad(async () => {
    const { data, meta } = await apiFetch<BookingRow[], Paginated>(platform.key, "/admin/bookings", {
      query: { status: status === "ALL" ? undefined : status, search: search || undefined, page, pageSize: PAGE_SIZE },
    });
    return { items: data, meta };
  }, [platform.key, status, search, page]);

  const b = breakdownLoad.data;
  const cityRows = b?.byCity.map((c) => ({ label: c.city, value: c.count })) ?? [];
  const citySum = cityRows.reduce((a, r) => a + r.value, 0);
  const categoryRows = b?.byCategory.map((c) => ({ label: c.category, value: c.bookings })) ?? [];
  const topCity = b && b.byCity.length > 0 ? b.byCity[0] : null;
  const topCategory = b && b.byCategory.length > 0 ? b.byCategory[0] : null;
  const cityShare = topCity ? share(topCity.count, citySum) : null;

  return (
    <>
      {breakdownLoad.error && <ErrorNote error={breakdownLoad.error} hint={`This page reads ${platform.apiBase}${agent.base}/breakdown. Connect ${platform.label} first if this persists.`} />}

      <div className="ag-metrics">
        <MetricCard icon={<Svg path={Icons.compass} size={24} />} tone="blue" title="Cities tracked" value={breakdownLoad.loading ? "—" : num(b?.byCity.length)} />
        <MetricCard icon={<Svg path={Icons.stack} size={24} />} tone="purple" title="Categories tracked" value={breakdownLoad.loading ? "—" : num(b?.byCategory.length)} />
        <MetricCard icon={<Svg path={Icons.target} size={24} />} tone="gold" title="Leading city" value={breakdownLoad.loading ? "—" : topCity ? topCity.city : "—"} />
        <MetricCard icon={<Svg path={Icons.crown} size={24} />} tone="pink" title="Leading category" value={breakdownLoad.loading ? "—" : topCategory ? topCategory.category : "—"} />
      </div>

      <div className="ag-duo">
        <Panel title="Users by city — full breakdown" sub="Live groupBy over every user's profile city">
          {cityRows.length > 0 ? (
            <DonutChart data={cityRows} total={citySum} totalLabel="Users" size={190} />
          ) : (
            <Empty>{breakdownLoad.loading ? "Loading…" : "No city data recorded yet."}</Empty>
          )}
        </Panel>
        <Panel title="Bookings by category — full breakdown" sub="Every tracked category, ranked">
          <BarList rows={categoryRows} ranked color={agent.accent} emptyText={breakdownLoad.loading ? "Loading…" : "No bookings recorded yet."} />
        </Panel>
      </div>

      <div className="ag-stack">
        <Panel
          title="Booking board"
          sub={boardLoad.data?.meta ? `${boardLoad.data.meta.total.toLocaleString()} booking${boardLoad.data.meta.total === 1 ? "" : "s"} — page ${boardLoad.data.meta.page} of ${Math.max(1, boardLoad.data.meta.totalPages)}` : "The real admin monitoring board, searchable and paginated"}
          noBody
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, padding: "14px 20px 0" }}>
            <form style={{ display: "flex", gap: 8, flex: 1, minWidth: 200 }} onSubmit={(e) => { e.preventDefault(); setPage(1); setSearch(query.trim()); }}>
              <div className="ag-field" style={{ flex: 1, minWidth: 0 }}>
                <input placeholder="Search booking #, customer name or phone…" value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
              <button type="submit" className="ag-btn ag-btn-ghost ag-btn-sm">Search</button>
            </form>
            <div className="ag-tabs" style={{ flexWrap: "wrap" }}>
              {STATUSES.map((s) => (
                <button key={s} type="button" className={`ag-tab ${status === s ? "active" : ""}`} onClick={() => { setStatus(s); setPage(1); }}>
                  {s === "ALL" ? "All" : s.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>

          <TableWrap>
            <table className="ag-table">
              <thead>
                <tr>
                  <th>Booking</th>
                  <th>Customer</th>
                  <th>Category</th>
                  <th>Provider</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {(boardLoad.data?.items ?? []).map((row) => (
                  <tr key={row.id}>
                    <td style={{ fontWeight: 650, whiteSpace: "nowrap" }}>{row.bookingNumber}</td>
                    <td>{row.customer?.name ?? row.customer?.phone ?? "—"}</td>
                    <td>{row.category?.name ?? "—"}</td>
                    <td>{row.provider?.user?.name ?? "Unassigned"}</td>
                    <td><Pill text={row.status} tone={STATUS_TONE[row.status] ?? "mute"} /></td>
                    <td style={{ whiteSpace: "nowrap", color: "var(--ag-ink-faint)" }}>{shortDate(row.createdAt)}</td>
                  </tr>
                ))}
                {(!boardLoad.data || boardLoad.data.items.length === 0) && (
                  <tr>
                    <td colSpan={6}><Empty>{boardLoad.loading ? "Loading bookings…" : "No bookings match this search."}</Empty></td>
                  </tr>
                )}
              </tbody>
            </table>
          </TableWrap>

          {boardLoad.data?.meta && boardLoad.data.meta.total > 0 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderTop: "1px solid var(--ag-border-soft)" }}>
              <span style={{ fontSize: 11, color: "var(--ag-ink-faint)" }}>
                Page {boardLoad.data.meta.page} of {Math.max(1, boardLoad.data.meta.totalPages)} · {boardLoad.data.meta.total.toLocaleString()} total
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
                <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" disabled={page >= boardLoad.data.meta.totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
              </div>
            </div>
          )}
        </Panel>
      </div>

      <div className="ag-duo">
        <AgentSidePanel
          agentLabel={`${platform.label} — ${agent.name}`}
          greeting="Every booking, filterable"
          blurb="City and category breakdowns at full size, plus the real admin booking board — searchable by number, customer name or phone."
          todayStats={[
            { label: "Leading city share", value: cityShare === null ? "—" : `${cityShare}%`, icon: <Svg path={Icons.compass} size={17} />, tone: "blue" },
            { label: "Cities tracked", value: breakdownLoad.loading ? "—" : num(b?.byCity.length), icon: <Svg path={Icons.stack} size={17} />, tone: "purple" },
            { label: "Board results", value: boardLoad.loading ? "—" : num(boardLoad.data?.meta.total), icon: <Svg path={Icons.filter} size={17} />, tone: "gold" },
          ]}
        />

        <InsightsPanel
          rows={[
            {
              icon: <Svg path={Icons.compass} size={15} />,
              label: "City concentration",
              value: topCity && cityShare !== null ? `${topCity.city} accounts for ${cityShare}% of ${citySum} users with a known city.` : "No city data recorded yet.",
            },
            {
              icon: <Svg path={Icons.target} size={15} />,
              label: "Category leader",
              value: topCategory ? `${topCategory.category} leads with ${num(topCategory.bookings)} bookings.` : "No category data yet.",
            },
            {
              icon: <Svg path={Icons.dashboard} size={15} />,
              label: "Need the trend chart?",
              value: (
                <>
                  The 14-day booking trend and headline metrics live on the{" "}
                  <Link href={`/${platform.key}/${agent.key}`} style={{ color: "var(--ag-accent)", fontWeight: 650 }}>Dashboard</Link> tab.
                </>
              ),
            },
          ]}
        />
      </div>
    </>
  );
}
