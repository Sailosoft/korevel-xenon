"use client";

import React, { ReactNode } from "react";
import {
  BunnyPackageManagerProvider,
  useBunnyPackageManager,
} from "./BunnyPackageManager";
import { useBunnyNextInference } from "./useBunnyNextInference";
import { BunnyPackage } from "./BunnyPackage";
import { BunnyPackageRegistry } from "./BunnyPackageRegistry";

// ── Inner renderer ─────────────────────────────────────────────────────

interface BunnyNextPackageInnerProps {
  /** Fallback UI shown while no package matches the current URL. */
  fallback?: ReactNode;
  /** Children forwarded to the active package's component. */
  children?: ReactNode;
}

/**
 * Consumes the `BunnyPackageManager` context and `useBunnyNextInference`
 * to render the matching package's component — or the `fallback` if none match.
 */
function BunnyNextPackageInner({
  fallback,
  children,
}: BunnyNextPackageInnerProps) {
  const activePkg = useBunnyNextInference();

  if (!activePkg) {
    return <>{fallback ?? null}</>;
  }

  // Component is always set (defaults to <Bunny><BunnyForm /></Bunny>)
  const Component = activePkg.Component;
  return <Component config={activePkg.config}>{children}</Component>;
}

// ── Public wrapper ─────────────────────────────────────────────────────

export interface BunnyNextPackageProps {
  /**
   * One or more `BunnyPackage` instances to register at mount time.
   * Mutually exclusive with `registry` — provide one or the other.
   */
  packages?: BunnyPackage[];
  /**
   * A `BunnyPackageRegistry` instance containing pre-registered packages.
   *
   * Useful when you have a central barrel that creates and populates a
   * named registry (e.g. `adminRegistry`, `publicRegistry`).
   *
   * Mutually exclusive with `packages` — provide one or the other.
   *
   * @see BunnyPackageRegistry
   */
  registry?: BunnyPackageRegistry;
  /** Fallback UI shown while no package matches the current URL. */
  fallback?: ReactNode;
  /** Children forwarded to the active package's component. */
  children?: ReactNode;
}

/**
 * **`<BunnyNextPackage />`** — a self-contained wrapper that:
 * 1. Registers packages into a `BunnyPackageManagerProvider` (either from a
 *    `packages` array or from a pre-built `BunnyPackageRegistry` instance).
 * 2. Uses `useBunnyNextInference` to detect the current URL and match against
 *    each package's `module_url`.
 * 3. Renders the matched package's component — or the `fallback` if none match.
 *
 * @example
 * ```tsx
 * // ── Explicit array ──────────────────────────────────────────
 * import { booksPackage } from "@/src/modules/books";
 *
 * <BunnyNextPackage packages={[booksPackage]} fallback={<div>…</div>}>
 *   {children}
 * </BunnyNextPackage>
 * ```
 *
 * @example
 * ```tsx
 * // ── Named registry (recommended for multiple registries) ────
 * import { adminRegistry } from "@/src/modules/bunny/src/package/packages";
 *
 * <BunnyNextPackage registry={adminRegistry} fallback={<div>…</div>}>
 *   {children}
 * </BunnyNextPackage>
 * ```
 */
export function BunnyNextPackage({
  packages,
  registry,
  fallback,
  children,
}: BunnyNextPackageProps) {
  // Resolve from registry if provided, otherwise fall back to the explicit array.
  const resolvedPackages = registry
    ? (registry.getAll() as BunnyPackage[])
    : packages;

  return (
    <BunnyPackageManagerProvider packages={resolvedPackages}>
      <BunnyNextPackageInner fallback={fallback}>
        {children}
      </BunnyNextPackageInner>
    </BunnyPackageManagerProvider>
  );
}
