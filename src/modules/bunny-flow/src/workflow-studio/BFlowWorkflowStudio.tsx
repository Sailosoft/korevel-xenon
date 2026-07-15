/**
 * BFlowWorkflowStudio — Live YAML editor + interactive builder + pipeline test runner.
 *
 * Two-panel studio (side-by-side on desktop, stacked on mobile) for rapidly
 * developing and testing a workflow without persisting any run data to the
 * database (IndexedDB).  All test-run results live only in browser memory.
 *
 * ─── Modes ─────────────────────────────────────────────────────────────
 *   • YAML Editor (default) — Monaco code editor pre-loaded with the workflow YAML.
 *   • Interactive Mode      — Form-based UI for building workflow interactively
 *                             using heroUI components. Replaces Monaco editor,
 *                             skips YAML validation, and serializes to YAML on save.
 *
 * ─── Panels ───────────────────────────────────────────────────────────
 *   Left  (editor) — Monaco code editor OR interactive form.
 *   Right (runner) — Pipeline display showing jobs, steps, outputs & prompts.
 *
 * ─── Actions ──────────────────────────────────────────────────────────
 *   • Save              — Persists the edited YAML to the workflow template.
 *   • Test Workflow     — Runs the pipeline in-memory via useBFlowTestRun.
 *   • Back to Workflow  — Navigates back to the workflow list.
 *   • Generative Menu   — AI-powered generation of agents, jobs, or steps
 *                         via HeroUI Select with modal dialogs.
 */

"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Modal, Select, ListBox } from "@heroui/react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  ArrowLeft,
  Save,
  Beaker,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  Eye,
  Code,
  Brain,
  Monitor,
  PenTool,
  Sparkles,
  Layers,
  ListTree,
} from "lucide-react";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { BFlowWorkflowSchema } from "../workflow/BFlowWorkflow.Types";
import { bflowDB } from "../database/BFlowDatabase";
import { useBFlowTestRun } from "../run/BFlowRun.Hooks.TestRun";
import { BFlowStatusBadge, getStatusConfig } from "../run/BFlowStatusBadge";
import { BFlowTestRunBanner } from "../run/BFlowRunState";
import { BFlowStepNode } from "../run/BFlowStepNode";
import { BFlowStepDetailsModal } from "../run/BFlowStepDetailsModal";
import { BFlowOutputModal } from "../run/BFlowOutputModal";
import { BFlowComputedInputsModal } from "../run/BFlowComputedInputsModal";
import { BFlowRunInputResolver } from "../run/BFlowRun.InputResolver";
import { BFlowRunPromptBuilder } from "../run/BFlowRun.SectionBuilder";
import { BFlowPromptBuilderKind } from "../run/BFlowRun.Prompt.Types";
import BFlowWorkflowGuidePanel from "../workflow/BFlowWorkflow.Guide.Panel";
import type { BFlowWorkflowTemplateEntity } from "../workflow/BFlowWorkflow.Entity";
import type {
  BFlowWorkflowJob,
  BFlowStep,
  BFlowVariable,
} from "../workflow/BFlowWorkflow.Types";
import type { BFlowStepRun, BFlowJobRun } from "../run/BFlowRun.Types";
import type { BFlowPipelineVariable } from "../pipeline/BFlowPipeline.Types";

// Import Interactive component from new location
import BFlowWorkflowInteractive from "../workflow-interactive/BFlowWorkflowInteractive";
import type {
  BFlowInteractiveWorkflowData,
  BFlowInteractiveAgent,
  BFlowInteractiveAgentPool,
} from "../workflow-interactive/BFlowWorkflowInteractive.Types";

// Agent Pool integration
import { useBFlowPools } from "../pool/useBFlowPools";

import type { BFlowWorkflowStudioProps } from "./BFlowWorkflowStudio.Types";
import { BFlowStudioLoadingFallback } from "./BFlowWorkflowStudio.LoadingFallback";

// ─── Generative Menu ────────────────────────────────────────────────

import {
  AgentSwarmModal,
  GenerateJobsModal,
  GenerateStepsModal,
  type GenerativeMenuOption,
} from "./BFlowWorkflowStudio.GenerativeMenu";

// ─── Dynamic Monaco import (SSR-safe) ────────────────────────────────

const MonacoEditor = dynamic(
  () => import("@monaco-editor/react").then((mod) => mod.default),
  { ssr: false, loading: () => <BFlowStudioLoadingFallback /> },
);

// ═══════════════════════════════════════════════════════════════════════
// BFlowWorkflowStudio
// ═══════════════════════════════════════════════════════════════════════

export default function BFlowWorkflowStudio({
  params,
}: BFlowWorkflowStudioProps) {
  const { id: flowId, workflowId } = use(params);
  const router = useRouter();

  // ── Edit mode (YAML editor caching via ?edit) ─────────────────────
  const [isEditMode, setIsEditMode] = useState(false);
  const hasMounted = useRef(false);
  const STORAGE_PREFIX = "bflow-studio-edit";
  const storageKey = `${STORAGE_PREFIX}-${workflowId}`;

  // ── Data loading ──────────────────────────────────────────────────
  const [workflow, setWorkflow] = useState<
    BFlowWorkflowTemplateEntity | undefined
  >(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Interactive mode toggle ─────────────────────────────────────
  const [interactiveMode, setInteractiveMode] = useState(false);

  // ── Agent Pools (for filling agents in interactive mode) ────────
  const {
    pools: rawPools,
    loading: poolsLoading,
  } = useBFlowPools();

  // ── Pool Agents (actual agent records within pools) ─────────────
  const [poolAgents, setPoolAgents] = useState<Record<string, BFlowInteractiveAgent[]>>({});
  const [poolAgentsLoaded, setPoolAgentsLoaded] = useState(false);

  // Load pool agents for the active pools and group them by poolId
  useEffect(() => {
    let cancelled = false;
    const activePools = rawPools.filter(
      (p) =>
        p.flowId === flowId &&
        (p.status === "active" || p.status === "draft"),
    );
    if (activePools.length === 0) {
      setPoolAgents({});
      setPoolAgentsLoaded(true);
      return;
    }

    const loadAgents = async () => {
      try {
        const allPoolAgents = await bflowDB.poolAgents.toArray();
        if (cancelled) return;

        const grouped: Record<string, BFlowInteractiveAgent[]> = {};
        for (const pool of activePools) {
          const agentsForPool = allPoolAgents
            .filter((pa) => pa.poolId === pool.id)
            .map((pa) => ({
              id: pa.id,
              name: pa.name,
              role: pa.role,
              prompt: pa.prompt,
              // Carry provider/model so the interactive component
              // can surface them in the UI if needed
              ...(pa.provider ? { provider: pa.provider } : {}),
              ...(pa.model ? { model: pa.model } : {}),
            })) as BFlowInteractiveAgent[];
          grouped[pool.id] = agentsForPool;
        }
        if (!cancelled) {
          setPoolAgents(grouped);
          setPoolAgentsLoaded(true);
        }
      } catch {
        if (!cancelled) setPoolAgentsLoaded(true);
      }
    };
    loadAgents();
    return () => { cancelled = true; };
  }, [rawPools, flowId]);

  /** Map raw DB entities to the lightweight interactive pool type,
   *  scoped to the current flowId. Includes actual pool agent records
   *  so the interactive builder can fill real agents instead of
   *  generating synthetic ones. */
  const interactiveAgentPools: BFlowInteractiveAgentPool[] = useMemo(
    () =>
      rawPools
        .filter(
          (p) =>
            p.flowId === flowId &&
            (p.status === "active" || p.status === "draft"),
        )
        .map((p) => {
          const agents = poolAgents[p.id] ?? [];
          return {
            slug: p.code,        // Use code as slug for pool identification
            name: p.name,
            agentCount: Math.max(1, agents.length || 1),
            template: {
              systemPrompt: p.description,
              provider: undefined,
              model: undefined,
            },
            // Pass actual pool agents if available
            agents: agents.length > 0 ? agents : undefined,
          };
        }),
    [rawPools, poolAgents, flowId],
  );

  // ── Editor state ──────────────────────────────────────────────────
  const [yamlContent, setYamlContent] = useState<string>("");
  const [yamlError, setYamlError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  // ── Prompt builder mode ──────────────────────────────────────────
  const [promptBuilderKind, setPromptBuilderKind] =
    useState<BFlowPromptBuilderKind>(BFlowPromptBuilderKind.Section);

  // ── Parsed pipeline state ─────────────────────────────────────────
  const [parsedJobs, setParsedJobs] = useState<BFlowWorkflowJob[]>([]);
  /** Variables parsed from the live YAML (kept in sync with parsedJobs). */
  const [parsedVariables, setParsedVariables] = useState<BFlowVariable[]>([]);
  const [selectedJobIndex, setSelectedJobIndex] = useState(0);

  // ── Modal state ───────────────────────────────────────────────────
  const [viewStep, setViewStep] = useState<{
    step: BFlowStep;
    stepRun?: BFlowStepRun;
  } | null>(null);
  const [viewOutput, setViewOutput] = useState<{
    step: BFlowStep;
    stepRun?: BFlowStepRun;
  } | null>(null);
  const [viewComputedInputs, setViewComputedInputs] = useState<{
    step: BFlowStep;
    stepRun?: BFlowStepRun;
  } | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // ── Generative Menu state ──────────────────────────────────────────
  const [generativeMenuOption, setGenerativeMenuOption] =
    useState<GenerativeMenuOption>(null);

  // ── Parse YAML and extract jobs + variables ───────────────────────
  const parseAndSetJobs = useCallback((yaml: string) => {
    try {
      const parsed = parseYaml(yaml);
      const jobs = parsed?.jobs ?? [];
      setParsedJobs(jobs);
      // Extract workflow-level variables from the live YAML so
      // `vars.{name}` input resolution reflects unsaved edits.
      const variables: BFlowVariable[] = parsed?.variables ?? [];
      setParsedVariables(variables);
      setYamlError(null);
    } catch {
      setYamlError("Invalid YAML — pipeline display may be incomplete");
      // Keep previous jobs/variables visible if parsing fails
    }
  }, []);

  /** Callback when generative modal updates YAML content */
  const handleGenerativeYamlUpdate = useCallback(
    (newYaml: string) => {
      setYamlContent(newYaml);
      parseAndSetJobs(newYaml);
    },
    [parseAndSetJobs],
  );

  // ── Initialise edit mode from URL on mount ───────────────────────
  useEffect(() => {
    const hasEdit = new URLSearchParams(window.location.search).has("edit");
    setIsEditMode(hasEdit);
  }, []);

  // ── Manage ?edit query parameter ──────────────────────────────────
  useEffect(() => {
    const current = new URLSearchParams(window.location.search);
    if (!current.has("edit")) {
      current.set("edit", "");
      router.replace(`?${current.toString()}`, { scroll: false });
      setIsEditMode(true);
    }
  }, [router]);

  // ── Cleanup cache when leaving edit mode ─────────────────────────
  useEffect(() => {
    // Skip on initial mount — isEditMode starts false, but the
    // URL-parsing effect (line 150) will flip it to true almost
    // immediately.  Without this guard the cache would be wiped
    // before it can be restored on page refresh.
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }

    if (!isEditMode) {
      // Remove all studio-edit cache entries for any workflow
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(STORAGE_PREFIX)) {
          localStorage.removeItem(key);
        }
      }
    }
  }, [isEditMode]);

  // ── Cache / restore YAML content via localStorage ─────────────────
  useEffect(() => {
    if (!isEditMode) return;

    const cached = localStorage.getItem(storageKey);
    if (cached !== null) {
      // Restore from cache on reload
      setYamlContent(cached);
      parseAndSetJobs(cached);
    }
  }, [isEditMode, storageKey, parseAndSetJobs]);

  // Persist YAML content to localStorage whenever it changes (edit mode only)
  useEffect(() => {
    if (!isEditMode || !yamlContent) return;
    localStorage.setItem(storageKey, yamlContent);
  }, [yamlContent, isEditMode, storageKey]);

  // ── Load workflow on mount ────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        // If in edit mode and we have a cached version, skip DB load
        if (isEditMode) {
          const cached = localStorage.getItem(storageKey);
          if (cached !== null) {
            // Entity is needed for the pipeline; load from DB but keep
            // cached YAML as the editor content
            const entity = await bflowDB.workflowTemplates.get(workflowId);
            if (cancelled) return;
            if (entity) {
              setWorkflow(entity);
            }
            setLoading(false);
            return;
          }
        }

        const entity = await bflowDB.workflowTemplates.get(workflowId);
        if (cancelled) return;

        if (!entity) {
          setError(`Workflow "${workflowId}" not found.`);
          setLoading(false);
          return;
        }

        setWorkflow(entity);
        // Only set YAML from DB if not restoring from cache
        if (!isEditMode || !localStorage.getItem(storageKey)) {
          setYamlContent(entity.templateYaml);
          parseAndSetJobs(entity.templateYaml);
        }
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load workflow template",
          );
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [workflowId, isEditMode, storageKey, parseAndSetJobs]);

  // ── Interactive mode data change handler ──────────────────────────
  // Receives the interactive form data and serializes it to YAML,
  // updating both the yamlContent (for save/test-run) and parsed jobs.
  const handleInteractiveDataChange = useCallback(
    (_data: BFlowInteractiveWorkflowData, yaml: string) => {
      setYamlContent(yaml);
      parseAndSetJobs(yaml);
    },
    [parseAndSetJobs],
  );

  // ── YAML change handler (Monaco editor changes) ────────────────────
  const handleYamlChange = useCallback(
    (value: string | undefined) => {
      const newYaml = value ?? "";
      setYamlContent(newYaml);
      parseAndSetJobs(newYaml);
    },
    [parseAndSetJobs],
  );

  // ── Validate YAML against workflow schema ────────────────────────
  const validateWorkflowYaml = useCallback((yaml: string): string | null => {
    try {
      const parsed = parseYaml(yaml);
      const result = BFlowWorkflowSchema.safeParse(parsed);
      if (!result.success) {
        const details = result.error.issues
          .map((issue) => {
            const path =
              issue.path.length > 0 ? issue.path.join(".") : "(root)";
            return `  • ${path}: ${issue.message}`;
          })
          .join("\n");
        return `Workflow YAML validation failed:\n${details}`;
      }
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : "Invalid YAML syntax";
    }
  }, []);

  // ── Save handler ──────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!workflow) return;

    setSaveStatus("saving");
    setYamlError(null);

    try {
      // In interactive mode, YAML is already serialized — skip validation
      if (!interactiveMode) {
        // Validate YAML before saving (only in YAML editor mode)
        parseYaml(yamlContent);
      }

      const now = new Date();
      await bflowDB.workflowTemplates.update(workflowId, {
        templateYaml: yamlContent,
        updatedAt: now,
      } as Partial<BFlowWorkflowTemplateEntity>);

      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (err) {
      setYamlError(
        err instanceof Error ? err.message : "Failed to save workflow",
      );
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  }, [workflow, workflowId, yamlContent, interactiveMode]);

  // ── Derived pipeline entity for test run ──────────────────────────
  // Injects the selected prompt builder kind into metadata so the
  // test-run hook (useBFlowTestRun) picks up the correct strategy.

  const pipelineEntity = useMemo(
    () =>
      workflow
        ? {
            id: workflow.id,
            flowId: workflow.flowId,
            templateId: workflow.id,
            variableGroupId: "",
            name: workflow.name,
            slug: workflow.slug,
            description: workflow.description,
            prompt: workflow.template?.name,
            variables: [],
            version: 1,
            versionLabel: workflow.version,
            status: "running" as const,
            metadata: {
              ...(workflow.metadata ?? {}),
              promptBuilderKind,
            } as Record<string, unknown>,
            createdAt: workflow.createdAt,
            updatedAt: workflow.updatedAt,
          }
        : undefined,
    [workflow, promptBuilderKind],
  );

  const currentJobs = useMemo(() => parsedJobs, [parsedJobs]);
  const currentJob = currentJobs[selectedJobIndex];

  // ── Resolve workflow variables from the LIVE YAML ─────────────────
  // Reads `parsedVariables` (parsed from yamlContent) so that test runs
  // reflect unsaved edits to the `variables:` block. Falls back to the
  // persisted entity's variables when the live YAML hasn't been parsed
  // yet (e.g. initial load before parseAndSetJobs runs).
  const resolvedVariables: BFlowPipelineVariable[] = useMemo(() => {
    const source =
      parsedVariables.length > 0
        ? parsedVariables
        : (workflow?.template?.variables ?? []);
    if (source.length === 0) return [];
    return source.map((v) => ({
      id: v.id ?? `studio-${v.name}`,
      name: v.name,
      value: v.value ?? "", // `value` replaces legacy `defaultValue`
      type: v.type ?? "text",
      description: v.description,
    }));
  }, [parsedVariables, workflow?.template?.variables]);

  // ── Test Run hook (in-memory only — no DB writes) ────────────────
  const {
    testRun,
    testJobRuns,
    testStepRuns,
    isTestRunning,
    testError,
    rerunningSteps,
    startTestRun,
    rerunStep,
    clearTestRun,
  } = useBFlowTestRun(pipelineEntity, workflow, currentJobs, resolvedVariables);

  const hasTestRunResult = testRun !== undefined;

  // ── Test Run with pre-validation ─────────────────────────────────
  const handleTestRun = useCallback(async () => {
    // In interactive mode, skip YAML validation — the form
    // serializes to valid YAML automatically
    if (!interactiveMode) {
      // Validate YAML against Zod schema before running
      const validationError = validateWorkflowYaml(yamlContent);
      if (validationError) {
        setYamlError(validationError);
        return;
      }
    }
    // Clear previous validation error and run
    setYamlError(null);
    await startTestRun();
  }, [yamlContent, validateWorkflowYaml, startTestRun, interactiveMode]);

  // ── Effective run data (prefers test run) ─────────────────────────
  const currentJobRunEffective = useMemo<BFlowJobRun | undefined>(() => {
    if (!hasTestRunResult) return undefined;
    const jobKey = currentJob?.id || currentJob?.name;
    return jobKey ? testJobRuns.find((jr) => jr.jobId === jobKey) : undefined;
  }, [hasTestRunResult, currentJob, testJobRuns]);

  const currentStepRunsEffective = useMemo<BFlowStepRun[]>(() => {
    if (!hasTestRunResult) return [];
    return (
      testStepRuns?.filter(
        (sr) => sr.jobRunId === currentJobRunEffective?.id,
      ) ?? []
    );
  }, [hasTestRunResult, testStepRuns, currentJobRunEffective?.id]);

  // ── Reset job selection when jobs change ─────────────────────────
  useEffect(() => {
    setSelectedJobIndex(0);
  }, [yamlContent]);

  // ── Render states ─────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-default-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-default-400 animate-spin" />
          <p className="text-sm text-default-500">Loading workflow...</p>
        </div>
      </div>
    );
  }

  if (error || !workflow) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-default-50 flex items-center justify-center">
        <div className="bg-danger-50 border border-danger-200 rounded-2xl p-8 text-center max-w-md">
          <XCircle className="w-12 h-12 text-danger mx-auto mb-4" />
          <h2 className="text-lg font-bold text-danger-700 mb-2">
            Failed to Load
          </h2>
          <p className="text-sm text-danger-500 mb-4">
            {error ?? "Workflow not found"}
          </p>
          <Button
            onPress={() => router.back()}
            variant="ghost"
            size="sm"
            className="text-danger-700 bg-danger-50 hover:bg-danger-100"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-default-50 flex flex-col">
      {/* ═══════════════════════════════════════════════════════════════
           HEADER — Back, title, action buttons
           ═══════════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b border-default-100">
        <div className="px-2 md:px-3 py-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            {/* Left: Back + Title */}
            <div className="flex items-center gap-3 min-w-0">
              <Button
                onPress={() => router.back()}
                variant="ghost"
                size="sm"
                className="text-default-400"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back</span>
              </Button>
              <div className="min-w-0">
                <h1 className="text-base md:text-lg font-bold text-foreground truncate">
                  Workflow Studio
                </h1>
                <p className="text-xs text-default-400 truncate">
                  {workflow.name} — {workflow.slug}
                </p>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              {/* Save status indicator */}
              {saveStatus === "saved" && (
                <span className="flex items-center gap-1 text-xs text-success font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Saved
                </span>
              )}
              {saveStatus === "error" && (
                <span className="flex items-center gap-1 text-xs text-danger font-medium">
                  <XCircle className="w-3.5 h-3.5" />
                  Save Failed
                </span>
              )}

              {/* ── Prompt Builder Mode Selector ─────────────────────── */}
              <div className="flex items-center bg-default-100 rounded-lg p-0.5 border border-default-200">
                <button
                  onClick={() =>
                    setPromptBuilderKind(BFlowPromptBuilderKind.Section)
                  }
                  className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                    promptBuilderKind === BFlowPromptBuilderKind.Section
                      ? "bg-background text-default-800 shadow-sm"
                      : "text-default-500 hover:text-default-700"
                  }`}
                  title="Fluent section-based prompt builder"
                >
                  Default
                </button>
                <button
                  onClick={() =>
                    setPromptBuilderKind(BFlowPromptBuilderKind.TemplateBar)
                  }
                  className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                    promptBuilderKind === BFlowPromptBuilderKind.TemplateBar
                      ? "bg-background text-default-800 shadow-sm"
                      : "text-default-500 hover:text-default-700"
                  }`}
                  title="Handlebars template-driven prompt builder"
                >
                  TemplateBar
                </button>
              </div>

              {/* ── Generative Menu Select ──────────────────────────── */}
              <Select
                className="min-w-[150px] max-h-9 [&_[data-slot=trigger]]:min-h-0 [&_[data-slot=trigger]]:h-8 [&_[data-slot=trigger]]:py-0 [&_[data-slot=trigger]]:text-xs"
                value={generativeMenuOption}
                onChange={(val) =>
                  setGenerativeMenuOption(val as GenerativeMenuOption)
                }
                placeholder="✦ AI Generate"
              >
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    <ListBox.Item
                      key="agent-swarm"
                      id="agent-swarm"
                      textValue="Agent Swarm"
                    >
                      <div className="flex items-center gap-2">
                        <Brain className="w-4 h-4 text-violet-500" />
                        <div>
                          <span className="text-sm font-medium">
                            Agent Swarm
                          </span>
                          <p className="text-xs text-default-400">
                            Generate AI agents from config
                          </p>
                        </div>
                      </div>
                    </ListBox.Item>
                    <ListBox.Item
                      key="generate-jobs"
                      id="generate-jobs"
                      textValue="Generate Jobs"
                    >
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-primary-500" />
                        <div>
                          <span className="text-sm font-medium">
                            Generate Jobs
                          </span>
                          <p className="text-xs text-default-400">
                            Create job definitions from config
                          </p>
                        </div>
                      </div>
                    </ListBox.Item>
                    <ListBox.Item
                      key="generate-steps"
                      id="generate-steps"
                      textValue="Generate Steps"
                    >
                      <div className="flex items-center gap-2">
                        <ListTree className="w-4 h-4 text-teal-500" />
                        <div>
                          <span className="text-sm font-medium">
                            Generate Steps
                          </span>
                          <p className="text-xs text-default-400">
                            Create steps and assign agents
                          </p>
                        </div>
                      </div>
                    </ListBox.Item>
                  </ListBox>
                </Select.Popover>
              </Select>

              {/* ── Interactive Mode Toggle ─────────────────────────── */}
              <div className="flex items-center bg-default-100 rounded-lg p-0.5 border border-default-200">
                <button
                  onClick={() => setInteractiveMode(false)}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                    !interactiveMode
                      ? "bg-background text-default-800 shadow-sm"
                      : "text-default-500 hover:text-default-700"
                  }`}
                  title="Standard YAML code editor"
                >
                  <Code className="w-3.5 h-3.5 inline-block mr-1" />
                  Code
                </button>
                <button
                  onClick={() => setInteractiveMode(true)}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                    interactiveMode
                      ? "bg-background text-default-800 shadow-sm"
                      : "text-default-500 hover:text-default-700"
                  }`}
                  title="Interactive form-based workflow builder"
                >
                  <PenTool className="w-3.5 h-3.5 inline-block mr-1" />
                  Interactive
                </button>
              </div>

              {/* Guide Button */}
              <Button
                onPress={() => setIsGuideOpen(true)}
                variant="ghost"
                size="sm"
                className="font-medium"
              >
                <FileText className="w-4 h-4" />
                Guide
              </Button>

              {/* Test Run Button — validates YAML against Zod schema before running */}
              <Button
                onPress={handleTestRun}
                isDisabled={isTestRunning || !!yamlError}
                variant="ghost"
                size="sm"
                className="font-medium border border-violet-200 text-violet-700 bg-violet-50 hover:bg-violet-100 data-[hover=true]:bg-violet-100"
              >
                {isTestRunning ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Beaker className="w-4 h-4" />
                )}
                {isTestRunning ? "Testing..." : "Test Workflow"}
              </Button>

              {/* Save Button */}
              <Button
                onPress={handleSave}
                isDisabled={saveStatus === "saving" || !!yamlError}
                variant="primary"
                size="sm"
              >
                {saveStatus === "saving" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {saveStatus === "saving" ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>

          {/* YAML error banner */}
          {yamlError && (
            <div className="mt-2 flex items-start gap-2 p-2.5 bg-danger-50 border border-danger-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
              <p className="text-xs text-danger-700">{yamlError}</p>
            </div>
          )}

          {/* Test Run banner */}
          {hasTestRunResult && (
            <div className="mt-2">
              <BFlowTestRunBanner
                status={testRun?.status}
                onClearTestRun={clearTestRun}
              />
            </div>
          )}

          {/* Test error */}
          {testError && !hasTestRunResult && (
            <div className="mt-2 bg-danger-50 border border-danger-200 rounded-xl p-3 flex items-center gap-2">
              <XCircle className="w-4 h-4 text-danger flex-shrink-0" />
              <p className="text-xs text-danger">{testError}</p>
            </div>
          )}
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════
           BODY — Two-panel layout
           ═══════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col lg:flex-row gap-0 overflow-hidden">
        {/* ─── LEFT PANEL — Monaco YAML Editor or Interactive Form ── */}
        <div className="w-full lg:w-1/2 flex flex-col border-b lg:border-b-0 lg:border-r border-default-100">
          {interactiveMode ? (
            <>
              <div className="px-4 py-2 bg-default-50 border-b border-default-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-default-500 uppercase tracking-wider">
                  Interactive Builder
                </span>
                <span className="text-[10px] text-default-400 font-mono">
                  {parsedJobs.length} job{parsedJobs.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex-1 min-h-[50vh] lg:min-h-0">
                <BFlowWorkflowInteractive
                  initialYaml={yamlContent}
                  onDataChange={handleInteractiveDataChange}
                  agentPools={interactiveAgentPools}
                />
              </div>
            </>
          ) : (
            <>
              <div className="px-4 py-2 bg-default-50 border-b border-default-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-default-500 uppercase tracking-wider">
                  YAML Editor
                </span>
                <span className="text-[10px] text-default-400 font-mono">
                  {yamlContent.split("\n").length} lines
                </span>
              </div>
              <div className="flex-1 min-h-[50vh] lg:min-h-0">
                <MonacoEditor
                  height="100%"
                  defaultLanguage="yaml"
                  language="yaml"
                  theme="vs-light"
                  value={yamlContent}
                  onChange={handleYamlChange}
                  options={{
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    fontSize: 13,
                    lineNumbers: "on",
                    automaticLayout: true,
                    tabSize: 2,
                    wordWrap: "on",
                    formatOnPaste: true,
                    renderWhitespace: "selection",
                    bracketPairColorization: { enabled: true },
                    padding: { top: 12 },
                  }}
                />
              </div>
            </>
          )}
        </div>

        {/* ─── RIGHT PANEL — Pipeline Display ──────────────────────── */}
        <div className="w-full lg:w-1/2 flex flex-col overflow-hidden">
          <div className="px-4 py-2 bg-default-50 border-b border-default-100">
            <h2 className="text-xs font-semibold text-default-500 uppercase tracking-wider">
              Pipeline Display
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            {currentJobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <Beaker className="w-12 h-12 text-default-200 mx-auto mb-4" />
                <p className="text-default-400 text-sm">
                  {yamlError
                    ? "Fix YAML syntax to see pipeline jobs"
                    : "No jobs defined in the workflow YAML"}
                </p>
                <p className="text-default-300 text-xs mt-1">
                  Define jobs under the <code>jobs:</code> key
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* ── Job Tabs ────────────────────────────────────────── */}
                <div className="flex flex-wrap gap-1.5">
                  {currentJobs.filter(Boolean).map((job, index) => {
                    const jobKey = job.id || job.name;
                    const jobRun = hasTestRunResult
                      ? testJobRuns.find((jr) => jr.jobId === jobKey)
                      : undefined;
                    const cfg = getStatusConfig(jobRun?.status);

                    return (
                      <button
                        key={job.id ?? `job-${index}`}
                        onClick={() => setSelectedJobIndex(index)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                          index === selectedJobIndex
                            ? "bg-primary-50 border-primary-200 text-primary-700 shadow-sm"
                            : "bg-background border-default-200 text-default-600 hover:bg-default-50"
                        }`}
                      >
                        {jobRun && (
                          <span className={cfg.color}>{cfg.icon}</span>
                        )}
                        {job.name}
                        <span className="text-default-400 font-normal">
                          ({(job.steps ?? []).length})
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* ── Current Job Steps ──────────────────────────────── */}
                {currentJob && (
                  <div>
                    {/* Job header */}
                    <div className="bg-background rounded-xl border border-default-100 p-4 mb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-bold text-foreground">
                            {currentJob.name}
                          </h3>
                          <p className="text-xs text-default-400">
                            {(currentJob.steps ?? []).length} step
                            {(currentJob.steps ?? []).length !== 1 ? "s" : ""}
                            {currentJob.agent
                              ? ` • Agent: ${currentJob.agent}`
                              : ""}
                            {currentJobRunEffective?.status && (
                              <>
                                {" • "}
                                {
                                  getStatusConfig(currentJobRunEffective.status)
                                    .label
                                }
                              </>
                            )}
                          </p>
                        </div>
                        {currentJobRunEffective && (
                          <BFlowStatusBadge
                            status={currentJobRunEffective.status}
                          />
                        )}
                      </div>

                      {currentJob.needs && (
                        <div className="mt-2 bg-warning-50 border border-warning-200 rounded-lg p-2 flex items-center gap-1.5 text-xs">
                          <span className="text-warning-600 font-medium">
                            Depends on:{" "}
                            {Array.isArray(currentJob.needs)
                              ? currentJob.needs.join(", ")
                              : currentJob.needs}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Steps */}
                    <div className="space-y-4">
                      {(currentJob.steps ?? [])
                        .filter(Boolean)
                        .map((step, stepIdx) => {
                          const stepKey = step.id || step.name;
                          const stepRun = hasTestRunResult
                            ? currentStepRunsEffective.find(
                                (sr) => sr.stepId === stepKey,
                              )
                            : undefined;

                          const isStepRerunning = rerunningSteps.has(stepKey);

                          return (
                            <BFlowStepNode
                              key={step.id ?? `step-${stepIdx}-${step.name}`}
                              step={step}
                              stepRun={stepRun}
                              jobName={currentJob.name}
                              isRerunning={isStepRerunning}
                              onRerun={rerunStep}
                              onView={(s, sr) =>
                                setViewStep({ step: s, stepRun: sr })
                              }
                              onViewOutput={(s, sr) =>
                                setViewOutput({ step: s, stepRun: sr })
                              }
                              onViewComputedInputs={(s, sr) =>
                                setViewComputedInputs({ step: s, stepRun: sr })
                              }
                            />
                          );
                        })}

                      {!hasTestRunResult && (
                        <div className="text-center py-8">
                          <Beaker className="w-10 h-10 text-default-200 mx-auto mb-3" />
                          <p className="text-default-400 text-xs">
                            Click &ldquo;Test Workflow&rdquo; to execute
                            in-memory
                          </p>
                        </div>
                      )}
                    </div>

                    {/* ── Job Prompt ────────────────────────────────── */}
                    {currentJob.prompt && (
                      <div className="mt-4 bg-default-50 rounded-xl p-4">
                        <h4 className="text-xs font-semibold text-default-500 uppercase tracking-wider mb-2">
                          Job Prompt
                        </h4>
                        <p className="text-sm text-default-600 whitespace-pre-wrap">
                          {currentJob.prompt}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
           MODALS
           ═══════════════════════════════════════════════════════════════ */}

      {/* Step Details Modal */}
      {viewStep && (
        <BFlowStepDetailsModal
          open={!!viewStep}
          onClose={() => setViewStep(null)}
          step={viewStep.step}
          stepRun={viewStep.stepRun}
          pipelineVariables={resolvedVariables}
        />
      )}

      {/* Output Modal */}
      {viewOutput && (
        <BFlowOutputModal
          open={!!viewOutput}
          onClose={() => setViewOutput(null)}
          step={viewOutput.step}
          stepRun={viewOutput.stepRun}
        />
      )}

      {/* Computed Inputs Modal (shows final resolved prompts) */}
      {viewComputedInputs && (
        <BFlowComputedInputsModal
          open={!!viewComputedInputs}
          onClose={() => setViewComputedInputs(null)}
          step={viewComputedInputs.step}
          stepRun={viewComputedInputs.stepRun}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════════
           GUIDE MODAL — Workflow YAML structure reference
           ═══════════════════════════════════════════════════════════════ */}

      <Modal.Backdrop
        isOpen={isGuideOpen}
        onClick={() => setIsGuideOpen(false)}
      >
        <Modal.Container>
          <Modal.Dialog
            className="max-w-3xl max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <Modal.CloseTrigger onClick={() => setIsGuideOpen(false)} />
            <Modal.Header>
              <Modal.Heading>
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-default-500" />
                  <span className="text-lg font-semibold text-foreground">
                    Workflow YAML Guide
                  </span>
                </div>
              </Modal.Heading>
              <p className="text-sm text-default-400 mt-0.5">
                Reference for the workflow YAML structure
              </p>
            </Modal.Header>

            <Modal.Body className="overflow-y-auto max-h-[70vh]">
              <BFlowWorkflowGuidePanel />
            </Modal.Body>

            <Modal.Footer>
              <Button
                variant="outline"
                className="w-full"
                onPress={() => setIsGuideOpen(false)}
              >
                Close
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      {/* ═══════════════════════════════════════════════════════════════
           GENERATIVE MENU MODALS — AgentSwarm, GenerateJobs, GenerateSteps
           ═══════════════════════════════════════════════════════════════ */}

      {/* Agent Swarm Modal */}
      <AgentSwarmModal
        open={generativeMenuOption === "agent-swarm"}
        yamlContent={yamlContent}
        jobs={currentJobs}
        onYamlUpdate={handleGenerativeYamlUpdate}
        onClose={() => setGenerativeMenuOption(null)}
      />

      {/* Generate Jobs Modal */}
      <GenerateJobsModal
        open={generativeMenuOption === "generate-jobs"}
        yamlContent={yamlContent}
        jobs={currentJobs}
        onYamlUpdate={handleGenerativeYamlUpdate}
        onClose={() => setGenerativeMenuOption(null)}
      />

      {/* Generate Steps Modal */}
      <GenerateStepsModal
        open={generativeMenuOption === "generate-steps"}
        yamlContent={yamlContent}
        jobs={currentJobs}
        onYamlUpdate={handleGenerativeYamlUpdate}
        onClose={() => setGenerativeMenuOption(null)}
      />
    </div>
  );
}
