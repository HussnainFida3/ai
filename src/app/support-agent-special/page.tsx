/**
 * Support Agent Special — platform picker.
 *
 * The same workspace, wired to each platform's own real support queue:
 * GhrFix serves booking disputes plus contact-form messages from
 * /ai-agents/support/summary and /ai-agents/support/tickets; ShadiLife
 * serves member reports from /admin/reports. Nothing on these pages writes.
 */

import Link from "next/link";
import { PLATFORM_LIST } from "@/lib/platforms";

const PAGES = [
  { slug: "overview", label: "Overview", desc: "Queue health, intake trend and the full status mix." },
  { slug: "tickets", label: "Tickets", desc: "The whole queue — tabs, search, filter and pagination." },
  { slug: "escalations", label: "Escalations", desc: "Aged and severe rows, ranked worst first." },
  { slug: "performance", label: "Performance", desc: "Resolution rate, throughput and per-category closure." },
  { slug: "chat", label: "Chat with AI Agent", desc: "Ask anything — grounded in the live queue." },
];

export default function SupportAgentSpecialIndex() {
  return (
    <div style={{ minHeight: "100vh", background: "#fafbfe", padding: "48px 24px", fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#7c3aed", marginBottom: 8 }}>
          Support Agent Special
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 8px", color: "#11162d" }}>Pick a platform</h1>
        <p style={{ fontSize: 14, color: "#4c5470", margin: "0 0 12px", lineHeight: 1.6 }}>
          The same support workspace, wired to each platform&apos;s own real queue. GhrFix serves booking disputes and
          contact-form messages; ShadiLife serves the member report queue, the only ticket model it has.
        </p>
        <p style={{ fontSize: 12, color: "#69738c", margin: "0 0 32px", lineHeight: 1.6 }}>
          Read-only: replying to and resolving tickets stays in the agent console, not here.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 20 }}>
          {PLATFORM_LIST.map((p) => (
            <div key={p.key} style={{ border: "1px solid #eef0f5", borderRadius: 16, background: "#fff", padding: 20, boxShadow: "0 2px 10px rgba(25,34,75,0.035)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: p.color }} />
                <strong style={{ fontSize: 16, color: "#11162d" }}>{p.label}</strong>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {PAGES.map((page) => (
                  <Link
                    key={page.slug}
                    href={`/support-agent-special/${p.key}/${page.slug}`}
                    style={{ display: "block", padding: "12px 14px", borderRadius: 10, border: "1px solid #f0f2f7", textDecoration: "none", color: "inherit" }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#11162d" }}>{page.label}</div>
                    <div style={{ fontSize: 11, color: "#69738c", marginTop: 2 }}>{page.desc}</div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
