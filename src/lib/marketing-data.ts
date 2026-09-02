"use client";

/**
 * Marketing Agent — normalized campaign snapshot for both platforms.
 *
 * The two backends expose genuinely different marketing surfaces, and this
 * file is the only place that difference is absorbed:
 *
 *   GhrFix   GET /ai-agents/marketing/summary    → { activePromoCodes, recentBroadcastsCount, recentBroadcasts[] }
 *            GET /ai-agents/marketing/campaigns  → { promoCodes[], broadcasts[] }
 *            (real promo-code table + real AdminBroadcast log)
 *
 *   ShadiLife GET /ai-agents/marketing/segments  → string[]  (the fixed on-site segment list, names only)
 *             GET /ai-agents/_meta/usage         → this agent's real call count + spend
 *             GET /ai-agents/_meta/activity      → the shared audit feed, filtered to `marketing`
 *
 * ShadiLife has NO read endpoint that lists campaigns or promo codes: its
 * campaign data only comes back from `draft-campaign` / `send-campaign`,
 * which are AI calls and real writes. The dashboard reads never fire those on
 * mount, so the campaign fields stay empty with `capabilities.promoCodes` /
 * `.broadcasts` false — the pages say "not exposed" rather than rendering a
 * zero that would read as a measurement.
 *
 * Every field a platform genuinely lacks is `null`, never a faked 0.
 *
 * WRITES, wired from the Campaigns page only (never auto-fired):
 *   GhrFix     POST /ai-agents/marketing/promo      — createPromoCode()
 *              POST /ai-agents/marketing/broadcast  — sendGhrfixBroadcast()
 *   ShadiLife  POST /ai-agents/marketing/send-campaign — sendShadiLifeCampaign()
 *              (no promo-code system anywhere on ShadiLife's backend — grepped
 *              the whole repo for PromoCode/promo_code and found nothing, so
 *              promo creation stays GhrFix-only, disabled with an honest note)
 * `addPromo`/`addBroadcast` let the Campaigns page splice a just-created real
 * row into `raw` right after a successful write, so every derived stat/chart
 * updates without a refetch.
 */

import { useCallback, useEffect, useState } from "react";
import { apiFetch, ApiError } from "./api";
import type { PlatformKey } from "./platforms";

/* ── Row shapes ─────────────────────────────────────────────────────── */

export type PromoType = "FLAT" | "PERCENT";
export type BroadcastAudience = "ALL" | "CUSTOMER_MODE" | "PROVIDER_MODE";

export const AUDIENCE_LABEL: Record<BroadcastAudience, string> = {
  ALL: "Everyone",
  CUSTOMER_MODE: "Customers",
  PROVIDER_MODE: "Providers",
};

export interface MarketingPromo {
  id: string;
  code: string;
  type: PromoType;
  /** Raw decimal string from the backend, kept verbatim; `valueNum` is the parsed form. */
  value: string;
  valueNum: number | null;
  minOrder: number | null;
  maxDiscount: number | null;
  /** null when the code is uncapped — not the same as a limit of zero. */
  usageLimit: number | null;
  perUserLimit: number | null;
  usedCount: number;
  validFrom: string | null;
  validTo: string | null;
  isActive: boolean;
  createdAt: string | null;
  /** True when the code has an end date that has already passed. */
  expired: boolean;
  /** used/limit as a percentage — null for uncapped codes. */
  usagePct: number | null;
}

export interface MarketingBroadcast {
  id: string;
  title: string;
  body: string;
  audience: BroadcastAudience;
  recipientCount: number;
  createdAt: string | null;
  sentByName: string | null;
}

/** One row of ShadiLife's shared `_meta/activity` feed, filtered to this agent. */
export interface MarketingEvent {
  id: string;
  kind: "call" | "suggestion";
  endpoint: string | null;
  status: string | null;
  costUsd: number | null;
  createdAt: string | null;
}

export interface MarketingUsage {
  model: string;
  monthlyBudgetUsd: number;
  callsThisMonth: number;
  spendThisMonthUsd: number;
}

/**
 * What each backend actually exposes to a read-only client. Driven by the
 * PLATFORM, not by whether the current response happened to be empty — an
 * empty GhrFix promo table must still say "no codes yet", never "not
 * supported".
 */
export interface MarketingCapabilities {
  promoCodes: boolean;
  broadcasts: boolean;
  segments: boolean;
  /** Segment names are listed, but no read endpoint returns their sizes. */
  segmentSizes: boolean;
  activityLog: boolean;
  usage: boolean;
}

export interface Bucket {
  label: string;
  value: number;
}

export interface MarketingSeries {
  labels: string[];
  primary: { name: string; data: number[] };
  secondary: { name: string; data: number[] } | null;
  /** One line naming exactly what the series is counted from. */
  note: string;
}

export interface MarketingSnapshot {
  platform: PlatformKey;
  capabilities: MarketingCapabilities;

  /* Raw rows */
  promos: MarketingPromo[];
  broadcasts: MarketingBroadcast[];
  segments: string[];
  events: MarketingEvent[];
  usage: MarketingUsage | null;

  /* Promo aggregates — null where the platform exposes no promo table */
  promoCount: number | null;
  activePromoCount: number | null;
  inactivePromoCount: number | null;
  expiredPromoCount: number | null;
  totalRedemptions: number | null;
  cappedRedemptionCapacity: number | null;
  /** Redemptions as a share of the capacity of capped codes; null when nothing is capped. */
  redemptionRatePct: number | null;
  unusedPromoCount: number | null;

  /* Broadcast aggregates */
  broadcastCount: number | null;
  /** GhrFix's own total from /summary, which can exceed the returned log page. */
  broadcastsLoggedTotal: number | null;
  totalRecipients: number | null;
  avgRecipients: number | null;
  largestBroadcast: MarketingBroadcast | null;

  /* Categorical breakdowns, fixed order so colors never shift under a filter */
  byPromoStatus: Bucket[];
  byPromoType: Bucket[];
  byAudience: Bucket[];
  byEventKind: Bucket[];
  byEndpoint: Bucket[];

  /* Rankings */
  topRedeemed: Bucket[];
  topBroadcastsByReach: Bucket[];

  /** Real monthly series, or null when no endpoint returns anything datable. */
  monthly: MarketingSeries | null;

  loading: boolean;
  error: string | null;

  /** Splice a just-created promo code into the live list (GhrFix only). */
  addPromo: (promo: MarketingPromo) => void;
  /** Splice a just-sent broadcast into the live log (GhrFix only — ShadiLife has no broadcast log to splice into). */
  addBroadcast: (broadcast: MarketingBroadcast) => void;
}

/* ── Raw backend shapes ─────────────────────────────────────────────── */

interface RawPromo {
  id?: string;
  code?: string;
  type?: string;
  value?: string | number;
  minOrder?: string | number | null;
  maxDiscount?: string | number | null;
  usageLimit?: number | null;
  perUserLimit?: number | null;
  usedCount?: number;
  validFrom?: string;
  validTo?: string | null;
  isActive?: boolean;
  createdAt?: string;
}
interface RawBroadcast {
  id?: string;
  title?: string;
  body?: string;
  audience?: string;
  recipientCount?: number;
  createdAt?: string;
  sentBy?: { id?: string; name?: string | null } | null;
}
interface RawSummary {
  activePromoCodes?: number;
  recentBroadcastsCount?: number;
  recentBroadcasts?: RawBroadcast[];
}
interface RawCampaigns {
  promoCodes?: RawPromo[];
  broadcasts?: RawBroadcast[];
}
interface RawMetaUsage {
  model?: string;
  monthlyBudgetUsd?: number;
  byAgent?: Array<{ agent?: string; spendUsd?: number; calls?: number }>;
}
interface RawMetaActivity {
  events?: Array<{
    id?: string;
    kind?: string;
    agent?: string;
    endpoint?: string;
    status?: string;
    costUsd?: number;
    createdAt?: string;
  }>;
}

/* ── Helpers ────────────────────────────────────────────────────────── */

const asText = (v: unknown) => (typeof v === "string" ? v : "");
const asNum = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

function normalizePromoType(s: string): PromoType {
  return s.toUpperCase() === "PERCENT" ? "PERCENT" : "FLAT";
}
function normalizeAudience(s: string): BroadcastAudience {
  const up = s.toUpperCase();
  return up === "CUSTOMER_MODE" || up === "PROVIDER_MODE" ? up : "ALL";
}

function toPromo(r: RawPromo, i: number): MarketingPromo {
  const usageLimit = asNum(r.usageLimit);
  const usedCount = asNum(r.usedCount) ?? 0;
  const validTo = asText(r.validTo) || null;
  return {
    id: asText(r.id) || `promo-${i}`,
    code: asText(r.code) || "UNNAMED",
    type: normalizePromoType(asText(r.type)),
    value: typeof r.value === "number" ? String(r.value) : asText(r.value),
    valueNum: asNum(r.value),
    minOrder: asNum(r.minOrder),
    maxDiscount: asNum(r.maxDiscount),
    usageLimit,
    perUserLimit: asNum(r.perUserLimit),
    usedCount,
    validFrom: asText(r.validFrom) || null,
    validTo,
    isActive: Boolean(r.isActive),
    createdAt: asText(r.createdAt) || null,
    expired: validTo !== null && new Date(validTo).getTime() < Date.now(),
    usagePct: usageLimit && usageLimit > 0 ? Math.round((usedCount / usageLimit) * 100) : null,
  };
}

function toBroadcast(r: RawBroadcast, i: number): MarketingBroadcast {
  return {
    id: asText(r.id) || `broadcast-${i}`,
    title: asText(r.title) || "Untitled broadcast",
    body: asText(r.body),
    audience: normalizeAudience(asText(r.audience)),
    recipientCount: asNum(r.recipientCount) ?? 0,
    createdAt: asText(r.createdAt) || null,
    sentByName: r.sentBy?.name ?? null,
  };
}

/** Count into a map, then rank descending — used for every categorical chart. */
function tally(values: string[]): Bucket[] {
  const map = new Map<string, number>();
  for (const v of values) {
    const key = v.trim();
    if (!key) continue;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

/** Last `months` calendar buckets, counted from real ISO timestamps only. */
function monthKeys(months: number) {
  const keys: Array<{ key: string; label: string }> = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString(undefined, { month: "short" }),
    });
  }
  return keys;
}

function bucketByMonth(dates: Array<string | null>, keys: ReturnType<typeof monthKeys>): number[] {
  const counts = new Map(keys.map((k) => [k.key, 0]));
  for (const iso of dates) {
    if (!iso) continue;
    const key = iso.slice(0, 7);
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return keys.map((k) => counts.get(k.key) ?? 0);
}

/* ── Real writes ────────────────────────────────────────────────────── */

/** Mirrors GhrFix's createPromoSchema (promo.schema.ts) closely enough to build a valid request body. */
export interface CreatePromoInput {
  code: string;
  type: PromoType;
  value: number;
  minOrder?: number;
  maxDiscount?: number;
  usageLimit?: number;
  perUserLimit?: number;
  /** ISO date string, e.g. from an <input type="date">. */
  validFrom?: string;
  validTo?: string;
  isActive?: boolean;
}

/**
 * Real, audited write: POST /ai-agents/marketing/promo. GhrFix only — there is
 * no promo-code concept anywhere on ShadiLife's backend (confirmed by
 * grepping the whole repo for PromoCode/promo_code — no matches outside
 * GhrFix). Returns the created code, normalized the same way the read path
 * does, ready to prepend via `addPromo`.
 */
export async function createPromoCode(input: CreatePromoInput): Promise<MarketingPromo> {
  const { data } = await apiFetch<RawPromo>("ghrfix", "/ai-agents/marketing/promo", { method: "POST", body: input });
  return toPromo(data, 0);
}

export interface SendGhrfixBroadcastInput {
  title: string;
  body: string;
  audience: BroadcastAudience;
}

/** Real, audited write: POST /ai-agents/marketing/broadcast. GhrFix only. */
export async function sendGhrfixBroadcast(input: SendGhrfixBroadcastInput): Promise<MarketingBroadcast> {
  const { data } = await apiFetch<RawBroadcast>("ghrfix", "/ai-agents/marketing/broadcast", { method: "POST", body: input });
  return toBroadcast(data, 0);
}

export const SHADILIFE_CAMPAIGN_CHANNELS = ["EMAIL", "NOTIFICATION", "BOTH"] as const;
export type ShadiLifeCampaignChannel = (typeof SHADILIFE_CAMPAIGN_CHANNELS)[number];

export interface SendShadiLifeCampaignInput {
  title: string;
  body: string;
  /** One of the names GET /ai-agents/marketing/segments returned. */
  segment: string;
  channel: ShadiLifeCampaignChannel;
}

export interface ShadiLifeCampaignResult {
  id: string;
  title: string;
  segment: string;
  status: string;
  /** How many recipients were actually reached — real count from sendCampaignNow, not an estimate. */
  sentCount: number;
  sentAt: string | null;
}

/**
 * Real send: POST /ai-agents/marketing/send-campaign. ShadiLife's equivalent
 * of GhrFix's broadcast — this platform has no promo-code system, but it does
 * have a real on-site/email campaign send. There is no read endpoint that
 * lists past sends (confirmed in the file banner above), so the result is
 * shown as a one-off confirmation rather than spliced into a list that does
 * not exist for this platform.
 */
export async function sendShadiLifeCampaign(input: SendShadiLifeCampaignInput): Promise<ShadiLifeCampaignResult> {
  const { data } = await apiFetch<{
    id?: string;
    title?: string;
    segment?: string;
    status?: string;
    sentCount?: number;
    sentAt?: string | null;
  }>("shadilife", "/ai-agents/marketing/send-campaign", { method: "POST", body: input });
  return {
    id: asText(data.id) || "campaign",
    title: asText(data.title) || input.title,
    segment: asText(data.segment) || input.segment,
    status: asText(data.status) || "SENT",
    sentCount: asNum(data.sentCount) ?? 0,
    sentAt: asText(data.sentAt) || null,
  };
}

/* ── Hook ───────────────────────────────────────────────────────────── */

interface Loaded {
  promos: MarketingPromo[];
  broadcasts: MarketingBroadcast[];
  segments: string[];
  events: MarketingEvent[];
  usage: MarketingUsage | null;
  activePromoCodes: number | null;
  broadcastsLoggedTotal: number | null;
}

const EMPTY: Loaded = {
  promos: [],
  broadcasts: [],
  segments: [],
  events: [],
  usage: null,
  activePromoCodes: null,
  broadcastsLoggedTotal: null,
};

const CAPS: Record<PlatformKey, MarketingCapabilities> = {
  ghrfix: { promoCodes: true, broadcasts: true, segments: false, segmentSizes: false, activityLog: false, usage: false },
  shadilife: { promoCodes: false, broadcasts: false, segments: true, segmentSizes: false, activityLog: true, usage: true },
};

export function useMarketingSnapshot(platform: PlatformKey): MarketingSnapshot {
  const [raw, setRaw] = useState<Loaded>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRaw(EMPTY);
    setLoading(true);
    setError(null);

    const run = platform === "ghrfix" ? loadGhrfix() : loadShadiLife();

    run
      .then((next) => {
        if (!cancelled) setRaw(next);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Could not reach the backend.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [platform]);

  /** GhrFix only — the campaigns page never renders the promo form for ShadiLife. */
  const addPromo = useCallback((promo: MarketingPromo) => {
    setRaw((prev) => ({ ...prev, promos: [promo, ...prev.promos] }));
  }, []);
  /** GhrFix only — ShadiLife has no broadcast log to splice into. */
  const addBroadcast = useCallback((broadcast: MarketingBroadcast) => {
    setRaw((prev) => ({
      ...prev,
      broadcasts: [broadcast, ...prev.broadcasts],
      broadcastsLoggedTotal: prev.broadcastsLoggedTotal !== null ? prev.broadcastsLoggedTotal + 1 : prev.broadcastsLoggedTotal,
    }));
  }, []);

  const caps = CAPS[platform];
  const { promos, broadcasts, events } = raw;

  /* Promo aggregates — only meaningful where a promo table exists. */
  const promoCount = caps.promoCodes ? promos.length : null;
  const activeCount = caps.promoCodes ? promos.filter((p) => p.isActive).length : null;
  const totalRedemptions = caps.promoCodes ? promos.reduce((s, p) => s + p.usedCount, 0) : null;
  const capped = promos.filter((p) => p.usageLimit !== null && p.usageLimit > 0);
  const capacity = capped.reduce((s, p) => s + (p.usageLimit ?? 0), 0);
  const cappedUsed = capped.reduce((s, p) => s + p.usedCount, 0);

  /* Broadcast aggregates. */
  const broadcastCount = caps.broadcasts ? broadcasts.length : null;
  const totalRecipients = caps.broadcasts ? broadcasts.reduce((s, b) => s + b.recipientCount, 0) : null;
  const largest = broadcasts.length > 0 ? [...broadcasts].sort((a, b) => b.recipientCount - a.recipientCount)[0] : null;

  /* Series. GhrFix counts real promo + broadcast creation dates; ShadiLife
     counts the real agent-call log. Neither is invented, and each carries a
     note saying exactly what it is. */
  const keys = monthKeys(8);
  let monthly: MarketingSeries | null = null;
  if (platform === "ghrfix" && (promos.length > 0 || broadcasts.length > 0)) {
    monthly = {
      labels: keys.map((k) => k.label),
      primary: { name: "Promo codes created", data: bucketByMonth(promos.map((p) => p.createdAt), keys) },
      secondary: { name: "Broadcasts sent", data: bucketByMonth(broadcasts.map((b) => b.createdAt), keys) },
      note: "Counted from the real createdAt on each promo code and broadcast.",
    };
  } else if (platform === "shadilife" && events.length > 0) {
    monthly = {
      labels: keys.map((k) => k.label),
      primary: {
        name: "Marketing agent calls",
        data: bucketByMonth(events.filter((e) => e.kind === "call").map((e) => e.createdAt), keys),
      },
      secondary: {
        name: "Suggestions logged",
        data: bucketByMonth(events.filter((e) => e.kind === "suggestion").map((e) => e.createdAt), keys),
      },
      note: "Counted from the shared agent audit feed — ShadiLife exposes no campaign history to read.",
    };
  }

  return {
    platform,
    capabilities: caps,

    promos,
    broadcasts,
    segments: raw.segments,
    events,
    usage: raw.usage,

    promoCount,
    activePromoCount: activeCount,
    inactivePromoCount: caps.promoCodes ? promos.length - (activeCount ?? 0) : null,
    expiredPromoCount: caps.promoCodes ? promos.filter((p) => p.expired).length : null,
    totalRedemptions,
    cappedRedemptionCapacity: caps.promoCodes && capped.length > 0 ? capacity : null,
    redemptionRatePct: capacity > 0 ? Math.round((cappedUsed / capacity) * 100) : null,
    unusedPromoCount: caps.promoCodes ? promos.filter((p) => p.usedCount === 0).length : null,

    broadcastCount,
    broadcastsLoggedTotal: raw.broadcastsLoggedTotal,
    totalRecipients,
    avgRecipients: broadcasts.length > 0 ? Math.round((totalRecipients ?? 0) / broadcasts.length) : null,
    largestBroadcast: largest,

    byPromoStatus: caps.promoCodes
      ? [
          { label: "Active", value: promos.filter((p) => p.isActive && !p.expired).length },
          { label: "Expired", value: promos.filter((p) => p.expired).length },
          { label: "Disabled", value: promos.filter((p) => !p.isActive && !p.expired).length },
        ].filter((b) => b.value > 0)
      : [],
    byPromoType: caps.promoCodes
      ? [
          { label: "Flat discount", value: promos.filter((p) => p.type === "FLAT").length },
          { label: "Percent discount", value: promos.filter((p) => p.type === "PERCENT").length },
        ].filter((b) => b.value > 0)
      : [],
    byAudience: caps.broadcasts ? tally(broadcasts.map((b) => AUDIENCE_LABEL[b.audience])) : [],
    byEventKind: caps.activityLog
      ? [
          { label: "AI calls", value: events.filter((e) => e.kind === "call").length },
          { label: "Suggestions", value: events.filter((e) => e.kind === "suggestion").length },
        ].filter((b) => b.value > 0)
      : [],
    byEndpoint: caps.activityLog ? tally(events.map((e) => e.endpoint ?? "")).slice(0, 6) : [],

    topRedeemed: promos
      .filter((p) => p.usedCount > 0)
      .sort((a, b) => b.usedCount - a.usedCount)
      .slice(0, 6)
      .map((p) => ({ label: p.code, value: p.usedCount })),
    topBroadcastsByReach: [...broadcasts]
      .sort((a, b) => b.recipientCount - a.recipientCount)
      .slice(0, 6)
      .map((b) => ({ label: b.title, value: b.recipientCount })),

    monthly,
    loading,
    error,

    addPromo,
    addBroadcast,
  };
}

/* ── Per-platform loaders ───────────────────────────────────────────── */

/**
 * GhrFix. `/summary` and `/campaigns` are independent reads; the snapshot
 * only fails when BOTH fail, so a partial outage still shows the half that
 * genuinely loaded rather than blanking the page.
 */
async function loadGhrfix(): Promise<Loaded> {
  const [summary, campaigns] = await Promise.allSettled([
    apiFetch<RawSummary>("ghrfix", "/ai-agents/marketing/summary"),
    apiFetch<RawCampaigns>("ghrfix", "/ai-agents/marketing/campaigns"),
  ]);

  if (summary.status === "rejected" && campaigns.status === "rejected") throw summary.reason;

  const s = summary.status === "fulfilled" ? summary.value.data : null;
  const c = campaigns.status === "fulfilled" ? campaigns.value.data : null;

  const broadcasts = (c?.broadcasts ?? s?.recentBroadcasts ?? []).map(toBroadcast);

  return {
    ...EMPTY,
    promos: (c?.promoCodes ?? []).map(toPromo),
    broadcasts,
    activePromoCodes: asNum(s?.activePromoCodes),
    broadcastsLoggedTotal: asNum(s?.recentBroadcastsCount),
  };
}

/**
 * ShadiLife. Only reads here: the segment name list, this agent's row in the
 * shared usage report, and the shared audit feed filtered to `marketing`.
 * `draft-campaign` and `send-campaign` are an AI call and a real send, so
 * they are never touched by this dashboard.
 */
async function loadShadiLife(): Promise<Loaded> {
  const [segments, usage, activity] = await Promise.allSettled([
    apiFetch<string[]>("shadilife", "/ai-agents/marketing/segments"),
    apiFetch<RawMetaUsage>("shadilife", "/ai-agents/_meta/usage"),
    apiFetch<RawMetaActivity>("shadilife", "/ai-agents/_meta/activity"),
  ]);

  if (segments.status === "rejected" && usage.status === "rejected" && activity.status === "rejected") {
    throw segments.reason;
  }

  const u = usage.status === "fulfilled" ? usage.value.data : null;
  const mine = u?.byAgent?.find((a) => a.agent === "marketing");

  const events: MarketingEvent[] =
    activity.status === "fulfilled"
      ? (activity.value.data.events ?? [])
          .filter((e) => e.agent === "marketing")
          .map((e, i) => ({
            id: asText(e.id) || `event-${i}`,
            kind: e.kind === "suggestion" ? "suggestion" : "call",
            endpoint: asText(e.endpoint) || null,
            status: asText(e.status) || null,
            costUsd: asNum(e.costUsd),
            createdAt: asText(e.createdAt) || null,
          }))
      : [];

  return {
    ...EMPTY,
    segments: segments.status === "fulfilled" && Array.isArray(segments.value.data) ? segments.value.data : [],
    events,
    usage:
      u && mine
        ? {
            model: asText(u.model) || "unknown",
            monthlyBudgetUsd: asNum(u.monthlyBudgetUsd) ?? 0,
            callsThisMonth: asNum(mine.calls) ?? 0,
            spendThisMonthUsd: asNum(mine.spendUsd) ?? 0,
          }
        : null,
  };
}
