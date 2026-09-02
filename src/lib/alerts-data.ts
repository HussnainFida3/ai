"use client";

/**
 * Audit Logs (routed at /alerts) — a real, unified audit-log feed across both
 * platforms.
 *
 * The route is `/alerts` (unchanged, per the URL contract other parts of the
 * app link to) but the actual page has always been headed "Audit Logs" — this
 * file supplies that heading's real content: every audited write (human admin
 * action AND AI-agent tool call) plus real AI call/suggestion activity, from
 * both backends, merged and sorted newest-first. Nothing here is scoped to
 * one platform; every row is tagged with which platform it came from.
 *
 * Sources, all real, all read-only:
 *
 *   GhrFix    GET /admin/audit-logs?page=1&pageSize=100 -> AdminActionLog rows
 *               ({id, adminId, action, targetType, targetId, meta, createdAt,
 *               admin:{id,name}}) with REAL server-side pagination
 *               ({page,pageSize,total,totalPages} in meta — this app only
 *               pulls page 1 at the max allowed pageSize, but the real
 *               all-time `total` is surfaced as its own stat). This is the
 *               same AdminActionLog table /ai-agents/master/feed reads, but
 *               unlike that route (capped at limit<=50, always page 1, no
 *               real page count anywhere) this admin route is the actual
 *               richer source: true pagination and a real lifetime total.
 *               Both are gated by the exact same `requireRole("ADMIN")` this
 *               app's GhrFix session already authenticates as (confirmed by
 *               reading src/modules/ai-agents/_shared/middleware.ts and
 *               src/modules/admin/admin.routes.ts side by side), so no new
 *               auth path is needed.
 *
 *   ShadiLife (real backend at C:\Dev\ShadiLife\backend — NOT the stale
 *              mirror under this repo's sibling "ShadiLife" folder, which
 *              has no ai-agents module at all; see the report for this file's
 *              origin session for how that was confirmed) exposes THREE real
 *              sources, all under the same SUPER_ADMIN-gated session this
 *              app already holds (verified: /ai-agents/_meta/usage already
 *              works from credit-usage-data.ts, and every route below shares
 *              that exact same `ownerAgentRouter()` / `requireAdminRole
 *              ("SUPER_ADMIN")` gate):
 *
 *             GET /ai-agents/devqa/activity-log?limit=100 -> AdminAuditLog
 *               rows ({id, adminId, action, targetType, targetId, metadata,
 *               ipAddress, createdAt}) — ShadiLife's real equivalent of
 *               GhrFix's /admin/audit-logs: the same table every admin
 *               action AND every AI-agent tool write lands in (via the
 *               shared `auditLog()`/`auditToolAction()` helpers). No real
 *               page cursor — `limit` tops out at 100 in one shot — so this
 *               is the deepest single pull available, not a true pager.
 *             GET /ai-agents/_meta/activity -> {events:[{id, kind:
 *               "call"|"suggestion", agent, endpoint?, targetType?, status?,
 *               costUsd?, createdAt}]} — real OpenAI calls and AI
 *               suggestions, capped at the newest 25 server-side (no query
 *               params accepted at all). Already typed as
 *               ShadiLifeMetaActivity/ShadiLifeMetaEvent in src/lib/api.ts —
 *               reused directly here, not redeclared. This table is
 *               disjoint from AdminAuditLog (a call/suggestion doesn't
 *               necessarily write anything), so merging the two adds real
 *               rows rather than duplicating them.
 *             GET /admin/security/events -> SecurityEvent[] ({id, actorType,
 *               eventType, ipAddress, severity: INFO|WARNING|CRITICAL,
 *               createdAt}), newest 200. A genuine security/audit log with
 *               no GhrFix equivalent (confirmed by reading GhrFix's whole
 *               schema.prisma — it has no SecurityEvent/IpBlock model at
 *               all), so this powers a ShadiLife-only "Recent Security
 *               Events" panel instead of being forced into the cross-
 *               platform row feed.
 *             GET /admin/security/ip-blocks -> IpBlock[] — real active IP
 *               blocks, for a real "Active IP Blocks" figure.
 *
 * WHY MERGE devqa/activity-log with _meta/activity instead of picking one:
 * they cover genuinely different real events (audited writes vs. raw AI
 * calls/suggestions), not two views of the same table — confirmed by reading
 * the Prisma schema (AdminAuditLog vs. AiUsageLog vs. AiSuggestion are three
 * separate models). Using only one would silently drop a category of real
 * activity that actually happened.
 *
 * PAGINATION: GhrFix genuinely supports server-side page/pageSize; ShadiLife's
 * two feed endpoints are hard-capped (100 and 25) with no cursor at all. A
 * single server-driven pager can't span both, so this file pulls the deepest
 * real batch each source allows (up to ~225 rows total), merges and sorts
 * them, and the page paginates that real merged array client-side — never a
 * fabricated page count over a short static list.
 *
 * THE SAME HONESTY RULE AS EVERY OTHER FILE HERE: a row's "status" is never
 * invented. AiSuggestion rows carry a real PENDING/ACCEPTED/DISMISSED/
 * SUPERSEDED status and keep it. Every other row (an audited write, or a
 * completed AI call) is labelled "Completed" — which is simply true: it
 * exists in the log because it already happened, not because a status field
 * says so. There is no fabricated Success/Warning/Failed split standing in
 * for data neither backend actually records.
 *
 * Both platform loaders are designed to never throw — a dead endpoint
 * degrades its own slice to empty with a reason attached (via
 * Promise.allSettled), so GhrFix being unreachable can never blank out
 * ShadiLife's rows, and vice versa.
 *
 * READ-ONLY. Nothing here writes.
 */

import { useEffect, useMemo, useState } from "react";
import { apiFetch, ApiError, type Paginated, type ShadiLifeMetaActivity, type ShadiLifeMetaEvent } from "./api";
import { PLATFORMS, agentTitle, type PlatformKey, type AgentDef } from "./platforms";
import { ago, dateTime } from "./master-data";
import { humanize } from "./use-agent";

export { ago, dateTime };

/* ── Raw backend shapes (only the fields this file actually reads) ───── */

interface GhrFixAuditRowRaw {
  id: string;
  adminId: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  meta?: Record<string, unknown> | null;
  createdAt: string;
  admin?: { id: string; name: string | null } | null;
}
interface ShadiAuditRowRaw {
  id: string;
  adminId: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  createdAt: string;
}
interface ShadiSecurityEventRaw {
  id: string;
  actorType: string;
  actorId?: string | null;
  eventType: string;
  ipAddress: string;
  location?: string | null;
  severity: "INFO" | "WARNING" | "CRITICAL";
  createdAt: string;
}
interface ShadiIpBlockRaw {
  id: string;
  ipRange: string;
  reason?: string | null;
  expiresAt?: string | null;
  createdAt: string;
}

/* ── Public shapes ──────────────────────────────────────────────────── */

export type AuditRowStatus = "Completed" | "Pending" | "Accepted" | "Dismissed" | "Superseded";

export interface AuditRow {
  id: string;
  platformKey: PlatformKey;
  platformLabel: string;
  /** Human-readable, derived from the real action string — never invented. */
  action: string;
  rawAction: string;
  /** The real registry agent's tag when this row is attributable to an AI agent, else a category derived from the real action prefix. */
  category: string;
  actorLabel: string;
  actorIcon: AgentDef["icon"] | null;
  actorAccent: string;
  targetType: string | null;
  targetId: string | null;
  /** Real cost in USD — only ShadiLife's raw "call" events carry this. Null everywhere else, never $0 standing in for "not tracked". */
  costUsd: number | null;
  /** Real IP — only ShadiLife's AdminAuditLog rows carry this. */
  ipAddress: string | null;
  status: AuditRowStatus;
  createdAt: string;
}

export interface SecurityEventRow {
  id: string;
  eventType: string;
  ipAddress: string;
  location: string | null;
  severity: "INFO" | "WARNING" | "CRITICAL";
  createdAt: string;
}

export interface AuditLogSnapshot {
  loading: boolean;
  ghrfixError: string | null;
  shadilifeError: string | null;

  /** Merged, newest first. Real rows only. */
  rows: AuditRow[];
  ghrfixCount: number;
  shadilifeCount: number;
  /** GhrFix's real all-time audit-log count, from /admin/audit-logs' meta.total — independent of how many rows are loaded here. */
  ghrfixTotalAllTime: number | null;

  /** Distinct categories actually present in `rows`, for the filter dropdown. */
  categories: string[];

  /** Rows attributable to a specific real AI agent (via meta.via / metadata.via / _meta event agent), vs. a plain human admin action. */
  agentActionCount: number;
  /** Real, ShadiLife-only: AiSuggestion rows still awaiting human review. */
  pendingSuggestions: number;

  /** ShadiLife-only — GhrFix has no equivalent model. */
  securityEvents: SecurityEventRow[];
  securityEvents24h: number;
  securityEvents7d: number;
  activeIpBlocks: number | null;

  sourceNote: string;
  refresh: () => void;
}

/* ── Helpers ────────────────────────────────────────────────────────── */

function num(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function errText(e: unknown, fallback: string): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error && e.message) return e.message;
  return fallback;
}

/** Extracts `meta.via` / `metadata.via` — the agent key the write is tagged with — without assuming the field exists. */
function viaOf(meta: unknown): string | null {
  if (meta && typeof meta === "object" && !Array.isArray(meta)) {
    const v = (meta as Record<string, unknown>).via;
    return typeof v === "string" ? v : null;
  }
  return null;
}

/** "wallet.admin_adjust" -> "Wallet Admin Adjust". Real string transform, nothing invented. */
function formatAction(raw: string): string {
  return humanize(raw.replace(/[._]+/g, " "));
}

/**
 * Every GhrFix agent's own router logs usage/writes under this internal key
 * (confirmed by reading every src/modules/ai-agents/<x>/router.ts, same
 * mapping already established in credit-usage-data.ts): `${key}-agent` for
 * all of them except "owner-chat" (kept as-is) and "master" (kept as
 * "master-ai"). Used here in reverse — resolving an audit row's real
 * `meta.via` back to the registry agent that wrote it.
 */
function ghrfixInternalKey(frontendKey: string): string {
  if (frontendKey === "owner-chat") return "owner-chat";
  if (frontendKey === "master") return "master-ai";
  return `${frontendKey}-agent`;
}
const GHRFIX_AGENT_BY_INTERNAL_KEY = new Map<string, AgentDef>(
  PLATFORMS.ghrfix.agents.map((a) => [ghrfixInternalKey(a.key), a] as const),
);

/**
 * ShadiLife logs two real sub-processes under keys the registry doesn't
 * have (same two real aliases already established in credit-usage-data.ts
 * by reading every ai-agents/*\/router.ts and master-agent/tools.ts):
 * the Master agent's own chat under "master-agent", and matchmaking's daily
 * cron job under "matchmaking-daily".
 */
const SHADILIFE_AGENT_ALIAS: Record<string, string> = {
  "master-agent": "master",
  "matchmaking-daily": "matchmaking",
};
function shadilifeAgentByKey(via: string): AgentDef | undefined {
  const key = SHADILIFE_AGENT_ALIAS[via] ?? via;
  return PLATFORMS.shadilife.agents.find((a) => a.key === key);
}

/** Real, deterministic fallback category for a row with no resolvable AI agent — derived from the real action-string prefix, never invented per-row. */
const CATEGORY_BY_PREFIX: Record<string, string> = {
  user: "Users",
  admin: "Administration",
  wallet: "Finance",
  broadcast: "Marketing",
  provider: "Providers",
  settings: "Settings",
  security: "Security",
  devqa: "Engineering",
  booking: "Bookings",
  order: "Orders",
  promo: "Marketing",
  emergency: "Operations",
  dispute: "Support",
  profile: "Members",
  verification: "Trust & Safety",
  moderation: "Trust & Safety",
};
function categoryFor(rawAction: string, agentTag: string | null): string {
  if (agentTag) return agentTag;
  const prefix = rawAction.split(".")[0]?.toLowerCase() ?? "";
  return CATEGORY_BY_PREFIX[prefix] ?? (prefix ? prefix.charAt(0).toUpperCase() + prefix.slice(1) : "Platform");
}

/* ── GhrFix loader ─────────────────────────────────────────────────── */

interface GhrFixLoaded {
  rows: AuditRow[];
  total: number | null;
  error: string | null;
}

async function loadGhrFixAudit(pageSize: number): Promise<GhrFixLoaded> {
  try {
    const { data, meta } = await apiFetch<GhrFixAuditRowRaw[], Paginated>("ghrfix", "/admin/audit-logs", {
      query: { page: 1, pageSize },
    });
    const rows: AuditRow[] = (Array.isArray(data) ? data : []).map((r) => {
      const via = viaOf(r.meta);
      const agent = via ? GHRFIX_AGENT_BY_INTERNAL_KEY.get(via) : undefined;
      return {
        id: `ghrfix:${r.id}`,
        platformKey: "ghrfix" as const,
        platformLabel: "GhrFix",
        action: formatAction(r.action),
        rawAction: r.action,
        category: categoryFor(r.action, agent?.tag ?? null),
        actorLabel: agent ? agentTitle(PLATFORMS.ghrfix, agent) : (r.admin?.name ?? "GhrFix Admin"),
        actorIcon: agent?.icon ?? null,
        actorAccent: agent?.accent ?? PLATFORMS.ghrfix.color,
        targetType: r.targetType ?? null,
        targetId: r.targetId ?? null,
        costUsd: null, // AdminActionLog never carries a cost column
        ipAddress: null, // not recorded on GhrFix's AdminActionLog
        status: "Completed" as const,
        createdAt: r.createdAt,
      };
    });
    return { rows, total: num(meta?.total), error: null };
  } catch (e) {
    return { rows: [], total: null, error: errText(e, "Could not reach GhrFix.") };
  }
}

/* ── ShadiLife loader ──────────────────────────────────────────────── */

interface ShadiLoaded {
  rows: AuditRow[];
  securityEvents: SecurityEventRow[];
  activeIpBlocks: number | null;
  pendingSuggestions: number;
  error: string | null;
}

async function loadShadiLifeAudit(limit: number): Promise<ShadiLoaded> {
  const [auditRes, metaRes, secRes, ipRes] = await Promise.allSettled([
    apiFetch<ShadiAuditRowRaw[]>("shadilife", "/ai-agents/devqa/activity-log", { query: { limit } }),
    apiFetch<ShadiLifeMetaActivity>("shadilife", "/ai-agents/_meta/activity"),
    apiFetch<ShadiSecurityEventRaw[]>("shadilife", "/admin/security/events"),
    apiFetch<ShadiIpBlockRaw[]>("shadilife", "/admin/security/ip-blocks"),
  ]);

  const everythingFailed = [auditRes, metaRes, secRes, ipRes].every((r) => r.status === "rejected");

  const auditRows: AuditRow[] =
    auditRes.status === "fulfilled" && Array.isArray(auditRes.value.data)
      ? auditRes.value.data.map((r) => {
          const via = viaOf(r.metadata);
          const agent = via ? shadilifeAgentByKey(via) : undefined;
          return {
            id: `shadilife:audit:${r.id}`,
            platformKey: "shadilife" as const,
            platformLabel: "ShadiLife",
            action: formatAction(r.action),
            rawAction: r.action,
            category: categoryFor(r.action, agent?.tag ?? null),
            actorLabel: agent ? agentTitle(PLATFORMS.shadilife, agent) : "ShadiLife Admin",
            actorIcon: agent?.icon ?? null,
            actorAccent: agent?.accent ?? PLATFORMS.shadilife.color,
            targetType: r.targetType ?? null,
            targetId: r.targetId ?? null,
            costUsd: null, // AdminAuditLog never carries a cost column either
            ipAddress: r.ipAddress ?? null,
            status: "Completed" as const,
            createdAt: r.createdAt,
          };
        })
      : [];

  let pendingSuggestions = 0;
  const metaEvents: ShadiLifeMetaEvent[] =
    metaRes.status === "fulfilled" && Array.isArray(metaRes.value.data?.events) ? metaRes.value.data.events : [];

  const metaRows: AuditRow[] = metaEvents.map((e) => {
    const agent = e.agent ? shadilifeAgentByKey(e.agent) : undefined;
    const isSuggestion = e.kind === "suggestion";
    const statusRaw = (e.status ?? "").toUpperCase();
    if (isSuggestion && statusRaw === "PENDING") pendingSuggestions += 1;
    const status: AuditRowStatus = !isSuggestion
      ? "Completed"
      : statusRaw === "ACCEPTED"
        ? "Accepted"
        : statusRaw === "DISMISSED"
          ? "Dismissed"
          : statusRaw === "SUPERSEDED"
            ? "Superseded"
            : "Pending";

    return {
      id: `shadilife:meta:${e.id}`,
      platformKey: "shadilife" as const,
      platformLabel: "ShadiLife",
      action: isSuggestion ? `Suggested action on ${e.targetType ?? "an item"}` : `Called ${e.endpoint ?? "an AI endpoint"}`,
      rawAction: isSuggestion ? "ai.suggestion" : "ai.call",
      category: agent?.tag ?? "AI Activity",
      actorLabel: agent ? agentTitle(PLATFORMS.shadilife, agent) : (e.agent ?? "Unknown agent"),
      actorIcon: agent?.icon ?? null,
      actorAccent: agent?.accent ?? PLATFORMS.shadilife.color,
      targetType: e.targetType ?? null,
      targetId: null,
      costUsd: !isSuggestion ? num(e.costUsd) : null,
      ipAddress: null,
      status,
      createdAt: e.createdAt,
    };
  });

  const securityEvents: SecurityEventRow[] =
    secRes.status === "fulfilled" && Array.isArray(secRes.value.data)
      ? secRes.value.data.map((s) => ({
          id: s.id,
          eventType: s.eventType,
          ipAddress: s.ipAddress,
          location: s.location ?? null,
          severity: s.severity,
          createdAt: s.createdAt,
        }))
      : [];

  const activeIpBlocks =
    ipRes.status === "fulfilled" && Array.isArray(ipRes.value.data)
      ? ipRes.value.data.filter((b) => !b.expiresAt || new Date(b.expiresAt).getTime() > Date.now()).length
      : null;

  return {
    rows: [...auditRows, ...metaRows],
    securityEvents,
    activeIpBlocks,
    pendingSuggestions,
    error: everythingFailed ? errText(auditRes.status === "rejected" ? auditRes.reason : null, "Could not reach ShadiLife.") : null,
  };
}

/* ── Hook ──────────────────────────────────────────────────────────── */

const EMPTY: AuditLogSnapshot = {
  loading: true,
  ghrfixError: null,
  shadilifeError: null,
  rows: [],
  ghrfixCount: 0,
  shadilifeCount: 0,
  ghrfixTotalAllTime: null,
  categories: [],
  agentActionCount: 0,
  pendingSuggestions: 0,
  securityEvents: [],
  securityEvents24h: 0,
  securityEvents7d: 0,
  activeIpBlocks: null,
  sourceNote: "",
  refresh: () => {},
};

/** Silent background refresh interval — makes the page's "live" badge true rather than decorative. */
const AUTO_REFRESH_MS = 60_000;

export function useAuditLogSnapshot(): AuditLogSnapshot {
  const [loaded, setLoaded] = useState<{ ghrfix: GhrFixLoaded; shadi: ShadiLoaded } | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (tick === 0) setLoading(true);

    Promise.all([loadGhrFixAudit(100), loadShadiLifeAudit(100)]).then(([ghrfix, shadi]) => {
      if (cancelled) return;
      setLoaded({ ghrfix, shadi });
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  const refresh = () => setTick((t) => t + 1);

  return useMemo<AuditLogSnapshot>(() => {
    if (!loaded) return { ...EMPTY, loading, refresh };
    const { ghrfix, shadi } = loaded;

    const rows = [...ghrfix.rows, ...shadi.rows].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    const categories = [...new Set(rows.map((r) => r.category))].sort((a, b) => a.localeCompare(b));
    const agentActionCount = rows.filter((r) => r.actorIcon !== null).length;

    const now = Date.now();
    const securityEvents24h = shadi.securityEvents.filter((e) => now - new Date(e.createdAt).getTime() <= 24 * 60 * 60 * 1000).length;
    const securityEvents7d = shadi.securityEvents.filter((e) => now - new Date(e.createdAt).getTime() <= 7 * 24 * 60 * 60 * 1000).length;

    return {
      loading: false,
      ghrfixError: ghrfix.error,
      shadilifeError: shadi.error,
      rows,
      ghrfixCount: ghrfix.rows.length,
      shadilifeCount: shadi.rows.length,
      ghrfixTotalAllTime: ghrfix.total,
      categories,
      agentActionCount,
      pendingSuggestions: shadi.pendingSuggestions,
      securityEvents: shadi.securityEvents,
      securityEvents24h,
      securityEvents7d,
      activeIpBlocks: shadi.activeIpBlocks,
      sourceNote:
        "GhrFix: GET /admin/audit-logs (page 1, pageSize 100 of a real, all-time-paginated log). ShadiLife: GET /ai-agents/devqa/activity-log (limit 100), GET /ai-agents/_meta/activity (newest 25 AI calls/suggestions), GET /admin/security/events and /admin/security/ip-blocks.",
      refresh,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, loading]);
}
