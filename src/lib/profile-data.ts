"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError, type Paginated } from "./api";
import type { PlatformKey } from "./platforms";

/**
 * Profile Agent Special — normalized people-profile snapshot.
 *
 * BOTH platforms are now live. They profile different populations, from
 * different real endpoints, and expose genuinely different fields — so this
 * hook normalizes them into one row shape while keeping every field that one
 * platform does not have explicitly `null`, never zero and never guessed.
 *
 * ── ShadiLife (members) ────────────────────────────────────────────────
 *   GET  /ai-agents/profile/nudge-candidates?thresholdPct=100
 *        → the real Profile.completionPct query: every member below the
 *          threshold, as { userId, fullName, city, completionPct }. This is
 *          the profile roster this section works from, so "total" here means
 *          "profiles the agent is tracking", not "every member ever".
 *   POST /ai-agents/profile/quality-audit
 *        → deterministic structural score for the 25 most recently updated
 *          active profiles: { profilesChecked, results: [{ userId, fullName,
 *          score, gap, suggestion:{ bioSuggestion, reasoning } }] }. Only
 *          these members have a quality score or a named gap; everyone else
 *          keeps `null` rather than a fabricated zero.
 *   GET  /ai-agents/verification/pending
 *        → the real UNDER_REVIEW queue { userId, fullName, city, submittedAt }.
 *          The only honest verification state available is "in the review
 *          queue" vs "not in the review queue" — never "verified".
 *
 * ── GhrFix (users + providers) ─────────────────────────────────────────
 * GhrFix is a home-services marketplace: the people it profiles are its
 * registered USERS and its PROVIDERS. Both are real, server-paginated admin
 * directories — the same four routes the GhrFix Owner Chat directory view
 * calls (src/components/agents/views/domain/ghrfix/owner-chat.tsx):
 *
 *   GET /admin/users            → MemberRow[]  + Paginated meta
 *   GET /admin/users/stats      → { total, active, suspended, banned,
 *                                   pendingVerification, providers,
 *                                   newThisWeek }
 *   GET /admin/providers        → ProviderRow[] + Paginated meta
 *   GET /admin/providers/stats  → { total, verified, pending, rejected,
 *                                   suspended, available, avgRating }
 *
 * GhrFix has NO `completionPct` field and no profile quality-audit endpoint.
 * We therefore do not invent one. Instead `strengthPct` on GhrFix is an
 * explicit FIELD-COVERAGE score over fields these two endpoints genuinely
 * return, and `strengthBasis` states on every row exactly which:
 *
 *   user rows      — 4 checks: name, phone, email, status === "ACTIVE"
 *   provider rows  — 6 checks: user.name, user.phone, user.email,
 *                    verificationStatus === "VERIFIED", rating !== null,
 *                    services.length > 0
 *
 * Fields that only ShadiLife reports (completionPct, qualityScore, gap,
 * bioSuggestion, hasPhoto, hasBio, city) stay `null` on GhrFix, and the
 * snapshot exposes `auditSupported` / `cityTracked` so pages can print
 * "Not tracked on GhrFix" instead of a zero that reads as a measurement.
 *
 * Every secondary call is settled independently on both platforms: one leg
 * failing degrades that leg only (see `usersError` / `providersError`), it
 * never blanks the roster and it never lets a page claim health it cannot
 * evidence.
 */

/* ── Types ──────────────────────────────────────────────────────────── */

/**
 * What we can honestly say about a person's verification.
 *
 * ShadiLife only ever produces UNDER_REVIEW / NOT_IN_REVIEW / UNKNOWN — it has
 * no "verified" signal. GhrFix has a real verificationStatus enum on providers
 * plus an account status on users, so it can additionally report VERIFIED,
 * REJECTED, SUSPENDED and NOT_APPLICABLE (a GhrFix user who is not a provider
 * is not in any verification flow at all).
 */
export type VerificationState =
  | "UNDER_REVIEW"
  | "NOT_IN_REVIEW"
  | "VERIFIED"
  | "REJECTED"
  | "SUSPENDED"
  | "NOT_APPLICABLE"
  | "UNKNOWN";

export type StrengthBand = "Strong" | "Moderate" | "Weak" | "Critical";

/** Which population a row belongs to. ShadiLife has exactly one: members. */
export type ProfileKind = "member" | "user" | "provider";

export interface ProfileRow {
  userId: string;
  fullName: string;
  /** ShadiLife members only — GhrFix's admin directories return no city. */
  city: string | null;
  kind: ProfileKind;
  /**
   * The score this section ranks on.
   *  · ShadiLife — the real Profile.completionPct.
   *  · GhrFix    — field coverage over the checks named in `strengthBasis`.
   * Null when the platform reported nothing at all.
   */
  strengthPct: number | null;
  /** Plain-English list of the real fields `strengthPct` was derived from. */
  strengthBasis: string;
  /** Real ShadiLife Profile.completionPct. Null on GhrFix, which has none. */
  completionPct: number | null;
  strengthBand: StrengthBand;
  verification: VerificationState;
  /** Raw platform status string (GhrFix). Null on ShadiLife, which sends none. */
  accountStatus: string | null;
  /** ISO date the member entered the verification queue; null when not queued. */
  submittedAt: string | null;
  /** ISO account creation date — GhrFix only; ShadiLife's roster returns none. */
  createdAt: string | null;
  /** GhrFix providers only: real Provider.rating. Null everywhere else. */
  rating: number | null;
  /** GhrFix providers only: real service category names. Empty otherwise. */
  services: string[];
  /** GhrFix providers only: real isAvailable flag. */
  available: boolean | null;
  /** Contact-field presence — real on GhrFix, null on ShadiLife (not returned). */
  hasPhone: boolean | null;
  hasEmail: boolean | null;
  /** 0–10 structural score, null for profiles the audit did not cover. */
  qualityScore: number | null;
  /** The audit's own words for what is missing, null when nothing is. */
  gap: string | null;
  bioSuggestion: string | null;
  /** null = not audited (and always null on GhrFix, which has no audit). */
  hasPhoto: boolean | null;
  hasBio: boolean | null;
  /** True when this row carries a quality-audit result. */
  audited: boolean;
}

export interface ProfileSnapshot {
  platform: PlatformKey;
  profiles: ProfileRow[];
  /** Rows this page is reasoning over. */
  total: number;
  /**
   * The real population size behind the roster, when the platform reports one
   * (GhrFix /stats + paginated meta). Null on ShadiLife, whose roster endpoint
   * returns only the below-threshold candidates and no grand total.
   */
  directoryTotal: number | null;
  /** One line saying what `total` actually counts on this platform. */
  rosterNote: string;

  users: number;
  providers: number;
  /** True only where the users/providers split is a real distinction. */
  hasKinds: boolean;

  underReview: number;
  verified: number;
  verificationUnknown: boolean;

  /** Mean strengthPct across rows that report one; null if none do. */
  averageStrength: number | null;
  /** Below the "Strong" band — the ones worth acting on. */
  incomplete: number;

  /** False on GhrFix: no profile quality-audit endpoint exists there. */
  auditSupported: boolean;
  audited: number;
  averageQualityScore: number | null;
  missingPhoto: number;
  missingBio: number;

  /** False on GhrFix: its admin directories return no city field. */
  cityTracked: boolean;

  /** GhrFix contact-field gaps — real, counted from /admin/users + /providers. */
  missingPhone: number;
  missingEmail: number;

  /** GhrFix only: real headline counters straight off the /stats endpoints. */
  ghrfixUserStats: GhrfixUserStats | null;
  ghrfixProviderStats: GhrfixProviderStats | null;

  /** Charting distributions — each is rendered with a directly-labelled legend. */
  byStrength: Array<{ label: string; value: number; color: string }>;
  byVerification: Array<{ label: string; value: number; color: string }>;
  byKind: Array<{ label: string; value: number; color: string }>;
  byStatus: Array<{ label: string; value: number; color: string }>;
  byCity: Array<{ label: string; value: number }>;
  byService: Array<{ label: string; value: number }>;

  /** Lowest strength first — the nudge list. */
  weakest: ProfileRow[];

  loading: boolean;
  /** Set only when the whole roster is unavailable. */
  error: string | null;
  /** Partial-failure legs. On ShadiLife both stay null. */
  usersError: string | null;
  providersError: string | null;
}

export interface GhrfixUserStats {
  total: number;
  active: number;
  suspended: number;
  banned: number;
  pendingVerification: number;
  providers: number;
  newThisWeek: number;
}

export interface GhrfixProviderStats {
  total: number;
  verified: number;
  pending: number;
  rejected: number;
  suspended: number;
  available: number;
  avgRating: number;
}

/* ── Raw backend shapes ─────────────────────────────────────────────── */

interface RawCandidate {
  userId?: string;
  fullName?: string | null;
  city?: string | null;
  completionPct?: number | null;
}
interface RawAuditResult {
  userId?: string;
  fullName?: string;
  score?: number;
  gap?: string | null;
  suggestion?: { bioSuggestion?: string; reasoning?: string } | null;
}
interface RawAudit {
  profilesChecked?: number;
  results?: RawAuditResult[];
}
interface RawPending {
  userId?: string;
  submittedAt?: string | null;
}

/** GhrFix /admin/users row — shape mirrored from the Owner Chat directory. */
interface RawGhrfixUser {
  id?: string;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  role?: string;
  status?: string;
  walletBalance?: string | number;
  createdAt?: string;
  provider?: { id: string; verificationStatus: string } | null;
}

/** GhrFix /admin/providers row. */
interface RawGhrfixProvider {
  id?: string;
  verificationStatus?: string;
  isAvailable?: boolean;
  rating?: string | number | null;
  createdAt?: string;
  user?: { id?: string; name?: string | null; phone?: string | null; email?: string | null } | null;
  services?: Array<{ category?: { name?: string } | null }>;
}

/* ── Helpers ────────────────────────────────────────────────────────── */

export const STRENGTH_COLOR: Record<StrengthBand, string> = {
  Strong: "#0f9e69",
  Moderate: "#3b7fd1",
  Weak: "#c9860f",
  Critical: "#e04452",
};

export const VERIFICATION_LABEL: Record<VerificationState, string> = {
  UNDER_REVIEW: "Awaiting verification",
  NOT_IN_REVIEW: "Not in queue",
  VERIFIED: "Verified",
  REJECTED: "Rejected",
  SUSPENDED: "Suspended",
  NOT_APPLICABLE: "Not a provider",
  UNKNOWN: "Unknown",
};

const VERIFICATION_COLOR: Record<VerificationState, string> = {
  UNDER_REVIEW: "#3b7fd1",
  NOT_IN_REVIEW: "#c9860f",
  VERIFIED: "#0f9e69",
  REJECTED: "#e04452",
  SUSPENDED: "#b4531f",
  NOT_APPLICABLE: "#8b93a8",
  UNKNOWN: "#69738c",
};

/** Tone token per state — always paired with a word and a glyph, never colour alone. */
export const VERIFICATION_TONE: Record<VerificationState, string> = {
  UNDER_REVIEW: "blue",
  NOT_IN_REVIEW: "amber",
  VERIFIED: "green",
  REJECTED: "red",
  SUSPENDED: "amber",
  NOT_APPLICABLE: "purple",
  UNKNOWN: "purple",
};

export const VERIFICATION_ICON: Record<VerificationState, string> = {
  UNDER_REVIEW: "clock",
  NOT_IN_REVIEW: "alert",
  VERIFIED: "check",
  REJECTED: "alert",
  SUSPENDED: "alert",
  NOT_APPLICABLE: "users",
  UNKNOWN: "search",
};

export const KIND_LABEL: Record<ProfileKind, string> = {
  member: "Member",
  user: "User",
  provider: "Provider",
};

export const KIND_COLOR: Record<ProfileKind, string> = {
  member: "#7c3aed",
  user: "#3b7fd1",
  provider: "#0f9e69",
};

export const STRENGTH_BANDS: StrengthBand[] = ["Strong", "Moderate", "Weak", "Critical"];

const ALL_VERIFICATION_STATES: VerificationState[] = [
  "VERIFIED",
  "UNDER_REVIEW",
  "NOT_IN_REVIEW",
  "REJECTED",
  "SUSPENDED",
  "NOT_APPLICABLE",
  "UNKNOWN",
];

export function bandOf(pct: number | null): StrengthBand {
  if (pct === null) return "Critical";
  if (pct >= 80) return "Strong";
  if (pct >= 60) return "Moderate";
  if (pct >= 40) return "Weak";
  return "Critical";
}

const asText = (v: unknown) => (typeof v === "string" ? v : "");
const asNum = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number(v));
const filled = (v: unknown) => typeof v === "string" && v.trim() !== "";

/**
 * The audit reports one free-text `gap` per profile. We read photo/bio out of
 * it by keyword rather than inventing separate booleans the backend does not
 * send — and only for audited rows, where the absence of a mention really does
 * mean the audit found nothing wrong there.
 */
function readGap(gap: string | null): { hasPhoto: boolean; hasBio: boolean } {
  if (!gap) return { hasPhoto: true, hasBio: true };
  const g = gap.toLowerCase();
  return {
    hasPhoto: !/photo|picture|image|avatar/.test(g),
    hasBio: !/bio|about|description|introduction/.test(g),
  };
}

function countBy(rows: ProfileRow[], pick: (r: ProfileRow) => string | null): Array<{ label: string; value: number }> {
  const map = new Map<string, number>();
  for (const r of rows) {
    const key = (pick(r) ?? "").trim();
    if (!key) continue;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

function countByMulti(rows: ProfileRow[], pick: (r: ProfileRow) => string[]): Array<{ label: string; value: number }> {
  const map = new Map<string, number>();
  for (const r of rows) {
    for (const raw of pick(r)) {
      const key = raw.trim();
      if (!key) continue;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
  }
  return [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

/** Percentage of a fixed checklist of REAL fields that are actually populated. */
function coverage(checks: boolean[]): number {
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export function humanStatus(s: string): string {
  return s.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

const EMPTY_ROWS: ProfileRow[] = [];
const DIRECTORY_PAGE_SIZE = 100;

const GHRFIX_USER_BASIS = "name, phone, email and an ACTIVE account status (/admin/users)";
const GHRFIX_PROVIDER_BASIS =
  "name, phone, email, VERIFIED status, a rating and at least one service (/admin/providers)";
const SHADILIFE_BASIS = "the real Profile.completionPct score";

/* ── Loaded state ───────────────────────────────────────────────────── */

interface LoadedState {
  rows: ProfileRow[];
  verificationUnknown: boolean;
  error: string | null;
  usersError: string | null;
  providersError: string | null;
  directoryTotal: number | null;
  userStats: GhrfixUserStats | null;
  providerStats: GhrfixProviderStats | null;
}

const INITIAL: LoadedState = {
  rows: EMPTY_ROWS,
  verificationUnknown: false,
  error: null,
  usersError: null,
  providersError: null,
  directoryTotal: null,
  userStats: null,
  providerStats: null,
};

function reason(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : err instanceof Error ? err.message : fallback;
}

/* ── Hook ───────────────────────────────────────────────────────────── */

export function useProfileSnapshot(platform: PlatformKey): ProfileSnapshot {
  const [state, setState] = useState<LoadedState>(INITIAL);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setState(INITIAL);

    const run = platform === "ghrfix" ? loadGhrfix(platform) : loadShadilife(platform);

    run
      .then((next) => {
        if (!cancelled) setState(next);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [platform]);

  const profiles = state.rows;
  const scored = profiles.filter((p) => p.strengthPct !== null);
  const auditedRows = profiles.filter((p) => p.audited);
  const auditSupported = platform === "shadilife";
  const cityTracked = platform === "shadilife";
  const hasKinds = platform === "ghrfix";

  const byStrength = STRENGTH_BANDS.map((band) => ({
    label: band,
    value: profiles.filter((p) => p.strengthBand === band).length,
    color: STRENGTH_COLOR[band],
  })).filter((b) => b.value > 0);

  const byVerification = ALL_VERIFICATION_STATES.map((s) => ({
    label: VERIFICATION_LABEL[s],
    value: profiles.filter((p) => p.verification === s).length,
    color: VERIFICATION_COLOR[s],
  })).filter((v) => v.value > 0);

  const byKind = (["user", "provider", "member"] as ProfileKind[])
    .map((k) => ({ label: `${KIND_LABEL[k]}s`, value: profiles.filter((p) => p.kind === k).length, color: KIND_COLOR[k] }))
    .filter((k) => k.value > 0);

  const statusCounts = countBy(profiles, (p) => (p.accountStatus ? humanStatus(p.accountStatus) : null));
  const STATUS_PALETTE = ["#0f9e69", "#3b7fd1", "#c9860f", "#e04452", "#0e8fa8", "#7c3aed"];
  const byStatus = statusCounts.map((s, i) => ({ ...s, color: STATUS_PALETTE[i % STATUS_PALETTE.length] }));

  const users = profiles.filter((p) => p.kind === "user").length;
  const providers = profiles.filter((p) => p.kind === "provider").length;

  const directoryTotal = state.directoryTotal;

  const rosterNote =
    platform === "ghrfix"
      ? `The first ${DIRECTORY_PAGE_SIZE} rows of GhrFix's real /admin/users and /admin/providers directories. Platform-wide totals come from the /stats endpoints, not from this sample.`
      : "Every ShadiLife member below 100% profile completion — the agent's own nudge roster, not the whole membership.";

  return {
    platform,
    profiles,
    total: profiles.length,
    directoryTotal,
    rosterNote,
    users,
    providers,
    hasKinds,
    underReview: profiles.filter((p) => p.verification === "UNDER_REVIEW").length,
    verified: profiles.filter((p) => p.verification === "VERIFIED").length,
    verificationUnknown: state.verificationUnknown,
    averageStrength:
      scored.length > 0 ? Math.round(scored.reduce((s, p) => s + (p.strengthPct ?? 0), 0) / scored.length) : null,
    incomplete: profiles.filter((p) => p.strengthBand !== "Strong").length,
    auditSupported,
    audited: auditedRows.length,
    averageQualityScore:
      auditedRows.length > 0
        ? Math.round((auditedRows.reduce((s, p) => s + (p.qualityScore ?? 0), 0) / auditedRows.length) * 10) / 10
        : null,
    missingPhoto: profiles.filter((p) => p.hasPhoto === false).length,
    missingBio: profiles.filter((p) => p.hasBio === false).length,
    cityTracked,
    missingPhone: profiles.filter((p) => p.hasPhone === false).length,
    missingEmail: profiles.filter((p) => p.hasEmail === false).length,
    ghrfixUserStats: state.userStats,
    ghrfixProviderStats: state.providerStats,
    byStrength,
    byVerification,
    byKind,
    byStatus,
    byCity: countBy(profiles, (p) => p.city).slice(0, 6),
    byService: countByMulti(profiles, (p) => p.services).slice(0, 8),
    weakest: [...scored].sort((a, b) => (a.strengthPct ?? 0) - (b.strengthPct ?? 0)).slice(0, 10),
    loading,
    error: state.error,
    usersError: state.usersError,
    providersError: state.providersError,
  };
}

/* ── ShadiLife loader (unchanged behaviour) ─────────────────────────── */

async function loadShadilife(platform: PlatformKey): Promise<LoadedState> {
  const [candidates, audit, pending] = await Promise.allSettled([
    apiFetch<RawCandidate[]>(platform, "/ai-agents/profile/nudge-candidates", { query: { thresholdPct: 100 } }),
    apiFetch<RawAudit>(platform, "/ai-agents/profile/quality-audit", { method: "POST" }),
    apiFetch<RawPending[]>(platform, "/ai-agents/verification/pending"),
  ]);

  if (candidates.status === "rejected") {
    return {
      ...INITIAL,
      error: reason(candidates.reason, "Could not reach the backend."),
      verificationUnknown: true,
    };
  }

  const auditByUser = new Map<string, RawAuditResult>();
  if (audit.status === "fulfilled") {
    for (const r of audit.value.data?.results ?? []) {
      if (r.userId) auditByUser.set(r.userId, r);
    }
  }

  const queueByUser = new Map<string, string | null>();
  const queueKnown = pending.status === "fulfilled";
  if (pending.status === "fulfilled") {
    for (const p of Array.isArray(pending.value.data) ? pending.value.data : []) {
      if (p.userId) queueByUser.set(p.userId, p.submittedAt ?? null);
    }
  }

  const rows = (Array.isArray(candidates.value.data) ? candidates.value.data : []).map((c, i): ProfileRow => {
    const userId = asText(c.userId) || `profile-${i}`;
    const a = auditByUser.get(userId);
    const gap = a?.gap ?? null;
    const marks = a ? readGap(gap) : null;
    const completionPct = asNum(c.completionPct);
    const inQueue = queueByUser.has(userId);
    return {
      userId,
      fullName: asText(c.fullName) || asText(a?.fullName) || "Unnamed member",
      city: asText(c.city) || null,
      kind: "member",
      strengthPct: completionPct,
      strengthBasis: SHADILIFE_BASIS,
      completionPct,
      strengthBand: bandOf(completionPct),
      verification: !queueKnown ? "UNKNOWN" : inQueue ? "UNDER_REVIEW" : "NOT_IN_REVIEW",
      accountStatus: null,
      submittedAt: inQueue ? queueByUser.get(userId) ?? null : null,
      createdAt: null,
      rating: null,
      services: [],
      available: null,
      hasPhone: null,
      hasEmail: null,
      qualityScore: a?.score ?? null,
      gap,
      bioSuggestion: a?.suggestion?.bioSuggestion ?? null,
      hasPhoto: marks ? marks.hasPhoto : null,
      hasBio: marks ? marks.hasBio : null,
      audited: Boolean(a),
    };
  });

  return { ...INITIAL, rows, verificationUnknown: !queueKnown };
}

/* ── GhrFix loader ──────────────────────────────────────────────────── */

/**
 * Four independent legs. Users and providers are separate populations, so one
 * failing must not erase the other — the page shows what it has and says
 * plainly which half it could not read.
 */
async function loadGhrfix(platform: PlatformKey): Promise<LoadedState> {
  const [usersRes, providersRes, userStatsRes, providerStatsRes] = await Promise.allSettled([
    apiFetch<RawGhrfixUser[], Paginated>(platform, "/admin/users", { query: { page: 1, pageSize: DIRECTORY_PAGE_SIZE } }),
    apiFetch<RawGhrfixProvider[], Paginated>(platform, "/admin/providers", {
      query: { page: 1, pageSize: DIRECTORY_PAGE_SIZE },
    }),
    apiFetch<GhrfixUserStats>(platform, "/admin/users/stats"),
    apiFetch<GhrfixProviderStats>(platform, "/admin/providers/stats"),
  ]);

  const usersError = usersRes.status === "rejected" ? reason(usersRes.reason, "Could not read /admin/users.") : null;
  const providersError =
    providersRes.status === "rejected" ? reason(providersRes.reason, "Could not read /admin/providers.") : null;

  const userStats = userStatsRes.status === "fulfilled" ? userStatsRes.value.data ?? null : null;
  const providerStats = providerStatsRes.status === "fulfilled" ? providerStatsRes.value.data ?? null : null;

  const rows: ProfileRow[] = [];

  if (usersRes.status === "fulfilled") {
    const list = Array.isArray(usersRes.value.data) ? usersRes.value.data : [];
    list.forEach((u, i) => {
      const status = asText(u.status) || "UNKNOWN";
      const hasName = filled(u.name);
      const hasPhone = filled(u.phone);
      const hasEmail = filled(u.email);
      /* Field coverage over 4 real /admin/users fields — see file header. */
      const pct = coverage([hasName, hasPhone, hasEmail, status === "ACTIVE"]);
      return rows.push({
        userId: asText(u.id) || `ghrfix-user-${i}`,
        fullName: asText(u.name) || "Unnamed user",
        city: null,
        kind: "user",
        strengthPct: pct,
        strengthBasis: GHRFIX_USER_BASIS,
        completionPct: null,
        strengthBand: bandOf(pct),
        verification: userVerification(status),
        accountStatus: status,
        submittedAt: null,
        createdAt: asText(u.createdAt) || null,
        rating: null,
        services: [],
        available: null,
        hasPhone,
        hasEmail,
        qualityScore: null,
        gap: null,
        bioSuggestion: null,
        hasPhoto: null,
        hasBio: null,
        audited: false,
      });
    });
  }

  if (providersRes.status === "fulfilled") {
    const list = Array.isArray(providersRes.value.data) ? providersRes.value.data : [];
    list.forEach((pr, i) => {
      const status = asText(pr.verificationStatus) || "UNKNOWN";
      const hasName = filled(pr.user?.name);
      const hasPhone = filled(pr.user?.phone);
      const hasEmail = filled(pr.user?.email);
      const rating = asNum(pr.rating);
      const services = (pr.services ?? [])
        .map((s) => asText(s?.category?.name))
        .filter((s) => s !== "");
      /* Field coverage over 6 real /admin/providers fields — see file header. */
      const pct = coverage([
        hasName,
        hasPhone,
        hasEmail,
        status === "VERIFIED",
        rating !== null && !Number.isNaN(rating),
        services.length > 0,
      ]);
      return rows.push({
        userId: asText(pr.id) || `ghrfix-provider-${i}`,
        fullName: asText(pr.user?.name) || "Unnamed provider",
        city: null,
        kind: "provider",
        strengthPct: pct,
        strengthBasis: GHRFIX_PROVIDER_BASIS,
        completionPct: null,
        strengthBand: bandOf(pct),
        verification: providerVerification(status),
        accountStatus: status,
        submittedAt: null,
        createdAt: asText(pr.createdAt) || null,
        rating: rating !== null && !Number.isNaN(rating) ? rating : null,
        services,
        available: typeof pr.isAvailable === "boolean" ? pr.isAvailable : null,
        hasPhone,
        hasEmail,
        qualityScore: null,
        gap: null,
        bioSuggestion: null,
        hasPhoto: null,
        hasBio: null,
        audited: false,
      });
    });
  }

  /* Both directories down = there is no roster at all. */
  const error =
    usersError && providersError
      ? `Neither GhrFix directory could be read. ${usersError}`
      : null;

  /* Real platform-wide population, when both /stats legs answered. */
  const metaUsers = usersRes.status === "fulfilled" ? usersRes.value.meta?.total ?? null : null;
  const metaProviders = providersRes.status === "fulfilled" ? providersRes.value.meta?.total ?? null : null;
  const directoryTotal =
    userStats && providerStats
      ? userStats.total + providerStats.total
      : metaUsers !== null && metaProviders !== null
        ? metaUsers + metaProviders
        : null;

  return {
    rows,
    /* GhrFix reports a real verification enum on every provider row, so review
       state is never guessed — unless the provider directory itself is down. */
    verificationUnknown: providersError !== null,
    error,
    usersError,
    providersError,
    directoryTotal,
    userStats,
    providerStats,
  };
}

/** GhrFix account status → the only honest verification reading. */
function userVerification(status: string): VerificationState {
  if (status === "PENDING_VERIFICATION") return "UNDER_REVIEW";
  if (status === "SUSPENDED") return "SUSPENDED";
  if (status === "BANNED") return "REJECTED";
  if (status === "ACTIVE") return "NOT_APPLICABLE";
  return "UNKNOWN";
}

/** GhrFix Provider.verificationStatus → verification state, one-to-one. */
function providerVerification(status: string): VerificationState {
  if (status === "VERIFIED") return "VERIFIED";
  if (status === "PENDING") return "UNDER_REVIEW";
  if (status === "REJECTED") return "REJECTED";
  if (status === "SUSPENDED") return "SUSPENDED";
  return "UNKNOWN";
}
