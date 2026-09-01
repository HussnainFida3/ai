"use client";

/**
 * GhrFix — Support Agent — Tickets (5th tab).
 *
 * The full, independently-filterable and paginated version of the disputes
 * and contact-message queues the Dashboard only teases. Backed by the same
 * `/tickets` endpoint (which already accepts disputeStatus/messageStatus/
 * page/pageSize — see support-agent/router.ts), called once per section so
 * each table gets its own page cursor. Resolve actions are the exact same
 * audited writes as before.
 */

import { useState } from "react";
import { AgentHeading } from "@/components/agents/AgentShell";
import { InsightsPanel, MetricCard, Svg } from "@/components/agents/rich";
import { Icons } from "@/components/agents/icons";
import { ApiError } from "@/lib/api";
import type { AgentViewProps } from "../../registry";
import { Empty, ErrorNote, Panel, Pill, TableWrap, dateTime, num, timeAgo, useLoad } from "../../ghrfix/_kit-core";

type DisputeStatus = "OPEN" | "INVESTIGATING" | "RESOLVED" | "REJECTED";
type MessageStatus = "NEW" | "READ" | "RESOLVED";

interface Dispute {
  id: string;
  category: string;
  description: string;
  status: DisputeStatus;
  resolutionNote: string | null;
  refundAmount: string | null;
  createdAt: string;
  raisedBy: { id: string; name: string | null; phone: string | null; email: string | null };
  booking: { id: string; bookingNumber: string } | null;
}

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: MessageStatus;
  createdAt: string;
}

interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface Tickets {
  disputes: Paged<Dispute>;
  messages: Paged<ContactMessage>;
}

const DISPUTE_TONE: Record<DisputeStatus, "green" | "amber" | "red" | "mute"> = {
  OPEN: "red",
  INVESTIGATING: "amber",
  RESOLVED: "green",
  REJECTED: "mute",
};

const MESSAGE_TONE: Record<MessageStatus, "green" | "amber" | "red" | "mute"> = {
  NEW: "red",
  READ: "amber",
  RESOLVED: "green",
};

function Pager({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "flex-end", padding: "10px 20px" }}>
      <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>← Prev</button>
      <span style={{ fontSize: 11, color: "var(--ag-ink-faint)" }}>Page {page} of {totalPages}</span>
      <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>Next →</button>
    </div>
  );
}

export default function GhrfixSupportTicketsView({ platform, agent, api }: AgentViewProps) {
  const [disputeStatus, setDisputeStatus] = useState<DisputeStatus | "">("");
  const [disputePage, setDisputePage] = useState(1);
  const [messageStatus, setMessageStatus] = useState<MessageStatus | "">("");
  const [messagePage, setMessagePage] = useState(1);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [resolving, setResolving] = useState<Dispute | null>(null);
  const [note, setNote] = useState("");
  const [refund, setRefund] = useState("");

  const disputeLoad = useLoad(async () => {
    const { data } = await api.get<Tickets>("/tickets", {
      disputeStatus: disputeStatus || undefined,
      page: disputePage,
      pageSize: 8,
    });
    return data.disputes;
  }, [platform.key, agent.key, disputeStatus, disputePage]);

  const messageLoad = useLoad(async () => {
    const { data } = await api.get<Tickets>("/tickets", {
      messageStatus: messageStatus || undefined,
      page: messagePage,
      pageSize: 8,
    });
    return data.messages;
  }, [platform.key, agent.key, messageStatus, messagePage]);

  const disputes = disputeLoad.data?.items ?? [];
  const messages = messageLoad.data?.items ?? [];

  const openCount = disputes.filter((d) => d.status === "OPEN" || d.status === "INVESTIGATING").length;
  const newCount = messages.filter((m) => m.status === "NEW").length;

  async function resolveMessage(id: string) {
    setBusyId(id);
    setMsg(null);
    setErr(null);
    try {
      await api.post(`/messages/${id}/resolve`, { status: "RESOLVED" });
      setMsg("Message marked resolved.");
      messageLoad.reload();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Could not resolve that message.");
    } finally {
      setBusyId(null);
    }
  }

  async function submitResolution(status: "INVESTIGATING" | "RESOLVED" | "REJECTED") {
    if (!resolving) return;
    setBusyId(resolving.id);
    setMsg(null);
    setErr(null);
    try {
      const body: Record<string, unknown> = { status };
      if (note.trim()) body.resolutionNote = note.trim();
      if (status === "RESOLVED" && refund.trim()) body.refundAmount = Number(refund);
      await api.post(`/disputes/${resolving.id}/resolve`, body);
      setMsg(`Dispute marked ${status.toLowerCase()}.`);
      setResolving(null);
      setNote("");
      setRefund("");
      disputeLoad.reload();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Could not resolve that dispute.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <AgentHeading
        platform={platform}
        agent={agent}
        blurb="Every dispute and every contact message, filterable by real status and paginated independently. Resolving here is a real, audited write."
        actions={
          <button
            type="button"
            className="ag-btn ag-btn-ghost"
            onClick={() => { disputeLoad.reload(); messageLoad.reload(); }}
            disabled={disputeLoad.loading || messageLoad.loading}
          >
            <Svg path={Icons.refresh} size={15} /> Refresh
          </button>
        }
      />

      {(disputeLoad.error || messageLoad.error) && (
        <ErrorNote error={disputeLoad.error ?? messageLoad.error ?? "Request failed."} hint={`Tickets reads ${platform.apiBase}${agent.base}/tickets. Connect ${platform.label} first if this persists.`} />
      )}

      <div className="ag-metrics">
        <MetricCard icon={<Svg path={Icons.flag} size={24} />} tone="red" title="Open on this page" value={disputeLoad.loading ? "—" : num(openCount)} />
        <MetricCard icon={<Svg path={Icons.message} size={24} />} tone="purple" title="New on this page" value={messageLoad.loading ? "—" : num(newCount)} />
        <MetricCard icon={<Svg path={Icons.inbox} size={24} />} tone="blue" title="Disputes on record" value={disputeLoad.loading ? "—" : num(disputeLoad.data?.total)} />
        <MetricCard icon={<Svg path={Icons.document} size={24} />} tone="gold" title="Messages on record" value={messageLoad.loading ? "—" : num(messageLoad.data?.total)} />
      </div>

      {(msg || err) && (
        <div style={{ margin: "0 0 14px" }}>
          <p style={{ margin: 0, fontSize: 11.5, fontWeight: 650, color: err ? "var(--ag-red)" : "var(--ag-green)" }}>{err ?? msg}</p>
        </div>
      )}

      <div className="ag-split">
        <div className="ag-stack">
          <Panel
            title="Disputes"
            sub={disputeLoad.data ? `${disputeLoad.data.total} matching this filter` : "Raised over real bookings"}
            noBody
            actions={
              <select
                value={disputeStatus}
                onChange={(e) => { setDisputeStatus(e.target.value as DisputeStatus | ""); setDisputePage(1); }}
                style={{ fontSize: 11.5, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--ag-border)", background: "var(--ag-panel)", color: "var(--ag-ink)" }}
              >
                <option value="">All statuses</option>
                <option value="OPEN">Open</option>
                <option value="INVESTIGATING">Investigating</option>
                <option value="RESOLVED">Resolved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            }
          >
            <TableWrap>
              <table className="ag-table">
                <thead>
                  <tr>
                    <th>Raised by</th>
                    <th>Category</th>
                    <th>Booking</th>
                    <th>Status</th>
                    <th>Raised</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {disputes.map((d) => (
                    <tr key={d.id}>
                      <td>
                        <b style={{ fontWeight: 650 }}>{d.raisedBy.name ?? "Unknown"}</b>
                        <div style={{ fontSize: 10.5, color: "var(--ag-ink-faint)" }}>{d.raisedBy.phone ?? d.raisedBy.email ?? "—"}</div>
                      </td>
                      <td>{d.category}</td>
                      <td style={{ fontSize: 11.5, color: "var(--ag-ink-soft)" }}>{d.booking?.bookingNumber ?? "—"}</td>
                      <td><Pill text={d.status} tone={DISPUTE_TONE[d.status]} /></td>
                      <td style={{ whiteSpace: "nowrap", color: "var(--ag-ink-faint)" }}>{timeAgo(d.createdAt)}</td>
                      <td>
                        {d.status === "OPEN" || d.status === "INVESTIGATING" ? (
                          <button type="button" className="ag-btn ag-btn-accent ag-btn-sm" onClick={() => { setResolving(d); setNote(""); setRefund(""); }}>
                            Resolve
                          </button>
                        ) : (
                          <span style={{ fontSize: 11, color: "var(--ag-ink-faint)" }}>Closed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {disputes.length === 0 && (
                    <tr>
                      <td colSpan={6}><Empty>{disputeLoad.loading ? "Loading disputes…" : "Nothing matches this filter."}</Empty></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </TableWrap>
            <Pager page={disputeLoad.data?.page ?? 1} totalPages={disputeLoad.data?.totalPages ?? 1} onChange={setDisputePage} />
          </Panel>

          {resolving && (
            <Panel
              title={`Resolve dispute — ${resolving.category}`}
              sub={resolving.description}
              actions={
                <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" onClick={() => setResolving(null)}>Cancel</button>
              }
            >
              <div className="ag-form-grid">
                <div className="ag-field" style={{ gridColumn: "1 / -1" }}>
                  <label htmlFor="sup-note">Resolution note</label>
                  <textarea id="sup-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What was decided and why…" />
                </div>
                <div className="ag-field">
                  <label htmlFor="sup-refund">Refund amount (GC, optional)</label>
                  <input id="sup-refund" inputMode="decimal" value={refund} onChange={(e) => setRefund(e.target.value)} placeholder="0" />
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
                <button type="button" className="ag-btn ag-btn-accent ag-btn-sm" disabled={busyId === resolving.id} onClick={() => submitResolution("RESOLVED")}>
                  {busyId === resolving.id ? "Working…" : "Resolve"}
                </button>
                <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" disabled={busyId === resolving.id} onClick={() => submitResolution("INVESTIGATING")}>
                  Mark investigating
                </button>
                <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" disabled={busyId === resolving.id} onClick={() => submitResolution("REJECTED")}>
                  Reject
                </button>
              </div>
            </Panel>
          )}

          <Panel
            title="Contact messages"
            sub={messageLoad.data ? `${messageLoad.data.total} matching this filter` : "Real submissions"}
            noBody
            actions={
              <select
                value={messageStatus}
                onChange={(e) => { setMessageStatus(e.target.value as MessageStatus | ""); setMessagePage(1); }}
                style={{ fontSize: 11.5, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--ag-border)", background: "var(--ag-panel)", color: "var(--ag-ink)" }}
              >
                <option value="">All statuses</option>
                <option value="NEW">New</option>
                <option value="READ">Read</option>
                <option value="RESOLVED">Resolved</option>
              </select>
            }
          >
            <TableWrap>
              <table className="ag-table">
                <thead>
                  <tr>
                    <th>From</th>
                    <th>Subject</th>
                    <th>Status</th>
                    <th>Received</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <b style={{ fontWeight: 650 }}>{m.name}</b>
                        <div style={{ fontSize: 10.5, color: "var(--ag-ink-faint)" }}>{m.email}</div>
                      </td>
                      <td style={{ maxWidth: 240 }}>{m.subject}</td>
                      <td><Pill text={m.status} tone={MESSAGE_TONE[m.status]} /></td>
                      <td style={{ whiteSpace: "nowrap", color: "var(--ag-ink-faint)" }}>{timeAgo(m.createdAt)}</td>
                      <td>
                        {m.status !== "RESOLVED" ? (
                          <button type="button" className="ag-btn ag-btn-accent ag-btn-sm" disabled={busyId === m.id} onClick={() => resolveMessage(m.id)}>
                            {busyId === m.id ? "Working…" : "Mark resolved"}
                          </button>
                        ) : (
                          <span style={{ fontSize: 11, color: "var(--ag-ink-faint)" }}>Done</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {messages.length === 0 && (
                    <tr>
                      <td colSpan={5}><Empty>{messageLoad.loading ? "Loading messages…" : "Nothing matches this filter."}</Empty></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </TableWrap>
            <Pager page={messageLoad.data?.page ?? 1} totalPages={messageLoad.data?.totalPages ?? 1} onChange={setMessagePage} />
          </Panel>
        </div>

        <div className="ag-stack">
          <InsightsPanel
            title="Ticket detail"
            rows={[
              {
                icon: <Svg path={Icons.clock} size={15} />,
                label: "Newest dispute shown",
                value: disputes[0] ? `${disputes[0].category} — ${dateTime(disputes[0].createdAt)}` : "No dispute matches this filter.",
              },
              {
                icon: <Svg path={Icons.message} size={15} />,
                label: "Newest message shown",
                value: messages[0] ? `${messages[0].subject} — ${dateTime(messages[0].createdAt)}` : "No message matches this filter.",
              },
              {
                icon: <Svg path={Icons.filter} size={15} />,
                label: "Filtering both queues",
                value: "Status filters and paging are independent — narrowing disputes to Open never affects the messages queue beside it.",
              },
            ]}
          />
        </div>
      </div>
    </>
  );
}
