"use client";

/**
 * Owner Chat Agent — Audit Trail.
 *
 * The agent's own recorded actions, read through `agentClient(...).activity()`
 * — GhrFix's `/ai-agents/owner-chat/activity`, or ShadiLife's shared
 * `/ai-agents/_meta/activity` filtered to this agent. Rendered as a paginated
 * table plus a donut of action families and a recency bar chart, both computed
 * from the feed itself.
 *
 * If the feed fails, this page says it cannot assess the trail — it never
 * shows an empty table as "no actions taken".
 */

import { useMemo, useState } from "react";
import { useOwnerChatSnapshot, relativeTime } from "@/lib/owner-chat-data";
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
  { label: "Directory", icon: "users", slug: "directory" },
  { label: "Capabilities", icon: "target", slug: "capabilities" },
  { label: "Audit Trail", icon: "clock", slug: "audit" },
  { label: "Chat with AI Agent", icon: "chat", slug: "chat" },
];

const PAGE_SIZE = 12;

export default function OwnerChatAuditPage({ params }: { params: Promise<{ platform: string }> }) {
  const platform = usePlatformParam(params);
  const s = useOwnerChatSnapshot(platform);
  const label = platformLabel(platform);

  const [family, setFamily] = useState("ALL");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const families = useMemo(() => s.auditActionTypes.map((r) => r.label), [s.auditActionTypes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return s.audit.filter((e) => {
      if (family !== "ALL" && !e.action.toLowerCase().includes(family.toLowerCase()) && familyOf(e.action) !== family) return false;
      if (!q) return true;
      return (
        e.action.toLowerCase().includes(q) ||
        (e.targetType ?? "").toLowerCase().includes(q) ||
        (e.targetId ?? "").toLowerCase().includes(q) ||
        (e.admin ?? "").toLowerCase().includes(q)
      );
    });
  }, [s.audit, family, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const typeSlices: Slice[] = s.auditActionTypes.map((r, i) => ({ ...r, color: SERIES[i % SERIES.length] }));
  const recencySlices: Slice[] = s.auditRecencyBuckets.map((r, i) => ({ ...r, color: SERIES[i % SERIES.length] }));

  const dated = s.audit.filter((e) => e.ageHours !== null);
  const newest = dated.length > 0 ? Math.min(...dated.map((e) => e.ageHours as number)) : null;
  const last24 = s.auditRecencyBuckets.find((b) => b.label === "Last 24h")?.value ?? null;
  const withAdmin = s.audit.filter((e) => e.admin !== null).length;

  const failed = Boolean(s.auditError);
  const loadedEmpty = !s.loading && !failed && s.audit.length === 0;

  return (
    <SpecialShell
      platform={platform}
      agentLabel="Owner Chat Agent"
      tagline="Orchestration workspace"
      basePath="/owner-chat-agent-special"
      nav={NAV}
      headerIcon="clock"
      assistantBlurb="Everything I do is written here. This page reads that log back — it does not add to it."
      title="Audit Trail"
      subtitle={`Recorded Owner Chat actions on ${label}`}
      actions={
        <Pill tone={s.loading ? "amber" : failed ? "red" : "green"}>
          <Icon name={s.loading ? "clock" : failed ? "alert" : "check"} size={12} />
          {s.loading ? "Loading log" : failed ? "▲ Log unavailable" : `● ${s.audit.length.toLocaleString()} entries read`}
        </Pill>
      }
    >
      <style>{OWNER_AUDIT_CSS}</style>

      {s.error && <ErrorNote error={s.error} platform={platform} />}

      {failed && (
        <div className="cs-owner-banner">
          <Icon name="alert" size={16} />
          <div>
            <b>The audited action log could not be read.</b>
            <span>{s.auditError} Nothing below can be assessed — an empty table here would mean &quot;unknown&quot;, not &quot;no actions taken&quot;.</span>
          </div>
        </div>
      )}

      <div className="cs-stats">
        <StatCard
          label="Entries in feed"
          value={s.loading || failed ? "—" : (s.auditTotal ?? s.audit.length).toLocaleString()}
          sub={failed ? "The log did not load" : s.loading ? "Reading the log" : `${s.audit.length.toLocaleString()} pulled into this page`}
          tone={failed ? "red" : "purple"}
          icon={failed ? "alert" : "posts"}
        />
        <StatCard
          label="Last 24 hours"
          value={s.loading || failed || last24 === null ? "—" : last24.toLocaleString()}
          sub={failed ? "Cannot be assessed" : "Actions recorded in the last day"}
          tone={failed ? "red" : "cyan"}
          icon="pulse"
        />
        <StatCard
          label="Most recent action"
          value={s.loading || failed ? "—" : newest === null ? "Undated" : newest < 1 ? "under 1h" : `${newest}h ago`}
          sub={failed ? "Cannot be assessed" : dated.length === 0 ? "No entry carried a usable timestamp" : `${dated.length.toLocaleString()} of ${s.audit.length.toLocaleString()} entries are dated`}
          tone={failed ? "red" : "blue"}
          icon="clock"
        />
        <StatCard
          label="Action families"
          value={s.loading || failed ? "—" : typeSlices.length.toLocaleString()}
          sub={failed ? "Cannot be assessed" : "Distinct kinds of action in the feed"}
          tone={failed ? "red" : "green"}
          icon="tag"
        />
        <StatCard
          label="Attributed to an admin"
          value={s.loading || failed ? "—" : withAdmin.toLocaleString()}
          sub={failed ? "Cannot be assessed" : withAdmin === 0 ? `${label} attaches no admin to these rows` : "Entries naming the acting admin"}
          tone={failed ? "red" : "amber"}
          icon="users"
        />
      </div>

      <div className="cs-row-2">
        <Card title="Actions by Type">
          {s.loading ? (
            <Empty>Loading the action log…</Empty>
          ) : failed ? (
            <Empty>The log did not load, so no action mix can be shown or assessed.</Empty>
          ) : typeSlices.length === 0 ? (
            <Empty>{label} returned an empty action log — the agent has genuinely recorded nothing here yet.</Empty>
          ) : (
            <>
              <div className="cs-owner-donut-wrap">
                <Donut data={typeSlices} centerLabel="actions" />
                <Legend data={typeSlices} />
              </div>
              <p className="cs-owner-note">Families are derived from each entry&apos;s own action text; anything unrecognised stays in &quot;Other&quot; rather than being reassigned.</p>
            </>
          )}
        </Card>

        <Card title="Recency">
          {s.loading ? (
            <Empty>Loading the action log…</Empty>
          ) : failed ? (
            <Empty>The log did not load, so recency cannot be shown or assessed.</Empty>
          ) : s.audit.length === 0 ? (
            <Empty>Nothing to bucket — the log came back empty.</Empty>
          ) : (
            <>
              <BarRows rows={recencySlices} />
              <Legend data={recencySlices} showPct={false} />
              <p className="cs-owner-note">Fixed buckets over the {s.audit.length.toLocaleString()} entries pulled here. A zero bucket is a real count of a loaded feed.</p>
            </>
          )}
        </Card>
      </div>

      <Card title="Recorded Actions" pad={false}>
        <div className="cs-owner-controls">
          <div className="cs-tabs" style={{ border: 0, flex: 1, minWidth: 200 }}>
            {["ALL", ...families].map((f) => (
              <button
                key={f}
                type="button"
                className={family === f ? "cs-tab active" : "cs-tab"}
                onClick={() => {
                  setFamily(f);
                  setPage(1);
                }}
                disabled={failed}
              >
                {f === "ALL" ? "All" : f}
              </button>
            ))}
          </div>
          <label className="cs-search">
            <Icon name="search" size={14} />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search action, target or admin…"
              aria-label="Search the audit trail"
              disabled={failed}
            />
          </label>
        </div>

        <div className="cs-table-wrap">
          <table className="cs-table">
            <thead>
              <tr>
                <th style={{ paddingLeft: 19 }}>Action</th>
                <th>Target type</th>
                <th>Target</th>
                <th>Admin</th>
                <th className="cs-num" style={{ paddingRight: 19 }}>When</th>
              </tr>
            </thead>
            <tbody>
              {s.loading && <tr><td colSpan={5} style={{ padding: 19 }}><Empty>Loading the audited action log…</Empty></td></tr>}
              {!s.loading && failed && (
                <tr><td colSpan={5} style={{ padding: 19 }}><Empty>{s.auditError} Nothing can be listed, and no claim about the agent&apos;s activity can be made.</Empty></td></tr>
              )}
              {loadedEmpty && (
                <tr><td colSpan={5} style={{ padding: 19 }}><Empty>The log loaded and is genuinely empty — Owner Chat has no recorded actions on {label} yet.</Empty></td></tr>
              )}
              {!s.loading && !failed && s.audit.length > 0 && visible.length === 0 && (
                <tr><td colSpan={5} style={{ padding: 19 }}><Empty>No entries match this filter.</Empty></td></tr>
              )}
              {visible.map((e) => (
                <tr key={e.id}>
                  <td style={{ paddingLeft: 19, maxWidth: 320 }}>
                    <div className="cs-owner-name">{e.action}</div>
                    <div className="cs-owner-sub">{familyOf(e.action)}</div>
                  </td>
                  <td>
                    <Pill tone={e.targetType ? "blue" : "purple"}>
                      {e.targetType ? `○ ${e.targetType}` : "◆ None"}
                    </Pill>
                  </td>
                  <td className="cs-num" style={{ color: "#cbd5e1" }}>{e.targetId ? e.targetId.slice(0, 14) : "—"}</td>
                  <td style={{ color: "#cbd5e1" }}>{e.admin ?? "—"}</td>
                  <td className="cs-num" style={{ paddingRight: 19, color: "#94a3b8", whiteSpace: "nowrap" }}>{relativeTime(e.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!failed && filtered.length > 0 && (
          <div className="cs-owner-pager">
            <span>{filtered.length.toLocaleString()} of {s.audit.length.toLocaleString()} entries · page {current} of {totalPages}</span>
            <div>
              <button type="button" className="cs-btn" onClick={() => setPage(Math.max(1, current - 1))} disabled={current === 1} aria-label="Previous page">
                <Icon name="back" size={13} />Prev
              </button>
              <button type="button" className="cs-btn" onClick={() => setPage(Math.min(totalPages, current + 1))} disabled={current === totalPages} aria-label="Next page">
                Next<Icon name="arrow" size={13} />
              </button>
            </div>
          </div>
        )}
      </Card>

      <Card title="About This Feed">
        <p className="cs-owner-prov-line">{s.sourceNote || "Loading…"}</p>
        <p className="cs-owner-prov-line">
          <b>Read-only.</b> This page reads the trail back. It appends nothing, and no write endpoint is wired anywhere in this
          workspace — see Capabilities for the write surface Owner Chat actually holds.
        </p>
      </Card>
    </SpecialShell>
  );
}

/** Mirrors the family grouping the hook uses, so a row's chip matches its donut slice. */
function familyOf(action: string): string {
  const a = action.toLowerCase();
  if (a.startsWith("called")) return "Tool call";
  if (a.includes("suggestion")) return "Suggestion";
  if (a.includes("suspend")) return "Suspend";
  if (a.includes("verif")) return "Verification";
  if (a.includes("approve")) return "Approval";
  if (a.includes("reject")) return "Rejection";
  if (a.includes("update") || a.includes("chang")) return "Update";
  if (a.includes("chat") || a.includes("message") || a.includes("ask")) return "Conversation";
  return "Other";
}

const OWNER_AUDIT_CSS = `
.cs-owner-banner{display:flex;gap:11px;align-items:flex-start;border:1px solid rgba(244,63,94,.32);background:rgba(244,63,94,.12);border-radius:12px;padding:14px 16px;margin-bottom:16px;color:#fda4af}
.cs-owner-banner b{display:block;font-size:13px;margin-bottom:4px}
.cs-owner-banner span{font-size:11.5px;line-height:19px;color:#8d3a41;display:block}
.cs-owner-donut-wrap{display:flex;gap:18px;align-items:center;flex-wrap:wrap}
.cs-owner-note{margin:12px 0 0;font-size:10.5px;line-height:17px;color:#94a3b8}
.cs-owner-controls{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:14px 19px;border-bottom:1px solid rgba(255,255,255,.07)}
.cs-owner-name{font-size:12.5px;font-weight:660;color:#11162d}
.cs-owner-sub{font-size:10.5px;color:#94a3b8;margin-top:2px}
.cs-owner-pager{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 19px;border-top:1px solid rgba(255,255,255,.07)}
.cs-owner-pager span{font-size:11px;color:#94a3b8}
.cs-owner-pager div{display:flex;gap:7px}
.cs-owner-prov-line{margin:0 0 9px;font-size:11.5px;line-height:19px;color:#cbd5e1}
.cs-owner-prov-line:last-child{margin-bottom:0}
.cs-owner-prov-line b{color:#11162d}
`;
