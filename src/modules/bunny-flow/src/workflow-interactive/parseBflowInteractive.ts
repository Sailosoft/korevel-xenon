/**
 * parseBflowInteractive — Parse YAML string into BFlowInteractiveWorkflowData.
 */

import { parse as parseYaml } from "yaml";
import type {
  BFlowInteractiveWorkflowData,
  BFlowInteractiveVariable,
  BFlowInteractiveAgent,
} from "./BFlowWorkflowInteractive.Types";

export function parseBflowInteractive(
  yaml: string,
): BFlowInteractiveWorkflowData {
  try {
    let parsed: Record<string, unknown> = {};
    try {
      const result = parseYaml(yaml);
      if (result && typeof result === "object") {
        parsed = result as Record<string, unknown>;
      }
    } catch {
      // Invalid YAML — use empty object
    }

    const variables = parsed?.variables;
    const agents = parsed?.agents;
    const jobs = parsed?.jobs;
    const reports = parsed?.reports;

    return {
      name: (parsed?.name as string) ?? "",
      description: (parsed?.description as string) ?? "",
      semanticVersion: (parsed?.semanticVersion as string) ?? "",
      variables: Array.isArray(variables)
        ? variables.map((v: Record<string, unknown>) => ({
            id: v.id as string | undefined,
            name: (v.name as string) ?? "",
            value: (v.value as string) ?? "",
            type: (v.type as BFlowInteractiveVariable["type"]) ?? "text",
            description: v.description as string | undefined,
          }))
        : [],
      agents: Array.isArray(agents)
        ? agents.map((a: Record<string, unknown>) => ({
            id: a.id as string | undefined,
            name: (a.name as string) ?? "",
            role: a.role as string | undefined,
            prompt: (a.prompt as string) ?? "",
          }))
        : [],
      jobs: Array.isArray(jobs)
        ? jobs.map((j: Record<string, unknown>) => ({
            id: j.id as string | undefined,
            name: (j.name as string) ?? "",
            agent: (j.agent as string) ?? "",
            needs: Array.isArray(j.needs)
              ? (j.needs as string[]).join(", ")
              : ((j.needs as string) ?? ""),
            prompt: (j.prompt as string) ?? "",
            steps: Array.isArray(j.steps)
              ? (j.steps as Record<string, unknown>[]).map(
                  (s: Record<string, unknown>) => ({
                    id: s.id as string | undefined,
                    name: (s.name as string) ?? "",
                    prompts: Array.isArray(s.prompts)
                      ? (s.prompts as string[]).join("\n")
                      : ((s.prompts as string) ?? ""),
                    agent: (s.agent as string) ?? "",
                    outputType: (s.outputType as string) ?? "markdown",
                    skipIf: Array.isArray(s.skipIf)
                      ? (s.skipIf as Record<string, unknown>[]).map(
                          (sk: Record<string, unknown>) => ({
                            inputs: (sk.inputs as string) ?? "",
                            condition: (sk.condition as string) ?? "==",
                            value: String(sk.value ?? ""),
                          }),
                        )
                      : [],
                    inputs: Array.isArray(s.inputs)
                      ? (s.inputs as Record<string, unknown>[]).map(
                          (i: Record<string, unknown>) => {
                            const source = (i.source as string) ?? "";
                            // Infer inputMode from the source format.
                            // Only "vars" and "steps" are selectable modes now.
                            let inputMode: "vars" | "steps" | undefined;
                            if (source.startsWith("vars.")) {
                              inputMode = "vars";
                            } else if (
                              /^[^.]+\.([^.]+)\.outputs\.[^.]+$/.test(source)
                            ) {
                              inputMode = "steps";
                            }
                            return {
                              name: (i.name as string) ?? "",
                              source,
                              inputMode,
                            };
                          },
                        )
                      : [],
                    output: Array.isArray(s.output)
                      ? (s.output as Record<string, unknown>[]).map(
                          (o: Record<string, unknown>) => ({
                            name: (o.name as string) ?? "",
                            type: (o.type as string) ?? "markdown",
                          }),
                        )
                      : [],
                  }),
                )
              : [],
          }))
        : [],
      reports: Array.isArray(reports)
        ? reports.map((r: Record<string, unknown>) => ({
            name: (r.name as string) ?? "",
            label: (r.label as string) ?? "",
            source: (r.source as string) ?? "job.step.outputs.__raw__",
          }))
        : [],
    };
  } catch {
    return {
      name: "",
      description: "",
      semanticVersion: "",
      variables: [],
      agents: [],
      jobs: [],
      reports: [],
    };
  }
}
