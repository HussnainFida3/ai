"use client";

/**
 * GhrFix — Marketing Agent — Campaigns (5th tab).
 *
 * Owns the full campaign-management surface the Dashboard only teases: every
 * promo code with the create/toggle actions, and every broadcast with the
 * send form. Same `/campaigns`, `/promo`, `PATCH /promo/:id` and
 * `/broadcast` endpoints as before — nothing new on the backend, just moved
 * off the Dashboard and given real client-side filtering.
 */

import { useMemo, useState } from "react";
import { AgentHeading } from "@/components/agents/AgentShell";
import { Avatar, InsightsPanel, MetricCard, Svg } from "@/components/agents/rich";
import { Icons } from "@/components/agents/icons";
import { ApiError, type AgentStats } from "@/lib/api";
import type { AgentViewProps } from "../../registry";
import { Empty, ErrorNote, Panel, Pill, TableWrap, dateTime, dec, num, useLoad } from "../../ghrfix/_kit-core";

type PromoType = "FLAT" | "PERCENT";
type Audience = "ALL" | "CUSTOMER_MODE" | "PROVIDER_MODE";

interface PromoCode {
  id: string;
  code: string;
  type: PromoType;
  value: string;
  minOrder: string | null;
  maxDiscount: string | null;
  usageLimit: number | null;
  perUserLimit: number;
  usedCount: number;
  validFrom: string;
  validTo: string | null;
  isActive: boolean;
  createdAt: string;
}

interface Broadcast {
  id: string;
  title: string;
  body: string;
  audience: Audience;
  recipientCount: number;
  createdAt: string;
  sentBy: { id: string; name: string | null };
}

interface Campaigns {
  promoCodes: PromoCode[];
  broadcasts: Broadcast[];
}

const AUDIENCE_LABEL: Record<Audience, string> = { ALL: "Everyone", CUSTOMER_MODE: "Customers", PROVIDER_MODE: "Providers" };
const emptyPromo = { code: "", type: "FLAT" as PromoType, value: "", minOrder: "", maxDiscount: "", usageLimit: "", perUserLimit: "1" };
const emptyBroadcast = { title: "", body: "", audience: "ALL" as Audience };

type PromoFilter = "ALL" | "ACTIVE" | "INACTIVE";

export default function GhrfixMarketingCampaignsView({ platform, agent, api }: AgentViewProps) {
  const [promoFilter, setPromoFilter] = useState<PromoFilter>("ALL");
  const [promoSearch, setPromoSearch] = useState("");

  const [promoForm, setPromoForm] = useState(emptyPromo);
  const [promoBusy, setPromoBusy] = useState(false);
  const [promoMsg, setPromoMsg] = useState<string | null>(null);
  const [promoErr, setPromoErr] = useState<string | null>(null);

  const [broadcastForm, setBroadcastForm] = useState(emptyBroadcast);
  const [broadcastBusy, setBroadcastBusy] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState<string | null>(null);
  const [broadcastErr, setBroadcastErr] = useState<string | null>(null);

  const [toggleBusyId, setToggleBusyId] = useState<string | null>(null);

  const load = useLoad(async () => {
    const [campaigns, stats] = await Promise.allSettled([api.get<Campaigns>("/campaigns"), api.stats()]);
    if (campaigns.status === "rejected") throw campaigns.reason;
    return {
      campaigns: campaigns.value.data,
      stats: stats.status === "fulfilled" ? (stats.value.data as AgentStats) : null,
    };
  }, [platform.key, agent.key]);

  const c = load.data?.campaigns ?? null;
  const promos = c?.promoCodes ?? [];
  const broadcasts = c?.broadcasts ?? [];

  const filteredPromos = useMemo(() => {
    return promos.filter((p) => {
      if (promoFilter === "ACTIVE" && !p.isActive) return false;
      if (promoFilter === "INACTIVE" && p.isActive) return false;
      if (promoSearch.trim() && !p.code.toLowerCase().includes(promoSearch.trim().toLowerCase())) return false;
      return true;
    });
  }, [promos, promoFilter, promoSearch]);

  const activeCount = promos.filter((p) => p.isActive).length;
  const totalRedemptions = promos.reduce((a, b) => a + b.usedCount, 0);
  const totalRecipients = broadcasts.reduce((a, b) => a + b.recipientCount, 0);
  const topPromo = [...promos].sort((a, b) => b.usedCount - a.usedCount)[0] ?? null;

  async function createPromo() {
    if (!promoForm.code.trim() || !promoForm.value.trim()) return;
    setPromoBusy(true);
    setPromoMsg(null);
    setPromoErr(null);
    try {
      const body: Record<string, unknown> = {
        code: promoForm.code.trim().toUpperCase(),
        type: promoForm.type,
        value: Number(promoForm.value),
      };
      if (promoForm.minOrder.trim()) body.minOrder = Number(promoForm.minOrder);
      if (promoForm.maxDiscount.trim()) body.maxDiscount = Number(promoForm.maxDiscount);
      if (promoForm.usageLimit.trim()) body.usageLimit = Number(promoForm.usageLimit);
      if (promoForm.perUserLimit.trim()) body.perUserLimit = Number(promoForm.perUserLimit);
      const { data } = await api.post<PromoCode>("/promo", body);
      setPromoMsg(`Promo code ${data.code} created.`);
      setPromoForm(emptyPromo);
      load.reload();
    } catch (e) {
      setPromoErr(e instanceof ApiError ? e.message : "Could not create that promo code.");
    } finally {
      setPromoBusy(false);
    }
  }

  async function togglePromo(p: PromoCode) {
    setToggleBusyId(p.id);
    setPromoMsg(null);
    setPromoErr(null);
    try {
      await api.patch(`/promo/${p.id}`, { isActive: !p.isActive });
      setPromoMsg(`${p.code} is now ${!p.isActive ? "active" : "inactive"}.`);
      load.reload();
    } catch (e) {
      setPromoErr(e instanceof ApiError ? e.message : "Could not update that promo code.");
    } finally {
      setToggleBusyId(null);
    }
  }

  async function sendBroadcast() {
    if (!broadcastForm.title.trim() || !broadcastForm.body.trim()) return;
    setBroadcastBusy(true);
    setBroadcastMsg(null);
    setBroadcastErr(null);
    try {
      const { data } = await api.post<Broadcast>("/broadcast", broadcastForm);
      setBroadcastMsg(`Sent "${data.title}" to ${data.recipientCount.toLocaleString()} ${AUDIENCE_LABEL[data.audience].toLowerCase()}.`);
      setBroadcastForm(emptyBroadcast);
      load.reload();
    } catch (e) {
      setBroadcastErr(e instanceof ApiError ? e.message : "Could not send that broadcast.");
    } finally {
      setBroadcastBusy(false);
    }
  }

  return (
    <>
      <AgentHeading
        platform={platform}
        agent={agent}
        blurb="Every promo code and every broadcast, with the create, toggle and send actions right here. Nothing on this page is a preview — every write lands immediately."
        actions={
          <button type="button" className="ag-btn ag-btn-ghost" onClick={load.reload} disabled={load.loading}>
            <Svg path={Icons.refresh} size={15} /> {load.loading ? "Refreshing…" : "Refresh"}
          </button>
        }
      />

      {load.error && <ErrorNote error={load.error} hint={`Campaigns reads ${platform.apiBase}${agent.base}/campaigns. Connect ${platform.label} first if this persists.`} />}

      <div className="ag-metrics">
        <MetricCard icon={<Svg path={Icons.target} size={24} />} tone="purple" title="Active promo codes" value={load.loading ? "—" : num(activeCount)} />
        <MetricCard icon={<Svg path={Icons.wand} size={24} />} tone="pink" title="Total redemptions" value={load.loading ? "—" : num(totalRedemptions)} />
        <MetricCard icon={<Svg path={Icons.megaphone} size={24} />} tone="blue" title="Broadcasts sent" value={load.loading ? "—" : num(broadcasts.length)} />
        <MetricCard icon={<Svg path={Icons.users} size={24} />} tone="green" title="Recipients reached" value={load.loading ? "—" : num(totalRecipients)} />
      </div>

      {(promoMsg || promoErr) && (
        <div style={{ margin: "0 0 14px" }}>
          <p style={{ margin: 0, fontSize: 11.5, fontWeight: 650, color: promoErr ? "var(--ag-red)" : "var(--ag-green)" }}>{promoErr ?? promoMsg}</p>
        </div>
      )}

      <div className="ag-split">
        <div className="ag-stack">
          <Panel
            title="Promo codes"
            sub={`${filteredPromos.length} of ${promos.length} shown · ${activeCount} active overall`}
            noBody
            actions={
              <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input
                  value={promoSearch}
                  onChange={(e) => setPromoSearch(e.target.value)}
                  placeholder="Search code…"
                  style={{ fontSize: 11.5, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--ag-border)", background: "var(--ag-panel)", color: "var(--ag-ink)", minWidth: 130 }}
                />
                <select
                  value={promoFilter}
                  onChange={(e) => setPromoFilter(e.target.value as PromoFilter)}
                  style={{ fontSize: 11.5, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--ag-border)", background: "var(--ag-panel)", color: "var(--ag-ink)" }}
                >
                  <option value="ALL">All</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </span>
            }
          >
            <TableWrap>
              <table className="ag-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Discount</th>
                    <th>Used</th>
                    <th>Valid window</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPromos.map((p) => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 700, fontFamily: "monospace" }}>{p.code}</td>
                      <td>{p.type === "FLAT" ? `${dec(p.value)} GC flat` : `${dec(p.value)}%`}</td>
                      <td>{p.usedCount}{p.usageLimit ? ` / ${p.usageLimit}` : ""}</td>
                      <td style={{ color: "var(--ag-ink-faint)", fontSize: 11.5 }}>
                        {dateTime(p.validFrom)} → {p.validTo ? dateTime(p.validTo) : "no expiry"}
                      </td>
                      <td><Pill text={p.isActive ? "Active" : "Inactive"} tone={p.isActive ? "green" : "mute"} /></td>
                      <td>
                        <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" disabled={toggleBusyId === p.id} onClick={() => togglePromo(p)}>
                          {toggleBusyId === p.id ? "Working…" : p.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredPromos.length === 0 && (
                    <tr>
                      <td colSpan={6}><Empty>{load.loading ? "Loading promo codes…" : "No promo code matches this filter."}</Empty></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </TableWrap>
          </Panel>

          <Panel title="Create a promo code" sub="Real write against POST /promo">
            <div className="ag-form-grid">
              <div className="ag-field">
                <label htmlFor="mk-code">Code</label>
                <input id="mk-code" value={promoForm.code} onChange={(e) => setPromoForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="SUMMER20" />
              </div>
              <div className="ag-field">
                <label htmlFor="mk-type">Type</label>
                <select id="mk-type" value={promoForm.type} onChange={(e) => setPromoForm((f) => ({ ...f, type: e.target.value as PromoType }))}>
                  <option value="FLAT">Flat (GC)</option>
                  <option value="PERCENT">Percent (%)</option>
                </select>
              </div>
              <div className="ag-field">
                <label htmlFor="mk-value">Value</label>
                <input id="mk-value" inputMode="decimal" value={promoForm.value} onChange={(e) => setPromoForm((f) => ({ ...f, value: e.target.value }))} placeholder={promoForm.type === "FLAT" ? "50" : "10"} />
              </div>
              <div className="ag-field">
                <label htmlFor="mk-min">Minimum order (optional)</label>
                <input id="mk-min" inputMode="decimal" value={promoForm.minOrder} onChange={(e) => setPromoForm((f) => ({ ...f, minOrder: e.target.value }))} />
              </div>
              <div className="ag-field">
                <label htmlFor="mk-max">Max discount (optional)</label>
                <input id="mk-max" inputMode="decimal" value={promoForm.maxDiscount} onChange={(e) => setPromoForm((f) => ({ ...f, maxDiscount: e.target.value }))} />
              </div>
              <div className="ag-field">
                <label htmlFor="mk-limit">Total usage limit (optional)</label>
                <input id="mk-limit" inputMode="numeric" value={promoForm.usageLimit} onChange={(e) => setPromoForm((f) => ({ ...f, usageLimit: e.target.value }))} />
              </div>
              <div className="ag-field">
                <label htmlFor="mk-per-user">Per-user limit</label>
                <input id="mk-per-user" inputMode="numeric" value={promoForm.perUserLimit} onChange={(e) => setPromoForm((f) => ({ ...f, perUserLimit: e.target.value }))} />
              </div>
            </div>
            <button type="button" className="ag-btn ag-btn-accent ag-btn-sm" style={{ marginTop: 14 }} disabled={promoBusy || !promoForm.code.trim() || !promoForm.value.trim()} onClick={createPromo}>
              {promoBusy ? "Creating…" : "Create promo code"}
            </button>
          </Panel>

          {(broadcastMsg || broadcastErr) && (
            <div style={{ padding: "0 2px" }}>
              <p style={{ margin: 0, fontSize: 11.5, fontWeight: 650, color: broadcastErr ? "var(--ag-red)" : "var(--ag-green)" }}>{broadcastErr ?? broadcastMsg}</p>
            </div>
          )}

          <Panel title="Send a broadcast" sub="Real write against POST /broadcast — creates in-app notifications immediately">
            <div className="ag-form-grid">
              <div className="ag-field">
                <label htmlFor="mk-b-title">Title</label>
                <input id="mk-b-title" value={broadcastForm.title} onChange={(e) => setBroadcastForm((f) => ({ ...f, title: e.target.value }))} placeholder="New feature available" />
              </div>
              <div className="ag-field">
                <label htmlFor="mk-b-audience">Audience</label>
                <select id="mk-b-audience" value={broadcastForm.audience} onChange={(e) => setBroadcastForm((f) => ({ ...f, audience: e.target.value as Audience }))}>
                  <option value="ALL">Everyone</option>
                  <option value="CUSTOMER_MODE">Customers</option>
                  <option value="PROVIDER_MODE">Providers</option>
                </select>
              </div>
              <div className="ag-field" style={{ gridColumn: "1 / -1" }}>
                <label htmlFor="mk-b-body">Message</label>
                <textarea id="mk-b-body" rows={3} value={broadcastForm.body} onChange={(e) => setBroadcastForm((f) => ({ ...f, body: e.target.value }))} placeholder="What do you want to tell them?" />
              </div>
            </div>
            <button type="button" className="ag-btn ag-btn-accent ag-btn-sm" style={{ marginTop: 14 }} disabled={broadcastBusy || !broadcastForm.title.trim() || !broadcastForm.body.trim()} onClick={sendBroadcast}>
              {broadcastBusy ? "Sending…" : "Send broadcast"}
            </button>
          </Panel>

          <Panel title="Recent broadcasts" sub={`${broadcasts.length} on record`} noBody>
            <TableWrap>
              <table className="ag-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Audience</th>
                    <th>Recipients</th>
                    <th>Sent by</th>
                    <th>Sent</th>
                  </tr>
                </thead>
                <tbody>
                  {broadcasts.map((b) => (
                    <tr key={b.id}>
                      <td style={{ fontWeight: 650 }}>{b.title}</td>
                      <td>{AUDIENCE_LABEL[b.audience]}</td>
                      <td>{b.recipientCount.toLocaleString()}</td>
                      <td>
                        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Avatar name={b.sentBy.name} size={22} />
                          {b.sentBy.name ?? "—"}
                        </span>
                      </td>
                      <td style={{ whiteSpace: "nowrap", color: "var(--ag-ink-faint)" }}>{dateTime(b.createdAt)}</td>
                    </tr>
                  ))}
                  {broadcasts.length === 0 && (
                    <tr>
                      <td colSpan={5}><Empty>{load.loading ? "Loading broadcasts…" : "No broadcast has been sent yet."}</Empty></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </TableWrap>
          </Panel>
        </div>

        <div className="ag-stack">
          <InsightsPanel
            title="Campaign detail"
            rows={[
              {
                icon: <Svg path={Icons.crown} size={15} />,
                label: "Top performing code",
                value: topPromo && topPromo.usedCount > 0 ? `${topPromo.code} has been redeemed ${topPromo.usedCount} time${topPromo.usedCount === 1 ? "" : "s"}.` : "No promo code has been redeemed yet.",
              },
              {
                icon: <Svg path={Icons.megaphone} size={15} />,
                label: "Last broadcast",
                value: broadcasts[0] ? `"${broadcasts[0].title}" reached ${broadcasts[0].recipientCount.toLocaleString()} ${AUDIENCE_LABEL[broadcasts[0].audience].toLowerCase()}, ${dateTime(broadcasts[0].createdAt)}.` : "No broadcast sent yet.",
              },
              {
                icon: <Svg path={Icons.filter} size={15} />,
                label: "Filtering the code list",
                value: "Search and the Active/Inactive filter above only change what's shown here — the create and send forms always act immediately, unfiltered.",
              },
            ]}
          />
        </div>
      </div>
    </>
  );
}
