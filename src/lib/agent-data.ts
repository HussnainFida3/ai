"use client";

import { use, useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { apiFetch, ApiError, type ChatTurn } from "./api";
import { PLATFORMS, type PlatformKey } from "./platforms";

/**
 * GhrFix and ShadiLife each expose real AI-agent data, but through two
 * genuinely different backend shapes (built independently). Rather than
 * force one interface on both, each hook below normalizes into a small
 * common shape the pixel-perfect UI components can render directly,
 * leaving fields with no honest equivalent on one platform as `null`.
 */

/** Matches this project's existing /[platform]/[agent] convention: params is a Promise, unwrapped with `use()`. */
export function usePlatformParam(params: Promise<{ platform: string }>): PlatformKey {
  const { platform } = use(params);
  if (platform !== "ghrfix" && platform !== "shadilife") notFound();
  return platform;
}

export interface FinanceSnapshot {
  totalRevenuePkr: number | null;
  totalRevenueLabel: string;
  secondaryPkr: number | null;
  secondaryLabel: string;
  cashOrPendingValue: string | null;
  cashOrPendingLabel: string;
  changePct: number | null;
  loading: boolean;
  error: string | null;
}

export function useFinanceSnapshot(platform: PlatformKey): FinanceSnapshot {
  const [state, setState] = useState<Omit<FinanceSnapshot, "loading" | "error">>({
    totalRevenuePkr: null,
    totalRevenueLabel: "Total Revenue",
    secondaryPkr: null,
    secondaryLabel: "Accept Fees Collected",
    cashOrPendingValue: null,
    cashOrPendingLabel: "Cash Settled",
    changePct: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    apiFetch<Record<string, unknown>>(platform, "/ai-agents/finance/summary")
      .then(({ data }) => {
        if (cancelled) return;
        if (platform === "ghrfix") {
          const walletTotals = data.walletTotals as
            | { acceptFeesCollected: number; totalCredits: number; totalDebits: number }
            | undefined;
          const bookings = data.bookings as { cashSettledPKR: number } | undefined;
          setState({
            totalRevenuePkr: walletTotals ? Math.round(walletTotals.totalCredits - walletTotals.totalDebits) : null,
            totalRevenueLabel: "Net Token Flow",
            secondaryPkr: walletTotals ? Math.round(walletTotals.acceptFeesCollected) : null,
            secondaryLabel: "Accept Fees Collected",
            cashOrPendingValue: bookings ? `PKR ${Math.round(bookings.cashSettledPKR).toLocaleString()}` : null,
            cashOrPendingLabel: "Cash Settled (bookings)",
            changePct: null,
          });
        } else {
          setState({
            totalRevenuePkr: Math.round(Number(data.revenueThisMonthPkr ?? 0)),
            totalRevenueLabel: "Revenue This Month",
            secondaryPkr: Math.round(Number(data.revenueThisYearPkr ?? 0)),
            secondaryLabel: "Revenue This Year",
            cashOrPendingValue: String(data.pendingPaymentsCount ?? 0),
            cashOrPendingLabel: "Pending Payments",
            changePct: data.monthOverMonthChangePct == null ? null : Number(data.monthOverMonthChangePct),
          });
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Could not reach the backend.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [platform]);

  return { ...state, loading, error };
}

export interface SeoSnapshot {
  averageScore: number | null;
  maxScore: number;
  publishedCount: number | null;
  needsImprovement: Array<{ id: string; title: string; score: number }>;
  mostCommonIssue: { rule: string; failingPercent: number } | null;
  loading: boolean;
  error: string | null;
}

export function useSeoSnapshot(platform: PlatformKey): SeoSnapshot {
  const [state, setState] = useState<Omit<SeoSnapshot, "loading" | "error">>({
    averageScore: null,
    maxScore: 9.5,
    publishedCount: null,
    needsImprovement: [],
    mostCommonIssue: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const call =
      platform === "ghrfix"
        ? apiFetch<Record<string, unknown>>(platform, "/ai-agents/seo/audit")
        : apiFetch<Record<string, unknown>>(platform, "/ai-agents/seo/site-audit", { method: "POST" });

    call
      .then(({ data }) => {
        if (cancelled) return;
        setState({
          averageScore: data.averageScore == null ? null : Number(data.averageScore),
          maxScore: data.maxScore == null ? 9.5 : Number(data.maxScore),
          publishedCount: data.publishedCount == null ? null : Number(data.publishedCount),
          needsImprovement: Array.isArray(data.needsImprovement) ? (data.needsImprovement as SeoSnapshot["needsImprovement"]) : [],
          mostCommonIssue: (data.mostCommonIssue as SeoSnapshot["mostCommonIssue"]) ?? null,
        });
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Could not reach the backend.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [platform]);

  return { ...state, loading, error };
}

/**
 * GhrFix gives every agent its own POST /ai-agents/<key>/chat (message + history,
 * returns {reply}). ShadiLife instead runs one shared POST /ai-agents/ask for every
 * agent page (agentKey + agentLabel + question, returns {reply}) — different shape,
 * same job. This is the one place that difference is absorbed.
 */
export async function agentChat(
  platform: PlatformKey,
  agentKey: string,
  agentLabel: string,
  message: string,
  history: ChatTurn[],
): Promise<string> {
  if (platform === "ghrfix") {
    const { data } = await apiFetch<{ reply: string }>(platform, `/ai-agents/${agentKey}/chat`, {
      method: "POST",
      body: { message, history },
    });
    return data.reply;
  }
  const { data } = await apiFetch<{ reply: string }>(platform, "/ai-agents/ask", {
    method: "POST",
    body: { agentKey, agentLabel, question: message },
  });
  return data.reply;
}

export function platformLabel(platform: PlatformKey): string {
  return PLATFORMS[platform].label;
}
