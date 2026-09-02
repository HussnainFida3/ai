"use client";

/**
 * Site Chat Agent — Overview.
 *
 * Every figure comes from `useSiteChatSnapshot`, which reads GhrFix's
 * /ai-agents/site-chat/summary, /conversations, /stats and /activity. Where a
 * counter is genuinely absent the tile reads "Not tracked" and names the
 * platform — a zero here would be a claim, not a gap. ShadiLife does not
 * register this agent at all, so on that platform the page renders the
 * unsupported state instead of firing doomed requests.
 */

import Link from "next/link";
import { useSiteChatSnapshot, formatMetric, formatRate, type SiteChatSnapshot } from "@/lib/sitechat-data";
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
  { label: "Conversations", icon: "chat", slug: "conversations" },
  { label: "Usage & Cost", icon: "trend", slug: "usage" },
  { label: "Quality", icon: "target", slug: "quality" },
  { label: "Chat with AI Agent", icon: "bot", slug: "chat" },
];

export default function SiteChatOverviewPage({ params }: { params: Promise<{ platform: string }> }) {
  const platform = usePlatformParam(params);
  const s = useSiteChatSnapshot(platform);
  const label = platformLabel(platform);

  /* The first two reported cuts become the donuts; the next two become the
     ranked bar lists. Colors come from SERIES in fixed order, and every chart
     carries its own direct labels. */
  const donutDims = s.dimensions.slice(0, 2);
  const barDims = s.dimensions.slice(2, 4);

  const ringValue = s.cacheHitRate;
  const ringColor = ringValue === null ? "#69738c" : ringValue >= 60 ? "#0f9e69" : ringValue >= 30 ? "#c9860f" : "#e04452";
  const measured = s.metrics.filter((m) => m.value !== null).length;

  return (
    <SpecialShell
      platform={platform}
      agentLabel="Site Chat Agent"
      tagline="Website assistant"
      basePath="/sitechat-agent-special"
      nav={NAV}
      headerIcon="dashboard"
      assistantBlurb="I don't answer your customers — I report on the assistant that does: volume, cache efficiency and spend."
      title="Site Chat Overview"
      subtitle={s.domain}
      actions={
        <Pill tone={!s.supported ? "amber" : s.error ? "red" : s.loading ? "amber" : "green"}>
          <Icon name={!s.supported ? "alert" : s.error ? "alert" : s.loading ? "clock" : "check"} size={12} />
          {!s.supported
            ? "Not on this platform"
            : s.error
              ? "Snapshot failed"
              : s.loading
                ? "Loading snapshot"
                : `${measured} of ${s.metrics.length} metrics measured`}
        </Pill>
      }
    >
      <style>{OVERVIEW_CSS}</style>

      {!s.supported ? (
        <UnsupportedNotice reason={s.unsupportedReason} label={label} />
      ) : (
        <>
          {s.error && <ErrorNote error={s.error} platform={platform} />}
          {s.partialNote && <p className="cs-sitechat-warn">{s.partialNote}</p>}

          <div className="cs-stats">
            {(s.loading ? LOADING_TILES : s.metrics).map((m) => (
              <StatCard
                key={m.key}
                label={m.label}
                value={s.loading || s.error ? "—" : formatMetric(m)}
                sub={s.error ? "Could not be read this session" : s.loading ? "Loading…" : m.note}
                tone={m.tone}
                icon={m.icon}
              />
            ))}
          </div>

          <div className="cs-row-2">
            <Card
              title={s.series ? "Agent Activity Timeline" : "Time Series"}
              action={<span className="cs-sitechat-meta">{s.series ? s.series.granularity : "None returned"}</span>}
            >
              {s.loading ? (
                <Empty>Loading live snapshot…</Empty>
              ) : s.error ? (
                <Empty>The snapshot did not load, so no trend can be shown or assessed.</Empty>
              ) : s.series ? (
                <>
                  <TrendChart
                    labels={s.series.labels}
                    series={s.series.series.map((x, i) => ({ name: x.name, data: x.data, color: SERIES[i] }))}
                  />
                  <p className="cs-sitechat-note">{s.seriesNote}</p>
                </>
              ) : (
                <Empty>{s.seriesNote}</Empty>
              )}
            </Card>

            <Card title="Cache Hit Rate">
              <div className="cs-sitechat-ring">
                <ScoreRing
                  value={s.loading || ringValue === null ? 0 : Math.round(ringValue)}
                  max={100}
                  label={ringValue === null ? "Not tracked" : "%"}
                  color={ringColor}
                />
                <p>
                  {s.error
                    ? `Could not be computed — the ${label} snapshot failed to load.`
                    : s.loading
                      ? "Loading…"
                      : ringValue === null
                        ? `${label} returned no cacheHitRate field, so cache efficiency cannot be assessed.`
                        : `${(s.cachedCalls ?? 0).toLocaleString()} of ${(s.totalCalls ?? 0).toLocaleString()} calls were answered from cache and never reached the model.`}
                </p>
              </div>
            </Card>
          </div>

          <div className="cs-row-half">
            {donutDims.map((d) => (
              <Card key={d.key} title={d.title} action={<span className="cs-sitechat-meta">{d.total.toLocaleString()} {d.unit}</span>}>
                <div className="cs-donut-row">
                  <Donut data={d.rows} center={d.total.toLocaleString()} centerLabel={d.unit} />
                  <Legend data={d.rows} />
                </div>
                <p className="cs-sitechat-note">{d.note}</p>
              </Card>
            ))}
            {s.loading && (
              <Card title="Distributions"><Empty>Loading live snapshot…</Empty></Card>
            )}
            {s.error && (
              <Card title="Distributions"><Empty>The snapshot failed, so the call mix cannot be assessed.</Empty></Card>
            )}
            {!s.loading && !s.error && donutDims.length === 0 && (
              <Card title="Distributions">
                <Empty>{`${label} returned no non-zero categorical figures to break down.`}</Empty>
              </Card>
            )}
          </div>

          <div className="cs-row-3">
            {barDims.map((d, i) => (
              <Card key={d.key} title={d.title}>
                {s.loading ? (
                  <Empty>Loading…</Empty>
                ) : (
                  <>
                    <BarRows rows={d.rows.slice(0, 7).map((r) => ({ ...r, color: SERIES[i + 2] }))} colored />
                    <p className="cs-sitechat-note">{d.note}</p>
                  </>
                )}
              </Card>
            ))}

            <Card title="Computed Rates">
              {s.loading ? (
                <Empty>Loading…</Empty>
              ) : s.error ? (
                <Empty>Rates are arithmetic over the snapshot — none can be computed while it is unavailable.</Empty>
              ) : (
                <div className="cs-sitechat-rates">
                  {s.rates.slice(0, 5).map((r) => (
                    <div className="cs-sitechat-rate" key={r.label}>
                      <div className="cs-sitechat-rate-head">
                        <span>{r.label}</span>
                        <b className="cs-num">{formatRate(r)}</b>
                      </div>
                      <p>{r.note}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card title="Agent Insights">
              {s.loading ? (
                <Empty>Loading…</Empty>
              ) : (
                <div className="cs-sitechat-insights">
                  {buildInsights(s, label).map((i) => (
                    <div className="cs-sitechat-insight" key={i.text}>
                      <span style={{ background: TONE[i.tone].bg, color: TONE[i.tone].fg }}>
                        <Icon name={i.icon} size={15} />
                      </span>
                      <p>{i.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <Card title="Where these numbers come from">
            <p className="cs-sitechat-note">{s.sourceNote}</p>
            <p className="cs-sitechat-note">{s.coverageNote}</p>
          </Card>
        </>
      )}
    </SpecialShell>
  );
}

/** Placeholder tiles so the loading grid keeps the finished layout's shape. */
const LOADING_TILES = [
  { key: "l1", label: "All-Time Calls", value: null, kind: "count" as const, note: "", tone: "purple", icon: "chat" },
  { key: "l2", label: "Calls Today", value: null, kind: "count" as const, note: "", tone: "blue", icon: "clock" },
  { key: "l3", label: "Calls This Month", value: null, kind: "count" as const, note: "", tone: "cyan", icon: "calendar" },
  { key: "l4", label: "Cache Hit Rate", value: null, kind: "pct" as const, note: "", tone: "green", icon: "check" },
  { key: "l5", label: "Tokens Moved", value: null, kind: "count" as const, note: "", tone: "amber", icon: "trend" },
  { key: "l6", label: "Spend This Month", value: null, kind: "usd" as const, note: "", tone: "red", icon: "target" },
];

/** Statements about the loaded snapshot — never a claim the data can't support. */
function buildInsights(s: SiteChatSnapshot, label: string): Array<{ icon: string; tone: keyof typeof TONE; text: string }> {
  if (s.error) {
    return [{ icon: "alert", tone: "red", text: `The ${label} site-chat snapshot failed to load, so nothing about the assistant's health can be assessed right now.` }];
  }
  if (s.isEmpty) {
    return [{ icon: "alert", tone: "amber", text: `The ${label} snapshot loaded successfully, but the assistant has not served a single logged call yet — there is nothing to summarise.` }];
  }

  const out: Array<{ icon: string; tone: keyof typeof TONE; text: string }> = [];

  if (s.cacheHitRate !== null && s.cachedCalls !== null && s.totalCalls !== null) {
    out.push({
      icon: "check",
      tone: s.cacheHitRate >= 60 ? "green" : s.cacheHitRate >= 30 ? "amber" : "red",
      text: `${s.cachedCalls.toLocaleString()} of ${s.totalCalls.toLocaleString()} calls (${s.cacheHitRate}%) were served from cache and never reached the model.`,
    });
  }

  if (s.callsToday !== null && s.callsThisMonth !== null && s.callsThisMonth > 0) {
    const pct = Math.round((s.callsToday / s.callsThisMonth) * 1000) / 10;
    out.push({
      icon: "clock",
      tone: "blue",
      text: `${s.callsToday.toLocaleString()} calls landed today — ${pct}% of the ${s.callsThisMonth.toLocaleString()} logged so far this month.`,
    });
  }

  if (s.avgTokensPerCall !== null) {
    out.push({
      icon: "trend",
      tone: "amber",
      text: `Each assistant call moves about ${s.avgTokensPerCall.toLocaleString()} tokens on average, prompts and replies combined.`,
    });
  }

  if (s.callers.length > 0) {
    const top = s.callers[0];
    out.push({
      icon: "users",
      tone: "purple",
      text: `${top.name} is the busiest caller in the backend's grouped list with ${top.calls.toLocaleString()} calls${top.share === null ? "" : ` — ${top.share}% of that group's volume`}.`,
    });
  }

  if (s.budgetUsedPct !== null && s.monthlyBudgetUsd !== null) {
    out.push({
      icon: "target",
      tone: s.budgetUsedPct >= 80 ? "red" : s.budgetUsedPct >= 50 ? "amber" : "green",
      text: `This agent has used ${s.budgetUsedPct}% of its $${s.monthlyBudgetUsd.toFixed(2)} monthly budget.`,
    });
  } else {
    out.push({
      icon: "alert",
      tone: "amber",
      text: "The agent's /stats route did not supply both spend and budget this session, so budget consumption is unknown rather than zero.",
    });
  }

  return out;
}

/** Shown on a platform that never registered this agent. */
function UnsupportedNotice({ reason, label }: { reason: string | null; label: string }) {
  return (
    <Card title={`Site Chat Agent is not available on ${label}`}>
      <div className="cs-sitechat-unsupported">
        <span><Icon name="alert" size={18} /></span>
        <div>
          <p>{reason}</p>
          <p>
            Nothing on this page is estimated, cached or carried over from another platform — there is simply no data
            source behind it here.
          </p>
          <Link href="/sitechat-agent-special/ghrfix/overview" className="cs-btn cs-btn-primary">
            <Icon name="arrow" size={15} />Open the GhrFix workspace
          </Link>
        </div>
      </div>
    </Card>
  );
}

const OVERVIEW_CSS = `
.cs-sitechat-meta{font-size:11px;color:#69738c}
.cs-sitechat-note{margin:12px 0 0;font-size:10.5px;line-height:17px;color:#8891a8}
.cs-sitechat-warn{margin:0 0 12px;border:1px solid #f2e2c2;background:#fff9ee;color:#8a6412;border-radius:10px;padding:10px 13px;font-size:11.5px;line-height:18px}
.cs-sitechat-ring{display:flex;flex-direction:column;align-items:center;gap:12px}
.cs-sitechat-ring p{margin:0;font-size:11.5px;line-height:19px;color:#4c5470;text-align:center}
.cs-sitechat-rates{display:flex;flex-direction:column;gap:12px}
.cs-sitechat-rate-head{display:flex;justify-content:space-between;gap:12px;align-items:baseline;font-size:12px;font-weight:600;color:#11162d}
.cs-sitechat-rate p{margin:3px 0 0;font-size:10.5px;line-height:17px;color:#8891a8}
.cs-sitechat-insights{display:flex;flex-direction:column;gap:13px}
.cs-sitechat-insight{display:flex;gap:11px;align-items:flex-start}
.cs-sitechat-insight span{width:29px;height:29px;border-radius:9px;flex:0 0 auto;display:grid;place-items:center}
.cs-sitechat-insight p{margin:0;font-size:11.5px;line-height:19px;color:#4c5470}
.cs-sitechat-unsupported{display:flex;gap:14px;align-items:flex-start}
.cs-sitechat-unsupported>span{width:36px;height:36px;border-radius:11px;flex:0 0 auto;display:grid;place-items:center;background:#fff6e6;color:#c9860f}
.cs-sitechat-unsupported p{margin:0 0 10px;font-size:12.5px;line-height:21px;color:#4c5470}
`;
