"use client";

import { AgentShell } from "@/components/agents/AgentShell";
import { ChatPanel } from "@/components/agents/ChatPanel";
import { agentTitle } from "@/lib/platforms";
import { useAgentRoute, type AgentRouteParams } from "@/lib/use-agent";

export default function AgentChatPage({ params }: { params: Promise<AgentRouteParams> }) {
  const { platform, agent, api } = useAgentRoute(params);
  const title = agentTitle(platform, agent);

  return (
    <AgentShell platform={platform} agent={agent} pageTitle="Chat">
      <div style={{ maxWidth: 860 }}>
        <div className="ag-panel">
          <div className="ag-panel-head">
            <div>
              <div className="ag-panel-title">{title}</div>
              <div className="ag-panel-sub">Answers are grounded in live {platform.label} data</div>
            </div>
            <span className="ag-plat-badge" style={{ background: platform.color }}>{platform.label}</span>
          </div>
          <ChatPanel
            title={title}
            placeholder={`Ask about ${platform.label}…`}
            onSend={(message, history) => api.chat(message, history).then((r) => r.data)}
          />
        </div>
      </div>
    </AgentShell>
  );
}
