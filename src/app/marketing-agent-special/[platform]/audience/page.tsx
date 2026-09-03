"use client";

/**
 * Marketing Agent — Audience.
 *
 * Who marketing actually reaches. On GhrFix that is real: every broadcast
 * carries an audience mode and a real recipientCount, so reach can be split
 * by audience both by number of sends and by number of people.
 *
 * ShadiLife is the honest opposite — it publishes a fixed segment NAME list
 * and nothing else. Segment sizes come back only from `draft-campaign`,
 * which is an AI call, and reach only from `send-campaign`, which is a real
 * send. Neither is fired here, so this page names the segments and shows the
 * agent's real activity instead of inventing a segmentation breakdown.
 */

import { usePlatformParam, platformLabel } from "@/lib/agent-data";
import { useMarketingSnapshot, AUDIENCE_LABEL, type Bucket } from "@/lib/marketing-data";
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
  TrendChart,
  type NavItem,
} from "@/components/special/kit";

const NAV: NavItem[] = [
  { label: "Overview", icon: "dashboard", slug: "overview" },
  { label: "Campaigns", icon: "tag", slug: "campaigns" },
  { label: "Audience", icon: "users", slug: "audience" },
  { label: "Chat with AI Agent", icon: "chat", slug: "chat" },
];

/* Audience keeps a fixed color regardless of which modes appear. */
const AUDIENCE_COLOR: Record<string, string> = {
  Everyone: SERIES[0],
  Customers: SERIES[1],
  Providers: SERIES[2],
};

export default function MarketingAudiencePage({ params }: { params: Promise<{ platform: string }> }) {
  const platform = usePlatformParam(params);
  const m = useMarketingSnapshot(platform);
  const label = platformLabel(platform);
  const caps = m.capabilities;

  /* Reach weighted by people, not by number of sends — a different question
     from `byAudience`, and both are worth showing side by side. */
  const recipientsByAudience: Bucket[] = (() => {
    const map = new Map<string, number>();
    for (const b of m.broadcasts) {
      const key = AUDIENCE_LABEL[b.audience];
      map.set(key, (map.get(key) ?? 0) + b.recipientCount);
    }
    return [...map.entries()].map(([label2, value]) => ({ label: label2, value })).sort((a, b) => b.value - a.value);
  })();

  const sendSlices = m.byAudience.map((s) => ({ ...s, color: AUDIENCE_COLOR[s.label] ?? "#94a3b8" }));
  const reachSlices = recipientsByAudience.map((s) => ({ ...s, color: AUDIENCE_COLOR[s.label] ?? "#94a3b8" }));
  const kindSlices = m.byEventKind.map((s, i) => ({ ...s, color: SERIES[i] }));
  const endpointSlices = m.byEndpoint.map((s, i) => ({ ...s, color: SERIES[i] }));

  const widest = m.largestBroadcast;
  const smallest = m.broadcasts.length > 0 ? [...m.broadcasts].sort((a, b) => a.recipientCount - b.recipientCount)[0] : null;

  /* Share of all reach that went to the single widest audience mode — a real
     concentration measure, only computable when reach exists. */
  const concentrationPct =
    (m.totalRecipients ?? 0) > 0 && reachSlices.length > 0
      ? Math.round((reachSlices[0].value / (m.totalRecipients ?? 1)) * 100)
      : null;

  return (
    <SpecialShell
      platform={platform}
      agentLabel="Marketing Agent"
      tagline="Marketing workspace"
      basePath="/marketing-agent-special"
      nav={NAV}
      headerIcon="users"
      assistantBlurb="Ask me who your campaigns are actually reaching, and who they keep missing."
      title="Audience"
      subtitle={caps.broadcasts ? `Real reach and audience mix across ${label} broadcasts` : `What ${label} exposes about marketing audiences`}
      actions={
        <Pill tone={m.error ? "red" : m.loading ? "amber" : "green"}>
          <Icon name={m.error ? "alert" : m.loading ? "clock" : "check"} size={12} />
          {m.error ? "Data unavailable" : m.loading ? "Loading" : "Live data"}
        </Pill>
      }
    >
      {m.error && <ErrorNote error={m.error} platform={platform} />}

      {!caps.broadcasts && (
        <p className="cs-marketing-callout">
          <Icon name="alert" size={14} />
          <span>
            <b>{label} does not expose audience segmentation to a reader.</b> Its marketing API returns the segment
            names below and nothing more — segment sizes and delivered reach only come back from the drafting and
            sending calls, which are an AI call and a real send and are not fired from this read-only workspace. The
            real activity data it does expose is shown below.
          </span>
        </p>
      )}

      <div className="cs-stats">
        <StatCard
          label="People Reached"
          value={m.loading ? "—" : m.totalRecipients === null ? "Not exposed" : m.totalRecipients.toLocaleString()}
          sub={caps.broadcasts ? "Sum of every logged broadcast" : `${label} logs no delivered reach`}
          tone="purple"
          icon="users"
        />
        <StatCard
          label="Broadcasts Sent"
          value={m.loading ? "—" : m.broadcastCount === null ? "Not exposed" : m.broadcastCount.toLocaleString()}
          sub={m.broadcastsLoggedTotal !== null ? `${m.broadcastsLoggedTotal} logged in total` : "No broadcast history endpoint"}
          tone="blue"
          icon="send"
        />
        <StatCard
          label="Average Reach"
          value={m.loading ? "—" : m.avgRecipients === null ? "—" : m.avgRecipients.toLocaleString()}
          sub={m.avgRecipients === null ? "No send to average over" : "Recipients per broadcast"}
          tone="cyan"
          icon="trend"
        />
        <StatCard
          label="Audience Modes Used"
          value={m.loading ? "—" : caps.broadcasts ? m.byAudience.length.toLocaleString() : "Not exposed"}
          sub={caps.broadcasts ? "Distinct audiences actually targeted" : "No per-send audience is returned"}
          tone="green"
          icon="target"
        />
        <StatCard
          label="Named Segments"
          value={m.loading ? "—" : caps.segments ? m.segments.length.toLocaleString() : "Not exposed"}
          sub={caps.segments ? "Fixed on-site segment list" : `${label} targets by audience mode, not named segments`}
          tone="amber"
          icon="tag"
        />
        <StatCard
          label="Widest Single Send"
          value={m.loading ? "—" : widest ? widest.recipientCount.toLocaleString() : caps.broadcasts ? "0 sends" : "Not exposed"}
          sub={widest ? widest.title : caps.broadcasts ? "No broadcast has been sent yet" : "No send history to read"}
          tone="red"
          icon="pulse"
        />
      </div>

      <div className="cs-row-half">
        <Card title={caps.broadcasts ? "Sends by Audience" : "Agent Activity by Kind"}>
          {m.loading ? (
            <Empty>Loading…</Empty>
          ) : (caps.broadcasts ? sendSlices : kindSlices).length === 0 ? (
            <Empty>{m.error ? "Could not load — the audience mix cannot be assessed." : "Nothing recorded yet."}</Empty>
          ) : (
            <div className="cs-donut-row">
              <Donut
                data={caps.broadcasts ? sendSlices : kindSlices}
                center={(caps.broadcasts ? m.broadcasts.length : m.events.length).toLocaleString()}
                centerLabel={caps.broadcasts ? "Sends" : "Events"}
              />
              <Legend data={caps.broadcasts ? sendSlices : kindSlices} />
            </div>
          )}
        </Card>

        <Card title={caps.broadcasts ? "People Reached by Audience" : "Endpoints the Agent Ran"}>
          {m.loading ? (
            <Empty>Loading…</Empty>
          ) : (caps.broadcasts ? reachSlices : endpointSlices).length === 0 ? (
            <Empty>{m.error ? "Could not load — reach cannot be assessed." : "Nothing recorded yet."}</Empty>
          ) : (
            <div className="cs-donut-row">
              <Donut
                data={caps.broadcasts ? reachSlices : endpointSlices}
                center={(caps.broadcasts ? m.totalRecipients ?? 0 : m.events.length).toLocaleString()}
                centerLabel={caps.broadcasts ? "People" : "Calls"}
              />
              <Legend data={caps.broadcasts ? reachSlices : endpointSlices} />
            </div>
          )}
        </Card>
      </div>

      <div className="cs-row-2">
        <Card title="Reach Volume Over Time" action={<span style={{ fontSize: 11, color: "#94a3b8" }}>Last 8 months</span>}>
          {m.loading ? (
            <Empty>Loading…</Empty>
          ) : m.error ? (
            <Empty>The volume trend cannot be drawn — the {label} backend did not respond.</Empty>
          ) : m.monthly === null ? (
            <Empty>No {label} endpoint returns anything datable, so there is no honest volume series to draw.</Empty>
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

        <Card title="Reach Concentration">
          {m.loading ? (
            <Empty>Loading…</Empty>
          ) : concentrationPct === null ? (
            <Empty>
              {caps.broadcasts
                ? m.error
                  ? "Could not load — concentration cannot be assessed."
                  : "No recipients have been reached yet, so there is nothing to concentrate."
                : `${label} reports no delivered reach, so concentration cannot be computed.`}
            </Empty>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
                <ScoreRing
                  value={concentrationPct}
                  max={100}
                  label={`% to ${reachSlices[0].label}`}
                  color={reachSlices[0].color}
                />
              </div>
              <p className="cs-marketing-note">
                {reachSlices[0].value.toLocaleString()} of {(m.totalRecipients ?? 0).toLocaleString()} people reached
                belong to the “{reachSlices[0].label}” audience.
              </p>
            </>
          )}
        </Card>
      </div>

      <div className="cs-row-half">
        <Card title={caps.broadcasts ? "Broadcasts Ranked by Reach" : "Segments the Agent Can Target"}>
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
                Names only — no size is returned by any read endpoint, so these are deliberately shown without counts.
              </p>
            </>
          )}
        </Card>

        <Card title={caps.broadcasts ? "Reach Spread" : "Agent Usage"} >
          {m.loading ? (
            <Empty>Loading…</Empty>
          ) : caps.broadcasts ? (
            m.broadcasts.length === 0 ? (
              <Empty>{m.error ? "Could not load." : "No broadcast has been sent yet."}</Empty>
            ) : (
              <div className="cs-marketing-facts">
                <Fact label="Widest send" value={widest ? `${widest.recipientCount.toLocaleString()} people` : "—"} />
                <Fact label="Narrowest send" value={smallest ? `${smallest.recipientCount.toLocaleString()} people` : "—"} />
                <Fact label="Average send" value={m.avgRecipients === null ? "—" : `${m.avgRecipients.toLocaleString()} people`} />
                <Fact label="Total sends in log" value={m.broadcasts.length.toLocaleString()} />
                <Fact label="Total people reached" value={(m.totalRecipients ?? 0).toLocaleString()} />
              </div>
            )
          ) : m.usage === null ? (
            <Empty>{m.error ? "Could not load the usage report." : "No usage row for the marketing agent yet."}</Empty>
          ) : (
            <div className="cs-marketing-facts">
              <Fact label="Model" value={m.usage.model} />
              <Fact label="Calls this month" value={m.usage.callsThisMonth.toLocaleString()} />
              <Fact label="Spend this month" value={`$${m.usage.spendThisMonthUsd.toFixed(2)}`} />
              <Fact label="Monthly budget" value={`$${m.usage.monthlyBudgetUsd.toLocaleString()}`} />
              <Fact label="Events in audit feed" value={m.events.length.toLocaleString()} />
            </div>
          )}
        </Card>
      </div>

      <style>{CSS}</style>
    </SpecialShell>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="cs-marketing-fact">
      <span>{label}</span>
      <b className="cs-num">{value}</b>
    </div>
  );
}

/* Page-local styles only, all `cs-marketing-*` prefixed. */
const CSS = `
.cs-marketing-note{margin:10px 0 0;font-size:11px;line-height:18px;color:#94a3b8}
.cs-marketing-callout{display:flex;gap:10px;align-items:flex-start;margin:0;background:#0b1220;border:1px solid rgba(255,255,255,.07);border-radius:11px;padding:13px 15px;font-size:11.5px;line-height:19px;color:#cbd5e1}
.cs-marketing-callout b{color:#11162d}
.cs-marketing-seglist{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
.cs-marketing-seglist li{display:flex;align-items:center;gap:9px;font-size:12px;color:#cbd5e1}
.cs-marketing-facts{display:flex;flex-direction:column;gap:2px}
.cs-marketing-fact{display:flex;justify-content:space-between;gap:12px;align-items:baseline;font-size:11.5px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.05)}
.cs-marketing-fact span{color:#cbd5e1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cs-marketing-fact b{font-weight:730;white-space:nowrap}
`;
