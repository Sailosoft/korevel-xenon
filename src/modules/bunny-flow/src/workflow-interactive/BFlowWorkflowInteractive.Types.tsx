/**
 * BFlowWorkflowInteractive.Types — Interfaces and types for the interactive workflow builder.
 *
 * All exported interfaces are prefixed with BFlow.
 */

"use client";

// ─── Types ────────────────────────────────────────────────────────────

export interface BFlowInteractiveWorkflowData {
  name: string;
  description: string;
  semanticVersion: string;
  variables: BFlowInteractiveVariable[];
  agents: BFlowInteractiveAgent[];
  jobs: BFlowInteractiveJob[];
  reports: BFlowInteractiveReport[];
}

export interface BFlowInteractiveVariable {
  id?: string;
  name: string;
  value: string;
  type: "text" | "number" | "boolean" | "select" | "textarea";
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
];

export const VARIABLE_TYPE_OPTIONS = [
  { label: "Text", value: "text" },
  { label: "Number", value: "number" },
  { label: "Boolean", value: "boolean" },
  { label: "Select", value: "select" },
  { label: "Textarea", value: "textarea" },
];

export const CONDITION_OPTIONS = [
  { label: "==", value: "==" },
  { label: "!=", value: "!=" },
  { label: ">", value: ">" },
  { label: "<", value: "<" },
  { label: ">=", value: ">=" },
  { label: "<=", value: "<=" },
];
