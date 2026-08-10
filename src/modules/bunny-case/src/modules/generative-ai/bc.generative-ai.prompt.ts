// bc.generative-ai.prompt.ts
//
// Helpers that inject the selected Generative AI option into a generation
// prompt. The helpers return an empty string for the default `issue-handling`
// mode so existing prompts are unchanged; any other mode appends its
// directives. Callers place the system block before the JSON-only suffix and
// the user block at the end of the user prompt.

import type { BCGenAIOptions } from "./bc.generative-ai.entity";
import { bcResolveGenAIOption } from "./bc.generative-ai.entity";

/** Render the system-prompt directives for the selected option. */
export function bcGenAISystemDirectives(options?: BCGenAIOptions): string {
  const option = bcResolveGenAIOption(options);
  const directives = option.systemDirectives.trim();
  if (!directives) return "";
  return `\n\n${directives}`;
}

/** Render the user-prompt directives for the selected option. */
export function bcGenAIUserDirectives(options?: BCGenAIOptions): string {
  const option = bcResolveGenAIOption(options);
  const directives = option.userDirectives.trim();
  if (!directives) return "";
  return `\n\n${directives}`;
}
