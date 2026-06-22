import { BunnyPackage } from "./BunnyPackage";
import { BunnyConfig } from "../Bunny.Interface";

/**
 * **BunnyPackageRegistry** — a named registry that holds a collection of
 * `BunnyPackage` instances, keyed by `BunnyConfig` reference identity.
 *
 * Unlike a singleton, you can create **multiple registries** for different
 * sections of your application (e.g. `adminRegistry`, `publicRegistry`).
 *
 * @example
 * ```ts
 * // ── Create a named registry ─────────────────────────────────
 * const adminRegistry = new BunnyPackageRegistry();
 * adminRegistry.register(booksPackage, authorsPackage);
 *
 * // ── Pass it to the provider ─────────────────────────────────
 * <BunnyNextPackage registry={adminRegistry}>
 *   {children}
 * </BunnyNextPackage>
 * ```
 *
 * @example
 * ```ts
 * // ── Central barrel ──────────────────────────────────────────
 * // src/modules/bunny/src/package/packages.ts
 * import { BunnyPackageRegistry } from "./BunnyPackageRegistry";
 * import { booksPackage } from "@/src/modules/books/books.package";
 * import { authorsPackage } from "@/src/modules/authors/authors.package";
 *
 * export const adminRegistry = new BunnyPackageRegistry();
 * adminRegistry.register(booksPackage, authorsPackage);
 * ```
 */
export class BunnyPackageRegistry {
  /** Internal map keyed by `BunnyConfig` reference identity (dedup). */
  private readonly _packages = new Map<BunnyConfig, BunnyPackage>();

  /**
   * Register one or more packages.
   * Idempotent — same `BunnyConfig` reference will not be duplicated.
   */
  register(...pkgs: BunnyPackage[]): void {
    for (const pkg of pkgs) {
      if (!this._packages.has(pkg.config)) {
        this._packages.set(pkg.config, pkg);
      }
    }
  }

  /** Retrieve all registered packages. */
  getAll(): readonly BunnyPackage[] {
    return Array.from(this._packages.values());
  }

  /** Find the first package whose `module_url` matches `pathname`. */
  findByUrl(pathname: string): BunnyPackage | undefined {
    for (const pkg of this._packages.values()) {
      if (pkg.matches(pathname)) return pkg;
    }
    return undefined;
  }

  /** Remove all packages (useful for HMR / testing). */
  clear(): void {
    this._packages.clear();
  }

  /** Number of registered packages. */
  get size(): number {
    return this._packages.size;
  }
}
