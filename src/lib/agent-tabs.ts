import type { ReactNode } from "react";
import { Icons } from "@/components/agents/icons";

/**
 * Per-agent-TYPE tab structure.
 *
 * Keyed by `agent.key` — which is deliberately the same string on both
 * platforms for every shared agent type (seo, finance, ops, support,
 * marketing, analytics, devqa, master, owner-chat, content), so "SEO Agent"
 * has the exact same named tabs on GhrFix and on ShadiLife. Only the data
 * behind each tab differs, never the shape of the product. Platform-only
 * types (payment-wallet, site-chat on GhrFix; matchmaking, verification,
 * moderation, fraud, chat-safety, profile, leadgen on ShadiLife) get their
 * own entry since there's no equivalent on the other side.
 *
 * Every type keeps Dashboard, Chat, Activity, Settings — those four are
 * genuinely universal (every agent has data, a chat endpoint, an audit
 * trail, and runtime stats). The one tab that must never be generic is the
 * fifth: a real, named, domain-specific page. That page's content lives in
 * `components/agents/views/domain/registry.ts`, keyed the same way.
 */
export interface AgentTab {
  seg: string;
  label: string;
  icon: ReactNode;
}

const DASHBOARD: AgentTab = { seg: "", label: "Dashboard", icon: Icons.dashboard };
const CHAT: AgentTab = { seg: "chat", label: "Chat", icon: Icons.chat };
const ACTIVITY: AgentTab = { seg: "activity", label: "Activity", icon: Icons.audit };
const SETTINGS: AgentTab = { seg: "settings", label: "Settings", icon: Icons.settings };

/** The domain tab per agent type — segment, label, and icon all specific to what that agent actually does. */
const DOMAIN_TAB: Record<string, AgentTab> = {
  "owner-chat": { seg: "directory", label: "Directory", icon: Icons.users },
  "payment-wallet": { seg: "topups", label: "Top-Ups", icon: Icons.receipt },
  content: { seg: "library", label: "Library", icon: Icons.posts },
  seo: { seg: "audit", label: "Audit", icon: Icons.scan },
  analytics: { seg: "breakdown", label: "Breakdown", icon: Icons.filter },
  finance: { seg: "forecast", label: "Forecast", icon: Icons.gauge },
  ops: { seg: "queue", label: "Queue", icon: Icons.stack },
  master: { seg: "fleet", label: "Fleet", icon: Icons.bot },
  support: { seg: "tickets", label: "Tickets", icon: Icons.inbox },
  marketing: { seg: "campaigns", label: "Campaigns", icon: Icons.megaphone },
  "site-chat": { seg: "usage", label: "Usage", icon: Icons.chat },
  devqa: { seg: "health", label: "Health", icon: Icons.shield },
  matchmaking: { seg: "matches", label: "Matches", icon: Icons.heart },
  verification: { seg: "queue", label: "Queue", icon: Icons.fingerprint },
  moderation: { seg: "queue", label: "Queue", icon: Icons.flag },
  fraud: { seg: "reports", label: "Reports", icon: Icons.alert },
  "chat-safety": { seg: "safety", label: "Safety", icon: Icons.shield },
  profile: { seg: "nudges", label: "Nudges", icon: Icons.wand },
  leadgen: { seg: "leads", label: "Leads", icon: Icons.target },
};

/** Returns this agent's tab set: Dashboard, Chat, [its own domain tab], Activity, Settings. */
export function tabsFor(agentKey: string): AgentTab[] {
  const domain = DOMAIN_TAB[agentKey];
  return domain ? [DASHBOARD, CHAT, domain, ACTIVITY, SETTINGS] : [DASHBOARD, CHAT, ACTIVITY, SETTINGS];
}

/** Just the domain tab's info, for the route file that renders it. */
export function domainTabFor(agentKey: string): AgentTab | undefined {
  return DOMAIN_TAB[agentKey];
}
