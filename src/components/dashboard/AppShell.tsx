import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import "./dashboard.css";

export function AppShell({
  children,
  greeting,
  subtitle,
}: {
  children: ReactNode;
  greeting?: string;
  subtitle?: string;
}) {
  return (
    <div className="dc-shell">
      <Sidebar />
      <div className="dc-main">
        <Topbar greeting={greeting} subtitle={subtitle} />
        <div className="dc-content">{children}</div>
        <footer className="dc-footer">
          <span>AI Agents Command Centre v2.1.0</span>
          <span className="dc-footer-dot">•</span>
          <span className="dc-footer-status">
            All systems operational <span className="dc-dot dc-dot-green dc-dot-sm" />
          </span>
        </footer>
      </div>
    </div>
  );
}
