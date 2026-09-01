"use client";

import { useEffect, useState } from "react";
import { AgentShell } from "@/components/agents/AgentShell";
import { ApiError, type AgentActivityEntry, type Paginated } from "@/lib/api";
import { useAgentRoute, humanize, type AgentRouteParams } from "@/lib/use-agent";

export default function AgentActivityPage({ params }: { params: Promise<AgentRouteParams> }) {
  const { platform, agent, api } = useAgentRoute(params);
  const [rows, setRows] = useState<AgentActivityEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    api
      .activity({ pageSize: 50 })
      .then(({ data, meta }) => {
        if (!alive) return;
        setRows(data);
        setTotal((meta as Paginated)?.total ?? data.length);
      })
      .catch((err) => alive && setError(err instanceof ApiError ? err.message : `Could not reach ${platform.label}.`))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform.key, agent.key]);

  return (
    <AgentShell platform={platform} agent={agent} pageTitle="Activity">
      <div className="ag-panel">
        <div className="ag-panel-head">
          <div>
            <div className="ag-panel-title">Real Actions Taken</div>
            <div className="ag-panel-sub">Every audited write this agent has made on {platform.label}</div>
          </div>
          <span style={{ fontSize: 11, color: "var(--ag-ink-faint)" }}>{total.toLocaleString()} total</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="ag-table">
            <thead>
              <tr><th>Action</th><th>Target</th><th>Admin</th><th>When</th></tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={4} className="ag-empty">Loading…</td></tr>}
              {!loading && error && <tr><td colSpan={4} className="ag-empty" style={{ color: "var(--ag-red)" }}>{error}</td></tr>}
              {!loading && !error && rows.length === 0 && (
                <tr><td colSpan={4} className="ag-empty">No actions recorded yet — nothing real has been done through this agent.</td></tr>
              )}
              {!loading && !error && rows.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 650 }}>{humanize(r.action)}</td>
                  <td style={{ color: "var(--ag-ink-faint)" }}>
                    {r.targetType ? `${r.targetType}${r.targetId ? ` #${String(r.targetId).slice(0, 8)}` : ""}` : "—"}
                  </td>
                  <td>{r.admin?.name ?? "—"}</td>
                  <td style={{ color: "var(--ag-ink-faint)" }}>{new Date(r.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AgentShell>
  );
}
