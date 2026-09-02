"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Bot,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  Eye,
  FileClock,
  Globe,
  ListFilter,
  Lock,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  SlidersHorizontal,
  TriangleAlert,
  XCircle,
} from "lucide-react";

import { AppShell } from "@/components/dashboard/AppShell";
import { Svg } from "@/components/agents/rich";
import { Icons } from "@/components/agents/icons";
import { PLATFORMS, type PlatformKey } from "@/lib/platforms";
import {
  useAuditLogSnapshot,
  ago,
  dateTime,
  type AuditRow,
  type AuditRowStatus,
} from "@/lib/alerts-data";

const PLATFORM_COLORS: Record<PlatformKey, string> = {
  ghrfix: PLATFORMS.ghrfix.color,
  shadilife: PLATFORMS.shadilife.color,
};

const STATUS_CONFIG: Record<AuditRowStatus, { color: string; bg: string; icon: typeof Check }> = {
  Completed: { color: "#22c55e", bg: "rgba(34,197,94,.12)", icon: Check },
  Accepted: { color: "#22c55e", bg: "rgba(34,197,94,.12)", icon: CheckCircle2 },
  Pending: { color: "#f59e0b", bg: "rgba(245,158,11,.12)", icon: Clock3 },
  Dismissed: { color: "#f43f5e", bg: "rgba(244,63,94,.12)", icon: XCircle },
  Superseded: { color: "#38bdf8", bg: "rgba(56,189,248,.12)", icon: RefreshCw },
};

const SEVERITY_COLOR: Record<string, string> = {
  INFO: "#38bdf8",
  WARNING: "#f59e0b",
  CRITICAL: "#f43f5e",
};

const PAGE_SIZE = 15;

/** A genuine client-side export of the rows currently on screen — same justification as the Credits Usage page: no export endpoint exists on either backend to wire a real one to. */
function exportCsv(rows: AuditRow[]) {
  const header = ["Platform", "Time", "Action", "Category", "Actor", "Status", "Target Type", "Target ID", "Cost USD", "IP Address"];
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = rows.map((r) =>
    [
      r.platformLabel,
      r.createdAt,
      r.action,
      r.category,
      r.actorLabel,
      r.status,
      r.targetType ?? "",
      r.targetId ?? "",
      r.costUsd === null ? "" : r.costUsd.toFixed(4),
      r.ipAddress ?? "",
    ]
      .map((v) => escape(String(v)))
      .join(","),
  );
  const csv = [header.map(escape).join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function AuditLogsPage() {
  const snapshot = useAuditLogSnapshot();

  const [search, setSearch] = useState("");
  const [platform, setPlatform] = useState<"All" | PlatformKey>("All");
  const [category, setCategory] = useState<string>("All");
  const [status, setStatus] = useState<"All" | AuditRowStatus>("All");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRow, setSelectedRow] = useState<AuditRow | null>(null);
  const [page, setPage] = useState(1);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return snapshot.rows.filter((row) => {
      const matchesSearch =
        !q ||
        row.action.toLowerCase().includes(q) ||
        row.actorLabel.toLowerCase().includes(q) ||
        row.rawAction.toLowerCase().includes(q) ||
        (row.targetType ?? "").toLowerCase().includes(q) ||
        (row.targetId ?? "").toLowerCase().includes(q);
      const matchesPlatform = platform === "All" || row.platformKey === platform;
      const matchesCategory = category === "All" || row.category === category;
      const matchesStatus = status === "All" || row.status === status;
      return matchesSearch && matchesPlatform && matchesCategory && matchesStatus;
    });
  }, [snapshot.rows, search, platform, category, status]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages);
  const pageRows = filteredRows.slice((clampedPage - 1) * PAGE_SIZE, clampedPage * PAGE_SIZE);

  // Any filter change invalidates the current page rather than leaving it
  // stranded past the end of a now-shorter real result set.
  useEffect(() => {
    setPage(1);
  }, [search, platform, category, status]);

  const bothFailed = Boolean(snapshot.ghrfixError && snapshot.shadilifeError);
  const oneFailed = !bothFailed && Boolean(snapshot.ghrfixError || snapshot.shadilifeError);

  const stats = [
    {
      label: "EVENTS LOADED",
      value: snapshot.loading ? "—" : snapshot.rows.length.toLocaleString(),
      sub: snapshot.loading ? "Loading…" : `${snapshot.ghrfixCount} GhrFix · ${snapshot.shadilifeCount} ShadiLife`,
      icon: Activity,
      color: "#38bdf8",
    },
    {
      label: "AI AGENT ACTIONS",
      value: snapshot.loading ? "—" : snapshot.agentActionCount.toLocaleString(),
      sub: "Writes and calls made by an AI agent, not a human admin",
      icon: Bot,
      color: "#8b5cf6",
    },
    {
      label: "PENDING AI SUGGESTIONS",
      value: snapshot.loading ? "—" : snapshot.pendingSuggestions.toLocaleString(),
      sub: "Awaiting human review — ShadiLife only",
      icon: Clock3,
      color: "#f59e0b",
    },
    {
      label: "SECURITY EVENTS (24H)",
      value: snapshot.loading ? "—" : snapshot.securityEvents24h.toLocaleString(),
      sub: snapshot.loading ? "Loading…" : `${snapshot.securityEvents7d.toLocaleString()} in the last 7 days · ShadiLife only`,
      icon: ShieldAlert,
      color: "#f43f5e",
    },
  ];

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
            radial-gradient(circle at 0% 0%, rgba(56, 189, 248, 0.11), transparent 34%),
            radial-gradient(circle at 100% 100%, rgba(139, 92, 246, 0.1), transparent 34%),
            rgba(15, 23, 42, 0.46);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04), 0 18px 50px rgba(0, 0, 0, 0.12);
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
          box-shadow: 0 0 0 48px rgba(56, 189, 248, 0.025), 0 0 0 96px rgba(56, 189, 248, 0.018);
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
          background: linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(139, 92, 246, 0.14));
          border: 1px solid rgba(56, 189, 248, 0.2);
          color: #38bdf8;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 8px 24px rgba(56, 189, 248, 0.08);
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
          transition: transform 0.18s ease, background 0.18s ease, border-color 0.18s ease;
        }

        .audit-action:hover {
          transform: translateY(-1px);
          background: rgba(30, 41, 59, 0.75);
          border-color: rgba(56, 189, 248, 0.28);
        }

        .audit-action:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
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

        .audit-error-panel {
          margin-bottom: 18px;
          padding: 20px;
          display: flex;
          gap: 12px;
          align-items: flex-start;
          border-radius: 16px;
          border: 1px solid rgba(148, 163, 184, 0.1);
          background: rgba(15, 23, 42, 0.44);
        }

        .audit-warn-banner {
          margin-bottom: 18px;
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 11px 16px;
          border-radius: 12px;
          border: 1px solid rgba(245, 158, 11, 0.2);
          background: rgba(245, 158, 11, 0.07);
          color: #fbbf24;
          font-size: 11.5px;
          font-weight: 600;
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
          transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
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
          grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
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
          text-align: right;
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
          font-size: 9.5px;
          font-weight: 800;
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

        .audit-page-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .audit-page-btn:hover:not(:disabled),
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
          font-size: 10px;
          font-weight: 800;
        }

        .audit-security-score {
          position: relative;
          padding: 17px;
          overflow: hidden;
          border-radius: 13px;
          background: radial-gradient(circle at 100% 0%, rgba(244, 63, 94, 0.1), transparent 45%), rgba(2, 6, 23, 0.24);
          border: 1px solid rgba(244, 63, 94, 0.1);
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
          gap: 14px;
        }

        .audit-score strong {
          font-size: 26px;
          line-height: 1;
          letter-spacing: -0.04em;
          color: #f8fafc;
        }

        .audit-score span {
          color: #64748b;
          font-size: 9.5px;
          display: block;
          margin-top: 2px;
        }

        .audit-score-text {
          margin-top: 10px;
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

        .audit-mini-sub {
          margin-top: 3px;
          color: #64748b;
          font-size: 9px;
        }

        .audit-empty {
          padding: 55px 20px;
          text-align: center;
        }

        .audit-empty-side {
          padding: 24px 12px;
          text-align: center;
          color: #64748b;
          font-size: 10.5px;
          line-height: 1.6;
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
                Every audited action and real AI agent event across GhrFix and ShadiLife, merged into one timeline —
                administrator activity, AI-agent writes, AI calls and suggestions, and ShadiLife&apos;s security log.
              </p>
            </div>

            <div>
              <div className="audit-live">
                <span className="audit-live-dot" />
                Auto-refreshing every 60s
              </div>

              <div className="audit-actions" style={{ marginTop: 10 }}>
                <button className="audit-action" type="button" onClick={snapshot.refresh} disabled={snapshot.loading}>
                  <RefreshCw size={14} />
                  Refresh
                </button>

                <button
                  className="audit-action primary"
                  type="button"
                  disabled={filteredRows.length === 0}
                  onClick={() => exportCsv(filteredRows)}
                >
                  <Download size={14} />
                  Export CSV
                </button>
              </div>
            </div>
          </div>
        </section>

        {bothFailed && (
          <div className="audit-error-panel">
            <TriangleAlert size={18} color="#f87171" style={{ flex: "0 0 auto", marginTop: 2 }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 12.5, color: "#f87171" }}>Neither platform responded</div>
              <p style={{ margin: "6px 0 0", fontSize: 11.5, color: "var(--dc-ink-soft)", lineHeight: 1.6 }}>
                GhrFix: {snapshot.ghrfixError}
                <br />
                ShadiLife: {snapshot.shadilifeError}
              </p>
              <p style={{ margin: "8px 0 0", fontSize: 11, color: "var(--dc-ink-faint)" }}>
                Make sure both backends are running and that this browser is signed in on the{" "}
                <a href="/connect" style={{ color: "#38bdf8", fontWeight: 700 }}>
                  Connect
                </a>{" "}
                page.
              </p>
            </div>
          </div>
        )}

        {oneFailed && (
          <div className="audit-warn-banner">
            <TriangleAlert size={14} />
            {snapshot.ghrfixError ? `GhrFix: ${snapshot.ghrfixError}` : `ShadiLife: ${snapshot.shadilifeError}`} — every row below
            reflects the other platform only until this is reconnected.
          </div>
        )}

        {/* STATISTICS */}
        <section className="audit-stats">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div className="audit-stat" key={stat.label}>
                <div className="audit-stat-head">
                  <span className="audit-stat-label">{stat.label}</span>
                  <span className="audit-stat-icon" style={{ background: `${stat.color}1f`, color: stat.color }}>
                    <Icon size={16} />
                  </span>
                </div>
                <div className="audit-stat-value">{stat.value}</div>
                <div className="audit-stat-foot">{stat.sub}</div>
              </div>
            );
          })}
        </section>

        {/* TOOLBAR */}
        <section className="audit-toolbar">
          <div className="audit-search">
            <Search size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search actions, actors, or target IDs..."
            />
          </div>

          <button type="button" className={`audit-filter-btn ${showFilters ? "active" : ""}`} onClick={() => setShowFilters((v) => !v)}>
            <SlidersHorizontal size={14} />
            Advanced Filters
          </button>

          <button
            type="button"
            className="audit-filter-btn"
            onClick={() => {
              setSearch("");
              setPlatform("All");
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
                <select value={platform} onChange={(e) => setPlatform(e.target.value as "All" | PlatformKey)}>
                  <option value="All">All Platforms</option>
                  <option value="ghrfix">GhrFix</option>
                  <option value="shadilife">ShadiLife</option>
                </select>
                <ChevronRight size={13} />
              </div>

              <div className="audit-select-wrap">
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="All">All Categories</option>
                  {snapshot.categories.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
                <ChevronRight size={13} />
              </div>

              <div className="audit-select-wrap">
                <select value={status} onChange={(e) => setStatus(e.target.value as "All" | AuditRowStatus)}>
                  <option value="All">All Statuses</option>
                  <option value="Completed">Completed</option>
                  <option value="Pending">Pending</option>
                  <option value="Accepted">Accepted</option>
                  <option value="Dismissed">Dismissed</option>
                  <option value="Superseded">Superseded</option>
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
                {snapshot.loading
                  ? "Loading…"
                  : `Showing ${filteredRows.length} of ${snapshot.rows.length} loaded events${
                      snapshot.ghrfixTotalAllTime !== null ? ` · GhrFix has ${snapshot.ghrfixTotalAllTime.toLocaleString()} all-time` : ""
                    }`}
              </div>
            </div>

            {snapshot.loading ? (
              <div className="audit-empty">
                <div className="audit-empty-title">Loading real activity…</div>
                <div className="audit-empty-text">Pulling audit logs from GhrFix and ShadiLife.</div>
              </div>
            ) : pageRows.length > 0 ? (
              <>
                <div className="audit-table-wrap">
                  <table className="audit-table">
                    <thead>
                      <tr>
                        <th>EVENT</th>
                        <th>ACTOR</th>
                        <th>STATUS</th>
                        <th>TIME</th>
                        <th />
                      </tr>
                    </thead>

                    <tbody>
                      {pageRows.map((row) => {
                        const statusConfig = STATUS_CONFIG[row.status];
                        const StatusIcon = statusConfig.icon;

                        return (
                          <tr key={row.id}>
                            <td>
                              <div className="audit-event">
                                <span className="audit-event-icon" style={{ background: `${row.actorAccent}16`, color: row.actorAccent }}>
                                  {row.actorIcon ? <Svg path={Icons[row.actorIcon]} size={16} /> : <Svg path={Icons.audit} size={16} />}
                                </span>

                                <div>
                                  <div className="audit-event-title">{row.action}</div>
                                  <div className="audit-event-desc">{row.category}</div>
                                </div>
                              </div>
                            </td>

                            <td>
                              <div className="audit-user">
                                <span className="audit-avatar">
                                  <Svg path={row.actorIcon ? Icons[row.actorIcon] : Icons.users} size={14} />
                                </span>

                                <div>
                                  <div className="audit-user-name">{row.actorLabel}</div>
                                  <div className="audit-user-role" style={{ color: PLATFORM_COLORS[row.platformKey] }}>
                                    {row.platformLabel}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td>
                              <span className="audit-status" style={{ color: statusConfig.color, background: statusConfig.bg }}>
                                <StatusIcon size={11} />
                                {row.status}
                              </span>
                            </td>

                            <td>
                              <div className="audit-time">
                                <div className="audit-time-main">{ago(row.createdAt)}</div>
                                <div className="audit-time-sub">{dateTime(row.createdAt)}</div>
                              </div>
                            </td>

                            <td>
                              <button type="button" className="audit-view-btn" title="View event details" onClick={() => setSelectedRow(row)}>
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
                    Page {clampedPage} of {totalPages} · {filteredRows.length} matching events
                  </span>

                  <div className="audit-pages">
                    <button className="audit-page-btn" type="button" disabled={clampedPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                      <ChevronLeft size={14} />
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((n) => n === 1 || n === totalPages || Math.abs(n - clampedPage) <= 1)
                      .reduce<number[]>((acc, n) => {
                        if (acc.length > 0 && n - acc[acc.length - 1] > 1) acc.push(-1);
                        acc.push(n);
                        return acc;
                      }, [])
                      .map((n, i) =>
                        n === -1 ? (
                          <span key={`gap-${i}`} style={{ color: "#475569", fontSize: 10, padding: "0 2px" }}>
                            …
                          </span>
                        ) : (
                          <button key={n} className={`audit-page-btn ${n === clampedPage ? "active" : ""}`} type="button" onClick={() => setPage(n)}>
                            {n}
                          </button>
                        ),
                      )}

                    <button
                      className="audit-page-btn"
                      type="button"
                      disabled={clampedPage >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
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
                  {snapshot.rows.length === 0 ? "Neither platform reported any activity." : "Try adjusting your search or active filters."}
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
                  PLATFORM STATUS
                </div>
              </div>

              <div className="audit-side-body">
                <div className="audit-health">
                  <div className="audit-health-item">
                    <div className="audit-health-top">
                      <span className="audit-health-label">
                        <Lock size={13} color={PLATFORM_COLORS.ghrfix} />
                        GhrFix Audit Log
                      </span>
                      <span className="audit-health-value" style={{ color: snapshot.ghrfixError ? "#f87171" : "#4ade80" }}>
                        {snapshot.loading ? "…" : snapshot.ghrfixError ? "Unreachable" : "Reachable"}
                      </span>
                    </div>
                  </div>

                  <div className="audit-health-item">
                    <div className="audit-health-top">
                      <span className="audit-health-label">
                        <Lock size={13} color={PLATFORM_COLORS.shadilife} />
                        ShadiLife Audit Log
                      </span>
                      <span className="audit-health-value" style={{ color: snapshot.shadilifeError ? "#f87171" : "#4ade80" }}>
                        {snapshot.loading ? "…" : snapshot.shadilifeError ? "Unreachable" : "Reachable"}
                      </span>
                    </div>
                  </div>

                  <div className="audit-health-item">
                    <div className="audit-health-top">
                      <span className="audit-health-label">
                        <Globe size={13} color="#f43f5e" />
                        Active IP Blocks
                      </span>
                      <span className="audit-health-value" style={{ color: "#e2e8f0" }}>
                        {snapshot.loading ? "…" : snapshot.activeIpBlocks === null ? "—" : snapshot.activeIpBlocks}
                      </span>
                    </div>
                  </div>

                  <div className="audit-health-item">
                    <div className="audit-health-top">
                      <span className="audit-health-label">
                        <Bot size={13} color="#8b5cf6" />
                        Pending AI Suggestions
                      </span>
                      <span className="audit-health-value" style={{ color: "#e2e8f0" }}>
                        {snapshot.loading ? "…" : snapshot.pendingSuggestions}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="audit-card">
              <div className="audit-card-head">
                <div className="audit-card-title">
                  <ShieldAlert size={15} color="#f43f5e" />
                  SHADILIFE SECURITY
                </div>
              </div>

              <div className="audit-side-body">
                <div className="audit-security-score">
                  <div className="audit-security-score-top">
                    <span className="audit-score-label">REAL SECURITY EVENTS</span>
                    <Shield size={17} color="#f43f5e" />
                  </div>

                  <div className="audit-score">
                    <div>
                      <strong>{snapshot.loading ? "—" : snapshot.securityEvents24h}</strong>
                      <span>last 24h</span>
                    </div>
                    <div>
                      <strong>{snapshot.loading ? "—" : snapshot.securityEvents7d}</strong>
                      <span>last 7d</span>
                    </div>
                  </div>

                  <div className="audit-score-text">
                    From ShadiLife&apos;s real SecurityEvent log (failed logins, agent/actor events). GhrFix has no equivalent
                    security-event model, so this panel is ShadiLife-only.
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
                {snapshot.loading ? (
                  <div className="audit-empty-side">Loading…</div>
                ) : snapshot.securityEvents.length === 0 ? (
                  <div className="audit-empty-side">No security events reported by ShadiLife.</div>
                ) : (
                  <div className="audit-recent-list">
                    {snapshot.securityEvents.slice(0, 5).map((ev) => {
                      const color = SEVERITY_COLOR[ev.severity] ?? "#64748b";
                      return (
                        <div className="audit-mini-log" key={ev.id}>
                          <span className="audit-mini-icon" style={{ background: `${color}16`, color }}>
                            <ShieldAlert size={14} />
                          </span>
                          <div>
                            <div className="audit-mini-title">{ev.eventType}</div>
                            <div className="audit-mini-sub">
                              {ev.ipAddress} · {ago(ev.createdAt)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </aside>
        </section>
      </main>

      {/* DETAILS MODAL */}
      {selectedRow && (
        <div className="audit-modal-backdrop" onClick={() => setSelectedRow(null)}>
          <div className="audit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="audit-modal-head">
              <div className="audit-modal-title">
                <FileClock size={16} color="#38bdf8" />
                Audit Event Details
              </div>
              <button className="audit-close" type="button" onClick={() => setSelectedRow(null)}>
                <XCircle size={17} />
              </button>
            </div>

            <div className="audit-modal-body">
              <div className="audit-modal-event">
                <div className="audit-modal-event-icon" style={{ background: `${selectedRow.actorAccent}16`, color: selectedRow.actorAccent }}>
                  {selectedRow.actorIcon ? <Svg path={Icons[selectedRow.actorIcon]} size={21} /> : <Svg path={Icons.audit} size={21} />}
                </div>
                <div>
                  <div className="audit-modal-event-title">{selectedRow.action}</div>
                  <div className="audit-modal-event-desc">
                    {selectedRow.actorLabel} on {selectedRow.platformLabel}
                    {selectedRow.targetType ? ` · ${selectedRow.targetType}${selectedRow.targetId ? ` #${selectedRow.targetId.slice(0, 10)}` : ""}` : ""}
                  </div>
                </div>
              </div>

              <div className="audit-details">
                <div className="audit-detail">
                  <div className="audit-detail-label">EVENT ID</div>
                  <div className="audit-detail-value">{selectedRow.id}</div>
                </div>

                <div className="audit-detail">
                  <div className="audit-detail-label">STATUS</div>
                  <div className="audit-detail-value">{selectedRow.status}</div>
                </div>

                <div className="audit-detail">
                  <div className="audit-detail-label">PLATFORM</div>
                  <div className="audit-detail-value" style={{ color: PLATFORM_COLORS[selectedRow.platformKey] }}>
                    {selectedRow.platformLabel}
                  </div>
                </div>

                <div className="audit-detail">
                  <div className="audit-detail-label">CATEGORY</div>
                  <div className="audit-detail-value">{selectedRow.category}</div>
                </div>

                <div className="audit-detail">
                  <div className="audit-detail-label">ACTOR</div>
                  <div className="audit-detail-value">{selectedRow.actorLabel}</div>
                </div>

                <div className="audit-detail">
                  <div className="audit-detail-label">TIMESTAMP</div>
                  <div className="audit-detail-value">{dateTime(selectedRow.createdAt)}</div>
                </div>

                <div className="audit-detail">
                  <div className="audit-detail-label">RAW ACTION</div>
                  <div className="audit-detail-value">{selectedRow.rawAction}</div>
                </div>

                <div className="audit-detail">
                  <div className="audit-detail-label">COST</div>
                  <div className="audit-detail-value">{selectedRow.costUsd === null ? "Not tracked" : `$${selectedRow.costUsd.toFixed(4)}`}</div>
                </div>

                <div className="audit-detail">
                  <div className="audit-detail-label">TARGET</div>
                  <div className="audit-detail-value">
                    {selectedRow.targetType ? `${selectedRow.targetType}${selectedRow.targetId ? ` #${selectedRow.targetId}` : ""}` : "—"}
                  </div>
                </div>

                <div className="audit-detail">
                  <div className="audit-detail-label">IP ADDRESS</div>
                  <div className="audit-detail-value">{selectedRow.ipAddress ?? "Not recorded"}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
