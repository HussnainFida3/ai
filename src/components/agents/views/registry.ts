import type { ComponentType } from "react";
import type { AgentDef, PlatformDef } from "@/lib/platforms";
import type { agentClient } from "@/lib/api";

import GhrfixAnalytics from "./ghrfix/analytics";
import GhrfixContent from "./ghrfix/content";
import GhrfixDevQa from "./ghrfix/devqa";
import GhrfixFinance from "./ghrfix/finance";
import GhrfixMarketing from "./ghrfix/marketing";
import GhrfixMaster from "./ghrfix/master";
import GhrfixOps from "./ghrfix/ops";
import GhrfixOwnerChat from "./ghrfix/owner-chat";
import GhrfixPaymentWallet from "./ghrfix/payment-wallet";
import GhrfixSeo from "./ghrfix/seo";
import GhrfixSiteChat from "./ghrfix/site-chat";
import GhrfixSupport from "./ghrfix/support";
import ShadilifeContent from "./shadilife/content";
import ShadilifeMaster from "./shadilife/master";
import ShadilifeOwnerChat from "./shadilife/owner-chat";
import ShadilifeSeo from "./shadilife/seo";
import ShadilifeMatchmaking from "./shadilife/matchmaking";
import ShadilifeVerification from "./shadilife/verification";
import ShadilifeModeration from "./shadilife/moderation";
import ShadilifeFraud from "./shadilife/fraud";
import ShadilifeChatSafety from "./shadilife/chat-safety";
import ShadilifeProfile from "./shadilife/profile";
import ShadilifeSupport from "./shadilife/support";
import ShadilifeMarketing from "./shadilife/marketing";
import ShadilifeLeadgen from "./shadilife/leadgen";
import ShadilifeAnalytics from "./shadilife/analytics";
import ShadilifeFinance from "./shadilife/finance";
import ShadilifeOps from "./shadilife/ops";
import ShadilifeDevQa from "./shadilife/devqa";

/**
 * Bespoke dashboard views.
 *
 * The dynamic /[platform]/[agent] route renders a generic dashboard that
 * reflects whatever the agent's own API returns. When an agent deserves a
 * hand-built view, add a component here keyed "<platform>:<agent>" and the
 * route renders that instead. Nothing else needs to change — this is the
 * single extension point, so several people can add views in parallel
 * without touching each other's files.
 */
export interface AgentViewProps {
  platform: PlatformDef;
  agent: AgentDef;
  api: ReturnType<typeof agentClient>;
}

export type AgentView = ComponentType<AgentViewProps>;

/** Key format: `${platform.key}:${agent.key}` — e.g. "ghrfix:seo". */
export const AGENT_VIEWS: Record<string, AgentView> = {
  "ghrfix:analytics": GhrfixAnalytics,
  "ghrfix:content": GhrfixContent,
  "ghrfix:devqa": GhrfixDevQa,
  "ghrfix:finance": GhrfixFinance,
  "ghrfix:marketing": GhrfixMarketing,
  "ghrfix:master": GhrfixMaster,
  "ghrfix:ops": GhrfixOps,
  "ghrfix:owner-chat": GhrfixOwnerChat,
  "ghrfix:payment-wallet": GhrfixPaymentWallet,
  "ghrfix:seo": GhrfixSeo,
  "ghrfix:site-chat": GhrfixSiteChat,
  "ghrfix:support": GhrfixSupport,
  "shadilife:content": ShadilifeContent,
  "shadilife:master": ShadilifeMaster,
  "shadilife:owner-chat": ShadilifeOwnerChat,
  "shadilife:seo": ShadilifeSeo,
  "shadilife:matchmaking": ShadilifeMatchmaking,
  "shadilife:verification": ShadilifeVerification,
  "shadilife:moderation": ShadilifeModeration,
  "shadilife:fraud": ShadilifeFraud,
  "shadilife:chat-safety": ShadilifeChatSafety,
  "shadilife:profile": ShadilifeProfile,
  "shadilife:support": ShadilifeSupport,
  "shadilife:marketing": ShadilifeMarketing,
  "shadilife:leadgen": ShadilifeLeadgen,
  "shadilife:analytics": ShadilifeAnalytics,
  "shadilife:finance": ShadilifeFinance,
  "shadilife:ops": ShadilifeOps,
  "shadilife:devqa": ShadilifeDevQa,
};

export function getAgentView(platformKey: string, agentKey: string): AgentView | undefined {
  return AGENT_VIEWS[`${platformKey}:${agentKey}`];
}
