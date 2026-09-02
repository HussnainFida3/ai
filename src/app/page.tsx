"use client";

/**
 * Command Centre — the "/" home page.
 *
 * Every number on this page is real. Most of it is reused straight from
 * src/lib/credit-usage-data.ts's `useCreditUsageSnapshot` — spend, budget,
 * call volume, the daily GhrFix trend, the merged recent-activity feed and
 * the budget alerts are exactly the same aggregation the Credits Usage page
 * already computes, not a second derivation of the same thing.
 *
 * One endpoint pair is new to this page — real end-user counts:
 *
 *   GhrFix    GET /admin/reports/overview -> { totalUsers, ... }
 *               The platform's own admin overview route (real
 *               prisma.user.count()), gated by the same authenticate +
 *               requireRole("ADMIN") bearer-token check as every
 *               /ai-agents/* call this app already makes.
 *   ShadiLife GET /admin/dashboard        -> { stats: { totalUsers, ... }, ... }
 *               Same story: a real prisma.user.count() under
 *               stats.totalUsers, behind the same ADMIN-cookie session.
 *
 * Both were confirmed reachable with the exact session this console already
 * holds after Connect — nothing new to authenticate.
 *
 * Sections with no real backing anywhere in either backend were removed
 * rather than dressed up:
 *   - A per-agent live status board ("Active/Idle/Busy/Offline/Maintenance")
 *     — no endpoint on either platform tracks a live per-agent status.
 *   - An AI call "Success Rate" — GhrFix's AgentUsageLog and ShadiLife's
 *     AiUsageLog both record cost and tokens per call, never a
 *     success/failure outcome.
 *   - "System Performance" (CPU/Memory/Storage/Network) — neither
 *     platform's reachable-from-here health route exposes resource
 *     percentages (see settings/page.tsx's own health checks, which are
 *     already the honest version of platform health on this console).
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bot,
  Users,
  Coins,
  Zap,
  TriangleAlert,
  CircleAlert,
  Info,
  CheckCircle2,
  LayoutList,
  Plug,
  Bell,
} from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { Donut, TasksPerformanceChart, type DonutSlice, type CallVolumePoint } from "@/components/dashboard/charts";
import { Svg } from "@/components/agents/rich";
import { Icons } from "@/components/agents/icons";
import { PLATFORMS, type PlatformKey } from "@/lib/platforms";
import { apiFetch, ApiError, useIsConnected } from "@/lib/api";
import { useCreditUsageSnapshot, usd, count, ago } from "@/lib/credit-usage-data";

const TOTAL_AGENTS = PLATFORMS.ghrfix.agents.length + PLATFORMS.shadilife.agents.length;

/** The same six-colour palette every other spend donut in this app uses — see credit-usage-data.ts. */
const PALETTE = ["#38bdf8", "#8b5cf6", "#22c55e", "#f59e0b", "#ec4899", "#64748b"];

const QUICK_ACTIONS = [
  { label: "Browse All Agents", href: "/ai-agents", icon: LayoutList },
  { label: "Connect a Platform", href: "/connect", icon: Plug },
  { label: "View Credit Usage", href: "/credit-usage", icon: Coins },
  { label: "View Alerts", href: "/alerts", icon: Bell },
];

/* -------------------------------------------------------------------------- */
/*                     REAL END-USER COUNTS, ONE CALL EACH                    */
/* -------------------------------------------------------------------------- */

interface GhrfixOverviewRaw {
  totalUsers: number;
}
interface ShadiDashboardRaw {
  stats: { totalUsers: number };
}

interface TotalUsersState {
  loading: boolean;
  ghrfixUsers: number | null;
  ghrfixError: string | null;
  shadilifeUsers: number | null;
  shadilifeError: string | null;
}

function errText(e: unknown, fallback: string): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error && e.message) return e.message;
  return fallback;
}

/**
 * Real end-user counts, one authenticated call per platform (see file header
 * for the exact routes). Never throws — a failed platform degrades to null
 * with its own error message rather than blanking the other platform's real
 * number.
 */
function useTotalUsers(): TotalUsersState {
  const [state, setState] = useState<TotalUsersState>({
    loading: true,
    ghrfixUsers: null,
    ghrfixError: null,
    shadilifeUsers: null,
    shadilifeError: null,
  });

  useEffect(() => {
    let cancelled = false;

    Promise.allSettled([
      apiFetch<GhrfixOverviewRaw>("ghrfix", "/admin/reports/overview"),
      apiFetch<ShadiDashboardRaw>("shadilife", "/admin/dashboard"),
    ]).then(([ghrfixRes, shadiRes]) => {
      if (cancelled) return;
      setState({
        loading: false,
        ghrfixUsers: ghrfixRes.status === "fulfilled" ? ghrfixRes.value.data.totalUsers : null,
        ghrfixError: ghrfixRes.status === "rejected" ? errText(ghrfixRes.reason, "GhrFix's user count is unavailable.") : null,
        shadilifeUsers: shadiRes.status === "fulfilled" ? shadiRes.value.data.stats.totalUsers : null,
        shadilifeError: shadiRes.status === "rejected" ? errText(shadiRes.reason, "ShadiLife's user count is unavailable.") : null,
      });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

/* -------------------------------------------------------------------------- */
/*                                 MAIN PAGE                                  */
/* -------------------------------------------------------------------------- */

interface AgentActivityRow {
  key: string;
  platformKey: PlatformKey;
  platformLabel: string;
  name: string;
  accent: string;
  icon: keyof typeof Icons;
  lastAction: string;
  lastAt: string;
}

export default function CommandCentrePage() {
  const snapshot = useCreditUsageSnapshot(7);
  const usersState = useTotalUsers();
  const ghrfixConnected = useIsConnected("ghrfix");
  const shadilifeConnected = useIsConnected("shadilife");

  const totalUsersValue =
    !usersState.loading && (usersState.ghrfixUsers !== null || usersState.shadilifeUsers !== null)
      ? count((usersState.ghrfixUsers ?? 0) + (usersState.shadilifeUsers ?? 0))
      : "—";

  const totalUsersSub = usersState.loading
    ? "Loading…"
    : usersState.ghrfixUsers !== null && usersState.shadilifeUsers !== null
      ? `${count(usersState.ghrfixUsers)} GhrFix + ${count(usersState.shadilifeUsers)} ShadiLife`
      : usersState.ghrfixUsers !== null
        ? `${count(usersState.ghrfixUsers)} GhrFix — ShadiLife unavailable`
        : usersState.shadilifeUsers !== null
          ? `${count(usersState.shadilifeUsers)} ShadiLife — GhrFix unavailable`
          : "Both platforms unavailable";

  const stats = [
    {
      label: "TOTAL AGENTS",
      value: String(TOTAL_AGENTS),
      sub: `${PLATFORMS.ghrfix.agents.length} GhrFix + ${PLATFORMS.shadilife.agents.length} ShadiLife`,
      icon: Bot,
      color: "#38bdf8",
    },
    {
      label: "AI CALLS TODAY",
      value: snapshot.loading ? "—" : count(snapshot.totalCallsToday),
      sub: snapshot.loading ? "Loading…" : "GhrFix fleet only — ShadiLife has no daily breakdown",
      icon: Zap,
      color: "#8b5cf6",
    },
    {
      label: "TOTAL USERS",
      value: totalUsersValue,
      sub: totalUsersSub,
      icon: Users,
      color: "#f43f5e",
    },
    {
      label: "TOTAL COST (MONTH)",
      value: snapshot.loading ? "—" : usd(snapshot.totalSpendUsd),
      sub: snapshot.loading ? "Loading…" : `${snapshot.reportedCount} of ${snapshot.registryCount} agents reporting`,
      icon: Coins,
      color: "#f59e0b",
    },
  ];

  const platformSplit: DonutSlice[] = [
    { label: PLATFORMS.ghrfix.label, value: PLATFORMS.ghrfix.agents.length, color: PLATFORMS.ghrfix.color },
    { label: PLATFORMS.shadilife.label, value: PLATFORMS.shadilife.agents.length, color: PLATFORMS.shadilife.color },
  ];

  const trendData: CallVolumePoint[] = snapshot.dailyTrend
    ? snapshot.dailyTrend.labels.map((label, i) => ({
        label,
        calls: snapshot.dailyTrend!.calls[i],
        costUsd: snapshot.dailyTrend!.costUsd[i],
      }))
    : [];

  // Most-recently-active agents, deduped — snapshot.transactions is already
  // sorted newest-first, so the first hit per agent is its latest real action.
  const liveAgentsActivity: AgentActivityRow[] = (() => {
    const byAgent = new Map<string, AgentActivityRow>();
    for (const tx of snapshot.transactions) {
      const k = `${tx.platformKey}:${tx.agentName}`;
      if (byAgent.has(k)) continue;
      const def = PLATFORMS[tx.platformKey].agents.find((a) => a.name === tx.agentName);
      byAgent.set(k, {
        key: k,
        platformKey: tx.platformKey,
        platformLabel: tx.platformLabel,
        name: tx.agentName,
        accent: tx.accent,
        icon: def?.icon ?? "bot",
        lastAction: tx.title,
        lastAt: tx.createdAt,
      });
    }
    return [...byAgent.values()].slice(0, 6);
  })();

  const tagTotal = snapshot.spendByTag.reduce((a, t) => a + t.value, 0);
  const spendByTagSlices: (DonutSlice & { pct: number })[] = snapshot.spendByTag.map((t, i) => ({
    label: t.label,
    value: t.value,
    pct: tagTotal > 0 ? Math.round((t.value / tagTotal) * 1000) / 10 : 0,
    color: PALETTE[i % PALETTE.length],
  }));

  const alerts: Array<{ key: string; title: string; sub: string; icon: typeof TriangleAlert; color: string }> = [];
  if (snapshot.ghrfixError) {
    alerts.push({ key: "ghrfix-error", title: "GhrFix is unreachable", sub: snapshot.ghrfixError, icon: CircleAlert, color: "#f43f5e" });
  }
  if (snapshot.shadilifeError) {
    alerts.push({ key: "shadilife-error", title: "ShadiLife is unreachable", sub: snapshot.shadilifeError, icon: CircleAlert, color: "#f43f5e" });
  }
  for (const a of snapshot.alerts) {
    alerts.push({
      key: `budget-${a.platformLabel}`,
      title: `${a.platformLabel} is nearing its AI budget limit`,
      sub: `${a.pctUsed}% of its ${usd(a.budgetUsd, 0)} monthly budget used (${usd(a.spentUsd)} spent so far).`,
      icon: TriangleAlert,
      color: "#f59e0b",
    });
  }
  if (!snapshot.loading && snapshot.unreportedCount > 0) {
    alerts.push({
      key: "unreported",
      title: `${snapshot.unreportedCount} agent${snapshot.unreportedCount === 1 ? "" : "s"} did not report this month`,
      sub: "Excluded from every spend total and ranking on this page until they report again.",
      icon: Info,
      color: "#38bdf8",
    });
  }

  return (
    <AppShell>
      <section className="dc-stats">
        {stats.map((s) => (
          <div className="dc-stat-card" key={s.label}>
            <div className="dc-stat-head">
              <span className="dc-stat-label">{s.label}</span>
              <span className="dc-stat-icon" style={{ background: `${s.color}22` }}>
                <s.icon size={15} color={s.color} />
              </span>
            </div>
            <div className="dc-stat-value-row">
              <span className="dc-stat-value">{s.value}</span>
            </div>
            <div className="dc-stat-sub neutral">{s.sub}</div>
          </div>
        ))}
      </section>

      <section className="dc-row-1">
        <div className="dc-card">
          <div className="dc-card-head">
            <span className="dc-card-title">AI AGENTS OVERVIEW</span>
          </div>
          <div className="dc-donut-block">
            <div className="dc-donut-wrap">
              <Donut data={platformSplit} />
              <div className="dc-donut-center">
                <span className="dc-donut-center-value">{TOTAL_AGENTS}</span>
                <span className="dc-donut-center-label">Total Agents</span>
              </div>
            </div>
            <div className="dc-legend">
              {[
                { def: PLATFORMS.ghrfix, connected: ghrfixConnected },
                { def: PLATFORMS.shadilife, connected: shadilifeConnected },
              ].map(({ def, connected }) => (
                <div className="dc-legend-item" key={def.key} style={{ width: "100%", justifyContent: "space-between" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <span className="dc-legend-swatch" style={{ background: def.color }} />
                    <span className="dc-legend-value">{def.agents.length}</span>
                    <span className="dc-legend-label">{def.label}</span>
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10.5, fontWeight: 700, color: connected ? "#4ade80" : "#8296ac" }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: connected ? "#22c55e" : "#64748b", display: "inline-block" }} />
                    {connected ? "Connected" : "Not connected"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="dc-card">
          <div className="dc-card-head">
            <span className="dc-card-title">AI CALL VOLUME &amp; SPEND</span>
          </div>
          {trendData.length > 0 && (
            <div style={{ display: "flex", gap: 16, marginBottom: 4 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--dc-ink-soft)" }}>
                <span style={{ width: 10, height: 2, background: "#22d3ee", display: "inline-block", borderRadius: 2 }} /> AI Calls
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--dc-ink-soft)" }}>
                <span style={{ width: 10, height: 2, background: "#a855f7", display: "inline-block", borderRadius: 2 }} /> Spend (USD)
              </span>
            </div>
          )}
          {snapshot.loading ? (
            <div className="dc-empty-note">Loading…</div>
          ) : trendData.length === 0 ? (
            <div className="dc-empty-note">{snapshot.dailyTrendNote}</div>
          ) : (
            <>
              <TasksPerformanceChart data={trendData} />
              <p className="dc-foot-note">{snapshot.dailyTrendNote}</p>
            </>
          )}
        </div>

        <div className="dc-card">
          <div className="dc-card-head">
            <span className="dc-card-title">LIVE AGENTS ACTIVITY</span>
            <Link href="/credit-usage" className="dc-card-link">View All</Link>
          </div>
          <div className="dc-list">
            {snapshot.loading ? (
              <div className="dc-empty-note">Loading…</div>
            ) : liveAgentsActivity.length === 0 ? (
              <div className="dc-empty-note">No recent AI activity recorded on either platform.</div>
            ) : (
              liveAgentsActivity.map((a) => (
                <div className="dc-list-row" key={a.key}>
                  <span className="dc-list-icon" style={{ background: `${a.accent}22`, color: a.accent }}>
                    <Svg path={Icons[a.icon]} size={16} />
                  </span>
                  <div className="dc-list-main">
                    <div className="dc-list-title">{a.platformLabel} — {a.name}</div>
                    <div className="dc-list-sub">{a.lastAction}</div>
                  </div>
                  <span className="dc-list-time">{ago(a.lastAt)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="dc-row-2">
        <div className="dc-card">
          <div className="dc-card-head">
            <span className="dc-card-title">HIGHEST SPEND THIS MONTH</span>
          </div>
          <div className="dc-list">
            {snapshot.loading ? (
              <div className="dc-empty-note">Loading…</div>
            ) : snapshot.topAgents.length === 0 ? (
              <div className="dc-empty-note">No agent on either platform has recorded spend yet this month.</div>
            ) : (
              snapshot.topAgents.slice(0, 5).map((agent) => (
                <div className="dc-list-row" key={`${agent.platformKey}-${agent.key}`}>
                  <span className="dc-list-icon" style={{ background: `${agent.accent}22`, color: agent.accent }}>
                    <Svg path={Icons[agent.icon]} size={16} />
                  </span>
                  <div className="dc-list-main">
                    <div className="dc-list-title">{agent.fullName}</div>
                    <div className="dc-list-sub">{count(agent.calls)} calls this month</div>
                  </div>
                  <span className="dc-pct">{usd(agent.spendUsd)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="dc-card">
          <div className="dc-card-head">
            <span className="dc-card-title">SPEND BY CATEGORY</span>
          </div>
          <div className="dc-donut-block" style={{ flexDirection: "column", alignItems: "stretch", gap: 16 }}>
            {snapshot.loading ? (
              <div className="dc-empty-note">Loading…</div>
            ) : spendByTagSlices.length === 0 ? (
              <div className="dc-empty-note">No agent on either platform has recorded spend yet this month.</div>
            ) : (
              <>
                <div className="dc-donut-wrap" style={{ alignSelf: "center" }}>
                  <Donut data={spendByTagSlices} />
                  <div className="dc-donut-center">
                    <span className="dc-donut-center-value">{usd(snapshot.totalSpendUsd, 0)}</span>
                    <span className="dc-donut-center-label">Spend (Month)</span>
                  </div>
                </div>
                <div className="dc-legend">
                  {spendByTagSlices.map((s) => (
                    <div className="dc-legend-row" key={s.label}>
                      <span className="dc-legend-item">
                        <span className="dc-legend-swatch" style={{ background: s.color }} />
                        <span className="dc-legend-label">{s.label}</span>
                      </span>
                      <span>
                        <span className="dc-legend-pct">{s.pct}%</span>{" "}
                        <span className="dc-legend-count">({usd(s.value, 0)})</span>
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="dc-card">
          <div className="dc-card-head">
            <span className="dc-card-title">RECENT TASKS</span>
            <Link href="/credit-usage" className="dc-card-link">View All</Link>
          </div>
          <div className="dc-list">
            {snapshot.loading ? (
              <div className="dc-empty-note">Loading…</div>
            ) : snapshot.transactions.length === 0 ? (
              <div className="dc-empty-note">No recent AI activity recorded on either platform.</div>
            ) : (
              snapshot.transactions.slice(0, 6).map((tx) => {
                const def = PLATFORMS[tx.platformKey].agents.find((a) => a.name === tx.agentName);
                return (
                  <div className="dc-list-row" key={tx.id}>
                    <span className="dc-list-icon" style={{ background: `${tx.accent}22`, color: tx.accent }}>
                      <Svg path={Icons[def?.icon ?? "bot"]} size={16} />
                    </span>
                    <div className="dc-list-main">
                      <div className="dc-list-title">{tx.title}</div>
                      <div className="dc-list-sub">{tx.platformLabel} · {tx.agentName}</div>
                    </div>
                    <div className="dc-list-col-right">
                      <span className="dc-list-time">{ago(tx.createdAt)}</span>
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: tx.costUsd === null ? "var(--dc-ink-faint)" : "#f87171" }}>
                        {tx.costUsd === null ? "Not tracked" : `-${usd(tx.costUsd, 4)}`}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="dc-card">
          <div className="dc-card-head">
            <span className="dc-card-title">ALERTS &amp; NOTIFICATIONS</span>
            <Link href="/alerts" className="dc-card-link">View All</Link>
          </div>
          <div className="dc-list">
            {snapshot.loading ? (
              <div className="dc-empty-note">Loading…</div>
            ) : alerts.length === 0 ? (
              <div className="dc-list-row">
                <span className="dc-list-icon" style={{ background: "#22c55e22", color: "#22c55e" }}>
                  <CheckCircle2 size={16} />
                </span>
                <div className="dc-list-main">
                  <div className="dc-list-title">All clear</div>
                  <div className="dc-list-sub">Both platforms are connected and within budget.</div>
                </div>
              </div>
            ) : (
              alerts.map((a) => (
                <div className="dc-list-row" key={a.key}>
                  <span className="dc-list-icon" style={{ background: `${a.color}22`, color: a.color }}>
                    <a.icon size={16} />
                  </span>
                  <div className="dc-list-main">
                    <div className="dc-list-title">{a.title}</div>
                    <div className="dc-list-sub">{a.sub}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="dc-row-3">
        <div className="dc-card">
          <div className="dc-card-head">
            <span className="dc-card-title">QUICK ACTIONS</span>
          </div>
          <div className="dc-quick-actions">
            {QUICK_ACTIONS.map((a) => (
              <Link href={a.href} className="dc-quick-btn" key={a.label}>
                <a.icon size={16} />
                {a.label}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
