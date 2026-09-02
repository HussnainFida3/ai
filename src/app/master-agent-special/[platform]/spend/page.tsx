"use client";

/**
 * Master AI — Spend.
 *
 * The money view of the fleet: what each agent cost this month, how that sits
 * against the monthly budget, and what a single call actually costs. Figures
 * come from `useMasterSnapshot` — GhrFix's /ai-agents/master/overview plus
 * /ai-agents/master/budget, or ShadiLife's /ai-agents/_meta/usage (which
 * carries `monthlyBudgetUsd` and per-agent `spendUsd`).
 *
 * Where a platform publishes no budget, the ring and the remaining figure are
 * replaced by a sentence naming the platform — no default budget is assumed.
 * Cost per call is only computed for agents that reported AND made calls.
 */

import { useMemo } from "react";
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

export default function MasterSpendPage({ params }: { params: Promise<{ platform: string }> }) {
  const platform = usePlatformParam(params);
  const s = useMasterSnapshot(platform);
  const label = platformLabel(platform);

  const spenders = useMemo(
    () => s.rows.filter((r) => r.reported).sort((a, b) => (b.spendUsd ?? 0) - (a.spendUsd ?? 0)),
    [s.rows],
  );

  /* Cost per call is only meaningful where both numbers are real. */
  const costRows: Slice[] = useMemo(
    () =>
      spenders
        .filter((r) => r.costPerCallUsd !== null)
        .sort((a, b) => (b.costPerCallUsd ?? 0) - (a.costPerCallUsd ?? 0))
        .slice(0, 6)
        .map((r) => ({ label: r.name, value: Math.round((r.costPerCallUsd ?? 0) * 10000) / 10000 })),
    [spenders],
  );

  const remaining =
    s.monthlyBudgetUsd !== null && s.totalSpendUsd !== null ? Math.max(0, s.monthlyBudgetUsd - s.totalSpendUsd) : null;

  return (
    <SpecialShell
      platform={platform}
      agentLabel="Master AI"
      tagline="Fleet telemetry"
      basePath="/master-agent-special"
      nav={NAV}
      headerIcon="trend"
      assistantBlurb="I watch every other agent on this platform — calls, spend and activity — and only report what the backend records."
      title="Spend"
      subtitle={`Month-to-date AI cost across the ${label} fleet`}
      actions={
        <Pill tone={s.error ? "red" : s.budgetUsedPct === null ? "purple" : s.budgetUsedPct >= 90 ? "red" : s.budgetUsedPct >= 70 ? "amber" : "green"}>
          <Icon name={s.error ? "alert" : "target"} size={12} />
          {s.error ? "Spend unreadable" : s.loading ? "Loading" : s.budgetUsedPct === null ? "No budget published" : `${s.budgetUsedPct}% of budget`}
        </Pill>
      }
    >
      <style>{CSS}</style>

      {s.error && <ErrorNote error={s.error} platform={platform} />}

      {s.error ? (
        <Card title="Spend">
          <Empty>
            {label} did not return usage data, so this page cannot state what the fleet spent. Read this as
            &ldquo;unknown&rdquo;, not as &ldquo;no spend&rdquo;.
          </Empty>
        </Card>
      ) : s.loading ? (
        <Card title="Spend">
          <Empty>Reading {label} usage…</Empty>
        </Card>
      ) : (
        <>
          <div className="cs-stats">
            <StatCard label="Total spend" value={usd(s.totalSpendUsd)} sub={`Across ${s.reportedCount} reporting agents`} tone="purple" icon="trend" />
            <StatCard
              label="Monthly budget"
              value={s.monthlyBudgetUsd === null ? "Not published" : usd(s.monthlyBudgetUsd, 0)}
              sub={s.monthlyBudgetUsd === null ? `${label} exposes no budget figure` : "From the platform's own usage route"}
              tone="blue"
              icon="target"
            />
            <StatCard
              label="Remaining"
              value={remaining === null ? "—" : usd(remaining)}
              sub={remaining === null ? "Needs a published budget" : `${100 - (s.budgetUsedPct ?? 0)}% of the month's allowance left`}
              tone={remaining === null ? "amber" : "green"}
              icon="check"
            />
            <StatCard
              label="Fleet cost / call"
              value={s.fleetCostPerCallUsd === null ? "—" : usd(s.fleetCostPerCallUsd, 4)}
              sub={s.fleetCostPerCallUsd === null ? "No calls recorded to divide by" : `${count(s.totalCalls)} calls`}
              tone="cyan"
              icon="pulse"
            />
            <StatCard
              label="Largest line item"
              value={s.topSpender && (s.topSpender.spendUsd ?? 0) > 0 ? s.topSpender.name : "—"}
              sub={s.topSpender && (s.topSpender.spendUsd ?? 0) > 0 ? `${usd(s.topSpender.spendUsd)} · ${s.topSpender.spendSharePct ?? 0}% of spend` : "No agent recorded spend"}
              tone="amber"
              icon="tag"
            />
            <StatCard
              label="Tokens this month"
              value="Not tracked"
              sub={`${label}'s fleet routes do not report token counts`}
              tone="red"
              icon="alert"
            />
          </div>

          <div className="cs-row-2">
            <Card title="Spend by agent">
              {s.spendByAgent.length === 0 ? (
                <Empty>
                  No reporting agent recorded spend this month.
                  {s.unreportedCount > 0 ? ` ${s.unreportedCount} agents are unreported and are not covered by that statement.` : ""}
                </Empty>
              ) : (
                <div className="cs-donut-row">
                  <Donut data={s.spendByAgent as Slice[]} center={usd(s.totalSpendUsd)} centerLabel="USD" />
                  <Legend data={s.spendByAgent as Slice[]} />
                </div>
              )}
              <p className="cs-master-note">Top five agents by spend plus a folded &ldquo;Other&rdquo; slice — the six-colour palette is never extended.</p>
            </Card>

            <Card title="Budget consumed">
              <div className="cs-master-ring">
                {s.budgetUsedPct === null ? (
                  <Empty>
                    {label} does not publish a monthly AI budget on any route this workspace reads, so consumption
                    cannot be computed. No budget is assumed in its place.
                  </Empty>
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
                      <div><span>Remaining</span><b className="cs-num">{usd(remaining)}</b></div>
                      <div><span>Model</span><b>{s.model ?? "Not reported"}</b></div>
                    </div>
                  </>
                )}
              </div>
            </Card>
          </div>

          <div className="cs-row-half">
            <Card title="Spend by category">
              {s.spendByTag.length === 0 ? (
                <Empty>No spend to break down by category.</Empty>
              ) : (
                <div className="cs-donut-row">
                  <Donut data={s.spendByTag as Slice[]} center={usd(s.totalSpendUsd)} centerLabel="USD" />
                  <Legend data={s.spendByTag as Slice[]} />
                </div>
              )}
              <p className="cs-master-note">Category is the registry tag for each agent; spend is the backend&apos;s own figure summed within it.</p>
            </Card>

            <Card title="Most expensive per call">
              {costRows.length === 0 ? (
                <Empty>
                  Cost per call needs both a spend figure and a call count above zero. No reporting agent has both this
                  month, so nothing is ranked here.
                </Empty>
              ) : (
                <BarRows rows={costRows} suffix="" />
              )}
              <p className="cs-master-note">
                Computed as spend ÷ calls for reporting agents only. Agents with zero calls are excluded rather than
                shown at $0.00 per call.
              </p>
            </Card>
          </div>

          <Card title="Spend ranking">
            {s.spendByAgent.length === 0 ? <Empty>No spend recorded.</Empty> : <BarRows rows={s.spendByAgent as Slice[]} />}
          </Card>

          <Card title="Cost table">
            {spenders.length === 0 ? (
              <Empty>No agent reported usage, so there is nothing to cost out.</Empty>
            ) : (
              <div className="cs-table-wrap">
                <table className="cs-table">
                  <thead>
                    <tr>
                      <th>Agent</th>
                      <th>Category</th>
                      <th className="cs-num">Calls</th>
                      <th className="cs-num">Spend</th>
                      <th className="cs-num">Share of spend</th>
                      <th className="cs-num">Cost / call</th>
                      <th className="cs-num">Of budget</th>
                    </tr>
                  </thead>
                  <tbody>
                    {spenders.map((r) => (
                      <tr key={r.key}>
                        <td className="title">{r.name}</td>
                        <td>{r.tag}</td>
                        <td className="cs-num">{count(r.calls)}</td>
                        <td className="cs-num">{usd(r.spendUsd)}</td>
                        <td className="cs-num">{r.spendSharePct === null ? "—" : `${r.spendSharePct}%`}</td>
                        <td className="cs-num">{r.costPerCallUsd === null ? "—" : usd(r.costPerCallUsd, 4)}</td>
                        <td className="cs-num">
                          {s.monthlyBudgetUsd === null || s.monthlyBudgetUsd <= 0
                            ? "—"
                            : `${Math.round(((r.spendUsd ?? 0) / s.monthlyBudgetUsd) * 1000) / 10}%`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {s.unreportedCount > 0 && (
              <p className="cs-master-note">
                {s.unreportedCount} agents are missing from this table entirely because they did not report. Their cost
                is unknown, so the total above is a floor rather than the fleet&apos;s true spend.
              </p>
            )}
            <p className="cs-master-note">{s.sourceNote}</p>
          </Card>

          <Card title="What the money says">
            <ul className="cs-master-insights">
              {moneyInsights(s, label).map((line) => (
                <li key={line}>
                  <span className="cs-master-dot" />
                  {line}
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </SpecialShell>
  );
}

function moneyInsights(s: MasterSnapshot, label: string): string[] {
  const out: string[] = [];
  if (s.totalSpendUsd !== null) out.push(`${s.reportedCount} reporting agents spent ${usd(s.totalSpendUsd)} month-to-date.`);
  if (s.topSpender && (s.topSpender.spendUsd ?? 0) > 0 && s.topSpender.spendSharePct !== null) {
    out.push(`${s.topSpender.name} carries ${s.topSpender.spendSharePct}% of that on its own.`);
  }
  const priciest = s.rows.filter((r) => r.costPerCallUsd !== null).sort((a, b) => (b.costPerCallUsd ?? 0) - (a.costPerCallUsd ?? 0))[0];
  if (priciest) out.push(`${priciest.name} has the highest unit cost at ${usd(priciest.costPerCallUsd, 4)} per call.`);
  if (s.budgetUsedPct !== null) {
    out.push(
      s.budgetUsedPct >= 90
        ? `The fleet is at ${s.budgetUsedPct}% of budget — effectively spent.`
        : `The fleet is at ${s.budgetUsedPct}% of the ${usd(s.monthlyBudgetUsd, 0)} monthly budget.`,
    );
  } else {
    out.push(`${label} publishes no monthly budget, so there is no consumption figure to give.`);
  }
  if (s.unreportedCount > 0) out.push(`${s.unreportedCount} agents did not report; the true fleet spend is at least, and probably above, the total shown.`);
  out.push(`Token usage is not exposed by ${label}'s fleet routes, so it is reported as "Not tracked" rather than zero.`);
  return out;
}

const CSS = `
.cs-master-note{margin:12px 0 0;font-size:10.5px;line-height:17px;color:#8891a8}
.cs-master-ring{display:flex;align-items:center;gap:20px;flex-wrap:wrap}
.cs-master-ring-facts{display:flex;flex-direction:column;gap:9px;flex:1;min-width:150px}
.cs-master-ring-facts div{display:flex;justify-content:space-between;gap:12px;font-size:11.5px}
.cs-master-ring-facts span{color:#4c5470}
.cs-master-ring-facts b{font-weight:730}
.cs-master-insights{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px}
.cs-master-insights li{display:flex;gap:10px;font-size:12px;line-height:19px;color:#4c5470}
.cs-master-dot{width:6px;height:6px;border-radius:50%;background:#7c3aed;flex:0 0 auto;margin-top:6px}
`;
