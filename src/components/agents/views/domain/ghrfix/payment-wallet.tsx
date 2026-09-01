"use client";

/**
 * GhrFix — Payment & Wallet → Top-Ups.
 *
 * The real, fully-paginated top-up queue — `GET /topups` with a genuine
 * `status` + `page`/`pageSize` server round trip (the Dashboard only ever
 * loaded the first 50 and filtered client-side). Approve/reject are the same
 * real, audited writes against `/topups/:id/approve|reject`; the per-status
 * totals come from three cheap `pageSize:1` calls so the counts stay exact.
 */

import { useState } from "react";
import Link from "next/link";
import { Avatar, InsightsPanel, MetricCard, Svg } from "@/components/agents/rich";
import { Icons } from "@/components/agents/icons";
import { ApiError, type Paginated } from "@/lib/api";
import type { AgentViewProps } from "../../registry";
import { Empty, ErrorNote, Panel, Pill, TableWrap, coins, dateTime, dec, useLoad } from "../../ghrfix/_kit-core";

interface TopUp {
  id: string;
  userId: string;
  amount: string;
  bankReference: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewedAt: string | null;
  createdAt: string;
  user?: { id: string; name: string | null; email: string | null; phone: string | null } | null;
}

type Filter = "ALL" | "PENDING" | "APPROVED" | "REJECTED";
const FILTERS: Filter[] = ["ALL", "PENDING", "APPROVED", "REJECTED"];
const STATUS_TONE: Record<TopUp["status"], "green" | "amber" | "red"> = { APPROVED: "green", PENDING: "amber", REJECTED: "red" };
const PAGE_SIZE = 15;

export default function PaymentWalletTopUpsView({ platform, agent, api }: AgentViewProps) {
  const [filter, setFilter] = useState<Filter>("PENDING");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);

  const totalsLoad = useLoad(async () => {
    const [all, pending, approved, rejected] = await Promise.allSettled([
      api.get<TopUp[], Paginated>("/topups", { pageSize: 1 }),
      api.get<TopUp[], Paginated>("/topups", { status: "PENDING", pageSize: 1 }),
      api.get<TopUp[], Paginated>("/topups", { status: "APPROVED", pageSize: 1 }),
      api.get<TopUp[], Paginated>("/topups", { status: "REJECTED", pageSize: 1 }),
    ]);
    return {
      all: all.status === "fulfilled" ? all.value.meta?.total ?? 0 : 0,
      pending: pending.status === "fulfilled" ? pending.value.meta?.total ?? 0 : 0,
      approved: approved.status === "fulfilled" ? approved.value.meta?.total ?? 0 : 0,
      rejected: rejected.status === "fulfilled" ? rejected.value.meta?.total ?? 0 : 0,
    };
  }, [platform.key]);

  const listLoad = useLoad(async () => {
    const { data, meta } = await api.get<TopUp[], Paginated>("/topups", {
      status: filter === "ALL" ? undefined : filter,
      page,
      pageSize: PAGE_SIZE,
    });
    return { items: data, meta };
  }, [platform.key, filter, page]);

  const t = totalsLoad.data;
  const decidedOnPage = (listLoad.data?.items ?? []).filter((x) => x.status !== "PENDING");
  const avgOnPage = decidedOnPage.length > 0
    ? Math.round(decidedOnPage.reduce((a, x) => a + (dec(x.amount) ?? 0), 0) / decidedOnPage.length)
    : null;

  async function decide(id: string, verdict: "approve" | "reject") {
    setBusyId(id);
    setActionMsg(null);
    setActionErr(null);
    try {
      await api.post(`/topups/${id}/${verdict}`, {});
      setActionMsg(`Top-up ${verdict === "approve" ? "approved" : "rejected"} — the wallet ledger and audit log are updated.`);
      listLoad.reload();
      totalsLoad.reload();
    } catch (e) {
      setActionErr(e instanceof ApiError ? e.message : `Could not ${verdict} that top-up.`);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      {listLoad.error && <ErrorNote error={listLoad.error} hint={`The Payment & Wallet agent reads ${platform.apiBase}${agent.base}/topups. Connect ${platform.label} first if this persists.`} />}

      <div className="ag-metrics">
        <MetricCard icon={<Svg path={Icons.receipt} size={24} />} tone="purple" title="Total requests" value={totalsLoad.loading ? "—" : String(t?.all ?? 0)} />
        <MetricCard icon={<Svg path={Icons.clock} size={24} />} tone="gold" title="Pending review" value={totalsLoad.loading ? "—" : String(t?.pending ?? 0)} />
        <MetricCard icon={<Svg path={Icons.check} size={24} />} tone="green" title="Approved" value={totalsLoad.loading ? "—" : String(t?.approved ?? 0)} />
        <MetricCard icon={<Svg path={Icons.alert} size={24} />} tone="red" title="Rejected" value={totalsLoad.loading ? "—" : String(t?.rejected ?? 0)} />
        <MetricCard icon={<Svg path={Icons.dollar} size={24} />} tone="blue" title="Avg approved (this page)" value={avgOnPage === null ? "—" : coins(avgOnPage)} />
      </div>

      <div className="ag-stack">
        <Panel
          title="Top-up requests"
          sub={listLoad.data?.meta ? `${listLoad.data.meta.total.toLocaleString()} request${listLoad.data.meta.total === 1 ? "" : "s"} — page ${listLoad.data.meta.page} of ${Math.max(1, listLoad.data.meta.totalPages)}` : "Manual bank transfers, real server-side pagination"}
          noBody
          actions={
            <div className="ag-tabs">
              {FILTERS.map((f) => (
                <button key={f} type="button" className={`ag-tab ${filter === f ? "active" : ""}`} onClick={() => { setFilter(f); setPage(1); }}>
                  {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          }
        >
          {(actionMsg || actionErr) && (
            <div style={{ padding: "12px 20px 0" }}>
              <p style={{ margin: 0, fontSize: 11.5, fontWeight: 650, color: actionErr ? "var(--ag-red)" : "var(--ag-green)" }}>{actionErr ?? actionMsg}</p>
            </div>
          )}
          <TableWrap>
            <table className="ag-table">
              <thead>
                <tr>
                  <th>Requested by</th>
                  <th>Amount</th>
                  <th>Bank reference</th>
                  <th>Status</th>
                  <th>Requested</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {(listLoad.data?.items ?? []).map((tp) => (
                  <tr key={tp.id}>
                    <td>
                      <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
                        <Avatar name={tp.user?.name} size={26} />
                        <span style={{ minWidth: 0 }}>
                          <b style={{ display: "block", fontWeight: 650 }}>{tp.user?.name ?? "Unknown user"}</b>
                          <span style={{ fontSize: 10.5, color: "var(--ag-ink-faint)" }}>{tp.user?.email ?? tp.user?.phone ?? "—"}</span>
                        </span>
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{coins(tp.amount)}</td>
                    <td style={{ fontSize: 11.5, color: "var(--ag-ink-soft)" }}>{tp.bankReference ?? "—"}</td>
                    <td><Pill text={tp.status} tone={STATUS_TONE[tp.status]} /></td>
                    <td style={{ whiteSpace: "nowrap", color: "var(--ag-ink-faint)" }}>{dateTime(tp.createdAt)}</td>
                    <td>
                      {tp.status === "PENDING" ? (
                        <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <button type="button" className="ag-btn ag-btn-accent ag-btn-sm" disabled={busyId === tp.id} onClick={() => decide(tp.id, "approve")}>
                            {busyId === tp.id ? "Working…" : "Approve"}
                          </button>
                          <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" disabled={busyId === tp.id} onClick={() => decide(tp.id, "reject")}>
                            Reject
                          </button>
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: "var(--ag-ink-faint)" }}>{tp.reviewedAt ? `Reviewed ${dateTime(tp.reviewedAt)}` : "—"}</span>
                      )}
                    </td>
                  </tr>
                ))}
                {(!listLoad.data || listLoad.data.items.length === 0) && (
                  <tr>
                    <td colSpan={6}>
                      <Empty>{listLoad.loading ? "Loading top-up requests…" : filter === "ALL" ? "No top-up requests have been submitted yet." : `No ${filter.toLowerCase()} requests.`}</Empty>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </TableWrap>

          {listLoad.data?.meta && listLoad.data.meta.total > 0 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderTop: "1px solid var(--ag-border-soft)" }}>
              <span style={{ fontSize: 11, color: "var(--ag-ink-faint)" }}>
                Page {listLoad.data.meta.page} of {Math.max(1, listLoad.data.meta.totalPages)} · {listLoad.data.meta.total.toLocaleString()} total
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
                <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" disabled={page >= listLoad.data.meta.totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
              </div>
            </div>
          )}
        </Panel>

        <InsightsPanel
          rows={[
            {
              icon: <Svg path={Icons.check} size={15} />,
              label: "Approval rate",
              value: t && t.approved + t.rejected > 0 ? `${Math.round((t.approved / (t.approved + t.rejected)) * 1000) / 10}% of ${t.approved + t.rejected} decided request${t.approved + t.rejected === 1 ? "" : "s"} were approved.` : "No top-up has been decided yet.",
            },
            {
              icon: <Svg path={Icons.clock} size={15} />,
              label: "Queue depth",
              value: t ? `${t.pending} request${t.pending === 1 ? "" : "s"} waiting for review right now.` : "—",
            },
            {
              icon: <Svg path={Icons.dashboard} size={15} />,
              label: "Need the wallet ledger?",
              value: (
                <>
                  Wallet totals, the credit trend and economy settings live on the{" "}
                  <Link href={`/${platform.key}/${agent.key}`} style={{ color: "var(--ag-accent)", fontWeight: 650 }}>Dashboard</Link> tab.
                </>
              ),
            },
          ]}
        />
      </div>
    </>
  );
}
