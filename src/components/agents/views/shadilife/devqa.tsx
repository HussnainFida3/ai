"use client";

/**
 * ShadiLife — Developer & QA Agent — Dashboard overview.
 *
 * Lighter overview than before: the full type-check runner and the full
 * admin activity log now live on the Health tab
 * (components/agents/views/domain/shadilife/devqa.tsx). This page keeps
 * just the at-a-glance numbers, spend context, and a short teaser of the
 * most recent activity.
 *
 * Real endpoints behind this page:
 *   GET  /api/ai-agents/devqa/activity-log?limit=8 → the real AdminAuditLog table, most recent rows only
 *   GET  /api/ai-agents/_meta/usage                → AI spend/calls across every agent this month
 */

import { useMemo } from "react";
import Link from "next/link";
import { AgentHeading } from "@/components/agents/AgentShell";
import { BarList, InsightsPanel, MetricCard, Svg } from "@/components/agents/rich";
import { Icons } from "@/components/agents/icons";
import { apiFetch } from "@/lib/api";
import type { AgentViewProps } from "../registry";
import { Empty, ErrorPanel, Panel, TableScroll, fmtDateTime, fmtInt, useAsync } from "./_shadilife-console-kit";

/** Turns "devqa.health_check" / "matchmaking-daily" into "Devqa health check". */
function humanizeAction(a: string): string {
  const s = a.replace(/[._-]+/g, " ").trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "—";
}

interface AuditLogRow {
  id: string;
  adminId?: string;
  action?: string;
  targetType?: string;
  targetId?: string | null;
  createdAt?: string;
}
interface AgentSpend {
  agent?: string;
  spendUsd?: number;
  calls?: number;
}
interface MetaUsage {
  configured?: boolean;
  model?: string;
  monthlyBudgetUsd?: number;
  monthlySpendUsd?: number;
  monthlyCallCount?: number;
  byAgent?: AgentSpend[];
}

export default function ShadiLifeDevQaView({ platform, agent, api }: AgentViewProps) {
  const activity = useAsync<AuditLogRow[]>(platform, async () => (await api.get<AuditLogRow[]>("/activity-log", { limit: 8 })).data ?? [], true);
  const usage = useAsync<MetaUsage>(platform, async () => (await apiFetch<MetaUsage>(platform.key, "/ai-agents/_meta/usage")).data ?? {}, true);

  const spendRows = useMemo(
    () => (usage.data?.byAgent ?? []).filter((a) => (a.spendUsd ?? 0) > 0).sort((a, b) => (b.spendUsd ?? 0) - (a.spendUsd ?? 0)).slice(0, 8).map((a) => ({ label: humanizeAction(a.agent ?? "—"), value: Math.round((a.spendUsd ?? 0) * 10000) / 10000 })),
    [usage.data],
  );
  const actionRows = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of activity.data ?? []) {
      const k = r.action ?? "unknown";
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return [...map.entries()].map(([label, value]) => ({ label: humanizeAction(label), value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [activity.data]);

  return (
    <>
      <AgentHeading
        platform={platform}
        agent={agent}
        blurb="Read-only engineering health at a glance. The full type-check runner and the complete activity log live on the Health tab."
        actions={
          <>
            <Link href={`/${platform.key}/${agent.key}/health`} className="ag-btn ag-btn-solid">
              <Svg path={Icons.shield} size={14} /> Open Health
            </Link>
            <Link href={`/${platform.key}/${agent.key}/chat`} className="ag-btn ag-btn-ghost">Ask this agent →</Link>
          </>
        }
      />

      <div className="ag-metrics">
        <MetricCard icon={<Svg path={Icons.audit} size={24} />} tone="blue" title="Recent admin actions" value={activity.loading || activity.error ? "—" : fmtInt((activity.data ?? []).length)} />
        <MetricCard icon={<Svg path={Icons.dollar} size={24} />} tone="gold" title="AI spend this month" value={usage.loading ? "—" : usage.data?.monthlySpendUsd !== undefined ? `$${(usage.data.monthlySpendUsd ?? 0).toFixed(2)}` : "—"} />
        <MetricCard icon={<Svg path={Icons.gauge} size={24} />} tone="purple" title="AI calls this month" value={usage.loading ? "—" : fmtInt(usage.data?.monthlyCallCount)} />
        <MetricCard icon={<Svg path={Icons.check} size={24} />} tone="green" title="Monthly budget" value={usage.loading ? "—" : usage.data?.monthlyBudgetUsd !== undefined ? `$${(usage.data.monthlyBudgetUsd ?? 0).toFixed(2)}` : "—"} />
      </div>

      <div className="ag-split">
        <div className="ag-stack">
          <Panel
            title="Recent admin activity"
            sub="A quick look — the full searchable log lives on the Health tab"
            actions={<Link href={`/${platform.key}/${agent.key}/health`} className="ag-btn ag-btn-ghost ag-btn-sm">View all in Health →</Link>}
            flush
          >
            {(activity.data ?? []).length > 0 ? (
              <TableScroll>
                <table className="ag-table">
                  <thead>
                    <tr><th>Action</th><th>Target</th><th>When</th></tr>
                  </thead>
                  <tbody>
                    {(activity.data ?? []).slice(0, 5).map((r) => (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 650 }}>{humanizeAction(r.action ?? "—")}</td>
                        <td style={{ color: "var(--ag-ink-soft)", fontSize: 11.5 }}>{r.targetType}{r.targetId ? ` · ${r.targetId.slice(0, 10)}…` : ""}</td>
                        <td style={{ color: "var(--ag-ink-faint)", whiteSpace: "nowrap" }}>{fmtDateTime(r.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableScroll>
            ) : (
              <Empty>{activity.loading ? "Loading…" : "No admin activity recorded yet."}</Empty>
            )}
          </Panel>

          {activity.error && <ErrorPanel message={activity.error} platform={platform} what="The activity log" />}
        </div>

        <div className="ag-stack">
          <Panel title="AI spend by agent" sub="This calendar month">
            <BarList rows={spendRows} ranked color="#facc15" emptyText={usage.loading ? "Loading…" : "No AI spend recorded this month."} />
          </Panel>

          {usage.error && <ErrorPanel message={usage.error} platform={platform} what="AI usage" />}

          <InsightsPanel
            rows={[
              ...(usage.data?.monthlyBudgetUsd !== undefined && usage.data?.monthlySpendUsd !== undefined
                ? [{ icon: <Svg path={Icons.dollar} size={15} />, label: "AI budget", value: `$${(usage.data.monthlySpendUsd ?? 0).toFixed(2)} spent of a $${(usage.data.monthlyBudgetUsd ?? 0).toFixed(2)} monthly cap.` }]
                : []),
              ...(actionRows.length > 0
                ? [{ icon: <Svg path={Icons.audit} size={15} />, label: "Most frequent action", value: `${actionRows[0].label} occurred ${fmtInt(actionRows[0].value)} time(s) recently.` }]
                : []),
              { icon: <Svg path={Icons.shield} size={15} />, label: "Full engineering deep-dive", value: "Run the real type-check and search the complete activity log on the Health tab." },
            ]}
          />
        </div>
      </div>
    </>
  );
}
