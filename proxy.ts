import { NextRequest, NextResponse } from "next/server";
import { defaultLocale, isLocale } from "./lib/i18n";

function originalProtocol(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
  if (forwarded === "http" || forwarded === "https") return forwarded;

  const cfVisitor = request.headers.get("cf-visitor");
  if (cfVisitor) {
    try {
      const value = JSON.parse(cfVisitor) as { scheme?: string };
      if (value.scheme === "http" || value.scheme === "https") return value.scheme;
    } catch {
      // Ignore malformed edge metadata and fall back to the request URL.
    }
  }

  return request.nextUrl.protocol.replace(":", "").toLowerCase();
}

export function proxy(request: NextRequest) {
  if (process.env.NODE_ENV === "production" && originalProtocol(request) === "http") {
    const target = request.nextUrl.clone();
    target.protocol = "https:";
    return NextResponse.redirect(target, 308);
  }

  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/.well-known") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/portal") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const firstSegment = pathname.split("/")[1];

  if (isLocale(firstSegment)) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-core-locale", firstSegment);

    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  const target = request.nextUrl.clone();
  target.pathname = `/${defaultLocale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(target);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
