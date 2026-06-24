/**
 * BFlowRun.Hooks.DataLoad — Custom React hook for loading pipeline run data.
 *
 * Separates data-loading logic (pipeline, template, variable group, flow variables)
 * from the presentation layer.
 */

"use client";

import { useEffect, useState } from "react";
import { bflowDB } from "../database/BFlowDatabase";
import type { BFlowPipelineEntity } from "../pipeline/BFlowPipeline.Types";
import type { BFlowVariableGroupEntity } from "../variable/BFlowVariableGroup.Types";
import type { BFlowFlowVariableEntity } from "../flow-variable/BFlowFlowVariable.Types";
import type { BFlowWorkflowTemplateEntity } from "../workflow/BFlowWorkflow.Types";

// ═══════════════════════════════════════════════════════════════════
// useBFlowRunDataLoad — loads pipeline, template, variables
// ═══════════════════════════════════════════════════════════════════

export interface BFlowRunDataLoadState {
  pipeline: BFlowPipelineEntity | undefined;
  template: BFlowWorkflowTemplateEntity | undefined;
  variableGroup: BFlowVariableGroupEntity | undefined;
  flowVariables: BFlowFlowVariableEntity[];
  error: string | null;
  loading: boolean;
}

/**
 * Loads the pipeline entity, its workflow template, variable group,
 * and flow-level variables from IndexedDB. Returns all together so
 * the component only needs to consume the result.
 */
export function useBFlowRunDataLoad(
  pipelineId: string | undefined,
): BFlowRunDataLoadState {
  const [pipeline, setPipeline] = useState<BFlowPipelineEntity | undefined>();
  const [template, setTemplate] = useState<
    BFlowWorkflowTemplateEntity | undefined
  >();
  const [variableGroup, setVariableGroup] = useState<
    BFlowVariableGroupEntity | undefined
  >();
  const [flowVariables, setFlowVariables] = useState<BFlowFlowVariableEntity[]>(
    [],
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load pipeline
  useEffect(() => {
    if (!pipelineId) {
      setPipeline(undefined);
      setError("Pipeline ID not found in URL");
      setLoading(false);
      return;
    }
    let cancelled = false;
    bflowDB.pipelines
      .get(pipelineId)
      .then((p) => {
        if (cancelled) return;
        if (!p) {
          setError(`Pipeline not found (${pipelineId})`);
        } else {
          setPipeline(p);
        }
      })
      .catch((e) => {
        if (!cancelled)
          setError(
            `Failed to load pipeline: ${e instanceof Error ? e.message : "Unknown error"}`,
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pipelineId]);

  // Load template when pipeline changes
  useEffect(() => {
    if (!pipeline?.templateId) {
      setTemplate(undefined);
      return;
    }
    let cancelled = false;
    bflowDB.workflowTemplates
      .get(pipeline.templateId)
      .then((t) => {
        if (!cancelled) setTemplate(t);
      })
      .catch((e) => {
        if (!cancelled)
          setError(
            `Failed to load template: ${e instanceof Error ? e.message : "Unknown error"}`,
          );
      });
    return () => {
      cancelled = true;
    };
  }, [pipeline?.templateId]);

  // Load variable group when pipeline changes
  useEffect(() => {
    if (!pipeline?.variableGroupId) {
      setVariableGroup(undefined);
      return;
    }
    let cancelled = false;
    bflowDB.variableGroups
      .get(pipeline.variableGroupId)
      .then((g) => {
        if (!cancelled) setVariableGroup(g);
      })
      .catch((e) => {
        if (!cancelled)
          setError(
            `Failed to load variable group: ${e instanceof Error ? e.message : "Unknown error"}`,
          );
      });
    return () => {
      cancelled = true;
    };
  }, [pipeline?.variableGroupId]);

  // Load flow variables when variable group changes
  useEffect(() => {
    if (!variableGroup?.id) {
      setFlowVariables([]);
      return;
    }
    let cancelled = false;
    bflowDB.flowVariables
      .where("groupId")
      .equals(variableGroup.id)
      .toArray()
      .then((vars) => {
        if (!cancelled) setFlowVariables(vars);
      })
      .catch((e) => {
        if (!cancelled)
          setError(
            `Failed to load flow variables: ${e instanceof Error ? e.message : "Unknown error"}`,
          );
      });
    return () => {
      cancelled = true;
    };
  }, [variableGroup?.id]);

  return { pipeline, template, variableGroup, flowVariables, error, loading };
}
