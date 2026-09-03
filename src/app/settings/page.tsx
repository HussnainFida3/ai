"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Bell,
  Shield,
  Monitor,
  Lock,
  User,
  RefreshCw,
  CircleHelp,
  Laptop,
  LogOut,
  Plug,
} from "lucide-react";

import { AppShell } from "@/components/dashboard/AppShell";
import { PLATFORMS, type PlatformKey } from "@/lib/platforms";
import { ensureConnected, useIsConnected } from "@/lib/api";

/**
 * Both platforms are connected automatically by signing into this console, so
 * there is no "Disconnect" here any more — dropping a session would only be
 * undone on the next page load. This just forces a renewal on demand, which
 * is occasionally useful after a backend restart.
 */
function ReconnectButton({ platform, connected }: { platform: PlatformKey; connected: boolean }) {
  const [busy, setBusy] = useState(false);

  async function renew() {
    setBusy(true);
    try {
      await ensureConnected(platform, true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" className="settings-secondary-button" onClick={renew} disabled={busy}>
      {busy ? "Renewing..." : connected ? "Renew session" : "Reconnect"}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*                          LOCAL, GENUINELY REAL PREFS                       */
/* -------------------------------------------------------------------------- */

// There is no backend for this console's own preferences (only /api/login and
// /api/logout exist server-side — see src/app/api/*). Every toggle below either
// persists a real localStorage preference that actually does something when
// flipped, or was removed rather than left as a fake, inert switch.
const LS_DESKTOP_NOTIFICATIONS = "cc_settings_desktop_notifications";
const LS_HEALTH_AUTO_REFRESH = "cc_settings_health_auto_refresh";
const LS_HEALTH_REFRESH_INTERVAL = "cc_settings_health_refresh_interval";

function readBool(key: string): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(key) === "1";
}
function writeBool(key: string, value: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, value ? "1" : "0");
}

/* -------------------------------------------------------------------------- */
/*                        REAL PLATFORM HEALTH CHECKS                         */
/* -------------------------------------------------------------------------- */

/**
 * GhrFix's `/health/ready` and ShadiLife's `/health` both live at their API's
 * root origin, not under `/api` (confirmed against both backends' source —
 * ShadiLife: `app.get("/health", ...)` in src/app.ts, mounted before the
 * `/api` routers; GhrFix mirrors the same convention). PLATFORMS.*.apiBase
 * already includes the `/api` suffix, so it has to be stripped back off here.
 */
function originOf(apiBase: string): string {
  return apiBase.replace(/\/api\/?$/, "");
}

interface GhrfixHealth {
  status: string;
  checks: { database: "ok" | "down"; redis: "ok" | "down" };
  configured: { email: boolean; storage: boolean; ai: boolean };
}

/** No auth required — this is GhrFix's public readiness probe. */
async function fetchGhrfixHealth(): Promise<GhrfixHealth> {
  let res: Response;
  try {
    res = await fetch(`${originOf(PLATFORMS.ghrfix.apiBase)}/health/ready`);
  } catch {
    throw new Error("GhrFix is unreachable. Is its backend running?");
  }
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.data) throw new Error(`GhrFix's health endpoint returned an error (${res.status}).`);
  return json.data as GhrfixHealth;
}

/**
 * ShadiLife's backend has no `/health/ready` equivalent — reading its source
 * turns up only a bare `app.get("/health", (_req, res) => res.json({ ok: true }))`,
 * with no database/redis breakdown and (confirmed by grepping the backend)
 * no Redis dependency at all. Shown honestly below as a reachability check,
 * not pretended to be as detailed as GhrFix's.
 */
async function fetchShadiLifeHealth(): Promise<{ ok: boolean }> {
  let res: Response;
  try {
    res = await fetch(`${originOf(PLATFORMS.shadilife.apiBase)}/health`);
  } catch {
    throw new Error("ShadiLife is unreachable. Is its backend running?");
  }
  const json = await res.json().catch(() => null);
  if (!res.ok || typeof json?.ok !== "boolean") throw new Error(`ShadiLife's health endpoint returned an error (${res.status}).`);
  return json as { ok: boolean };
}

interface HealthState<T> {
  loading: boolean;
  error: string | null;
  data: T | null;
}

/* -------------------------------------------------------------------------- */
/*                                TOGGLE ROW                                  */
/* -------------------------------------------------------------------------- */

type ToggleProps = {
  checked: boolean;
  onChange: () => void;
  label: string;
  description: string;
  icon: React.ElementType;
  iconColor: string;
  disabled?: boolean;
};

function SettingToggle({
  checked,
  onChange,
  label,
  description,
  icon: Icon,
  iconColor,
  disabled,
}: ToggleProps) {
  return (
    <div className="settings-row">
      <div
        className="settings-row-icon"
        style={{
          color: iconColor,
          background: `${iconColor}14`,
          borderColor: `${iconColor}24`,
        }}
      >
        <Icon size={19} strokeWidth={1.9} />
      </div>

      <div className="settings-row-content">
        <div className="settings-row-title">{label}</div>
        <div className="settings-row-description">{description}</div>
      </div>

      <button
        type="button"
        aria-label={`Toggle ${label}`}
        onClick={onChange}
        disabled={disabled}
        className={`settings-toggle ${checked ? "is-on" : ""}`}
      >
        <span className="settings-toggle-thumb" />
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              CONNECTION PILL                               */
/* -------------------------------------------------------------------------- */

/** Reflects real stored-token state via useIsConnected — never fabricated. */
function ConnectionPill({ connected }: { connected: boolean }) {
  const color = connected ? "#4ade80" : "#8296ac";
  return (
    <span className="settings-status-active" style={{ color }}>
      <span
        style={{
          background: color,
          boxShadow: connected ? "0 0 10px rgba(34, 197, 94, 0.8)" : "none",
        }}
      />
      {connected ? "Connected" : "Not connected"}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*                                 MAIN PAGE                                  */
/* -------------------------------------------------------------------------- */

export default function SettingsPage() {
  // Real, live connection state — flips the instant a session connects,
  // disconnects, or expires (see useIsConnected in src/lib/api.ts).
  const ghrfixConnected = useIsConnected("ghrfix");
  const shadilifeConnected = useIsConnected("shadilife");

  /* ---- Real desktop notification permission (Web Notifications API) ---- */
  const [desktopNotifications, setDesktopNotifications] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | "unsupported">("default");

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setNotifPermission("unsupported");
      return;
    }
    setNotifPermission(Notification.permission);
    // The browser is the source of truth — only trust our stored "on" flag
    // when permission is actually still granted.
    setDesktopNotifications(Notification.permission === "granted" && readBool(LS_DESKTOP_NOTIFICATIONS));
  }, []);

  async function toggleDesktopNotifications() {
    if (notifPermission === "unsupported" || notifPermission === "denied") return;

    if (desktopNotifications) {
      setDesktopNotifications(false);
      writeBool(LS_DESKTOP_NOTIFICATIONS, false);
      return;
    }

    const permission = await Notification.requestPermission();
    setNotifPermission(permission);

    if (permission === "granted") {
      setDesktopNotifications(true);
      writeBool(LS_DESKTOP_NOTIFICATIONS, true);
      new Notification("AI Command Center", {
        body: "Desktop notifications are now enabled for this browser.",
      });
    } else {
      setDesktopNotifications(false);
      writeBool(LS_DESKTOP_NOTIFICATIONS, false);
    }
  }

  /* ---- Real health-check auto-refresh preference ---- */
  const [healthAutoRefresh, setHealthAutoRefreshState] = useState(false);
  const [healthInterval, setHealthIntervalState] = useState(60);

  useEffect(() => {
    setHealthAutoRefreshState(readBool(LS_HEALTH_AUTO_REFRESH));
    const stored = window.localStorage.getItem(LS_HEALTH_REFRESH_INTERVAL);
    if (stored && !Number.isNaN(Number(stored))) setHealthIntervalState(Number(stored));
  }, []);

  function toggleHealthAutoRefresh() {
    setHealthAutoRefreshState((prev) => {
      const next = !prev;
      writeBool(LS_HEALTH_AUTO_REFRESH, next);
      return next;
    });
  }

  function changeHealthInterval(seconds: number) {
    setHealthIntervalState(seconds);
    if (typeof window !== "undefined") window.localStorage.setItem(LS_HEALTH_REFRESH_INTERVAL, String(seconds));
  }

  /* ---- Real platform health, pulled from each backend's own endpoint ---- */
  const [ghrfixHealth, setGhrfixHealth] = useState<HealthState<GhrfixHealth>>({ loading: true, error: null, data: null });
  const [shadilifeHealth, setShadilifeHealth] = useState<HealthState<{ ok: boolean }>>({ loading: true, error: null, data: null });
  const [healthCheckedAt, setHealthCheckedAt] = useState<Date | null>(null);

  const runHealthChecks = useCallback(() => {
    setGhrfixHealth((s) => ({ ...s, loading: true }));
    setShadilifeHealth((s) => ({ ...s, loading: true }));

    fetchGhrfixHealth()
      .then((data) => setGhrfixHealth({ loading: false, error: null, data }))
      .catch((err: unknown) =>
        setGhrfixHealth({ loading: false, error: err instanceof Error ? err.message : "GhrFix is unreachable.", data: null }),
      );

    fetchShadiLifeHealth()
      .then((data) => setShadilifeHealth({ loading: false, error: null, data }))
      .catch((err: unknown) =>
        setShadilifeHealth({ loading: false, error: err instanceof Error ? err.message : "ShadiLife is unreachable.", data: null }),
      );

    setHealthCheckedAt(new Date());
  }, []);

  useEffect(() => {
    runHealthChecks();
    // Only ever run once on mount — auto-refresh is handled by the interval
    // effect below so this doesn't need runHealthChecks in its deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!healthAutoRefresh) return;
    const id = setInterval(runHealthChecks, healthInterval * 1000);
    return () => clearInterval(id);
  }, [healthAutoRefresh, healthInterval, runHealthChecks]);

  /* ---- Sign out of the command center's own shared login (real, working /api/logout) ---- */
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await fetch("/api/logout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  }

  /* ---- Derived, honest health summary — nothing here is invented ---- */
  const ghrfixReady = ghrfixHealth.data?.status === "ready";
  const shadilifeReachable = shadilifeHealth.data?.ok === true;
  const bothChecked = !ghrfixHealth.loading && !shadilifeHealth.loading;

  const overall: "loading" | "ok" | "degraded" | "down" = !bothChecked
    ? "loading"
    : ghrfixReady && shadilifeReachable
      ? "ok"
      : ghrfixReady || shadilifeReachable
        ? "degraded"
        : "down";

  const overallColor =
    overall === "ok" ? "#34d399" : overall === "degraded" ? "#f59e0b" : overall === "down" ? "#f87171" : "#60a5fa";

  const overallLabel =
    overall === "ok"
      ? "ALL SYSTEMS OPERATIONAL"
      : overall === "degraded"
        ? "PARTIAL OUTAGE"
        : overall === "down"
          ? "SYSTEMS UNREACHABLE"
          : "CHECKING…";

  const overallHeadline =
    overall === "ok"
      ? "Both platforms are healthy."
      : overall === "degraded"
        ? "One platform needs attention."
        : overall === "down"
          ? "Both platforms are unreachable."
          : "Checking platform health…";

  const ghrfixMissingConfig = ghrfixHealth.data
    ? Object.entries(ghrfixHealth.data.configured)
        .filter(([, configured]) => !configured)
        .map(([key]) => key)
    : [];

  const anyHealthLoading = ghrfixHealth.loading || shadilifeHealth.loading;

  return (
    <AppShell>
      <main className="settings-page">
        <div className="settings-container">
          {/* HEADER */}

          <section className="settings-header">
            <div>
              <div className="settings-eyebrow">
                <span className="settings-eyebrow-dot" />
                SYSTEM PREFERENCES
              </div>

              <h1>Settings</h1>

              <p>
                Manage notifications, security, and system behavior for the AI
                Command Center.
              </p>
            </div>
          </section>

          <div className="settings-layout">
            {/* LEFT CONTENT */}

            <div className="settings-main-column">
              {/* ACCOUNT */}

              <section className="settings-card">
                <div className="settings-card-header">
                  <div className="settings-section-icon account-icon">
                    <User size={21} />
                  </div>

                  <div>
                    <h2>Account</h2>
                    <p>
                      This command center uses a single shared administrator
                      login, separate from each platform&apos;s own connection
                      below.
                    </p>
                  </div>
                </div>

                <div className="settings-card-body">
                  <div className="settings-profile">
                    <div className="settings-avatar">
                      <User size={20} />
                    </div>

                    <div className="settings-profile-info">
                      <div className="settings-profile-name">
                        Command Center Administrator
                      </div>

                      <div className="settings-profile-email">
                        Single shared login &mdash; no per-user accounts exist
                      </div>
                    </div>
                  </div>

                  <div className="settings-divider" />

                  <div className="settings-info-grid">
                    <div className="settings-info-box">
                      <span className="settings-info-label">
                        GHRFIX SESSION
                      </span>
                      <ConnectionPill connected={ghrfixConnected} />
                    </div>

                    <div className="settings-info-box">
                      <span className="settings-info-label">
                        SHADILIFE SESSION
                      </span>
                      <ConnectionPill connected={shadilifeConnected} />
                    </div>
                  </div>
                </div>
              </section>

              {/* NOTIFICATIONS */}

              <section className="settings-card">
                <div className="settings-card-header">
                  <div className="settings-section-icon notification-icon">
                    <Bell size={21} />
                  </div>

                  <div>
                    <h2>Notifications</h2>
                    <p>
                      Control how this browser can notify you while using the
                      command center.
                    </p>
                  </div>
                </div>

                <div className="settings-card-body settings-list">
                  <SettingToggle
                    checked={desktopNotifications}
                    onChange={toggleDesktopNotifications}
                    label="Browser Notification Permission"
                    description={
                      notifPermission === "unsupported"
                        ? "This browser doesn't support the Notifications API."
                        : notifPermission === "denied"
                          ? "Blocked in your browser's site settings — allow notifications for this site to enable it here."
                          : "Grants this browser permission to show desktop alerts, and sends one confirmation notification immediately so you can verify it works."
                    }
                    icon={Monitor}
                    iconColor="#8b5cf6"
                    disabled={notifPermission === "unsupported" || notifPermission === "denied"}
                  />
                </div>
              </section>

              {/* SECURITY */}

              <section className="settings-card">
                <div className="settings-card-header">
                  <div className="settings-section-icon security-icon">
                    <Shield size={21} />
                  </div>

                  <div>
                    <h2>Security</h2>
                    <p>
                      Manage each platform&apos;s connection, and sign out of
                      this shared login.
                    </p>
                  </div>
                </div>

                <div className="settings-card-body settings-list">
                  <div className="settings-action-row">
                    <div
                      className="settings-row-icon"
                      style={{
                        color: PLATFORMS.ghrfix.color,
                        background: `${PLATFORMS.ghrfix.color}14`,
                        borderColor: `${PLATFORMS.ghrfix.color}24`,
                      }}
                    >
                      <Plug size={19} />
                    </div>

                    <div className="settings-row-content">
                      <div className="settings-row-title">GhrFix</div>

                      <div className="settings-row-description">
                        {ghrfixConnected
                          ? "Connected — agents can call GhrFix's API on your behalf."
                          : "Reconnecting automatically — the console re-establishes this on its own."}
                      </div>
                    </div>

                    <ReconnectButton platform="ghrfix" connected={ghrfixConnected} />
                  </div>

                  <div className="settings-action-row">
                    <div
                      className="settings-row-icon"
                      style={{
                        color: PLATFORMS.shadilife.color,
                        background: `${PLATFORMS.shadilife.color}14`,
                        borderColor: `${PLATFORMS.shadilife.color}24`,
                      }}
                    >
                      <Plug size={19} />
                    </div>

                    <div className="settings-row-content">
                      <div className="settings-row-title">ShadiLife</div>

                      <div className="settings-row-description">
                        {shadilifeConnected
                          ? "Connected — agents can call ShadiLife's API on your behalf."
                          : "Not connected — ShadiLife's 2FA means it needs authorising once."}
                      </div>
                    </div>

                    <ReconnectButton platform="shadilife" connected={shadilifeConnected} />
                  </div>

                  <div className="settings-action-row">
                    <div className="settings-row-icon static-icon">
                      <Lock size={19} />
                    </div>

                    <div className="settings-row-content">
                      <div className="settings-row-title">
                        Command Center Password
                      </div>

                      <div className="settings-row-description">
                        Set via the server&apos;s COMMAND_CENTER_PASSWORD
                        environment variable &mdash; there&apos;s no
                        self-service change from this UI.
                      </div>
                    </div>
                  </div>

                  <div className="settings-action-row">
                    <div className="settings-row-icon static-icon">
                      <LogOut size={19} />
                    </div>

                    <div className="settings-row-content">
                      <div className="settings-row-title">
                        This Browser&apos;s Session
                      </div>

                      <div className="settings-row-description">
                        Sign out of the shared administrator login on this
                        device.
                      </div>
                    </div>

                    <button
                      type="button"
                      className="settings-secondary-button"
                      onClick={handleSignOut}
                      disabled={signingOut}
                    >
                      {signingOut ? "Signing out…" : "Sign Out"}
                    </button>
                  </div>
                </div>
              </section>

              {/* SYSTEM */}

              <section className="settings-card">
                <div className="settings-card-header">
                  <div className="settings-section-icon system-icon">
                    <Monitor size={21} />
                  </div>

                  <div>
                    <h2>System Preferences</h2>
                    <p>Control the live health checks shown on this page.</p>
                  </div>
                </div>

                <div className="settings-card-body settings-list">
                  <SettingToggle
                    checked={healthAutoRefresh}
                    onChange={toggleHealthAutoRefresh}
                    label="Auto-Refresh Platform Health"
                    description={`Automatically re-run the GhrFix and ShadiLife health checks every ${
                      healthInterval < 60 ? `${healthInterval}s` : `${healthInterval / 60} min`
                    } while this page stays open.`}
                    icon={RefreshCw}
                    iconColor="#38bdf8"
                  />

                  <div className="settings-action-row">
                    <div className="settings-row-icon static-icon">
                      <Laptop size={19} />
                    </div>

                    <div className="settings-row-content">
                      <div className="settings-row-title">
                        Refresh Interval
                      </div>

                      <div className="settings-row-description">
                        How often auto-refresh re-checks platform health.
                      </div>
                    </div>

                    <select
                      className="settings-select"
                      value={healthInterval}
                      disabled={!healthAutoRefresh}
                      onChange={(e) => changeHealthInterval(Number(e.target.value))}
                    >
                      <option value={15}>Every 15s</option>
                      <option value={30}>Every 30s</option>
                      <option value={60}>Every 1 min</option>
                      <option value={300}>Every 5 min</option>
                    </select>
                  </div>
                </div>
              </section>
            </div>

            {/* RIGHT COLUMN */}

            <aside className="settings-side-column">
              <section
                className="settings-health-card"
                style={{ borderColor: `${overallColor}38` }}
              >
                <div className="settings-health-top">
                  <div
                    className="settings-health-icon"
                    style={{
                      color: overallColor,
                      background: `${overallColor}1A`,
                      borderColor: `${overallColor}30`,
                    }}
                  >
                    <Shield size={25} />
                  </div>

                  <div className="settings-health-label" style={{ color: overallColor }}>
                    <span
                      style={{
                        background: overallColor,
                        boxShadow: `0 0 12px ${overallColor}CC`,
                      }}
                    />
                    {overallLabel}
                  </div>
                </div>

                <h3>{overallHeadline}</h3>

                <p>
                  Live status pulled from each platform&apos;s own health
                  endpoint &mdash; not a hardcoded claim.
                </p>

                <div className="settings-health-meta">
                  <span>
                    {healthCheckedAt ? `Checked ${healthCheckedAt.toLocaleTimeString()}` : "Checking…"}
                  </span>

                  <button
                    type="button"
                    className="settings-health-refresh"
                    onClick={runHealthChecks}
                    disabled={anyHealthLoading}
                  >
                    <RefreshCw size={12} className={anyHealthLoading ? "spin" : undefined} />
                    Refresh
                  </button>
                </div>

                <div className="settings-health-divider" />

                <div className="settings-service-list">
                  <div>
                    <div className="settings-service">
                      <span>GhrFix</span>

                      <strong
                        style={{
                          color: ghrfixHealth.loading ? "#8296ac" : ghrfixReady ? "#78d7a4" : "#f87171",
                        }}
                      >
                        <i
                          style={{
                            background: ghrfixHealth.loading ? "#64748b" : ghrfixReady ? "#34d399" : "#f87171",
                          }}
                        />
                        {ghrfixHealth.loading
                          ? "Checking…"
                          : ghrfixHealth.data
                            ? ghrfixReady
                              ? "Ready"
                              : "Not ready"
                            : "Unreachable"}
                      </strong>
                    </div>

                    <div className="settings-service-detail">
                      {ghrfixHealth.error
                        ? ghrfixHealth.error
                        : ghrfixHealth.data
                          ? `Database ${ghrfixHealth.data.checks.database === "ok" ? "OK" : "down"} · Redis ${
                              ghrfixHealth.data.checks.redis === "ok" ? "OK" : "down"
                            }${
                              ghrfixMissingConfig.length > 0
                                ? ` · Not configured: ${ghrfixMissingConfig.join(", ")}`
                                : " · Email, storage, AI all configured"
                            }`
                          : "Waiting for a response…"}
                    </div>
                  </div>

                  <div>
                    <div className="settings-service">
                      <span>ShadiLife</span>

                      <strong
                        style={{
                          color: shadilifeHealth.loading ? "#8296ac" : shadilifeReachable ? "#78d7a4" : "#f87171",
                        }}
                      >
                        <i
                          style={{
                            background: shadilifeHealth.loading ? "#64748b" : shadilifeReachable ? "#34d399" : "#f87171",
                          }}
                        />
                        {shadilifeHealth.loading ? "Checking…" : shadilifeHealth.data ? "Reachable" : "Unreachable"}
                      </strong>
                    </div>

                    <div className="settings-service-detail">
                      {shadilifeHealth.error ??
                        "Reachability only — this platform doesn't expose a database/redis breakdown here."}
                    </div>
                  </div>
                </div>
              </section>

              <section className="settings-help-card">
                <div className="settings-help-icon">
                  <CircleHelp size={23} />
                </div>

                <div>
                  <h3>Need help?</h3>

                  <p>
                    This command center&apos;s source and configuration live
                    in its GitHub repository.
                  </p>

                  <a
                    href="https://github.com/HussnainFida3/ai"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View Repository &rarr;
                  </a>
                </div>
              </section>
            </aside>
          </div>
        </div>

        <style>{`
          .settings-page {
            width: 100%;
            min-height: 100%;
            padding: 34px 36px 60px;
            color: #edf4ff;
            box-sizing: border-box;
          }

          .settings-page *,
          .settings-page *::before,
          .settings-page *::after {
            box-sizing: border-box;
          }

          .settings-container {
            width: 100%;
            max-width: 1440px;
            margin: 0 auto;
          }

          /* HEADER */

          .settings-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 24px;
            margin-bottom: 28px;
          }

          .settings-eyebrow {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #60a5fa;
            font-size: 10px;
            font-weight: 800;
            letter-spacing: 0.16em;
            margin-bottom: 9px;
          }

          .settings-eyebrow-dot {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background: #38bdf8;
            box-shadow: 0 0 12px rgba(56, 189, 248, 0.8);
          }

          .settings-header h1 {
            margin: 0;
            color: #f8fbff;
            font-size: clamp(28px, 3vw, 36px);
            line-height: 1.1;
            letter-spacing: -0.035em;
            font-weight: 800;
          }

          .settings-header p {
            margin: 10px 0 0;
            max-width: 760px;
            color: #8fa2bd;
            font-size: 15px;
            line-height: 1.65;
          }

          /* LAYOUT */

          .settings-layout {
            display: grid;
            grid-template-columns: minmax(0, 1fr) 390px;
            gap: 28px;
            align-items: start;
          }

          .settings-main-column,
          .settings-side-column {
            min-width: 0;
          }

          .settings-main-column {
            display: flex;
            flex-direction: column;
            gap: 22px;
          }

          .settings-side-column {
            display: flex;
            flex-direction: column;
            gap: 20px;
            position: sticky;
            top: 20px;
          }

          /* CARD */

          .settings-card {
            width: 100%;
            overflow: hidden;
            border-radius: 20px;
            border: 1px solid #213148;
            background:
              linear-gradient(
                145deg,
                rgba(24, 35, 52, 0.98),
                rgba(15, 24, 37, 0.98)
              );
            box-shadow:
              0 20px 55px rgba(0, 0, 0, 0.15),
              inset 0 1px rgba(255, 255, 255, 0.025);
          }

          .settings-card-header {
            display: flex;
            align-items: flex-start;
            gap: 14px;
            padding: 24px 28px;
            border-bottom: 1px solid rgba(51, 65, 85, 0.58);
          }

          .settings-section-icon {
            flex: 0 0 auto;
            width: 44px;
            height: 44px;
            display: grid;
            place-items: center;
            border-radius: 13px;
          }

          .account-icon {
            color: #38bdf8;
            background: rgba(56, 189, 248, 0.1);
            border: 1px solid rgba(56, 189, 248, 0.18);
          }

          .notification-icon {
            color: #f59e0b;
            background: rgba(245, 158, 11, 0.1);
            border: 1px solid rgba(245, 158, 11, 0.18);
          }

          .security-icon {
            color: #22c55e;
            background: rgba(34, 197, 94, 0.1);
            border: 1px solid rgba(34, 197, 94, 0.18);
          }

          .system-icon {
            color: #8b5cf6;
            background: rgba(139, 92, 246, 0.1);
            border: 1px solid rgba(139, 92, 246, 0.18);
          }

          .settings-card-header h2 {
            margin: 2px 0 5px;
            font-size: 20px;
            line-height: 1.2;
            color: #f1f5f9;
            font-weight: 750;
          }

          .settings-card-header p {
            margin: 0;
            color: #91a1b8;
            font-size: 13.5px;
            line-height: 1.55;
          }

          .settings-card-body {
            width: 100%;
            padding: 10px 28px;
          }

          /* PROFILE */

          .settings-profile {
            display: flex;
            align-items: center;
            gap: 14px;
            min-height: 88px;
          }

          .settings-avatar {
            width: 48px;
            height: 48px;
            flex: 0 0 auto;
            display: grid;
            place-items: center;
            border-radius: 15px;
            color: white;
            font-weight: 800;
            font-size: 14px;
            background:
              linear-gradient(135deg, #0ea5e9, #2563eb, #4f46e5);
            border: 1px solid rgba(147, 197, 253, 0.3);
            box-shadow: 0 10px 25px rgba(37, 99, 235, 0.22);
          }

          .settings-profile-info {
            min-width: 0;
          }

          .settings-profile-name {
            color: #edf4ff;
            font-size: 14px;
            font-weight: 700;
            margin-bottom: 4px;
          }

          .settings-profile-email {
            color: #7f92ac;
            font-size: 12.5px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .settings-secondary-button {
            margin-left: auto;
            flex: 0 0 auto;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-height: 36px;
            padding: 0 14px;
            border-radius: 10px;
            border: 1px solid #2b405c;
            background: rgba(30, 41, 59, 0.7);
            color: #b9c8da;
            font-size: 12px;
            font-weight: 650;
            text-decoration: none;
            cursor: pointer;
            transition:
              border-color 0.2s ease,
              background 0.2s ease,
              color 0.2s ease;
          }

          .settings-secondary-button:hover {
            color: #e7f2ff;
            border-color: #3b82f6;
            background: rgba(37, 99, 235, 0.1);
          }

          .settings-secondary-button:disabled {
            opacity: 0.55;
            cursor: not-allowed;
          }

          .settings-select {
            flex: 0 0 auto;
            min-height: 36px;
            padding: 0 10px;
            border-radius: 10px;
            border: 1px solid #2b405c;
            background: rgba(30, 41, 59, 0.7);
            color: #d9e4f2;
            font-size: 12px;
            font-weight: 650;
            cursor: pointer;
          }

          .settings-select:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .settings-divider {
            height: 1px;
            width: 100%;
            background: rgba(51, 65, 85, 0.6);
          }

          .settings-info-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
            padding: 18px 0;
          }

          .settings-info-box {
            min-width: 0;
            padding: 14px;
            border-radius: 12px;
            background: rgba(7, 14, 25, 0.26);
            border: 1px solid rgba(51, 65, 85, 0.48);
          }

          .settings-info-label {
            display: block;
            color: #657891;
            font-size: 9px;
            letter-spacing: 0.1em;
            font-weight: 800;
            margin-bottom: 8px;
          }

          .settings-status-active {
            display: inline-flex;
            align-items: center;
            gap: 7px;
            color: #4ade80;
            font-size: 12px;
            font-weight: 700;
          }

          .settings-status-active span {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: #22c55e;
            box-shadow: 0 0 10px rgba(34, 197, 94, 0.8);
          }

          /* SETTINGS LIST */

          .settings-list {
            padding-top: 0;
            padding-bottom: 0;
          }

          .settings-row,
          .settings-action-row {
            width: 100%;
            min-height: 84px;
            display: flex;
            align-items: center;
            gap: 14px;
            padding: 16px 0;
            border-bottom: 1px solid rgba(51, 65, 85, 0.48);
          }

          .settings-row:last-child,
          .settings-action-row:last-child {
            border-bottom: 0;
          }

          .settings-row-icon {
            flex: 0 0 auto;
            width: 39px;
            height: 39px;
            display: grid;
            place-items: center;
            border-radius: 11px;
            border: 1px solid;
          }

          .static-icon {
            color: #a78bfa;
            background: rgba(139, 92, 246, 0.1);
            border-color: rgba(139, 92, 246, 0.2);
          }

          .settings-row-content {
            flex: 1 1 auto;
            min-width: 0;
          }

          .settings-row-title {
            color: #e7edf7;
            font-size: 13.5px;
            line-height: 1.35;
            font-weight: 700;
            margin-bottom: 4px;
          }

          .settings-row-description {
            color: #7f91a8;
            font-size: 12px;
            line-height: 1.45;
          }

          /* TOGGLE */

          .settings-toggle {
            flex: 0 0 auto;
            width: 46px;
            height: 25px;
            padding: 3px;
            border-radius: 999px;
            border: 1px solid #314158;
            background: #111c2a;
            cursor: pointer;
            transition:
              background 0.2s ease,
              border-color 0.2s ease;
          }

          .settings-toggle.is-on {
            background: #2563eb;
            border-color: #3b82f6;
          }

          .settings-toggle:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .settings-toggle-thumb {
            display: block;
            width: 17px;
            height: 17px;
            border-radius: 50%;
            background: #eaf2ff;
            box-shadow: 0 2px 7px rgba(0, 0, 0, 0.3);
            transform: translateX(0);
            transition: transform 0.22s ease;
          }

          .settings-toggle.is-on .settings-toggle-thumb {
            transform: translateX(20px);
          }

          /* SYSTEM HEALTH */

          .settings-health-card {
            padding: 26px;
            border-radius: 20px;
            border: 1px solid rgba(34, 197, 94, 0.22);
            background:
              radial-gradient(
                circle at 100% 0%,
                rgba(34, 197, 94, 0.1),
                transparent 42%
              ),
              linear-gradient(
                145deg,
                rgba(14, 37, 34, 0.98),
                rgba(13, 29, 30, 0.98)
              );
            transition: border-color 0.3s ease;
          }

          .settings-health-top {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 14px;
            margin-bottom: 20px;
          }

          .settings-health-icon {
            width: 54px;
            height: 54px;
            display: grid;
            place-items: center;
            border-radius: 16px;
            color: #34d399;
            background: rgba(16, 185, 129, 0.1);
            border: 1px solid rgba(52, 211, 153, 0.18);
            transition:
              color 0.3s ease,
              background 0.3s ease,
              border-color 0.3s ease;
          }

          .settings-health-label {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #77d9a9;
            font-size: 10px;
            font-weight: 800;
            letter-spacing: 0.14em;
            transition: color 0.3s ease;
          }

          .settings-health-label span {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background: #34d399;
            box-shadow: 0 0 12px rgba(52, 211, 153, 0.9);
          }

          .settings-health-card h3 {
            margin: 0 0 10px;
            color: #e8f5ee;
            font-size: 19px;
            line-height: 1.35;
            font-weight: 750;
          }

          .settings-health-card > p {
            margin: 0;
            color: #8da89e;
            font-size: 13px;
            line-height: 1.7;
          }

          .settings-health-meta {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-top: 14px;
            color: #6b8578;
            font-size: 10.5px;
          }

          .settings-health-refresh {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            padding: 5px 9px;
            border-radius: 8px;
            border: 1px solid rgba(52, 211, 153, 0.22);
            background: rgba(52, 211, 153, 0.08);
            color: #6ee7b7;
            font-size: 10px;
            font-weight: 700;
            cursor: pointer;
            transition: background 0.2s ease;
          }

          .settings-health-refresh:hover:not(:disabled) {
            background: rgba(52, 211, 153, 0.14);
          }

          .settings-health-refresh:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .settings-health-divider {
            height: 1px;
            background: rgba(52, 211, 153, 0.15);
            margin: 25px 0 16px;
          }

          .settings-service-list {
            display: flex;
            flex-direction: column;
            gap: 15px;
          }

          .settings-service {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 14px;
            font-size: 12px;
          }

          .settings-service > span {
            color: #8fa49c;
          }

          .settings-service strong {
            display: inline-flex;
            align-items: center;
            gap: 7px;
            font-size: 12px;
          }

          .settings-service i {
            width: 6px;
            height: 6px;
            border-radius: 50%;
          }

          .settings-service-detail {
            margin-top: 6px;
            color: #6b8578;
            font-size: 10px;
            line-height: 1.5;
          }

          /* HELP */

          .settings-help-card {
            display: flex;
            align-items: flex-start;
            gap: 14px;
            padding: 22px;
            border-radius: 18px;
            border: 1px solid #223854;
            background:
              linear-gradient(
                145deg,
                rgba(20, 34, 51, 0.98),
                rgba(15, 27, 42, 0.98)
              );
          }

          .settings-help-icon {
            flex: 0 0 auto;
            width: 45px;
            height: 45px;
            display: grid;
            place-items: center;
            border-radius: 13px;
            color: #38bdf8;
            background: rgba(56, 189, 248, 0.1);
            border: 1px solid rgba(56, 189, 248, 0.16);
          }

          .settings-help-card h3 {
            margin: 0 0 5px;
            color: #e9f1fb;
            font-size: 14px;
            font-weight: 750;
          }

          .settings-help-card p {
            margin: 0;
            color: #8395ad;
            font-size: 12px;
            line-height: 1.6;
          }

          .settings-help-card button,
          .settings-help-card a {
            margin-top: 12px;
            display: inline-block;
            padding: 0;
            border: 0;
            background: transparent;
            color: #60a5fa;
            font-size: 12px;
            font-weight: 700;
            text-decoration: none;
            cursor: pointer;
          }

          .settings-help-card a:hover {
            text-decoration: underline;
          }

          /* ANIMATION */

          .spin {
            animation: settings-spin 0.8s linear infinite;
          }

          @keyframes settings-spin {
            from {
              transform: rotate(0deg);
            }

            to {
              transform: rotate(360deg);
            }
          }

          /* RESPONSIVE */

          @media (max-width: 1250px) {
            .settings-layout {
              grid-template-columns: minmax(0, 1fr) 330px;
            }
          }

          @media (max-width: 1050px) {
            .settings-layout {
              grid-template-columns: 1fr;
            }

            .settings-side-column {
              position: static;
              display: grid;
              grid-template-columns: 1fr 1fr;
              align-items: stretch;
            }
          }

          @media (max-width: 760px) {
            .settings-page {
              padding: 24px 16px 45px;
            }

            .settings-header {
              flex-direction: column;
            }

            .settings-card-header,
            .settings-card-body {
              padding-left: 18px;
              padding-right: 18px;
            }

            .settings-info-grid {
              grid-template-columns: 1fr;
            }

            .settings-side-column {
              grid-template-columns: 1fr;
            }

            .settings-row,
            .settings-action-row {
              gap: 11px;
            }

            .settings-secondary-button {
              padding: 0 10px;
              font-size: 11px;
            }
          }

          @media (max-width: 500px) {
            .settings-header h1 {
              font-size: 29px;
            }

            .settings-card-header {
              padding-top: 20px;
              padding-bottom: 20px;
            }

            .settings-profile {
              flex-wrap: wrap;
              padding: 10px 0;
            }

            .settings-profile-info {
              flex: 1;
            }

            .settings-action-row {
              flex-wrap: wrap;
            }

            .settings-action-row .settings-secondary-button {
              width: 100%;
              margin-left: 0;
            }

            .settings-row-description {
              font-size: 11.5px;
            }
          }
        `}</style>
      </main>
    </AppShell>
  );
}
