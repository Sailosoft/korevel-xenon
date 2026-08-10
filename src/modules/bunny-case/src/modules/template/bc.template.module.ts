// bc.template.module.ts
//
// Communication Template — Bunny CRUD module (Template Extraction).
// Templates are extracted by the Simulator and stored here for reuse.

import { BunnyConfig } from "@/src/modules/bunny/src/Bunny.Interface";
import { BCCaseTemplate } from "./bc.template.entity";
import {
  AdminPanelQueryOptions,
  GetAllResponse,
} from "@/src/modules/admin-panel/features/query/admin-panel-query.interface";
import { AdminPanelId } from "@/src/modules/admin-panel/features/id/admin-panel-id.interface";
import {
  AdminPanelResult,
  adminPanelResultSuccess,
} from "@/src/modules/admin-panel/shared/admin-panel-result";
import { bcDatabase } from "../../database/bc.database";
import { adminPanelQueryResponseAll } from "@/src/modules/admin-panel/features/query/admin-panel-query.util";

export const bcTemplateModule: BunnyConfig<BCCaseTemplate, BCCaseTemplate> = {
  title: "Communication Template",
  titlePlural: "Communication Templates",
  rowKey: "id",
  onFormSuccess: { mode: "closeOnly" },
  columns: [
    { field: "title", header: "Title", isRowHeader: true, sortable: true },
    { field: "source", header: "Source" },
    { field: "tags", header: "Tags" },
  ],
  formConfig: {
    gridCols: 2,
    fields: [
      {
        name: "title",
        label: "Title",
        type: "text",
        colSpan: 2,
        rules: [{ rule: "required", message: "Title is required" }],
      },
      {
        name: "caseId",
        label: "Case",
        type: "select",
        options: async () => {
          const cases = await bcDatabase.cases.toArray();
          return cases.map((c) => ({ label: c.title, value: c.id as number }));
        },
      },
      {
        name: "source",
        label: "Source",
        type: "select",
        defaultValue: "simulator",
        options: [
          { label: "Simulator", value: "simulator" },
          { label: "Peer Review", value: "peer-review" },
          { label: "Manual", value: "manual" },
        ],
      },
      {
        name: "content",
        label: "Content (successful phrases / logic)",
        type: "editor",
        colSpan: 2,
      },
      {
        name: "steps",
        label: "Playbook Steps",
        type: "textarea",
        colSpan: 2,
        rows: 3,
        placeholder: "One step per line",
      },
      {
        name: "tags",
        label: "Tags",
        type: "text",
        placeholder: "Comma-separated",
      },
    ],
  },
  defaultHeaderActions: true,
  defaultRowActions: true,
  modalHeaderActions: [],
  query: {
    getAll: async function (
      _options: AdminPanelQueryOptions,
      _overrideOptions?: AdminPanelQueryOptions,
    ): Promise<GetAllResponse<BCCaseTemplate>> {
      return adminPanelQueryResponseAll({
        data: await bcDatabase.templates.toArray(),
      });
    },
    getOne: async function (
      id: string | number,
    ): Promise<BCCaseTemplate | undefined> {
      return await bcDatabase.templates.get(Number(id));
    },
  },
  mutation: {
    create: async function (
      data: BCCaseTemplate,
    ): Promise<AdminPanelResult<BCCaseTemplate, unknown>> {
      const id = await bcDatabase.templates.add(data);
      return adminPanelResultSuccess<BCCaseTemplate>(
        (await bcDatabase.templates.get(id)) as BCCaseTemplate,
      );
    },
    update: async function (
      id: AdminPanelId,
      data: BCCaseTemplate,
    ): Promise<AdminPanelResult<BCCaseTemplate, unknown> | undefined> {
      if (typeof id !== "number") {
        throw new Error("Invalid ID type. Expected a number.");
      }
      await bcDatabase.templates.update(id, data);
      return adminPanelResultSuccess<BCCaseTemplate>(
        (await bcDatabase.templates.get(id)) as BCCaseTemplate,
      );
    },
    delete: async function (
      iid: AdminPanelId,
    ): Promise<AdminPanelResult<BCCaseTemplate, unknown> | undefined> {
      const id = Number(iid);
      await bcDatabase.templates.delete(id);
      return adminPanelResultSuccess<BCCaseTemplate>({} as BCCaseTemplate);
    },
  },
};
