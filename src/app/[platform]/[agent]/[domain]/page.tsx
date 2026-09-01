"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { AgentShell } from "@/components/agents/AgentShell";
import { getDomainView } from "@/components/agents/views/domain/registry";
import { domainTabFor } from "@/lib/agent-tabs";
import { useAgentRoute } from "@/lib/use-agent";

/**
 * The agent's own fifth tab — its segment name (`audit`, `forecast`,
 * `queue`, ...) comes from `agent-tabs.ts` and is specific to the agent's
 * type, so this single dynamic route serves a different URL per type while
 * every literal tab (`chat`, `activity`, `settings`) keeps its own static
 * folder and takes precedence over this one.
 */
export default function AgentDomainPage({ params }: { params: Promise<{ platform: string; agent: string; domain: string }> }) {
  const { domain } = use(params);
  const { platform, agent, api } = useAgentRoute(params);

  const tab = domainTabFor(agent.key);
  if (!tab || tab.seg !== domain) notFound();

  const View = getDomainView(platform.key, agent.key);

  return (
    <AgentShell platform={platform} agent={agent} pageTitle={tab.label}>
      {View ? (
        <View platform={platform} agent={agent} api={api} />
      ) : (
        <div className="ag-panel">
          <div className="ag-panel-body">
            <p style={{ margin: 0, fontSize: 12.5, color: "var(--ag-ink-faint)" }}>
              The {tab.label} page for {platform.label} — {agent.name} hasn&apos;t been built yet.
            </p>
          </div>
        </div>
      )}
    </AgentShell>
  );
}
