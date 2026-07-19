/**
 * BFlowWorkflowInteractive — Interactive workflow builder.
 *
 * Replaces the Monaco YAML editor with a form-based interactive UI using
 * heroUI components. Users can manage workflow metadata, agents, jobs,
 * steps, and reports through modals and direct input fields.
 *
 * ─── Agent Pool Integration ──────────────────────────────────────────
 * When `agentPools` are provided, the Agents section gains a "Fill from
 * Pool" action that expands agent pool template data into concrete agent
 * entries in the workflow YAML. Each pool generates N agents (based on
 * `agentCount`), carrying the pool's slug into the `agentPools: []` field.
 *
 * When interactive mode is active:
 *  - YAML validation is skipped
 *  - The Monaco editor is hidden
 *  - This component renders in the left panel instead
 *  - Changes are serialized to YAML on save
 */

"use client";

import React, { useCallback, useId, useMemo, useState } from "react";
import { Button, Card, Input, Label, TextArea, Select, ListBox } from "@heroui/react";
import {
  Brain,
  Edit3,
  FileText,
  Eye,
  Layers,
  List,
  Plus,
  Settings2,
  Trash2,
  Users,
  Variable,
  Workflow,
} from "lucide-react";
import { v7 as uuidv7 } from "uuid";

import type {
  BFlowInteractiveWorkflowData,
  BFlowInteractiveJob,
  BFlowInteractiveStep,
  BFlowInteractiveAgent,
  BFlowInteractiveVariable,
  BFlowInteractiveReport,
  BFlowInteractiveAgentPool,
} from "./BFlowWorkflowInteractive.Types";
import {
  BFLOW_DEFAULT_STEP,
  BFLOW_DEFAULT_JOB,
  BFLOW_DEFAULT_AGENT,
  BFLOW_DEFAULT_VARIABLE,
  BFLOW_DEFAULT_REPORT,
} from "./BFlowWorkflowInteractive.Types";
import type { BFlowWorkflowInteractiveProps } from "./BFlowWorkflowInteractive.Types";
import { parseBflowInteractive } from "./parseBflowInteractive";
import { serializeBflowInteractive } from "./serializeBflowInteractive";
import { BFlowSectionHeader } from "./BFlowWorkflowInteractive.SectionHeader";
import { BFlowEmptyState } from "./BFlowWorkflowInteractive.EmptyState";
import { BFlowCollapsibleCard } from "./BFlowWorkflowInteractive.CollapsibleCard";
import { BFlowStepFormModal } from "./BFlowWorkflowInteractive.StepFormModal";
import { BFlowJobFormModal } from "./BFlowWorkflowInteractive.JobFormModal";
import { BFlowAgentFormModal } from "./BFlowWorkflowInteractive.AgentFormModal";
import { BFlowVariableFormModal } from "./BFlowWorkflowInteractive.VariableFormModal";
import { BFlowReportFormModal } from "./BFlowWorkflowInteractive.ReportFormModal";

// ═══════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════

/**
 * Generate workflow agent entries from an agent pool template.
 * Creates N agents (based on pool.agentCount) with names derived from
 * the pool slug, and fills prompt/role from the pool template data.
 *
 * When the pool carries actual agent records (`pool.agents`), those are
 * used directly instead of generating synthetic entries. This ensures
 * the real agent names, roles, and prompts from the pool are used.
 */
function generateAgentsFromPool(
  pool: BFlowInteractiveAgentPool,
): BFlowInteractiveAgent[] {
  // Use actual pool agent records when available
  if (pool.agents && pool.agents.length > 0) {
    return pool.agents.map((a) => ({
      id: a.id ?? uuidv7(),
      name: a.name,
      role: a.role,
      prompt: a.prompt,
    }));
  }

  // Fallback: generate synthetic agents from the pool template
  const count = Math.max(1, pool.agentCount);
  const agents: BFlowInteractiveAgent[] = [];

  for (let i = 0; i < count; i++) {
    const suffix = count > 1 ? `-${i + 1}` : "";
    const name = `${pool.slug}${suffix}`;
    agents.push({
      id: uuidv7(),
      name,
      role: pool.template.provider
        ? `${pool.template.provider} agent`
        : `Agent from pool "${pool.name}"`,
      prompt:
        pool.template.systemPrompt ||
        `You are an AI agent from the "${pool.name}" pool. Execute your assigned tasks with precision and expertise.`,
    });
  }

  return agents;
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export default function BFlowWorkflowInteractive({
  initialYaml,
  onDataChange,
  agentPools = [],
}: BFlowWorkflowInteractiveProps) {
  const [data, setData] = useState<BFlowInteractiveWorkflowData>(() =>
    parseBflowInteractive(initialYaml),
  );

  // Generate unique IDs for ARIA labeling of metadata form fields
  const workflowNameLabelId = useId();
  const semanticVersionLabelId = useId();
  const descriptionLabelId = useId();

  // ── Modal states ──────────────────────────────────────────────
  const [jobModal, setJobModal] = useState<{
    open: boolean;
    job: BFlowInteractiveJob;
    index?: number;
  }>({ open: false, job: { ...BFLOW_DEFAULT_JOB } });

  const [stepModal, setStepModal] = useState<{
    open: boolean;
    step: BFlowInteractiveStep;
    jobIndex: number;
    stepIndex?: number;
  }>({ open: false, step: { ...BFLOW_DEFAULT_STEP }, jobIndex: -1 });

  const [agentModal, setAgentModal] = useState<{
    open: boolean;
    agent: BFlowInteractiveAgent;
    index?: number;
  }>({ open: false, agent: { ...BFLOW_DEFAULT_AGENT } });

  const [variableModal, setVariableModal] = useState<{
    open: boolean;
    variable: BFlowInteractiveVariable;
    index?: number;
  }>({ open: false, variable: { ...BFLOW_DEFAULT_VARIABLE } });

  const [reportModal, setReportModal] = useState<{
    open: boolean;
    report: BFlowInteractiveReport;
    index?: number;
  }>({ open: false, report: { ...BFLOW_DEFAULT_REPORT } });

  // ── Agent Pool state ──────────────────────────────────────────
  const [selectedPoolSlug, setSelectedPoolSlug] = useState<string>("");

  // ── Derived values ────────────────────────────────────────────
  const agentNames = useMemo(
    () => data.agents.map((a) => a.name).filter(Boolean),
    [data.agents],
  );

  // ── Emit changes ──────────────────────────────────────────────
  const emitChange = useCallback(
    (newData: BFlowInteractiveWorkflowData) => {
      setData(newData);
      const yaml = serializeBflowInteractive(newData);
      onDataChange(newData, yaml);
    },
    [onDataChange],
  );

  // ── Metadata handlers ─────────────────────────────────────────
  const updateMeta = useCallback(
    (field: string, value: string) => {
      const newData = { ...data, [field]: value };
      emitChange(newData);
    },
    [data, emitChange],
  );

  // ── Variable handlers ─────────────────────────────────────────
  const openAddVariable = useCallback(() => {
    setVariableModal({
      open: true,
      variable: { ...BFLOW_DEFAULT_VARIABLE },
    });
  }, []);

  const handleEditVariable = useCallback(
    (index: number) => {
      const v = data.variables[index];
      if (v) {
        setVariableModal({ open: true, variable: { ...v }, index });
      }
    },
    [data.variables],
  );

  const saveVariable = useCallback(
    (variable: BFlowInteractiveVariable) => {
      const newData = { ...data };
      if (variableModal.index !== undefined) {
        newData.variables = [...data.variables];
        newData.variables[variableModal.index] = variable;
      } else {
        newData.variables = [...data.variables, variable];
      }
      emitChange(newData);
    },
    [data, variableModal.index, emitChange],
  );

  const removeVariable = useCallback(
    (index: number) => {
      const newData = { ...data };
      newData.variables = data.variables.filter((_, i) => i !== index);
      emitChange(newData);
    },
    [data, emitChange],
  );

  // ── Agent handlers ────────────────────────────────────────────
  const openAddAgent = useCallback(() => {
    setAgentModal({ open: true, agent: { ...BFLOW_DEFAULT_AGENT } });
  }, []);

  const handleEditAgent = useCallback(
    (index: number) => {
      const a = data.agents[index];
      if (a) {
        setAgentModal({ open: true, agent: { ...a }, index });
      }
    },
    [data.agents],
  );

  const saveAgent = useCallback(
    (agent: BFlowInteractiveAgent) => {
      const newData = { ...data };
      if (agentModal.index !== undefined) {
        newData.agents = [...data.agents];
        newData.agents[agentModal.index] = agent;
      } else {
        newData.agents = [...data.agents, agent];
      }
      emitChange(newData);
    },
    [data, agentModal.index, emitChange],
  );

  const removeAgent = useCallback(
    (index: number) => {
      const newData = { ...data };
      newData.agents = data.agents.filter((_, i) => i !== index);
      emitChange(newData);
    },
    [data, emitChange],
  );

  // ── Agent Pool — Fill from Pool ───────────────────────────────
  const handleFillFromPool = useCallback(() => {
    if (!selectedPoolSlug) return;

    const pool = agentPools.find((p) => p.slug === selectedPoolSlug);
    if (!pool) return;

    const newAgents = generateAgentsFromPool(pool);

    // Avoid adding duplicates (same agent name already exists)
    const existingNames = new Set(data.agents.map((a) => a.name));
    const uniqueNewAgents = newAgents.filter(
      (a) => !existingNames.has(a.name),
    );

    if (uniqueNewAgents.length === 0) return;

    const newData = { ...data };
    newData.agents = [...data.agents, ...uniqueNewAgents];
    // Track which pool was used
    if (!newData.agentPoolSlugs.includes(pool.slug)) {
      newData.agentPoolSlugs = [...newData.agentPoolSlugs, pool.slug];
    }
    emitChange(newData);

    // Reset selection
    setSelectedPoolSlug("");
  }, [selectedPoolSlug, agentPools, data, emitChange]);

  // ── Job handlers ──────────────────────────────────────────────
  const openAddJob = useCallback(() => {
    setJobModal({ open: true, job: { ...BFLOW_DEFAULT_JOB } });
  }, []);

  const handleEditJob = useCallback(
    (index: number) => {
      const j = data.jobs[index];
      if (j) {
        setJobModal({ open: true, job: { ...j }, index });
      }
    },
    [data.jobs],
  );

  const saveJob = useCallback(
    (job: BFlowInteractiveJob) => {
      const newData = { ...data };
      if (jobModal.index !== undefined) {
        newData.jobs = [...data.jobs];
        newData.jobs[jobModal.index] = job;
      } else {
        newData.jobs = [...data.jobs, job];
      }
      emitChange(newData);
    },
    [data, jobModal.index, emitChange],
  );

  const removeJob = useCallback(
    (index: number) => {
      const newData = { ...data };
      newData.jobs = data.jobs.filter((_, i) => i !== index);
      emitChange(newData);
    },
    [data, emitChange],
  );

  // ── Step handlers ─────────────────────────────────────────────
  const openAddStep = useCallback((jobIndex: number) => {
    setStepModal({
      open: true,
      step: { ...BFLOW_DEFAULT_STEP },
      jobIndex,
    });
  }, []);

  const handleEditStep = useCallback(
    (jobIndex: number, stepIndex: number) => {
      const s = data.jobs[jobIndex]?.steps[stepIndex];
      if (s) {
        setStepModal({
          open: true,
          step: { ...s },
          jobIndex,
          stepIndex,
        });
      }
    },
    [data.jobs],
  );

  const saveStep = useCallback(
    (step: BFlowInteractiveStep) => {
      const newData = { ...data };
      const jobIdx = stepModal.jobIndex;
      if (jobIdx < 0 || jobIdx >= newData.jobs.length) return;

      newData.jobs = [...data.jobs];
      newData.jobs[jobIdx] = { ...newData.jobs[jobIdx] };

      if (stepModal.stepIndex !== undefined) {
        const steps = [...newData.jobs[jobIdx].steps];
        steps[stepModal.stepIndex] = step;
        newData.jobs[jobIdx].steps = steps;
      } else {
        newData.jobs[jobIdx].steps = [...newData.jobs[jobIdx].steps, step];
      }
      emitChange(newData);
    },
    [data, stepModal.jobIndex, stepModal.stepIndex, emitChange],
  );

  const removeStep = useCallback(
    (jobIndex: number, stepIndex: number) => {
      const newData = { ...data };
      newData.jobs = [...data.jobs];
      newData.jobs[jobIndex] = { ...newData.jobs[jobIndex] };
      newData.jobs[jobIndex].steps = newData.jobs[jobIndex].steps.filter(
        (_, i) => i !== stepIndex,
      );
      emitChange(newData);
    },
    [data, emitChange],
  );

  // ── Report handlers ───────────────────────────────────────────
  const openAddReport = useCallback(() => {
    setReportModal({ open: true, report: { ...BFLOW_DEFAULT_REPORT } });
  }, []);

  const handleEditReport = useCallback(
    (index: number) => {
      const r = data.reports[index];
      if (r) {
        setReportModal({ open: true, report: { ...r }, index });
      }
    },
    [data.reports],
  );

  const saveReport = useCallback(
    (report: BFlowInteractiveReport) => {
      const newData = { ...data };
      if (reportModal.index !== undefined) {
        newData.reports = [...data.reports];
        newData.reports[reportModal.index] = report;
      } else {
        newData.reports = [...data.reports, report];
      }
      emitChange(newData);
    },
    [data, reportModal.index, emitChange],
  );

  const removeReport = useCallback(
    (index: number) => {
      const newData = { ...data };
      newData.reports = data.reports.filter((_, i) => i !== index);
      emitChange(newData);
    },
    [data, emitChange],
  );

  // ── YAML Preview ──────────────────────────────────────────────
  const [showYamlPreview, setShowYamlPreview] = useState(false);
  const currentYaml = useMemo(() => serializeBflowInteractive(data), [data]);

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Interactive Form Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* ── Metadata Section ────────────────────────────────────── */}
        <Card className="border border-default-100 bg-background shadow-sm">
          <div className="px-4 py-3 border-b border-default-50">
            <BFlowSectionHeader
              icon={<Settings2 className="w-4 h-4" />}
              title="Workflow Settings"
            />
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label
                  id={workflowNameLabelId}
                  className="text-xs font-medium text-default-600"
                >
                  Workflow Name
                </Label>
                <Input
                  aria-labelledby={workflowNameLabelId}
                  placeholder="My Workflow"
                  value={data.name}
                  onChange={(e) => updateMeta("name", e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label
                  id={semanticVersionLabelId}
                  className="text-xs font-medium text-default-600"
                >
                  Semantic Version
                </Label>
                <Input
                  aria-labelledby={semanticVersionLabelId}
                  placeholder="1.0.0"
                  value={data.semanticVersion}
                  onChange={(e) =>
                    updateMeta("semanticVersion", e.target.value)
                  }
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label
                id={descriptionLabelId}
                className="text-xs font-medium text-default-600"
              >
                Description
              </Label>
              <TextArea
                aria-labelledby={descriptionLabelId}
                placeholder="Describe the workflow purpose"
                value={data.description}
                onChange={(e) => updateMeta("description", e.target.value)}
                className="min-h-[60px]"
              />
            </div>
          </div>
        </Card>

        {/* ── Variables Section ───────────────────────────────────── */}
        <Card className="border border-default-100 bg-background shadow-sm">
          <div className="px-4 py-3 border-b border-default-50">
            <BFlowSectionHeader
              icon={<Variable className="w-4 h-4" />}
              title="Variables"
              count={data.variables.length}
              onAdd={openAddVariable}
              addLabel="Add Variable"
            />
          </div>
          <div className="p-4">
            {data.variables.length === 0 ? (
              <BFlowEmptyState
                icon={<Variable className="w-8 h-8" />}
                message="No variables defined yet"
                action="Add Variable"
                onAction={openAddVariable}
              />
            ) : (
              <div className="space-y-2">
                {data.variables.map((v, idx) => (
                  <BFlowCollapsibleCard
                    key={`var-${idx}`}
                    title={v.name || `Variable ${idx + 1}`}
                    subtitle={`${v.type} = ${v.value}`}
                    onEdit={() => handleEditVariable(idx)}
                    onRemove={() => removeVariable(idx)}
                  >
                    <div className="grid grid-cols-2 gap-2 text-xs text-default-500">
                      <div>
                        <span className="font-medium">Type:</span> {v.type}
                      </div>
                      <div>
                        <span className="font-medium">Value:</span> {v.value}
                      </div>
                      {v.description && (
                        <div className="col-span-2">
                          <span className="font-medium">Description:</span>{" "}
                          {v.description}
                        </div>
                      )}
                    </div>
                  </BFlowCollapsibleCard>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* ── Agents Section ──────────────────────────────────────── */}
        <Card className="border border-default-100 bg-background shadow-sm">
          <div className="px-4 py-3 border-b border-default-50">
            <BFlowSectionHeader
              icon={<Brain className="w-4 h-4" />}
              title="Agents"
              count={data.agents.length}
              onAdd={openAddAgent}
              addLabel="Add Agent"
            />
          </div>
          <div className="p-4 space-y-3">
            {/* ── Agent Pool Fill (only if pools are available) ──── */}
            {agentPools.length > 0 && (
              <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-violet-700">
                  <Users className="w-3.5 h-3.5" />
                  Fill from Agent Pool
                </div>
                <p className="text-[10px] text-violet-500">
                  Select a pool to load its agents into the workflow. Pool
                  slug will be recorded in{" "}
                  <code className="font-mono">agentPools</code>.
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Select
                      value={selectedPoolSlug}
                      onChange={(val) =>
                        setSelectedPoolSlug(val as string)
                      }
                      placeholder="Choose a pool..."
                      className="[&_[data-slot=trigger]]:min-h-0 [&_[data-slot=trigger]]:h-8 [&_[data-slot=trigger]]:py-0 [&_[data-slot=trigger]]:text-xs"
                    >
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          {agentPools.map((pool) => {
                            const hasRealAgents =
                              pool.agents && pool.agents.length > 0;
                            const agentCount = hasRealAgents
                              ? pool.agents!.length
                              : pool.agentCount;
                            return (
                              <ListBox.Item
                                key={pool.slug}
                                id={pool.slug}
                                textValue={pool.name}
                              >
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium">
                                    {pool.name}
                                  </span>
                                  <span className="text-xs text-default-400">
                                    {pool.slug} — {agentCount} agent
                                    {agentCount !== 1 ? "s" : ""}
                                    {hasRealAgents ? " (loaded)" : ""}
                                  </span>
                                </div>
                              </ListBox.Item>
                            );
                          })}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  </div>
                  <Button
                    onPress={handleFillFromPool}
                    isDisabled={!selectedPoolSlug}
                    variant="ghost"
                    size="sm"
                    className="bg-violet-600 text-white hover:bg-violet-700 h-8 min-w-fit px-3 text-xs font-medium disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Fill
                  </Button>
                </div>
              </div>
            )}

            {/* ── Agent List ──────────────────────────────────────── */}
            {data.agents.length === 0 ? (
              <BFlowEmptyState
                icon={<Brain className="w-8 h-8" />}
                message="No agents defined yet"
                action="Add Agent"
                onAction={openAddAgent}
              />
            ) : (
              <div className="space-y-2">
                {data.agents.map((a, idx) => (
                  <BFlowCollapsibleCard
                    key={`agent-${idx}`}
                    title={a.name}
                    subtitle={a.role ?? "No role specified"}
                    onEdit={() => handleEditAgent(idx)}
                    onRemove={() => removeAgent(idx)}
                  >
                    <div className="text-xs text-default-500 space-y-1">
                      <p className="whitespace-pre-wrap line-clamp-3">
                        {a.prompt}
                      </p>
                    </div>
                  </BFlowCollapsibleCard>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* ── Jobs & Steps Section ────────────────────────────────── */}
        <Card className="border border-default-100 bg-background shadow-sm">
          <div className="px-4 py-3 border-b border-default-50">
            <BFlowSectionHeader
              icon={<Layers className="w-4 h-4" />}
              title="Jobs"
              count={data.jobs.length}
              onAdd={openAddJob}
              addLabel="Add Job"
            />
          </div>
          <div className="p-4">
            {data.jobs.length === 0 ? (
              <BFlowEmptyState
                icon={<Workflow className="w-8 h-8" />}
                message="No jobs defined yet — start by adding a job"
                action="Add Job"
                onAction={openAddJob}
              />
            ) : (
              <div className="space-y-3">
                {data.jobs.map((job, jIdx) => (
                  <Card
                    key={`job-${jIdx}`}
                    className="border border-default-100 bg-default-50/50 shadow-sm overflow-hidden"
                  >
                    {/* Job Header */}
                    <div className="flex items-center justify-between px-3 py-2.5 border-b border-default-100 bg-background">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-primary">
                          <Workflow className="w-4 h-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {job.name || `Job ${jIdx + 1}`}
                          </p>
                          <p className="text-[10px] text-default-400 truncate">
                            {job.steps.length} step
                            {job.steps.length !== 1 ? "s" : ""}
                            {job.agent ? ` • Agent: ${job.agent}` : ""}
                            {job.needs ? ` • Needs: ${job.needs}` : ""}
                          </p>
                        </div>
                      </div>
                      <div
                        className="flex items-center gap-1 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          onPress={() => handleEditJob(jIdx)}
                          variant="ghost"
                          size="sm"
                          className="text-default-400 h-7 min-w-0 w-7 p-0"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          onPress={() => removeJob(jIdx)}
                          variant="ghost"
                          size="sm"
                          className="text-danger-400 hover:text-danger h-7 min-w-0 w-7 p-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Steps List */}
                    <div className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] font-semibold text-default-400 uppercase tracking-wider">
                          Steps
                        </Label>
                        <Button
                          onPress={() => openAddStep(jIdx)}
                          variant="ghost"
                          size="sm"
                          className="text-primary h-6 min-w-0 px-1.5 text-[10px]"
                        >
                          <Plus className="w-3 h-3" />
                          Add Step
                        </Button>
                      </div>

                      {job.steps.length === 0 ? (
                        <div className="text-center py-4 border border-dashed border-default-200 rounded-lg bg-default-50">
                          <p className="text-xs text-default-400">
                            No steps yet — add a step to this job
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {job.steps.map((step, sIdx) => (
                            <div
                              key={`step-${jIdx}-${sIdx}`}
                              className="flex items-center justify-between px-2.5 py-2 bg-background border border-default-100 rounded-lg hover:bg-default-50 transition-colors"
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <span className="text-default-300 shrink-0">
                                  <List className="w-3.5 h-3.5" />
                                </span>
                                <div className="min-w-0">
                                  <p className="text-xs font-medium text-foreground truncate">
                                    {step.name || `Step ${sIdx + 1}`}
                                  </p>
                                  <p className="text-[10px] text-default-400 truncate">
                                    {step.agent
                                      ? `Agent: ${step.agent} • `
                                      : ""}
                                    {step.prompts?.substring(0, 40)}
                                    {step.prompts?.length > 40 ? "..." : ""}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <Button
                                  onPress={() => handleEditStep(jIdx, sIdx)}
                                  variant="ghost"
                                  size="sm"
                                  className="text-default-400 h-6 min-w-0 w-6 p-0"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </Button>
                                <Button
                                  onPress={() => removeStep(jIdx, sIdx)}
                                  variant="ghost"
                                  size="sm"
                                  className="text-danger-400 hover:text-danger h-6 min-w-0 w-6 p-0"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* ── Reports Section ──────────────────────────────────────── */}
        <Card className="border border-default-100 bg-background shadow-sm">
          <div className="px-4 py-3 border-b border-default-50">
            <BFlowSectionHeader
              icon={<FileText className="w-4 h-4" />}
              title="Reports"
              count={data.reports.length}
              onAdd={openAddReport}
              addLabel="Add Report"
            />
          </div>
          <div className="p-4">
            {data.reports.length === 0 ? (
              <BFlowEmptyState
                icon={<FileText className="w-8 h-8" />}
                message="No reports configured yet"
                action="Add Report"
                onAction={openAddReport}
              />
            ) : (
              <div className="space-y-2">
                {data.reports.map((r, idx) => (
                  <BFlowCollapsibleCard
                    key={`report-${idx}`}
                    title={r.name}
                    subtitle={`Source: ${r.source}`}
                    onEdit={() => handleEditReport(idx)}
                    onRemove={() => removeReport(idx)}
                  >
                    <div className="grid grid-cols-2 gap-2 text-xs text-default-500">
                      <div>
                        <span className="font-medium">Label:</span>{" "}
                        {r.label || "—"}
                      </div>
                      <div>
                        <span className="font-medium">Source:</span> {r.source}
                      </div>
                    </div>
                  </BFlowCollapsibleCard>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* ── YAML Preview Toggle ──────────────────────────────────── */}
        <div className="flex justify-center pb-4">
          <Button
            onPress={() => setShowYamlPreview(!showYamlPreview)}
            variant="ghost"
            size="sm"
            className="text-default-400 text-xs"
          >
            <Eye className="w-3.5 h-3.5" />
            {showYamlPreview ? "Hide YAML Preview" : "Show YAML Preview"}
          </Button>
        </div>

        {showYamlPreview && (
          <Card className="border border-default-100 bg-default-50 shadow-sm overflow-hidden">
            <div className="px-4 py-2 border-b border-default-100 bg-default-100/50">
              <span className="text-xs font-semibold text-default-500 uppercase tracking-wider">
                YAML Preview
              </span>
            </div>
            <pre className="p-4 text-xs font-mono text-default-600 overflow-x-auto max-h-96 whitespace-pre-wrap">
              {currentYaml}
            </pre>
          </Card>
        )}

        {/* Bottom spacer for scroll */}
        <div className="h-4" />
      </div>

      {/* ── Modals ───────────────────────────────────────────────── */}

      <BFlowJobFormModal
        open={jobModal.open}
        job={jobModal.job}
        agents={agentNames}
        onClose={() => setJobModal((prev) => ({ ...prev, open: false }))}
        onSave={saveJob}
      />

      <BFlowStepFormModal
        open={stepModal.open}
        step={stepModal.step}
        availableAgents={agentNames}
        variables={data.variables}
        jobs={data.jobs}
        onClose={() => setStepModal((prev) => ({ ...prev, open: false }))}
        onSave={saveStep}
      />

      <BFlowAgentFormModal
        open={agentModal.open}
        agent={agentModal.agent}
        onClose={() => setAgentModal((prev) => ({ ...prev, open: false }))}
        onSave={saveAgent}
      />

      <BFlowVariableFormModal
        open={variableModal.open}
        variable={variableModal.variable}
        onClose={() => setVariableModal((prev) => ({ ...prev, open: false }))}
        onSave={saveVariable}
      />

      <BFlowReportFormModal
        open={reportModal.open}
        report={reportModal.report}
        jobs={data.jobs}
        onClose={() => setReportModal((prev) => ({ ...prev, open: false }))}
        onSave={saveReport}
      />
    </div>
  );
}

// Also export the utility functions for external use
export { parseBflowInteractive, serializeBflowInteractive };
