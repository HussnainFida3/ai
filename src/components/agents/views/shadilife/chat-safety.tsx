"use client";

/**
 * ShadiLife — Chat & Safety Agent — Dashboard overview.
 *
 * Lighter overview than before: the on-demand AI scan trigger, the full
 * flagged-message queue with dismiss/escalate, and the full contact-block
 * log now live on the Safety tab
 * (components/agents/views/domain/shadilife/chat-safety.tsx). This page
 * keeps the at-a-glance counts, blocks-by-type breakdown, and a teaser.
 *
 * Real endpoints behind this page:
 *   GET /api/ai-agents/chat-safety/contact-blocks → real auto-filed Reports for blocked contact-info attempts (30d)
 *   GET /api/ai-agents/chat-safety/flagged        → messages the AI scan flagged, awaiting a human (teaser only)
 */

import Link from "next/link";
import { AgentHeading } from "@/components/agents/AgentShell";
import { DonutChart, InsightsPanel, MetricCard, Svg } from "@/components/agents/rich";
import { Icons } from "@/components/agents/icons";
import type { AgentViewProps } from "../registry";
import { Empty, ErrorNote, Panel, TableWrap, num, share, timeAgo, useLoad } from "./_kit";

interface ContactBlock {
  id: string;
  senderName?: string;
  senderId?: string;
  description?: string | null;
  createdAt?: string;
}
interface ContactBlocksResponse {
  total30d?: number;
  byType?: { email?: number; phone?: number; social?: number; other?: number };
  recent?: ContactBlock[];
}
interface FlaggedMessage {
  id: string;
  senderName?: string;
  flagReason?: string | null;
  flaggedAt?: string;
}

export default function ShadiLifeChatSafetyView({ platform, agent, api }: AgentViewProps) {
  const load = useLoad<{ blocks: ContactBlocksResponse | null; flagged: FlaggedMessage[] }>(async () => {
    const [blocks, flagged] = await Promise.allSettled([
      api.get<ContactBlocksResponse>("/contact-blocks"),
      api.get<FlaggedMessage[]>("/flagged"),
    ]);
    const b = blocks.status === "fulfilled" ? blocks.value.data : null;
    const f = flagged.status === "fulfilled" ? flagged.value.data ?? [] : [];
    if (!b && blocks.status === "rejected" && flagged.status === "rejected") throw blocks.reason;
    return { blocks: b, flagged: f };
  }, [platform.key]);

  const blocks = load.data?.blocks ?? null;
  const flagged = load.data?.flagged ?? [];

  const byType = blocks?.byType ?? {};
  const typeRows = [
    { label: "Email", value: byType.email ?? 0, color: "#3b82f6" },
    { label: "Phone", value: byType.phone ?? 0, color: "#f59e0b" },
    { label: "Social handle/link", value: byType.social ?? 0, color: "#ec4899" },
    { label: "Other", value: byType.other ?? 0, color: "#94a3b8" },
  ].filter((r) => r.value > 0);

  return (
    <>
      <AgentHeading
        platform={platform}
        agent={agent}
        blurb="Real-time contact-info blocking already runs on every message. The on-demand AI scan and the flagged-message queue live on the Safety tab."
        actions={
          <>
            <Link href={`/${platform.key}/${agent.key}/safety`} className="ag-btn ag-btn-solid">
              <Svg path={Icons.wand} size={14} /> Open Safety
            </Link>
            <Link href={`/${platform.key}/${agent.key}/chat`} className="ag-btn ag-btn-ghost">Ask this agent →</Link>
          </>
        }
      />

      {load.error && <ErrorNote platform={platform} error={load.error} what="Chat safety data could not load" />}

      <div className="ag-metrics">
        <MetricCard icon={<Svg path={Icons.shield} size={24} />} tone="red" title="Contact-info blocks (30d)" value={load.loading ? "—" : num(blocks?.total30d)} />
        <MetricCard icon={<Svg path={Icons.alert} size={24} />} tone="gold" title="Flagged messages" value={load.loading ? "—" : num(flagged.length)} />
        <MetricCard icon={<Svg path={Icons.sparkle} size={24} />} tone="purple" title="Last scan" value="—" />
        <MetricCard icon={<Svg path={Icons.flag} size={24} />} tone="blue" title="Newly flagged" value="—" />
      </div>

      <div className="ag-split">
        <div className="ag-stack">
          <Panel
            title="Flagged messages"
            sub={`${flagged.length} awaiting a human decision — showing the top 5`}
            actions={<Link href={`/${platform.key}/${agent.key}/safety`} className="ag-btn ag-btn-ghost ag-btn-sm">View all in Safety →</Link>}
            noBody
          >
            {flagged.length > 0 ? (
              <TableWrap>
                <table className="ag-table">
                  <thead><tr><th>Sender</th><th>Reason</th><th>Flagged</th></tr></thead>
                  <tbody>
                    {flagged.slice(0, 5).map((m) => (
                      <tr key={m.id}>
                        <td style={{ fontWeight: 650 }}>{m.senderName || "—"}</td>
                        <td style={{ maxWidth: 320, color: "var(--ag-ink-soft)", fontSize: 12 }}>{m.flagReason || "—"}</td>
                        <td style={{ color: "var(--ag-ink-faint)", whiteSpace: "nowrap" }}>{timeAgo(m.flaggedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            ) : (
              <div className="ag-panel-body"><Empty>{load.loading ? "Loading…" : "Nothing flagged right now."}</Empty></div>
            )}
          </Panel>
        </div>

        <div className="ag-stack">
          <Panel title="Blocks by type" sub="Last 30 days">
            {typeRows.length > 0 ? (
              <DonutChart data={typeRows} totalLabel="Blocks" />
            ) : (
              <Empty>{load.loading ? "Loading…" : "No blocks in the last 30 days."}</Empty>
            )}
          </Panel>

          <InsightsPanel
            rows={[
              ...(typeRows.length > 0
                ? [{ icon: <Svg path={Icons.shield} size={15} />, label: "Most common attempt", value: `${typeRows[0].label} accounts for ${share(typeRows[0].value, blocks?.total30d) ?? "—"}% of blocks in the last 30 days.` }]
                : []),
              ...(flagged.length > 0
                ? [{ icon: <Svg path={Icons.alert} size={15} />, label: "Needs attention", value: `${flagged.length} message(s) are still waiting on a human decision.` }]
                : []),
              { icon: <Svg path={Icons.wand} size={15} />, label: "AI batch scan", value: "Run an on-demand scan and dismiss/escalate flagged messages on the Safety tab." },
            ]}
          />
        </div>
      </div>
    </>
  );
}
