"use client";

/**
 * ShadiLife — Verification Agent — Dashboard overview.
 *
 * Lighter overview than before: the full pending queue with AI suggestions
 * and Approve/Reject now lives on the Queue tab
 * (components/agents/views/domain/shadilife/verification.tsx). This page
 * keeps the 30-day summary stats, decisions donut, and the human-verification
 * toggle, plus a short teaser of the queue.
 *
 * Real endpoints behind this page:
 *   GET  /api/ai-agents/verification/summary                    → real 30-day approve/reject + agreement stats
 *   GET  /api/ai-agents/verification/pending                    → the real UNDER_REVIEW queue, oldest first (teaser only)
 *   PUT  /api/ai-agents/verification/require-human-verification → { enabled } feature-flag toggle (real write)
 */

import { useState } from "react";
import Link from "next/link";
import { AgentHeading } from "@/components/agents/AgentShell";
import { BarList, DonutChart, InsightsPanel, MetricCard, Svg } from "@/components/agents/rich";
import { Icons } from "@/components/agents/icons";
import type { AgentViewProps } from "../registry";
import { ActionNote, Empty, ErrorNote, Panel, TableWrap, errText, num, pct, platPut, share, shortDate, useLoad } from "./_kit";

interface Summary {
  pendingProfiles?: number;
  pendingDocuments?: number;
  approved30d?: number;
  rejected30d?: number;
  humanReviewed30d?: number;
  aiAutoApproved30d?: number;
  agreementRate?: number | null;
  suggestionsResolved?: number;
  requireHumanVerification?: boolean;
}
interface PendingItem {
  userId: string;
  fullName?: string | null;
  city?: string | null;
  submittedAt?: string | null;
}

export default function ShadiLifeVerificationView({ platform, agent, api }: AgentViewProps) {
  const load = useLoad<{ summary: Summary | null; pending: PendingItem[] }>(async () => {
    const [summary, pending] = await Promise.allSettled([
      api.get<Summary>("/summary"),
      api.get<PendingItem[]>("/pending"),
    ]);
    const s = summary.status === "fulfilled" ? summary.value.data : null;
    const p = pending.status === "fulfilled" ? pending.value.data ?? [] : [];
    if (!s && summary.status === "rejected") throw summary.reason;
    return { summary: s, pending: p };
  }, [platform.key]);

  const summary = load.data?.summary ?? null;
  const pending = load.data?.pending ?? [];

  const [actionError, setActionError] = useState<string | null>(null);
  const [togglePending, setTogglePending] = useState(false);
  const [flag, setFlag] = useState<boolean | null>(null);

  const requireHuman = flag ?? summary?.requireHumanVerification ?? null;

  function toggleRequireHuman() {
    if (requireHuman === null || togglePending) return;
    const next = !requireHuman;
    setTogglePending(true);
    platPut<{ requireHumanVerification: boolean }>(platform, "/ai-agents/verification/require-human-verification", { enabled: next })
      .then((d) => setFlag(d?.requireHumanVerification ?? next))
      .catch((e: unknown) => setActionError(errText(e, "Could not update the setting.")))
      .finally(() => setTogglePending(false));
  }

  const agreementPct = summary?.agreementRate ?? null;
  const decisions30d = (summary?.approved30d ?? 0) + (summary?.rejected30d ?? 0);
  const humanShare = share(summary?.humanReviewed30d, decisions30d);

  return (
    <>
      <AgentHeading
        platform={platform}
        agent={agent}
        blurb="30-day verification stats and the human-verification setting. The full queue with AI-assisted Approve/Reject lives on the Queue tab."
        actions={
          <>
            <Link href={`/${platform.key}/${agent.key}/queue`} className="ag-btn ag-btn-solid">
              <Svg path={Icons.fingerprint} size={14} /> Open Queue
            </Link>
            <Link href={`/${platform.key}/${agent.key}/chat`} className="ag-btn ag-btn-ghost">Ask this agent →</Link>
          </>
        }
      />

      {load.error && <ErrorNote platform={platform} error={load.error} what="Verification data could not load" />}
      <ActionNote error={actionError} />

      <div className="ag-metrics">
        <MetricCard icon={<Svg path={Icons.document} size={24} />} tone="gold" title="Pending profiles" value={load.loading ? "—" : num(summary?.pendingProfiles)} />
        <MetricCard icon={<Svg path={Icons.document} size={24} />} tone="purple" title="Pending documents" value={load.loading ? "—" : num(summary?.pendingDocuments)} />
        <MetricCard icon={<Svg path={Icons.check} size={24} />} tone="green" title="Approved (30d)" value={load.loading ? "—" : num(summary?.approved30d)} />
        <MetricCard icon={<Svg path={Icons.alert} size={24} />} tone="red" title="Rejected (30d)" value={load.loading ? "—" : num(summary?.rejected30d)} />
        <MetricCard icon={<Svg path={Icons.sparkle} size={24} />} tone="blue" title="Human/AI agreement" value={load.loading ? "—" : agreementPct === null || agreementPct === undefined ? "—" : pct(agreementPct)} />
      </div>

      <div className="ag-split">
        <div className="ag-stack">
          <Panel
            title="Verification queue"
            sub={`${pending.length} profile(s) waiting, oldest first — showing the top 5`}
            actions={<Link href={`/${platform.key}/${agent.key}/queue`} className="ag-btn ag-btn-ghost ag-btn-sm">View all in Queue →</Link>}
            noBody
          >
            {pending.length > 0 ? (
              <TableWrap>
                <table className="ag-table">
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th>City</th>
                      <th>Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pending.slice(0, 5).map((p) => (
                      <tr key={p.userId}>
                        <td style={{ fontWeight: 650 }}>{p.fullName || "—"}</td>
                        <td>{p.city || "—"}</td>
                        <td style={{ color: "var(--ag-ink-faint)" }}>{shortDate(p.submittedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            ) : (
              <div className="ag-panel-body">
                <Empty>{load.loading ? "Loading the queue…" : "Nothing waiting on verification right now."}</Empty>
              </div>
            )}
          </Panel>

          <div className="ag-duo">
            <Panel title="30-day decisions" sub="Approved vs rejected, from the audit trail">
              {decisions30d > 0 ? (
                <DonutChart
                  data={[
                    { label: "Approved", value: summary?.approved30d ?? 0, color: "#22c55e" },
                    { label: "Rejected", value: summary?.rejected30d ?? 0, color: "#ef4444" },
                  ]}
                  totalLabel="Decisions"
                />
              ) : (
                <Empty>{load.loading ? "Loading…" : "No decisions in the last 30 days."}</Empty>
              )}
            </Panel>
            <Panel title="Who decided" sub="Human review vs auto-approved (flag off)">
              <BarList
                rows={[
                  { label: "Reviewed by a human", value: summary?.humanReviewed30d ?? 0 },
                  { label: "AI auto-approved", value: summary?.aiAutoApproved30d ?? 0 },
                ].filter((r) => r.value > 0)}
                ranked
                color={agent.accent}
                emptyText={load.loading ? "Loading…" : "No decisions in the last 30 days."}
              />
            </Panel>
          </div>
        </div>

        <div className="ag-stack">
          <Panel title="Require human verification" sub="Feature flag — PUT /verification/require-human-verification">
            {requireHuman === null ? (
              <Empty>{load.loading ? "Loading…" : "Setting unavailable."}</Empty>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 650 }}>{requireHuman ? "Every verification needs a human" : "Auto-approve is allowed"}</div>
                  <div style={{ fontSize: 11, color: "var(--ag-ink-faint)", marginTop: 3 }}>
                    {requireHuman ? "CNIC uploads always wait for a moderator." : "CNIC uploads can be approved without a human, per current settings."}
                  </div>
                </div>
                <button type="button" className={`ag-btn ag-btn-sm ${requireHuman ? "ag-btn-accent" : "ag-btn-ghost"}`} onClick={toggleRequireHuman} disabled={togglePending}>
                  {togglePending ? "Saving…" : requireHuman ? "ON" : "OFF"}
                </button>
              </div>
            )}
          </Panel>

          <InsightsPanel
            rows={[
              ...(agreementPct !== null && agreementPct !== undefined
                ? [{ icon: <Svg path={Icons.check} size={15} />, label: "Humans agree with the AI", value: `${pct(agreementPct)} of resolved suggestions matched the human decision (${num(summary?.suggestionsResolved)} resolved).` }]
                : []),
              ...(humanShare !== null
                ? [{ icon: <Svg path={Icons.shield} size={15} />, label: "Human review share", value: `${pct(humanShare)} of the last 30 days' decisions were made by a human reviewer.` }]
                : []),
              ...((summary?.pendingProfiles ?? 0) > 0
                ? [{ icon: <Svg path={Icons.alert} size={15} />, label: "Queue depth", value: `${num(summary?.pendingProfiles)} profile(s) and ${num(summary?.pendingDocuments)} document(s) are waiting right now.` }]
                : []),
              { icon: <Svg path={Icons.fingerprint} size={15} />, label: "AI-assisted review", value: "Get a plausibility check per profile and Approve/Reject on the Queue tab." },
            ]}
          />
        </div>
      </div>
    </>
  );
}
