"use client";

/**
 * GhrFix — Owner Chat → Directory.
 *
 * The real member and provider directory behind the platform: `/admin/users`
 * and `/admin/providers`, both genuinely paginated and searchable server-side
 * (not a client-side slice of a capped fetch). This is new depth that never
 * fit on the Dashboard — the Dashboard only ever showed the five most recent
 * providers; this page is the actual searchable roster.
 */

import { useState } from "react";
import { AgentSidePanel, Avatar, InsightsPanel, MetricCard, Svg } from "@/components/agents/rich";
import { Icons } from "@/components/agents/icons";
import { apiFetch, type AgentStats, type Paginated } from "@/lib/api";
import type { AgentViewProps } from "../../registry";
import {
  AskAnswer,
  Empty,
  ErrorNote,
  KeyRow,
  Panel,
  Pill,
  TableWrap,
  coins,
  num,
  share,
  shortDate,
  useAsk,
  useLoad,
} from "../../ghrfix/_kit-core";

interface MemberRow {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  role: string;
  status: "ACTIVE" | "SUSPENDED" | "BANNED" | "PENDING_VERIFICATION";
  walletBalance: string | number;
  createdAt: string;
  provider: { id: string; verificationStatus: string } | null;
}

interface ProviderRow {
  id: string;
  verificationStatus: "PENDING" | "VERIFIED" | "REJECTED" | "SUSPENDED";
  isAvailable: boolean;
  rating: string | number | null;
  createdAt: string;
  user: { id: string; name: string | null; phone: string | null; email: string | null } | null;
  services: Array<{ category?: { name: string } | null }>;
}

interface UserStats {
  total: number;
  active: number;
  suspended: number;
  banned: number;
  pendingVerification: number;
  providers: number;
  newThisWeek: number;
}

interface ProviderStats {
  total: number;
  verified: number;
  pending: number;
  rejected: number;
  suspended: number;
  available: number;
  avgRating: number;
}

const MEMBER_STATUSES = ["ALL", "ACTIVE", "PENDING_VERIFICATION", "SUSPENDED", "BANNED"] as const;
type MemberStatus = (typeof MEMBER_STATUSES)[number];
const MEMBER_STATUS_TONE: Record<string, "green" | "amber" | "red" | "mute"> = {
  ACTIVE: "green",
  PENDING_VERIFICATION: "amber",
  SUSPENDED: "amber",
  BANNED: "red",
};

const PROVIDER_STATUSES = ["ALL", "PENDING", "VERIFIED", "REJECTED", "SUSPENDED"] as const;
type ProviderStatus = (typeof PROVIDER_STATUSES)[number];
const PROVIDER_STATUS_TONE: Record<string, "green" | "amber" | "red" | "mute"> = {
  VERIFIED: "green",
  PENDING: "amber",
  REJECTED: "red",
  SUSPENDED: "red",
};

const PAGE_SIZE = 15;

function humanStatus(s: string) {
  return s.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

function Pager({ meta, onPrev, onNext }: { meta: Paginated | null; onPrev: () => void; onNext: () => void }) {
  if (!meta || meta.total === 0) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderTop: "1px solid var(--ag-border-soft)" }}>
      <span style={{ fontSize: 11, color: "var(--ag-ink-faint)" }}>
        Page {meta.page} of {Math.max(1, meta.totalPages)} · {meta.total.toLocaleString()} total
      </span>
      <div style={{ display: "flex", gap: 6 }}>
        <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" disabled={meta.page <= 1} onClick={onPrev}>Prev</button>
        <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" disabled={meta.page >= meta.totalPages} onClick={onNext}>Next</button>
      </div>
    </div>
  );
}

export default function OwnerChatDirectoryView({ platform, agent, api }: AgentViewProps) {
  const [tab, setTab] = useState<"members" | "providers">("members");

  const [memberQuery, setMemberQuery] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [memberStatus, setMemberStatus] = useState<MemberStatus>("ALL");
  const [memberPage, setMemberPage] = useState(1);

  const [providerQuery, setProviderQuery] = useState("");
  const [providerSearch, setProviderSearch] = useState("");
  const [providerStatus, setProviderStatus] = useState<ProviderStatus>("ALL");
  const [providerPage, setProviderPage] = useState(1);

  const statsLoad = useLoad(async () => {
    const [us, ps, stats] = await Promise.allSettled([
      apiFetch<UserStats>(platform.key, "/admin/users/stats"),
      apiFetch<ProviderStats>(platform.key, "/admin/providers/stats"),
      api.stats(),
    ]);
    return {
      users: us.status === "fulfilled" ? us.value.data : null,
      providers: ps.status === "fulfilled" ? ps.value.data : null,
      stats: stats.status === "fulfilled" ? (stats.value.data as AgentStats) : null,
    };
  }, [platform.key]);

  const membersLoad = useLoad(async () => {
    const { data, meta } = await apiFetch<MemberRow[], Paginated>(platform.key, "/admin/users", {
      query: { search: memberSearch || undefined, status: memberStatus === "ALL" ? undefined : memberStatus, page: memberPage, pageSize: PAGE_SIZE },
    });
    return { items: data, meta };
  }, [platform.key, memberSearch, memberStatus, memberPage]);

  const providersLoad = useLoad(async () => {
    const { data, meta } = await apiFetch<ProviderRow[], Paginated>(platform.key, "/admin/providers", {
      query: { search: providerSearch || undefined, verificationStatus: providerStatus === "ALL" ? undefined : providerStatus, page: providerPage, pageSize: PAGE_SIZE },
    });
    return { items: data, meta };
  }, [platform.key, providerSearch, providerStatus, providerPage]);

  const ask = useAsk(api);
  const us = statsLoad.data?.users ?? null;
  const ps = statsLoad.data?.providers ?? null;

  const verifiedRate = ps ? share(ps.verified, ps.total) : null;
  const providerShareOfUsers = us ? share(us.providers, us.total) : null;

  return (
    <>
      {membersLoad.error && tab === "members" && (
        <ErrorNote error={membersLoad.error} hint={`This directory reads ${platform.apiBase}/admin/users. Connect ${platform.label} first if this persists.`} />
      )}
      {providersLoad.error && tab === "providers" && (
        <ErrorNote error={providersLoad.error} hint={`This directory reads ${platform.apiBase}/admin/providers. Connect ${platform.label} first if this persists.`} />
      )}

      <div className="ag-metrics">
        <MetricCard icon={<Svg path={Icons.users} size={24} />} tone="purple" title="Total members" value={statsLoad.loading ? "—" : num(us?.total)} />
        <MetricCard icon={<Svg path={Icons.shield} size={24} />} tone="blue" title="Total providers" value={statsLoad.loading ? "—" : num(ps?.total)} />
        <MetricCard icon={<Svg path={Icons.fingerprint} size={24} />} tone="green" title="Verified providers" value={statsLoad.loading ? "—" : ps ? `${ps.verified} / ${ps.total}` : "—"} />
        <MetricCard icon={<Svg path={Icons.clock} size={24} />} tone="gold" title="Pending verification" value={statsLoad.loading ? "—" : num(ps?.pending)} />
        <MetricCard icon={<Svg path={Icons.sparkle} size={24} />} tone="pink" title="New members (7d)" value={statsLoad.loading ? "—" : num(us?.newThisWeek)} />
        <MetricCard icon={<Svg path={Icons.target} size={24} />} tone="accent" title="Available right now" value={statsLoad.loading ? "—" : num(ps?.available)} />
      </div>

      <div className="ag-split">
        <div className="ag-stack">
          <Panel
            title="Directory"
            sub={
              tab === "members"
                ? membersLoad.data?.meta ? `${membersLoad.data.meta.total.toLocaleString()} member${membersLoad.data.meta.total === 1 ? "" : "s"} on record` : "Every registered account"
                : providersLoad.data?.meta ? `${providersLoad.data.meta.total.toLocaleString()} provider${providersLoad.data.meta.total === 1 ? "" : "s"} on record` : "Every provider profile"
            }
            noBody
            actions={
              <div className="ag-tabs">
                <button type="button" className={`ag-tab ${tab === "members" ? "active" : ""}`} onClick={() => setTab("members")}>Members</button>
                <button type="button" className={`ag-tab ${tab === "providers" ? "active" : ""}`} onClick={() => setTab("providers")}>Providers</button>
              </div>
            }
          >
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, padding: "14px 20px 0" }}>
              {tab === "members" ? (
                <>
                  <form
                    style={{ display: "flex", gap: 8, flex: 1, minWidth: 200 }}
                    onSubmit={(e) => { e.preventDefault(); setMemberPage(1); setMemberSearch(memberQuery.trim()); }}
                  >
                    <div className="ag-field" style={{ flex: 1, minWidth: 0 }}>
                      <input placeholder="Search name, phone or email…" value={memberQuery} onChange={(e) => setMemberQuery(e.target.value)} />
                    </div>
                    <button type="submit" className="ag-btn ag-btn-ghost ag-btn-sm">Search</button>
                  </form>
                  <div className="ag-tabs">
                    {MEMBER_STATUSES.map((s) => (
                      <button key={s} type="button" className={`ag-tab ${memberStatus === s ? "active" : ""}`} onClick={() => { setMemberStatus(s); setMemberPage(1); }}>
                        {s === "ALL" ? "All" : humanStatus(s)}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <form
                    style={{ display: "flex", gap: 8, flex: 1, minWidth: 200 }}
                    onSubmit={(e) => { e.preventDefault(); setProviderPage(1); setProviderSearch(providerQuery.trim()); }}
                  >
                    <div className="ag-field" style={{ flex: 1, minWidth: 0 }}>
                      <input placeholder="Search name, CNIC, phone or email…" value={providerQuery} onChange={(e) => setProviderQuery(e.target.value)} />
                    </div>
                    <button type="submit" className="ag-btn ag-btn-ghost ag-btn-sm">Search</button>
                  </form>
                  <div className="ag-tabs">
                    {PROVIDER_STATUSES.map((s) => (
                      <button key={s} type="button" className={`ag-tab ${providerStatus === s ? "active" : ""}`} onClick={() => { setProviderStatus(s); setProviderPage(1); }}>
                        {s === "ALL" ? "All" : humanStatus(s)}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {tab === "members" ? (
              <TableWrap>
                <table className="ag-table">
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th>Contact</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Wallet</th>
                      <th>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(membersLoad.data?.items ?? []).map((m) => (
                      <tr key={m.id}>
                        <td style={{ display: "flex", alignItems: "center", gap: 9 }}>
                          <Avatar name={m.name} size={26} />
                          <span style={{ minWidth: 0 }}>
                            <b style={{ display: "block", fontWeight: 650 }}>{m.name ?? "Unnamed"}</b>
                            {m.provider && <span style={{ fontSize: 10, color: "var(--ag-ink-faint)" }}>Also a provider</span>}
                          </span>
                        </td>
                        <td style={{ fontSize: 11.5, color: "var(--ag-ink-soft)" }}>{m.phone ?? m.email ?? "—"}</td>
                        <td>{m.role}</td>
                        <td><Pill text={humanStatus(m.status)} tone={MEMBER_STATUS_TONE[m.status] ?? "mute"} /></td>
                        <td style={{ whiteSpace: "nowrap", fontWeight: 650 }}>{coins(m.walletBalance)}</td>
                        <td style={{ whiteSpace: "nowrap", color: "var(--ag-ink-faint)" }}>{shortDate(m.createdAt)}</td>
                      </tr>
                    ))}
                    {(!membersLoad.data || membersLoad.data.items.length === 0) && (
                      <tr>
                        <td colSpan={6}><Empty>{membersLoad.loading ? "Loading members…" : "No members match this search."}</Empty></td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </TableWrap>
            ) : (
              <TableWrap>
                <table className="ag-table">
                  <thead>
                    <tr>
                      <th>Provider</th>
                      <th>Contact</th>
                      <th>Services</th>
                      <th>Status</th>
                      <th>Rating</th>
                      <th>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(providersLoad.data?.items ?? []).map((p) => (
                      <tr key={p.id}>
                        <td style={{ display: "flex", alignItems: "center", gap: 9 }}>
                          <Avatar name={p.user?.name} size={26} />
                          <span style={{ minWidth: 0 }}>
                            <b style={{ display: "block", fontWeight: 650 }}>{p.user?.name ?? "Unnamed"}</b>
                            {p.isAvailable && <span style={{ fontSize: 10, color: "var(--ag-green)" }}>Available now</span>}
                          </span>
                        </td>
                        <td style={{ fontSize: 11.5, color: "var(--ag-ink-soft)" }}>{p.user?.phone ?? p.user?.email ?? "—"}</td>
                        <td style={{ fontSize: 11.5, maxWidth: 180 }}>{p.services.map((s) => s.category?.name).filter(Boolean).join(", ") || "—"}</td>
                        <td><Pill text={humanStatus(p.verificationStatus)} tone={PROVIDER_STATUS_TONE[p.verificationStatus] ?? "mute"} /></td>
                        <td>{p.rating ? `${p.rating} / 5` : "—"}</td>
                        <td style={{ whiteSpace: "nowrap", color: "var(--ag-ink-faint)" }}>{shortDate(p.createdAt)}</td>
                      </tr>
                    ))}
                    {(!providersLoad.data || providersLoad.data.items.length === 0) && (
                      <tr>
                        <td colSpan={6}><Empty>{providersLoad.loading ? "Loading providers…" : "No providers match this search."}</Empty></td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </TableWrap>
            )}

            {tab === "members" ? (
              <Pager meta={membersLoad.data?.meta ?? null} onPrev={() => setMemberPage((p) => Math.max(1, p - 1))} onNext={() => setMemberPage((p) => p + 1)} />
            ) : (
              <Pager meta={providersLoad.data?.meta ?? null} onPrev={() => setProviderPage((p) => Math.max(1, p - 1))} onNext={() => setProviderPage((p) => p + 1)} />
            )}
          </Panel>
        </div>

        <div className="ag-stack">
          <AgentSidePanel
            agentLabel={`${platform.label} — ${agent.name}`}
            greeting="The whole roster, searchable"
            blurb="Every member and provider account, straight from the real admin tables — filterable and paginated, never a capped client-side slice."
            todayStats={[
              { label: "Total accounts", value: statsLoad.loading ? "—" : num(us?.total), icon: <Svg path={Icons.users} size={17} />, tone: "purple" },
              { label: "Providers of members", value: providerShareOfUsers === null ? "—" : `${providerShareOfUsers}%`, icon: <Svg path={Icons.shield} size={17} />, tone: "blue" },
              { label: "Verification rate", value: verifiedRate === null ? "—" : `${verifiedRate}%`, icon: <Svg path={Icons.fingerprint} size={17} />, tone: "green" },
            ]}
            suggestions={["How many providers are still pending verification?", "Who are the newest members this week?", "How many banned accounts do we have?"]}
            onAsk={ask.ask}
          />

          <AskAnswer state={ask} />

          <InsightsPanel
            rows={[
              {
                icon: <Svg path={Icons.fingerprint} size={15} />,
                label: "Provider verification",
                value: verifiedRate === null ? "No providers registered yet." : `${verifiedRate}% of ${num(ps?.total)} providers are verified — ${num((ps?.total ?? 0) - (ps?.verified ?? 0))} still waiting.`,
              },
              {
                icon: <Svg path={Icons.alert} size={15} />,
                label: "Suspended or banned",
                value: us ? `${num(us.suspended)} suspended, ${num(us.banned)} banned across ${num(us.total)} members.` : "—",
              },
              {
                icon: <Svg path={Icons.sparkle} size={15} />,
                label: "Growth this week",
                value: us ? `${num(us.newThisWeek)} new member${us.newThisWeek === 1 ? "" : "s"} joined in the last 7 days.` : "—",
              },
              {
                icon: <Svg path={Icons.target} size={15} />,
                label: "Available capacity",
                value: ps ? `${num(ps.available)} of ${num(ps.verified)} verified providers are online and available right now.` : "—",
              },
            ]}
          />

          <Panel title="Agent runtime" sub="Real usage from the shared agent log">
            <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
              {statsLoad.data?.stats ? (
                <>
                  <KeyRow label="Model" value={statsLoad.data.stats.model} />
                  <KeyRow label="Calls this month" value={num(statsLoad.data.stats.callsThisMonth)} />
                  <KeyRow label="Spend this month" value={`$${(statsLoad.data.stats.spendThisMonthUsd ?? 0).toFixed(2)}`} />
                </>
              ) : (
                <Empty>{statsLoad.loading ? "Loading…" : "Runtime stats unavailable."}</Empty>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
