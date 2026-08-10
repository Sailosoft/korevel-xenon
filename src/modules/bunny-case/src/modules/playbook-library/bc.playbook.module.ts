// bc.playbook.module.ts
//
// Playbook Library — Bunny CRUD module (Knowledge Base). A searchable
// archive of successful interactions for all agents to use, with optional
// peer-review "brand voice" refinements.

import { BunnyConfig } from "@/src/modules/bunny/src/Bunny.Interface";
import { BCPlaybook } from "./bc.playbook.entity";
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

export const bcPlaybookModule: BunnyConfig<BCPlaybook, BCPlaybook> = {
  title: "Playbook",
  titlePlural: "Playbook Library",
  rowKey: "id",
  onFormSuccess: { mode: "closeOnly" },
  columns: [
    { field: "title", header: "Title", isRowHeader: true, sortable: true },
    { field: "status", header: "Status" },
    { field: "tags", header: "Tags" },
    { field: "summary", header: "Summary" },
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
        name: "personaId",
        label: "Persona",
        type: "select",
        options: async () => {
          const personas = await bcDatabase.personas.toArray();
          return personas.map((p) => ({
            label: p.name,
            value: p.id as number,
          }));
        },
      },
      {
        name: "status",
        label: "Status",
        type: "select",
        defaultValue: "draft",
        options: [
          { label: "Draft", value: "draft" },
          { label: "Published", value: "published" },
        ],
      },
      {
        name: "summary",
        label: "Summary",
        type: "textarea",
        colSpan: 2,
        rows: 2,
      },
      {
        name: "transcript",
        label: "Transcript",
        type: "editor",
        colSpan: 2,
      },
      {
        name: "keyPhrases",
        label: "Key Phrases",
        type: "text",
        placeholder: "Comma-separated",
      },
      {
        name: "recommendedPhrases",
        label: "Recommended Phrases",
        type: "text",
        placeholder: "Comma-separated",
      },
      {
        name: "sentimentTrend",
        label: "Sentiment Trend",
        type: "text",
        placeholder: "Comma-separated numbers, e.g. -0.8, -0.3, 0.4, 0.9",
      },
      {
        name: "tags",
        label: "Tags",
        type: "text",
        placeholder: "Comma-separated",
      },
      {
        name: "brandVoice",
        label: "Brand Voice (peer-review refinement)",
        type: "textarea",
        colSpan: 2,
        rows: 2,
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
    ): Promise<GetAllResponse<BCPlaybook>> {
      return adminPanelQueryResponseAll({
        data: await bcDatabase.playbooks.toArray(),
      });
    },
    getOne: async function (
      id: string | number,
    ): Promise<BCPlaybook | undefined> {
      return await bcDatabase.playbooks.get(Number(id));
    },
  },
  mutation: {
    create: async function (
      data: BCPlaybook,
    ): Promise<AdminPanelResult<BCPlaybook, unknown>> {
      const id = await bcDatabase.playbooks.add(data);
      return adminPanelResultSuccess<BCPlaybook>(
        (await bcDatabase.playbooks.get(id)) as BCPlaybook,
      );
    },
    update: async function (
      id: AdminPanelId,
      data: BCPlaybook,
    ): Promise<AdminPanelResult<BCPlaybook, unknown> | undefined> {
      if (typeof id !== "number") {
        throw new Error("Invalid ID type. Expected a number.");
      }
      await bcDatabase.playbooks.update(id, data);
      return adminPanelResultSuccess<BCPlaybook>(
        (await bcDatabase.playbooks.get(id)) as BCPlaybook,
      );
    },
    delete: async function (
      iid: AdminPanelId,
    ): Promise<AdminPanelResult<BCPlaybook, unknown> | undefined> {
      const id = Number(iid);
      await bcDatabase.playbooks.delete(id);
      return adminPanelResultSuccess<BCPlaybook>({} as BCPlaybook);
    },
  },
};
