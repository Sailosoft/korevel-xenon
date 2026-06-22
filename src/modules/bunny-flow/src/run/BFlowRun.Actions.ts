"use server";

/**
 * BFlowRun.Actions — Server Actions for BunnyFlow Pipeline Execution
 *
 * Wraps all Helix AI chat calls in server actions so that AI API calls
 * happen server-side (API keys, model config stay secure). The client
 * passes pre-resolved step execution data and receives results back to
 * write into IndexedDB for state tracking / polling display.
 */

import HelixAIService from "@/src/modules/helix/src/HelixAIService";
import HelixAISchemaService from "@/src/modules/helix/src/HelixAISchemaService";
import { HELIX_AI_PROVIDERS } from "@/src/modules/helix";
import type { HelixAIOption } from "@/src/modules/helix";

// ─── Types ───────────────────────────────────────────────────────────

export interface StepExecutionRequest {
  /** Unique step identifier */
  stepId: string;
  /** Human-readable step name */
  stepName: string;
  /** System prompt built from pipeline + job + step context + variables */
  systemPrompt: string;
  /** User prompt for this step */
  userPrompt: string;
  /** Resolved AI provider and model to use */
  aiConfig?: HelixAIOption;
  /** Temperature override (default: 0.7) */
  temperature?: number;
  /**
   * Resolved input values for this step (from vars or other step outputs).
   * These are already injected into the prompts, but provided separately
   * for potential logging / result tracking purposes.
   */
  resolvedInputs?: Record<string, string>;
}

export interface StepExecutionResponse {
  stepId: string;
  stepName: string;
  /** AI-generated output text */
  output: string;
  /** Error message if step failed */
  error?: string;
  /** Whether the step completed successfully */
  success: boolean;
}

export interface PipelineExecutionRequest {
  /** Unique identifier for this run (GUIDv7, generated client-side) */
  runId: string;
  /** AI provider/config to use throughout the run */
  aiConfig?: HelixAIOption;
  /** All steps to execute, grouped by job */
  jobs: Array<{
    jobId: string;
    jobName: string;
    /** Steps to execute sequentially within this job */
    steps: StepExecutionRequest[];
  }>;
}

export interface PipelineExecutionResponse {
  runId: string;
  success: boolean;
  error?: string;
  /** Results per job */
  jobs: Array<{
    jobId: string;
    jobName: string;
    success: boolean;
    error?: string;
    steps: StepExecutionResponse[];
  }>;
}

// ─── Helpers ─────────────────────────────────────────────────────────

/**
 * Create a HelixAIService on the server using the provided (or default)
 * AI provider and model configuration.
 */
function createHelixService(aiConfig?: HelixAIOption): HelixAIService {
  const activeProvider = aiConfig?.provider || "default";

  const providers = HELIX_AI_PROVIDERS.map((p) => {
    if (p.provider === activeProvider && aiConfig?.model) {
      return { ...p, model: aiConfig.model };
    }
    return p;
  });

  return new HelixAIService({
    config: {
      ai: {
        activeProvider,
        providers,
      },
    },
    aiSchema: new HelixAISchemaService(),
  });
}

// ─── Single Step Chat ────────────────────────────────────────────────

/**
 * Execute a single step's AI chat on the server using Helix.
 *
 * Useful when the client wants fine-grained control over step-by-step
 * execution (e.g. to update IndexedDB after each step for live UI).
 */
export async function executeStepChatAction(
  request: StepExecutionRequest,
): Promise<StepExecutionResponse> {
  try {
    const helix = createHelixService(request.aiConfig);

    const output = await helix.doChat({
      system: request.systemPrompt,
      user: request.userPrompt,
      temperature: request.temperature ?? 0.7,
      maxToken: 8000,
    });

    return {
      stepId: request.stepId,
      stepName: request.stepName,
      output,
      success: true,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown AI chat error";
    console.error("[BFlowRun.Actions] executeStepChatAction failed:", message);
    return {
      stepId: request.stepId,
      stepName: request.stepName,
      output: "",
      error: message,
      success: false,
    };
  }
}

// ─── Full Pipeline Execution ─────────────────────────────────────────

/**
 * Execute an entire pipeline run on the server.
 *
 * The client pre-computes the resolved variables and passes all step
 * execution requests in dependency order. The server executes each
 * job's steps sequentially and returns all results at once.
 *
 * The client then writes the results into IndexedDB for display.
 */
export async function executePipelineRunAction(
  request: PipelineExecutionRequest,
): Promise<PipelineExecutionResponse> {
  const helix = createHelixService(request.aiConfig);
  const jobResults: PipelineExecutionResponse["jobs"] = [];

  try {
    for (const job of request.jobs) {
      const stepResults: StepExecutionResponse[] = [];
      let jobFailed = false;
      let jobError: string | undefined;

      // Execute steps sequentially within each job
      for (const step of job.steps) {
        try {
          const output = await helix.doChat({
            system: step.systemPrompt,
            user: step.userPrompt,
            temperature: step.temperature ?? 0.7,
            maxToken: 8000,
          });

          stepResults.push({
            stepId: step.stepId,
            stepName: step.stepName,
            output,
            success: true,
          });
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Unknown step execution error";
          stepResults.push({
            stepId: step.stepId,
            stepName: step.stepName,
            output: "",
            error: message,
            success: false,
          });
          jobFailed = true;
          jobError = message;
          // Stop executing further steps on failure
          break;
        }
      }

      jobResults.push({
        jobId: job.jobId,
        jobName: job.jobName,
        success: !jobFailed,
        error: jobError,
        steps: stepResults,
      });
    }

    const anyFailed = jobResults.some((j) => !j.success);
    return {
      runId: request.runId,
      success: !anyFailed,
      error: anyFailed
        ? jobResults.find((j) => !j.success)?.error
        : undefined,
      jobs: jobResults,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown pipeline execution error";
    console.error("[BFlowRun.Actions] executePipelineRunAction failed:", message);
    return {
      runId: request.runId,
      success: false,
      error: message,
      jobs: jobResults,
    };
  }
}
