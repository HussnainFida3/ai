"use client";

/**
 * ShadiLife — Fraud Agent — Reports (domain tab).
 *
 * The deep-dive companion to the Dashboard's lighter overview: the full
 * fraud report — AI risk summary, every suspicious IP, every duplicate-phone
 * group with its accounts — searchable and sortable.
 *
 * Real endpoint:
 *   GET /api/ai-agents/fraud/report → { summary, suspiciousIps, duplicatePhones }
 *
 * Manual only, same as before — this single endpoint spends one AI call, so
 * it is never fetched on page load.
 */

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { AgentHeading } from "@/components/agents/AgentShell";
import { InsightsPanel, MetricCard, Svg } from "@/components/agents/rich";
import { Icons } from "@/components/agents/icons";
import type { AgentViewProps } from "../../registry";
import { Empty, ErrorNote, Panel, TableWrap, errText, num } from "../../shadilife/_kit";

interface Account {
  userId?: string;
  email?: string;
  fullName?: string;
}
interface DuplicatePhoneGroup {
  phone?: string;
  count?: number;
  accounts?: Account[];
}
interface SuspiciousIp {
  ipAddress?: string;
  failedLoginCount?: number;
}
interface FraudReport {
  summary?: string;
  suspiciousIps?: SuspiciousIp[];
  duplicatePhones?: DuplicatePhoneGroup[];
}

type IpSort = "worst" | "recent";

export default function ShadiLifeFraudReportsView({ platform, agent, api }: AgentViewProps) {
  const [report, setReport] = useState<FraudReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [ipSearch, setIpSearch] = useState("");
  const [ipSort, setIpSort] = useState<IpSort>("worst");
  const [phoneSearch, setPhoneSearch] = useState("");

  function runReport() {
    setLoading(true);
    setError(null);
    api
      .get<FraudReport>("/report")
      .then(({ data }) => setReport(data ?? {}))
      .catch((e: unknown) => setError(errText(e, "The fraud report could not be run.")))
      .finally(() => setLoading(false));
  }

  const ips = report?.suspiciousIps ?? [];
  const phoneGroups = report?.duplicatePhones ?? [];
  const hasRun = report !== null;

  const visibleIps = useMemo(() => {
    let rows = ips;
    const q = ipSearch.trim().toLowerCase();
    if (q) rows = rows.filter((i) => (i.ipAddress ?? "").toLowerCase().includes(q));
    return [...rows].sort((a, b) => (ipSort === "worst" ? (b.failedLoginCount ?? 0) - (a.failedLoginCount ?? 0) : 0));
  }, [ips, ipSearch, ipSort]);

  const visiblePhoneGroups = useMemo(() => {
    const q = phoneSearch.trim().toLowerCase();
    if (!q) return phoneGroups;
    return phoneGroups.filter(
      (g) => (g.phone ?? "").toLowerCase().includes(q) || (g.accounts ?? []).some((a) => (a.fullName ?? "").toLowerCase().includes(q) || (a.email ?? "").toLowerCase().includes(q)),
    );
  }, [phoneGroups, phoneSearch]);

  const totalDuplicateAccounts = useMemo(() => phoneGroups.reduce((s, g) => s + (g.count ?? 0), 0), [phoneGroups]);

  return (
    <>
      <AgentHeading
        platform={platform}
        agent={agent}
        blurb="The full real fraud report — every suspicious IP and every phone number shared across accounts, searchable and sortable. Deliberately scoped to what's already trackable today."
        actions={
          <>
            <button type="button" className="ag-btn ag-btn-solid" onClick={runReport} disabled={loading}>
              <Svg path={Icons.shield} size={14} /> {loading ? "Scanning…" : hasRun ? "Re-run fraud report" : "Run fraud report"}
            </button>
            <Link href={`/${platform.key}/${agent.key}`} className="ag-btn ag-btn-ghost">← Dashboard</Link>
          </>
        }
      />

      {error && <ErrorNote platform={platform} error={error} what="The fraud report could not load" />}

      <div className="ag-metrics">
        <MetricCard icon={<Svg path={Icons.shield} size={24} />} tone="red" title="Suspicious IPs" value={hasRun ? num(ips.length) : "—"} />
        <MetricCard icon={<Svg path={Icons.phone} size={24} />} tone="gold" title="Duplicate phone groups" value={hasRun ? num(phoneGroups.length) : "—"} />
        <MetricCard icon={<Svg path={Icons.users} size={24} />} tone="purple" title="Accounts sharing a phone" value={hasRun ? num(totalDuplicateAccounts) : "—"} />
        <MetricCard icon={<Svg path={Icons.alert} size={24} />} tone="blue" title="Worst IP's failed logins" value={hasRun && ips.length > 0 ? num(ips[0].failedLoginCount) : "—"} />
      </div>

      <div className="ag-split">
        <div className="ag-stack">
          <Panel title="AI risk summary" sub="3-5 bullet points generated from the real signals below">
            {report?.summary ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {report.summary
                  .split(/\r?\n/)
                  .map((l) => l.replace(/^[-•*]\s*/, "").trim())
                  .filter(Boolean)
                  .map((l, i) => (
                    <div key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
                      <span style={{ color: "var(--ag-accent)", display: "grid", flex: "0 0 auto", marginTop: 1 }}>
                        <Svg path={Icons.sparkle} size={14} />
                      </span>
                      <span style={{ fontSize: 12.5, lineHeight: 1.7, color: "var(--ag-ink-soft)" }}>{l}</span>
                    </div>
                  ))}
              </div>
            ) : (
              <Empty>{loading ? "Analyzing failed-login patterns and duplicate phone numbers…" : "No report run yet this session. Press “Run fraud report” — it spends one AI call."}</Empty>
            )}
          </Panel>

          <Panel
            title="Suspicious IPs"
            sub="3+ failed logins in the last 30 days"
            actions={
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input
                  value={ipSearch}
                  onChange={(e) => setIpSearch(e.target.value)}
                  placeholder="Search IP…"
                  style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--ag-border)", background: "var(--ag-bg)", color: "var(--ag-ink)", minWidth: 140 }}
                />
                <select value={ipSort} onChange={(e) => setIpSort(e.target.value as IpSort)} style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--ag-border)", background: "var(--ag-bg)", color: "var(--ag-ink)" }}>
                  <option value="worst">Worst first</option>
                  <option value="recent">As returned</option>
                </select>
              </div>
            }
            noBody
          >
            {visibleIps.length > 0 ? (
              <TableWrap>
                <table className="ag-table">
                  <thead><tr><th>IP address</th><th style={{ textAlign: "right" }}>Failed logins (30d)</th></tr></thead>
                  <tbody>
                    {visibleIps.map((i, idx) => (
                      <tr key={`${i.ipAddress}-${idx}`}>
                        <td style={{ fontWeight: 650, fontFamily: "monospace", fontSize: 12 }}>{i.ipAddress ?? "—"}</td>
                        <td style={{ textAlign: "right" }}>{num(i.failedLoginCount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            ) : (
              <div className="ag-panel-body"><Empty>{loading ? "Loading…" : hasRun ? "No IP matches, or none shows a repeated failed-login pattern." : "Run the report to populate this."}</Empty></div>
            )}
          </Panel>

          <Panel
            title="Duplicate phone numbers"
            sub="One phone number shared by 2+ accounts"
            actions={
              <input
                value={phoneSearch}
                onChange={(e) => setPhoneSearch(e.target.value)}
                placeholder="Search phone or account…"
                style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--ag-border)", background: "var(--ag-bg)", color: "var(--ag-ink)", minWidth: 180 }}
              />
            }
            noBody
          >
            {visiblePhoneGroups.length > 0 ? (
              <TableWrap>
                <table className="ag-table">
                  <thead>
                    <tr>
                      <th>Phone</th>
                      <th style={{ textAlign: "right" }}>Accounts</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {visiblePhoneGroups.map((g, i) => {
                      const key = g.phone ?? String(i);
                      return (
                        <Fragment key={key}>
                          <tr className="clickable" onClick={() => setExpanded(expanded === key ? null : key)}>
                            <td style={{ fontWeight: 650 }}>{g.phone ?? "—"}</td>
                            <td style={{ textAlign: "right" }}>{num(g.count)}</td>
                            <td style={{ color: "var(--ag-ink-faint)", fontSize: 11 }}>{expanded === key ? "Hide ▲" : "Show accounts ▼"}</td>
                          </tr>
                          {expanded === key && (
                            <tr>
                              <td colSpan={3} style={{ background: "var(--ag-bg)" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "4px 0" }}>
                                  {(g.accounts ?? []).map((a) => (
                                    <div key={a.userId} style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5 }}>
                                      <span>{a.fullName || "—"}</span>
                                      <span style={{ color: "var(--ag-ink-faint)" }}>{a.email || "—"}</span>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </TableWrap>
            ) : (
              <div className="ag-panel-body"><Empty>{loading ? "Loading…" : hasRun ? "No phone number matches, or none is shared across accounts." : "Run the report to populate this."}</Empty></div>
            )}
          </Panel>
        </div>

        <div className="ag-stack">
          <InsightsPanel
            rows={
              !hasRun
                ? []
                : [
                    ...(ips.length > 0
                      ? [{ icon: <Svg path={Icons.shield} size={15} />, label: "Riskiest IP", value: `${ips[0].ipAddress} had ${num(ips[0].failedLoginCount)} failed logins in the last 30 days.` }]
                      : [{ icon: <Svg path={Icons.check} size={15} />, label: "No IP-level risk", value: "No IP shows a repeated failed-login pattern right now." }]),
                    ...(phoneGroups.length > 0
                      ? [{ icon: <Svg path={Icons.phone} size={15} />, label: "Most-shared phone", value: `One phone number is shared by ${num(phoneGroups[0].count)} accounts.` }]
                      : [{ icon: <Svg path={Icons.check} size={15} />, label: "No shared phones", value: "No phone number is currently shared across multiple accounts." }]),
                  ]
            }
          />
        </div>
      </div>
    </>
  );
}
