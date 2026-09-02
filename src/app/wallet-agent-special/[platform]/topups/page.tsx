"use client";

/**
 * Payment & Wallet Agent — Top-Ups.
 *
 * The real manual bank-transfer queue from GET
 * /ai-agents/payment-wallet/topups, normalized by `useWalletSnapshot`. Tabs,
 * search and pagination all run over the rows the backend actually returned —
 * the page states how many that is rather than implying it has the whole book.
 *
 * The Approve / Reject controls are DELIBERATELY INERT. Approving a top-up is
 * a real, audited write that credits coins to a user
 * (POST /topups/:id/approve|reject); this workspace never calls it.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useWalletSnapshot, coins, formatAge, dateTime, type TopUpRequest, type WalletSnapshot } from "@/lib/wallet-data";
import { usePlatformParam, platformLabel } from "@/lib/agent-data";
import {
  BarRows,
  Card,
  Donut,
  Empty,
  ErrorNote,
  Icon,
  Legend,
  Pill,
  SpecialShell,
  StatCard,
  type NavItem,
} from "@/components/special/kit";

const NAV: NavItem[] = [
  { label: "Overview", icon: "dashboard", slug: "overview" },
  { label: "Top-Ups", icon: "posts", slug: "topups" },
  { label: "Ledger", icon: "pulse", slug: "ledger" },
  { label: "Token Economy", icon: "tag", slug: "economy" },
  { label: "Chat with AI Agent", icon: "chat", slug: "chat" },
];

const TABS = ["All", "Pending", "Approved", "Rejected"] as const;
type Tab = (typeof TABS)[number];
const PAGE_SIZE = 12;

export default function WalletTopUpsPage({ params }: { params: Promise<{ platform: string }> }) {
  const platform = usePlatformParam(params);
  const w = useWalletSnapshot(platform);
  const label = platformLabel(platform);

  const [tab, setTab] = useState<Tab>("All");
  const [search, setSearch] = useState("");
  const [ageFilter, setAgeFilter] = useState("Any age");
  const [page, setPage] = useState(1);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return w.topups.filter((t) => {
      if (tab !== "All" && t.status !== tab.toUpperCase()) return false;
      if (ageFilter === "Today" && t.ageDays !== 0) return false;
      if (ageFilter === "Over 7 days" && (t.ageDays === null || t.ageDays <= 7)) return false;
      if (ageFilter === "Over 30 days" && (t.ageDays === null || t.ageDays <= 30)) return false;
      if (!q) return true;
      return (
        t.requester.toLowerCase().includes(q) ||
        t.contact.toLowerCase().includes(q) ||
        (t.bankReference ?? "").toLowerCase().includes(q)
      );
    });
  }, [w.topups, tab, search, ageFilter]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const visible = rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  function reset<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setPage(1);
    };
  }

  const pending = w.topups.filter((t) => t.status === "PENDING").length;
  const matchedAmount = rows.reduce<number | null>((acc, t) => (t.amount === null ? acc : (acc ?? 0) + t.amount), null);

  return (
    <SpecialShell
      platform={platform}
      agentLabel="Payment & Wallet Agent"
      tagline="Wallet workspace"
      basePath="/wallet-agent-special"
      nav={NAV}
      headerIcon="posts"
      assistantBlurb="I can read every top-up request the backend returns. Approving one is a real write — not from here."
      title="Top-Ups"
      subtitle={`Manual bank transfers awaiting review on ${label}`}
      actions={
        <Pill tone={!w.supported ? "amber" : w.error ? "red" : "green"}>
          <Icon name={w.supported && !w.error ? "check" : "alert"} size={12} />
          {!w.supported ? "Agent not on this platform" : w.error ? "Queue offline" : "Read-only view"}
        </Pill>
      }
    >
      <style>{TOPUP_CSS}</style>

      {!w.supported ? (
        <UnsupportedNotice snapshot={w} label={label} />
      ) : (
        <>
          {w.error && <ErrorNote error={w.error} platform={platform} />}

          <div className="cs-wallet-banner">
            <Icon name="alert" size={15} />
            <span>
              <b>Actions are not wired up here.</b> Approving or rejecting a top-up credits or denies real coins and
              writes to the audit log. Those endpoints are never called from this workspace, so the buttons below are
              disabled by design.
            </span>
          </div>

          <div className="cs-stats">
            <StatCard
              label="Requests loaded"
              value={w.loading || w.error ? "—" : w.topups.length.toLocaleString()}
              sub={w.error ? "Queue failed to load" : w.topupsTotal !== null ? `of ${w.topupsTotal.toLocaleString()} on record` : "Server total not reported"}
              tone="purple"
              icon="posts"
            />
            <StatCard
              label="Pending review"
              value={w.loading || w.error ? "—" : pending.toLocaleString()}
              sub={w.error ? "Cannot be assessed" : "Awaiting a human verdict"}
              tone="amber"
              icon="clock"
            />
            <StatCard
              label="Approval rate"
              value={w.loading || w.error || w.approvalRate.value === null ? "—" : `${w.approvalRate.value}%`}
              sub={w.error ? "Cannot be assessed" : w.approvalRate.note}
              tone="green"
              icon="check"
            />
            <StatCard
              label="Average approved"
              value={w.loading || w.error ? "—" : coins(w.avgApprovedTopUp)}
              sub={w.error ? "Cannot be assessed" : w.avgApprovedTopUp === null ? "No approved request reported an amount" : "Across approved requests with an amount"}
              tone="blue"
              icon="trend"
            />
            <StatCard
              label="Matching filters"
              value={w.loading || w.error ? "—" : rows.length.toLocaleString()}
              sub={w.error ? "Cannot be assessed" : `${coins(matchedAmount)} requested · showing ${visible.length}`}
              tone="cyan"
              icon="search"
            />
          </div>

          <div className="cs-row-3">
            <Card title={w.topupStatusMix.title} action={<span className="cs-wallet-meta">{w.topupStatusMix.total.toLocaleString()} requests</span>}>
              {w.loading ? (
                <Empty>Loading…</Empty>
              ) : w.error ? (
                <Empty>The queue failed to load, so the status mix cannot be assessed.</Empty>
              ) : w.topupStatusMix.rows.length === 0 ? (
                <Empty>No top-up request has ever been raised.</Empty>
              ) : (
                <>
                  <div className="cs-donut-row">
                    <Donut data={w.topupStatusMix.rows} center={w.topupStatusMix.total.toLocaleString()} centerLabel="requests" />
                    <Legend data={w.topupStatusMix.rows} />
                  </div>
                  <p className="cs-wallet-note">{w.topupStatusMix.note}</p>
                </>
              )}
            </Card>

            <Card title={w.topupAgeBuckets.title} action={<span className="cs-wallet-meta">{w.topupAgeBuckets.total.toLocaleString()} dated</span>}>
              {w.loading ? (
                <Empty>Loading…</Empty>
              ) : w.error ? (
                <Empty>The queue failed to load, so request age cannot be assessed.</Empty>
              ) : w.topupAgeBuckets.rows.length === 0 ? (
                <Empty>No loaded request carried a usable timestamp.</Empty>
              ) : (
                <>
                  <div className="cs-donut-row">
                    <Donut data={w.topupAgeBuckets.rows} center={w.topupAgeBuckets.total.toLocaleString()} centerLabel="requests" />
                    <Legend data={w.topupAgeBuckets.rows} />
                  </div>
                  <p className="cs-wallet-note">{w.topupAgeBuckets.note}</p>
                </>
              )}
            </Card>

            <Card title={w.topupAmountByStatus.title} action={<span className="cs-wallet-meta">{w.topupAmountByStatus.total.toLocaleString()} GC</span>}>
              {w.loading ? (
                <Empty>Loading…</Empty>
              ) : w.error ? (
                <Empty>The queue failed to load, so no amounts can be summed.</Empty>
              ) : w.topupAmountByStatus.rows.length === 0 ? (
                <Empty>No loaded request carried a usable amount.</Empty>
              ) : (
                <>
                  <BarRows rows={w.topupAmountByStatus.rows} colored suffix=" GC" />
                  <p className="cs-wallet-note">{w.topupAmountByStatus.note}</p>
                </>
              )}
            </Card>
          </div>

          <Card pad={false}>
            <div className="cs-wallet-toolbar">
              <div className="cs-tabs" style={{ border: 0, flex: 1, minWidth: 240 }}>
                {TABS.map((t) => (
                  <button key={t} type="button" className={tab === t ? "cs-tab active" : "cs-tab"} onClick={() => reset(setTab)(t)}>
                    {t}
                  </button>
                ))}
              </div>

              <select
                className="cs-btn"
                value={ageFilter}
                onChange={(e) => reset(setAgeFilter)(e.target.value)}
                aria-label="Filter by request age"
              >
                {["Any age", "Today", "Over 7 days", "Over 30 days"].map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>

              <label className="cs-search">
                <Icon name="search" size={15} />
                <input
                  value={search}
                  onChange={(e) => reset(setSearch)(e.target.value)}
                  placeholder="Search requester, contact or bank reference…"
                  aria-label="Search top-up requests"
                />
              </label>
            </div>

            <div className="cs-table-wrap" style={{ marginTop: 12 }}>
              <table className="cs-table">
                <thead>
                  <tr>
                    <th style={{ paddingLeft: 19 }}>Requested by</th>
                    <th className="cs-num">Amount</th>
                    <th>Bank reference</th>
                    <th>Status</th>
                    <th className="cs-num">Age</th>
                    <th className="cs-num">Requested</th>
                    <th style={{ paddingRight: 19 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {w.loading && (
                    <tr><td colSpan={7} style={{ padding: 19 }}><Empty>Loading the live top-up queue…</Empty></td></tr>
                  )}
                  {!w.loading && w.error && (
                    <tr><td colSpan={7} style={{ padding: 19 }}><Empty>The queue could not be read. This is not an empty queue — it is an unknown one.</Empty></td></tr>
                  )}
                  {!w.loading && !w.error && w.topups.length === 0 && (
                    <tr><td colSpan={7} style={{ padding: 19 }}><Empty>{label} returned no top-up requests at all — the queue loaded and is genuinely empty.</Empty></td></tr>
                  )}
                  {!w.loading && !w.error && w.topups.length > 0 && visible.length === 0 && (
                    <tr><td colSpan={7} style={{ padding: 19 }}><Empty>No request matches these filters.</Empty></td></tr>
                  )}
                  {visible.map((t) => (
                    <tr key={t.id}>
                      <td style={{ paddingLeft: 19, maxWidth: 260 }}>
                        <div className="title">{t.requester}</div>
                        <div className="sub">{t.contact}</div>
                      </td>
                      <td className="cs-num" style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{coins(t.amount)}</td>
                      <td style={{ color: "#4c5470" }}>{t.bankReference ?? "—"}</td>
                      <td><StatusPill status={t.status} raw={t.rawStatus} /></td>
                      <td className="cs-num" style={{ color: "#69738c", whiteSpace: "nowrap" }}>{formatAge(t.ageDays)}</td>
                      <td className="cs-num" style={{ color: "#69738c", whiteSpace: "nowrap" }}>{dateTime(t.createdAt)}</td>
                      <td style={{ paddingRight: 19, whiteSpace: "nowrap" }}>
                        <span className="cs-wallet-actions">
                          <button type="button" className="cs-btn" disabled title="Not wired up — approving credits real coins" aria-label={`Approve ${t.requester}'s top-up (disabled)`}>
                            <Icon name="check" size={13} />Approve
                          </button>
                          <button type="button" className="cs-btn" disabled title="Not wired up — rejecting is an audited write" aria-label={`Reject ${t.requester}'s top-up (disabled)`}>
                            <Icon name="alert" size={13} />Reject
                          </button>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {rows.length > PAGE_SIZE && (
              <div className="cs-wallet-pager">
                <span>Showing {(current - 1) * PAGE_SIZE + 1}–{Math.min(current * PAGE_SIZE, rows.length)} of {rows.length}</span>
                <div style={{ display: "flex", gap: 6 }}>
                  <button type="button" className="cs-btn" onClick={() => setPage(Math.max(1, current - 1))} disabled={current === 1}>Previous</button>
                  <span style={{ display: "grid", placeItems: "center", padding: "0 10px", fontWeight: 650 }}>{current} / {totalPages}</span>
                  <button type="button" className="cs-btn" onClick={() => setPage(Math.min(totalPages, current + 1))} disabled={current === totalPages}>Next</button>
                </div>
              </div>
            )}

            <p className="cs-wallet-note" style={{ padding: "0 19px 16px" }}>
              {w.error ? "Nothing loaded this session." : w.coverageNote}
            </p>
          </Card>
        </>
      )}
    </SpecialShell>
  );
}

/** Status is never colour-alone: each pill carries a glyph and the word. */
function StatusPill({ status, raw }: { status: TopUpRequest["status"]; raw: string }) {
  if (status === "APPROVED") return <Pill tone="green"><Icon name="check" size={12} />Approved</Pill>;
  if (status === "PENDING") return <Pill tone="amber"><Icon name="clock" size={12} />Pending</Pill>;
  if (status === "REJECTED") return <Pill tone="red"><Icon name="alert" size={12} />Rejected</Pill>;
  return <Pill tone="purple"><Icon name="tag" size={12} />{raw}</Pill>;
}

function UnsupportedNotice({ snapshot, label }: { snapshot: WalletSnapshot; label: string }) {
  return (
    <Card title={`Payment & Wallet is not available on ${label}`}>
      <div className="cs-wallet-unsupported">
        <span><Icon name="alert" size={18} /></span>
        <div>
          <p>{snapshot.unsupportedReason}</p>
          <p>There is no top-up queue to show, because there is no top-up endpoint on this platform to ask.</p>
          <Link href="/wallet-agent-special/ghrfix/topups" className="cs-btn cs-btn-primary">
            <Icon name="arrow" size={14} />Open the GhrFix top-up queue
          </Link>
        </div>
      </div>
    </Card>
  );
}

const TOPUP_CSS = `
.cs-wallet-meta{font-size:11px;color:#69738c}
.cs-wallet-note{margin:12px 0 0;font-size:11px;line-height:18px;color:#8891a8}
.cs-wallet-banner{display:flex;gap:10px;align-items:flex-start;border:1px solid #f0e0bd;background:#fffaef;color:#7a5a12;border-radius:11px;padding:12px 14px;font-size:11.5px;line-height:19px;margin-bottom:12px}
.cs-wallet-banner svg{flex:0 0 auto;margin-top:2px}
.cs-wallet-banner b{font-weight:750}
.cs-wallet-toolbar{display:flex;align-items:center;gap:12px;padding:14px 19px 0;flex-wrap:wrap}
.cs-wallet-actions{display:inline-flex;gap:6px}
.cs-wallet-actions .cs-btn{height:30px;padding:0 10px;font-size:11px}
.cs-wallet-actions .cs-btn:disabled{opacity:.45;cursor:not-allowed}
.cs-wallet-pager{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 19px;border-top:1px solid #eef0f5;font-size:11.5px;color:#4c5470;flex-wrap:wrap}
.cs-wallet-unsupported{display:flex;gap:13px;align-items:flex-start}
.cs-wallet-unsupported>span{width:34px;height:34px;border-radius:10px;flex:0 0 auto;display:grid;place-items:center;background:#fff6e6;color:#c9860f}
.cs-wallet-unsupported p{margin:0 0 10px;font-size:12px;line-height:20px;color:#4c5470;max-width:640px}
`;
