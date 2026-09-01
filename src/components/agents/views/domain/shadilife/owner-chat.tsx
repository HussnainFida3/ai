"use client";

/**
 * ShadiLife — Owner Chat — Directory (5th tab).
 *
 * Owner Chat's own dashboard is the chat surface itself, so there was
 * nothing to relocate out of it — this tab is new, and reads two real,
 * already-live admin endpoints Owner Chat's own tools sit on top of:
 *
 *   GET /api/admin/users  (?status, search, page, pageSize) → real members
 *   GET /api/admin/agents                                    → real marriage
 *                                                               bureau agents
 *
 * Read-only browse — the actual member/agent writes (suspend, membership
 * change, agent tier update, ...) stay where they belong: something the
 * owner asks Owner Chat to do in the real conversation on the Dashboard tab.
 */

import { useMemo, useState } from "react";
import { AgentHeading } from "@/components/agents/AgentShell";
import { Avatar, InsightsPanel, MetricCard, Svg } from "@/components/agents/rich";
import { Icons } from "@/components/agents/icons";
import type { AgentViewProps } from "../../registry";
import { Empty, ErrorNote, Panel, Pill, TableWrap, dateTime, num, platGet, useLoad, type Tone } from "../../shadilife/_kit";

type UserStatus = "PENDING" | "ACTIVE" | "SUSPENDED";

interface DirectoryUser {
  id: string;
  email: string;
  phone: string | null;
  status: UserStatus;
  membershipTier: "FREE" | "SILVER" | "GOLD";
  createdAt: string;
  lastActiveAt: string | null;
  profile: { fullName: string; city: string; profileCode: string } | null;
  verification: { tier: string } | null;
}

interface UsersResponse {
  users: DirectoryUser[];
  total: number;
  page: number;
  pageSize: number;
}

interface DirectoryAgent {
  id: string;
  agentCode: string;
  email: string;
  phone: string | null;
  fullName: string;
  bureauName: string | null;
  city: string | null;
  tier: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM" | "DIAMOND";
  commissionRate: number;
  status: "ACTIVE" | "SUSPENDED";
  createdAt: string;
  managedProfilesCount: number;
}

const USER_STATUS_TONE: Record<UserStatus, Tone> = { PENDING: "amber", ACTIVE: "green", SUSPENDED: "red" };
const AGENT_TIER_TONE: Record<DirectoryAgent["tier"], Tone> = { BRONZE: "mute", SILVER: "mute", GOLD: "amber", PLATINUM: "green", DIAMOND: "green" };

function Pager({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "flex-end", padding: "10px 20px" }}>
      <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>← Prev</button>
      <span style={{ fontSize: 11, color: "var(--ag-ink-faint)" }}>Page {page} of {totalPages}</span>
      <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>Next →</button>
    </div>
  );
}

export default function ShadiLifeOwnerChatDirectoryView({ platform, agent }: AgentViewProps) {
  const [tab, setTab] = useState<"members" | "agents">("members");

  const [status, setStatus] = useState<UserStatus | "">("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const usersLoad = useLoad(async () => {
    return platGet<UsersResponse>(platform, "/admin/users", {
      status: status || undefined,
      search: search.trim() || undefined,
      page,
      pageSize,
    });
  }, [platform.key, status, search, page]);

  const agentsLoad = useLoad(async () => platGet<DirectoryAgent[]>(platform, "/admin/agents"), [platform.key]);

  const [agentSearch, setAgentSearch] = useState("");
  const agentRows = useMemo(() => {
    const list = agentsLoad.data ?? [];
    const q = agentSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter((a) => a.fullName.toLowerCase().includes(q) || (a.bureauName ?? "").toLowerCase().includes(q) || a.agentCode.toLowerCase().includes(q));
  }, [agentsLoad.data, agentSearch]);

  const users = usersLoad.data?.users ?? [];
  const totalPages = usersLoad.data ? Math.max(1, Math.ceil(usersLoad.data.total / usersLoad.data.pageSize)) : 1;

  const activeAgents = (agentsLoad.data ?? []).filter((a) => a.status === "ACTIVE").length;
  const totalManaged = (agentsLoad.data ?? []).reduce((s, a) => s + a.managedProfilesCount, 0);

  return (
    <>
      <AgentHeading
        platform={platform}
        agent={agent}
        blurb="A real, searchable directory of members and marriage-bureau agents — the same tables Owner Chat's own tools read from when you ask it about a specific person."
      />

      <div className="ag-metrics">
        <MetricCard icon={<Svg path={Icons.users} size={24} />} tone="purple" title="Members on this page" value={usersLoad.loading ? "—" : num(usersLoad.data?.total)} />
        <MetricCard icon={<Svg path={Icons.crown} size={24} />} tone="gold" title="Marriage-bureau agents" value={agentsLoad.loading ? "—" : num(agentsLoad.data?.length)} />
        <MetricCard icon={<Svg path={Icons.check} size={24} />} tone="green" title="Active agents" value={agentsLoad.loading ? "—" : num(activeAgents)} />
        <MetricCard icon={<Svg path={Icons.link} size={24} />} tone="blue" title="Profiles under agent management" value={agentsLoad.loading ? "—" : num(totalManaged)} />
      </div>

      <div className="ag-tabs" style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button type="button" className={`ag-btn ag-btn-sm ${tab === "members" ? "ag-btn-accent" : "ag-btn-ghost"}`} onClick={() => setTab("members")}>
          Members
        </button>
        <button type="button" className={`ag-btn ag-btn-sm ${tab === "agents" ? "ag-btn-accent" : "ag-btn-ghost"}`} onClick={() => setTab("agents")}>
          Marriage agents
        </button>
      </div>

      {tab === "members" && (
        <>
          {usersLoad.error && <ErrorNote platform={platform} error={usersLoad.error} what="The member directory could not load" />}
          <Panel
            title="Members"
            sub={usersLoad.data ? `${usersLoad.data.total} matching this filter` : "Real ShadiLife members"}
            actions={
              <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search name or email…"
                  style={{ fontSize: 11.5, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--ag-border)", background: "var(--ag-panel)", color: "var(--ag-ink)", minWidth: 170 }}
                />
                <select
                  value={status}
                  onChange={(e) => { setStatus(e.target.value as UserStatus | ""); setPage(1); }}
                  style={{ fontSize: 11.5, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--ag-border)", background: "var(--ag-panel)", color: "var(--ag-ink)" }}
                >
                  <option value="">All statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="ACTIVE">Active</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </span>
            }
          >
            <TableWrap>
              <table className="ag-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>City</th>
                    <th>Tier</th>
                    <th>Trust</th>
                    <th>Status</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
                          <Avatar name={u.profile?.fullName ?? u.email} size={26} />
                          <span style={{ minWidth: 0 }}>
                            <b style={{ display: "block", fontWeight: 650 }}>{u.profile?.fullName ?? "No profile yet"}</b>
                            <span style={{ fontSize: 10.5, color: "var(--ag-ink-faint)" }}>{u.email}</span>
                          </span>
                        </span>
                      </td>
                      <td>{u.profile?.city ?? "—"}</td>
                      <td><Pill text={u.membershipTier} tone={u.membershipTier === "FREE" ? "mute" : "amber"} /></td>
                      <td style={{ fontSize: 11.5, color: "var(--ag-ink-soft)" }}>{u.verification?.tier ?? "—"}</td>
                      <td><Pill text={u.status} tone={USER_STATUS_TONE[u.status]} /></td>
                      <td style={{ whiteSpace: "nowrap", color: "var(--ag-ink-faint)" }}>{dateTime(u.createdAt)}</td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={6}><Empty>{usersLoad.loading ? "Loading members…" : "No member matches this filter."}</Empty></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </TableWrap>
            <Pager page={usersLoad.data?.page ?? 1} totalPages={totalPages} onChange={setPage} />
          </Panel>
        </>
      )}

      {tab === "agents" && (
        <>
          {agentsLoad.error && <ErrorNote platform={platform} error={agentsLoad.error} what="The agent directory could not load" />}
          <Panel
            title="Marriage-bureau agents"
            sub={`${agentRows.length} of ${(agentsLoad.data ?? []).length} shown`}
            actions={
              <input
                value={agentSearch}
                onChange={(e) => setAgentSearch(e.target.value)}
                placeholder="Search agent, bureau or code…"
                style={{ fontSize: 11.5, padding: "6px 10px", borderRadius: 8, border: "1px solid var(--ag-border)", background: "var(--ag-panel)", color: "var(--ag-ink)", minWidth: 190 }}
              />
            }
          >
            <TableWrap>
              <table className="ag-table">
                <thead>
                  <tr>
                    <th>Agent</th>
                    <th>Bureau</th>
                    <th>City</th>
                    <th>Tier</th>
                    <th>Commission</th>
                    <th style={{ textAlign: "right" }}>Managed profiles</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {agentRows.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <b style={{ fontWeight: 650 }}>{a.fullName}</b>
                        <div style={{ fontSize: 10.5, color: "var(--ag-ink-faint)" }}>{a.agentCode} · {a.email}</div>
                      </td>
                      <td>{a.bureauName ?? "—"}</td>
                      <td>{a.city ?? "—"}</td>
                      <td><Pill text={a.tier} tone={AGENT_TIER_TONE[a.tier]} /></td>
                      <td>{Math.round(a.commissionRate * 1000) / 10}%</td>
                      <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{a.managedProfilesCount}</td>
                      <td><Pill text={a.status} tone={a.status === "ACTIVE" ? "green" : "red"} /></td>
                    </tr>
                  ))}
                  {agentRows.length === 0 && (
                    <tr>
                      <td colSpan={7}><Empty>{agentsLoad.loading ? "Loading agents…" : "No agent matches this search."}</Empty></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </TableWrap>
          </Panel>
        </>
      )}

      <div style={{ marginTop: 18 }}>
        <InsightsPanel
          title="Directory notes"
          rows={[
            {
              icon: <Svg path={Icons.eye} size={15} />,
              label: "Read-only here",
              value: "This tab only browses. To change a member's status, tier or an agent's terms, ask Owner Chat directly on the Dashboard tab — every such write is real and audited.",
            },
            {
              icon: <Svg path={Icons.crown} size={15} />,
              label: "Top managed book",
              value: (agentsLoad.data ?? []).length > 0
                ? `${[...(agentsLoad.data ?? [])].sort((a, b) => b.managedProfilesCount - a.managedProfilesCount)[0].fullName} manages the most profiles (${[...(agentsLoad.data ?? [])].sort((a, b) => b.managedProfilesCount - a.managedProfilesCount)[0].managedProfilesCount}).`
                : "No agents on record yet.",
            },
          ]}
        />
      </div>
    </>
  );
}
