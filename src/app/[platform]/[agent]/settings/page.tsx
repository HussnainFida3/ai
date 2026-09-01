"use client";

import { useEffect, useState } from "react";
import { AgentShell } from "@/components/agents/AgentShell";
import { ApiError, type AgentStats } from "@/lib/api";
import { useAgentRoute, type AgentRouteParams } from "@/lib/use-agent";

export default function AgentSettingsPage({ params }: { params: Promise<AgentRouteParams> }) {
  const { platform, agent, api } = useAgentRoute(params);
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    api
      .stats()
      .then(({ data }) => alive && setStats(data))
      .catch((err) => alive && setError(err instanceof ApiError ? err.message : `Could not reach ${platform.label}.`))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform.key, agent.key]);

  const spent = Number(stats?.spendThisMonthUsd ?? 0);
  const budget = Number(stats?.monthlyBudgetUsd ?? 0);
  const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;

  return (
    <AgentShell platform={platform} agent={agent} pageTitle="Settings">
      <div style={{ maxWidth: 720, display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="ag-panel">
          <div className="ag-panel-head">
            <div>
              <div className="ag-panel-title">Configuration</div>
              <div className="ag-panel-sub">Runtime settings for this agent on {platform.label}</div>
            </div>
            <span className="ag-plat-badge" style={{ background: platform.color }}>{platform.label}</span>
          </div>
          <div className="ag-panel-body ag-form-grid">
            <Field label="Platform" value={platform.label} />
            <Field label="API base" value={platform.apiBase} />
            <Field label="Agent route" value={agent.base} />
            <Field label="Model" value={stats?.model ?? (loading ? "—" : "Unavailable")} />
            <Field label="Rate limit" value={stats ? `${stats.rateLimitPerMinute} req/min` : "—"} />
            <Field label="Monthly budget" value={budget ? `$${budget}` : "—"} />
          </div>
        </div>

        <div className="ag-panel">
          <div className="ag-panel-head">
            <div>
              <div className="ag-panel-title">Usage This Month</div>
              <div className="ag-panel-sub">Real spend, logged on every call this agent makes</div>
            </div>
          </div>
          <div className="ag-panel-body">
            {error && <p style={{ margin: 0, fontSize: 12, color: "var(--ag-red)" }}>{error}</p>}
            {!error && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                  <strong className="ag-display" style={{ fontSize: 20 }}>${spent.toFixed(2)} spent</strong>
                  <span style={{ fontSize: 11, color: "var(--ag-ink-faint)" }}>of ${budget || "—"} budget</span>
                </div>
                <div style={{ height: 8, borderRadius: 6, background: "var(--ag-track)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: "var(--ag-accent)", borderRadius: 6 }} />
                </div>
                <div className="ag-form-grid" style={{ marginTop: 18 }}>
                  <Field label="Calls today" value={stats?.callsToday !== undefined ? stats.callsToday.toLocaleString() : "—"} />
                  <Field label="Calls this month" value={stats ? stats.callsThisMonth.toLocaleString() : "—"} />
                  <Field label="Tokens this month" value={stats?.tokensThisMonth !== undefined ? stats.tokensThisMonth.toLocaleString() : "—"} />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AgentShell>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, color: "var(--ag-ink-faint)", fontWeight: 650, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 12.5, fontWeight: 600, wordBreak: "break-word" }}>{value}</div>
    </div>
  );
}
