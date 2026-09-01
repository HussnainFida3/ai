"use client";

/**
 * ShadiLife — Matchmaking Agent — Dashboard overview.
 *
 * Lighter overview than before: the manual daily-picks job trigger and the
 * full second-opinion compatibility scorer now live on the Matches tab
 * (components/agents/views/domain/shadilife/matchmaking.tsx). This page
 * keeps the platform-wide match volume and premium composition.
 *
 * Real endpoint behind this page:
 *   GET /api/admin/dashboard → real platform match volume + premium composition
 */

import { useMemo } from "react";
import Link from "next/link";
import { AgentHeading } from "@/components/agents/AgentShell";
import { AreaChart, DonutChart, InsightsPanel, MetricCard, Svg } from "@/components/agents/rich";
import { Icons } from "@/components/agents/icons";
import type { AgentViewProps } from "../registry";
import { Empty, ErrorNote, Panel, num, pct, platGet, share, useLoad, type AdminDashboard } from "./_kit";

export default function ShadiLifeMatchmakingView({ platform, agent, api: _api }: AgentViewProps) {
  const load = useLoad<AdminDashboard | null>(() => platGet<AdminDashboard>(platform, "/admin/dashboard").catch((e) => {
    throw e;
  }), [platform.key]);
  const dash = load.data;

  const trend = useMemo(() => (dash?.registrationTrend ?? []).slice(-14), [dash]);
  const trendLabels = trend.map((t) => t.day ?? "");
  const trendMatches = trend.map((t) => t.matches ?? 0);
  const trendUsers = trend.map((t) => t.users ?? 0);

  const premium = dash?.premiumBreakdown ?? {};
  const premiumTotal = (premium.silver ?? 0) + (premium.gold ?? 0);

  return (
    <>
      <AgentHeading
        platform={platform}
        agent={agent}
        blurb="Platform-wide match volume and premium composition. The daily-picks job and the second-opinion compatibility scorer live on the Matches tab."
        actions={
          <>
            <Link href={`/${platform.key}/${agent.key}/matches`} className="ag-btn ag-btn-solid">
              <Svg path={Icons.heart} size={14} /> Open Matches
            </Link>
            <Link href={`/${platform.key}/${agent.key}/chat`} className="ag-btn ag-btn-ghost">Ask this agent →</Link>
          </>
        }
      />

      {load.error && <ErrorNote platform={platform} error={load.error} what="Platform match data could not load" />}

      <div className="ag-metrics">
        <MetricCard icon={<Svg path={Icons.heart} size={24} />} tone="pink" title="Matches made" value={load.loading ? "—" : num(dash?.stats?.matchesMade)} change={dash?.stats?.matchesMadeDelta ?? null} />
        <MetricCard icon={<Svg path={Icons.check} size={24} />} tone="green" title="Match success rate" value={load.loading ? "—" : pct(dash?.stats?.matchSuccessRate)} />
        <MetricCard icon={<Svg path={Icons.crown} size={24} />} tone="gold" title="Premium members (eligible)" value={load.loading ? "—" : num(dash?.stats?.premiumSubscribers)} change={dash?.stats?.premiumSubscribersDelta ?? null} />
        <MetricCard icon={<Svg path={Icons.sparkle} size={24} />} tone="purple" title="Premium members total" value={load.loading ? "—" : num(premiumTotal)} />
      </div>

      <div className="ag-split">
        <div className="ag-stack">
          <Panel title="Match volume" sub={trend.length > 0 ? `Real daily counts, last ${trend.length} days` : "Live from the owner dashboard"}>
            {trend.length > 0 ? (
              <AreaChart
                labels={trendLabels}
                series={[
                  { name: "Matches", data: trendMatches, color: agent.accent },
                  { name: "New members", data: trendUsers, color: "#3b82f6" },
                ]}
              />
            ) : (
              <Empty>{load.loading ? "Loading…" : "No trend data returned."}</Empty>
            )}
          </Panel>

          <Panel
            title="Daily-picks job & second-opinion scorer"
            sub="Run the manual daily match job and score individual pairs on the Matches tab"
            actions={<Link href={`/${platform.key}/${agent.key}/matches`} className="ag-btn ag-btn-ghost ag-btn-sm">Open Matches →</Link>}
          >
            <Empty>Each premium member without today's picks costs one AI call, so this stays a manual action — trigger it from the Matches tab.</Empty>
          </Panel>
        </div>

        <div className="ag-stack">
          <Panel title="Premium composition" sub="Only Silver/Gold members receive daily AI picks">
            {premiumTotal > 0 ? (
              <DonutChart
                data={[
                  { label: "Silver", value: premium.silver ?? 0, color: "#94a3b8" },
                  { label: "Gold", value: premium.gold ?? 0, color: "#facc15" },
                ]}
                totalLabel="Premium members"
              />
            ) : (
              <Empty>{load.loading ? "Loading…" : "No premium members recorded."}</Empty>
            )}
          </Panel>

          <InsightsPanel
            rows={[
              ...(dash?.stats?.matchSuccessRate !== undefined
                ? [{ icon: <Svg path={Icons.check} size={15} />, label: "Success rate", value: `${pct(dash?.stats?.matchSuccessRate)} of matches made are considered successful.` }]
                : []),
              ...(share(trendMatches.slice(-7).reduce((a, b) => a + b, 0), trendMatches.reduce((a, b) => a + b, 0)) !== null && trend.length >= 7
                ? [{
                    icon: <Svg path={Icons.trendUp} size={15} />,
                    label: "Recent share of matches",
                    value: `The last 7 of ${trend.length} days account for ${share(trendMatches.slice(-7).reduce((a, b) => a + b, 0), trendMatches.reduce((a, b) => a + b, 0))}% of matches in this window.`,
                  }]
                : []),
              { icon: <Svg path={Icons.sparkle} size={15} />, label: "Deeper matching tools", value: "The daily-picks trigger and per-pair compatibility scores live on the Matches tab." },
            ]}
          />
        </div>
      </div>
    </>
  );
}
