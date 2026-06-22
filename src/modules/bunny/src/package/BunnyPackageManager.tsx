"use client";

import React, {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useRef,
  ReactNode,
} from "react";
import { BunnyPackage } from "./BunnyPackage";
import { BunnyConfig } from "../Bunny.Interface";

// ── Context Types ──────────────────────────────────────────────────────

interface BunnyPackageManagerContextValue {
  /** Register one or more packages at runtime (idempotent — same config ref won't re-add). */
  register: (...pkg: BunnyPackage[]) => void;
  /** Find the first package whose `module_url` matches the given pathname. */
  findByUrl: (pathname: string) => BunnyPackage | undefined;
  /** Retrieve all registered packages (useful for debugging / devtools). */
  getAll: () => readonly BunnyPackage[];
  /** Check whether at least one package has been registered. */
  readonly hasPackages: boolean;
}

const BunnyPackageManagerContext =
  createContext<BunnyPackageManagerContextValue | null>(null);

// ── Provider ───────────────────────────────────────────────────────────

interface BunnyPackageManagerProviderProps {
  /** Initial packages to seed the manager with. */
  packages?: BunnyPackage[];
  children?: ReactNode;
}

/**
 * **BunnyPackageManager Provider** — a React context that holds the registry
 * of all `BunnyPackage` instances and exposes efficient lookups by URL.
 *
 * Registering the same `BunnyConfig` reference multiple times is a no-op
 * (identity-checked via `Map` keyed on config).
 *
 * @example
 * ```tsx
 * <BunnyPackageManagerProvider packages={[booksPkg, authorsPkg]}>
 *   <App />
 * </BunnyPackageManagerProvider>
 * ```
 */
export function BunnyPackageManagerProvider({
  packages: initial,
  children,
}: BunnyPackageManagerProviderProps) {
  // `Map` keyed on `BunnyConfig` reference — O(1) insert / dedup, O(n) scan on URL match.
  const registryRef = useRef<Map<BunnyConfig, BunnyPackage>>(
    new Map(initial?.map((p) => [p.config, p] as const)),
  );

  const register = useCallback((...pkgs: BunnyPackage[]) => {
    const map = registryRef.current;
    for (const pkg of pkgs) {
      if (!map.has(pkg.config)) {
        map.set(pkg.config, pkg);
      }
    }
  }, []);

  const findByUrl = useCallback(
    (pathname: string): BunnyPackage | undefined => {
      for (const pkg of registryRef.current.values()) {
        if (pkg.matches(pathname)) return pkg;
      }
      return undefined;
    },
    [],
  );

  const getAll = useCallback((): readonly BunnyPackage[] => {
    return Array.from(registryRef.current.values());
  }, []);

  const value = useMemo<BunnyPackageManagerContextValue>(
    () => ({
      register,
      findByUrl,
      getAll,
      get hasPackages() {
        return registryRef.current.size > 0;
      },
    }),
    [register, findByUrl, getAll],
  );

  return (
    <BunnyPackageManagerContext.Provider value={value}>
      {children}
    </BunnyPackageManagerContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────

/**
 * Access the nearest `BunnyPackageManager` context.
 *
 * @throws If used outside of `<BunnyPackageManagerProvider>`.
 */
export function useBunnyPackageManager(): BunnyPackageManagerContextValue {
  const ctx = useContext(BunnyPackageManagerContext);
  if (!ctx) {
    throw new Error(
      "useBunnyPackageManager must be used within a <BunnyPackageManagerProvider>",
    );
  }
  return ctx;
}

// ── Re-export the context type for external consumers ──────────────────

export type { BunnyPackageManagerContextValue };
