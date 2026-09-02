"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  Check,
  ChevronRight,
  CircleAlert,
  Code2,
  KeyRound,
  Lock,
  LogIn,
  Network,
  RefreshCw,
  Server,
  ShieldCheck,
  Sparkles,
  Unplug,
  Wifi,
  WifiOff,
} from "lucide-react";

import { PLATFORM_LIST, type PlatformDef } from "@/lib/platforms";
import {
  ApiError,
  authApi,
  clearTokens,
  isConnected,
  setTokens,
} from "@/lib/api";

/* -------------------------------------------------------------------------- */
/*                               PLATFORM CARD                                */
/* -------------------------------------------------------------------------- */

function PlatformCard({
  platform,
  onChange,
}: {
  platform: PlatformDef;
  onChange: () => void;
}) {
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

  async function submitLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setBusy(true);
    setError(null);
    setNote(null);

    try {
      await authApi.login(
        platform.key,
        email.trim(),
        password
      );

      setStep("code");

      setNote(
        `A 6-digit verification code was sent for ${platform.label}.`
      );
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : `Could not reach ${platform.label}.`
      );
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setBusy(true);
    setError(null);
    setNote(null);

    try {
      const { data } = await authApi.verify(
        platform.key,
        email.trim(),
        code.trim()
      );

      setTokens(
        platform.tokenNs,
        data.accessToken,
        data.refreshToken
      );

      setConnected(true);
      setStep("login");

      setPassword("");
      setCode("");

      setNote(
        `${platform.label} is now securely connected to the AI Command Center.`
      );

      onChange();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "That verification code was not accepted."
      );
    } finally {
      setBusy(false);
    }
  }

  function disconnect() {
    clearTokens(platform.tokenNs);

    setConnected(false);
    setStep("login");
    setPassword("");
    setCode("");

    setError(null);
    setNote(null);

    onChange();
  }

  return (
    <article
      className="platform-card"
      style={
        {
          "--platform-color": platform.color,
        } as React.CSSProperties
      }
    >
      {/* Glow */}

      <div className="platform-glow" />

      {/* Header */}

      <div className="platform-header">
        <div className="platform-brand">
          <div className="platform-logo">
            <Network size={22} strokeWidth={2.2} />
          </div>

          <div>
            <div className="platform-label-row">
              <span
                className="platform-badge"
                style={{
                  background: platform.color,
                }}
              >
                {platform.label}
              </span>

              <span className="platform-api">
                API CONNECTION
              </span>
            </div>

            <h2>{platform.label}</h2>

            <p className="platform-url">
              <Server size={13} />
              {platform.apiBase}
            </p>
          </div>
        </div>

        <div
          className={`connection-status ${
            connected ? "connected" : "disconnected"
          }`}
        >
          <span className="status-dot" />

          {connected ? (
            <>
              <Wifi size={14} />
              Connected
            </>
          ) : (
            <>
              <WifiOff size={14} />
              Not connected
            </>
          )}
        </div>
      </div>

      {/* Divider */}

      <div className="card-divider" />

      {/* Connected */}

      {connected ? (
        <div className="connected-body">
          <div className="connected-icon">
            <ShieldCheck size={26} />
          </div>

          <div className="connected-info">
            <h3>Platform connected</h3>

            <p>
              Your administrator session is active.{" "}
              {platform.agents.length} AI agents can now securely
              communicate with this platform.
            </p>

            <div className="security-row">
              <span>
                <Check size={13} />
                Session active
              </span>

              <span>
                <Lock size={13} />
                Secure tokens
              </span>

              <span>
                <Activity size={13} />
                Agents online
              </span>
            </div>
          </div>

          <button
            type="button"
            className="disconnect-button"
            onClick={disconnect}
          >
            <Unplug size={16} />

            Disconnect
          </button>
        </div>
      ) : step === "login" ? (
        /* Login */

        <form
          onSubmit={submitLogin}
          className="connection-form"
        >
          <div className="form-intro">
            <div className="form-intro-icon">
              <KeyRound size={17} />
            </div>

            <div>
              <h3>Connect administrator account</h3>

              <p>
                Authenticate with your platform administrator credentials.
              </p>
            </div>
          </div>

          <div className="fields-grid">
            <div className="field">
              <label>Administrator email</label>

              <div className="input-wrap">
                <span className="input-icon">@</span>

                <input
                  type="email"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  placeholder="admin@example.com"
                  required
                  disabled={busy}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="field">
              <label>Password</label>

              <div className="input-wrap">
                <Lock
                  size={16}
                  className="lucide-input-icon"
                />

                <input
                  type="password"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  placeholder="Enter your password"
                  required
                  disabled={busy}
                  autoComplete="current-password"
                />
              </div>
            </div>
          </div>

          <div className="form-footer">
            <div className="secure-text">
              <ShieldCheck size={15} />

              Credentials are never stored by the console.
            </div>

            <button
              type="submit"
              className="connect-button"
              disabled={busy}
            >
              {busy ? (
                <>
                  <RefreshCw
                    size={16}
                    className="spin"
                  />
                  Connecting...
                </>
              ) : (
                <>
                  <LogIn size={16} />
                  Connect {platform.label}
                  <ChevronRight size={16} />
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        /* Verification */

        <form
          onSubmit={submitCode}
          className="verification-form"
        >
          <div className="verification-left">
            <div className="verification-icon">
              <KeyRound size={22} />
            </div>

            <div>
              <h3>Verify your connection</h3>

              <p>
                Enter the 6-digit verification code sent to your
                administrator account.
              </p>
            </div>
          </div>

          <div className="verification-right">
            <div className="code-field">
              <input
                value={code}
                onChange={(e) => {
                  const value = e.target.value
                    .replace(/[^0-9]/g, "")
                    .slice(0, 6);

                  setCode(value);
                }}
                placeholder="000000"
                required
                disabled={busy}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
              />
            </div>

            <div className="verification-actions">
              <button
                type="submit"
                className="connect-button"
                disabled={busy || code.length !== 6}
              >
                {busy ? (
                  <>
                    <RefreshCw
                      size={16}
                      className="spin"
                    />
                    Verifying...
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    Verify & Connect
                  </>
                )}
              </button>

              <button
                type="button"
                className="back-button"
                disabled={busy}
                onClick={() => {
                  setStep("login");
                  setCode("");
                  setError(null);
                  setNote(null);
                }}
              >
                <ArrowLeft size={15} />
                Back
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Message */}

      {note && (
        <div className="message success-message">
          <Check size={16} />

          <span>{note}</span>
        </div>
      )}

      {error && (
        <div className="message error-message">
          <CircleAlert size={16} />

          <span>{error}</span>
        </div>
      )}
    </article>
  );
}

/* -------------------------------------------------------------------------- */
/*                                MAIN PAGE                                   */
/* -------------------------------------------------------------------------- */

export default function ConnectPage() {
  const [, forceUpdate] = useState(0);

  const connectedCount = PLATFORM_LIST.filter((platform) =>
    isConnected(platform.key)
  ).length;

  const totalAgents = PLATFORM_LIST.reduce(
    (total, platform) =>
      total + platform.agents.length,
    0
  );

  return (
    <>
      <main className="connect-page">
        {/* Background */}

        <div className="background-grid" />

        <div className="background-orb orb-one" />
        <div className="background-orb orb-two" />

        {/* Top Navigation */}

        <nav className="top-nav">
          <Link href="/" className="back-link">
            <ArrowLeft size={16} />

            <span>AI Command Center</span>
          </Link>

          <div className="nav-center">
            <div className="live-indicator">
              <span />
              Secure Console
            </div>
          </div>

          <Link href="/" className="all-agents-link">
            <Sparkles size={15} />

            All agents

            <ChevronRight size={15} />
          </Link>
        </nav>

        {/* Content */}

        <div className="connect-container">
          {/* Hero */}

          <section className="hero-section">
            <div className="hero-chip">
              <span className="chip-icon">
                <Network size={14} />
              </span>

              PLATFORM NETWORK
            </div>

            <h1>
              Connect your
              <span> platforms.</span>
            </h1>

            <p>
              Securely connect your product platforms to unlock the
              complete AI agent network. Each platform maintains an
              independent encrypted administrator session.
            </p>

            {/* Statistics */}

            <div className="hero-stats">
              <div className="hero-stat">
                <div className="stat-icon">
                  <Network size={17} />
                </div>

                <div>
                  <strong>
                    {connectedCount}
                    <span>
                      /{PLATFORM_LIST.length}
                    </span>
                  </strong>

                  <small>Connected platforms</small>
                </div>
              </div>

              <div className="hero-stat-divider" />

              <div className="hero-stat">
                <div className="stat-icon">
                  <Sparkles size={17} />
                </div>

                <div>
                  <strong>{totalAgents}</strong>

                  <small>Available AI agents</small>
                </div>
              </div>

              <div className="hero-stat-divider" />

              <div className="hero-stat">
                <div className="stat-icon secure">
                  <ShieldCheck size={17} />
                </div>

                <div>
                  <strong>100%</strong>

                  <small>Independent sessions</small>
                </div>
              </div>
            </div>
          </section>

          {/* Security Banner */}

          <section className="security-banner">
            <div className="security-banner-icon">
              <ShieldCheck size={22} />
            </div>

            <div className="security-banner-content">
              <h3>Secure platform isolation</h3>

              <p>
                Every platform keeps its own authentication tokens and
                administrator session. Connecting one platform never
                affects another.
              </p>
            </div>

            <div className="security-pills">
              <span>
                <Lock size={13} />
                Encrypted
              </span>

              <span>
                <Code2 size={13} />
                API isolated
              </span>
            </div>
          </section>

          {/* Section Header */}

          <div className="section-heading">
            <div>
              <span className="section-eyebrow">
                YOUR NETWORK
              </span>

              <h2>Platform connections</h2>

              <p>
                Authenticate each platform independently.
              </p>
            </div>

            <div className="platform-count">
              <span>{PLATFORM_LIST.length}</span>
              platforms available
            </div>
          </div>

          {/* Platform Cards */}

          <section className="platform-list">
            {PLATFORM_LIST.map((platform) => (
              <PlatformCard
                key={platform.key}
                platform={platform}
                onChange={() =>
                  forceUpdate((value) => value + 1)
                }
              />
            ))}
          </section>

          {/* Bottom Information */}

          <section className="bottom-info">
            <div className="bottom-info-icon">
              <ShieldCheck size={18} />
            </div>

            <p>
              <strong>Your credentials stay private.</strong>
              The AI Command Center only stores authentication tokens
              required to communicate with each platform.
            </p>

            <div className="bottom-status">
              <span className="status-pulse" />

              System secure
            </div>
          </section>
        </div>
      </main>

      {/* ------------------------------------------------------------------ */}
      {/*                              STYLES                                */}
      {/* ------------------------------------------------------------------ */}

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        html {
          background: #07111f;
        }

        body {
          margin: 0;
          background: #07111f;
          color: #f5f8ff;
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        button,
        input {
          font: inherit;
        }

        button {
          border: none;
        }

        .connect-page {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          background:
            radial-gradient(
              circle at 18% 10%,
              rgba(51, 112, 255, 0.13),
              transparent 30%
            ),
            radial-gradient(
              circle at 85% 18%,
              rgba(128, 82, 255, 0.12),
              transparent 32%
            ),
            radial-gradient(
              circle at 50% 100%,
              rgba(0, 213, 167, 0.06),
              transparent 35%
            ),
            #07111f;
        }

        /* Background */

        .background-grid {
          position: fixed;
          inset: 0;
          pointer-events: none;
          opacity: 0.18;

          background-image:
            linear-gradient(
              rgba(255, 255, 255, 0.025) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(255, 255, 255, 0.025) 1px,
              transparent 1px
            );

          background-size: 44px 44px;

          mask-image: linear-gradient(
            to bottom,
            black,
            transparent 78%
          );
        }

        .background-orb {
          position: fixed;
          width: 450px;
          height: 450px;
          border-radius: 999px;
          filter: blur(100px);
          pointer-events: none;
          opacity: 0.16;
        }

        .orb-one {
          top: -230px;
          left: -160px;
          background: #3867ff;
        }

        .orb-two {
          top: 250px;
          right: -230px;
          background: #7c3aed;
        }

        /* Navigation */

        .top-nav {
          position: relative;
          z-index: 10;

          height: 76px;

          max-width: 1420px;
          margin: 0 auto;

          padding: 0 34px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          border-bottom: 1px solid
            rgba(255, 255, 255, 0.055);

          background: rgba(7, 17, 31, 0.45);

          backdrop-filter: blur(22px);
        }

        .back-link,
        .all-agents-link {
          display: inline-flex;
          align-items: center;
          gap: 9px;

          color: #9aa8be;
          text-decoration: none;

          font-size: 13px;
          font-weight: 600;

          transition:
            color 0.2s ease,
            transform 0.2s ease;
        }

        .back-link:hover,
        .all-agents-link:hover {
          color: #ffffff;
          transform: translateY(-1px);
        }

        .all-agents-link {
          color: #d3dcf0;
        }

        .nav-center {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
        }

        .live-indicator {
          display: flex;
          align-items: center;
          gap: 8px;

          padding: 7px 12px;

          border-radius: 999px;

          color: #93a3bd;

          background: rgba(255, 255, 255, 0.035);
          border: 1px solid rgba(255, 255, 255, 0.06);

          font-size: 11px;
          font-weight: 700;

          letter-spacing: 0.03em;
        }

        .live-indicator span {
          width: 6px;
          height: 6px;

          border-radius: 50%;

          background: #2ee6a6;

          box-shadow:
            0 0 0 4px rgba(46, 230, 166, 0.1),
            0 0 16px rgba(46, 230, 166, 0.8);
        }

        /* Container */

        .connect-container {
          position: relative;
          z-index: 2;

          width: min(1120px, calc(100% - 40px));

          margin: 0 auto;

          padding:
            72px 0
            80px;
        }

        /* Hero */

        .hero-section {
          text-align: center;

          max-width: 830px;

          margin: 0 auto 52px;
        }

        .hero-chip {
          width: max-content;

          margin: 0 auto 18px;

          display: inline-flex;
          align-items: center;
          gap: 8px;

          padding: 7px 11px 7px 7px;

          border-radius: 999px;

          background:
            linear-gradient(
              135deg,
              rgba(93, 123, 255, 0.16),
              rgba(123, 85, 255, 0.08)
            );

          border: 1px solid
            rgba(117, 143, 255, 0.18);

          color: #aabaff;

          font-size: 10px;
          font-weight: 800;

          letter-spacing: 0.11em;
        }

        .chip-icon {
          width: 25px;
          height: 25px;

          display: grid;
          place-items: center;

          border-radius: 50%;

          color: #ffffff;

          background:
            linear-gradient(
              135deg,
              #5778ff,
              #865cff
            );
        }

        .hero-section h1 {
          margin: 0;

          color: #f7f9ff;

          font-size:
            clamp(42px, 6vw, 68px);

          line-height: 1.04;

          font-weight: 800;

          letter-spacing: -0.055em;
        }

        .hero-section h1 span {
          background:
            linear-gradient(
              100deg,
              #87a2ff,
              #9d7cff,
              #55dfc5
            );

          -webkit-background-clip: text;
          background-clip: text;

          color: transparent;
        }

        .hero-section > p {
          max-width: 690px;

          margin:
            22px auto
            0;

          color: #8290a8;

          font-size: 15px;

          line-height: 1.75;
        }

        /* Hero Stats */

        .hero-stats {
          display: flex;
          align-items: stretch;
          justify-content: center;

          width: max-content;
          max-width: 100%;

          margin:
            38px auto
            0;

          padding: 16px 20px;

          border-radius: 18px;

          background:
            rgba(13, 27, 47, 0.58);

          border:
            1px solid
            rgba(255, 255, 255, 0.07);

          box-shadow:
            0 20px 50px
              rgba(0, 0, 0, 0.14);

          backdrop-filter: blur(20px);
        }

        .hero-stat {
          display: flex;
          align-items: center;
          gap: 11px;

          padding: 0 16px;
        }

        .stat-icon {
          width: 39px;
          height: 39px;

          flex: 0 0 auto;

          display: grid;
          place-items: center;

          border-radius: 12px;

          color: #9db3ff;

          background:
            rgba(88, 120, 255, 0.11);

          border:
            1px solid
            rgba(116, 143, 255, 0.13);
        }

        .stat-icon.secure {
          color: #59e0c0;

          background:
            rgba(61, 218, 181, 0.08);
        }

        .hero-stat strong {
          display: block;

          color: #f5f7ff;

          font-size: 17px;
          font-weight: 750;

          letter-spacing: -0.02em;
        }

        .hero-stat strong span {
          color: #65738a;
          font-size: 13px;
        }

        .hero-stat small {
          display: block;

          margin-top: 2px;

          color: #66758b;

          font-size: 10px;
          font-weight: 600;
        }

        .hero-stat-divider {
          width: 1px;

          margin: 5px 0;

          background:
            rgba(255, 255, 255, 0.08);
        }

        /* Security Banner */

        .security-banner {
          display: flex;
          align-items: center;
          gap: 17px;

          margin-bottom: 52px;

          padding: 19px 21px;

          border-radius: 18px;

          background:
            linear-gradient(
              100deg,
              rgba(47, 91, 180, 0.1),
              rgba(32, 55, 99, 0.13)
            );

          border:
            1px solid
            rgba(101, 139, 255, 0.11);
        }

        .security-banner-icon {
          width: 45px;
          height: 45px;

          flex: 0 0 auto;

          display: grid;
          place-items: center;

          border-radius: 14px;

          color: #82a3ff;

          background:
            rgba(91, 126, 255, 0.1);
        }

        .security-banner-content {
          min-width: 0;
        }

        .security-banner-content h3 {
          margin: 0 0 5px;

          color: #dfe7f7;

          font-size: 13px;
          font-weight: 750;
        }

        .security-banner-content p {
          margin: 0;

          color: #718098;

          font-size: 12px;

          line-height: 1.55;
        }

        .security-pills {
          margin-left: auto;

          display: flex;
          gap: 8px;
        }

        .security-pills span {
          display: inline-flex;
          align-items: center;
          gap: 6px;

          white-space: nowrap;

          padding: 7px 9px;

          border-radius: 9px;

          color: #8b9ab2;

          background:
            rgba(255, 255, 255, 0.035);

          border:
            1px solid
            rgba(255, 255, 255, 0.055);

          font-size: 10px;
          font-weight: 650;
        }

        /* Section */

        .section-heading {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;

          margin-bottom: 20px;
        }

        .section-eyebrow {
          display: block;

          margin-bottom: 7px;

          color: #607096;

          font-size: 9px;
          font-weight: 800;

          letter-spacing: 0.15em;
        }

        .section-heading h2 {
          margin: 0;

          color: #eef2fa;

          font-size: 24px;
          font-weight: 750;

          letter-spacing: -0.035em;
        }

        .section-heading p {
          margin: 6px 0 0;

          color: #728097;

          font-size: 12px;
        }

        .platform-count {
          color: #64728a;

          font-size: 11px;
        }

        .platform-count span {
          color: #b8c5dc;
          font-weight: 800;
        }

        /* Cards */

        .platform-list {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .platform-card {
          position: relative;

          overflow: hidden;

          border-radius: 22px;

          background:
            linear-gradient(
              145deg,
              rgba(18, 33, 55, 0.93),
              rgba(10, 22, 40, 0.94)
            );

          border:
            1px solid
            rgba(255, 255, 255, 0.075);

          box-shadow:
            0 24px 70px
              rgba(0, 0, 0, 0.18);

          transition:
            transform 0.3s ease,
            border-color 0.3s ease,
            box-shadow 0.3s ease;
        }

        .platform-card:hover {
          transform: translateY(-2px);

          border-color:
            color-mix(
              in srgb,
              var(--platform-color) 30%,
              rgba(255, 255, 255, 0.1)
            );

          box-shadow:
            0 30px 90px
              rgba(0, 0, 0, 0.25);
        }

        .platform-glow {
          position: absolute;

          top: -150px;
          right: -100px;

          width: 330px;
          height: 330px;

          border-radius: 50%;

          background:
            var(--platform-color);

          opacity: 0.06;

          filter: blur(80px);

          pointer-events: none;
        }

        /* Card Header */

        .platform-header {
          position: relative;

          z-index: 2;

          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 20px;

          padding: 24px 26px 21px;
        }

        .platform-brand {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .platform-logo {
          width: 49px;
          height: 49px;

          flex: 0 0 auto;

          display: grid;
          place-items: center;

          border-radius: 15px;

          color: #ffffff;

          background:
            linear-gradient(
              135deg,
              color-mix(
                in srgb,
                var(--platform-color) 85%,
                white
              ),
              var(--platform-color)
            );

          box-shadow:
            0 12px 28px
              color-mix(
                in srgb,
                var(--platform-color) 25%,
                transparent
              );
        }

        .platform-label-row {
          display: flex;
          align-items: center;
          gap: 9px;

          margin-bottom: 5px;
        }

        .platform-badge {
          display: inline-flex;
          align-items: center;

          padding: 4px 8px;

          border-radius: 6px;

          color: white;

          font-size: 9px;
          font-weight: 800;

          letter-spacing: 0.06em;

          box-shadow:
            0 4px 13px
              rgba(0, 0, 0, 0.15);
        }

        .platform-api {
          color: #596881;

          font-size: 8px;
          font-weight: 750;

          letter-spacing: 0.12em;
        }

        .platform-brand h2 {
          margin: 0 0 5px;

          color: #edf2fb;

          font-size: 18px;
          font-weight: 750;

          letter-spacing: -0.025em;
        }

        .platform-url {
          margin: 0;

          display: flex;
          align-items: center;
          gap: 6px;

          color: #60708a;

          font-family:
            "SFMono-Regular",
            Consolas,
            monospace;

          font-size: 10px;
        }

        /* Connection Status */

        .connection-status {
          display: inline-flex;
          align-items: center;
          gap: 7px;

          padding: 8px 11px;

          border-radius: 999px;

          font-size: 10px;
          font-weight: 750;
        }

        .connection-status.connected {
          color: #61e5b6;

          background:
            rgba(40, 207, 150, 0.08);

          border:
            1px solid
            rgba(40, 207, 150, 0.14);
        }

        .connection-status.disconnected {
          color: #8190a8;

          background:
            rgba(255, 255, 255, 0.035);

          border:
            1px solid
            rgba(255, 255, 255, 0.055);
        }

        .status-dot {
          width: 6px;
          height: 6px;

          border-radius: 50%;
        }

        .connected .status-dot {
          background: #42dfaa;

          box-shadow:
            0 0 0 4px
              rgba(66, 223, 170, 0.08);
        }

        .disconnected .status-dot {
          background: #68758b;
        }

        /* Divider */

        .card-divider {
          height: 1px;

          margin: 0 26px;

          background:
            linear-gradient(
              90deg,
              transparent,
              rgba(255, 255, 255, 0.07),
              transparent
            );
        }

        /* Connected */

        .connected-body {
          position: relative;

          z-index: 2;

          display: flex;
          align-items: center;
          gap: 15px;

          padding: 24px 26px;
        }

        .connected-icon {
          width: 48px;
          height: 48px;

          flex: 0 0 auto;

          display: grid;
          place-items: center;

          border-radius: 15px;

          color: #5ee0b6;

          background:
            rgba(46, 222, 166, 0.09);

          border:
            1px solid
            rgba(46, 222, 166, 0.13);
        }

        .connected-info {
          flex: 1;
          min-width: 0;
        }

        .connected-info h3 {
          margin: 0 0 5px;

          color: #dfe9f2;

          font-size: 13px;
          font-weight: 750;
        }

        .connected-info p {
          margin: 0;

          color: #708098;

          font-size: 11.5px;

          line-height: 1.55;
        }

        .security-row {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;

          margin-top: 12px;
        }

        .security-row span {
          display: inline-flex;
          align-items: center;
          gap: 5px;

          color: #73849a;

          font-size: 9px;
          font-weight: 650;
        }

        .security-row svg {
          color: #4fdbb0;
        }

        .disconnect-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;

          min-height: 38px;

          padding: 0 13px;

          border-radius: 10px;

          color: #e38a9a;

          background:
            rgba(232, 91, 112, 0.06);

          border:
            1px solid
            rgba(232, 91, 112, 0.11);

          cursor: pointer;

          font-size: 10px;
          font-weight: 700;

          transition:
            background 0.2s ease,
            transform 0.2s ease;
        }

        .disconnect-button:hover {
          background:
            rgba(232, 91, 112, 0.12);

          transform: translateY(-1px);
        }

        /* Login Form */

        .connection-form {
          position: relative;

          z-index: 2;

          padding: 23px 26px 25px;
        }

        .form-intro {
          display: flex;
          align-items: center;
          gap: 11px;

          margin-bottom: 18px;
        }

        .form-intro-icon {
          width: 34px;
          height: 34px;

          display: grid;
          place-items: center;

          border-radius: 10px;

          color:
            color-mix(
              in srgb,
              var(--platform-color) 75%,
              white
            );

          background:
            color-mix(
              in srgb,
              var(--platform-color) 10%,
              transparent
            );
        }

        .form-intro h3 {
          margin: 0 0 3px;

          color: #dce5f1;

          font-size: 12px;
          font-weight: 750;
        }

        .form-intro p {
          margin: 0;

          color: #687890;

          font-size: 10.5px;
        }

        /* Fields */

        .fields-grid {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));

          gap: 14px;
        }

        .field {
          min-width: 0;
        }

        .field label {
          display: block;

          margin-bottom: 7px;

          color: #8997ad;

          font-size: 10px;
          font-weight: 700;
        }

        .input-wrap {
          position: relative;
        }

        .input-icon {
          position: absolute;

          left: 13px;
          top: 50%;

          transform: translateY(-50%);

          color: #687790;

          font-size: 13px;
          font-weight: 700;

          pointer-events: none;
        }

        .lucide-input-icon {
          position: absolute;

          left: 12px;
          top: 50%;

          transform: translateY(-50%);

          color: #687790;

          pointer-events: none;
        }

        .input-wrap input,
        .code-field input {
          width: 100%;

          height: 43px;

          padding:
            0 13px
            0 38px;

          outline: none;

          border-radius: 11px;

          color: #e7edf7;

          background:
            rgba(255, 255, 255, 0.035);

          border:
            1px solid
            rgba(255, 255, 255, 0.07);

          font-size: 11.5px;

          transition:
            border-color 0.2s ease,
            background 0.2s ease,
            box-shadow 0.2s ease;
        }

        .input-wrap input::placeholder,
        .code-field input::placeholder {
          color: #4f5d72;
        }

        .input-wrap input:focus,
        .code-field input:focus {
          border-color:
            color-mix(
              in srgb,
              var(--platform-color) 50%,
              #ffffff
            );

          background:
            rgba(255, 255, 255, 0.05);

          box-shadow:
            0 0 0 3px
              color-mix(
                in srgb,
                var(--platform-color) 10%,
                transparent
              );
        }

        .input-wrap input:disabled,
        .code-field input:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        /* Footer */

        .form-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 15px;

          margin-top: 18px;
        }

        .secure-text {
          display: flex;
          align-items: center;
          gap: 6px;

          color: #607089;

          font-size: 9.5px;
        }

        .secure-text svg {
          color: #4bdbb0;
        }

        .connect-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;

          min-height: 41px;

          padding: 0 15px;

          border-radius: 11px;

          color: white;

          background:
            linear-gradient(
              135deg,
              color-mix(
                in srgb,
                var(--platform-color) 90%,
                white
              ),
              var(--platform-color)
            );

          box-shadow:
            0 10px 25px
              color-mix(
                in srgb,
                var(--platform-color) 22%,
                transparent
              );

          cursor: pointer;

          font-size: 10.5px;
          font-weight: 750;

          transition:
            transform 0.2s ease,
            filter 0.2s ease,
            box-shadow 0.2s ease;
        }

        .connect-button:hover:not(:disabled) {
          transform: translateY(-1px);

          filter: brightness(1.08);

          box-shadow:
            0 14px 32px
              color-mix(
                in srgb,
                var(--platform-color) 30%,
                transparent
              );
        }

        .connect-button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        /* Verification */

        .verification-form {
          position: relative;

          z-index: 2;

          display: grid;
          grid-template-columns:
            minmax(0, 1fr)
            auto;

          gap: 25px;

          align-items: center;

          padding: 24px 26px;
        }

        .verification-left {
          display: flex;
          align-items: center;
          gap: 13px;
        }

        .verification-icon {
          width: 45px;
          height: 45px;

          flex: 0 0 auto;

          display: grid;
          place-items: center;

          border-radius: 14px;

          color:
            color-mix(
              in srgb,
              var(--platform-color) 70%,
              white
            );

          background:
            color-mix(
              in srgb,
              var(--platform-color) 10%,
              transparent
            );

          border:
            1px solid
            color-mix(
              in srgb,
              var(--platform-color) 13%,
              transparent
            );
        }

        .verification-left h3 {
          margin: 0 0 5px;

          color: #dce6f4;

          font-size: 13px;
          font-weight: 750;
        }

        .verification-left p {
          margin: 0;

          max-width: 390px;

          color: #6d7c93;

          font-size: 10.5px;

          line-height: 1.55;
        }

        .verification-right {
          display: flex;
          flex-direction: column;
          gap: 10px;

          min-width: 280px;
        }

        .code-field input {
          height: 48px;

          padding: 0 14px;

          text-align: center;

          letter-spacing: 0.34em;

          font-family:
            "SFMono-Regular",
            Consolas,
            monospace;

          font-size: 18px;
          font-weight: 700;
        }

        .verification-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
        }

        .back-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;

          min-height: 40px;

          padding: 0 12px;

          border-radius: 10px;

          color: #91a0b7;

          background:
            rgba(255, 255, 255, 0.035);

          border:
            1px solid
            rgba(255, 255, 255, 0.06);

          cursor: pointer;

          font-size: 10px;
          font-weight: 700;

          transition:
            background 0.2s ease,
            color 0.2s ease;
        }

        .back-button:hover:not(:disabled) {
          color: #ffffff;

          background:
            rgba(255, 255, 255, 0.07);
        }

        .back-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Messages */

        .message {
          position: relative;

          z-index: 2;

          display: flex;
          align-items: center;
          gap: 9px;

          margin:
            0 26px
            22px;

          padding: 10px 12px;

          border-radius: 10px;

          font-size: 10.5px;

          line-height: 1.5;
        }

        .success-message {
          color: #74dfbd;

          background:
            rgba(54, 219, 164, 0.06);

          border:
            1px solid
            rgba(54, 219, 164, 0.11);
        }

        .error-message {
          color: #ef8f9f;

          background:
            rgba(235, 89, 111, 0.06);

          border:
            1px solid
            rgba(235, 89, 111, 0.12);
        }

        /* Bottom */

        .bottom-info {
          display: flex;
          align-items: center;
          gap: 11px;

          margin-top: 38px;

          padding: 15px 17px;

          border-radius: 14px;

          background:
            rgba(255, 255, 255, 0.018);

          border:
            1px solid
            rgba(255, 255, 255, 0.045);
        }

        .bottom-info-icon {
          width: 33px;
          height: 33px;

          flex: 0 0 auto;

          display: grid;
          place-items: center;

          border-radius: 9px;

          color: #5ad9b5;

          background:
            rgba(49, 215, 161, 0.07);
        }

        .bottom-info p {
          margin: 0;

          flex: 1;

          color: #63728a;

          font-size: 10px;

          line-height: 1.55;
        }

        .bottom-info strong {
          color: #a9b6c9;
        }

        .bottom-status {
          display: flex;
          align-items: center;
          gap: 7px;

          color: #5b6a81;

          white-space: nowrap;

          font-size: 9px;
          font-weight: 700;
        }

        .status-pulse {
          width: 6px;
          height: 6px;

          border-radius: 50%;

          background: #3ee0a8;

          box-shadow:
            0 0 0 4px
              rgba(62, 224, 168, 0.08);
        }

        /* Animation */

        .spin {
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }

        /* Responsive */

        @media (max-width: 800px) {
          .top-nav {
            padding: 0 18px;
          }

          .nav-center {
            display: none;
          }

          .connect-container {
            width: min(
              calc(100% - 28px),
              1120px
            );

            padding-top: 48px;
          }

          .hero-section {
            margin-bottom: 38px;
          }

          .hero-section h1 {
            font-size: 44px;
          }

          .hero-stats {
            width: 100%;

            flex-direction: column;
            align-items: stretch;
          }

          .hero-stat {
            padding: 9px 4px;
          }

          .hero-stat-divider {
            width: 100%;
            height: 1px;

            margin: 6px 0;
          }

          .security-banner {
            align-items: flex-start;

            flex-wrap: wrap;
          }

          .security-pills {
            width: 100%;

            margin-left: 62px;
          }

          .fields-grid {
            grid-template-columns: 1fr;
          }

          .verification-form {
            grid-template-columns: 1fr;
          }

          .verification-right {
            min-width: 0;
          }

          .verification-actions {
            justify-content: flex-start;
          }
        }

        @media (max-width: 580px) {
          .top-nav {
            height: 65px;
          }

          .all-agents-link span {
            display: none;
          }

          .platform-header {
            align-items: flex-start;
            flex-direction: column;

            padding: 20px;
          }

          .connection-status {
            width: 100%;
            justify-content: center;
          }

          .card-divider {
            margin: 0 20px;
          }

          .connection-form {
            padding: 20px;
          }

          .form-footer {
            align-items: stretch;
            flex-direction: column;
          }

          .secure-text {
            justify-content: center;
          }

          .connect-button {
            width: 100%;
          }

          .connected-body {
            align-items: flex-start;
            flex-direction: column;

            padding: 20px;
          }

          .disconnect-button {
            width: 100%;
          }

          .verification-form {
            padding: 20px;
          }

          .verification-left {
            align-items: flex-start;
          }

          .verification-actions {
            flex-direction: column-reverse;
          }

          .back-button {
            width: 100%;
          }

          .section-heading {
            align-items: flex-start;
            flex-direction: column;
            gap: 12px;
          }

          .security-banner {
            padding: 17px;
          }

          .security-pills {
            margin-left: 0;

            flex-wrap: wrap;
          }

          .bottom-info {
            align-items: flex-start;
          }

          .bottom-status {
            display: none;
          }
        }
      `}</style>
    </>
  );
}