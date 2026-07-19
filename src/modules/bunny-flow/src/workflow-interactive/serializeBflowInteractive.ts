/**
 * serializeBflowInteractive — Serialize BFlowInteractiveWorkflowData to YAML string.
 */

import { stringify as stringifyYaml } from "yaml";
import type {
  BFlowInteractiveWorkflowData,
  BFlowInteractiveJob,
  BFlowInteractiveStep,
  BFlowInteractiveSkipCondition,
  BFlowInteractiveStepInput,
  BFlowInteractiveStepOutput,
  BFlowInteractiveReport,
} from "./BFlowWorkflowInteractive.Types";

export function serializeBflowInteractive(
  data: BFlowInteractiveWorkflowData,
): string {
  // Build the workflow object structure for YAML serialization
  const workflow: Record<string, unknown> = {};

  if (data.name) workflow.name = data.name;
  if (data.description) workflow.description = data.description;

  if (data.variables.length > 0) {
    workflow.variables = data.variables.map((v) => {
      const entry: Record<string, unknown> = { name: v.name, value: v.value };
      if (v.type !== "text") entry.type = v.type;
      if (v.description) entry.description = v.description;
      return entry;
    });
  }

  if (data.agentPoolSlugs.length > 0) {
    workflow.agentPools = data.agentPoolSlugs;
  }

  if (data.agents.length > 0) {
    workflow.agents = data.agents.map((a) => {
      const entry: Record<string, unknown> = { name: a.name, prompt: a.prompt };
      if (a.role) entry.role = a.role;
      return entry;
    });
  }

  workflow.jobs = data.jobs.map((j) => {
    const job: Record<string, unknown> = {
      id: j.id || `job-${j.name.toLowerCase().replace(/\s+/g, "-")}`,
      name: j.name,
      prompt: j.prompt,
      steps: j.steps.map((s) => {
        const step: Record<string, unknown> = {
          id: s.id || `step-${s.name.toLowerCase().replace(/\s+/g, "-")}`,
          name: s.name,
          prompts: s.prompts,
        };
        if (s.agent) step.agent = s.agent;
        if (s.outputType && s.outputType !== "markdown") {
          step.outputType = s.outputType;
        }
        if (s.skipIf.length > 0) {
          step.skipIf = s.skipIf.map((sk) => ({
            inputs: sk.inputs,
            condition: sk.condition,
            value: isNaN(Number(sk.value)) ? sk.value : Number(sk.value),
          }));
        }
        if (s.inputs.length > 0) {
          step.inputs = s.inputs.map((i) => ({
            name: i.name,
            source: i.source,
          }));
        }
        if (s.output.length > 0) {
          step.output = s.output.map((o) => ({
            name: o.name,
            type: o.type,
          }));
        }
        return step;
      }),
    };
    if (j.agent) job.agent = j.agent;
    if (j.needs) {
      job.needs = j.needs.includes(",")
        ? j.needs.split(",").map((n) => n.trim())
        : j.needs.trim();
    }
    return job;
  });

  // Reports go AFTER jobs in the YAML output
  if (data.reports.length > 0) {
    workflow.reports = data.reports.map((r) => ({
      name: r.name,
      label: r.label,
      source: r.source,
    }));
  }

  try {
    return stringifyYaml(workflow, {
      indent: 2,
      lineWidth: 120,
      nullStr: "null",
      defaultStringType: "PLAIN",
    });
  } catch {
    return "# Error serializing workflow";
  }
}
