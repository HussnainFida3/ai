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
 * "New promo code" and "New broadcast" / "New campaign" are wired to real,
 * audited writes:
 *   GhrFix     POST /ai-agents/marketing/promo      (createPromoCode)
 *              POST /ai-agents/marketing/broadcast  (sendGhrfixBroadcast)
 *   ShadiLife  POST /ai-agents/marketing/send-campaign (sendShadiLifeCampaign)
 *              — no promo-code system exists anywhere on ShadiLife's backend
 *              (grepped the whole repo), so that control stays disabled there
 *              with an honest note instead of faking parity with GhrFix.
 */

import { useMemo, useState } from "react";
import { usePlatformParam, platformLabel } from "@/lib/agent-data";
import {
  useMarketingSnapshot,
  AUDIENCE_LABEL,
  createPromoCode,
  sendGhrfixBroadcast,
  sendShadiLifeCampaign,
  SHADILIFE_CAMPAIGN_CHANNELS,
  type BroadcastAudience,
  type PromoType,
  type ShadiLifeCampaignChannel,
} from "@/lib/marketing-data";
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

  const [toast, setToast] = useState("");
  const notify = (text: string) => {
    setToast(text);
    window.setTimeout(() => setToast(""), 3600);
  };

  /* ── New promo code (GhrFix only) ──────────────────────────────────── */
  const [promoOpen, setPromoOpen] = useState(false);
  const [promoSubmitting, setPromoSubmitting] = useState(false);
  const [promoForm, setPromoForm] = useState({
    code: "",
    type: "FLAT" as PromoType,
    value: "",
    minOrder: "",
    maxDiscount: "",
    usageLimit: "",
    perUserLimit: "1",
    validTo: "",
  });

  async function submitPromo() {
    const code = promoForm.code.trim().toUpperCase();
    const value = Number(promoForm.value);
    if (!/^[A-Z0-9]{3,30}$/.test(code)) {
      notify("Code must be 3-30 uppercase letters/numbers.");
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      notify("Value must be a positive number.");
      return;
    }
    const summary =
      promoForm.type === "PERCENT" ? `${value}% off` : `Rs ${value.toLocaleString()} off`;
    if (!window.confirm(`Create promo code "${code}" (${summary}) on GhrFix? It goes live immediately and is real, audited, and redeemable right away.`)) return;

    setPromoSubmitting(true);
    try {
      const created = await createPromoCode({
        code,
        type: promoForm.type,
        value,
        minOrder: promoForm.minOrder ? Number(promoForm.minOrder) : undefined,
        maxDiscount: promoForm.maxDiscount ? Number(promoForm.maxDiscount) : undefined,
        usageLimit: promoForm.usageLimit ? Number(promoForm.usageLimit) : undefined,
        perUserLimit: promoForm.perUserLimit ? Number(promoForm.perUserLimit) : undefined,
        validTo: promoForm.validTo || undefined,
      });
      m.addPromo(created);
      notify(`Promo code "${created.code}" created and is live.`);
      setPromoOpen(false);
      setPromoForm({ code: "", type: "FLAT", value: "", minOrder: "", maxDiscount: "", usageLimit: "", perUserLimit: "1", validTo: "" });
    } catch (err) {
      notify(err instanceof Error ? err.message : "Could not create the promo code.");
    } finally {
      setPromoSubmitting(false);
    }
  }

  /* ── New broadcast (GhrFix) / campaign (ShadiLife) ─────────────────── */
  const [sendOpen, setSendOpen] = useState(false);
  const [sendSubmitting, setSendSubmitting] = useState(false);
  const [sendForm, setSendForm] = useState({
    title: "",
    body: "",
    audience: "ALL" as BroadcastAudience,
    segment: "",
    channel: "NOTIFICATION" as ShadiLifeCampaignChannel,
  });
  /* ShadiLife has no broadcast log to read back, so the last real send this
     session is held here and shown as an explicit confirmation card instead. */
  const [lastShadiSend, setLastShadiSend] = useState<{ title: string; segment: string; sentCount: number; status: string } | null>(null);

  async function submitSend() {
    if (!sendForm.title.trim() || !sendForm.body.trim()) {
      notify("Title and message body are required.");
      return;
    }

    if (platform === "ghrfix") {
      const audienceWord = AUDIENCE_LABEL[sendForm.audience];
      if (!window.confirm(`Send this broadcast to ${audienceWord} on GhrFix now? This is a real, audited notification send and cannot be undone.`)) return;
      setSendSubmitting(true);
      try {
        const created = await sendGhrfixBroadcast({ title: sendForm.title.trim(), body: sendForm.body.trim(), audience: sendForm.audience });
        m.addBroadcast(created);
        notify(`Broadcast sent to ${created.recipientCount.toLocaleString()} recipient(s).`);
        setSendOpen(false);
        setSendForm({ title: "", body: "", audience: "ALL", segment: "", channel: "NOTIFICATION" });
      } catch (err) {
        notify(err instanceof Error ? err.message : "Could not send the broadcast.");
      } finally {
        setSendSubmitting(false);
      }
      return;
    }

    if (!sendForm.segment) {
      notify("Choose a segment first.");
      return;
    }
    if (!window.confirm(`Send this campaign to the "${sendForm.segment}" segment via ${sendForm.channel} on ShadiLife now? This is a real send and cannot be undone.`)) return;
    setSendSubmitting(true);
    try {
      const result = await sendShadiLifeCampaign({ title: sendForm.title.trim(), body: sendForm.body.trim(), segment: sendForm.segment, channel: sendForm.channel });
      setLastShadiSend(result);
      notify(`Campaign sent to ${result.sentCount.toLocaleString()} recipient(s) in "${result.segment}".`);
      setSendOpen(false);
      setSendForm({ title: "", body: "", audience: "ALL", segment: "", channel: "NOTIFICATION" });
    } catch (err) {
      notify(err instanceof Error ? err.message : "Could not send the campaign.");
    } finally {
      setSendSubmitting(false);
    }
  }

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
        <>
          {platform === "ghrfix" ? (
            <button type="button" className="cs-btn" onClick={() => setPromoOpen((v) => !v)}>
              <Icon name="edit" size={15} />
              {promoOpen ? "Cancel" : "New promo code"}
            </button>
          ) : (
            <button type="button" className="cs-btn" disabled title="ShadiLife has no promo-code system on its backend — GhrFix only.">
              <Icon name="edit" size={15} />
              New promo code
            </button>
          )}
          <button type="button" className="cs-btn cs-btn-primary" onClick={() => setSendOpen((v) => !v)}>
            <Icon name="send" size={15} />
            {sendOpen ? "Cancel" : platform === "ghrfix" ? "New broadcast" : "New campaign"}
          </button>
        </>
      }
    >
      {m.error && <ErrorNote error={m.error} platform={platform} />}

      <p className="cs-marketing-readonly">
        <Icon name={platform === "ghrfix" ? "check" : "alert"} size={13} />
        {platform === "ghrfix"
          ? "New promo code and New broadcast are real, audited writes — both go live immediately."
          : "New campaign is a real, audited send. ShadiLife has no promo-code system on its backend, so that control stays disabled."}
      </p>

      {promoOpen && platform === "ghrfix" && (
        <Card title="New promo code" className="cs-marketing-form">
          <div className="cs-marketing-grid">
            <label>
              <span>Code *</span>
              <input value={promoForm.code} onChange={(e) => setPromoForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="SAVE20" maxLength={30} />
            </label>
            <label>
              <span>Type *</span>
              <select value={promoForm.type} onChange={(e) => setPromoForm((f) => ({ ...f, type: e.target.value as PromoType }))}>
                <option value="FLAT">Flat discount</option>
                <option value="PERCENT">Percent discount</option>
              </select>
            </label>
            <label>
              <span>Value * {promoForm.type === "PERCENT" ? "(%)" : "(Rs)"}</span>
              <input type="number" min="0" value={promoForm.value} onChange={(e) => setPromoForm((f) => ({ ...f, value: e.target.value }))} placeholder={promoForm.type === "PERCENT" ? "20" : "500"} />
            </label>
            <label>
              <span>Min order (Rs)</span>
              <input type="number" min="0" value={promoForm.minOrder} onChange={(e) => setPromoForm((f) => ({ ...f, minOrder: e.target.value }))} placeholder="Optional" />
            </label>
            {promoForm.type === "PERCENT" && (
              <label>
                <span>Max discount (Rs)</span>
                <input type="number" min="0" value={promoForm.maxDiscount} onChange={(e) => setPromoForm((f) => ({ ...f, maxDiscount: e.target.value }))} placeholder="Optional cap" />
              </label>
            )}
            <label>
              <span>Total usage limit</span>
              <input type="number" min="1" value={promoForm.usageLimit} onChange={(e) => setPromoForm((f) => ({ ...f, usageLimit: e.target.value }))} placeholder="Uncapped if blank" />
            </label>
            <label>
              <span>Per-user limit</span>
              <input type="number" min="1" value={promoForm.perUserLimit} onChange={(e) => setPromoForm((f) => ({ ...f, perUserLimit: e.target.value }))} />
            </label>
            <label>
              <span>Valid to</span>
              <input type="date" value={promoForm.validTo} onChange={(e) => setPromoForm((f) => ({ ...f, validTo: e.target.value }))} />
            </label>
          </div>
          <div className="cs-marketing-formactions">
            <button type="button" className="cs-btn" onClick={() => setPromoOpen(false)} disabled={promoSubmitting}>Cancel</button>
            <button type="button" className="cs-btn cs-btn-primary" onClick={submitPromo} disabled={promoSubmitting}>
              {promoSubmitting ? "Creating…" : "Create promo code"}
            </button>
          </div>
        </Card>
      )}

      {sendOpen && (
        <Card title={platform === "ghrfix" ? "New broadcast" : "New campaign"} className="cs-marketing-form">
          <div className="cs-marketing-grid">
            <label className="cs-marketing-span2">
              <span>Title *</span>
              <input value={sendForm.title} onChange={(e) => setSendForm((f) => ({ ...f, title: e.target.value }))} maxLength={120} placeholder="A short, clear headline" />
            </label>
            <label className="cs-marketing-span2">
              <span>Message *</span>
              <textarea value={sendForm.body} onChange={(e) => setSendForm((f) => ({ ...f, body: e.target.value }))} maxLength={1000} rows={3} placeholder="What recipients will see" />
            </label>
            {platform === "ghrfix" ? (
              <label>
                <span>Audience *</span>
                <select value={sendForm.audience} onChange={(e) => setSendForm((f) => ({ ...f, audience: e.target.value as BroadcastAudience }))}>
                  <option value="ALL">Everyone</option>
                  <option value="CUSTOMER_MODE">Customers</option>
                  <option value="PROVIDER_MODE">Providers</option>
                </select>
              </label>
            ) : (
              <>
                <label>
                  <span>Segment *</span>
                  <select value={sendForm.segment} onChange={(e) => setSendForm((f) => ({ ...f, segment: e.target.value }))}>
                    <option value="">{m.segments.length === 0 ? "No segments loaded" : "Choose a segment…"}</option>
                    {m.segments.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Channel *</span>
                  <select value={sendForm.channel} onChange={(e) => setSendForm((f) => ({ ...f, channel: e.target.value as ShadiLifeCampaignChannel }))}>
                    {SHADILIFE_CAMPAIGN_CHANNELS.map((c) => (
                      <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>
                    ))}
                  </select>
                </label>
              </>
            )}
          </div>
          <div className="cs-marketing-formactions">
            <button type="button" className="cs-btn" onClick={() => setSendOpen(false)} disabled={sendSubmitting}>Cancel</button>
            <button type="button" className="cs-btn cs-btn-primary" onClick={submitSend} disabled={sendSubmitting}>
              {sendSubmitting ? "Sending…" : platform === "ghrfix" ? "Send broadcast" : "Send campaign"}
            </button>
          </div>
        </Card>
      )}

      {platform === "shadilife" && lastShadiSend && (
        <Card title="Last campaign sent this session">
          <p className="cs-marketing-lastsend">
            <b>{lastShadiSend.title}</b> — sent to <b>{lastShadiSend.sentCount.toLocaleString()}</b> recipient(s) in the
            &quot;{lastShadiSend.segment}&quot; segment. Status: {lastShadiSend.status}.
          </p>
          <p className="cs-marketing-note">
            ShadiLife exposes no endpoint that lists past sends, so this confirmation is only held for this browser session —
            it is not a persisted campaign log.
          </p>
        </Card>
      )}

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

      {toast && <div className="cs-marketing-toast" role="status">{toast}</div>}
    </SpecialShell>
  );
}

/* Page-local styles only, all `cs-marketing-*` prefixed. */
const CSS = `
.cs-marketing-readonly{display:flex;align-items:center;gap:8px;margin:0;font-size:11.5px;color:#69738c;background:#fff;border:1px solid #eef0f5;border-radius:10px;padding:10px 13px}
.cs-marketing-toolbar{display:flex;align-items:center;gap:12px;padding:14px 19px 0;flex-wrap:wrap}
.cs-marketing-pager{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 19px;border-top:1px solid #eef0f5;font-size:11.5px;color:#4c5470;flex-wrap:wrap}
.cs-marketing-form label{display:flex;flex-direction:column;gap:5px;font-size:11.5px;color:#4c5470;font-weight:600}
.cs-marketing-form input,.cs-marketing-form select,.cs-marketing-form textarea{height:36px;padding:0 11px;border:1px solid #dfe2ea;border-radius:8px;background:#fff;font-size:12.5px;color:#11162d;font-family:inherit}
.cs-marketing-form textarea{height:auto;padding:9px 11px;resize:vertical}
.cs-marketing-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:13px}
.cs-marketing-span2{grid-column:1 / -1}
.cs-marketing-formactions{display:flex;justify-content:flex-end;gap:10px;margin-top:16px}
.cs-marketing-lastsend{margin:0 0 8px;font-size:12.5px;line-height:20px;color:#11162d}
.cs-marketing-note{margin:0;font-size:11px;line-height:18px;color:#69738c}
.cs-marketing-toast{position:fixed;right:22px;bottom:22px;max-width:380px;background:#11162f;color:#fff;border-radius:10px;padding:12px 16px;font-size:12.5px;line-height:18px;box-shadow:0 14px 32px rgba(20,20,45,.28);z-index:50}
`;
