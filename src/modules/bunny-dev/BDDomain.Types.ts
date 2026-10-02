// BDDomain.Types.ts
//
// Canonical, serializable domain model for Bunny Developer (BunnyDev).
//
// The domain declarations now live with the sub-module that owns them
// (`modules/<feature>/BD<Feature>.Domain.ts`), and cross-cutting primitives
// live in `modules/core/BDShared.Types.ts`. This file is the stable barrel
// every consumer imports from, so internal moves stay invisible to callers.
//
// Everything here is plain data: strings, numbers, booleans, arrays, maps.
// Function-typed blueprint fields are declarative descriptors and circular
// back-references are foreign-key ids (see the module plan for the "Hybrid"
// persistence decision).

// ── Shared primitives ──────────────────────────────────────────────────────
export * from "./modules/core/BDShared.Types";

// ── Project core ───────────────────────────────────────────────────────────
export * from "./modules/core/BDProject.Domain";

// ── Board / Project Management ─────────────────────────────────────────────
export * from "./modules/project-management/BDTask.Domain";

// ── Agents + AI generation pipeline ────────────────────────────────────────
export * from "./modules/agent-manager/BDAgent.Domain";

// ── Schema Builder ─────────────────────────────────────────────────────────
export * from "./modules/schema-builder/BDSchema.Domain";

// ── App Builder ────────────────────────────────────────────────────────────
export * from "./modules/app-builder/BDApp.Domain";

// ── Diagram Builder ────────────────────────────────────────────────────────
export * from "./modules/diagram-builder/BDDiagram.Domain";

// ── Architecture Design ────────────────────────────────────────────────────
export * from "./modules/architecture/BDArchitecture.Domain";

// ── Project File Management ────────────────────────────────────────────────
export * from "./modules/file-management/BDFile.Domain";

// ── Outline ────────────────────────────────────────────────────────────────
export * from "./modules/outline/BDOutline.Domain";

// ── API Design ─────────────────────────────────────────────────────────────
export * from "./modules/api-design/BDApi.Domain";
