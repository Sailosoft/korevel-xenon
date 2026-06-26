/**
 * BFlowWorkflow.YamlGenerator.Component — AI-powered YAML workflow generator dialog.
 *
 * Presents a form where users describe their workflow needs and requirements,
 * select a workflow style/pattern, and generate a complete BFlowWorkflow YAML.
 *
 * On successful generation, calls `onYamlGenerated(yaml)` prop so the parent
 * can directly set the form state via `adminPanel.form.handleChange(...)`.
 */
"use client";

import { useCallback, useState } from "react";
import {
  LoaderIcon,
  SparklesIcon,
  FileTextIcon,
  AlertCircleIcon,
  CheckCircleIcon,
} from "lucide-react";
import { bflowYamlPrompt } from "./BFlowWorkflow.Prompt";
import type { BFlowWorkflowServerGenerateParams } from "./BFlowWorkflow.Server";
import { bflowWorkflowServerGenerate } from "./BFlowWorkflow.Server";

export interface BFlowWorkflowYamlGeneratorProps {
  /** Called when the dialog should close */
  onClose?: () => void;
  /**
   * Called after YAML is successfully generated.
   * Parent should use this to set `templateYaml` on the admin panel form:
   * `form.handleChange("templateYaml", yaml)`
   */
  onYamlGenerated?: (yaml: string) => void;
}

export default function BFlowWorkflowYamlGenerator({
  onClose,
  onYamlGenerated,
}: BFlowWorkflowYamlGeneratorProps) {
  const [workflowName, setWorkflowName] = useState("");
  const [workflowDescription, setWorkflowDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [styleKey, setStyleKey] = useState("content_pipeline");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const selectedStyle = bflowYamlPrompt.workflowStyles.find(
    (s) => s.key === styleKey,
  );

  const handleGenerate = useCallback(async () => {
    if (!workflowName.trim() || !requirements.trim()) {
      setError("Workflow name and requirements are required.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setSuccess(false);

    const params: BFlowWorkflowServerGenerateParams = {
      workflowName: workflowName.trim(),
      workflowDescription: workflowDescription.trim() || undefined,
      requirements: requirements.trim(),
      additionalContext: additionalContext.trim() || undefined,
      styleKey,
    };

    try {
      const yaml = await bflowWorkflowServerGenerate(params);

      // Direct callback — parent sets admin-panel form state
      onYamlGenerated?.(yaml);

      setSuccess(true);

      // Auto-close after a brief delay on success
      setTimeout(() => {
        onClose?.();
      }, 1200);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred during generation.",
      );
    } finally {
      setIsGenerating(false);
    }
  }, [
    workflowName,
    workflowDescription,
    requirements,
    additionalContext,
    styleKey,
    onClose,
    onYamlGenerated,
  ]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-default-100">
        <SparklesIcon className="size-5 text-primary" />
        <div>
          <h3 className="text-base font-semibold text-default-800">
            AI Workflow YAML Generator
          </h3>
          <p className="text-xs text-default-500">
            Describe your workflow needs and let AI generate the YAML structure
          </p>
        </div>
      </div>

      {/* Workflow Name */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold uppercase text-default-400">
          Workflow Name <span className="text-danger">*</span>
        </label>
        <input
          type="text"
          value={workflowName}
          onChange={(e) => setWorkflowName(e.target.value)}
          placeholder="e.g. Content Research Pipeline"
          className="w-full bg-default-100 px-3 py-2 rounded-md text-sm outline-none border border-transparent focus:border-primary transition-colors"
          disabled={isGenerating}
        />
      </div>

      {/* Workflow Description */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold uppercase text-default-400">
          Description
        </label>
        <input
          type="text"
          value={workflowDescription}
          onChange={(e) => setWorkflowDescription(e.target.value)}
          placeholder="Briefly describe the workflow purpose"
          className="w-full bg-default-100 px-3 py-2 rounded-md text-sm outline-none border border-transparent focus:border-primary transition-colors"
          disabled={isGenerating}
        />
      </div>

      {/* Workflow Style Selector */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold uppercase text-default-400">
          Workflow Pattern / Style
        </label>
        <select
          value={styleKey}
          onChange={(e) => setStyleKey(e.target.value)}
          className="w-full bg-default-100 px-3 py-2 rounded-md text-sm outline-none border border-transparent focus:border-primary transition-colors"
          disabled={isGenerating}
        >
          {bflowYamlPrompt.workflowStyles.map((style) => (
            <option key={style.key} value={style.key}>
              {style.name}
            </option>
          ))}
        </select>
        {selectedStyle && (
          <p className="text-[11px] text-default-400 italic mt-0.5">
            {selectedStyle.description}
          </p>
        )}
      </div>

      {/* Requirements */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold uppercase text-default-400">
          Requirements / Needs <span className="text-danger">*</span>
        </label>
        <textarea
          value={requirements}
          onChange={(e) => setRequirements(e.target.value)}
          placeholder="Describe what you need the workflow to do. Be specific about:&#10;- What data or topics it should process&#10;- What kind of output you expect&#10;- Any special agents or roles needed&#10;- Specific steps or stages required"
          rows={5}
          className="w-full bg-default-100 px-3 py-2 rounded-md text-sm outline-none border border-transparent focus:border-primary transition-colors resize-vertical min-h-[100px]"
          disabled={isGenerating}
        />
      </div>

      {/* Additional Context */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold uppercase text-default-400">
          Additional Context (optional)
        </label>
        <textarea
          value={additionalContext}
          onChange={(e) => setAdditionalContext(e.target.value)}
          placeholder="Any extra context, constraints, or preferences..."
          rows={2}
          className="w-full bg-default-100 px-3 py-2 rounded-md text-sm outline-none border border-transparent focus:border-primary transition-colors resize-vertical"
          disabled={isGenerating}
        />
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-danger-50 border border-danger-200 rounded-md">
          <AlertCircleIcon className="size-4 text-danger shrink-0 mt-0.5" />
          <p className="text-xs text-danger-700">{error}</p>
        </div>
      )}

      {/* Success message */}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-success-50 border border-success-200 rounded-md">
          <CheckCircleIcon className="size-4 text-success shrink-0" />
          <p className="text-xs text-success-700">
            YAML generated successfully! It will be automatically inserted into
            the form.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-default-100">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm rounded-md bg-default-100 hover:bg-default-200 text-default-600 transition-colors"
          disabled={isGenerating}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={
            isGenerating || !workflowName.trim() || !requirements.trim()
          }
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isGenerating ? (
            <>
              <LoaderIcon className="size-4 animate-spin" />
              Generating Workflow...
            </>
          ) : (
            <>
              <FileTextIcon className="size-4" />
              Generate YAML Workflow
            </>
          )}
        </button>
      </div>
    </div>
  );
}
