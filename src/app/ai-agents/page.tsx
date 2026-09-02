"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowRight,
  Bot,
  Boxes,
  BrainCircuit,
  Check,
  ChevronRight,
  CircleDot,
  ClipboardList,
  Command,
  Cpu,
  Database,
  FileText,
  Layers3,
  LayoutDashboard,
  LifeBuoy,
  LineChart,
  LogOut,
  Megaphone,
  MessagesSquare,
  Network,
  Plus,
  Radar,
  Search,
  ShieldCheck,
  Sparkles,
  Terminal,
  Unplug,
  UserCircle,
  Wallet,
  Wifi,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { AgentOrb } from "@/components/agents/AgentOrb";
import { PLATFORM_LIST, agentTitle } from "@/lib/platforms";
import { isConnected } from "@/lib/api";

interface SpecialWorkspace {
  href: string;
  icon: LucideIcon;
  label: string;
  count: number;
  desc: string;
  accent: string;
}

/** One card per "-agent-special" workspace. Accent colours are pulled straight from
 * that agent's own entry in src/lib/platforms.ts, so a workspace card and its matching
 * tile in the Agent Directory below always share the same colour. */
const SPECIAL_WORKSPACES: SpecialWorkspace[] = [
  { href: "/seo-agent-special", icon: Search, label: "SEO Agent", count: 5, desc: "Real scores, site-wide issue tracking and one-click AI fixes.", accent: "#f5b942" },
  { href: "/finance-agent-special", icon: Zap, label: "Finance Agent", count: 5, desc: "Live revenue, cash-flow breakdowns and downloadable reports.", accent: "#fb923c" },
  { href: "/analytics-agent-special", icon: LineChart, label: "Analytics Agent", count: 4, desc: "Users, providers and bookings, broken down by city and category.", accent: "#38bdf8" },
  { href: "/content-agent-special", icon: FileText, label: "Content Agent", count: 5, desc: "Blog performance, engagement and AI content recommendations.", accent: "#3b82f6" },
  { href: "/marketing-agent-special", icon: Megaphone, label: "Marketing Agent", count: 4, desc: "Campaign performance, audience segments and broadcast reach.", accent: "#d946ef" },
  { href: "/master-agent-special", icon: BrainCircuit, label: "Master AI", count: 5, desc: "Fleet-wide view of every agent — activity, spend and health.", accent: "#facc15" },
  { href: "/ops-agent-special", icon: ClipboardList, label: "Ops Agent", count: 5, desc: "The daily queue — verifications, incidents and open work.", accent: "#f43f5e" },
  { href: "/owner-chat-agent-special", icon: Bot, label: "Owner Chat", count: 5, desc: "What this agent can read, and the audited writes it holds.", accent: "#8b5cf6" },
  { href: "/profile-agent-special", icon: UserCircle, label: "Profile Agent", count: 4, desc: "Profile strength, completeness and improvement suggestions.", accent: "#0ea5e9" },
  { href: "/sitechat-agent-special", icon: MessagesSquare, label: "Site Chat Agent", count: 5, desc: "Customer-facing chat volume, quality and usage.", accent: "#10b981" },
  { href: "/support-agent-special", icon: LifeBuoy, label: "Support Agent", count: 5, desc: "Tickets, escalations and resolution performance.", accent: "#06b6d4" },
  { href: "/wallet-agent-special", icon: Wallet, label: "Payment & Wallet", count: 5, desc: "Wallet economy, top-up requests and the ledger.", accent: "#22d3a3" },
];

type AgentIconProps = {
  icon?: unknown;
  name: string;
};

function getAgentIcon(name: string): LucideIcon {
  const value = name.toLowerCase();

  if (
    value.includes("analytics") ||
    value.includes("analysis") ||
    value.includes("data")
  )
    return Activity;

  if (
    value.includes("seo") ||
    value.includes("search") ||
    value.includes("keyword")
  )
    return Search;

  if (
    value.includes("marketing") ||
    value.includes("campaign") ||
    value.includes("growth")
  )
    return Radar;

  if (
    value.includes("finance") ||
    value.includes("payment") ||
    value.includes("revenue")
  )
    return Database;

  if (
    value.includes("security") ||
    value.includes("verify") ||
    value.includes("moderation")
  )
    return ShieldCheck;

  if (
    value.includes("system") ||
    value.includes("automation") ||
    value.includes("ops")
  )
    return Terminal;

  if (value.includes("customer") || value.includes("support")) return Network;

  if (value.includes("content")) return Layers3;

  return BrainCircuit;
}

function AgentIcon({ name }: AgentIconProps) {
  const Icon = getAgentIcon(name);

  return (
    <div className="hub-agent-icon">
      <Icon size={20} strokeWidth={1.8} />
    </div>
  );
}

export default function HubPage() {
  const router = useRouter();

  const [connected, setConnected] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setConnected(
      Object.fromEntries(
        PLATFORM_LIST.map((platform) => [
          platform.key,
          isConnected(platform.key),
        ]),
      ),
    );

    setMounted(true);
  }, []);

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" }).catch(() => {});
    router.push("/login");
  }

  const totalAgents = useMemo(
    () =>
      PLATFORM_LIST.reduce(
        (total, platform) => total + platform.agents.length,
        0,
      ),
    [],
  );

  const connectedPlatforms = useMemo(
    () =>
      PLATFORM_LIST.filter((platform) => connected[platform.key]).length,
    [connected],
  );

  const filteredPlatforms = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return PLATFORM_LIST;

    return PLATFORM_LIST.map((platform) => ({
      ...platform,
      agents: platform.agents.filter((agent) => {
        const title = agentTitle(platform, agent).toLowerCase();

        return (
          title.includes(query) ||
          agent.tag.toLowerCase().includes(query) ||
          agent.desc.toLowerCase().includes(query) ||
          platform.label.toLowerCase().includes(query)
        );
      }),
    })).filter((platform) => platform.agents.length > 0);
  }, [search]);

  return (
    <main className="hub-page">
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          background: #070b16;
        }

        body {
          margin: 0;
        }

        .hub-page {
          position: relative;
          width: 100%;
          min-height: 100vh;
          overflow: hidden;
          color: #eef3ff;
          background:
            radial-gradient(
              circle at 12% 4%,
              rgba(99, 102, 241, 0.17),
              transparent 28%
            ),
            radial-gradient(
              circle at 87% 8%,
              rgba(139, 92, 246, 0.13),
              transparent 26%
            ),
            radial-gradient(
              circle at 54% 100%,
              rgba(14, 165, 233, 0.07),
              transparent 35%
            ),
            linear-gradient(180deg, #090d18 0%, #070b15 48%, #060914 100%);
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        .hub-page::before {
          content: "";
          position: fixed;
          inset: 0;
          pointer-events: none;
          opacity: 0.35;
          background-image:
            linear-gradient(
              rgba(255, 255, 255, 0.018) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(255, 255, 255, 0.018) 1px,
              transparent 1px
            );
          background-size: 56px 56px;
          mask-image: linear-gradient(
            to bottom,
            black,
            rgba(0, 0, 0, 0.45),
            transparent 92%
          );
        }

        .hub-shell {
          position: relative;
          z-index: 1;
          width: min(1500px, calc(100% - 48px));
          margin: 0 auto;
          padding: 34px 0 70px;
        }

        .hub-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 28px;
        }

        .hub-brand {
          display: flex;
          align-items: center;
          gap: 13px;
          min-width: 0;
        }

        .hub-brand-mark {
          position: relative;
          width: 44px;
          height: 44px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          border-radius: 14px;
          color: #ffffff;
          background:
            linear-gradient(
              135deg,
              rgba(124, 58, 237, 0.95),
              rgba(59, 130, 246, 0.9)
            );
          box-shadow:
            0 12px 34px rgba(99, 102, 241, 0.28),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }

        .hub-brand-mark::after {
          content: "";
          position: absolute;
          inset: 1px;
          border-radius: inherit;
          border: 1px solid rgba(255, 255, 255, 0.16);
        }

        .hub-brand-title {
          color: #f7f8ff;
          font-size: 15px;
          font-weight: 800;
          letter-spacing: -0.02em;
        }

        .hub-brand-subtitle {
          margin-top: 3px;
          color: #7f8aa6;
          font-size: 11px;
          font-weight: 500;
        }

        .hub-top-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .hub-status {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 13px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          color: #9ba7c2;
          background: rgba(15, 21, 37, 0.72);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.025);
          font-size: 12px;
          font-weight: 600;
        }

        .hub-status-dot {
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: #22c55e;
          box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.1);
        }

        .hub-logout {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          cursor: pointer;
          color: #9aa7c1;
          background: rgba(15, 21, 37, 0.72);
          transition:
            0.25s ease,
            transform 0.25s ease;
        }

        .hub-logout:hover {
          color: #ff8b9a;
          border-color: rgba(244, 63, 94, 0.28);
          background: rgba(244, 63, 94, 0.08);
          transform: translateY(-2px);
        }

        .hub-hero {
          position: relative;
          overflow: hidden;
          padding: 32px;
          margin-bottom: 20px;
          border: 1px solid rgba(255, 255, 255, 0.085);
          border-radius: 26px;
          background:
            radial-gradient(
              circle at 0% 0%,
              rgba(124, 58, 237, 0.14),
              transparent 33%
            ),
            radial-gradient(
              circle at 100% 50%,
              rgba(59, 130, 246, 0.09),
              transparent 28%
            ),
            linear-gradient(
              135deg,
              rgba(19, 26, 45, 0.96),
              rgba(10, 15, 27, 0.95)
            );
          box-shadow:
            0 24px 80px rgba(0, 0, 0, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.045);
        }

        .hub-hero::after {
          content: "";
          position: absolute;
          width: 500px;
          height: 500px;
          right: -260px;
          top: -350px;
          border: 1px solid rgba(139, 92, 246, 0.15);
          border-radius: 50%;
          box-shadow:
            0 0 0 60px rgba(139, 92, 246, 0.025),
            0 0 0 120px rgba(139, 92, 246, 0.018);
          pointer-events: none;
        }

        .hub-hero-main {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          gap: 28px;
        }

        .hub-orb-wrap {
          position: relative;
          width: 92px;
          height: 92px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          border-radius: 28px;
          background:
            linear-gradient(
              145deg,
              rgba(124, 58, 237, 0.14),
              rgba(59, 130, 246, 0.08)
            );
          border: 1px solid rgba(139, 92, 246, 0.18);
          box-shadow:
            0 20px 45px rgba(0, 0, 0, 0.22),
            inset 0 1px 0 rgba(255, 255, 255, 0.07);
        }

        .hub-orb-wrap::before {
          content: "";
          position: absolute;
          inset: 9px;
          border-radius: 22px;
          border: 1px solid rgba(139, 92, 246, 0.13);
        }

        .hub-hero-copy {
          flex: 1;
          min-width: 0;
        }

        .hub-eyebrow {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 11px;
          color: #a78bfa;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .hub-pulse {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #8b5cf6;
          box-shadow: 0 0 0 5px rgba(139, 92, 246, 0.1);
        }

        .hub-title {
          max-width: 850px;
          margin: 0;
          color: #f7f8ff;
          font-size: clamp(30px, 3.6vw, 51px);
          line-height: 1.04;
          font-weight: 800;
          letter-spacing: -0.05em;
        }

        .hub-title span {
          background: linear-gradient(90deg, #c4b5fd, #8ab8ff);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .hub-description {
          max-width: 760px;
          margin: 15px 0 0;
          color: #91a0bb;
          font-size: 14px;
          line-height: 1.8;
        }

        .hub-hero-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 22px;
        }

        .hub-primary-btn,
        .hub-secondary-btn {
          min-height: 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          padding: 0 16px;
          border-radius: 12px;
          text-decoration: none;
          font-size: 12px;
          font-weight: 750;
          transition:
            transform 0.25s ease,
            box-shadow 0.25s ease,
            border-color 0.25s ease,
            background 0.25s ease;
        }

        .hub-primary-btn {
          color: white;
          border: 1px solid rgba(167, 139, 250, 0.28);
          background: linear-gradient(135deg, #7c3aed, #5b6cf8);
          box-shadow:
            0 12px 28px rgba(99, 102, 241, 0.24),
            inset 0 1px 0 rgba(255, 255, 255, 0.17);
        }

        .hub-primary-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 17px 36px rgba(99, 102, 241, 0.34);
        }

        .hub-secondary-btn {
          color: #c3cde0;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.035);
        }

        .hub-secondary-btn:hover {
          color: #ffffff;
          border-color: rgba(167, 139, 250, 0.3);
          background: rgba(124, 58, 237, 0.09);
          transform: translateY(-2px);
        }

        .hub-stats {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin-top: 30px;
        }

        .hub-stat {
          padding: 15px 16px;
          border: 1px solid rgba(255, 255, 255, 0.065);
          border-radius: 15px;
          background: rgba(255, 255, 255, 0.025);
          backdrop-filter: blur(10px);
        }

        .hub-stat-label {
          display: flex;
          align-items: center;
          gap: 7px;
          color: #78849d;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .hub-stat-value {
          margin-top: 8px;
          color: #f6f8ff;
          font-size: 22px;
          font-weight: 800;
          letter-spacing: -0.04em;
        }

        .hub-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 17px 18px;
          margin-bottom: 20px;
          border: 1px solid rgba(255, 255, 255, 0.075);
          border-radius: 18px;
          background: rgba(13, 19, 33, 0.74);
          box-shadow:
            0 14px 40px rgba(0, 0, 0, 0.13),
            inset 0 1px 0 rgba(255, 255, 255, 0.035);
        }

        .hub-toolbar-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .hub-toolbar-icon {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          color: #a78bfa;
          background: rgba(124, 58, 237, 0.1);
          border: 1px solid rgba(124, 58, 237, 0.15);
        }

        .hub-toolbar-title {
          color: #e9edfa;
          font-size: 14px;
          font-weight: 750;
        }

        .hub-toolbar-text {
          margin-top: 3px;
          color: #68758e;
          font-size: 11px;
        }

        .hub-search {
          width: min(390px, 100%);
          height: 43px;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 13px;
          border: 1px solid rgba(255, 255, 255, 0.075);
          border-radius: 12px;
          color: #74809a;
          background: rgba(255, 255, 255, 0.025);
          transition:
            border-color 0.2s ease,
            box-shadow 0.2s ease;
        }

        .hub-search:focus-within {
          border-color: rgba(139, 92, 246, 0.5);
          box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.08);
        }

        .hub-search input {
          width: 100%;
          border: 0;
          outline: 0;
          color: #e8edf8;
          background: transparent;
          font-size: 12px;
        }

        .hub-search input::placeholder {
          color: #59657d;
        }

        .hub-search kbd {
          padding: 3px 6px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 5px;
          color: #647089;
          background: rgba(255, 255, 255, 0.035);
          font-size: 9px;
          font-family: inherit;
        }

        .hub-special-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
          gap: 12px;
          margin-bottom: 20px;
        }

        .hub-special-card {
          position: relative;
          display: flex;
          flex-direction: column;
          min-height: 150px;
          overflow: hidden;
          padding: 17px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 18px;
          text-decoration: none;
          color: inherit;
          background:
            radial-gradient(
              circle at 90% 0%,
              color-mix(in srgb, var(--accent) 20%, transparent),
              transparent 40%
            ),
            linear-gradient(
              135deg,
              rgba(20, 16, 42, 0.95),
              rgba(11, 16, 29, 0.97)
            );
          transition:
            transform 0.25s ease,
            border-color 0.25s ease,
            box-shadow 0.25s ease;
        }

        .hub-special-card:hover {
          transform: translateY(-3px);
          border-color: color-mix(in srgb, var(--accent) 42%, rgba(255, 255, 255, 0.1));
          box-shadow: 0 20px 45px rgba(0, 0, 0, 0.22);
        }

        .hub-special-glow {
          position: absolute;
          width: 130px;
          height: 130px;
          right: -45px;
          bottom: -60px;
          border-radius: 50%;
          border: 1px solid color-mix(in srgb, var(--accent) 20%, transparent);
          box-shadow: 0 0 0 28px color-mix(in srgb, var(--accent) 3%, transparent);
          pointer-events: none;
        }

        .hub-special-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          position: relative;
          z-index: 1;
        }

        .hub-special-icon {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          color: var(--accent);
          background: color-mix(in srgb, var(--accent) 16%, transparent);
          border: 1px solid color-mix(in srgb, var(--accent) 24%, transparent);
        }

        .hub-special-pill {
          padding: 5px 8px;
          border-radius: 999px;
          color: #b9c3d8;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.06);
          font-size: 9.5px;
          font-weight: 750;
          white-space: nowrap;
        }

        .hub-special-card h2 {
          position: relative;
          z-index: 1;
          margin: 14px 0 5px;
          color: #f4f6ff;
          font-size: 14.5px;
          font-weight: 780;
          letter-spacing: -0.01em;
        }

        .hub-special-card p {
          position: relative;
          z-index: 1;
          margin: 0;
          color: #8490a8;
          font-size: 11px;
          line-height: 1.55;
          flex: 1;
        }

        .hub-special-bottom {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 12px;
          color: var(--accent);
          font-size: 10.5px;
          font-weight: 750;
        }

        .hub-platform-section {
          position: relative;
          margin-top: 20px;
          padding: 22px;
          border: 1px solid rgba(255, 255, 255, 0.075);
          border-radius: 23px;
          background:
            linear-gradient(
              145deg,
              rgba(18, 24, 41, 0.78),
              rgba(10, 15, 27, 0.84)
            );
          box-shadow:
            0 18px 55px rgba(0, 0, 0, 0.13),
            inset 0 1px 0 rgba(255, 255, 255, 0.035);
        }

        .hub-platform-header {
          display: flex;
          align-items: center;
          gap: 15px;
          padding-bottom: 20px;
          margin-bottom: 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .hub-platform-logo {
          width: 46px;
          height: 46px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          border-radius: 15px;
          color: white;
          font-size: 14px;
          font-weight: 850;
          letter-spacing: -0.03em;
          box-shadow:
            0 12px 28px rgba(0, 0, 0, 0.18),
            inset 0 1px 0 rgba(255, 255, 255, 0.18);
        }

        .hub-platform-copy {
          min-width: 0;
          flex: 1;
        }

        .hub-platform-name-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .hub-platform-name {
          margin: 0;
          color: #eef2fc;
          font-size: 19px;
          font-weight: 780;
          letter-spacing: -0.025em;
        }

        .hub-platform-copy p {
          margin: 5px 0 0;
          color: #78859e;
          font-size: 12px;
          line-height: 1.55;
        }

        .hub-platform-meta {
          display: flex;
          align-items: center;
          gap: 9px;
          flex-wrap: wrap;
        }

        .hub-connection {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 8px 10px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 750;
        }

        .hub-connection.on {
          color: #7de2a5;
          background: rgba(34, 197, 94, 0.08);
          border: 1px solid rgba(34, 197, 94, 0.14);
        }

        .hub-connection.off {
          color: #9aa6bb;
          background: rgba(255, 255, 255, 0.035);
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .hub-connection-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        .hub-connection.on .hub-connection-dot {
          background: #22c55e;
          box-shadow: 0 0 10px rgba(34, 197, 94, 0.8);
        }

        .hub-connection.off .hub-connection-dot {
          background: #64748b;
        }

        .hub-agent-count {
          padding: 8px 10px;
          border-radius: 999px;
          color: #7d8aa4;
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(255, 255, 255, 0.025);
          font-size: 10px;
          font-weight: 700;
        }

        .hub-directory {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }

        .hub-agent-card {
          position: relative;
          min-height: 220px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          padding: 19px;
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 18px;
          text-decoration: none;
          color: inherit;
          background:
            radial-gradient(
              circle at 100% 0%,
              color-mix(in srgb, var(--tile-accent) 10%, transparent),
              transparent 40%
            ),
            linear-gradient(
              145deg,
              rgba(255, 255, 255, 0.03),
              rgba(255, 255, 255, 0.012)
            );
          transition:
            transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1),
            border-color 0.3s ease,
            box-shadow 0.3s ease,
            background 0.3s ease;
        }

        .hub-agent-card::before {
          content: "";
          position: absolute;
          top: 0;
          left: 18px;
          right: 18px;
          height: 2px;
          opacity: 0;
          background: var(--tile-accent);
          box-shadow: 0 0 20px var(--tile-accent);
          transition: opacity 0.3s ease;
        }

        .hub-agent-card:hover {
          transform: translateY(-5px);
          border-color: color-mix(
            in srgb,
            var(--tile-accent) 48%,
            rgba(255, 255, 255, 0.1)
          );
          background:
            radial-gradient(
              circle at 100% 0%,
              color-mix(in srgb, var(--tile-accent) 15%, transparent),
              transparent 42%
            ),
            linear-gradient(
              145deg,
              rgba(255, 255, 255, 0.055),
              rgba(255, 255, 255, 0.015)
            );
          box-shadow:
            0 24px 42px rgba(0, 0, 0, 0.2),
            0 0 0 1px color-mix(in srgb, var(--tile-accent) 7%, transparent);
        }

        .hub-agent-card:hover::before {
          opacity: 1;
        }

        .hub-agent-card-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
        }

        .hub-agent-identity {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .hub-agent-icon {
          width: 44px;
          height: 44px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          border-radius: 14px;
          color: var(--tile-accent);
          border: 1px solid
            color-mix(in srgb, var(--tile-accent) 25%, transparent);
          background: color-mix(
            in srgb,
            var(--tile-accent) 10%,
            transparent
          );
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.07);
        }

        .hub-agent-name {
          overflow: hidden;
          color: #edf1fb;
          font-size: 14px;
          font-weight: 760;
          line-height: 1.35;
          letter-spacing: -0.015em;
        }

        .hub-agent-tag {
          margin-top: 5px;
          overflow: hidden;
          color: #71809a;
          font-size: 10px;
          font-weight: 650;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .hub-agent-arrow {
          width: 30px;
          height: 30px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          border-radius: 10px;
          color: #69758e;
          background: rgba(255, 255, 255, 0.035);
          transition:
            color 0.25s ease,
            transform 0.25s ease,
            background 0.25s ease;
        }

        .hub-agent-card:hover .hub-agent-arrow {
          color: #ffffff;
          background: var(--tile-accent);
          transform: translateX(3px);
        }

        .hub-agent-description {
          margin: 22px 0 0;
          color: #8190a9;
          font-size: 11.5px;
          line-height: 1.75;
        }

        .hub-agent-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-top: auto;
          padding-top: 20px;
        }

        .hub-agent-platform {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          min-width: 0;
          padding: 6px 8px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 8px;
          color: #9ba7bb;
          background: rgba(255, 255, 255, 0.025);
          font-size: 9px;
          font-weight: 750;
        }

        .hub-agent-platform-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        .hub-open-label {
          display: flex;
          align-items: center;
          gap: 5px;
          color: var(--tile-accent);
          font-size: 10px;
          font-weight: 750;
        }

        .hub-empty {
          grid-column: 1 / -1;
          padding: 50px 20px;
          border: 1px dashed rgba(255, 255, 255, 0.1);
          border-radius: 18px;
          text-align: center;
          color: #728099;
          font-size: 13px;
        }

        .hub-footer {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 28px 0 0;
          color: #526078;
          font-size: 10px;
        }

        @media (max-width: 1100px) {
          .hub-directory {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .hub-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 800px) {
          .hub-shell {
            width: min(100% - 28px, 1500px);
            padding-top: 20px;
          }

          .hub-status {
            display: none;
          }

          .hub-hero {
            padding: 23px;
          }

          .hub-hero-main {
            align-items: flex-start;
          }

          .hub-toolbar {
            align-items: stretch;
            flex-direction: column;
          }

          .hub-search {
            width: 100%;
          }

          .hub-special-grid {
            grid-template-columns: 1fr;
          }

          .hub-platform-header {
            align-items: flex-start;
            flex-wrap: wrap;
          }

          .hub-platform-meta {
            width: 100%;
          }
        }

        @media (max-width: 600px) {
          .hub-topbar {
            margin-bottom: 18px;
          }

          .hub-brand-subtitle {
            display: none;
          }

          .hub-hero-main {
            flex-direction: column;
            gap: 18px;
          }

          .hub-title {
            font-size: 34px;
          }

          .hub-description {
            font-size: 12px;
          }

          .hub-stats {
            grid-template-columns: 1fr 1fr;
          }

          .hub-directory {
            grid-template-columns: 1fr;
          }

          .hub-platform-section {
            padding: 15px;
          }

          .hub-platform-header {
            padding-bottom: 16px;
          }
        }
      `}</style>

      <div className="hub-shell">
        {/* TOP BAR */}
        <header className="hub-topbar">
          <div className="hub-brand">
            <div className="hub-brand-mark">
              <Command size={21} strokeWidth={2.2} />
            </div>

            <div>
              <div className="hub-brand-title">AI Command Center</div>
              <div className="hub-brand-subtitle">
                Multi-platform intelligence infrastructure
              </div>
            </div>
          </div>

          <div className="hub-top-actions">
            <div className="hub-status">
              <span className="hub-status-dot" />
              {mounted
                ? `${connectedPlatforms}/${PLATFORM_LIST.length} platforms online`
                : "Checking systems..."}
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="hub-logout"
              title="Log out"
              aria-label="Log out"
            >
              <LogOut size={17} />
            </button>
          </div>
        </header>

        {/* HERO */}
        <section className="hub-hero">
          <div className="hub-hero-main">
            <div className="hub-orb-wrap">
              <AgentOrb size={66} />
            </div>

            <div className="hub-hero-copy">
              <div className="hub-eyebrow">
                <span className="hub-pulse" />
                Central Intelligence Layer
              </div>

              <h1 className="hub-title">
                Every AI agent.
                <br />
                <span>One command center.</span>
              </h1>

              <p className="hub-description">
                A unified intelligence console for managing autonomous agents
                across every connected platform. Monitor capabilities, open
                specialized agents, and keep every system clearly separated
                while operating from one powerful workspace.
              </p>

              <div className="hub-hero-actions">
                <Link href="/connect" className="hub-primary-btn">
                  <Plus size={15} />
                  Connect platform
                </Link>

                <a href="#agent-directory" className="hub-secondary-btn">
                  <Boxes size={15} />
                  Explore agents
                </a>
              </div>
            </div>
          </div>

          <div className="hub-stats">
            <div className="hub-stat">
              <div className="hub-stat-label">
                <Bot size={12} />
                AI agents
              </div>
              <div className="hub-stat-value">{totalAgents}</div>
            </div>

            <div className="hub-stat">
              <div className="hub-stat-label">
                <Layers3 size={12} />
                Platforms
              </div>
              <div className="hub-stat-value">{PLATFORM_LIST.length}</div>
            </div>

            <div className="hub-stat">
              <div className="hub-stat-label">
                <Wifi size={12} />
                Connected
              </div>
              <div className="hub-stat-value">
                {mounted ? connectedPlatforms : "—"}
              </div>
            </div>

            <div className="hub-stat">
              <div className="hub-stat-label">
                <Activity size={12} />
                System status
              </div>
              <div className="hub-stat-value" style={{ fontSize: 17 }}>
                Operational
              </div>
            </div>
          </div>
        </section>

        {/* DIRECTORY TOOLBAR */}
        <section className="hub-toolbar" id="agent-directory">
          <div className="hub-toolbar-left">
            <div className="hub-toolbar-icon">
              <LayoutDashboard size={18} />
            </div>

            <div>
              <div className="hub-toolbar-title">Agent Directory</div>
              <div className="hub-toolbar-text">
                Open a specialized intelligence workspace
              </div>
            </div>
          </div>

          <label className="hub-search">
            <Search size={16} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search agents, capabilities, platforms..."
              aria-label="Search agents"
            />
            <kbd>⌕</kbd>
          </label>
        </section>

        {/* SPECIAL WORKSPACES — one pixel-perfect experience per agent, both platforms */}
        <section className="hub-special-grid">
          {SPECIAL_WORKSPACES.map((w) => (
            <Link
              key={w.href}
              href={w.href}
              className="hub-special-card"
              style={{ ["--accent" as string]: w.accent }}
            >
              <div className="hub-special-glow" />

              <div className="hub-special-top">
                <div className="hub-special-icon">
                  <w.icon size={19} />
                </div>

                <span className="hub-special-pill">{w.count} pages</span>
              </div>

              <h2>{w.label}</h2>

              <p>{w.desc}</p>

              <div className="hub-special-bottom">
                Open workspace <ArrowRight size={12} />
              </div>
            </Link>
          ))}
        </section>

        {/* PLATFORMS */}
        {filteredPlatforms.length > 0 ? (
          filteredPlatforms.map((platform) => {
            const platformConnected = !!connected[platform.key];

            return (
              <section className="hub-platform-section" key={platform.key}>
                <div className="hub-platform-header">
                  <div
                    className="hub-platform-logo"
                    style={{
                      background: `linear-gradient(135deg, ${platform.color}, color-mix(in srgb, ${platform.color} 65%, #ffffff))`,
                    }}
                  >
                    {platform.label.slice(0, 2).toUpperCase()}
                  </div>

                  <div className="hub-platform-copy">
                    <div className="hub-platform-name-row">
                      <h2 className="hub-platform-name">
                        {platform.label} Intelligence
                      </h2>

                      <span className="hub-agent-count">
                        {platform.agents.length} agents
                      </span>
                    </div>

                    <p>{platform.blurb}</p>
                  </div>

                  <div className="hub-platform-meta">
                    <span
                      className={`hub-connection ${
                        platformConnected ? "on" : "off"
                      }`}
                    >
                      <span className="hub-connection-dot" />

                      {mounted
                        ? platformConnected
                          ? "Connected"
                          : "Not connected"
                        : "Checking"}
                    </span>
                  </div>
                </div>

                <div className="hub-directory">
                  {platform.agents.map((agent) => {
                    const title = agentTitle(platform, agent);

                    return (
                      <Link
                        key={agent.key}
                        href={`/${platform.key}/${agent.key}`}
                        className="hub-agent-card"
                        style={
                          {
                            "--tile-accent": agent.accent,
                          } as React.CSSProperties
                        }
                      >
                        <div className="hub-agent-card-top">
                          <div className="hub-agent-identity">
                            <AgentIcon name={title} />

                            <div style={{ minWidth: 0 }}>
                              <div className="hub-agent-name">{title}</div>
                              <div className="hub-agent-tag">{agent.tag}</div>
                            </div>
                          </div>

                          <div className="hub-agent-arrow">
                            <ChevronRight size={16} />
                          </div>
                        </div>

                        <p className="hub-agent-description">{agent.desc}</p>

                        <div className="hub-agent-footer">
                          <span className="hub-agent-platform">
                            <span
                              className="hub-agent-platform-dot"
                              style={{ background: platform.color }}
                            />
                            {platform.label}
                          </span>

                          <span className="hub-open-label">
                            Launch
                            <ArrowRight size={12} />
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })
        ) : (
          <section className="hub-platform-section">
            <div className="hub-directory">
              <div className="hub-empty">
                <Search
                  size={28}
                  style={{ marginBottom: 10, opacity: 0.55 }}
                />
                <br />
                No agents found for “{search}”
              </div>
            </div>
          </section>
        )}

        <footer className="hub-footer">
          <CircleDot size={11} />
          AI Command Center
          <span style={{ opacity: 0.45 }}>•</span>
          Autonomous intelligence infrastructure
          <Check size={11} />
        </footer>
      </div>
    </main>
  );
}