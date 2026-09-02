"use client";

/**
 * ShadiLife — Fraud Agent — Dashboard overview.
 *
 * Real endpoint behind this page:
 *   GET /api/ai-agents/fraud/report → { summary, suspiciousIps, duplicatePhones }
 *   (real login-failure and phone-duplicate data, plus one AI-written summary)
 *
 * This single endpoint spends one OpenAI call, so — same rule as every other
 * AI-costing page in this app — it is never fetched automatically on load.
 * The owner presses "Run fraud report" here or on the Reports tab
 * (components/agents/views/domain/shadilife/fraud.tsx), which adds
 * search/sort over the exact same real response.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { AgentHeading } from "@/components/agents/AgentShell";
import { InsightsPanel, MetricCard, Svg } from "@/components/agents/rich";
import { Icons } from "@/components/agents/icons";
import type { AgentViewProps } from "../registry";
import { Empty, ErrorNote, Panel, TableWrap, errText, num } from "./_kit";

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

export default function ShadiLifeFraudView({ platform, agent, api }: AgentViewProps) {
  const [report, setReport] = useState<FraudReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function runReport() {
    setLoading(true);
    setError(null);
    api
      .get<FraudReport>("/report")
      .then(({ data }) => setReport(data ?? {}))
      .catch((e: unknown) => setError(errText(e, "The fraud report could not be run.")))
      .finally(() => setLoading(false));
  }

  const hasRun = report !== null;
  const ips = useMemo(() => report?.suspiciousIps ?? [], [report]);
  const phoneGroups = useMemo(() => report?.duplicatePhones ?? [], [report]);
  const rankedIps = useMemo(() => [...ips].sort((a, b) => (b.failedLoginCount ?? 0) - (a.failedLoginCount ?? 0)), [ips]);
  const totalDuplicateAccounts = useMemo(() => phoneGroups.reduce((s, g) => s + (g.count ?? 0), 0), [phoneGroups]);
  const summaryLines = useMemo(
    () =>
      (report?.summary ?? "")
        .split(/\r?\n/)
        .map((l) => l.replace(/^[-•*]\s*/, "").trim())
        .filter(Boolean),
    [report],
  );

  return (
    <>
      <AgentHeading
        platform={platform}
        agent={agent}
        blurb="Real, read-only fraud signals — repeated failed logins by IP, and phone numbers shared across multiple accounts. Deliberately scoped to what's already trackable today."
        actions={
          <>
            <button type="button" className="ag-btn ag-btn-solid" onClick={runReport} disabled={loading}>
              <Svg path={Icons.shield} size={14} /> {loading ? "Scanning…" : hasRun ? "Re-run fraud report" : "Run fraud report"}
            </button>
            <Link href={`/${platform.key}/${agent.key}/reports`} className="ag-btn ag-btn-ghost">Open Reports</Link>
          </>
        }
      />

      {error && <ErrorNote platform={platform} error={error} what="The fraud report could not load" />}

      <div className="ag-metrics">
        <MetricCard icon={<Svg path={Icons.shield} size={24} />} tone="red" title="Suspicious IPs" value={hasRun ? num(ips.length) : "—"} />
        <MetricCard icon={<Svg path={Icons.phone} size={24} />} tone="gold" title="Duplicate phone groups" value={hasRun ? num(phoneGroups.length) : "—"} />
        <MetricCard icon={<Svg path={Icons.users} size={24} />} tone="purple" title="Accounts sharing a phone" value={hasRun ? num(totalDuplicateAccounts) : "—"} />
        <MetricCard icon={<Svg path={Icons.alert} size={24} />} tone="blue" title="Worst IP's failed logins" value={hasRun && rankedIps.length > 0 ? num(rankedIps[0].failedLoginCount) : "—"} />
      </div>

      <div className="ag-split">
        <div className="ag-stack">
          <Panel title="AI risk summary" sub="3-5 bullet points generated from the real signals below">
            {summaryLines.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {summaryLines.map((l, i) => (
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
            sub="Top 5, worst first — the Reports tab has the full searchable list"
            actions={<Link href={`/${platform.key}/${agent.key}/reports`} className="ag-btn ag-btn-ghost ag-btn-sm">View all in Reports →</Link>}
            noBody
          >
            {rankedIps.length > 0 ? (
              <TableWrap>
                <table className="ag-table">
                  <thead><tr><th>IP address</th><th style={{ textAlign: "right" }}>Failed logins (30d)</th></tr></thead>
                  <tbody>
                    {rankedIps.slice(0, 5).map((i, idx) => (
                      <tr key={`${i.ipAddress}-${idx}`}>
                        <td style={{ fontWeight: 650, fontFamily: "monospace", fontSize: 12 }}>{i.ipAddress ?? "—"}</td>
                        <td style={{ textAlign: "right" }}>{num(i.failedLoginCount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            ) : (
              <div className="ag-panel-body"><Empty>{loading ? "Loading…" : hasRun ? "No IP shows a repeated failed-login pattern." : "Run the report to populate this."}</Empty></div>
            )}
          </Panel>
        </div>

        <div className="ag-stack">
          <Panel
            title="Duplicate phone numbers"
            sub="Top 5 — the Reports tab lists every account per group"
            actions={<Link href={`/${platform.key}/${agent.key}/reports`} className="ag-btn ag-btn-ghost ag-btn-sm">View all in Reports →</Link>}
            noBody
          >
            {phoneGroups.length > 0 ? (
              <TableWrap>
                <table className="ag-table">
                  <thead><tr><th>Phone</th><th style={{ textAlign: "right" }}>Accounts</th></tr></thead>
                  <tbody>
                    {phoneGroups.slice(0, 5).map((g, i) => (
                      <tr key={g.phone ?? i}>
                        <td style={{ fontWeight: 650 }}>{g.phone ?? "—"}</td>
                        <td style={{ textAlign: "right" }}>{num(g.count)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            ) : (
              <div className="ag-panel-body"><Empty>{loading ? "Loading…" : hasRun ? "No phone number is currently shared across accounts." : "Run the report to populate this."}</Empty></div>
            )}
          </Panel>

          <InsightsPanel
            rows={
              !hasRun
                ? [
                    { icon: <Svg path={Icons.shield} size={15} />, label: "Suspicious IPs", value: "3+ failed logins in the last 30 days, ranked worst-first once you run the report." },
                    { icon: <Svg path={Icons.phone} size={15} />, label: "Duplicate phones", value: "Phone numbers shared by 2+ accounts, with the full account list, once you run the report." },
                  ]
                : [
                    ...(rankedIps.length > 0
                      ? [{ icon: <Svg path={Icons.shield} size={15} />, label: "Riskiest IP", value: `${rankedIps[0].ipAddress} had ${num(rankedIps[0].failedLoginCount)} failed logins in the last 30 days.` }]
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
