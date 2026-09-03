"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Crown,
  Diamond,
  FileBarChart,
  FileText,
  HeartHandshake,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  MoreHorizontal,
  ReceiptText,
  Rocket,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  WalletCards,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Bot,
  Send,
  Landmark,
  CreditCard,
  PieChart,
  TrendingUp,
  Target,
  CircleDollarSign,
  Menu,
} from "lucide-react";
import { usePlatformParam, useFinanceSnapshot, platformLabel, platformLogoUrl } from "@/lib/agent-data";

const FINANCE_NAV = [
  { href: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "transactions", label: "Transactions", icon: ReceiptText },
  { href: "reports", label: "Reports", icon: FileBarChart },
  { href: "payouts", label: "Payouts", icon: WalletCards },
  { href: "chat", label: "Chat", icon: Bot },
];

export default function FinanceManagerDashboard({ params }: { params: Promise<{ platform: string }> }) {
  const platform = usePlatformParam(params);
  const pathname = usePathname();
  const finance = useFinanceSnapshot(platform);
  const [range, setRange] = useState("May 1 – May 31, 2025");

  const transactions = useMemo(
    () => [
      {
        icon: Crown,
        name: "Premium Subscription",
        subtitle: "by Member #SL12598",
        amount: "+ PKR 2,999",
        date: "May 31, 2025",
        type: "positive",
        tone: "orange",
      },
      {
        icon: Zap,
        name: "Membership Plan – Gold",
        subtitle: "by Member #SL12602",
        amount: "+ PKR 4,999",
        date: "May 31, 2025",
        type: "positive",
        tone: "amber",
      },
      {
        icon: Rocket,
        name: "Boost Profile",
        subtitle: "by Member #SL12610",
        amount: "+ PKR 1,499",
        date: "May 30, 2025",
        type: "positive",
        tone: "blue",
      },
      {
        icon: Landmark,
        name: "Payout to Partner",
        subtitle: "to Partner #PR556",
        amount: "- PKR 25,000",
        date: "May 30, 2025",
        type: "negative",
        tone: "purple",
      },
      {
        icon: CreditCard,
        name: "Payment Gateway Fee",
        subtitle: "Transaction Charges",
        amount: "- PKR 3,210",
        date: "May 30, 2025",
        type: "negative",
        tone: "pink",
      },
    ],
    [],
  );

  const expenses = [
    {
      name: "Marketing & Ads",
      value: "PKR 2,450,000",
      percent: "39%",
      width: "39%",
      className: "expense-purple",
    },
    {
      name: "Salaries & Team",
      value: "PKR 1,780,000",
      percent: "28%",
      width: "28%",
      className: "expense-pink",
    },
    {
      name: "Technology & Tools",
      value: "PKR 1,220,000",
      percent: "19%",
      width: "19%",
      className: "expense-orange",
    },
    {
      name: "Payment Processing",
      value: "PKR 480,000",
      percent: "8%",
      width: "8%",
      className: "expense-blue",
    },
    {
      name: "Others",
      value: "PKR 355,200",
      percent: "6%",
      width: "6%",
      className: "expense-green",
    },
  ];

  return (
    <>
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          min-height: 100%;
          background: #030712;
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
          color: #f1f5f9;
        }

        button,
        input {
          font: inherit;
        }

        button {
          cursor: pointer;
        }

        .finance-app {
          min-height: 100vh;
          display: flex;
          background:
            radial-gradient(circle at 48% 0%, rgba(139, 92, 246, 0.09), transparent 31%),
            #030712;
        }

        /* ================= SIDEBAR ================= */

        .sidebar {
          position: fixed;
          z-index: 20;
          inset: 0 auto 0 0;
          width: 238px;
          min-height: 100vh;
          padding: 16px 10px;
          color: white;
          background:
            radial-gradient(circle at 50% -10%, rgba(139, 92, 246, 0.24), transparent 32%),
            linear-gradient(180deg, #0d1526 0%, #070b14 52%, #05080f 100%);
          box-shadow: 8px 0 30px rgba(0, 0, 0, 0.3);
        }

        .brand {
          height: 76px;
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 0 12px 15px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          margin-bottom: 10px;
        }

        .brand-mark {
          position: relative;
          width: 39px;
          height: 39px;
          flex: 0 0 auto;
        }

        .brand-mark img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .brand-name {
          line-height: 1;
        }

        .brand-name strong {
          display: block;
          font-size: 22px;
          letter-spacing: -0.8px;
          font-weight: 800;
          background: linear-gradient(90deg, #8b5cf6, #38bdf8);
          -webkit-background-clip: text;
          color: transparent;
        }

        .brand-name strong span {
          font-size: 15px;
          color: #8b5cf6;
        }

        .brand-name small {
          display: block;
          color: #94a3b8;
          margin-top: 7px;
          font-size: 10px;
          font-weight: 500;
        }

        .side-nav {
          display: flex;
          flex-direction: column;
          gap: 3px;
          height: calc(100vh - 112px);
        }

        .nav-main {
          flex: 1;
        }

        .nav-item,
        .nav-subitem {
          border: 0;
          color: #f1f5f9;
          background: transparent;
          width: 100%;
          min-height: 39px;
          padding: 0 13px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 13px;
          text-decoration: none;
          font-size: 14px;
          transition:
            0.2s ease,
            transform 0.2s ease;
        }

        .nav-item:hover,
        .nav-subitem:hover {
          background: rgba(255, 255, 255, 0.07);
          color: white;
        }

        .nav-item svg {
          width: 17px;
          height: 17px;
          stroke-width: 1.8;
        }

        .nav-item.active {
          color: white;
          background: linear-gradient(90deg, #7c3aed, #8b5cf6);
          box-shadow:
            inset 0 0 0 1px rgba(255, 255, 255, 0.07),
            0 5px 15px rgba(0, 0, 0, 0.13);
        }

        .nav-item.finance {
          margin-top: 5px;
        }

        .nav-chevron {
          margin-left: auto;
          width: 15px !important;
        }

        .sub-nav {
          margin: 2px 0 10px 25px;
          padding: 0 0 0 12px;
          border-left: 1px solid rgba(139, 92, 246, 0.35);
          display: grid;
          gap: 3px;
        }

        .nav-subitem {
          min-height: 31px;
          padding: 0 6px;
          border-radius: 6px;
          color: #94a3b8;
          font-size: 13px;
        }

        .nav-bottom {
          display: grid;
          gap: 3px;
          padding-top: 8px;
        }

        .new-badge {
          margin-left: auto;
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 10px;
          font-weight: 700;
          color: #f1f5f9;
          background: rgba(139, 92, 246, 0.4);
        }

        /* ================= MAIN ================= */

        .main-shell {
          width: calc(100% - 238px);
          margin-left: 238px;
          min-height: 100vh;
        }

        .topbar {
          position: sticky;
          z-index: 15;
          top: 0;
          height: 93px;
          padding: 0 25px;
          display: flex;
          align-items: center;
          background: rgba(3, 7, 18, 0.88);
          backdrop-filter: blur(22px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.07);
        }

        .topbar-title {
          display: flex;
          align-items: center;
          gap: 16px;
          min-width: 420px;
        }

        .topbar-icon {
          width: 44px;
          height: 44px;
          display: grid;
          place-items: center;
          border-radius: 15px;
          color: #94a3b8;
          background: #0d1526;
          box-shadow: 0 7px 20px rgba(0, 0, 0, 0.3);
        }

        .topbar-icon svg {
          width: 24px;
          height: 24px;
        }

        .page-heading h1 {
          margin: 0;
          font-size: 21px;
          font-weight: 750;
          letter-spacing: -0.45px;
          color: #f1f5f9;
        }

        .page-heading p {
          margin: 6px 0 0;
          font-size: 12px;
          color: #94a3b8;
        }

        .magic {
          display: inline-flex;
          color: #8b5cf6;
          margin-left: 7px;
          vertical-align: top;
        }

        .magic svg {
          width: 20px;
          height: 20px;
        }

        .topbar-actions {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .date-picker {
          min-width: 250px;
          height: 45px;
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 9px;
          background: #0b1220;
          color: #f1f5f9;
          padding: 0 13px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          box-shadow: 0 5px 14px rgba(0, 0, 0, 0.3);
          font-size: 12px;
        }

        .notification {
          position: relative;
          width: 45px;
          height: 45px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          border: 0;
          background: #0d1526;
          color: #94a3b8;
        }

        .notification svg {
          width: 19px;
          height: 19px;
        }

        .notification-dot {
          position: absolute;
          top: 3px;
          right: 3px;
          width: 16px;
          height: 16px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          color: white;
          background: #f43f5e;
          font-size: 8px;
          border: 2px solid #0d1526;
        }

        .admin {
          display: flex;
          align-items: center;
          gap: 10px;
          padding-left: 4px;
        }

        .avatar {
          width: 43px;
          height: 43px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: linear-gradient(145deg, #0d1526, #1a1433);
          color: #94a3b8;
          overflow: hidden;
        }

        .avatar svg {
          width: 26px;
          height: 26px;
          fill: #94a3b8;
        }

        .admin-text strong {
          display: block;
          font-size: 13px;
          font-weight: 700;
        }

        .admin-text span {
          display: block;
          margin-top: 4px;
          font-size: 10px;
          color: #94a3b8;
        }

        .admin > svg {
          width: 15px;
          color: #94a3b8;
          margin-left: 7px;
        }

        /* ================= CONTENT ================= */

        .content {
          max-width: 1285px;
          margin: 0 auto;
          padding: 20px 20px 28px;
        }

        .dashboard-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 244px;
          gap: 11px;
          align-items: start;
        }

        .main-grid {
          min-width: 0;
          display: grid;
          gap: 10px;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .card {
          background: rgba(11, 18, 32, 0.88);
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 10px;
          box-shadow:
            0 7px 20px rgba(0, 0, 0, 0.35),
            0 1px 1px rgba(0, 0, 0, 0.15);
        }

        .metric-card {
          min-height: 132px;
          padding: 16px 15px;
          position: relative;
          overflow: hidden;
        }

        .metric-card::after {
          content: "";
          position: absolute;
          width: 120px;
          height: 120px;
          right: -68px;
          top: -70px;
          border-radius: 50%;
          opacity: 0.32;
        }

        .metric-card:nth-child(1)::after {
          background: #8b5cf6;
        }

        .metric-card:nth-child(2)::after {
          background: #22c55e;
        }

        .metric-card:nth-child(3)::after {
          background: #f43f5e;
        }

        .metric-card:nth-child(4)::after {
          background: #38bdf8;
        }

        .metric-label {
          position: relative;
          z-index: 1;
          font-size: 11px;
          font-weight: 600;
          color: #f1f5f9;
        }

        .metric-value {
          position: relative;
          z-index: 1;
          margin-top: 13px;
          font-size: 20px;
          font-weight: 750;
          letter-spacing: -0.35px;
          color: #f1f5f9;
        }

        .metric-bottom {
          position: relative;
          z-index: 1;
          margin-top: 15px;
          display: flex;
          flex-direction: column;
          gap: 7px;
          font-size: 10px;
          color: #94a3b8;
        }

        .metric-change {
          font-size: 10px;
          font-weight: 650;
          display: inline-flex;
          align-items: center;
          gap: 3px;
        }

        .metric-change.up {
          color: #22c55e;
        }

        .metric-change.down {
          color: #f43f5e;
        }

        .metric-icon {
          position: absolute;
          z-index: 2;
          right: 17px;
          top: 16px;
          width: 42px;
          height: 42px;
          border-radius: 50%;
          display: grid;
          place-items: center;
        }

        .metric-icon svg {
          width: 19px;
          height: 19px;
        }

        .purple {
          color: #8b5cf6;
          background: rgba(139, 92, 246, 0.16);
        }

        .green {
          color: #22c55e;
          background: rgba(34, 197, 94, 0.16);
        }

        .red {
          color: #f43f5e;
          background: rgba(244, 63, 94, 0.16);
        }

        .blue {
          color: #38bdf8;
          background: rgba(56, 189, 248, 0.16);
        }

        /* ================= CHART ROW ================= */

        .chart-row {
          display: grid;
          grid-template-columns: 1.12fr 0.93fr;
          gap: 10px;
        }

        .revenue-card,
        .income-card {
          min-height: 297px;
          padding: 13px 12px 10px;
          overflow: hidden;
        }

        .card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 12px;
        }

        .card-header h2 {
          margin: 0;
          font-size: 13px;
          font-weight: 700;
          color: #f1f5f9;
        }

        .select-small {
          height: 34px;
          min-width: 118px;
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 8px;
          background: #0d1526;
          color: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 10px;
          font-size: 11px;
        }

        .revenue-chart {
          height: 236px;
          position: relative;
          margin-top: 5px;
          padding-left: 47px;
          padding-bottom: 30px;
        }

        .chart-lines {
          position: absolute;
          left: 0;
          right: 4px;
          top: 4px;
          bottom: 29px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          pointer-events: none;
        }

        .chart-gridline {
          position: relative;
          width: 100%;
          height: 1px;
          background: rgba(255, 255, 255, 0.07);
        }

        .chart-gridline span {
          position: absolute;
          left: -41px;
          top: -8px;
          color: #94a3b8;
          font-size: 9px;
        }

        .chart-area {
          position: absolute;
          left: 47px;
          right: 4px;
          top: 5px;
          bottom: 30px;
        }

        .chart-area svg {
          width: 100%;
          height: 100%;
          overflow: visible;
        }

        .chart-labels {
          position: absolute;
          left: 68px;
          right: 8px;
          bottom: 0;
          display: flex;
          justify-content: space-between;
          color: #94a3b8;
          font-size: 9px;
        }

        .chart-tooltip {
          position: absolute;
          right: 11px;
          top: 5px;
          padding: 10px 12px;
          min-width: 103px;
          border-radius: 9px;
          background: #0d1526;
          border: 1px solid rgba(255, 255, 255, 0.07);
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.4);
          font-size: 9px;
          line-height: 1.55;
          color: #94a3b8;
        }

        .chart-tooltip strong {
          display: block;
          margin-top: 3px;
          font-size: 11px;
          color: #f1f5f9;
        }

        /* ================= INCOME ================= */

        .income-content {
          display: flex;
          align-items: center;
          gap: 21px;
          height: 225px;
        }

        .donut-wrap {
          position: relative;
          flex: 0 0 175px;
          width: 175px;
          height: 175px;
          border-radius: 50%;
          background: conic-gradient(
            #f43f5e 0deg 80deg,
            #f59e0b 80deg 116deg,
            #38bdf8 116deg 138deg,
            #8b5cf6 138deg 360deg
          );
          box-shadow: 0 10px 24px rgba(139, 92, 246, 0.15);
        }

        .donut-wrap::before {
          content: "";
          position: absolute;
          inset: 35px;
          border-radius: 50%;
          background: #0b1220;
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.07);
        }

        .donut-center {
          position: absolute;
          inset: 0;
          display: grid;
          place-content: center;
          text-align: center;
          z-index: 1;
        }

        .donut-center span {
          font-size: 11px;
          color: #94a3b8;
        }

        .donut-center strong {
          margin-top: 7px;
          font-size: 15px;
          color: #f1f5f9;
        }

        .income-legend {
          display: grid;
          gap: 13px;
          flex: 1;
        }

        .legend-item {
          display: grid;
          grid-template-columns: 10px 1fr;
          gap: 10px;
          align-items: start;
        }

        .legend-dot {
          width: 10px;
          height: 10px;
          margin-top: 3px;
          border-radius: 50%;
        }

        .legend-copy strong {
          display: block;
          font-size: 11px;
          color: #f1f5f9;
          font-weight: 650;
        }

        .legend-copy span {
          display: block;
          margin-top: 4px;
          font-size: 10px;
          color: #94a3b8;
        }

        /* ================= LOWER ================= */

        .lower-row {
          display: grid;
          grid-template-columns: 0.97fr 1.03fr;
          gap: 10px;
        }

        .transactions-card,
        .expense-card {
          min-height: 318px;
          padding: 12px 12px 10px;
        }

        .view-button {
          border: 1px solid rgba(255, 255, 255, 0.07);
          background: #0d1526;
          border-radius: 8px;
          min-width: 72px;
          height: 30px;
          font-size: 10px;
          color: #f1f5f9;
        }

        .transaction-list {
          margin-top: 2px;
        }

        .transaction {
          min-height: 50px;
          display: grid;
          grid-template-columns: 40px minmax(0, 1fr) auto;
          align-items: center;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          gap: 8px;
        }

        .transaction:last-child {
          border-bottom: 0;
        }

        .transaction-icon {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: grid;
          place-items: center;
        }

        .transaction-icon svg {
          width: 17px;
          height: 17px;
        }

        .transaction-icon.orange {
          color: #f59e0b;
          background: rgba(245, 158, 11, 0.16);
        }

        .transaction-icon.amber {
          color: #f59e0b;
          background: rgba(245, 158, 11, 0.16);
        }

        .transaction-icon.blue {
          color: #38bdf8;
          background: rgba(56, 189, 248, 0.16);
        }

        .transaction-icon.purple {
          color: #8b5cf6;
          background: rgba(139, 92, 246, 0.16);
        }

        .transaction-icon.pink {
          color: #f43f5e;
          background: rgba(244, 63, 94, 0.16);
        }

        .transaction-copy {
          min-width: 0;
        }

        .transaction-copy strong {
          display: block;
          font-size: 10.5px;
          font-weight: 650;
          color: #f1f5f9;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .transaction-copy span {
          display: block;
          margin-top: 4px;
          font-size: 9px;
          color: #94a3b8;
        }

        .transaction-value {
          text-align: right;
        }

        .transaction-value strong {
          display: block;
          font-size: 10px;
          letter-spacing: 0.1px;
        }

        .transaction-value strong.positive {
          color: #22c55e;
        }

        .transaction-value strong.negative {
          color: #f43f5e;
        }

        .transaction-value span {
          display: block;
          margin-top: 4px;
          color: #94a3b8;
          font-size: 8.5px;
        }

        /* ================= EXPENSE ================= */

        .expense-list {
          margin-top: 11px;
          display: grid;
          gap: 13px;
        }

        .expense-item {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto 44px;
          align-items: center;
          gap: 12px;
        }

        .expense-main {
          min-width: 0;
        }

        .expense-title {
          font-size: 10px;
          color: #f1f5f9;
          margin-bottom: 7px;
        }

        .expense-track {
          height: 6px;
          width: 100%;
          background: rgba(255, 255, 255, 0.07);
          border-radius: 99px;
          overflow: hidden;
        }

        .expense-fill {
          height: 100%;
          border-radius: 99px;
        }

        .expense-purple {
          background: linear-gradient(90deg, #7c3aed, #8b5cf6);
        }

        .expense-pink {
          background: linear-gradient(90deg, #be123c, #f43f5e);
        }

        .expense-orange {
          background: linear-gradient(90deg, #d97706, #f59e0b);
        }

        .expense-blue {
          background: linear-gradient(90deg, #0284c7, #38bdf8);
        }

        .expense-green {
          background: linear-gradient(90deg, #16a34a, #22c55e);
        }

        .expense-value {
          font-size: 9px;
          color: #94a3b8;
          white-space: nowrap;
        }

        .expense-percent {
          font-size: 9px;
          color: #94a3b8;
          text-align: right;
        }

        .expense-total {
          border-top: 1px solid rgba(255, 255, 255, 0.07);
          margin-top: 14px;
          padding-top: 12px;
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          color: #f1f5f9;
        }

        .expense-total strong {
          font-size: 10px;
        }

        /* ================= RECOMMENDATION ================= */

        .recommendation {
          min-height: 106px;
          padding: 14px 16px;
          display: flex;
          align-items: center;
          gap: 17px;
        }

        .recommendation-orb {
          width: 70px;
          height: 70px;
          flex: 0 0 auto;
          border-radius: 50%;
          display: grid;
          place-items: center;
          color: white;
          background:
            radial-gradient(circle at 35% 25%, #a78bfa, transparent 22%),
            linear-gradient(145deg, #8b5cf6, #7c3aed);
          box-shadow: 0 11px 20px rgba(139, 92, 246, 0.35);
        }

        .recommendation-orb svg {
          width: 32px;
          height: 32px;
        }

        .recommendation-copy {
          flex: 1;
        }

        .recommendation-title {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .recommendation-title h3 {
          margin: 0;
          font-size: 12px;
          color: #f1f5f9;
        }

        .recommendation-title span {
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 9px;
          color: #8b5cf6;
          background: rgba(139, 92, 246, 0.16);
          font-weight: 700;
        }

        .recommendation-copy p {
          margin: 7px 0 0;
          font-size: 10px;
          color: #94a3b8;
          line-height: 1.65;
        }

        .action-button {
          min-width: 179px;
          height: 45px;
          border: 0;
          border-radius: 7px;
          color: white;
          font-size: 11px;
          font-weight: 650;
          background: linear-gradient(90deg, #7c3aed, #8b5cf6);
          box-shadow: 0 9px 18px rgba(139, 92, 246, 0.3);
        }

        /* ================= AI PANEL ================= */

        .ai-panel {
          min-height: 903px;
          padding: 12px 9px;
          display: flex;
          flex-direction: column;
          background:
            linear-gradient(180deg, rgba(11, 18, 32, 0.97), rgba(13, 21, 38, 0.96));
        }

        .ai-panel-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 2px;
        }

        .ai-panel-header h2 {
          margin: 0;
          font-size: 13px;
          color: #f1f5f9;
        }

        .ai-panel-header button {
          border: 0;
          background: transparent;
          color: #5b6780;
          padding: 0;
        }

        .online {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #94a3b8;
          font-size: 9px;
          margin-top: 9px;
        }

        .online-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #22c55e;
        }

        /* robot */

        .robot {
          position: relative;
          width: 150px;
          height: 137px;
          margin: 6px auto 4px;
        }

        .robot-head {
          position: absolute;
          width: 79px;
          height: 65px;
          left: 35px;
          top: 18px;
          border-radius: 33px 33px 27px 27px;
          background:
            linear-gradient(145deg, #0d1526, #1a1433 45%, #241b3d);
          border: 2px solid rgba(139, 92, 246, 0.4);
          box-shadow:
            inset 8px 7px 12px rgba(139, 92, 246, 0.15),
            0 8px 16px rgba(0, 0, 0, 0.35);
        }

        .robot-screen {
          position: absolute;
          left: 13px;
          top: 16px;
          width: 50px;
          height: 31px;
          border-radius: 17px;
          background: linear-gradient(145deg, #05080f, #0d1526);
          box-shadow: inset 0 0 12px #000;
        }

        .robot-eye {
          position: absolute;
          top: 11px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #8b5cf6;
          box-shadow: 0 0 9px #8b5cf6;
        }

        .robot-eye.left {
          left: 13px;
        }

        .robot-eye.right {
          right: 13px;
        }

        .robot-ear {
          position: absolute;
          top: 30px;
          width: 17px;
          height: 29px;
          border-radius: 10px;
          background: linear-gradient(180deg, #2a2145, #1a1433);
          border: 1px solid rgba(139, 92, 246, 0.3);
        }

        .robot-ear.left {
          left: 24px;
        }

        .robot-ear.right {
          right: 25px;
        }

        .robot-neck {
          position: absolute;
          top: 78px;
          left: 65px;
          width: 19px;
          height: 17px;
          background: #2a2145;
          border-radius: 5px;
        }

        .robot-body {
          position: absolute;
          top: 89px;
          left: 44px;
          width: 61px;
          height: 43px;
          border-radius: 25px 25px 15px 15px;
          background:
            linear-gradient(145deg, #0d1526 10%, #1a1433 55%, #241b3d);
          border: 1px solid rgba(139, 92, 246, 0.3);
        }

        .robot-chest {
          position: absolute;
          width: 19px;
          height: 26px;
          left: 20px;
          top: 6px;
          border-radius: 8px;
          background: linear-gradient(180deg, #7c3aed, #8b5cf6);
        }

        .robot-arm {
          position: absolute;
          top: 94px;
          width: 20px;
          height: 39px;
          border-radius: 14px;
          background: linear-gradient(145deg, #1a1433, #241b3d);
          border: 1px solid rgba(139, 92, 246, 0.3);
        }

        .robot-arm.left {
          left: 29px;
          transform: rotate(32deg);
        }

        .robot-arm.right {
          right: 29px;
          transform: rotate(-32deg);
        }

        .robot-wave {
          position: absolute;
          right: 15px;
          top: 89px;
          width: 21px;
          height: 16px;
          border-radius: 9px;
          background: #2a2145;
          transform: rotate(-16deg);
          border: 1px solid rgba(139, 92, 246, 0.3);
        }

        .ai-greeting {
          padding: 4px 5px 12px;
        }

        .ai-greeting h3 {
          margin: 0;
          font-size: 12px;
          color: #f1f5f9;
        }

        .ai-greeting p {
          margin: 8px 0 0;
          font-size: 10px;
          line-height: 1.8;
          color: #94a3b8;
        }

        .insights {
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          padding: 13px 0 12px;
        }

        .insights h3 {
          margin: 0 0 10px;
          font-size: 11px;
          color: #f1f5f9;
        }

        .insight-list {
          display: grid;
          gap: 10px;
        }

        .insight {
          display: grid;
          grid-template-columns: 30px 1fr;
          gap: 8px;
          align-items: start;
        }

        .insight-icon {
          width: 29px;
          height: 29px;
          display: grid;
          place-items: center;
          border-radius: 50%;
        }

        .insight-icon svg {
          width: 15px;
          height: 15px;
        }

        .insight p {
          margin: 0;
          font-size: 9px;
          color: #94a3b8;
          line-height: 1.55;
        }

        .insight.green .insight-icon {
          color: #22c55e;
          background: rgba(34, 197, 94, 0.16);
        }

        .insight.orange .insight-icon {
          color: #f59e0b;
          background: rgba(245, 158, 11, 0.16);
        }

        .insight.blue .insight-icon {
          color: #38bdf8;
          background: rgba(56, 189, 248, 0.16);
        }

        .insight.purple .insight-icon {
          color: #8b5cf6;
          background: rgba(139, 92, 246, 0.16);
        }

        .ai-actions {
          display: grid;
          gap: 7px;
          padding-top: 10px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }

        .ai-action {
          height: 36px;
          border-radius: 7px;
          border: 1px solid rgba(139, 92, 246, 0.4);
          background: #0b1220;
          color: #8b5cf6;
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 0 10px;
          font-size: 10px;
          text-align: left;
          transition: 0.18s ease;
        }

        .ai-action:hover {
          transform: translateY(-1px);
          box-shadow: 0 7px 15px rgba(139, 92, 246, 0.2);
          background: rgba(139, 92, 246, 0.12);
        }

        .ai-action svg {
          width: 16px;
          height: 16px;
        }

        .ask-box {
          margin-top: auto;
          padding-top: 15px;
        }

        .ask-inner {
          min-height: 49px;
          padding: 5px 6px 5px 12px;
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 12px;
          background: #0b1220;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .ask-inner input {
          width: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          font-size: 9px;
          color: #f1f5f9;
        }

        .send-button {
          width: 34px;
          height: 34px;
          flex: 0 0 auto;
          border-radius: 50%;
          border: 0;
          display: grid;
          place-items: center;
          color: white;
          background: linear-gradient(145deg, #8b5cf6, #7c3aed);
        }

        .send-button svg {
          width: 15px;
          height: 15px;
        }

        .ai-disclaimer {
          margin: 13px 0 0;
          text-align: center;
          font-size: 8px;
          color: #5b6780;
          line-height: 1.6;
        }

        /* ================= RESPONSIVE ================= */

        @media (max-width: 1250px) {
          .dashboard-layout {
            grid-template-columns: minmax(0, 1fr);
          }

          .ai-panel {
            min-height: auto;
          }

          .topbar-title {
            min-width: 0;
          }
        }

        @media (max-width: 1050px) {
          .metrics-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .chart-row,
          .lower-row {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 820px) {
          .sidebar {
            width: 68px;
            padding: 12px 8px;
          }

          .brand {
            justify-content: center;
            padding: 0;
          }

          .brand-name,
          .nav-item span,
          .nav-item .nav-chevron,
          .new-badge,
          .sub-nav {
            display: none;
          }

          .nav-item {
            justify-content: center;
            padding: 0;
          }

          .main-shell {
            width: calc(100% - 68px);
            margin-left: 68px;
          }

          .topbar {
            padding: 0 14px;
          }

          .page-heading p,
          .date-picker,
          .admin-text,
          .admin > svg {
            display: none;
          }
        }

        @media (max-width: 620px) {
          .metrics-grid {
            grid-template-columns: 1fr;
          }

          .content {
            padding: 12px;
          }

          .topbar-title {
            min-width: 0;
          }

          .topbar-icon {
            display: none;
          }

          .page-heading h1 {
            font-size: 16px;
          }

          .recommendation {
            align-items: flex-start;
            flex-direction: column;
          }

          .action-button {
            width: 100%;
          }

          .income-content {
            flex-direction: column;
            height: auto;
            padding: 8px 0 16px;
          }

          .income-card {
            min-height: auto;
          }
        }
      `}</style>

      <div className="finance-app">
        {/* ================= SIDEBAR ================= */}

        <aside className="sidebar">
          <div className="brand">
            <div className="brand-mark">
              <img src={platformLogoUrl(platform)} alt={`${platformLabel(platform)} logo`} />
            </div>

            <div className="brand-name">
              <strong>
                {platformLabel(platform)}
                <span>.com</span>
              </strong>
              <small>Finance Agent Special</small>
            </div>
          </div>

          <nav className="side-nav">
            <div className="nav-main">
              {FINANCE_NAV.map((item) => {
                const href = `/finance-agent-special/${platform}/${item.href}`;
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={href} className={`nav-item ${pathname === href ? "active" : ""}`}>
                    <Icon />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            <div className="nav-bottom">
              <Link href="/ai-agents" className="nav-item">
                <LogOut />
                <span>Back to Hub</span>
              </Link>
            </div>
          </nav>
        </aside>

        {/* ================= MAIN ================= */}

        <main className="main-shell">
          <header className="topbar">
            <div className="topbar-title">
              <div className="topbar-icon">
                <BarChart3 />
              </div>

              <div className="page-heading">
                <h1>
                  {platformLabel(platform)} — Finance Manager AI Agent
                  <span className="magic">
                    <Sparkles />
                  </span>
                </h1>
                <p>
                  {finance.loading
                    ? "Loading real finance data…"
                    : finance.error
                      ? `Live data unavailable: ${finance.error}`
                      : "Your intelligent finance partner for smarter decisions"}
                </p>
              </div>
            </div>

            <div className="topbar-actions">
              <button
                className="date-picker"
                type="button"
                onClick={() => setRange("May 1 – May 31, 2025")}
              >
                <span>{range}</span>
                <CalendarDays size={16} />
              </button>

              <button className="notification">
                <Bell />
                <span className="notification-dot">3</span>
              </button>

              <div className="admin">
                <div className="avatar">
                  <Users />
                </div>

                <div className="admin-text">
                  <strong>Admin</strong>
                  <span>Super Admin</span>
                </div>

                <ChevronDown />
              </div>
            </div>
          </header>

          <div className="content">
            <div className="dashboard-layout">
              {/* ================= LEFT CONTENT ================= */}

              <div className="main-grid">
                <section className="metrics-grid">
                  <article className="card metric-card">
                    <span className="metric-label">{finance.totalRevenueLabel}</span>
                    <div className="metric-value">
                      {finance.loading ? "…" : finance.totalRevenuePkr === null ? "—" : `PKR ${finance.totalRevenuePkr.toLocaleString()}`}
                    </div>

                    <div className="metric-bottom">
                      <span>Real, live data</span>
                    </div>

                    <div className="metric-icon purple">
                      <CircleDollarSign />
                    </div>
                  </article>

                  <article className="card metric-card">
                    <span className="metric-label">{finance.secondaryLabel}</span>
                    <div className="metric-value">
                      {finance.loading ? "…" : finance.secondaryPkr === null ? "—" : `PKR ${finance.secondaryPkr.toLocaleString()}`}
                    </div>

                    <div className="metric-bottom">
                      {finance.changePct !== null && (
                        <span className={`metric-change ${finance.changePct >= 0 ? "up" : "down"}`}>
                          <ArrowUpRight size={11} />
                          {finance.changePct}%
                        </span>
                      )}
                      <span>Real, live data</span>
                    </div>

                    <div className="metric-icon green">
                      <TrendingUp />
                    </div>
                  </article>

                  <article className="card metric-card">
                    <span className="metric-label">Total Expenses</span>
                    <div className="metric-value">PKR 6,285,200</div>

                    <div className="metric-bottom">
                      <span className="metric-change down">
                        <ArrowUpRight size={11} />
                        12.4%
                      </span>
                      <span>Illustrative — not tracked yet</span>
                    </div>

                    <div className="metric-icon red">
                      <CreditCard />
                    </div>
                  </article>

                  <article className="card metric-card">
                    <span className="metric-label">{finance.cashOrPendingLabel}</span>
                    <div className="metric-value">{finance.loading ? "…" : (finance.cashOrPendingValue ?? "—")}</div>

                    <div className="metric-bottom">
                      <span>Real, live data</span>
                    </div>

                    <div className="metric-icon blue">
                      <WalletCards />
                    </div>
                  </article>
                </section>

                {/* ================= CHARTS ================= */}

                <section className="chart-row">
                  <article className="card revenue-card">
                    <div className="card-header">
                      <h2>Revenue Overview</h2>

                      <button className="select-small">
                        Monthly
                        <ChevronDown size={14} />
                      </button>
                    </div>

                    <div className="revenue-chart">
                      <div className="chart-lines">
                        <div className="chart-gridline">
                          <span>10M</span>
                        </div>
                        <div className="chart-gridline">
                          <span>8M</span>
                        </div>
                        <div className="chart-gridline">
                          <span>6M</span>
                        </div>
                        <div className="chart-gridline">
                          <span>4M</span>
                        </div>
                        <div className="chart-gridline">
                          <span>2M</span>
                        </div>
                      </div>

                      <div className="chart-area">
                        <svg
                          viewBox="0 0 650 190"
                          preserveAspectRatio="none"
                        >
                          <defs>
                            <linearGradient
                              id="revenueFill"
                              x1="0"
                              x2="0"
                              y1="0"
                              y2="1"
                            >
                              <stop
                                offset="0%"
                                stopColor="#8b5cf6"
                                stopOpacity="0.25"
                              />
                              <stop
                                offset="100%"
                                stopColor="#8b5cf6"
                                stopOpacity="0"
                              />
                            </linearGradient>
                          </defs>

                          <path
                            d="M0,164
                               C24,151 39,139 58,141
                               C82,143 87,146 108,132
                               C134,114 151,99 171,99
                               C192,99 204,108 224,101
                               C242,95 254,62 277,63
                               C300,65 321,66 343,66
                               C365,66 373,63 391,53
                               C417,39 425,48 447,49
                               C470,50 485,52 508,39
                               C531,26 545,20 567,19
                               C589,18 604,17 625,8
                               L650,5
                               L650,190
                               L0,190 Z"
                            fill="url(#revenueFill)"
                          />

                          <path
                            d="M0,164
                               C24,151 39,139 58,141
                               C82,143 87,146 108,132
                               C134,114 151,99 171,99
                               C192,99 204,108 224,101
                               C242,95 254,62 277,63
                               C300,65 321,66 343,66
                               C365,66 373,63 391,53
                               C417,39 425,48 447,49
                               C470,50 485,52 508,39
                               C531,26 545,20 567,19
                               C589,18 604,17 625,8
                               L650,5"
                            fill="none"
                            stroke="#8b5cf6"
                            strokeWidth="3"
                            strokeLinecap="round"
                          />

                          {[
                            [0, 164],
                            [58, 141],
                            [171, 99],
                            [224, 101],
                            [277, 63],
                            [391, 53],
                            [508, 39],
                            [567, 19],
                            [650, 5],
                          ].map(([cx, cy], i) => (
                            <circle
                              key={i}
                              cx={cx}
                              cy={cy}
                              r="4.2"
                              fill="#0b1220"
                              stroke="#8b5cf6"
                              strokeWidth="2.5"
                            />
                          ))}
                        </svg>

                        <div className="chart-tooltip">
                          May 2025
                          <strong>PKR 8,742,500</strong>
                        </div>
                      </div>

                      <div className="chart-labels">
                        <span>Dec</span>
                        <span>Jan</span>
                        <span>Feb</span>
                        <span>Mar</span>
                        <span>Apr</span>
                        <span>May</span>
                      </div>
                    </div>
                  </article>

                  <article className="card income-card">
                    <div className="card-header">
                      <h2>Income Sources</h2>

                      <button className="select-small">
                        This Month
                        <ChevronDown size={14} />
                      </button>
                    </div>

                    <div className="income-content">
                      <div className="donut-wrap">
                        <div className="donut-center">
                          <span>Total</span>
                          <strong>PKR 8.74M</strong>
                        </div>
                      </div>

                      <div className="income-legend">
                        <div className="legend-item">
                          <span
                            className="legend-dot"
                            style={{ background: "#8b5cf6" }}
                          />
                          <div className="legend-copy">
                            <strong>Premium Subscriptions</strong>
                            <span>62% (PKR 5,415,100)</span>
                          </div>
                        </div>

                        <div className="legend-item">
                          <span
                            className="legend-dot"
                            style={{ background: "#f43f5e" }}
                          />
                          <div className="legend-copy">
                            <strong>Membership Plans</strong>
                            <span>22% (PKR 1,922,400)</span>
                          </div>
                        </div>

                        <div className="legend-item">
                          <span
                            className="legend-dot"
                            style={{ background: "#f59e0b" }}
                          />
                          <div className="legend-copy">
                            <strong>Boost & Visibility</strong>
                            <span>10% (PKR 874,200)</span>
                          </div>
                        </div>

                        <div className="legend-item">
                          <span
                            className="legend-dot"
                            style={{ background: "#38bdf8" }}
                          />
                          <div className="legend-copy">
                            <strong>Others</strong>
                            <span>6% (PKR 530,800)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                </section>

                {/* ================= LOWER ROW ================= */}

                <section className="lower-row">
                  <article className="card transactions-card">
                    <div className="card-header">
                      <h2>Recent Transactions</h2>
                      <button className="view-button">View All</button>
                    </div>

                    <div className="transaction-list">
                      {transactions.map((transaction) => {
                        const Icon = transaction.icon;

                        return (
                          <div
                            className="transaction"
                            key={transaction.name}
                          >
                            <div
                              className={`transaction-icon ${transaction.tone}`}
                            >
                              <Icon />
                            </div>

                            <div className="transaction-copy">
                              <strong>{transaction.name}</strong>
                              <span>{transaction.subtitle}</span>
                            </div>

                            <div className="transaction-value">
                              <strong className={transaction.type}>
                                {transaction.amount}
                              </strong>
                              <span>{transaction.date}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </article>

                  <article className="card expense-card">
                    <div className="card-header">
                      <h2>Expense Breakdown</h2>

                      <button className="select-small">
                        This Month
                        <ChevronDown size={14} />
                      </button>
                    </div>

                    <div className="expense-list">
                      {expenses.map((expense) => (
                        <div
                          className="expense-item"
                          key={expense.name}
                        >
                          <div className="expense-main">
                            <div className="expense-title">
                              {expense.name}
                            </div>

                            <div className="expense-track">
                              <div
                                className={`expense-fill ${expense.className}`}
                                style={{ width: expense.width }}
                              />
                            </div>
                          </div>

                          <span className="expense-value">
                            {expense.value}
                          </span>

                          <span className="expense-percent">
                            {expense.percent}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="expense-total">
                      <strong>Total Expenses</strong>
                      <strong>PKR 6,285,200</strong>
                    </div>
                  </article>
                </section>

                {/* ================= AI RECOMMENDATION ================= */}

                <section className="card recommendation">
                  <div className="recommendation-orb">
                    <Sparkles />
                  </div>

                  <div className="recommendation-copy">
                    <div className="recommendation-title">
                      <h3>AI Recommendation</h3>
                      <span>New</span>
                    </div>

                    <p>
                      Based on current trends, you can increase your monthly
                      revenue by 15–20% by launching a targeted premium campaign
                      for inactive users.
                    </p>
                  </div>

                  <button className="action-button">
                    View Action Plan
                  </button>
                </section>
              </div>

              {/* ================= AI RIGHT PANEL ================= */}

              <aside className="card ai-panel">
                <div className="ai-panel-header">
                  <div>
                    <h2>Finance Manager AI Agent</h2>

                    <div className="online">
                      <span className="online-dot" />
                      Online
                    </div>
                  </div>

                  <button>
                    <MoreHorizontal size={18} />
                  </button>
                </div>

                <div className="robot">
                  <div className="robot-ear left" />
                  <div className="robot-ear right" />
                  <div className="robot-head">
                    <div className="robot-screen">
                      <span className="robot-eye left" />
                      <span className="robot-eye right" />
                    </div>
                  </div>
                  <div className="robot-neck" />
                  <div className="robot-arm left" />
                  <div className="robot-arm right" />
                  <div className="robot-wave" />
                  <div className="robot-body">
                    <div className="robot-chest" />
                  </div>
                </div>

                <div className="ai-greeting">
                  <h3>
                    Hello Admin! 👋
                  </h3>

                  <p>
                    I&apos;m your Finance Manager AI Agent.
                    <br />
                    I can help you with financial insights,
                    <br />
                    reports, forecasting and more.
                  </p>
                </div>

                <section className="insights">
                  <h3>Insights for May 2025</h3>

                  <div className="insight-list">
                    <div className="insight green">
                      <div className="insight-icon">
                        <TrendingUp />
                      </div>

                      <p>
                        Revenue is up by 24.6% compared
                        <br />
                        to last month.
                      </p>
                    </div>

                    <div className="insight orange">
                      <div className="insight-icon">
                        <Target />
                      </div>

                      <p>
                        Marketing spend is 39% of total
                        <br />
                        expenses. Consider optimizing.
                      </p>
                    </div>

                    <div className="insight blue">
                      <div className="insight-icon">
                        <ShieldCheck />
                      </div>

                      <p>
                        Net profit margin is 28.1%.
                        <br />
                        Good job! Keep it up.
                      </p>
                    </div>

                    <div className="insight purple">
                      <div className="insight-icon">
                        <BarChart3 />
                      </div>

                      <p>
                        You have 14 pending payouts
                        <br />
                        totaling PKR 312,500.
                      </p>
                    </div>
                  </div>
                </section>

                <div className="ai-actions">
                  <Link href={`/finance-agent-special/${platform}/chat?q=${encodeURIComponent("Generate a financial report summary")}`} className="ai-action">
                    <FileText />
                    Generate Financial Report
                  </Link>

                  <Link href={`/finance-agent-special/${platform}/chat?q=${encodeURIComponent("What is the revenue forecast?")}`} className="ai-action">
                    <TrendingUp />
                    Revenue Forecast
                  </Link>

                  <Link href={`/finance-agent-special/${platform}/chat?q=${encodeURIComponent("Give me an expense analysis")}`} className="ai-action">
                    <PieChart />
                    Expense Analysis
                  </Link>

                  <Link href={`/finance-agent-special/${platform}/chat?q=${encodeURIComponent("Give me a tax summary")}`} className="ai-action">
                    <ReceiptText />
                    Tax Summary
                  </Link>
                </div>

                <form
                  className="ask-box"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const q = (e.currentTarget.elements.namedItem("q") as HTMLInputElement).value.trim();
                    window.location.href = `/finance-agent-special/${platform}/chat${q ? `?q=${encodeURIComponent(q)}` : ""}`;
                  }}
                >
                  <div className="ask-inner">
                    <input
                      name="q"
                      placeholder="Ask me anything..."
                      aria-label="Ask finance AI"
                    />

                    <button type="submit" className="send-button">
                      <Send />
                    </button>
                  </div>

                  <p className="ai-disclaimer">
                    AI responses can make mistakes.
                    <br />
                    Please verify important information.
                  </p>
                </form>
              </aside>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
