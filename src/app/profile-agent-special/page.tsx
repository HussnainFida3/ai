/**
 * Profile Agent Special — platform picker.
 *
 * Both platforms are live, and each card says which real population it
 * profiles: ShadiLife scores member profiles, GhrFix reads its user and
 * provider directories. Neither is a dead end.
 */

import Link from "next/link";
import { PLATFORM_LIST } from "@/lib/platforms";

const PAGES = [
  { slug: "overview", label: "Overview", desc: "Profile strength, verification mix and where the gaps are." },
  { slug: "profiles", label: "Profiles", desc: "The full roster — members on ShadiLife, users and providers on GhrFix." },
  { slug: "recommendations", label: "AI Recommendations", desc: "Prioritised nudges derived from the real roster." },
  { slug: "chat", label: "Chat with AI Agent", desc: "Ask anything — grounded in live profile data." },
];

export default function ProfileAgentSpecialIndex() {
  return (
    <div style={{ minHeight: "100vh", background: "#fafbfe", padding: "48px 24px", fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#7c3aed", marginBottom: 8 }}>
          Profile Agent Special
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 8px", color: "#11162d" }}>
          Pick a platform
        </h1>
        <p style={{ fontSize: 14, color: "#4c5470", margin: "0 0 32px", lineHeight: 1.6 }}>
          People-profile strength, completeness and the nudges worth sending — wired to each platform&apos;s real data.
          ShadiLife profiles its members; GhrFix profiles its users and providers.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 20 }}>
          {PLATFORM_LIST.map((p) => {
            const ghrfix = p.key === "ghrfix";
            return (
              <div key={p.key} style={{ border: "1px solid #eef0f5", borderRadius: 16, background: "#fff", padding: 20, boxShadow: "0 2px 10px rgba(25,34,75,0.035)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <img src={p.logoUrl} alt={`${p.label} logo`} style={{ width: 22, height: 22, borderRadius: 6, objectFit: "contain" }} />
                  <strong style={{ fontSize: 16, color: "#11162d" }}>{p.label}</strong>
                </div>
                <p style={{ fontSize: 11.5, color: "#69738c", margin: "0 0 14px", lineHeight: 1.6 }}>
                  {ghrfix
                    ? "Live — profiles GhrFix users and providers from the real /admin/users and /admin/providers directories."
                    : "Live — scores member profiles from the real Profile Agent completion roster and quality audit."}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {PAGES.map((page) => (
                    <Link
                      key={page.slug}
                      href={`/profile-agent-special/${p.key}/${page.slug}`}
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
      </div>
    </div>
  );
}
