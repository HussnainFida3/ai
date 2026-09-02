"use client";

/**
 * Site Chat Agent — Usage & Cost.
 *
 * Volume and money in one place. Call counters and token counters come from
 * GET /ai-agents/site-chat/summary; the model name, rate limit, monthly budget
 * and month-to-date spend come from the agent's own /stats. Cost-per-call and
 * budget-consumed are arithmetic over those two, computed only when both
 * inputs really arrived — otherwise they read "Not tracked", because a $0.00
 * here would be a measurement nobody took.
 *
 * Read-only: the only action affordance on the page is deliberately inert.
 */

import Link from "next/link";
import { useSiteChatSnapshot, formatMetric, formatRate } from "@/lib/sitechat-data";
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
  type NavItem,
} from "@/components/special/kit";

const NAV: NavItem[] = [
  { label: "Overview", icon: "dashboard", slug: "overview" },
  { label: "Conversations", icon: "chat", slug: "conversations" },
  { label: "Usage & Cost", icon: "trend", slug: "usage" },
  { label: "Quality", icon: "target", slug: "quality" },
  { label: "Chat with AI Agent", icon: "bot", slug: "chat" },
];

export default function SiteChatUsagePage({ params }: { params: Promise<{ platform: string }> }) {
  const platform = usePlatformParam(params);
  const s = useSiteChatSnapshot(platform);
  const label = platformLabel(platform);

  const tokenDim = s.dimensions.find((d) => d.key === "tokens");
  const windowDim = s.dimensions.find((d) => d.key === "window");
  const callerDim = s.dimensions.find((d) => d.key === "callers");

  const budget = s.budgetUsedPct;
  const budgetColor = budget === null ? "#69738c" : budget >= 80 ? "#e04452" : budget >= 50 ? "#c9860f" : "#0f9e69";

  /* Runtime facts, each stated as unknown rather than zero when /stats missed. */
  const runtime: Array<{ label: string; value: string; note: string }> = [
    {
      label: "Model",
      value: s.model ?? "Not tracked",
      note: s.model ? "Reported by /stats as the model this agent runs on." : "The /stats route did not supply a model name this session.",
    },
    {
      label: "Rate limit",
      value: s.rateLimitPerMinute === null ? "Not tracked" : `${s.rateLimitPerMinute}/min`,
      note: s.rateLimitPerMinute === null ? "No rateLimitPerMinute value arrived from /stats." : "Calls per minute this agent is allowed.",
    },
    {
      label: "Monthly budget",
      value: s.monthlyBudgetUsd === null ? "Not tracked" : `$${s.monthlyBudgetUsd.toFixed(2)}`,
      note: s.monthlyBudgetUsd === null ? "No monthlyBudgetUsd value arrived from /stats." : "The ceiling /stats reports for this agent's own spend.",
    },
    {
      label: "Spend this month",
      value: s.spendThisMonthUsd === null ? "Not tracked" : `$${s.spendThisMonthUsd.toFixed(2)}`,
      note: s.spendThisMonthUsd === null ? "No spendThisMonthUsd value arrived from /stats — this is unknown, not zero." : "Month-to-date AI spend for this agent.",
    },
    {
      label: "Tokens this month",
      value: s.tokensThisMonth === null ? "Not tracked" : s.tokensThisMonth.toLocaleString(),
      note: s.tokensThisMonth === null ? `${label} does not report a monthly token counter on /stats.` : "Tokens this agent moved in the current month.",
    },
    {
      label: "Tokens in / out (all-time)",
      value:
        s.tokensIn === null && s.tokensOut === null
          ? "Not tracked"
          : `${(s.tokensIn ?? 0).toLocaleString()} / ${(s.tokensOut ?? 0).toLocaleString()}`,
      note:
        s.tokensIn === null && s.tokensOut === null
          ? "/summary returned no token counters."
          : "Prompt tokens and reply tokens for the assistant, from /summary.",
    },
  ];

  return (
    <SpecialShell
      platform={platform}
      agentLabel="Site Chat Agent"
      tagline="Website assistant"
      basePath="/sitechat-agent-special"
      nav={NAV}
      headerIcon="trend"
      assistantBlurb="I don't answer your customers — I report on the assistant that does: volume, cache efficiency and spend."
      title="Usage & Cost"
      subtitle={`Call volume, token flow and AI spend for the ${label} website assistant`}
      actions={
        <Pill tone={!s.supported ? "amber" : s.error ? "red" : s.spendThisMonthUsd === null ? "amber" : "green"}>
          <Icon name={!s.supported || s.error || s.spendThisMonthUsd === null ? "alert" : "check"} size={12} />
          {!s.supported
            ? "Not on this platform"
            : s.error
              ? "Could not load"
              : s.spendThisMonthUsd === null
                ? "Spend unreported"
                : "Spend reported"}
        </Pill>
      }
    >
      <style>{USAGE_CSS}</style>

      {!s.supported ? (
        <UnsupportedNotice reason={s.unsupportedReason} label={label} />
      ) : (
        <>
          {s.error && <ErrorNote error={s.error} platform={platform} />}
          {s.partialNote && <p className="cs-sitechat-warn">{s.partialNote}</p>}

          <div className="cs-stats">
            {s.metrics.map((m) => (
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
              title={tokenDim ? tokenDim.title : "Token flow"}
              action={<span className="cs-sitechat-meta">{tokenDim ? `${tokenDim.total.toLocaleString()} ${tokenDim.unit}` : "None returned"}</span>}
            >
              {s.loading ? (
                <Empty>Loading live snapshot…</Empty>
              ) : s.error ? (
                <Empty>The snapshot failed, so token flow cannot be shown or assessed.</Empty>
              ) : tokenDim ? (
                <>
                  <div className="cs-donut-row">
                    <Donut data={tokenDim.rows} center={tokenDim.total.toLocaleString()} centerLabel="tokens" />
                    <Legend data={tokenDim.rows} />
                  </div>
                  <p className="cs-sitechat-note">{tokenDim.note}</p>
                </>
              ) : (
                <Empty>{`${label} reported no token counters, so prompt-versus-reply weight is unknown.`}</Empty>
              )}
            </Card>

            <Card title="Monthly Budget Consumed">
              <div className="cs-sitechat-ring">
                <ScoreRing
                  value={s.loading || budget === null ? 0 : Math.round(budget)}
                  max={100}
                  label={budget === null ? "Not tracked" : "% used"}
                  color={budgetColor}
                />
                <p>
                  {s.error
                    ? `Could not be computed — the ${label} snapshot failed to load.`
                    : s.loading
                      ? "Loading…"
                      : budget === null
                        ? "This needs both spendThisMonthUsd and monthlyBudgetUsd from /stats; at least one did not arrive, so consumption is unknown rather than 0%."
                        : `$${(s.spendThisMonthUsd ?? 0).toFixed(2)} of the $${(s.monthlyBudgetUsd ?? 0).toFixed(2)} monthly ceiling.`}
                </p>
              </div>
            </Card>
          </div>

          <div className="cs-row-half">
            <Card
              title={windowDim ? windowDim.title : "Call volume by window"}
              action={<span className="cs-sitechat-meta">From /summary&apos;s three counters</span>}
            >
              {s.loading ? (
                <Empty>Loading…</Empty>
              ) : s.error ? (
                <Empty>The snapshot failed, so volume cannot be broken down.</Empty>
              ) : windowDim ? (
                <>
                  <div className="cs-donut-row">
                    <Donut data={windowDim.rows} center={(s.totalCalls ?? 0).toLocaleString()} centerLabel="all-time" />
                    <Legend data={windowDim.rows} showPct={false} />
                  </div>
                  <p className="cs-sitechat-note">{windowDim.note}</p>
                </>
              ) : (
                <Empty>{`${label} returned no non-zero call counters.`}</Empty>
              )}
            </Card>

            <Card title="Calls by top user">
              {s.loading ? (
                <Empty>Loading…</Empty>
              ) : s.error ? (
                <Empty>The snapshot failed, so callers cannot be ranked.</Empty>
              ) : callerDim ? (
                <>
                  <BarRows rows={callerDim.rows.map((r, i) => ({ ...r, color: SERIES[i % SERIES.length] }))} colored suffix=" calls" />
                  <p className="cs-sitechat-note">{callerDim.note}</p>
                </>
              ) : (
                <Empty>{`${label} grouped no callers with a non-zero call count.`}</Empty>
              )}
            </Card>
          </div>

          <div className="cs-row-half">
            <Card
              title="Agent runtime"
              action={
                <button type="button" className="cs-btn" disabled aria-label="Export usage — disabled">
                  <Icon name="download" size={15} />Export
                </button>
              }
            >
              {s.loading ? (
                <Empty>Loading…</Empty>
              ) : s.error ? (
                <Empty>Runtime facts come from /stats, which cannot be read while the snapshot is failing.</Empty>
              ) : (
                <div className="cs-sitechat-keys">
                  {runtime.map((r) => (
                    <div className="cs-sitechat-key" key={r.label}>
                      <div className="cs-sitechat-key-head">
                        <span>{r.label}</span>
                        <b className="cs-num">{r.value}</b>
                      </div>
                      <p>{r.note}</p>
                    </div>
                  ))}
                </div>
              )}
              <p className="cs-sitechat-note">
                Export is intentionally disabled — this workspace is strictly read-only and never triggers a backend
                write or a per-call AI operation on its own.
              </p>
            </Card>

            <Card title="Computed cost and volume rates">
              {s.loading ? (
                <Empty>Loading…</Empty>
              ) : s.error ? (
                <Empty>Rates are arithmetic over the snapshot — none can be computed while it is unavailable.</Empty>
              ) : (
                <div className="cs-sitechat-rates">
                  {s.rates.map((r) => (
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
          </div>

          <Card title="What this page reads">
            <p className="cs-sitechat-note">{s.sourceNote}</p>
            <p className="cs-sitechat-note">{s.coverageNote}</p>
            <p className="cs-sitechat-note">
              Note the two different subjects on this page: the call and token counters describe the customer-facing
              assistant&apos;s traffic, while spend, budget, model and rate limit describe this reporting agent&apos;s
              own runtime. They are not the same meter.
            </p>
          </Card>
        </>
      )}
    </SpecialShell>
  );
}

/** Shown on a platform that never registered this agent. */
function UnsupportedNotice({ reason, label }: { reason: string | null; label: string }) {
  return (
    <Card title={`Site Chat Agent is not available on ${label}`}>
      <div className="cs-sitechat-unsupported">
        <span><Icon name="alert" size={18} /></span>
        <div>
          <p>{reason}</p>
          <p>No usage, token or spend figure is shown here — there is no meter on this platform to read one from.</p>
          <Link href="/sitechat-agent-special/ghrfix/usage" className="cs-btn cs-btn-primary">
            <Icon name="arrow" size={15} />Open the GhrFix workspace
          </Link>
        </div>
      </div>
    </Card>
  );
}

const USAGE_CSS = `
.cs-sitechat-meta{font-size:11px;color:#69738c}
.cs-sitechat-note{margin:12px 0 0;font-size:10.5px;line-height:17px;color:#8891a8}
.cs-sitechat-warn{margin:0 0 12px;border:1px solid #f2e2c2;background:#fff9ee;color:#8a6412;border-radius:10px;padding:10px 13px;font-size:11.5px;line-height:18px}
.cs-sitechat-ring{display:flex;flex-direction:column;align-items:center;gap:12px}
.cs-sitechat-ring p{margin:0;font-size:11.5px;line-height:19px;color:#4c5470;text-align:center}
.cs-sitechat-rates,.cs-sitechat-keys{display:flex;flex-direction:column;gap:12px}
.cs-sitechat-rate-head,.cs-sitechat-key-head{display:flex;justify-content:space-between;gap:12px;align-items:baseline;font-size:12px;font-weight:600;color:#11162d}
.cs-sitechat-rate p,.cs-sitechat-key p{margin:3px 0 0;font-size:10.5px;line-height:17px;color:#8891a8}
.cs-sitechat-unsupported{display:flex;gap:14px;align-items:flex-start}
.cs-sitechat-unsupported>span{width:36px;height:36px;border-radius:11px;flex:0 0 auto;display:grid;place-items:center;background:#fff6e6;color:#c9860f}
.cs-sitechat-unsupported p{margin:0 0 10px;font-size:12.5px;line-height:21px;color:#4c5470}
`;
