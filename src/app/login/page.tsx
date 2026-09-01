"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Lock, Eye, EyeOff, TriangleAlert, CircleCheck } from "lucide-react";
import { PLATFORMS } from "@/lib/platforms";
import { setTokens } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Incorrect email or password.");
        return;
      }
      if (data.ghrfix?.accessToken) {
        setTokens(PLATFORMS.ghrfix.tokenNs, data.ghrfix.accessToken, data.ghrfix.refreshToken);
      }
      router.push("/ai-agents");
      router.refresh();
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="cc-login-shell">
      <section className="cc-login-brand">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
            <div className="cc-login-mark">
              <ShieldCheck size={21} strokeWidth={2} />
            </div>
            <div>
              <div className="cc-login-brand-name">AI Command Center</div>
              <div className="cc-login-brand-sub">Cross-platform control room</div>
            </div>
          </div>

          <p className="cc-login-kicker" style={{ marginTop: 70 }}>Restricted access</p>
          <h1 className="cc-login-title">One console. Two platforms. Full control.</h1>
          <p className="cc-login-copy">
            This console can read and act on real data across GhrFix and ShadiLife. Access is limited to
            people who hold this password.
          </p>

          <div className="cc-login-points">
            <div className="cc-login-point"><strong>GhrFix</strong>Bookings, providers, wallet and every AI agent.</div>
            <div className="cc-login-point"><strong>ShadiLife</strong>Users, matches, moderation and platform ops.</div>
            <div className="cc-login-point"><strong>Real actions</strong>Every write here is a real, audited change.</div>
            <div className="cc-login-point"><strong>Independent sessions</strong>Each platform still needs its own admin login.</div>
          </div>
        </div>
        <div className="cc-login-footer">AI Command Center • Internal tool</div>
      </section>

      <section className="cc-login-form-side">
        <div className="cc-login-card">
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div>
              <p className="cc-login-kicker" style={{ color: "#12a968" }}>Secure access</p>
              <h1 style={{ marginTop: 8 }}>Sign in</h1>
              <p className="cc-login-desc">This console is shared by one login. Ask whoever set it up if you don&apos;t have it.</p>
            </div>
            <div className="cc-login-icon">
              <Lock size={20} strokeWidth={2} />
            </div>
          </div>

          <div className="cc-login-security">
            <CircleCheck size={14} color="#12a968" fill="#12a968" />
            <span style={{ color: "#65738a" }}>This only gates the console itself — each platform still checks its own admin login.</span>
          </div>

          <form onSubmit={handleSubmit} style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="cc-login-field">
              <label htmlFor="email">Email</label>
              <div className="cc-login-input-wrap">
                <input
                  id="email"
                  type="email"
                  className={`cc-login-input${error ? " error" : ""}`}
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                  required
                />
              </div>
            </div>

            <div className="cc-login-field">
              <label htmlFor="password">Password</label>
              <div className="cc-login-input-wrap">
                <input
                  id="password"
                  type={visible ? "text" : "password"}
                  className={`cc-login-input${error ? " error" : ""}`}
                  placeholder="Enter the console password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="cc-login-eye"
                  onClick={() => setVisible((v) => !v)}
                  tabIndex={-1}
                  aria-label={visible ? "Hide password" : "Show password"}
                >
                  {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="cc-login-error">
                <TriangleAlert size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" className="cc-login-submit" disabled={loading || !email || !password}>
              {loading && <span className="cc-login-spinner" />}
              {loading ? "Checking…" : "Unlock console"}
            </button>
          </form>

          <p className="cc-login-foot">Authorized personnel only</p>
        </div>
      </section>
    </main>
  );
}
