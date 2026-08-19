// index.ts
//
// Generative AI Options module — the extensible training-mode registry that
// shapes AI generation across Case Base, Agent Persona, Simulator, Trainer and
// Gauntlet.

export type {
  BCGenAIOptionId,
  BCGenAIOption,
  BCGenAIOptions,
  BCGenAIBubbleLabels,
} from "./bc.generative-ai.entity";
export {
  BC_GEN_AI_DEFAULT_OPTION_ID,
  BC_GEN_AI_OPTIONS,
  bcResolveGenAIOption,
  bcGenAIOptionList,
  bcGenAIBubbleLabels,
} from "./bc.generative-ai.entity";
export {
  bcGenAISystemDirectives,
  bcGenAIUserDirectives,
} from "./bc.generative-ai.prompt";
export {
  BCGenAIOptionSelector,
} from "./bc.generative-ai.selector";
export type {
  BCGenAIOptionSelectorProps,
} from "./bc.generative-ai.selector";
export {
  BCGenerateAIFormDialog,
} from "./bc.generative-ai.dialog";
export type {
  BCGenAIDialogField,
  BCGenerateAIFormDialogProps,
} from "./bc.generative-ai.dialog";
