"use client";

/**
 * Marketing Agent — Campaigns.
 *
 * The full campaign surface each backend actually exposes to a reader:
 * on GhrFix that is every promo code (with its real usedCount and usage cap)
 * plus every broadcast in the returned log; on ShadiLife there is no campaign
 * or promo listing endpoint at all, so the page says that plainly and shows
 * the one real campaign record it does have — this agent's own rows in the
 * shared audit feed.
 *
 * Read-only: the "New promo code" and "New broadcast" controls are inert on
 * purpose. Creating and sending are real audited writes and are not wired up
 * from this workspace.
 */

import { useMemo, useState } from "react";
import { usePlatformParam, platformLabel } from "@/lib/agent-data";
import { useMarketingSnapshot, AUDIENCE_LABEL } from "@/lib/marketing-data";
import {
  BarRows,
  Card,
  Donut,
  Empty,
  ErrorNote,
  Icon,
  Legend,
  Pill,
  SpecialShell,
  SERIES,
  StatCard,
  type NavItem,
} from "@/components/special/kit";

const NAV: NavItem[] = [
  { label: "Overview", icon: "dashboard", slug: "overview" },
  { label: "Campaigns", icon: "tag", slug: "campaigns" },
  { label: "Audience", icon: "users", slug: "audience" },
  { label: "Chat with AI Agent", icon: "chat", slug: "chat" },
];

const PAGE_SIZE = 12;
const PROMO_TABS = ["All", "Active", "Expired", "Disabled"] as const;
const EVENT_TABS = ["All", "AI calls", "Suggestions"] as const;
const STATUS_COLOR: Record<string, string> = { Active: "#0f9e69", Expired: "#c9860f", Disabled: "#69738c" };

type PromoTab = (typeof PROMO_TABS)[number];
type EventTab = (typeof EVENT_TABS)[number];

export default function MarketingCampaignsPage({ params }: { params: Promise<{ platform: string }> }) {
  const platform = usePlatformParam(params);
  const m = useMarketingSnapshot(platform);
  const label = platformLabel(platform);
  const caps = m.capabilities;

  const [promoTab, setPromoTab] = useState<PromoTab>("All");
  const [eventTab, setEventTab] = useState<EventTab>("All");
  const [typeFilter, setTypeFilter] = useState("All types");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  /* One filtered list drives the table; which rows it holds depends on what
     the platform genuinely returns. */
  const promoRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return m.promos.filter((p) => {
      if (promoTab === "Active" && !(p.isActive && !p.expired)) return false;
      if (promoTab === "Expired" && !p.expired) return false;
      if (promoTab === "Disabled" && !(!p.isActive && !p.expired)) return false;
      if (typeFilter === "Flat discount" && p.type !== "FLAT") return false;
      if (typeFilter === "Percent discount" && p.type !== "PERCENT") return false;
      if (q && !p.code.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [m.promos, promoTab, typeFilter, search]);

  const eventRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return m.events.filter((e) => {
      if (eventTab === "AI calls" && e.kind !== "call") return false;
      if (eventTab === "Suggestions" && e.kind !== "suggestion") return false;
      if (q && !`${e.endpoint ?? ""} ${e.status ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [m.events, eventTab, search]);

  const rowCount = caps.promoCodes ? promoRows.length : eventRows.length;
  const totalPages = Math.max(1, Math.ceil(rowCount / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const visiblePromos = promoRows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const visibleEvents = eventRows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  function reset<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setPage(1);
    };
  }

  const statusSlices = m.byPromoStatus.map((s) => ({ ...s, color: STATUS_COLOR[s.label] ?? "#69738c" }));
  const typeSlices = m.byPromoType.map((s, i) => ({ ...s, color: SERIES[i] }));
  const kindSlices = m.byEventKind.map((s, i) => ({ ...s, color: SERIES[i] }));

  return (
    <SpecialShell
      platform={platform}
      agentLabel="Marketing Agent"
      tagline="Marketing workspace"
      basePath="/marketing-agent-special"
      nav={NAV}
      headerIcon="tag"
      assistantBlurb="Ask me which codes are pulling their weight and which have never been used."
      title="Campaigns"
      subtitle={caps.promoCodes ? `Every ${label} promo code and broadcast in the live tables` : `What ${label} exposes about marketing campaigns`}
      actions={
        <button type="button" className="cs-btn" disabled title="Creating and sending are real writes and are not wired up in this read-only workspace.">
          <Icon name="edit" size={15} />
          New promo code
        </button>
      }
    >
      {m.error && <ErrorNote error={m.error} platform={platform} />}

      <p className="cs-marketing-readonly">
        <Icon name="alert" size={13} />
        Read-only workspace — creating a promo code and sending a broadcast are real audited writes, and neither is
        wired up here.
      </p>

      <div className="cs-stats">
        <StatCard
          label={caps.promoCodes ? "Promo Codes" : "Logged Agent Events"}
          value={m.loading ? "—" : caps.promoCodes ? (m.promoCount ?? 0).toLocaleString() : m.events.length.toLocaleString()}
          sub={caps.promoCodes ? "All statuses" : "Real rows in the shared audit feed"}
          tone="purple"
          icon="tag"
        />
        <StatCard
          label={caps.promoCodes ? "Active Now" : "AI Calls"}
          value={m.loading ? "—" : caps.promoCodes ? (m.activePromoCount ?? 0).toLocaleString() : m.events.filter((e) => e.kind === "call").length.toLocaleString()}
          sub={caps.promoCodes ? `${m.expiredPromoCount ?? 0} past their end date` : "Drafting and sending calls the agent made"}
          tone="green"
          icon="check"
        />
        <StatCard
          label="Redemptions"
          value={m.loading ? "—" : m.totalRedemptions === null ? "Not exposed" : m.totalRedemptions.toLocaleString()}
          sub={m.redemptionRatePct === null ? "No capped code to measure against" : `${m.redemptionRatePct}% of capped capacity`}
          tone="cyan"
          icon="trend"
        />
        <StatCard
          label="Matching Filters"
          value={m.loading ? "—" : rowCount.toLocaleString()}
          sub={`Showing ${(caps.promoCodes ? visiblePromos.length : visibleEvents.length).toLocaleString()} on this page`}
          tone="blue"
          icon="search"
        />
      </div>

      <div className="cs-row-3">
        <Card title={caps.promoCodes ? "Status Mix" : "Activity Mix"}>
          {m.loading ? (
            <Empty>Loading…</Empty>
          ) : (caps.promoCodes ? statusSlices : kindSlices).length === 0 ? (
            <Empty>{m.error ? "Could not load — nothing can be assessed." : "Nothing recorded yet."}</Empty>
          ) : (
            <div className="cs-donut-row">
              <Donut
                data={caps.promoCodes ? statusSlices : kindSlices}
                size={128}
                center={(caps.promoCodes ? m.promoCount ?? 0 : m.events.length).toLocaleString()}
                centerLabel={caps.promoCodes ? "Codes" : "Events"}
              />
              <Legend data={caps.promoCodes ? statusSlices : kindSlices} />
            </div>
          )}
        </Card>

        <Card title={caps.promoCodes ? "Discount Type" : "Endpoints Called"}>
          {m.loading ? (
            <Empty>Loading…</Empty>
          ) : caps.promoCodes ? (
            typeSlices.length === 0 ? (
              <Empty>{m.error ? "Could not load." : "No promo codes exist yet."}</Empty>
            ) : (
              <div className="cs-donut-row">
                <Donut data={typeSlices} size={128} center={(m.promoCount ?? 0).toLocaleString()} centerLabel="Codes" />
                <Legend data={typeSlices} />
              </div>
            )
          ) : m.byEndpoint.length === 0 ? (
            <Empty>{m.error ? "Could not load." : "No endpoint calls recorded yet."}</Empty>
          ) : (
            <BarRows rows={m.byEndpoint.map((r, i) => ({ ...r, color: SERIES[i] }))} />
          )}
        </Card>

        <Card title={caps.promoCodes ? "Most Redeemed" : "Broadcast History"}>
          {m.loading ? (
            <Empty>Loading…</Empty>
          ) : caps.promoCodes ? (
            m.topRedeemed.length === 0 ? (
              <Empty>{m.error ? "Could not load — redemptions cannot be assessed." : "No code has been redeemed yet."}</Empty>
            ) : (
              <BarRows rows={m.topRedeemed.map((r, i) => ({ ...r, color: SERIES[i] }))} />
            )
          ) : (
            <Empty>
              {label} has no endpoint that lists sent campaigns, so past sends cannot be shown here. The agent&apos;s own
              call log below is the only real campaign record it exposes.
            </Empty>
          )}
        </Card>
      </div>

      <Card pad={false}>
        <div className="cs-marketing-toolbar">
          <div className="cs-tabs" style={{ border: 0, flex: 1, minWidth: 220 }}>
            {(caps.promoCodes ? PROMO_TABS : EVENT_TABS).map((t) => (
              <button
                key={t}
                type="button"
                className={(caps.promoCodes ? promoTab : eventTab) === t ? "cs-tab active" : "cs-tab"}
                onClick={() => (caps.promoCodes ? reset(setPromoTab)(t as PromoTab) : reset(setEventTab)(t as EventTab))}
              >
                {t}
              </button>
            ))}
          </div>

          {caps.promoCodes && (
            <select
              className="cs-btn"
              value={typeFilter}
              onChange={(e) => reset(setTypeFilter)(e.target.value)}
              aria-label="Filter by discount type"
            >
              {["All types", "Flat discount", "Percent discount"].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          )}

          <label className="cs-search">
            <Icon name="search" size={15} />
            <input
              value={search}
              onChange={(e) => reset(setSearch)(e.target.value)}
              placeholder={caps.promoCodes ? "Search codes…" : "Search endpoints…"}
              aria-label={caps.promoCodes ? "Search promo codes" : "Search agent events"}
            />
          </label>
        </div>

        <div className="cs-table-wrap" style={{ marginTop: 12 }}>
          {caps.promoCodes ? (
            <table className="cs-table">
              <thead>
                <tr>
                  <th style={{ paddingLeft: 19 }}>Code</th>
                  <th>Type</th>
                  <th className="cs-num">Value</th>
                  <th className="cs-num">Min order</th>
                  <th className="cs-num">Used</th>
                  <th className="cs-num">Limit</th>
                  <th>Status</th>
                  <th className="cs-num" style={{ paddingRight: 19 }}>Valid to</th>
                </tr>
              </thead>
              <tbody>
                {m.loading && <tr><td colSpan={8} style={{ padding: 19 }}><Empty>Loading live promo table…</Empty></td></tr>}
                {!m.loading && visiblePromos.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ padding: 19 }}>
                      <Empty>{m.error ? "The promo table could not be loaded, so nothing can be listed." : m.promos.length === 0 ? "No promo codes exist yet." : "No promo code matches these filters."}</Empty>
                    </td>
                  </tr>
                )}
                {visiblePromos.map((p) => (
                  <tr key={p.id}>
                    <td style={{ paddingLeft: 19 }}>
                      <div className="title">{p.code}</div>
                      {p.createdAt && <div className="sub">Created {new Date(p.createdAt).toLocaleDateString()}</div>}
                    </td>
                    <td style={{ color: "#4c5470", whiteSpace: "nowrap" }}>{p.type === "FLAT" ? "Flat" : "Percent"}</td>
                    <td className="cs-num">{p.valueNum === null ? "—" : p.type === "PERCENT" ? `${p.valueNum}%` : p.valueNum.toLocaleString()}</td>
                    <td className="cs-num" style={{ color: "#69738c" }}>{p.minOrder === null ? "—" : p.minOrder.toLocaleString()}</td>
                    <td className="cs-num">{p.usedCount.toLocaleString()}</td>
                    <td className="cs-num" style={{ color: "#69738c" }}>
                      {p.usageLimit === null ? "Uncapped" : `${p.usageLimit.toLocaleString()}${p.usagePct === null ? "" : ` (${p.usagePct}%)`}`}
                    </td>
                    <td>
                      {p.expired ? (
                        <Pill tone="amber"><Icon name="clock" size={12} />Expired</Pill>
                      ) : p.isActive ? (
                        <Pill tone="green"><Icon name="check" size={12} />Active</Pill>
                      ) : (
                        <Pill tone="red"><Icon name="alert" size={12} />Disabled</Pill>
                      )}
                    </td>
                    <td className="cs-num" style={{ paddingRight: 19, color: "#69738c", whiteSpace: "nowrap" }}>
                      {p.validTo ? new Date(p.validTo).toLocaleDateString() : "No end date"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="cs-table">
              <thead>
                <tr>
                  <th style={{ paddingLeft: 19 }}>Endpoint</th>
                  <th>Kind</th>
                  <th>Status</th>
                  <th className="cs-num">Cost (USD)</th>
                  <th className="cs-num" style={{ paddingRight: 19 }}>When</th>
                </tr>
              </thead>
              <tbody>
                {m.loading && <tr><td colSpan={5} style={{ padding: 19 }}><Empty>Loading the shared audit feed…</Empty></td></tr>}
                {!m.loading && visibleEvents.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: 19 }}>
                      <Empty>{m.error ? "The audit feed could not be loaded, so no campaign activity can be listed." : m.events.length === 0 ? "No marketing-agent activity has been logged yet." : "No event matches these filters."}</Empty>
                    </td>
                  </tr>
                )}
                {visibleEvents.map((e) => (
                  <tr key={e.id}>
                    <td style={{ paddingLeft: 19 }}><div className="title">{e.endpoint ?? "Unnamed endpoint"}</div></td>
                    <td>
                      {e.kind === "call" ? (
                        <Pill tone="blue"><Icon name="pulse" size={12} />AI call</Pill>
                      ) : (
                        <Pill tone="purple"><Icon name="sparkle" size={12} />Suggestion</Pill>
                      )}
                    </td>
                    <td style={{ color: "#4c5470" }}>{e.status ?? "—"}</td>
                    <td className="cs-num">{e.costUsd === null ? "—" : `$${e.costUsd.toFixed(4)}`}</td>
                    <td className="cs-num" style={{ paddingRight: 19, color: "#69738c", whiteSpace: "nowrap" }}>
                      {e.createdAt ? new Date(e.createdAt).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {rowCount > PAGE_SIZE && (
          <div className="cs-marketing-pager">
            <span>
              Showing {(current - 1) * PAGE_SIZE + 1}–{Math.min(current * PAGE_SIZE, rowCount)} of {rowCount}
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <button type="button" className="cs-btn" onClick={() => setPage(Math.max(1, current - 1))} disabled={current === 1}>
                Previous
              </button>
              <span style={{ display: "grid", placeItems: "center", padding: "0 10px", fontWeight: 650 }}>
                {current} / {totalPages}
              </span>
              <button type="button" className="cs-btn" onClick={() => setPage(Math.min(totalPages, current + 1))} disabled={current === totalPages}>
                Next
              </button>
            </div>
          </div>
        )}
      </Card>

      {caps.broadcasts && (
        <Card
          title="Broadcast Log"
          action={<span style={{ fontSize: 11, color: "#69738c" }}>{m.broadcasts.length} returned{m.broadcastsLoggedTotal !== null ? ` of ${m.broadcastsLoggedTotal} logged` : ""}</span>}
          pad={false}
        >
          <div className="cs-table-wrap">
            <table className="cs-table">
              <thead>
                <tr>
                  <th style={{ paddingLeft: 19 }}>Broadcast</th>
                  <th>Audience</th>
                  <th>Sent by</th>
                  <th className="cs-num">Recipients</th>
                  <th className="cs-num" style={{ paddingRight: 19 }}>Sent</th>
                </tr>
              </thead>
              <tbody>
                {m.loading && <tr><td colSpan={5} style={{ padding: 19 }}><Empty>Loading broadcast log…</Empty></td></tr>}
                {!m.loading && m.broadcasts.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: 19 }}>
                      <Empty>{m.error ? "The broadcast log could not be loaded." : "No broadcast has been sent yet."}</Empty>
                    </td>
                  </tr>
                )}
                {m.broadcasts.map((b) => (
                  <tr key={b.id}>
                    <td style={{ paddingLeft: 19, maxWidth: 380 }}>
                      <div className="title">{b.title}</div>
                      {b.body && <div className="sub">{b.body.slice(0, 90)}{b.body.length > 90 ? "…" : ""}</div>}
                    </td>
                    <td><Pill tone="purple"><Icon name="users" size={12} />{AUDIENCE_LABEL[b.audience]}</Pill></td>
                    <td style={{ color: "#4c5470" }}>{b.sentByName ?? "—"}</td>
                    <td className="cs-num">{b.recipientCount.toLocaleString()}</td>
                    <td className="cs-num" style={{ paddingRight: 19, color: "#69738c", whiteSpace: "nowrap" }}>
                      {b.createdAt ? new Date(b.createdAt).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <style>{CSS}</style>
    </SpecialShell>
  );
}

/* Page-local styles only, all `cs-marketing-*` prefixed. */
const CSS = `
.cs-marketing-readonly{display:flex;align-items:center;gap:8px;margin:0;font-size:11.5px;color:#69738c;background:#fff;border:1px solid #eef0f5;border-radius:10px;padding:10px 13px}
.cs-marketing-toolbar{display:flex;align-items:center;gap:12px;padding:14px 19px 0;flex-wrap:wrap}
.cs-marketing-pager{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 19px;border-top:1px solid #eef0f5;font-size:11.5px;color:#4c5470;flex-wrap:wrap}
`;
