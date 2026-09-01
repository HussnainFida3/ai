"use client";

import { HeartHandshake, Bell, CircleHelp, Settings, ChevronDown } from "lucide-react";

export function Topbar({
  greeting = "Welcome back, Admin",
  subtitle = "Here's what's happening with your AI Agents today.",
}: {
  greeting?: string;
  subtitle?: string;
}) {
  return (
    <header className="dc-topbar">
      <div>
        <h1 className="dc-greeting">
          {greeting} <span className="dc-wave">👋</span>
        </h1>
        <p className="dc-subtitle">{subtitle}</p>
      </div>

      <div className="dc-topbar-actions">
        <button type="button" className="dc-cc-pill">
          <HeartHandshake size={16} />
          Command Centre
        </button>

        <button type="button" className="dc-icon-btn" aria-label="Notifications">
          <Bell size={18} />
          <span className="dc-badge">8</span>
        </button>

        <button type="button" className="dc-icon-btn" aria-label="Help">
          <CircleHelp size={18} />
        </button>

        <button type="button" className="dc-icon-btn" aria-label="Settings">
          <Settings size={18} />
        </button>

        <button type="button" className="dc-profile">
          <span className="dc-avatar">AU</span>
          <span className="dc-profile-text">
            <span className="dc-profile-name">Admin User</span>
            <span className="dc-profile-role">Super Admin</span>
          </span>
          <ChevronDown size={16} className="dc-profile-chevron" />
        </button>
      </div>
    </header>
  );
}
