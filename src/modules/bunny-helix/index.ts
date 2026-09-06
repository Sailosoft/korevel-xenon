/**
 * bunny-helix — AI-Assisted Record Creation Bridge.
 *
 * The only module that connects `bunny` (UI logic) and `helix` (AI config)
 * without either depending on the other. Ships a `useBunnyHelixAction` header
 * action that opens a popup modal, generates the remaining record fields via
 * Helix, and either prefills the module create form or creates the record
 * directly.
 *
 * Usage: see the module's README.md for a full wiring example.
 */

export {
  useBunnyHelixAction,
  createBunnyHelixAction,
} from "./src/BunnyHelixAction";
export { bunnyHelixGenerate } from "./src/BunnyHelixGenerate.Server";

export type {
  BunnyHelixActionConfig,
  BunnyHelixAIAdapter,
  BunnyHelixTarget,
  BunnyHelixTargetField,
  BunnyHelixFieldRef,
  BunnyHelixSelectChoice,
  BunnyHelixOnCreate,
  BunnyHelixGenerateParams,
  BunnyHelixGenerateFn,
  BunnyHelixPromptContext,
} from "./src/BunnyHelix.Interface";

export type {
  BunnyHelixSchemaResult,
  BunnyHelixValidationResult,
} from "./src/BunnyHelixSchema";
export { buildBunnyHelixSchema, validateGeneratedValues } from "./src/BunnyHelixSchema";
export { resolveBunnyHelixAI } from "./src/BunnyHelixAdapter";
export { buildSystemPrompt, buildUserPrompt } from "./src/BunnyHelixPrompt";
