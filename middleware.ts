import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Must be kept in sync with AUTH_COOKIE_NAME in src/lib/auth.ts
const AUTH_COOKIE_NAME = "auth_token";

const PUBLIC_PATHS = new Set([
  "/signin",
  "/about",
]);

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/favicon")) return true;
  if (pathname.startsWith("/api/auth")) return true;
  if (pathname.startsWith("/public")) return true;
  return false;
}

function shouldProtect(pathname: string): boolean {
  if (isPublicPath(pathname)) return false;
  // Protect everything else (pages + APIs) for a single-user private app.
  return true;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!shouldProtect(pathname)) return NextResponse.next();

  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (token) return NextResponse.next();

  // APIs should return 401, pages should redirect to /signin.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/signin";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}