"use client";

/**
 * ShadiLife — Chat & Safety Agent — Safety (domain tab).
 *
 * The deep-dive companion to the Dashboard's lighter overview: the on-demand
 * AI batch scan, the full flagged-message queue with dismiss/escalate, and
 * the full recent contact-info-block log.
 *
 * Real endpoints:
 *   GET  /api/ai-agents/chat-safety/contact-blocks   → real auto-filed Reports for blocked contact-info attempts (30d)
 *   GET  /api/ai-agents/chat-safety/flagged          → messages the AI scan flagged, awaiting a human
 *   POST /api/ai-agents/chat-safety/scan             → on-demand AI batch scan of the 25 most recent messages
 *   POST /api/ai-agents/chat-safety/flagged/:id/dismiss   → clears the flag (real write)
 *   POST /api/ai-agents/chat-safety/flagged/:id/escalate  → files a real Report (real write)
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { AgentHeading } from "@/components/agents/AgentShell";
import { InsightsPanel, MetricCard, Svg } from "@/components/agents/rich";
import { Icons } from "@/components/agents/icons";
import type { AgentViewProps } from "../../registry";
import { ActionNote, Empty, ErrorNote, Panel, TableWrap, errText, num, timeAgo, useLoad } from "../../shadilife/_kit";

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
  conversationId?: string;
  senderId?: string;
  senderName?: string;
  content?: string;
  flagReason?: string | null;
  flaggedAt?: string;
}
interface ScanResult {
  scanned?: number;
  flagged?: number;
}

type Tab = "flagged" | "blocks";

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
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const rawFlagged = (load.data?.flagged ?? []).filter((m) => !removedIds.has(m.id));

  const [tab, setTab] = useState<Tab>("flagged");
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  function runScan() {
    setScanning(true);
    setScanError(null);
    api
      .post<ScanResult>("/scan")
      .then(({ data }) => {
        setScanResult(data ?? {});
        load.reload();
      })
      .catch((e: unknown) => setScanError(errText(e, "The safety scan could not be run.")))
      .finally(() => setScanning(false));
  }

  function dismiss(id: string) {
    setBusyId(id);
    setActionError(null);
    api
      .post(`/flagged/${encodeURIComponent(id)}/dismiss`)
      .then(() => setRemovedIds((prev) => new Set(prev).add(id)))
      .catch((e: unknown) => setActionError(errText(e, "Could not dismiss this message.")))
      .finally(() => setBusyId(null));
  }
  function escalate(id: string) {
    setBusyId(id);
    setActionError(null);
    api
      .post(`/flagged/${encodeURIComponent(id)}/escalate`)
      .then(() => setRemovedIds((prev) => new Set(prev).add(id)))
      .catch((e: unknown) => setActionError(errText(e, "Could not escalate this message.")))
      .finally(() => setBusyId(null));
  }

  const flaggedList = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (tab !== "flagged" || !q) return rawFlagged;
    return rawFlagged.filter((m) => (m.senderName ?? "").toLowerCase().includes(q) || (m.flagReason ?? "").toLowerCase().includes(q));
  }, [rawFlagged, search, tab]);

  const recentBlocks = useMemo(() => {
    const rows = blocks?.recent ?? [];
    const q = search.trim().toLowerCase();
    if (tab !== "blocks" || !q) return rows;
    return rows.filter((b) => (b.senderName ?? "").toLowerCase().includes(q) || (b.description ?? "").toLowerCase().includes(q));
  }, [blocks, search, tab]);

  return (
    <>
      <AgentHeading
        platform={platform}
        agent={agent}
        blurb="The on-demand AI batch scan, the full flagged-message queue, and the full 30-day contact-info-block log — every dismiss/escalate is a real write."
        actions={
          <>
            <button type="button" className="ag-btn ag-btn-solid" onClick={runScan} disabled={scanning}>
              <Svg path={Icons.wand} size={14} /> {scanning ? "Scanning…" : "Run safety scan"}
            </button>
            <Link href={`/${platform.key}/${agent.key}`} className="ag-btn ag-btn-ghost">← Dashboard</Link>
          </>
        }
      />

      {load.error && <ErrorNote platform={platform} error={load.error} what="Chat safety data could not load" />}
      {scanError && <p style={{ margin: "0 0 16px", fontSize: 12, color: "var(--ag-red)" }}>{scanError}</p>}
      <ActionNote error={actionError} />

      <div className="ag-metrics">
        <MetricCard icon={<Svg path={Icons.alert} size={24} />} tone="gold" title="Flagged messages" value={load.loading ? "—" : num(flaggedList.length)} />
        <MetricCard icon={<Svg path={Icons.shield} size={24} />} tone="red" title="Contact-info blocks (30d)" value={load.loading ? "—" : num(blocks?.total30d)} />
        <MetricCard icon={<Svg path={Icons.sparkle} size={24} />} tone="purple" title="Last scan — checked" value={scanResult ? num(scanResult.scanned) : "—"} />
        <MetricCard icon={<Svg path={Icons.flag} size={24} />} tone="blue" title="Last scan — newly flagged" value={scanResult ? num(scanResult.flagged) : "—"} />
      </div>

      <div className="ag-tabs" style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <button type="button" className={`ag-btn ag-btn-sm ${tab === "flagged" ? "ag-btn-accent" : "ag-btn-ghost"}`} onClick={() => { setTab("flagged"); setSearch(""); }}>
          Flagged ({flaggedList.length})
        </button>
        <button type="button" className={`ag-btn ag-btn-sm ${tab === "blocks" ? "ag-btn-accent" : "ag-btn-ghost"}`} onClick={() => { setTab("blocks"); setSearch(""); }}>
          Contact blocks ({recentBlocks.length})
        </button>
      </div>

      {tab === "flagged" ? (
        <Panel
          title="Flagged messages"
          sub="Awaiting a human decision — dismiss or escalate to Reports"
          actions={
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search sender or reason…"
              style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--ag-border)", background: "var(--ag-bg)", color: "var(--ag-ink)", minWidth: 180 }}
            />
          }
          noBody
        >
          {flaggedList.length > 0 ? (
            <TableWrap>
              <table className="ag-table">
                <thead>
                  <tr>
                    <th>Sender</th>
                    <th>Reason</th>
                    <th>Message</th>
                    <th>Flagged</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {flaggedList.map((m) => (
                    <tr key={m.id}>
                      <td style={{ fontWeight: 650 }}>{m.senderName || "—"}</td>
                      <td style={{ maxWidth: 220, color: "var(--ag-ink-soft)", fontSize: 12 }}>{m.flagReason || "—"}</td>
                      <td style={{ maxWidth: 260, color: "var(--ag-ink-faint)", fontSize: 11.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.content || "—"}</td>
                      <td style={{ color: "var(--ag-ink-faint)", whiteSpace: "nowrap" }}>{timeAgo(m.flaggedAt)}</td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" onClick={() => dismiss(m.id)} disabled={busyId === m.id}>Dismiss</button>
                          <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" onClick={() => escalate(m.id)} disabled={busyId === m.id}>Escalate</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          ) : (
            <div className="ag-panel-body"><Empty>{load.loading ? "Loading…" : "Nothing flagged right now."}</Empty></div>
          )}
        </Panel>
      ) : (
        <Panel
          title="Recent contact-info blocks"
          sub="Auto-filed the moment someone tried to share contact info in chat"
          actions={
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search sender or detail…"
              style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--ag-border)", background: "var(--ag-bg)", color: "var(--ag-ink)", minWidth: 180 }}
            />
          }
          noBody
        >
          {recentBlocks.length > 0 ? (
            <TableWrap>
              <table className="ag-table">
                <thead>
                  <tr>
                    <th>Sender</th>
                    <th>What happened</th>
                    <th>When</th>
                  </tr>
                </thead>
                <tbody>
                  {recentBlocks.map((b) => (
                    <tr key={b.id}>
                      <td style={{ fontWeight: 650 }}>{b.senderName || "—"}</td>
                      <td style={{ maxWidth: 340, color: "var(--ag-ink-soft)", fontSize: 12 }}>{b.description || "—"}</td>
                      <td style={{ color: "var(--ag-ink-faint)", whiteSpace: "nowrap" }}>{timeAgo(b.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          ) : (
            <div className="ag-panel-body"><Empty>{load.loading ? "Loading…" : "No blocked attempts in the last 30 days."}</Empty></div>
          )}
        </Panel>
      )}

      <div style={{ marginTop: 18 }}>
        <InsightsPanel
          rows={[
            ...(flaggedList.length > 0
              ? [{ icon: <Svg path={Icons.alert} size={15} />, label: "Needs attention", value: `${flaggedList.length} message(s) are still waiting on a human decision.` }]
              : []),
            ...(scanResult
              ? [{ icon: <Svg path={Icons.sparkle} size={15} />, label: "Last scan", value: `Checked ${num(scanResult.scanned)} recent message(s), flagged ${num(scanResult.flagged)} for review.` }]
              : []),
            ...((blocks?.total30d ?? 0) > 0
              ? [{ icon: <Svg path={Icons.shield} size={15} />, label: "Real-time enforcement", value: `${num(blocks?.total30d)} contact-info attempt(s) were auto-blocked in the last 30 days.` }]
              : []),
          ]}
        />
      </div>
    </>
  );
}
