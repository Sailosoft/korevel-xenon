import { BunnyFeature } from "@/src/modules/bunny/src/feature/BunnyFeature";
import {
  BFlowPoolEntity,
  BFlowPoolForm,
} from "./BFlowPool.Types";
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

const queryPools: AdminPanelQuery<
  BFlowPoolEntity,
  BFlowPoolForm
> = {
  getAll: async (options) => {
    const items: BFlowPoolEntity[] = await bflowDB.pools.toArray();
    const response: GetAllResponse<BFlowPoolEntity> = {
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
    return await bflowDB.pools.get(id as string);
  },
};

// ─── Mutation implementation ────────────────────────────────────────

const mutationPools: AdminPanelMutation<BFlowPoolForm> = {
  create: async (data) => {
    const entity = bflowDB.poolsRepo.createFromForm(data);
    entity.id = uuidv7();
    await bflowDB.pools.add(entity);
    return { status: "success", data: entity };
  },
  update: async (id, data) => {
    const existing = await bflowDB.pools.get(id as string);
    if (!existing) throw new Error(`Pool with id ${id} not found`);

    const updated = bflowDB.poolsRepo.updateFromForm(existing, data);
    await bflowDB.pools.put(updated);
    return { status: "success", data: updated };
  },
  delete: async (id) => {
    await bflowDB.pools.delete(id as string);
    return { status: "success" };
  },
};

// ─── Column definitions ─────────────────────────────────────────────

const columns: BunnyColumn<BFlowPoolEntity>[] = [
  { field: "name", header: "Name", sortable: true, isRowHeader: true },
  { field: "code", header: "Code", sortable: true },
  // { field: "status", header: "Status", sortable: true },
  // { field: "createdAt", header: "Created", sortable: true },
];

// ─── Export the feature ─────────────────────────────────────────────

export const bflowPoolModule = BunnyFeature.create<
  BFlowPoolEntity,
  BFlowPoolForm
>("Pool", "id", (feature) => {
  feature.useDefault();
  feature.useDataLayer({
    query: queryPools,
    mutation: mutationPools,
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
        name: "description",
        label: "Description",
        placeholder: "Describe the purpose of this agent pool",
        type: "textarea",
        rows: 4,
      },
      // {
      //   name: "status",
      //   label: "Status",
      //   type: "select",
      //   required: true,
      //   options: [
      //     { label: "Draft", value: "draft" },
      //     { label: "Active", value: "active" },
      //     { label: "Inactive", value: "inactive" },
      //     { label: "Archived", value: "archived" },
      //   ],
      // },
    ]);
    form.setGridCols(1);
  });

  feature.configureRow((row) => {
    row.addAction({
      id: "view-agents",
      icon: createElement(Users, { className: "size-4" }),
      label: "View Agents",
      onClick: (rowData, context) => {
        context.router.push(
          `/modules/bunny-flow/pools/${rowData.id}/agents`,
        );
      },
    });
  });

  feature.setModuleUrl("/modules/bunny-flow/pools/*");
  feature.setModalSize("lg");
});
