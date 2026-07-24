/**
 * BFlowWorkflow.GenerateJobs.Server — Server action for AI-powered job generation.
 *
 * Takes a user description along with the current workflow context (name,
 * description, existing jobs, agents, variables) and uses Helix AI to generate
 * new job definitions that fit the workflow's purpose and structure.
 *
 * Usage (client-side):
 * ```ts
 * const { yaml, jobs } = await bflowWorkflowGenerateJobs({
 *   workflowName: "Content Pipeline",
 *   workflowDescription: "A pipeline for generating blog content",
 *   existingYaml: "...",
 *   userDescription: "Add a fact-checking job and a final review job",
 * });
 * ```
 */
"use server";

import Handlebars from "handlebars";
import HelixAIService from "@/src/modules/helix/src/HelixAIService";
import HelixAISchemaService from "@/src/modules/helix/src/HelixAISchemaService";
import { HELIX_AI_PROVIDERS, type HelixAIConfig } from "@/src/modules/helix";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { BFlowWorkflowJobSchema } from "./BFlowWorkflow.Types";
import type { BFlowWorkflowJob, BFlowVariable } from "./BFlowWorkflow.Types";
import { v7 as uuidv7 } from "uuid";

// ─── Types ─────────────────────────────────────────────────────────

export interface BFlowWorkflowGenerateJobsParams {
  /** Workflow name for context */
  workflowName: string;
  /** Optional workflow description for context */
  workflowDescription?: string;
  /** The full existing YAML content (for context about agents, variables, etc.) */
  existingYaml: string;
  /** User's description of what jobs to generate */
  userDescription: string;
}

export interface BFlowWorkflowGenerateJobsResult {
  /** The generated jobs array */
  jobs: BFlowWorkflowJob[];
  /** The jobs section as a YAML string (ready to merge) */
  jobsYaml: string;
  /** Variables detected from generated job prompts that are missing from the workflow */
  missingVariables: BFlowVariable[];
  /** The variables section as a YAML string (ready to merge into the workflow's \`variables\` key) */
  variablesYaml: string;
  /** A human-readable summary of what was generated */
  summary: string;
}

// ─── Prompt Templates ──────────────────────────────────────────────

const systemPrompt = `You are a workflow architect specializing in designing job definitions for BFlowWorkflow YAML pipelines.

Your task is to generate new JOB definitions ONLY — not a full workflow.

Each job MUST conform to this exact schema:
\`\`\`
- name: string (no spaces, use kebab-case)
- agent?: string (reference to an existing agent name from the context)
- needs?: string or string[] (reference to other job names this job depends on)
- variables?: array of { name, value, type, description }
- prompt: string (instructions for what this job does — will be used as the system prompt for the agent)
- steps: array of { name, prompts (string or string[]), agent?, inputs?, output?, outputType? }
\`\`\`

RULES:
1. Generate ONLY the jobs array items — no surrounding structure, no \`jobs:\` wrapper
2. Each job MUST have a unique \`name\` (kebab-case, no spaces)
3. Each job MUST have at least 2 steps
4. Each step MUST have at least one prompt
5. Reference existing agent names from the context when possible (use agent: "agent-name")
6. Use \`needs\` to create proper pipeline DAG dependencies between jobs
7. INPUT SOURCE VALIDATION: Step inputs with \`source\` may ONLY reference steps that already exist before this generation — either from existing workflow jobs (provided in context) or from steps defined earlier within the same job. Do NOT reference steps from other newly generated jobs unless that job is listed in \`needs\`.
8. OUTPUT CONVENTION: Do NOT define \`output\` arrays on steps. Instead, downstream steps should reference a step's raw output via \`{source-job}.{source-step}.outputs.__raw__\` in their input \`source\` field. This avoids explicit output declarations.
9. VARIABLE FALLBACK PREFERRED: If you need data from a job step that is NOT in the current job's \`needs\`, generate a workflow variable first and reference it as \`vars.{variable_name}\` in the input \`source\`. This is the PREFERRED approach.
10. AUTOMATIC FALLBACK: If you mistakenly reference a non-existent job (not in existing workflow, not in \`needs\`, and not generated), the system will automatically convert the input's \`source\` to \`vars.{input_name}\` and generate a matching variable entry on the job. The non-existent job will also be removed from \`needs\`. You should not rely on this — always use explicit variables.
11. DEPENDENCY ORDER: When listing \`needs\`, order non-dependent jobs before dependent jobs. A job MUST list another job in \`needs\` before its steps can reference that job's step outputs.
12. Use Handlebars-style {{variable_name}} for template interpolation in prompts — when a step has an explicit \`inputs\` array, use the input \`name\` (e.g. \`{{requirements}}\`) instead of the full source path (e.g. \`{{job.step.outputs.__raw__}}\`). This keeps prompts clean, readable, and self-documenting.
13. Return ONLY a valid YAML array — no markdown fences, no explanations

EXAMPLE:
- name: research-job
  agent: agent-researcher
  prompt: "Research the given topic thoroughly and compile findings."
  needs: topic-planner-job
  steps:
    - name: gather-data
      prompts:
        - "Search for the latest information on {{topic}}"
    - name: compile-report
      prompts:
        - "Compile the research findings into a structured report"
      inputs:
        - name: research-data
          source: research-job.gather-data.outputs.__raw__`;

/**
 * Handlebars user prompt template — rendered with context about the workflow
 * and the user's description of what jobs they need.
 */
const userPromptTemplate = `Generate new job definitions for the following workflow context:

Workflow Name: {{workflowName}}
{{#if workflowDescription}}
Workflow Description: {{workflowDescription}}
{{/if}}

Existing Workflow Structure:
{{existingYamlPreview}}

User Request:
{{userDescription}}

Generate a YAML array of job definitions that fulfill the user's request.
Each job must have a unique name, at least 2 steps, and reference existing agents where appropriate.

IMPORTANT CONVENTIONS:
- Do NOT define \`output\` arrays on steps — use \`{job}.{step}.outputs.__raw__\` in input \`source\` instead.
- Input \`source\` must reference either \`vars.{variable_name}\` or \`{job-name}.{step-name}.outputs.__raw__\` where the job is listed in \`needs\`.
- If you reference data from a job not in \`needs\`, generate a variable and use \`vars.{variable_name}\`.
- In prompt templates, ALWAYS use the input \`name\` (e.g. \`{{requirements}}\`) rather than the full source path. This keeps prompts readable and independent of source job/step names.

Return ONLY the YAML array items (each starting with "- name:"), no markdown fences or extra text.`;

// ─── Server Action ─────────────────────────────────────────────────

/**
 * Generates job definitions using Helix AI based on the workflow context
 * and user description.
 *
 * @param params - The generation parameters
 * @returns Generated job definitions with YAML string and summary
 *
 * @throws If the AI service fails or returns invalid data
 */
export async function bflowWorkflowGenerateJobs(
  params: BFlowWorkflowGenerateJobsParams,
): Promise<BFlowWorkflowGenerateJobsResult> {
  const { workflowName, workflowDescription, existingYaml, userDescription } =
    params;

  if (!userDescription.trim()) {
    throw new Error("Please describe what jobs you want to generate.");
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
  // Create a preview of the existing YAML (truncated for context window)
  const existingYamlPreview = generateYamlPreview(existingYaml);

  const template = Handlebars.compile(userPromptTemplate);
  const userPrompt = template({
    workflowName,
    workflowDescription: workflowDescription || "",
    existingYamlPreview,
    userDescription,
  });

  // ── 3. Parse existing YAML for variable context ─────────────────
  let existingYamlParsed: Record<string, unknown> | null = null;
  try {
    existingYamlParsed = parseYaml(existingYaml) as Record<string, unknown>;
  } catch {
    // Silently ignore — we just won't be able to filter existing variables
  }

  // ── 4. Call AI ──────────────────────────────────────────────────
  try {
    const yamlOutput = await ai.doChat({
      system: systemPrompt,
      user: userPrompt,
      temperature: 0.3,
    });

    // ── 4. Clean the response ──────────────────────────────────────
    let cleanYaml = yamlOutput.trim();

    // Remove markdown fences if present
    if (cleanYaml.startsWith("```")) {
      cleanYaml = cleanYaml.replace(/^```(?:yaml)?\n?/i, "");
      cleanYaml = cleanYaml.replace(/\n?```$/g, "");
      cleanYaml = cleanYaml.trim();
    }

    // ── 5. Parse and validate ──────────────────────────────────────
    let parsedJobs: unknown[];
    try {
      // The AI should return a YAML array. Try parsing as a full array first.
      parsedJobs = parseYaml(cleanYaml) as unknown[];
    } catch {
      // If that fails, try wrapping in a jobs: key and parsing
      try {
        const wrapped = parseYaml(`jobs:\n${cleanYaml}`) as {
          jobs?: unknown[];
        };
        parsedJobs = wrapped.jobs ?? [];
      } catch {
        throw new Error(
          "AI returned invalid YAML. Please try again with a more specific description.",
        );
      }
    }

    // ── DEBUG: Log raw AI output for diagnostics ────────────────────
    console.log(
      "[BFlowWorkflow.GenerateJobs.Server] Raw AI output:",
      JSON.stringify(parsedJobs, null, 2).slice(0, 3000),
    );

    if (!Array.isArray(parsedJobs) || parsedJobs.length === 0) {
      throw new Error(
        "AI returned an empty job list. Please try again with a more specific description.",
      );
    }

    // ── 6. Normalize and validate each job ──────────────────────────
    // Smaller models often produce names with spaces, missing prompts,
    // missing steps, or prompts as arrays instead of strings.  We
    // normalise these before passing to the strict Zod schema.

    // Build a set of existing job names from the workflow context.
    // Used to detect when the AI references a job that doesn't exist,
    // so we can auto-convert those references to variables.
    const existingJobNames = new Set<string>();
    if (existingYamlParsed?.jobs && Array.isArray(existingYamlParsed.jobs)) {
      for (const existingJob of existingYamlParsed.jobs) {
        const jobName =
          existingJob && typeof existingJob === "object"
            ? String((existingJob as Record<string, unknown>).name ?? "")
            : "";
        if (jobName) existingJobNames.add(jobName);
      }
    }

    let validJobs: BFlowWorkflowJob[] = [];
    const jobNames = new Set<string>();

    // Build a set of existing variable names from the workflow context.
    // Used to detect when the AI references a variable (via `vars.xxx`) that
    // doesn't exist, so we can auto-generate a job-level variable entry.
    const existingVarNames = new Set<string>(
      (existingYamlParsed?.variables as Array<Record<string, unknown>>)
        ?.map((v: Record<string, unknown>) => String(v.name ?? ""))
        .filter(Boolean) ?? [],
    );

    for (const raw of parsedJobs) {
      const job = raw as Record<string, unknown>;
      if (!job || typeof job !== "object") continue;

      // Normalise name: spaces → kebab-case, lowercase, strip special chars
      if (typeof job.name === "string") {
        job.name = job.name
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 64);
      }
      // Fallback name if missing or empty after sanitisation
      if (!job.name || (typeof job.name === "string" && job.name.length === 0)) {
        job.name = `job-${uuidv7().slice(0, 8)}`;
      }

      // Ensure prompt exists
      if (!job.prompt || typeof job.prompt !== "string") {
        job.prompt = `Execute the "${job.name}" tasks according to the workflow requirements.`;
      }

      // Ensure steps is an array
      if (!Array.isArray(job.steps) || job.steps.length === 0) {
        job.steps = [
          {
            id: uuidv7(),
            name: `${job.name}-step`,
            prompts: [`Execute the primary task for ${job.name}`],
          },
        ];
      }

      // Normalise each step
      for (const rawStep of job.steps as Record<string, unknown>[]) {
        const step = rawStep as Record<string, unknown>;
        if (!step.id) step.id = uuidv7();

        // Normalise step name: spaces → kebab-case
        if (typeof step.name === "string") {
          step.name = step.name
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, "")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "")
            .slice(0, 64);
        }
        if (!step.name || (typeof step.name === "string" && step.name.length === 0)) {
          step.name = `step-${uuidv7().slice(0, 8)}`;
        }

        // Normalise prompts: ensure it's a string or array of strings
        const rawPrompts = step.prompts;
        if (!rawPrompts) {
          step.prompts = [`Execute step: ${step.name}`];
        } else if (typeof rawPrompts === "string") {
          step.prompts = [rawPrompts];
        } else if (Array.isArray(rawPrompts)) {
          const filtered = rawPrompts.filter(
            (p: unknown) => typeof p === "string" && (p as string).length > 0,
          );
          step.prompts = filtered.length > 0 ? filtered : [`Execute step: ${step.name}`];
        } else {
          step.prompts = [`Execute step: ${step.name}`];
        }

        // ── Rule 8: Strip `output` arrays from steps ────────────────
        // The AI should not define `output` on steps. Instead, downstream
        // steps reference raw output via `{job}.{step}.outputs.__raw__`.
        // Remove any `output` that the AI may have generated.
        delete step.output;

        // ── Rule 7: Auto-convert non-existent job references to variables ──
        // If a step input's `source` references a job (via {job}.{step}.outputs.__raw__)
        // that does NOT exist in the workflow context, it means the AI made up a
        // dependency. We auto-convert such references to `vars.{input_name}` and
        // generate a corresponding variable entry on the job.
        if (Array.isArray(step.inputs)) {
          const jobName = String(job.name ?? "");
          const jobNeeds = normalizeNeeds(job.needs);
          for (const input of step.inputs) {
            const source = typeof input.source === "string" ? input.source : "";
            // Variable reference — check if it exists in the workflow variables.
            // If not, auto-generate a job-level variable entry so the reference is valid.
            if (source.startsWith("vars.")) {
              const varName = source.slice("vars.".length);
              if (varName && !existingVarNames.has(varName)) {
                console.log(
                  `[BFlowWorkflow.GenerateJobs.Server] Auto-generating job variable "${varName}" in job "${String(job.name ?? "")}" — referenced via input "${input.name}" source "${source}" but not defined in workflow variables`,
                );
                const jobVariables = job.variables as
                  | BFlowVariable[]
                  | undefined;
                if (!Array.isArray(jobVariables)) {
                  job.variables = [] as BFlowVariable[];
                }
                (job.variables as BFlowVariable[]).push({
                  name: varName,
                  value: `example ${varName}`,
                  type: "text",
                  description: `Auto-generated variable for input "${varName}" (referenced via "${source}" but not defined in workflow variables)`,
                });
              }
              continue;
            }

            // Cross-job reference pattern: {job}.{step}.outputs.__raw__
            if (source.includes(".outputs.")) {
              const sourceJob = source.split(".")[0];
              const isSameJob = sourceJob === jobName;
              const isInNeeds = jobNeeds.has(sourceJob);
              const isExistingJob = existingJobNames.has(sourceJob);
              const isGeneratedJob = jobNames.has(sourceJob);

              if (
                sourceJob &&
                !isSameJob &&
                !isInNeeds &&
                !isExistingJob &&
                !isGeneratedJob
              ) {
                // The referenced job does NOT exist anywhere — convert to a variable
                const varName =
                  typeof input.name === "string" && input.name.length > 0
                    ? input.name
                    : "unknown";
                const newSource = `vars.${varName}`;

                console.log(
                  `[BFlowWorkflow.GenerateJobs.Server] Auto-converting input "${input.name}" in job "${jobName}" step "${step.name}": source "${source}" → "${newSource}" (referenced job "${sourceJob}" not found)`,
                );

                // Update the input source
                input.source = newSource;

                // Generate a variable entry on the job
                const jobVariables = job.variables as
                  | BFlowVariable[]
                  | undefined;
                if (!Array.isArray(jobVariables)) {
                  job.variables = [] as BFlowVariable[];
                }
                (job.variables as BFlowVariable[]).push({
                  name: varName,
                  value: `example ${varName}`,
                  type: "text",
                  description: `Auto-generated variable for input "${varName}" (originally referenced non-existent job "${sourceJob}")`,
                });

                // Also remove the non-existent job from `needs` if present
                if (typeof job.needs === "string" && job.needs === sourceJob) {
                  delete job.needs;
                } else if (Array.isArray(job.needs)) {
                  job.needs = (job.needs as string[]).filter(
                    (n: string) => n !== sourceJob,
                  );
                  if ((job.needs as string[]).length === 0) {
                    delete job.needs;
                  }
                }
              }
            }
          }
        }

        // Ensure job.id is set on each step
        if (!job.id) job.id = uuidv7();
      }

      // ── Normalise job-level variables ──────────────────────────────
      // The AI may generate variables with missing fields (e.g. no
      // `value`).  Normalise them so the Zod schema passes.
      if (Array.isArray(job.variables)) {
        const normalisedVars: Record<string, unknown>[] = [];
        for (const v of job.variables as Record<string, unknown>[]) {
          if (!v || typeof v !== "object") continue;
          // Ensure name exists and is a string
          if (!v.name || typeof v.name !== "string") continue;
          // Ensure value exists (required by schema)
          if (!v.value || typeof v.value !== "string") {
            v.value = "";
          }
          // Ensure type is valid or default to "text"
          if (
            v.type &&
            !["text", "number", "boolean", "select", "textarea"].includes(
              String(v.type),
            )
          ) {
            v.type = "text";
          }
          normalisedVars.push(v);
        }
        job.variables = normalisedVars.length > 0 ? normalisedVars : undefined;
      }

      // Apply Zod validation with the normalised object
      const result = BFlowWorkflowJobSchema.safeParse(job);
      if (result.success) {
        const jobName = result.data.name;
        if (!jobNames.has(jobName)) {
          jobNames.add(jobName);
          validJobs.push(result.data);
        }
      } else {
        console.warn(
          "[BFlowWorkflow.GenerateJobs.Server] Job failed schema validation after normalisation:",
          result.error.issues,
          JSON.stringify(job, null, 2).slice(0, 1000),
        );
      }
    }

    if (validJobs.length === 0) {
      throw new Error(
        "AI returned jobs that don't match the required schema. Please try again.",
      );
    }

    // ── 7a. Topological sort by dependencies ────────────────────────
    // Reorder jobs so that dependencies (jobs listed in `needs`) appear
    // before the jobs that depend on them.  This ensures the output YAML
    // is always in a valid execution order.
    validJobs = topologicalSort(validJobs);

    // ── 7b. Replace source paths with input names in prompts ────────
    // Post-process step prompts so that `{{job.step.outputs.__raw__}}`
    // references are replaced with the corresponding input name
    // (e.g. `{{requirements}}`).  This keeps prompts clean, readable,
    // and decoupled from source job/step names.
    replaceSourceRefsWithInputNames(validJobs);

    // ── 7c. Validate cross-job references ──────────────────────────
    // After topological sort, re-check every step input's `source` that
    // references another job (via `{job}.{step}.outputs.__raw__`).
    // If the referenced job doesn't exist in the final validJobs set
    // (e.g. it was dropped during schema validation), convert the
    // reference to a variable and remove it from `needs`.
    const finalJobNames = new Set(validJobs.map((j) => j.name));
    for (const job of validJobs) {
      if (!Array.isArray(job.steps)) continue;
      const jobName = job.name;
      const jobNeeds = normalizeNeeds(job.needs);

      for (const step of job.steps) {
        if (!Array.isArray(step.inputs)) continue;
        for (const input of step.inputs) {
          const source = typeof input.source === "string" ? input.source : "";
          if (!source.includes(".outputs.")) continue;

          const sourceJob = source.split(".")[0];
          if (!sourceJob || sourceJob === jobName) continue;

          // If the referenced job is NOT in the final set, convert to variable
          if (!finalJobNames.has(sourceJob)) {
            const varName =
              typeof input.name === "string" && input.name.length > 0
                ? input.name
                : "unknown";
            const newSource = `vars.${varName}`;

            console.log(
              `[BFlowWorkflow.GenerateJobs.Server] Post-valid: converting input "${input.name}" in job "${jobName}" step "${step.name}": source "${source}" → "${newSource}" (referenced job "${sourceJob}" not in final validJobs)`,
            );

            input.source = newSource;

            // Generate a variable entry on the job
            if (!Array.isArray(job.variables)) {
              job.variables = [];
            }
            (job.variables as BFlowVariable[]).push({
              name: varName,
              value: `example ${varName}`,
              type: "text",
              description: `Auto-generated variable for input "${varName}" (referenced non-existent job "${sourceJob}")`,
            });

            // Remove the non-existent job from `needs`
            if (typeof job.needs === "string" && job.needs === sourceJob) {
              delete job.needs;
            } else if (Array.isArray(job.needs)) {
              job.needs = (job.needs as string[]).filter(
                (n: string) => n !== sourceJob,
              );
              if ((job.needs as string[]).length === 0) {
                delete job.needs;
              }
            }
          }
        }
      }
    }

    // ── 7d. Collect all variables to workflow root ──────────────────
    // Extract ALL variables from jobs (AI-generated + auto-converted)
    // to the workflow root level, deduplicated by name.
    // Then scan prompts for {{variable}} refs and add missing ones.
    const rootVariables = new Map<string, BFlowVariable>();

    // 7d-i. Collect AI-generated variables from each job
    for (const job of validJobs) {
      if (!Array.isArray(job.variables)) continue;
      for (const v of job.variables) {
        if (v.name && !rootVariables.has(v.name)) {
          rootVariables.set(v.name, { ...v });
        }
      }
      // Remove variables from the job (they'll be at root level)
      delete job.variables;
    }

    // 7d-ii. Detect {{variable}} refs from prompts and add missing ones
    for (const job of validJobs) {
      const jobVars = extractVariablesFromSingleJob(job);
      for (const varName of jobVars) {
        if (!existingVarNames.has(varName) && !rootVariables.has(varName)) {
          rootVariables.set(varName, {
            name: varName,
            value: "",
            type: "text",
            description: `Auto-detected variable "${varName}" used by job "${job.name}"`,
          });
        }
      }
    }

    // ── 8. Build result ────────────────────────────────────────────
    // Build YAML: variables section first, then jobs section
    const missingVariables: BFlowVariable[] = [...rootVariables.values()];
    const variablesYaml =
      missingVariables.length > 0
        ? stringifyYaml(missingVariables, { indent: 2, lineWidth: -1 })
        : "";
    const jobsYaml = stringifyYaml(validJobs, { indent: 2, lineWidth: -1 });

    let summary = `Generated ${validJobs.length} job${validJobs.length !== 1 ? "s" : ""}:\n${validJobs.map((j) => {
      const stepCount = j.steps?.length ?? 0;
      const needsInfo = j.needs
        ? ` (depends on: ${Array.isArray(j.needs) ? j.needs.join(", ") : j.needs})`
        : "";
      return `  • ${j.name} — ${stepCount} step${stepCount !== 1 ? "s" : ""}${needsInfo}`;
    }).join("\n")}`;

    if (missingVariables.length > 0) {
      summary += `\n\nWorkflow variables:\n${missingVariables.map((v) => `  • ${v.name}${v.value ? ` = "${v.value}"` : " (empty)"}`).join("\n")}`;
    }

    return {
      jobs: validJobs,
      jobsYaml,
      missingVariables,
      variablesYaml,
      summary,
    };
  } catch (error) {
    console.error(
      "[BFlowWorkflow.GenerateJobs.Server] Job generation failed:",
      error,
    );
    throw new Error(
      `Failed to generate jobs: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

// ─── Helpers ───────────────────────────────────────────────────────

/**
 * Generate a concise YAML preview for the AI context window.
 * Includes the workflow header, agents, variables, and existing job names/steps
 * (without full step details to save tokens).
 */
function generateYamlPreview(fullYaml: string): string {
  try {
    const parsed = parseYaml(fullYaml);
    if (!parsed || typeof parsed !== "object") return fullYaml.slice(0, 2000);

    const preview: Record<string, unknown> = {};

    // Include top-level workflow info
    if (parsed.name) preview.name = parsed.name;
    if (parsed.description) preview.description = parsed.description;
    if (parsed.semanticVersion) preview.semanticVersion = parsed.semanticVersion;

    // Include agents (full)
    if (Array.isArray(parsed.agents)) {
      preview.agents = parsed.agents;
    }

    // Include variables (full)
    if (Array.isArray(parsed.variables)) {
      preview.variables = parsed.variables;
    }

    // Include agent pools
    if (Array.isArray(parsed.agentPools)) {
      preview.agentPools = parsed.agentPools;
    }

    // Include existing jobs (with step names only to save tokens)
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
                prompts: step.prompts,
                inputs: step.inputs,
                output: step.output,
              }))
            : [],
        }),
      );
    }

    return stringifyYaml(preview, { indent: 2, lineWidth: -1 });
  } catch {
    // If parsing fails, just return a truncated version
    return fullYaml.slice(0, 2000);
  }
}

/**
 * Normalize the `needs` field on a job into a Set of job names.
 * Accepts string, string[], undefined, or null.
 */
function normalizeNeeds(needs: unknown): Set<string> {
  if (typeof needs === "string") return new Set([needs]);
  if (Array.isArray(needs)) return new Set(needs.map(String));
  return new Set();
}

/**
 * Extract Handlebars-style {{variable}} references from a SINGLE job's
 * prompts (job-level + all step-level prompts).
 *
 * Returns a sorted array of unique variable names (lowercased, deduplicated).
 * Excludes variable names that match step input names, since those are
 * resolved via the inputs pipeline at runtime and should not be promoted
 * to job-level variables.
 *
 * Unlike the old global `extractVariablesFromJobs`, this works per-job
 * so detected variables can be injected directly into each job's
 * `variables` array instead of being hoisted to the workflow root.
 */
function extractVariablesFromSingleJob(job: BFlowWorkflowJob): string[] {
  const variableSet = new Set<string>();
  const inputNameSet = new Set<string>();

  // Collect step input names from THIS job to exclude them
  if (Array.isArray(job.steps)) {
    for (const step of job.steps) {
      if (Array.isArray(step.inputs)) {
        for (const input of step.inputs) {
          if (input.name) inputNameSet.add(input.name.toLowerCase());
        }
      }
    }
  }

  // Regex matches {{name}} patterns — captures only the inner name
  const varRegex = /\{\{([a-zA-Z_]\w*)\}\}/g;
  // Regex matches vars.{name} in input sources
  const varsInputRegex = /^vars\.([a-zA-Z_]\w*)$/;

  // Scan job-level prompt
  if (job.prompt) {
    let match: RegExpExecArray | null;
    while ((match = varRegex.exec(job.prompt)) !== null) {
      variableSet.add(match[1].toLowerCase());
    }
  }

  // Scan step-level prompts and input sources
  if (Array.isArray(job.steps)) {
    for (const step of job.steps) {
      const prompts = step.prompts;
      if (typeof prompts === "string") {
        let match: RegExpExecArray | null;
        while ((match = varRegex.exec(prompts)) !== null) {
          variableSet.add(match[1].toLowerCase());
        }
      } else if (Array.isArray(prompts)) {
        for (const p of prompts) {
          if (typeof p === "string") {
            let match: RegExpExecArray | null;
            while ((match = varRegex.exec(p)) !== null) {
              variableSet.add(match[1].toLowerCase());
            }
          }
        }
      }

      // Scan step input sources for vars.{name} references
      if (Array.isArray(step.inputs)) {
        for (const input of step.inputs) {
          if (typeof input.source === "string") {
            const varsMatch = input.source.match(varsInputRegex);
            if (varsMatch) {
              variableSet.add(varsMatch[1].toLowerCase());
            }
          }
        }
      }
    }
  }

  // Filter out common non-variable patterns and empty strings
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
    .filter((name) => !inputNameSet.has(name)) // Exclude step input names
    .sort();
}

// ─── New Helpers (Issues 1 & 2) ─────────────────────────────────────

/**
 * Topologically sort an array of jobs so that dependencies (jobs listed in
 * `needs`) appear before the jobs that depend on them.
 *
 * Uses Kahn's algorithm (BFS-based topological sort).  Jobs with no
 * dependencies are placed first.  If there are circular references, the
 * remaining jobs are appended at the end in their original relative order.
 *
 * This ensures the YAML output is always in a valid execution order,
 * preventing "step inputs reference non-existing steps" errors.
 */
function topologicalSort(jobs: BFlowWorkflowJob[]): BFlowWorkflowJob[] {
  const jobMap = new Map<string, BFlowWorkflowJob>();
  const inDegree = new Map<string, number>();
  const adjList = new Map<string, string[]>();

  // Initialise maps
  for (const job of jobs) {
    jobMap.set(job.name, job);
    inDegree.set(job.name, 0);
    adjList.set(job.name, []);
  }

  // Build adjacency list and in-degree counts
  // edge: dependency → dependent (e.g. job A needs job B → B → A)
  for (const job of jobs) {
    const needs = normalizeNeeds(job.needs);
    for (const dep of needs) {
      // Only count dependencies that are also in the generated set
      if (jobMap.has(dep)) {
        adjList.get(dep)?.push(job.name);
        inDegree.set(job.name, (inDegree.get(job.name) ?? 0) + 1);
      }
    }
  }

  // Kahn's algorithm: start with nodes that have no incoming edges
  const queue: string[] = [];
  for (const [name, degree] of inDegree) {
    if (degree === 0) queue.push(name);
  }

  const sorted: BFlowWorkflowJob[] = [];
  while (queue.length > 0) {
    const name = queue.shift()!;
    const job = jobMap.get(name);
    if (job) sorted.push(job);

    for (const dependent of adjList.get(name) ?? []) {
      const newDegree = (inDegree.get(dependent) ?? 1) - 1;
      inDegree.set(dependent, newDegree);
      if (newDegree === 0) queue.push(dependent);
    }
  }

  // Append any remaining jobs (circular refs or jobs whose deps were
  // filtered out) — preserves their original relative order.
  for (const job of jobs) {
    if (!sorted.find((j) => j.name === job.name)) {
      sorted.push(job);
    }
  }

  return sorted;
}

/**
 * Post-process step prompts to replace full source-path references
 * (e.g. `{{architecture-design.folder-structure.outputs.__raw__}}`) with
 * the corresponding input name (e.g. `{{project_structure}}`).
 *
 * This keeps prompts clean, readable, and decoupled from the source
 * job/step names — addressing Issue 2 ("use the name instead of source").
 *
 * Operates in-place on the jobs array.
 */
function replaceSourceRefsWithInputNames(jobs: BFlowWorkflowJob[]): void {
  // Matches patterns like {{job-name.step-name.outputs.__raw__}}
  // where job-name and step-name are kebab-case identifiers.
  const sourceRefRegex =
    /\{\{([a-zA-Z0-9_-]+)\.([a-zA-Z0-9_-]+)\.outputs\.__raw__\}\}/g;

  for (const job of jobs) {
    if (!Array.isArray(job.steps)) continue;

    for (const step of job.steps) {
      if (!Array.isArray(step.inputs) || step.inputs.length === 0) continue;

      // Build a lookup: source-path → input-name
      // e.g. "architecture-design.folder-structure.outputs.__raw__" → "project_structure"
      const sourceToInputName = new Map<string, string>();
      for (const input of step.inputs) {
        if (input.source && input.name) {
          sourceToInputName.set(input.source, input.name);
        }
      }

      if (sourceToInputName.size === 0) continue;

      // Replace full source-path references in a single prompt string
      const replaceInPrompt = (prompt: string): string => {
        let result = prompt;

        // 1. Replace known {{job.step.outputs.__raw__}} patterns
        result = result.replace(sourceRefRegex, (match, _job, _step) => {
          // Reconstruct the source path to look up in our map
          // The match is e.g. "{{architecture-design.folder-structure.outputs.__raw__}}"
          // We need to strip the {{ and }} to get the source path
          const sourcePath = match.slice(2, -2); // remove {{ and }}
          const inputName = sourceToInputName.get(sourcePath);
          return inputName ? `{{${inputName}}}` : match;
        });

        // 2. Also handle any remaining plain {{source}} patterns that
        //    match a source value exactly (belt-and-suspenders).
        for (const [source, inputName] of sourceToInputName) {
          const escapedSource = source.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&",
          );
          const pattern = new RegExp(`\\{\\{${escapedSource}\\}\\}`, "g");
          result = result.replace(pattern, `{{${inputName}}}`);
        }

        return result;
      };

      if (typeof step.prompts === "string") {
        step.prompts = replaceInPrompt(step.prompts);
      } else if (Array.isArray(step.prompts)) {
        step.prompts = step.prompts.map(replaceInPrompt);
      }
    }
  }
}
