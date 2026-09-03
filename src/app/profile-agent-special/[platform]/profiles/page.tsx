"use client";

/**
 * Profile Agent — Profiles.
 *
 * The full real roster for the active platform.
 *
 *  · ShadiLife — every member below 100% Profile.completionPct, filterable by
 *    review state and city, searchable across name, city and the quality
 *    audit's own description of the gap. Photo and bio columns read "Not
 *    audited" — not "Missing" — for profiles the audit did not cover, because
 *    absence of a verdict is not a verdict.
 *  · GhrFix — the real /admin/users and /admin/providers directories merged
 *    into one table with a USER / PROVIDER kind column and a Users /
 *    Providers / All switch. GhrFix returns no city, no photo and no bio, so
 *    those columns are not rendered at all rather than filled with blanks
 *    that would read as missing data.
 */

import { useMemo, useState } from "react";
import { usePlatformParam, platformLabel } from "@/lib/agent-data";
import { useProfileSnapshot, humanStatus, type ProfileKind } from "@/lib/profile-data";
import {
  Card,
  Donut,
  Empty,
  ErrorNote,
  FieldMark,
  Icon,
  Legend,
  NotTracked,
  PartialNote,
  ProfileShell,
  StatCard,
  StrengthPill,
  VerificationMark,
} from "@/components/profile-special/kit";

const SHADILIFE_TABS = ["All", "In review", "Not in queue", "Incomplete"] as const;
const GHRFIX_TABS = ["All", "Users", "Providers", "Awaiting verification", "Incomplete"] as const;
type Tab = (typeof SHADILIFE_TABS)[number] | (typeof GHRFIX_TABS)[number];
const PAGE_SIZE = 12;

export default function ProfileProfilesPage({ params }: { params: Promise<{ platform: string }> }) {
  const platform = usePlatformParam(params);
  const p = useProfileSnapshot(platform);
  const label = platformLabel(platform);
  const ghrfix = platform === "ghrfix";

  const [tab, setTab] = useState<Tab>("All");
  const [city, setCity] = useState("All cities");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const tabs: readonly Tab[] = ghrfix ? GHRFIX_TABS : SHADILIFE_TABS;
  const cities = useMemo(() => ["All cities", ...p.byCity.map((c) => c.label)], [p.byCity]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return p.profiles.filter((r) => {
      if (tab === "Users" && r.kind !== "user") return false;
      if (tab === "Providers" && r.kind !== "provider") return false;
      if (tab === "Awaiting verification" && r.verification !== "UNDER_REVIEW") return false;
      if (tab === "In review" && r.verification !== "UNDER_REVIEW") return false;
      if (tab === "Not in queue" && r.verification !== "NOT_IN_REVIEW") return false;
      if (tab === "Incomplete" && r.strengthBand === "Strong") return false;
      if (!ghrfix && city !== "All cities" && r.city !== city) return false;
      const haystack = `${r.fullName} ${r.city ?? ""} ${r.gap ?? ""} ${r.accountStatus ?? ""} ${r.services.join(" ")}`;
      if (q && !haystack.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [p.profiles, tab, city, search, ghrfix]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const visible = rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  /* Distribution of the currently filtered set — real counts, legend-labelled. */
  const filteredKinds = useMemo(
    () =>
      (["user", "provider"] as ProfileKind[])
        .map((k) => ({
          label: k === "user" ? "Users" : "Providers",
          value: rows.filter((r) => r.kind === k).length,
          color: k === "user" ? "#3b7fd1" : "#4ade80",
        }))
        .filter((k) => k.value > 0),
    [rows],
  );

  function reset<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setPage(1);
    };
  }

  /* Both layouts render nine columns; kept explicit so colSpan stays honest. */
  const columns = 9;

  return (
    <ProfileShell
      platform={platform}
      title="Profiles"
      subtitle={
        ghrfix
          ? `Every ${label} user and provider the agent can read, with its real field coverage`
          : `Every ${label} profile the agent is tracking, with its real completion score`
      }
    >
      {p.error && <ErrorNote error={p.error} platform={platform} />}

      {ghrfix && !p.error && p.usersError && (
        <PartialNote title="User directory unavailable">
          {p.usersError} Only providers are listed below — users are absent, not zero.
        </PartialNote>
      )}
      {ghrfix && !p.error && p.providersError && (
        <PartialNote title="Provider directory unavailable">
          {p.providersError} Only users are listed below — providers are absent, not zero.
        </PartialNote>
      )}

      <div className="ps-stats">
        <StatCard
          label={ghrfix ? "Records Loaded" : "Tracked"}
          value={p.loading ? "—" : p.total.toLocaleString()}
          sub={ghrfix ? "Users + providers in this sample" : "Below 100% completion"}
          tone="purple"
          icon="users"
        />
        {ghrfix ? (
          <StatCard
            label="Users / Providers"
            value={p.loading ? "—" : `${p.users.toLocaleString()} / ${p.providers.toLocaleString()}`}
            sub={p.directoryTotal !== null ? `${p.directoryTotal.toLocaleString()} on the platform in total` : "Platform totals unavailable"}
            tone="blue"
            icon="check"
          />
        ) : (
          <StatCard
            label="In Review Queue"
            value={p.loading ? "—" : p.verificationUnknown ? "Unknown" : p.underReview.toLocaleString()}
            sub={p.verificationUnknown ? "Queue unreachable" : "Awaiting verification"}
            tone="blue"
            icon="clock"
          />
        )}
        <StatCard
          label={ghrfix ? "Awaiting Verification" : "Incomplete"}
          value={
            p.loading
              ? "—"
              : ghrfix
                ? p.verificationUnknown
                  ? "Unknown"
                  : p.underReview.toLocaleString()
                : p.incomplete.toLocaleString()
          }
          sub={ghrfix ? "Real PENDING / PENDING_VERIFICATION rows" : "Below the Strong band"}
          tone="amber"
          icon="alert"
        />
        <StatCard
          label="Matching Filters"
          value={p.loading ? "—" : rows.length.toLocaleString()}
          sub={`Showing ${visible.length} on this page`}
          tone="green"
          icon="search"
        />
      </div>

      {ghrfix && !p.loading && filteredKinds.length > 0 && (
        <div className="ps-row-half">
          <Card title="Filtered Split">
            <div className="ps-donut-row">
              <Donut data={filteredKinds} center={rows.length.toLocaleString()} centerLabel="Records" />
              <Legend data={filteredKinds} />
            </div>
          </Card>
          <Card title="Verification of the Full Sample">
            {p.byVerification.length === 0 ? (
              <Empty>No verification values returned.</Empty>
            ) : (
              <div className="ps-donut-row">
                <Donut data={p.byVerification} center={p.total.toLocaleString()} centerLabel="Records" />
                <Legend data={p.byVerification} />
              </div>
            )}
          </Card>
        </div>
      )}

      <Card pad={false}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 19px 0", flexWrap: "wrap" }}>
          <div className="ps-tabs" style={{ border: 0, flex: 1, minWidth: 260 }}>
            {tabs.map((t) => (
              <button key={t} type="button" className={tab === t ? "ps-tab active" : "ps-tab"} onClick={() => reset(setTab)(t)}>
                {t}
              </button>
            ))}
          </div>

          {/* City exists only on ShadiLife — the control is hidden, not empty. */}
          {!ghrfix && (
            <select
              className="ps-btn"
              value={city}
              onChange={(e) => reset(setCity)(e.target.value)}
              style={{ paddingRight: 10 }}
              aria-label="Filter by city"
            >
              {cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          )}

          <label className="ps-search">
            <Icon name="search" size={15} />
            <input
              value={search}
              onChange={(e) => reset(setSearch)(e.target.value)}
              placeholder={ghrfix ? "Search name, status or service…" : "Search name, city or gap…"}
              aria-label="Search profiles"
            />
          </label>
        </div>

        <div className="ps-table-wrap" style={{ marginTop: 12 }}>
          <table className="ps-table">
            <thead>
              <tr>
                <th style={{ paddingLeft: 19 }}>{ghrfix ? "Person" : "Member"}</th>
                {ghrfix && <th>Kind</th>}
                {ghrfix ? <th>Status</th> : <th>City</th>}
                <th>Verification</th>
                {ghrfix ? (
                  <>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>Services</th>
                    <th className="ps-num">Rating</th>
                  </>
                ) : (
                  <>
                    <th>Photo</th>
                    <th>Bio</th>
                    <th>Gap</th>
                    <th className="ps-num">Quality</th>
                    <th className="ps-num">Submitted</th>
                  </>
                )}
                <th className="ps-num" style={{ paddingRight: 19 }}>{ghrfix ? "Coverage" : "Strength"}</th>
              </tr>
            </thead>
            <tbody>
              {p.loading && <tr><td colSpan={columns} style={{ padding: 19 }}><Empty>Loading live profiles…</Empty></td></tr>}
              {!p.loading && visible.length === 0 && (
                <tr>
                  <td colSpan={columns} style={{ padding: 19 }}>
                    <Empty>
                      {p.error || (ghrfix && p.usersError && p.providersError)
                        ? "The directory could not be read, so nothing can be listed. This is not a statement that the roster is empty."
                        : p.total === 0
                          ? ghrfix
                            ? `${label} returned no users or providers.`
                            : "No profile is below full completion — there is nothing for the agent to fix."
                          : "No profiles match these filters."}
                    </Empty>
                  </td>
                </tr>
              )}
              {visible.map((r) => (
                <tr key={`${r.kind}-${r.userId}`}>
                  <td style={{ paddingLeft: 19, maxWidth: 260 }}>
                    <div className="title">{r.fullName}</div>
                    <div className="sub">{r.strengthBasis}</div>
                  </td>
                  {ghrfix && (
                    <td>
                      <span style={{ fontSize: 11.5, fontWeight: 650, color: r.kind === "provider" ? "#4ade80" : "#3b7fd1" }}>
                        {r.kind === "provider" ? "Provider" : "User"}
                      </span>
                    </td>
                  )}
                  {ghrfix ? (
                    <td style={{ color: "#cbd5e1", whiteSpace: "nowrap" }}>{r.accountStatus ? humanStatus(r.accountStatus) : "—"}</td>
                  ) : (
                    <td style={{ color: "#cbd5e1", whiteSpace: "nowrap" }}>{r.city ?? "—"}</td>
                  )}
                  <td><VerificationMark state={r.verification} /></td>
                  {ghrfix ? (
                    <>
                      <td><FieldMark ok={r.hasPhone} unknownLabel="Not returned" /></td>
                      <td><FieldMark ok={r.hasEmail} unknownLabel="Not returned" /></td>
                      <td style={{ color: "#cbd5e1", maxWidth: 240 }}>
                        {r.kind === "provider" ? (r.services.length > 0 ? r.services.join(", ") : "None listed") : "—"}
                      </td>
                      <td className="ps-num" style={{ color: "#cbd5e1" }}>{r.rating === null ? "—" : `${r.rating} / 5`}</td>
                    </>
                  ) : (
                    <>
                      <td><FieldMark ok={r.hasPhoto} /></td>
                      <td><FieldMark ok={r.hasBio} /></td>
                      <td style={{ color: "#cbd5e1", maxWidth: 260 }}>{r.gap ?? (r.audited ? "None found" : "—")}</td>
                      <td className="ps-num" style={{ color: "#cbd5e1" }}>{r.qualityScore === null ? "—" : `${r.qualityScore}/10`}</td>
                      <td className="ps-num" style={{ color: "#94a3b8", whiteSpace: "nowrap" }}>
                        {r.submittedAt ? new Date(r.submittedAt).toLocaleDateString() : "—"}
                      </td>
                    </>
                  )}
                  <td className="ps-num" style={{ paddingRight: 19 }}><StrengthPill row={r} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {rows.length > PAGE_SIZE && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 19px", borderTop: "1px solid rgba(255,255,255,.07)", fontSize: 11.5, color: "#cbd5e1", flexWrap: "wrap" }}>
            <span className="ps-num">
              Showing {(current - 1) * PAGE_SIZE + 1}–{Math.min(current * PAGE_SIZE, rows.length)} of {rows.length}
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <button type="button" className="ps-btn" onClick={() => setPage(Math.max(1, current - 1))} disabled={current === 1}>
                Previous
              </button>
              <span className="ps-num" style={{ display: "grid", placeItems: "center", padding: "0 10px", fontWeight: 650 }}>
                {current} / {totalPages}
              </span>
              <button type="button" className="ps-btn" onClick={() => setPage(Math.min(totalPages, current + 1))} disabled={current === totalPages}>
                Next
              </button>
            </div>
          </div>
        )}
      </Card>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <p style={{ margin: 0, fontSize: 11, lineHeight: "18px", color: "#94a3b8" }}>{p.rosterNote}</p>
        {ghrfix ? (
          <>
            <p style={{ margin: 0, fontSize: 11, lineHeight: "18px", color: "#94a3b8" }}>
              “Coverage” is the share of the fields named under each row that are actually populated on that record —
              GhrFix reports no completion percentage of its own, so none is shown.
            </p>
            <NotTracked what="profile photo, bio or city field" platform={platform} />
          </>
        ) : (
          <p style={{ margin: 0, fontSize: 11, lineHeight: "18px", color: "#94a3b8" }}>
            “Submitted” is the date the member entered the verification review queue — the only real date these endpoints
            return. There is no join date to show.
          </p>
        )}
      </div>
    </ProfileShell>
  );
}
