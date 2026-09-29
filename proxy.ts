import { NextRequest, NextResponse } from "next/server";
import { defaultLocale, isLocale } from "./lib/i18n";

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline'",
  "connect-src 'self' https: wss:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "frame-src 'self' https:",
].join("; ");

const SECURITY_HEADERS: ReadonlyArray<readonly [string,string]> = [
  ["Content-Security-Policy", CONTENT_SECURITY_POLICY],
  ["Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload"],
  ["X-Frame-Options", "DENY"],
  ["X-Content-Type-Options", "nosniff"],
  ["Referrer-Policy", "strict-origin-when-cross-origin"],
  ["Permissions-Policy", "camera=(self), microphone=(self), geolocation=(self), usb=(), serial=(), payment=()"],
  ["Cross-Origin-Opener-Policy", "same-origin"],
  ["X-Permitted-Cross-Domain-Policies", "none"],
];

function withSecurityHeaders(response: NextResponse) {
  for (const [name,value] of SECURITY_HEADERS) response.headers.set(name,value);
  return response;
}

function requestScheme(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
  if (forwarded === "http" || forwarded === "https") return forwarded;

  const visitor = request.headers.get("cf-visitor");
  if (visitor) {
    try {
      const scheme = String((JSON.parse(visitor) as { scheme?: unknown }).scheme || "").toLowerCase();
      if (scheme === "http" || scheme === "https") return scheme;
    } catch {
      // Ignore malformed edge metadata and use the request URL below.
    }
  }

  return request.nextUrl.protocol.replace(":","").toLowerCase();
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (requestScheme(request) === "http") {
    const target = request.nextUrl.clone();
    target.protocol = "https:";
    return withSecurityHeaders(NextResponse.redirect(target,308));
  }

  if (
    pathname.startsWith("/.well-known") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/portal") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    return withSecurityHeaders(NextResponse.next());
  }

  const firstSegment = pathname.split("/")[1];

  if (isLocale(firstSegment)) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-core-locale", firstSegment);

    return withSecurityHeaders(NextResponse.next({
      request: { headers: requestHeaders },
    }));
  }

  const target = request.nextUrl.clone();
  target.pathname = `/${defaultLocale}${pathname === "/" ? "" : pathname}`;
  return withSecurityHeaders(NextResponse.redirect(target,308));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
