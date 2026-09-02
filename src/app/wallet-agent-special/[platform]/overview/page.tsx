"use client";

/**
 * Payment & Wallet Agent — Overview.
 *
 * Every figure comes from `useWalletSnapshot`, which reads GhrFix's
 * /ai-agents/payment-wallet/summary + /trend + /topups and the platform-wide
 * /admin/wallet/transactions ledger. Money is never guessed: a total the
 * backend did not return prints "Not tracked", never a zero that would read as
 * a real balance. On ShadiLife — which registers no payment-wallet agent —
 * nothing is fetched and the page says so.
 *
 * Read-only. The approve / reject / PATCH settings writes this agent owns are
 * not wired to anything here.
 */

import Link from "next/link";
import { useWalletSnapshot, formatMetric, coins, type WalletSnapshot } from "@/lib/wallet-data";
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
  SERIES,
  SpecialShell,
  StatCard,
  TrendChart,
  TONE,
  type NavItem,
} from "@/components/special/kit";

const NAV: NavItem[] = [
  { label: "Overview", icon: "dashboard", slug: "overview" },
  { label: "Top-Ups", icon: "posts", slug: "topups" },
  { label: "Ledger", icon: "pulse", slug: "ledger" },
  { label: "Token Economy", icon: "tag", slug: "economy" },
  { label: "Chat with AI Agent", icon: "chat", slug: "chat" },
];

export default function WalletOverviewPage({ params }: { params: Promise<{ platform: string }> }) {
  const platform = usePlatformParam(params);
  const w = useWalletSnapshot(platform);
  const label = platformLabel(platform);

  const measured = w.metrics.filter((m) => m.value !== null).length;
  const ring = w.approvalRate;
  const ringColor = ring.value === null ? "#69738c" : ring.value >= 66 ? "#0f9e69" : ring.value >= 33 ? "#c9860f" : "#e04452";

  return (
    <SpecialShell
      platform={platform}
      agentLabel="Payment & Wallet Agent"
      tagline="Wallet workspace"
      basePath="/wallet-agent-special"
      nav={NAV}
      headerIcon="dashboard"
      assistantBlurb="I read the live coin ledger and the top-up queue. Nothing here writes to the wallet."
      title="Wallet Overview"
      subtitle={w.domain}
      actions={
        <Pill tone={!w.supported ? "amber" : w.error ? "red" : w.loading ? "amber" : "green"}>
          <Icon name={!w.supported ? "alert" : w.error ? "alert" : w.loading ? "clock" : "check"} size={12} />
          {!w.supported
            ? "Agent not on this platform"
            : w.error
              ? "Snapshot failed"
              : w.loading
                ? "Loading snapshot"
                : `${measured} of ${w.metrics.length} totals reported`}
        </Pill>
      }
    >
      <style>{WALLET_CSS}</style>

      {!w.supported ? (
        <UnsupportedNotice snapshot={w} label={label} />
      ) : (
        <>
          {w.error && <ErrorNote error={w.error} platform={platform} />}

          {w.error && (
            <Card title="What this page can tell you right now">
              <Empty>
                Nothing. The wallet snapshot did not load, so no balance, queue depth or approval rate on this page can
                be assessed — and none will be shown as zero to fill the gap.
              </Empty>
            </Card>
          )}

          <div className="cs-stats">
            {w.metrics.map((m) => (
              <StatCard
                key={m.key}
                label={m.label}
                value={w.loading || w.error ? "—" : formatMetric(m)}
                sub={w.error ? "Could not be read this session" : w.loading ? "Loading…" : m.note}
                tone={m.tone}
                icon={m.icon}
              />
            ))}
          </div>

          <div className="cs-row-2">
            <Card
              title="Coins credited"
              action={<span className="cs-wallet-meta">{w.series ? w.series.granularity : "No series returned"}</span>}
            >
              {w.loading ? (
                <Empty>Loading the credit trend…</Empty>
              ) : w.error ? (
                <Empty>The snapshot failed, so no trend can be drawn or assessed.</Empty>
              ) : w.series ? (
                <>
                  <TrendChart
                    labels={w.series.labels}
                    series={w.series.series.map((s, i) => ({ name: s.name, data: s.data, color: SERIES[i] }))}
                    suffix=" GC"
                  />
                  <p className="cs-wallet-note">
                    {coins(w.creditedInWindow)} credited across the window
                    {w.windowChangePct !== null
                      ? ` — ${w.windowChangePct >= 0 ? "up" : "down"} ${Math.abs(w.windowChangePct)}% on the prior half.`
                      : "."}{" "}
                    {w.seriesNote}
                  </p>
                </>
              ) : (
                <Empty>{w.seriesNote}</Empty>
              )}
            </Card>

            <Card title={ring.label}>
              <div className="cs-wallet-ring">
                <ScoreRing
                  value={w.loading || w.error || ring.value === null ? 0 : Math.round(ring.value)}
                  max={ring.max}
                  label={ring.value === null || w.error ? "No verdicts" : "%"}
                  color={ringColor}
                />
                <p className="cs-wallet-note" style={{ textAlign: "center" }}>
                  {w.error
                    ? "Could not be computed — the top-up queue failed to load."
                    : w.loading
                      ? "Loading the decided requests…"
                      : ring.note}
                </p>
              </div>
            </Card>
          </div>

          <div className="cs-row-half">
            <DonutCard
              title={w.creditSourceMix.title}
              dimension={w.creditSourceMix}
              loading={w.loading}
              failed={Boolean(w.error)}
              emptyText="The backend reported no credits at all."
            />
            <DonutCard
              title={w.topupStatusMix.title}
              dimension={w.topupStatusMix}
              loading={w.loading}
              failed={Boolean(w.error)}
              emptyText="No top-up request has ever been raised."
            />
          </div>

          <div className="cs-row-half">
            <Card title={w.debitDestinationMix.title} action={<span className="cs-wallet-meta">{w.debitDestinationMix.total.toLocaleString()} GC</span>}>
              {w.loading ? (
                <Empty>Loading…</Empty>
              ) : w.error ? (
                <Empty>The snapshot failed, so debit composition cannot be assessed.</Empty>
              ) : w.debitDestinationMix.rows.length === 0 ? (
                <Empty>The backend reported no debits at all.</Empty>
              ) : (
                <>
                  <BarRows rows={w.debitDestinationMix.rows} colored suffix=" GC" />
                  <p className="cs-wallet-note">{w.debitDestinationMix.note}</p>
                </>
              )}
            </Card>

            <Card title={w.topTopUpRequesters.title} action={<span className="cs-wallet-meta">Top 8 by coins requested</span>}>
              {w.loading ? (
                <Empty>Loading…</Empty>
              ) : w.error ? (
                <Empty>The queue failed to load, so no ranking can be produced.</Empty>
              ) : w.topTopUpRequesters.rows.length === 0 ? (
                <Empty>No loaded request carried both a named user and an amount.</Empty>
              ) : (
                <>
                  <BarRows rows={w.topTopUpRequesters.rows.map((r, i) => ({ ...r, color: SERIES[i % SERIES.length] }))} colored suffix=" GC" />
                  <p className="cs-wallet-note">{w.topTopUpRequesters.note}</p>
                </>
              )}
            </Card>
          </div>

          <div className="cs-row-2">
            <Card title="Computed insights" action={<span className="cs-wallet-meta">Arithmetic over the snapshot</span>}>
              {w.loading ? (
                <Empty>Loading…</Empty>
              ) : w.error ? (
                <Empty>Every insight below is arithmetic over the snapshot — none can be computed while it is unavailable.</Empty>
              ) : (
                <div className="cs-wallet-insights">
                  {buildInsights(w).map((i) => (
                    <div className="cs-wallet-insight" key={i.label}>
                      <span style={{ background: TONE[i.tone].bg, color: TONE[i.tone].fg }}>
                        <Icon name={i.icon} size={15} />
                      </span>
                      <div>
                        <b>{i.label}</b>
                        <p>{i.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card title="Provenance">
              <div className="cs-wallet-facts">
                <div className="cs-wallet-facts-head">Where these numbers come from</div>
                <p className="cs-wallet-note">{w.sourceNote}</p>
                <div className="cs-wallet-facts-head">Coverage</div>
                <p className="cs-wallet-note">{w.error ? "Nothing loaded this session." : w.coverageNote}</p>
                <div className="cs-wallet-facts-head">Writes</div>
                <p className="cs-wallet-note">
                  This workspace is strictly read-only. Approving or rejecting a top-up, and changing the token economy,
                  move real money — those endpoints are never called from these pages.
                </p>
              </div>
            </Card>
          </div>
        </>
      )}
    </SpecialShell>
  );
}

/* A donut is only ever drawn with its own directly-labelled legend. */
function DonutCard({
  title,
  dimension,
  loading,
  failed,
  emptyText,
}: {
  title: string;
  dimension: WalletSnapshot["creditSourceMix"];
  loading: boolean;
  failed: boolean;
  emptyText: string;
}) {
  return (
    <Card title={title} action={<span className="cs-wallet-meta">{dimension.total.toLocaleString()} {dimension.unit}</span>}>
      {loading ? (
        <Empty>Loading…</Empty>
      ) : failed ? (
        <Empty>The snapshot failed, so this mix cannot be assessed.</Empty>
      ) : dimension.rows.length === 0 ? (
        <Empty>{emptyText}</Empty>
      ) : (
        <>
          <div className="cs-donut-row">
            <Donut data={dimension.rows} center={dimension.total.toLocaleString()} centerLabel={dimension.unit} />
            <Legend data={dimension.rows} />
          </div>
          <p className="cs-wallet-note">{dimension.note}</p>
        </>
      )}
    </Card>
  );
}

/** The honest state for a platform that does not run this agent at all. */
function UnsupportedNotice({ snapshot, label }: { snapshot: WalletSnapshot; label: string }) {
  return (
    <Card title={`Payment & Wallet is not available on ${label}`}>
      <div className="cs-wallet-unsupported">
        <span><Icon name="alert" size={18} /></span>
        <div>
          <p>{snapshot.unsupportedReason}</p>
          <p>
            No request was made, so there is nothing to load, retry or fix — and no figure on this page has been
            estimated, defaulted or carried over from the other platform.
          </p>
          <Link href="/wallet-agent-special/ghrfix/overview" className="cs-btn cs-btn-primary">
            <Icon name="arrow" size={14} />Open the GhrFix wallet workspace
          </Link>
        </div>
      </div>
    </Card>
  );
}

interface Insight {
  label: string;
  text: string;
  tone: keyof typeof TONE;
  icon: string;
}

/** Every line below is derived from loaded values, and says so when a value is missing. */
function buildInsights(w: WalletSnapshot): Insight[] {
  const out: Insight[] = [];

  out.push({
    label: "Outstanding float",
    tone: "purple",
    icon: "target",
    text:
      w.float === null
        ? "Credits or debits were not returned, so the coins still held in user wallets cannot be computed."
        : `${coins(w.float)} sit in user wallets — total credits minus total debits.`,
  });

  const pending = w.topups.filter((t) => t.status === "PENDING");
  const oldest = pending.reduce<number | null>((acc, t) => (t.ageDays === null ? acc : Math.max(acc ?? 0, t.ageDays)), null);
  out.push({
    label: "Review backlog",
    tone: pending.length > 0 ? "amber" : "green",
    icon: "clock",
    text:
      w.topups.length === 0
        ? "No top-up requests were returned, so the backlog cannot be assessed."
        : pending.length === 0
          ? `None of the ${w.topups.length} loaded request${w.topups.length === 1 ? "" : "s"} is still pending review.`
          : `${pending.length} request${pending.length === 1 ? "" : "s"} await review${oldest === null ? "" : `, the oldest raised ${oldest} day${oldest === 1 ? "" : "s"} ago`}.`,
  });

  out.push({
    label: "Average approved top-up",
    tone: "green",
    icon: "check",
    text:
      w.avgApprovedTopUp === null
        ? "No loaded request is both approved and carries an amount, so no average exists."
        : `${coins(w.avgApprovedTopUp)} across the approved requests that reported an amount.`,
  });

  const fee = w.metrics.find((m) => m.key === "fees")?.value ?? null;
  const cash = w.metrics.find((m) => m.key === "cash")?.value ?? null;
  out.push({
    label: "Fee revenue vs job cash",
    tone: "amber",
    icon: "tag",
    text:
      fee === null || cash === null
        ? "The backend did not return both the accept-fee total and the cash settled, so the two cannot be compared."
        : `${coins(fee)} collected in accept fees against ${cash.toLocaleString()} PKR of job cash settled directly between customer and provider.`,
  });

  const busiestReason = w.ledgerAmountByReason.rows[0];
  out.push({
    label: "Biggest ledger mover",
    tone: "cyan",
    icon: "pulse",
    text: w.ledgerError
      ? "The platform ledger did not load, so no per-reason ranking can be computed."
      : busiestReason
        ? `"${busiestReason.label}" moved the most coins on the loaded ledger page — ${busiestReason.value.toLocaleString()} GC.`
        : "The loaded ledger page carried no entry with a usable amount.",
  });

  return out;
}

const WALLET_CSS = `
.cs-wallet-meta{font-size:11px;color:#69738c}
.cs-wallet-note{margin:12px 0 0;font-size:11px;line-height:18px;color:#8891a8}
.cs-wallet-ring{display:flex;flex-direction:column;align-items:center;gap:12px}
.cs-wallet-insights{display:flex;flex-direction:column;gap:14px}
.cs-wallet-insight{display:flex;gap:11px;align-items:flex-start}
.cs-wallet-insight>span{width:29px;height:29px;border-radius:9px;flex:0 0 auto;display:grid;place-items:center}
.cs-wallet-insight b{font-size:11.5px;font-weight:700;display:block;margin-bottom:3px}
.cs-wallet-insight p{margin:0;font-size:11.5px;line-height:19px;color:#4c5470}
.cs-wallet-facts{display:flex;flex-direction:column;gap:2px}
.cs-wallet-facts-head{font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#8891a8;margin-top:10px}
.cs-wallet-unsupported{display:flex;gap:13px;align-items:flex-start}
.cs-wallet-unsupported>span{width:34px;height:34px;border-radius:10px;flex:0 0 auto;display:grid;place-items:center;background:#fff6e6;color:#c9860f}
.cs-wallet-unsupported p{margin:0 0 10px;font-size:12px;line-height:20px;color:#4c5470;max-width:640px}
`;
