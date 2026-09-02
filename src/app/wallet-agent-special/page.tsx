/**
 * Payment & Wallet Agent Special — platform picker.
 *
 * Unlike the other special hubs, this one does not offer both platforms as
 * equals: `PLATFORMS.shadilife.agents` in src/lib/platforms.ts registers no
 * `payment-wallet` agent, so only GhrFix actually runs it. The ShadiLife card
 * is kept — the routes are platform-generic and must still render — but it is
 * labelled for what it is rather than pretending there is data behind it.
 */

import Link from "next/link";
import { PLATFORMS } from "@/lib/platforms";

const PAGES = [
  { slug: "overview", label: "Overview", desc: "Wallet totals, credit trend, approval rate and the coin float." },
  { slug: "topups", label: "Top-Ups", desc: "The real manual bank-transfer queue, filterable and paginated." },
  { slug: "ledger", label: "Ledger", desc: "Every wallet credit and debit, with a credit-vs-debit breakdown." },
  { slug: "economy", label: "Token Economy", desc: "The accept fee and signup grant, shown read-only." },
  { slug: "chat", label: "Chat with AI Agent", desc: "Ask the agent — grounded in the live wallet snapshot." },
];

export default function WalletAgentSpecialIndex() {
  return (
    <div style={{ minHeight: "100vh", background: "#fafbfe", padding: "48px 24px", fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#7c3aed", marginBottom: 8 }}>
          Payment &amp; Wallet Agent Special
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 8px", color: "#11162d" }}>
          A GhrFix-only workspace
        </h1>
        <p style={{ fontSize: 14, color: "#4c5470", margin: "0 0 32px", lineHeight: 1.6 }}>
          The Payment &amp; Wallet agent is registered on <strong>GhrFix only</strong>. It reads the GhrFix Coins ledger,
          the manual top-up queue and the token-economy settings behind the flat accept fee. ShadiLife has no such agent,
          so its pages state that plainly instead of showing numbers.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 20 }}>
          <div style={{ border: "1px solid #e3dcfa", borderRadius: 16, background: "#fff", padding: 20, boxShadow: "0 2px 10px rgba(25,34,75,0.035)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <img src={PLATFORMS.ghrfix.logoUrl} alt={`${PLATFORMS.ghrfix.label} logo`} style={{ width: 22, height: 22, borderRadius: 6, objectFit: "contain" }} />
              <strong style={{ fontSize: 16, color: "#11162d" }}>GhrFix</strong>
              <span style={{ marginLeft: "auto", fontSize: 10.5, fontWeight: 700, color: "#0f9e69", background: "#e9faf3", border: "1px solid #0f9e6933", borderRadius: 6, padding: "3px 8px" }}>
                ✓ Agent registered
              </span>
            </div>
            <p style={{ fontSize: 11.5, color: "#69738c", margin: "0 0 14px", lineHeight: 1.6 }}>
              Live against <code>/ai-agents/payment-wallet</code> and the platform wallet ledger.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {PAGES.map((page) => (
                <Link
                  key={page.slug}
                  href={`/wallet-agent-special/ghrfix/${page.slug}`}
                  style={{ display: "block", padding: "12px 14px", borderRadius: 10, border: "1px solid #f0f2f7", textDecoration: "none", color: "inherit" }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#11162d" }}>{page.label}</div>
                  <div style={{ fontSize: 11, color: "#69738c", marginTop: 2 }}>{page.desc}</div>
                </Link>
              ))}
            </div>
          </div>

          <div style={{ border: "1px solid #eef0f5", borderRadius: 16, background: "#fbfbfd", padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <img src={PLATFORMS.shadilife.logoUrl} alt={`${PLATFORMS.shadilife.label} logo`} style={{ width: 22, height: 22, borderRadius: 6, objectFit: "contain" }} />
              <strong style={{ fontSize: 16, color: "#11162d" }}>ShadiLife</strong>
              <span style={{ marginLeft: "auto", fontSize: 10.5, fontWeight: 700, color: "#c9860f", background: "#fff6e6", border: "1px solid #c9860f33", borderRadius: 6, padding: "3px 8px" }}>
                ⚠ Not registered
              </span>
            </div>
            <p style={{ fontSize: 11.5, color: "#69738c", margin: "0 0 14px", lineHeight: 1.6 }}>
              ShadiLife has no <code>/ai-agents/payment-wallet</code> route. These pages still render — the routes are
              platform-generic — but they report the gap rather than fabricating wallet figures.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {PAGES.map((page) => (
                <Link
                  key={page.slug}
                  href={`/wallet-agent-special/shadilife/${page.slug}`}
                  style={{ display: "block", padding: "12px 14px", borderRadius: 10, border: "1px dashed #e2e5ee", textDecoration: "none", color: "#69738c" }}
                >
                  <div style={{ fontSize: 13, fontWeight: 650 }}>{page.label}</div>
                  <div style={{ fontSize: 11, marginTop: 2 }}>Renders an unavailable notice.</div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
