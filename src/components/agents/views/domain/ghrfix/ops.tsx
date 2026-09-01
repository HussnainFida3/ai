"use client";

/**
 * GhrFix — Ops Agent — Queue (5th tab).
 *
 * The full, filterable, paginated version of the two queues the Dashboard
 * only teases: pending provider verifications and open emergencies. Backed
 * by the same `/queue` endpoint the Dashboard calls, now accepting real
 * query params (providerStatus/search/providerPage, emergencyStatus/
 * emergencyPage, pageSize) — see ops-agent/router.ts. Verify/Reject and the
 * emergency status advance are the exact same audited writes as before.
 */

import { useState } from "react";
import { AgentHeading } from "@/components/agents/AgentShell";
import { Avatar, InsightsPanel, Svg } from "@/components/agents/rich";
import { Icons } from "@/components/agents/icons";
import { ApiError } from "@/lib/api";
import type { AgentViewProps } from "../../registry";
import { Empty, ErrorNote, Panel, Pill, TableWrap, timeAgo, useLoad } from "../../ghrfix/_kit-core";

type ProviderStatus = "PENDING" | "VERIFIED" | "REJECTED" | "SUSPENDED";
type EmergencyStatus = "OPEN" | "ASSIGNED" | "RESOLVED" | "CANCELLED";

interface PendingProvider {
  id: string;
  verificationStatus: ProviderStatus;
  rating: number;
  isAvailable: boolean;
  createdAt: string;
  user: { id: string; name: string | null; phone: string | null; email: string | null };
  services: Array<{ category: { name: string } }>;
}

interface EmergencyItem {
  id: string;
  category: string;
  description: string | null;
  status: EmergencyStatus;
  createdAt: string;
  resolvedAt: string | null;
  user: { id: string; name: string | null; phone: string | null };
  assignedProvider: { id: string; user: { name: string | null; phone: string | null } } | null;
}

interface Queue {
  pendingProviders: PendingProvider[];
  pendingProvidersTotal: number;
  pendingProvidersPage: number;
  pendingProvidersTotalPages: number;
  openEmergencies: EmergencyItem[];
  openEmergenciesTotal: number;
  openEmergenciesPage: number;
  openEmergenciesTotalPages: number;
}

const EMERGENCY_TONE: Record<EmergencyStatus, "green" | "amber" | "red" | "mute"> = {
  OPEN: "red",
  ASSIGNED: "amber",
  RESOLVED: "green",
  CANCELLED: "mute",
};

const NEXT_STATUS: Record<EmergencyStatus, EmergencyStatus | null> = {
  OPEN: "ASSIGNED",
  ASSIGNED: "RESOLVED",
  RESOLVED: null,
  CANCELLED: null,
};

function Pager({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "flex-end", padding: "10px 20px" }}>
      <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        ← Prev
      </button>
      <span style={{ fontSize: 11, color: "var(--ag-ink-faint)" }}>Page {page} of {totalPages}</span>
      <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        Next →
      </button>
    </div>
  );
}

export default function GhrfixOpsQueueView({ platform, agent, api }: AgentViewProps) {
  const [providerStatus, setProviderStatus] = useState<ProviderStatus>("PENDING");
  const [search, setSearch] = useState("");
  const [providerPage, setProviderPage] = useState(1);
  const [emergencyStatus, setEmergencyStatus] = useState<EmergencyStatus>("OPEN");
  const [emergencyPage, setEmergencyPage] = useState(1);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useLoad(async () => {
    const { data } = await api.get<Queue>("/queue", {
      providerStatus,
      search: search.trim() || undefined,
      providerPage,
      emergencyStatus,
      emergencyPage,
      pageSize: 10,
    });
    return data;
  }, [platform.key, agent.key, providerStatus, search, providerPage, emergencyStatus, emergencyPage]);

  const q = load.data ?? null;

  async function verify(id: string, status: "VERIFIED" | "REJECTED") {
    setBusyId(id);
    setMsg(null);
    setErr(null);
    try {
      await api.post(`/providers/${id}/verify`, { status });
      setMsg(`Provider ${status === "VERIFIED" ? "verified" : "rejected"} and notified.`);
      load.reload();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Could not update that provider.");
    } finally {
      setBusyId(null);
    }
  }

  async function advanceEmergency(id: string, status: EmergencyStatus) {
    setBusyId(id);
    setMsg(null);
    setErr(null);
    try {
      await api.post(`/emergencies/${id}/status`, { status });
      setMsg(`Emergency marked ${status.toLowerCase()}.`);
      load.reload();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Could not update that emergency.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <AgentHeading
        platform={platform}
        agent={agent}
        blurb="Every pending provider and every emergency, filterable by real status and paginated — not just the first page. Verify, reject and status changes are real, audited writes."
        actions={
          <button type="button" className="ag-btn ag-btn-ghost" onClick={load.reload} disabled={load.loading}>
            <Svg path={Icons.refresh} size={15} /> {load.loading ? "Refreshing…" : "Refresh"}
          </button>
        }
      />

      {load.error && <ErrorNote error={load.error} hint={`The Queue reads ${platform.apiBase}${agent.base}/queue. Connect ${platform.label} first if this persists.`} />}

      {(msg || err) && (
        <div style={{ margin: "0 0 14px" }}>
          <p style={{ margin: 0, fontSize: 11.5, fontWeight: 650, color: err ? "var(--ag-red)" : "var(--ag-green)" }}>{err ?? msg}</p>
        </div>
      )}

      <div className="ag-split">
        <div className="ag-stack">
          <Panel
            title="Provider verifications"
            sub={q ? `${q.pendingProvidersTotal} matching this filter` : "Filter by status, search by name/phone/email/CNIC"}
            noBody
            actions={
              <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span className="ag-field" style={{ margin: 0 }}>
                  <Svg path={Icons.filter} size={13} />
                </span>
                <select
                  value={providerStatus}
                  onChange={(e) => { setProviderStatus(e.target.value as ProviderStatus); setProviderPage(1); }}
                  style={{ fontSize: 11.5, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--ag-border)", background: "var(--ag-panel)", color: "var(--ag-ink)" }}
                >
                  <option value="PENDING">Pending</option>
                  <option value="VERIFIED">Verified</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
                <input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setProviderPage(1); }}
                  placeholder="Search name, phone, email, CNIC…"
                  style={{ fontSize: 11.5, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--ag-border)", background: "var(--ag-panel)", color: "var(--ag-ink)", minWidth: 180 }}
                />
              </span>
            }
          >
            <TableWrap>
              <table className="ag-table">
                <thead>
                  <tr>
                    <th>Provider</th>
                    <th>Category</th>
                    <th>Rating</th>
                    <th>Applied</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(q?.pendingProviders ?? []).map((p) => (
                    <tr key={p.id}>
                      <td>
                        <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
                          <Avatar name={p.user.name} size={26} />
                          <span style={{ minWidth: 0 }}>
                            <b style={{ display: "block", fontWeight: 650 }}>{p.user.name ?? "Unknown"}</b>
                            <span style={{ fontSize: 10.5, color: "var(--ag-ink-faint)" }}>{p.user.phone ?? p.user.email ?? "—"}</span>
                          </span>
                        </span>
                      </td>
                      <td>{p.services[0]?.category.name ?? "—"}</td>
                      <td>{p.rating > 0 ? `${p.rating} / 5` : "—"}</td>
                      <td style={{ whiteSpace: "nowrap", color: "var(--ag-ink-faint)" }}>{timeAgo(p.createdAt)}</td>
                      <td>
                        {p.verificationStatus === "PENDING" ? (
                          <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            <button type="button" className="ag-btn ag-btn-accent ag-btn-sm" disabled={busyId === p.id} onClick={() => verify(p.id, "VERIFIED")}>
                              {busyId === p.id ? "Working…" : "Verify"}
                            </button>
                            <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" disabled={busyId === p.id} onClick={() => verify(p.id, "REJECTED")}>
                              Reject
                            </button>
                          </span>
                        ) : (
                          <Pill text={p.verificationStatus} tone={p.verificationStatus === "VERIFIED" ? "green" : p.verificationStatus === "REJECTED" ? "red" : "mute"} />
                        )}
                      </td>
                    </tr>
                  ))}
                  {(q?.pendingProviders ?? []).length === 0 && (
                    <tr>
                      <td colSpan={5}><Empty>{load.loading ? "Loading queue…" : "Nothing matches this filter."}</Empty></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </TableWrap>
            <Pager page={q?.pendingProvidersPage ?? 1} totalPages={q?.pendingProvidersTotalPages ?? 1} onChange={setProviderPage} />
          </Panel>

          <Panel
            title="Emergencies"
            sub={q ? `${q.openEmergenciesTotal} matching this filter` : "Filter by status"}
            noBody
            actions={
              <select
                value={emergencyStatus}
                onChange={(e) => { setEmergencyStatus(e.target.value as EmergencyStatus); setEmergencyPage(1); }}
                style={{ fontSize: 11.5, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--ag-border)", background: "var(--ag-panel)", color: "var(--ag-ink)" }}
              >
                <option value="OPEN">Open</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            }
          >
            <TableWrap>
              <table className="ag-table">
                <thead>
                  <tr>
                    <th>Requested by</th>
                    <th>Category</th>
                    <th>Assigned to</th>
                    <th>Status</th>
                    <th>Opened</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(q?.openEmergencies ?? []).map((e) => {
                    const next = NEXT_STATUS[e.status];
                    return (
                      <tr key={e.id}>
                        <td>
                          <b style={{ fontWeight: 650 }}>{e.user.name ?? "Unknown"}</b>
                          <div style={{ fontSize: 10.5, color: "var(--ag-ink-faint)" }}>{e.user.phone ?? "—"}</div>
                        </td>
                        <td>{e.category}</td>
                        <td>{e.assignedProvider?.user.name ?? "Unassigned"}</td>
                        <td><Pill text={e.status} tone={EMERGENCY_TONE[e.status]} /></td>
                        <td style={{ whiteSpace: "nowrap", color: "var(--ag-ink-faint)" }}>{timeAgo(e.createdAt)}</td>
                        <td>
                          {next ? (
                            <button type="button" className="ag-btn ag-btn-accent ag-btn-sm" disabled={busyId === e.id} onClick={() => advanceEmergency(e.id, next)}>
                              {busyId === e.id ? "Working…" : `Mark ${next.toLowerCase()}`}
                            </button>
                          ) : (
                            <span style={{ fontSize: 11, color: "var(--ag-ink-faint)" }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {(q?.openEmergencies ?? []).length === 0 && (
                    <tr>
                      <td colSpan={6}><Empty>{load.loading ? "Loading emergencies…" : "Nothing matches this filter."}</Empty></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </TableWrap>
            <Pager page={q?.openEmergenciesPage ?? 1} totalPages={q?.openEmergenciesTotalPages ?? 1} onChange={setEmergencyPage} />
          </Panel>
        </div>

        <div className="ag-stack">
          <InsightsPanel
            title="Queue at a glance"
            rows={[
              {
                icon: <Svg path={Icons.fingerprint} size={15} />,
                label: "Providers matching filter",
                value: q ? `${q.pendingProvidersTotal} provider${q.pendingProvidersTotal === 1 ? "" : "s"} with status ${providerStatus.toLowerCase()}${search.trim() ? ` matching "${search.trim()}"` : ""}.` : "—",
              },
              {
                icon: <Svg path={Icons.alert} size={15} />,
                label: "Emergencies matching filter",
                value: q ? `${q.openEmergenciesTotal} emergenc${q.openEmergenciesTotal === 1 ? "y" : "ies"} with status ${emergencyStatus.toLowerCase()}.` : "—",
              },
              {
                icon: <Svg path={Icons.stack} size={15} />,
                label: "Why a queue, not a list",
                value: "Every write here — Verify, Reject, or advancing an emergency's status — goes through the same audited endpoint the Ops Agent itself calls, so the audit trail never diverges from what actually happened.",
              },
            ]}
          />
        </div>
      </div>
    </>
  );
}
