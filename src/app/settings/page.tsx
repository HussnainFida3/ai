"use client";

import { useState } from "react";
import {
  Bell,
  Shield,
  Mail,
  Monitor,
  Moon,
  Globe2,
  Database,
  Lock,
  Save,
  Check,
  User,
  RefreshCw,
  CircleHelp,
  Laptop,
} from "lucide-react";

import { AppShell } from "@/components/dashboard/AppShell";

type ToggleProps = {
  checked: boolean;
  onChange: () => void;
  label: string;
  description: string;
  icon: React.ElementType;
  iconColor: string;
};

function SettingToggle({
  checked,
  onChange,
  label,
  description,
  icon: Icon,
  iconColor,
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
        className={`settings-toggle ${checked ? "is-on" : ""}`}
      >
        <span className="settings-toggle-thumb" />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    dashboardNotifications: true,
    emailReports: true,
    securityAlerts: true,
    desktopNotifications: false,

    autoRefresh: true,
    darkMode: true,
    publicAnalytics: false,
    dataBackup: true,

    twoFactor: true,
    loginAlerts: true,
    systemUpdates: true,
    maintenanceAlerts: false,
  });

  const [saved, setSaved] = useState(false);

  function toggle(key: keyof typeof settings) {
    setSettings((previous) => ({
      ...previous,
      [key]: !previous[key],
    }));

    setSaved(false);
  }

  function handleSave() {
    setSaved(true);

    setTimeout(() => {
      setSaved(false);
    }, 2500);
  }

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
                Manage your dashboard preferences, notifications, security,
                integrations, and system behavior.
              </p>
            </div>

            <button
              type="button"
              className={`settings-save-button ${
                saved ? "is-saved" : ""
              }`}
              onClick={handleSave}
            >
              {saved ? (
                <>
                  <Check size={18} />
                  Changes Saved
                </>
              ) : (
                <>
                  <Save size={18} />
                  Save Changes
                </>
              )}
            </button>
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
                    <p>Manage your administrator profile and account preferences.</p>
                  </div>
                </div>

                <div className="settings-card-body">
                  <div className="settings-profile">
                    <div className="settings-avatar">
                      <span>GA</span>
                    </div>

                    <div className="settings-profile-info">
                      <div className="settings-profile-name">
                        GhrFix Administrator
                      </div>

                      <div className="settings-profile-email">
                        admin@ghrfix.com
                      </div>
                    </div>

                    <button
                      type="button"
                      className="settings-secondary-button"
                    >
                      Edit Profile
                    </button>
                  </div>

                  <div className="settings-divider" />

                  <div className="settings-info-grid">
                    <div className="settings-info-box">
                      <span className="settings-info-label">ROLE</span>
                      <span className="settings-info-value">Super Admin</span>
                    </div>

                    <div className="settings-info-box">
                      <span className="settings-info-label">
                        LAST LOGIN
                      </span>
                      <span className="settings-info-value">
                        Today, 10:42 AM
                      </span>
                    </div>

                    <div className="settings-info-box">
                      <span className="settings-info-label">
                        ACCOUNT STATUS
                      </span>

                      <span className="settings-status-active">
                        <span />
                        Active
                      </span>
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
                      Choose how the platform should notify you about important
                      activity.
                    </p>
                  </div>
                </div>

                <div className="settings-card-body settings-list">
                  <SettingToggle
                    checked={settings.dashboardNotifications}
                    onChange={() => toggle("dashboardNotifications")}
                    label="Dashboard Notifications"
                    description="Receive notifications for important platform activity."
                    icon={Bell}
                    iconColor="#f59e0b"
                  />

                  <SettingToggle
                    checked={settings.emailReports}
                    onChange={() => toggle("emailReports")}
                    label="Email Reports"
                    description="Receive scheduled reports and performance summaries."
                    icon={Mail}
                    iconColor="#38bdf8"
                  />

                  <SettingToggle
                    checked={settings.desktopNotifications}
                    onChange={() => toggle("desktopNotifications")}
                    label="Desktop Notifications"
                    description="Show notifications while the command center is open."
                    icon={Monitor}
                    iconColor="#8b5cf6"
                  />

                  <SettingToggle
                    checked={settings.maintenanceAlerts}
                    onChange={() => toggle("maintenanceAlerts")}
                    label="Maintenance Alerts"
                    description="Get notified before scheduled system maintenance."
                    icon={CircleHelp}
                    iconColor="#f97316"
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
                    <p>Control security preferences for your administrator account.</p>
                  </div>
                </div>

                <div className="settings-card-body settings-list">
                  <SettingToggle
                    checked={settings.twoFactor}
                    onChange={() => toggle("twoFactor")}
                    label="Two-Factor Authentication"
                    description="Require additional verification when signing in."
                    icon={Lock}
                    iconColor="#22c55e"
                  />

                  <SettingToggle
                    checked={settings.loginAlerts}
                    onChange={() => toggle("loginAlerts")}
                    label="Login Alerts"
                    description="Receive an alert when your account is accessed."
                    icon={Shield}
                    iconColor="#38bdf8"
                  />

                  <div className="settings-action-row">
                    <div className="settings-row-icon static-icon">
                      <Lock size={19} />
                    </div>

                    <div className="settings-row-content">
                      <div className="settings-row-title">Password</div>

                      <div className="settings-row-description">
                        Last changed approximately 32 days ago.
                      </div>
                    </div>

                    <button
                      type="button"
                      className="settings-secondary-button"
                    >
                      Change Password
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
                    <p>Customize how your command center behaves.</p>
                  </div>
                </div>

                <div className="settings-card-body settings-list">
                  <SettingToggle
                    checked={settings.autoRefresh}
                    onChange={() => toggle("autoRefresh")}
                    label="Automatic Dashboard Refresh"
                    description="Automatically refresh dashboard data in the background."
                    icon={RefreshCw}
                    iconColor="#38bdf8"
                  />

                  <SettingToggle
                    checked={settings.darkMode}
                    onChange={() => toggle("darkMode")}
                    label="Dark Interface"
                    description="Use the dark command center appearance."
                    icon={Moon}
                    iconColor="#8b5cf6"
                  />

                  <SettingToggle
                    checked={settings.publicAnalytics}
                    onChange={() => toggle("publicAnalytics")}
                    label="Anonymous Usage Analytics"
                    description="Help improve the platform with anonymous usage data."
                    icon={Globe2}
                    iconColor="#ec4899"
                  />

                  <SettingToggle
                    checked={settings.systemUpdates}
                    onChange={() => toggle("systemUpdates")}
                    label="System Update Notifications"
                    description="Receive information about important platform updates."
                    icon={Laptop}
                    iconColor="#22c55e"
                  />

                  <SettingToggle
                    checked={settings.dataBackup}
                    onChange={() => toggle("dataBackup")}
                    label="Automatic Data Backup"
                    description="Keep important platform configuration data protected."
                    icon={Database}
                    iconColor="#f59e0b"
                  />
                </div>
              </section>
            </div>

            {/* RIGHT COLUMN */}

            <aside className="settings-side-column">
              <section className="settings-health-card">
                <div className="settings-health-top">
                  <div className="settings-health-icon">
                    <Shield size={25} />
                  </div>

                  <div className="settings-health-label">
                    <span />
                    SYSTEM HEALTHY
                  </div>
                </div>

                <h3>Everything is running smoothly.</h3>

                <p>
                  Your command center is configured correctly and all core
                  services are currently operational.
                </p>

                <div className="settings-health-divider" />

                <div className="settings-service-list">
                  <div className="settings-service">
                    <span>Platform Services</span>

                    <strong>
                      <i />
                      Operational
                    </strong>
                  </div>

                  <div className="settings-service">
                    <span>AI Services</span>

                    <strong>
                      <i />
                      Operational
                    </strong>
                  </div>

                  <div className="settings-service">
                    <span>Data Systems</span>

                    <strong>
                      <i />
                      Operational
                    </strong>
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
                    Contact your system administrator if you need assistance
                    with these settings.
                  </p>

                  <button type="button">Contact Support →</button>
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

          .settings-save-button {
            flex: 0 0 auto;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 9px;
            min-width: 154px;
            height: 48px;
            padding: 0 20px;
            border: 1px solid rgba(96, 165, 250, 0.4);
            border-radius: 13px;
            color: white;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
            background:
              linear-gradient(135deg, #0ea5e9, #2563eb 55%, #4f46e5);
            box-shadow:
              0 12px 28px rgba(37, 99, 235, 0.2),
              inset 0 1px rgba(255, 255, 255, 0.12);
            transition:
              transform 0.2s ease,
              box-shadow 0.2s ease,
              opacity 0.2s ease;
          }

          .settings-save-button:hover {
            transform: translateY(-2px);
            box-shadow:
              0 18px 35px rgba(37, 99, 235, 0.3),
              inset 0 1px rgba(255, 255, 255, 0.14);
          }

          .settings-save-button.is-saved {
            background: linear-gradient(135deg, #059669, #16a34a);
            border-color: rgba(34, 197, 94, 0.45);
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
            min-height: 36px;
            padding: 0 14px;
            border-radius: 10px;
            border: 1px solid #2b405c;
            background: rgba(30, 41, 59, 0.7);
            color: #b9c8da;
            font-size: 12px;
            font-weight: 650;
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

          .settings-divider {
            height: 1px;
            width: 100%;
            background: rgba(51, 65, 85, 0.6);
          }

          .settings-info-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
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

          .settings-info-value {
            display: block;
            color: #d9e4f2;
            font-size: 12px;
            font-weight: 650;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
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
          }

          .settings-health-label {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #77d9a9;
            font-size: 10px;
            font-weight: 800;
            letter-spacing: 0.14em;
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
            color: #78d7a4;
            font-size: 12px;
          }

          .settings-service i {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: #34d399;
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

          .settings-help-card button {
            margin-top: 12px;
            padding: 0;
            border: 0;
            background: transparent;
            color: #60a5fa;
            font-size: 12px;
            font-weight: 700;
            cursor: pointer;
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

            .settings-save-button {
              width: 100%;
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

            .settings-profile .settings-secondary-button {
              width: 100%;
              margin-left: 0;
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