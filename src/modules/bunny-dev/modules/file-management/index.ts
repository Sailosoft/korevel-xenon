// modules/file-management/index.ts

export * from "./BDFile.Types";
export {
  BDFolderRepository,
  BDFileRepository,
  bdFolderRepository,
  bdFileRepository,
} from "./BDFile.Repository";
export { useBDFolders, useBDFiles } from "./BDFile.Hooks";
export { BDFileManagerComponent } from "./BDFile.Manager.Component";
export { BDFileEditorComponent } from "./BDFileEditor.Component";
export { BDFileEditorPageComponent } from "./BDFileEditorPage.Component";
export { BDFileAIComponent } from "./BDFileAI.Component";
export {
  applyFilePatches,
  validatePatchPatterns,
  patternWordCount,
  BDFilePatchError,
  BD_MAX_PATTERN_WORDS,
  type BDFilePatch,
} from "./BDFile.Patch";
