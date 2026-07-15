import { BunnyFeature } from "@/src/modules/bunny/src/feature/BunnyFeature";
import {
  BFlowAgentPoolEntity,
  BFlowAgentPoolForm,
} from "./BFlowAgentPool.Types";
import { bflowDB } from "../database/BFlowDatabase";
import {
  AdminPanelQuery,
  GetAllResponse,
} from "@/src/modules/admin-panel/features/query/admin-panel-query.interface";
import { AdminPanelMutation } from "@/src/modules/admin-panel/features/mutation/admin-panel-mutation.interface";
import { BunnyColumn } from "@/src/modules/bunny/src/table/BunnyTable.Interface";
import { createElement } from "react";
import { Users, Eye } from "lucide-react";
import { v7 as uuidv7 } from "uuid";

// ─── Query implementation ───────────────────────────────────────────

const queryAgentPools: AdminPanelQuery<
  BFlowAgentPoolEntity,
  BFlowAgentPoolForm
> = {
  getAll: async (options) => {
    const items: BFlowAgentPoolEntity[] = await bflowDB.agentPools.toArray();
    const response: GetAllResponse<BFlowAgentPoolEntity> = {
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
    return await bflowDB.agentPools.get(id as string);
  },
};

// ─── Mutation implementation ────────────────────────────────────────

const mutationAgentPools: AdminPanelMutation<BFlowAgentPoolForm> = {
  create: async (data) => {
    const entity = bflowDB.agentPoolsRepo.createFromForm(data);
    entity.id = uuidv7();
    await bflowDB.agentPools.add(entity);
    return { status: "success", data: entity };
  },
  update: async (id, data) => {
    const existing = await bflowDB.agentPools.get(id as string);
    if (!existing) throw new Error(`Agent pool with id ${id} not found`);

    const updated = bflowDB.agentPoolsRepo.updateFromForm(existing, data);
    await bflowDB.agentPools.put(updated);
    return { status: "success", data: updated };
  },
  delete: async (id) => {
    await bflowDB.agentPools.delete(id as string);
    return { status: "success" };
  },
};

// ─── Column definitions ─────────────────────────────────────────────

const columns: BunnyColumn<BFlowAgentPoolEntity>[] = [
  { field: "name", header: "Name", sortable: true, isRowHeader: true },
  { field: "code", header: "Code", sortable: true },
  { field: "slug", header: "Slug", sortable: true },
  { field: "status", header: "Status", sortable: true },
  { field: "agentCount", header: "Agents", sortable: true },
  { field: "createdAt", header: "Created", sortable: true },
];

// ─── Export the feature ─────────────────────────────────────────────

export const BFlowAgentPoolFeature = BunnyFeature.create<
  BFlowAgentPoolEntity,
  BFlowAgentPoolForm
>("Agent Pool", "id", (feature) => {
  feature.useDefault();
  feature.useDataLayer({
    query: queryAgentPools,
    mutation: mutationAgentPools,
  });

  feature.configureTable((configurator) => {
    configurator.addColumns(columns);
  });

  feature.configureForm((form) => {
    form.setOnSuccess({ mode: "closeOnly" });
    form.addFields([
      {
        name: "code",
        label: "Code",
        placeholder: "e.g. POOL-001",
        type: "text",
        required: true,
      },
      {
        name: "name",
        label: "Name",
        placeholder: "e.g. Content Writer Pool",
        type: "text",
        required: true,
      },
      {
        name: "slug",
        label: "Slug",
        placeholder: "e.g. content-writer-pool",
        type: "text",
        required: true,
      },
      {
        name: "description",
        label: "Description",
        placeholder: "Describe the purpose of this agent pool",
        type: "textarea",
        rows: 3,
      },
      {
        name: "version",
        label: "Version",
        placeholder: "e.g. 1.0.0",
        type: "text",
      },
      {
        name: "status",
        label: "Status",
        type: "select",
        required: true,
        options: [
          { label: "Draft", value: "draft" },
          { label: "Active", value: "active" },
          { label: "Inactive", value: "inactive" },
          { label: "Archived", value: "archived" },
        ],
      },
      {
        name: "swarmingConfig.collaborationMode",
        label: "Collaboration Mode",
        type: "select",
        options: [
          { label: "Sequential", value: "sequential" },
          { label: "Parallel", value: "parallel" },
          { label: "Hierarchical", value: "hierarchical" },
          { label: "Hybrid", value: "hybrid" },
        ],
      },
      {
        name: "swarmingConfig.taskDistribution",
        label: "Task Distribution",
        type: "select",
        options: [
          { label: "Round Robin", value: "round-robin" },
          { label: "Load Balancing", value: "load-balancing" },
          { label: "Priority Based", value: "priority-based" },
          { label: "Specialized", value: "specialized" },
        ],
      },
      {
        name: "swarmingConfig.responseTimeoutMs",
        label: "Response Timeout (ms)",
        placeholder: "30000",
        type: "number",
      },
      {
        name: "swarmingConfig.maxRetries",
        label: "Max Retries",
        placeholder: "3",
        type: "number",
      },
      {
        name: "agentTemplate.provider",
        label: "AI Provider",
        placeholder: "e.g. openai, anthropic",
        type: "text",
      },
      {
        name: "agentTemplate.model",
        label: "AI Model",
        placeholder: "e.g. gpt-4, claude-3",
        type: "text",
      },
      {
        name: "agentTemplate.systemPrompt",
        label: "System Prompt Template",
        placeholder: "Default system prompt for agents in this pool",
        type: "textarea",
        rows: 4,
      },
      {
        name: "agentTemplate.personality.tone",
        label: "Agent Tone",
        type: "select",
        options: [
          { label: "Professional", value: "professional" },
          { label: "Friendly", value: "friendly" },
          { label: "Authoritative", value: "authoritative" },
          { label: "Creative", value: "creative" },
          { label: "Analytical", value: "analytical" },
        ],
      },
      {
        name: "agentTemplate.personality.formality",
        label: "Formality",
        type: "select",
        options: [
          { label: "Formal", value: "formal" },
          { label: "Semi-formal", value: "semi-formal" },
          { label: "Casual", value: "casual" },
        ],
      },
      {
        name: "agentTemplate.personality.expertiseLevel",
        label: "Expertise Level",
        type: "select",
        options: [
          { label: "Junior", value: "junior" },
          { label: "Mid-level", value: "mid-level" },
          { label: "Senior", value: "senior" },
          { label: "Expert", value: "expert" },
        ],
      },
    ]);
    form.setGridCols(2);
  });

  feature.configureRow((row) => {
    row.addAction({
      id: "view-agents",
      icon: createElement(Users, { className: "size-4" }),
      label: "View Agents",
      onClick: (rowData, context) => {
        context.router.push(
          `/modules/bunny-flow/agent-pools/${rowData.id}/agents`,
        );
      },
    });
  });

  feature.setModuleUrl("/modules/bunny-flow/agent-pools/*");
  feature.setModalSize("lg");
});
