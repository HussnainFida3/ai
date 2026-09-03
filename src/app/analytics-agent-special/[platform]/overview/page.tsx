"use client";

/**
 * Analytics Agent — Overview.
 *
 * Every figure comes from `useAnalyticsSnapshot`, which reads GhrFix's
 * /ai-agents/analytics/summary + /trend + /breakdown, or ShadiLife's
 * POST /ai-agents/analytics/insights. Where a platform genuinely does not
 * measure something the tile reads "Not tracked" and names the platform —
 * a zero here would be a claim, not a gap.
 */

import { useAnalyticsSnapshot, formatMetric } from "@/lib/analytics-data";
import type { AnalyticsSnapshot } from "@/lib/analytics-data";
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
  ScoreRing,
  SERIES,
  SpecialShell,
  StatCard,
  TrendChart,
  TONE,
  type NavItem,
} from "@/components/special/kit";

const NAV: NavItem[] = [
  { label: "Overview", icon: "dashboard", slug: "overview" },
  { label: "Breakdown", icon: "tag", slug: "breakdown" },
  { label: "Trends", icon: "trend", slug: "trends" },
  { label: "Chat with AI Agent", icon: "chat", slug: "chat" },
];

export default function AnalyticsOverviewPage({ params }: { params: Promise<{ platform: string }> }) {
  const platform = usePlatformParam(params);
  const a = useAnalyticsSnapshot(platform);
  const label = platformLabel(platform);

  /* The first two dimensions the backend actually returned become the two
     donuts; the next two become the ranked bar lists. Colors are assigned in
     fixed SERIES order and every chart carries its own direct labels. */
  const donutDims = a.dimensions.slice(0, 2);
  const barDims = a.dimensions.slice(2, 4);

  const ring = a.headlineRate;
  const ringColor = ring.value === null ? "#94a3b8" : ring.value >= 66 ? "#4ade80" : ring.value >= 33 ? "#fbbf24" : "#e04452";

  const measured = a.metrics.filter((m) => m.value !== null).length;

  return (
    <SpecialShell
      platform={platform}
      agentLabel="Analytics Agent"
      tagline="Analytics workspace"
      basePath="/analytics-agent-special"
      nav={NAV}
      headerIcon="dashboard"
      assistantBlurb="I read the live analytics snapshot and only report what the backend actually measures."
      title="Analytics Overview"
      subtitle={a.domain}
      actions={
        <Pill tone={a.error ? "red" : a.loading ? "amber" : "green"}>
          <Icon name={a.error ? "alert" : a.loading ? "clock" : "check"} size={12} />
          {a.error ? "Snapshot failed" : a.loading ? "Loading snapshot" : `${measured} of ${a.metrics.length} metrics measured`}
        </Pill>
      }
    >
      {a.error && <ErrorNote error={a.error} platform={platform} />}

      <div className="cs-stats">
        {a.metrics.map((m) => (
          <StatCard
            key={m.key}
            label={m.label}
            value={a.loading ? "—" : a.error ? "—" : formatMetric(m)}
            sub={a.error ? "Could not be read this session" : m.note}
            tone={m.tone}
            icon={m.icon}
            spark={m.spark ?? undefined}
          />
        ))}
      </div>

      <div className="cs-row-2">
        <Card
          title={a.series ? "Activity Trend" : "Time Series"}
          action={<span style={{ fontSize: 11, color: "#94a3b8" }}>{a.series ? a.series.granularity : "None returned"}</span>}
        >
          {a.loading ? (
            <Empty>Loading live snapshot…</Empty>
          ) : a.error ? (
            <Empty>The snapshot did not load, so no trend can be shown or assessed.</Empty>
          ) : a.series ? (
            <TrendChart
              labels={a.series.labels}
              series={a.series.series.map((s, i) => ({ name: s.name, data: s.data, color: SERIES[i] }))}
            />
          ) : (
            <Empty>{a.seriesNote}</Empty>
          )}
        </Card>

        <Card title={ring.label}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <ScoreRing
              value={a.loading || ring.value === null ? 0 : Math.round(ring.value)}
              max={ring.max}
              label={ring.value === null ? "Not tracked" : "%"}
              color={ringColor}
            />
            <p style={{ margin: 0, fontSize: 11.5, lineHeight: "19px", color: "#cbd5e1", textAlign: "center" }}>
              {a.error
                ? `Could not be computed — the ${label} snapshot failed to load.`
                : ring.value === null
                  ? `${label} did not return the figures this rate is computed from.`
                  : ring.note}
            </p>
          </div>
        </Card>
      </div>

      <div className="cs-row-half">
        {donutDims.map((d) => (
          <Card key={d.key} title={d.title} action={<span style={{ fontSize: 11, color: "#94a3b8" }}>{d.total.toLocaleString()} {d.unit}</span>}>
            <div className="cs-donut-row">
              <Donut data={d.rows} center={d.total.toLocaleString()} centerLabel={d.unit} />
              <Legend data={d.rows} />
            </div>
            <p className="cs-analytics-note">{d.note}</p>
          </Card>
        ))}
        {!a.loading && !a.error && donutDims.length === 0 && (
          <Card title="Distributions">
            <Empty>{`${label} returned no categorical breakdowns in this snapshot.`}</Empty>
          </Card>
        )}
        {a.loading && (
          <Card title="Distributions">
            <Empty>Loading live snapshot…</Empty>
          </Card>
        )}
        {a.error && (
          <Card title="Distributions">
            <Empty>The snapshot failed, so the distribution mix cannot be assessed.</Empty>
          </Card>
        )}
      </div>

      <div className="cs-row-3">
        {barDims.map((d, i) => (
          <Card key={d.key} title={d.title}>
            {a.loading ? (
              <Empty>Loading…</Empty>
            ) : (
              <>
                <BarRows rows={d.rows.slice(0, 7).map((r) => ({ ...r, color: SERIES[i + 2] }))} colored suffix="" />
                <p className="cs-analytics-note">{d.note}</p>
              </>
            )}
          </Card>
        ))}

        <Card title="Computed Rates">
          {a.loading ? (
            <Empty>Loading…</Empty>
          ) : a.error ? (
            <Empty>Rates are arithmetic over the snapshot — none can be computed while it is unavailable.</Empty>
          ) : (
            <div className="cs-analytics-rates">
              {a.rates.map((r) => (
                <div className="cs-analytics-rate" key={r.label}>
                  <div className="cs-analytics-rate-head">
                    <span>{r.label}</span>
                    <b className="cs-num">{r.value === null ? "Not tracked" : r.value.toLocaleString()}</b>
                  </div>
                  <p>{r.value === null ? `${label} did not return the inputs for this.` : r.note}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Agent Insights">
          {a.loading ? (
            <Empty>Loading…</Empty>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
              {buildInsights(a, label).map((i) => (
                <div key={i.text} style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
                  <span
                    style={{
                      width: 29, height: 29, borderRadius: 9, flex: "0 0 auto", display: "grid", placeItems: "center",
                      background: TONE[i.tone].bg, color: TONE[i.tone].fg,
                    }}
                  >
                    <Icon name={i.icon} size={15} />
                  </span>
                  <p style={{ margin: 0, fontSize: 11.5, lineHeight: "19px", color: "#cbd5e1" }}>{i.text}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {a.recent.length > 0 && (
        <Card title="Most Recent Records" action={<span style={{ fontSize: 11, color: "#94a3b8" }}>From the snapshot's own recent list</span>} pad={false}>
          <div className="cs-table-wrap">
            <table className="cs-table">
              <thead>
                <tr>
                  <th style={{ paddingLeft: 19 }}>Record</th>
                  <th>Details</th>
                  <th>Status</th>
                  <th className="cs-num" style={{ paddingRight: 19 }}>Created</th>
                </tr>
              </thead>
              <tbody>
                {a.recent.map((r) => (
                  <tr key={r.id}>
                    <td style={{ paddingLeft: 19 }}><span className="title">{r.title}</span></td>
                    <td style={{ color: "#cbd5e1" }}>{r.sub}</td>
                    <td>
                      <Pill tone={r.status === "COMPLETED" ? "green" : r.status === "CANCELLED" ? "red" : "amber"}>
                        <Icon name={r.status === "COMPLETED" ? "check" : r.status === "CANCELLED" ? "alert" : "clock"} size={12} />
                        {r.status}
                      </Pill>
                    </td>
                    <td className="cs-num" style={{ paddingRight: 19, color: "#94a3b8" }}>
                      {r.when ? new Date(r.when).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <style>{OVERVIEW_CSS}</style>
    </SpecialShell>
  );
}

/** Statements about the loaded snapshot — never a claim the data can't support. */
function buildInsights(a: AnalyticsSnapshot, label: string): Array<{ icon: string; tone: keyof typeof TONE; text: string }> {
  if (a.error) {
    return [{ icon: "alert", tone: "red", text: `The ${label} analytics snapshot failed to load, so nothing about this platform's health can be assessed right now.` }];
  }
  if (a.isEmpty) {
    return [{ icon: "alert", tone: "amber", text: `The ${label} snapshot loaded successfully but contained no countable figures yet.` }];
  }

  const out: Array<{ icon: string; tone: keyof typeof TONE; text: string }> = [];

  const topDim = a.dimensions.find((d) => d.rows.length > 1);
  if (topDim) {
    const top = topDim.rows[0];
    const pct = topDim.total > 0 ? Math.round((top.value / topDim.total) * 100) : 0;
    out.push({ icon: "tag", tone: "purple", text: `“${top.label}” leads ${topDim.title.toLowerCase()} with ${top.value.toLocaleString()} ${topDim.unit} — ${pct}% of that cut.` });
  }

  const concentrated = a.dimensions.find((d) => d.rows.length > 2 && d.total > 0 && d.rows[0].value / d.total > 0.5);
  if (concentrated) {
    out.push({ icon: "alert", tone: "amber", text: `${concentrated.title} is concentrated: one entry alone holds over half of all ${concentrated.unit}.` });
  }

  const measuredRate = a.rates.find((r) => r.value !== null);
  if (measuredRate) {
    out.push({ icon: "target", tone: "blue", text: `${measuredRate.label} currently sits at ${measuredRate.value}.` });
  }

  const untracked = a.metrics.filter((m) => m.value === null);
  if (untracked.length > 0) {
    out.push({ icon: "eye", tone: "cyan", text: `${label} does not report ${untracked.map((m) => m.label.toLowerCase()).join(", ")} — those tiles stay blank rather than showing zero.` });
  }

  if (!a.series) {
    out.push({ icon: "clock", tone: "amber", text: `No bucketed time series is available for ${label}, so trend direction cannot be charted.` });
  }

  return out.slice(0, 4);
}

/* Page-local styles only. Every selector is `cs-analytics-*` prefixed so
   nothing escapes this page onto the other special workspaces. */
const OVERVIEW_CSS = `
.cs-analytics-note{margin:12px 0 0;font-size:10.5px;line-height:17px;color:#94a3b8}
.cs-analytics-rates{display:flex;flex-direction:column;gap:11px}
.cs-analytics-rate-head{display:flex;justify-content:space-between;gap:10px;align-items:baseline;font-size:11.5px}
.cs-analytics-rate-head span{color:#cbd5e1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cs-analytics-rate-head b{font-weight:730;white-space:nowrap}
.cs-analytics-rate p{margin:3px 0 0;font-size:10.5px;line-height:16px;color:#94a3b8}
`;
