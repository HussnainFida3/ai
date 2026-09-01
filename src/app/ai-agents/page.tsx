"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { AgentOrb } from "@/components/agents/AgentOrb";
import { PLATFORM_LIST, agentTitle } from "@/lib/platforms";
import { isConnected } from "@/lib/api";

export default function HubPage() {
  const router = useRouter();
  // Token presence is only known client-side, so resolve it after mount to
  // keep the server and first client render identical.
  const [connected, setConnected] = useState<Record<string, boolean>>({});
  useEffect(() => {
    setConnected(Object.fromEntries(PLATFORM_LIST.map((p) => [p.key, isConnected(p.key)])));
  }, []);

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" }).catch(() => {});
    router.push("/login");
  }

  const totalAgents = PLATFORM_LIST.reduce((n, p) => n + p.agents.length, 0);

  return (
    <main className="ag-main" style={{ width: "100%" }}>
      <div className="ag-content" style={{ maxWidth: 1240, margin: "0 auto", paddingTop: 48 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 14, flexWrap: "wrap" }}>
          <AgentOrb size={62} />
          <div style={{ minWidth: 0 }}>
            <div className="ag-hero-eyebrow" style={{ color: "var(--ag-accent)" }}>AI Command Center</div>
            <h1 className="ag-display" style={{ fontSize: "clamp(22px,3vw,31px)", fontWeight: 800, margin: "8px 0 6px", letterSpacing: "-0.02em" }}>
              Two platforms. {totalAgents} agents. One console.
            </h1>
            <p style={{ fontSize: 13.5, color: "var(--ag-ink-soft)", maxWidth: 660, lineHeight: 1.65, margin: 0 }}>
              A standalone console that runs separately from both products and controls each one through its own API.
              Every agent is labelled with the platform it belongs to, so a GhrFix number can never be mistaken for a ShadiLife one.
            </p>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <Link href="/connect" className="ag-btn ag-btn-accent">Connect platforms</Link>
            <button type="button" onClick={handleLogout} className="ag-btn ag-btn-ghost" title="Log out of the console">
              <LogOut size={15} />
            </button>
          </div>
        </div>

        <Link
          href="/seo-agent-special"
          className="ag-plat-section"
          style={{ display: "block", textDecoration: "none", color: "inherit" }}
        >
          <div className="ag-plat-head">
            <span className="ag-plat-badge" style={{ background: "#7c3aed", fontSize: 11, padding: "5px 11px" }}>Special</span>
            <div>
              <h2 className="ag-display">SEO Agent Special</h2>
              <p>Five pixel-perfect SEO agent reference pages — static UI only.</p>
            </div>
            <span className="ag-conn on" style={{ marginLeft: "auto" }}>5 pages</span>
          </div>
        </Link>

        <Link
          href="/finance-agent-special"
          className="ag-plat-section"
          style={{ display: "block", textDecoration: "none", color: "inherit" }}
        >
          <div className="ag-plat-head">
            <span className="ag-plat-badge" style={{ background: "#7c3aed", fontSize: 11, padding: "5px 11px" }}>Special</span>
            <div>
              <h2 className="ag-display">Finance Agent Special</h2>
              <p>Four pixel-perfect finance agent reference pages — static UI only.</p>
            </div>
            <span className="ag-conn on" style={{ marginLeft: "auto" }}>4 pages</span>
          </div>
        </Link>

        {PLATFORM_LIST.map((p) => (
          <section className="ag-plat-section" key={p.key}>
            <div className="ag-plat-head">
              <span className="ag-plat-badge" style={{ background: p.color, fontSize: 11, padding: "5px 11px" }}>{p.label}</span>
              <div>
                <h2 className="ag-display">{p.label} agents</h2>
                <p>{p.blurb}</p>
              </div>
              <span className={`ag-conn ${connected[p.key] ? "on" : "off"}`}>
                {connected[p.key] ? "Connected" : "Not connected"}
              </span>
              <span className="ag-plat-count">{p.agents.length} agents</span>
            </div>

            <div className="ag-directory">
              {p.agents.map((a) => (
                <Link
                  key={a.key}
                  href={`/${p.key}/${a.key}`}
                  className="ag-tile"
                  style={{ ["--tile-accent" as string]: a.accent }}
                >
                  <div className="ag-tile-top">
                    <span className="ag-tile-icon">{a.icon}</span>
                    <div style={{ minWidth: 0 }}>
                      <div className="ag-tile-name ag-display">{agentTitle(p, a)}</div>
                      <div className="ag-tile-tag">{a.tag}</div>
                    </div>
                  </div>
                  <p className="ag-tile-desc">{a.desc}</p>
                  <div className="ag-tile-foot">
                    <span className="ag-plat-badge" style={{ background: p.color }}>{p.label}</span>
                    <span className="ag-tile-open">Open →</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
