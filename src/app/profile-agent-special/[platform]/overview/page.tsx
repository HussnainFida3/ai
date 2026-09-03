"use client";

/**
 * Profile Agent — Overview.
 *
 * Every figure here comes from `useProfileSnapshot`, and both platforms are
 * live but describe different populations:
 *
 *  · ShadiLife — members, ranked on the real Profile.completionPct roster,
 *    with the deterministic quality audit and the verification review queue.
 *  · GhrFix    — the real /admin/users and /admin/providers directories plus
 *    their /stats counters. GhrFix has no completion score and no profile
 *    quality audit, so those cards say "Not tracked" rather than showing a
 *    zero that would read as a measurement.
 *
 * There is deliberately no trend chart on either platform: none of these
 * endpoints returns a time series, and a fabricated one would be worse than
 * none.
 */

import { usePlatformParam, platformLabel } from "@/lib/agent-data";
import { useProfileSnapshot, type ProfileSnapshot } from "@/lib/profile-data";
import {
  BarRows,
  Card,
  Donut,
  Empty,
  ErrorNote,
  Icon,
  Legend,
  NotTracked,
  PartialNote,
  ProfileShell,
  ScoreRing,
  SERIES,
  StatCard,
  StrengthPill,
  TONE,
  VerificationMark,
} from "@/components/profile-special/kit";

export default function ProfileOverviewPage({ params }: { params: Promise<{ platform: string }> }) {
  const platform = usePlatformParam(params);
  const p = useProfileSnapshot(platform);
  const label = platformLabel(platform);
  const ghrfix = platform === "ghrfix";

  const avg = p.averageStrength;
  const strongPct = p.total > 0 ? Math.round(((p.total - p.incomplete) / p.total) * 100) : 0;

  /* ShadiLife: field completeness across profiles the audit actually covered.
     GhrFix: contact-field coverage, counted from real /admin rows. */
  const fieldRows = ghrfix
    ? [
        { label: "Has a phone number", value: p.profiles.filter((r) => r.hasPhone === true).length },
        { label: "Has an email", value: p.profiles.filter((r) => r.hasEmail === true).length },
        { label: "Providers with a rating", value: p.profiles.filter((r) => r.rating !== null).length },
        { label: "Providers with a service listed", value: p.profiles.filter((r) => r.services.length > 0).length },
      ]
    : [
        { label: "Has a bio", value: p.profiles.filter((r) => r.hasBio === true).length },
        { label: "Has a photo", value: p.profiles.filter((r) => r.hasPhoto === true).length },
        { label: "Audited profiles", value: p.audited },
      ];

  const us = p.ghrfixUserStats;
  const prs = p.ghrfixProviderStats;

  return (
    <ProfileShell
      platform={platform}
      title="Profile Agent"
      subtitle={
        ghrfix
          ? "Users and providers, their verification state and where the record gaps are"
          : "Profile strength, verification state and the gaps worth closing"
      }
    >
      {p.error && <ErrorNote error={p.error} platform={platform} />}

      {ghrfix && !p.error && p.usersError && (
        <PartialNote title="User directory unavailable">
          {p.usersError} Provider figures below are still real; user figures are missing entirely rather than shown as
          zero.
        </PartialNote>
      )}
      {ghrfix && !p.error && p.providersError && (
        <PartialNote title="Provider directory unavailable">
          {p.providersError} User figures below are still real; verification state cannot be assessed without the
          provider directory.
        </PartialNote>
      )}

      <div className="ps-stats">
        <StatCard
          label={ghrfix ? "Profiles Loaded" : "Profiles Tracked"}
          value={p.loading ? "—" : p.total.toLocaleString()}
          sub={ghrfix ? "Users + providers in this sample" : "Below 100% completion"}
          tone="purple"
          icon="users"
        />
        <StatCard
          label={ghrfix ? "Providers Awaiting Verification" : "In Review Queue"}
          value={p.loading ? "—" : p.verificationUnknown ? "Unknown" : (ghrfix && prs ? prs.pending : p.underReview).toLocaleString()}
          sub={
            p.verificationUnknown
              ? ghrfix
                ? "Provider directory unreachable"
                : "Verification queue unreachable"
              : ghrfix
                ? prs
                  ? "Platform-wide PENDING verificationStatus"
                  : "From the loaded sample only — /stats unreachable"
                : "Awaiting verification"
          }
          tone="blue"
          icon="clock"
        />
        <StatCard
          label={ghrfix ? "Average Field Coverage" : "Average Strength"}
          value={p.loading ? "—" : avg === null ? "Not reported" : `${avg}%`}
          sub={
            avg === null
              ? "No row reported a score"
              : ghrfix
                ? "Real fields populated per record"
                : "Mean profile completion"
          }
          tone="green"
          icon="target"
        />
        <StatCard
          label="Incomplete"
          value={p.loading ? "—" : p.incomplete.toLocaleString()}
          sub="Below the 80% Strong band"
          tone="amber"
          icon="alert"
        />
        {ghrfix ? (
          <StatCard
            label="Verified Providers"
            value={p.loading ? "—" : prs ? `${prs.verified} / ${prs.total}` : "Unknown"}
            sub={prs ? "Straight from /admin/providers/stats" : "Provider stats unreachable"}
            tone="cyan"
            icon="check"
          />
        ) : (
          <StatCard
            label="Quality Audited"
            value={p.loading ? "—" : p.audited.toLocaleString()}
            sub={p.averageQualityScore === null ? "No audit results yet" : `Average score ${p.averageQualityScore} / 10`}
            tone="cyan"
            icon="sparkle"
          />
        )}
        {ghrfix && (
          <StatCard
            label="Available Right Now"
            value={p.loading ? "—" : prs ? prs.available.toLocaleString() : "Unknown"}
            sub={prs ? "Providers with isAvailable set" : "Provider stats unreachable"}
            tone="purple"
            icon="trend"
          />
        )}
      </div>

      {/* GhrFix's real platform-wide counters — not the loaded sample. */}
      {ghrfix && (
        <div className="ps-stats">
          <StatCard
            label="Registered Users"
            value={p.loading ? "—" : us ? us.total.toLocaleString() : "Unknown"}
            sub={us ? `${us.active.toLocaleString()} active · ${us.newThisWeek.toLocaleString()} new this week` : "/admin/users/stats unreachable"}
            tone="blue"
            icon="users"
          />
          <StatCard
            label="Registered Providers"
            value={p.loading ? "—" : prs ? prs.total.toLocaleString() : "Unknown"}
            sub={prs ? `${prs.rejected.toLocaleString()} rejected · ${prs.suspended.toLocaleString()} suspended` : "/admin/providers/stats unreachable"}
            tone="green"
            icon="check"
          />
          <StatCard
            label="Users Pending Verification"
            value={p.loading ? "—" : us ? us.pendingVerification.toLocaleString() : "Unknown"}
            sub={us ? "Account status PENDING_VERIFICATION" : "/admin/users/stats unreachable"}
            tone="amber"
            icon="alert"
          />
          <StatCard
            label="Average Provider Rating"
            value={p.loading ? "—" : prs ? `${Math.round(prs.avgRating * 100) / 100} / 5` : "Unknown"}
            sub={prs ? "Real avgRating across providers" : "/admin/providers/stats unreachable"}
            tone="cyan"
            icon="sparkle"
          />
        </div>
      )}

      <div className="ps-row-3">
        <Card title={ghrfix ? "Average Field Coverage" : "Average Profile Strength"}>
          {p.loading ? (
            <Empty>Loading live profiles…</Empty>
          ) : avg === null ? (
            <Empty>No record returned a score, so nothing can be averaged.</Empty>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                <ScoreRing
                  value={avg}
                  max={100}
                  label={ghrfix ? "% of fields set" : "% complete"}
                  color={avg >= 80 ? "#4ade80" : avg >= 60 ? "#3b7fd1" : avg >= 40 ? "#fbbf24" : "#e04452"}
                />
              </div>
              <p style={{ margin: 0, fontSize: 11.5, lineHeight: "19px", color: "#cbd5e1", textAlign: "center" }}>
                {strongPct}% of loaded records sit in the Strong band.
                {ghrfix && " Coverage counts real fields present on /admin/users and /admin/providers — GhrFix has no completion score of its own."}
              </p>
            </>
          )}
        </Card>

        <Card title="Verification State">
          {p.loading ? (
            <Empty>Loading…</Empty>
          ) : p.byVerification.length === 0 ? (
            <Empty>No records to break down.</Empty>
          ) : (
            <div className="ps-donut-row">
              <Donut data={p.byVerification} center={p.total.toLocaleString()} centerLabel="Records" />
              <Legend data={p.byVerification} />
            </div>
          )}
        </Card>

        <Card title={ghrfix ? "Users vs Providers" : "Strength Bands"}>
          {p.loading ? (
            <Empty>Loading…</Empty>
          ) : ghrfix ? (
            p.byKind.length === 0 ? (
              <Empty>Neither directory returned any rows.</Empty>
            ) : (
              <div className="ps-donut-row">
                <Donut data={p.byKind} center={p.total.toLocaleString()} centerLabel="Records" />
                <Legend data={p.byKind} />
              </div>
            )
          ) : p.byStrength.length === 0 ? (
            <Empty>No completion scores to band.</Empty>
          ) : (
            <div className="ps-donut-row">
              <Donut data={p.byStrength} center={p.total.toLocaleString()} centerLabel="Profiles" />
              <Legend data={p.byStrength} />
            </div>
          )}
        </Card>
      </div>

      <div className="ps-row-3">
        <Card title="Strength Bands">
          {p.loading ? (
            <Empty>Loading…</Empty>
          ) : p.byStrength.length === 0 ? (
            <Empty>No scores to band.</Empty>
          ) : (
            <div className="ps-donut-row">
              <Donut data={p.byStrength} center={p.total.toLocaleString()} centerLabel="Records" />
              <Legend data={p.byStrength} />
            </div>
          )}
        </Card>

        <Card title={ghrfix ? "Account / Verification Status" : "Profiles by City"}>
          {p.loading ? (
            <Empty>Loading…</Empty>
          ) : ghrfix ? (
            p.byStatus.length === 0 ? (
              <Empty>No status values returned.</Empty>
            ) : (
              <>
                <BarRows rows={p.byStatus} />
                <div style={{ marginTop: 12 }}>
                  <Legend data={p.byStatus} />
                </div>
              </>
            )
          ) : p.byCity.length === 0 ? (
            <Empty>No city was returned on any profile.</Empty>
          ) : (
            <BarRows rows={p.byCity.map((r) => ({ ...r, color: SERIES[1] }))} colored={false} />
          )}
          {!p.loading && !p.cityTracked && !ghrfix && <NotTracked what="city field" platform={platform} />}
        </Card>

        <Card title={ghrfix ? "Top Service Categories" : "Field Completeness"}>
          {p.loading ? (
            <Empty>Loading…</Empty>
          ) : ghrfix ? (
            p.byService.length === 0 ? (
              <Empty>No provider in this sample lists a service category.</Empty>
            ) : (
              <>
                <BarRows rows={p.byService.map((r, i) => ({ ...r, color: SERIES[i % SERIES.length] }))} />
                <div style={{ marginTop: 12 }}>
                  <Legend data={p.byService.map((r, i) => ({ ...r, color: SERIES[i % SERIES.length] }))} />
                </div>
              </>
            )
          ) : p.audited === 0 ? (
            <Empty>The quality audit returned no results, so photo and bio presence is unknown.</Empty>
          ) : (
            <>
              <BarRows rows={fieldRows.map((r) => ({ ...r, color: SERIES[2] }))} colored={false} />
              <p style={{ margin: "12px 0 0", fontSize: 11, lineHeight: "18px", color: "#94a3b8" }}>
                Counted across the {p.audited} profile(s) the quality audit covered — the rest have no verdict.
              </p>
            </>
          )}
        </Card>
      </div>

      <div className="ps-row-2">
        <Card title={ghrfix ? "Record Field Coverage" : "Contact & Record Fields"}>
          {p.loading ? (
            <Empty>Loading…</Empty>
          ) : p.total === 0 ? (
            <Empty>No records loaded, so no field can be counted.</Empty>
          ) : (
            <>
              <BarRows rows={fieldRows.map((r, i) => ({ ...r, color: SERIES[i % SERIES.length] }))} />
              <div style={{ marginTop: 12 }}>
                <Legend data={fieldRows.map((r, i) => ({ ...r, color: SERIES[i % SERIES.length] }))} showPct={false} />
              </div>
              <p style={{ margin: "12px 0 0", fontSize: 11, lineHeight: "18px", color: "#94a3b8" }}>
                Out of {p.total} loaded record(s).
                {ghrfix && " Photo and bio are absent from this list because GhrFix's admin directories return neither."}
              </p>
              {ghrfix && <NotTracked what="profile photo or bio field" platform={platform} />}
            </>
          )}
        </Card>

        <Card title="Agent Insights">
          <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
            {p.loading ? (
              <Empty>Loading…</Empty>
            ) : (
              buildInsights(p, label).map((i) => (
                <div key={i.text} style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
                  <span
                    style={{
                      width: 29, height: 29, borderRadius: 9, flex: "0 0 auto", display: "grid", placeItems: "center",
                      background: TONE[i.tone].bg, color: TONE[i.tone].fg,
                    }}
                  >
                    <Icon name={i.icon} size={15} />
                  </span>
                  <p style={{ margin: 0, fontSize: 11.5, lineHeight: "19px", color: "#cbd5e1" }}>{i.text}</p>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <Card
        title={ghrfix ? "Weakest Records" : "Weakest Profiles"}
        action={<span style={{ fontSize: 11, color: "#94a3b8" }}>{p.weakest.length} of {p.total}</span>}
        pad={false}
      >
        <div className="ps-table-wrap">
          <table className="ps-table">
            <thead>
              <tr>
                <th style={{ paddingLeft: 19 }}>{ghrfix ? "Person" : "Member"}</th>
                {p.hasKinds && <th>Kind</th>}
                <th>{ghrfix ? "Status" : "City"}</th>
                <th>Verification</th>
                <th>{ghrfix ? "Services" : "Gap"}</th>
                <th className="ps-num" style={{ paddingRight: 19 }}>{ghrfix ? "Coverage" : "Completion"}</th>
              </tr>
            </thead>
            <tbody>
              {p.loading && <tr><td colSpan={6} style={{ padding: 19 }}><Empty>Loading live profiles…</Empty></td></tr>}
              {!p.loading && p.weakest.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: 19 }}>
                    <Empty>
                      {p.error || p.usersError || p.providersError
                        ? "A directory could not be read, so no ranking can be produced. This is not a clean bill of health."
                        : ghrfix
                          ? "No record is below full field coverage."
                          : "No profile is below full completion — nothing to nudge."}
                    </Empty>
                  </td>
                </tr>
              )}
              {p.weakest.map((r) => (
                <tr key={`${r.kind}-${r.userId}`}>
                  <td style={{ paddingLeft: 19 }}>
                    <div className="title">{r.fullName}</div>
                    {r.qualityScore !== null && <div className="sub">Quality score {r.qualityScore} / 10</div>}
                    {r.rating !== null && <div className="sub">Rating {r.rating} / 5</div>}
                  </td>
                  {p.hasKinds && (
                    <td style={{ color: "#cbd5e1" }}>{r.kind === "provider" ? "Provider" : "User"}</td>
                  )}
                  <td style={{ color: "#cbd5e1" }}>{ghrfix ? r.accountStatus ?? "—" : r.city ?? "—"}</td>
                  <td><VerificationMark state={r.verification} /></td>
                  <td style={{ color: "#cbd5e1", maxWidth: 300 }}>
                    {ghrfix
                      ? r.kind === "provider"
                        ? r.services.length > 0 ? r.services.join(", ") : "None listed"
                        : "—"
                      : r.gap ?? (r.audited ? "None found" : "Not audited")}
                  </td>
                  <td className="ps-num" style={{ paddingRight: 19 }}>
                    <StrengthPill row={r} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <p style={{ margin: 0, fontSize: 11, lineHeight: "18px", color: "#94a3b8" }}>{p.rosterNote}</p>
    </ProfileShell>
  );
}

/** Insights are statements about the real roster, not canned copy. */
function buildInsights(p: ProfileSnapshot, label: string) {
  const out: Array<{ icon: string; tone: keyof typeof TONE; text: string }> = [];
  const ghrfix = p.platform === "ghrfix";

  /* Never assert health we cannot evidence. */
  if (p.error) {
    return [{ icon: "alert", tone: "amber" as const, text: `The ${label} roster could not be read, so nothing can be assessed. This is not a statement that all records are healthy.` }];
  }
  if (p.usersError) {
    out.push({ icon: "alert", tone: "amber", text: "The user directory failed to load, so user figures are missing from every chart on this page rather than counted as zero." });
  }
  if (p.providersError) {
    out.push({ icon: "alert", tone: "amber", text: "The provider directory failed to load, so verification state cannot be assessed at all." });
  }
  if (p.total === 0 && out.length === 0) {
    return [{ icon: "search", tone: "purple" as const, text: `${label} returned no records to profile.` }];
  }

  if (ghrfix) {
    const prs = p.ghrfixProviderStats;
    if (prs && prs.pending > 0) {
      out.push({ icon: "clock", tone: "blue", text: `${prs.pending} provider${prs.pending === 1 ? " is" : "s are"} awaiting verification out of ${prs.total} on the platform.` });
    }
    if (p.missingPhone > 0) {
      out.push({ icon: "alert", tone: "amber", text: `${p.missingPhone} loaded record${p.missingPhone === 1 ? " has" : "s have"} no phone number — the field GhrFix's booking flow depends on most.` });
    }
    if (p.missingEmail > 0) {
      out.push({ icon: "edit", tone: "cyan", text: `${p.missingEmail} loaded record${p.missingEmail === 1 ? " has" : "s have"} no email address on file.` });
    }
    const noService = p.profiles.filter((r) => r.kind === "provider" && r.services.length === 0).length;
    if (noService > 0) {
      out.push({ icon: "tag", tone: "purple", text: `${noService} provider${noService === 1 ? " lists" : "s list"} no service category, so they cannot be surfaced in search.` });
    }
    if (p.byService.length > 0) {
      out.push({ icon: "trend", tone: "green", text: `“${p.byService[0].label}” is the most common service category at ${p.byService[0].value} provider(s).` });
    }
  } else {
    const critical = p.profiles.filter((r) => r.strengthBand === "Critical").length;
    if (critical > 0) {
      out.push({ icon: "alert", tone: "red", text: `${critical} profile${critical === 1 ? " is" : "s are"} under 40% complete — the highest-value nudge list.` });
    }
    if (p.missingBio > 0) {
      out.push({ icon: "edit", tone: "amber", text: `${p.missingBio} audited profile${p.missingBio === 1 ? "" : "s"} ${p.missingBio === 1 ? "has" : "have"} no usable bio, the single most common gap the audit names.` });
    }
    if (p.missingPhoto > 0) {
      out.push({ icon: "eye", tone: "blue", text: `${p.missingPhoto} audited profile${p.missingPhoto === 1 ? "" : "s"} ${p.missingPhoto === 1 ? "is" : "are"} missing a photo, which suppresses match visibility.` });
    }
    if (p.verificationUnknown) {
      out.push({ icon: "search", tone: "purple", text: "The verification review queue could not be read, so review state is reported as Unknown rather than assumed." });
    } else if (p.underReview > 0) {
      out.push({ icon: "clock", tone: "cyan", text: `${p.underReview} of ${p.total} tracked profile${p.underReview === 1 ? " is" : "s are"} sitting in the verification review queue.` });
    }
    if (p.byCity.length > 0) {
      out.push({ icon: "tag", tone: "purple", text: `“${p.byCity[0].label}” carries the most incomplete profiles at ${p.byCity[0].value}.` });
    }
  }

  if (out.length === 0) {
    out.push({ icon: "check", tone: "green", text: "Nothing stands out in the records that loaded successfully." });
  }
  return out.slice(0, 4);
}

