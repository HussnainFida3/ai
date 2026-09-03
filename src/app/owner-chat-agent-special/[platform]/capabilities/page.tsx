"use client";

/**
 * Owner Chat Agent — Capabilities.
 *
 * What this agent can actually reach, split into reads and audited writes.
 * Every read listed is a route this workspace itself calls, taken from the
 * live Owner Chat views; the read column is cross-checked against the
 * snapshot, so a route that failed this session is marked as such rather
 * than presented as working.
 *
 * The writes are DOCUMENTED ONLY. No page in this workspace calls a write
 * endpoint, and the action affordances below are deliberately inert.
 */

import { useOwnerChatSnapshot } from "@/lib/owner-chat-data";
import type { OwnerCapability } from "@/lib/owner-chat-data";
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

export default function OwnerChatCapabilitiesPage({ params }: { params: Promise<{ platform: string }> }) {
  const platform = usePlatformParam(params);
  const s = useOwnerChatSnapshot(platform);
  const label = platformLabel(platform);

  /* A read counts as "confirmed this session" only when the snapshot proves
     it: the failures list names the sources that did not come back. */
  const failedText = s.failures.join(" | ").toLowerCase();
  const readState = (c: OwnerCapability): "ok" | "failed" | "unknown" => {
    if (s.loading) return "unknown";
    const route = c.route.replace(/^(GET|POST)\s+/, "").split("?")[0].toLowerCase();
    if (failedText.includes(route)) return "failed";
    if (c.key === "chat") return "unknown";
    if (c.key === "agent-stats" || c.key === "usage") return s.runtimeError ? "failed" : "ok";
    if (c.key === "agent-activity" || c.key === "activity") return s.auditError ? "failed" : "ok";
    return "ok";
  };

  const confirmed = s.loading ? 0 : s.reads.filter((c) => readState(c) === "ok").length;
  const failedReads = s.loading ? 0 : s.reads.filter((c) => readState(c) === "failed").length;

  const surface: Slice[] = [
    { label: "Reads", value: s.reads.length, color: SERIES[0] },
    { label: "Audited writes", value: s.writes.length, color: SERIES[4] },
  ];

  const health: Slice[] = s.loading
    ? []
    : [
        { label: "Confirmed this session", value: confirmed, color: SERIES[2] },
        { label: "Failed this session", value: failedReads, color: SERIES[4] },
        { label: "Not exercised here", value: s.reads.length - confirmed - failedReads, color: SERIES[3] },
      ].filter((r) => r.value > 0);

  const wiring: Slice[] = [
    { label: "Called by this workspace", value: s.reads.filter((c) => c.wiredHere).length, color: SERIES[1] },
    { label: "Documented, not wired", value: s.writes.length + s.reads.filter((c) => !c.wiredHere).length, color: SERIES[3] },
  ];

  return (
    <SpecialShell
      platform={platform}
      agentLabel="Owner Chat Agent"
      tagline="Orchestration workspace"
      basePath="/owner-chat-agent-special"
      nav={NAV}
      headerIcon="target"
      assistantBlurb="This is my whole surface: the routes I read, and the writes I hold. This workspace exercises the reads only."
      title="Capabilities"
      subtitle={`Everything Owner Chat can reach on ${label}`}
      actions={
        <Pill tone="amber">
          <Icon name="alert" size={12} />
          ▲ Writes not wired here
        </Pill>
      }
    >
      <style>{OWNER_CAP_CSS}</style>

      {s.error && <ErrorNote error={s.error} platform={platform} />}

      <div className="cs-owner-banner">
        <Icon name="alert" size={16} />
        <div>
          <b>No write endpoint is wired into this workspace.</b>
          <span>
            The audited writes listed below are what Owner Chat is capable of on {label}, documented so the write surface is
            visible. Nothing on this page fires one — every action control here is inert by design, and the only POST this
            workspace makes is the conversation itself, which records no platform change.
          </span>
        </div>
      </div>

      <div className="cs-stats">
        <StatCard label="Read routes" value={s.reads.length.toLocaleString()} sub={`Distinct ${label} routes this agent reads`} tone="purple" icon="eye" />
        <StatCard
          label="Confirmed this session"
          value={s.loading ? "—" : confirmed.toLocaleString()}
          sub={s.loading ? "Still reading" : `${failedReads} failed, ${s.reads.length - confirmed - failedReads} not exercised here`}
          tone={failedReads > 0 ? "amber" : "green"}
          icon={failedReads > 0 ? "alert" : "check"}
        />
        <StatCard label="Audited writes" value={s.writes.length.toLocaleString()} sub="Documented only — none wired here" tone="red" icon="edit" />
        <StatCard
          label="Audit entries read"
          value={s.loading ? "—" : s.auditError ? "—" : (s.auditTotal ?? s.audit.length).toLocaleString()}
          sub={s.auditError ? "The action log did not load" : "Every write lands in this feed"}
          tone={s.auditError ? "red" : "blue"}
          icon={s.auditError ? "alert" : "clock"}
        />
        <StatCard
          label="Model"
          value={s.loading ? "—" : (s.runtime?.model ?? "Not reported")}
          sub={s.runtimeError ? s.runtimeError : s.runtime ? `${s.runtime.rateLimitPerMinute.toLocaleString()} calls / minute limit` : "Runtime not returned"}
          tone="cyan"
          icon="bot"
        />
      </div>

      <div className="cs-donut-row">
        <Card title="Surface Split">
          <div className="cs-owner-donut-wrap">
            <Donut data={surface} centerLabel="routes" />
            <Legend data={surface} />
          </div>
          <p className="cs-owner-note">Counted from the catalogue on this page, which mirrors the live Owner Chat views for {label}.</p>
        </Card>

        <Card title="Read Health This Session">
          {s.loading ? (
            <Empty>Exercising the read routes…</Empty>
          ) : health.length === 0 ? (
            <Empty>Nothing could be established about the read routes this session.</Empty>
          ) : (
            <>
              <div className="cs-owner-donut-wrap">
                <Donut data={health} centerLabel="routes" />
                <Legend data={health} />
              </div>
              <p className="cs-owner-note">
                &quot;Confirmed&quot; means this workspace actually called the route and got data back just now. &quot;Not exercised&quot; means the
                route exists but this page cannot vouch for it.
              </p>
            </>
          )}
        </Card>

        <Card title="Wiring">
          <BarRows rows={wiring} />
          <Legend data={wiring} showPct={false} />
          <p className="cs-owner-note">Every write sits on the right-hand bar: known, described, and never called from here.</p>
        </Card>
      </div>

      <Card title="Reads" pad={false}>
        <div className="cs-table-wrap">
          <table className="cs-table">
            <thead>
              <tr>
                <th style={{ paddingLeft: 19 }}>Capability</th>
                <th>Route</th>
                <th>What it returns</th>
                <th style={{ paddingRight: 19 }}>This session</th>
              </tr>
            </thead>
            <tbody>
              {s.reads.map((c) => {
                const st = readState(c);
                return (
                  <tr key={c.key}>
                    <td style={{ paddingLeft: 19 }}><div className="cs-owner-name">{c.title}</div></td>
                    <td><code className="cs-owner-route">{c.route}</code></td>
                    <td style={{ color: "#cbd5e1", maxWidth: 380 }}>{c.description}</td>
                    <td style={{ paddingRight: 19 }}>
                      {st === "ok" ? (
                        <Pill tone="green">● Loaded</Pill>
                      ) : st === "failed" ? (
                        <Pill tone="red">▲ Failed</Pill>
                      ) : (
                        <Pill tone="blue">○ {s.loading ? "Loading" : "Not exercised"}</Pill>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Audited Writes — Documented, Not Wired" pad={false}>
        <div className="cs-table-wrap">
          <table className="cs-table">
            <thead>
              <tr>
                <th style={{ paddingLeft: 19 }}>Write</th>
                <th>Where it runs</th>
                <th>What it does</th>
                <th style={{ paddingRight: 19 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {s.writes.map((c) => (
                <tr key={c.key}>
                  <td style={{ paddingLeft: 19 }}><div className="cs-owner-name">{c.title}</div></td>
                  <td style={{ color: "#94a3b8", maxWidth: 300, fontSize: 11 }}>{c.route}</td>
                  <td style={{ color: "#cbd5e1", maxWidth: 360 }}>{c.description}</td>
                  <td style={{ paddingRight: 19 }}>
                    <button type="button" className="cs-btn" disabled title="Not wired up in this workspace" aria-label={`${c.title} — disabled, not wired up in this workspace`}>
                      <Icon name="edit" size={13} />Disabled
                    </button>
                  </td>
                </tr>
              ))}
              {s.writes.length === 0 && (
                <tr><td colSpan={4} style={{ padding: 19 }}><Empty>No write capability is documented for {label}.</Empty></td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="cs-owner-foot">
          Every control in this table is permanently disabled. To make one of these changes, ask the agent in the real console —
          it records the action in the audit trail this workspace reads back.
        </p>
      </Card>

      <Card title="Provenance">
        <p className="cs-owner-prov-line">{s.sourceNote || "Loading…"}</p>
        <p className="cs-owner-prov-line">{s.timingNote || "Loading…"}</p>
        <p className="cs-owner-prov-line">
          <b>How this list was built.</b> Each route above is one the existing {label} Owner Chat views already call. Where a write
          has no client route in this codebase, that is stated in place of a guessed path.
        </p>
      </Card>
    </SpecialShell>
  );
}

const OWNER_CAP_CSS = `
.cs-owner-banner{display:flex;gap:11px;align-items:flex-start;border:1px solid rgba(244,63,94,.32);background:rgba(244,63,94,.12);border-radius:12px;padding:14px 16px;margin-bottom:16px;color:#fda4af}
.cs-owner-banner b{display:block;font-size:13px;margin-bottom:4px}
.cs-owner-banner span{font-size:11.5px;line-height:19px;color:#8d3a41;display:block}
.cs-owner-donut-wrap{display:flex;gap:18px;align-items:center;flex-wrap:wrap}
.cs-owner-note{margin:12px 0 0;font-size:10.5px;line-height:17px;color:#94a3b8}
.cs-owner-name{font-size:12.5px;font-weight:660;color:#11162d}
.cs-owner-route{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10.5px;background:#0d1526;border:1px solid rgba(255,255,255,.07);border-radius:6px;padding:3px 6px;color:#cbd5e1;white-space:nowrap}
.cs-owner-foot{margin:0;padding:13px 19px;border-top:1px solid rgba(255,255,255,.07);font-size:11px;line-height:18px;color:#94a3b8}
.cs-owner-prov-line{margin:0 0 9px;font-size:11.5px;line-height:19px;color:#cbd5e1}
.cs-owner-prov-line:last-child{margin-bottom:0}
.cs-owner-prov-line b{color:#11162d}
`;
