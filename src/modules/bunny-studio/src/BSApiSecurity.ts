// BSApiSecurity — shared client/server constants for Bunny AI Studio API access control.
//
// The Bunny AI Studio streaming API (`/api/bunny-studio/*`) is intended to be
// called only by our own frontend. To enforce that, the browser client attaches
// a custom header on every API request, and both the Next.js `proxy.ts` layer
// and the route handler validate it.
//
// The token is exposed as a NEXT_PUBLIC_* env var so it can be read on both the
// client (to attach the header) and the server (to validate it). This guards
// against casual / scripted direct calls, while the proxy's same-origin check
// additionally blocks cross-site requests.

/** Custom header that carries the frontend access token on Bunny Studio API calls. */
export const BS_API_TOKEN_HEADER = "x-bunny-studio-token";

/** Env var that holds the shared frontend API token. */
export const BS_API_TOKEN_ENV = "NEXT_PUBLIC_BUNNY_STUDIO_API_TOKEN";

/**
 * Resolve the frontend API token. Used by the client to attach the header.
 * Returns `undefined` when no token is configured (allows local/dev usage).
 */
export function getBSApiToken(): string | undefined {
  return process.env[BS_API_TOKEN_ENV]?.trim() || undefined;
}
