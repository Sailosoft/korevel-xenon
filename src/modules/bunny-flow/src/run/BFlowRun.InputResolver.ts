/**
 * BFlowRun.InputResolver — Resolves step input sources to actual values
 * and parses structured outputs from AI responses.
 *
 * ## Input Source Resolution
 *
 * Supports three source patterns as defined in BFlowStepInputSchema:
 *
 *   1. `vars.{name}`              → pipeline/flow variable lookup
 *   2. `{jobSlug}.{stepSlug}`     → shorthand for the step's full raw output
 *                                   (equivalent to `{job}.{step}.outputs.__raw__`)
 *   3. `{jobSlug}.{stepSlug}.outputs.{name}`  → cross-step output reference
 *
 * On resolution failure (missing variable, step, or output), a descriptive
 * error is thrown so the pipeline run can fail fast with a clear message.
 *
 * ## Structured Output Parsing
 *
 * When a step defines `output` modes (e.g. JSON, YAML, plain), the parser
 * extracts named values from the AI's raw text response:
 *
 *   - `json` / `json_array` — parses the response as JSON and extracts fields
 *   - `yaml` — parses as YAML and extracts fields
 *   - `plain` / `markdown` / `html` / `csv` — returns the raw text as-is
 */

import type { BFlowPipelineVariable } from "../pipeline/BFlowPipeline.Types";
import type {
  BFlowWorkflowJob,
  BFlowStep,
  BFlowStepOutputMode,
} from "../workflow/BFlowWorkflow.Types";

// ─── Constants ──────────────────────────────────────────────────────

/** Regex for `vars.{name}` source pattern */
const VARS_PATTERN = /^vars\.([a-zA-Z_][a-zA-Z0-9_-]*)$/;

/**
 * Regex for `{jobSlug}.{stepSlug}.outputs.{name}` source pattern.
 * Job and step slugs: alphanumeric, underscores, hyphens, dots.
 * Output name: alphanumeric, underscores, hyphens.
 */
const STEP_OUTPUT_PATTERN =
  /^([a-zA-Z_][a-zA-Z0-9_\-.]*)\.([a-zA-Z_][a-zA-Z0-9_\-.]*)\.outputs\.([a-zA-Z_][a-zA-Z0-9_\-]*)$/;

/**
 * Regex for `{jobSlug}.{stepSlug}` shorthand pattern.
 * Resolves to the step's `__raw__` output (the full raw output text).
 * Job and step slugs: alphanumeric, underscores, hyphens, dots.
 */
const STEP_REF_PATTERN =
  /^([a-zA-Z_][a-zA-Z0-9_\-.]*)\.([a-zA-Z_][a-zA-Z0-9_\-.]*)$/;

// ─── Types ──────────────────────────────────────────────────────────

/**
 * A map of already-resolved step outputs keyed by `{jobSlug}.{stepSlug}`.
 * The inner map is output-name → string value.
 */
export type StepOutputMap = Map<string, Map<string, string>>;

/**
 * Context needed to resolve input sources during pipeline execution.
 */
export interface InputResolutionContext {
  /** All resolved pipeline/flow variables (name → value lookup) */
  variables: Map<string, string>;
  /**
   * Outputs from already-executed steps, keyed by `{jobSlug}.{stepSlug}`.
   * This is built incrementally as each job's steps complete.
   */
  stepOutputs: StepOutputMap;
  /**
   * All jobs in the current pipeline for cross-referencing.
   * Used to validate job/step existence before resolution.
   */
  jobs: BFlowWorkflowJob[];
}

/**
 * The result of resolving a single step's inputs.
 */
export interface ResolvedStepInput {
  /** The input name (from BFlowStepInput.name) */
  name: string;
  /** The raw source string (from BFlowStepInput.source) */
  source: string;
  /** The resolved value */
  value: string;
}

// ─── Errors ─────────────────────────────────────────────────────────

export class InputResolutionError extends Error {
  constructor(
    message: string,
    public readonly stepName: string,
    public readonly inputName: string,
    public readonly source: string,
  ) {
    super(message);
    this.name = "InputResolutionError";
  }
}

// ─── Resolver ───────────────────────────────────────────────────────

/**
 * Resolves step input source references to concrete values.
 *
 * Throws `InputResolutionError` with a descriptive message when a source
 * reference cannot be resolved — this ensures fail-fast validation that
 * surfaces clear errors to the user.
 */
export class BFlowRunInputResolver {
  /**
   * Resolve all inputs for a single step.
   *
   * @param step      The workflow step whose inputs to resolve
   * @param job       The job containing this step (for error context)
   * @param context   The resolution context with variables, step outputs, and jobs
   * @returns         Array of resolved input name-value pairs
   * @throws {InputResolutionError} if any input source cannot be resolved
   */
  resolveStepInputs(
    step: BFlowStep,
    job: BFlowWorkflowJob,
    context: InputResolutionContext,
  ): ResolvedStepInput[] {
    if (!step.inputs || step.inputs.length === 0) {
      return [];
    }

    const resolved: ResolvedStepInput[] = [];

    for (const input of step.inputs) {
      const value = this.resolveSingleInput(
        step.name,
        input.name,
        input.source,
        context,
      );
      resolved.push({
        name: input.name,
        source: input.source,
        value,
      });
    }

    return resolved;
  }

  /**
   * Resolve a single input source string to a concrete value.
   */
  private resolveSingleInput(
    stepName: string,
    inputName: string,
    source: string,
    context: InputResolutionContext,
  ): string {
    const trimmed = source.trim();

    // ── Pattern 1: vars.{name} ────────────────────────────────────
    const varsMatch = trimmed.match(VARS_PATTERN);
    if (varsMatch) {
      const varName = varsMatch[1];
      const value = context.variables.get(varName);
      if (value === undefined) {
        throw new InputResolutionError(
          `Variable "${varName}" referenced in input "${inputName}" source "${source}" does not exist. ` +
            `Available variables: ${[...context.variables.keys()].join(", ") || "(none)"}`,
          stepName,
          inputName,
          source,
        );
      }
      return value;
    }

    // ── Pattern 2: {jobSlug}.{stepSlug}.outputs.{name} ────────────
    const stepMatch = trimmed.match(STEP_OUTPUT_PATTERN);
    if (stepMatch) {
      const [, jobSlug, stepSlug, outputName] = stepMatch;
      return this.resolveStepOutput(
        stepName,
        inputName,
        source,
        jobSlug,
        stepSlug,
        outputName,
        context,
      );
    }

    // ── Pattern 3: {jobSlug}.{stepSlug} (shorthand for .outputs.__raw__) ─
    // NOTE: Checked AFTER Pattern 2 so the longer `{job}.{step}.outputs.{name}`
    // format is matched first, avoiding a false-positive on the shorter pattern.
    const stepRefMatch = trimmed.match(STEP_REF_PATTERN);
    if (stepRefMatch) {
      const [, jobSlug, stepSlug] = stepRefMatch;
      return this.resolveStepOutput(
        stepName,
        inputName,
        source,
        jobSlug,
        stepSlug,
        "__raw__",
        context,
      );
    }

    // ── Unknown pattern ────────────────────────────────────────────
    throw new InputResolutionError(
      `Input "${inputName}" has an unrecognized source format: "${source}". ` +
        `Expected formats: "vars.{name}", "{job}.{step}", or "{job}.{step}.outputs.{name}".`,
      stepName,
      inputName,
      source,
    );
  }

  /**
   * Resolve a `{jobSlug}.{stepSlug}.outputs.{name}` reference.
   */
  private resolveStepOutput(
    stepName: string,
    inputName: string,
    source: string,
    jobSlug: string,
    stepSlug: string,
    outputName: string,
    context: InputResolutionContext,
  ): string {
    // 1. Validate the job exists
    const targetJob = context.jobs.find((j) => j.name === jobSlug);
    if (!targetJob) {
      throw new InputResolutionError(
        `Job "${jobSlug}" referenced in input "${inputName}" source "${source}" does not exist. ` +
          `Available jobs: ${context.jobs.map((j) => j.name).join(", ") || "(none)"}`,
        stepName,
        inputName,
        source,
      );
    }

    // 2. Validate the step exists in that job
    const targetStep = targetJob.steps.find((s) => s.name === stepSlug);
    if (!targetStep) {
      throw new InputResolutionError(
        `Step "${stepSlug}" in job "${jobSlug}" referenced in input "${inputName}" source "${source}" does not exist. ` +
          `Available steps in job "${jobSlug}": ${targetJob.steps.map((s) => s.name).join(", ") || "(none)"}`,
        stepName,
        inputName,
        source,
      );
    }

    // 3. Check if the output was produced (step has been executed)
    const stepKey = `${jobSlug}.${stepSlug}`;
    const stepOutputs = context.stepOutputs.get(stepKey);

    if (!stepOutputs) {
      throw new InputResolutionError(
        `Step "${stepSlug}" in job "${jobSlug}" has not been executed yet. ` +
          `Input "${inputName}" source "${source}" references a step that must run first. ` +
          `Step order: ensure "${jobSlug} > ${stepSlug}" executes before this step.`,
        stepName,
        inputName,
        source,
      );
    }

    // 4. Validate the output name exists
    const outputValue = stepOutputs.get(outputName);
    if (outputValue === undefined) {
      const availableOutputs = [...stepOutputs.keys()];
      throw new InputResolutionError(
        `Output "${outputName}" from step "${stepSlug}" in job "${jobSlug}" referenced in input "${inputName}" ` +
          `source "${source}" does not exist. ` +
          `Available outputs: ${availableOutputs.join(", ") || "(none)"}` +
          (stepOutputs.has("__raw__")
            ? `\nTip: The step produced raw output. Use "__raw__" to reference the full output text.`
            : ""),
        stepName,
        inputName,
        source,
      );
    }

    return outputValue;
  }

  // ─── Context Builders ────────────────────────────────────────────

  /**
   * Build a variable lookup map from an array of pipeline variables.
   */
  buildVariableMap(variables: BFlowPipelineVariable[]): Map<string, string> {
    const map = new Map<string, string>();
    for (const v of variables) {
      map.set(v.name, v.value);
    }
    return map;
  }

  /**
   * Build an empty step outputs map (populated as steps execute).
   */
  buildEmptyStepOutputs(): StepOutputMap {
    return new Map();
  }

  /**
   * Register a step's output after execution so downstream steps can reference it.
   *
   * @param stepOutputs  The mutable step outputs map to update
   * @param jobSlug      The job name/slug
   * @param stepSlug     The step name/slug
   * @param rawOutput    The full raw output text
   * @param structuredOutput Optional structured output map (output name → value)
   */
  registerStepOutput(
    stepOutputs: StepOutputMap,
    jobSlug: string,
    stepSlug: string,
    rawOutput: string,
    structuredOutput?: Record<string, unknown>,
  ): void {
    const stepKey = `${jobSlug}.${stepSlug}`;
    const outputs = new Map<string, string>();

    // Always store the raw full output under "__raw__"
    outputs.set("__raw__", rawOutput);

    // If structured outputs were defined, register each named output
    if (structuredOutput) {
      for (const [key, value] of Object.entries(structuredOutput)) {
        outputs.set(key, String(value));
      }
    }

    stepOutputs.set(stepKey, outputs);
  }

  // ─── Structured Output Parsing ──────────────────────────────────

  /**
   * Parse the AI's raw text output into structured data based on the
   * step's declared output modes.
   *
   * When a step defines `output` in its schema, the AI is instructed
   * (via the prompt) to return a JSON object where each key matches an
   * output name. This method parses that JSON and maps it back to the
   * declared output names.
   *
   * If the step has no output definitions, the raw text is returned as
   * a single `__raw__` entry.
   *
   * @param rawOutput         The raw text from the AI response
   * @param outputDefinitions The step's output mode definitions (optional)
   * @returns                 A map of output name → parsed value
   */
  parseStructuredOutput(
    rawOutput: string,
    outputDefinitions?: BFlowStepOutputMode[],
  ): Record<string, unknown> {
    // No output definitions → nothing to parse
    if (!outputDefinitions || outputDefinitions.length === 0) {
      return {};
    }

    const trimmed = rawOutput.trim();

    // Try to parse as JSON first (this is the expected format when
    // outputs are defined — the AI is instructed to return JSON)
    let parsedJson: Record<string, unknown> | null = null;

    // Attempt to extract JSON from markdown code blocks first
    const jsonBlockMatch = trimmed.match(
      /```(?:json|yaml)?\s*\n?([\s\S]*?)```/,
    );
    const jsonStr = jsonBlockMatch ? jsonBlockMatch[1].trim() : trimmed;

    try {
      const parsed = JSON.parse(jsonStr);
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        !Array.isArray(parsed)
      ) {
        parsedJson = parsed as Record<string, unknown>;
      } else if (typeof parsed === "object" && parsed !== null) {
        // Array response — wrap it
        parsedJson = { __array: parsed };
      }
    } catch {
      // Not valid JSON — fall through to type-specific parsing
    }

    // Map output definitions to values
    const result: Record<string, unknown> = {};

    for (const outputDef of outputDefinitions) {
      const outputName = outputDef.name;
      const outputType = outputDef.type;

      if (parsedJson && outputName in parsedJson) {
        // Got the value from parsed JSON
        result[outputName] = this.coerceOutputValue(
          parsedJson[outputName],
          outputType,
        );
      } else {
        // Fall back to raw output for this named field
        result[outputName] = rawOutput;
      }
    }

    return result;
  }

  /**
   * Coerce a parsed value to match the expected output type.
   */
  private coerceOutputValue(value: unknown, expectedType: string): unknown {
    switch (expectedType) {
      case "json":
      case "json_array":
      case "yaml":
        // Return as-is (already parsed from JSON)
        return value;
      case "number": {
        const n = Number(value);
        return isNaN(n) ? String(value) : n;
      }
      case "boolean": {
        if (typeof value === "boolean") return value;
        if (value === "true" || value === "1") return true;
        if (value === "false" || value === "0") return false;
        return String(value);
      }
      case "plain":
      case "markdown":
      case "html":
      case "csv":
      default:
        return String(value);
    }
  }

  /**
   * Build an output format instruction string for the system prompt.
   * This tells the AI how to format its response so it can be parsed.
   *
   * @param outputDefinitions The step's output mode definitions
   * @returns                 A prompt fragment to append to the system prompt
   */
  buildOutputFormatInstruction(
    outputDefinitions: BFlowStepOutputMode[],
  ): string {
    if (!outputDefinitions || outputDefinitions.length === 0) {
      return "";
    }

    const fields = outputDefinitions
      .map((od) => `  "${od.name}": <${od.type}>`)
      .join("\n");

    return (
      `\n\nYou MUST return your response as a valid JSON object with the following fields:\n` +
      `{\n${fields}\n}\n` +
      `Do NOT include any text outside the JSON object. Do NOT wrap it in markdown code blocks. ` +
      `Return ONLY the raw JSON object.`
    );
  }
}
