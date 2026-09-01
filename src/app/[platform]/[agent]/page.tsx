"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AgentShell, AgentHeading } from "@/components/agents/AgentShell";
import { BarList, MetricCard, Svg } from "@/components/agents/rich";
import { Icons } from "@/components/agents/icons";
import { ApiError, type AgentStats } from "@/lib/api";
import { getAgentView } from "@/components/agents/views/registry";
import { useAgentRoute, formatValue, humanize, type AgentRouteParams } from "@/lib/use-agent";

const TONES = ["purple", "green", "blue", "gold", "pink", "red"] as const;
type Row = { label: string; value: number };

/** Splits an arbitrary /summary payload into scalar metrics and numeric groups. */
function digest(summary: unknown) {
  const metrics: Array<{ label: string; value: string }> = [];
  const groups: Array<{ title: string; rows: Row[] }> = [];
  if (!summary || typeof summary !== "object") return { metrics, groups };

  for (const [key, value] of Object.entries(summary as Record<string, unknown>)) {
    if (value === null || ["string", "number", "boolean"].includes(typeof value)) {
      metrics.push({ label: humanize(key), value: formatValue(value) });
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      const rows = Object.entries(value as Record<string, unknown>)
        .filter(([, v]) => typeof v === "number")
        .map(([k, v]) => ({ label: humanize(k), value: v as number }));
      if (rows.length > 0) groups.push({ title: humanize(key), rows });
    }
  }
  return { metrics, groups };
}

export default function AgentDashboardPage({ params }: { params: Promise<AgentRouteParams> }) {
  const { platform, agent, api } = useAgentRoute(params);
  const Bespoke = getAgentView(platform.key, agent.key);

  if (Bespoke) {
    return (
      <AgentShell platform={platform} agent={agent} pageTitle="Dashboard">
        <Bespoke platform={platform} agent={agent} api={api} />
      </AgentShell>
    );
  }
  return <GenericDashboard platform={platform} agent={agent} api={api} />;
}

function GenericDashboard({ platform, agent, api }: { platform: ReturnType<typeof useAgentRoute>["platform"]; agent: ReturnType<typeof useAgentRoute>["agent"]; api: ReturnType<typeof useAgentRoute>["api"] }) {
  const [summary, setSummary] = useState<unknown>(null);
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    setSummary(null);

    // /stats exists on every agent router; /summary exists on most but not all,
    // so a missing summary is not treated as a failure.
    Promise.allSettled([api.get<unknown>("/summary"), api.stats()])
      .then(([s, st]) => {
        if (!alive) return;
        if (s.status === "fulfilled") setSummary(s.value.data);
        if (st.status === "fulfilled") setStats(st.value.data);
        if (s.status === "rejected" && st.status === "rejected") {
          const e = st.reason;
          setError(e instanceof ApiError ? e.message : `Could not reach ${platform.label}.`);
        }
      })
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform.key, agent.key]);

  const { metrics, groups } = digest(summary);

  return (
    <AgentShell platform={platform} agent={agent} pageTitle="Dashboard">
      <AgentHeading
        platform={platform}
        agent={agent}
        actions={
          <>
            <Link href={`/${platform.key}/${agent.key}/chat`} className="ag-btn ag-btn-solid">Ask this agent →</Link>
            <Link href={`/${platform.key}/${agent.key}/insights`} className="ag-btn ag-btn-ghost">Insights</Link>
          </>
        }
      />

      {error && (
        <div className="ag-panel" style={{ marginBottom: 20 }}>
          <div className="ag-panel-body">
            <p style={{ margin: 0, fontSize: 12.5, color: "var(--ag-red)" }}>{error}</p>
            <p style={{ margin: "8px 0 0", fontSize: 11.5, color: "var(--ag-ink-faint)" }}>
              Connect {platform.label} on the <Link href="/connect" style={{ color: "var(--ag-accent)", fontWeight: 650 }}>Connect</Link> page,
              and make sure its backend is running at {platform.apiBase}.
            </p>
          </div>
        </div>
      )}

      {metrics.length > 0 && (
        <div className="ag-metrics">
          {metrics.slice(0, 6).map((m, i) => (
            <MetricCard
              key={m.label}
              icon={<Svg path={Icons.trendUp} size={24} />}
              tone={TONES[i % TONES.length]}
              title={m.label}
              value={loading ? "—" : m.value}
            />
          ))}
        </div>
      )}

      <div className="ag-split">
        <div className="ag-stack">
          {groups.length > 0 ? (
            <div className="ag-duo">
              {groups.slice(0, 4).map((g) => (
                <div className="ag-panel" key={g.title}>
                  <div className="ag-panel-head">
                    <div>
                      <div className="ag-panel-title">{g.title}</div>
                      <div className="ag-panel-sub">Live from {platform.label}</div>
                    </div>
                  </div>
                  <div className="ag-panel-body">
                    <BarList rows={g.rows} ranked emptyText={loading ? "Loading…" : "No data yet."} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            !error && (
              <div className="ag-panel">
                <div className="ag-panel-head"><div className="ag-panel-title">Overview</div></div>
                <div className="ag-panel-body">
                  <p style={{ margin: 0, fontSize: 12.5, color: "var(--ag-ink-faint)" }}>
                    {loading ? "Loading live data…" : `This agent exposes no /summary endpoint. Use Chat to query ${platform.label} directly, or open Insights.`}
                  </p>
                </div>
              </div>
            )
          )}
        </div>

        <div className="ag-panel">
          <div className="ag-panel-head">
            <div>
              <div className="ag-panel-title">Agent Runtime</div>
              <div className="ag-panel-sub">Real usage from the shared usage log</div>
            </div>
          </div>
          <div className="ag-panel-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {stats ? (
              <>
                <Stat label="Model" value={stats.model} />
                <Stat label="Calls today" value={formatValue(stats.callsToday)} />
                <Stat label="Calls this month" value={formatValue(stats.callsThisMonth)} />
                <Stat label="Spend this month" value={`$${Number(stats.spendThisMonthUsd ?? 0).toFixed(2)}`} />
                <Stat label="Rate limit" value={`${stats.rateLimitPerMinute}/min`} />
              </>
            ) : (
              <p style={{ margin: 0, fontSize: 12, color: "var(--ag-ink-faint)" }}>
                {loading ? "Loading…" : "Runtime stats unavailable."}
              </p>
            )}
          </div>
        </div>
      </div>
    </AgentShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
      <span style={{ fontSize: 11.5, color: "var(--ag-ink-soft)" }}>{label}</span>
      <strong className="ag-display" style={{ fontSize: 13, fontVariantNumeric: "tabular-nums" }}>{value}</strong>
    </div>
  );
}
