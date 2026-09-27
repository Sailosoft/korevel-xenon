// BDShared.Types.ts
//
// Domain primitives shared across every BunnyDev sub-module. Feature-specific
// types live with their owning module (`BD<Feature>.Domain.ts`); anything with
// no single owner lives here and is re-exported by `BDDomain.Types.ts`.

/** Base shape shared by every persisted entity. */
export interface BDEntity {
  id: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Shared design-token palette (App Builder origin, reused by peer modules). */
export type BDAppColor =
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "gray";

/** Shared document format (Architecture origin, reused by Outline). */
export type BDArchitectureFormat = "markdown" | "mdx" | "asciidoc";
