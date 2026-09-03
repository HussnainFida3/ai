"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, CircleCheck, Loader2, ShieldCheck, TriangleAlert } from "lucide-react";

import { PLATFORM_LIST, PLATFORMS } from "@/lib/platforms";
import { ensureConnected, setTokens, useIsConnected } from "@/lib/api";

/**
 * Platform authorisation — deliberately NOT part of the normal flow.
 *
 * Signing into the console now connects both platforms automatically, so
 * nothing links here during ordinary use. It exists for the one case that
 * genuinely cannot be automated: ShadiLife enforces email 2FA on admin
 * sign-in, so if its stored session is ever left dormant past its refresh
 * window, a human has to complete that challenge once. GhrFix never needs
 * this — the server can always re-establish it from its own credentials.
 */
export default function ConnectPage() {
  return (
    <main className="cx-page">
      <style jsx global>{`
        html,
        body {
          margin: 0;
          background: #030712;
        }

        .cx-page {
          min-height: 100vh;
          padding: 48px 24px;
          color: #f1f5f9;
          font-family: Inter, ui-sans-serif, system-ui, sans-serif;
        }

        .cx-shell {
          width: min(720px, 100%);
          margin: 0 auto;
        }

        .cx-back {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          margin-bottom: 22px;
          color: #94a3b8;
          text-decoration: none;
          font-size: 12px;
          font-weight: 650;
        }

        .cx-back:hover {
          color: #f1f5f9;
        }

        .cx-title {
          margin: 0 0 8px;
          font-size: 26px;
          font-weight: 800;
          letter-spacing: -0.025em;
        }

        .cx-sub {
          margin: 0 0 28px;
          color: #94a3b8;
          font-size: 13px;
          line-height: 1.65;
        }

        .cx-card {
          padding: 20px;
          margin-bottom: 14px;
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 16px;
          background: #0b1220;
        }

        .cx-card-head {
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .cx-card-head img {
          width: 26px;
          height: 26px;
          border-radius: 7px;
          object-fit: contain;
        }

        .cx-card-name {
          flex: 1;
          min-width: 0;
          font-size: 15px;
          font-weight: 750;
        }

        .cx-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 10.5px;
          font-weight: 750;
          white-space: nowrap;
        }

        .cx-pill.on {
          color: #7de2a5;
          background: rgba(34, 197, 94, 0.09);
          border: 1px solid rgba(34, 197, 94, 0.18);
        }

        .cx-pill.off {
          color: #fbbf24;
          background: rgba(251, 191, 36, 0.09);
          border: 1px solid rgba(251, 191, 36, 0.22);
        }

        .cx-note {
          margin: 13px 0 0;
          color: #94a3b8;
          font-size: 12px;
          line-height: 1.65;
        }

        .cx-form {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 16px;
        }

        .cx-form label {
          display: block;
          margin-bottom: 5px;
          color: #94a3b8;
          font-size: 11px;
          font-weight: 700;
        }

        .cx-form input {
          width: 100%;
          padding: 11px 12px;
          border: 1px solid rgba(255, 255, 255, 0.09);
          border-radius: 10px;
          color: #f1f5f9;
          background: #0d1526;
          font-size: 13px;
          font-family: inherit;
        }

        .cx-form input:focus {
          outline: none;
          border-color: rgba(139, 92, 246, 0.55);
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.12);
        }

        .cx-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 4px;
          padding: 11px 16px;
          border: 1px solid rgba(167, 139, 250, 0.3);
          border-radius: 10px;
          color: #ffffff;
          background: linear-gradient(135deg, #7c3aed, #5b6cf8);
          cursor: pointer;
          font-size: 12.5px;
          font-weight: 750;
          font-family: inherit;
        }

        .cx-btn:disabled {
          opacity: 0.6;
          cursor: default;
        }

        .cx-msg {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          margin-top: 12px;
          padding: 11px 12px;
          border-radius: 10px;
          font-size: 12px;
          line-height: 1.55;
        }

        .cx-msg.err {
          color: #fda4af;
          background: rgba(244, 63, 94, 0.08);
          border: 1px solid rgba(244, 63, 94, 0.2);
        }

        .cx-msg.ok {
          color: #86efac;
          background: rgba(34, 197, 94, 0.08);
          border: 1px solid rgba(34, 197, 94, 0.2);
        }

        .cx-spin {
          animation: cx-spin 1s linear infinite;
        }

        @keyframes cx-spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>

      <div className="cx-shell">
        <Link href="/ai-agents" className="cx-back">
          <ArrowLeft size={14} />
          Back to AI Agents
        </Link>

        <h1 className="cx-title">Platform authorisation</h1>
        <p className="cx-sub">
          Both platforms connect automatically when you sign into this console. You only need
          this page if ShadiLife has been left unused long enough for its session to lapse —
          its admin sign-in requires a 2FA code, which is the one thing the console can&apos;t
          complete on its own.
        </p>

        {PLATFORM_LIST.map((platform) =>
          platform.key === "shadilife" ? (
            <ShadiLifeCard key={platform.key} />
          ) : (
            <GhrFixCard key={platform.key} />
          ),
        )}
      </div>
    </main>
  );
}

function GhrFixCard() {
  const platform = PLATFORMS.ghrfix;
  const connected = useIsConnected("ghrfix");

  useEffect(() => {
    void ensureConnected("ghrfix");
  }, []);

  return (
    <section className="cx-card">
      <div className="cx-card-head">
        <img src={platform.logoUrl} alt="" aria-hidden="true" />
        <div className="cx-card-name">{platform.label}</div>
        <span className={`cx-pill ${connected ? "on" : "off"}`}>
          {connected ? <CircleCheck size={12} /> : <Loader2 size={12} className="cx-spin" />}
          {connected ? "Connected" : "Connecting"}
        </span>
      </div>
      <p className="cx-note">
        Fully automatic — the console holds its own admin credentials and re-establishes this
        session whenever it needs to. Nothing to do here.
      </p>
    </section>
  );
}

function ShadiLifeCard() {
  const platform = PLATFORMS.shadilife;
  const connected = useIsConnected("shadilife");

  const [step, setStep] = useState<"login" | "code">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    void ensureConnected("shadilife");
  }, []);

  async function seed(body: Record<string, string>, onDone: () => void) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/session/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "That didn't work. Try again.");
        return;
      }
      onDone();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  function submitLogin(e: FormEvent) {
    e.preventDefault();
    void seed({ step: "start", email: email.trim(), password }, () => {
      setStep("code");
      setPassword("");
      setNote(`A 6-digit code was emailed to ${email.trim()}.`);
    });
  }

  function submitCode(e: FormEvent) {
    e.preventDefault();
    void seed({ step: "verify", email: email.trim(), code: code.trim() }, () => {
      setNote("ShadiLife is authorised. It will stay connected from now on.");
      setStep("login");
      setCode("");
      // Pull the freshly-seeded session into this browser straight away.
      void fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: "shadilife" }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          if (j?.tokens?.accessToken) {
            setTokens(platform.tokenNs, j.tokens.accessToken, j.tokens.refreshToken);
          }
        })
        .catch(() => {});
    });
  }

  return (
    <section className="cx-card">
      <div className="cx-card-head">
        <img src={platform.logoUrl} alt="" aria-hidden="true" />
        <div className="cx-card-name">{platform.label}</div>
        <span className={`cx-pill ${connected ? "on" : "off"}`}>
          {connected ? <CircleCheck size={12} /> : <ShieldCheck size={12} />}
          {connected ? "Connected" : "Needs authorising"}
        </span>
      </div>

      {connected ? (
        <p className="cx-note">
          Authorised. The console rotates this session automatically every time you sign in, so
          it stays connected without you coming back here.
        </p>
      ) : (
        <>
          <p className="cx-note">
            Sign in once with a ShadiLife admin account. The password is used only to trigger
            the 2FA email and is never stored — only the resulting session is kept.
          </p>

          {step === "login" ? (
            <form className="cx-form" onSubmit={submitLogin}>
              <div>
                <label htmlFor="sl-email">Admin email</label>
                <input
                  id="sl-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
              <div>
                <label htmlFor="sl-password">Password</label>
                <input
                  id="sl-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
              <button type="submit" className="cx-btn" disabled={busy}>
                {busy ? <Loader2 size={14} className="cx-spin" /> : <ShieldCheck size={14} />}
                {busy ? "Sending code..." : "Send 2FA code"}
              </button>
            </form>
          ) : (
            <form className="cx-form" onSubmit={submitCode}>
              <div>
                <label htmlFor="sl-code">6-digit code</label>
                <input
                  id="sl-code"
                  inputMode="numeric"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  maxLength={6}
                  required
                />
              </div>
              <button type="submit" className="cx-btn" disabled={busy}>
                {busy ? <Loader2 size={14} className="cx-spin" /> : <CircleCheck size={14} />}
                {busy ? "Authorising..." : "Authorise ShadiLife"}
              </button>
            </form>
          )}
        </>
      )}

      {error && (
        <div className="cx-msg err">
          <TriangleAlert size={14} />
          {error}
        </div>
      )}
      {note && !error && (
        <div className="cx-msg ok">
          <CircleCheck size={14} />
          {note}
        </div>
      )}
    </section>
  );
}
