"use client";

/**
 * Support Agent — Performance.
 *
 * How the queue is actually being worked: resolution rate, throughput over
 * time, per-category resolution, and period-over-period movement. Every
 * figure comes from `useSupportSnapshot`, which derives them from the real
 * ticket rows rather than from any summary endpoint.
 *
 * Two things this page deliberately does NOT show. Neither backend records a
 * first-response or time-to-resolution metric, so instead of inventing one it
 * states that plainly (`snapshot.timingNote`). And when the fetch fails it
 * says the queue could not be assessed — an unreachable queue is not a
 * perfectly-performing one.
 */

import { usePlatformParam, platformLabel } from "@/lib/agent-data";
import { useSupportSnapshot } from "@/lib/support-data";
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
  { label: "Tickets", icon: "posts", slug: "tickets" },
  { label: "Escalations", icon: "alert", slug: "escalations" },
  { label: "Performance", icon: "trend", slug: "performance" },
  { label: "Chat with AI Agent", icon: "chat", slug: "chat" },
];

export default function SupportPerformancePage({ params }: { params: Promise<{ platform: string }> }) {
  const platform = usePlatformParam(params);
  const s = useSupportSnapshot(platform);
  const label = platformLabel(platform);

  const rate = s.resolutionRate;
  const ringColor = rate.value === null ? "#69738c" : rate.value >= 70 ? "#0f9e69" : rate.value >= 40 ? "#c9860f" : "#e04452";

  /* Per-category resolution, ranked worst-first so the weak spots lead. */
  const worstCategories = [...s.categoryResolution]
    .filter((c) => c.total > 0)
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 8);

  return (
    <SpecialShell
      platform={platform}
      agentLabel="Support Agent"
      tagline="Support workspace"
      basePath="/support-agent-special"
      nav={NAV}
      headerIcon="trend"
      assistantBlurb="I read the live support queue and only report what the backend actually measures."
      title="Performance"
      subtitle={`How the ${label} support queue is being worked`}
      actions={s.error ? <Pill tone="red"><Icon name="alert" size={12} />Snapshot failed</Pill> : undefined}
    >
      {s.error && <ErrorNote error={s.error} platform={platform} />}

      {/* Period movement — real counts for each window the hook could build. */}
      <div className="cs-stats">
        <StatCard
          label="Resolution Rate"
          value={s.loading ? "—" : rate.value === null ? "Not tracked" : `${rate.value}%`}
          sub={s.error ? "Could not be computed this session" : rate.note}
          tone="green"
          icon="check"
        />
        {s.periods.slice(0, 4).map((p) => (
          <StatCard
            key={p.label}
            label={p.label}
            value={s.loading ? "—" : p.current === null ? "Not tracked" : p.current.toLocaleString()}
            sub={
              s.error ? (
                "Could not be read this session"
              ) : p.deltaPct === null ? (
                p.note
              ) : (
                <>
                  <span className={p.deltaPct >= 0 ? "up" : "down"}>
                    {p.deltaPct >= 0 ? "↑" : "↓"} {Math.abs(p.deltaPct)}%
                  </span>{" "}
                  vs previous
                </>
              )
            }
            tone="purple"
            icon="trend"
          />
        ))}
      </div>

      <div className="cs-row-2">
        <Card
          title="Throughput"
          action={<span style={{ fontSize: 11, color: "#69738c" }}>{s.series ? s.series.granularity : "None available"}</span>}
        >
          {s.loading ? (
            <Empty>Loading live queue…</Empty>
          ) : s.error ? (
            <Empty>The snapshot did not load, so no throughput can be shown or assessed.</Empty>
          ) : !s.series ? (
            <Empty>{s.seriesNote}</Empty>
          ) : (
            <TrendChart
              labels={s.series.labels}
              series={s.series.series.map((x, i) => ({ ...x, color: SERIES[i % SERIES.length] }))}
            />
          )}
        </Card>

        <Card title="Resolution Rate">
          {s.loading ? (
            <Empty>Loading…</Empty>
          ) : s.error ? (
            <Empty>Could not be computed — the {label} snapshot failed to load.</Empty>
          ) : rate.value === null ? (
            <Empty>{rate.note}</Empty>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
                <ScoreRing value={rate.value} max={rate.max} label="% resolved" color={ringColor} />
              </div>
              <p style={{ margin: 0, fontSize: 11.5, lineHeight: "19px", color: "#69738c", textAlign: "center" }}>
                {rate.note}
              </p>
            </>
          )}
        </Card>
      </div>

      <div className="cs-row-2">
        <Card title="Resolution by Category" action={<span style={{ fontSize: 11, color: "#69738c" }}>Weakest first</span>}>
          {s.loading ? (
            <Empty>Loading…</Empty>
          ) : s.error ? (
            <Empty>Could not be assessed — the snapshot failed.</Empty>
          ) : worstCategories.length === 0 ? (
            <Empty>No category carries enough rows to compute a resolution rate.</Empty>
          ) : (
            <BarRows
              rows={worstCategories.map((c, i) => ({ label: c.label, value: c.pct, color: SERIES[i % SERIES.length] }))}
              suffix="%"
            />
          )}
        </Card>

        <Card title="Queue Age">
          {s.loading ? (
            <Empty>Loading…</Empty>
          ) : s.error ? (
            <Empty>Could not be assessed — the snapshot failed.</Empty>
          ) : s.ageBuckets.rows.length === 0 ? (
            <Empty>{s.ageBuckets.note}</Empty>
          ) : (
            <div className="cs-donut-row">
              <Donut
                data={s.ageBuckets.rows.map((r, i) => ({ ...r, color: SERIES[i % SERIES.length] }))}
                center={s.ageBuckets.total.toLocaleString()}
                centerLabel={s.ageBuckets.unit}
              />
              <Legend data={s.ageBuckets.rows.map((r, i) => ({ ...r, color: SERIES[i % SERIES.length] }))} />
            </div>
          )}
        </Card>
      </div>

      {/* Computed rates — arithmetic over the loaded rows, nothing inferred. */}
      <div className="cs-row-2">
        <Card title="Computed Rates">
          {s.loading ? (
            <Empty>Loading…</Empty>
          ) : s.error ? (
            <Empty>Rates are arithmetic over the snapshot — none can be computed while it is unavailable.</Empty>
          ) : s.rates.length === 0 ? (
            <Empty>No rate can be computed from what this platform returned.</Empty>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
              {s.rates.map((r) => (
                <div key={r.label} style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "baseline" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 640, color: "#11162d" }}>{r.label}</div>
                    <div style={{ fontSize: 10.5, color: "#69738c", marginTop: 2 }}>{r.note}</div>
                  </div>
                  <strong className="cs-num" style={{ fontSize: 17, fontWeight: 780, letterSpacing: "-0.4px", whiteSpace: "nowrap" }}>
                    {r.value === null ? "—" : `${r.value}%`}
                  </strong>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Period Comparison" pad={false}>
          <div className="cs-table-wrap">
            <table className="cs-table">
              <thead>
                <tr>
                  <th style={{ paddingLeft: 19 }}>Window</th>
                  <th className="cs-num">Current</th>
                  <th className="cs-num">Previous</th>
                  <th style={{ paddingRight: 19 }}>Change</th>
                </tr>
              </thead>
              <tbody>
                {s.loading && <tr><td colSpan={4} style={{ padding: 19 }}><Empty>Loading…</Empty></td></tr>}
                {!s.loading && s.error && (
                  <tr><td colSpan={4} style={{ padding: 19 }}><Empty>No periods could be read this session.</Empty></td></tr>
                )}
                {!s.loading && !s.error && s.periods.length === 0 && (
                  <tr><td colSpan={4} style={{ padding: 19 }}><Empty>This platform returns no timestamps to build periods from.</Empty></td></tr>
                )}
                {!s.loading && !s.error && s.periods.map((p) => (
                  <tr key={p.label}>
                    <td style={{ paddingLeft: 19 }}>
                      <div className="title">{p.label}</div>
                      <div className="sub">{p.note}</div>
                    </td>
                    <td className="cs-num">{p.current === null ? "—" : p.current.toLocaleString()}</td>
                    <td className="cs-num" style={{ color: "#69738c" }}>{p.previous === null ? "—" : p.previous.toLocaleString()}</td>
                    <td style={{ paddingRight: 19 }}>
                      {p.deltaPct === null ? (
                        <span style={{ color: "#69738c", fontSize: 11.5 }}>—</span>
                      ) : (
                        <Pill tone={p.deltaPct >= 0 ? "green" : "red"}>
                          <Icon name={p.deltaPct >= 0 ? "trend" : "alert"} size={12} />
                          {p.deltaPct >= 0 ? "Up" : "Down"} {Math.abs(p.deltaPct)}%
                        </Pill>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Provenance and the honest gap — stated, never filled with invented numbers. */}
      <Card title="What These Numbers Are">
        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          <Note icon="posts" tone="purple">{s.sourceNote}</Note>
          <Note icon="users" tone="blue">{s.coverageNote}</Note>
          <Note icon="clock" tone="amber">{s.timingNote}</Note>
          {s.metrics.filter((m) => m.value === null).length > 0 && (
            <Note icon="alert" tone="red">
              {label} does not record: {s.metrics.filter((m) => m.value === null).map((m) => m.label).join(", ")}. Those
              tiles read “Not tracked” rather than zero.
            </Note>
          )}
        </div>
      </Card>
    </SpecialShell>
  );
}

function Note({ icon, tone, children }: { icon: string; tone: keyof typeof TONE; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
      <span
        style={{
          width: 28, height: 28, borderRadius: 9, flex: "0 0 auto", display: "grid", placeItems: "center",
          background: TONE[tone].bg, color: TONE[tone].fg,
        }}
      >
        <Icon name={icon} size={14} />
      </span>
      <p style={{ margin: 0, fontSize: 11.5, lineHeight: "19px", color: "#4c5470" }}>{children}</p>
    </div>
  );
}
