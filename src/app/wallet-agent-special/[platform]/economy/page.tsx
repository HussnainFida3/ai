"use client";

/**
 * Payment & Wallet Agent — Token Economy.
 *
 * The token-economy configuration behind the flat accept fee, read from the
 * `economy` block on GET /ai-agents/payment-wallet/summary, plus the real
 * derived economics that sit on top of it: fees collected, net coin flow, and
 * the fee's implied share of each approved top-up.
 *
 * DISPLAY ONLY. Editing these values is `PATCH
 * /ai-agents/payment-wallet/settings` — a real, audited write that changes what
 * every provider is charged. It is not wired up here; the Save affordance is
 * inert by design and says so.
 */

import Link from "next/link";
import { useWalletSnapshot, coins, dateTime, type WalletSnapshot } from "@/lib/wallet-data";
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
  ScoreRing,
  SpecialShell,
  StatCard,
  TrendChart,
  SERIES,
  type NavItem,
} from "@/components/special/kit";

const NAV: NavItem[] = [
  { label: "Overview", icon: "dashboard", slug: "overview" },
  { label: "Top-Ups", icon: "posts", slug: "topups" },
  { label: "Ledger", icon: "pulse", slug: "ledger" },
  { label: "Token Economy", icon: "tag", slug: "economy" },
  { label: "Chat with AI Agent", icon: "chat", slug: "chat" },
];

export default function WalletEconomyPage({ params }: { params: Promise<{ platform: string }> }) {
  const platform = usePlatformParam(params);
  const w = useWalletSnapshot(platform);
  const label = platformLabel(platform);

  const e = w.economy;
  const fees = w.metrics.find((m) => m.key === "fees")?.value ?? null;
  const credits = w.metrics.find((m) => m.key === "credits")?.value ?? null;
  const debits = w.metrics.find((m) => m.key === "debits")?.value ?? null;
  const cash = w.metrics.find((m) => m.key === "cash")?.value ?? null;

  /* The fee as a share of the average approved top-up — how many coins of a
     typical top-up one accepted job consumes. Null unless both halves are real. */
  const feeShare =
    e?.acceptFeeTokens !== null && e?.acceptFeeTokens !== undefined && w.avgApprovedTopUp !== null && w.avgApprovedTopUp > 0
      ? Math.round((e.acceptFeeTokens / w.avgApprovedTopUp) * 1000) / 10
      : null;

  /* Fees as a share of everything ever debited — how much of the outflow is
     platform revenue rather than refunds or bookings. */
  const feeShareOfDebits = fees !== null && debits !== null && debits > 0 ? Math.round((fees / debits) * 1000) / 10 : null;

  const configRows: Array<{ label: string; value: string; note: string }> = [
    {
      label: "Accept fee",
      value: e ? coins(e.acceptFeeTokens) : "—",
      note: "Charged flat to a provider each time a job is accepted.",
    },
    {
      label: "Signup coin grant",
      value: e ? coins(e.signupTokenGrant) : "—",
      note: "Credited once to every new account.",
    },
    { label: "Bank name", value: e?.bankName ?? "—", note: "Shown to users making a manual transfer." },
    { label: "Account name", value: e?.bankAccountName ?? "—", note: "Beneficiary on the transfer instructions." },
    { label: "Account number", value: e?.bankAccountNumber ?? "—", note: "As stored by the backend, unmodified." },
    { label: "Last changed", value: e?.updatedAt ? dateTime(e.updatedAt) : "—", note: "The settings row's own updatedAt." },
  ];

  const flowRows = [
    { label: "Total credited", value: credits ?? 0 },
    { label: "Total debited", value: debits ?? 0 },
    { label: "Accept fees collected", value: fees ?? 0 },
  ].filter((r) => r.value > 0);

  return (
    <SpecialShell
      platform={platform}
      agentLabel="Payment & Wallet Agent"
      tagline="Wallet workspace"
      basePath="/wallet-agent-special"
      nav={NAV}
      headerIcon="tag"
      assistantBlurb="I can explain the accept fee and the signup grant. Changing them is an audited write, not something I do from here."
      title="Token Economy"
      subtitle={`The settings behind the ${label} accept fee — displayed read-only`}
      actions={
        <Pill tone={!w.supported ? "amber" : w.error ? "red" : "green"}>
          <Icon name={w.supported && !w.error ? "check" : "alert"} size={12} />
          {!w.supported ? "Agent not on this platform" : w.error ? "Settings offline" : "Read-only"}
        </Pill>
      }
    >
      <style>{ECONOMY_CSS}</style>

      {!w.supported ? (
        <UnsupportedNotice snapshot={w} label={label} />
      ) : (
        <>
          {w.error && <ErrorNote error={w.error} platform={platform} />}

          <div className="cs-wallet-banner">
            <Icon name="alert" size={15} />
            <span>
              <b>These settings are not editable here.</b> Changing the accept fee or signup grant is
              <code> PATCH /ai-agents/payment-wallet/settings</code> — a real, audited write that alters what every
              provider is charged. This workspace never calls it, so the Save control below is disabled by design.
            </span>
          </div>

          <div className="cs-stats">
            <StatCard
              label="Accept fee per job"
              value={w.loading || w.error ? "—" : e ? coins(e.acceptFeeTokens) : "Not returned"}
              sub={w.error ? "Could not be read" : "The flat charge on each accepted job"}
              tone="amber"
              icon="tag"
            />
            <StatCard
              label="Signup grant"
              value={w.loading || w.error ? "—" : e ? coins(e.signupTokenGrant) : "Not returned"}
              sub={w.error ? "Could not be read" : "Credited once per new account"}
              tone="purple"
              icon="users"
            />
            <StatCard
              label="Accept fees collected"
              value={w.loading || w.error ? "—" : coins(fees)}
              sub={w.error ? "Could not be read" : "Lifetime, from walletTotals"}
              tone="green"
              icon="check"
            />
            <StatCard
              label="Net coin flow"
              value={w.loading || w.error ? "—" : coins(w.float)}
              sub={w.error ? "Could not be computed" : "Credits minus debits — coins still outstanding"}
              tone="blue"
              icon="target"
            />
            <StatCard
              label="Fee share of outflow"
              value={w.loading || w.error || feeShareOfDebits === null ? "—" : `${feeShareOfDebits}%`}
              sub={w.error ? "Could not be computed" : feeShareOfDebits === null ? "Fees or debits were not returned" : "Of every coin ever debited"}
              tone="cyan"
              icon="pulse"
            />
            <StatCard
              label="Cash settled off-wallet"
              value={w.loading || w.error ? "—" : cash === null ? "Not tracked" : `PKR ${cash.toLocaleString()}`}
              sub={w.error ? "Could not be read" : "Paid customer-to-provider; never enters the coin economy"}
              tone="red"
              icon="arrow"
            />
          </div>

          <div className="cs-row-2">
            <Card
              title="Token economy settings"
              action={<button type="button" className="cs-btn" disabled title="Not wired up — this is an audited money write" aria-label="Save settings (disabled)"><Icon name="check" size={13} />Save changes</button>}
            >
              {w.loading ? (
                <Empty>Loading the economy settings…</Empty>
              ) : w.error ? (
                <Empty>The snapshot failed, so the live settings cannot be shown — and no default will be displayed in their place.</Empty>
              ) : !e ? (
                <Empty>{w.economyNote}</Empty>
              ) : (
                <>
                  <div className="cs-wallet-config">
                    {configRows.map((r) => (
                      <div className="cs-wallet-config-row" key={r.label}>
                        <div>
                          <b>{r.label}</b>
                          <p>{r.note}</p>
                        </div>
                        <span className="cs-num">{r.value}</span>
                      </div>
                    ))}
                  </div>
                  <p className="cs-wallet-note">{w.economyNote}</p>
                </>
              )}
            </Card>

            <Card title="Fee weight in a typical top-up">
              <div className="cs-wallet-ring">
                <ScoreRing
                  value={w.loading || w.error || feeShare === null ? 0 : Math.min(100, Math.round(feeShare))}
                  max={100}
                  label={feeShare === null || w.error ? "Not computable" : "%"}
                  color={feeShare === null ? "#69738c" : feeShare >= 50 ? "#e04452" : feeShare >= 20 ? "#c9860f" : "#0f9e69"}
                />
                <p className="cs-wallet-note" style={{ textAlign: "center" }}>
                  {w.error
                    ? "Neither the fee nor the average approved top-up could be read."
                    : feeShare === null
                      ? "This needs both the accept fee and at least one approved top-up carrying an amount. One of them is missing, so no percentage is shown."
                      : `One accepted job consumes ${feeShare}% of the average approved top-up (${coins(w.avgApprovedTopUp)}).`}
                </p>
              </div>
            </Card>
          </div>

          <div className="cs-row-half">
            <Card title={w.creditSourceMix.title} action={<span className="cs-wallet-meta">{w.creditSourceMix.total.toLocaleString()} GC</span>}>
              {w.loading ? (
                <Empty>Loading…</Empty>
              ) : w.error ? (
                <Empty>The snapshot failed, so credit composition cannot be assessed.</Empty>
              ) : w.creditSourceMix.rows.length === 0 ? (
                <Empty>The backend reported no credits at all.</Empty>
              ) : (
                <>
                  <div className="cs-donut-row">
                    <Donut data={w.creditSourceMix.rows} center={w.creditSourceMix.total.toLocaleString()} centerLabel="GC" />
                    <Legend data={w.creditSourceMix.rows} />
                  </div>
                  <p className="cs-wallet-note">{w.creditSourceMix.note}</p>
                </>
              )}
            </Card>

            <Card title="Economy in aggregate" action={<span className="cs-wallet-meta">Whole-book totals</span>}>
              {w.loading ? (
                <Empty>Loading…</Empty>
              ) : w.error ? (
                <Empty>The snapshot failed, so nothing can be totalled.</Empty>
              ) : flowRows.length === 0 ? (
                <Empty>The backend returned none of the aggregate totals this compares.</Empty>
              ) : (
                <>
                  <BarRows rows={flowRows} colored suffix=" GC" />
                  <p className="cs-wallet-note">
                    From `walletTotals` on the agent summary route. A total the backend omitted is left out of this
                    comparison entirely rather than drawn as a zero bar.
                  </p>
                </>
              )}
            </Card>
          </div>

          <Card
            title="Coins credited under these settings"
            action={<span className="cs-wallet-meta">{w.series ? w.series.granularity : "No series returned"}</span>}
          >
            {w.loading ? (
              <Empty>Loading the credit trend…</Empty>
            ) : w.error ? (
              <Empty>The snapshot failed, so no trend can be drawn.</Empty>
            ) : w.series ? (
              <>
                <TrendChart
                  labels={w.series.labels}
                  series={w.series.series.map((s, i) => ({ name: s.name, data: s.data, color: SERIES[i] }))}
                  suffix=" GC"
                />
                <p className="cs-wallet-note">
                  {w.seriesNote} These are credits, not fees — the backend exposes no per-day series for fee revenue, and
                  none is inferred here.
                </p>
              </>
            ) : (
              <Empty>{w.seriesNote}</Empty>
            )}
          </Card>
        </>
      )}
    </SpecialShell>
  );
}

function UnsupportedNotice({ snapshot, label }: { snapshot: WalletSnapshot; label: string }) {
  return (
    <Card title={`Payment & Wallet is not available on ${label}`}>
      <div className="cs-wallet-unsupported">
        <span><Icon name="alert" size={18} /></span>
        <div>
          <p>{snapshot.unsupportedReason}</p>
          <p>
            There is no coin economy, accept fee or signup grant to display for this platform, and none has been
            substituted from GhrFix.
          </p>
          <Link href="/wallet-agent-special/ghrfix/economy" className="cs-btn cs-btn-primary">
            <Icon name="arrow" size={14} />Open the GhrFix token economy
          </Link>
        </div>
      </div>
    </Card>
  );
}

const ECONOMY_CSS = `
.cs-wallet-meta{font-size:11px;color:#69738c}
.cs-wallet-note{margin:12px 0 0;font-size:11px;line-height:18px;color:#8891a8}
.cs-wallet-banner{display:flex;gap:10px;align-items:flex-start;border:1px solid #f0e0bd;background:#fffaef;color:#7a5a12;border-radius:11px;padding:12px 14px;font-size:11.5px;line-height:19px;margin-bottom:12px}
.cs-wallet-banner svg{flex:0 0 auto;margin-top:2px}
.cs-wallet-banner b{font-weight:750}
.cs-wallet-banner code{font-size:11px;background:#fff3d9;border-radius:4px;padding:1px 4px}
.cs-wallet-ring{display:flex;flex-direction:column;align-items:center;gap:12px}
.cs-wallet-config{display:flex;flex-direction:column}
.cs-wallet-config-row{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:12px 0;border-bottom:1px solid #f4f5f9}
.cs-wallet-config-row:last-child{border-bottom:0}
.cs-wallet-config-row b{font-size:12px;font-weight:700;display:block}
.cs-wallet-config-row p{margin:3px 0 0;font-size:10.5px;line-height:17px;color:#8891a8;max-width:340px}
.cs-wallet-config-row>span{font-size:12.5px;font-weight:730;white-space:nowrap;text-align:right}
.cs-wallet-unsupported{display:flex;gap:13px;align-items:flex-start}
.cs-wallet-unsupported>span{width:34px;height:34px;border-radius:10px;flex:0 0 auto;display:grid;place-items:center;background:#fff6e6;color:#c9860f}
.cs-wallet-unsupported p{margin:0 0 10px;font-size:12px;line-height:20px;color:#4c5470;max-width:640px}
`;
