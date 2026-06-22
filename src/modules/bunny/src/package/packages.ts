/**
 * **Central package barrel** — single source of truth for all feature modules.
 *
 * # How it works
 *
 * 1. Create a `BunnyPackageRegistry` instance and register every feature
 *    module's `BunnyPackage` on it.
 * 2. Pass that registry to `<BunnyNextPackage registry={myRegistry} />`.
 * 3. When you add a new feature → add one import + one `.register()` call.
 *
 * You can have **multiple registries** for different sections of your app
 * (e.g. `adminRegistry`, `publicRegistry`).
 *
 * @example
 * ```ts
 * // src/modules/bunny/src/package/packages.ts
 * import { BunnyPackageRegistry } from "./BunnyPackageRegistry";
 *
 * // Feature module packages
 * import { booksPackage } from "@/src/modules/books/books.package";
 * import { authorsPackage } from "@/src/modules/authors/authors.package";
 *
 * // ── Admin panel registry ────────────────────────────────────
 * export const adminRegistry = new BunnyPackageRegistry();
 * adminRegistry.register(booksPackage, authorsPackage);
 * // When adding a new feature → add one line above ↑
 *
 * // ── Public pages registry ───────────────────────────────────
 * export const publicRegistry = new BunnyPackageRegistry();
 * // publicRegistry.register(homePackage, aboutPackage);
 * ```
 *
 * ```tsx
 * // src/app/admin/layout.tsx
 * import { BunnyNextPackage } from "@/src/modules/bunny/src/package";
 * import { adminRegistry } from "@/src/modules/bunny/src/package/packages";
 *
 * <BunnyNextPackage registry={adminRegistry} fallback={<div>…</div>}>
 *   {children}
 * </BunnyNextPackage>
 * ```
 */

export { BunnyPackageRegistry } from "./BunnyPackageRegistry";
export { BunnyPackage } from "./BunnyPackage";
