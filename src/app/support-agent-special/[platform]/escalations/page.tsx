"use client";

/**
 * Support Agent — Escalations.
 *
 * The escalated subset of the same queue `useSupportSnapshot` loads: rows
 * still unresolved that are HIGH/CRITICAL severity (ShadiLife only — GhrFix
 * records no severity), sit in INVESTIGATING, or have been open three days
 * or more. The exact rule is printed on the page rather than assumed.
 *
 * Charts: a priority donut (severity where it exists, lifecycle where it does
 * not), an age-bucket donut, ranked age and category bars, and a table of the
 * worst offenders sorted by severity then age.
 *
 * The Decision column on that table is wired the same way the Tickets page
 * is: real GhrFix writes (POST /ai-agents/support/disputes or
 * messages/:id/resolve — resolving a dispute with a note really notifies the
 * customer), disabled on ShadiLife with an honest note (its Support Agent
 * exposes no resolve/reply-send endpoint; the real report-resolve lives on a
 * separate plain admin route outside any AI agent). Resolving a row here
 * removes it from the escalated list on the next render, since it is no
 * longer open/investigating.
 */

import { useMemo, useState } from "react";
import { useSupportSnapshot, formatAge, formatWhen, severityRank, resolveGhrfixDispute, resolveGhrfixMessage, type DisputeResolutionStatus } from "@/lib/support-data";
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

const GROUP_STYLE: Record<StatusGroup, { tone: string; glyph: string }> = {
  open: { tone: "red", glyph: "●" },
  investigating: { tone: "amber", glyph: "◐" },
  resolved: { tone: "green", glyph: "✓" },
  rejected: { tone: "purple", glyph: "✕" },
  other: { tone: "blue", glyph: "?" },
};

/** Severity is shown as a word plus a glyph — never colour alone. */
function severityPill(sev: string | null) {
  if (sev === null) return <span className="cs-support-dash">Not tracked</span>;
  const rank = severityRank(sev);
  const tone = rank >= 4 ? "red" : rank === 3 ? "amber" : rank === 2 ? "cyan" : "blue";
  const glyph = rank >= 4 ? "▲▲" : rank === 3 ? "▲" : rank === 2 ? "■" : "▬";
  return (
    <Pill tone={tone}>
      <span aria-hidden="true">{glyph}</span>
      {sev}
    </Pill>
  );
}

type Sort = "severity" | "age";

export default function SupportEscalationsPage({ params }: { params: Promise<{ platform: string }> }) {
  const platform = usePlatformParam(params);
  const s = useSupportSnapshot(platform);
  const label = platformLabel(platform);

  const [sort, setSort] = useState<Sort>("severity");

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

  /** One cell of the Decision column — same branching as the Tickets page. */
  function renderAction(t: SupportTicket) {
    const busy = busyId === t.id;
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

  const rows = useMemo(() => {
    const copy = [...s.escalations];
    if (sort === "age") return copy.sort((a, b) => (b.ageDays ?? -1) - (a.ageDays ?? -1));
    return copy; // The hook already ranks severity first, then age.
  }, [s.escalations, sort]);

  const hasSeverity = s.escalations.some((t) => t.severity !== null);

  /* Priority mix: the real severity scale where the platform records one,
     the lifecycle bucket where it does not. Both carry a direct legend. */
  const priorityMix: Slice[] = useMemo(() => {
    if (hasSeverity) {
      const order = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
      return order
        .map((sev, i) => ({ label: sev, value: s.escalations.filter((t) => t.severity === sev).length, color: SERIES[i] }))
        .filter((r) => r.value > 0);
    }
    const groups: StatusGroup[] = ["open", "investigating"];
    return groups
      .map((g, i) => ({ label: g === "open" ? "Open" : "Investigating", value: s.escalations.filter((t) => t.statusGroup === g).length, color: SERIES[i] }))
      .filter((r) => r.value > 0);
  }, [s.escalations, hasSeverity]);

  const ageMix: Slice[] = useMemo(
    () => s.ageBuckets.rows.map((r, i) => ({ ...r, color: SERIES[i % SERIES.length] })),
    [s.ageBuckets.rows],
  );

  const escalatedAgeBars: Slice[] = useMemo(() => {
    const bands: Array<[string, (d: number) => boolean]> = [
      ["Under 1 day", (d) => d === 0],
      ["1–3 days", (d) => d >= 1 && d <= 3],
      ["4–7 days", (d) => d >= 4 && d <= 7],
      ["8–30 days", (d) => d >= 8 && d <= 30],
      ["Over 30 days", (d) => d > 30],
    ];
    return bands
      .map(([labelText, test], i) => ({
        label: labelText,
        value: s.escalations.filter((t) => t.ageDays !== null && test(t.ageDays)).length,
        color: SERIES[i % SERIES.length],
      }))
      .filter((r) => r.value > 0);
  }, [s.escalations]);

  const categoryBars: Slice[] = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of s.escalations) map.set(t.category, (map.get(t.category) ?? 0) + 1);
    return [...map.entries()]
      .map(([labelText, value]) => ({ label: labelText, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
      .map((r, i) => ({ ...r, color: SERIES[i % SERIES.length] }));
  }, [s.escalations]);

  const worstAge = s.escalations.reduce<number | null>((worst, t) => (t.ageDays === null ? worst : worst === null || t.ageDays > worst ? t.ageDays : worst), null);
  const criticalCount = s.escalations.filter((t) => severityRank(t.severity) >= 4).length;
  const escalatedShare = s.tickets.length > 0 ? Math.round((s.escalations.length / s.tickets.length) * 1000) / 10 : null;

  return (
    <SpecialShell
      platform={platform}
      agentLabel="Support Agent"
      tagline="Support workspace"
      basePath="/support-agent-special"
      nav={NAV}
      headerIcon="alert"
      assistantBlurb="I flag the rows that have aged or been marked severe — using the platform's own fields."
      title="Escalations"
      subtitle={`Aged and severe rows in the ${label} support queue`}
      actions={
        <Pill tone={s.error ? "red" : s.loading ? "amber" : s.escalations.length > 0 ? "amber" : "green"}>
          <Icon name={s.error ? "alert" : s.loading ? "clock" : "check"} size={12} />
          {s.error ? "Queue failed to load" : s.loading ? "Loading queue" : `${s.escalations.length.toLocaleString()} escalated`}
        </Pill>
      }
    >
      <style>{PAGE_CSS}</style>

      {s.error && <ErrorNote error={s.error} platform={platform} />}

      <Card>
        <p className="cs-support-source">
          <Icon name="target" size={13} />
          <span>
            <b>How escalation is decided here:</b> {s.escalationRule}{" "}
            {s.error ? "The queue failed to load this session, so no row could be evaluated against it." : s.coverageNote}
          </span>
        </p>
      </Card>

      <div className="cs-stats">
        <StatCard label="Escalated Rows" value={s.loading || s.error ? "—" : s.escalations.length.toLocaleString()} sub="Unresolved rows meeting the rule above" tone="red" icon="alert" />
        <StatCard
          label="Critical Severity"
          value={s.loading || s.error ? "—" : hasSeverity ? criticalCount.toLocaleString() : "Not tracked"}
          sub={hasSeverity ? "Rows marked CRITICAL by the backend" : `${label} records no severity scale on support tickets`}
          tone="amber"
          icon="target"
        />
        <StatCard
          label="Oldest Escalation"
          value={s.loading || s.error ? "—" : worstAge === null ? "Not tracked" : formatAge(worstAge)}
          sub={worstAge === null ? "No escalated row carries a createdAt timestamp" : "Measured from its own createdAt"}
          tone="cyan"
          icon="clock"
        />
        <StatCard
          label="Share Of Queue"
          value={s.loading || s.error || escalatedShare === null ? "—" : `${escalatedShare}%`}
          sub="Escalated rows over every loaded row"
          tone="purple"
          icon="trend"
        />
      </div>

      <div className="cs-row-half">
        <Card title={hasSeverity ? "Priority breakdown (severity)" : "Priority breakdown (lifecycle)"}>
          {s.loading ? (
            <Empty>Loading the live queue…</Empty>
          ) : s.error ? (
            <Empty>The queue did not load, so escalation priority cannot be shown or assessed.</Empty>
          ) : priorityMix.length === 0 ? (
            <Empty>{`The fetch succeeded and no loaded ${label} row met the escalation rule — nothing to prioritise.`}</Empty>
          ) : (
            <>
              <div className="cs-donut-row">
                <Donut data={priorityMix} center={s.escalations.length.toLocaleString()} centerLabel="escalated" />
                <Legend data={priorityMix} />
              </div>
              <p className="cs-support-note">
                {hasSeverity
                  ? "The backend's own severity field on each escalated row."
                  : `${label} records no severity scale on support tickets, so escalations are grouped by lifecycle state instead.`}
              </p>
            </>
          )}
        </Card>

        <Card title="Unresolved queue by age" action={<span className="cs-support-meta">{s.ageBuckets.total.toLocaleString()} unresolved</span>}>
          {s.loading ? (
            <Empty>Loading…</Empty>
          ) : s.error ? (
            <Empty>Age is measured from loaded rows — none loaded, so it cannot be assessed.</Empty>
          ) : ageMix.length === 0 ? (
            <Empty>No unresolved row carries a usable createdAt timestamp, so no age profile can be drawn.</Empty>
          ) : (
            <>
              <div className="cs-donut-row">
                <Donut data={ageMix} center={s.ageBuckets.total.toLocaleString()} centerLabel="tickets" />
                <Legend data={ageMix} />
              </div>
              <p className="cs-support-note">{s.ageBuckets.note}</p>
            </>
          )}
        </Card>
      </div>

      <div className="cs-row-half">
        <Card title="Escalated rows by age band">
          {s.loading ? (
            <Empty>Loading…</Empty>
          ) : s.error ? (
            <Empty>Not available — the queue did not load.</Empty>
          ) : escalatedAgeBars.length === 0 ? (
            <Empty>No escalated row carries a createdAt timestamp to bucket by.</Empty>
          ) : (
            <>
              <BarRows rows={escalatedAgeBars} colored />
              <Legend data={escalatedAgeBars} />
            </>
          )}
        </Card>

        <Card title="Escalated rows by category">
          {s.loading ? (
            <Empty>Loading…</Empty>
          ) : s.error ? (
            <Empty>Not available — the queue did not load.</Empty>
          ) : categoryBars.length === 0 ? (
            <Empty>No escalated rows, so there is no category ranking to draw.</Empty>
          ) : (
            <>
              <BarRows rows={categoryBars} colored />
              <Legend data={categoryBars} />
            </>
          )}
        </Card>
      </div>

      <Card
        title="Worst offenders"
        action={
          <div className="cs-tabs cs-support-sort">
            <button type="button" className={sort === "severity" ? "cs-tab active" : "cs-tab"} onClick={() => setSort("severity")}>
              By severity
            </button>
            <button type="button" className={sort === "age" ? "cs-tab active" : "cs-tab"} onClick={() => setSort("age")}>
              By age
            </button>
          </div>
        }
        pad={false}
      >
        {s.loading ? (
          <div className="cs-support-pad">
            <Empty>Loading the live queue…</Empty>
          </div>
        ) : s.error ? (
          <div className="cs-support-pad">
            <Empty>The queue could not be read this session, so no escalation can be listed or ruled out. This table is empty because the fetch failed.</Empty>
          </div>
        ) : s.tickets.length === 0 ? (
          <div className="cs-support-pad">
            <Empty>{`The fetch succeeded and ${label} returned zero rows — there is nothing in the queue to escalate.`}</Empty>
          </div>
        ) : rows.length === 0 ? (
          <div className="cs-support-pad">
            <Empty>{`${s.tickets.length.toLocaleString()} rows loaded and none meet the escalation rule above.`}</Empty>
          </div>
        ) : (
          <div className="cs-table-wrap">
            <table className="cs-table">
              <thead>
                <tr>
                  <th className="cs-num">#</th>
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
                {rows.map((t: SupportTicket, i) => (
                  <tr key={t.id}>
                    <td className="cs-num">{i + 1}</td>
                    <td>
                      <div className="title">{t.title}</div>
                      <div className="sub">
                        {t.raisedBy}
                        {t.detail ? ` · ${t.detail.slice(0, 70)}${t.detail.length > 70 ? "…" : ""}` : ""}
                      </div>
                    </td>
                    <td>{t.kind}</td>
                    <td>{t.category}</td>
                    <td>{severityPill(t.severity)}</td>
                    <td>
                      <Pill tone={GROUP_STYLE[t.statusGroup].tone}>
                        <span aria-hidden="true">{GROUP_STYLE[t.statusGroup].glyph}</span>
                        {t.status}
                      </Pill>
                    </td>
                    <td className="cs-num">{formatAge(t.ageDays)}</td>
                    <td className="cs-num">{formatWhen(t.createdAt)}</td>
                    <td style={{ paddingRight: 19 }}>{renderAction(t)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="cs-support-readonly">
          <Icon name="eye" size={13} />
          <span>
            {platform === "ghrfix"
              ? "Investigate, Resolve and Reject call GhrFix's real POST /ai-agents/support/disputes or messages/:id/resolve — resolving a row here also removes it from this list once it is no longer open or investigating."
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
.cs-support-note{margin:11px 0 0;font-size:11px;line-height:18px;color:#94a3b8}
.cs-support-dash{color:#94a3b8;font-size:10.5px}
.cs-support-pad{padding:14px 19px}
.cs-support-sort{border-bottom:0}
.cs-support-sort .cs-tab{height:30px;font-size:11.5px}
.cs-support-readonly{display:flex;gap:9px;align-items:flex-start;margin:0;padding:12px 19px 16px;border-top:1px solid rgba(255,255,255,.07);font-size:11px;line-height:18px;color:#94a3b8}
.cs-support-readonly svg{color:#94a3b8;flex:0 0 auto;margin-top:2px}
.cs-support-actions{display:flex;gap:6px;flex-wrap:wrap}
.cs-support-inert{opacity:.55;cursor:not-allowed;white-space:nowrap}
.cs-support-toast{position:fixed;right:22px;bottom:22px;max-width:380px;background:#11162f;color:#fff;border-radius:10px;padding:12px 16px;font-size:12.5px;line-height:18px;box-shadow:0 14px 32px rgba(20,20,45,.28);z-index:50}
`;
