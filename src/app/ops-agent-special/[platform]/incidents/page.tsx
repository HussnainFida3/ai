"use client";

/**
 * Ops Agent — Incidents.
 *
 *  GhrFix   — emergencies are a real first-class concept: /ai-agents/ops/queue
 *             returns each one with a real status, category and createdAt, and
 *             /ai-agents/ops/summary reports the open count.
 *  ShadiLife — has NO incident or emergency concept at all. The page says so
 *             prominently and shows the real operational backlog it DOES have
 *             instead: scheduled jobs that are failing or paused
 *             (/ai-agents/ops/schedule-health), plus the optional security
 *             snapshot from /ai-agents/ops/health-summary. No incident count
 *             is fabricated, and no zero is shown in place of one.
 *
 * The severity tiers below are derived on this page from real status and real
 * age; that derivation is stated wherever it is charted.
 *
 * Resolve/Cancel are wired to the real, audited GhrFix write
 * (POST /ai-agents/ops/emergencies/:id/status). Re-assigning a provider
 * (the agent's other real write, .../emergencies/:id/assign) is deliberately
 * out of scope for this page. ShadiLife has no incident/emergency concept at
 * all, so its rows (failing/paused scheduled jobs) stay disabled here with an
 * honest note.
 */

import { useMemo, useState } from "react";
import { useOpsSnapshot, ageLabel, updateEmergencyStatus, emergencyPatchFor, type OpsItem } from "@/lib/ops-data";
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
  { label: "Operational Queue", icon: "posts", slug: "queue" },
  { label: "Verifications", icon: "check", slug: "verifications" },
  { label: "Incidents", icon: "alert", slug: "incidents" },
  { label: "Chat with AI Agent", icon: "chat", slug: "chat" },
];

/** Fixed tier order, so a tier keeps its colour when the set is filtered. */
const TIERS = ["Critical", "Elevated", "Routine"] as const;

function tierOf(i: OpsItem): (typeof TIERS)[number] {
  return i.urgency >= 3 ? "Critical" : i.urgency === 2 ? "Elevated" : "Routine";
}

export default function OpsIncidentsPage({ params }: { params: Promise<{ platform: string }> }) {
  const platform = usePlatformParam(params);
  const o = useOpsSnapshot(platform);
  const label = platformLabel(platform);

  /* On GhrFix these are real emergencies. On ShadiLife they are the real
     urgent operational backlog — failing and paused scheduled jobs — shown
     in place of an incident concept the platform does not have. */
  const rows = useMemo(
    () => (platform === "ghrfix" ? o.incidents : o.jobs.filter((j) => j.urgency > 0)),
    [platform, o.incidents, o.jobs],
  );

  const sorted = useMemo(
    () => [...rows].sort((a, b) => b.urgency - a.urgency || (b.ageDays ?? -1) - (a.ageDays ?? -1)),
    [rows],
  );

  const tierSlices = TIERS.map((t, i) => ({ label: t, value: rows.filter((r) => tierOf(r) === t).length, color: SERIES[i] })).filter((s) => s.value > 0);

  const statusSlices = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) map.set(r.statusLabel, (map.get(r.statusLabel) ?? 0) + 1);
    return [...map.entries()].map(([lbl, value], i) => ({ label: lbl, value, color: SERIES[i] })).sort((a, b) => b.value - a.value);
  }, [rows]);

  const ageSlices = o.incidentAgeRows.map((r, i) => ({ ...r, color: SERIES[i] }));

  const categoryRows = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) map.set(r.category, (map.get(r.category) ?? 0) + 1);
    return [...map.entries()]
      .map(([lbl, value], i) => ({ label: lbl, value, color: SERIES[i % SERIES.length] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7);
  }, [rows]);

  const critical = rows.filter((r) => r.urgency >= 3).length;
  const oldest = sorted.find((r) => r.ageDays !== null);
  const security = o.health.security;

  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const notify = (text: string) => {
    setToast(text);
    window.setTimeout(() => setToast(""), 3200);
  };

  async function changeStatus(id: string, title: string, status: "RESOLVED" | "CANCELLED") {
    const verb = status === "RESOLVED" ? "Resolve" : "Cancel";
    if (!window.confirm(`${verb} the "${title}" emergency on GhrFix? This is a real, audited status change.`)) return;
    setBusyId(id);
    try {
      await updateEmergencyStatus(id, status);
      o.applyStatusUpdate(id, emergencyPatchFor(status));
      notify(`${verb === "Resolve" ? "Resolved" : "Cancelled"} "${title}".`);
    } catch (err) {
      notify(err instanceof Error ? err.message : `Could not ${verb.toLowerCase()} this emergency.`);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <SpecialShell
      platform={platform}
      agentLabel="Ops Agent"
      tagline="Operations workspace"
      basePath="/ops-agent-special"
      nav={NAV}
      headerIcon="alert"
      assistantBlurb="I can walk you through the most urgent operational work this platform is actually carrying."
      title={o.incidentsSupported ? "Incidents" : "Urgent Operational Work"}
      subtitle={o.incidentsSupported ? "Open emergencies by severity, category and age" : `${label} has no incident concept — its real urgent backlog is shown instead`}
      actions={
        <Pill tone={o.error ? "red" : o.loading ? "amber" : o.incidentsSupported ? "green" : "cyan"}>
          <Icon name={o.error ? "alert" : o.loading ? "clock" : o.incidentsSupported ? "check" : "eye"} size={12} />
          {o.error
            ? "Backend unreachable"
            : o.loading
              ? "Loading"
              : o.incidentsSupported
                ? `${rows.length.toLocaleString()} open`
                : "No incident concept"}
        </Pill>
      }
    >
      <style>{INC_CSS}</style>

      {o.error && <ErrorNote error={o.error} platform={platform} />}

      {!o.incidentsSupported && (
        <Card title={`${label} does not track incidents`}>
          <p className="cs-ops-callout">{o.incidentsNote}</p>
        </Card>
      )}

      <div className="cs-stats">
        <StatCard
          label={o.incidentsSupported ? "Open emergencies" : "Urgent operational items"}
          value={o.loading || o.error ? "—" : rows.length.toLocaleString()}
          sub={o.error ? "Could not be read this session" : o.incidentsSupported ? "Returned by the ops queue" : "Failing or paused scheduled jobs"}
          tone="red"
          icon="alert"
        />
        <StatCard
          label="Critical tier"
          value={o.loading || o.error ? "—" : critical.toLocaleString()}
          sub={o.error ? "Unknown — backend unreachable" : o.incidentsSupported ? "Status OPEN, nobody assigned yet" : "Recorded an error on their last run"}
          tone="amber"
          icon="clock"
        />
        <StatCard
          label="Longest outstanding"
          value={o.loading || o.error ? "—" : oldest && oldest.ageDays !== null ? `${oldest.ageDays}d` : "Not recorded"}
          sub={o.error ? "Unknown — backend unreachable" : oldest ? oldest.title : "No timestamped row returned"}
          tone="purple"
          icon="calendar"
        />
        <StatCard
          label="Distinct categories"
          value={o.loading || o.error ? "—" : categoryRows.length.toLocaleString()}
          sub={o.error ? "Unknown — backend unreachable" : o.incidentsSupported ? "Emergency categories in the queue" : "Owning agents with urgent jobs"}
          tone="blue"
          icon="tag"
        />
        <StatCard
          label="Security events (30 days)"
          value={
            !o.healthAvailable
              ? "Not tracked"
              : o.health.ran && security
                ? (security.eventCountLast30d ?? 0).toLocaleString()
                : "—"
          }
          sub={
            !o.healthAvailable
              ? `${label} exposes no security endpoint`
              : o.health.ran
                ? "From the security snapshot below"
                : "Run the security snapshot to read this"
          }
          tone="cyan"
          icon="eye"
        />
      </div>

      <div className="cs-row-3">
        <Card title="Severity tiers" action={<span className="cs-ops-src">Derived on this page</span>}>
          {o.loading ? (
            <Empty>Loading…</Empty>
          ) : o.error ? (
            <Empty>Severity cannot be assessed while the backend is unreachable.</Empty>
          ) : tierSlices.length === 0 ? (
            <Empty>
              {label} answered and returned no urgent work — this is a loaded, genuinely empty list, not a failed read.
            </Empty>
          ) : (
            <>
              <div className="cs-donut-row">
                <Donut data={tierSlices} center={rows.length.toLocaleString()} centerLabel="items" />
                <Legend data={tierSlices} />
              </div>
              <p className="cs-ops-note">
                Tiers are computed here from each row&apos;s real status and real age — the backend returns no severity
                field of its own.
              </p>
            </>
          )}
        </Card>

        <Card title="By backend status" action={<span className="cs-ops-src">Real status values</span>}>
          {o.loading ? (
            <Empty>Loading…</Empty>
          ) : o.error ? (
            <Empty>No status mix can be shown while the backend is unreachable.</Empty>
          ) : statusSlices.length === 0 ? (
            <Empty>Nothing urgent was returned, so there are no statuses to break down.</Empty>
          ) : (
            <div className="cs-donut-row">
              <Donut data={statusSlices} center={rows.length.toLocaleString()} centerLabel="items" />
              <Legend data={statusSlices} />
            </div>
          )}
        </Card>

        <Card title="How long they have been outstanding">
          {o.loading ? (
            <Empty>Loading…</Empty>
          ) : o.error ? (
            <Empty>Age cannot be computed while the backend is unreachable.</Empty>
          ) : ageSlices.length === 0 ? (
            <Empty>No urgent row carries a usable timestamp.</Empty>
          ) : (
            <>
              <BarRows rows={ageSlices} colored />
              <Legend data={ageSlices} showPct={false} />
            </>
          )}
        </Card>
      </div>

      <div className="cs-row-2">
        <Card title={o.incidentsSupported ? "Emergency categories" : "Urgent jobs by owning agent"}>
          {o.loading ? (
            <Empty>Loading…</Empty>
          ) : o.error ? (
            <Empty>Nothing can be ranked — the backend did not load.</Empty>
          ) : categoryRows.length === 0 ? (
            <Empty>No urgent rows were returned, so there is nothing to rank.</Empty>
          ) : (
            <>
              <BarRows rows={categoryRows} colored />
              <Legend data={categoryRows} showPct={false} />
            </>
          )}
        </Card>

        <Card
          title="Security snapshot"
          action={
            o.healthAvailable ? (
              <button type="button" className="cs-btn" onClick={o.runHealthCheck} disabled={o.health.loading}>
                <Icon name="pulse" size={13} />
                {o.health.loading ? "Reading…" : o.health.ran ? "Re-run snapshot" : "Run snapshot"}
              </button>
            ) : undefined
          }
        >
          {!o.healthAvailable ? (
            <Empty>{o.healthNote}</Empty>
          ) : o.health.error ? (
            <Empty>The security snapshot failed: {o.health.error}. Nothing about {label}&apos;s security posture can be assessed.</Empty>
          ) : !o.health.ran ? (
            <Empty>{o.healthNote}</Empty>
          ) : security ? (
            <div className="cs-ops-sec">
              {security.bySeverity.length > 0 ? (
                <>
                  <div className="cs-donut-row">
                    <Donut
                      data={security.bySeverity.map((r, i) => ({ ...r, color: SERIES[i] }))}
                      center={security.bySeverity.reduce((s, r) => s + r.value, 0).toLocaleString()}
                      centerLabel="events"
                    />
                    <Legend data={security.bySeverity.map((r, i) => ({ ...r, color: SERIES[i] }))} />
                  </div>
                  <p className="cs-ops-note">Real SecurityEvent rows from the last 30 days, by severity.</p>
                </>
              ) : (
                <Empty>The snapshot returned no severity breakdown.</Empty>
              )}

              <div className="cs-ops-facts">
                <Fact label="Events, last 24h" value={security.eventCountLast24h} />
                <Fact label="Events, last 7d" value={security.eventCountLast7d} />
                <Fact label="Failed logins, 30d" value={security.failedLoginCountLast30d} />
                <Fact label="Active IP blocks" value={security.activeIpBlocks} />
              </div>

              {security.suspiciousIps.length > 0 && (
                <BarRows
                  rows={security.suspiciousIps.slice(0, 5).map((ip, i) => ({ label: ip.ip, value: ip.failedLogins, color: SERIES[i] }))}
                  colored
                />
              )}
            </div>
          ) : (
            <Empty>The snapshot returned no security section.</Empty>
          )}
        </Card>
      </div>

      <Card pad={false}>
        <div className="cs-ops-toolbar">
          <h3 className="cs-ops-tabletitle">{o.incidentsSupported ? "Most urgent first" : "Urgent operational backlog, most urgent first"}</h3>
        </div>

        <div className="cs-table-wrap" style={{ marginTop: 12 }}>
          <table className="cs-table">
            <thead>
              <tr>
                <th style={{ paddingLeft: 19 }}>Item</th>
                <th>Category</th>
                <th>Tier</th>
                <th>Status</th>
                <th className="cs-num">Age</th>
                <th style={{ paddingRight: 19 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {o.loading && <tr><td colSpan={6} style={{ padding: 19 }}><Empty>Loading…</Empty></td></tr>}
              {!o.loading && o.error && (
                <tr>
                  <td colSpan={6} style={{ padding: 19 }}>
                    <Empty>
                      The {label} backend could not be reached, so whether anything urgent is outstanding is unknown.
                      This is not an all-clear.
                    </Empty>
                  </td>
                </tr>
              )}
              {!o.loading && !o.error && sorted.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: 19 }}>
                    <Empty>
                      {label} answered and returned nothing urgent{o.incidentsSupported ? " — no open emergencies right now." : " — no failing or paused scheduled jobs right now."}
                    </Empty>
                  </td>
                </tr>
              )}
              {sorted.map((r) => (
                <tr key={r.id}>
                  <td style={{ paddingLeft: 19, maxWidth: 320 }}>
                    <div className="title">{r.title}</div>
                    <div className="sub">{r.sub}</div>
                  </td>
                  <td style={{ color: "#4c5470" }}>{r.category}</td>
                  <td>
                    <Pill tone={r.urgency >= 3 ? "red" : r.urgency === 2 ? "amber" : "blue"}>
                      <Icon name={r.urgency >= 3 ? "alert" : r.urgency === 2 ? "clock" : "eye"} size={12} />
                      {tierOf(r)}
                    </Pill>
                  </td>
                  <td>
                    <Pill tone={r.tone}>
                      <Icon name={r.glyph} size={12} />
                      {r.statusLabel}
                    </Pill>
                  </td>
                  <td className="cs-num">{ageLabel(r)}</td>
                  <td style={{ paddingRight: 19 }}>
                    {!o.incidentsSupported ? (
                      <button type="button" className="cs-btn cs-ops-inert" disabled title="ShadiLife's Ops Agent has no incident or emergency-status endpoint.">
                        <Icon name="eye" size={13} />
                        No agent endpoint
                      </button>
                    ) : r.status === "RESOLVED" || r.status === "CANCELLED" ? (
                      <Pill tone={r.tone}><Icon name={r.glyph} size={12} />Closed</Pill>
                    ) : (
                      <div className="cs-ops-actions">
                        <button type="button" className="cs-btn" disabled={busyId === r.id} onClick={() => changeStatus(r.id, r.title, "RESOLVED")}>
                          <Icon name="check" size={13} />
                          {busyId === r.id ? "Working…" : "Resolve"}
                        </button>
                        <button type="button" className="cs-btn" disabled={busyId === r.id} onClick={() => changeStatus(r.id, r.title, "CANCELLED")}>
                          <Icon name="alert" size={13} />
                          Cancel
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
          {o.incidentsSupported
            ? "Resolve and Cancel call GhrFix's real POST /ai-agents/ops/emergencies/:id/status — every change is audited. Re-assigning a provider is a separate real endpoint, deliberately out of scope for this page."
            : "ShadiLife's Ops Agent has no incident or emergency-status endpoint, so nothing here can be actioned — see the callout above."}
        </p>
      </Card>

      {toast && <div className="cs-ops-toast" role="status">{toast}</div>}
    </SpecialShell>
  );
}

function Fact({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="cs-ops-fact">
      <span>{label}</span>
      <b className="cs-num">{value === null ? "Not reported" : value.toLocaleString()}</b>
    </div>
  );
}

/* Page-local styles only, all `cs-ops-*` prefixed. */
const INC_CSS = `
.cs-ops-note{margin:12px 0 0;font-size:10.5px;line-height:17px;color:#8891a8}
.cs-ops-src{font-size:11px;color:#69738c}
.cs-ops-callout{margin:0;font-size:12px;line-height:20px;color:#4c5470}
.cs-ops-sec{display:flex;flex-direction:column;gap:14px}
.cs-ops-facts{display:flex;flex-direction:column;gap:2px}
.cs-ops-fact{display:flex;justify-content:space-between;gap:12px;align-items:baseline;font-size:11.5px;padding:7px 0;border-bottom:1px solid #f4f5f9}
.cs-ops-fact span{color:#4c5470;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cs-ops-fact b{font-weight:730;white-space:nowrap}
.cs-ops-toolbar{display:flex;align-items:center;gap:12px;padding:16px 19px 0;flex-wrap:wrap;justify-content:space-between}
.cs-ops-tabletitle{margin:0;font-size:13px;font-weight:750;letter-spacing:-.2px}
.cs-ops-inert{opacity:.55;cursor:not-allowed;white-space:nowrap}
.cs-ops-actions{display:flex;gap:6px;flex-wrap:wrap}
.cs-ops-readonly{margin:0;padding:12px 19px 16px;font-size:10.5px;line-height:17px;color:#8891a8;border-top:1px solid #eef0f5}
.cs-ops-toast{position:fixed;right:22px;bottom:22px;max-width:360px;background:#11162f;color:#fff;border-radius:10px;padding:12px 16px;font-size:12.5px;line-height:18px;box-shadow:0 14px 32px rgba(20,20,45,.28);z-index:50}
`;
