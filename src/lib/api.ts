"use client";

import { PLATFORMS, type PlatformDef, type PlatformKey } from "./platforms";

/**
 * One HTTP client, two backends.
 *
 * Each platform keeps its own access/refresh token under its own localStorage
 * namespace, so being signed into GhrFix never implies being signed into
 * ShadiLife and a 401 from one can never sign you out of the other.
 */

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(message: string, code = "ERROR", status = 0) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

interface Envelope<T> {
  success?: boolean;
  data?: T;
  meta?: unknown;
  error?: { message?: string; code?: string };
  message?: string;
}

export interface Paginated {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const isBrowser = () => typeof window !== "undefined";

export function getToken(ns: string): string | null {
  return isBrowser() ? window.localStorage.getItem(`${ns}_access`) : null;
}
/**
 * Two auth models coexist here: GhrFix returns a bearer token in the JSON
 * body (stored below, sent as `Authorization: Bearer`). ShadiLife instead
 * sets its tokens as httpOnly cookies the browser holds on its own — no
 * token ever reaches JS, so `access` may be absent. Either way, a successful
 * verify sets `${ns}_connected` so `isConnected` has something to check.
 */
export function setTokens(ns: string, access?: string, refresh?: string) {
  if (!isBrowser()) return;
  if (access) window.localStorage.setItem(`${ns}_access`, access);
  if (refresh) window.localStorage.setItem(`${ns}_refresh`, refresh);
  window.localStorage.setItem(`${ns}_connected`, "1");
}
export function clearTokens(ns: string) {
  if (!isBrowser()) return;
  window.localStorage.removeItem(`${ns}_access`);
  window.localStorage.removeItem(`${ns}_refresh`);
  window.localStorage.removeItem(`${ns}_connected`);
}
/** True when we believe we're signed in for this platform — not proof the session is still valid. */
export function isConnected(key: PlatformKey): boolean {
  if (!isBrowser()) return false;
  return Boolean(getToken(PLATFORMS[key].tokenNs) || window.localStorage.getItem(`${PLATFORMS[key].tokenNs}_connected`));
}

function buildQuery(query?: Record<string, string | number | boolean | undefined | null>) {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** Set false for endpoints that must not send the Authorization header. */
  auth?: boolean;
}

/**
 * Call one platform's API. `path` is relative to that platform's base,
 * e.g. apiFetch("ghrfix", "/ai-agents/seo/audit").
 */
export async function apiFetch<T, M = unknown>(
  platform: PlatformKey | PlatformDef,
  path: string,
  options: RequestOptions = {},
): Promise<{ data: T; meta: M }> {
  const p: PlatformDef = typeof platform === "string" ? PLATFORMS[platform] : platform;
  const { method = "GET", body, query, auth = true } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = getToken(p.tokenNs);
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${p.apiBase}${path}${buildQuery(query)}`, {
      method,
      headers,
      credentials: "include", // ShadiLife's tokens are httpOnly cookies; GhrFix ignores this and uses the bearer header above.
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(`${p.label} is unreachable. Is its backend running?`, "UNREACHABLE", 0);
  }

  const json = (await res.json().catch(() => null)) as Envelope<T> | null;

  if (!res.ok) {
    const msg = json?.error?.message ?? json?.message ?? `${p.label} request failed (${res.status}).`;
    throw new ApiError(msg, json?.error?.code ?? "ERROR", res.status);
  }

  return { data: (json?.data ?? json) as T, meta: (json?.meta ?? {}) as M };
}

/** Raw shapes returned by ShadiLife's shared `_meta` router — real endpoints, just not per-agent. */
interface ShadiLifeMetaUsage {
  model: string;
  monthlyBudgetUsd: number;
  byAgent: Array<{ agent: string; spendUsd: number; calls: number }>;
}
interface ShadiLifeMetaEvent {
  id: string;
  kind: "call" | "suggestion";
  agent: string;
  endpoint?: string;
  targetType?: string;
  status?: string;
  costUsd?: number;
  createdAt: string;
}
interface ShadiLifeMetaActivity {
  events: ShadiLifeMetaEvent[];
}

/** Convenience wrapper bound to one platform + one agent's base path. */
export function agentClient(platformKey: PlatformKey, agentBase: string) {
  const call = <T, M = unknown>(path: string, options?: RequestOptions) =>
    apiFetch<T, M>(platformKey, `${agentBase}${path}`, options);
  // Every `base` in platforms.ts is literally "/ai-agents/<key>" — recover the key to filter ShadiLife's shared logs.
  const agentKey = agentBase.replace("/ai-agents/", "");

  /**
   * GhrFix gives every agent its own `/stats`. ShadiLife has no such route —
   * only a platform-wide `_meta/usage` grouped by agent — so on ShadiLife
   * this reads the real row for this agent out of that shared response
   * instead of guessing a per-agent endpoint that doesn't exist.
   */
  async function stats(): Promise<{ data: AgentStats; meta: unknown }> {
    if (platformKey === "ghrfix") return call<AgentStats>("/stats");
    const { data } = await apiFetch<ShadiLifeMetaUsage>("shadilife", "/ai-agents/_meta/usage");
    const mine = data.byAgent.find((a) => a.agent === agentKey);
    return {
      data: {
        agent: agentKey,
        model: data.model,
        rateLimitPerMinute: 30,
        monthlyBudgetUsd: data.monthlyBudgetUsd,
        callsToday: undefined,
        callsThisMonth: mine?.calls ?? 0,
        spendThisMonthUsd: mine?.spendUsd ?? 0,
        tokensThisMonth: undefined,
      },
      meta: {},
    };
  }

  /**
   * Same story for activity: ShadiLife logs every real call and suggestion
   * in one shared `_meta/activity` feed rather than a per-agent audit log.
   * Filtered here to this agent's own rows so the page still shows only
   * what this agent actually did.
   */
  async function activity(query?: { page?: number; pageSize?: number }): Promise<{ data: AgentActivityEntry[]; meta: Paginated }> {
    if (platformKey === "ghrfix") return call<AgentActivityEntry[], Paginated>("/activity", { query });
    const { data } = await apiFetch<ShadiLifeMetaActivity>("shadilife", "/ai-agents/_meta/activity");
    const mine = data.events.filter((e) => e.agent === agentKey);
    const pageSize = query?.pageSize ?? 50;
    const rows: AgentActivityEntry[] = mine.slice(0, pageSize).map((e) => ({
      id: e.id,
      action: e.kind === "call" ? `Called ${e.endpoint ?? "endpoint"}` : `Suggestion ${e.status?.toLowerCase() ?? "pending"}`,
      targetType: e.targetType ?? (e.kind === "call" ? "AI call" : "Suggestion"),
      targetId: null,
      createdAt: e.createdAt,
      admin: null,
      meta: e.costUsd !== undefined ? { costUsd: e.costUsd } : null,
    }));
    return { data: rows, meta: { page: 1, pageSize, total: mine.length, totalPages: 1 } };
  }

  return {
    get: <T, M = unknown>(path: string, query?: RequestOptions["query"]) => call<T, M>(path, { query }),
    post: <T>(path: string, body?: unknown) => call<T>(path, { method: "POST", body }),
    patch: <T>(path: string, body?: unknown) => call<T>(path, { method: "PATCH", body }),
    stats,
    activity,
    chat: (message: string, history?: ChatTurn[]) => call<AgentChatResult>("/chat", { method: "POST", body: { message, history } }),
  };
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}
export interface AgentChatResult {
  reply: string;
  toolCallsExecuted: Array<{ name: string; result: unknown }>;
}
export interface AgentStats {
  agent: string;
  model: string;
  rateLimitPerMinute: number;
  monthlyBudgetUsd: number;
  /** Undefined (not zero) when the platform doesn't track this granularity — ShadiLife only reports monthly totals. */
  callsToday?: number;
  callsThisMonth: number;
  spendThisMonthUsd: number;
  tokensThisMonth?: number;
}
export interface AgentActivityEntry {
  id: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  createdAt: string;
  admin?: { id: string; name: string | null } | null;
  meta?: Record<string, unknown> | null;
}

/** Admin sign-in. Both backends expose the same two-step shape under /auth/admin. */
export const authApi = {
  login: (platform: PlatformKey, email: string, password: string) =>
    apiFetch<{ email: string; expiresInSeconds: number }>(platform, "/auth/admin/login", {
      method: "POST",
      body: { email, password },
      auth: false,
    }),
  verify: (platform: PlatformKey, email: string, code: string) =>
    apiFetch<{ user: { id: string; name: string | null; email: string }; accessToken: string; refreshToken: string }>(
      platform,
      "/auth/admin/verify-2fa",
      { method: "POST", body: { email, code }, auth: false },
    ),
  me: (platform: PlatformKey) => apiFetch<{ id: string; name: string | null; email: string }>(platform, "/auth/me"),
};
