"use client";

/**
 * Marketing Agent — Overview.
 *
 * Every figure comes from `useMarketingSnapshot`, which reads GhrFix's real
 * promo-code table and broadcast log, and ShadiLife's segment list plus this
 * agent's real entries in the shared usage/activity feeds. Where a platform
 * genuinely exposes no read endpoint for something — ShadiLife lists no
 * campaigns or promo codes at all — the tile says so instead of showing a
 * zero that would read as "nothing is running".
 *
 * This page is read-only. It never calls `send-campaign`, `/broadcast` or
 * `/promo`.
 */

import { usePlatformParam, platformLabel } from "@/lib/agent-data";
import { useMarketingSnapshot, type MarketingSnapshot } from "@/lib/marketing-data";
import {
  BarRows,
  Card,
  Donut,
  Empty,
  ErrorNote,
  Icon,
  Legend,
  Pill,
  ScoreRing,
  SpecialShell,
  SERIES,
  StatCard,
  TONE,
  TrendChart,
  type NavItem,
} from "@/components/special/kit";

const NAV: NavItem[] = [
  { label: "Overview", icon: "dashboard", slug: "overview" },
  { label: "Campaigns", icon: "tag", slug: "campaigns" },
  { label: "Audience", icon: "users", slug: "audience" },
  { label: "Chat with AI Agent", icon: "chat", slug: "chat" },
];

/* Fixed status colors so a segment keeps its color when the set shrinks. */
const STATUS_COLOR: Record<string, string> = { Active: "#0f9e69", Expired: "#c9860f", Disabled: "#69738c" };

export default function MarketingOverviewPage({ params }: { params: Promise<{ platform: string }> }) {
  const platform = usePlatformParam(params);
  const m = useMarketingSnapshot(platform);
  const label = platformLabel(platform);
  const caps = m.capabilities;

  const dash = (v: number | null) => (m.loading ? "—" : v === null ? "Not exposed" : v.toLocaleString());

  const statusSlices = m.byPromoStatus.map((s) => ({ ...s, color: STATUS_COLOR[s.label] ?? "#69738c" }));
  const typeSlices = m.byPromoType.map((s, i) => ({ ...s, color: SERIES[i] }));
  const audienceSlices = m.byAudience.map((s, i) => ({ ...s, color: SERIES[i] }));
  const kindSlices = m.byEventKind.map((s, i) => ({ ...s, color: SERIES[i] }));

  /* The two donut pairs differ per platform because the data does: GhrFix
     has promo status + type and broadcast audience; ShadiLife has agent
     call kinds and endpoints. Both pairs are real either way. */
  const donutA = caps.promoCodes
    ? { title: "Promo Codes by Status", slices: statusSlices, center: m.promoCount, centerLabel: "Codes" }
    : { title: "Agent Activity by Kind", slices: kindSlices, center: m.events.length, centerLabel: "Events" };
  const donutB = caps.broadcasts
    ? { title: "Broadcast Reach by Audience", slices: audienceSlices, center: m.broadcastCount, centerLabel: "Sends" }
    : { title: "Segments Available", slices: m.segments.map((s, i) => ({ label: s, value: 1, color: SERIES[i % SERIES.length] })), center: m.segments.length, centerLabel: "Segments" };

  return (
    <SpecialShell
      platform={platform}
      agentLabel="Marketing Agent"
      tagline="Marketing workspace"
      basePath="/marketing-agent-special"
      nav={NAV}
      headerIcon="dashboard"
      assistantBlurb="I read your live promo codes, broadcasts and campaign activity — ask me what is working."
      title="Marketing Overview"
      subtitle={`Promo, broadcast and campaign health across live ${label} data`}
      actions={
        <Pill tone={m.error ? "red" : m.loading ? "amber" : "green"}>
          <Icon name={m.error ? "alert" : m.loading ? "clock" : "check"} size={12} />
          {m.error ? "Data unavailable" : m.loading ? "Loading" : "Live data"}
        </Pill>
      }
    >
      {m.error && <ErrorNote error={m.error} platform={platform} />}

      <div className="cs-stats">
        <StatCard
          label="Promo Codes"
          value={dash(m.promoCount)}
          sub={caps.promoCodes ? `${m.activePromoCount ?? 0} currently active` : `${label} exposes no promo-code list`}
          tone="purple"
          icon="tag"
        />
        <StatCard
          label="Total Redemptions"
          value={dash(m.totalRedemptions)}
          sub={caps.promoCodes ? `${m.unusedPromoCount ?? 0} codes never used` : "Not tracked on this platform"}
          tone="green"
          icon="check"
        />
        <StatCard
          label="Broadcasts Sent"
          value={m.loading ? "—" : m.broadcastsLoggedTotal !== null ? m.broadcastsLoggedTotal.toLocaleString() : dash(m.broadcastCount)}
          sub={caps.broadcasts ? `${m.broadcasts.length} in the returned log` : `${label} exposes no broadcast history`}
          tone="blue"
          icon="send"
        />
        <StatCard
          label="Recipients Reached"
          value={dash(m.totalRecipients)}
          sub={m.avgRecipients === null ? "No send has been logged" : `${m.avgRecipients.toLocaleString()} per broadcast on average`}
          tone="cyan"
          icon="users"
        />
        <StatCard
          label={caps.activityLog ? "Agent Calls Logged" : "Audience Segments"}
          value={m.loading ? "—" : caps.activityLog ? m.events.length.toLocaleString() : caps.segments ? m.segments.length.toLocaleString() : "Not exposed"}
          sub={caps.activityLog ? "Real rows in the shared audit feed" : "Named segments the agent can target"}
          tone="amber"
          icon="pulse"
        />
        <StatCard
          label="Spend This Month"
          value={m.loading ? "—" : m.usage ? `$${m.usage.spendThisMonthUsd.toFixed(2)}` : "Not tracked"}
          sub={m.usage ? `Budget $${m.usage.monthlyBudgetUsd.toLocaleString()} · ${m.usage.model}` : `${label} reports no per-agent spend here`}
          tone="red"
          icon="trend"
        />
      </div>

      <div className="cs-row-2">
        <Card
          title="Marketing Activity Trend"
          action={<span style={{ fontSize: 11, color: "#69738c" }}>Last 8 months</span>}
        >
          {m.loading ? (
            <Empty>Loading live data…</Empty>
          ) : m.error ? (
            <Empty>The trend cannot be drawn — the {label} backend did not respond.</Empty>
          ) : m.monthly === null ? (
            <Empty>
              No endpoint returned anything datable for {label}, so there is no honest time series to draw here.
            </Empty>
          ) : (
            <>
              <TrendChart
                labels={m.monthly.labels}
                series={[
                  { name: m.monthly.primary.name, data: m.monthly.primary.data, color: SERIES[0] },
                  ...(m.monthly.secondary ? [{ name: m.monthly.secondary.name, data: m.monthly.secondary.data, color: SERIES[2] }] : []),
                ]}
              />
              <p className="cs-marketing-note">{m.monthly.note}</p>
            </>
          )}
        </Card>

        <Card title={donutA.title}>
          {m.loading ? (
            <Empty>Loading…</Empty>
          ) : donutA.slices.length === 0 ? (
            <Empty>{m.error ? "Could not load — nothing can be assessed." : "Nothing recorded yet."}</Empty>
          ) : (
            <div className="cs-donut-row">
              <Donut data={donutA.slices} center={(donutA.center ?? 0).toLocaleString()} centerLabel={donutA.centerLabel} />
              <Legend data={donutA.slices} />
            </div>
          )}
        </Card>
      </div>

      <div className="cs-row-3">
        <Card title={donutB.title}>
          {m.loading ? (
            <Empty>Loading…</Empty>
          ) : donutB.slices.length === 0 ? (
            <Empty>{m.error ? "Could not load — nothing can be assessed." : "Nothing recorded yet."}</Empty>
          ) : (
            <div className="cs-donut-row">
              <Donut data={donutB.slices} size={130} center={(donutB.center ?? 0).toLocaleString()} centerLabel={donutB.centerLabel} />
              <Legend data={donutB.slices} showPct={caps.broadcasts} />
            </div>
          )}
        </Card>

        <Card title={caps.promoCodes ? "Discount Type Mix" : "Endpoints Called"}>
          {m.loading ? (
            <Empty>Loading…</Empty>
          ) : caps.promoCodes ? (
            typeSlices.length === 0 ? (
              <Empty>{m.error ? "Could not load." : "No promo codes exist yet."}</Empty>
            ) : (
              <div className="cs-donut-row">
                <Donut data={typeSlices} size={120} center={(m.promoCount ?? 0).toLocaleString()} centerLabel="Codes" />
                <Legend data={typeSlices} />
              </div>
            )
          ) : (
            <>
              <BarRows rows={m.byEndpoint.map((r, i) => ({ ...r, color: SERIES[i] }))} />
              {m.byEndpoint.length > 0 && <p className="cs-marketing-note">Real endpoints this agent has been asked to run.</p>}
            </>
          )}
        </Card>

        <Card title="Redemption Rate">
          {m.loading ? (
            <Empty>Loading…</Empty>
          ) : m.redemptionRatePct === null ? (
            <Empty>
              {caps.promoCodes
                ? "No promo code has a usage limit, so there is no capacity to measure a redemption rate against."
                : `${label} exposes no promo-code data, so a redemption rate cannot be computed.`}
            </Empty>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
                <ScoreRing
                  value={m.redemptionRatePct}
                  max={100}
                  label="% of capacity"
                  color={m.redemptionRatePct >= 70 ? "#0f9e69" : m.redemptionRatePct >= 30 ? "#c9860f" : "#e04452"}
                />
              </div>
              <p className="cs-marketing-note">
                {(m.totalRedemptions ?? 0).toLocaleString()} redemptions against{" "}
                {(m.cappedRedemptionCapacity ?? 0).toLocaleString()} capped uses.
              </p>
            </>
          )}
        </Card>
      </div>

      <div className="cs-row-half">
        <Card title="Most Redeemed Codes">
          {m.loading ? (
            <Empty>Loading…</Empty>
          ) : !caps.promoCodes ? (
            <Empty>{label} has no promo-code table to rank.</Empty>
          ) : m.topRedeemed.length === 0 ? (
            <Empty>{m.error ? "Could not load — redemptions cannot be assessed." : "No promo code has been redeemed yet."}</Empty>
          ) : (
            <BarRows rows={m.topRedeemed.map((r, i) => ({ ...r, color: SERIES[i] }))} />
          )}
        </Card>

        <Card title={caps.broadcasts ? "Broadcasts by Reach" : "Segments the Agent Can Target"}>
          {m.loading ? (
            <Empty>Loading…</Empty>
          ) : caps.broadcasts ? (
            m.topBroadcastsByReach.length === 0 ? (
              <Empty>{m.error ? "Could not load — reach cannot be assessed." : "No broadcast has been sent yet."}</Empty>
            ) : (
              <BarRows rows={m.topBroadcastsByReach.map((r, i) => ({ ...r, color: SERIES[i] }))} suffix=" people" />
            )
          ) : m.segments.length === 0 ? (
            <Empty>{m.error ? "Could not load the segment list." : "The backend returned no segments."}</Empty>
          ) : (
            <>
              <ul className="cs-marketing-seglist">
                {m.segments.map((s) => (
                  <li key={s}>
                    <Pill tone="purple"><Icon name="users" size={12} />Segment</Pill>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
              <p className="cs-marketing-note">
                {label} returns segment names only. Segment sizes come back only from the drafting call, which is an
                AI write and is deliberately not fired here.
              </p>
            </>
          )}
        </Card>
      </div>

      <Card title="Agent Insights">
        <div className="cs-marketing-insights">
          {m.loading ? (
            <Empty>Loading…</Empty>
          ) : (
            buildInsights(m, label).map((i) => (
              <div key={i.text} className="cs-marketing-insight">
                <span style={{ background: TONE[i.tone].bg, color: TONE[i.tone].fg }}>
                  <Icon name={i.icon} size={15} />
                </span>
                <p>{i.text}</p>
              </div>
            ))
          )}
        </div>
      </Card>

      <style>{CSS}</style>
    </SpecialShell>
  );
}

/**
 * Statements about what actually loaded. A failed fetch never produces a
 * reassuring insight — it produces one saying the state cannot be assessed.
 */
function buildInsights(m: MarketingSnapshot, label: string) {
  const out: Array<{ icon: string; tone: keyof typeof TONE; text: string }> = [];

  if (m.error) {
    return [
      {
        icon: "alert",
        tone: "red" as const,
        text: `The ${label} marketing endpoints did not respond, so no campaign state can be assessed on this page.`,
      },
    ];
  }

  if (m.capabilities.promoCodes) {
    const total = m.promoCount ?? 0;
    if (total === 0) {
      out.push({ icon: "tag", tone: "amber", text: `No promo codes exist in the ${label} table yet.` });
    } else {
      out.push({
        icon: "tag",
        tone: "purple",
        text: `${m.activePromoCount ?? 0} of ${total} promo codes are active${(m.expiredPromoCount ?? 0) > 0 ? `, and ${m.expiredPromoCount} have passed their end date` : ""}.`,
      });
      if ((m.unusedPromoCount ?? 0) > 0) {
        out.push({
          icon: "alert",
          tone: "amber",
          text: `${m.unusedPromoCount} code${m.unusedPromoCount === 1 ? " has" : "s have"} never been redeemed.`,
        });
      }
      if (m.topRedeemed.length > 0) {
        out.push({
          icon: "trend",
          tone: "green",
          text: `“${m.topRedeemed[0].label}” is the most redeemed code at ${m.topRedeemed[0].value.toLocaleString()} uses.`,
        });
      }
    }
  } else {
    out.push({
      icon: "alert",
      tone: "blue",
      text: `${label} exposes no readable promo-code or campaign history — only the segment list and this agent's own call log.`,
    });
  }

  if (m.capabilities.broadcasts) {
    if (m.largestBroadcast) {
      out.push({
        icon: "send",
        tone: "cyan",
        text: `The widest broadcast, “${m.largestBroadcast.title}”, reached ${m.largestBroadcast.recipientCount.toLocaleString()} recipients.`,
      });
    } else {
      out.push({ icon: "send", tone: "amber", text: "No broadcast has been logged yet." });
    }
  }

  if (m.capabilities.activityLog) {
    out.push({
      icon: "pulse",
      tone: "purple",
      text:
        m.events.length === 0
          ? "The shared audit feed contains no marketing-agent activity yet."
          : `${m.events.length} marketing-agent events are recorded in the shared audit feed.`,
    });
  }

  return out.slice(0, 5);
}

/* Page-local styles only. Every selector is `cs-marketing-*` prefixed so
   nothing here can leak onto the other special workspaces. */
const CSS = `
.cs-marketing-note{margin:10px 0 0;font-size:11px;line-height:18px;color:#69738c}
.cs-marketing-insights{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px}
.cs-marketing-insight{display:flex;gap:11px;align-items:flex-start}
.cs-marketing-insight span{width:29px;height:29px;border-radius:9px;flex:0 0 auto;display:grid;place-items:center}
.cs-marketing-insight p{margin:0;font-size:11.5px;line-height:19px;color:#4c5470}
.cs-marketing-seglist{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
.cs-marketing-seglist li{display:flex;align-items:center;gap:9px;font-size:12px;color:#4c5470}
`;
