"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { getAgent } from "./platforms";
import { agentClient } from "./api";

export interface AgentRouteParams {
  platform: string;
  agent: string;
}

/**
 * Resolves the /[platform]/[agent] route params into the platform + agent
 * definitions and a client bound to that platform's API. 404s on anything
 * not in the registry, so a typo'd URL can never render a half-real page.
 */
export function useAgentRoute(params: Promise<AgentRouteParams>) {
  const { platform: platformKey, agent: agentKey } = use(params);
  const found = getAgent(platformKey, agentKey);
  if (!found) notFound();
  const { platform, agent } = found;
  return { platform, agent, api: agentClient(platform.key, agent.base) };
}

/** Turns "callsThisMonth" into "Calls This Month" for auto-rendered metrics. */
export function humanize(key: string) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bUsd\b/g, "USD")
    .replace(/\bPkr\b/g, "PKR")
    .replace(/\bAi\b/g, "AI")
    .replace(/\bId\b/g, "ID")
    .replace(/\bSeo\b/g, "SEO");
}

export function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "number") return v.toLocaleString();
  if (typeof v === "boolean") return v ? "Yes" : "No";
  const s = String(v);
  // Numeric strings come back from Prisma Decimal columns.
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s).toLocaleString();
  return s;
}
