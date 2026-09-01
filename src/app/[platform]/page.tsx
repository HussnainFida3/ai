"use client";

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlatform, agentTitle } from "@/lib/platforms";

export default function PlatformPage({ params }: { params: Promise<{ platform: string }> }) {
  const { platform: key } = use(params);
  const platform = getPlatform(key);
  if (!platform) notFound();

  return (
    <main className="ag-main" style={{ width: "100%" }}>
      <div className="ag-content" style={{ maxWidth: 1240, margin: "0 auto", paddingTop: 44 }}>
        <Link href="/" className="ag-launcher-link" style={{ width: "max-content" }}>← All agents</Link>

        <div className="ag-plat-head" style={{ marginTop: 16 }}>
          <span className="ag-plat-badge" style={{ background: platform.color, fontSize: 11, padding: "5px 11px" }}>{platform.label}</span>
          <div>
            <h2 className="ag-display">{platform.label} agents</h2>
            <p>{platform.blurb} · {platform.apiBase}</p>
          </div>
          <span className="ag-plat-count">{platform.agents.length} agents</span>
        </div>

        <div className="ag-directory">
          {platform.agents.map((a) => (
            <Link key={a.key} href={`/${platform.key}/${a.key}`} className="ag-tile" style={{ ["--tile-accent" as string]: a.accent }}>
              <div className="ag-tile-top">
                <span className="ag-tile-icon">{a.icon}</span>
                <div style={{ minWidth: 0 }}>
                  <div className="ag-tile-name ag-display">{agentTitle(platform, a)}</div>
                  <div className="ag-tile-tag">{a.tag}</div>
                </div>
              </div>
              <p className="ag-tile-desc">{a.desc}</p>
              <div className="ag-tile-foot">
                <span className="ag-plat-badge" style={{ background: platform.color }}>{platform.label}</span>
                <span className="ag-tile-open">Open →</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
