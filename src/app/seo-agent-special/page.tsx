import Link from "next/link";
import { PLATFORM_LIST } from "@/lib/platforms";

const PAGES = [
  { slug: "overview", label: "Overview", desc: "Real SEO score, published posts, and what needs work." },
  { slug: "chat", label: "Chat with AI Agent", desc: "Ask anything — backed by real, live platform data." },
  { slug: "statistics", label: "Statistics", desc: "Organic traffic, keyword distribution, top pages." },
  { slug: "recommendations", label: "AI Recommendations", desc: "Prioritized recommendation table." },
  { slug: "blog-optimization", label: "Blog Optimization", desc: "Per-post SEO optimization workspace." },
];

export default function SeoAgentSpecialIndex() {
  return (
    <div style={{ minHeight: "100vh", background: "#030712", padding: "48px 24px", fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8b5cf6", marginBottom: 8 }}>
          SEO Agent Special
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 8px", color: "#f1f5f9" }}>
          Pick a platform
        </h1>
        <p style={{ fontSize: 14, color: "#94a3b8", margin: "0 0 32px", lineHeight: 1.6 }}>
          Same pixel-perfect UI, wired to each platform's own real, live data.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {PLATFORM_LIST.map((p) => (
            <div key={p.key} style={{ border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, background: "#0b1220", padding: 20, boxShadow: "0 2px 10px rgba(0,0,0,0.35)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <img src={p.logoUrl} alt={`${p.label} logo`} style={{ width: 22, height: 22, borderRadius: 6, objectFit: "contain" }} />
                <strong style={{ fontSize: 16, color: "#f1f5f9" }}>{p.label}</strong>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {PAGES.map((page) => (
                  <Link
                    key={page.slug}
                    href={`/seo-agent-special/${p.key}/${page.slug}`}
                    style={{ display: "block", padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,.05)", textDecoration: "none", color: "inherit" }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9" }}>{page.label}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{page.desc}</div>
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
