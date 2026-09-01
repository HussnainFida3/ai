import Link from "next/link";
import { PLATFORM_LIST } from "@/lib/platforms";

const PAGES = [
  { slug: "dashboard", label: "Dashboard", desc: "Real revenue, fees, and cash figures at a glance." },
  { slug: "chat", label: "Chat with AI Agent", desc: "Ask anything — backed by real, live platform data." },
  { slug: "transactions", label: "Transactions", desc: "Full transaction table with filters and search." },
  { slug: "reports", label: "Reports", desc: "Revenue vs expenses, profit breakdown, downloads." },
  { slug: "payouts", label: "Payouts", desc: "Partner and member payout management." },
];

export default function FinanceAgentSpecialIndex() {
  return (
    <div style={{ minHeight: "100vh", background: "#f7f7fb", padding: "48px 24px", fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#7c3aed", marginBottom: 8 }}>
          Finance Agent Special
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 8px", color: "#14162b" }}>
          Pick a platform
        </h1>
        <p style={{ fontSize: 14, color: "#5b5f74", margin: "0 0 32px", lineHeight: 1.6 }}>
          Same pixel-perfect UI, wired to each platform's own real, live data.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {PLATFORM_LIST.map((p) => (
            <div key={p.key} style={{ border: "1px solid #e7e7ee", borderRadius: 16, background: "#fff", padding: 20, boxShadow: "0 2px 10px rgba(20,20,45,0.045)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: p.color }} />
                <strong style={{ fontSize: 16, color: "#14162b" }}>{p.label}</strong>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {PAGES.map((page) => (
                  <Link
                    key={page.slug}
                    href={`/finance-agent-special/${p.key}/${page.slug}`}
                    style={{ display: "block", padding: "12px 14px", borderRadius: 10, border: "1px solid #eef0f4", textDecoration: "none", color: "inherit" }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#14162b" }}>{page.label}</div>
                    <div style={{ fontSize: 11, color: "#7b8094", marginTop: 2 }}>{page.desc}</div>
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
