import Link from "next/link";
import { PLATFORM_LIST } from "@/lib/platforms";

/**
 * Marketing Agent Special — platform picker.
 *
 * The same workspace is served for both platforms, but the two backends
 * expose very different marketing surfaces, so each card says up front what
 * that platform actually returns to a read-only client.
 */

const PAGES = [
  { slug: "overview", label: "Overview", desc: "Promo, broadcast and campaign-activity health at a glance." },
  { slug: "campaigns", label: "Campaigns", desc: "Every promo code and broadcast, filterable and ranked." },
  { slug: "audience", label: "Audience", desc: "Who is reached, how many, and which segments exist." },
  { slug: "chat", label: "Chat with AI Agent", desc: "Ask anything — grounded in the live marketing data." },
];

const SOURCE: Record<string, string> = {
  ghrfix: "Reads the real promo-code table and broadcast log.",
  shadilife: "Reads the segment list and this agent's real call log — no campaign history endpoint exists.",
};

export default function MarketingAgentSpecialIndex() {
  return (
    <div style={{ minHeight: "100vh", background: "#fafbfe", padding: "48px 24px", fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#7c3aed", marginBottom: 8 }}>
          Marketing Agent Special
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 8px", color: "#11162d" }}>
          Pick a platform
        </h1>
        <p style={{ fontSize: 14, color: "#4c5470", margin: "0 0 32px", lineHeight: 1.6 }}>
          A read-only marketing workspace wired to each platform&apos;s own live data. Nothing here sends a
          broadcast or creates a promo code.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 20 }}>
          {PLATFORM_LIST.map((p) => (
            <div key={p.key} style={{ border: "1px solid #eef0f5", borderRadius: 16, background: "#fff", padding: 20, boxShadow: "0 2px 10px rgba(25,34,75,0.035)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <img src={p.logoUrl} alt={`${p.label} logo`} style={{ width: 22, height: 22, borderRadius: 6, objectFit: "contain" }} />
                <strong style={{ fontSize: 16, color: "#11162d" }}>{p.label}</strong>
              </div>
              <p style={{ fontSize: 11.5, color: "#69738c", margin: "0 0 14px", lineHeight: 1.6 }}>{SOURCE[p.key]}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {PAGES.map((page) => (
                  <Link
                    key={page.slug}
                    href={`/marketing-agent-special/${p.key}/${page.slug}`}
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
