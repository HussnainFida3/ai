"use client";

/**
 * Profile Agent — Chat.
 *
 * A real conversation, routed to whichever agent each platform actually
 * registers (see platforms.ts) — never to a route that does not exist:
 *
 *  · ShadiLife — the Profile Agent, through `agentChat`, which posts to the
 *    shared `/ai-agents/ask` route with agentKey "profile".
 *  · GhrFix    — GhrFix registers no "profile" agent. Its people data lives
 *    behind the Owner Chat agent (`/ai-agents/owner-chat/chat`), which is the
 *    agent that actually reads /admin/users and /admin/providers, so that is
 *    the agent this page talks to and the page names it plainly.
 *
 * The suggestion chips are not decoration: each one is written from the live
 * snapshot, so the questions offered are always about people who actually
 * exist. The side panel shows the same numbers the agent is being asked
 * about, so an answer can be checked against the data without leaving the
 * page.
 *
 * All chat-specific CSS lives in the local `<style>` block below under
 * `ps-chat-*` class names only — bare selectors in a `<style>` tag leak to
 * every page in the app.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { usePlatformParam, platformLabel, agentChat } from "@/lib/agent-data";
import type { ChatTurn } from "@/lib/api";
import { useProfileSnapshot } from "@/lib/profile-data";
import type { PlatformKey } from "@/lib/platforms";
import {
  Card,
  Donut,
  Empty,
  ErrorNote,
  Icon,
  Legend,
  PartialNote,
  Pill,
  ProfileShell,
  Robot,
} from "@/components/profile-special/kit";

/** The agent each platform genuinely registers for this data. */
const AGENT: Record<PlatformKey, { key: string; label: string }> = {
  ghrfix: { key: "owner-chat", label: "Owner Chat Agent" },
  shadilife: { key: "profile", label: "Profile Agent" },
};

export default function ProfileChatPage({ params }: { params: Promise<{ platform: string }> }) {
  const platform = usePlatformParam(params);
  const p = useProfileSnapshot(platform);
  const label = platformLabel(platform);
  const ghrfix = platform === "ghrfix";
  const agent = AGENT[platform];

  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  /* Auto-scroll to the newest turn, including while the typing dots show. */
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [history, sending]);

  /* Chips are computed from the real snapshot — never a fixed list, and never
     a claim about data the platform does not have. */
  const chips = useMemo(() => {
    if (p.loading) return [];
    const out: string[] = [];
    if (ghrfix) {
      if (p.underReview > 0) out.push(`What is holding up the ${p.underReview} record(s) awaiting verification?`);
      if (p.providers > 0) out.push(`Summarise the ${p.providers} provider(s) I just loaded and their verification mix.`);
      if (p.missingPhone > 0) out.push(`How do I get the ${p.missingPhone} record(s) with no phone number to add one?`);
      const noService = p.profiles.filter((r) => r.kind === "provider" && r.services.length === 0).length;
      if (noService > 0) out.push(`Why do ${noService} provider(s) list no service category?`);
      if (p.byService.length > 0) out.push(`Is “${p.byService[0].label}” over-supplied compared to other categories?`);
    } else {
      if (p.total > 0) out.push(`Which of the ${p.total} incomplete profiles should I nudge first?`);
      if (p.averageStrength !== null) out.push(`Average profile completion is ${p.averageStrength}% — how do I raise it?`);
      if (p.missingBio > 0) out.push(`Write a bio for the ${p.missingBio} profile(s) the audit says have none.`);
      if (p.missingPhoto > 0) out.push(`How do I get the ${p.missingPhoto} photoless member(s) to upload a picture?`);
      if (p.underReview > 0) out.push(`What is holding up the ${p.underReview} profile(s) in the verification queue?`);
      if (p.byCity.length > 0) out.push(`Why does ${p.byCity[0].label} have the most incomplete profiles?`);
    }
    if (out.length === 0) out.push("What should I be working on with this roster?");
    return out.slice(0, 4);
  }, [
    ghrfix,
    p.loading,
    p.total,
    p.providers,
    p.averageStrength,
    p.missingBio,
    p.missingPhoto,
    p.missingPhone,
    p.underReview,
    p.byCity,
    p.byService,
    p.profiles,
  ]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || sending) return;
    setDraft("");
    setChatError(null);
    const next: ChatTurn[] = [...history, { role: "user", content: message }];
    setHistory(next);
    setSending(true);
    try {
      const reply = await agentChat(platform, agent.key, agent.label, message, history);
      setHistory([...next, { role: "assistant", content: reply }]);
    } catch (err) {
      setChatError(err instanceof Error ? err.message : "The agent could not be reached.");
    } finally {
      setSending(false);
    }
  }

  return (
    <ProfileShell
      platform={platform}
      title="Chat"
      subtitle={`Ask the ${label} ${agent.label} — grounded in the live roster`}
      actions={
        <button
          type="button"
          className="ps-btn"
          onClick={() => { setHistory([]); setChatError(null); }}
          disabled={history.length === 0}
          aria-label="Clear this conversation"
        >
          <Icon name="edit" size={15} />New chat
        </button>
      }
    >
      <style>{CHAT_CSS}</style>

      {p.error && <ErrorNote error={p.error} platform={platform} />}

      {ghrfix && !p.error && (p.usersError || p.providersError) && (
        <PartialNote title="Part of the roster is missing">
          {p.usersError ?? p.providersError} The context panel below reflects only the directory that loaded, so treat
          the agent&apos;s answers as covering that half.
        </PartialNote>
      )}

      <div className="ps-row-2">
        <Card pad={false} className="ps-chat-card">
          <div className="ps-chat-scroll" ref={scrollRef}>
            {history.length === 0 && !sending && (
              <div className="ps-chat-intro">
                <Robot scale={0.9} />
                <h4>{ghrfix ? "Ask about any user or provider" : "Ask about any profile in the roster"}</h4>
                <p>
                  {ghrfix ? (
                    <>
                      I can see the {p.loading ? "…" : p.total} record(s) loaded from GhrFix&apos;s real user and
                      provider directories — verification status, contact fields, ratings and services.
                    </>
                  ) : (
                    <>
                      I can see all {p.loading ? "…" : p.total} tracked profile(s), their completion scores, the quality
                      audit&apos;s findings and who is in the verification queue.
                    </>
                  )}
                </p>
              </div>
            )}

            {history.map((turn, i) => (
              <div key={i} className={turn.role === "user" ? "ps-chat-turn ps-chat-turn-user" : "ps-chat-turn"}>
                <span className="ps-chat-avatar" aria-hidden="true">
                  {turn.role === "user" ? "AU" : <Icon name="bot" size={16} />}
                </span>
                <div className="ps-chat-bubble">
                  <b className="ps-chat-who">{turn.role === "user" ? "You" : agent.label}</b>
                  <p>{turn.content}</p>
                </div>
              </div>
            ))}

            {sending && (
              <div className="ps-chat-turn" aria-live="polite">
                <span className="ps-chat-avatar" aria-hidden="true"><Icon name="bot" size={16} /></span>
                <div className="ps-chat-bubble">
                  <b className="ps-chat-who">{agent.label}</b>
                  <span className="ps-chat-dots" role="status" aria-label="The agent is typing">
                    <i /><i /><i />
                  </span>
                </div>
              </div>
            )}
          </div>

          {chatError && (
            <div className="ps-chat-error" role="alert">
              <Icon name="alert" size={14} />
              <span>{chatError}</span>
            </div>
          )}

          {chips.length > 0 && history.length === 0 && (
            <div className="ps-chat-chips">
              {chips.map((c) => (
                <button key={c} type="button" className="ps-chat-chip" onClick={() => void send(c)}>
                  <Icon name="sparkle" size={12} />{c}
                </button>
              ))}
            </div>
          )}

          <form
            className="ps-chat-composer"
            onSubmit={(e) => { e.preventDefault(); void send(draft); }}
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(draft);
                }
              }}
              placeholder={ghrfix ? "Ask about users, providers or verification…" : "Ask about profile strength, gaps or who to nudge…"}
              aria-label={`Message the ${agent.label}`}
              disabled={sending}
            />
            <button type="submit" className="ps-chat-send" disabled={sending || draft.trim() === ""} aria-label="Send message">
              <Icon name="send" size={16} />
            </button>
          </form>
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Card title="Live Profile Context">
            {p.loading ? (
              <Empty>Loading live profiles…</Empty>
            ) : ghrfix ? (
              <div className="ps-chat-context">
                <ContextRow label="Records loaded" value={p.total.toLocaleString()} />
                <ContextRow label="Users / providers" value={`${p.users.toLocaleString()} / ${p.providers.toLocaleString()}`} />
                <ContextRow label="Platform total" value={p.directoryTotal === null ? "Unavailable" : p.directoryTotal.toLocaleString()} />
                <ContextRow label="Awaiting verification" value={p.verificationUnknown ? "Unknown" : p.underReview.toLocaleString()} />
                <ContextRow label="Verified" value={p.verificationUnknown ? "Unknown" : p.verified.toLocaleString()} />
                <ContextRow label="Average field coverage" value={p.averageStrength === null ? "Not reported" : `${p.averageStrength}%`} />
                <ContextRow label="Missing a phone" value={p.missingPhone.toLocaleString()} />
                <ContextRow label="Missing an email" value={p.missingEmail.toLocaleString()} />
                <ContextRow label="Profile photo / bio" value="Not tracked" />
              </div>
            ) : (
              <div className="ps-chat-context">
                <ContextRow label="Profiles tracked" value={p.total.toLocaleString()} />
                <ContextRow label="Average strength" value={p.averageStrength === null ? "Not reported" : `${p.averageStrength}%`} />
                <ContextRow label="Incomplete" value={p.incomplete.toLocaleString()} />
                <ContextRow label="In review queue" value={p.verificationUnknown ? "Unknown" : p.underReview.toLocaleString()} />
                <ContextRow label="Quality audited" value={p.audited.toLocaleString()} />
                <ContextRow label="Missing a bio" value={p.audited === 0 ? "Unknown" : p.missingBio.toLocaleString()} />
                <ContextRow label="Missing a photo" value={p.audited === 0 ? "Unknown" : p.missingPhoto.toLocaleString()} />
              </div>
            )}
          </Card>

          {ghrfix && (
            <Card title="Verification Mix">
              {p.loading ? (
                <Empty>Loading…</Empty>
              ) : p.byVerification.length === 0 ? (
                <Empty>No verification values returned.</Empty>
              ) : (
                <div className="ps-donut-row">
                  <Donut data={p.byVerification} center={p.total.toLocaleString()} centerLabel="Records" />
                  <Legend data={p.byVerification} />
                </div>
              )}
            </Card>
          )}

          <Card title={ghrfix ? "Field Coverage Bands" : "Strength Bands"}>
            {p.loading ? (
              <Empty>Loading…</Empty>
            ) : p.byStrength.length === 0 ? (
              <Empty>No scores to band.</Empty>
            ) : (
              <Legend data={p.byStrength} />
            )}
          </Card>

          <Card title="Weakest Right Now">
            {p.loading ? (
              <Empty>Loading…</Empty>
            ) : p.weakest.length === 0 ? (
              <Empty>
                {p.error || p.usersError || p.providersError
                  ? "A directory could not be read, so no ranking can be produced."
                  : ghrfix
                    ? "No record is below full field coverage."
                    : "No profile is below full completion."}
              </Empty>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {p.weakest.slice(0, 5).map((r) => (
                  <div key={`${r.kind}-${r.userId}`} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 11.5 }}>
                    <span style={{ flex: 1, color: "#4c5470", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.fullName}
                      {p.hasKinds && (
                        <i style={{ color: "#8891a8", fontStyle: "normal" }}> · {r.kind === "provider" ? "Provider" : "User"}</i>
                      )}
                    </span>
                    <Pill tone={r.strengthBand === "Critical" ? "red" : r.strengthBand === "Weak" ? "amber" : "blue"}>
                      {r.strengthPct === null ? "—" : `${r.strengthPct}%`} · {r.strengthBand}
                    </Pill>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </ProfileShell>
  );
}

function ContextRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="ps-chat-context-row">
      <span>{label}</span>
      <b className="ps-num">{value}</b>
    </div>
  );
}

/* Every selector below is `ps-chat-*` prefixed — a bare selector in a page
   `<style>` block would apply to the whole application. */
const CHAT_CSS = `
.ps-chat-card{display:flex;flex-direction:column;min-height:560px}
.ps-chat-scroll{flex:1;overflow-y:auto;max-height:520px;padding:18px 19px;display:flex;flex-direction:column;gap:14px}
.ps-chat-intro{text-align:center;margin:auto;max-width:340px}
.ps-chat-intro h4{margin:6px 0 6px;font-size:14px;font-weight:750;color:#11162d}
.ps-chat-intro p{margin:0;font-size:12px;line-height:20px;color:#69738c}
.ps-chat-turn{display:flex;gap:10px;align-items:flex-start}
.ps-chat-turn-user{flex-direction:row-reverse}
.ps-chat-avatar{width:30px;height:30px;border-radius:9px;flex:0 0 auto;display:grid;place-items:center;background:#f2edff;color:#7c3aed;font-size:10px;font-weight:750}
.ps-chat-turn-user .ps-chat-avatar{background:linear-gradient(145deg,#7c3aed,#4c1d95);color:#fff}
.ps-chat-bubble{max-width:min(560px,80%);border:1px solid #eef0f5;background:#fff;border-radius:12px;padding:10px 13px}
.ps-chat-turn-user .ps-chat-bubble{background:#f7f4ff;border-color:#e7dfff}
.ps-chat-who{display:block;font-size:10px;font-weight:700;color:#8891a8;margin-bottom:4px}
.ps-chat-bubble p{margin:0;font-size:12.5px;line-height:21px;color:#2c3350;white-space:pre-wrap}
.ps-chat-dots{display:inline-flex;gap:5px;padding:4px 0}
.ps-chat-dots i{width:6px;height:6px;border-radius:50%;background:#b6bcd0;animation:ps-chat-blink 1.2s infinite}
.ps-chat-dots i:nth-child(2){animation-delay:.2s}
.ps-chat-dots i:nth-child(3){animation-delay:.4s}
@keyframes ps-chat-blink{0%,80%,100%{opacity:.3}40%{opacity:1}}
.ps-chat-error{display:flex;align-items:center;gap:8px;margin:0 19px 10px;padding:9px 12px;border-radius:9px;border:1px solid #f6d5d8;background:#fff5f5;color:#a32732;font-size:11.5px}
.ps-chat-chips{display:flex;flex-wrap:wrap;gap:7px;padding:0 19px 12px}
.ps-chat-chip{display:inline-flex;align-items:center;gap:6px;padding:7px 11px;border-radius:8px;border:1px solid #e7dfff;background:#faf8ff;color:#5b3fb0;font-size:11.5px;font-weight:600;text-align:left}
.ps-chat-chip:hover{background:#f2edff}
.ps-chat-composer{display:flex;gap:9px;padding:13px 19px;border-top:1px solid #eef0f5}
.ps-chat-composer input{flex:1;height:40px;padding:0 13px;border-radius:9px;border:1px solid #dfe2ea;background:#fff;font-size:12.5px;outline:0}
.ps-chat-composer input:disabled{background:#f6f7fb}
.ps-chat-send{width:40px;height:40px;flex:0 0 auto;border:0;border-radius:9px;background:linear-gradient(90deg,#7440df,#8b5cf6);color:#fff;display:grid;place-items:center;box-shadow:0 5px 12px rgba(116,64,223,.2)}
.ps-chat-send:disabled{opacity:.45;box-shadow:none}
.ps-chat-context{display:flex;flex-direction:column;gap:10px}
.ps-chat-context-row{display:flex;justify-content:space-between;gap:12px;font-size:11.5px;color:#4c5470}
.ps-chat-context-row b{font-weight:730;color:#11162d}
@media (prefers-reduced-motion:reduce){.ps-chat-dots i{animation:none}}
`;
