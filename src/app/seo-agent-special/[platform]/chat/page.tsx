"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Bell,
  Bot,
  CalendarDays,
  ChevronDown,
  ClipboardCheck,
  FileText,
  Heart,
  Home,
  Link2,
  MessageSquare,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserRound,
  UsersRound,
  Wand2,
  Send,
  Paperclip,
  ThumbsUp,
  ThumbsDown,
  Copy,
  PenLine,
  ArrowUpRight,
  ChartNoAxesCombined,
  FileBarChart,
  ScanSearch,
  PenTool,
  Network,
  Puzzle,
  Lightbulb,
  ImageIcon,
  BadgeCheck,
} from "lucide-react";
import { usePlatformParam, agentChat, platformLabel, platformLogoUrl } from "@/lib/agent-data";
import type { ChatTurn } from "@/lib/api";

const SEO_NAV = [
  { href: "overview", label: "Overview", icon: Home },
  { href: "chat", label: "Chat", icon: Bot },
  { href: "statistics", label: "Statistics", icon: TrendingUp },
  { href: "recommendations", label: "AI Recommendations", icon: Sparkles },
  { href: "blog-optimization", label: "Blog Optimization", icon: PenLine },
];

const recommendations = [
  {
    title: "Optimize Title & Meta Description",
    text: "Include the primary keyword naturally in your title and meta description.",
    icon: Sparkles,
    tone: "purple",
  },
  {
    title: "Add Internal Links",
    text: 'Link to related posts like "Marriage Guide" and "Relationship Advice".',
    icon: ClipboardCheck,
    tone: "green",
  },
  {
    title: "Improve Readability",
    text: "Break content into short paragraphs, use bullet points, and add headings.",
    icon: PenTool,
    tone: "orange",
  },
  {
    title: "Add FAQs Section",
    text: "Answer common questions people have about successful marriages.",
    icon: MessageSquare,
    tone: "blue",
  },
  {
    title: "Optimize Images",
    text: "Use relevant images with proper alt text and compressed sizes.",
    icon: ImageIcon,
    tone: "red",
  },
];

const capabilities = [
  {
    title: "SEO Analysis",
    text: "Analyze your website SEO performance",
    icon: ScanSearch,
    tone: "purple",
  },
  {
    title: "Keyword Research",
    text: "Find high-potential keywords",
    icon: Search,
    tone: "blue",
  },
  {
    title: "Content Optimization",
    text: "Optimize content for better rankings",
    icon: PenLine,
    tone: "orange",
  },
  {
    title: "Technical SEO",
    text: "Fix technical issues",
    icon: Puzzle,
    tone: "gray",
  },
  {
    title: "Competitor Analysis",
    text: "Analyze your competitors",
    icon: UsersRound,
    tone: "purple",
  },
];

function Robot({ small = false }: { small?: boolean }) {
  return (
    <div className={`robot ${small ? "robot-small" : ""}`}>
      <div className="robot-glow" />
      <div className="robot-head">
        <div className="robot-face">
          <span />
          <span />
        </div>
      </div>
      {!small && (
        <>
          <div className="robot-body">
            <div className="robot-core" />
          </div>
          <div className="robot-arm robot-arm-left" />
          <div className="robot-arm robot-arm-right" />
        </>
      )}
    </div>
  );
}

interface Msg {
  role: "user" | "assistant";
  content: string;
  error?: boolean;
}

export default function SEOAIAgentPage({ params }: { params: Promise<{ platform: string }> }) {
  const platform = usePlatformParam(params);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const label = `${platformLabel(platform)} SEO Agent`;

  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: `Hi! I'm your ${label}. Ask me about content SEO, blog scores, or what to fix next — I answer from real, live platform data.` },
  ]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const firedPrefill = useRef(false);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    const history: ChatTurn[] = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setMessage("");
    setSending(true);
    try {
      const reply = await agentChat(platform, "seo", label, trimmed, history);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong reaching the AI.";
      setMessages((prev) => [...prev, { role: "assistant", content: msg, error: true }]);
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    const q = searchParams.get("q");
    if (q && !firedPrefill.current) {
      firedPrefill.current = true;
      send(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  return (
    <>
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          width: 100%;
          min-height: 100%;
          background: #030712;
          color: #f1f5f9;
          font-family:
            Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
            "Segoe UI", sans-serif;
        }

        button,
        input,
        textarea {
          font: inherit;
        }

        button {
          cursor: pointer;
        }

        .seo-page {
          width: 100%;
          min-height: 100vh;
          background:
            radial-gradient(
              circle at 67% 8%,
              rgba(139, 92, 246, 0.10),
              transparent 25%
            ),
            radial-gradient(
              circle at 16% 90%,
              rgba(139, 92, 246, 0.07),
              transparent 25%
            ),
            #030712;
          display: flex;
          overflow: hidden;
        }

        /* ================= SIDEBAR ================= */

        .sidebar {
          width: 264px;
          flex: 0 0 264px;
          min-height: 100vh;
          padding: 38px 22px 26px;
          border-right: 1px solid rgba(255, 255, 255, .07);
          background:
            linear-gradient(
              180deg,
              rgba(13, 21, 38, 0.92),
              rgba(5, 8, 15, 0.95)
            );
          display: flex;
          flex-direction: column;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 4px 8px 30px;
        }

        .brand-heart {
          width: 30px;
          height: 30px;
          object-fit: contain;
          flex: 0 0 auto;
        }

        .brand-text {
          font-size: 25px;
          line-height: 1;
          font-weight: 800;
          letter-spacing: -1.2px;
          color: #f1f5f9;
          white-space: nowrap;
        }

        .brand-text span {
          color: #f43f5e;
        }

        .brand-subtitle {
          margin-top: 5px;
          color: #94a3b8;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.1px;
          text-align: right;
        }

        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .nav-item {
          width: 100%;
          height: 41px;
          border: 0;
          background: transparent;
          display: flex;
          align-items: center;
          gap: 18px;
          padding: 0 10px;
          color: #94a3b8;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
          text-align: left;
          transition: 0.18s ease;
        }

        .nav-item svg {
          width: 17px;
          height: 17px;
          color: #94a3b8;
          stroke-width: 1.7;
        }

        .nav-item:hover {
          background: rgba(139, 92, 246, .14);
          color: #8b5cf6;
          transform: translateX(2px);
        }

        .nav-item:hover svg {
          color: #8b5cf6;
        }

        .nav-item.active-link {
          background: rgba(139, 92, 246, .14);
          color: #8b5cf6;
        }

        .nav-item.active-link svg {
          color: #8b5cf6;
        }

        .agent-promo {
          margin-top: auto;
          border: 1px solid rgba(255, 255, 255, .07);
          border-radius: 15px;
          min-height: 300px;
          padding: 18px 16px 14px;
          text-align: center;
          background:
            radial-gradient(
              circle at 50% 30%,
              rgba(139, 92, 246, 0.16),
              transparent 34%
            ),
            linear-gradient(180deg, #0d1526, #0b1220);
          box-shadow:
            0 12px 32px rgba(0, 0, 0, 0.35),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
        }

        .agent-promo h4 {
          color: #8b5cf6;
          font-size: 14px;
          margin: 0;
          font-weight: 700;
        }

        .agent-promo .robot-wrap {
          height: 117px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 5px 0 5px;
        }

        .agent-promo-title {
          color: #8b5cf6;
          font-size: 13px;
          font-weight: 700;
          margin: 4px 0 9px;
        }

        .agent-promo p {
          margin: 0 auto;
          max-width: 165px;
          color: #94a3b8;
          font-size: 12px;
          line-height: 1.95;
        }

        .new-chat-button {
          margin-top: 16px;
          width: 100%;
          height: 37px;
          border: 0;
          border-radius: 7px;
          background: linear-gradient(135deg, #7c3aed, #8b5cf6);
          color: white;
          font-size: 12px;
          font-weight: 600;
          box-shadow: 0 7px 16px rgba(139, 92, 246, 0.3);
          transition: 0.18s ease;
        }

        .new-chat-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 10px 22px rgba(139, 92, 246, 0.4);
        }

        /* ================= MAIN ================= */

        .main-shell {
          min-width: 0;
          flex: 1;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        .topbar {
          height: 126px;
          padding: 26px 27px 17px 33px;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
        }

        .page-heading h1 {
          margin: 10px 0 5px;
          color: #f1f5f9;
          font-size: 25px;
          letter-spacing: -0.55px;
          font-weight: 750;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .page-heading h1 svg {
          width: 24px;
          height: 24px;
          color: #8b5cf6;
          fill: rgba(139, 92, 246, 0.16);
          stroke-width: 1.7;
        }

        .page-heading p {
          margin: 0;
          color: #94a3b8;
          font-size: 14px;
        }

        .top-actions {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 16px;
        }

        .profile-row {
          display: flex;
          align-items: center;
          gap: 18px;
        }

        .bell {
          position: relative;
          width: 22px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #94a3b8;
        }

        .bell svg {
          width: 18px;
          stroke-width: 1.7;
        }

        .profile {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .avatar {
          width: 41px;
          height: 41px;
          border-radius: 50%;
          padding: 3px;
          background: #0d1526;
          border: 1px solid rgba(255, 255, 255, .07);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .avatar-inner {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background:
            radial-gradient(circle at 50% 31%, rgba(139, 92, 246, .35) 0 15%, transparent 16%),
            radial-gradient(circle at 50% 45%, #05080f 0 28%, transparent 29%),
            linear-gradient(150deg, #2a2145, #1a1433);
          position: relative;
          overflow: hidden;
        }

        .avatar-inner:before {
          content: "";
          position: absolute;
          width: 18px;
          height: 15px;
          border-radius: 50% 50% 45% 45%;
          background: #05080f;
          top: 5px;
          left: 8px;
        }

        .avatar-inner:after {
          content: "";
          position: absolute;
          width: 28px;
          height: 19px;
          border-radius: 50% 50% 0 0;
          background: #0d1526;
          bottom: -5px;
          left: 3px;
        }

        .profile-name {
          min-width: 70px;
        }

        .profile-name strong {
          display: block;
          font-size: 13px;
          color: #f1f5f9;
          margin-bottom: 4px;
        }

        .profile-name span {
          display: block;
          font-size: 11px;
          color: #94a3b8;
        }

        .profile-chevron {
          color: #94a3b8;
          width: 15px;
        }

        .toolbar-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .date-button,
        .export-button {
          height: 39px;
          border-radius: 7px;
          font-size: 12px;
          font-weight: 500;
        }

        .date-button {
          min-width: 248px;
          border: 1px solid rgba(255, 255, 255, .07);
          background: rgba(11, 18, 32, 0.65);
          color: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
        }

        .date-button svg {
          width: 16px;
          color: #94a3b8;
        }

        .export-button {
          width: 116px;
          border: 0;
          color: white;
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          box-shadow: 0 6px 15px rgba(139, 92, 246, 0.3);
        }

        .export-button svg {
          width: 14px;
        }

        /* ================= CONTENT GRID ================= */

        .content-grid {
          padding: 0 27px 37px 25px;
          flex: 1;
          min-height: 0;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 294px;
          gap: 14px;
        }

        .chat-panel {
          min-width: 0;
          height: 860px;
          max-height: calc(100vh - 138px);
          min-height: 720px;
          border: 1px solid rgba(255, 255, 255, .07);
          border-radius: 14px;
          overflow: hidden;
          display: grid;
          grid-template-columns: 225px minmax(0, 1fr);
          background: rgba(11, 18, 32, 0.64);
          box-shadow:
            0 15px 40px rgba(0, 0, 0, 0.35),
            0 2px 8px rgba(0, 0, 0, 0.2);
        }

        /* ================= CONVERSATION LIST ================= */

        .conversation-list {
          border-right: 1px solid rgba(255, 255, 255, .07);
          display: flex;
          flex-direction: column;
          min-height: 0;
          background: rgba(13, 21, 38, 0.52);
        }

        .conversation-top {
          height: 72px;
          padding: 24px 19px 0;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
        }

        .conversation-top strong {
          font-size: 13px;
          color: #f1f5f9;
        }

        .conversation-top strong:before {
          content: "‹";
          color: #8b5cf6;
          margin-right: 3px;
          font-size: 18px;
          vertical-align: -1px;
        }

        .conversation-top button {
          border: 0;
          background: transparent;
          color: #94a3b8;
          padding: 2px;
        }

        .conversation-top svg {
          width: 15px;
        }

        .conversation-search {
          margin: 0 17px 17px;
          height: 35px;
          border: 1px solid rgba(255, 255, 255, .07);
          background: #0d1526;
          border-radius: 7px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 11px;
          color: #94a3b8;
        }

        .conversation-search svg {
          width: 15px;
        }

        .conversation-search input {
          width: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          color: #f1f5f9;
          font-size: 10px;
        }

        .conversation-search input::placeholder {
          color: #5b6780;
        }

        .conversation-items {
          padding: 0 14px;
          overflow: auto;
          flex: 1;
        }

        .conversation-item {
          width: 100%;
          height: 96px;
          border: 1px solid transparent;
          background: transparent;
          border-radius: 9px;
          padding: 15px 12px;
          margin-bottom: 4px;
          text-align: left;
          transition: 0.16s ease;
        }

        .conversation-item:hover {
          background: rgba(139, 92, 246, .08);
        }

        .conversation-item.active {
          border-color: rgba(139, 92, 246, .35);
          background:
            linear-gradient(
              135deg,
              rgba(139, 92, 246, 0.16),
              rgba(11, 18, 32, 0.75)
            );
          box-shadow: 0 3px 10px rgba(0, 0, 0, 0.3);
        }

        .conversation-item-head {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }

        .conversation-icon {
          width: 20px;
          height: 20px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #8b5cf6;
          background: rgba(139, 92, 246, .16);
          flex: 0 0 auto;
        }

        .conversation-item.active .conversation-icon {
          background: rgba(139, 92, 246, .25);
        }

        .conversation-meta {
          min-width: 0;
          flex: 1;
        }

        .conversation-meta strong {
          display: block;
          color: #f1f5f9;
          font-size: 11px;
          font-weight: 650;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .conversation-item.active .conversation-meta strong {
          color: #8b5cf6;
        }

        .conversation-time {
          margin-top: 8px;
          padding-left: 28px;
          font-size: 9px;
          color: #94a3b8;
        }

        .conversation-preview {
          margin: 9px 0 0 0;
          color: #94a3b8;
          font-size: 10px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .view-all {
          margin: 13px 18px 16px;
          height: 34px;
          flex: 0 0 auto;
          border: 1px solid rgba(139, 92, 246, .35);
          background: #0d1526;
          border-radius: 7px;
          color: #8b5cf6;
          font-size: 10px;
          font-weight: 600;
        }

        /* ================= CHAT ================= */

        .chat-area {
          min-width: 0;
          min-height: 0;
          display: flex;
          flex-direction: column;
          background:
            radial-gradient(
              circle at 60% 16%,
              rgba(139, 92, 246, 0.07),
              transparent 28%
            ),
            rgba(11, 18, 32, 0.5);
        }

        .chat-header {
          height: 92px;
          flex: 0 0 92px;
          border-bottom: 1px solid rgba(255, 255, 255, .05);
          padding: 16px 24px;
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .chat-agent-avatar {
          width: 58px;
          height: 58px;
          flex: 0 0 58px;
          border-radius: 50%;
          background:
            radial-gradient(
              circle at center,
              rgba(139, 92, 246, 0.22),
              transparent 65%
            ),
            #0d1526;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .chat-agent-info strong {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          color: #f1f5f9;
        }

        .online-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.15);
        }

        .chat-agent-info p {
          margin: 8px 0 0;
          color: #94a3b8;
          font-size: 11px;
        }

        .messages {
          flex: 1;
          min-height: 0;
          padding: 25px 24px 8px;
          overflow: auto;
        }

        .user-message-wrap {
          display: flex;
          justify-content: flex-end;
          margin: 14px 0 24px;
        }

        .message-time {
          color: #94a3b8;
          font-size: 9px;
          margin-bottom: 6px;
          text-align: right;
        }

        .user-message {
          width: 312px;
          border: 1px solid rgba(139, 92, 246, .3);
          border-radius: 11px 11px 3px 11px;
          padding: 13px 17px;
          background:
            linear-gradient(
              135deg,
              rgba(139, 92, 246, 0.2),
              rgba(11, 18, 32, 0.7)
            );
          color: #f1f5f9;
          font-size: 12px;
          line-height: 1.75;
        }

        .agent-message-row {
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }

        .agent-message-side {
          flex: 0 0 50px;
          text-align: center;
        }

        .agent-message-time {
          color: #94a3b8;
          font-size: 9px;
          margin-bottom: 8px;
          white-space: nowrap;
          text-align: left;
        }

        .agent-bubble {
          width: 457px;
          max-width: calc(100% - 20px);
          border: 1px solid rgba(255, 255, 255, .07);
          border-radius: 0 13px 13px 13px;
          padding: 20px 20px 15px;
          background:
            linear-gradient(
              145deg,
              rgba(11, 18, 32, 0.94),
              rgba(13, 21, 38, 0.83)
            );
          box-shadow: 0 7px 22px rgba(0, 0, 0, 0.3);
        }

        .agent-bubble-intro {
          margin: 0 0 14px;
          color: #94a3b8;
          font-size: 11px;
          line-height: 1.5;
        }

        .recommendation {
          display: flex;
          gap: 11px;
          margin: 0 0 11px;
        }

        .recommendation-icon,
        .capability-icon {
          width: 29px;
          height: 29px;
          flex: 0 0 29px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .recommendation-icon svg,
        .capability-icon svg {
          width: 14px;
          height: 14px;
        }

        .tone-purple {
          color: #8b5cf6;
          background: rgba(139, 92, 246, .16);
        }

        .tone-green {
          color: #22c55e;
          background: rgba(34, 197, 94, .16);
        }

        .tone-orange {
          color: #f59e0b;
          background: rgba(245, 158, 11, .16);
        }

        .tone-blue {
          color: #38bdf8;
          background: rgba(56, 189, 248, .16);
        }

        .tone-red {
          color: #f43f5e;
          background: rgba(244, 63, 94, .16);
        }

        .tone-gray {
          color: #94a3b8;
          background: rgba(255, 255, 255, .08);
        }

        .recommendation-content strong {
          display: block;
          color: #f1f5f9;
          font-size: 10px;
          font-weight: 650;
          margin: 1px 0 5px;
        }

        .recommendation-content p {
          margin: 0;
          color: #94a3b8;
          font-size: 10px;
          line-height: 1.55;
        }

        .agent-question {
          margin: 15px 0 13px;
          color: #94a3b8;
          font-size: 11px;
        }

        .agent-buttons {
          display: flex;
          gap: 8px;
        }

        .agent-buttons button {
          height: 33px;
          padding: 0 15px;
          border-radius: 6px;
          font-size: 10px;
          font-weight: 600;
        }

        .optimize-now {
          border: 0;
          color: white;
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
          box-shadow: 0 5px 12px rgba(139, 92, 246, 0.3);
        }

        .show-keywords {
          border: 1px solid rgba(139, 92, 246, .35);
          color: #8b5cf6;
          background: #0b1220;
        }

        .reaction-row {
          margin: 11px 0 0 74px;
          display: flex;
          gap: 17px;
        }

        .reaction-row button {
          border: 0;
          padding: 2px;
          background: transparent;
          color: #94a3b8;
          display: flex;
          align-items: center;
        }

        .reaction-row button.active {
          color: #8b5cf6;
        }

        .reaction-row svg {
          width: 15px;
          height: 15px;
          stroke-width: 1.6;
        }

        /* ================= COMPOSER ================= */

        .composer-section {
          flex: 0 0 auto;
          border-top: 1px solid rgba(255, 255, 255, .05);
          padding: 10px 17px 12px;
          background: rgba(11, 18, 32, 0.6);
        }

        .quick-actions {
          display: flex;
          gap: 6px;
          margin-bottom: 10px;
          overflow-x: auto;
          padding: 0 0 1px;
        }

        .quick-action {
          flex: 1;
          min-width: 0;
          height: 34px;
          border: 1px solid rgba(255, 255, 255, .07);
          background: #0d1526;
          border-radius: 7px;
          color: #94a3b8;
          font-size: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          white-space: nowrap;
          padding: 0 10px;
        }

        .quick-action svg {
          width: 13px;
          color: #8b5cf6;
        }

        .message-composer {
          height: 86px;
          border: 1px solid rgba(255, 255, 255, .07);
          border-radius: 10px;
          background: rgba(11, 18, 32, 0.86);
          padding: 12px 13px 9px;
          display: flex;
          flex-direction: column;
          box-shadow: 0 2px 7px rgba(0, 0, 0, 0.3);
        }

        .message-composer textarea {
          width: 100%;
          resize: none;
          flex: 1;
          border: 0;
          outline: 0;
          background: transparent;
          color: #f1f5f9;
          font-size: 11px;
          line-height: 1.5;
        }

        .message-composer textarea::placeholder {
          color: #5b6780;
        }

        .composer-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .composer-tools {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .composer-tools button {
          border: 0;
          padding: 2px;
          background: transparent;
          color: #94a3b8;
        }

        .composer-tools svg {
          width: 16px;
          height: 16px;
          stroke-width: 1.7;
        }

        .send-button {
          width: 46px;
          height: 34px;
          border: 0;
          border-radius: 6px;
          color: white;
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 5px 12px rgba(139, 92, 246, 0.3);
        }

        .send-button svg {
          width: 15px;
        }

        .disclaimer {
          text-align: center;
          color: #5b6780;
          font-size: 8px;
          margin-top: 9px;
        }

        /* ================= RIGHT PANEL ================= */

        .right-column {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 18px;
          padding-top: 12px;
        }

        .side-card {
          border: 1px solid rgba(255, 255, 255, .07);
          border-radius: 12px;
          background:
            linear-gradient(
              145deg,
              rgba(11, 18, 32, 0.86),
              rgba(13, 21, 38, 0.72)
            );
          padding: 17px 17px;
          box-shadow: 0 9px 25px rgba(0, 0, 0, 0.3);
        }

        .side-card h3 {
          margin: 0 0 16px;
          color: #f1f5f9;
          font-size: 13px;
          font-weight: 700;
        }

        .insight-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .insight-row {
          display: grid;
          grid-template-columns: 29px 1fr auto;
          align-items: center;
          gap: 9px;
        }

        .insight-icon {
          width: 28px;
          height: 28px;
          border-radius: 7px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .insight-icon svg {
          width: 14px;
          height: 14px;
        }

        .insight-label {
          color: #94a3b8;
          font-size: 11px;
        }

        .insight-value {
          color: #f1f5f9;
          font-size: 11px;
          font-weight: 700;
        }

        .topic-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 10px 8px;
        }

        .topic-tag {
          border-radius: 7px;
          padding: 8px 11px;
          font-size: 10px;
          font-weight: 500;
          border: 1px solid transparent;
        }

        .topic-keyword {
          color: #8b5cf6;
          background: rgba(139, 92, 246, .14);
          border-color: rgba(139, 92, 246, .3);
        }

        .topic-content {
          color: #38bdf8;
          background: rgba(56, 189, 248, .14);
          border-color: rgba(56, 189, 248, .3);
        }

        .topic-technical {
          color: #f59e0b;
          background: rgba(245, 158, 11, .14);
          border-color: rgba(245, 158, 11, .3);
        }

        .topic-backlink {
          color: #22d3ee;
          background: rgba(34, 211, 238, .14);
          border-color: rgba(34, 211, 238, .3);
        }

        .topic-rank {
          color: #f43f5e;
          background: rgba(244, 63, 94, .14);
          border-color: rgba(244, 63, 94, .3);
        }

        .capability-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .capability {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .capability-icon {
          width: 29px;
          height: 29px;
          border-radius: 7px;
          flex: 0 0 29px;
        }

        .capability-text strong {
          display: block;
          color: #f1f5f9;
          font-size: 10px;
          margin-bottom: 5px;
        }

        .capability-text span {
          display: block;
          color: #94a3b8;
          font-size: 9px;
        }

        .learn-more {
          margin-top: 16px;
          padding-top: 14px;
          border-top: 1px solid rgba(255, 255, 255, .05);
          color: #8b5cf6;
          font-size: 10px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .learn-more svg {
          width: 13px;
        }

        /* ================= ROBOT ================= */

        .robot {
          position: relative;
          width: 105px;
          height: 105px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          transform: translateY(1px);
        }

        .robot-small {
          width: 46px;
          height: 46px;
          transform: scale(0.8);
          transform-origin: center;
        }

        .robot-glow {
          position: absolute;
          width: 82px;
          height: 82px;
          border-radius: 50%;
          background: radial-gradient(
            circle,
            rgba(139, 92, 246, 0.3),
            rgba(139, 92, 246, 0.05) 62%,
            transparent 70%
          );
          filter: blur(1px);
        }

        .robot-head {
          position: relative;
          z-index: 2;
          width: 57px;
          height: 48px;
          border-radius: 45% 45% 40% 40%;
          background: linear-gradient(145deg, #0d1526, #1a1433);
          border: 3px solid rgba(139, 92, 246, .3);
          box-shadow:
            inset 0 2px 4px rgba(139, 92, 246, 0.15),
            0 5px 12px rgba(0, 0, 0, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .robot-face {
          width: 40px;
          height: 27px;
          border-radius: 12px;
          background: linear-gradient(145deg, #0d1526, #05080f);
          box-shadow:
            inset 0 1px 5px rgba(56, 189, 248, 0.3),
            0 0 8px rgba(139, 92, 246, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .robot-face span {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #22d3ee;
          box-shadow: 0 0 7px #22d3ee;
        }

        .robot-body {
          position: relative;
          z-index: 1;
          width: 48px;
          height: 38px;
          margin-top: -2px;
          border-radius: 18px 18px 15px 15px;
          background: linear-gradient(145deg, #0d1526, #1a1433);
          border: 2px solid rgba(139, 92, 246, .3);
          box-shadow: 0 6px 10px rgba(0, 0, 0, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .robot-core {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: linear-gradient(145deg, #8b5cf6, #7c3aed);
          box-shadow:
            inset 0 2px 3px rgba(255, 255, 255, 0.2),
            0 0 6px rgba(139, 92, 246, 0.4);
        }

        .robot-arm {
          position: absolute;
          z-index: 0;
          top: 56px;
          width: 17px;
          height: 33px;
          border-radius: 14px;
          background: linear-gradient(145deg, #1a1433, #241b3d);
          border: 2px solid rgba(139, 92, 246, .3);
        }

        .robot-arm-left {
          left: 16px;
          transform: rotate(18deg);
        }

        .robot-arm-right {
          right: 16px;
          transform: rotate(-18deg);
        }

        /* ================= RESPONSIVE ================= */

        @media (max-width: 1250px) {
          .sidebar {
            width: 220px;
            flex-basis: 220px;
          }

          .brand-text {
            font-size: 20px;
          }

          .content-grid {
            grid-template-columns: minmax(0, 1fr) 270px;
          }

          .chat-panel {
            grid-template-columns: 205px minmax(0, 1fr);
          }

          .agent-bubble {
            width: min(457px, 100%);
          }
        }

        @media (max-width: 1050px) {
          .sidebar {
            width: 72px;
            flex-basis: 72px;
            padding: 25px 10px;
          }

          .brand {
            justify-content: center;
            padding-bottom: 28px;
          }

          .brand-text,
          .brand-subtitle,
          .nav-item span,
          .agent-promo {
            display: none;
          }

          .nav-item {
            justify-content: center;
            padding: 0;
          }

          .content-grid {
            grid-template-columns: 1fr;
          }

          .right-column {
            display: none;
          }
        }

        @media (max-width: 760px) {
          .sidebar {
            display: none;
          }

          .topbar {
            height: auto;
            padding: 20px;
            flex-direction: column;
            gap: 20px;
          }

          .top-actions {
            align-items: flex-start;
            width: 100%;
          }

          .profile-row {
            display: none;
          }

          .toolbar-row {
            width: 100%;
          }

          .date-button {
            flex: 1;
            min-width: 0;
          }

          .content-grid {
            padding: 0 14px 20px;
          }

          .chat-panel {
            height: auto;
            max-height: none;
            min-height: 780px;
            grid-template-columns: 1fr;
          }

          .conversation-list {
            display: none;
          }

          .agent-bubble {
            width: 100%;
          }

          .user-message {
            width: 90%;
          }
        }
      `}</style>

      <main className="seo-page">
        {/* ================= LEFT SIDEBAR ================= */}
        <aside className="sidebar">
          <div className="brand">
            <img className="brand-heart" src={platformLogoUrl(platform)} alt={`${platformLabel(platform)} logo`} />
            <div>
              <div className="brand-text">
                {platformLabel(platform)}<span>.com</span>
              </div>
              <div className="brand-subtitle">SEO Agent Special</div>
            </div>
          </div>

          <nav className="sidebar-nav">
            {SEO_NAV.map((item) => {
              const href = `/seo-agent-special/${platform}/${item.href}`;
              const Icon = item.icon;
              return (
                <Link href={href} className={`nav-item ${pathname === href ? "active-link" : ""}`} key={item.href}>
                  <Icon />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="agent-promo">
            <h4>SEO AI Agent</h4>

            <div className="robot-wrap">
              <Robot />
            </div>

            <div className="agent-promo-title">Hi! I&apos;m your SEO AI Agent.</div>

            <p>
              I analyze, optimize &
              <br />
              grow your traffic.
            </p>

            <Link href="/ai-agents" className="new-chat-button" style={{ display: "block", textAlign: "center", textDecoration: "none", lineHeight: "37px" }}>
              Back to Hub
            </Link>
          </div>
        </aside>

        {/* ================= MAIN ================= */}
        <section className="main-shell">
          <header className="topbar">
            <div className="page-heading">
              <h1>
                Chat with AI Agent
                <Sparkles />
              </h1>
              <p>Get instant SEO insights and recommendations</p>
            </div>

            <div className="top-actions">
              <div className="profile-row">
                <button className="bell">
                  <Bell />
                </button>

                <div className="profile">
                  <div className="avatar">
                    <div className="avatar-inner" />
                  </div>

                  <div className="profile-name">
                    <strong>Adnan</strong>
                    <span>SEO Manager</span>
                  </div>

                  <ChevronDown className="profile-chevron" />
                </div>
              </div>

              <div className="toolbar-row">
                <button className="date-button">
                  <CalendarDays />
                  May 22, 2025 - Jun 21, 2025
                </button>

                <button className="export-button">
                  <FileText />
                  Export Chat
                </button>
              </div>
            </div>
          </header>

          <div className="content-grid">
            {/* ================= CHAT PANEL ================= */}
            <section className="chat-panel">
              <aside className="conversation-list">
                <div className="conversation-top">
                  <strong>Current Session</strong>
                </div>

                <div className="conversation-items">
                  <div className="conversation-item active">
                    <div className="conversation-item-head">
                      <div className="conversation-icon">
                        <Sparkles size={15} />
                      </div>
                      <div className="conversation-meta">
                        <strong>{platformLabel(platform)} SEO Agent</strong>
                      </div>
                    </div>
                    <p className="conversation-preview">{messages.length} message{messages.length === 1 ? "" : "s"} this session</p>
                  </div>
                </div>
              </aside>

              {/* ================= CHAT ================= */}
              <section className="chat-area">
                <header className="chat-header">
                  <div className="chat-agent-avatar">
                    <Robot small />
                  </div>

                  <div className="chat-agent-info">
                    <strong>
                      SEO AI Agent
                      <span className="online-dot" />
                      <span
                        style={{
                          color: "#94a3b8",
                          fontSize: 10,
                          fontWeight: 500,
                        }}
                      >
                        Online
                      </span>
                    </strong>

                    <p>Your intelligent SEO assistant</p>
                  </div>
                </header>

                <div className="messages">
                  {messages.map((m, i) =>
                    m.role === "user" ? (
                      <div className="user-message-wrap" key={i}>
                        <div>
                          <div className="user-message">{m.content}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="agent-message-row" key={i}>
                        <div className="agent-message-side">
                          <Robot small />
                        </div>
                        <div>
                          <div
                            className="agent-bubble"
                            style={m.error ? { color: "#f43f5e", background: "rgba(244,63,94,.14)", borderColor: "rgba(244,63,94,.3)" } : undefined}
                          >
                            <p className="agent-bubble-intro" style={{ marginBottom: 0, whiteSpace: "pre-wrap" }}>
                              {m.content}
                            </p>
                          </div>
                        </div>
                      </div>
                    ),
                  )}

                  {sending && (
                    <div className="agent-message-row">
                      <div className="agent-message-side">
                        <Robot small />
                      </div>
                      <div className="agent-bubble" style={{ display: "inline-flex", gap: 4 }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#8b5cf6" }} />
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#8b5cf6" }} />
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#8b5cf6" }} />
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>

                <div className="composer-section">
                  <div className="quick-actions">
                    <button type="button" className="quick-action" disabled={sending} onClick={() => send("Give me keyword ideas for this topic")}>
                      <Search />
                      Keyword ideas for this topic
                    </button>

                    <button type="button" className="quick-action" disabled={sending} onClick={() => send("Check the readability score of our recent posts")}>
                      <ChartNoAxesCombined />
                      Check readability score
                    </button>

                    <button type="button" className="quick-action" disabled={sending} onClick={() => send("Suggest internal links for our blog")}>
                      <Link2 />
                      Suggest internal links
                    </button>

                    <button type="button" className="quick-action" disabled={sending} onClick={() => send("What else should we improve?")}>
                      <Sparkles />
                      More suggestions
                    </button>
                  </div>

                  <form
                    className="message-composer"
                    onSubmit={(e) => {
                      e.preventDefault();
                      send(message);
                    }}
                  >
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          send(message);
                        }
                      }}
                      placeholder="Ask me anything about SEO..."
                      disabled={sending}
                    />

                    <div className="composer-bottom">
                      <div className="composer-tools">
                        <button type="button">
                          <Paperclip />
                        </button>
                      </div>

                      <button type="submit" className="send-button" disabled={sending || !message.trim()}>
                        <Send />
                      </button>
                    </div>
                  </form>

                  <div className="disclaimer">
                    AI responses may not always be 100% accurate. Please verify
                    important information.
                  </div>
                </div>
              </section>
            </section>

            {/* ================= RIGHT COLUMN ================= */}
            <aside className="right-column">
              <section className="side-card">
                <h3>Conversation Insights</h3>

                <div className="insight-list">
                  <div className="insight-row">
                    <div className="insight-icon tone-purple">
                      <MessageSquare />
                    </div>
                    <span className="insight-label">Total Messages</span>
                    <strong className="insight-value">24</strong>
                  </div>

                  <div className="insight-row">
                    <div className="insight-icon tone-blue">
                      <BadgeCheck />
                    </div>
                    <span className="insight-label">Topics Discussed</span>
                    <strong className="insight-value">6</strong>
                  </div>

                  <div className="insight-row">
                    <div className="insight-icon tone-orange">
                      <Sparkles />
                    </div>
                    <span className="insight-label">Recommendations</span>
                    <strong className="insight-value">18</strong>
                  </div>

                  <div className="insight-row">
                    <div className="insight-icon tone-green">
                      <TrendingUp />
                    </div>
                    <span className="insight-label">Avg. Response Time</span>
                    <strong className="insight-value">2.3s</strong>
                  </div>
                </div>
              </section>

              <section className="side-card">
                <h3>Popular Topics</h3>

                <div className="topic-tags">
                  <span className="topic-tag topic-keyword">
                    Keyword Research
                  </span>

                  <span className="topic-tag topic-content">
                    Content Optimization
                  </span>

                  <span className="topic-tag topic-technical">
                    Technical SEO
                  </span>

                  <span className="topic-tag topic-backlink">Backlinks</span>

                  <span className="topic-tag topic-rank">
                    Rank Tracking
                  </span>
                </div>
              </section>

              <section className="side-card">
                <h3>AI Agent Capabilities</h3>

                <div className="capability-list">
                  {capabilities.map((capability) => {
                    const Icon = capability.icon;

                    return (
                      <div className="capability" key={capability.title}>
                        <div
                          className={`capability-icon tone-${capability.tone}`}
                        >
                          <Icon />
                        </div>

                        <div className="capability-text">
                          <strong>{capability.title}</strong>
                          <span>{capability.text}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="learn-more">
                  Learn more about AI Agent
                  <ArrowUpRight />
                </div>
              </section>
            </aside>
          </div>
        </section>
      </main>
    </>
  );
}
