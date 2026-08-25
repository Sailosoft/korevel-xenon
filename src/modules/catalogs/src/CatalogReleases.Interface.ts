// ---------------------------------------------------------------------------
// CatalogReleases.Interface.ts
// All shared types used by CatalogReleases.tsx and CatalogReleases.Dictionary.ts
// ---------------------------------------------------------------------------

/**
 * Enum of applications available in the catalog.
 * These values map 1:1 to the `CatalogApp.name` entries in CatalogList.ts.
 */
export enum CatalogApp {
  BunnyStudio = "Bunny Studio",
  BunnyCase = "Bunny Case",
  BunnyBook = "Bunny Book",
  BunnyFlow = "Bunny Flow",
  BunnyThinker = "Bunny Thinker",
  BunnyBookBuilder = "Bunny(1st): Book Builder",
  LemonCoder = "Lemon Coder",
}

/**
 * A single release entry in the releases changelog.
 *
 * `dates` is an array (e.g. multi-day work, hotfix follow-ups). The releases
 * page renders entries sorted in descending order — newest date first.
 */
export interface CatalogRelease {
  /** Version title, e.g. "v4.3.0". */
  version: string;
  /** Short human-readable title for the release. */
  title: string;
  /** Documentation content describing what changed in this release. */
  content: string[];
  /** Affected applications (subset of the catalog application list). */
  apps: CatalogApp[];
  /** Dates associated with this release, newest-first when rendered. */
  dates: string[];
}
