"use client";

/**
 * Support Agent — Overview.
 *
 * Every figure comes from `useSupportSnapshot`, which reads GhrFix's
 * /ai-agents/support/summary + /ai-agents/support/tickets, or ShadiLife's
 * /admin/reports. Where a platform genuinely does not record something the
 * tile reads "Not tracked" and names the platform — a zero there would be a
 * claim, not a gap. When the fetch fails nothing is asserted about queue
 * health at all: the page says it cannot assess it.
 *
 * Charts: 6 StatCards, an intake TrendChart, two Donut+Legend pairs (status
 * mix and the platform's second real cut), a resolution ScoreRing, ranked
 * BarRows for categories and unresolved age, and a computed insights panel.
 * Read-only — no write endpoint is called from this workspace.
 */

import { useSupportSnapshot, formatMetric, formatAge } from "@/lib/support-data";
import type { SupportSnapshot } from "@/lib/support-data";
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
  { label: "Tickets", icon: "posts", slug: "tickets" },
  { label: "Escalations", icon: "alert", slug: "escalations" },
  { label: "Performance", icon: "trend", slug: "performance" },
  { label: "Chat with AI Agent", icon: "chat", slug: "chat" },
];

export default function SupportOverviewPage({ params }: { params: Promise<{ platform: string }> }) {
  const platform = usePlatformParam(params);
  const s = useSupportSnapshot(platform);
  const label = platformLabel(platform);

  /* The first two dimensions the backend actually returned become the donuts;
     the next one becomes a ranked bar list. Colors come from SERIES in fixed
     order and every chart carries its own directly-labelled legend. */
  const donutDims = s.dimensions.slice(0, 2);
  const barDim = s.dimensions[2] ?? null;

  const ring = s.resolutionRate;
  const ringColor = ring.value === null ? "#69738c" : ring.value >= 66 ? "#0f9e69" : ring.value >= 33 ? "#c9860f" : "#e04452";

  const measured = s.metrics.filter((m) => m.value !== null).length;
  const oldest = s.tickets.filter((t) => t.statusGroup === "open" || t.statusGroup === "investigating").reduce<number | null>(
    (worst, t) => (t.ageDays === null ? worst : worst === null || t.ageDays > worst ? t.ageDays : worst),
    null,
  );

  return (
    <SpecialShell
      platform={platform}
      agentLabel="Support Agent"
      tagline="Support workspace"
      basePath="/support-agent-special"
      nav={NAV}
      headerIcon="dashboard"
      assistantBlurb="I read the live support queue and only report what the backend actually records."
      title="Support Overview"
      subtitle={s.domain}
      actions={
        <Pill tone={s.error ? "red" : s.loading ? "amber" : "green"}>
          <Icon name={s.error ? "alert" : s.loading ? "clock" : "check"} size={12} />
          {s.error ? "Queue failed to load" : s.loading ? "Loading queue" : `${measured} of ${s.metrics.length} metrics measured`}
        </Pill>
      }
    >
      <style>{PAGE_CSS}</style>

      {s.error && <ErrorNote error={s.error} platform={platform} />}

      <Card>
        <p className="cs-support-source">
          <Icon name="tag" size={13} />
          <span>
            <b>{s.sourceNote}</b> {s.error ? "This session's fetch failed, so nothing below is a live measurement." : s.coverageNote}
          </span>
        </p>
      </Card>

      <div className="cs-stats">
        {s.metrics.map((m) => (
          <StatCard
            key={m.key}
            label={m.label}
            value={s.loading || s.error ? "—" : formatMetric(m)}
            sub={s.error ? "Could not be read this session" : m.note}
            tone={m.tone}
            icon={m.icon}
          />
        ))}
      </div>

      <div className="cs-row-2">
        <Card
          title="Ticket Intake"
          action={<span className="cs-support-meta">{s.series ? s.series.granularity : "No series available"}</span>}
        >
          {s.loading ? (
            <Empty>Loading the live queue…</Empty>
          ) : s.error ? (
            <Empty>The queue did not load, so no intake trend can be shown or assessed.</Empty>
          ) : s.series ? (
            <>
              <TrendChart labels={s.series.labels} series={s.series.series.map((x, i) => ({ name: x.name, data: x.data, color: SERIES[i] }))} />
              <p className="cs-support-note">{s.seriesNote}</p>
            </>
          ) : (
            <Empty>{s.seriesNote}</Empty>
          )}
        </Card>

        <Card title={ring.label}>
          <div className="cs-support-ring">
            <ScoreRing
              value={s.loading || s.error || ring.value === null ? 0 : Math.round(ring.value)}
              max={ring.max}
              label={ring.value === null || s.error ? "Not computable" : "%"}
              color={ringColor}
            />
            <p className="cs-support-note center">
              {s.error
                ? `Could not be computed — the ${label} queue failed to load, so resolution health cannot be assessed.`
                : s.loading
                  ? "Loading…"
                  : ring.value === null
                    ? `${label} returned no rows, so there is nothing to compute a resolution rate from.`
                    : ring.note}
            </p>
          </div>
        </Card>
      </div>

      <div className="cs-row-half">
        {!s.loading && !s.error &&
          donutDims.map((d) => (
            <Card key={d.key} title={d.title} action={<span className="cs-support-meta">{d.total.toLocaleString()} {d.unit}</span>}>
              <div className="cs-donut-row">
                <Donut data={d.rows} center={d.total.toLocaleString()} centerLabel={d.unit} />
                <Legend data={d.rows} />
              </div>
              <p className="cs-support-note">{d.note}</p>
            </Card>
          ))}

        {s.loading && (
          <Card title="Queue mix">
            <Empty>Loading the live queue…</Empty>
          </Card>
        )}
        {s.error && (
          <Card title="Queue mix">
            <Empty>The queue failed to load, so the status mix cannot be shown or assessed.</Empty>
          </Card>
        )}
        {!s.loading && !s.error && donutDims.length === 0 && (
          <Card title="Queue mix">
            <Empty>{`${label} returned an empty queue this session — no rows to break down.`}</Empty>
          </Card>
        )}
      </div>

      <div className="cs-row-3">
        <Card title={barDim ? barDim.title : "Category breakdown"}>
          {s.loading ? (
            <Empty>Loading…</Empty>
          ) : s.error ? (
            <Empty>Not available — the queue did not load.</Empty>
          ) : barDim ? (
            <>
              <BarRows rows={barDim.rows.slice(0, 7).map((r, i) => ({ ...r, color: SERIES[i % SERIES.length] }))} colored />
              <Legend data={barDim.rows.slice(0, 7)} />
              <p className="cs-support-note">{barDim.note}</p>
            </>
          ) : (
            <Empty>{`${label} returned no third categorical cut on this queue.`}</Empty>
          )}
        </Card>

        <Card title={s.ageBuckets.title} action={<span className="cs-support-meta">{s.ageBuckets.total.toLocaleString()} unresolved</span>}>
          {s.loading ? (
            <Empty>Loading…</Empty>
          ) : s.error ? (
            <Empty>Ticket age is measured from loaded rows — none loaded, so it cannot be assessed.</Empty>
          ) : s.ageBuckets.rows.length === 0 ? (
            <Empty>No unresolved row carries a usable createdAt timestamp, so no age profile can be drawn.</Empty>
          ) : (
            <>
              <BarRows rows={s.ageBuckets.rows.map((r, i) => ({ ...r, color: SERIES[i % SERIES.length] }))} colored />
              <Legend data={s.ageBuckets.rows} />
              <p className="cs-support-note">{s.ageBuckets.note}</p>
            </>
          )}
        </Card>

        <Card title="Computed Rates">
          {s.loading ? (
            <Empty>Loading…</Empty>
          ) : s.error ? (
            <Empty>Rates are arithmetic over the queue — none can be computed while it is unavailable.</Empty>
          ) : (
            <div className="cs-support-rates">
              {s.rates.map((r) => (
                <div className="cs-support-rate" key={r.label}>
                  <div className="cs-support-rate-head">
                    <span>{r.label}</span>
                    <b className="cs-num">{r.value === null ? "Not tracked" : `${r.value}%`}</b>
                  </div>
                  <p>{r.note}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card title="Agent Insights">
        {s.loading ? (
          <Empty>Loading…</Empty>
        ) : (
          <div className="cs-support-insights">
            {buildInsights(s, label, oldest).map((i) => (
              <div className="cs-support-insight" key={i.text}>
                <span className="cs-support-insight-icon" style={{ background: TONE[i.tone].bg, color: TONE[i.tone].fg }}>
                  <Icon name={i.icon} size={15} />
                </span>
                <p>{i.text}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </SpecialShell>
  );
}

/* ── Insights ───────────────────────────────────────────────────────────
   Every line below is arithmetic over figures already on this page. When
   the fetch failed the only honest insight is that nothing can be assessed.
   ─────────────────────────────────────────────────────────────────────── */
interface Insight {
  text: string;
  tone: "purple" | "blue" | "green" | "amber" | "red" | "cyan";
  icon: string;
}

function buildInsights(s: SupportSnapshot, label: string, oldest: number | null): Insight[] {
  if (s.error) {
    return [
      { text: `The ${label} support queue could not be read this session, so no claim about open tickets, backlog or resolution health can be made from this page.`, tone: "red", icon: "alert" },
      { text: s.sourceNote, tone: "blue", icon: "tag" },
    ];
  }
  if (s.isEmpty) {
    return [
      { text: `The fetch succeeded and ${label} returned zero rows — the queue is genuinely empty right now, not merely unreadable.`, tone: "green", icon: "check" },
      { text: s.coverageNote, tone: "blue", icon: "tag" },
    ];
  }

  const out: Insight[] = [];
  const unresolved = s.tickets.filter((t) => t.statusGroup === "open" || t.statusGroup === "investigating").length;

  out.push({
    text: `${unresolved.toLocaleString()} of ${s.tickets.length.toLocaleString()} loaded rows are still unresolved.`,
    tone: unresolved === 0 ? "green" : "amber",
    icon: unresolved === 0 ? "check" : "clock",
  });

  if (s.resolutionRate.value !== null) {
    out.push({
      text: `${s.resolutionRate.value}% of loaded rows have been closed. ${s.resolutionRate.note}`,
      tone: s.resolutionRate.value >= 66 ? "green" : s.resolutionRate.value >= 33 ? "amber" : "red",
      icon: "target",
    });
  }

  out.push({
    text: `${s.escalations.length.toLocaleString()} rows meet this platform's escalation rule. ${s.escalationRule}`,
    tone: s.escalations.length === 0 ? "green" : "red",
    icon: "alert",
  });

  if (oldest !== null) {
    out.push({ text: `The oldest unresolved row has been open for ${formatAge(oldest)}, measured from its own createdAt.`, tone: oldest >= 7 ? "red" : "cyan", icon: "clock" });
  } else {
    out.push({ text: "No unresolved row carries a createdAt timestamp, so backlog age cannot be measured.", tone: "blue", icon: "clock" });
  }

  const top = s.categoryResolution[0];
  if (top) {
    out.push({ text: `"${top.label}" is the biggest single driver at ${top.total.toLocaleString()} rows, ${top.pct}% of them resolved.`, tone: "purple", icon: "tag" });
  }

  out.push({ text: s.timingNote, tone: "blue", icon: "eye" });
  return out;
}

/* Page-local styles only. Every selector is `cs-support-` prefixed so nothing
   here can leak into the shared kit or any other special workspace. */
const PAGE_CSS = `
.cs-support-source{margin:0;display:flex;gap:9px;align-items:flex-start;font-size:11.5px;line-height:19px;color:#4c5470}
.cs-support-source svg{color:#7c3aed;flex:0 0 auto;margin-top:3px}
.cs-support-source b{color:#11162d}
.cs-support-meta{font-size:11px;color:#69738c}
.cs-support-note{margin:11px 0 0;font-size:11px;line-height:18px;color:#69738c}
.cs-support-note.center{text-align:center}
.cs-support-ring{display:flex;flex-direction:column;align-items:center;gap:12px}
.cs-support-rates{display:flex;flex-direction:column;gap:12px}
.cs-support-rate-head{display:flex;justify-content:space-between;gap:10px;font-size:11.5px;color:#4c5470}
.cs-support-rate-head b{font-weight:730}
.cs-support-rate p{margin:3px 0 0;font-size:10.5px;line-height:17px;color:#8891a8}
.cs-support-insights{display:flex;flex-direction:column;gap:13px}
.cs-support-insight{display:flex;gap:11px;align-items:flex-start}
.cs-support-insight-icon{width:29px;height:29px;border-radius:9px;flex:0 0 auto;display:grid;place-items:center}
.cs-support-insight p{margin:0;font-size:11.5px;line-height:19px;color:#4c5470}
`;
