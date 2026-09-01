/**
 * The two platforms this console controls.
 *
 * Everything in the UI is keyed off this registry, so an agent's platform is
 * never ambiguous: it is stamped into the URL (/ghrfix/seo vs /shadilife/seo),
 * the page title ("GhrFix — SEO Agent"), the sidebar badge and the accent
 * colour. Adding a platform or an agent means editing this file and nothing
 * else.
 */

export type PlatformKey = "ghrfix" | "shadilife";

export interface AgentDef {
  /** URL slug within the platform, and the backend mount path segment. */
  key: string;
  /** Display name WITHOUT the platform prefix — the UI adds that. */
  name: string;
  /** Short category shown under the name. */
  tag: string;
  /** One line describing what this agent actually does. */
  desc: string;
  icon: string;
  accent: string;
  /** Backend path under the platform's API base, e.g. "/ai-agents/seo". */
  base: string;
}

export interface PlatformDef {
  key: PlatformKey;
  /** Brand name used as the prefix in every agent title. */
  label: string;
  blurb: string;
  /** Brand colour — used for the platform badge and hub section. */
  color: string;
  /** API base URL, env-driven so it can point at a bare server IP. */
  apiBase: string;
  /** localStorage namespace so the two sessions never collide. */
  tokenNs: string;
  agents: AgentDef[];
}

const GHRFIX_AGENTS: AgentDef[] = [
  { key: "owner-chat", name: "Owner Chat", tag: "Orchestration", desc: "Conversational access to real platform data, plus a scoped set of audited writes.", icon: "💬", accent: "#8b5cf6", base: "/ai-agents/owner-chat" },
  { key: "payment-wallet", name: "Payment & Wallet", tag: "Finance", desc: "Wallet totals, top-up approvals and the token-economy settings behind the accept fee.", icon: "💰", accent: "#22d3a3", base: "/ai-agents/payment-wallet" },
  { key: "content", name: "Content Agent", tag: "Growth", desc: "Drafts blog posts with real SEO metadata. Publishing is always a deliberate action.", icon: "📝", accent: "#3b82f6", base: "/ai-agents/content" },
  { key: "seo", name: "SEO Agent", tag: "Growth", desc: "Scores every published post on real content signals, capped at 9.5 — never a flat 10.", icon: "🔍", accent: "#f5b942", base: "/ai-agents/seo" },
  { key: "analytics", name: "Analytics Agent", tag: "Insights", desc: "Users, providers and bookings with city and category breakdowns.", icon: "📊", accent: "#38bdf8", base: "/ai-agents/analytics" },
  { key: "finance", name: "Finance Agent", tag: "Treasury", desc: "Wallet economy plus a 30-day projection from real daily credit totals.", icon: "📈", accent: "#fb923c", base: "/ai-agents/finance" },
  { key: "ops", name: "Ops Agent", tag: "Operations", desc: "The daily queue — pending provider verifications and open emergencies.", icon: "🛠️", accent: "#f43f5e", base: "/ai-agents/ops" },
  { key: "master", name: "Master AI", tag: "Orchestration", desc: "Bird's-eye view of every agent: activity, spend and call volume.", icon: "🧠", accent: "#facc15", base: "/ai-agents/master" },
  { key: "support", name: "Support Agent", tag: "Support", desc: "Disputes raised over bookings and messages from the contact form.", icon: "🎧", accent: "#06b6d4", base: "/ai-agents/support" },
  { key: "marketing", name: "Marketing Agent", tag: "Growth", desc: "Promo codes and broadcast notifications — every send is a real, audited write.", icon: "📣", accent: "#d946ef", base: "/ai-agents/marketing" },
  { key: "site-chat", name: "Site Chat Agent", tag: "Customer Chat", desc: "How the customer-facing assistant is performing: volume, cache rate, spend.", icon: "🗨️", accent: "#10b981", base: "/ai-agents/site-chat" },
  { key: "devqa", name: "Developer & QA Agent", tag: "Engineering", desc: "API, database and cache readiness plus AI spend across every agent.", icon: "🛡️", accent: "#64748b", base: "/ai-agents/devqa" },
];

const SHADILIFE_AGENTS: AgentDef[] = [
  { key: "master", name: "Master AI", tag: "Orchestration", desc: "Bird's-eye view across every ShadiLife agent.", icon: "🧠", accent: "#facc15", base: "/ai-agents/master" },
  { key: "owner-chat", name: "Owner Chat", tag: "Orchestration", desc: "Conversational access to real member, match and revenue data.", icon: "💬", accent: "#8b5cf6", base: "/ai-agents/owner-chat" },
  { key: "matchmaking", name: "Matchmaking Agent", tag: "Core", desc: "The matching engine — compatibility scoring and daily picks.", icon: "💞", accent: "#ec4899", base: "/ai-agents/matchmaking" },
  { key: "verification", name: "Verification Agent", tag: "Trust", desc: "Profile and document verification with AI-assisted scoring.", icon: "✅", accent: "#22c55e", base: "/ai-agents/verification" },
  { key: "moderation", name: "Moderation Agent", tag: "Trust", desc: "Content and profile moderation queue.", icon: "🚦", accent: "#f97316", base: "/ai-agents/moderation" },
  { key: "fraud", name: "Fraud Agent", tag: "Trust", desc: "Fraud and fake-profile detection signals.", icon: "🕵️", accent: "#ef4444", base: "/ai-agents/fraud" },
  { key: "chat-safety", name: "Chat & Safety Agent", tag: "Trust", desc: "Real-time conversation safety monitoring and alerts.", icon: "🛡️", accent: "#7c3aed", base: "/ai-agents/chat-safety" },
  { key: "profile", name: "Profile Agent", tag: "Member", desc: "Profile strength, completeness and improvement suggestions.", icon: "👤", accent: "#0ea5e9", base: "/ai-agents/profile" },
  { key: "support", name: "Support Agent", tag: "Support", desc: "Member tickets, escalations and resolution rates.", icon: "🎧", accent: "#06b6d4", base: "/ai-agents/support" },
  { key: "content", name: "Content Agent", tag: "Growth", desc: "Blog drafting and content library with SEO metadata.", icon: "📝", accent: "#3b82f6", base: "/ai-agents/content" },
  { key: "seo", name: "SEO Agent", tag: "Growth", desc: "Scores published content on real on-page signals.", icon: "🔍", accent: "#f5b942", base: "/ai-agents/seo" },
  { key: "marketing", name: "Marketing Agent", tag: "Growth", desc: "Campaigns, promos and broadcast messaging.", icon: "📣", accent: "#d946ef", base: "/ai-agents/marketing" },
  { key: "leadgen", name: "Lead Gen Agent", tag: "Growth", desc: "Lead capture, scoring and source attribution.", icon: "🎯", accent: "#a855f7", base: "/ai-agents/leadgen" },
  { key: "analytics", name: "Analytics Agent", tag: "Insights", desc: "Members, matches and engagement across the platform.", icon: "📊", accent: "#38bdf8", base: "/ai-agents/analytics" },
  { key: "finance", name: "Finance Agent", tag: "Treasury", desc: "Subscriptions, revenue and payout health.", icon: "📈", accent: "#fb923c", base: "/ai-agents/finance" },
  { key: "ops", name: "Ops Agent", tag: "Operations", desc: "The daily operational queue across the platform.", icon: "🛠️", accent: "#f43f5e", base: "/ai-agents/ops" },
  { key: "devqa", name: "Developer & QA Agent", tag: "Engineering", desc: "System readiness plus AI spend across every agent.", icon: "🛡️", accent: "#64748b", base: "/ai-agents/devqa" },
];

export const PLATFORMS: Record<PlatformKey, PlatformDef> = {
  ghrfix: {
    key: "ghrfix",
    label: "GhrFix",
    blurb: "Pakistan's home-services marketplace",
    color: "#7c3aed",
    apiBase: process.env.NEXT_PUBLIC_GHRFIX_API ?? "http://localhost:5050/api",
    tokenNs: "cc_ghrfix",
    agents: GHRFIX_AGENTS,
  },
  shadilife: {
    key: "shadilife",
    label: "ShadiLife",
    blurb: "Matrimonial matching platform",
    color: "#d61d8c",
    apiBase: process.env.NEXT_PUBLIC_SHADILIFE_API ?? "http://localhost:4000/api",
    tokenNs: "cc_shadilife",
    agents: SHADILIFE_AGENTS,
  },
};

export const PLATFORM_LIST: PlatformDef[] = [PLATFORMS.ghrfix, PLATFORMS.shadilife];

export function getPlatform(key: string): PlatformDef | undefined {
  return PLATFORMS[key as PlatformKey];
}

export function getAgent(platformKey: string, agentKey: string) {
  const platform = getPlatform(platformKey);
  const agent = platform?.agents.find((a) => a.key === agentKey);
  if (!platform || !agent) return undefined;
  return { platform, agent };
}

/** The canonical, unambiguous display name: "GhrFix — SEO Agent". */
export function agentTitle(platform: PlatformDef, agent: AgentDef) {
  return `${platform.label} — ${agent.name}`;
}
