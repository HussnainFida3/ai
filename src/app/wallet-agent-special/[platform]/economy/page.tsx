"use client";

/**
 * Payment & Wallet Agent — Token Economy.
 *
 * The token-economy configuration behind the flat accept fee, read from the
 * `economy` block on GET /ai-agents/payment-wallet/summary, plus the real
 * derived economics that sit on top of it: fees collected, net coin flow, and
 * the fee's implied share of each approved top-up.
 *
 * Accept fee and signup grant are REAL, editable, audited writes — `Save
 * changes` calls PATCH /ai-agents/payment-wallet/settings
 * (src/lib/wallet-data.ts: `updateEconomySettings`) — GhrFix only, since
 * ShadiLife registers no payment-wallet agent at all (the whole page renders
 * the unsupported state there instead of this one). Bank details stay
 * display-only here; the backend accepts them too, but nothing on this page
 * offers to change where GhrFix's own bank account is shown to depositors.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useWalletSnapshot, updateEconomySettings, coins, dateTime, type WalletSnapshot } from "@/lib/wallet-data";
import { ApiError } from "@/lib/api";
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

  /* Editable accept-fee / signup-grant form. Re-hydrated from the live
     settings whenever their real `updatedAt` changes — on first load, and
     again right after this page's own save updates the hook's snapshot —
     so a saved value is never overwritten by a stale draft. */
  const [feeInput, setFeeInput] = useState("");
  const [grantInput, setGrantInput] = useState("");
  const [hydratedAt, setHydratedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; tone: "success" | "error" } | null>(null);

  useEffect(() => {
    if (!e) return;
    const key = e.updatedAt ?? "unset";
    if (key === hydratedAt) return;
    setFeeInput(e.acceptFeeTokens === null ? "" : String(e.acceptFeeTokens));
    setGrantInput(e.signupTokenGrant === null ? "" : String(e.signupTokenGrant));
    setHydratedAt(key);
  }, [e, hydratedAt]);

  function notify(text: string, tone: "success" | "error" = "success") {
    setToast({ text, tone });
    window.setTimeout(() => setToast((cur) => (cur?.text === text ? null : cur)), 3200);
  }

  const feeNum = feeInput.trim() === "" ? null : Number(feeInput);
  const grantNum = grantInput.trim() === "" ? null : Number(grantInput);
  const feeValid = feeNum !== null && Number.isFinite(feeNum) && feeNum >= 0;
  const grantValid = grantNum !== null && Number.isFinite(grantNum) && grantNum >= 0;
  const dirty = e !== null && ((feeValid && feeNum !== e.acceptFeeTokens) || (grantValid && grantNum !== e.signupTokenGrant));
  const canSave = w.supported && !w.error && !w.loading && !saving && Boolean(e) && feeValid && grantValid && dirty;

  async function handleSave() {
    if (!e || feeNum === null || grantNum === null) return;
    const changes: string[] = [];
    if (feeNum !== e.acceptFeeTokens) changes.push(`• Accept fee: ${coins(e.acceptFeeTokens)} → ${coins(feeNum)}`);
    if (grantNum !== e.signupTokenGrant) changes.push(`• Signup coin grant: ${coins(e.signupTokenGrant)} → ${coins(grantNum)}`);
    const sure = window.confirm(
      `Save these token-economy changes on ${label}?\n\n${changes.join("\n")}\n\nThis is a real, audited write that changes what every provider is charged, effective immediately.`,
    );
    if (!sure) return;
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await updateEconomySettings({ acceptFeeTokens: feeNum, signupTokenGrant: grantNum });
      w.applyEconomyUpdate(updated);
      notify("Token economy settings saved.");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Could not save the token economy settings.";
      setSaveError(msg);
      notify(msg, "error");
    } finally {
      setSaving(false);
    }
  }

  /* The fee as a share of the average approved top-up — how many coins of a
     typical top-up one accepted job consumes. Null unless both halves are real. */
  const feeShare =
    e?.acceptFeeTokens !== null && e?.acceptFeeTokens !== undefined && w.avgApprovedTopUp !== null && w.avgApprovedTopUp > 0
      ? Math.round((e.acceptFeeTokens / w.avgApprovedTopUp) * 1000) / 10
      : null;

  /* Fees as a share of everything ever debited — how much of the outflow is
     platform revenue rather than refunds or bookings. */
  const feeShareOfDebits = fees !== null && debits !== null && debits > 0 ? Math.round((fees / debits) * 1000) / 10 : null;

  const readOnlyConfigRows: Array<{ label: string; value: string; note: string }> = [
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
    <>
    <SpecialShell
      platform={platform}
      agentLabel="Payment & Wallet Agent"
      tagline="Wallet workspace"
      basePath="/wallet-agent-special"
      nav={NAV}
      headerIcon="tag"
      assistantBlurb="I can explain the accept fee and the signup grant. Use Save changes on this page to update them for real."
      title="Token Economy"
      subtitle={`The settings behind the ${label} accept fee — accept fee and signup grant are live-editable`}
      actions={
        <Pill tone={!w.supported ? "amber" : w.error ? "red" : "green"}>
          <Icon name={w.supported && !w.error ? "check" : "alert"} size={12} />
          {!w.supported ? "Agent not on this platform" : w.error ? "Settings offline" : "Editable"}
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
              <b>Accept fee and signup grant are live.</b> Saving calls
              <code> PATCH /ai-agents/payment-wallet/settings</code> — a real, audited write that alters what every
              provider is charged, effective immediately for every job accepted after the save. Bank details below
              stay display-only. Always confirm before saving.
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
              action={
                <button
                  type="button"
                  className="cs-btn cs-btn-primary cs-economy-save"
                  disabled={!canSave}
                  onClick={handleSave}
                  aria-label="Save token economy changes"
                  title={
                    !e
                      ? "Settings have not loaded yet"
                      : !feeValid || !grantValid
                        ? "Enter a valid non-negative number for both fields"
                        : !dirty
                          ? "No changes to save"
                          : undefined
                  }
                >
                  <Icon name="check" size={13} />
                  {saving ? "Saving…" : "Save changes"}
                </button>
              }
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
                    <div className="cs-wallet-config-row">
                      <div>
                        <b>Accept fee</b>
                        <p>Charged flat to a provider each time a job is accepted.</p>
                      </div>
                      <label className="cs-wallet-input">
                        <input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="1"
                          value={feeInput}
                          onChange={(ev) => setFeeInput(ev.target.value)}
                          disabled={saving}
                          aria-label="Accept fee, in GhrFix coins"
                        />
                        <span>GC</span>
                      </label>
                    </div>
                    <div className="cs-wallet-config-row">
                      <div>
                        <b>Signup coin grant</b>
                        <p>Credited once to every new account.</p>
                      </div>
                      <label className="cs-wallet-input">
                        <input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="1"
                          value={grantInput}
                          onChange={(ev) => setGrantInput(ev.target.value)}
                          disabled={saving}
                          aria-label="Signup coin grant, in GhrFix coins"
                        />
                        <span>GC</span>
                      </label>
                    </div>
                    {readOnlyConfigRows.map((r) => (
                      <div className="cs-wallet-config-row" key={r.label}>
                        <div>
                          <b>{r.label}</b>
                          <p>{r.note}</p>
                        </div>
                        <span className="cs-num">{r.value}</span>
                      </div>
                    ))}
                  </div>
                  {saveError && (
                    <p className="cs-wallet-save-error">
                      <Icon name="alert" size={12} />
                      {saveError}
                    </p>
                  )}
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
    {toast && (
      <div className={`cs-toast${toast.tone === "error" ? " cs-toast-error" : ""}`} role="status" aria-live="polite">
        <Icon name={toast.tone === "error" ? "alert" : "check"} size={14} />
        {toast.text}
      </div>
    )}
    </>
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
.cs-wallet-input{display:inline-flex;align-items:center;gap:6px;height:34px;padding:0 6px 0 10px;border:1px solid #dfe2ea;border-radius:8px;background:#fff;flex:0 0 auto}
.cs-wallet-input:focus-within{border-color:#7c3aed}
.cs-wallet-input input{width:84px;border:0;outline:0;text-align:right;font-size:12.5px;font-weight:700;font-variant-numeric:tabular-nums;background:transparent;color:inherit}
.cs-wallet-input input:disabled{color:#9aa3b8}
.cs-wallet-input input::-webkit-inner-spin-button,.cs-wallet-input input::-webkit-outer-spin-button{margin-left:4px}
.cs-wallet-input span{font-size:11px;color:#8891a8;font-weight:650}
.cs-economy-save:disabled{opacity:.5;cursor:not-allowed;box-shadow:none}
.cs-wallet-save-error{display:flex;align-items:flex-start;gap:6px;margin:12px 0 0;font-size:11.5px;line-height:17px;color:#c0323e}
.cs-wallet-save-error svg{flex:0 0 auto;margin-top:2px}
.cs-toast{position:fixed;right:22px;bottom:22px;max-width:360px;background:#11162f;color:#fff;border-radius:10px;padding:12px 16px;font-size:12px;line-height:18px;box-shadow:0 14px 32px rgba(20,22,50,.28);z-index:80;display:flex;align-items:flex-start;gap:9px}
.cs-toast svg{flex:0 0 auto;margin-top:1px;color:#5eead4}
.cs-toast-error{background:#3d1420}
.cs-toast-error svg{color:#ff8a93}
`;
