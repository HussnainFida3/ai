"use client";

/**
 * Support Agent — Tickets.
 *
 * The whole loaded queue as a table: status tabs, free-text search, a
 * category filter and 12-row pagination, over the rows `useSupportSnapshot`
 * read from GhrFix's /ai-agents/support/tickets or ShadiLife's
 * /admin/reports. Above the table sit two summary donuts (status mix and
 * channel/severity mix) and a ranked category bar list — all recomputed from
 * the rows currently in scope, never hardcoded.
 *
 * GhrFix's Decision column is wired to the real, audited writes
 * (POST /ai-agents/support/disputes/:id/resolve and
 * .../messages/:id/resolve) — resolving a dispute with a note really sends
 * that note to the customer as the resolution notification. ShadiLife's AI
 * Support Agent exposes no resolve/reply-send endpoint of its own (only
 * draft-reply/summarize-thread/faq-suggest, which are AI drafting aids); its
 * real report-resolve lives on a separate plain admin route outside any AI
 * agent, so this stays disabled there with an honest note.
 */

import { useMemo, useState } from "react";
import { useSupportSnapshot, formatAge, formatWhen, resolveGhrfixDispute, resolveGhrfixMessage, type DisputeResolutionStatus } from "@/lib/support-data";
import type { SupportTicket, StatusGroup } from "@/lib/support-data";
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
  type Slice,
} from "@/components/special/kit";

const NAV: NavItem[] = [
  { label: "Overview", icon: "dashboard", slug: "overview" },
  { label: "Tickets", icon: "posts", slug: "tickets" },
  { label: "Escalations", icon: "alert", slug: "escalations" },
  { label: "Performance", icon: "trend", slug: "performance" },
  { label: "Chat with AI Agent", icon: "chat", slug: "chat" },
];

const PAGE_SIZE = 12;

type Tab = "all" | StatusGroup;

const TABS: Array<{ key: Tab; label: string }> = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "investigating", label: "Investigating" },
  { key: "resolved", label: "Resolved" },
  { key: "rejected", label: "Rejected" },
  { key: "other", label: "Other" },
];

/** Status is never carried by colour alone — each pill pairs a glyph with the word. */
const GROUP_STYLE: Record<StatusGroup, { tone: string; icon: string; glyph: string }> = {
  open: { tone: "red", icon: "alert", glyph: "●" },
  investigating: { tone: "amber", icon: "clock", glyph: "◐" },
  resolved: { tone: "green", icon: "check", glyph: "✓" },
  rejected: { tone: "purple", icon: "back", glyph: "✕" },
  other: { tone: "blue", icon: "tag", glyph: "?" },
};

function StatusPill({ ticket }: { ticket: SupportTicket }) {
  const g = GROUP_STYLE[ticket.statusGroup];
  return (
    <Pill tone={g.tone}>
      <span aria-hidden="true">{g.glyph}</span>
      {ticket.status}
    </Pill>
  );
}

export default function SupportTicketsPage({ params }: { params: Promise<{ platform: string }> }) {
  const platform = usePlatformParam(params);
  const s = useSupportSnapshot(platform);
  const label = platformLabel(platform);

  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const notify = (text: string) => {
    setToast(text);
    window.setTimeout(() => setToast(""), 3600);
  };

  async function investigateDispute(id: string, title: string) {
    if (!window.confirm(`Mark the dispute "${title}" as under investigation on GhrFix? This is a real, audited status change.`)) return;
    setBusyId(id);
    try {
      await resolveGhrfixDispute(id, { status: "INVESTIGATING" });
      s.applyGhrDisputeUpdate(id, { status: "INVESTIGATING" });
      notify(`"${title}" is now under investigation.`);
    } catch (err) {
      notify(err instanceof Error ? err.message : "Could not update this dispute.");
    } finally {
      setBusyId(null);
    }
  }

  async function closeDispute(id: string, title: string, status: DisputeResolutionStatus) {
    const verb = status === "RESOLVED" ? "Resolve" : "Reject";
    const note = window.prompt(
      `${verb} the dispute "${title}" on GhrFix? Your note is sent to the customer as the resolution message — leave blank for a generic notice, or press Cancel to abort.`,
      "",
    );
    if (note === null) return;
    setBusyId(id);
    try {
      await resolveGhrfixDispute(id, { status, resolutionNote: note || undefined });
      s.applyGhrDisputeUpdate(id, { status, resolutionNote: note || null });
      notify(`"${title}" marked ${status.toLowerCase()}${note ? " — the customer was notified with your note." : "."}`);
    } catch (err) {
      notify(err instanceof Error ? err.message : `Could not ${verb.toLowerCase()} this dispute.`);
    } finally {
      setBusyId(null);
    }
  }

  async function resolveMessage(id: string, title: string) {
    if (!window.confirm(`Mark the message "${title}" as resolved on GhrFix? This is a real, audited write.`)) return;
    setBusyId(id);
    try {
      await resolveGhrfixMessage(id);
      s.applyGhrMessageUpdate(id, { status: "RESOLVED" });
      notify(`"${title}" marked resolved.`);
    } catch (err) {
      notify(err instanceof Error ? err.message : "Could not resolve this message.");
    } finally {
      setBusyId(null);
    }
  }

  const categories = useMemo(() => [...new Set(s.tickets.map((t) => t.category))].sort(), [s.tickets]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return s.tickets.filter((t) => {
      if (tab !== "all" && t.statusGroup !== tab) return false;
      if (category !== "all" && t.category !== category) return false;
      if (q && ![t.title, t.raisedBy, t.category, t.detail ?? "", t.status].some((f) => f.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [s.tickets, tab, category, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  /* Both donuts describe the rows currently in scope, so the charts and the
     table can never disagree. SERIES is assigned in fixed order per chart. */
  const statusMix: Slice[] = useMemo(() => {
    const order: StatusGroup[] = ["open", "investigating", "resolved", "rejected", "other"];
    return order
      .map((g, i) => ({ label: TABS.find((t) => t.key === g)?.label ?? g, value: filtered.filter((t) => t.statusGroup === g).length, color: SERIES[i] }))
      .filter((r) => r.value > 0);
  }, [filtered]);

  const secondMix: Slice[] = useMemo(() => {
    const hasSeverity = filtered.some((t) => t.severity !== null);
    const keys = hasSeverity
      ? [...new Set(filtered.map((t) => t.severity).filter((x): x is string => x !== null))]
      : [...new Set(filtered.map((t) => t.kind))];
    return keys
      .map((k, i) => ({
        label: k,
        value: filtered.filter((t) => (hasSeverity ? t.severity === k : t.kind === k)).length,
        color: SERIES[i % SERIES.length],
      }))
      .filter((r) => r.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [filtered]);

  const secondMixTitle = filtered.some((t) => t.severity !== null) ? "Severity mix (rows in scope)" : "Channel mix (rows in scope)";

  const categoryBars: Slice[] = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of filtered) map.set(t.category, (map.get(t.category) ?? 0) + 1);
    return [...map.entries()]
      .map(([labelText, value]) => ({ label: labelText, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
      .map((r, i) => ({ ...r, color: SERIES[i % SERIES.length] }));
  }, [filtered]);

  function reset(next: () => void) {
    next();
    setPage(1);
  }

  /** One cell of the Decision column — branches on real ticket kind, platform and current status. */
  function renderAction(t: SupportTicket) {
    const busy = busyId === t.id;
    if (t.statusGroup === "resolved" || t.statusGroup === "rejected") {
      return <Pill tone={GROUP_STYLE[t.statusGroup].tone}><span aria-hidden="true">{GROUP_STYLE[t.statusGroup].glyph}</span>Closed</Pill>;
    }
    if (t.kind === "Booking dispute") {
      return (
        <div className="cs-support-actions">
          {t.status === "OPEN" && (
            <button type="button" className="cs-btn" disabled={busy} onClick={() => investigateDispute(t.id, t.title)}>
              {busy ? "…" : "Investigate"}
            </button>
          )}
          <button type="button" className="cs-btn" disabled={busy} onClick={() => closeDispute(t.id, t.title, "RESOLVED")}>
            {busy ? "…" : "Resolve"}
          </button>
          <button type="button" className="cs-btn" disabled={busy} onClick={() => closeDispute(t.id, t.title, "REJECTED")}>
            Reject
          </button>
        </div>
      );
    }
    if (t.kind === "Contact message") {
      return (
        <button type="button" className="cs-btn" disabled={busy} onClick={() => resolveMessage(t.id, t.title)}>
          {busy ? "…" : "Resolve"}
        </button>
      );
    }
    return (
      <button type="button" className="cs-btn cs-support-inert" disabled title="ShadiLife's Support Agent exposes no resolve endpoint — report status changes through the admin moderation queue, outside any AI agent.">
        No agent endpoint
      </button>
    );
  }

  const unresolvedInScope = filtered.filter((t) => t.statusGroup === "open" || t.statusGroup === "investigating").length;
  const agedInScope = filtered.filter((t) => t.ageDays !== null && t.ageDays >= 7).length;

  return (
    <SpecialShell
      platform={platform}
      agentLabel="Support Agent"
      tagline="Support workspace"
      basePath="/support-agent-special"
      nav={NAV}
      headerIcon="posts"
      assistantBlurb="Every row here is a real ticket the backend returned — I never invent one."
      title="Tickets"
      subtitle={s.domain}
      actions={
        <Pill tone={s.error ? "red" : s.loading ? "amber" : "green"}>
          <Icon name={s.error ? "alert" : s.loading ? "clock" : "check"} size={12} />
          {s.error ? "Queue failed to load" : s.loading ? "Loading queue" : `${s.tickets.length.toLocaleString()} rows loaded`}
        </Pill>
      }
    >
      <style>{PAGE_CSS}</style>

      {s.error && <ErrorNote error={s.error} platform={platform} />}

      <Card>
        <p className="cs-support-source">
          <Icon name="tag" size={13} />
          <span>
            <b>{s.sourceNote}</b> {s.error ? "This session's fetch failed, so the table below is empty for that reason — not because the queue is clear." : s.coverageNote}
          </span>
        </p>
      </Card>

      <div className="cs-stats">
        <StatCard label="Rows In Scope" value={s.loading || s.error ? "—" : filtered.length.toLocaleString()} sub={`Of ${s.tickets.length.toLocaleString()} loaded, after tabs, search and filter`} tone="purple" icon="posts" />
        <StatCard label="Unresolved In Scope" value={s.loading || s.error ? "—" : unresolvedInScope.toLocaleString()} sub="Rows still at open or investigating" tone="red" icon="alert" />
        <StatCard label="Over 7 Days Old" value={s.loading || s.error ? "—" : agedInScope.toLocaleString()} sub="Measured from each row's own createdAt" tone="amber" icon="clock" />
        <StatCard label="Distinct Categories" value={s.loading || s.error ? "—" : categories.length.toLocaleString()} sub="Distinct category / reason values in the queue" tone="cyan" icon="tag" />
      </div>

      <div className="cs-row-3">
        <Card title="Status mix (rows in scope)">
          {s.loading ? (
            <Empty>Loading the live queue…</Empty>
          ) : s.error ? (
            <Empty>The queue did not load, so no status mix can be shown or assessed.</Empty>
          ) : statusMix.length === 0 ? (
            <Empty>No rows match the current tab, search and filter.</Empty>
          ) : (
            <div className="cs-donut-row">
              <Donut data={statusMix} center={filtered.length.toLocaleString()} centerLabel="tickets" />
              <Legend data={statusMix} />
            </div>
          )}
        </Card>

        <Card title={secondMixTitle}>
          {s.loading ? (
            <Empty>Loading…</Empty>
          ) : s.error ? (
            <Empty>Not available — the queue did not load.</Empty>
          ) : secondMix.length === 0 ? (
            <Empty>{`No rows in scope, so there is nothing to break down. ${label} records ${platform === "ghrfix" ? "no severity scale on support tickets" : "one report channel only"}.`}</Empty>
          ) : (
            <div className="cs-donut-row">
              <Donut data={secondMix} center={filtered.length.toLocaleString()} centerLabel="tickets" />
              <Legend data={secondMix} />
            </div>
          )}
        </Card>

        <Card title="Top categories (rows in scope)">
          {s.loading ? (
            <Empty>Loading…</Empty>
          ) : s.error ? (
            <Empty>Not available — the queue did not load.</Empty>
          ) : categoryBars.length === 0 ? (
            <Empty>No rows match the current tab, search and filter.</Empty>
          ) : (
            <>
              <BarRows rows={categoryBars} colored />
              <Legend data={categoryBars} />
            </>
          )}
        </Card>
      </div>

      <Card pad={false}>
        <div className="cs-support-toolbar">
          <div className="cs-tabs">
            {TABS.map((t) => {
              const count = s.tickets.filter((x) => t.key === "all" || x.statusGroup === t.key).length;
              if (t.key !== "all" && count === 0) return null;
              return (
                <button key={t.key} type="button" className={tab === t.key ? "cs-tab active" : "cs-tab"} onClick={() => reset(() => setTab(t.key))}>
                  {t.label} ({count.toLocaleString()})
                </button>
              );
            })}
          </div>

          <div className="cs-support-controls">
            <label className="cs-search">
              <Icon name="search" size={14} />
              <input
                value={search}
                onChange={(e) => reset(() => setSearch(e.target.value))}
                placeholder="Search title, sender, category…"
                aria-label="Search tickets"
              />
            </label>

            <select className="cs-support-select" value={category} onChange={(e) => reset(() => setCategory(e.target.value))} aria-label="Filter by category">
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {s.loading ? (
          <div className="cs-support-pad">
            <Empty>Loading the live queue…</Empty>
          </div>
        ) : s.error ? (
          <div className="cs-support-pad">
            <Empty>The queue could not be read this session. This table is empty because the fetch failed — not because there are no tickets.</Empty>
          </div>
        ) : s.tickets.length === 0 ? (
          <div className="cs-support-pad">
            <Empty>{`The fetch succeeded and ${label} returned zero rows — the queue is genuinely empty.`}</Empty>
          </div>
        ) : rows.length === 0 ? (
          <div className="cs-support-pad">
            <Empty>No loaded row matches the current tab, search and filter.</Empty>
          </div>
        ) : (
          <>
            <div className="cs-table-wrap">
              <table className="cs-table">
                <thead>
                  <tr>
                    <th>Ticket</th>
                    <th>Kind</th>
                    <th>Category</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th className="cs-num">Age</th>
                    <th className="cs-num">Raised</th>
                    <th style={{ paddingRight: 19 }}>Decision</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <div className="title">{t.title}</div>
                        <div className="sub">
                          {t.raisedBy}
                          {t.detail ? ` · ${t.detail.slice(0, 70)}${t.detail.length > 70 ? "…" : ""}` : ""}
                        </div>
                      </td>
                      <td>{t.kind}</td>
                      <td>{t.category}</td>
                      <td>{t.severity ?? <span className="cs-support-dash">Not tracked</span>}</td>
                      <td>
                        <StatusPill ticket={t} />
                      </td>
                      <td className="cs-num">{formatAge(t.ageDays)}</td>
                      <td className="cs-num">{formatWhen(t.createdAt)}</td>
                      <td style={{ paddingRight: 19 }}>{renderAction(t)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="cs-support-pager">
              <span className="cs-support-meta">
                Showing {(current - 1) * PAGE_SIZE + 1}–{Math.min(current * PAGE_SIZE, filtered.length)} of {filtered.length.toLocaleString()}
              </span>
              <div className="cs-support-pager-btns">
                <button type="button" className="cs-btn" disabled={current <= 1} onClick={() => setPage(current - 1)}>
                  <Icon name="back" size={13} /> Prev
                </button>
                <span className="cs-support-meta">Page {current} of {totalPages}</span>
                <button type="button" className="cs-btn" disabled={current >= totalPages} onClick={() => setPage(current + 1)}>
                  Next <Icon name="arrow" size={13} />
                </button>
              </div>
            </div>
          </>
        )}

        <p className="cs-support-readonly">
          <Icon name="eye" size={13} />
          <span>
            {platform === "ghrfix"
              ? "Investigate, Resolve and Reject call GhrFix's real POST /ai-agents/support/disputes or messages/:id/resolve — resolving a dispute with a note really notifies the customer."
              : "ShadiLife's Support Agent exposes no resolve or reply-send endpoint of its own — draft-reply, summarize-thread and faq-suggest are AI drafting aids only. Report status changes through the admin moderation queue, outside any AI agent."}
          </span>
        </p>
      </Card>

      {toast && <div className="cs-support-toast" role="status">{toast}</div>}
    </SpecialShell>
  );
}

/* Page-local styles only. Every selector is `cs-support-` prefixed so nothing
   here can leak into the shared kit or any other special workspace. */
const PAGE_CSS = `
.cs-support-source{margin:0;display:flex;gap:9px;align-items:flex-start;font-size:11.5px;line-height:19px;color:#cbd5e1}
.cs-support-source svg{color:#7c3aed;flex:0 0 auto;margin-top:3px}
.cs-support-source b{color:#11162d}
.cs-support-meta{font-size:11px;color:#94a3b8}
.cs-support-toolbar{display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;padding:12px 19px 0}
.cs-support-controls{display:flex;gap:9px;flex-wrap:wrap;padding-bottom:10px}
.cs-support-select{height:36px;padding:0 10px;border:1px solid rgba(255,255,255,.09);border-radius:8px;background:#0b1220;font-size:12px;color:#11162d;max-width:220px}
.cs-support-pad{padding:14px 19px}
.cs-support-dash{color:#94a3b8;font-size:10.5px}
.cs-support-pager{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;padding:12px 19px}
.cs-support-pager-btns{display:flex;gap:10px;align-items:center}
.cs-support-readonly{display:flex;gap:9px;align-items:flex-start;margin:0;padding:12px 19px 16px;border-top:1px solid rgba(255,255,255,.07);font-size:11px;line-height:18px;color:#94a3b8}
.cs-support-readonly svg{color:#94a3b8;flex:0 0 auto;margin-top:2px}
.cs-support-actions{display:flex;gap:6px;flex-wrap:wrap}
.cs-support-inert{opacity:.55;cursor:not-allowed;white-space:nowrap}
.cs-support-toast{position:fixed;right:22px;bottom:22px;max-width:380px;background:#11162f;color:#fff;border-radius:10px;padding:12px 16px;font-size:12.5px;line-height:18px;box-shadow:0 14px 32px rgba(20,20,45,.28);z-index:50}
`;
