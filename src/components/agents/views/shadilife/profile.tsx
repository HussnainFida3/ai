"use client";

/**
 * ShadiLife — Profile Agent — Dashboard overview.
 *
 * Lighter overview than before: the full incomplete-profile nudge workflow
 * (find candidates, draft, send) now lives on the Nudges tab
 * (components/agents/views/domain/shadilife/profile.tsx). This page keeps
 * the deterministic quality audit and a free (no AI cost) read of how many
 * profiles sit below the default 50% completion threshold, as a teaser.
 *
 * Real endpoints behind this page:
 *   GET  /api/ai-agents/profile/nudge-candidates?thresholdPct=50 → real Profile.completionPct query (free, no AI cost)
 *   POST /api/ai-agents/profile/quality-audit                     → deterministic quality score, AI fix only where score < 9
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { AgentHeading } from "@/components/agents/AgentShell";
import { DonutChart, InsightsPanel, MetricCard, Svg } from "@/components/agents/rich";
import { Icons } from "@/components/agents/icons";
import type { AgentViewProps } from "../registry";
import { Empty, Panel, TableWrap, errText, num, useLoad } from "./_kit";

interface NudgeCandidate {
  userId: string;
  fullName?: string | null;
  city?: string | null;
  completionPct?: number | null;
}
interface AuditResult {
  userId: string;
  fullName?: string;
  score?: number;
  gap?: string | null;
  suggestion?: { bioSuggestion?: string; reasoning?: string } | null;
}
interface QualityAudit {
  profilesChecked?: number;
  results?: AuditResult[];
}

const scoreTone = (s: number | undefined): "green" | "amber" | "red" | "mute" =>
  s === undefined ? "mute" : s >= 9 ? "green" : s >= 6 ? "amber" : "red";

export default function ShadiLifeProfileView({ platform, agent, api }: AgentViewProps) {
  const candidates = useLoad<NudgeCandidate[]>(async () => (await api.get<NudgeCandidate[]>("/nudge-candidates", { thresholdPct: 50 })).data ?? [], [platform.key]);

  const [audit, setAudit] = useState<QualityAudit | null>(null);
  const [auditing, setAuditing] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);

  function runQualityAudit() {
    setAuditing(true);
    setAuditError(null);
    api
      .post<QualityAudit>("/quality-audit")
      .then(({ data }) => setAudit(data ?? {}))
      .catch((e: unknown) => setAuditError(errText(e, "The quality audit could not be run.")))
      .finally(() => setAuditing(false));
  }

  const results = audit?.results ?? [];
  const ranked = useMemo(() => [...results].sort((a, b) => (a.score ?? 99) - (b.score ?? 99)), [results]);
  const withGap = results.filter((r) => r.gap);
  const avgScore = results.length ? results.reduce((s, r) => s + (r.score ?? 0), 0) / results.length : null;
  const scoreBands = useMemo(() => {
    const bands = [
      { label: "9 – 10", test: (s: number) => s >= 9 },
      { label: "6 – 8", test: (s: number) => s >= 6 && s < 9 },
      { label: "3 – 5", test: (s: number) => s >= 3 && s < 6 },
      { label: "0 – 2", test: (s: number) => s < 3 },
    ];
    return bands.map((b) => ({ label: b.label, value: results.filter((r) => b.test(r.score ?? -1)).length })).filter((b) => b.value > 0);
  }, [results]);

  return (
    <>
      <AgentHeading
        platform={platform}
        agent={agent}
        blurb="A deterministic quality score for active profiles, and how many members are below completion threshold. The full nudge workflow — find, draft, send — lives on the Nudges tab."
        actions={
          <>
            <Link href={`/${platform.key}/${agent.key}/nudges`} className="ag-btn ag-btn-solid">
              <Svg path={Icons.wand} size={14} /> Open Nudges
            </Link>
            <Link href={`/${platform.key}/${agent.key}/chat`} className="ag-btn ag-btn-ghost">Ask this agent →</Link>
          </>
        }
      />

      <div className="ag-metrics">
        <MetricCard icon={<Svg path={Icons.users} size={24} />} tone="gold" title="Below 50% completion" value={candidates.loading ? "—" : num(candidates.data?.length)} />
        <MetricCard icon={<Svg path={Icons.check} size={24} />} tone="green" title="Profiles audited" value={audit ? num(audit.profilesChecked) : "—"} />
        <MetricCard icon={<Svg path={Icons.trendUp} size={24} />} tone="gold" title="Average quality score" value={avgScore === null ? "—" : `${Math.round(avgScore * 10) / 10} / 10`} />
        <MetricCard icon={<Svg path={Icons.message} size={24} />} tone="purple" title="Profiles needing a fix" value={results.length > 0 ? num(withGap.length) : "—"} />
      </div>

      <div className="ag-split">
        <div className="ag-stack">
          <Panel
            title="Nudge candidates"
            sub={`${candidates.data?.length ?? 0} member(s) below 50% completion — showing the top 5`}
            actions={<Link href={`/${platform.key}/${agent.key}/nudges`} className="ag-btn ag-btn-ghost ag-btn-sm">Open Nudges →</Link>}
            noBody
          >
            {(candidates.data ?? []).length > 0 ? (
              <TableWrap>
                <table className="ag-table">
                  <thead><tr><th>Member</th><th>City</th><th style={{ textAlign: "right" }}>Completion</th></tr></thead>
                  <tbody>
                    {(candidates.data ?? []).slice(0, 5).map((c) => (
                      <tr key={c.userId}>
                        <td style={{ fontWeight: 650 }}>{c.fullName || "—"}</td>
                        <td>{c.city || "—"}</td>
                        <td style={{ textAlign: "right" }}>{c.completionPct != null ? `${c.completionPct}%` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            ) : (
              <div className="ag-panel-body"><Empty>{candidates.loading ? "Loading…" : "No profiles below 50% completion right now."}</Empty></div>
            )}
          </Panel>

          <Panel
            title="Profile quality audit"
            sub="Structural score for the 25 most recently updated active profiles — an AI bio fix is drafted only when the score is below 9"
            actions={
              <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" onClick={runQualityAudit} disabled={auditing}>
                <Svg path={Icons.seo} size={13} /> {auditing ? "Auditing…" : audit ? "Re-run audit" : "Run quality audit"}
              </button>
            }
            noBody
          >
            {auditError && <p style={{ margin: "0 20px 12px", fontSize: 12, color: "var(--ag-red)" }}>{auditError}</p>}
            {ranked.length > 0 ? (
              <TableWrap>
                <table className="ag-table">
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th style={{ textAlign: "right" }}>Score</th>
                      <th>AI bio suggestion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranked.map((r) => (
                      <tr key={r.userId}>
                        <td style={{ fontWeight: 650 }}>{r.fullName || "—"}</td>
                        <td style={{ textAlign: "right" }}>
                          <span className={`ag-badge ag-badge-${scoreTone(r.score)}`}>{r.score ?? "—"}</span>
                        </td>
                        <td style={{ maxWidth: 340, fontSize: 11.5, color: "var(--ag-ink-soft)", lineHeight: 1.6 }}>
                          {r.suggestion?.bioSuggestion ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            ) : (
              <div className="ag-panel-body"><Empty>{auditing ? "Scoring active profiles…" : "No audit run yet this session."}</Empty></div>
            )}
          </Panel>
        </div>

        <div className="ag-stack">
          <Panel title="Score distribution" sub="From the last quality audit run">
            {scoreBands.length > 0 ? (
              <DonutChart data={scoreBands} totalLabel="Profiles" />
            ) : (
              <Empty>{auditing ? "Loading…" : "Run the audit to populate this."}</Empty>
            )}
          </Panel>

          <InsightsPanel
            rows={[
              ...(candidates.data && candidates.data.length > 0
                ? [{ icon: <Svg path={Icons.users} size={15} />, label: "Nudge opportunity", value: `${candidates.data.length} member(s) are below 50% completion and could use a reminder.` }]
                : []),
              ...(results.length > 0
                ? [{ icon: <Svg path={Icons.trendUp} size={15} />, label: "Profiles needing work", value: `${withGap.length} of ${results.length} audited profile(s) scored below 9.` }]
                : []),
              ...(avgScore !== null
                ? [{ icon: <Svg path={Icons.sparkle} size={15} />, label: "Average quality", value: `Average structural score is ${Math.round(avgScore * 10) / 10} out of 10.` }]
                : []),
            ]}
          />
        </div>
      </div>
    </>
  );
}
