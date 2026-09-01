import type { ComponentType } from "react";
import type { AgentViewProps } from "../registry";

import GhrfixOpsQueue from "./ghrfix/ops";
import GhrfixMasterFleet from "./ghrfix/master";
import GhrfixSupportTickets from "./ghrfix/support";
import GhrfixMarketingCampaigns from "./ghrfix/marketing";
import GhrfixDevQaHealth from "./ghrfix/devqa";
import ShadilifeOwnerChatDirectory from "./shadilife/owner-chat";
import ShadilifeContentLibrary from "./shadilife/content";
import ShadilifeDevQaHealth from "./shadilife/devqa";
import ShadilifeMatchmakingMatches from "./shadilife/matchmaking";
import ShadilifeVerificationQueue from "./shadilife/verification";
import ShadilifeModerationQueue from "./shadilife/moderation";
import ShadilifeFraudReports from "./shadilife/fraud";
import ShadilifeChatSafetySafety from "./shadilife/chat-safety";
import ShadilifeProfileNudges from "./shadilife/profile";
import ShadilifeLeadgenLeads from "./shadilife/leadgen";
import GhrfixOwnerChatDirectory from "./ghrfix/owner-chat";
import ShadilifeSeoAudit from "./shadilife/seo";
import ShadilifeAnalyticsBreakdown from "./shadilife/analytics";
import ShadilifeFinanceForecast from "./shadilife/finance";
import ShadilifeOpsQueue from "./shadilife/ops";
import ShadilifeMasterFleet from "./shadilife/master";
import ShadilifeSupportTickets from "./shadilife/support";
import ShadilifeMarketingCampaigns from "./shadilife/marketing";
import GhrfixContentLibrary from "./ghrfix/content";
import GhrfixSeoAudit from "./ghrfix/seo";
import GhrfixAnalyticsBreakdown from "./ghrfix/analytics";
import GhrfixFinanceForecast from "./ghrfix/finance";
import GhrfixPaymentWalletTopUps from "./ghrfix/payment-wallet";
import GhrfixSiteChatUsage from "./ghrfix/site-chat";

/**
 * The fifth tab, the one that must never be generic — a real page specific
 * to what this agent type actually does (SEO's Audit, Finance's Forecast,
 * Ops's Queue, ...). Keyed exactly like `views/registry.ts`:
 * `${platform.key}:${agent.key}`. Two different agents of the SAME type
 * (e.g. ghrfix:seo and shadilife:seo) render different components here
 * because the two backends' real endpoints for "seo" are shaped completely
 * differently — but both tabs are titled "Audit" and sit in the same nav
 * position, because structurally they are the same product.
 *
 * If an agent has no entry here yet, the route falls back to a plain
 * "not built yet" panel — never to the old generic multi-endpoint prober.
 */
export type DomainView = ComponentType<AgentViewProps>;

export const DOMAIN_VIEWS: Record<string, DomainView> = {
  "ghrfix:owner-chat": GhrfixOwnerChatDirectory,
  "ghrfix:content": GhrfixContentLibrary,
  "ghrfix:seo": GhrfixSeoAudit,
  "ghrfix:analytics": GhrfixAnalyticsBreakdown,
  "ghrfix:finance": GhrfixFinanceForecast,
  "ghrfix:payment-wallet": GhrfixPaymentWalletTopUps,
  "ghrfix:site-chat": GhrfixSiteChatUsage,
  "shadilife:devqa": ShadilifeDevQaHealth,
  "shadilife:matchmaking": ShadilifeMatchmakingMatches,
  "shadilife:verification": ShadilifeVerificationQueue,
  "shadilife:moderation": ShadilifeModerationQueue,
  "shadilife:fraud": ShadilifeFraudReports,
  "shadilife:chat-safety": ShadilifeChatSafetySafety,
  "shadilife:profile": ShadilifeProfileNudges,
  "shadilife:leadgen": ShadilifeLeadgenLeads,
  "shadilife:seo": ShadilifeSeoAudit,
  "shadilife:analytics": ShadilifeAnalyticsBreakdown,
  "shadilife:finance": ShadilifeFinanceForecast,
  "shadilife:ops": ShadilifeOpsQueue,
  "shadilife:master": ShadilifeMasterFleet,
  "shadilife:support": ShadilifeSupportTickets,
  "shadilife:marketing": ShadilifeMarketingCampaigns,
  "ghrfix:ops": GhrfixOpsQueue,
  "ghrfix:master": GhrfixMasterFleet,
  "ghrfix:support": GhrfixSupportTickets,
  "ghrfix:marketing": GhrfixMarketingCampaigns,
  "ghrfix:devqa": GhrfixDevQaHealth,
  "shadilife:owner-chat": ShadilifeOwnerChatDirectory,
  "shadilife:content": ShadilifeContentLibrary,
};

export function getDomainView(platformKey: string, agentKey: string): DomainView | undefined {
  return DOMAIN_VIEWS[`${platformKey}:${agentKey}`];
}
