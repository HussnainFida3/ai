"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowUpRight,
  BadgeCheck,
  Ban,
  Bot,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  Clock3,
  Download,
  Eye,
  FileClock,
  Filter,
  KeyRound,
  ListFilter,
  Lock,
  Monitor,
  MoreHorizontal,
  RefreshCw,
  Search,
  Settings2,
  Shield,
  ShieldAlert,
  SlidersHorizontal,
  Trash2,
  User,
  UserCheck,
  UserCog,
  Users,
  XCircle,
} from "lucide-react";

import { AppShell } from "@/components/dashboard/AppShell";

type AuditStatus = "Success" | "Warning" | "Failed" | "Info";
type AuditCategory =
  | "Authentication"
  | "Agents"
  | "System"
  | "Users"
  | "Security"
  | "Settings";

type AuditLog = {
  id: string;
  action: string;
  description: string;
  user: string;
  userRole: string;
  category: AuditCategory;
  status: AuditStatus;
  ip: string;
  location: string;
  time: string;
  timestamp: string;
  icon: typeof Activity;
  color: string;
};

const LOGS: AuditLog[] = [
  {
    id: "AUD-20491",
    action: "Agent configuration updated",
    description: "Research Agent model and execution limits were updated.",
    user: "Muhammad Hussnain",
    userRole: "Super Admin",
    category: "Agents",
    status: "Success",
    ip: "192.168.1.24",
    location: "Lahore, PK",
    time: "Just now",
    timestamp: "Aug 31, 2026 • 10:42 PM",
    icon: Bot,
    color: "#8b5cf6",
  },
  {
    id: "AUD-20490",
    action: "Admin signed in",
    description: "Successful administrator authentication from a recognized device.",
    user: "Muhammad Hussnain",
    userRole: "Super Admin",
    category: "Authentication",
    status: "Success",
    ip: "192.168.1.24",
    location: "Lahore, PK",
    time: "2 min ago",
    timestamp: "Aug 31, 2026 • 10:40 PM",
    icon: UserCheck,
    color: "#22c55e",
  },
  {
    id: "AUD-20489",
    action: "API rate limit warning",
    description: "Analytics integration reached 84% of its configured request limit.",
    user: "System",
    userRole: "Automated Event",
    category: "System",
    status: "Warning",
    ip: "Internal",
    location: "Cloud",
    time: "8 min ago",
    timestamp: "Aug 31, 2026 • 10:34 PM",
    icon: CircleAlert,
    color: "#f59e0b",
  },
  {
    id: "AUD-20488",
    action: "User permissions changed",
    description: "Marketing Manager role was granted campaign management access.",
    user: "Sarah Ahmed",
    userRole: "Administrator",
    category: "Users",
    status: "Success",
    ip: "10.0.0.88",
    location: "Karachi, PK",
    time: "14 min ago",
    timestamp: "Aug 31, 2026 • 10:28 PM",
    icon: UserCog,
    color: "#38bdf8",
  },
  {
    id: "AUD-20487",
    action: "Failed login attempt",
    description: "Multiple invalid password attempts were detected for an admin account.",
    user: "Unknown",
    userRole: "Unverified",
    category: "Security",
    status: "Failed",
    ip: "103.27.88.14",
    location: "Unknown",
    time: "21 min ago",
    timestamp: "Aug 31, 2026 • 10:21 PM",
    icon: ShieldAlert,
    color: "#f43f5e",
  },
  {
    id: "AUD-20486",
    action: "System settings updated",
    description: "Default AI execution timeout was changed from 60 seconds to 90 seconds.",
    user: "Muhammad Hussnain",
    userRole: "Super Admin",
    category: "Settings",
    status: "Success",
    ip: "192.168.1.24",
    location: "Lahore, PK",
    time: "34 min ago",
    timestamp: "Aug 31, 2026 • 10:08 PM",
    icon: Settings2,
    color: "#a855f7",
  },
  {
    id: "AUD-20485",
    action: "Security policy triggered",
    description: "Suspicious API token usage was automatically blocked by the security layer.",
    user: "Security Engine",
    userRole: "Automated Event",
    category: "Security",
    status: "Warning",
    ip: "45.81.22.91",
    location: "External",
    time: "41 min ago",
    timestamp: "Aug 31, 2026 • 10:01 PM",
    icon: Lock,
    color: "#f59e0b",
  },
  {
    id: "AUD-20484",
    action: "New workflow created",
    description: "A new automated content generation workflow was created.",
    user: "Ali Raza",
    userRole: "Administrator",
    category: "Agents",
    status: "Success",
    ip: "10.0.0.32",
    location: "Islamabad, PK",
    time: "1 hr ago",
    timestamp: "Aug 31, 2026 • 9:42 PM",
    icon: ClipboardList,
    color: "#8b5cf6",
  },
  {
    id: "AUD-20483",
    action: "Access token revoked",
    description: "An expired integration access token was revoked automatically.",
    user: "System",
    userRole: "Automated Event",
    category: "Security",
    status: "Info",
    ip: "Internal",
    location: "Cloud",
    time: "1 hr ago",
    timestamp: "Aug 31, 2026 • 9:31 PM",
    icon: KeyRound,
    color: "#38bdf8",
  },
  {
    id: "AUD-20482",
    action: "Agent execution failed",
    description: "SEO Agent execution stopped because a required external integration was unavailable.",
    user: "SEO Agent",
    userRole: "AI Agent",
    category: "Agents",
    status: "Failed",
    ip: "Internal",
    location: "Cloud",
    time: "2 hrs ago",
    timestamp: "Aug 31, 2026 • 8:47 PM",
    icon: XCircle,
    color: "#f43f5e",
  },
  {
    id: "AUD-20481",
    action: "New administrator invited",
    description: "An invitation was sent to a new platform administrator.",
    user: "Muhammad Hussnain",
    userRole: "Super Admin",
    category: "Users",
    status: "Info",
    ip: "192.168.1.24",
    location: "Lahore, PK",
    time: "3 hrs ago",
    timestamp: "Aug 31, 2026 • 7:30 PM",
    icon: Users,
    color: "#22d3ee",
  },
];

const STATUS_CONFIG: Record<
  AuditStatus,
  { color: string; bg: string; icon: typeof Check }
> = {
  Success: {
    color: "#22c55e",
    bg: "rgba(34,197,94,.12)",
    icon: Check,
  },
  Warning: {
    color: "#f59e0b",
    bg: "rgba(245,158,11,.12)",
    icon: CircleAlert,
  },
  Failed: {
    color: "#f43f5e",
    bg: "rgba(244,63,94,.12)",
    icon: XCircle,
  },
  Info: {
    color: "#38bdf8",
    bg: "rgba(56,189,248,.12)",
    icon: Activity,
  },
};

const CATEGORIES: AuditCategory[] = [
  "Authentication",
  "Agents",
  "System",
  "Users",
  "Security",
  "Settings",
];

export default function AuditLogsPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<"All" | AuditCategory>("All");
  const [status, setStatus] = useState<"All" | AuditStatus>("All");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();

    return LOGS.filter((log) => {
      const matchesSearch =
        !q ||
        log.action.toLowerCase().includes(q) ||
        log.description.toLowerCase().includes(q) ||
        log.user.toLowerCase().includes(q) ||
        log.id.toLowerCase().includes(q);

      const matchesCategory =
        category === "All" || log.category === category;

      const matchesStatus = status === "All" || log.status === status;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [search, category, status]);

  const totalEvents = LOGS.length;
  const successfulEvents = LOGS.filter((x) => x.status === "Success").length;
  const warnings = LOGS.filter((x) => x.status === "Warning").length;
  const failedEvents = LOGS.filter((x) => x.status === "Failed").length;

  return (
    <AppShell>
      <style jsx>{`
        .audit-page {
          width: 100%;
          min-width: 0;
          color: var(--dc-ink, #f8fafc);
          padding-bottom: 28px;
        }

        .audit-hero {
          position: relative;
          overflow: hidden;
          padding: 22px 24px;
          margin-bottom: 18px;
          border: 1px solid rgba(148, 163, 184, 0.12);
          border-radius: 18px;
          background:
            radial-gradient(
              circle at 0% 0%,
              rgba(56, 189, 248, 0.11),
              transparent 34%
            ),
            radial-gradient(
              circle at 100% 100%,
              rgba(139, 92, 246, 0.1),
              transparent 34%
            ),
            rgba(15, 23, 42, 0.46);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.04),
            0 18px 50px rgba(0, 0, 0, 0.12);
        }

        .audit-hero::after {
          content: "";
          position: absolute;
          width: 420px;
          height: 420px;
          right: -170px;
          top: -250px;
          border-radius: 50%;
          border: 1px solid rgba(56, 189, 248, 0.08);
          box-shadow:
            0 0 0 48px rgba(56, 189, 248, 0.025),
            0 0 0 96px rgba(56, 189, 248, 0.018);
          pointer-events: none;
        }

        .audit-hero-inner {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          flex-wrap: wrap;
        }

        .audit-breadcrumb {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: var(--dc-ink-faint, #64748b);
          margin-bottom: 10px;
        }

        .audit-title-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .audit-title-icon {
          width: 43px;
          height: 43px;
          display: grid;
          place-items: center;
          border-radius: 13px;
          background:
            linear-gradient(
              135deg,
              rgba(56, 189, 248, 0.2),
              rgba(139, 92, 246, 0.14)
            );
          border: 1px solid rgba(56, 189, 248, 0.2);
          color: #38bdf8;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.1),
            0 8px 24px rgba(56, 189, 248, 0.08);
        }

        .audit-title {
          margin: 0;
          font-size: clamp(21px, 2.1vw, 29px);
          line-height: 1;
          letter-spacing: -0.035em;
          font-weight: 800;
        }

        .audit-subtitle {
          margin: 9px 0 0 55px;
          max-width: 680px;
          color: var(--dc-ink-soft, #94a3b8);
          font-size: 12.5px;
          line-height: 1.65;
        }

        .audit-live {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 9px 12px;
          border-radius: 12px;
          background: rgba(34, 197, 94, 0.07);
          border: 1px solid rgba(34, 197, 94, 0.13);
          color: #86efac;
          font-size: 11px;
          font-weight: 700;
          white-space: nowrap;
        }

        .audit-live-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.1);
          animation: auditPulse 2s infinite;
        }

        @keyframes auditPulse {
          0%,
          100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.22);
            opacity: 0.72;
          }
        }

        .audit-actions {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .audit-action {
          height: 38px;
          padding: 0 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          border-radius: 10px;
          border: 1px solid rgba(148, 163, 184, 0.14);
          background: rgba(15, 23, 42, 0.5);
          color: var(--dc-ink-soft, #cbd5e1);
          cursor: pointer;
          font-size: 11px;
          font-weight: 700;
          transition:
            transform 0.18s ease,
            background 0.18s ease,
            border-color 0.18s ease;
        }

        .audit-action:hover {
          transform: translateY(-1px);
          background: rgba(30, 41, 59, 0.75);
          border-color: rgba(56, 189, 248, 0.28);
        }

        .audit-action.primary {
          color: #07111d;
          border-color: rgba(56, 189, 248, 0.45);
          background: linear-gradient(135deg, #38bdf8, #22d3ee);
          box-shadow: 0 8px 20px rgba(34, 211, 238, 0.15);
        }

        .audit-action.primary:hover {
          background: linear-gradient(135deg, #67d3ff, #4ce8f5);
        }

        .audit-stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 18px;
        }

        .audit-stat {
          position: relative;
          overflow: hidden;
          min-height: 112px;
          padding: 17px;
          border-radius: 15px;
          border: 1px solid rgba(148, 163, 184, 0.1);
          background: rgba(15, 23, 42, 0.46);
          transition:
            transform 0.2s ease,
            border-color 0.2s ease,
            background 0.2s ease;
        }

        .audit-stat:hover {
          transform: translateY(-2px);
          background: rgba(20, 31, 51, 0.64);
          border-color: rgba(148, 163, 184, 0.18);
        }

        .audit-stat-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .audit-stat-label {
          color: var(--dc-ink-faint, #64748b);
          font-size: 10px;
          letter-spacing: 0.08em;
          font-weight: 800;
        }

        .audit-stat-icon {
          width: 31px;
          height: 31px;
          border-radius: 9px;
          display: grid;
          place-items: center;
        }

        .audit-stat-value {
          margin-top: 13px;
          font-size: 25px;
          line-height: 1;
          letter-spacing: -0.035em;
          font-weight: 800;
        }

        .audit-stat-foot {
          margin-top: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--dc-ink-soft, #94a3b8);
          font-size: 10.5px;
        }

        .audit-stat-line {
          position: absolute;
          left: 17px;
          bottom: 0;
          width: calc(100% - 34px);
          height: 2px;
          border-radius: 999px;
          opacity: 0.7;
        }

        .audit-toolbar {
          padding: 13px;
          margin-bottom: 14px;
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          border-radius: 15px;
          border: 1px solid rgba(148, 163, 184, 0.1);
          background: rgba(15, 23, 42, 0.42);
        }

        .audit-search {
          min-width: min(100%, 280px);
          flex: 1 1 300px;
          height: 40px;
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 0 12px;
          border-radius: 10px;
          border: 1px solid rgba(148, 163, 184, 0.12);
          background: rgba(2, 6, 23, 0.34);
          color: var(--dc-ink-soft, #94a3b8);
        }

        .audit-search:focus-within {
          border-color: rgba(56, 189, 248, 0.45);
          box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.07);
        }

        .audit-search input {
          min-width: 0;
          width: 100%;
          background: transparent;
          border: none;
          outline: none;
          color: var(--dc-ink, #f8fafc);
          font-size: 12px;
        }

        .audit-search input::placeholder {
          color: #64748b;
        }

        .audit-filter-btn {
          height: 40px;
          padding: 0 12px;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          border-radius: 10px;
          border: 1px solid rgba(148, 163, 184, 0.12);
          background: rgba(2, 6, 23, 0.28);
          color: var(--dc-ink-soft, #94a3b8);
          cursor: pointer;
          font-size: 11px;
          font-weight: 700;
          transition: 0.18s ease;
        }

        .audit-filter-btn:hover,
        .audit-filter-btn.active {
          border-color: rgba(56, 189, 248, 0.3);
          background: rgba(56, 189, 248, 0.07);
          color: #7dd3fc;
        }

        .audit-filter-panel {
          width: 100%;
          display: grid;
          grid-template-columns: repeat(2, minmax(180px, 240px));
          gap: 10px;
          padding-top: 2px;
        }

        .audit-select-wrap {
          position: relative;
        }

        .audit-select-wrap select {
          width: 100%;
          height: 40px;
          appearance: none;
          padding: 0 35px 0 12px;
          border-radius: 10px;
          border: 1px solid rgba(148, 163, 184, 0.12);
          outline: none;
          background: rgba(2, 6, 23, 0.28);
          color: var(--dc-ink-soft, #cbd5e1);
          font-size: 11px;
          cursor: pointer;
        }

        .audit-select-wrap svg {
          pointer-events: none;
          position: absolute;
          right: 11px;
          top: 50%;
          transform: translateY(-50%);
          color: #64748b;
        }

        .audit-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 290px;
          gap: 14px;
          align-items: start;
        }

        .audit-card {
          border-radius: 16px;
          border: 1px solid rgba(148, 163, 184, 0.1);
          background: rgba(15, 23, 42, 0.44);
          overflow: hidden;
        }

        .audit-card-head {
          min-height: 58px;
          padding: 0 17px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.08);
        }

        .audit-card-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          letter-spacing: 0.075em;
          font-weight: 800;
          color: var(--dc-ink-soft, #cbd5e1);
        }

        .audit-card-meta {
          color: var(--dc-ink-faint, #64748b);
          font-size: 10px;
        }

        .audit-table-wrap {
          overflow-x: auto;
        }

        .audit-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 780px;
        }

        .audit-table th {
          height: 42px;
          padding: 0 17px;
          text-align: left;
          color: #64748b;
          font-size: 9.5px;
          font-weight: 800;
          letter-spacing: 0.08em;
          border-bottom: 1px solid rgba(148, 163, 184, 0.07);
          background: rgba(2, 6, 23, 0.14);
        }

        .audit-table td {
          padding: 13px 17px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.06);
          vertical-align: middle;
        }

        .audit-table tr:last-child td {
          border-bottom: none;
        }

        .audit-table tbody tr {
          transition: background 0.16s ease;
        }

        .audit-table tbody tr:hover {
          background: rgba(56, 189, 248, 0.035);
        }

        .audit-event {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 230px;
        }

        .audit-event-icon {
          flex: 0 0 auto;
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.04);
        }

        .audit-event-title {
          color: var(--dc-ink, #f8fafc);
          font-size: 11.5px;
          font-weight: 700;
          line-height: 1.35;
        }

        .audit-event-desc {
          margin-top: 3px;
          max-width: 270px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: var(--dc-ink-faint, #64748b);
          font-size: 10px;
        }

        .audit-user {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 135px;
        }

        .audit-avatar {
          width: 29px;
          height: 29px;
          border-radius: 9px;
          display: grid;
          place-items: center;
          background: rgba(56, 189, 248, 0.08);
          border: 1px solid rgba(56, 189, 248, 0.12);
          color: #7dd3fc;
        }

        .audit-user-name {
          color: var(--dc-ink-soft, #cbd5e1);
          font-size: 10.5px;
          font-weight: 700;
        }

        .audit-user-role {
          margin-top: 2px;
          color: #64748b;
          font-size: 9.5px;
        }

        .audit-category {
          display: inline-flex;
          align-items: center;
          min-height: 25px;
          padding: 0 8px;
          border-radius: 7px;
          background: rgba(148, 163, 184, 0.06);
          border: 1px solid rgba(148, 163, 184, 0.08);
          color: #94a3b8;
          font-size: 9.5px;
          font-weight: 700;
        }

        .audit-status {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          min-height: 25px;
          padding: 0 8px;
          border-radius: 999px;
          font-size: 9.5px;
          font-weight: 800;
        }

        .audit-time {
          min-width: 85px;
        }

        .audit-time-main {
          color: var(--dc-ink-soft, #cbd5e1);
          font-size: 10.5px;
          font-weight: 600;
        }

        .audit-time-sub {
          margin-top: 3px;
          color: #64748b;
          font-size: 9px;
        }

        .audit-view-btn {
          width: 31px;
          height: 31px;
          display: grid;
          place-items: center;
          border-radius: 8px;
          border: 1px solid transparent;
          background: transparent;
          color: #64748b;
          cursor: pointer;
          transition: 0.18s ease;
        }

        .audit-view-btn:hover {
          color: #7dd3fc;
          border-color: rgba(56, 189, 248, 0.2);
          background: rgba(56, 189, 248, 0.06);
        }

        .audit-pagination {
          min-height: 55px;
          padding: 0 17px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          border-top: 1px solid rgba(148, 163, 184, 0.07);
        }

        .audit-pagination-info {
          color: #64748b;
          font-size: 10px;
        }

        .audit-pages {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .audit-page-btn {
          width: 29px;
          height: 29px;
          display: grid;
          place-items: center;
          border-radius: 8px;
          border: 1px solid rgba(148, 163, 184, 0.08);
          background: rgba(2, 6, 23, 0.18);
          color: #64748b;
          cursor: pointer;
          font-size: 10px;
          transition: 0.18s ease;
        }

        .audit-page-btn:hover,
        .audit-page-btn.active {
          color: #e0f2fe;
          background: rgba(56, 189, 248, 0.1);
          border-color: rgba(56, 189, 248, 0.22);
        }

        .audit-side {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .audit-side-body {
          padding: 15px;
        }

        .audit-health {
          display: flex;
          flex-direction: column;
          gap: 13px;
        }

        .audit-health-item {
          padding: 12px;
          border-radius: 11px;
          background: rgba(2, 6, 23, 0.18);
          border: 1px solid rgba(148, 163, 184, 0.06);
        }

        .audit-health-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 9px;
        }

        .audit-health-label {
          display: flex;
          align-items: center;
          gap: 7px;
          color: #94a3b8;
          font-size: 10.5px;
          font-weight: 700;
        }

        .audit-health-value {
          color: #e2e8f0;
          font-size: 10px;
          font-weight: 800;
        }

        .audit-progress {
          height: 5px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(148, 163, 184, 0.08);
        }

        .audit-progress > span {
          display: block;
          height: 100%;
          border-radius: inherit;
        }

        .audit-security-score {
          position: relative;
          padding: 17px;
          overflow: hidden;
          border-radius: 13px;
          background:
            radial-gradient(
              circle at 100% 0%,
              rgba(34, 197, 94, 0.12),
              transparent 45%
            ),
            rgba(2, 6, 23, 0.24);
          border: 1px solid rgba(34, 197, 94, 0.1);
        }

        .audit-security-score-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .audit-score-label {
          color: #94a3b8;
          font-size: 10px;
          font-weight: 700;
        }

        .audit-score {
          margin-top: 10px;
          display: flex;
          align-items: baseline;
          gap: 5px;
        }

        .audit-score strong {
          font-size: 32px;
          line-height: 1;
          letter-spacing: -0.04em;
          color: #86efac;
        }

        .audit-score span {
          color: #64748b;
          font-size: 10px;
        }

        .audit-score-text {
          margin-top: 8px;
          color: #94a3b8;
          font-size: 10px;
          line-height: 1.55;
        }

        .audit-recent-list {
          display: flex;
          flex-direction: column;
        }

        .audit-mini-log {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          padding: 12px 0;
          border-bottom: 1px solid rgba(148, 163, 184, 0.06);
        }

        .audit-mini-log:first-child {
          padding-top: 0;
        }

        .audit-mini-log:last-child {
          padding-bottom: 0;
          border-bottom: none;
        }

        .audit-mini-icon {
          width: 29px;
          height: 29px;
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          border-radius: 8px;
        }

        .audit-mini-title {
          color: #cbd5e1;
          font-size: 10px;
          font-weight: 700;
          line-height: 1.4;
        }

        .audit-mini-time {
          margin-top: 3px;
          color: #64748b;
          font-size: 9px;
        }

        .audit-empty {
          padding: 55px 20px;
          text-align: center;
        }

        .audit-empty-icon {
          width: 48px;
          height: 48px;
          margin: 0 auto 12px;
          display: grid;
          place-items: center;
          border-radius: 14px;
          background: rgba(56, 189, 248, 0.07);
          color: #38bdf8;
        }

        .audit-empty-title {
          color: #cbd5e1;
          font-size: 13px;
          font-weight: 800;
        }

        .audit-empty-text {
          margin-top: 6px;
          color: #64748b;
          font-size: 10.5px;
        }

        .audit-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 100;
          display: grid;
          place-items: center;
          padding: 20px;
          background: rgba(2, 6, 23, 0.72);
          backdrop-filter: blur(8px);
        }

        .audit-modal {
          width: min(100%, 590px);
          max-height: min(760px, 90vh);
          overflow: auto;
          border-radius: 18px;
          border: 1px solid rgba(148, 163, 184, 0.14);
          background: #0f172a;
          box-shadow: 0 35px 100px rgba(0, 0, 0, 0.55);
        }

        .audit-modal-head {
          padding: 17px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(148, 163, 184, 0.08);
        }

        .audit-modal-title {
          display: flex;
          align-items: center;
          gap: 9px;
          color: #e2e8f0;
          font-size: 13px;
          font-weight: 800;
        }

        .audit-close {
          width: 31px;
          height: 31px;
          display: grid;
          place-items: center;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: #64748b;
          cursor: pointer;
        }

        .audit-close:hover {
          color: #f8fafc;
          background: rgba(148, 163, 184, 0.08);
        }

        .audit-modal-body {
          padding: 18px;
        }

        .audit-modal-event {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding-bottom: 17px;
          margin-bottom: 17px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.08);
        }

        .audit-modal-event-icon {
          width: 44px;
          height: 44px;
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          border-radius: 13px;
        }

        .audit-modal-event-title {
          color: #f1f5f9;
          font-size: 15px;
          font-weight: 800;
        }

        .audit-modal-event-desc {
          margin-top: 6px;
          color: #94a3b8;
          font-size: 11px;
          line-height: 1.6;
        }

        .audit-details {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .audit-detail {
          padding: 11px;
          border-radius: 10px;
          background: rgba(2, 6, 23, 0.22);
          border: 1px solid rgba(148, 163, 184, 0.06);
        }

        .audit-detail-label {
          color: #64748b;
          font-size: 9px;
          letter-spacing: 0.07em;
          font-weight: 800;
        }

        .audit-detail-value {
          margin-top: 6px;
          color: #cbd5e1;
          font-size: 10.5px;
          font-weight: 600;
          word-break: break-word;
        }

        @media (max-width: 1200px) {
          .audit-layout {
            grid-template-columns: minmax(0, 1fr);
          }

          .audit-side {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 850px) {
          .audit-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .audit-side {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 600px) {
          .audit-hero {
            padding: 18px;
          }

          .audit-actions {
            width: 100%;
          }

          .audit-action {
            flex: 1;
          }

          .audit-subtitle {
            margin-left: 0;
          }

          .audit-stats {
            grid-template-columns: 1fr;
          }

          .audit-filter-panel {
            grid-template-columns: 1fr;
          }

          .audit-pagination {
            align-items: flex-start;
            flex-direction: column;
            padding: 13px 17px;
          }

          .audit-details {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <main className="audit-page">
        {/* HERO */}
        <section className="audit-hero">
          <div className="audit-hero-inner">
            <div>
              <div className="audit-breadcrumb">
                <span>System</span>
                <ChevronRight size={12} />
                <span>Security</span>
                <ChevronRight size={12} />
                <span style={{ color: "#38bdf8" }}>Audit Logs</span>
              </div>

              <div className="audit-title-row">
                <div className="audit-title-icon">
                  <FileClock size={21} />
                </div>

                <div>
                  <h1 className="audit-title">Audit Logs</h1>
                </div>
              </div>

              <p className="audit-subtitle">
                Monitor every important action across your AI platform.
                Track administrator activity, security events, system changes,
                agent operations and platform access in one complete timeline.
              </p>
            </div>

            <div>
              <div className="audit-live">
                <span className="audit-live-dot" />
                Live event monitoring enabled
              </div>

              <div className="audit-actions" style={{ marginTop: 10 }}>
                <button className="audit-action" type="button">
                  <RefreshCw size={14} />
                  Refresh
                </button>

                <button className="audit-action primary" type="button">
                  <ArrowDownToLine size={14} />
                  Export Logs
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* STATISTICS */}
        <section className="audit-stats">
          <div className="audit-stat">
            <div className="audit-stat-head">
              <span className="audit-stat-label">TOTAL EVENTS</span>
              <span
                className="audit-stat-icon"
                style={{ background: "rgba(56,189,248,.12)", color: "#38bdf8" }}
              >
                <Activity size={16} />
              </span>
            </div>

            <div className="audit-stat-value">{totalEvents.toLocaleString()}</div>

            <div className="audit-stat-foot">
              <ArrowUpRight size={11} color="#22c55e" />
              All recorded events today
            </div>

            <div
              className="audit-stat-line"
              style={{
                background:
                  "linear-gradient(90deg,#38bdf8,rgba(56,189,248,.08))",
              }}
            />
          </div>

          <div className="audit-stat">
            <div className="audit-stat-head">
              <span className="audit-stat-label">SUCCESSFUL ACTIONS</span>
              <span
                className="audit-stat-icon"
                style={{ background: "rgba(34,197,94,.12)", color: "#22c55e" }}
              >
                <BadgeCheck size={16} />
              </span>
            </div>

            <div className="audit-stat-value">{successfulEvents}</div>

            <div className="audit-stat-foot">
              <Check size={11} color="#22c55e" />
              Platform operations completed
            </div>

            <div
              className="audit-stat-line"
              style={{
                background:
                  "linear-gradient(90deg,#22c55e,rgba(34,197,94,.08))",
              }}
            />
          </div>

          <div className="audit-stat">
            <div className="audit-stat-head">
              <span className="audit-stat-label">WARNINGS</span>
              <span
                className="audit-stat-icon"
                style={{ background: "rgba(245,158,11,.12)", color: "#f59e0b" }}
              >
                <CircleAlert size={16} />
              </span>
            </div>

            <div className="audit-stat-value">{warnings}</div>

            <div className="audit-stat-foot">
              <Shield size={11} color="#f59e0b" />
              Events requiring attention
            </div>

            <div
              className="audit-stat-line"
              style={{
                background:
                  "linear-gradient(90deg,#f59e0b,rgba(245,158,11,.08))",
              }}
            />
          </div>

          <div className="audit-stat">
            <div className="audit-stat-head">
              <span className="audit-stat-label">FAILED EVENTS</span>
              <span
                className="audit-stat-icon"
                style={{ background: "rgba(244,63,94,.12)", color: "#f43f5e" }}
              >
                <Ban size={16} />
              </span>
            </div>

            <div className="audit-stat-value">{failedEvents}</div>

            <div className="audit-stat-foot">
              <ShieldAlert size={11} color="#f43f5e" />
              Security and execution failures
            </div>

            <div
              className="audit-stat-line"
              style={{
                background:
                  "linear-gradient(90deg,#f43f5e,rgba(244,63,94,.08))",
              }}
            />
          </div>
        </section>

        {/* TOOLBAR */}
        <section className="audit-toolbar">
          <div className="audit-search">
            <Search size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search audit logs, users, actions or event IDs..."
            />
          </div>

          <button
            type="button"
            className={`audit-filter-btn ${showFilters ? "active" : ""}`}
            onClick={() => setShowFilters((v) => !v)}
          >
            <SlidersHorizontal size={14} />
            Advanced Filters
          </button>

          <button
            type="button"
            className="audit-filter-btn"
            onClick={() => {
              setSearch("");
              setCategory("All");
              setStatus("All");
            }}
          >
            <RefreshCw size={14} />
            Reset
          </button>

          {showFilters && (
            <div className="audit-filter-panel">
              <div className="audit-select-wrap">
                <select
                  value={category}
                  onChange={(e) =>
                    setCategory(e.target.value as "All" | AuditCategory)
                  }
                >
                  <option value="All">All Categories</option>

                  {CATEGORIES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>

                <ChevronRight size={13} />
              </div>

              <div className="audit-select-wrap">
                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as "All" | AuditStatus)
                  }
                >
                  <option value="All">All Statuses</option>
                  <option value="Success">Success</option>
                  <option value="Warning">Warning</option>
                  <option value="Failed">Failed</option>
                  <option value="Info">Info</option>
                </select>

                <ChevronRight size={13} />
              </div>
            </div>
          )}
        </section>

        <section className="audit-layout">
          {/* MAIN LOG TABLE */}
          <div className="audit-card">
            <div className="audit-card-head">
              <div className="audit-card-title">
                <ListFilter size={15} color="#38bdf8" />
                ACTIVITY TIMELINE
              </div>

              <div className="audit-card-meta">
                Showing {filteredLogs.length} of {LOGS.length} events
              </div>
            </div>

            {filteredLogs.length > 0 ? (
              <>
                <div className="audit-table-wrap">
                  <table className="audit-table">
                    <thead>
                      <tr>
                        <th>EVENT</th>
                        <th>USER</th>
                        <th>CATEGORY</th>
                        <th>STATUS</th>
                        <th>TIME</th>
                        <th />
                      </tr>
                    </thead>

                    <tbody>
                      {filteredLogs.map((log) => {
                        const Icon = log.icon;
                        const statusConfig = STATUS_CONFIG[log.status];
                        const StatusIcon = statusConfig.icon;

                        return (
                          <tr key={log.id}>
                            <td>
                              <div className="audit-event">
                                <span
                                  className="audit-event-icon"
                                  style={{
                                    background: `${log.color}16`,
                                    color: log.color,
                                  }}
                                >
                                  <Icon size={16} />
                                </span>

                                <div>
                                  <div className="audit-event-title">
                                    {log.action}
                                  </div>

                                  <div className="audit-event-desc">
                                    {log.description}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td>
                              <div className="audit-user">
                                <span className="audit-avatar">
                                  <User size={14} />
                                </span>

                                <div>
                                  <div className="audit-user-name">
                                    {log.user}
                                  </div>

                                  <div className="audit-user-role">
                                    {log.userRole}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td>
                              <span className="audit-category">
                                {log.category}
                              </span>
                            </td>

                            <td>
                              <span
                                className="audit-status"
                                style={{
                                  color: statusConfig.color,
                                  background: statusConfig.bg,
                                }}
                              >
                                <StatusIcon size={11} />
                                {log.status}
                              </span>
                            </td>

                            <td>
                              <div className="audit-time">
                                <div className="audit-time-main">
                                  {log.time}
                                </div>

                                <div className="audit-time-sub">
                                  {log.id}
                                </div>
                              </div>
                            </td>

                            <td>
                              <button
                                type="button"
                                className="audit-view-btn"
                                title="View event details"
                                onClick={() => setSelectedLog(log)}
                              >
                                <Eye size={15} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="audit-pagination">
                  <span className="audit-pagination-info">
                    Updated automatically • Last sync a few seconds ago
                  </span>

                  <div className="audit-pages">
                    <button className="audit-page-btn" type="button">
                      <ChevronLeft size={14} />
                    </button>

                    <button
                      className="audit-page-btn active"
                      type="button"
                    >
                      1
                    </button>

                    <button className="audit-page-btn" type="button">
                      2
                    </button>

                    <button className="audit-page-btn" type="button">
                      3
                    </button>

                    <button className="audit-page-btn" type="button">
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="audit-empty">
                <div className="audit-empty-icon">
                  <Search size={20} />
                </div>

                <div className="audit-empty-title">No audit events found</div>

                <div className="audit-empty-text">
                  Try adjusting your search or active filters.
                </div>
              </div>
            )}
          </div>

          {/* RIGHT SIDE */}
          <aside className="audit-side">
            <div className="audit-card">
              <div className="audit-card-head">
                <div className="audit-card-title">
                  <Activity size={15} color="#22c55e" />
                  SYSTEM HEALTH
                </div>
              </div>

              <div className="audit-side-body">
                <div className="audit-health">
                  <div className="audit-health-item">
                    <div className="audit-health-top">
                      <span className="audit-health-label">
                        <Monitor size={13} color="#38bdf8" />
                        Event Pipeline
                      </span>

                      <span className="audit-health-value">99.9%</span>
                    </div>

                    <div className="audit-progress">
                      <span
                        style={{
                          width: "99%",
                          background:
                            "linear-gradient(90deg,#38bdf8,#22d3ee)",
                        }}
                      />
                    </div>
                  </div>

                  <div className="audit-health-item">
                    <div className="audit-health-top">
                      <span className="audit-health-label">
                        <Shield size={13} color="#22c55e" />
                        Security Monitor
                      </span>

                      <span className="audit-health-value">Healthy</span>
                    </div>

                    <div className="audit-progress">
                      <span
                        style={{
                          width: "92%",
                          background:
                            "linear-gradient(90deg,#22c55e,#4ade80)",
                        }}
                      />
                    </div>
                  </div>

                  <div className="audit-health-item">
                    <div className="audit-health-top">
                      <span className="audit-health-label">
                        <Clock3 size={13} color="#8b5cf6" />
                        Log Retention
                      </span>

                      <span className="audit-health-value">87 days</span>
                    </div>

                    <div className="audit-progress">
                      <span
                        style={{
                          width: "72%",
                          background:
                            "linear-gradient(90deg,#8b5cf6,#a855f7)",
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="audit-card">
              <div className="audit-card-head">
                <div className="audit-card-title">
                  <Shield size={15} color="#22c55e" />
                  SECURITY SCORE
                </div>
              </div>

              <div className="audit-side-body">
                <div className="audit-security-score">
                  <div className="audit-security-score-top">
                    <span className="audit-score-label">
                      PLATFORM SECURITY
                    </span>

                    <Shield size={17} color="#22c55e" />
                  </div>

                  <div className="audit-score">
                    <strong>94</strong>
                    <span>/100</span>
                  </div>

                  <div className="audit-score-text">
                    Excellent security posture. No critical threats detected.
                  </div>
                </div>
              </div>
            </div>

            <div className="audit-card">
              <div className="audit-card-head">
                <div className="audit-card-title">
                  <Clock3 size={15} color="#8b5cf6" />
                  RECENT SECURITY EVENTS
                </div>
              </div>

              <div className="audit-side-body">
                <div className="audit-recent-list">
                  {LOGS.filter(
                    (x) =>
                      x.category === "Security" ||
                      x.category === "Authentication"
                  )
                    .slice(0, 4)
                    .map((log) => {
                      const Icon = log.icon;

                      return (
                        <div className="audit-mini-log" key={log.id}>
                          <span
                            className="audit-mini-icon"
                            style={{
                              background: `${log.color}16`,
                              color: log.color,
                            }}
                          >
                            <Icon size={14} />
                          </span>

                          <div>
                            <div className="audit-mini-title">
                              {log.action}
                            </div>

                            <div className="audit-mini-time">
                              {log.time}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </aside>
        </section>
      </main>

      {/* DETAILS MODAL */}
      {selectedLog && (
        <div
          className="audit-modal-backdrop"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="audit-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="audit-modal-head">
              <div className="audit-modal-title">
                <FileClock size={16} color="#38bdf8" />
                Audit Event Details
              </div>

              <button
                className="audit-close"
                type="button"
                onClick={() => setSelectedLog(null)}
              >
                <XCircle size={17} />
              </button>
            </div>

            <div className="audit-modal-body">
              <div className="audit-modal-event">
                <div
                  className="audit-modal-event-icon"
                  style={{
                    background: `${selectedLog.color}16`,
                    color: selectedLog.color,
                  }}
                >
                  <selectedLog.icon size={21} />
                </div>

                <div>
                  <div className="audit-modal-event-title">
                    {selectedLog.action}
                  </div>

                  <div className="audit-modal-event-desc">
                    {selectedLog.description}
                  </div>
                </div>
              </div>

              <div className="audit-details">
                <div className="audit-detail">
                  <div className="audit-detail-label">EVENT ID</div>
                  <div className="audit-detail-value">
                    {selectedLog.id}
                  </div>
                </div>

                <div className="audit-detail">
                  <div className="audit-detail-label">STATUS</div>
                  <div className="audit-detail-value">
                    {selectedLog.status}
                  </div>
                </div>

                <div className="audit-detail">
                  <div className="audit-detail-label">USER</div>
                  <div className="audit-detail-value">
                    {selectedLog.user}
                  </div>
                </div>

                <div className="audit-detail">
                  <div className="audit-detail-label">ROLE</div>
                  <div className="audit-detail-value">
                    {selectedLog.userRole}
                  </div>
                </div>

                <div className="audit-detail">
                  <div className="audit-detail-label">CATEGORY</div>
                  <div className="audit-detail-value">
                    {selectedLog.category}
                  </div>
                </div>

                <div className="audit-detail">
                  <div className="audit-detail-label">TIMESTAMP</div>
                  <div className="audit-detail-value">
                    {selectedLog.timestamp}
                  </div>
                </div>

                <div className="audit-detail">
                  <div className="audit-detail-label">IP ADDRESS</div>
                  <div className="audit-detail-value">
                    {selectedLog.ip}
                  </div>
                </div>

                <div className="audit-detail">
                  <div className="audit-detail-label">LOCATION</div>
                  <div className="audit-detail-value">
                    {selectedLog.location}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}