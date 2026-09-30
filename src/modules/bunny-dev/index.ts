// index.ts — Bunny Developer module barrel.
//
// Re-exports the public surface: domain types, persistence layer, shared
// component kit, shell, project core, and AI settings. Route pages import
// directly from deep paths for tree-shaking; this barrel is the convenience
// entry point for consumers.

export * from "./BDDomain.Types";
export { BDDatabase, bdDB } from "./BDDatabase";
export { configureBDMigrations } from "./BDMigration";
export { BDRepository } from "./BDRepository";
export type { BDCreateInput } from "./BDRepository";

export * from "./components";
export * from "./modules/shell";
export * from "./modules/core";
export * from "./modules/ai-settings";

// Feature sub-module page components + their barrels. Named re-exports are
// used (instead of `export *`) because several sub-modules export the same
// helper names (e.g. `slugify`), which would collide in a single barrel.
export { BDSchemaBuilderComponent } from "./modules/schema-builder";
export { BDDiagramBuilderComponent } from "./modules/diagram-builder";
export { BDAppBuilderComponent } from "./modules/app-builder";
export { BDApiDesignComponent } from "./modules/api-design";
export { BDOutlineBuilderComponent } from "./modules/outline";
export { BDArchitectureBuilderComponent } from "./modules/architecture";
export {
  BDFileManagerComponent,
  BDFileEditorPageComponent,
} from "./modules/file-management";
export { BDProjectManagementComponent } from "./modules/project-management";
export { BDAgentManagerComponent } from "./modules/agent-manager";

export { downloadText, downloadBlob, copyText, openTextTab } from "./BDDownload";
