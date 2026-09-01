"use client";

/**
 * GhrFix — Payment & Wallet.
 *
 * Every figure comes from the agent's own router: `/summary` (wallet totals,
 * economy settings, pending queue), `/trend` (14 real days of ledger credits)
 * and `/topups` (the real request list). The approve / reject buttons and the
 * economy form are live writes against `/topups/:id/approve|reject` and
 * `PATCH /settings` — the same audited endpoints the agent uses itself.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { AreaChart, BarList, DonutChart, InsightsPanel, MetricCard, AgentSidePanel, Avatar, Svg } from "@/components/agents/rich";
import { Icons } from "@/components/agents/icons";
import { ApiError, type AgentStats, type Paginated } from "@/lib/api";
import type { AgentViewProps } from "../registry";
import {
  AskAnswer,
  Empty,
  ErrorNote,
  KeyRow,
  Panel,
  Pill,
  TableWrap,
  coins,
  dateTime,
  dec,
  halfOverHalf,
  num,
  pkr,
  share,
  shortDate,
  useAsk,
  useLoad,
} from "./_kit-core";

interface EconomySettings {
  signupTokenGrant: string;
  acceptFeeTokens: string;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  bankName: string | null;
  updatedAt: string;
}

interface TopUp {
  id: string;
  userId: string;
  amount: string;
  receiptUrl: string;
  bankReference: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  user?: { id: string; name: string | null; email: string | null; phone: string | null } | null;
}

interface Summary {
  walletTotals: {
    acceptFeesCollected: number;
    topUpsApproved: number;
    refunds: number;
    totalCredits: number;
    totalDebits: number;
    totalTransactions: number;
  };
  cashSettledPKR: number;
  tokensCirculatedInBookings: number;
  economy: EconomySettings;
  pendingTopups: TopUp[];
  pendingTopupsCount: number;
}

type TrendPoint = { date: string; total: number };

const STATUS_TONE: Record<TopUp["status"], "green" | "amber" | "red"> = { APPROVED: "green", PENDING: "amber", REJECTED: "red" };

export default function PaymentWalletView({ platform, agent, api }: AgentViewProps) {
  const load = useLoad(async () => {
    const [summary, trend, topups, stats] = await Promise.allSettled([
      api.get<Summary>("/summary"),
      api.get<TrendPoint[]>("/trend"),
      api.get<TopUp[], Paginated>("/topups", { pageSize: 50 }),
      api.stats(),
    ]);
    if (summary.status === "rejected" && topups.status === "rejected") throw summary.reason;
    return {
      summary: summary.status === "fulfilled" ? summary.value.data : null,
      trend: trend.status === "fulfilled" ? trend.value.data : null,
      topups: topups.status === "fulfilled" ? topups.value.data : null,
      topupsTotal: topups.status === "fulfilled" ? topups.value.meta?.total ?? null : null,
      stats: stats.status === "fulfilled" ? (stats.value.data as AgentStats) : null,
    };
  }, [platform.key, agent.key]);

  const ask = useAsk(api);
  const d = load.data;
  const s = d?.summary ?? null;
  const trend = d?.trend ?? null;
  const topups = d?.topups ?? null;

  const creditChange = useMemo(() => (trend ? halfOverHalf(trend.map((t) => t.total)) : null), [trend]);
  const creditedIn14 = useMemo(() => (trend ? trend.reduce((a, b) => a + b.total, 0) : null), [trend]);

  const decided = topups?.filter((t) => t.status !== "PENDING") ?? [];
  const approvalRate = decided.length > 0 ? share(decided.filter((t) => t.status === "APPROVED").length, decided.length) : null;
  const approvedAmounts = (topups ?? []).filter((t) => t.status === "APPROVED").map((t) => dec(t.amount) ?? 0);
  const avgTopUp = approvedAmounts.length > 0 ? approvedAmounts.reduce((a, b) => a + b, 0) / approvedAmounts.length : null;

  const float = s ? s.walletTotals.totalCredits - s.walletTotals.totalDebits : null;

  const creditMix = s
    ? [
        { label: "Top-ups approved", value: s.walletTotals.topUpsApproved, color: "#22c55e" },
        { label: "Other credits", value: Math.max(0, s.walletTotals.totalCredits - s.walletTotals.topUpsApproved), color: "#3b82f6" },
      ].filter((r) => r.value > 0)
    : [];

  const debitRows = s
    ? [
        { label: "Accept fees collected", value: s.walletTotals.acceptFeesCollected },
        { label: "Refunds issued", value: s.walletTotals.refunds },
        { label: "Coins applied to bookings", value: s.tokensCirculatedInBookings },
        { label: "Total debits", value: s.walletTotals.totalDebits },
      ].filter((r) => r.value > 0)
    : [];

  return (
    <>
      {load.error && <ErrorNote error={load.error} hint={`The Payment & Wallet agent reads ${platform.apiBase}${agent.base}. Connect ${platform.label} first if this persists.`} />}

      <div className="ag-metrics">
        <MetricCard
          icon={<Svg path={Icons.wallet} size={24} />}
          tone="green"
          title="Total credits"
          value={load.loading ? "—" : coins(s?.walletTotals.totalCredits)}
          change={creditChange}
          changeLabel="last 7 days vs prior 7"
        />
        <MetricCard icon={<Svg path={Icons.trendUp} size={24} />} tone="red" title="Total debits" value={load.loading ? "—" : coins(s?.walletTotals.totalDebits)} />
        <MetricCard icon={<Svg path={Icons.dollar} size={24} />} tone="purple" title="Coin float outstanding" value={load.loading ? "—" : float === null ? "—" : coins(float)} />
        <MetricCard icon={<Svg path={Icons.receipt} size={24} />} tone="gold" title="Accept fees collected" value={load.loading ? "—" : coins(s?.walletTotals.acceptFeesCollected)} />
        <MetricCard icon={<Svg path={Icons.crown} size={24} />} tone="blue" title="Cash settled (jobs)" value={load.loading ? "—" : pkr(s?.cashSettledPKR)} />
        <MetricCard icon={<Svg path={Icons.clock} size={24} />} tone="pink" title="Top-ups awaiting review" value={load.loading ? "—" : num(s?.pendingTopupsCount)} />
      </div>

      <div className="ag-split">
        <div className="ag-stack">
          <Panel
            title="Coins credited — last 14 days"
            sub={creditedIn14 !== null ? `${creditedIn14.toLocaleString()} GC credited across the window` : "Real daily totals from the wallet ledger"}
            actions={
              <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" onClick={load.reload} disabled={load.loading}>
                <Svg path={Icons.refresh} size={14} /> Refresh
              </button>
            }
          >
            {trend && trend.length > 0 ? (
              <AreaChart labels={trend.map((t) => shortDate(t.date))} series={[{ name: "Coins credited", data: trend.map((t) => t.total), color: "#22d3a3" }]} valueSuffix=" GC" />
            ) : (
              <Empty>{load.loading ? "Loading ledger trend…" : "No ledger movement in the last 14 days."}</Empty>
            )}
          </Panel>

          <div className="ag-duo">
            <Panel title="Where credits come from" sub="Ledger credits by source">
              {creditMix.length > 0 ? (
                <DonutChart data={creditMix} total={s?.walletTotals.totalCredits} totalLabel="Credits (GC)" size={150} />
              ) : (
                <Empty>{load.loading ? "Loading…" : "No credits recorded yet."}</Empty>
              )}
            </Panel>
            <Panel title="Where coins go" sub="Real debit-side totals">
              <BarList rows={debitRows} color="#f5b942" emptyText={load.loading ? "Loading…" : "No debits recorded yet."} />
            </Panel>
          </div>

          <Panel
            title="Pending top-ups"
            sub={d?.topupsTotal !== null && d?.topupsTotal !== undefined ? `${d.topupsTotal} request${d.topupsTotal === 1 ? "" : "s"} on record — full queue, filters and actions live in Top-Ups` : "Manual bank transfers awaiting review"}
            noBody
            actions={<Link href={`/${platform.key}/${agent.key}/topups`} className="ag-btn ag-btn-ghost ag-btn-sm">Open full Top-Ups →</Link>}
          >
            <TableWrap>
              <table className="ag-table">
                <thead>
                  <tr>
                    <th>Requested by</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Requested</th>
                  </tr>
                </thead>
                <tbody>
                  {(s?.pendingTopups ?? []).slice(0, 5).map((t) => (
                    <tr key={t.id}>
                      <td>
                        <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
                          <Avatar name={t.user?.name} size={26} />
                          <span style={{ minWidth: 0 }}>
                            <b style={{ display: "block", fontWeight: 650 }}>{t.user?.name ?? "Unknown user"}</b>
                            <span style={{ fontSize: 10.5, color: "var(--ag-ink-faint)" }}>{t.user?.email ?? t.user?.phone ?? "—"}</span>
                          </span>
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{coins(t.amount)}</td>
                      <td><Pill text={t.status} tone={STATUS_TONE[t.status]} /></td>
                      <td style={{ whiteSpace: "nowrap", color: "var(--ag-ink-faint)" }}>{dateTime(t.createdAt)}</td>
                    </tr>
                  ))}
                  {(!s || s.pendingTopups.length === 0) && (
                    <tr>
                      <td colSpan={4}>
                        <Empty>{load.loading ? "Loading top-up requests…" : "No top-ups are pending review."}</Empty>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </TableWrap>
          </Panel>

          <EconomyPanel api={api} settings={s?.economy ?? null} loading={load.loading} onSaved={load.reload} />
        </div>

        <div className="ag-stack">
          <AgentSidePanel
            agentLabel={`${platform.label} — ${agent.name}`}
            greeting="Your money surface, live"
            blurb="I watch the GhrFix Coins ledger, the top-up queue and the flat accept-fee settings. Approvals here are real, audited writes."
            todayStats={[
              { label: "Pending approvals", value: s ? num(s.pendingTopupsCount) : "—", icon: <Svg path={Icons.clock} size={17} />, tone: "gold" },
              { label: "Ledger entries", value: s ? num(s.walletTotals.totalTransactions) : "—", icon: <Svg path={Icons.receipt} size={17} />, tone: "purple" },
              { label: "Accept fee", value: s ? coins(s.economy.acceptFeeTokens) : "—", icon: <Svg path={Icons.wallet} size={17} />, tone: "green" },
            ]}
            suggestions={["How many top-ups are pending right now?", "What have we collected in accept fees?", "Which users hold the most coins?"]}
            onAsk={ask.ask}
          />

          <AskAnswer state={ask} />

          <InsightsPanel
            rows={[
              {
                icon: <Svg path={Icons.wallet} size={15} />,
                label: "Outstanding float",
                value: float === null ? "Ledger unavailable." : `${float.toLocaleString()} GC sit in user wallets — credits ${num(s?.walletTotals.totalCredits)} minus debits ${num(s?.walletTotals.totalDebits)}.`,
              },
              {
                icon: <Svg path={Icons.check} size={15} />,
                label: "Top-up approval rate",
                value: approvalRate === null ? "No top-up has been decided yet." : `${approvalRate}% of ${decided.length} decided request${decided.length === 1 ? "" : "s"} were approved.`,
              },
              {
                icon: <Svg path={Icons.dollar} size={15} />,
                label: "Average approved top-up",
                value: avgTopUp === null ? "No approved top-ups yet." : `${Math.round(avgTopUp).toLocaleString()} GC across ${approvedAmounts.length} approval${approvedAmounts.length === 1 ? "" : "s"}.`,
              },
              {
                icon: <Svg path={Icons.receipt} size={15} />,
                label: "Fee revenue vs cash",
                value:
                  s === null
                    ? "—"
                    : `${s.walletTotals.acceptFeesCollected.toLocaleString()} GC in accept fees against ${pkr(s.cashSettledPKR)} of job cash settled directly between customer and provider.`,
              },
              {
                icon: <Svg path={Icons.trendUp} size={15} />,
                label: "Last 14 days",
                value: creditedIn14 === null ? "Trend unavailable." : `${creditedIn14.toLocaleString()} GC credited${creditChange === null ? "" : `, ${creditChange >= 0 ? "up" : "down"} ${Math.abs(creditChange)}% on the prior week`}.`,
              },
            ]}
          />

          <Panel title="Agent runtime" sub="Real usage from the shared agent log">
            <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
              {d?.stats ? (
                <>
                  <KeyRow label="Model" value={d.stats.model} />
                  <KeyRow label="Calls today" value={num(d.stats.callsToday)} />
                  <KeyRow label="Calls this month" value={num(d.stats.callsThisMonth)} />
                  <KeyRow label="Spend this month" value={`$${(dec(d.stats.spendThisMonthUsd) ?? 0).toFixed(2)}`} />
                  <KeyRow label="Monthly budget" value={`$${(dec(d.stats.monthlyBudgetUsd) ?? 0).toFixed(0)}`} />
                </>
              ) : (
                <Empty>{load.loading ? "Loading…" : "Runtime stats unavailable."}</Empty>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}

/* ── Token economy settings — a real PATCH /settings write ───────────── */

function EconomyPanel({
  api,
  settings,
  loading,
  onSaved,
}: {
  api: AgentViewProps["api"];
  settings: EconomySettings | null;
  loading: boolean;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const field = (key: keyof EconomySettings) => draft[key] ?? (settings ? String(settings[key] ?? "") : "");
  const dirty = Object.keys(draft).length > 0;

  async function save() {
    if (!dirty) return;
    setSaving(true);
    setMsg(null);
    setErr(null);
    const body: Record<string, string | number> = {};
    for (const [k, v] of Object.entries(draft)) {
      if (v === "") continue;
      body[k] = k === "signupTokenGrant" || k === "acceptFeeTokens" ? Number(v) : v;
    }
    try {
      await api.patch("/settings", body);
      setDraft({});
      setMsg("Token economy settings saved and written to the audit log.");
      onSaved();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Could not save the economy settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel
      title="Token economy"
      sub={settings ? `Last updated ${dateTime(settings.updatedAt)}` : "The settings behind the flat accept fee"}
      actions={
        <button type="button" className="ag-btn ag-btn-accent ag-btn-sm" onClick={save} disabled={!dirty || saving || !settings}>
          {saving ? "Saving…" : "Save changes"}
        </button>
      }
    >
      {!settings ? (
        <Empty>{loading ? "Loading economy settings…" : "Economy settings unavailable."}</Empty>
      ) : (
        <>
          <div className="ag-form-grid">
            <div className="ag-field">
              <label htmlFor="pw-grant">Signup coin grant</label>
              <input id="pw-grant" inputMode="decimal" value={field("signupTokenGrant")} onChange={(e) => setDraft((p) => ({ ...p, signupTokenGrant: e.target.value }))} />
            </div>
            <div className="ag-field">
              <label htmlFor="pw-fee">Accept fee (coins per job)</label>
              <input id="pw-fee" inputMode="decimal" value={field("acceptFeeTokens")} onChange={(e) => setDraft((p) => ({ ...p, acceptFeeTokens: e.target.value }))} />
            </div>
            <div className="ag-field">
              <label htmlFor="pw-bank">Bank name</label>
              <input id="pw-bank" value={field("bankName")} onChange={(e) => setDraft((p) => ({ ...p, bankName: e.target.value }))} />
            </div>
            <div className="ag-field">
              <label htmlFor="pw-acct-name">Account name</label>
              <input id="pw-acct-name" value={field("bankAccountName")} onChange={(e) => setDraft((p) => ({ ...p, bankAccountName: e.target.value }))} />
            </div>
            <div className="ag-field">
              <label htmlFor="pw-acct-no">Account number</label>
              <input id="pw-acct-no" value={field("bankAccountNumber")} onChange={(e) => setDraft((p) => ({ ...p, bankAccountNumber: e.target.value }))} />
            </div>
          </div>
          {(msg || err) && <p style={{ margin: "14px 0 0", fontSize: 11.5, fontWeight: 650, color: err ? "var(--ag-red)" : "var(--ag-green)" }}>{err ?? msg}</p>}
        </>
      )}
    </Panel>
  );
}
