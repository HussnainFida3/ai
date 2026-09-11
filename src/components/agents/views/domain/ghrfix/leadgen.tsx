"use client";

/**
 * GhrFix — Lead Gen Agent — Provider Leads CRM.
 *
 * Real businesses found on public data (OpenStreetMap) that GhrFix can recruit
 * as providers, plus manually-added leads. A full CRM over the backend:
 *   GET    /leads?status&category&city&search  → ProviderLead[]
 *   GET    /stats                              → totals
 *   POST   /leads                              → add one manually
 *   PATCH  /leads/:id                          → edit fields / move status
 *   DELETE /leads/:id                          → remove
 *   POST   /leads/:id/{invite|dismiss|convert|contact}
 *   POST   /sources/scan-all                   → pull more from public data now
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { InsightsPanel, MetricCard, Svg } from "@/components/agents/rich";
import { Icons } from "@/components/agents/icons";
import { ApiError } from "@/lib/api";
import type { AgentViewProps } from "../../registry";
import { Empty, ErrorNote, Panel, Pill, TableWrap, dateTime, useLoad } from "../../ghrfix/_kit-core";

type Status = "NEW" | "CONTACTED" | "INVITED" | "CONVERTED" | "DISMISSED";

interface Lead {
  id: string;
  name: string;
  category: string | null;
  city: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  source: string;
  status: Status;
  notes: string | null;
  createdAt: string;
}

interface Stats {
  total: number;
  withContact: number;
  byStatus: Record<string, number>;
  byCategory: Array<{ category: string; count: number }>;
}

const STATUS_TONE: Record<Status, "green" | "amber" | "red" | "mute"> = {
  NEW: "amber",
  CONTACTED: "amber",
  INVITED: "green",
  CONVERTED: "green",
  DISMISSED: "red",
};
const NEXT: Partial<Record<Status, { action: string; label: string }>> = {
  NEW: { action: "contact", label: "Mark contacted" },
  CONTACTED: { action: "invite", label: "Invite" },
  INVITED: { action: "convert", label: "Mark joined" },
};
const PAGE_SIZE = 20;

const inputStyle: React.CSSProperties = {
  fontSize: 12,
  padding: "7px 10px",
  borderRadius: 8,
  border: "1px solid var(--ag-border)",
  background: "var(--ag-bg)",
  color: "var(--ag-ink)",
};

export default function GhrfixLeadgenCrmView({ platform, agent, api }: AgentViewProps) {
  const leads = useLoad<Lead[]>(() => api.get<Lead[]>("/leads").then((r) => r.data), []);
  const stats = useLoad<Stats>(() => api.get<Stats>("/stats").then((r) => r.data), []);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{ created?: number; duplicates?: number; usable?: number } | null>(null);

  // Add-lead form
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", category: "", city: "", phone: "", email: "", notes: "" });

  const reload = () => {
    void leads.reload();
    void stats.reload();
  };

  async function scan() {
    setScanning(true);
    setActionError(null);
    try {
      const { data } = await api.post<{ created?: number; duplicates?: number; usable?: number }>("/sources/scan-all");
      setScanResult(data ?? {});
      reload();
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : "Could not scan public sources right now.");
    } finally {
      setScanning(false);
    }
  }

  async function move(id: string, action: string) {
    setBusyId(id);
    setActionError(null);
    try {
      await api.post(`/leads/${encodeURIComponent(id)}/${action}`);
      reload();
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : "That action failed.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    setBusyId(id);
    setActionError(null);
    try {
      await api.del(`/leads/${encodeURIComponent(id)}`);
      reload();
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : "Could not remove that lead.");
    } finally {
      setBusyId(null);
    }
  }

  async function addLead() {
    if (!form.name.trim()) {
      setActionError("A business name is required.");
      return;
    }
    setSaving(true);
    setActionError(null);
    try {
      await api.post("/leads", {
        name: form.name.trim(),
        category: form.category.trim() || undefined,
        city: form.city.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });
      setForm({ name: "", category: "", city: "", phone: "", email: "", notes: "" });
      setShowAdd(false);
      reload();
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : "Could not add that lead.");
    } finally {
      setSaving(false);
    }
  }

  const rows = leads.data ?? [];
  const categories = useMemo(
    () => Array.from(new Set(rows.map((l) => l.category).filter(Boolean) as string[])).sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    let r = rows;
    if (statusFilter) r = r.filter((l) => l.status === statusFilter);
    if (categoryFilter) r = r.filter((l) => l.category === categoryFilter);
    const q = search.trim().toLowerCase();
    if (q) {
      r = r.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          (l.city ?? "").toLowerCase().includes(q) ||
          (l.phone ?? "").toLowerCase().includes(q) ||
          (l.email ?? "").toLowerCase().includes(q),
      );
    }
    return r;
  }, [rows, statusFilter, categoryFilter, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(pageSafe * PAGE_SIZE, pageSafe * PAGE_SIZE + PAGE_SIZE);

  const s = stats.data;

  return (
    <>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 18 }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 750, color: "var(--ag-ink)" }}>Provider Leads</h1>
          <p style={{ margin: 0, fontSize: 12.5, color: "var(--ag-ink-soft)", maxWidth: 560, lineHeight: 1.6 }}>
            Real businesses found on public data (OpenStreetMap) to recruit as providers, plus anything you add by hand.
            Scan pulls more; every lead is deduplicated by name and city.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="ag-btn ag-btn-solid" onClick={scan} disabled={scanning}>
            <Svg path={Icons.compass} size={14} /> {scanning ? "Scanning public data…" : "Find more leads"}
          </button>
          <button type="button" className="ag-btn ag-btn-ghost" onClick={() => setShowAdd((v) => !v)}>
            <Svg path={Icons.user} size={14} /> Add lead
          </button>
          <Link href={`/${platform.key}/${agent.key}`} className="ag-btn ag-btn-ghost">← Dashboard</Link>
        </div>
      </div>

      {leads.error && <ErrorNote error={leads.error} hint="The Lead Gen backend may still be starting." />}
      {actionError && <p style={{ margin: "0 0 14px", fontSize: 12, color: "var(--ag-red)" }}>{actionError}</p>}
      {scanResult && (
        <p style={{ margin: "0 0 14px", fontSize: 12, color: "var(--ag-ink-soft)" }}>
          Last scan added <strong>{scanResult.created ?? 0}</strong> new lead(s); {scanResult.duplicates ?? 0} already existed.
        </p>
      )}

      <div className="ag-metrics">
        <MetricCard icon={<Svg path={Icons.target} size={24} />} tone="purple" title="Total leads" value={s ? String(s.total) : "—"} />
        <MetricCard icon={<Svg path={Icons.link} size={24} />} tone="green" title="With contact info" value={s ? String(s.withContact) : "—"} />
        <MetricCard icon={<Svg path={Icons.clock} size={24} />} tone="gold" title="New / to work" value={s ? String(s.byStatus.NEW ?? 0) : "—"} />
        <MetricCard icon={<Svg path={Icons.check} size={24} />} tone="blue" title="Joined" value={s ? String(s.byStatus.CONVERTED ?? 0) : "—"} />
      </div>

      {showAdd && (
        <Panel title="Add a lead" sub="Manually add a provider you already know about">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, padding: 4 }}>
            <input style={inputStyle} placeholder="Business name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input style={inputStyle} placeholder="Category (e.g. Electrician)" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            <input style={inputStyle} placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            <input style={inputStyle} placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <input style={inputStyle} placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input style={inputStyle} placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div style={{ display: "flex", gap: 8, padding: "12px 4px 4px" }}>
            <button type="button" className="ag-btn ag-btn-solid" onClick={addLead} disabled={saving}>
              {saving ? "Saving…" : "Save lead"}
            </button>
            <button type="button" className="ag-btn ag-btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
          </div>
        </Panel>
      )}

      <div style={{ marginTop: showAdd ? 18 : 0 }}>
        <Panel
          title="Leads"
          sub={`${filtered.length} of ${rows.length} record(s)`}
          actions={
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} placeholder="Search name, city, contact…" style={{ ...inputStyle, minWidth: 200 }} />
              <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }} style={inputStyle}>
                <option value="">All statuses</option>
                <option value="NEW">New</option>
                <option value="CONTACTED">Contacted</option>
                <option value="INVITED">Invited</option>
                <option value="CONVERTED">Joined</option>
                <option value="DISMISSED">Dismissed</option>
              </select>
              <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(0); }} style={inputStyle}>
                <option value="">All categories</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          }
        >
          {pageRows.length > 0 ? (
            <>
              <TableWrap>
                <table className="ag-table">
                  <thead>
                    <tr>
                      <th>Business</th>
                      <th>Category</th>
                      <th>City</th>
                      <th>Contact</th>
                      <th>Status</th>
                      <th>Found</th>
                      <th style={{ textAlign: "right" }} />
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((l) => {
                      const next = NEXT[l.status];
                      return (
                        <tr key={l.id}>
                          <td style={{ fontWeight: 650 }}>
                            {l.name}
                            {l.source === "MANUAL" && <span style={{ marginLeft: 6, fontSize: 9.5, color: "var(--ag-ink-faint)" }}>· added</span>}
                          </td>
                          <td style={{ color: "var(--ag-ink-faint)", fontSize: 11.5 }}>{l.category ?? "—"}</td>
                          <td>{l.city ?? "—"}</td>
                          <td style={{ fontSize: 11.5, color: "var(--ag-ink-soft)" }}>{l.phone || l.email || "—"}</td>
                          <td><Pill text={l.status} tone={STATUS_TONE[l.status]} /></td>
                          <td style={{ color: "var(--ag-ink-faint)", whiteSpace: "nowrap" }}>{dateTime(l.createdAt)}</td>
                          <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                            <div style={{ display: "inline-flex", gap: 6 }}>
                              {next && (
                                <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" onClick={() => move(l.id, next.action)} disabled={busyId === l.id}>
                                  {next.label}
                                </button>
                              )}
                              {l.status !== "DISMISSED" && l.status !== "CONVERTED" && (
                                <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" onClick={() => move(l.id, "dismiss")} disabled={busyId === l.id}>
                                  Dismiss
                                </button>
                              )}
                              <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" onClick={() => remove(l.id)} disabled={busyId === l.id} title="Remove permanently">
                                Remove
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </TableWrap>
              {pageCount > 1 && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, marginTop: 12, fontSize: 11.5, color: "var(--ag-ink-faint)" }}>
                  <span>Page {pageSafe + 1} of {pageCount}</span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" onClick={() => setPage(Math.max(0, pageSafe - 1))} disabled={pageSafe === 0}>← Prev</button>
                    <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" onClick={() => setPage(Math.min(pageCount - 1, pageSafe + 1))} disabled={pageSafe >= pageCount - 1}>Next →</button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <Empty>{leads.loading ? "Loading leads…" : "No leads match these filters. Try “Find more leads”."}</Empty>
          )}
        </Panel>
      </div>

      {s && s.byCategory.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <InsightsPanel
            rows={s.byCategory.slice(0, 6).map((c) => ({
              icon: <Svg path={Icons.target} size={15} />,
              label: c.category,
              value: `${c.count} lead(s)`,
            }))}
          />
        </div>
      )}
    </>
  );
}
