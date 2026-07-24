// BFlowScopedFlowVariables.tsx
//
// Bunny-backed flow variable list automatically scoped to the current
// variable group (groupId). Uses the existing bflowFlowVariableModule
// config but injects the group id.
//
// Adds a "Fill Up Variable" header action that reads the group's selected
// workflow, parses its YAML variable definitions, and auto-creates any
// missing flow variables in the current group based on the workflow's
// variable pattern.

"use client";

import { useCallback, useEffect, useState } from "react";
import Bunny from "@/src/modules/bunny/src/Bunny";
import BunnyForm from "@/src/modules/bunny/src/form/BunnyForm";
import { bflowFlowVariableModule } from "./BFlowFlowVariable";
import { createScopedBunnyConfig } from "../flow/BFlowScopedModule";
import { bflowDB } from "../database/BFlowDatabase";
import { parse as parseYaml } from "yaml";
import { WandSparkles } from "lucide-react";
import { createElement } from "react";
import { BFlowWorkflowSchema } from "../workflow/BFlowWorkflow.Types";
import { v7 as uuidv7 } from "uuid";
import type { BFlowFlowVariableForm } from "./BFlowFlowVariable.Types";

interface BFlowScopedFlowVariablesProps {
  groupId: string;
}

export default function BFlowScopedFlowVariables({
  groupId,
}: BFlowScopedFlowVariablesProps) {
  const [filling, setFilling] = useState(false);

  const scopedConfig = createScopedBunnyConfig(
    bflowFlowVariableModule,
    "groupId",
    groupId,
  );

  scopedConfig.beforeFormSubmit = () => ({
    groupId,
  });

  // ── "Fill Up Variable" header action ──────────────────────────────
  // Reads the group's selected workflow, parses its YAML variable definitions,
  // and auto-creates any missing flow variables in the current group.
  const handleFillUpVariables = useCallback(async () => {
    if (filling) return;
    setFilling(true);

    try {
      // Get the variable group to find the associated workflow
      const group = await bflowDB.variableGroups.get(groupId);
      if (!group?.workflowId) {
        console.warn(
          "[BFlowScopedFlowVariables] No workflow selected for this group",
        );
        return;
      }

      // Load the workflow template
      const workflow = await bflowDB.workflowTemplates.get(group.workflowId);
      if (!workflow?.templateYaml) {
        console.warn(
          "[BFlowScopedFlowVariables] Workflow has no YAML template",
        );
        return;
      }

      // Parse the YAML to extract variable definitions
      const parsed = parseYaml(workflow.templateYaml);
      const result = BFlowWorkflowSchema.safeParse(parsed);
      if (!result.success) {
        console.warn(
          "[BFlowScopedFlowVariables] Failed to parse workflow YAML",
        );
        return;
      }

      const workflowVariables = result.data.variables ?? [];
      if (workflowVariables.length === 0) {
        console.warn(
          "[BFlowScopedFlowVariables] No variables defined in workflow YAML",
        );
        return;
      }

      // Get existing flow variables in this group
      const existingVariables = await bflowDB.flowVariables
        .where("groupId")
        .equals(groupId)
        .toArray();
      const existingNames = new Set(existingVariables.map((v) => v.name));

      // Create missing variables
      const now = new Date();
      const toCreate: BFlowFlowVariableForm[] = [];

      for (const wfVar of workflowVariables) {
        if (!existingNames.has(wfVar.name)) {
          toCreate.push({
            groupId,
            name: wfVar.name,
            value: wfVar.value ?? "",
            type: wfVar.type ?? "text",
            description: wfVar.description ?? `From workflow: ${workflow.name}`,
          });
        }
      }

      if (toCreate.length === 0) {
        console.info(
          "[BFlowScopedFlowVariables] All workflow variables already exist in this group",
        );
        return;
      }

      // Batch create the missing variables
      for (const formData of toCreate) {
        await bflowDB.flowVariables.add({
          id: uuidv7(),
          groupId: formData.groupId,
          name: formData.name,
          value: formData.value,
          type: formData.type,
          description: formData.description,
          createdAt: now,
          updatedAt: now,
        });
      }

      console.info(
        `[BFlowScopedFlowVariables] Created ${toCreate.length} variables from workflow`,
      );
    } catch (err) {
      console.error(
        "[BFlowScopedFlowVariables] Failed to fill up variables:",
        err,
      );
    } finally {
      setFilling(false);
    }
  }, [groupId, filling]);

  // ── Add header action ─────────────────────────────────────────────
  useEffect(() => {
    scopedConfig.headerActions = [
      {
        id: "fill-up-variables",
        label: filling ? "Filling..." : "Fill Up Variables",
        icon: createElement(WandSparkles, { className: "size-4" }),
        variant: "secondary",
        onClick: handleFillUpVariables,
        disable: filling,
      },
    ];
  }, [scopedConfig, handleFillUpVariables, filling]);

  return (
    <div className="p-0">
      <Bunny config={scopedConfig}>
        <BunnyForm />
      </Bunny>
    </div>
  );
}
