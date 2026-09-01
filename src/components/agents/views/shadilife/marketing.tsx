"use client";

/**
 * ShadiLife — Marketing Agent.
 *
 * Real endpoints behind this page:
 *   GET  /api/ai-agents/marketing/segments                              → the fixed on-site segment list
 *   POST /api/ai-agents/marketing/draft-campaign  { segment, goal }      → { title, body, segment, audienceSize }
 *   POST /api/ai-agents/marketing/send-campaign   { title, body, segment, channel } → the real NotificationCampaign (real write)
 *   POST /api/ai-agents/marketing/draft-outreach  { leadId }             → { subject, message } (off-site, lead-gen handoff)
 *
 * On-site campaigns respect every recipient's own notifyMarketing flag —
 * the audience size shown is the real, already-filtered count for that
 * segment. Sending is a distinct, explicit second step from drafting.
 */

import { useState } from "react";
import Link from "next/link";
import { AgentHeading } from "@/components/agents/AgentShell";
import { InsightsPanel, MetricCard, Svg } from "@/components/agents/rich";
import { Icons } from "@/components/agents/icons";
import type { AgentViewProps } from "../registry";
import { Empty, ErrorPanel, Panel, describeError, useAsync } from "./_shadilife-console-kit";

interface CampaignDraft {
  title?: string;
  body?: string;
  segment?: string;
  audienceSize?: number;
}
interface SentCampaign {
  id?: string;
  status?: string;
  sentCount?: number;
  sentAt?: string;
}
interface OutreachDraft {
  subject?: string;
  message?: string;
}

const CHANNELS = ["BOTH", "EMAIL", "NOTIFICATION"] as const;

export default function ShadiLifeMarketingView({ platform, agent, api }: AgentViewProps) {
  const segments = useAsync<string[]>(platform, async () => (await api.get<string[]>("/segments")).data ?? [], true);

  const [segment, setSegment] = useState("Active Users");
  const [goal, setGoal] = useState("");
  const [draft, setDraft] = useState<CampaignDraft | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);

  const [channel, setChannel] = useState<(typeof CHANNELS)[number]>("BOTH");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sent, setSent] = useState<SentCampaign | null>(null);

  const [leadId, setLeadId] = useState("");
  const [outreach, setOutreach] = useState<OutreachDraft | null>(null);
  const [outreaching, setOutreaching] = useState(false);
  const [outreachError, setOutreachError] = useState<string | null>(null);

  function draftCampaign() {
    if (!goal.trim() || drafting) return;
    setDrafting(true);
    setDraftError(null);
    setSent(null);
    api
      .post<CampaignDraft>("/draft-campaign", { segment, goal: goal.trim() })
      .then(({ data }) => setDraft(data ?? {}))
      .catch((e: unknown) => setDraftError(describeError(e, platform)))
      .finally(() => setDrafting(false));
  }

  function sendCampaign() {
    if (!draft?.title || !draft.body) return;
    setSending(true);
    setSendError(null);
    api
      .post<SentCampaign>("/send-campaign", { title: draft.title, body: draft.body, segment: draft.segment ?? segment, channel })
      .then(({ data }) => setSent(data ?? {}))
      .catch((e: unknown) => setSendError(describeError(e, platform)))
      .finally(() => setSending(false));
  }

  function draftOutreach() {
    if (!leadId.trim() || outreaching) return;
    setOutreaching(true);
    setOutreachError(null);
    api
      .post<OutreachDraft>("/draft-outreach", { leadId: leadId.trim() })
      .then(({ data }) => setOutreach(data ?? {}))
      .catch((e: unknown) => setOutreachError(describeError(e, platform)))
      .finally(() => setOutreaching(false));
  }

  return (
    <>
      <AgentHeading
        platform={platform}
        agent={agent}
        blurb="On-site notification campaigns to real, consent-respecting member segments, plus off-site outreach drafts for leads the Lead Gen agent finds."
        actions={
          <>
            <Link href={`/${platform.key}/${agent.key}/campaigns`} className="ag-btn ag-btn-solid">Bulk outreach →</Link>
            <Link href={`/${platform.key}/${agent.key}/chat`} className="ag-btn ag-btn-ghost">Ask this agent →</Link>
          </>
        }
      />

      <div className="ag-metrics">
        <MetricCard icon={<Svg path={Icons.megaphone} size={24} />} tone="pink" title="Segments available" value={segments.loading || segments.error ? "—" : String((segments.data ?? []).length)} />
        <MetricCard icon={<Svg path={Icons.users} size={24} />} tone="blue" title="Drafted audience size" value={draft?.audienceSize !== undefined ? String(draft.audienceSize) : "—"} />
        <MetricCard icon={<Svg path={Icons.send} size={24} />} tone="green" title="Last campaign sent to" value={sent?.sentCount !== undefined ? String(sent.sentCount) : "—"} />
        <MetricCard icon={<Svg path={Icons.check} size={24} />} tone="purple" title="Last campaign status" value={sent?.status ?? "—"} />
      </div>

      <div className="ag-split">
        <div className="ag-stack">
          <Panel title="Draft an on-site campaign" sub="POST /marketing/draft-campaign — audience size is the real, consent-filtered count">
            <div className="ag-form-grid">
              <div className="ag-field">
                <label htmlFor="mkt-segment">Segment</label>
                <select id="mkt-segment" value={segment} onChange={(e) => setSegment(e.target.value)}>
                  {(segments.data ?? ["Active Users"]).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="ag-field">
                <label htmlFor="mkt-goal">Goal</label>
                <input id="mkt-goal" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g. Encourage inactive members to log back in" />
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <button type="button" className="ag-btn ag-btn-accent ag-btn-sm" onClick={draftCampaign} disabled={drafting || !goal.trim()}>
                <Svg path={Icons.sparkle} size={13} /> {drafting ? "Drafting…" : "Draft campaign"}
              </button>
            </div>
            {draftError && <p style={{ margin: "12px 0 0", fontSize: 12, color: "var(--ag-red)" }}>{draftError}</p>}

            {draft && (
              <div style={{ marginTop: 16, padding: 16, borderRadius: 12, background: "var(--ag-bg)", border: "1px solid var(--ag-border)" }}>
                <b style={{ fontSize: 13 }}>{draft.title}</b>
                <p style={{ margin: "8px 0 12px", fontSize: 12.5, color: "var(--ag-ink-soft)", lineHeight: 1.6 }}>{draft.body}</p>
                <p style={{ margin: "0 0 12px", fontSize: 11, color: "var(--ag-ink-faint)" }}>
                  Segment: <b>{draft.segment}</b> · Real audience: <b>{draft.audienceSize ?? "—"}</b> member(s)
                </p>
                <div className="ag-form-grid" style={{ marginBottom: 12, maxWidth: 260 }}>
                  <div className="ag-field">
                    <label htmlFor="mkt-channel">Channel</label>
                    <select id="mkt-channel" value={channel} onChange={(e) => setChannel(e.target.value as typeof channel)}>
                      {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <button type="button" className="ag-btn ag-btn-solid ag-btn-sm" onClick={sendCampaign} disabled={sending}>
                  <Svg path={Icons.send} size={13} /> {sending ? "Sending…" : "Send campaign now"}
                </button>
                {sendError && <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--ag-red)" }}>{sendError}</p>}
                {sent && !sendError && (
                  <p style={{ margin: "10px 0 0", fontSize: 12, fontWeight: 650, color: "var(--ag-green)" }}>
                    Sent — status {sent.status}, reached {sent.sentCount ?? 0} recipient(s).
                  </p>
                )}
              </div>
            )}
          </Panel>

          <Panel title="Draft off-site lead outreach" sub="POST /marketing/draft-outreach — a real Lead Gen agent lead ID, message only, sending stays a human deep-link click">
            <div className="ag-field">
              <label htmlFor="mkt-lead">Lead ID</label>
              <input id="mkt-lead" value={leadId} onChange={(e) => setLeadId(e.target.value)} placeholder="cuid… (from the Lead Gen agent)" />
            </div>
            <div style={{ marginTop: 12 }}>
              <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" onClick={draftOutreach} disabled={outreaching || !leadId.trim()}>
                {outreaching ? "Drafting…" : "Draft outreach"}
              </button>
            </div>
            {outreachError && <p style={{ margin: "12px 0 0", fontSize: 12, color: "var(--ag-red)" }}>{outreachError}</p>}
            {outreach && (
              <div style={{ marginTop: 14, padding: 14, borderRadius: 12, background: "var(--ag-bg)", border: "1px solid var(--ag-border)" }}>
                <b style={{ fontSize: 12.5 }}>{outreach.subject}</b>
                <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--ag-ink-soft)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{outreach.message}</p>
              </div>
            )}
          </Panel>
        </div>

        <div className="ag-stack">
          <Panel title="Available segments" sub="GET /marketing/segments — every send respects notifyMarketing consent">
            {segments.data && segments.data.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {segments.data.map((s) => (
                  <span key={s} className="ag-badge ag-badge-mute">{s}</span>
                ))}
              </div>
            ) : (
              <Empty>{segments.loading ? "Loading…" : "No segments returned."}</Empty>
            )}
          </Panel>

          {segments.error && <ErrorPanel message={segments.error} platform={platform} what="Marketing segments" />}

          <Panel title="Bulk lead outreach" sub="Draft and send personalized outreach to many real leads at once">
            <p style={{ margin: "0 0 12px", fontSize: 12, color: "var(--ag-ink-soft)", lineHeight: 1.7 }}>
              Pick from the Lead Gen agent&apos;s real pending-review queue, draft up to 25 personalized messages in one
              batch, and send by email after a single confirmation step.
            </p>
            <Link href={`/${platform.key}/${agent.key}/campaigns`} className="ag-btn ag-btn-ghost ag-btn-sm">Open Campaigns →</Link>
          </Panel>

          <InsightsPanel
            rows={[
              ...(draft?.audienceSize !== undefined
                ? [{ icon: <Svg path={Icons.users} size={15} />, label: "Real reach", value: `“${draft.segment}” currently resolves to ${draft.audienceSize} member(s) who allow marketing messages.` }]
                : []),
              ...(sent
                ? [{ icon: <Svg path={Icons.send} size={15} />, label: "Last send", value: `Status ${sent.status}, ${sent.sentCount ?? 0} recipient(s) reached.` }]
                : []),
              ...(outreach
                ? [{ icon: <Svg path={Icons.megaphone} size={15} />, label: "Outreach ready", value: "A subject and message are drafted — sending still requires a human to open the WhatsApp/email deep link." }]
                : []),
            ]}
          />
        </div>
      </div>
    </>
  );
}
