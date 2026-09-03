import Link from "next/link";
import { PLATFORM_LIST } from "@/lib/platforms";

/**
 * Analytics Agent Special — platform picker.
 *
 * The same workspace is wired to each platform's own analytics endpoints:
 * GhrFix's summary/trend/breakdown trio, and ShadiLife's single aggregate
 * snapshot. The two report different things, so each card links into the
 * same four pages rather than pretending the metrics are interchangeable.
 */

const PAGES = [
  { slug: "overview", label: "Overview", desc: "Headline counters, the mix charts and computed insights." },
  { slug: "breakdown", label: "Breakdown", desc: "Every dimensional cut the backend returns, ranked and searchable." },
  { slug: "trends", label: "Trends", desc: "Time series where one exists, period comparison where it does not." },
  { slug: "chat", label: "Chat with AI Agent", desc: "Ask anything — grounded in the live snapshot." },
];

export default function AnalyticsAgentSpecialIndex() {
  return (
    <div style={{ minHeight: "100vh", background: "#0d1526", padding: "48px 24px", fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#7c3aed", marginBottom: 8 }}>
          Analytics Agent Special
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 8px", color: "#11162d" }}>
          Pick a platform
        </h1>
        <p style={{ fontSize: 14, color: "#cbd5e1", margin: "0 0 32px", lineHeight: 1.6 }}>
          One analytics workspace, two very different datasets. GhrFix measures users, providers and bookings
          across cities and service categories; ShadiLife measures members, matches and the engagement funnel.
          Nothing is normalised away — each page states what its own platform does and does not track.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 20 }}>
          {PLATFORM_LIST.map((p) => (
            <div key={p.key} style={{ border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, background: "#0b1220", padding: 20, boxShadow: "0 2px 10px rgba(25,34,75,0.035)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <img src={p.logoUrl} alt={`${p.label} logo`} style={{ width: 22, height: 22, borderRadius: 6, objectFit: "contain" }} />
                <strong style={{ fontSize: 16, color: "#11162d" }}>{p.label}</strong>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {PAGES.map((page) => (
                  <Link
                    key={page.slug}
                    href={`/analytics-agent-special/${p.key}/${page.slug}`}
                    style={{ display: "block", padding: "12px 14px", borderRadius: 10, border: "1px solid #0d1526", textDecoration: "none", color: "inherit" }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#11162d" }}>{page.label}</div>
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
