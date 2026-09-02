"use client";

/**
 * Owner Chat Agent — Overview.
 *
 * The whole picture the agent itself reasons over: six headline tiles, the
 * real time series each platform genuinely returns (GhrFix's 14-day booking
 * trend, ShadiLife's registration trend), two donuts, a score ring on a rate
 * that is actually meaningful, two ranked bar lists and a computed insights
 * panel. Every number comes from `useOwnerChatSnapshot` — a tile reads
 * "Not tracked" rather than 0 where a platform does not measure something,
 * and a failed source is named rather than shown as an empty success.
 */

import { useOwnerChatSnapshot, formatOwnerMetric } from "@/lib/owner-chat-data";
import type { OwnerChatSnapshot, OwnerDimension } from "@/lib/owner-chat-data";
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

/** Slices carry SERIES colors in fixed index order so a category never shifts hue. */
function slices(d: OwnerDimension, offset = 0): Slice[] {
  return d.rows.map((r, i) => ({ label: r.label, value: r.value, color: SERIES[(i + offset) % SERIES.length] }));
}

export default function OwnerChatOverviewPage({ params }: { params: Promise<{ platform: string }> }) {
  const platform = usePlatformParam(params);
  const s = useOwnerChatSnapshot(platform);
  const label = platformLabel(platform);

  const donutDims = s.dimensions.slice(0, 2);
  const barDims = s.dimensions.slice(2, 4);

  const ring = s.headlineRate;
  const ringColor = ring.value === null ? "#69738c" : ring.value >= 66 ? "#0f9e69" : ring.value >= 33 ? "#c9860f" : "#e04452";

  const measured = s.metrics.filter((m) => m.value !== null).length;

  return (
    <SpecialShell
      platform={platform}
      agentLabel="Owner Chat Agent"
      tagline="Orchestration workspace"
      basePath="/owner-chat-agent-special"
      nav={NAV}
      headerIcon="dashboard"
      assistantBlurb="I read the live platform through real admin routes. Every figure here is fetched, never estimated."
      title="Owner Chat Overview"
      subtitle={`Everything the orchestration agent can see on ${label}`}
      actions={
        <Pill tone={s.error ? "red" : s.loading ? "amber" : s.partial ? "amber" : "green"}>
          <Icon name={s.error ? "alert" : s.loading ? "clock" : s.partial ? "alert" : "check"} size={12} />
          {s.error
            ? "Nothing loaded"
            : s.loading
              ? "Loading snapshot"
              : s.partial
                ? `${s.failures.length} source${s.failures.length === 1 ? "" : "s"} failed`
                : `${measured} of ${s.metrics.length} metrics measured`}
        </Pill>
      }
    >
      <style>{OWNER_OVERVIEW_CSS}</style>

      {s.error && <ErrorNote error={s.error} platform={platform} />}

      {!s.loading && s.partial && (
        <div className="cs-owner-partial">
          <Icon name="alert" size={15} />
          <div>
            <b>This is a partial picture of {label}.</b>
            <span>These sources did not load, so anything they feed is missing rather than empty: {s.failures.join("; ")}.</span>
          </div>
        </div>
      )}

      <div className="cs-stats">
        {(s.loading ? PLACEHOLDER_KEYS : s.metrics.map((m) => m.key)).map((key, i) => {
          const m = s.metrics[i];
          if (s.loading || !m) {
            return <StatCard key={key} label="Loading…" value="—" sub="Reading the live platform" tone="purple" icon="clock" />;
          }
          return (
            <StatCard
              key={m.key}
              label={m.label}
              value={formatOwnerMetric(m)}
              sub={m.note}
              tone={m.tone}
              icon={m.icon}
            />
          );
        })}
      </div>

      <div className="cs-row-2">
        <Card
          title={s.series ? "Live Trend" : "Time Series"}
          action={<span style={{ fontSize: 11, color: "#69738c" }}>{s.series ? s.series.granularity : "None returned"}</span>}
        >
          {s.loading ? (
            <Empty>Loading the live series…</Empty>
          ) : s.series ? (
            <TrendChart
              labels={s.series.labels}
              series={s.series.series.map((x, i) => ({ name: x.name, data: x.data, color: SERIES[i] }))}
            />
          ) : (
            <Empty>{s.seriesNote}</Empty>
          )}
        </Card>

        <Card title={ring.label}>
          <div className="cs-owner-ring">
            <ScoreRing
              value={ring.value === null ? 0 : ring.value}
              max={ring.max}
              label={ring.value === null ? "Not tracked" : "%"}
              color={ringColor}
            />
            <p>{s.loading ? "Reading the live platform…" : ring.note}</p>
          </div>
        </Card>
      </div>

      <div className="cs-donut-row">
        {(s.loading ? [] : donutDims).map((d, di) => (
          <Card key={d.key} title={d.title}>
            {d.failed ? (
              <Empty>{d.note}</Empty>
            ) : d.rows.length === 0 ? (
              <Empty>{label} returned this breakdown with nothing in it — a genuine empty result, not a failed read.</Empty>
            ) : (
              <>
                <div className="cs-owner-donut-wrap">
                  <Donut data={slices(d, di * 2)} centerLabel={d.unit} />
                  <Legend data={slices(d, di * 2)} />
                </div>
                <p className="cs-owner-note">{d.note}</p>
              </>
            )}
          </Card>
        ))}
        {s.loading && (
          <Card title="Breakdowns">
            <Empty>Loading breakdowns…</Empty>
          </Card>
        )}
      </div>

      <div className="cs-row-2">
        {(s.loading ? [] : barDims).map((d, di) => (
          <Card key={d.key} title={d.title}>
            {d.failed ? (
              <Empty>{d.note}</Empty>
            ) : d.rows.length === 0 ? (
              <Empty>{label} returned no rows here — genuinely empty, not a failed read.</Empty>
            ) : (
              <>
                <BarRows rows={slices(d, di * 2 + 1)} />
                <Legend data={slices(d, di * 2 + 1)} showPct={false} />
                <p className="cs-owner-note">{d.note}</p>
              </>
            )}
          </Card>
        ))}
        {s.loading && (
          <Card title="Rankings">
            <Empty>Loading rankings…</Empty>
          </Card>
        )}
      </div>

      <div className="cs-row-2">
        <Card title="What the Data Says">
          {s.loading ? (
            <Empty>Computing insights from live data…</Empty>
          ) : s.error ? (
            <Empty>Nothing loaded, so no insight can be drawn and no health can be claimed.</Empty>
          ) : (
            <ul className="cs-owner-insights">
              {insights(s, label).map((line, i) => (
                <li key={i}>
                  <Icon name="sparkle" size={13} />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Agent Runtime">
          {s.loading ? (
            <Empty>Loading runtime counters…</Empty>
          ) : s.runtimeError ? (
            <Empty>{s.runtimeError} Its call and spend counters cannot be assessed.</Empty>
          ) : s.runtime ? (
            <div className="cs-owner-facts">
              <div className="cs-owner-fact"><span>Model</span><b>{s.runtime.model}</b></div>
              <div className="cs-owner-fact"><span>Rate limit</span><b className="cs-num">{s.runtime.rateLimitPerMinute.toLocaleString()} / min</b></div>
              <div className="cs-owner-fact"><span>Calls today</span><b className="cs-num">{s.runtime.callsToday === null ? "Not tracked" : s.runtime.callsToday.toLocaleString()}</b></div>
              <div className="cs-owner-fact"><span>Calls this month</span><b className="cs-num">{s.runtime.callsThisMonth.toLocaleString()}</b></div>
              <div className="cs-owner-fact"><span>Spend this month</span><b className="cs-num">${s.runtime.spendThisMonthUsd.toFixed(2)}</b></div>
              <div className="cs-owner-fact"><span>Monthly budget</span><b className="cs-num">${s.runtime.monthlyBudgetUsd.toFixed(2)}</b></div>
              <div className="cs-owner-fact"><span>Tokens this month</span><b className="cs-num">{s.runtime.tokensThisMonth === null ? "Not tracked" : s.runtime.tokensThisMonth.toLocaleString()}</b></div>
              {s.runtime.callsToday === null && (
                <p className="cs-owner-note">{label} reports monthly totals only — a daily figure would be an invention, so it is left out.</p>
              )}
            </div>
          ) : (
            <Empty>No runtime counters were returned.</Empty>
          )}
        </Card>
      </div>

      <Card title="Where These Numbers Come From">
        <div className="cs-owner-prov">
          <p><b>Sources.</b> {s.sourceNote || "Loading…"}</p>
          <p><b>Coverage.</b> {s.coverageNote || "Loading…"}</p>
          <p><b>Timing.</b> {s.timingNote || "Loading…"}</p>
          <p><b>Writes.</b> This workspace is read-only. Nothing on this page, or any page in it, calls a write endpoint.</p>
        </div>
      </Card>
    </SpecialShell>
  );
}

const PLACEHOLDER_KEYS = ["a", "b", "c", "d", "e", "f"];

/** Insight lines are computed from loaded values only — never asserted over a failed read. */
function insights(s: OwnerChatSnapshot, label: string): string[] {
  const out: string[] = [];

  const dirLoaded = s.directories.filter((d) => d.loaded);
  const dirFailed = s.directories.filter((d) => !d.loaded);
  if (dirFailed.length > 0 && dirLoaded.length > 0) {
    out.push(`${dirFailed.map((d) => d.label).join(" and ")} did not load, so the directory picture here is incomplete — only ${dirLoaded.map((d) => d.label).join(" and ")} can be spoken for.`);
  }

  if (s.headlineRate.value !== null) {
    out.push(`${s.headlineRate.label} stands at ${s.headlineRate.value}%. ${s.headlineRate.note}`);
  }

  for (const d of s.dimensions) {
    if (d.failed || d.rows.length === 0) continue;
    const total = d.rows.reduce((a, b) => a + b.value, 0);
    const top = d.rows[0];
    if (total > 0 && top) {
      out.push(`"${top.label}" leads ${d.title.toLowerCase()} with ${top.value.toLocaleString()} ${d.unit} — ${Math.round((top.value / total) * 100)}% of the ${total.toLocaleString()} counted.`);
    }
    if (out.length >= 6) break;
  }

  if (s.series) {
    const first = s.series.series[0];
    const sum = first.data.reduce((a, b) => a + b, 0);
    const half = Math.floor(first.data.length / 2);
    const early = first.data.slice(0, half).reduce((a, b) => a + b, 0);
    const late = first.data.slice(half).reduce((a, b) => a + b, 0);
    const dir = late > early ? "rising" : late < early ? "falling" : "flat";
    out.push(`Across the series, "${first.name}" totals ${sum.toLocaleString()} and is ${dir} between its first and second half.`);
  } else {
    out.push(s.seriesNote);
  }

  if (s.runtime && s.runtime.monthlyBudgetUsd > 0) {
    const used = Math.round((s.runtime.spendThisMonthUsd / s.runtime.monthlyBudgetUsd) * 100);
    out.push(`The agent has used ${used}% of its $${s.runtime.monthlyBudgetUsd.toFixed(2)} monthly AI budget across ${s.runtime.callsThisMonth.toLocaleString()} calls.`);
  }

  if (out.length === 0) out.push(`${label} loaded, but returned nothing with enough substance to draw an insight from.`);
  return out.slice(0, 7);
}

const OWNER_OVERVIEW_CSS = `
.cs-owner-partial{display:flex;gap:10px;align-items:flex-start;border:1px solid #f2dfb4;background:#fffaf0;border-radius:12px;padding:12px 14px;margin-bottom:16px;color:#7a5410}
.cs-owner-partial b{display:block;font-size:12.5px;margin-bottom:3px}
.cs-owner-partial span{font-size:11.5px;line-height:18px;color:#8a6520}
.cs-owner-ring{display:flex;flex-direction:column;align-items:center;gap:12px}
.cs-owner-ring p{margin:0;font-size:11.5px;line-height:19px;color:#4c5470;text-align:center}
.cs-owner-donut-wrap{display:flex;gap:18px;align-items:center;flex-wrap:wrap}
.cs-owner-note{margin:12px 0 0;font-size:10.5px;line-height:17px;color:#8891a8}
.cs-owner-insights{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:11px}
.cs-owner-insights li{display:flex;gap:9px;align-items:flex-start;font-size:11.5px;line-height:19px;color:#4c5470}
.cs-owner-insights li svg{flex:0 0 auto;margin-top:3px;color:#7c3aed}
.cs-owner-facts{display:flex;flex-direction:column;gap:9px}
.cs-owner-fact{display:flex;justify-content:space-between;gap:12px;align-items:baseline;font-size:11.5px}
.cs-owner-fact span{color:#4c5470}
.cs-owner-fact b{font-weight:730;white-space:nowrap}
.cs-owner-prov p{margin:0 0 9px;font-size:11.5px;line-height:19px;color:#4c5470}
.cs-owner-prov p:last-child{margin-bottom:0}
.cs-owner-prov b{color:#11162d}
`;
