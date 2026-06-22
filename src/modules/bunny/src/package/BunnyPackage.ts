import { ComponentType, ReactNode } from "react";
import { BunnyConfig } from "../Bunny.Interface";
import { BunnyDefaultComponent } from "./BunnyDefaultComponent";

/**
 * A single registered package within the Bunny ecosystem.
 *
 * Each `BunnyPackage` pairs a `BunnyConfig` (with its `module_url` for URL-based
 * resolution) with an optional React component.  When no component is provided,
 * [`BunnyDefaultComponent`](BunnyDefaultComponent.tsx:16) is used — rendering
 * `<Bunny config={config}><BunnyForm /></Bunny>`.
 *
 * @example
 * ```ts
 * // With default component (Bunny + BunnyForm)
 * const booksPackage = new BunnyPackage(BooksConfig);
 *
 * // With custom component
 * const customPackage = new BunnyPackage(
 *   CustomConfig,
 *   ({ config, children }) => <Bunny config={config}>{children}</Bunny>,
 * );
 * ```
 */
export class BunnyPackage<TRow = unknown, TForm = unknown> {
  /** The resolved Bunny configuration, including `module_url` for routing */
  public readonly config: BunnyConfig<TRow, TForm>;

  /**
   * React component rendered when this package is activated.
   *
   * Defaults to [`BunnyDefaultComponent`](BunnyDefaultComponent.tsx:16) which
   * provides `<Bunny config={config}><BunnyForm /></Bunny>` — giving every
   * feature module a working CRUD UI with zero extra configuration.
   */
  public readonly Component: ComponentType<{
    config: BunnyConfig<TRow, TForm>;
    children?: ReactNode;
  }>;

  constructor(
    config: BunnyConfig<TRow, TForm>,
    Component?: ComponentType<{
      config: BunnyConfig<TRow, TForm>;
      children?: ReactNode;
    }>,
  ) {
    this.config = config;
    this.Component = Component ?? BunnyDefaultComponent;
  }

  /**
   * Returns `true` if this package's `module_url` matches the given pathname.
   *
   * Matching rules:
   * - Exact match: `/books` === `/books`
   * - Prefix wildcard: `/books/*` matches any path beginning with `/books/`
   * - Regex pattern (starts with `/^`): `/^\/books\//` is evaluated as a RegExp
   */
  public matches(pathname: string): boolean {
    const pattern = this.config.module_url;
    if (!pattern) return false;

    // Regex pattern — starts with /^ and ends with $/
    if (pattern.startsWith("/^")) {
      try {
        return new RegExp(pattern).test(pathname);
      } catch {
        return false;
      }
    }

    // Prefix wildcard — ends with /*
    if (pattern.endsWith("/*")) {
      const prefix = pattern.slice(0, -2);
      return pathname === prefix || pathname.startsWith(prefix + "/");
    }

    // Exact match (default)
    return pathname === pattern;
  }
}
