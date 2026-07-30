import { BunnyFeature } from "@/src/modules/bunny/src/feature/BunnyFeature";
import {
  BFlowPoolAgentEntity,
  BFlowPoolAgentForm,
} from "./BFlowPoolAgent.Types";
import { bflowDB } from "../database/BFlowDatabase";
import {
  AdminPanelQuery,
  GetAllResponse,
} from "@/src/modules/admin-panel/features/query/admin-panel-query.interface";
import { AdminPanelMutation } from "@/src/modules/admin-panel/features/mutation/admin-panel-mutation.interface";
import { BunnyColumn } from "@/src/modules/bunny/src/table/BunnyTable.Interface";
import { Sparkles, Plus, WandSparkles } from "lucide-react";
import { v7 as uuidv7 } from "uuid";
import { createElement } from "react";

// ─── Query implementation ───────────────────────────────────────────

const queryPoolAgents: AdminPanelQuery<
  BFlowPoolAgentEntity,
  BFlowPoolAgentForm
> = {
  getAll: async (options) => {
    const items: BFlowPoolAgentEntity[] = await bflowDB.poolAgents.toArray();
    const response: GetAllResponse<BFlowPoolAgentEntity> = {
      data: items,
      pagination: {
        page: options.pagination?.page || 1,
        pageSize: options.pagination?.pageSize || 10,
        total: items.length,
        totalPages: Math.ceil(
          items.length / (options.pagination?.pageSize || 10),
        ),
      },
    };
    return response;
  },
  getOne: async (id) => {
    return await bflowDB.poolAgents.get(id as string);
  },
};

// ─── Mutation implementation ────────────────────────────────────────

const mutationPoolAgents: AdminPanelMutation<BFlowPoolAgentForm> = {
  create: async (data) => {
    const now = new Date();
    const entity: BFlowPoolAgentEntity = {
      id: uuidv7(),
      poolId: data.poolId,
      name: data.name,
      role: data.role,
      prompt: data.prompt,
      provider: data.provider,
      model: data.model,
      capabilities: data.capabilities ?? [],
      createdAt: now,
      updatedAt: now,
    };
    await bflowDB.poolAgents.add(entity);
    return { status: "success", data: entity };
  },
  update: async (id, data) => {
    const existing = await bflowDB.poolAgents.get(id as string);
    if (!existing) throw new Error(`Pool agent with id ${id} not found`);

    const updated: BFlowPoolAgentEntity = {
      ...existing,
      name: data.name,
      role: data.role,
      prompt: data.prompt,
      provider: data.provider,
      model: data.model,
      capabilities: data.capabilities ?? [],
      updatedAt: new Date(),
    };
    await bflowDB.poolAgents.put(updated);
    return { status: "success", data: updated };
  },
  delete: async (id) => {
    await bflowDB.poolAgents.delete(id as string);
    return { status: "success" };
  },
};

// ─── Column definitions ─────────────────────────────────────────────

const columns: BunnyColumn<BFlowPoolAgentEntity>[] = [
  { field: "name", header: "Name", sortable: true, isRowHeader: true },
  { field: "role", header: "Role", sortable: true },
  // { field: "provider", header: "Provider", sortable: true },
  // { field: "model", header: "Model", sortable: true },
  { field: "createdAt", header: "Created", sortable: true },
];

// ─── Export the feature ─────────────────────────────────────────────

export const bflowPoolAgentModule = BunnyFeature.create<
  BFlowPoolAgentEntity,
  BFlowPoolAgentForm
>("Pool Agent", "id", (feature) => {
  feature.useDefault();
  feature.useDataLayer({
    query: queryPoolAgents,
    mutation: mutationPoolAgents,
  });

  feature.configureTable((configurator) => {
    configurator.addColumns(columns);
    configurator.configureProps({
      hidePageSelection: true,
      hidePageSizeSelection: true,
    });
  });

  feature.configureForm((form) => {
    form.setOnSuccess({ mode: "closeOnly" });
    form.addFields([
      {
        name: "name",
        label: "Agent Name",
        placeholder: "e.g. content-writer",
        type: "text",
        required: true,
      },
      {
        name: "role",
        label: "Role",
        placeholder: "e.g. Content Writer",
        type: "text",
      },
      {
        name: "provider",
        label: "AI Provider",
        placeholder: "e.g. openai, anthropic",
        type: "text",
      },
      {
        name: "model",
        label: "AI Model",
        placeholder: "e.g. gpt-4, claude-3",
        type: "text",
      },
      {
        name: "prompt",
        label: "System Prompt",
        placeholder: "Enter the system prompt for this agent",
        type: "textarea",
        required: true,
        rows: 5,
      },
    ]);
    form.setGridCols(1);
  });

  feature.configureHeader((header) => {
    // ── "Generate Agents" header action (opens GenerateTeamModal) ─
    header.addAction({
      id: "generate-agents",
      label: "Generate Agents",
      icon: createElement(WandSparkles, { className: "size-4" }),
      variant: "secondary",
    });
  });

  feature.setModuleUrl("/modules/bunny-flow/*");
  feature.setModalSize("lg");
});
