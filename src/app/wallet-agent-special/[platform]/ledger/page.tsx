"use client";

/**
 * Payment & Wallet Agent — Ledger.
 *
 * The platform-wide wallet ledger from GET /admin/wallet/transactions (the
 * same route the Finance agent's forecast view reads), normalized by
 * `useWalletSnapshot`, alongside the authoritative credit/debit totals from
 * GET /ai-agents/payment-wallet/summary.
 *
 * The distinction matters and the page states it: the table and the
 * ledger-derived charts describe the page of entries that was loaded, while
 * the credit/debit composition comes from the backend's whole-book totals.
 * Read-only — no ledger write exists here and none is called.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useWalletSnapshot, coins, dateTime, formatAge, type LedgerRow, type WalletSnapshot } from "@/lib/wallet-data";
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
  SERIES,
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

const TABS = ["All", "Credit", "Debit"] as const;
type Tab = (typeof TABS)[number];
const PAGE_SIZE = 12;

export default function WalletLedgerPage({ params }: { params: Promise<{ platform: string }> }) {
  const platform = usePlatformParam(params);
  const w = useWalletSnapshot(platform);
  const label = platformLabel(platform);

  const [tab, setTab] = useState<Tab>("All");
  const [reason, setReason] = useState("All reasons");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const reasons = useMemo(
    () => ["All reasons", ...[...new Set(w.ledger.map((r) => r.reasonLabel))].sort()],
    [w.ledger],
  );

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return w.ledger.filter((r) => {
      if (tab !== "All" && r.type !== tab.toUpperCase()) return false;
      if (reason !== "All reasons" && r.reasonLabel !== reason) return false;
      if (!q) return true;
      return r.holder.toLowerCase().includes(q) || r.contact.toLowerCase().includes(q) || r.reasonLabel.toLowerCase().includes(q);
    });
  }, [w.ledger, tab, reason, search]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const visible = rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  function reset<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setPage(1);
    };
  }

  /* Page-level sums — clearly labelled as "loaded page", never as book totals. */
  const pageCredits = sumAmounts(w.ledger.filter((r) => r.type === "CREDIT"));
  const pageDebits = sumAmounts(w.ledger.filter((r) => r.type === "DEBIT"));
  const matched = sumAmounts(rows);

  const ledgerDown = Boolean(w.ledgerError) || Boolean(w.error);

  return (
    <SpecialShell
      platform={platform}
      agentLabel="Payment & Wallet Agent"
      tagline="Wallet workspace"
      basePath="/wallet-agent-special"
      nav={NAV}
      headerIcon="pulse"
      assistantBlurb="I read the coin ledger entry by entry — every credit, every debit, and the reason attached to it."
      title="Ledger"
      subtitle={`Every wallet credit and debit recorded on ${label}`}
      actions={
        <Pill tone={!w.supported ? "amber" : ledgerDown ? "red" : "green"}>
          <Icon name={w.supported && !ledgerDown ? "check" : "alert"} size={12} />
          {!w.supported ? "Agent not on this platform" : ledgerDown ? "Ledger offline" : "Read-only view"}
        </Pill>
      }
    >
      <style>{LEDGER_CSS}</style>

      {!w.supported ? (
        <UnsupportedNotice snapshot={w} label={label} />
      ) : (
        <>
          {w.error && <ErrorNote error={w.error} platform={platform} />}

          {!w.error && w.ledgerError && (
            <div className="cs-wallet-banner cs-wallet-banner-bad">
              <Icon name="alert" size={15} />
              <span>
                <b>The ledger did not load.</b> {w.ledgerError} The entry table and every ledger-derived chart below are
                unavailable — this is not an empty ledger, it is an unread one. The whole-book credit and debit totals
                still shown come from the agent&apos;s own summary route, which did respond.
              </span>
            </div>
          )}

          <div className="cs-stats">
            <StatCard
              label="Total credits (book)"
              value={w.loading || w.error ? "—" : coins(w.metrics.find((m) => m.key === "credits")?.value ?? null)}
              sub={w.error ? "Could not be read" : "Platform-wide, from the summary route"}
              tone="green"
              icon="trend"
            />
            <StatCard
              label="Total debits (book)"
              value={w.loading || w.error ? "—" : coins(w.metrics.find((m) => m.key === "debits")?.value ?? null)}
              sub={w.error ? "Could not be read" : "Platform-wide, from the summary route"}
              tone="red"
              icon="arrow"
            />
            <StatCard
              label="Coin float"
              value={w.loading || w.error ? "—" : coins(w.float)}
              sub={w.error ? "Could not be computed" : "Credits minus debits"}
              tone="purple"
              icon="target"
            />
            <StatCard
              label="Entries loaded"
              value={w.loading || ledgerDown ? "—" : w.ledger.length.toLocaleString()}
              sub={ledgerDown ? "Ledger unavailable" : w.ledgerTotal !== null ? `of ${w.ledgerTotal.toLocaleString()} on record` : "Server total not reported"}
              tone="blue"
              icon="posts"
            />
            <StatCard
              label="Credited on this page"
              value={w.loading || ledgerDown ? "—" : coins(pageCredits)}
              sub={ledgerDown ? "Ledger unavailable" : "Sum of the loaded CREDIT entries only"}
              tone="cyan"
              icon="check"
            />
            <StatCard
              label="Debited on this page"
              value={w.loading || ledgerDown ? "—" : coins(pageDebits)}
              sub={ledgerDown ? "Ledger unavailable" : "Sum of the loaded DEBIT entries only"}
              tone="amber"
              icon="tag"
            />
          </div>

          <div className="cs-row-3">
            <Card title={w.ledgerDirectionMix.title} action={<span className="cs-wallet-meta">{w.ledgerDirectionMix.total.toLocaleString()} entries</span>}>
              {w.loading ? (
                <Empty>Loading…</Empty>
              ) : ledgerDown ? (
                <Empty>The ledger could not be read, so the credit/debit split cannot be assessed.</Empty>
              ) : w.ledgerDirectionMix.rows.length === 0 ? (
                <Empty>The ledger loaded and contains no entries at all.</Empty>
              ) : (
                <>
                  <div className="cs-donut-row">
                    <Donut data={w.ledgerDirectionMix.rows} center={w.ledgerDirectionMix.total.toLocaleString()} centerLabel="entries" />
                    <Legend data={w.ledgerDirectionMix.rows} />
                  </div>
                  <p className="cs-wallet-note">{w.ledgerDirectionMix.note}</p>
                </>
              )}
            </Card>

            <Card title={w.ledgerReasonMix.title} action={<span className="cs-wallet-meta">Transaction types</span>}>
              {w.loading ? (
                <Empty>Loading…</Empty>
              ) : ledgerDown ? (
                <Empty>The ledger could not be read, so transaction types cannot be assessed.</Empty>
              ) : w.ledgerReasonMix.rows.length === 0 ? (
                <Empty>The ledger loaded and carried no reason on any entry.</Empty>
              ) : (
                <>
                  <div className="cs-donut-row">
                    <Donut data={w.ledgerReasonMix.rows} center={w.ledgerReasonMix.total.toLocaleString()} centerLabel="entries" />
                    <Legend data={w.ledgerReasonMix.rows} />
                  </div>
                  <p className="cs-wallet-note">{w.ledgerReasonMix.note}</p>
                </>
              )}
            </Card>

            <Card title={w.ledgerAmountByReason.title} action={<span className="cs-wallet-meta">{w.ledgerAmountByReason.total.toLocaleString()} GC</span>}>
              {w.loading ? (
                <Empty>Loading…</Empty>
              ) : ledgerDown ? (
                <Empty>The ledger could not be read, so no coin totals can be summed.</Empty>
              ) : w.ledgerAmountByReason.rows.length === 0 ? (
                <Empty>No loaded entry carried a usable amount.</Empty>
              ) : (
                <>
                  <BarRows rows={w.ledgerAmountByReason.rows} colored suffix=" GC" />
                  <p className="cs-wallet-note">{w.ledgerAmountByReason.note}</p>
                </>
              )}
            </Card>
          </div>

          <div className="cs-row-half">
            <Card title={w.topLedgerHolders.title} action={<span className="cs-wallet-meta">Top 8 by entry count</span>}>
              {w.loading ? (
                <Empty>Loading…</Empty>
              ) : ledgerDown ? (
                <Empty>The ledger could not be read, so no wallet ranking can be produced.</Empty>
              ) : w.topLedgerHolders.rows.length === 0 ? (
                <Empty>No loaded entry named a wallet holder.</Empty>
              ) : (
                <>
                  <BarRows rows={w.topLedgerHolders.rows.map((r, i) => ({ ...r, color: SERIES[i % SERIES.length] }))} colored suffix=" entries" />
                  <p className="cs-wallet-note">{w.topLedgerHolders.note}</p>
                </>
              )}
            </Card>

            <Card title={w.debitDestinationMix.title} action={<span className="cs-wallet-meta">Whole-book totals</span>}>
              {w.loading ? (
                <Empty>Loading…</Empty>
              ) : w.error ? (
                <Empty>The summary route failed, so debit composition cannot be assessed.</Empty>
              ) : w.debitDestinationMix.rows.length === 0 ? (
                <Empty>The backend reported no debits at all.</Empty>
              ) : (
                <>
                  <div className="cs-donut-row">
                    <Donut data={w.debitDestinationMix.rows} center={w.debitDestinationMix.total.toLocaleString()} centerLabel="GC" />
                    <Legend data={w.debitDestinationMix.rows} />
                  </div>
                  <p className="cs-wallet-note">{w.debitDestinationMix.note}</p>
                </>
              )}
            </Card>
          </div>

          <Card pad={false}>
            <div className="cs-wallet-toolbar">
              <div className="cs-tabs" style={{ border: 0, flex: 1, minWidth: 200 }}>
                {TABS.map((t) => (
                  <button key={t} type="button" className={tab === t ? "cs-tab active" : "cs-tab"} onClick={() => reset(setTab)(t)}>
                    {t}
                  </button>
                ))}
              </div>

              <select className="cs-btn" value={reason} onChange={(e) => reset(setReason)(e.target.value)} aria-label="Filter by transaction reason">
                {reasons.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>

              <label className="cs-search">
                <Icon name="search" size={15} />
                <input
                  value={search}
                  onChange={(e) => reset(setSearch)(e.target.value)}
                  placeholder="Search holder, contact or reason…"
                  aria-label="Search ledger entries"
                />
              </label>
            </div>

            <div className="cs-table-wrap" style={{ marginTop: 12 }}>
              <table className="cs-table">
                <thead>
                  <tr>
                    <th style={{ paddingLeft: 19 }}>Wallet holder</th>
                    <th>Direction</th>
                    <th>Reason</th>
                    <th className="cs-num">Amount</th>
                    <th className="cs-num">Balance after</th>
                    <th className="cs-num">Age</th>
                    <th className="cs-num" style={{ paddingRight: 19 }}>Recorded</th>
                  </tr>
                </thead>
                <tbody>
                  {w.loading && <tr><td colSpan={7} style={{ padding: 19 }}><Empty>Loading the wallet ledger…</Empty></td></tr>}
                  {!w.loading && ledgerDown && (
                    <tr><td colSpan={7} style={{ padding: 19 }}><Empty>The ledger could not be read this session, so no entries can be listed or ruled out.</Empty></td></tr>
                  )}
                  {!w.loading && !ledgerDown && w.ledger.length === 0 && (
                    <tr><td colSpan={7} style={{ padding: 19 }}><Empty>{label} returned an empty ledger — it loaded successfully and holds no entries.</Empty></td></tr>
                  )}
                  {!w.loading && !ledgerDown && w.ledger.length > 0 && visible.length === 0 && (
                    <tr><td colSpan={7} style={{ padding: 19 }}><Empty>No entry matches these filters.</Empty></td></tr>
                  )}
                  {visible.map((r) => (
                    <tr key={r.id}>
                      <td style={{ paddingLeft: 19, maxWidth: 240 }}>
                        <div className="title">{r.holder}</div>
                        <div className="sub">{r.contact}</div>
                      </td>
                      <td><DirectionPill type={r.type} /></td>
                      <td style={{ color: "#cbd5e1" }}>
                        {r.reasonLabel}
                        {r.note && <div className="sub">{r.note}</div>}
                      </td>
                      <td className="cs-num" style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{coins(r.amount)}</td>
                      <td className="cs-num" style={{ whiteSpace: "nowrap", color: "#cbd5e1" }}>{coins(r.balanceAfter)}</td>
                      <td className="cs-num" style={{ color: "#94a3b8", whiteSpace: "nowrap" }}>{formatAge(r.ageDays)}</td>
                      <td className="cs-num" style={{ paddingRight: 19, color: "#94a3b8", whiteSpace: "nowrap" }}>{dateTime(r.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {rows.length > PAGE_SIZE && (
              <div className="cs-wallet-pager">
                <span>
                  Showing {(current - 1) * PAGE_SIZE + 1}–{Math.min(current * PAGE_SIZE, rows.length)} of {rows.length} · {coins(matched)} matched
                </span>
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

/** Sum of the amounts that exist. Null — not zero — when none of them do. */
function sumAmounts(rows: LedgerRow[]): number | null {
  const known = rows.filter((r) => r.amount !== null);
  if (known.length === 0) return null;
  return Math.round(known.reduce((a, r) => a + (r.amount as number), 0));
}

/** Direction carries a glyph and the word, never colour alone. */
function DirectionPill({ type }: { type: LedgerRow["type"] }) {
  if (type === "CREDIT") return <Pill tone="green"><Icon name="check" size={12} />Credit</Pill>;
  if (type === "DEBIT") return <Pill tone="red"><Icon name="arrow" size={12} />Debit</Pill>;
  return <Pill tone="purple"><Icon name="tag" size={12} />Other</Pill>;
}

function UnsupportedNotice({ snapshot, label }: { snapshot: WalletSnapshot; label: string }) {
  return (
    <Card title={`Payment & Wallet is not available on ${label}`}>
      <div className="cs-wallet-unsupported">
        <span><Icon name="alert" size={18} /></span>
        <div>
          <p>{snapshot.unsupportedReason}</p>
          <p>No coin ledger was requested, so there is no entry list here — real or otherwise.</p>
          <Link href="/wallet-agent-special/ghrfix/ledger" className="cs-btn cs-btn-primary">
            <Icon name="arrow" size={14} />Open the GhrFix ledger
          </Link>
        </div>
      </div>
    </Card>
  );
}

const LEDGER_CSS = `
.cs-wallet-meta{font-size:11px;color:#94a3b8}
.cs-wallet-note{margin:12px 0 0;font-size:11px;line-height:18px;color:#94a3b8}
.cs-wallet-banner{display:flex;gap:10px;align-items:flex-start;border:1px solid rgba(245,158,11,.3);background:rgba(245,158,11,.13);color:#fbbf24;border-radius:11px;padding:12px 14px;font-size:11.5px;line-height:19px;margin-bottom:12px}
.cs-wallet-banner-bad{border-color:rgba(244,63,94,.32);background:rgba(244,63,94,.12);color:#fda4af}
.cs-wallet-banner svg{flex:0 0 auto;margin-top:2px}
.cs-wallet-banner b{font-weight:750}
.cs-wallet-toolbar{display:flex;align-items:center;gap:12px;padding:14px 19px 0;flex-wrap:wrap}
.cs-wallet-pager{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 19px;border-top:1px solid rgba(255,255,255,.07);font-size:11.5px;color:#cbd5e1;flex-wrap:wrap}
.cs-wallet-unsupported{display:flex;gap:13px;align-items:flex-start}
.cs-wallet-unsupported>span{width:34px;height:34px;border-radius:10px;flex:0 0 auto;display:grid;place-items:center;background:rgba(245,158,11,.13);color:#fbbf24}
.cs-wallet-unsupported p{margin:0 0 10px;font-size:12px;line-height:20px;color:#cbd5e1;max-width:640px}
`;
