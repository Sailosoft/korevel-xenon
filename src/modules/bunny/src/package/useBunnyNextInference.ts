"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { BunnyPackage } from "./BunnyPackage";
import { useBunnyPackageManager } from "./BunnyPackageManager";

/**
 * Snapshot the current `window.location.pathname` in a way that is safe for
 * React 18 concurrent features and server-side rendering.
 */
function getPathname(): string {
  return typeof window !== "undefined" ? window.location.pathname : "";
}

/**
 * Subscribe to `popstate` **and** `pushState` / `replaceState` overrides so
 * that the returned pathname stays in sync with client-side navigation
 * (Next.js App Router page transitions).
 */
function subscribeToPathname(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  // Wrap history.pushState / replaceState so we can spy on Next.js navigations
  const origPushState = window.history.pushState.bind(window.history);
  const origReplaceState = window.history.replaceState.bind(window.history);

  const onPushState = (...args: unknown[]) => {
    origPushState(...(args as Parameters<typeof window.history.pushState>));
    cb();
  };
  const onReplaceState = (...args: unknown[]) => {
    origReplaceState(
      ...(args as Parameters<typeof window.history.replaceState>),
    );
    cb();
  };

  window.history.pushState = onPushState as typeof window.history.pushState;
  window.history.replaceState =
    onReplaceState as typeof window.history.replaceState;

  window.addEventListener("popstate", cb);

  return () => {
    window.history.pushState = origPushState;
    window.history.replaceState = origReplaceState;
    window.removeEventListener("popstate", cb);
  };
}

/**
 * Reactive hook that infers which `BunnyPackage` matches the **current URL**
 * by scanning the package registry.
 *
 * It uses `useSyncExternalStore` under the hood, which means:
 * - It works with React 18 concurrent rendering.
 * - It returns a consistent snapshot during SSR (empty string pathname).
 * - It re-renders only when the matched package *actually changes* (thanks to
 *   shallow comparison of the returned object reference).
 *
 * @example
 * ```tsx
 * function ActivePage() {
 *   const activePkg = useBunnyNextInference();
 *   if (!activePkg) return <NotFound />;
 *   return <activePkg.Component config={activePkg.config} />;
 * }
 * ```
 */
export function useBunnyNextInference(): BunnyPackage | undefined {
  const { findByUrl } = useBunnyPackageManager();

  // `getSnapshot` is called by React whenever the component renders.
  // We re-run the lookup each time to keep things reactive.
  const pathname = useSyncExternalStore(subscribeToPathname, getPathname);

  const [matched, setMatched] = useState<BunnyPackage | undefined>(() =>
    pathname ? findByUrl(pathname) : undefined,
  );

  useEffect(() => {
    setMatched(findByUrl(pathname));
  }, [pathname, findByUrl]);

  return matched;
}
