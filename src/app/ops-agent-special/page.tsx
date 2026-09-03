/**
 * Ops Agent Special — platform picker.
 *
 * The same operations workspace wired to each platform's own real ops
 * backend: GhrFix's provider/emergency queue, ShadiLife's scheduled-job and
 * verification backlog. The two are genuinely different, so each card names
 * what that platform actually exposes rather than promising the same pages.
 */

import Link from "next/link";
import { PLATFORM_LIST } from "@/lib/platforms";

const PAGES = [
  { slug: "overview", label: "Overview", desc: "Queue depth, age buckets, mix donuts and computed rates." },
  { slug: "queue", label: "Operational Queue", desc: "The full backlog — filterable, searchable, paginated." },
  { slug: "verifications", label: "Verifications", desc: "The pending-verification pipeline and its oldest waiters." },
  { slug: "incidents", label: "Incidents", desc: "Emergencies and urgent operational work, by severity and age." },
  { slug: "chat", label: "Chat with AI Agent", desc: "Ask the ops agent — grounded in the live backlog." },
];

const WHAT_EACH_PLATFORM_HAS: Record<string, string> = {
  ghrfix: "Pending provider verifications and open emergencies, from the Ops Agent's own /summary and /queue.",
  shadilife:
    "Scheduled-job health and a security snapshot from the Ops Agent, plus the Verification Agent's real review queue. ShadiLife has no emergency concept — the Incidents page says so.",
};

export default function OpsAgentSpecialIndex() {
  return (
    <div style={{ minHeight: "100vh", background: "#0d1526", padding: "48px 24px", fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#7c3aed", marginBottom: 8 }}>
          Ops Agent Special
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 8px", color: "#11162d" }}>
          Pick a platform
        </h1>
        <p style={{ fontSize: 14, color: "#cbd5e1", margin: "0 0 32px", lineHeight: 1.6 }}>
          The daily operational queue for each platform, read live from its own backend. Read-only: nothing here approves,
          rejects or resolves anything.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 20 }}>
          {PLATFORM_LIST.map((p) => (
            <div key={p.key} style={{ border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, background: "#0b1220", padding: 20, boxShadow: "0 2px 10px rgba(25,34,75,0.035)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <img src={p.logoUrl} alt={`${p.label} logo`} style={{ width: 22, height: 22, borderRadius: 6, objectFit: "contain" }} />
                <strong style={{ fontSize: 16, color: "#11162d" }}>{p.label}</strong>
              </div>
              <p style={{ fontSize: 11.5, lineHeight: 1.6, color: "#94a3b8", margin: "0 0 14px" }}>
                {WHAT_EACH_PLATFORM_HAS[p.key]}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {PAGES.map((page) => (
                  <Link
                    key={page.slug}
                    href={`/ops-agent-special/${p.key}/${page.slug}`}
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
