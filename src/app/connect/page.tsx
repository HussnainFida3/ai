"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PLATFORM_LIST, type PlatformDef } from "@/lib/platforms";
import { ApiError, authApi, clearTokens, isConnected, setTokens } from "@/lib/api";

/**
 * Both platforms are signed into independently — each keeps its own tokens,
 * so connecting one never touches the other's session.
 */
function PlatformCard({ platform, onChange }: { platform: PlatformDef; onChange: () => void }) {
  const [connected, setConnected] = useState(false);
  const [step, setStep] = useState<"login" | "code">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    setConnected(isConnected(platform.key));
  }, [platform.key]);

  async function submitLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await authApi.login(platform.key, email.trim(), password);
      setStep("code");
      setNote(`A 6-digit code was sent for ${platform.label}. In development it is printed to that backend's console.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : `Could not reach ${platform.label}.`);
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { data } = await authApi.verify(platform.key, email.trim(), code.trim());
      setTokens(platform.tokenNs, data.accessToken, data.refreshToken);
      setConnected(true);
      setStep("login");
      setPassword("");
      setCode("");
      setNote(`${platform.label} connected.`);
      onChange();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "That code was not accepted.");
    } finally {
      setBusy(false);
    }
  }

  function disconnect() {
    clearTokens(platform.tokenNs);
    setConnected(false);
    setNote(null);
    onChange();
  }

  return (
    <div className="ag-panel" style={{ ["--ag-accent" as string]: platform.color }}>
      <div className="ag-panel-head">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="ag-plat-badge" style={{ background: platform.color }}>{platform.label}</span>
          <div>
            <div className="ag-panel-title">{platform.label}</div>
            <div className="ag-panel-sub">{platform.apiBase}</div>
          </div>
        </div>
        <span className={`ag-conn ${connected ? "on" : "off"}`}>{connected ? "Connected" : "Not connected"}</span>
      </div>

      <div className="ag-panel-body">
        {connected ? (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <p style={{ margin: 0, fontSize: 12.5, color: "var(--ag-ink-soft)" }}>
              This console is holding an admin session for {platform.label}. Its {platform.agents.length} agents are live.
            </p>
            <button type="button" className="ag-btn ag-btn-ghost ag-btn-sm" onClick={disconnect} style={{ marginLeft: "auto" }}>Disconnect</button>
          </div>
        ) : step === "login" ? (
          <form onSubmit={submitLogin} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="ag-form-grid">
              <div className="ag-field">
                <label>Admin email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={busy} />
              </div>
              <div className="ag-field">
                <label>Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={busy} />
              </div>
            </div>
            <button type="submit" className="ag-btn ag-btn-accent" disabled={busy} style={{ justifyContent: "center" }}>
              {busy ? "Signing in…" : `Connect ${platform.label}`}
            </button>
          </form>
        ) : (
          <form onSubmit={submitCode} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="ag-field">
              <label>6-digit code</label>
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" required disabled={busy} />
            </div>
            <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
              <button type="submit" className="ag-btn ag-btn-accent" disabled={busy}>{busy ? "Verifying…" : "Verify & connect"}</button>
              <button type="button" className="ag-btn ag-btn-ghost" onClick={() => { setStep("login"); setError(null); }} disabled={busy}>Back</button>
            </div>
          </form>
        )}

        {note && <p style={{ fontSize: 11.5, color: "var(--ag-ink-faint)", marginTop: 12 }}>{note}</p>}
        {error && <p style={{ fontSize: 11.5, color: "var(--ag-red)", marginTop: 12 }}>{error}</p>}
      </div>
    </div>
  );
}

export default function ConnectPage() {
  const [, force] = useState(0);
  return (
    <main className="ag-main" style={{ width: "100%" }}>
      <div className="ag-content" style={{ maxWidth: 900, margin: "0 auto", paddingTop: 48 }}>
        <Link href="/" className="ag-launcher-link" style={{ width: "max-content" }}>← All agents</Link>
        <h1 className="ag-display" style={{ fontSize: 25, fontWeight: 800, margin: "14px 0 6px" }}>Connect your platforms</h1>
        <p style={{ fontSize: 13, color: "var(--ag-ink-soft)", margin: "0 0 24px", lineHeight: 1.65 }}>
          This console stores a separate admin session per platform. Sign into either or both — agents for a platform
          you have not connected will simply report that it is unreachable rather than showing stale or invented numbers.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {PLATFORM_LIST.map((p) => (
            <PlatformCard key={p.key} platform={p} onChange={() => force((n) => n + 1)} />
          ))}
        </div>
      </div>
    </main>
  );
}
