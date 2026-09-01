"use client";

/**
 * ShadiLife — Lead Gen Agent — Dashboard overview.
 *
 * Lighter overview than before: the full lead list with invite/dismiss and
 * the manual "scan all sources now" trigger now live on the Leads tab
 * (components/agents/views/domain/shadilife/leadgen.tsx). This page keeps
 * the sources list (what the scheduled job automatically covers) and a
 * short teaser of the most recent leads.
 *
 * Real endpoints behind this page:
 *   GET /api/ai-agents/leadgen/sources → LeadGenSource[] — the scheduled scan's own source list
 *   GET /api/ai-agents/leadgen/leads   → AgentLead[] — every real lead found so far (teaser only)
 */

import { useMemo } from "react";
import Link from "next/link";
import { AgentHeading } from "@/components/agents/AgentShell";
import { BarList, DonutChart, InsightsPanel, MetricCard, Svg } from "@/components/agents/rich";
import { Icons } from "@/components/agents/icons";
import type { AgentViewProps } from "../registry";
import { Badge, Empty, ErrorPanel, Panel, TableScroll, arr, countBy, fmtDate, fmtInt, share, text, useAsync } from "./_shadilife-console-kit";

interface LeadGenSource {
  id: string;
  url?: string;
  label?: string | null;
  city?: string | null;
  category?: string | null;
  active?: boolean;
  verified?: boolean;
  lastScannedAt?: string | null;
  lastResultCount?: number | null;
}
interface AgentLead {
  id: string;
  bureauName?: string | null;
  city?: string | null;
  category?: string | null;
  status?: string;
  leadType?: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  createdAt?: string;
}

function statusTone(s: string | undefined): "green" | "amber" | "red" | "mute" {
  if (s === "INVITED") return "green";
  if (s === "DISMISSED") return "red";
  return "amber";
}

export default function ShadiLifeLeadgenView({ platform, agent, api }: AgentViewProps) {
  const sources = useAsync<LeadGenSource[]>(platform, async () => arr<LeadGenSource>((await api.get<LeadGenSource[]>("/sources")).data), true);
  const leads = useAsync<AgentLead[]>(platform, async () => arr<AgentLead>((await api.get<AgentLead[]>("/leads")).data), true);

  const allLeads = leads.data ?? [];
  const pending = allLeads.filter((l) => l.status === "PENDING_REVIEW");
  const withContact = allLeads.filter((l) => l.contactEmail || l.contactPhone);
  const statusRows = countBy(allLeads, (l) => l.status ?? null);
  const categoryRows = countBy(allLeads, (l) => l.category ?? "Uncategorized").slice(0, 8);
  const activeSources = (sources.data ?? []).filter((s) => s.active);

  const recentLeads = useMemo(() => [...allLeads].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? "")).slice(0, 5), [allLeads]);

  return (
    <>
      <AgentHeading
        platform={platform}
        agent={agent}
        blurb="The scheduled scan's own source list and top-level lead counts. The full lead list with Invite/Dismiss and the manual scan trigger live on the Leads tab."
        actions={
          <>
            <Link href={`/${platform.key}/${agent.key}/leads`} className="ag-btn ag-btn-solid">
              <Svg path={Icons.target} size={14} /> Open Leads
            </Link>
            <Link href={`/${platform.key}/${agent.key}/chat`} className="ag-btn ag-btn-ghost">Ask this agent →</Link>
          </>
        }
      />

      {sources.error && leads.error && <ErrorPanel message={leads.error} platform={platform} what="Lead Gen data" />}

      <div className="ag-metrics">
        <MetricCard icon={<Svg path={Icons.target} size={24} />} tone="purple" title="Total leads" value={leads.loading || leads.error ? "—" : fmtInt(allLeads.length)} />
        <MetricCard icon={<Svg path={Icons.clock} size={24} />} tone="gold" title="Pending review" value={leads.loading || leads.error ? "—" : fmtInt(pending.length)} />
        <MetricCard icon={<Svg path={Icons.link} size={24} />} tone="green" title="With real contact info" value={leads.loading || leads.error ? "—" : fmtInt(withContact.length)} />
        <MetricCard icon={<Svg path={Icons.compass} size={24} />} tone="blue" title="Active sources" value={sources.loading || sources.error ? "—" : fmtInt(activeSources.length)} />
      </div>

      <div className="ag-split">
        <div className="ag-stack">
          <Panel
            title="Recent leads"
            sub={`${allLeads.length} real business record(s) — showing the top 5`}
            actions={<Link href={`/${platform.key}/${agent.key}/leads`} className="ag-btn ag-btn-ghost ag-btn-sm">View all in Leads →</Link>}
            flush
          >
            {recentLeads.length > 0 ? (
              <TableScroll>
                <table className="ag-table">
                  <thead>
                    <tr>
                      <th>Business</th>
                      <th>City</th>
                      <th>Contact</th>
                      <th>Status</th>
                      <th>Found</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentLeads.map((l) => (
                      <tr key={l.id}>
                        <td style={{ fontWeight: 650 }}>{text(l.bureauName) || "—"}</td>
                        <td>{text(l.city) || "—"}</td>
                        <td style={{ fontSize: 11.5, color: "var(--ag-ink-soft)" }}>{l.contactPhone || l.contactEmail || "—"}</td>
                        <td><Badge tone={statusTone(l.status)}>{l.status ?? "—"}</Badge></td>
                        <td style={{ color: "var(--ag-ink-faint)", whiteSpace: "nowrap" }}>{fmtDate(l.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableScroll>
            ) : (
              <Empty>{leads.loading ? "Loading leads…" : "No leads found yet."}</Empty>
            )}
          </Panel>

          <Panel title="Sources" sub="Scanned automatically by the scheduled job" flush>
            {(sources.data ?? []).length > 0 ? (
              <TableScroll>
                <table className="ag-table">
                  <thead>
                    <tr>
                      <th>Source</th>
                      <th>Category</th>
                      <th>Status</th>
                      <th>Last result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(sources.data ?? []).slice(0, 20).map((s) => (
                      <tr key={s.id}>
                        <td style={{ maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.label || s.url}</td>
                        <td>{s.category || "—"}</td>
                        <td><Badge tone={s.active ? "green" : "mute"}>{s.active ? "Active" : "Paused"}</Badge></td>
                        <td style={{ color: "var(--ag-ink-faint)" }}>{s.lastResultCount != null ? `${s.lastResultCount} lead(s)` : "Never scanned"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableScroll>
            ) : (
              <Empty>{sources.loading ? "Loading sources…" : "No sources configured yet."}</Empty>
            )}
          </Panel>
        </div>

        <div className="ag-stack">
          <Panel title="Leads by status" sub="Real AgentLead rows">
            {statusRows.length > 0 ? (
              <DonutChart data={statusRows} totalLabel="Leads" />
            ) : (
              <Empty>{leads.loading ? "Loading…" : "No leads yet."}</Empty>
            )}
          </Panel>

          <Panel title="Top categories" sub="Where leads are coming from">
            <BarList rows={categoryRows} ranked color={agent.accent} emptyText={leads.loading ? "Loading…" : "No leads yet."} />
          </Panel>

          <InsightsPanel
            rows={[
              ...(pending.length > 0
                ? [{ icon: <Svg path={Icons.clock} size={15} />, label: "Needs review", value: `${fmtInt(pending.length)} lead(s) are waiting for a decision.` }]
                : []),
              ...(allLeads.length > 0
                ? [{ icon: <Svg path={Icons.link} size={15} />, label: "Contactable share", value: `${share(withContact.length, allLeads.length) ?? 0}% of leads have a real phone or email on file.` }]
                : []),
              { icon: <Svg path={Icons.target} size={15} />, label: "Full lead workspace", value: "Filter, search, and Invite/Dismiss every lead on the Leads tab." },
            ]}
          />
        </div>
      </div>
    </>
  );
}
