"use client";

/**
 * Ops Agent — Overview.
 *
 * Every figure comes from `useOpsSnapshot`, which reads GhrFix's
 * /ai-agents/ops/summary + /ai-agents/ops/queue, or ShadiLife's
 * /ai-agents/ops/schedule-health plus the Verification Agent's real
 * /ai-agents/verification/summary and /pending.
 *
 * Where a platform genuinely does not report something the tile reads
 * "Not tracked" and names the platform. When the fetch fails nothing here
 * claims the queue is clear — an unreachable queue is not an empty queue.
 * Read-only: no write endpoint is called from this page.
 */

import { useOpsSnapshot, type OpsSnapshot } from "@/lib/ops-data";
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
  { label: "Operational Queue", icon: "posts", slug: "queue" },
  { label: "Verifications", icon: "check", slug: "verifications" },
  { label: "Incidents", icon: "alert", slug: "incidents" },
  { label: "Chat with AI Agent", icon: "chat", slug: "chat" },
];

export default function OpsOverviewPage({ params }: { params: Promise<{ platform: string }> }) {
  const platform = usePlatformParam(params);
  const o = useOpsSnapshot(platform);
  const label = platformLabel(platform);

  /* The first two distributions the backend actually filled become the two
     donuts; the ranked lists come from `rankings`. Colours are assigned in
     fixed SERIES order and every chart carries its own direct labels. */
  const donuts = o.distributions.slice(0, 2);
  const ring = o.clearedRate;
  const ringColor = ring.value === null ? "#94a3b8" : ring.value >= 80 ? "#4ade80" : ring.value >= 50 ? "#fbbf24" : "#e04452";
  const measured = o.metrics.filter((m) => m.value !== null).length;

  return (
    <SpecialShell
      platform={platform}
      agentLabel="Ops Agent"
      tagline="Operations workspace"
      basePath="/ops-agent-special"
      nav={NAV}
      headerIcon="dashboard"
      assistantBlurb="I read the live operational queue and only report what the backend actually returns."
      title="Ops Overview"
      subtitle={o.queueNote}
      actions={
        <Pill tone={o.error ? "red" : o.loading ? "amber" : "green"}>
          <Icon name={o.error ? "alert" : o.loading ? "clock" : "check"} size={12} />
          {o.error ? "Queue unreachable" : o.loading ? "Loading queue" : `${measured} of ${o.metrics.length} metrics measured`}
        </Pill>
      }
    >
      <style>{OVERVIEW_CSS}</style>

      {o.error && <ErrorNote error={o.error} platform={platform} />}

      <div className="cs-stats">
        {o.metrics.map((m) => (
          <StatCard
            key={m.key}
            label={m.label}
            value={o.loading || o.error ? "—" : m.display}
            sub={o.error ? "Could not be read this session" : m.value === null ? `${label} does not report this` : m.note}
            tone={m.tone}
            icon={m.icon}
          />
        ))}
      </div>

      <div className="cs-row-2">
        <Card title="Backlog arrivals" action={<span className="cs-ops-src">Last 8 weeks</span>}>
          {o.loading ? (
            <Empty>Loading the live queue…</Empty>
          ) : o.error ? (
            <Empty>The queue did not load, so no arrival trend can be shown or assessed.</Empty>
          ) : o.series ? (
            <>
              <TrendChart
                labels={o.series.labels}
                series={o.series.series.map((s, i) => ({ name: s.name, data: s.data, color: SERIES[i] }))}
              />
              <p className="cs-ops-note">{o.seriesNote}</p>
            </>
          ) : (
            <Empty>{o.seriesNote}</Empty>
          )}
        </Card>

        <Card title={ring.label}>
          <div className="cs-ops-ring">
            <ScoreRing
              value={o.loading || ring.value === null ? 0 : ring.value}
              max={ring.max}
              label={ring.value === null ? "Not tracked" : "%"}
              color={ringColor}
            />
            <p>
              {o.error
                ? `Could not be computed — the ${label} queue failed to load.`
                : o.loading
                  ? "Loading…"
                  : ring.note}
            </p>
          </div>
        </Card>
      </div>

      <div className="cs-row-half">
        {donuts.map((d) => (
          <Card key={d.key} title={d.title} action={<span className="cs-ops-src">{d.total.toLocaleString()} {d.unit}</span>}>
            {o.loading ? (
              <Empty>Loading…</Empty>
            ) : o.error ? (
              <Empty>The snapshot failed, so this mix cannot be assessed.</Empty>
            ) : d.rows.length === 0 ? (
              <Empty>{d.note}</Empty>
            ) : (
              <>
                <div className="cs-donut-row">
                  <Donut data={d.rows.map((r, i) => ({ ...r, color: SERIES[i] }))} center={d.total.toLocaleString()} centerLabel={d.unit} />
                  <Legend data={d.rows.map((r, i) => ({ ...r, color: SERIES[i] }))} />
                </div>
                <p className="cs-ops-note">{d.note}</p>
              </>
            )}
          </Card>
        ))}
      </div>

      <div className="cs-row-3">
        <Card title="How long items have been waiting">
          {o.loading ? (
            <Empty>Loading…</Empty>
          ) : o.error ? (
            <Empty>Age buckets are arithmetic over the queue — none can be computed while it is unreachable.</Empty>
          ) : o.ageRows.length === 0 ? (
            <Empty>{`The ${label} queue loaded and returned no items with a usable timestamp.`}</Empty>
          ) : (
            <>
              <BarRows rows={o.ageRows.map((r, i) => ({ ...r, color: SERIES[i] }))} colored />
              <Legend data={o.ageRows.map((r, i) => ({ ...r, color: SERIES[i] }))} />
              <p className="cs-ops-note">Buckets are computed from each row&apos;s real timestamp, oldest bucket last.</p>
            </>
          )}
        </Card>

        {o.rankings.map((r, idx) => (
          <Card key={r.key} title={r.title}>
            {o.loading ? (
              <Empty>Loading…</Empty>
            ) : o.error ? (
              <Empty>Cannot be ranked — the queue did not load.</Empty>
            ) : r.rows.length === 0 ? (
              <Empty>{`${label} returned no rows to rank here.`}</Empty>
            ) : (
              <>
                <BarRows rows={r.rows.map((row, i) => ({ ...row, color: SERIES[(i + idx) % SERIES.length] }))} colored />
                <Legend data={r.rows.map((row, i) => ({ ...row, color: SERIES[(i + idx) % SERIES.length] }))} showPct={false} />
                <p className="cs-ops-note">{r.note}</p>
              </>
            )}
          </Card>
        ))}
      </div>

      <div className="cs-row-2">
        <Card title="Computed rates" action={<span className="cs-ops-src">Arithmetic over the live snapshot</span>}>
          {o.loading ? (
            <Empty>Loading…</Empty>
          ) : o.error ? (
            <Empty>Rates are arithmetic over the snapshot — none can be computed while it is unavailable.</Empty>
          ) : (
            <div className="cs-ops-rates">
              {o.rates.map((r) => (
                <div className="cs-ops-rate" key={r.label}>
                  <div className="cs-ops-rate-head">
                    <span>{r.label}</span>
                    <b className="cs-num">{r.value === null ? "Not tracked" : `${r.value}${r.suffix}`}</b>
                  </div>
                  <p>{r.note}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Agent insights">
          {o.loading ? (
            <Empty>Loading…</Empty>
          ) : (
            <div className="cs-ops-insights">
              {buildInsights(o, label).map((i) => (
                <div key={i.text} className="cs-ops-insight">
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

      <Card title="Where these figures come from" action={<span className="cs-ops-src">Read-only endpoints</span>}>
        {o.loading ? (
          <Empty>Contacting {label}…</Empty>
        ) : o.sources.length === 0 ? (
          <Empty>No endpoint answered, so nothing on this page could be sourced.</Empty>
        ) : (
          <div className="cs-ops-sources">
            {o.sources.map((s) => (
              <div className="cs-ops-source" key={s.path}>
                <Pill tone={s.ok ? "green" : "red"}>
                  <Icon name={s.ok ? "check" : "alert"} size={12} />
                  {s.ok ? "Loaded" : "Failed"}
                </Pill>
                <div>
                  <b>{s.label}</b>
                  <code>{s.path}</code>
                  <span>{s.detail}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </SpecialShell>
  );
}

/** Statements about the loaded snapshot — never a claim the data cannot support. */
function buildInsights(o: OpsSnapshot, label: string): Array<{ icon: string; tone: keyof typeof TONE; text: string }> {
  if (o.error) {
    return [
      {
        icon: "alert",
        tone: "red",
        text: `The ${label} operational queue could not be reached, so nothing about the current backlog — its size, its age or whether it is clear — can be assessed.`,
      },
    ];
  }
  if (o.loading) return [{ icon: "clock", tone: "amber", text: "Reading the live queue…" }];

  const out: Array<{ icon: string; tone: keyof typeof TONE; text: string }> = [];

  if (o.items.length === 0) {
    out.push({ icon: "check", tone: "green", text: `${label} answered and returned no backlog items at all — this is a loaded, genuinely empty queue, not a failed read.` });
  } else {
    const oldest = o.oldestFirst[0];
    if (oldest && oldest.ageDays !== null) {
      out.push({
        icon: "clock",
        tone: oldest.ageDays > 7 ? "red" : oldest.ageDays > 3 ? "amber" : "blue",
        text: `The longest-waiting item is “${oldest.title}” (${oldest.kindLabel.toLowerCase()}), ${oldest.ageDays} day${oldest.ageDays === 1 ? "" : "s"} since it was ${oldest.ageBasis}.`,
      });
    }

    const stale = o.items.filter((i) => i.ageDays !== null && i.ageDays > 7).length;
    if (stale > 0) {
      out.push({ icon: "alert", tone: "amber", text: `${stale} of ${o.items.length} returned items have been sitting for more than a week.` });
    }

    const topKind = o.kindRows[0];
    if (topKind && o.kindRows.length > 1) {
      out.push({
        icon: "tag",
        tone: "purple",
        text: `${topKind.label} work dominates the backlog: ${topKind.value.toLocaleString()} of ${o.items.length.toLocaleString()} returned rows.`,
      });
    }
  }

  if (!o.incidentsSupported) {
    out.push({ icon: "eye", tone: "cyan", text: `${label} has no incident or emergency concept, so no incident count is shown anywhere in this workspace.` });
  }

  const untracked = o.metrics.filter((m) => m.value === null);
  if (untracked.length > 0) {
    out.push({
      icon: "eye",
      tone: "cyan",
      text: `${label} does not report ${untracked.map((m) => m.label.toLowerCase()).join(", ")} — those tiles stay blank rather than showing zero.`,
    });
  }

  if (!o.series) out.push({ icon: "trend", tone: "amber", text: o.seriesNote });

  return out.slice(0, 5);
}

/* Page-local styles only. Every selector is `cs-ops-*` prefixed so nothing
   escapes this page onto the other special workspaces. */
const OVERVIEW_CSS = `
.cs-ops-note{margin:12px 0 0;font-size:10.5px;line-height:17px;color:#94a3b8}
.cs-ops-src{font-size:11px;color:#94a3b8}
.cs-ops-ring{display:flex;flex-direction:column;align-items:center;gap:12px}
.cs-ops-ring p{margin:0;font-size:11.5px;line-height:19px;color:#cbd5e1;text-align:center}
.cs-ops-rates{display:flex;flex-direction:column;gap:11px}
.cs-ops-rate-head{display:flex;justify-content:space-between;gap:10px;align-items:baseline;font-size:11.5px}
.cs-ops-rate-head span{color:#cbd5e1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cs-ops-rate-head b{font-weight:730;white-space:nowrap}
.cs-ops-rate p{margin:3px 0 0;font-size:10.5px;line-height:16px;color:#94a3b8}
.cs-ops-insights{display:flex;flex-direction:column;gap:13px}
.cs-ops-insight{display:flex;gap:11px;align-items:flex-start}
.cs-ops-insight>span{width:29px;height:29px;border-radius:9px;flex:0 0 auto;display:grid;place-items:center}
.cs-ops-insight p{margin:0;font-size:11.5px;line-height:19px;color:#cbd5e1}
.cs-ops-sources{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px}
.cs-ops-source{display:flex;gap:10px;align-items:flex-start}
.cs-ops-source b{display:block;font-size:12px}
.cs-ops-source code{display:block;font-size:10.5px;color:#7c3aed;margin-top:2px;word-break:break-all}
.cs-ops-source span{display:block;font-size:10.5px;color:#94a3b8;margin-top:3px;line-height:16px}
`;
