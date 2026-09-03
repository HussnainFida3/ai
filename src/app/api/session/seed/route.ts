import { NextResponse } from "next/server";
import { seedShadilifeStart, seedShadilifeVerify } from "@/lib/server/platform-sessions";

/**
 * The one-time ShadiLife authorisation, used only when it has never been
 * seeded or has been dormant past its 7-day refresh window.
 *
 * ShadiLife enforces email 2FA on admin sign-in. That is a real security
 * control on the operator's own platform, so this console completes the
 * genuine challenge once rather than weakening it — after this, the stored
 * refresh token is rotated automatically on every console login and no one
 * signs in again.
 *
 * The password is used to trigger the 2FA email and is never stored.
 * Reachable only with a valid console session (see src/proxy.ts).
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const step = body?.step;

  if (step === "start") {
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const result = await seedShadilifeStart(email, password);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 401 });
    return NextResponse.json({ ok: true, sent: true });
  }

  if (step === "verify") {
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const code = typeof body?.code === "string" ? body.code.trim() : "";
    if (!email || !code) {
      return NextResponse.json({ error: "Email and code are required." }, { status: 400 });
    }

    const result = await seedShadilifeVerify(email, code);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown step." }, { status: 400 });
}
