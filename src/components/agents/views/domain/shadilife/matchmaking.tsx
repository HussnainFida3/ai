"use client";

/**
 * ShadiLife — Matchmaking Agent — Matches (domain tab).
 *
 * The deep-dive companion to the Dashboard's lighter overview: the manual
 * daily-picks job trigger and the full second-opinion compatibility scorer,
 * with every pair scored this session kept in a searchable, sortable table.
 *
 * Real endpoints:
 *   POST /api/ai-agents/matchmaking/daily/run                → { usersProcessed, suggestionsCreated }
 *   POST /api/ai-agents/matchmaking/:userIdA/:userIdB/score  → { suggestionId, score, reasoning } (real write, AI-scored)
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { AgentHeading } from "@/components/agents/AgentShell";
import { InsightsPanel, MetricCard, Svg } from "@/components/agents/rich";
import { Icons } from "@/components/agents/icons";
import type { AgentViewProps } from "../../registry";
import { ActionNote, Empty, Panel, TableWrap, errText, num } from "../../shadilife/_kit";

interface DailyRunResult {
  usersProcessed?: number;
  suggestionsCreated?: number;
}
interface ScoreResult {
  suggestionId?: string;
  score?: number;
  reasoning?: string;
}
interface ScoredPair extends ScoreResult {
  userIdA: string;
  userIdB: string;
  at: string;
}

type SortKey = "recent" | "score";

export default function ShadiLifeMatchmakingMatchesView({ platform, agent, api }: AgentViewProps) {
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<DailyRunResult | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [runHistory, setRunHistory] = useState<Array<DailyRunResult & { at: string }>>([]);

  function runDailyJob() {
    setRunning(true);
    setRunError(null);
    api
      .post<DailyRunResult>("/daily/run")
      .then(({ data }) => {
        setRunResult(data ?? {});
        setRunHistory((prev) => [{ ...(data ?? {}), at: new Date().toISOString() }, ...prev].slice(0, 10));
      })
      .catch((e: unknown) => setRunError(errText(e, "The daily match job could not be run.")))
      .finally(() => setRunning(false));
  }

  const [userIdA, setUserIdA] = useState("");
  const [userIdB, setUserIdB] = useState("");
  const [scoring, setScoring] = useState(false);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [scored, setScored] = useState<ScoredPair[]>([]);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("recent");

  function runScore() {
    const a = userIdA.trim();
    const b = userIdB.trim();
    if (!a || !b || scoring) return;
    setScoring(true);
    setScoreError(null);
    api
      .post<ScoreResult>(`/${encodeURIComponent(a)}/${encodeURIComponent(b)}/score`)
      .then(({ data }) => {
        setScored((prev) => [{ userIdA: a, userIdB: b, at: new Date().toISOString(), ...data }, ...prev]);
        setUserIdA("");
        setUserIdB("");
      })
      .catch((e: unknown) => setScoreError(errText(e, "Could not score this pair.")))
      .finally(() => setScoring(false));
  }

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = scored;
    if (q) rows = rows.filter((s) => s.userIdA.toLowerCase().includes(q) || s.userIdB.toLowerCase().includes(q) || (s.reasoning ?? "").toLowerCase().includes(q));
    return [...rows].sort((x, y) => (sortKey === "score" ? (y.score ?? -1) - (x.score ?? -1) : y.at.localeCompare(x.at)));
  }, [scored, search, sortKey]);

  const avgScore = scored.length ? Math.round((scored.reduce((s, p) => s + (p.score ?? 0), 0) / scored.length) * 10) / 10 : null;
  const bestPair = useMemo(() => [...scored].sort((x, y) => (y.score ?? -1) - (x.score ?? -1))[0], [scored]);

  return (
    <>
      <AgentHeading
        platform={platform}
        agent={agent}
        blurb="The manual trigger for the 6am daily-picks job, plus the full second-opinion compatibility scorer — every pair scored this session, searchable and sortable."
        actions={
          <>
            <button type="button" className="ag-btn ag-btn-solid" onClick={runDailyJob} disabled={running}>
              <Svg path={Icons.heart} size={14} /> {running ? "Running…" : "Run daily match job"}
            </button>
            <Link href={`/${platform.key}/${agent.key}`} className="ag-btn ag-btn-ghost">← Dashboard</Link>
          </>
        }
      />

      <div className="ag-metrics">
        <MetricCard icon={<Svg path={Icons.sparkle} size={24} />} tone="purple" title="Suggestions created (last run)" value={runResult ? num(runResult.suggestionsCreated) : "—"} />
        <MetricCard icon={<Svg path={Icons.users} size={24} />} tone="blue" title="Members processed (last run)" value={runResult ? num(runResult.usersProcessed) : "—"} />
        <MetricCard icon={<Svg path={Icons.heart} size={24} />} tone="pink" title="Pairs scored this session" value={num(scored.length)} />
        <MetricCard icon={<Svg path={Icons.trendUp} size={24} />} tone="gold" title="Average second-opinion score" value={avgScore === null ? "—" : `${avgScore}/100`} />
      </div>

      <div className="ag-split">
        <div className="ag-stack">
          <Panel title="Daily match job" sub="POST /matchmaking/daily/run — normally fires at 6am, this forces a run now">
            {runError && <p style={{ margin: "0 0 12px", fontSize: 12, color: "var(--ag-red)" }}>{runError}</p>}
            {runResult ? (
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 11, color: "var(--ag-ink-faint)" }}>Premium members processed</div>
                  <div className="ag-display" style={{ fontSize: 22, fontWeight: 780 }}>{num(runResult.usersProcessed)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--ag-ink-faint)" }}>Daily suggestions created</div>
                  <div className="ag-display" style={{ fontSize: 22, fontWeight: 780 }}>{num(runResult.suggestionsCreated)}</div>
                </div>
              </div>
            ) : (
              <Empty>{running ? "Scoring premium members against fresh candidates…" : "Not run yet this session. Each premium member without today's picks costs one AI call, so this never runs automatically."}</Empty>
            )}

            {runHistory.length > 1 && (
              <div style={{ marginTop: 16, borderTop: "1px solid var(--ag-border-soft)", paddingTop: 12 }}>
                <div style={{ fontSize: 11, color: "var(--ag-ink-faint)", marginBottom: 8 }}>Earlier runs this session</div>
                <TableWrap>
                  <table className="ag-table">
                    <thead><tr><th>When</th><th style={{ textAlign: "right" }}>Processed</th><th style={{ textAlign: "right" }}>Created</th></tr></thead>
                    <tbody>
                      {runHistory.slice(1).map((r, i) => (
                        <tr key={i}>
                          <td style={{ color: "var(--ag-ink-faint)" }}>{new Date(r.at).toLocaleTimeString()}</td>
                          <td style={{ textAlign: "right" }}>{num(r.usersProcessed)}</td>
                          <td style={{ textAlign: "right" }}>{num(r.suggestionsCreated)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableWrap>
              </div>
            )}
          </Panel>

          <Panel
            title="Second-opinion compatibility score"
            sub="POST /matchmaking/:userIdA/:userIdB/score — sends only redacted profile fields (no email/phone/photos)"
          >
            <div className="ag-form-grid">
              <div className="ag-field">
                <label htmlFor="mm-a">User ID A</label>
                <input id="mm-a" value={userIdA} onChange={(e) => setUserIdA(e.target.value)} placeholder="cuid…" />
              </div>
              <div className="ag-field">
                <label htmlFor="mm-b">User ID B</label>
                <input id="mm-b" value={userIdB} onChange={(e) => setUserIdB(e.target.value)} placeholder="cuid…" />
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <button type="button" className="ag-btn ag-btn-accent ag-btn-sm" onClick={runScore} disabled={scoring || !userIdA.trim() || !userIdB.trim()}>
                <Svg path={Icons.sparkle} size={13} /> {scoring ? "Scoring…" : "Score this pair"}
              </button>
            </div>
            <ActionNote error={scoreError} />
          </Panel>

          <Panel
            title="Scored pairs this session"
            sub={`${visible.length} of ${scored.length} pair(s)`}
            actions={
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by user ID…"
                  style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--ag-border)", background: "var(--ag-bg)", color: "var(--ag-ink)", minWidth: 160 }}
                />
                <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--ag-border)", background: "var(--ag-bg)", color: "var(--ag-ink)" }}>
                  <option value="recent">Most recent</option>
                  <option value="score">Highest score</option>
                </select>
              </div>
            }
            noBody
          >
            {visible.length > 0 ? (
              <TableWrap>
                <table className="ag-table">
                  <thead>
                    <tr>
                      <th>Pair</th>
                      <th style={{ textAlign: "right" }}>Score</th>
                      <th>Reasoning</th>
                      <th>Scored</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((s, i) => (
                      <tr key={`${s.suggestionId ?? i}`}>
                        <td style={{ fontSize: 11 }}>{s.userIdA.slice(0, 8)}… ↔ {s.userIdB.slice(0, 8)}…</td>
                        <td style={{ textAlign: "right", fontWeight: 700 }}>{s.score ?? "—"}</td>
                        <td style={{ color: "var(--ag-ink-soft)", fontSize: 12, maxWidth: 320 }}>{s.reasoning ?? "—"}</td>
                        <td style={{ color: "var(--ag-ink-faint)", whiteSpace: "nowrap", fontSize: 11 }}>{new Date(s.at).toLocaleTimeString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            ) : (
              <div className="ag-panel-body"><Empty>{scored.length === 0 ? "No pairs scored this session yet." : "No pairs match that search."}</Empty></div>
            )}
          </Panel>
        </div>

        <div className="ag-stack">
          <InsightsPanel
            rows={[
              ...(bestPair
                ? [{ icon: <Svg path={Icons.heart} size={15} />, label: "Best pair scored this session", value: `${bestPair.userIdA.slice(0, 8)}… ↔ ${bestPair.userIdB.slice(0, 8)}… at ${bestPair.score ?? "—"}/100.` }]
                : []),
              ...(avgScore !== null
                ? [{ icon: <Svg path={Icons.trendUp} size={15} />, label: "Average this session", value: `${scored.length} pair(s) scored, averaging ${avgScore}/100.` }]
                : []),
              ...(runResult
                ? [{ icon: <Svg path={Icons.sparkle} size={15} />, label: "Last manual run", value: `Processed ${num(runResult.usersProcessed)} premium member(s), created ${num(runResult.suggestionsCreated)} daily suggestion(s).` }]
                : []),
            ]}
          />
        </div>
      </div>
    </>
  );
}
