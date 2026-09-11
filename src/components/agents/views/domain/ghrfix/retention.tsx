"use client";

/**
 * GhrFix — Retention Agent — Lifecycle.
 *
 * Do customers come back, and do providers stay active? Repeat rate, dormant
 * customers, idle providers, and concrete win-back lists.
 *   GET /overview  · GET /reactivation  · GET /idle-providers
 */

import { useState } from "react";
import Link from "next/link";
import { MetricCard, Svg } from "@/components/agents/rich";
import { Icons } from "@/components/agents/icons";
import type { AgentViewProps } from "../../registry";
import { Empty, ErrorNote, Panel, TableWrap, useLoad } from "../../ghrfix/_kit-core";

interface Overview {
  customers: {
    total: number; withBooking: number; neverBooked: number; repeat: number;
    oneAndDone: number; dormant: number; activeLast30Days: number; repeatRate: number;
  };
  providers: { total: number; verified: number; availableNow: number; inactive: number };
}
interface Target { customerId: string; name: string | null; phone: string | null; email: string | null; city: string | null; daysSince: number | null }
interface Idle { id: string; name: string | null; phone: string | null; city: string | null; available: boolean }

export default function GhrfixRetentionView({ platform, agent, api }: AgentViewProps) {
  const ov = useLoad<Overview>(() => api.get<Overview>("/overview").then((r) => r.data), []);
  const [tab, setTab] = useState<"winback" | "idle">("winback");
  const winback = useLoad<Target[]>(() => api.get<Target[]>("/reactivation").then((r) => r.data), []);
  const idle = useLoad<Idle[]>(() => api.get<Idle[]>("/idle-providers").then((r) => r.data), []);

  const c = ov.data?.customers;
  const p = ov.data?.providers;

  return (
    <>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 18 }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 750, color: "var(--ag-ink)" }}>Lifecycle & Retention</h1>
          <p style={{ margin: 0, fontSize: 12.5, color: "var(--ag-ink-soft)", maxWidth: 560, lineHeight: 1.6 }}>
            Whether customers come back and providers stay active — with concrete lists of who to nudge.
          </p>
        </div>
        <Link href={`/${platform.key}/${agent.key}`} className="ag-btn ag-btn-ghost">← Dashboard</Link>
      </div>

      {ov.error && <ErrorNote error={ov.error} />}

      <div className="ag-metrics">
        <MetricCard icon={<Svg path={Icons.refresh ?? Icons.heart} size={24} />} tone={c && c.repeatRate < 30 ? "gold" : "green"} title="Repeat rate" value={c ? `${c.repeatRate}%` : "—"} />
        <MetricCard icon={<Svg path={Icons.clock} size={24} />} tone="gold" title="Dormant (60d+)" value={c ? String(c.dormant) : "—"} />
        <MetricCard icon={<Svg path={Icons.users} size={24} />} tone="blue" title="Active last 30d" value={c ? String(c.activeLast30Days) : "—"} />
        <MetricCard icon={<Svg path={Icons.user} size={24} />} tone={p && p.inactive > 0 ? "gold" : "green"} title="Idle providers" value={p ? String(p.inactive) : "—"} />
      </div>

      <Panel title="Customer base" sub="Where everyone sits in the lifecycle">
        {c ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px,1fr))", gap: 12, padding: 4 }}>
            {[
              ["Total customers", c.total],
              ["Booked at least once", c.withBooking],
              ["Never booked", c.neverBooked],
              ["Repeat (2+)", c.repeat],
              ["One-and-done", c.oneAndDone],
            ].map(([k, v]) => (
              <div key={String(k)} style={{ padding: "10px 12px", borderRadius: 10, background: "var(--ag-bg)", border: "1px solid var(--ag-border)" }}>
                <div style={{ fontSize: 10.5, color: "var(--ag-ink-faint)", textTransform: "uppercase", letterSpacing: ".04em" }}>{k}</div>
                <div style={{ fontSize: 18, fontWeight: 750, marginTop: 4 }}>{v}</div>
              </div>
            ))}
          </div>
        ) : (
          <Empty>{ov.loading ? "Loading…" : "No data."}</Empty>
        )}
      </Panel>

      <div style={{ marginTop: 18 }}>
        <Panel
          title="Who to contact"
          sub={tab === "winback" ? "One booking, a while ago — worth a win-back" : "Verified providers with no jobs yet"}
          actions={
            <div style={{ display: "flex", gap: 6 }}>
              <button type="button" className={`ag-btn ag-btn-sm ${tab === "winback" ? "ag-btn-solid" : "ag-btn-ghost"}`} onClick={() => setTab("winback")}>Win-back ({winback.data?.length ?? 0})</button>
              <button type="button" className={`ag-btn ag-btn-sm ${tab === "idle" ? "ag-btn-solid" : "ag-btn-ghost"}`} onClick={() => setTab("idle")}>Idle providers ({idle.data?.length ?? 0})</button>
            </div>
          }
          noBody
        >
          {tab === "winback" ? (
            winback.data && winback.data.length > 0 ? (
              <TableWrap>
                <table className="ag-table">
                  <thead><tr><th>Customer</th><th>City</th><th>Contact</th><th>Last booked</th></tr></thead>
                  <tbody>
                    {winback.data.map((t) => (
                      <tr key={t.customerId}>
                        <td style={{ fontWeight: 650 }}>{t.name ?? "—"}</td>
                        <td>{t.city ?? "—"}</td>
                        <td style={{ fontSize: 11.5, color: "var(--ag-ink-soft)" }}>{t.phone || t.email || "—"}</td>
                        <td style={{ color: "var(--ag-ink-faint)" }}>{t.daysSince != null ? `${t.daysSince}d ago` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            ) : <div className="ag-panel-body"><Empty>{winback.loading ? "Loading…" : "No win-back targets yet."}</Empty></div>
          ) : (
            idle.data && idle.data.length > 0 ? (
              <TableWrap>
                <table className="ag-table">
                  <thead><tr><th>Provider</th><th>City</th><th>Contact</th><th>Available</th></tr></thead>
                  <tbody>
                    {idle.data.map((p2) => (
                      <tr key={p2.id}>
                        <td style={{ fontWeight: 650 }}>{p2.name ?? "—"}</td>
                        <td>{p2.city ?? "—"}</td>
                        <td style={{ fontSize: 11.5, color: "var(--ag-ink-soft)" }}>{p2.phone || "—"}</td>
                        <td>{p2.available ? "Yes" : "No"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            ) : <div className="ag-panel-body"><Empty>{idle.loading ? "Loading…" : "Every verified provider has had at least one job."}</Empty></div>
          )}
        </Panel>
      </div>
    </>
  );
}
