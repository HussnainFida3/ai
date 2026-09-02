/**
 * Site Chat Agent Special — platform picker.
 *
 * Unlike the other special workspaces this one is NOT symmetric across the two
 * platforms: only GhrFix registers a `site-chat` agent (see GHRFIX_AGENTS in
 * src/lib/platforms.ts — the ShadiLife list has no such key). So this hub does
 * not offer the two platforms as equals. GhrFix gets the real page links;
 * ShadiLife is listed only to say plainly that the agent is not mounted there,
 * with a single link to the honest unsupported state.
 */

import Link from "next/link";
import { PLATFORMS } from "@/lib/platforms";

const PAGES = [
  { slug: "overview", label: "Overview", desc: "Volume, cache efficiency and spend at a glance." },
  { slug: "conversations", label: "Conversations", desc: "What the backend really records about who is chatting." },
  { slug: "usage", label: "Usage & Cost", desc: "Calls, tokens, budget consumption and the model behind it." },
  { slug: "quality", label: "Quality", desc: "Cache hit rate, plus an honest list of what is not measured." },
  { slug: "chat", label: "Chat with AI Agent", desc: "Ask the operations agent about the assistant's numbers." },
];

const ghrfix = PLATFORMS.ghrfix;
const shadilife = PLATFORMS.shadilife;

export default function SiteChatAgentSpecialIndex() {
  return (
    <div style={{ minHeight: "100vh", background: "#fafbfe", padding: "48px 24px", fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#7c3aed", marginBottom: 8 }}>
          Site Chat Agent Special
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 8px", color: "#11162d" }}>
          Runs on GhrFix only
        </h1>
        <p style={{ fontSize: 14, color: "#4c5470", margin: "0 0 32px", lineHeight: 1.6, maxWidth: 660 }}>
          The Site Chat Agent reports on the customer-facing website assistant — how many conversations it served, how
          many of those never reached the model, and what it costs. Only GhrFix registers this agent, so it is the only
          platform with a workspace to open.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 20 }}>
          <div style={{ border: "1px solid #eef0f5", borderRadius: 16, background: "#fff", padding: 20, boxShadow: "0 2px 10px rgba(25,34,75,0.035)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: ghrfix.color }} />
              <strong style={{ fontSize: 16, color: "#11162d" }}>{ghrfix.label}</strong>
              <span style={{ marginLeft: "auto", fontSize: 10.5, fontWeight: 700, color: "#0f9e69", background: "#e9faf3", border: "1px solid #0f9e6933", borderRadius: 20, padding: "3px 9px" }}>
                ✓ Agent registered
              </span>
            </div>
            <p style={{ fontSize: 11.5, color: "#69738c", margin: "0 0 14px", lineHeight: 1.6 }}>
              Backend base <code>/ai-agents/site-chat</code> — summary, conversations, stats and activity.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {PAGES.map((page) => (
                <Link
                  key={page.slug}
                  href={`/sitechat-agent-special/${ghrfix.key}/${page.slug}`}
                  style={{ display: "block", padding: "12px 14px", borderRadius: 10, border: "1px solid #f0f2f7", textDecoration: "none", color: "inherit" }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#11162d" }}>{page.label}</div>
                  <div style={{ fontSize: 11, color: "#69738c", marginTop: 2 }}>{page.desc}</div>
                </Link>
              ))}
            </div>
          </div>

          <div style={{ border: "1px solid #eef0f5", borderRadius: 16, background: "#fff", padding: 20, boxShadow: "0 2px 10px rgba(25,34,75,0.035)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: shadilife.color }} />
              <strong style={{ fontSize: 16, color: "#11162d" }}>{shadilife.label}</strong>
              <span style={{ marginLeft: "auto", fontSize: 10.5, fontWeight: 700, color: "#c9860f", background: "#fff6e6", border: "1px solid #c9860f33", borderRadius: 20, padding: "3px 9px" }}>
                ⚠ Not registered
              </span>
            </div>
            <p style={{ fontSize: 12, color: "#4c5470", margin: "0 0 12px", lineHeight: 1.7 }}>
              ShadiLife&apos;s agent list contains no <code>site-chat</code> key, so there is no{" "}
              <code>/ai-agents/site-chat</code> backend on that platform. Its member conversations are covered by the
              Chat &amp; Safety Agent instead, which is a different agent with different data.
            </p>
            <p style={{ fontSize: 11.5, color: "#69738c", margin: "0 0 14px", lineHeight: 1.7 }}>
              The routes below still render — they explain the gap rather than showing zeros or a 404.
            </p>
            <Link
              href={`/sitechat-agent-special/${shadilife.key}/overview`}
              style={{ display: "block", padding: "12px 14px", borderRadius: 10, border: "1px dashed #dfe2ea", textDecoration: "none", color: "inherit" }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: "#11162d" }}>See why it is unavailable</div>
              <div style={{ fontSize: 11, color: "#69738c", marginTop: 2 }}>Opens the unsupported-platform state.</div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
