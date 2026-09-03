import {
  getGhrfixSession,
  setGhrfixSession,
  getShadilifeSession,
  setShadilifeSession,
} from "@/app/api/_sessions/store";

/**
 * Server-side session manager for the two platforms this console drives.
 *
 * The console holds the operator's real admin sessions here so that passing
 * the console's own login is the ONLY sign-in anyone performs — there is no
 * separate "Connect GhrFix" / "Connect ShadiLife" step, and a session that
 * quietly expires repairs itself instead of stranding the UI on a dead badge.
 *
 * Both platforms end up in the same place — an access + refresh token pair
 * handed to the browser and sent as `Authorization: Bearer` — but they get
 * there differently:
 *
 *   GhrFix    Plain POST /auth/login returns both tokens in the JSON body,
 *             and its AI-agent routes only require an ADMIN-role bearer
 *             token (authenticate + requireRole("ADMIN")). No 2FA is
 *             involved, so this console can log in from scratch, unattended,
 *             forever.
 *
 *   ShadiLife Admin sign-in deliberately enforces email 2FA, so no amount of
 *             stored credentials can mint a first session unattended — that
 *             is a real security control on the operator's own platform and
 *             this console does not try to defeat it. Instead the operator
 *             seeds a session once (see seedShadilife* below) and it is then
 *             kept alive indefinitely by rotating the refresh token, which
 *             this console does on every console login. ShadiLife issues its
 *             tokens only as httpOnly Set-Cookie headers, so they are read
 *             off the response here; its `authenticate` middleware accepts an
 *             `Authorization: Bearer` fallback, which is what makes handing
 *             the same token to the browser work at all.
 */

const GHRFIX_API = process.env.NEXT_PUBLIC_GHRFIX_API ?? "http://localhost:5050/api";
const SHADILIFE_API = process.env.NEXT_PUBLIC_SHADILIFE_API ?? "http://localhost:4000/api";

/** Shape handed to the browser; identical for both platforms by design. */
export interface BrowserTokens {
  accessToken: string;
  refreshToken: string;
}

const TIMEOUT_MS = 15_000;

/** Never let a hung platform hang the console's own login. */
async function post(url: string, init: RequestInit = {}): Promise<Response | null> {
  try {
    return await fetch(url, { ...init, method: "POST", signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ GhrFix */

/**
 * A full sign-in with the console's configured GhrFix admin credentials.
 * Requires the account to actually be ADMIN — a non-admin token would sail
 * through login and then 403 on every single agent route, which is a far
 * more confusing failure than refusing it here.
 */
async function ghrfixLogin(): Promise<BrowserTokens | null> {
  const email = process.env.GHRFIX_ADMIN_EMAIL;
  const password = process.env.GHRFIX_ADMIN_PASSWORD;
  if (!email || !password) return null;

  const res = await post(`${GHRFIX_API}/auth/login`, {
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, device: "ai-command-center" }),
  });
  if (!res?.ok) return null;

  const json = await res.json().catch(() => null);
  const accessToken = json?.data?.accessToken;
  const refreshToken = json?.data?.refreshToken;
  if (typeof accessToken !== "string" || typeof refreshToken !== "string") return null;
  if (json?.data?.user?.role !== "ADMIN") return null;

  setGhrfixSession({ accessToken, refreshToken });
  return { accessToken, refreshToken };
}

/** Exchange the stored (rotating, 30-day) refresh token for a fresh pair. */
async function ghrfixRefresh(): Promise<BrowserTokens | null> {
  const stored = getGhrfixSession();
  if (!stored?.refreshToken) return null;

  const res = await post(`${GHRFIX_API}/auth/refresh`, {
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: stored.refreshToken, device: "ai-command-center" }),
  });
  if (!res?.ok) return null;

  const json = await res.json().catch(() => null);
  const accessToken = json?.data?.accessToken;
  const refreshToken = json?.data?.refreshToken ?? stored.refreshToken;
  if (typeof accessToken !== "string") return null;

  setGhrfixSession({ accessToken, refreshToken });
  return { accessToken, refreshToken };
}

/**
 * Always able to produce a working GhrFix session: rotate the stored refresh
 * token if there is one, and fall back to a clean credential login whenever
 * that token is missing, already rotated away, or expired.
 */
export async function ensureGhrfix(): Promise<BrowserTokens | null> {
  return (await ghrfixRefresh()) ?? (await ghrfixLogin());
}

/* --------------------------------------------------------------- ShadiLife */

/** Pull one cookie's value out of a response's Set-Cookie headers. */
function readSetCookie(res: Response, name: string): string | undefined {
  for (const raw of res.headers.getSetCookie()) {
    const pair = raw.split(";")[0] ?? "";
    const eq = pair.indexOf("=");
    if (eq > 0 && pair.slice(0, eq).trim() === name) {
      const value = pair.slice(eq + 1).trim();
      // A cleared cookie comes back as an empty value — treat it as absent
      // rather than storing "" and looking connected while sending nothing.
      return value === "" ? undefined : value;
    }
  }
  return undefined;
}

const SHADILIFE_ACCESS_COOKIE = "admin_at";
const SHADILIFE_REFRESH_COOKIE = "admin_rt";

function storeShadilifeFrom(res: Response, fallbackRefresh?: string): BrowserTokens | null {
  const accessToken = readSetCookie(res, SHADILIFE_ACCESS_COOKIE);
  const refreshToken = readSetCookie(res, SHADILIFE_REFRESH_COOKIE) ?? fallbackRefresh;
  if (!accessToken || !refreshToken) return null;

  setShadilifeSession({ accessCookie: accessToken, refreshCookie: refreshToken });
  return { accessToken, refreshToken };
}

/**
 * Rotate the stored ShadiLife refresh token. Its /auth/admin/refresh reads
 * the token from a cookie rather than the body, so it is replayed here as a
 * Cookie header. Refresh tokens last 7 days and rotate on every use, so a
 * console that is opened even weekly keeps this session alive indefinitely.
 */
async function shadilifeRefresh(): Promise<BrowserTokens | null> {
  const stored = getShadilifeSession();
  if (!stored?.refreshCookie) return null;

  const res = await post(`${SHADILIFE_API}/auth/admin/refresh`, {
    headers: { Cookie: `${SHADILIFE_REFRESH_COOKIE}=${stored.refreshCookie}` },
  });
  if (!res?.ok) return null;

  return storeShadilifeFrom(res, stored.refreshCookie);
}

/**
 * Automatic where it can be. Returns null only when ShadiLife has never been
 * seeded, or the seeded session has been dead long enough that its refresh
 * token expired — the one case that genuinely needs a human, because of 2FA.
 */
export async function ensureShadilife(): Promise<BrowserTokens | null> {
  return shadilifeRefresh();
}

/** Step 1 of the one-time seed: triggers ShadiLife's 2FA email. */
export async function seedShadilifeStart(
  email: string,
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  const res = await post(`${SHADILIFE_API}/auth/admin/login`, {
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res) return { ok: false, error: "ShadiLife is unreachable." };
  if (!res.ok) {
    const json = await res.json().catch(() => null);
    return { ok: false, error: json?.message ?? json?.error ?? "Incorrect email or password." };
  }
  return { ok: true };
}

/** Step 2 of the one-time seed: exchanges the emailed code for a real session. */
export async function seedShadilifeVerify(
  email: string,
  code: string,
): Promise<{ ok: boolean; error?: string }> {
  const res = await post(`${SHADILIFE_API}/auth/admin/verify-2fa`, {
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code }),
  });
  if (!res) return { ok: false, error: "ShadiLife is unreachable." };
  if (!res.ok) {
    const json = await res.json().catch(() => null);
    return { ok: false, error: json?.message ?? json?.error ?? "Invalid or expired code." };
  }

  const tokens = storeShadilifeFrom(res);
  if (!tokens) return { ok: false, error: "ShadiLife accepted the code but returned no session cookies." };
  return { ok: true };
}

/* ------------------------------------------------------------------ shared */

export type PlatformSessions = {
  ghrfix: BrowserTokens | null;
  shadilife: BrowserTokens | null;
};

/** Both platforms, refreshed/logged-in in parallel. Used on console login. */
export async function ensureAllSessions(): Promise<PlatformSessions> {
  const [ghrfix, shadilife] = await Promise.all([ensureGhrfix(), ensureShadilife()]);
  return { ghrfix, shadilife };
}
