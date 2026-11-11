// BDFile.Patch.ts — file-assistant aliases for the shared text patch engine.
// The implementation lives in `modules/core/BDTextPatch.ts` so Specs and Files
// share the same anchored-region semantics.

export {
  BD_MAX_PATTERN_WORDS,
  patternWordCount,
  applyTextPatches as applyFilePatches,
  validateTextPatchPatterns as validatePatchPatterns,
  BDTextPatchError as BDFilePatchError,
} from "../core/BDTextPatch";
export type { BDTextPatch as BDFilePatch } from "../core/BDTextPatch";
