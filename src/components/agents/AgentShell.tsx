"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AgentOrb } from "./AgentOrb";
import { Icons } from "./icons";
import { Svg } from "./rich";
import { agentTitle, type AgentDef, type PlatformDef } from "@/lib/platforms";
import { tabsFor } from "@/lib/agent-tabs";

/**
 * Chrome for a single agent page.
 *
 * The platform is stated three times over — the badge above the agent name,
 * the "GhrFix — SEO Agent" title, and the accent colour — so there is never
 * a doubt about which site the numbers on screen belong to.
 */
export function AgentShell({
  platform,
  agent,
  pageTitle,
  children,
}: {
  platform: PlatformDef;
  agent: AgentDef;
  pageTitle: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const root = `/${platform.key}/${agent.key}`;

  return (
    <div
      className="ag-shell"
      style={{
        ["--ag-accent" as string]: agent.accent,
        ["--ag-accent-soft" as string]: `${agent.accent}1f`,
        ["--ag-accent-glow" as string]: `${agent.accent}59`,
      }}
    >
      <div className={`ag-sidebar-backdrop ${menuOpen ? "open" : ""}`} onClick={() => setMenuOpen(false)} />

      <aside className={`ag-sidebar ${menuOpen ? "open" : ""}`}>
        <Link href="/" className="ag-launcher-link">
          <Svg path={Icons.arrowLeft} size={13} />
          All Agents
        </Link>

        <div className="ag-brand-card">
          <AgentOrb size={38} />
          <div style={{ minWidth: 0 }}>
            <span className="ag-plat-badge" style={{ background: platform.color }}>{platform.label}</span>
            <div className="ag-brand-name ag-display" style={{ marginTop: 4 }}>{agent.name}</div>
            <div className="ag-brand-tag">{agent.tag}</div>
          </div>
        </div>

        <div className="ag-nav-label">Navigate</div>
        <nav className="ag-nav">
          {tabsFor(agent.key).map((t) => {
            const href = t.seg ? `${root}/${t.seg}` : root;
            return (
              <Link key={t.label} href={href} className={`ag-nav-item ${pathname === href ? "active" : ""}`} onClick={() => setMenuOpen(false)}>
                <span className="ag-nav-icon"><Svg path={t.icon} size={17} /></span>
                {t.label}
              </Link>
            );
          })}
        </nav>

        <div className="ag-sidebar-spacer" />

        <div className="ag-nav-label">Switch platform</div>
        <Link href={`/${platform.key === "ghrfix" ? "shadilife" : "ghrfix"}`} className="ag-nav-item">
          <span className="ag-nav-icon"><Svg path={Icons.dashboard} size={17} /></span>
          {platform.key === "ghrfix" ? "ShadiLife" : "GhrFix"} agents
        </Link>
      </aside>

      <main className="ag-main">
        <header className="ag-topbar">
          <button type="button" className="ag-menu-btn" onClick={() => setMenuOpen(true)} aria-label="Open menu">
            <Svg path={Icons.menu} size={18} />
          </button>
          <div style={{ minWidth: 0 }}>
            <div className="ag-topbar-title ag-display" style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <span className="ag-plat-badge" style={{ background: platform.color }}>{platform.label}</span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{agent.name}</span>
            </div>
            <div style={{ fontSize: 10.5, color: "var(--ag-ink-faint)", marginTop: 2 }}>{pageTitle}</div>
          </div>
          <div className="ag-topbar-spacer" />
          <div className="ag-live-pill"><span className="ag-live-dot" />Agent Online</div>
        </header>

        <div className="ag-content">{children}</div>
      </main>
    </div>
  );
}

/** Page heading used inside agent pages — always fully qualified. */
export function AgentHeading({ platform, agent, blurb, actions }: { platform: PlatformDef; agent: AgentDef; blurb?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="ag-hero">
      <div>
        <div className="ag-hero-eyebrow">{platform.label} · {agent.tag}</div>
        <h1 className="ag-display">{agentTitle(platform, agent)}</h1>
        <p>{blurb ?? agent.desc}</p>
        {actions && <div className="ag-hero-actions">{actions}</div>}
      </div>
    </div>
  );
}
