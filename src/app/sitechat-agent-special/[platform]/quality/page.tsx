"use client";

/**
 * Site Chat Agent — Quality.
 *
 * Cache hit rate is the headline because it is the one genuine efficiency
 * signal this API exposes: it says how often the assistant answered without
 * paying a model. Everything else on the page is either derived from that
 * same /summary split or drawn from the agent's own /activity log.
 *
 * The backend records no rating, no thumbs, no resolution flag and no
 * transcripts, so there is no satisfaction or accuracy score to show. Rather
 * than invent one, the "Not measured here" panel names each gap explicitly.
 */

import Link from "next/link";
import { useSiteChatSnapshot, formatRate, type SiteChatSnapshot } from "@/lib/sitechat-data";
import { usePlatformParam, platformLabel } from "@/lib/agent-data";
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
  SERIES,
  SpecialShell,
  StatCard,
  TONE,
  type NavItem,
} from "@/components/special/kit";

const NAV: NavItem[] = [
  { label: "Overview", icon: "dashboard", slug: "overview" },
  { label: "Conversations", icon: "chat", slug: "conversations" },
  { label: "Usage & Cost", icon: "trend", slug: "usage" },
  { label: "Quality", icon: "target", slug: "quality" },
  { label: "Chat with AI Agent", icon: "bot", slug: "chat" },
];

export default function SiteChatQualityPage({ params }: { params: Promise<{ platform: string }> }) {
  const platform = usePlatformParam(params);
  const s = useSiteChatSnapshot(platform);
  const label = platformLabel(platform);

  const hit = s.cacheHitRate;
  const ringColor = hit === null ? "#69738c" : hit >= 60 ? "#0f9e69" : hit >= 30 ? "#c9860f" : "#e04452";
  const verdict = cacheVerdict(s);

  const cacheDim = s.dimensions.find((d) => d.key === "cache");
  const kindDim = s.dimensions.find((d) => d.key === "eventKind");
  const actionDim = s.dimensions.find((d) => d.key === "eventAction");

  const efficiencyRates = s.rates.filter((r) =>
    ["Cache hit rate", "Calls that reached the model", "Prompt share of token volume", "Average tokens per assistant call", "Customer satisfaction"].includes(r.label),
  );

  return (
    <SpecialShell
      platform={platform}
      agentLabel="Site Chat Agent"
      tagline="Website assistant"
      basePath="/sitechat-agent-special"
      nav={NAV}
      headerIcon="target"
      assistantBlurb="I don't answer your customers — I report on the assistant that does: volume, cache efficiency and spend."
      title="Quality"
      subtitle={`Cache efficiency for the ${label} assistant — and an honest list of what is not measured`}
      actions={
        <Pill tone={verdict.tone}>
          <Icon name={verdict.icon} size={12} />
          {verdict.word}
        </Pill>
      }
    >
      <style>{QUALITY_CSS}</style>

      {!s.supported ? (
        <UnsupportedNotice reason={s.unsupportedReason} label={label} />
      ) : (
        <>
          {s.error && <ErrorNote error={s.error} platform={platform} />}
          {s.partialNote && <p className="cs-sitechat-warn">{s.partialNote}</p>}

          <div className="cs-stats">
            <StatCard
              label="Cache Hit Rate"
              value={s.loading || s.error ? "—" : hit === null ? "Not tracked" : `${hit}%`}
              sub={s.error ? "Could not be read this session" : hit === null ? `${label} returned no cacheHitRate field.` : "Answered without reaching the model."}
              tone="green"
              icon="check"
            />
            <StatCard
              label="Served From Cache"
              value={s.loading || s.error ? "—" : s.cachedCalls === null ? "Not tracked" : s.cachedCalls.toLocaleString()}
              sub={s.error ? "Could not be read this session" : "cachedCalls from /summary."}
              tone="cyan"
              icon="tag"
            />
            <StatCard
              label="Reached The Model"
              value={s.loading || s.error ? "—" : s.uncachedCalls === null ? "Not tracked" : s.uncachedCalls.toLocaleString()}
              sub={s.error ? "Could not be read this session" : "totalCalls − cachedCalls — the calls that cost money."}
              tone="amber"
              icon="alert"
            />
            <StatCard
              label="Avg Tokens / Call"
              value={s.loading || s.error ? "—" : s.avgTokensPerCall === null ? "Not tracked" : s.avgTokensPerCall.toLocaleString()}
              sub={s.error ? "Could not be read this session" : "(tokens in + out) ÷ all-time calls."}
              tone="purple"
              icon="trend"
            />
            <StatCard
              label="Satisfaction Score"
              value={s.loading || s.error ? "—" : "Not tracked"}
              sub={`${label} records no rating or feedback field on an assistant call.`}
              tone="red"
              icon="heart"
            />
            <StatCard
              label="Audited Agent Events"
              value={s.loading || s.error ? "—" : s.events.length.toLocaleString()}
              sub={s.error ? "Could not be read this session" : "Rows loaded from this agent's own /activity log."}
              tone="blue"
              icon="pulse"
            />
          </div>

          <div className="cs-row-2">
            <Card
              title={cacheDim ? cacheDim.title : "Cached vs generated calls"}
              action={<span className="cs-sitechat-meta">{cacheDim ? `${cacheDim.total.toLocaleString()} ${cacheDim.unit}` : "None returned"}</span>}
            >
              {s.loading ? (
                <Empty>Loading live snapshot…</Empty>
              ) : s.error ? (
                <Empty>The snapshot failed, so cache efficiency cannot be assessed — this page is not claiming the cache is healthy.</Empty>
              ) : cacheDim ? (
                <>
                  <div className="cs-donut-row">
                    <Donut data={cacheDim.rows} center={cacheDim.total.toLocaleString()} centerLabel={cacheDim.unit} />
                    <Legend data={cacheDim.rows} />
                  </div>
                  <p className="cs-sitechat-note">{cacheDim.note}</p>
                </>
              ) : (
                <Empty>{`${label} returned no cachedCalls / totalCalls pair, so the split cannot be drawn.`}</Empty>
              )}
            </Card>

            <Card title="Cache Hit Rate">
              <div className="cs-sitechat-ring">
                <ScoreRing
                  value={s.loading || hit === null ? 0 : Math.round(hit)}
                  max={100}
                  label={hit === null ? "Not tracked" : "%"}
                  color={ringColor}
                />
                <p>{verdict.text}</p>
              </div>
            </Card>
          </div>

          <div className="cs-row-half">
            <Card
              title={kindDim ? kindDim.title : "Agent events by type"}
              action={<span className="cs-sitechat-meta">{kindDim ? `${kindDim.total.toLocaleString()} ${kindDim.unit}` : "None returned"}</span>}
            >
              {s.loading ? (
                <Empty>Loading…</Empty>
              ) : s.error ? (
                <Empty>The audit log could not be read, so event types cannot be assessed.</Empty>
              ) : kindDim ? (
                <>
                  <div className="cs-donut-row">
                    <Donut data={kindDim.rows} center={kindDim.total.toLocaleString()} centerLabel="events" />
                    <Legend data={kindDim.rows} />
                  </div>
                  <p className="cs-sitechat-note">{kindDim.note}</p>
                </>
              ) : (
                <Empty>/activity returned no rows carrying a targetType, so there is nothing to categorise.</Empty>
              )}
            </Card>

            <Card title={actionDim ? actionDim.title : "Agent events by action"}>
              {s.loading ? (
                <Empty>Loading…</Empty>
              ) : s.error ? (
                <Empty>The audit log could not be read, so actions cannot be ranked.</Empty>
              ) : actionDim ? (
                <>
                  <BarRows rows={actionDim.rows.slice(0, 8).map((r, i) => ({ ...r, color: SERIES[i % SERIES.length] }))} colored suffix=" events" />
                  <p className="cs-sitechat-note">{actionDim.note}</p>
                </>
              ) : (
                <Empty>/activity returned no rows to rank by action.</Empty>
              )}
            </Card>
          </div>

          <div className="cs-row-2">
            <Card title="Not measured here">
              <p className="cs-sitechat-callout">
                These are real gaps in the API, not omissions in this page. Nothing below is estimated, and no
                placeholder score stands in for any of them.
              </p>
              <div className="cs-sitechat-gaps">
                {s.qualityGaps.map((g) => (
                  <div className="cs-sitechat-gap" key={g}>
                    <span><Icon name="alert" size={14} /></span>
                    <p>{g}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Efficiency rates">
              {s.loading ? (
                <Empty>Loading…</Empty>
              ) : s.error ? (
                <Empty>Rates are arithmetic over the snapshot — none can be computed while it is unavailable.</Empty>
              ) : (
                <div className="cs-sitechat-rates">
                  {efficiencyRates.map((r) => (
                    <div className="cs-sitechat-rate" key={r.label}>
                      <div className="cs-sitechat-rate-head">
                        <span>{r.label}</span>
                        <b className="cs-num">{formatRate(r)}</b>
                      </div>
                      <p>{r.note}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <Card title="What this page reads">
            <p className="cs-sitechat-note">{s.sourceNote}</p>
            <p className="cs-sitechat-note">{s.conversationsNote}</p>
          </Card>
        </>
      )}
    </SpecialShell>
  );
}

/** A word, a glyph and a sentence — never a colour on its own. */
function cacheVerdict(s: SiteChatSnapshot): { word: string; icon: string; tone: keyof typeof TONE; text: string } {
  if (!s.supported) return { word: "Not on this platform", icon: "alert", tone: "amber", text: "This agent is not mounted here." };
  if (s.loading) return { word: "Loading", icon: "clock", tone: "amber", text: "Loading…" };
  if (s.error) {
    return {
      word: "Cannot assess",
      icon: "alert",
      tone: "red",
      text: "The snapshot failed to load, so cache efficiency cannot be assessed. This is not a report that the cache is fine — it is a report that nothing could be read.",
    };
  }
  if (s.cacheHitRate === null) {
    return {
      word: "Rate unreported",
      icon: "alert",
      tone: "amber",
      text: "The snapshot loaded but carried no cacheHitRate field, so there is no efficiency figure to judge.",
    };
  }
  if (s.isEmpty) {
    return {
      word: "No traffic yet",
      icon: "clock",
      tone: "amber",
      text: "The snapshot loaded and the assistant has served no logged calls yet, so a hit rate would describe nothing.",
    };
  }
  const detail = `${(s.cachedCalls ?? 0).toLocaleString()} of ${(s.totalCalls ?? 0).toLocaleString()} calls were served from cache; the remaining ${(s.uncachedCalls ?? 0).toLocaleString()} reached the model.`;
  if (s.cacheHitRate >= 60) return { word: "Cache carrying most traffic", icon: "check", tone: "green", text: detail };
  if (s.cacheHitRate >= 30) return { word: "Cache carrying some traffic", icon: "pulse", tone: "amber", text: detail };
  return { word: "Most calls reach the model", icon: "alert", tone: "red", text: detail };
}

/** Shown on a platform that never registered this agent. */
function UnsupportedNotice({ reason, label }: { reason: string | null; label: string }) {
  return (
    <Card title={`Site Chat Agent is not available on ${label}`}>
      <div className="cs-sitechat-unsupported">
        <span><Icon name="alert" size={18} /></span>
        <div>
          <p>{reason}</p>
          <p>No cache, efficiency or quality signal is shown here, because there is no assistant on this platform for this agent to measure.</p>
          <Link href="/sitechat-agent-special/ghrfix/quality" className="cs-btn cs-btn-primary">
            <Icon name="arrow" size={15} />Open the GhrFix workspace
          </Link>
        </div>
      </div>
    </Card>
  );
}

const QUALITY_CSS = `
.cs-sitechat-meta{font-size:11px;color:#69738c}
.cs-sitechat-note{margin:12px 0 0;font-size:10.5px;line-height:17px;color:#8891a8}
.cs-sitechat-callout{margin:0 0 14px;font-size:12px;line-height:20px;color:#4c5470}
.cs-sitechat-warn{margin:0 0 12px;border:1px solid #f2e2c2;background:#fff9ee;color:#8a6412;border-radius:10px;padding:10px 13px;font-size:11.5px;line-height:18px}
.cs-sitechat-ring{display:flex;flex-direction:column;align-items:center;gap:12px}
.cs-sitechat-ring p{margin:0;font-size:11.5px;line-height:19px;color:#4c5470;text-align:center}
.cs-sitechat-rates{display:flex;flex-direction:column;gap:12px}
.cs-sitechat-rate-head{display:flex;justify-content:space-between;gap:12px;align-items:baseline;font-size:12px;font-weight:600;color:#11162d}
.cs-sitechat-rate p{margin:3px 0 0;font-size:10.5px;line-height:17px;color:#8891a8}
.cs-sitechat-gaps{display:flex;flex-direction:column;gap:11px}
.cs-sitechat-gap{display:flex;gap:10px;align-items:flex-start}
.cs-sitechat-gap>span{width:26px;height:26px;border-radius:8px;flex:0 0 auto;display:grid;place-items:center;background:#fff6e6;color:#c9860f}
.cs-sitechat-gap p{margin:0;font-size:11.5px;line-height:19px;color:#4c5470}
.cs-sitechat-unsupported{display:flex;gap:14px;align-items:flex-start}
.cs-sitechat-unsupported>span{width:36px;height:36px;border-radius:11px;flex:0 0 auto;display:grid;place-items:center;background:#fff6e6;color:#c9860f}
.cs-sitechat-unsupported p{margin:0 0 10px;font-size:12.5px;line-height:21px;color:#4c5470}
`;
