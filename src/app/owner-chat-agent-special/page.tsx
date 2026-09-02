import Link from "next/link";
import { PLATFORM_LIST } from "@/lib/platforms";

/**
 * Owner Chat Agent Special — platform picker.
 *
 * The same orchestration workspace wired to each platform's own real admin
 * routes. Nothing here fetches; it only routes into the per-platform pages,
 * which read live data through `useOwnerChatSnapshot`.
 */

const PAGES = [
  { slug: "overview", label: "Overview", desc: "Headline platform figures, the real trend, and every breakdown the backend returns." },
  { slug: "directory", label: "Directory", desc: "The actual people the agent can reach, straight from the paginated admin routes." },
  { slug: "capabilities", label: "Capabilities", desc: "What this agent really reads, and the audited writes it holds." },
  { slug: "audit", label: "Audit Trail", desc: "The agent's own recorded actions, by type and by recency." },
  { slug: "chat", label: "Chat with AI Agent", desc: "Ask anything — grounded in the live snapshot beside it." },
];

export default function OwnerChatAgentSpecialIndex() {
  return (
    <div style={{ minHeight: "100vh", background: "#fafbfe", padding: "48px 24px", fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#7c3aed", marginBottom: 8 }}>
          Owner Chat Agent Special
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 8px", color: "#11162d" }}>
          Pick a platform
        </h1>
        <p style={{ fontSize: 14, color: "#4c5470", margin: "0 0 32px", lineHeight: 1.6 }}>
          Owner Chat is the orchestration agent: conversational access to real platform data, plus a scoped set of audited
          writes. Every figure in this workspace is read live — the write surface is documented, never fired.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 20 }}>
          {PLATFORM_LIST.map((p) => (
            <div key={p.key} style={{ border: "1px solid #eef0f5", borderRadius: 16, background: "#fff", padding: 20, boxShadow: "0 2px 10px rgba(25,34,75,0.035)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <img src={p.logoUrl} alt={`${p.label} logo`} style={{ width: 22, height: 22, borderRadius: 6, objectFit: "contain" }} />
                <strong style={{ fontSize: 16, color: "#11162d" }}>{p.label}</strong>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {PAGES.map((page) => (
                  <Link
                    key={page.slug}
                    href={`/owner-chat-agent-special/${p.key}/${page.slug}`}
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
