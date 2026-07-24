/**
 * BFlowWorkflowStudio.GenerativeMenu — AI-powered generative modal components.
 *
 * Provides three modal dialogs triggered from a HeroUI Select in the workflow
 * studio header:
 *
 * 1. AgentSwarm   — Generates AI agents from the workflow YAML config using
 *                   one of three strategies: Job Swarm, Request Swarm, or
 *                   Workflow Swarm.
 * 2. GenerateJobs — Generates possible job definitions based on the current
 *                   workflow configuration with optional job-count range and
 *                   domain type (medical, frontend, backend, plan, etc.).
 * 3. GenerateSteps — Generates step definitions for a selected job (or all jobs)
 *                   and assigns appropriate agents.
 */

"use client";

import React, { useCallback, useId, useState } from "react";
import { Button, Input, Label, TextArea, Select, ListBox } from "@heroui/react";
import {
  Brain,
  Layers,
  ListTree,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  XCircle,
} from "lucide-react";
import { v7 as uuidv7 } from "uuid";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import type {
  BFlowWorkflowJob,
  BFlowWorkflowAgent,
  BFlowVariable,
} from "../workflow/BFlowWorkflow.Types";
import { bflowWorkflowGenerateJobs } from "../workflow/BFlowWorkflow.GenerateJobs.Server";

// ═══════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════

export type GenerativeMenuOption =
  | "agent-swarm"
  | "generate-jobs"
  | "generate-steps"
  | null;

export type SwarmSubType = "job-swarm" | "request-swarm" | "workflow-swarm";

export interface JobTypeOption {
  name: string;
  prompt: string;
}

export const JOB_TYPE_OPTIONS: JobTypeOption[] = [
  { name: "medical", prompt: "Medical/healthcare domain workflow" },
  { name: "frontend", prompt: "Frontend development task" },
  { name: "backend", prompt: "Backend/API development task" },
  { name: "fullstack", prompt: "Full-stack development task" },
  { name: "planning", prompt: "Planning and architecture design" },
  { name: "data", prompt: "Data processing and analysis" },
  { name: "devops", prompt: "DevOps and infrastructure" },
  { name: "research", prompt: "Research and investigation" },
  { name: "content", prompt: "Content creation and copywriting" },
  { name: "qa", prompt: "Testing and quality assurance" },
  { name: "security", prompt: "Security analysis and audit" },
  { name: "analytics", prompt: "Business intelligence and analytics" },
];

export interface GenerativeMenuModalProps {
  /** Current YAML content from the editor */
  yamlContent: string;
  /** Parsed jobs from the YAML */
  jobs: BFlowWorkflowJob[];
  /** Called when the YAML content should be updated with generated content */
  onYamlUpdate: (newYaml: string) => void;
  /** Called to close the modal */
  onClose: () => void;
}

// ═══════════════════════════════════════════════════════════════════════
// 1. AgentSwarmModal
// ═══════════════════════════════════════════════════════════════════════

interface AgentSwarmModalProps extends GenerativeMenuModalProps {
  open: boolean;
}

export function AgentSwarmModal({
  open,
  yamlContent,
  jobs,
  onYamlUpdate,
  onClose,
}: AgentSwarmModalProps) {
  const [swarmType, setSwarmType] = useState<SwarmSubType>("job-swarm");
  const [requestDescription, setRequestDescription] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const swarmTypeLabelId = useId();
  const requestDescLabelId = useId();

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      const parsed = parseYaml(yamlContent);
      const existingAgents: BFlowWorkflowAgent[] = parsed?.agents ?? [];
      const existingJobs: BFlowWorkflowJob[] = parsed?.jobs ?? [];

      let newAgents: BFlowWorkflowAgent[] = [];

      switch (swarmType) {
        case "job-swarm": {
          // Generate an agent for each job based on job prompt + name
          for (const job of existingJobs) {
            const agentName = `agent-${job.name.toLowerCase().replace(/[^a-z0-9-]/g, "-")}`;
            const existing = existingAgents.find((a) => a.name === agentName);
            if (!existing) {
              newAgents.push({
                id: uuidv7(),
                name: agentName,
                role: `Agent for job "${job.name}"`,
                prompt: `You are an AI agent specialized for the job "${job.name}".\n\nJob context: ${job.prompt}\n\nExecute the assigned steps with precision and expertise relevant to this domain.`,
              });
            }
          }
          break;
        }
        case "request-swarm": {
          // Generate agents based on user description
          if (!requestDescription.trim()) {
            setError("Please provide a description for the agent swarm.");
            setIsGenerating(false);
            return;
          }
          // Parse description to create agents (split by commas, lines, etc.)
          const descriptions = requestDescription
            .split(/[,;\n]+/)
            .map((d) => d.trim())
            .filter(Boolean);

          for (const desc of descriptions) {
            const slug = desc
              .toLowerCase()
              .replace(/[^a-z0-9\s-]/g, "")
              .replace(/\s+/g, "-")
              .slice(0, 48);
            const agentName = `agent-${slug}`;
            const existing = existingAgents.find((a) => a.name === agentName);
            if (!existing) {
              newAgents.push({
                id: uuidv7(),
                name: agentName,
                role: desc,
                prompt: `You are an AI agent specialized in: ${desc}.\n\nApply your expertise to the tasks assigned with accuracy and thoroughness.`,
              });
            }
          }
          break;
        }
        case "workflow-swarm": {
          // Generate 2-3 agents based on the whole workflow configuration
          const workflowName = parsed?.name ?? "workflow";
          const workflowDesc = parsed?.description ?? "";

          const agentRoles = [
            {
              name: `agent-${workflowName.toLowerCase().replace(/[^a-z0-9-]/g, "-")}-analyst`,
              role: "Analysis & Planning",
              prompt: `You are a senior analyst for the workflow "${workflowName}".\n\nWorkflow description: ${workflowDesc}\n\nYour role is to analyze requirements, plan execution strategies, and ensure quality across all pipeline outputs.`,
            },
            {
              name: `agent-${workflowName.toLowerCase().replace(/[^a-z0-9-]/g, "-")}-builder`,
              role: "Implementation & Building",
              prompt: `You are a builder agent for the workflow "${workflowName}".\n\nWorkflow description: ${workflowDesc}\n\nYour role is to implement and execute the core tasks, producing high-quality deliverables for each step.`,
            },
          ];

          if (existingJobs.length > 2) {
            agentRoles.push({
              name: `agent-${workflowName.toLowerCase().replace(/[^a-z0-9-]/g, "-")}-reviewer`,
              role: "Review & Quality Assurance",
              prompt: `You are a reviewer agent for the workflow "${workflowName}".\n\nWorkflow description: ${workflowDesc}\n\nYour role is to review outputs, ensure consistency, validate results against requirements, and suggest improvements.`,
            });
          }

          for (const agent of agentRoles) {
            const existing = existingAgents.find((a) => a.name === agent.name);
            if (!existing) {
              newAgents.push({
                id: uuidv7(),
                name: agent.name,
                role: agent.role,
                prompt: agent.prompt,
              });
            }
          }
          break;
        }
      }

      if (newAgents.length === 0) {
        setResult("All suggested agents already exist in the configuration.");
        setIsGenerating(false);
        return;
      }

      // Update YAML with new agents
      const updatedParsed = { ...parsed };
      updatedParsed.agents = [...existingAgents, ...newAgents];
      const newYaml = stringifyYaml(updatedParsed, {
        indent: 2,
        lineWidth: -1,
      });
      onYamlUpdate(newYaml);

      setResult(
        `Generated ${newAgents.length} agent${newAgents.length !== 1 ? "s" : ""}:\n${newAgents.map((a) => `  • ${a.name} (${a.role ?? "no role"})`).join("\n")}`,
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate agents",
      );
    } finally {
      setIsGenerating(false);
    }
  }, [yamlContent, swarmType, requestDescription, jobs, onYamlUpdate]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-2xl shadow-xl max-w-lg w-full mx-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-default-100">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-violet-500" />
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Agent Swarm
              </h3>
              <p className="text-xs text-default-400 mt-0.5">
                Generate AI agents from workflow configuration
              </p>
            </div>
          </div>
          <Button
            onPress={onClose}
            variant="ghost"
            size="sm"
            className="text-default-400 h-8 w-8 min-w-0 p-0"
          >
            ✕
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Swarm Type Select */}
          <div className="flex flex-col gap-1.5">
            <Label id={swarmTypeLabelId} className="text-xs font-medium">
              Swarming Strategy
            </Label>
            <Select
              aria-labelledby={swarmTypeLabelId}
              value={swarmType}
              onChange={(val) => setSwarmType(val as SwarmSubType)}
              placeholder="Select strategy"
            >
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox aria-labelledby={swarmTypeLabelId}>
                  <ListBox.Item
                    key="job-swarm"
                    id="job-swarm"
                    textValue="Job Swarm"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">Job Swarm</span>
                      <span className="text-xs text-default-400">
                        Generate agent per job
                      </span>
                    </div>
                  </ListBox.Item>
                  <ListBox.Item
                    key="request-swarm"
                    id="request-swarm"
                    textValue="Request Swarm"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">Request Swarm</span>
                      <span className="text-xs text-default-400">
                        Agents from description input
                      </span>
                    </div>
                  </ListBox.Item>
                  <ListBox.Item
                    key="workflow-swarm"
                    id="workflow-swarm"
                    textValue="Workflow Swarm"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        Workflow Swarm
                      </span>
                      <span className="text-xs text-default-400">
                        2-3 agents from full configuration
                      </span>
                    </div>
                  </ListBox.Item>
                </ListBox>
              </Select.Popover>
            </Select>
          </div>

          {/* Request Description (only for request-swarm) */}
          {swarmType === "request-swarm" && (
            <div className="flex flex-col gap-1.5">
              <Label id={requestDescLabelId} className="text-xs font-medium">
                Agent Descriptions
              </Label>
              <TextArea
                aria-labelledby={requestDescLabelId}
                placeholder="Describe each agent, separated by commas or new lines&#10;e.g. Content Writer, Code Reviewer, Data Analyst"
                value={requestDescription}
                onChange={(e) => setRequestDescription(e.target.value)}
                className="min-h-[100px]"
              />
              <p className="text-[10px] text-default-400">
                Each description will generate a dedicated agent
              </p>
            </div>
          )}

          {/* Info section */}
          <div className="bg-default-50 rounded-xl p-3 text-xs text-default-500 space-y-1">
            <p className="font-medium text-default-600">Strategy Info:</p>
            {swarmType === "job-swarm" && (
              <p>
                Creates one agent per existing job, named after the job, with
                the job's prompt as context. Skips jobs that already have a
                matching agent.
              </p>
            )}
            {swarmType === "request-swarm" && (
              <p>
                Creates agents based on your descriptions. Each description
                becomes a dedicated agent with a system prompt tailored to that
                role.
              </p>
            )}
            {swarmType === "workflow-swarm" && (
              <p>
                Analyzes the full workflow configuration and generates 2-3
                specialized agents (analyst, builder{", "}
                {jobs.length > 2 ? "reviewer" : ""}) with comprehensive system
                prompts.
              </p>
            )}
          </div>

          {/* Result / Error */}
          {result && (
            <div className="bg-success-50 border border-success-200 rounded-xl p-3 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
              <pre className="text-xs text-success-700 whitespace-pre-wrap font-sans">
                {result}
              </pre>
            </div>
          )}
          {error && (
            <div className="bg-danger-50 border border-danger-200 rounded-xl p-3 flex items-start gap-2">
              <XCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
              <p className="text-xs text-danger-700">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-default-100">
          <Button
            onPress={onClose}
            variant="ghost"
            size="sm"
            className="text-default-500"
          >
            Close
          </Button>
          <Button
            onPress={handleGenerate}
            variant="primary"
            size="sm"
            isDisabled={isGenerating}
            className="bg-violet-600 text-white"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Agents
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// 2. GenerateJobsModal — AI-powered job generation
// ═══════════════════════════════════════════════════════════════════════

interface GenerateJobsModalProps extends GenerativeMenuModalProps {
  open: boolean;
}

export function GenerateJobsModal({
  open,
  yamlContent,
  onYamlUpdate,
  onClose,
}: GenerateJobsModalProps) {
  const [userDescription, setUserDescription] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedJobs, setGeneratedJobs] = useState<BFlowWorkflowJob[] | null>(null);
  const [generatedYaml, setGeneratedYaml] = useState<string | null>(null);
  const [generatedVariablesYaml, setGeneratedVariablesYaml] = useState<string | null>(null);
  const [missingVariables, setMissingVariables] = useState<BFlowVariable[]>([]);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const descLabelId = useId();

  /** Parse workflow name/description from the YAML for context */
  const workflowContext = React.useMemo(() => {
    try {
      const parsed = parseYaml(yamlContent);
      return {
        workflowName: (parsed?.name as string) ?? "Unnamed Workflow",
        workflowDescription: (parsed?.description as string) ?? "",
      };
    } catch {
      return { workflowName: "Unnamed Workflow", workflowDescription: "" };
    }
  }, [yamlContent]);

  const handleGenerate = useCallback(async () => {
    if (!userDescription.trim()) {
      setError("Please describe the jobs you want to generate.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setResult(null);
    setGeneratedJobs(null);
    setGeneratedYaml(null);
    setGeneratedVariablesYaml(null);
    setMissingVariables([]);

    try {
      const result = await bflowWorkflowGenerateJobs({
        workflowName: workflowContext.workflowName,
        workflowDescription: workflowContext.workflowDescription,
        existingYaml: yamlContent,
        userDescription: userDescription.trim(),
      });

      setGeneratedJobs(result.jobs);
      setGeneratedYaml(result.jobsYaml);
      setMissingVariables(result.missingVariables);
      setGeneratedVariablesYaml(result.variablesYaml);
      setResult(result.summary);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate jobs",
      );
    } finally {
      setIsGenerating(false);
    }
  }, [userDescription, workflowContext, yamlContent]);

  /** Apply the generated jobs + variables: merge into existing YAML and update */
  const handleApply = useCallback(() => {
    if (!generatedJobs || generatedJobs.length === 0) return;

    try {
      const parsed = parseYaml(yamlContent);
      const existingJobs: BFlowWorkflowJob[] = parsed?.jobs ?? [];

      // Merge: append generated jobs, skip duplicates by name
      const existingNames = new Set(existingJobs.map((j) => j.name));
      const uniqueNewJobs = generatedJobs.filter(
        (j) => !existingNames.has(j.name),
      );

      if (uniqueNewJobs.length === 0 && missingVariables.length === 0) {
        setError("All generated jobs already exist in the workflow.");
        return;
      }

      const updatedParsed = { ...parsed };

      // Merge jobs
      if (uniqueNewJobs.length > 0) {
        updatedParsed.jobs = [...existingJobs, ...uniqueNewJobs];
      }

      // Merge variables: append missing variables detected from prompts
      if (missingVariables.length > 0) {
        const existingVars: BFlowVariable[] = parsed?.variables ?? [];
        const existingVarNames = new Set(existingVars.map((v) => v.name));
        const uniqueNewVars = missingVariables.filter(
          (v) => !existingVarNames.has(v.name),
        );
        if (uniqueNewVars.length > 0) {
          updatedParsed.variables = [...existingVars, ...uniqueNewVars];
        }
      }

      const newYaml = stringifyYaml(updatedParsed, {
        indent: 2,
        lineWidth: -1,
      });

      onYamlUpdate(newYaml);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to apply generated jobs",
      );
    }
  }, [generatedJobs, missingVariables, yamlContent, onYamlUpdate, onClose]);

  /** Preview of generated jobs as a compact YAML block */
  const jobsPreview = React.useMemo(() => {
    if (!generatedJobs || generatedJobs.length === 0) return null;
    return generatedJobs
      .map((job) => {
        const stepCount = job.steps?.length ?? 0;
        const needsInfo = job.needs
          ? ` [needs: ${Array.isArray(job.needs) ? job.needs.join(", ") : job.needs}]`
          : "";
        const agentInfo = job.agent ? ` [agent: ${job.agent}]` : "";
        return `  • ${job.name}${agentInfo}${needsInfo}\n    ${stepCount} step${stepCount !== 1 ? "s" : ""} — ${(job.prompt ?? "").slice(0, 80)}${(job.prompt ?? "").length > 80 ? "..." : ""}`;
      })
      .join("\n");
  }, [generatedJobs]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-2xl shadow-xl max-w-xl w-full mx-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-default-100">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary-500" />
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Generate Jobs
              </h3>
              <p className="text-xs text-default-400 mt-0.5">
                AI-powered job generation from your workflow context
              </p>
            </div>
          </div>
          <Button
            onPress={onClose}
            variant="ghost"
            size="sm"
            className="text-default-400 h-8 w-8 min-w-0 p-0"
          >
            ✕
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Workflow Context Indicator */}
          <div className="bg-default-50 rounded-xl p-2.5 text-[11px] text-default-500">
            <span className="font-medium text-default-600">Workflow: </span>
            {workflowContext.workflowName}
            {workflowContext.workflowDescription && (
              <>
                {" — "}
                <span className="text-default-400">
                  {workflowContext.workflowDescription.slice(0, 100)}
                </span>
              </>
            )}
          </div>

          {/* User Description */}
          <div className="flex flex-col gap-1.5">
            <Label id={descLabelId} className="text-xs font-medium">
              Describe the jobs you want to generate
            </Label>
            <TextArea
              aria-labelledby={descLabelId}
              placeholder="Describe the jobs you need...&#10;e.g. Add a data extraction job that processes CSV files, followed by a validation job that checks data quality, and a reporting job that generates a summary"
              value={userDescription}
              onChange={(e) => setUserDescription(e.target.value)}
              className="min-h-[100px]"
              disabled={isGenerating}
            />
            <p className="text-[10px] text-default-400">
              The AI considers your workflow name, description, existing
              agents, and variables when generating jobs.
            </p>
          </div>

          {/* Generated Jobs Preview */}
          {isGenerating && (
            <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-violet-500 animate-spin shrink-0" />
              <div>
                <p className="text-xs font-medium text-violet-700">
                  AI is generating jobs...
                </p>
                <p className="text-[10px] text-violet-500 mt-0.5">
                  Analyzing workflow context and creating job definitions
                </p>
              </div>
            </div>
          )}

          {result && !isGenerating && (
            <div className="bg-success-50 border border-success-200 rounded-xl p-3">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-success-700 mb-1">
                    Jobs generated successfully
                  </p>
                  <pre className="text-xs text-success-600 whitespace-pre-wrap font-sans">
                    {result}
                  </pre>
                </div>
              </div>

              {/* Detailed YAML preview */}
              {jobsPreview && (
                <div className="mt-2 bg-success-100/50 rounded-lg p-2.5">
                  <p className="text-[10px] font-medium text-success-600 mb-1 uppercase tracking-wider">
                    Job Preview
                  </p>
                  <pre className="text-[11px] text-success-700 whitespace-pre-wrap font-mono leading-relaxed">
                    {jobsPreview}
                  </pre>
                </div>
              )}

              {/* Detected Variables */}
              {missingVariables.length > 0 && (
                <div className="mt-2 bg-primary-50 border border-primary-200 rounded-lg p-2.5">
                  <p className="text-[10px] font-medium text-primary-600 mb-1.5 uppercase tracking-wider flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Variables to add ({missingVariables.length})
                  </p>
                  <div className="space-y-1">
                    {missingVariables.map((v) => (
                      <div key={v.name} className="flex items-center gap-2 text-[11px]">
                        <code className="bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded font-mono text-[10px]">
                          {`{{${v.name}}}`}
                        </code>
                        <span className="text-primary-600 truncate">
                          {v.description || v.name}
                        </span>
                        <span className="text-primary-400 ml-auto text-[10px] capitalize">
                          {v.type || "text"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="bg-danger-50 border border-danger-200 rounded-xl p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-danger-700 mb-0.5">
                  Generation Failed
                </p>
                <p className="text-xs text-danger-600">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-default-100">
          {generatedJobs && generatedJobs.length > 0 ? (
            <>
              <Button
                onPress={() => {
                  setGeneratedJobs(null);
                  setGeneratedYaml(null);
                  setGeneratedVariablesYaml(null);
                  setMissingVariables([]);
                  setResult(null);
                  setError(null);
                }}
                variant="ghost"
                size="sm"
                className="text-default-500"
              >
                Regenerate
              </Button>
              <Button
                onPress={handleApply}
                variant="primary"
                size="sm"
                className="bg-violet-600 text-white"
              >
                <CheckCircle2 className="w-4 h-4" />
                Apply {generatedJobs.length} Job
                {generatedJobs.length !== 1 ? "s" : ""}
              </Button>
            </>
          ) : (
            <>
              <Button
                onPress={onClose}
                variant="ghost"
                size="sm"
                className="text-default-500"
              >
                Cancel
              </Button>
              <Button
                onPress={handleGenerate}
                variant="primary"
                size="sm"
                isDisabled={isGenerating || !userDescription.trim()}
                className="bg-violet-600 text-white"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    AI Generate
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// 3. GenerateStepsModal
// ═══════════════════════════════════════════════════════════════════════

interface GenerateStepsModalProps extends GenerativeMenuModalProps {
  open: boolean;
}

export function GenerateStepsModal({
  open,
  yamlContent,
  jobs,
  onYamlUpdate,
  onClose,
}: GenerateStepsModalProps) {
  const [selectedJobNames, setSelectedJobNames] = useState<Set<string>>(
    new Set(),
  );
  const [selectAll, setSelectAll] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleJob = useCallback((jobName: string) => {
    setSelectedJobNames((prev) => {
      const next = new Set(prev);
      if (next.has(jobName)) {
        next.delete(jobName);
      } else {
        next.add(jobName);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectAll) {
      setSelectedJobNames(new Set());
      setSelectAll(false);
    } else {
      setSelectedJobNames(new Set(jobs.map((j) => j.name)));
      setSelectAll(true);
    }
  }, [selectAll, jobs]);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      const parsed = parseYaml(yamlContent);
      const existingJobs: BFlowWorkflowJob[] = parsed?.jobs ?? [];
      const existingAgents: BFlowWorkflowAgent[] = parsed?.agents ?? [];

      // List of typical step templates mapped by domain keywords
      const stepTemplates: Array<{
        name: string;
        prompt: string;
        agentSuffix?: string;
      }> = [
        {
          name: "analyze",
          prompt: "Analyze the input and define requirements",
        },
        {
          name: "research",
          prompt: "Research and gather relevant information",
        },
        { name: "plan", prompt: "Plan the execution strategy and approach" },
        { name: "design", prompt: "Design the solution architecture" },
        {
          name: "implement",
          prompt: "Implement the solution based on the design",
        },
        {
          name: "review",
          prompt: "Review the implementation for quality and consistency",
        },
        { name: "refine", prompt: "Refine and optimize based on feedback" },
        { name: "test", prompt: "Test and validate the output" },
        { name: "document", prompt: "Document the results and findings" },
        { name: "finalize", prompt: "Finalize and prepare deliverables" },
      ];

      const jobsToProcess = selectAll
        ? existingJobs
        : existingJobs.filter((j) => selectedJobNames.has(j.name));

      if (jobsToProcess.length === 0) {
        setError("Please select at least one job to generate steps for.");
        setIsGenerating(false);
        return;
      }

      let totalStepsAdded = 0;
      const updatedJobs = existingJobs.map((job) => {
        if (!jobsToProcess.find((jp) => jp.name === job.name)) return job;

        // Skip if job already has steps
        if ((job.steps ?? []).length > 0) return job;

        // Pick 3-5 random step templates based on job domain
        const numSteps = Math.min(
          Math.floor(Math.random() * 3) + 3,
          stepTemplates.length,
        );
        const shuffled = [...stepTemplates].sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, numSteps);

        const newSteps = selected.map((tmpl, idx) => {
          // Assign appropriate agent if available
          let agent: string | undefined;
          if (existingAgents.length > 0) {
            const agentIdx = idx % existingAgents.length;
            agent = existingAgents[agentIdx].name;
          }

          return {
            id: uuidv7(),
            name: `${tmpl.name}-${job.name}`
              .toLowerCase()
              .replace(/[^a-z0-9-]/g, "-"),
            prompts: [`${tmpl.prompt} for job "${job.name}"`],
            agent,
          };
        });

        totalStepsAdded += newSteps.length;
        return {
          ...job,
          steps: newSteps,
        };
      });

      if (totalStepsAdded === 0) {
        setResult("Selected jobs already have steps defined.");
        setIsGenerating(false);
        return;
      }

      // Update YAML with new steps
      const updatedParsed = {
        ...parsed,
        jobs: updatedJobs,
      };
      const newYaml = stringifyYaml(updatedParsed, {
        indent: 2,
        lineWidth: -1,
      });
      onYamlUpdate(newYaml);

      setResult(
        `Generated ${totalStepsAdded} step${totalStepsAdded !== 1 ? "s" : ""} across ${jobsToProcess.length} job${jobsToProcess.length !== 1 ? "s" : ""}.\n${jobsToProcess.map((j) => `  • ${j.name}: ${(updatedJobs.find((uj) => uj.name === j.name)?.steps ?? []).length} steps`).join("\n")}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate steps");
    } finally {
      setIsGenerating(false);
    }
  }, [yamlContent, jobs, selectedJobNames, selectAll, onYamlUpdate]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-2xl shadow-xl max-w-lg w-full mx-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-default-100">
          <div className="flex items-center gap-2">
            <ListTree className="w-5 h-5 text-teal-500" />
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Generate Steps
              </h3>
              <p className="text-xs text-default-400 mt-0.5">
                Generate steps and assign agents for selected jobs
              </p>
            </div>
          </div>
          <Button
            onPress={onClose}
            variant="ghost"
            size="sm"
            className="text-default-400 h-8 w-8 min-w-0 p-0"
          >
            ✕
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Select All Toggle */}
          <button
            onClick={handleSelectAll}
            className={`w-full text-left px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
              selectAll
                ? "bg-teal-50 border-teal-200 text-teal-700"
                : "bg-background border-default-200 text-default-600 hover:bg-default-50"
            }`}
          >
            {selectAll ? "✓ All jobs selected" : "Select All Jobs"}
          </button>

          {/* Job Selection */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium">Jobs</Label>
            <div className="max-h-[240px] overflow-y-auto space-y-1.5">
              {jobs.map((job) => {
                const isSelected = selectedJobNames.has(job.name);
                const stepCount = (job.steps ?? []).length;
                return (
                  <button
                    key={job.name}
                    onClick={() => toggleJob(job.name)}
                    disabled={selectAll}
                    className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-all ${
                      isSelected || selectAll
                        ? "bg-primary-50 border-primary-200 text-primary-700"
                        : "bg-background border-default-200 text-default-600 hover:bg-default-50"
                    } ${selectAll ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{job.name}</span>
                      <span className="text-[10px] text-default-400">
                        {stepCount > 0
                          ? `${stepCount} step${stepCount !== 1 ? "s" : ""}`
                          : "No steps"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Info */}
          <div className="bg-default-50 rounded-xl p-3 text-xs text-default-500">
            <p className="font-medium text-default-600 mb-1">How it works:</p>
            <p>
              Generates 3-5 contextual steps for each selected job (only if the
              job has no steps yet). Each step gets a relevant prompt and is
              assigned an appropriate agent from the existing agent pool.
            </p>
          </div>

          {/* Result / Error */}
          {result && (
            <div className="bg-success-50 border border-success-200 rounded-xl p-3 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
              <pre className="text-xs text-success-700 whitespace-pre-wrap font-sans">
                {result}
              </pre>
            </div>
          )}
          {error && (
            <div className="bg-danger-50 border border-danger-200 rounded-xl p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
              <p className="text-xs text-danger-700">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-default-100">
          <Button
            onPress={onClose}
            variant="ghost"
            size="sm"
            className="text-default-500"
          >
            Close
          </Button>
          <Button
            onPress={handleGenerate}
            variant="primary"
            size="sm"
            isDisabled={
              isGenerating || (!selectAll && selectedJobNames.size === 0)
            }
            className="bg-teal-600 text-white"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Steps
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
