"use client";

/**
 * ShadiLife — Marketing Agent — Campaigns (domain tab).
 *
 * Real endpoints behind this page:
 *   GET  /api/ai-agents/leadgen/leads                                    → real AgentLead rows (cross-agent read, same as Support reading /admin/reports)
 *   POST /api/ai-agents/marketing/draft-bulk-outreach   { category, contactFilter, goal } → { subject, body, matchCount } — one generic message for a filtered group
 *   POST /api/ai-agents/marketing/draft-outreach-bulk   { leadIds }       → { drafts[] } — one personalized AI call per selected lead (max 25)
 *   POST /api/ai-agents/marketing/send-bulk-email       { items, confirm: true } → { sent, skippedNoEmail, failed } (real write)
 *
 * The Dashboard tab keeps the single on-site campaign composer and the
 * single-lead outreach draft; this page is the bulk workflow those don't
 * cover — pick real leads from the Lead Gen agent's own queue, draft
 * outreach for many at once, and send by email in one confirmed batch.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { AgentHeading } from "@/components/agents/AgentShell";
import { MetricCard, Svg } from "@/components/agents/rich";
import { Icons } from "@/components/agents/icons";
import { apiFetch } from "@/lib/api";
import type { AgentViewProps } from "../../registry";
import { Empty, ErrorPanel, Panel, TableScroll, arr, describeError, fmtInt, useAsync } from "../../shadilife/_shadilife-console-kit";

interface AgentLead {
  id: string;
  bureauName?: string | null;
  city?: string | null;
  category?: string | null;
  leadType?: "B2B" | "B2C";
  contactEmail?: string | null;
  contactPhone?: string | null;
  status?: string;
}
interface BulkDraft {
  leadId: string;
  bureauName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  subject: string;
  message: string;
}
interface GenericDraft {
  subject?: string;
  message?: string;
  matchCount?: number;
}
interface SendResult {
  sent?: number;
  skippedNoEmail?: number;
  failed?: number;
}

const MAX_SELECT = 25;

export default function ShadiLifeMarketingCampaignsView({ platform, agent, api }: AgentViewProps) {
  const leads = useAsync<AgentLead[]>(
    platform,
    async () => arr<AgentLead>((await apiFetch<AgentLead[]>(platform.key, "/ai-agents/leadgen/leads", { query: { status: "PENDING_REVIEW" } })).data),
    true,
  );

  const [typeFilter, setTypeFilter] = useState<"all" | "B2B" | "B2C">("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const rows = leads.data ?? [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((l) => {
      if (typeFilter !== "all" && l.leadType !== typeFilter) return false;
      if (q && !`${l.bureauName ?? ""} ${l.category ?? ""} ${l.city ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, typeFilter, search]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < MAX_SELECT) next.add(id);
      return next;
    });
  }

  /* ── bulk personalized drafting ────────────────────────────────── */
  const [drafts, setDrafts] = useState<BulkDraft[] | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [sendResult, setSendResult] = useState<SendResult | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  function draftBulk() {
    if (selected.size === 0 || drafting) return;
    setDrafting(true);
    setDraftError(null);
    setSendResult(null);
    api
      .post<{ drafts?: BulkDraft[] }>("/draft-outreach-bulk", { leadIds: [...selected] })
      .then(({ data }) => setDrafts(data?.drafts ?? []))
      .catch((e: unknown) => setDraftError(describeError(e, platform)))
      .finally(() => setDrafting(false));
  }

  function sendBulkEmail() {
    if (!drafts || drafts.length === 0 || sending) return;
    setSending(true);
    setSendError(null);
    api
      .post<SendResult>("/send-bulk-email", {
        items: drafts.map((d) => ({ leadId: d.leadId, subject: d.subject, message: d.message })),
        confirm: true,
      })
      .then(({ data }) => setSendResult(data ?? {}))
      .catch((e: unknown) => setSendError(describeError(e, platform)))
      .finally(() => setSending(false));
  }

  /* ── generic bulk outreach for a filtered category ───────────────── */
  const [category, setCategory] = useState("");
  const [contactFilter, setContactFilter] = useState<"any" | "phone" | "email" | "website" | "none">("any");
  const [goal, setGoal] = useState("");
  const [genericDraft, setGenericDraft] = useState<GenericDraft | null>(null);
  const [draftingGeneric, setDraftingGeneric] = useState(false);
  const [genericError, setGenericError] = useState<string | null>(null);

  function draftGeneric() {
    if (draftingGeneric) return;
    setDraftingGeneric(true);
    setGenericError(null);
    api
      .post<GenericDraft>("/draft-bulk-outreach", { category: category.trim() || undefined, contactFilter, goal: goal.trim() || undefined })
      .then(({ data }) => setGenericDraft(data ?? {}))
      .catch((e: unknown) => setGenericError(describeError(e, platform)))
      .finally(() => setDraftingGeneric(false));
  }

  const withEmail = drafts?.filter((d) => d.contactEmail).length ?? 0;

  return (
    <>
      <AgentHeading
        platform={platform}
        agent={agent}
        blurb="Bulk lead outreach — pick real leads from the Lead Gen queue, draft personalized messages for up to 25 at once, and send by email in one confirmed batch."
        actions={<Link href={`/${platform.key}/${agent.key}`} className="ag-btn ag-btn-ghost">← Dashboard</Link>}
      />

      {leads.error && <ErrorPanel message={leads.error} platform={platform} what="The lead queue" />}

      <div className="ag-metrics">
        <MetricCard icon={<Svg path={Icons.users} size={24} />} tone="blue" title="Leads pending review" value={leads.loading ? "—" : fmtInt(rows.length)} />
        <MetricCard icon={<Svg path={Icons.target} size={24} />} tone="purple" title="Selected for this batch" value={`${selected.size} / ${MAX_SELECT}`} />
        <MetricCard icon={<Svg path={Icons.sparkle} size={24} />} tone="pink" title="Drafts ready" value={drafts ? String(drafts.length) : "—"} />
        <MetricCard icon={<Svg path={Icons.send} size={24} />} tone="green" title="Sent this batch" value={sendResult?.sent !== undefined ? String(sendResult.sent) : "—"} />
      </div>

      <div className="ag-split">
        <div className="ag-stack">
          <Panel
            title="Pick leads for a bulk batch"
            sub="Real leads pending review from the Lead Gen agent — select up to 25"
            flush
            actions={
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}>
                  <option value="all">All types</option>
                  <option value="B2B">B2B</option>
                  <option value="B2C">B2C</option>
                </select>
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name/category/city…" style={{ maxWidth: 220 }} />
              </div>
            }
          >
            {filtered.length > 0 ? (
              <TableScroll>
                <table className="ag-table">
                  <thead>
                    <tr><th /><th>Business</th><th>Category</th><th>Contact</th></tr>
                  </thead>
                  <tbody>
                    {filtered.slice(0, 100).map((l) => (
                      <tr key={l.id} onClick={() => toggle(l.id)} style={{ cursor: "pointer" }}>
                        <td style={{ width: 28 }}>
                          <input type="checkbox" checked={selected.has(l.id)} onChange={() => toggle(l.id)} onClick={(e) => e.stopPropagation()} />
                        </td>
                        <td style={{ fontWeight: 650 }}>{l.bureauName || "—"}<div style={{ fontSize: 10.5, color: "var(--ag-ink-faint)", fontWeight: 400 }}>{l.city || "—"}</div></td>
                        <td style={{ fontSize: 11.5, color: "var(--ag-ink-soft)" }}>{l.category || "—"}</td>
                        <td style={{ fontSize: 11, color: "var(--ag-ink-faint)" }}>{l.contactEmail ? "Email" : l.contactPhone ? "Phone" : "None on file"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableScroll>
            ) : (
              <div style={{ padding: 20 }}>
                <Empty>{leads.loading ? "Loading the lead queue…" : "No pending-review lead matches this filter."}</Empty>
              </div>
            )}
          </Panel>

          <Panel title="Draft personalized bulk outreach" sub="POST /marketing/draft-outreach-bulk — one AI call per selected lead">
            <button type="button" className="ag-btn ag-btn-accent ag-btn-sm" onClick={draftBulk} disabled={selected.size === 0 || drafting}>
              <Svg path={Icons.sparkle} size={13} /> {drafting ? "Drafting…" : `Draft outreach for ${selected.size} lead(s)`}
            </button>
            {draftError && <p style={{ margin: "12px 0 0", fontSize: 12, color: "var(--ag-red)" }}>{draftError}</p>}

            {drafts && drafts.length > 0 && (
              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                {drafts.map((d) => (
                  <div key={d.leadId} style={{ padding: 13, borderRadius: 11, background: "var(--ag-bg)", border: "1px solid var(--ag-border)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <b style={{ fontSize: 12.5 }}>{d.bureauName || d.leadId}</b>
                      <span style={{ fontSize: 10.5, color: d.contactEmail ? "var(--ag-green)" : "var(--ag-ink-faint)" }}>{d.contactEmail || "No email on file"}</span>
                    </div>
                    <p style={{ margin: "6px 0 0", fontSize: 11.5, color: "var(--ag-ink-soft)", lineHeight: 1.6 }}>{d.subject}</p>
                    <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--ag-ink-faint)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{d.message}</p>
                  </div>
                ))}

                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
                  <button type="button" className="ag-btn ag-btn-solid ag-btn-sm" onClick={sendBulkEmail} disabled={sending || withEmail === 0}>
                    <Svg path={Icons.send} size={13} /> {sending ? "Sending…" : `Send by email (${withEmail} with an address)`}
                  </button>
                </div>
                {sendError && <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--ag-red)" }}>{sendError}</p>}
                {sendResult && !sendError && (
                  <p style={{ margin: "10px 0 0", fontSize: 12, fontWeight: 650, color: "var(--ag-green)" }}>
                    Sent {sendResult.sent ?? 0} · skipped (no email) {sendResult.skippedNoEmail ?? 0} · failed {sendResult.failed ?? 0}
                  </p>
                )}
              </div>
            )}
          </Panel>
        </div>

        <div className="ag-stack">
          <Panel title="Generic bulk outreach" sub="POST /marketing/draft-bulk-outreach — one reusable message for a whole filtered category">
            <div className="ag-form-grid">
              <div className="ag-field">
                <label htmlFor="mkt-cat">Category (optional)</label>
                <input id="mkt-cat" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. wedding photographer" />
              </div>
              <div className="ag-field">
                <label htmlFor="mkt-contact">Has contact info</label>
                <select id="mkt-contact" value={contactFilter} onChange={(e) => setContactFilter(e.target.value as typeof contactFilter)}>
                  <option value="any">Any</option>
                  <option value="phone">Phone</option>
                  <option value="email">Email</option>
                  <option value="website">Website</option>
                  <option value="none">None on file</option>
                </select>
              </div>
            </div>
            <div className="ag-field" style={{ marginTop: 10 }}>
              <label htmlFor="mkt-goal2">Extra context (optional)</label>
              <input id="mkt-goal2" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g. invite to become a referral partner" />
            </div>
            <div style={{ marginTop: 12 }}>
              <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" onClick={draftGeneric} disabled={draftingGeneric}>
                {draftingGeneric ? "Drafting…" : "Draft generic message"}
              </button>
            </div>
            {genericError && <p style={{ margin: "12px 0 0", fontSize: 12, color: "var(--ag-red)" }}>{genericError}</p>}
            {genericDraft && (
              <div style={{ marginTop: 14, padding: 14, borderRadius: 12, background: "var(--ag-bg)", border: "1px solid var(--ag-border)" }}>
                <b style={{ fontSize: 12.5 }}>{genericDraft.subject}</b>
                <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--ag-ink-soft)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{genericDraft.message}</p>
                {genericDraft.matchCount !== undefined && (
                  <p style={{ margin: "10px 0 0", fontSize: 11, color: "var(--ag-ink-faint)" }}>Matches {fmtInt(genericDraft.matchCount)} business(es) on file right now.</p>
                )}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
