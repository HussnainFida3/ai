"use client";

/**
 * Analytics Agent — Trends.
 *
 * GhrFix's /ai-agents/analytics/trend returns 14 real daily buckets, so this
 * page charts them directly and compares the second week against the first.
 * ShadiLife's snapshot returns aggregate totals plus one 30-day growth pair
 * and no bucketed series at all — so nothing is drawn there. The page says
 * so, and shows the period pair and the aggregates that *are* real instead.
 */

import { useAnalyticsSnapshot, formatMetric } from "@/lib/analytics-data";
import { usePlatformParam, platformLabel } from "@/lib/agent-data";
import {
  BarRows,
  Card,
  Empty,
  ErrorNote,
  Icon,
  Pill,
  SERIES,
  Sparkline,
  SpecialShell,
  StatCard,
  TrendChart,
  type NavItem,
} from "@/components/special/kit";

const NAV: NavItem[] = [
  { label: "Overview", icon: "dashboard", slug: "overview" },
  { label: "Breakdown", icon: "tag", slug: "breakdown" },
  { label: "Trends", icon: "trend", slug: "trends" },
  { label: "Chat with AI Agent", icon: "chat", slug: "chat" },
];

export default function AnalyticsTrendsPage({ params }: { params: Promise<{ platform: string }> }) {
  const platform = usePlatformParam(params);
  const a = useAnalyticsSnapshot(platform);
  const label = platformLabel(platform);

  const series = a.series;
  const hasSeries = series !== null && !a.error;

  return (
    <SpecialShell
      platform={platform}
      agentLabel="Analytics Agent"
      tagline="Analytics workspace"
      basePath="/analytics-agent-special"
      nav={NAV}
      headerIcon="trend"
      assistantBlurb="I can only chart movement a backend actually buckets over time — I will not invent a line."
      title="Trends"
      subtitle={hasSeries ? series.granularity : "Period comparison and aggregates"}
      actions={
        <Pill tone={a.error ? "red" : a.loading ? "amber" : hasSeries ? "green" : "amber"}>
          <Icon name={a.error ? "alert" : a.loading ? "clock" : hasSeries ? "check" : "eye"} size={12} />
          {a.error ? "Snapshot failed" : a.loading ? "Loading" : hasSeries ? "Time series available" : "No time series"}
        </Pill>
      }
    >
      {a.error && <ErrorNote error={a.error} platform={platform} />}

      {/* Period deltas as stat cards — one per comparable metric the backend returns. */}
      <div className="cs-stats">
        {a.periods.map((p, i) => (
          <StatCard
            key={p.label}
            label={p.label}
            value={a.loading || a.error || p.current === null ? "—" : p.current.toLocaleString()}
            sub={
              a.error ? (
                "Not readable this session"
              ) : p.deltaPct === null ? (
                p.note
              ) : (
                <>
                  <span className={p.deltaPct >= 0 ? "up" : "down"}>
                    {p.deltaPct >= 0 ? "↑" : "↓"} {Math.abs(p.deltaPct)}%
                  </span>{" "}
                  vs previous period
                </>
              )
            }
            tone={p.deltaPct === null ? "purple" : p.deltaPct >= 0 ? "green" : "red"}
            icon="trend"
            spark={series?.series[i]?.data ?? undefined}
          />
        ))}
        {!a.loading && !a.error && a.periods.length === 0 && (
          <StatCard label="Period Comparison" value="Not available" sub={`${label} returns no comparable period pair.`} tone="amber" icon="clock" />
        )}
        {(a.loading || a.error) && a.periods.length === 0 && (
          <StatCard label="Period Comparison" value="—" sub={a.error ? "Snapshot failed to load" : "Loading…"} tone="purple" icon="clock" />
        )}
      </div>

      <Card
        title="Time Series"
        action={<span style={{ fontSize: 11, color: "#69738c" }}>{hasSeries ? series.granularity : "None returned"}</span>}
      >
        {a.loading ? (
          <Empty>Loading live snapshot…</Empty>
        ) : a.error ? (
          <Empty>The snapshot request failed, so no movement over time can be shown or assessed.</Empty>
        ) : hasSeries ? (
          <TrendChart
            labels={series.labels}
            series={series.series.map((s, i) => ({ name: s.name, data: s.data, color: SERIES[i] }))}
          />
        ) : (
          <div className="cs-analytics-noseries">
            <span className="cs-analytics-noseries-icon"><Icon name="alert" size={16} /></span>
            <div>
              <b>No trend line can be drawn for {label}.</b>
              <p>{a.seriesNote}</p>
              <p>Everything below is what this platform genuinely measures instead.</p>
            </div>
          </div>
        )}
      </Card>

      <div className="cs-row-2">
        <Card title="Per-Metric Movement" pad={false}>
          <div className="cs-table-wrap">
            <table className="cs-table">
              <thead>
                <tr>
                  <th style={{ paddingLeft: 19 }}>Metric</th>
                  <th>Shape</th>
                  <th className="cs-num">Peak</th>
                  <th className="cs-num">Latest</th>
                  <th className="cs-num" style={{ paddingRight: 19 }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {a.loading && <tr><td colSpan={5} style={{ padding: 19 }}><Empty>Loading…</Empty></td></tr>}
                {!a.loading && a.error && (
                  <tr><td colSpan={5} style={{ padding: 19 }}><Empty>Unavailable — the snapshot failed to load.</Empty></td></tr>
                )}
                {!a.loading && !a.error && !hasSeries && (
                  <tr>
                    <td colSpan={5} style={{ padding: 19 }}>
                      <Empty>Sparklines need bucketed data. {label} returns none, so none are drawn.</Empty>
                    </td>
                  </tr>
                )}
                {hasSeries &&
                  series.series.map((s, i) => (
                    <tr key={s.name}>
                      <td style={{ paddingLeft: 19 }}><span className="title">{s.name}</span></td>
                      <td style={{ width: 190 }}>
                        <Sparkline data={s.data} color={SERIES[i]} />
                      </td>
                      <td className="cs-num">{Math.max(...s.data).toLocaleString()}</td>
                      <td className="cs-num">{(s.data.at(-1) ?? 0).toLocaleString()}</td>
                      <td className="cs-num" style={{ paddingRight: 19 }}>
                        {s.data.reduce((x, y) => x + y, 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Aggregates Behind the Trend">
          {a.loading ? (
            <Empty>Loading…</Empty>
          ) : a.error ? (
            <Empty>No aggregates were returned this session.</Empty>
          ) : (
            <div className="cs-analytics-facts">
              {a.metrics.map((m) => (
                <div className="cs-analytics-fact" key={m.key}>
                  <span>{m.label}</span>
                  <b className="cs-num">{formatMetric(m)}</b>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="cs-row-2">
        <Card title="Period Comparison" pad={false}>
          <div className="cs-table-wrap">
            <table className="cs-table">
              <thead>
                <tr>
                  <th style={{ paddingLeft: 19 }}>Metric</th>
                  <th className="cs-num">Previous</th>
                  <th className="cs-num">Current</th>
                  <th className="cs-num">Change</th>
                  <th style={{ paddingRight: 19 }}>Direction</th>
                </tr>
              </thead>
              <tbody>
                {a.loading && <tr><td colSpan={5} style={{ padding: 19 }}><Empty>Loading…</Empty></td></tr>}
                {!a.loading && a.error && (
                  <tr><td colSpan={5} style={{ padding: 19 }}><Empty>Cannot compare periods — the snapshot failed.</Empty></td></tr>
                )}
                {!a.loading && !a.error && a.periods.length === 0 && (
                  <tr><td colSpan={5} style={{ padding: 19 }}><Empty>{label} returns no two comparable periods.</Empty></td></tr>
                )}
                {!a.error &&
                  a.periods.map((p) => (
                    <tr key={p.label}>
                      <td style={{ paddingLeft: 19 }}>
                        <div className="title">{p.label}</div>
                        <div className="sub">{p.note}</div>
                      </td>
                      <td className="cs-num">{p.previous === null ? "—" : p.previous.toLocaleString()}</td>
                      <td className="cs-num">{p.current === null ? "—" : p.current.toLocaleString()}</td>
                      <td className="cs-num">{p.deltaPct === null ? "—" : `${p.deltaPct}%`}</td>
                      <td style={{ paddingRight: 19 }}>
                        {p.deltaPct === null ? (
                          <Pill tone="purple"><Icon name="eye" size={12} />Not comparable</Pill>
                        ) : (
                          <Pill tone={p.deltaPct >= 0 ? "green" : "red"}>
                            <Icon name={p.deltaPct >= 0 ? "trend" : "alert"} size={12} />
                            {p.deltaPct >= 0 ? "Up" : "Down"}
                          </Pill>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Largest Segments Right Now">
          {a.loading ? (
            <Empty>Loading…</Empty>
          ) : a.error ? (
            <Empty>Unavailable while the snapshot is failing.</Empty>
          ) : a.dimensions.length === 0 ? (
            <Empty>{label} returned no segments to rank.</Empty>
          ) : (
            <>
              <BarRows
                rows={a.tableRows
                  .slice()
                  .sort((x, y) => y.value - x.value)
                  .slice(0, 8)
                  .map((r, i) => ({ label: `${r.label} · ${r.dimension}`, value: r.value, color: SERIES[i % SERIES.length] }))}
                colored
              />
              <p className="cs-analytics-note">
                Ranked across every cut at once — a point-in-time standing, not a movement over time.
              </p>
            </>
          )}
        </Card>
      </div>

      <style>{TRENDS_CSS}</style>
    </SpecialShell>
  );
}

/* Page-local styles only, all `cs-analytics-*` prefixed. */
const TRENDS_CSS = `
.cs-analytics-note{margin:12px 0 0;font-size:10.5px;line-height:17px;color:#8891a8}
.cs-analytics-facts{display:flex;flex-direction:column;gap:2px}
.cs-analytics-fact{display:flex;justify-content:space-between;gap:12px;align-items:baseline;font-size:11.5px;padding:7px 0;border-bottom:1px solid #f4f5f9}
.cs-analytics-fact span{color:#4c5470;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cs-analytics-fact b{font-weight:730;white-space:nowrap}
.cs-analytics-noseries{display:flex;gap:11px;align-items:flex-start;border:1px solid #f2e3c6;background:#fffaf0;border-radius:11px;padding:13px 15px}
.cs-analytics-noseries-icon{width:28px;height:28px;border-radius:8px;background:#fdf0d8;color:#c9860f;display:grid;place-items:center;flex:0 0 auto}
.cs-analytics-noseries b{display:block;font-size:12.5px;color:#8a5b06}
.cs-analytics-noseries p{margin:4px 0 0;font-size:11.5px;line-height:19px;color:#4c5470}
`;
