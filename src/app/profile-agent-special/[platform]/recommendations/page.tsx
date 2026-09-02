"use client";

/**
 * Profile Agent — AI Recommendations.
 *
 * Nothing on this page is canned. Each nudge is derived by scanning the real
 * roster from `useProfileSnapshot` and a nudge only appears when at least one
 * real record matches it. The two platforms have genuinely different gaps, so
 * they get genuinely different rules:
 *
 *  · ShadiLife — completion scores, the quality audit's named gaps, and the
 *    verification review queue.
 *  · GhrFix    — the real /admin/users and /admin/providers records: PENDING
 *    verification, REJECTED / SUSPENDED / BANNED statuses, missing phone or
 *    email, providers with no service category, and providers with no rating.
 *
 * Impact is assigned from how many records are affected and how deep the gap
 * is, and the list is sorted High first so the top of the page is always the
 * most valuable work.
 *
 * When a fetch fails, this page says it cannot assess. It never renders
 * "nothing needs fixing" over an unreachable roster.
 */

import { usePlatformParam, platformLabel } from "@/lib/agent-data";
import { useProfileSnapshot, type ProfileRow, type ProfileSnapshot } from "@/lib/profile-data";
import {
  BarRows,
  Card,
  Donut,
  Empty,
  ErrorNote,
  Icon,
  Legend,
  PartialNote,
  Pill,
  ProfileShell,
  StatCard,
  TONE,
} from "@/components/profile-special/kit";

type Impact = "High" | "Medium" | "Low";

interface Nudge {
  id: string;
  title: string;
  rationale: string;
  impact: Impact;
  icon: string;
  tone: keyof typeof TONE;
  affected: ProfileRow[];
}

const IMPACT_ORDER: Record<Impact, number> = { High: 0, Medium: 1, Low: 2 };
const IMPACT_COLOR: Record<Impact, string> = { High: "#e04452", Medium: "#c9860f", Low: "#3b7fd1" };
const IMPACT_TONE: Record<Impact, keyof typeof TONE> = { High: "red", Medium: "amber", Low: "blue" };

export default function ProfileRecommendationsPage({ params }: { params: Promise<{ platform: string }> }) {
  const platform = usePlatformParam(params);
  const p = useProfileSnapshot(platform);
  const label = platformLabel(platform);
  const ghrfix = platform === "ghrfix";

  const nudges = buildNudges(p);
  const byImpact = (["High", "Medium", "Low"] as Impact[])
    .map((i) => ({ label: `${i} impact`, value: nudges.filter((n) => n.impact === i).length, color: IMPACT_COLOR[i] }))
    .filter((r) => r.value > 0);
  const reach = nudges.reduce((s, n) => s + n.affected.length, 0);

  /* Any failed leg means the picture is incomplete, so no "all clear" is safe. */
  const cannotAssess = Boolean(p.error) || (ghrfix && Boolean(p.usersError) && Boolean(p.providersError));
  const partial = ghrfix && !cannotAssess && Boolean(p.usersError || p.providersError);

  return (
    <ProfileShell
      platform={platform}
      title="AI Recommendations"
      subtitle="Prioritised nudges, every one derived from the live roster"
    >
      {p.error && <ErrorNote error={p.error} platform={platform} />}

      {partial && (
        <PartialNote title="Only half the roster could be read">
          {p.usersError ?? p.providersError} Recommendations below cover the directory that did load. The other half is
          unassessed — not clean.
        </PartialNote>
      )}

      {p.loading ? (
        <Card title="Working through the roster"><Empty>Loading live profiles…</Empty></Card>
      ) : (
        <>
          <div className="ps-stats">
            <StatCard label="Recommendations" value={nudges.length.toLocaleString()} sub="Derived from real gaps" tone="purple" icon="sparkle" />
            <StatCard label="High Impact" value={nudges.filter((n) => n.impact === "High").length.toLocaleString()} sub="Do these first" tone="red" icon="alert" />
            <StatCard label="Records Reached" value={reach.toLocaleString()} sub="Sum across all nudges" tone="blue" icon="users" />
            <StatCard
              label="Roster Size"
              value={p.total.toLocaleString()}
              sub={ghrfix ? "Users + providers loaded" : "Profiles below full completion"}
              tone="green"
              icon="target"
            />
          </div>

          {cannotAssess ? (
            /* An unreachable roster is not a clean roster. Claiming "nothing
               needs fixing" here would assert health we have no evidence for. */
            <Card title="Can't assess the roster">
              <div style={{ display: "flex", gap: 13, alignItems: "flex-start" }}>
                <span style={{ width: 34, height: 34, borderRadius: 10, flex: "0 0 auto", display: "grid", placeItems: "center", background: TONE.amber.bg, color: TONE.amber.fg }}>
                  <Icon name="alert" size={18} />
                </span>
                <p style={{ margin: 0, fontSize: 12.5, lineHeight: "21px", color: "#4c5470" }}>
                  No recommendations can be produced while the {label} roster is unreachable. This is not a clean bill of
                  health — the agent simply has no data to reason over yet.
                </p>
              </div>
            </Card>
          ) : nudges.length === 0 ? (
            <Card title="Nothing needs fixing">
              <div style={{ display: "flex", gap: 13, alignItems: "flex-start" }}>
                <span style={{ width: 34, height: 34, borderRadius: 10, flex: "0 0 auto", display: "grid", placeItems: "center", background: TONE.green.bg, color: TONE.green.fg }}>
                  <Icon name="check" size={18} />
                </span>
                <p style={{ margin: 0, fontSize: 12.5, lineHeight: "21px", color: "#4c5470" }}>
                  {p.total === 0
                    ? `${label} returned an empty roster, so there is nothing to prioritise. No claim is made about records the agent cannot see.`
                    : ghrfix
                      ? "Every user and provider that loaded has its contact fields set, a settled verification status and — for providers — a rating and at least one service. There is genuinely nothing to nudge."
                      : "Every profile the agent tracks is in good shape — no missing photos, no missing bios, no critically incomplete profiles and no stale entries in the review queue. There is genuinely nothing to nudge."}
                </p>
              </div>
            </Card>
          ) : (
            <div className="ps-row-2">
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {nudges.map((n) => (
                  <Card key={n.id} title={
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 9 }}>
                      <span style={{ width: 26, height: 26, borderRadius: 8, display: "grid", placeItems: "center", background: TONE[n.tone].bg, color: TONE[n.tone].fg }}>
                        <Icon name={n.icon} size={14} />
                      </span>
                      {n.title}
                    </span>
                  } action={
                    <Pill tone={IMPACT_TONE[n.impact]}>
                      <Icon name={n.impact === "High" ? "alert" : n.impact === "Medium" ? "clock" : "trend"} size={12} />
                      {n.impact} impact
                    </Pill>
                  }>
                    <p style={{ margin: "0 0 12px", fontSize: 12, lineHeight: "20px", color: "#4c5470" }}>{n.rationale}</p>
                    <div style={{ fontSize: 11, fontWeight: 650, color: "#69738c", marginBottom: 8 }}>
                      {n.affected.length} record{n.affected.length === 1 ? "" : "s"} affected
                    </div>
                    <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                      {n.affected.slice(0, 5).map((r) => (
                        <span
                          key={`${r.kind}-${r.userId}`}
                          style={{ fontSize: 11, padding: "5px 10px", borderRadius: 7, background: "#f6f7fb", color: "#4c5470", border: "1px solid #eef0f5" }}
                        >
                          {r.fullName}
                          {r.strengthPct !== null && <b className="ps-num" style={{ marginLeft: 6, color: "#11162d" }}>{r.strengthPct}%</b>}
                        </span>
                      ))}
                      {n.affected.length > 5 && (
                        <span style={{ fontSize: 11, padding: "5px 10px", borderRadius: 7, background: "#fff", color: "#69738c", border: "1px dashed #dfe2ea" }}>
                          +{n.affected.length - 5} more
                        </span>
                      )}
                    </div>
                  </Card>
                ))}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <Card title="Priority Breakdown">
                  <div className="ps-donut-row">
                    <Donut data={byImpact} center={nudges.length.toLocaleString()} centerLabel="Nudges" />
                    <Legend data={byImpact} />
                  </div>
                </Card>

                <Card title="Records per Recommendation">
                  <BarRows rows={nudges.map((n) => ({ label: n.title, value: n.affected.length, color: IMPACT_COLOR[n.impact] }))} />
                  <div style={{ marginTop: 12 }}>
                    <Legend data={nudges.map((n) => ({ label: n.title, value: n.affected.length, color: IMPACT_COLOR[n.impact] }))} showPct={false} />
                  </div>
                </Card>

                {p.byVerification.length > 0 && (
                  <Card title="Verification Mix Behind These">
                    <div className="ps-donut-row">
                      <Donut data={p.byVerification} center={p.total.toLocaleString()} centerLabel="Records" />
                      <Legend data={p.byVerification} />
                    </div>
                  </Card>
                )}

                <Card title="How this is computed">
                  <p style={{ margin: 0, fontSize: 11.5, lineHeight: "19px", color: "#4c5470" }}>
                    {ghrfix
                      ? "Every rule below reads GhrFix's real admin directories: /admin/users (name, phone, email, account status) and /admin/providers (verificationStatus, rating, services). GhrFix reports no profile completion score and runs no quality audit, so no photo or bio rule exists here — their absence is unknown, not zero."
                      : "Completion scores come from the real Profile.completionPct query; photo and bio gaps come from the deterministic quality audit, which covers only the most recently updated profiles; review state comes from the verification queue. Profiles the audit did not cover are never counted as missing anything."}
                  </p>
                </Card>
              </div>
            </div>
          )}
        </>
      )}
    </ProfileShell>
  );
}

/**
 * One pass over the real roster. A nudge is emitted only when it has at least
 * one matching record, so an empty list genuinely means nothing needs fixing
 * *in the data that loaded* — the caller is responsible for not showing that
 * conclusion when a fetch failed.
 */
function buildNudges(p: ProfileSnapshot): Nudge[] {
  return p.platform === "ghrfix" ? ghrfixNudges(p) : shadilifeNudges(p);
}

/* ── GhrFix rules — every one reads a field /admin/* actually returns ── */

function ghrfixNudges(p: ProfileSnapshot): Nudge[] {
  const out: Nudge[] = [];

  const pending = p.profiles.filter((r) => r.verification === "UNDER_REVIEW");
  if (pending.length > 0) {
    const providers = pending.filter((r) => r.kind === "provider").length;
    out.push({
      id: "pending-verification",
      title: "Clear the verification queue",
      rationale: `${pending.length} record${pending.length === 1 ? " is" : "s are"} awaiting verification (${providers} provider${providers === 1 ? "" : "s"}). An unverified provider cannot take work, so this queue is lost revenue as well as lost trust.`,
      impact: pending.length >= 5 ? "High" : "Medium",
      icon: "clock",
      tone: "blue",
      affected: pending,
    });
  }

  const noPhone = p.profiles.filter((r) => r.hasPhone === false);
  if (noPhone.length > 0) {
    out.push({
      id: "no-phone",
      title: "Collect missing phone numbers",
      rationale: `${noPhone.length} record${noPhone.length === 1 ? " has" : "s have"} no phone number on file. GhrFix bookings are dispatched by phone, so these accounts cannot be reached when a job is assigned.`,
      impact: noPhone.length >= 5 ? "High" : "Medium",
      icon: "alert",
      tone: "red",
      affected: noPhone,
    });
  }

  const noEmail = p.profiles.filter((r) => r.hasEmail === false);
  if (noEmail.length > 0) {
    out.push({
      id: "no-email",
      title: "Collect missing email addresses",
      rationale: `${noEmail.length} record${noEmail.length === 1 ? " has" : "s have"} no email address, so receipts, verification reminders and broadcast campaigns cannot reach them at all.`,
      impact: noEmail.length >= 10 ? "Medium" : "Low",
      icon: "edit",
      tone: "amber",
      affected: noEmail,
    });
  }

  const noService = p.profiles.filter((r) => r.kind === "provider" && r.services.length === 0);
  if (noService.length > 0) {
    out.push({
      id: "no-service",
      title: "Get providers to list a service",
      rationale: `${noService.length} provider${noService.length === 1 ? "" : "s"} list${noService.length === 1 ? "s" : ""} no service category, which means they never appear in a customer's category search however well verified they are.`,
      impact: "High",
      icon: "tag",
      tone: "red",
      affected: noService,
    });
  }

  const noRating = p.profiles.filter((r) => r.kind === "provider" && r.rating === null);
  if (noRating.length > 0) {
    out.push({
      id: "no-rating",
      title: "Seed ratings for unrated providers",
      rationale: `${noRating.length} provider${noRating.length === 1 ? " carries" : "s carry"} no rating at all. Against a platform average of ${p.ghrfixProviderStats ? Math.round(p.ghrfixProviderStats.avgRating * 100) / 100 : "—"} / 5, an unrated listing is the one customers skip.`,
      impact: noRating.length >= 8 ? "Medium" : "Low",
      icon: "sparkle",
      tone: "cyan",
      affected: noRating,
    });
  }

  const blocked = p.profiles.filter((r) => r.verification === "REJECTED" || r.verification === "SUSPENDED");
  if (blocked.length > 0) {
    out.push({
      id: "blocked",
      title: "Review rejected and suspended accounts",
      rationale: `${blocked.length} record${blocked.length === 1 ? " is" : "s are"} rejected or suspended and still sitting in the directory. Each one is either a recoverable account or a record that should be closed out — neither happens on its own.`,
      impact: blocked.length >= 5 ? "Medium" : "Low",
      icon: "search",
      tone: "purple",
      affected: blocked,
    });
  }

  const critical = p.profiles.filter((r) => r.strengthBand === "Critical");
  if (critical.length > 0) {
    out.push({
      id: "critical-coverage",
      title: "Complete near-empty records",
      rationale: `${critical.length} record${critical.length === 1 ? " has" : "s have"} under 40% of the fields GhrFix's admin directories return populated — against a roster average of ${p.averageStrength ?? "—"}%. These are the thinnest accounts on the platform.`,
      impact: "High",
      icon: "alert",
      tone: "red",
      affected: critical,
    });
  }

  return out.sort((a, b) => IMPACT_ORDER[a.impact] - IMPACT_ORDER[b.impact] || b.affected.length - a.affected.length);
}

/* ── ShadiLife rules (unchanged) ────────────────────────────────────── */

function shadilifeNudges(p: ProfileSnapshot): Nudge[] {
  const out: Nudge[] = [];

  const noPhoto = p.profiles.filter((r) => r.hasPhoto === false);
  if (noPhoto.length > 0) {
    out.push({
      id: "photo",
      title: "Ask for a profile photo",
      rationale: `The quality audit found no usable photo on ${noPhoto.length} profile${noPhoto.length === 1 ? "" : "s"}; photoless profiles are the ones members skip past first.`,
      impact: noPhoto.length >= 5 ? "High" : "Medium",
      icon: "eye",
      tone: "blue",
      affected: noPhoto,
    });
  }

  const noBio = p.profiles.filter((r) => r.hasBio === false);
  if (noBio.length > 0) {
    out.push({
      id: "bio",
      title: "Draft a bio with the agent",
      rationale: `${noBio.length} audited profile${noBio.length === 1 ? " has" : "s have"} no usable bio — and the audit already drafted a suggested one for ${noBio.filter((r) => r.bioSuggestion).length} of them.`,
      impact: noBio.length >= 5 ? "High" : "Medium",
      icon: "edit",
      tone: "amber",
      affected: noBio,
    });
  }

  const critical = p.profiles.filter((r) => r.strengthBand === "Critical");
  if (critical.length > 0) {
    out.push({
      id: "critical",
      title: "Nudge critically incomplete profiles",
      rationale: `${critical.length} profile${critical.length === 1 ? " sits" : "s sit"} under 40% completion, which is far enough below the roster average of ${p.averageStrength ?? "—"}% that matching barely works for them.`,
      impact: "High",
      icon: "alert",
      tone: "red",
      affected: critical,
    });
  }

  const weak = p.profiles.filter((r) => r.strengthBand === "Weak");
  if (weak.length > 0) {
    out.push({
      id: "weak",
      title: "Close the last gaps on near-misses",
      rationale: `${weak.length} profile${weak.length === 1 ? " is" : "s are"} between 40% and 60% complete — the cheapest band to move, since each is only a field or two from Moderate.`,
      impact: weak.length >= 8 ? "Medium" : "Low",
      icon: "target",
      tone: "amber",
      affected: weak,
    });
  }

  /* "Unverified for a long time" is measured against the only real date these
     endpoints return: when the member entered the verification review queue. */
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const stale = p.profiles.filter((r) => r.submittedAt !== null && new Date(r.submittedAt).getTime() < cutoff);
  if (stale.length > 0) {
    out.push({
      id: "stale-review",
      title: "Clear the ageing verification queue",
      rationale: `${stale.length} profile${stale.length === 1 ? " has" : "s have"} been waiting in the verification review queue for over 30 days, which is long enough for members to give up on the platform.`,
      impact: "High",
      icon: "clock",
      tone: "red",
      affected: stale,
    });
  }

  const notQueued = p.profiles.filter((r) => r.verification === "NOT_IN_REVIEW" && r.strengthBand !== "Strong");
  if (notQueued.length > 0) {
    out.push({
      id: "not-queued",
      title: "Route incomplete profiles into verification",
      rationale: `${notQueued.length} incomplete profile${notQueued.length === 1 ? " has" : "s have"} never entered the verification queue, so they carry neither a completion push nor a trust signal.`,
      impact: notQueued.length >= 10 ? "Medium" : "Low",
      icon: "users",
      tone: "cyan",
      affected: notQueued,
    });
  }

  const unaudited = p.profiles.filter((r) => !r.audited);
  if (unaudited.length > 0 && p.audited > 0) {
    out.push({
      id: "unaudited",
      title: "Extend the quality audit",
      rationale: `The audit only scored ${p.audited} of ${p.total} tracked profiles, so ${unaudited.length} ${unaudited.length === 1 ? "has" : "have"} no photo or bio verdict at all — the gaps there are unknown, not absent.`,
      impact: "Low",
      icon: "search",
      tone: "purple",
      affected: unaudited,
    });
  }

  return out.sort((a, b) => IMPACT_ORDER[a.impact] - IMPACT_ORDER[b.impact] || b.affected.length - a.affected.length);
}
