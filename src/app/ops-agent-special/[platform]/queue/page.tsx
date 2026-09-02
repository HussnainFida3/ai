"use client";

/**
 * Ops Agent — Operational Queue.
 *
 * The full backlog the platform actually returned: GhrFix's pending provider
 * verifications and open emergencies (/ai-agents/ops/queue), or ShadiLife's
 * scheduled jobs (/ai-agents/ops/schedule-health) plus members awaiting a
 * verification decision (/ai-agents/verification/pending).
 *
 * Filterable by type and status, searchable, paginated 12 rows at a time,
 * with the real age of every row. The row action is wired to GhrFix's real
 * writes — verify/reject for a "Verification" row
 * (POST /ai-agents/ops/providers/:id/verify), resolve/cancel for an
 * "Emergency" row (POST /ai-agents/ops/emergencies/:id/status) — the same
 * two endpoints the dedicated Verifications and Incidents pages use.
 * ShadiLife rows (scheduled jobs, members under review) stay disabled: no AI
 * agent on ShadiLife exposes an equivalent write (verified by reading both
 * ops-agent/router.ts and verification-agent/router.ts).
 */

import { useMemo, useState } from "react";
import { useOpsSnapshot, ageLabel, verifyProvider, verificationPatchFor, updateEmergencyStatus, emergencyPatchFor } from "@/lib/ops-data";
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

const PAGE_SIZE = 12;
const ALL_STATUSES = "All statuses";

export default function OpsQueuePage({ params }: { params: Promise<{ platform: string }> }) {
  const platform = usePlatformParam(params);
  const o = useOpsSnapshot(platform);
  const label = platformLabel(platform);

  const [tab, setTab] = useState("All");
  const [status, setStatus] = useState(ALL_STATUSES);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  /* Tabs and the status filter are both built from the item types this
     platform genuinely returned — never a fixed list that could imply a
     category the backend does not have. */
  const tabs = useMemo(() => ["All", ...o.kindRows.map((k) => k.label)], [o.kindRows]);
  const statuses = useMemo(() => [ALL_STATUSES, ...o.statusRows.map((s) => s.label)], [o.statusRows]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return o.items.filter((i) => {
      if (tab !== "All" && i.kindLabel !== tab) return false;
      if (status !== ALL_STATUSES && i.statusLabel !== status) return false;
      if (q && !`${i.title} ${i.sub} ${i.category} ${i.statusLabel}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [o.items, tab, status, search]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const visible = rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  function reset<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setPage(1);
    };
  }

  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const notify = (text: string) => {
    setToast(text);
    window.setTimeout(() => setToast(""), 3200);
  };

  async function approveProvider(id: string, name: string) {
    if (!window.confirm(`Approve "${name}" as a verified GhrFix provider? This is a real, audited write.`)) return;
    setBusyId(id);
    try {
      await verifyProvider(id, "VERIFIED");
      o.applyStatusUpdate(id, verificationPatchFor("VERIFIED"));
      notify(`Approved "${name}".`);
    } catch (err) {
      notify(err instanceof Error ? err.message : "Could not approve this provider.");
    } finally {
      setBusyId(null);
    }
  }

  async function rejectProvider(id: string, name: string) {
    const note = window.prompt(`Reject "${name}"'s verification on GhrFix? Add an optional audit note (leave blank to skip), or press Cancel to abort.`, "");
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

  async function changeEmergencyStatus(id: string, title: string, status: "RESOLVED" | "CANCELLED") {
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

  const stale = o.items.filter((i) => i.ageDays !== null && i.ageDays > 7).length;
  const urgent = o.items.filter((i) => i.urgency >= 3).length;
  const kindSlices = o.kindRows.map((r, i) => ({ ...r, color: SERIES[i] }));
  const statusSlices = o.statusRows.map((r, i) => ({ ...r, color: SERIES[i] }));
  const ageSlices = o.ageRows.map((r, i) => ({ ...r, color: SERIES[i] }));

  return (
    <SpecialShell
      platform={platform}
      agentLabel="Ops Agent"
      tagline="Operations workspace"
      basePath="/ops-agent-special"
      nav={NAV}
      headerIcon="posts"
      assistantBlurb="I can explain any row in this queue — what it is waiting on and how long it has waited."
      title="Operational Queue"
      subtitle={o.queueNote}
      actions={
        <Pill tone={o.error ? "red" : o.loading ? "amber" : "green"}>
          <Icon name={o.error ? "alert" : o.loading ? "clock" : "check"} size={12} />
          {o.error ? "Queue unreachable" : o.loading ? "Loading queue" : `${o.items.length.toLocaleString()} rows loaded`}
        </Pill>
      }
    >
      <style>{QUEUE_CSS}</style>

      {o.error && <ErrorNote error={o.error} platform={platform} />}

      <div className="cs-stats">
        <StatCard
          label="Items in backlog"
          value={o.loading || o.error ? "—" : o.items.length.toLocaleString()}
          sub={o.error ? "Could not be read this session" : "Rows the backend returned"}
          tone="purple"
          icon="posts"
        />
        <StatCard
          label="Waiting over a week"
          value={o.loading || o.error ? "—" : stale.toLocaleString()}
          sub={o.error ? "Unknown — queue unreachable" : "Age computed from real timestamps"}
          tone="amber"
          icon="clock"
        />
        <StatCard
          label="Highest urgency"
          value={o.loading || o.error ? "—" : urgent.toLocaleString()}
          sub={o.error ? "Unknown — queue unreachable" : platform === "ghrfix" ? "Open emergencies and week-old verifications" : "Jobs failing their last run and week-old reviews"}
          tone="red"
          icon="alert"
        />
        <StatCard
          label="Matching filters"
          value={o.loading || o.error ? "—" : rows.length.toLocaleString()}
          sub={o.error ? "Nothing to filter" : `Showing ${visible.length} on this page`}
          tone="blue"
          icon="search"
        />
        <StatCard
          label="Distinct statuses"
          value={o.loading || o.error ? "—" : o.statusRows.length.toLocaleString()}
          sub={o.error ? "Unknown — queue unreachable" : "Real status values in the backlog"}
          tone="cyan"
          icon="tag"
        />
      </div>

      <div className="cs-row-3">
        <Card title="Backlog by item type" action={<span className="cs-ops-src">{o.items.length.toLocaleString()} items</span>}>
          {o.loading ? (
            <Empty>Loading…</Empty>
          ) : o.error ? (
            <Empty>The queue is unreachable, so its composition cannot be assessed.</Empty>
          ) : kindSlices.length === 0 ? (
            <Empty>{`${label} answered and returned no backlog items.`}</Empty>
          ) : (
            <div className="cs-donut-row">
              <Donut data={kindSlices} center={o.items.length.toLocaleString()} centerLabel="items" />
              <Legend data={kindSlices} />
            </div>
          )}
        </Card>

        <Card title="Backlog by status" action={<span className="cs-ops-src">Real backend values</span>}>
          {o.loading ? (
            <Empty>Loading…</Empty>
          ) : o.error ? (
            <Empty>The queue is unreachable, so no status mix can be shown.</Empty>
          ) : statusSlices.length === 0 ? (
            <Empty>{`${label} answered and returned no statuses to break down.`}</Empty>
          ) : (
            <div className="cs-donut-row">
              <Donut data={statusSlices} center={o.items.length.toLocaleString()} centerLabel="items" />
              <Legend data={statusSlices} />
            </div>
          )}
        </Card>

        <Card title="Age of waiting work">
          {o.loading ? (
            <Empty>Loading…</Empty>
          ) : o.error ? (
            <Empty>Age cannot be computed while the queue is unreachable.</Empty>
          ) : ageSlices.length === 0 ? (
            <Empty>No returned row carries a usable timestamp.</Empty>
          ) : (
            <>
              <BarRows rows={ageSlices} colored />
              <Legend data={ageSlices} showPct={false} />
            </>
          )}
        </Card>
      </div>

      <div className="cs-row-half">
        {o.rankings.map((r, idx) => (
          <Card key={r.key} title={r.title} action={<span className="cs-ops-src">Top {Math.min(7, r.rows.length)}</span>}>
            {o.loading ? (
              <Empty>Loading…</Empty>
            ) : o.error ? (
              <Empty>Nothing can be ranked — the queue did not load.</Empty>
            ) : r.rows.length === 0 ? (
              <Empty>{`${label} returned no rows to rank here.`}</Empty>
            ) : (
              <>
                <BarRows rows={r.rows.map((row, i) => ({ ...row, color: SERIES[(i + idx) % SERIES.length] }))} colored />
                <Legend data={r.rows.map((row, i) => ({ ...row, color: SERIES[(i + idx) % SERIES.length] }))} showPct={false} />
                <p className="cs-ops-note">{r.note}</p>
              </>
            )}
          </Card>
        ))}
      </div>

      <Card pad={false}>
        <div className="cs-ops-toolbar">
          <div className="cs-tabs" style={{ border: 0, flex: 1, minWidth: 220 }}>
            {tabs.map((t) => (
              <button key={t} type="button" className={tab === t ? "cs-tab active" : "cs-tab"} onClick={() => reset(setTab)(t)}>
                {t}
              </button>
            ))}
          </div>

          <select
            className="cs-btn"
            value={status}
            onChange={(e) => reset(setStatus)(e.target.value)}
            style={{ paddingRight: 10 }}
            aria-label="Filter by status"
          >
            {statuses.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <label className="cs-search">
            <Icon name="search" size={15} />
            <input
              value={search}
              onChange={(e) => reset(setSearch)(e.target.value)}
              placeholder="Search the backlog…"
              aria-label="Search the operational queue"
            />
          </label>
        </div>

        <div className="cs-table-wrap" style={{ marginTop: 12 }}>
          <table className="cs-table">
            <thead>
              <tr>
                <th style={{ paddingLeft: 19 }}>Item</th>
                <th>Type</th>
                <th>Category</th>
                <th>Status</th>
                <th className="cs-num">Age</th>
                <th>Waiting since</th>
                <th style={{ paddingRight: 19 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {o.loading && (
                <tr><td colSpan={7} style={{ padding: 19 }}><Empty>Loading the live queue…</Empty></td></tr>
              )}
              {!o.loading && o.error && (
                <tr>
                  <td colSpan={7} style={{ padding: 19 }}>
                    <Empty>
                      The {label} queue could not be reached, so its contents are unknown. This is not an empty queue —
                      it is an unread one.
                    </Empty>
                  </td>
                </tr>
              )}
              {!o.loading && !o.error && o.items.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: 19 }}>
                    <Empty>{label} answered and returned no backlog items — the queue is genuinely empty right now.</Empty>
                  </td>
                </tr>
              )}
              {!o.loading && !o.error && o.items.length > 0 && visible.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 19 }}><Empty>No items match these filters.</Empty></td></tr>
              )}
              {visible.map((i) => (
                <tr key={`${i.kind}-${i.id}`}>
                  <td style={{ paddingLeft: 19, maxWidth: 300 }}>
                    <div className="title">{i.title}</div>
                    <div className="sub">{i.sub}</div>
                  </td>
                  <td style={{ color: "#4c5470" }}>{i.kindLabel}</td>
                  <td style={{ color: "#4c5470" }}>{i.category}</td>
                  <td>
                    <Pill tone={i.tone}>
                      <Icon name={i.glyph} size={12} />
                      {i.statusLabel}
                    </Pill>
                  </td>
                  <td className="cs-num">{ageLabel(i)}</td>
                  <td style={{ color: "#69738c" }}>
                    {i.timestamp ? `${i.ageBasis} ${new Date(i.timestamp).toLocaleDateString()}` : "Not recorded"}
                  </td>
                  <td style={{ paddingRight: 19 }}>
                    {platform === "ghrfix" && i.kind === "verification" && i.status === "PENDING" ? (
                      <div className="cs-ops-actions">
                        <button type="button" className="cs-btn" disabled={busyId === i.id} onClick={() => approveProvider(i.id, i.title)}>
                          <Icon name="check" size={13} />
                          {busyId === i.id ? "…" : "Approve"}
                        </button>
                        <button type="button" className="cs-btn" disabled={busyId === i.id} onClick={() => rejectProvider(i.id, i.title)}>
                          <Icon name="alert" size={13} />
                          Reject
                        </button>
                      </div>
                    ) : platform === "ghrfix" && i.kind === "incident" && (i.status === "OPEN" || i.status === "ASSIGNED") ? (
                      <div className="cs-ops-actions">
                        <button type="button" className="cs-btn" disabled={busyId === i.id} onClick={() => changeEmergencyStatus(i.id, i.title, "RESOLVED")}>
                          <Icon name="check" size={13} />
                          {busyId === i.id ? "…" : "Resolve"}
                        </button>
                        <button type="button" className="cs-btn" disabled={busyId === i.id} onClick={() => changeEmergencyStatus(i.id, i.title, "CANCELLED")}>
                          <Icon name="alert" size={13} />
                          Cancel
                        </button>
                      </div>
                    ) : platform === "ghrfix" ? (
                      <Pill tone={i.tone}><Icon name={i.glyph} size={12} />Decided</Pill>
                    ) : (
                      <button type="button" className="cs-btn cs-ops-inert" disabled title="ShadiLife has no AI-agent endpoint for this row — see Verifications/Incidents for details.">
                        <Icon name="eye" size={13} />
                        No agent endpoint
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="cs-ops-readonly">
          {platform === "ghrfix"
            ? "Approve/Reject and Resolve/Cancel call GhrFix's real ops-agent endpoints — every action is audited. See the Verifications and Incidents pages for the same actions with more context."
            : "ShadiLife has no AI-agent endpoint for any row in this backlog, so nothing here can be actioned — see the Verifications and Incidents pages for why."}
        </p>

        {rows.length > PAGE_SIZE && (
          <div className="cs-ops-pager">
            <span>
              {(current - 1) * PAGE_SIZE + 1}–{Math.min(current * PAGE_SIZE, rows.length)} of {rows.length.toLocaleString()}
            </span>
            <div>
              <button type="button" className="cs-btn" onClick={() => setPage(Math.max(1, current - 1))} disabled={current === 1}>
                Previous
              </button>
              <span className="cs-ops-pagenum">{current} / {totalPages}</span>
              <button type="button" className="cs-btn" onClick={() => setPage(Math.min(totalPages, current + 1))} disabled={current === totalPages}>
                Next
              </button>
            </div>
          </div>
        )}
      </Card>

      {toast && <div className="cs-ops-toast" role="status">{toast}</div>}
    </SpecialShell>
  );
}

/* Page-local styles only, all `cs-ops-*` prefixed. */
const QUEUE_CSS = `
.cs-ops-note{margin:12px 0 0;font-size:10.5px;line-height:17px;color:#8891a8}
.cs-ops-src{font-size:11px;color:#69738c}
.cs-ops-toolbar{display:flex;align-items:center;gap:12px;padding:14px 19px 0;flex-wrap:wrap}
.cs-ops-inert{opacity:.55;cursor:not-allowed;white-space:nowrap}
.cs-ops-actions{display:flex;gap:6px;flex-wrap:wrap}
.cs-ops-toast{position:fixed;right:22px;bottom:22px;max-width:360px;background:#11162f;color:#fff;border-radius:10px;padding:12px 16px;font-size:12.5px;line-height:18px;box-shadow:0 14px 32px rgba(20,20,45,.28);z-index:50}
.cs-ops-readonly{margin:0;padding:12px 19px;font-size:10.5px;line-height:17px;color:#8891a8;border-top:1px solid #eef0f5}
.cs-ops-pager{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 19px 16px;border-top:1px solid #eef0f5;font-size:11px;color:#69738c;flex-wrap:wrap}
.cs-ops-pager>div{display:flex;align-items:center;gap:8px}
.cs-ops-pagenum{font-weight:650;color:#11162d}
`;
