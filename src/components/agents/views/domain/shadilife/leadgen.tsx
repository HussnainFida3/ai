"use client";

/**
 * ShadiLife — Lead Gen Agent — Leads (domain tab).
 *
 * The deep-dive companion to the Dashboard's lighter overview: the full real
 * lead list with status/type filters, search, pagination, invite/dismiss
 * actions, and the manual "scan all sources now" trigger.
 *
 * Real endpoints:
 *   GET  /api/ai-agents/leadgen/leads?status&leadType   → AgentLead[] — every real lead found so far
 *   POST /api/ai-agents/leadgen/leads/:id/invite        → marks intent (real write)
 *   POST /api/ai-agents/leadgen/leads/:id/dismiss       → real write
 *   POST /api/ai-agents/leadgen/sources/scan-all        → runs the scheduled scan job now (real write)
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { AgentHeading } from "@/components/agents/AgentShell";
import { InsightsPanel, MetricCard, Svg } from "@/components/agents/rich";
import { Icons } from "@/components/agents/icons";
import type { AgentViewProps } from "../../registry";
import { Badge, Empty, ErrorPanel, Panel, TableScroll, arr, describeError, fmtDate, fmtInt, text, useAsync } from "../../shadilife/_shadilife-console-kit";

interface AgentLead {
  id: string;
  bureauName?: string | null;
  city?: string | null;
  category?: string | null;
  status?: string;
  leadType?: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  outreachSentAt?: string | null;
  createdAt?: string;
}

function statusTone(s: string | undefined): "green" | "amber" | "red" | "mute" {
  if (s === "INVITED") return "green";
  if (s === "DISMISSED") return "red";
  return "amber";
}

const PAGE_SIZE = 20;

function Pager({ page, pageCount, onChange }: { page: number; pageCount: number; onChange: (p: number) => void }) {
  if (pageCount <= 1) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, marginTop: 12, fontSize: 11.5, color: "var(--ag-ink-faint)" }}>
      <span>Page {page + 1} of {pageCount}</span>
      <div style={{ display: "flex", gap: 6 }}>
        <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" onClick={() => onChange(Math.max(0, page - 1))} disabled={page === 0}>← Prev</button>
        <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" onClick={() => onChange(Math.min(pageCount - 1, page + 1))} disabled={page >= pageCount - 1}>Next →</button>
      </div>
    </div>
  );
}

export default function ShadiLifeLeadgenLeadsView({ platform, agent, api }: AgentViewProps) {
  const leads = useAsync<AgentLead[]>(platform, async () => arr<AgentLead>((await api.get<AgentLead[]>("/leads")).data), true);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{ scanned?: number; created?: number } | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ bureauName: "", city: "", category: "", contactPhone: "", contactEmail: "", notes: "" });

  const allLeads = (leads.data ?? [])
    .filter((l) => !removedIds.has(l.id))
    .map((l) => (overrides[l.id] ? { ...l, status: overrides[l.id] } : l));

  function act(id: string, action: "invite" | "dismiss") {
    setBusyId(id);
    setActionError(null);
    api
      .post(`/leads/${encodeURIComponent(id)}/${action}`)
      .then(() => setOverrides((prev) => ({ ...prev, [id]: action === "invite" ? "INVITED" : "DISMISSED" })))
      .catch((e: unknown) => setActionError(describeError(e, platform)))
      .finally(() => setBusyId(null));
  }

  function remove(id: string) {
    setBusyId(id);
    setActionError(null);
    api
      .del(`/leads/${encodeURIComponent(id)}`)
      .then(() => setRemovedIds((prev) => new Set(prev).add(id)))
      .catch((e: unknown) => setActionError(describeError(e, platform)))
      .finally(() => setBusyId(null));
  }

  function addLead() {
    if (!form.bureauName.trim()) {
      setActionError("A business name is required.");
      return;
    }
    setSaving(true);
    setActionError(null);
    api
      .post("/leads", {
        bureauName: form.bureauName.trim(),
        city: form.city.trim() || undefined,
        category: form.category.trim() || undefined,
        contactPhone: form.contactPhone.trim() || undefined,
        contactEmail: form.contactEmail.trim() || undefined,
        notes: form.notes.trim() || undefined,
        leadType: "B2B",
      })
      .then(() => {
        setForm({ bureauName: "", city: "", category: "", contactPhone: "", contactEmail: "", notes: "" });
        setShowAdd(false);
        void leads.run();
      })
      .catch((e: unknown) => setActionError(describeError(e, platform)))
      .finally(() => setSaving(false));
  }

  function scanAll() {
    setScanning(true);
    setScanError(null);
    api
      .post<{ scanned?: number; created?: number }>("/sources/scan-all")
      .then(({ data }) => {
        setScanResult(data ?? {});
        void leads.run();
      })
      .catch((e: unknown) => setScanError(describeError(e, platform)))
      .finally(() => setScanning(false));
  }

  const filtered = useMemo(() => {
    let rows = allLeads;
    if (statusFilter) rows = rows.filter((l) => l.status === statusFilter);
    if (typeFilter) rows = rows.filter((l) => l.leadType === typeFilter);
    const q = search.trim().toLowerCase();
    if (q) rows = rows.filter((l) => (l.bureauName ?? "").toLowerCase().includes(q) || (l.city ?? "").toLowerCase().includes(q) || (l.contactEmail ?? "").toLowerCase().includes(q) || (l.contactPhone ?? "").toLowerCase().includes(q));
    return [...rows].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  }, [allLeads, statusFilter, typeFilter, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(pageSafe * PAGE_SIZE, pageSafe * PAGE_SIZE + PAGE_SIZE);

  const pending = allLeads.filter((l) => l.status === "PENDING_REVIEW");
  const withContact = allLeads.filter((l) => l.contactEmail || l.contactPhone);

  return (
    <>
      <AgentHeading
        platform={platform}
        agent={agent}
        blurb="Every real business lead found so far — filter by status and type, search, page through them, and Invite/Dismiss with the same write as before."
        actions={
          <>
            <button type="button" className="ag-btn ag-btn-solid" onClick={scanAll} disabled={scanning}>
              <Svg path={Icons.compass} size={14} /> {scanning ? "Scanning…" : "Run all sources now"}
            </button>
            <button type="button" className="ag-btn ag-btn-ghost" onClick={() => setShowAdd((v) => !v)}>
              <Svg path={Icons.user} size={14} /> Add lead
            </button>
            <Link href={`/${platform.key}/${agent.key}`} className="ag-btn ag-btn-ghost">← Dashboard</Link>
          </>
        }
      />

      {showAdd && (
        <Panel title="Add a lead" sub="Manually add a bureau or business you already know about">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, padding: 4 }}>
            {([
              ["bureauName", "Business / bureau name *"],
              ["city", "City"],
              ["category", "Category"],
              ["contactPhone", "Phone"],
              ["contactEmail", "Email"],
              ["notes", "Notes"],
            ] as const).map(([k, ph]) => (
              <input
                key={k}
                value={form[k]}
                onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                placeholder={ph}
                style={{ fontSize: 12, padding: "7px 10px", borderRadius: 8, border: "1px solid var(--ag-border)", background: "var(--ag-bg)", color: "var(--ag-ink)" }}
              />
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, padding: "12px 4px 4px" }}>
            <button type="button" className="ag-btn ag-btn-solid" onClick={addLead} disabled={saving}>
              {saving ? "Saving…" : "Save lead"}
            </button>
            <button type="button" className="ag-btn ag-btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
          </div>
        </Panel>
      )}

      {leads.error && <ErrorPanel message={leads.error} platform={platform} what="Lead Gen data" />}
      {scanError && <p style={{ margin: "0 0 16px", fontSize: 12, color: "var(--ag-red)" }}>{scanError}</p>}
      {actionError && <p style={{ margin: "0 0 16px", fontSize: 12, color: "var(--ag-red)" }}>{actionError}</p>}

      <div className="ag-metrics">
        <MetricCard icon={<Svg path={Icons.target} size={24} />} tone="purple" title="Total leads" value={leads.loading || leads.error ? "—" : fmtInt(allLeads.length)} />
        <MetricCard icon={<Svg path={Icons.clock} size={24} />} tone="gold" title="Pending review" value={leads.loading || leads.error ? "—" : fmtInt(pending.length)} />
        <MetricCard icon={<Svg path={Icons.link} size={24} />} tone="green" title="With real contact info" value={leads.loading || leads.error ? "—" : fmtInt(withContact.length)} />
        <MetricCard icon={<Svg path={Icons.filter} size={24} />} tone="blue" title="Matching filters" value={fmtInt(filtered.length)} />
      </div>

      {scanResult && (
        <p style={{ margin: "0 0 16px", fontSize: 12, color: "var(--ag-ink-soft)" }}>
          Last scan: {fmtInt(scanResult.scanned)} source(s) scanned, {fmtInt(scanResult.created)} new lead(s) created.
        </p>
      )}

      <Panel
        title="Leads"
        sub={`${filtered.length} of ${allLeads.length} record(s)`}
        actions={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="Search business, city, contact…"
              style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--ag-border)", background: "var(--ag-bg)", color: "var(--ag-ink)", minWidth: 200 }}
            />
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }} style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--ag-border)", background: "var(--ag-bg)", color: "var(--ag-ink)" }}>
              <option value="">All statuses</option>
              <option value="PENDING_REVIEW">Pending review</option>
              <option value="INVITED">Invited</option>
              <option value="DISMISSED">Dismissed</option>
            </select>
            <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(0); }} style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--ag-border)", background: "var(--ag-bg)", color: "var(--ag-ink)" }}>
              <option value="">B2B + B2C</option>
              <option value="B2B">B2B</option>
              <option value="B2C">B2C</option>
            </select>
          </div>
        }
        flush
      >
        {pageRows.length > 0 ? (
          <>
            <TableScroll>
              <table className="ag-table">
                <thead>
                  <tr>
                    <th>Business</th>
                    <th>City</th>
                    <th>Category</th>
                    <th>Contact</th>
                    <th>Status</th>
                    <th>Found</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((l) => (
                    <tr key={l.id}>
                      <td style={{ fontWeight: 650 }}>{text(l.bureauName) || "—"}</td>
                      <td>{text(l.city) || "—"}</td>
                      <td style={{ color: "var(--ag-ink-faint)", fontSize: 11.5 }}>{l.category || "—"}</td>
                      <td style={{ fontSize: 11.5, color: "var(--ag-ink-soft)" }}>{l.contactPhone || l.contactEmail || "—"}</td>
                      <td><Badge tone={statusTone(l.status)}>{l.status ?? "—"}</Badge></td>
                      <td style={{ color: "var(--ag-ink-faint)", whiteSpace: "nowrap" }}>{fmtDate(l.createdAt)}</td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          {l.status === "PENDING_REVIEW" && (
                            <>
                              <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" onClick={() => act(l.id, "invite")} disabled={busyId === l.id}>Invite</button>
                              <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" onClick={() => act(l.id, "dismiss")} disabled={busyId === l.id}>Dismiss</button>
                            </>
                          )}
                          <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" onClick={() => remove(l.id)} disabled={busyId === l.id} title="Remove permanently">Remove</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
            <div style={{ padding: "0 20px 16px" }}>
              <Pager page={pageSafe} pageCount={pageCount} onChange={setPage} />
            </div>
          </>
        ) : (
          <div className="ag-panel-body"><Empty>{leads.loading ? "Loading leads…" : "No leads match these filters."}</Empty></div>
        )}
      </Panel>

      <div style={{ marginTop: 18 }}>
        <InsightsPanel
          rows={[
            ...(pending.length > 0
              ? [{ icon: <Svg path={Icons.clock} size={15} />, label: "Needs review", value: `${fmtInt(pending.length)} lead(s) are waiting for a decision.` }]
              : []),
            ...(scanResult
              ? [{ icon: <Svg path={Icons.compass} size={15} />, label: "Last manual scan", value: `${fmtInt(scanResult.scanned)} source(s) scanned, ${fmtInt(scanResult.created)} new lead(s) created.` }]
              : []),
          ]}
        />
      </div>
    </>
  );
}
