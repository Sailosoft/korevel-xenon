/**
 * BFlowWorkflowInteractive.Types — Interfaces and types for the interactive workflow builder.
 *
 * All exported interfaces are prefixed with BFlow.
 *
 * Variable types follow the canonical pattern defined in `BFlowVariableBaseSchema`
 * (shared/BFlowVariableBase.ts), which is the source of truth for variable
 * record shapes across Bunny Flow.
 */

"use client";

import type { BFlowVariableType } from "../shared/BFlowVariableBase";
import { VARIABLE_TYPE_OPTIONS } from "../shared/BFlowVariableBase";

// ─── Types ────────────────────────────────────────────────────────────

export interface BFlowInteractiveWorkflowData {
  name: string;
  description: string;
  semanticVersion: string;
  variables: BFlowInteractiveVariable[];
  agents: BFlowInteractiveAgent[];
  jobs: BFlowInteractiveJob[];
  reports: BFlowInteractiveReport[];
  /** Slugs of agent pools that were used to fill the agents section */
  agentPoolSlugs: string[];
}

export interface BFlowInteractiveVariable {
  id?: string;
  name: string;
  value: string;
  type: BFlowVariableType;
  description?: string;
}

export interface BFlowInteractiveAgent {
  id?: string;
  name: string;
  role?: string;
  prompt: string;
}

export interface BFlowInteractiveStep {
  id?: string;
  name: string;
  prompts: string;
  agent?: string;
  outputType?: string;
  skipIf: BFlowInteractiveSkipCondition[];
  inputs: BFlowInteractiveStepInput[];
  output: BFlowInteractiveStepOutput[];
}

export interface BFlowInteractiveSkipCondition {
  inputs: string;
  condition: string;
  value: string;
}

export interface BFlowInteractiveStepInput {
  name: string;
  source: string;
  /**
   * UI mode for selecting the source value:
   * - "vars": pick from workflow variables → source becomes "vars.{name}"
   * - "steps": cascading select job → step → output → source becomes "{job}.{step}.outputs.{name}"
   */
  inputMode?: "vars" | "steps";
}

export interface BFlowInteractiveStepOutput {
  name: string;
  type: string;
}

export interface BFlowInteractiveJob {
  id?: string;
  name: string;
  agent?: string;
  needs: string;
  prompt: string;
  steps: BFlowInteractiveStep[];
}

export interface BFlowInteractiveReport {
  name: string;
  label: string;
  source: string;
}

// ─── Props ────────────────────────────────────────────────────────────

export interface BFlowWorkflowInteractiveProps {
  /** Initial YAML content (parsed) */
  initialYaml: string;
  /** Called when the data changes and needs to be serialized back */
  onDataChange: (data: BFlowInteractiveWorkflowData, yaml: string) => void;
  /**
   * Available agent pools from IndexedDB.
   * When provided, the Agents section shows a "Fill from Pool" action
   * that expands pool template data into workflow agent entries.
   */
  agentPools?: BFlowInteractiveAgentPool[];
}

/**
 * Lightweight representation of an agent pool for the interactive builder.
 * Carries just enough data to populate the `agents:` section of the YAML.
 *
 * When `agents` (actual pool agent records) are provided, filling from pool
 * will use those directly instead of generating synthetic agents from the
 * `template` fallback.
 */
export interface BFlowInteractiveAgentPool {
  /** Pool slug — used as the identifier in agentPools: [] */
  slug: string;
  /** Human-readable name */
  name: string;
  /** Number of agents to generate from this pool (template fallback) */
  agentCount: number;
  /** Template that describes each generated agent (fallback when agents[] is empty) */
  template: {
    systemPrompt?: string;
    provider?: string;
    model?: string;
  };
  /**
   * Actual pool agent records loaded from IndexedDB.
   * When non-empty, these are used directly instead of generating
   * synthetic agents from `template` + `agentCount`.
   */
  agents?: BFlowInteractiveAgent[];
}

// ─── Defaults ─────────────────────────────────────────────────────────

export const BFLOW_DEFAULT_STEP: BFlowInteractiveStep = {
  name: "",
  prompts: "",
  agent: "",
  outputType: "markdown",
  skipIf: [],
  inputs: [],
  output: [],
};

export const BFLOW_DEFAULT_JOB: BFlowInteractiveJob = {
  name: "",
  agent: "",
  needs: "",
  prompt: "",
  steps: [],
};

export const BFLOW_DEFAULT_AGENT: BFlowInteractiveAgent = {
  name: "",
  role: "",
  prompt: "",
};

export const BFLOW_DEFAULT_VARIABLE: BFlowInteractiveVariable = {
  name: "",
  value: "",
  type: "text",
};

export const BFLOW_DEFAULT_REPORT: BFlowInteractiveReport = {
  name: "",
  label: "",
  source: "job.step.outputs.__raw__",
};

// ─── Option Constants ─────────────────────────────────────────────────

export const OUTPUT_TYPE_OPTIONS = [
  { label: "Markdown", value: "markdown" },
  { label: "Plain", value: "plain" },
  { label: "HTML", value: "html" },
  { label: "JSON", value: "json" },
  { label: "CSV", value: "csv" },
  { label: "JSON Array", value: "json_array" },
  { label: "YAML", value: "yaml" },
  { label: "Tailwind", value: "tailwind" },
];

/**
 * NOTE: `VARIABLE_TYPE_OPTIONS` is now defined in the shared base schema
 * (`shared/BFlowVariableBase.ts`) as the single source of truth.
 * Re-exported from there to keep backward compatibility.
 */
export { VARIABLE_TYPE_OPTIONS } from "../shared/BFlowVariableBase";

export const CONDITION_OPTIONS = [
  { label: "==", value: "==" },
  { label: "!=", value: "!=" },
  { label: ">", value: ">" },
  { label: "<", value: "<" },
  { label: ">=", value: ">=" },
  { label: "<=", value: "<=" },
];

export const INPUT_MODE_OPTIONS = [
  { label: "Variable (vars)", value: "vars" },
  { label: "Step Output", value: "steps" },
] as const;
