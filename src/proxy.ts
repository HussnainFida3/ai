import { NextResponse, type NextRequest } from "next/server";

const COOKIE_NAME = "cc_auth";
const PUBLIC_PATHS = new Set(["/login", "/api/login"]);

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const expected = process.env.COMMAND_CENTER_PASSWORD;
  const cookie = req.cookies.get(COOKIE_NAME)?.value;

  if (expected && cookie === expected) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
