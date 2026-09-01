"use client";

/**
 * GhrFix — Support Agent.
 *
 * `/summary` gives real open/investigating dispute counts and new/read
 * contact-message counts; `/tickets` powers the quick preview below. The
 * full, filterable, paginated disputes and messages queues — with the real
 * resolve writes — live on the Tickets tab
 * (components/agents/views/domain/ghrfix/support.tsx).
 */

import Link from "next/link";
import { AgentSidePanel, DonutChart, InsightsPanel, MetricCard, Svg } from "@/components/agents/rich";
import { Icons } from "@/components/agents/icons";
import { type AgentStats } from "@/lib/api";
import type { AgentViewProps } from "../registry";
import { AskAnswer, Empty, ErrorNote, KeyRow, Panel, Pill, TableWrap, num, share, timeAgo, useAsk, useLoad } from "./_kit-core";

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

interface Summary {
  openDisputes: number;
  investigatingDisputes: number;
  unresolvedMessages: number;
  newMessages: number;
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

export default function SupportView({ platform, agent, api }: AgentViewProps) {
  const load = useLoad(async () => {
    const [summary, tickets, stats] = await Promise.allSettled([
      api.get<Summary>("/summary"),
      api.get<Tickets>("/tickets", { pageSize: 30 }),
      api.stats(),
    ]);
    if (summary.status === "rejected" && tickets.status === "rejected") throw summary.reason;
    return {
      summary: summary.status === "fulfilled" ? summary.value.data : null,
      tickets: tickets.status === "fulfilled" ? tickets.value.data : null,
      stats: stats.status === "fulfilled" ? (stats.value.data as AgentStats) : null,
    };
  }, [platform.key, agent.key]);

  const ask = useAsk(api);
  const s = load.data?.summary ?? null;
  const t = load.data?.tickets ?? null;

  const disputes = t?.disputes.items ?? [];
  const messages = t?.messages.items ?? [];

  const ticketMix = [
    { label: "Open disputes", value: s?.openDisputes ?? 0, color: "#e0393e" },
    { label: "Investigating", value: s?.investigatingDisputes ?? 0, color: "#d68b00" },
    { label: "Unresolved messages", value: s?.unresolvedMessages ?? 0, color: "#3b82f6" },
  ].filter((r) => r.value > 0);
  const ticketMixTotal = ticketMix.reduce((a, b) => a + b.value, 0);

  const resolvedDisputes = disputes.filter((d) => d.status === "RESOLVED" || d.status === "REJECTED").length;
  const resolutionRate = disputes.length > 0 ? share(resolvedDisputes, disputes.length) : null;
  const newShare = t && t.messages.total > 0 ? share(s?.newMessages ?? 0, t.messages.total) : null;

  const oldestOpenDispute = disputes
    .filter((d) => d.status === "OPEN" || d.status === "INVESTIGATING")
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0] ?? null;

  return (
    <>
      {load.error && <ErrorNote error={load.error} hint={`The Support Agent reads ${platform.apiBase}${agent.base}/summary. Connect ${platform.label} first if this persists.`} />}

      <div className="ag-metrics">
        <MetricCard icon={<Svg path={Icons.flag} size={24} />} tone="red" title="Open disputes" value={load.loading ? "—" : num(s?.openDisputes)} />
        <MetricCard icon={<Svg path={Icons.clock} size={24} />} tone="gold" title="Investigating" value={load.loading ? "—" : num(s?.investigatingDisputes)} />
        <MetricCard icon={<Svg path={Icons.message} size={24} />} tone="blue" title="Unresolved messages" value={load.loading ? "—" : num(s?.unresolvedMessages)} />
        <MetricCard icon={<Svg path={Icons.alert} size={24} />} tone="purple" title="New messages" value={load.loading ? "—" : num(s?.newMessages)} />
      </div>

      <div className="ag-split">
        <div className="ag-stack">
          <Panel title="Ticket mix" sub="Real counts across every open channel">
            {ticketMix.length > 0 ? (
              <DonutChart data={ticketMix} total={ticketMixTotal} totalLabel="Open items" size={150} />
            ) : (
              <Empty>{load.loading ? "Loading…" : "No open tickets — the queue is clear."}</Empty>
            )}
          </Panel>

          <Panel
            title="Open tickets — quick look"
            sub={t ? `${t.disputes.total} disputes · ${t.messages.total} messages on record` : "Raised over real bookings and the contact form"}
            noBody
            actions={
              <Link href={`/${platform.key}/${agent.key}/tickets`} className="ag-btn ag-btn-ghost ag-btn-sm">
                View full Tickets →
              </Link>
            }
          >
            <TableWrap>
              <table className="ag-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>From</th>
                    <th>Detail</th>
                    <th>Status</th>
                    <th>When</th>
                  </tr>
                </thead>
                <tbody>
                  {disputes.filter((d) => d.status === "OPEN" || d.status === "INVESTIGATING").slice(0, 3).map((d) => (
                    <tr key={d.id}>
                      <td>Dispute</td>
                      <td style={{ fontWeight: 650 }}>{d.raisedBy.name ?? "Unknown"}</td>
                      <td>{d.category}</td>
                      <td><Pill text={d.status} tone={DISPUTE_TONE[d.status]} /></td>
                      <td style={{ whiteSpace: "nowrap", color: "var(--ag-ink-faint)" }}>{timeAgo(d.createdAt)}</td>
                    </tr>
                  ))}
                  {messages.filter((m) => m.status === "NEW").slice(0, 3).map((m) => (
                    <tr key={m.id}>
                      <td>Message</td>
                      <td style={{ fontWeight: 650 }}>{m.name}</td>
                      <td style={{ maxWidth: 200 }}>{m.subject}</td>
                      <td><Pill text={m.status} tone={MESSAGE_TONE[m.status]} /></td>
                      <td style={{ whiteSpace: "nowrap", color: "var(--ag-ink-faint)" }}>{timeAgo(m.createdAt)}</td>
                    </tr>
                  ))}
                  {disputes.filter((d) => d.status === "OPEN" || d.status === "INVESTIGATING").length === 0 &&
                    messages.filter((m) => m.status === "NEW").length === 0 && (
                      <tr>
                        <td colSpan={5}><Empty>{load.loading ? "Loading tickets…" : "Nothing open right now — the queue is clear."}</Empty></td>
                      </tr>
                    )}
                </tbody>
              </table>
            </TableWrap>
          </Panel>
        </div>

        <div className="ag-stack">
          <AgentSidePanel
            agentLabel={`${platform.label} — ${agent.name}`}
            greeting="Every ticket, one place"
            blurb="I triage real disputes over bookings and real messages from the contact form. Resolving here is a live, audited write — nothing is a mock ticket."
            todayStats={[
              { label: "Open disputes", value: s ? num(s.openDisputes) : "—", icon: <Svg path={Icons.flag} size={17} />, tone: "gold" },
              { label: "New messages", value: s ? num(s.newMessages) : "—", icon: <Svg path={Icons.message} size={17} />, tone: "purple" },
              { label: "Agent calls today", value: load.data?.stats ? num(load.data.stats.callsToday) : "—", icon: <Svg path={Icons.chat} size={17} />, tone: "green" },
            ]}
            suggestions={["What disputes need my attention right now?", "How many contact messages are unresolved?", "What's our dispute resolution rate?"]}
            onAsk={ask.ask}
          />

          <AskAnswer state={ask} />

          <InsightsPanel
            rows={[
              {
                icon: <Svg path={Icons.clock} size={15} />,
                label: "Oldest open dispute",
                value: oldestOpenDispute ? `${oldestOpenDispute.category} raised by ${oldestOpenDispute.raisedBy.name ?? "a user"}, ${timeAgo(oldestOpenDispute.createdAt)}.` : "No dispute is currently open.",
              },
              {
                icon: <Svg path={Icons.check} size={15} />,
                label: "Dispute resolution rate",
                value: resolutionRate === null ? "No disputes on record yet." : `${resolutionRate}% of ${disputes.length} loaded disputes are closed.`,
              },
              {
                icon: <Svg path={Icons.message} size={15} />,
                label: "Message backlog",
                value: newShare === null ? "No contact messages yet." : `${newShare}% of ${t?.messages.total} messages are still marked new.`,
              },
              {
                icon: <Svg path={Icons.flag} size={15} />,
                label: "Investigating now",
                value: s && s.investigatingDisputes > 0 ? `${s.investigatingDisputes} dispute${s.investigatingDisputes === 1 ? "" : "s"} under active investigation.` : "Nothing under investigation right now.",
              },
            ]}
          />

          <Panel title="Agent runtime" sub="Real usage from the shared agent log">
            <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
              {load.data?.stats ? (
                <>
                  <KeyRow label="Model" value={load.data.stats.model} />
                  <KeyRow label="Calls this month" value={num(load.data.stats.callsThisMonth)} />
                  <KeyRow label="Spend this month" value={`$${(load.data.stats.spendThisMonthUsd ?? 0).toFixed(2)}`} />
                </>
              ) : (
                <Empty>{load.loading ? "Loading…" : "Runtime stats unavailable."}</Empty>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
