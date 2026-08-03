// proxy.ts — Next.js 16 request proxy (formerly Middleware)
//
// Guards the Bunny AI Studio API namespace (`/api/bunny-studio/*`) so it can
// only be accessed by our own frontend:
//
//   1. Same-origin check — browsers always send an `Origin` header on cross-site
//      and same-site POST/fetch requests; we reject any request whose Origin
//      does not match the app's own origin (CSRF / cross-site protection).
//   2. Frontend token check — the browser client attaches
//      `x-bunny-studio-token` to every Bunny Studio API call. Requests that
//      are missing the header or carry the wrong token are rejected with 403.
//
// When `NEXT_PUBLIC_BUNNY_STUDIO_API_TOKEN` is not configured (e.g. local dev),
// the token check is skipped but the same-origin check still applies.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const BS_API_TOKEN_HEADER = "x-bunny-studio-token";
const BS_API_TOKEN_ENV = "NEXT_PUBLIC_BUNNY_STUDIO_API_TOKEN";

function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // non-browser callers omit Origin; token check still applies
  const requestUrl = new URL(request.url);
  const target = new URL(origin);
  return (
    target.protocol === requestUrl.protocol && target.host === requestUrl.host
  );
}

export function proxy(request: NextRequest) {
  // Cross-site / cross-origin requests are always rejected for the Bunny
  // Studio API (browsers send an Origin header on cross-site POSTs).
  if (!isSameOrigin(request)) {
    return NextResponse.json(
      { error: "Forbidden: cross-origin access to the Bunny Studio API is not allowed." },
      { status: 403 },
    );
  }

  // Frontend-only token guard. Only the browser client sends this header.
  const expected = process.env[BS_API_TOKEN_ENV];
  if (expected) {
    const supplied = request.headers.get(BS_API_TOKEN_HEADER);
    if (!supplied || supplied !== expected) {
      return NextResponse.json(
        { error: "Forbidden: missing or invalid frontend token." },
        { status: 403 },
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/bunny-studio/:path*"],
};
