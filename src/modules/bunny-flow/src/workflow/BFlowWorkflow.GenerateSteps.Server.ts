/**
 * BFlowWorkflow.GenerateSteps.Server — Server action for AI-powered step generation.
 *
 * Takes a set of job names along with the current workflow context (name,
 * description, existing jobs, agents, variables) and uses Helix AI to generate
 * step definitions that fit each job's purpose.
 *
 * Mirrors `BFlowWorkflow.GenerateJobs.Server` but produces `steps` instead of
 * full jobs. The generated steps are merged back into the existing jobs (append
 * or override) so the caller receives a ready-to-serialize jobs array.
 *
 * Usage (client-side):
 * ```ts
 * const { jobs, missingVariables } = await bflowWorkflowGenerateSteps({
 *   workflowName: "Content Pipeline",
 *   existingYaml: "...",
 *   jobNames: ["draft-article", "review-article"],
 *   userDescription: "Make the research steps more thorough",
 * });
 * ```
 */
"use server";

import Handlebars from "handlebars";
import HelixAIService from "@/src/modules/helix/src/HelixAIService";
import HelixAISchemaService from "@/src/modules/helix/src/HelixAISchemaService";
import { HELIX_AI_PROVIDERS, type HelixAIConfig } from "@/src/modules/helix";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { BFlowStepSchema } from "./BFlowWorkflow.Types";
import type {
  BFlowStep,
  BFlowWorkflowJob,
  BFlowVariable,
} from "./BFlowWorkflow.Types";
import { v7 as uuidv7 } from "uuid";

// ─── Types ─────────────────────────────────────────────────────────

/** How generated steps are merged with a job's existing steps. */
export type BFlowStepGenerationStrategy = "append" | "override";

export interface BFlowWorkflowGenerateStepsParams {
  /** Workflow name for context */
  workflowName: string;
  /** Optional workflow description for context */
  workflowDescription?: string;
  /** The full existing YAML content (for context about agents, variables, etc.) */
  existingYaml: string;
  /** Names of the jobs to generate steps for */
  jobNames: string[];
  /** Optional user direction to steer the generated steps */
  userDescription?: string;
  /** Whether generated steps append to or replace existing steps (default: append) */
  strategy?: BFlowStepGenerationStrategy;
}

export interface BFlowWorkflowGenerateStepsResult {
  /** The full jobs array with the generated steps merged in */
  jobs: BFlowWorkflowJob[];
  /** The generated steps keyed by job name */
  stepsByJob: Record<string, BFlowStep[]>;
  /** Variables detected from generated step prompts that are missing from the workflow */
  missingVariables: BFlowVariable[];
  /** The variables section as a YAML string (ready to merge into the workflow's `variables` key) */
  variablesYaml: string;
  /** A human-readable summary of what was generated */
  summary: string;
}

// ─── Prompt Templates ──────────────────────────────────────────────

const systemPrompt = `You are a workflow architect specializing in designing STEP definitions for BFlowWorkflow YAML pipelines.

Your task is to generate new STEP definitions for the specific JOBS provided in the context.

Return a YAML mapping where each key is an existing job name and the value is the array of steps for that job:
\`\`\`
job-name-a:
  - name: string (no spaces, kebab-case)
    prompts: string or array of strings
    agent?: string (reference to an existing agent name from the context)
    inputs?: array of { name, source }
    outputType?: plain | markdown | json | html | csv | json_array | yaml | tailwind
job-name-b:
  - name: ...
\`\`\`

RULES:
1. Return ONLY the YAML mapping — no \`jobs:\` wrapper, no markdown fences, no explanations
2. The top-level keys MUST exactly match the requested job names from the context
3. Each job MUST get at least 2 steps
4. Each step MUST have a unique kebab-case \`name\` within its job
5. Each step MUST have at least one prompt string
6. Reference existing agent names from the context when possible (use \`agent: "agent-name"\`)
7. Give each step a specific, actionable prompt that reflects the job's purpose — do NOT produce generic filler
8. INPUT SOURCE VALIDATION: Step inputs with \`source\` may ONLY reference steps that already exist before this generation — either from existing workflow jobs (provided in context) or from steps defined earlier within the same job. Do NOT reference steps from other jobs unless that job is listed in the job's \`needs\`.
9. OUTPUT CONVENTION: Do NOT define \`output\` arrays on steps. Instead, downstream steps reference a step's raw output via \`{source-job}.{source-step}.outputs.__raw__\` in their input \`source\` field.
10. VARIABLE FALLBACK PREFERRED: If you need data from a job step that is NOT in the current job's \`needs\`, generate a workflow variable and reference it as \`vars.{variable_name}\` in the input \`source\`. This is the PREFERRED approach.
11. Use Handlebars-style {{variable_name}} for template interpolation in prompts — when a step has an explicit \`inputs\` array, use the input \`name\` (e.g. \`{{requirements}}\`) instead of the full source path.
12. Return ONLY a valid YAML mapping — no markdown fences, no explanations

EXAMPLE:
draft-article:
  - name: outline
    prompts:
      - "Draft a section outline for {{topic}}"
  - name: write-draft
    prompts:
      - "Write the article draft based on {{outline}}"
    inputs:
      - name: outline
        source: draft-article.outline.outputs.__raw__
review-article:
  - name: fact-check
    prompts:
      - "Verify every factual claim in {{draft}}"
    agent: agent-researcher
  - name: copy-edit
    prompts:
      - "Copy-edit the draft for clarity and tone"`;

/**
 * Handlebars user prompt template — rendered with context about the workflow,
 * the selected jobs, and the user's direction for the steps.
 */
const userPromptTemplate = `Generate step definitions for the following jobs in an existing workflow.

Workflow Name: {{workflowName}}
{{#if workflowDescription}}
Workflow Description: {{workflowDescription}}
{{/if}}

Workflow Context (existing jobs, agents, variables):
{{existingYamlPreview}}

Jobs to generate steps for:
{{jobNames}}

{{#if userDescription}}
User Direction:
{{userDescription}}
{{/if}}

Generate a YAML mapping of job name → steps array for the jobs listed above.
Each job must have at least 2 steps, each step a unique kebab-case name and at least one prompt.
Reference existing agents where appropriate.

IMPORTANT CONVENTIONS:
- Do NOT define \`output\` arrays on steps — use \`{job}.{step}.outputs.__raw__\` in input \`source\` instead.
- Input \`source\` must reference either \`vars.{variable_name}\` or \`{job-name}.{step-name}.outputs.__raw__\` where the job is listed in the job's \`needs\`.
- In prompt templates, ALWAYS use the input \`name\` (e.g. \`{{requirements}}\`) rather than the full source path.

Return ONLY the YAML mapping (keys are job names), no markdown fences or extra text.`;

// ─── Server Action ─────────────────────────────────────────────────

/**
 * Generates step definitions using Helix AI for the selected jobs based on the
 * workflow context and an optional user direction.
 *
 * @param params - The generation parameters
 * @returns The updated jobs, generated steps, detected variables and a summary
 *
 * @throws If the AI service fails or returns invalid data
 */
export async function bflowWorkflowGenerateSteps(
  params: BFlowWorkflowGenerateStepsParams,
): Promise<BFlowWorkflowGenerateStepsResult> {
  const {
    workflowName,
    workflowDescription,
    existingYaml,
    jobNames,
    userDescription,
    strategy = "append",
  } = params;

  const requestedJobNames = [
    ...new Set((jobNames ?? []).map((n) => String(n).trim()).filter(Boolean)),
  ];

  if (requestedJobNames.length === 0) {
    throw new Error("Please select at least one job to generate steps for.");
  }

  // ── 1. Create Helix AI service with default config ───────────────
  const helixConfig: HelixAIConfig = {
    activeProvider: "default",
    providers: HELIX_AI_PROVIDERS,
  };

  const ai = new HelixAIService({
    config: { ai: helixConfig },
    aiSchema: new HelixAISchemaService(),
  });

  // ── 2. Build prompts ────────────────────────────────────────────
  const existingYamlPreview = generateYamlPreview(existingYaml);

  const template = Handlebars.compile(userPromptTemplate);
  const userPrompt = template({
    workflowName,
    workflowDescription: workflowDescription || "",
    existingYamlPreview,
    jobNames: requestedJobNames.map((n) => `  - ${n}`).join("\n"),
    userDescription: (userDescription ?? "").trim(),
  });

  // ── 3. Parse existing YAML for context ──────────────────────────
  let existingYamlParsed: Record<string, unknown> | null = null;
  try {
    existingYamlParsed = parseYaml(existingYaml) as Record<string, unknown>;
  } catch {
    // Silently ignore — we just won't have existing context to merge against.
  }

  const existingJobs: BFlowWorkflowJob[] = Array.isArray(
    existingYamlParsed?.jobs,
  )
    ? (existingYamlParsed?.jobs as BFlowWorkflowJob[])
    : [];

  const existingJobNames = new Set(existingJobs.map((j) => j.name));
  const unknownJobNames = requestedJobNames.filter(
    (n) => !existingJobNames.has(n),
  );
  if (unknownJobNames.length === requestedJobNames.length) {
    throw new Error(
      "None of the selected jobs exist in the workflow. Please select valid jobs.",
    );
  }

  const existingVarNames = new Set<string>(
    (existingYamlParsed?.variables as Array<Record<string, unknown>>)
      ?.map((v) => String(v.name ?? ""))
      .filter(Boolean) ?? [],
  );

  // ── 4. Call AI ──────────────────────────────────────────────────
  try {
    const yamlOutput = await ai.doChat({
      system: systemPrompt,
      user: userPrompt,
      temperature: 0.3,
    });

    // ── 5. Clean the response ─────────────────────────────────────
    let cleanYaml = yamlOutput.trim();

    if (cleanYaml.startsWith("```")) {
      cleanYaml = cleanYaml.replace(/^```(?:yaml)?\n?/i, "");
      cleanYaml = cleanYaml.replace(/\n?```$/g, "");
      cleanYaml = cleanYaml.trim();
    }

    // ── 6. Parse the AI response ──────────────────────────────────
    let parsedOutput: unknown;
    try {
      parsedOutput = parseYaml(cleanYaml);
    } catch {
      throw new Error(
        "AI returned invalid YAML. Please try again with a more specific direction.",
      );
    }

    const rawStepsByJob = extractStepsByJob(parsedOutput);
    if (Object.keys(rawStepsByJob).length === 0) {
      throw new Error(
        "AI returned no steps. Please try again with a more specific direction.",
      );
    }

    // ── DEBUG: Log raw AI output for diagnostics ────────────────────
    console.log(
      "[BFlowWorkflow.GenerateSteps.Server] Raw AI output:",
      JSON.stringify(rawStepsByJob, null, 2).slice(0, 3000),
    );

    // ── 7. Normalize and validate each job's steps ─────────────────
    const knownJobNameByKey = new Map<string, string>();
    for (const name of existingJobNames) {
      knownJobNameByKey.set(normalizeKey(name), name);
    }

    const stepsByJob: Record<string, BFlowStep[]> = {};
    const usedStepNamesByJob = new Map<string, Set<string>>();

    for (const [rawJobName, rawSteps] of Object.entries(rawStepsByJob)) {
      const resolvedJobName =
        knownJobNameByKey.get(normalizeKey(rawJobName)) ?? null;
      if (!resolvedJobName) continue;

      const usedNames =
        usedStepNamesByJob.get(resolvedJobName) ?? new Set<string>();
      usedStepNamesByJob.set(resolvedJobName, usedNames);

      const validSteps: BFlowStep[] = [];
      for (const rawStep of rawSteps) {
        const step =
          rawStep && typeof rawStep === "object"
            ? ({ ...(rawStep as Record<string, unknown>) } as Record<
                string,
                unknown
              >)
            : null;
        if (!step) continue;

        // Normalise step name: spaces → kebab-case
        if (typeof step.name === "string") {
          step.name = slugify(step.name);
        }
        if (!step.name || (typeof step.name === "string" && !step.name)) {
          step.name = `step-${uuidv7().slice(0, 8)}`;
        }
        const stepName = String(step.name);
        if (usedNames.has(stepName)) continue;
        usedNames.add(stepName);

        // Ensure an id
        if (!step.id) step.id = uuidv7();

        // Normalise prompts: string | string[]
        const rawPrompts = step.prompts;
        if (!rawPrompts) {
          step.prompts = [`Execute step: ${stepName}`];
        } else if (typeof rawPrompts === "string") {
          step.prompts = [rawPrompts];
        } else if (Array.isArray(rawPrompts)) {
          const filtered = rawPrompts.filter(
            (p): p is string => typeof p === "string" && p.length > 0,
          );
          step.prompts =
            filtered.length > 0 ? filtered : [`Execute step: ${stepName}`];
        } else {
          step.prompts = [`Execute step: ${stepName}`];
        }

        // Do not allow explicit `output` declarations (Rule 9)
        delete step.output;

        // Normalise inputs: ensure name/source are strings
        if (Array.isArray(step.inputs)) {
          step.inputs = (step.inputs as Record<string, unknown>[])
            .filter(
              (input) =>
                input &&
                typeof input === "object" &&
                typeof input.name === "string" &&
                typeof input.source === "string",
            )
            .map((input) => ({
              name: input.name,
              source: input.source,
            }));
          if ((step.inputs as unknown[]).length === 0) delete step.inputs;
        } else {
          delete step.inputs;
        }

        const result = BFlowStepSchema.safeParse(step);
        if (result.success) {
          validSteps.push(result.data);
        } else {
          console.warn(
            "[BFlowWorkflow.GenerateSteps.Server] Step failed schema validation after normalisation:",
            result.error.issues,
            JSON.stringify(step, null, 2).slice(0, 1000),
          );
        }
      }

      if (validSteps.length > 0) {
        stepsByJob[resolvedJobName] = validSteps;
      }
    }

    const generatedJobNames = Object.keys(stepsByJob);
    if (generatedJobNames.length === 0) {
      throw new Error(
        "AI returned steps that don't match the required schema. Please try again.",
      );
    }

    // ── 8. Merge generated steps into the jobs ────────────────────
    const mergedJobs: BFlowWorkflowJob[] = existingJobs.map((job) => {
      const newSteps = stepsByJob[job.name];
      if (!newSteps || newSteps.length === 0) return job;
      const existingSteps = job.steps ?? [];
      const merged =
        strategy === "override"
          ? newSteps
          : [...existingSteps, ...newSteps];
      return { ...job, steps: merged };
    });

    // ── 9. Detect missing variables from prompts ──────────────────
    const rootVariables = new Map<string, BFlowVariable>();
    for (const jobName of generatedJobNames) {
      const steps = stepsByJob[jobName];
      for (const varName of extractVariablesFromSteps(steps)) {
        if (!existingVarNames.has(varName) && !rootVariables.has(varName)) {
          rootVariables.set(varName, {
            name: varName,
            value: "",
            type: "text",
            description: `Auto-detected variable "${varName}" used by job "${jobName}"`,
          });
        }
      }
    }

    const missingVariables: BFlowVariable[] = [...rootVariables.values()];
    const variablesYaml =
      missingVariables.length > 0
        ? stringifyYaml(missingVariables, { indent: 2, lineWidth: -1 })
        : "";

    // ── 10. Build summary ─────────────────────────────────────────
    let summary = `Generated ${generatedJobNames.reduce(
      (total, name) => total + stepsByJob[name].length,
      0,
    )} step${
      generatedJobNames.reduce(
        (total, name) => total + stepsByJob[name].length,
        0,
      ) !== 1
        ? "s"
        : ""
    } across ${generatedJobNames.length} job${
      generatedJobNames.length !== 1 ? "s" : ""
    }:\n${generatedJobNames
      .map((name) => {
        const stepNames = stepsByJob[name].map((s) => s.name).join(", ");
        return `  • ${name} — ${stepsByJob[name].length} step${
          stepsByJob[name].length !== 1 ? "s" : ""
        }: ${stepNames}`;
      })
      .join("\n")}`;

    if (missingVariables.length > 0) {
      summary += `\n\nDetected variables:\n${missingVariables
        .map((v) => `  • ${v.name}${v.value ? ` = "${v.value}"` : " (empty)"}`)
        .join("\n")}`;
    }

    return {
      jobs: mergedJobs,
      stepsByJob,
      missingVariables,
      variablesYaml,
      summary,
    };
  } catch (error) {
    console.error(
      "[BFlowWorkflow.GenerateSteps.Server] Step generation failed:",
      error,
    );
    throw new Error(
      `Failed to generate steps: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

// ─── Helpers ───────────────────────────────────────────────────────

/**
 * Generate a concise YAML preview for the AI context window.
 * Includes the workflow header, agents, variables, and existing job
 * names/steps (without full step prompt bodies to save tokens).
 */
function generateYamlPreview(fullYaml: string): string {
  try {
    const parsed = parseYaml(fullYaml);
    if (!parsed || typeof parsed !== "object") return fullYaml.slice(0, 2000);

    const preview: Record<string, unknown> = {};

    if (parsed.name) preview.name = parsed.name;
    if (parsed.description) preview.description = parsed.description;

    if (Array.isArray(parsed.agents)) preview.agents = parsed.agents;
    if (Array.isArray(parsed.variables)) preview.variables = parsed.variables;
    if (Array.isArray(parsed.agentPools)) preview.agentPools = parsed.agentPools;

    if (Array.isArray(parsed.jobs)) {
      preview.existingJobs = parsed.jobs.map(
        (job: Record<string, unknown>) => ({
          name: job.name,
          agent: job.agent,
          needs: job.needs,
          prompt: job.prompt,
          steps: Array.isArray(job.steps)
            ? job.steps.map((step: Record<string, unknown>) => ({
                name: step.name,
                agent: step.agent,
                inputs: step.inputs,
              }))
            : [],
        }),
      );
    }

    return stringifyYaml(preview, { indent: 2, lineWidth: -1 });
  } catch {
    return fullYaml.slice(0, 2000);
  }
}

/** Slugify a step name into a non-space kebab-case identifier. */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

/** Normalise a job-name key for tolerant matching (kebab-case, lowercase). */
function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}

/**
 * Coerce the AI response into a `jobName → raw steps[]` mapping.
 *
 * Accepts:
 * - a YAML mapping of `job-name: [steps]`
 * - a YAML mapping of `job-name: { steps: [...] }`
 * - a YAML array of `{ job | name, steps }` entries
 */
function extractStepsByJob(
  parsed: unknown,
): Record<string, Record<string, unknown>[]> {
  const result: Record<string, Record<string, unknown>[]> = {};

  const pushSteps = (jobName: unknown, steps: unknown) => {
    if (typeof jobName !== "string" || !jobName.trim()) return;
    if (!Array.isArray(steps)) return;
    const existing = result[jobName] ?? [];
    result[jobName] = [
      ...existing,
      ...(steps.filter(
        (s) => s && typeof s === "object",
      ) as Record<string, unknown>[]),
    ];
  };

  if (Array.isArray(parsed)) {
    for (const entry of parsed) {
      if (!entry || typeof entry !== "object") continue;
      const record = entry as Record<string, unknown>;
      const jobName =
        typeof record.job === "string"
          ? record.job
          : typeof record.name === "string"
            ? record.name
            : undefined;
      pushSteps(jobName, record.steps);
    }
    return result;
  }

  if (parsed && typeof parsed === "object") {
    for (const [jobName, value] of Object.entries(
      parsed as Record<string, unknown>,
    )) {
      if (Array.isArray(value)) {
        pushSteps(jobName, value);
      } else if (value && typeof value === "object") {
        const record = value as Record<string, unknown>;
        if (Array.isArray(record.steps)) pushSteps(jobName, record.steps);
      }
    }
  }

  return result;
}

/**
 * Extract Handlebars-style {{variable}} references from a set of steps
 * (prompts and `vars.{name}` input sources).
 *
 * Step input names are excluded, since those resolve via the inputs pipeline
 * at runtime rather than from workflow variables.
 */
function extractVariablesFromSteps(steps: BFlowStep[]): string[] {
  const variableSet = new Set<string>();
  const inputNameSet = new Set<string>();

  for (const step of steps) {
    if (Array.isArray(step.inputs)) {
      for (const input of step.inputs) {
        if (input.name) inputNameSet.add(input.name.toLowerCase());
      }
    }
  }

  const varRegex = /\{\{([a-zA-Z_]\w*)\}\}/g;
  const varsInputRegex = /^vars\.([a-zA-Z_]\w*)$/;

  const scanPrompt = (prompt: string) => {
    let match: RegExpExecArray | null;
    while ((match = varRegex.exec(prompt)) !== null) {
      variableSet.add(match[1].toLowerCase());
    }
  };

  for (const step of steps) {
    const prompts = step.prompts;
    if (typeof prompts === "string") {
      scanPrompt(prompts);
    } else if (Array.isArray(prompts)) {
      for (const prompt of prompts) {
        if (typeof prompt === "string") scanPrompt(prompt);
      }
    }

    if (Array.isArray(step.inputs)) {
      for (const input of step.inputs) {
        if (typeof input.source === "string") {
          const varsMatch = input.source.match(varsInputRegex);
          if (varsMatch) variableSet.add(varsMatch[1].toLowerCase());
        }
      }
    }
  }

  const excluded = new Set([
    "",
    "var",
    "each",
    "if",
    "else",
    "unless",
    "with",
    "this",
    "log",
    "lookup",
  ]);

  return [...variableSet]
    .filter((name) => !excluded.has(name))
    .filter((name) => !inputNameSet.has(name))
    .sort();
}
