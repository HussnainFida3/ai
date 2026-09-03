import { NextResponse } from "next/server";
import { ensureGhrfix, ensureShadilife } from "@/lib/server/platform-sessions";

/**
 * Re-issues a live session for one platform, on demand.
 *
 * This is what makes a dead platform session self-repairing: when a call
 * 401s and the browser's own refresh token is also spent, the client asks
 * here instead of dumping the operator on a "Reconnect" screen. The server
 * still holds the long-lived credentials/refresh token, so it can almost
 * always mint a fresh pair without anyone typing anything.
 *
 * Reachable only with a valid console session — src/proxy.ts gates every
 * path except /login and /api/login.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const platform = body?.platform;

  if (platform !== "ghrfix" && platform !== "shadilife") {
    return NextResponse.json({ error: "Unknown platform." }, { status: 400 });
  }

  const tokens = platform === "ghrfix" ? await ensureGhrfix() : await ensureShadilife();

  if (!tokens) {
    // Only ShadiLife can legitimately land here (its 2FA means a fully dead
    // session needs a one-time human re-seed); GhrFix reaching this means its
    // credentials are missing or wrong on the server.
    return NextResponse.json(
      {
        error:
          platform === "shadilife"
            ? "ShadiLife needs to be re-authorised once — its sign-in requires a 2FA code."
            : "GhrFix admin credentials are missing or rejected on the server.",
        needsSeed: platform === "shadilife",
      },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true, tokens });
}
