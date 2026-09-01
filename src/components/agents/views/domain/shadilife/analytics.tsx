"use client";

/**
 * ShadiLife — Analytics Agent — Breakdown (domain tab).
 *
 * Real endpoint behind this page:
 *   POST /api/ai-agents/analytics/insights → { snapshot, insights }
 *
 * The Dashboard tab keeps the headline metrics and AI narration; this page
 * is the deep dive into the three real breakdowns the snapshot returns
 * (age, city, sect) plus the engagement funnel — with a segmented switcher,
 * a searchable city table and per-bucket gender split that didn't fit on
 * the Dashboard. Owns its own snapshot run, independent of the Dashboard's.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { AgentHeading } from "@/components/agents/AgentShell";
import { BarList, DonutChart, MetricCard, Svg } from "@/components/agents/rich";
import { Icons } from "@/components/agents/icons";
import type { AgentViewProps } from "../../registry";
import { Empty, ErrorPanel, Panel, StatRow, TableScroll, describeError, fmtInt, fmtPct, n0 } from "../../shadilife/_shadilife-console-kit";

interface AgeBucket {
  range: string;
  male: number;
  female: number;
}
interface Snapshot {
  totalUsers?: number;
  totalViews?: number;
  totalInterests?: number;
  totalMessages?: number;
  totalMatches?: number;
  verifiedCount?: number;
  premiumUsers?: number;
  premiumConversionPct?: number;
  engagement?: { viewsToInterestsPct?: number; matchesPerHundredInterests?: number; avgMessagesPerMatch?: number };
  newUsersLast30d?: number;
  newUsersPrev30d?: number;
  growth30dPct?: number | null;
  sectDistribution?: { sect: string; count: number }[];
  topCities?: { city: string | null; count: number }[];
  ageDistribution?: AgeBucket[];
}

type Lens = "age" | "cities" | "sect";

export default function ShadiLifeAnalyticsBreakdownView({ platform, agent, api }: AgentViewProps) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lens, setLens] = useState<Lens>("cities");
  const [citySearch, setCitySearch] = useState("");

  function runSnapshot() {
    setLoading(true);
    setError(null);
    api
      .post<{ snapshot?: Snapshot; insights?: string }>("/insights")
      .then(({ data }) => setSnapshot(data?.snapshot ?? {}))
      .catch((e: unknown) => setError(describeError(e, platform)))
      .finally(() => setLoading(false));
  }

  const hasRun = snapshot !== null;

  const sectRows = useMemo(() => (snapshot?.sectDistribution ?? []).map((s) => ({ label: s.sect, value: n0(s.count) })), [snapshot]);
  const cityRows = useMemo(() => (snapshot?.topCities ?? []).map((c) => ({ label: c.city ?? "Unspecified", value: n0(c.count) })), [snapshot]);
  const ageRows = useMemo(() => (snapshot?.ageDistribution ?? []).map((a) => ({ label: a.range, value: n0(a.male) + n0(a.female) })), [snapshot]);

  const totalMembers = useMemo(() => cityRows.reduce((s, c) => s + c.value, 0), [cityRows]);
  const filteredCities = useMemo(() => {
    const q = citySearch.trim().toLowerCase();
    const sorted = [...cityRows].sort((a, b) => b.value - a.value);
    return q ? sorted.filter((c) => c.label.toLowerCase().includes(q)) : sorted;
  }, [cityRows, citySearch]);

  const genderTotals = useMemo(() => {
    const buckets = snapshot?.ageDistribution ?? [];
    return { male: buckets.reduce((s, b) => s + n0(b.male), 0), female: buckets.reduce((s, b) => s + n0(b.female), 0) };
  }, [snapshot]);

  return (
    <>
      <AgentHeading
        platform={platform}
        agent={agent}
        blurb="The three real demographic breakdowns the snapshot returns — age, city and sect — plus the engagement funnel, switchable and searchable."
        actions={
          <>
            <button type="button" className="ag-btn ag-btn-solid" onClick={runSnapshot} disabled={loading}>
              <Svg path={Icons.filter} size={14} /> {loading ? "Analyzing…" : hasRun ? "Re-run snapshot" : "Run breakdown snapshot"}
            </button>
            <Link href={`/${platform.key}/${agent.key}`} className="ag-btn ag-btn-ghost">← Dashboard</Link>
          </>
        }
      />

      {error && <ErrorPanel message={error} platform={platform} what="The analytics breakdown" />}

      <div className="ag-metrics">
        <MetricCard icon={<Svg path={Icons.users} size={24} />} tone="purple" title="Members covered" value={hasRun ? fmtInt(totalMembers) : "—"} />
        <MetricCard icon={<Svg path={Icons.compass} size={24} />} tone="blue" title="Cities represented" value={hasRun ? fmtInt(cityRows.length) : "—"} />
        <MetricCard icon={<Svg path={Icons.heart} size={24} />} tone="pink" title="Sects represented" value={hasRun ? fmtInt(sectRows.length) : "—"} />
        <MetricCard icon={<Svg path={Icons.gauge} size={24} />} tone="green" title="Views → interests" value={hasRun ? fmtPct(snapshot?.engagement?.viewsToInterestsPct) : "—"} />
        <MetricCard icon={<Svg path={Icons.stack} size={24} />} tone="gold" title="Matches / 100 interests" value={hasRun ? fmtInt(snapshot?.engagement?.matchesPerHundredInterests) : "—"} />
      </div>

      <div className="ag-split">
        <div className="ag-stack">
          <Panel
            title="Breakdown"
            sub="Switch between the three real demographic slices"
            actions={
              <div style={{ display: "flex", gap: 6 }}>
                {(["cities", "age", "sect"] as Lens[]).map((l) => (
                  <button
                    key={l}
                    type="button"
                    className={`ag-btn ag-btn-sm ${lens === l ? "ag-btn-solid" : "ag-btn-ghost"}`}
                    onClick={() => setLens(l)}
                  >
                    {l === "cities" ? "Cities" : l === "age" ? "Age" : "Sect"}
                  </button>
                ))}
              </div>
            }
            flush
          >
            {!hasRun ? (
              <div style={{ padding: 20 }}>
                <Empty>{loading ? "Crunching demographic data…" : "Run the snapshot above to populate this breakdown."}</Empty>
              </div>
            ) : lens === "cities" ? (
              <>
                <div style={{ padding: "16px 20px 0" }}>
                  <input
                    value={citySearch}
                    onChange={(e) => setCitySearch(e.target.value)}
                    placeholder="Search a city…"
                    style={{ width: "100%", maxWidth: 280 }}
                  />
                </div>
                <TableScroll>
                  <table className="ag-table">
                    <thead>
                      <tr><th>City</th><th style={{ textAlign: "right" }}>Members</th><th style={{ textAlign: "right" }}>Share</th></tr>
                    </thead>
                    <tbody>
                      {filteredCities.map((c) => (
                        <tr key={c.label}>
                          <td style={{ fontWeight: 650 }}>{c.label}</td>
                          <td style={{ textAlign: "right" }}>{fmtInt(c.value)}</td>
                          <td style={{ textAlign: "right", color: "var(--ag-ink-faint)" }}>{fmtPct(totalMembers > 0 ? (c.value / totalMembers) * 100 : 0)}</td>
                        </tr>
                      ))}
                      {filteredCities.length === 0 && (
                        <tr><td colSpan={3} style={{ padding: 20 }}><Empty>No city matches “{citySearch}”.</Empty></td></tr>
                      )}
                    </tbody>
                  </table>
                </TableScroll>
              </>
            ) : lens === "age" ? (
              <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 18 }}>
                <BarList rows={ageRows} color={agent.accent} emptyText="No age data returned." />
                <TableScroll>
                  <table className="ag-table">
                    <thead>
                      <tr><th>Bucket</th><th style={{ textAlign: "right" }}>Male</th><th style={{ textAlign: "right" }}>Female</th><th style={{ textAlign: "right" }}>Total</th></tr>
                    </thead>
                    <tbody>
                      {(snapshot?.ageDistribution ?? []).map((a) => (
                        <tr key={a.range}>
                          <td style={{ fontWeight: 650 }}>{a.range}</td>
                          <td style={{ textAlign: "right" }}>{fmtInt(a.male)}</td>
                          <td style={{ textAlign: "right" }}>{fmtInt(a.female)}</td>
                          <td style={{ textAlign: "right", fontWeight: 650 }}>{fmtInt(n0(a.male) + n0(a.female))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableScroll>
              </div>
            ) : (
              <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 18 }}>
                <DonutChart data={sectRows} totalLabel="Profiles" />
                <TableScroll>
                  <table className="ag-table">
                    <thead>
                      <tr><th>Sect</th><th style={{ textAlign: "right" }}>Members</th><th style={{ textAlign: "right" }}>Share</th></tr>
                    </thead>
                    <tbody>
                      {sectRows.map((s) => {
                        const sum = sectRows.reduce((a, b) => a + b.value, 0);
                        return (
                          <tr key={s.label}>
                            <td style={{ fontWeight: 650 }}>{s.label}</td>
                            <td style={{ textAlign: "right" }}>{fmtInt(s.value)}</td>
                            <td style={{ textAlign: "right", color: "var(--ag-ink-faint)" }}>{fmtPct(sum > 0 ? (s.value / sum) * 100 : 0)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </TableScroll>
              </div>
            )}
          </Panel>
        </div>

        <div className="ag-stack">
          <Panel title="Gender split" sub="Across all audited age buckets">
            {genderTotals.male + genderTotals.female > 0 ? (
              <DonutChart data={[{ label: "Male", value: genderTotals.male, color: "#3b82f6" }, { label: "Female", value: genderTotals.female, color: "#ec4899" }]} totalLabel="Members" />
            ) : (
              <Empty>{loading ? "Loading…" : "Run the snapshot to populate this."}</Empty>
            )}
          </Panel>

          <Panel title="Engagement funnel" sub="Real ratios — matches and messages are independent totals, not downstream of interests">
            {hasRun ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
                <StatRow label="Views → interests" value={fmtPct(snapshot?.engagement?.viewsToInterestsPct)} />
                <StatRow label="Matches per 100 interests" value={fmtInt(snapshot?.engagement?.matchesPerHundredInterests)} />
                <StatRow label="Avg. messages per match" value={snapshot?.engagement?.avgMessagesPerMatch ?? "—"} />
                <StatRow label="New members (30d)" value={fmtInt(snapshot?.newUsersLast30d)} hint={`vs ${fmtInt(snapshot?.newUsersPrev30d)} the 30 before`} />
              </div>
            ) : (
              <Empty>Run the snapshot to populate this.</Empty>
            )}
          </Panel>

          {hasRun && cityRows.length > 0 && (
            <Panel title="Top 5 cities" sub="Quick reference — full list is in the table on the left">
              <BarList rows={[...cityRows].sort((a, b) => b.value - a.value).slice(0, 5)} ranked color="#38bdf8" emptyText="No data." />
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
