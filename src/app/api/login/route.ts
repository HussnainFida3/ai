import { NextResponse } from "next/server";
import { getGhrfixSession } from "../_sessions/store";

export const COOKIE_NAME = "cc_auth";

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const attempts = new Map<string, { count: number; resetAt: number }>();

function isLocked(ip: string) {
  const entry = attempts.get(ip);
  if (!entry) return false;
  if (Date.now() > entry.resetAt) {
    attempts.delete(ip);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

function recordFailure(ip: string) {
  const entry = attempts.get(ip);
  if (!entry || Date.now() > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: Date.now() + WINDOW_MS });
  } else {
    entry.count += 1;
  }
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  if (isLocked(ip)) {
    return NextResponse.json({ error: "Too many attempts. Try again in a few minutes." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  const expectedEmail = (process.env.COMMAND_CENTER_EMAIL ?? "").trim().toLowerCase();
  const expectedPassword = process.env.COMMAND_CENTER_PASSWORD;

  if (!expectedEmail || !expectedPassword) {
    return NextResponse.json({ error: "Login is not configured on the server." }, { status: 500 });
  }

  if (!email || !password || email !== expectedEmail || password !== expectedPassword) {
    recordFailure(ip);
    return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
  }

  attempts.delete(ip);
  // `secure` must reflect the connection actually used, not NODE_ENV — this
  // console is reachable over plain http on its own port (no domain/TLS yet),
  // and a Secure-flagged cookie set over http is silently never sent back by
  // any real browser, which would make login appear to succeed and then loop.
  const isHttps = req.headers.get("x-forwarded-proto") === "https" || new URL(req.url).protocol === "https:";

  // GhrFix uses portable bearer tokens, so a real admin session obtained once
  // (see scripts/seed-shadilife-session) can be handed straight to the browser
  // on console login — no separate manual "Connect" step needed for GhrFix.
  const ghrfix = getGhrfixSession();

  const res = NextResponse.json({
    ok: true,
    ghrfix: ghrfix ? { accessToken: ghrfix.accessToken, refreshToken: ghrfix.refreshToken } : null,
  });
  res.cookies.set(COOKIE_NAME, expectedPassword, {
    httpOnly: true,
    secure: isHttps,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
