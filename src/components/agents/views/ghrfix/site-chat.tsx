"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { AgentHeading } from "@/components/agents/AgentShell";
import { AgentSidePanel, Avatar, InsightsPanel, MetricCard, Svg } from "@/components/agents/rich";
import { Icons } from "@/components/agents/icons";
import { ApiError } from "@/lib/api";
import type { AgentViewProps } from "./../registry";

/** Shape of GET /ai-agents/site-chat/summary — real admin.service.aiUsageStats(). */
interface UsageSummary {
  totalCalls: number;
  callsToday: number;
  callsThisMonth: number;
  cachedCalls: number;
  cacheHitRate: number;
  totalTokensIn: number;
  totalTokensOut: number;
  topUsers: Array<{ user: { id: string; name: string | null; phone: string | null } | null; calls: number }>;
}

/** GET /conversations — an explicit proxy, not a real transcript list (no per-conversation table exists). */
interface ConversationsProxy {
  note: string;
  topUsers: UsageSummary["topUsers"];
}

const SUGGESTIONS = ["How many customers used the chatbot today?", "What's our cache hit rate?", "Who are the most active users?"];

export default function GhrfixSiteChat({ platform, agent, api }: AgentViewProps) {
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [proxy, setProxy] = useState<ConversationsProxy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [askDraft, setAskDraft] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    Promise.allSettled([api.get<UsageSummary>("/summary"), api.get<ConversationsProxy>("/conversations")])
      .then(([s, c]) => {
        if (!alive) return;
        if (s.status === "fulfilled") setSummary(s.value.data);
        if (c.status === "fulfilled") setProxy(c.value.data);
        if (s.status === "rejected") {
          const e = s.reason;
          setError(e instanceof ApiError ? e.message : `Could not reach ${platform.label}.`);
        }
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform.key]);

  const topRows = (proxy?.topUsers ?? []).map((u) => ({ label: u.user?.name ?? u.user?.phone ?? "Unknown user", value: u.calls }));

  return (
    <>
      <AgentHeading platform={platform} agent={agent} />

      {error && (
        <div className="ag-panel" style={{ marginBottom: 20 }}>
          <div className="ag-panel-body"><p style={{ margin: 0, fontSize: 12.5, color: "var(--ag-red)" }}>{error}</p></div>
        </div>
      )}

      <div className="ag-metrics">
        <MetricCard icon={<Svg path={Icons.chat} size={24} />} tone="purple" title="Calls Today" value={loading ? "—" : (summary?.callsToday ?? 0).toLocaleString()} />
        <MetricCard icon={<Svg path={Icons.trendUp} size={24} />} tone="blue" title="Calls This Month" value={loading ? "—" : (summary?.callsThisMonth ?? 0).toLocaleString()} />
        <MetricCard icon={<Svg path={Icons.check} size={24} />} tone="green" title="Cache Hit Rate" value={loading ? "—" : `${summary?.cacheHitRate ?? 0}%`} />
        <MetricCard icon={<Svg path={Icons.dollar} size={24} />} tone="gold" title="Tokens In / Out" value={loading ? "—" : `${(summary?.totalTokensIn ?? 0).toLocaleString()} / ${(summary?.totalTokensOut ?? 0).toLocaleString()}`} />
      </div>

      <div className="ag-split">
        <div className="ag-stack">
          <div className="ag-panel">
            <div className="ag-panel-head">
              <div>
                <div className="ag-panel-title">Top 3 most active users</div>
                <div className="ag-panel-sub">{proxy?.note ?? "Real users ranked by call count to the customer-facing assistant"}</div>
              </div>
              <Link href={`/${platform.key}/${agent.key}/usage`} className="ag-btn ag-btn-ghost ag-btn-sm">Open full Usage →</Link>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table className="ag-table">
                <thead><tr><th>User</th><th>Phone</th><th>Calls</th></tr></thead>
                <tbody>
                  {loading && <tr><td colSpan={3} className="ag-empty">Loading…</td></tr>}
                  {!loading && (proxy?.topUsers.length ?? 0) === 0 && <tr><td colSpan={3} className="ag-empty">No usage recorded yet.</td></tr>}
                  {!loading && proxy?.topUsers.slice(0, 3).map((u, i) => (
                    <tr key={u.user?.id ?? i}>
                      <td style={{ display: "flex", alignItems: "center", gap: 10 }}><Avatar name={u.user?.name} size={28} />{u.user?.name ?? "Unnamed"}</td>
                      <td style={{ color: "var(--ag-ink-faint)" }}>{u.user?.phone ?? "—"}</td>
                      <td style={{ fontWeight: 650 }}>{u.calls.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <AgentSidePanel
            agentLabel={`${platform.label} — Site Chat Agent`}
            greeting="Watching the customer assistant"
            blurb="I don't power the customer-facing chatbot — I report on how it's performing: volume, cache efficiency, and who's using it most."
            todayStats={[
              { label: "Calls Today", value: loading ? "—" : (summary?.callsToday ?? 0).toLocaleString(), icon: <Svg path={Icons.chat} size={21} />, tone: "purple" },
              { label: "All-Time Calls", value: loading ? "—" : (summary?.totalCalls ?? 0).toLocaleString(), icon: <Svg path={Icons.trendUp} size={21} />, tone: "blue" },
              { label: "Cache Hit Rate", value: loading ? "—" : `${summary?.cacheHitRate ?? 0}%`, icon: <Svg path={Icons.check} size={21} />, tone: "green" },
            ]}
            suggestions={SUGGESTIONS}
            onAsk={setAskDraft}
          />
          {askDraft && (
            <div className="ag-panel"><div className="ag-panel-body">
              <p style={{ margin: 0, fontSize: 11.5, color: "var(--ag-ink-faint)" }}>Open the <b>Chat</b> tab and ask:</p>
              <p style={{ margin: "6px 0 0", fontSize: 12.5, fontWeight: 600 }}>“{askDraft}”</p>
            </div></div>
          )}

          <InsightsPanel
            title="Insights"
            rows={(
              [
                summary && summary.totalCalls > 0
                  ? { icon: <Svg path={Icons.check} size={15} />, label: "Cache saving real spend", value: `${summary.cachedCalls.toLocaleString()} of ${summary.totalCalls.toLocaleString()} calls (${summary.cacheHitRate}%) never hit the model.` }
                  : null,
                summary && summary.callsThisMonth > 0
                  ? { icon: <Svg path={Icons.trendUp} size={15} />, label: "This month's pace", value: `${summary.callsThisMonth.toLocaleString()} calls this month, averaging ${(summary.totalTokensIn + summary.totalTokensOut).toLocaleString()} tokens moved in/out.` }
                  : null,
                topRows.length > 0
                  ? { icon: <Svg path={Icons.crown} size={15} />, label: "Busiest customer", value: `${topRows[0].label} — ${topRows[0].value.toLocaleString()} calls.` }
                  : { icon: <Svg path={Icons.crown} size={15} />, label: "Busiest customer", value: "No usage recorded yet." },
              ] as Array<{ icon: ReactNode; label: string; value: string } | null>
            ).filter((r): r is { icon: ReactNode; label: string; value: string } => r !== null)}
          />
        </div>
      </div>
    </>
  );
}
