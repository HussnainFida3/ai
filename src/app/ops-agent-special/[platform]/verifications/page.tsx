"use client";

/**
 * Ops Agent — Verifications.
 *
 * The pending-verification pipeline specifically.
 *
 *  GhrFix   — the Ops Agent owns this directly: pending providers come from
 *             /ai-agents/ops/queue, and the platform-wide verification mix
 *             from /ai-agents/ops/summary.
 *  ShadiLife — the Ops Agent has NO verification queue. The rows here come
 *             from the Verification Agent's own real endpoints
 *             (/ai-agents/verification/pending and /summary), and the page
 *             says so rather than implying Ops owns them.
 *
 * Approve/Reject are wired to the real, audited GhrFix write
 * (POST /ai-agents/ops/providers/:id/verify). ShadiLife has no equivalent on
 * either its Ops Agent or its Verification Agent — the actual human decision
 * is made through the plain /admin/moderation queue, outside any AI agent —
 * so this stays disabled there with an honest note instead of faking parity.
 */

import { useMemo, useState } from "react";
import { useOpsSnapshot, ageLabel, verifyProvider, verificationPatchFor } from "@/lib/ops-data";
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
  type NavItem,
} from "@/components/special/kit";

const NAV: NavItem[] = [
  { label: "Overview", icon: "dashboard", slug: "overview" },
  { label: "Operational Queue", icon: "posts", slug: "queue" },
  { label: "Verifications", icon: "check", slug: "verifications" },
  { label: "Incidents", icon: "alert", slug: "incidents" },
  { label: "Chat with AI Agent", icon: "chat", slug: "chat" },
];

const SHOW = 12;

export default function OpsVerificationsPage({ params }: { params: Promise<{ platform: string }> }) {
  const platform = usePlatformParam(params);
  const o = useOpsSnapshot(platform);
  const label = platformLabel(platform);

  const [onlyStale, setOnlyStale] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const notify = (text: string) => {
    setToast(text);
    window.setTimeout(() => setToast(""), 3200);
  };

  async function approveProvider(id: string, name: string) {
    if (!window.confirm(`Approve "${name}" as a verified GhrFix provider? This is a real, audited write — they can start accepting bookings immediately.`)) return;
    setBusyId(id);
    try {
      await verifyProvider(id, "VERIFIED");
      o.applyStatusUpdate(id, verificationPatchFor("VERIFIED"));
      notify(`Approved "${name}" — now a verified provider.`);
    } catch (err) {
      notify(err instanceof Error ? err.message : "Could not approve this provider.");
    } finally {
      setBusyId(null);
    }
  }

  async function rejectProvider(id: string, name: string) {
    const note = window.prompt(
      `Reject "${name}"'s verification on GhrFix? This is a real, audited write. Add an optional note for the audit log (leave blank to skip), or press Cancel to abort.`,
      "",
    );
    if (note === null) return;
    setBusyId(id);
    try {
      await verifyProvider(id, "REJECTED", note || undefined);
      o.applyStatusUpdate(id, verificationPatchFor("REJECTED"));
      notify(`Rejected "${name}"'s verification.`);
    } catch (err) {
      notify(err instanceof Error ? err.message : "Could not reject this provider.");
    } finally {
      setBusyId(null);
    }
  }

  /* Oldest first — the whole point of this page is who has waited longest. */
  const waiting = useMemo(() => {
    const rows = o.oldestFirst.filter((i) => i.kind === "verification");
    return onlyStale ? rows.filter((i) => i.ageDays !== null && i.ageDays > 7) : rows;
  }, [o.oldestFirst, onlyStale]);

  const statusSlices = useMemo(() => {
    const map = new Map<string, number>();
    for (const i of o.verifications) map.set(i.statusLabel, (map.get(i.statusLabel) ?? 0) + 1);
    return [...map.entries()]
      .map(([lbl, value], idx) => ({ label: lbl, value, color: SERIES[idx] }))
      .sort((a, b) => b.value - a.value);
  }, [o.verifications]);

  const ageSlices = o.verificationAgeRows.map((r, i) => ({ ...r, color: SERIES[i] }));
  const contextDist = o.distributions.find((d) => (platform === "ghrfix" ? d.key === "providerMix" : d.key === "verificationDecisions"));
  const cityOrService = o.rankings.find((r) => r.key === "verificationServices" || r.key === "verificationCities");

  const stale = o.verifications.filter((i) => i.ageDays !== null && i.ageDays > 7).length;
  const oldest = o.oldestFirst.find((i) => i.kind === "verification" && i.ageDays !== null);
  const freshShare = o.verifications.length > 0 ? Math.round(((o.verifications.length - stale) / o.verifications.length) * 100) : null;

  return (
    <SpecialShell
      platform={platform}
      agentLabel="Ops Agent"
      tagline="Operations workspace"
      basePath="/ops-agent-special"
      nav={NAV}
      headerIcon="check"
      assistantBlurb="I can tell you who has been waiting longest for a verification decision and why."
      title="Verifications"
      subtitle={o.verificationsNote}
      actions={
        <Pill tone={o.error ? "red" : o.loading ? "amber" : "green"}>
          <Icon name={o.error ? "alert" : o.loading ? "clock" : "check"} size={12} />
          {o.error ? "Pipeline unreachable" : o.loading ? "Loading pipeline" : `${o.verifications.length.toLocaleString()} waiting`}
        </Pill>
      }
    >
      <style>{VER_CSS}</style>

      {o.error && <ErrorNote error={o.error} platform={platform} />}

      <Card title="Where this pipeline comes from">
        <p className="cs-ops-lead">{o.verificationsNote}</p>
      </Card>

      <div className="cs-stats">
        <StatCard
          label="Awaiting a decision"
          value={o.loading || o.error ? "—" : o.verifications.length.toLocaleString()}
          sub={o.error ? "Could not be read this session" : "Rows the backend returned"}
          tone="amber"
          icon="clock"
        />
        <StatCard
          label="Waiting over a week"
          value={o.loading || o.error ? "—" : stale.toLocaleString()}
          sub={o.error ? "Unknown — pipeline unreachable" : "Computed from real submission timestamps"}
          tone="red"
          icon="alert"
        />
        <StatCard
          label="Longest wait"
          value={o.loading || o.error ? "—" : oldest && oldest.ageDays !== null ? `${oldest.ageDays}d` : "Not recorded"}
          sub={o.error ? "Unknown — pipeline unreachable" : oldest ? oldest.title : "No timestamped row returned"}
          tone="purple"
          icon="calendar"
        />
        {o.metrics
          .filter((m) => ["verified", "pending", "approved30d", "pendingVerifications"].includes(m.key))
          .slice(0, 3)
          .map((m) => (
            <StatCard
              key={m.key}
              label={m.label}
              value={o.loading || o.error ? "—" : m.display}
              sub={o.error ? "Could not be read this session" : m.value === null ? `${label} does not report this` : m.note}
              tone={m.tone}
              icon={m.icon}
            />
          ))}
      </div>

      <div className="cs-row-3">
        <Card title="Pipeline by status" action={<span className="cs-ops-src">{o.verifications.length.toLocaleString()} in pipeline</span>}>
          {o.loading ? (
            <Empty>Loading…</Empty>
          ) : o.error ? (
            <Empty>The pipeline is unreachable, so its status mix cannot be assessed.</Empty>
          ) : statusSlices.length === 0 ? (
            <Empty>{label} answered and returned nobody awaiting verification right now.</Empty>
          ) : (
            <div className="cs-donut-row">
              <Donut data={statusSlices} center={o.verifications.length.toLocaleString()} centerLabel="waiting" />
              <Legend data={statusSlices} />
            </div>
          )}
        </Card>

        <Card title={contextDist ? contextDist.title : "Platform context"} action={<span className="cs-ops-src">{contextDist ? `${contextDist.total.toLocaleString()} ${contextDist.unit}` : ""}</span>}>
          {o.loading ? (
            <Empty>Loading…</Empty>
          ) : o.error ? (
            <Empty>Unavailable — the backend could not be reached.</Empty>
          ) : !contextDist || contextDist.rows.length === 0 ? (
            <Empty>{contextDist ? contextDist.note : `${label} returned no wider verification context.`}</Empty>
          ) : (
            <>
              <div className="cs-donut-row">
                <Donut
                  data={contextDist.rows.map((r, i) => ({ ...r, color: SERIES[i] }))}
                  center={contextDist.total.toLocaleString()}
                  centerLabel={contextDist.unit}
                />
                <Legend data={contextDist.rows.map((r, i) => ({ ...r, color: SERIES[i] }))} />
              </div>
              <p className="cs-ops-note">{contextDist.note}</p>
            </>
          )}
        </Card>

        <Card title="Share waiting under a week">
          <div className="cs-ops-ring">
            <ScoreRing
              value={o.loading || o.error || freshShare === null ? 0 : freshShare}
              max={100}
              label={freshShare === null ? "No data" : "%"}
              color={freshShare === null ? "#94a3b8" : freshShare >= 80 ? "#4ade80" : freshShare >= 50 ? "#fbbf24" : "#e04452"}
            />
            <p>
              {o.error
                ? `Cannot be computed — the ${label} verification pipeline failed to load.`
                : o.loading
                  ? "Loading…"
                  : freshShare === null
                    ? `${label} answered with nobody in the pipeline, so there is no wait share to compute.`
                    : `${o.verifications.length - stale} of ${o.verifications.length} waiting members have been in the queue a week or less.`}
            </p>
          </div>
        </Card>
      </div>

      <div className="cs-row-half">
        <Card title="Age buckets for the verification pipeline">
          {o.loading ? (
            <Empty>Loading…</Empty>
          ) : o.error ? (
            <Empty>Age buckets cannot be computed while the pipeline is unreachable.</Empty>
          ) : ageSlices.length === 0 ? (
            <Empty>No waiting row carries a usable submission timestamp.</Empty>
          ) : (
            <>
              <BarRows rows={ageSlices} colored />
              <Legend data={ageSlices} showPct={false} />
              <p className="cs-ops-note">Each bucket counts real rows by how long they have been waiting for a decision.</p>
            </>
          )}
        </Card>

        <Card title={cityOrService ? cityOrService.title : "Pipeline breakdown"}>
          {o.loading ? (
            <Empty>Loading…</Empty>
          ) : o.error ? (
            <Empty>Nothing can be ranked — the pipeline did not load.</Empty>
          ) : !cityOrService || cityOrService.rows.length === 0 ? (
            <Empty>{`${label} returned no rows to rank here.`}</Empty>
          ) : (
            <>
              <BarRows rows={cityOrService.rows.map((r, i) => ({ ...r, color: SERIES[i] }))} colored />
              <Legend data={cityOrService.rows.map((r, i) => ({ ...r, color: SERIES[i] }))} showPct={false} />
              <p className="cs-ops-note">{cityOrService.note}</p>
            </>
          )}
        </Card>
      </div>

      <Card pad={false}>
        <div className="cs-ops-toolbar">
          <h3 className="cs-ops-tabletitle">Oldest waiting first</h3>
          <button
            type="button"
            className={onlyStale ? "cs-btn cs-btn-primary" : "cs-btn"}
            onClick={() => setOnlyStale((v) => !v)}
            aria-pressed={onlyStale}
          >
            <Icon name="clock" size={13} />
            {onlyStale ? "Showing over a week only" : "Only show over a week"}
          </button>
        </div>

        <div className="cs-table-wrap" style={{ marginTop: 12 }}>
          <table className="cs-table">
            <thead>
              <tr>
                <th style={{ paddingLeft: 19 }}>Waiting on</th>
                <th>Detail</th>
                <th>Status</th>
                <th className="cs-num">Age</th>
                <th className="cs-num">Submitted</th>
                <th style={{ paddingRight: 19 }}>Decision</th>
              </tr>
            </thead>
            <tbody>
              {o.loading && <tr><td colSpan={6} style={{ padding: 19 }}><Empty>Loading the live pipeline…</Empty></td></tr>}
              {!o.loading && o.error && (
                <tr>
                  <td colSpan={6} style={{ padding: 19 }}>
                    <Empty>
                      The {label} verification pipeline could not be reached, so who is waiting is unknown. Nothing here
                      should be read as “nobody is waiting”.
                    </Empty>
                  </td>
                </tr>
              )}
              {!o.loading && !o.error && o.verifications.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: 19 }}>
                    <Empty>{label} answered and returned an empty verification pipeline — genuinely nobody waiting.</Empty>
                  </td>
                </tr>
              )}
              {!o.loading && !o.error && o.verifications.length > 0 && waiting.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 19 }}><Empty>Nobody has been waiting more than a week.</Empty></td></tr>
              )}
              {waiting.slice(0, SHOW).map((i) => (
                <tr key={i.id}>
                  <td style={{ paddingLeft: 19, maxWidth: 300 }}>
                    <div className="title">{i.title}</div>
                    <div className="sub">{i.sub}</div>
                  </td>
                  <td style={{ color: "#cbd5e1" }}>{i.category}</td>
                  <td>
                    <Pill tone={i.tone}>
                      <Icon name={i.glyph} size={12} />
                      {i.statusLabel}
                    </Pill>
                  </td>
                  <td className="cs-num">{ageLabel(i)}</td>
                  <td className="cs-num" style={{ color: "#94a3b8" }}>
                    {i.timestamp ? new Date(i.timestamp).toLocaleDateString() : "Not recorded"}
                  </td>
                  <td style={{ paddingRight: 19 }}>
                    {platform !== "ghrfix" ? (
                      <button type="button" className="cs-btn cs-ops-inert" disabled title="ShadiLife has no approve/reject endpoint on any AI agent — that decision is made through the plain admin moderation queue.">
                        <Icon name="eye" size={13} />
                        No agent endpoint
                      </button>
                    ) : i.status !== "PENDING" ? (
                      <Pill tone={i.tone}><Icon name={i.glyph} size={12} />Decided</Pill>
                    ) : (
                      <div className="cs-ops-actions">
                        <button type="button" className="cs-btn" disabled={busyId === i.id} onClick={() => approveProvider(i.id, i.title)}>
                          <Icon name="check" size={13} />
                          {busyId === i.id ? "Working…" : "Approve"}
                        </button>
                        <button type="button" className="cs-btn" disabled={busyId === i.id} onClick={() => rejectProvider(i.id, i.title)}>
                          <Icon name="alert" size={13} />
                          Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="cs-ops-readonly">
          Showing the {Math.min(SHOW, waiting.length)} longest-waiting of {waiting.length.toLocaleString()} matching rows.
          {platform === "ghrfix"
            ? " Approve and Reject call GhrFix's real POST /ai-agents/ops/providers/:id/verify — every decision is audited."
            : " ShadiLife has no approve/reject endpoint on any AI agent, so decisions stay disabled here — see the callout above."}
        </p>
      </Card>

      {toast && <div className="cs-ops-toast" role="status">{toast}</div>}
    </SpecialShell>
  );
}

/* Page-local styles only, all `cs-ops-*` prefixed. */
const VER_CSS = `
.cs-ops-note{margin:12px 0 0;font-size:10.5px;line-height:17px;color:#94a3b8}
.cs-ops-src{font-size:11px;color:#94a3b8}
.cs-ops-lead{margin:0;font-size:12px;line-height:20px;color:#cbd5e1}
.cs-ops-ring{display:flex;flex-direction:column;align-items:center;gap:12px}
.cs-ops-ring p{margin:0;font-size:11.5px;line-height:19px;color:#cbd5e1;text-align:center}
.cs-ops-toolbar{display:flex;align-items:center;gap:12px;padding:16px 19px 0;flex-wrap:wrap;justify-content:space-between}
.cs-ops-tabletitle{margin:0;font-size:13px;font-weight:750;letter-spacing:-.2px}
.cs-ops-readonly{margin:0;padding:12px 19px 16px;font-size:10.5px;line-height:17px;color:#94a3b8;border-top:1px solid rgba(255,255,255,.07)}
.cs-ops-actions{display:flex;gap:6px;flex-wrap:wrap}
.cs-ops-inert{opacity:.55;cursor:not-allowed;white-space:nowrap}
.cs-ops-toast{position:fixed;right:22px;bottom:22px;max-width:360px;background:#11162f;color:#fff;border-radius:10px;padding:12px 16px;font-size:12.5px;line-height:18px;box-shadow:0 14px 32px rgba(20,20,45,.28);z-index:50}
`;
