"use client";

/**
 * Master AI — Overview.
 *
 * The bird's-eye page: how much of the fleet is reporting at all, how many
 * calls and dollars it burned this month, how much of the monthly budget that
 * consumed, and where the volume concentrates — by agent and by registry
 * category. Every figure comes from `useMasterSnapshot`, which reads GhrFix's
 * /ai-agents/master/overview + /budget or ShadiLife's /ai-agents/_meta/usage +
 * /_meta/activity. Agents that failed to report are counted separately and
 * excluded from every total and chart rather than being drawn as zero.
 */

import { useMasterSnapshot, usd, count, type MasterSnapshot } from "@/lib/master-data";
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
  SpecialShell,
  StatCard,
  TrendChart,
  type NavItem,
  type Slice,
} from "@/components/special/kit";

const NAV: NavItem[] = [
  { label: "Overview", icon: "dashboard", slug: "overview" },
  { label: "Fleet", icon: "users", slug: "fleet" },
  { label: "Spend", icon: "trend", slug: "spend" },
  { label: "Activity", icon: "pulse", slug: "activity" },
  { label: "Chat with AI Agent", icon: "chat", slug: "chat" },
];

export default function MasterOverviewPage({ params }: { params: Promise<{ platform: string }> }) {
  const platform = usePlatformParam(params);
  const s = useMasterSnapshot(platform);
  const label = platformLabel(platform);

  const budgetTone = s.budgetUsedPct === null ? "purple" : s.budgetUsedPct >= 90 ? "red" : s.budgetUsedPct >= 70 ? "amber" : "green";

  return (
    <SpecialShell
      platform={platform}
      agentLabel="Master AI"
      tagline="Fleet telemetry"
      basePath="/master-agent-special"
      nav={NAV}
      headerIcon="dashboard"
      assistantBlurb="I watch every other agent on this platform — calls, spend and activity — and only report what the backend records."
      title="Fleet Overview"
      subtitle={`Every ${label} agent under one bird's-eye view`}
      actions={
        <Pill tone={s.error ? "red" : s.unreportedCount > 0 ? "amber" : "green"}>
          <Icon name={s.error ? "alert" : s.unreportedCount > 0 ? "clock" : "check"} size={12} />
          {s.error ? "Fleet unreadable" : s.loading ? "Loading" : s.unreportedCount > 0 ? `${s.unreportedCount} not reporting` : "All reporting"}
        </Pill>
      }
    >
      <style>{CSS}</style>

      {s.error && <ErrorNote error={s.error} platform={platform} />}

      {s.error ? (
        <Card title="Fleet status">
          <Empty>
            {label} did not return fleet telemetry, so this page cannot assess the fleet at all. Nothing below is a
            measurement of &ldquo;no activity&rdquo; — it is an absence of data.
          </Empty>
        </Card>
      ) : s.loading ? (
        <Card title="Fleet status">
          <Empty>Reading the {label} fleet…</Empty>
        </Card>
      ) : (
        <>
          <div className="cs-stats">
            <StatCard
              label="Agents reporting"
              value={`${s.reportedCount} / ${s.registryCount}`}
              sub={s.unreportedCount > 0 ? `${s.unreportedCount} did not report — not counted as zero` : "Whole registry accounted for"}
              tone={s.unreportedCount > 0 ? "amber" : "green"}
              icon="users"
            />
            <StatCard
              label="Calls this month"
              value={count(s.totalCalls)}
              sub={`Across ${s.reportedCount} reporting agents`}
              tone="blue"
              icon="pulse"
            />
            <StatCard
              label="Spend this month"
              value={usd(s.totalSpendUsd)}
              sub={s.model ? `Model: ${s.model}` : "Model not reported by this platform"}
              tone="purple"
              icon="trend"
            />
            <StatCard
              label="Monthly budget"
              value={s.monthlyBudgetUsd === null ? "Not published" : usd(s.monthlyBudgetUsd, 0)}
              sub={s.budgetUsedPct === null ? `${label} publishes no budget figure` : `${s.budgetUsedPct}% consumed`}
              tone={budgetTone}
              icon="target"
            />
            <StatCard
              label="Busiest agent"
              value={s.busiest && (s.busiest.calls ?? 0) > 0 ? s.busiest.name : "—"}
              sub={s.busiest && (s.busiest.calls ?? 0) > 0 ? `${count(s.busiest.calls)} calls · ${s.busiest.callSharePct ?? 0}% of fleet` : "No reporting agent made a call"}
              tone="cyan"
              icon="target"
            />
            <StatCard
              label="Active vs idle"
              value={`${s.activeCount} / ${s.idleCount}`}
              sub={`${s.activeCount} made calls, ${s.idleCount} reported a genuine zero`}
              tone="green"
              icon="check"
            />
          </div>

          <Card
            title={s.series ? "Fleet events per day" : "Fleet trend"}
            action={<span className="cs-master-note-inline">{s.series ? "From real event timestamps" : "Not available"}</span>}
          >
            {s.series ? (
              <TrendChart series={[{ name: "Events logged", data: s.series.calls }]} labels={s.series.labels} height={215} />
            ) : (
              <Empty>{s.seriesNote}</Empty>
            )}
            <p className="cs-master-note">{s.seriesNote}</p>
          </Card>

          <div className="cs-row-half">
            <Card title="Spend by agent">
              {s.spendByAgent.length === 0 ? (
                <Empty>
                  No reporting agent recorded any spend this month. {s.unreportedCount > 0 ? `${s.unreportedCount} agents are unreported and are not part of this statement.` : ""}
                </Empty>
              ) : (
                <div className="cs-donut-row">
                  <Donut data={s.spendByAgent as Slice[]} center={usd(s.totalSpendUsd)} centerLabel="USD" />
                  <Legend data={s.spendByAgent as Slice[]} />
                </div>
              )}
              <p className="cs-master-note">
                Top five agents by spend, with the remainder folded into one &ldquo;Other&rdquo; slice — the palette is six
                validated colours and is never extended.
              </p>
            </Card>

            <Card title="Calls by category">
              {s.callsByTag.length === 0 ? (
                <Empty>No reporting agent recorded a call this month, so there is no category mix to show.</Empty>
              ) : (
                <div className="cs-donut-row">
                  <Donut data={s.callsByTag as Slice[]} center={count(s.totalCalls)} centerLabel="Calls" />
                  <Legend data={s.callsByTag as Slice[]} />
                </div>
              )}
              <p className="cs-master-note">Category comes from the agent registry tag (Growth, Trust, Treasury…), not from the backend.</p>
            </Card>
          </div>

          <div className="cs-row-2">
            <Card title="Call volume ranking">
              {s.callsByAgent.length === 0 ? (
                <Empty>No calls recorded by any reporting agent.</Empty>
              ) : (
                <BarRows rows={s.callsByAgent as Slice[]} />
              )}
              <p className="cs-master-note">{s.coverageNote}</p>
            </Card>

            <Card title="Budget consumed">
              <div className="cs-master-ring">
                {s.budgetUsedPct === null ? (
                  <Empty>{label} does not publish a monthly AI budget, so consumption cannot be computed. No percentage is invented here.</Empty>
                ) : (
                  <>
                    <ScoreRing
                      value={Math.round(s.budgetUsedPct)}
                      max={100}
                      label="% used"
                      color={s.budgetUsedPct >= 90 ? "#e04452" : s.budgetUsedPct >= 70 ? "#c9860f" : "#0f9e69"}
                    />
                    <div className="cs-master-ring-facts">
                      <div><span>Spent</span><b className="cs-num">{usd(s.totalSpendUsd)}</b></div>
                      <div><span>Budget</span><b className="cs-num">{usd(s.monthlyBudgetUsd, 0)}</b></div>
                      <div><span>Remaining</span><b className="cs-num">{s.monthlyBudgetUsd !== null && s.totalSpendUsd !== null ? usd(Math.max(0, s.monthlyBudgetUsd - s.totalSpendUsd)) : "—"}</b></div>
                      <div><span>Cost / call</span><b className="cs-num">{s.fleetCostPerCallUsd === null ? "—" : usd(s.fleetCostPerCallUsd, 4)}</b></div>
                    </div>
                  </>
                )}
              </div>
            </Card>
          </div>

          <Card title="What the fleet data says">
            <ul className="cs-master-insights">
              {insights(s, label).map((line) => (
                <li key={line}>
                  <span className="cs-master-dot" />
                  {line}
                </li>
              ))}
            </ul>
            <p className="cs-master-note">{s.sourceNote}</p>
          </Card>
        </>
      )}
    </SpecialShell>
  );
}

/** Every line is a statement about a number the backend actually returned. */
function insights(s: MasterSnapshot, label: string): string[] {
  const out: string[] = [];
  if (s.unreportedCount > 0) {
    const names = s.rows.filter((r) => !r.reported).map((r) => r.name).slice(0, 4).join(", ");
    out.push(`${s.unreportedCount} of ${s.registryCount} agents did not report (${names}${s.unreportedCount > 4 ? ", …" : ""}). Their calls and spend are unknown, not zero, so every total on this page is a floor.`);
  }
  if (s.busiest && (s.busiest.calls ?? 0) > 0 && s.busiest.callSharePct !== null) {
    out.push(`${s.busiest.name} alone accounts for ${s.busiest.callSharePct}% of all fleet calls this month.`);
  }
  if (s.topSpender && (s.topSpender.spendUsd ?? 0) > 0 && s.topSpender.spendSharePct !== null) {
    out.push(`${s.topSpender.name} is the largest line item at ${usd(s.topSpender.spendUsd)} — ${s.topSpender.spendSharePct}% of fleet spend.`);
  }
  if (s.idleCount > 0) {
    out.push(`${s.idleCount} agents reported a genuine zero: they are wired up and answered, but made no calls this month.`);
  }
  if (s.budgetUsedPct !== null) {
    out.push(`The fleet has consumed ${s.budgetUsedPct}% of the ${usd(s.monthlyBudgetUsd, 0)} monthly budget.`);
  } else {
    out.push(`${label} publishes no monthly AI budget, so budget consumption is genuinely unknown here.`);
  }
  if (!s.callsTodayTracked) {
    out.push(`${label} reports monthly totals only — there is no per-day call count, so no daily figure is shown.`);
  }
  if (!s.tokensTracked) {
    out.push(`Token consumption is not tracked on ${label}'s fleet routes, so it is rendered as "Not tracked" rather than 0.`);
  }
  if (out.length === 0) out.push(`${label} returned a fleet with no activity of any kind this month.`);
  return out;
}

const CSS = `
.cs-master-note{margin:12px 0 0;font-size:10.5px;line-height:17px;color:#8891a8}
.cs-master-note-inline{font-size:10.5px;color:#8891a8}
.cs-master-ring{display:flex;align-items:center;gap:20px;flex-wrap:wrap}
.cs-master-ring-facts{display:flex;flex-direction:column;gap:9px;flex:1;min-width:150px}
.cs-master-ring-facts div{display:flex;justify-content:space-between;gap:12px;font-size:11.5px}
.cs-master-ring-facts span{color:#4c5470}
.cs-master-ring-facts b{font-weight:730}
.cs-master-insights{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px}
.cs-master-insights li{display:flex;gap:10px;font-size:12px;line-height:19px;color:#4c5470}
.cs-master-dot{width:6px;height:6px;border-radius:50%;background:#7c3aed;flex:0 0 auto;margin-top:6px}
`;
