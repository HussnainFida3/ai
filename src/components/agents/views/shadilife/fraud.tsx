"use client";

/**
 * ShadiLife — Fraud Agent — Dashboard overview.
 *
 * Lighter overview than before: the full fraud report — AI risk summary,
 * every suspicious IP, every duplicate-phone group — now lives on the
 * Reports tab (components/agents/views/domain/shadilife/fraud.tsx). This
 * page is a short explainer pointing there, since everything here comes
 * from that one on-demand, AI-costing endpoint.
 *
 * Real endpoint (used on the Reports tab, not fetched here):
 *   GET /api/ai-agents/fraud/report → { summary, suspiciousIps, duplicatePhones }
 */

import Link from "next/link";
import { AgentHeading } from "@/components/agents/AgentShell";
import { InsightsPanel, MetricCard, Svg } from "@/components/agents/rich";
import { Icons } from "@/components/agents/icons";
import type { AgentViewProps } from "../registry";
import { Empty, Panel } from "./_kit";

export default function ShadiLifeFraudView({ platform, agent }: AgentViewProps) {
  return (
    <>
      <AgentHeading
        platform={platform}
        agent={agent}
        blurb="Real, read-only fraud signals — repeated failed logins by IP, and phone numbers shared across multiple accounts. Deliberately scoped to what's already trackable today."
        actions={
          <>
            <Link href={`/${platform.key}/${agent.key}/reports`} className="ag-btn ag-btn-solid">
              <Svg path={Icons.shield} size={14} /> Open Reports
            </Link>
            <Link href={`/${platform.key}/${agent.key}/chat`} className="ag-btn ag-btn-ghost">Ask this agent →</Link>
          </>
        }
      />

      <div className="ag-metrics">
        <MetricCard icon={<Svg path={Icons.shield} size={24} />} tone="red" title="Suspicious IPs" value="—" />
        <MetricCard icon={<Svg path={Icons.phone} size={24} />} tone="gold" title="Duplicate phone groups" value="—" />
        <MetricCard icon={<Svg path={Icons.users} size={24} />} tone="purple" title="Accounts sharing a phone" value="—" />
        <MetricCard icon={<Svg path={Icons.alert} size={24} />} tone="blue" title="Worst IP's failed logins" value="—" />
      </div>

      <div className="ag-split">
        <div className="ag-stack">
          <Panel
            title="Fraud report"
            sub="One on-demand endpoint spends one AI call — run it on the Reports tab"
            actions={<Link href={`/${platform.key}/${agent.key}/reports`} className="ag-btn ag-btn-ghost ag-btn-sm">Open Reports →</Link>}
          >
            <Empty>No report run yet this session. Because generating it spends one AI call, it is never fetched automatically — open the Reports tab and press “Run fraud report.”</Empty>
          </Panel>
        </div>

        <div className="ag-stack">
          <InsightsPanel
            rows={[
              { icon: <Svg path={Icons.shield} size={15} />, label: "Suspicious IPs", value: "3+ failed logins in the last 30 days, ranked worst-first on the Reports tab." },
              { icon: <Svg path={Icons.phone} size={15} />, label: "Duplicate phones", value: "Phone numbers shared by 2+ accounts, with the full account list, on the Reports tab." },
            ]}
          />
        </div>
      </div>
    </>
  );
}
