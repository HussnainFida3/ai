import Link from "next/link";
import { PLATFORM_LIST } from "@/lib/platforms";

/**
 * Master AI Special — platform picker.
 *
 * The Master agent is registered on both platforms (`master`, /ai-agents/master),
 * but its fleet is different on each: 11 other GhrFix agents versus 16 other
 * ShadiLife ones, read through two different backend shapes. So the workspace
 * is entered per platform, exactly like the other specials.
 */

const PAGES = [
  { slug: "overview", label: "Overview", desc: "Fleet totals, budget consumption and where the calls go." },
  { slug: "fleet", label: "Fleet", desc: "Every agent: calls, spend, share and reporting status." },
  { slug: "spend", label: "Spend", desc: "The money view — cost per call, budget and ranked spend." },
  { slug: "activity", label: "Activity", desc: "The real event log with recency and per-agent breakdowns." },
  { slug: "chat", label: "Chat with AI Agent", desc: "Ask the Master agent — grounded in the live fleet snapshot." },
];

export default function MasterAgentSpecialIndex() {
  return (
    <div style={{ minHeight: "100vh", background: "#fafbfe", padding: "48px 24px", fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#7c3aed", marginBottom: 8 }}>
          Master AI Special
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 8px", color: "#11162d" }}>
          Pick a platform
        </h1>
        <p style={{ fontSize: 14, color: "#4c5470", margin: "0 0 32px", lineHeight: 1.6 }}>
          The bird&apos;s-eye view of every other agent — activity, spend and call volume — wired to each platform&apos;s own
          fleet telemetry.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 20 }}>
          {PLATFORM_LIST.map((p) => {
            const fleetSize = p.agents.filter((a) => a.key !== "master").length;
            return (
              <div key={p.key} style={{ border: "1px solid #eef0f5", borderRadius: 16, background: "#fff", padding: 20, boxShadow: "0 2px 10px rgba(25,34,75,0.035)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: p.color }} />
                  <strong style={{ fontSize: 16, color: "#11162d" }}>{p.label}</strong>
                </div>
                <div style={{ fontSize: 11, color: "#69738c", margin: "0 0 14px 20px" }}>
                  {fleetSize} agents under Master AI
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {PAGES.map((page) => (
                    <Link
                      key={page.slug}
                      href={`/master-agent-special/${p.key}/${page.slug}`}
                      style={{ display: "block", padding: "12px 14px", borderRadius: 10, border: "1px solid #f0f2f7", textDecoration: "none", color: "inherit" }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#11162d" }}>{page.label}</div>
                      <div style={{ fontSize: 11, color: "#69738c", marginTop: 2 }}>{page.desc}</div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <p style={{ fontSize: 11.5, color: "#8891a8", marginTop: 28, lineHeight: 1.7, maxWidth: 640 }}>
          GhrFix exposes a dedicated fleet roster under <code>/ai-agents/master/overview</code>; ShadiLife has no
          per-agent stats route at all and instead publishes a platform-wide <code>/ai-agents/_meta/usage</code>. Both
          are read as-is — an agent that fails to report is shown as unreported, never as zero.
        </p>
      </div>
    </div>
  );
}
