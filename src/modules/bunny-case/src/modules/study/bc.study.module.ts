// bc.study.module.ts
//
// Study — Bunny CRUD module that lists AI-generated handbooks. Studies are
// generated from a case via the Study UI and saved here for later reference.

import { BunnyConfig } from "@/src/modules/bunny/src/Bunny.Interface";
import { BCStudy } from "./bc.study.entity";
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
import React from "react";
import { Eye, Trash2, Sparkles } from "lucide-react";

export const bcStudyModule: BunnyConfig<BCStudy, BCStudy> = {
  title: "Study",
  titlePlural: "Studies",
  rowKey: "id",
  onFormSuccess: { mode: "closeOnly" },
  columns: [
    { field: "title", header: "Title", isRowHeader: true, sortable: true },
    { field: "caseTitle", header: "Case" },
    { field: "wordCount", header: "Words" },
    {
      field: "generateType",
      header: "Type",
      render: (row) => row.generateType ?? "default",
    },
    {
      field: "createdAt",
      header: "Created",
      render: (row) =>
        row.createdAt ? new Date(row.createdAt).toLocaleString() : "—",
    },
  ],
  formConfig: {
    gridCols: 1,
    fields: [
      { name: "title", label: "Title", type: "text", colSpan: 2 },
      { name: "caseTitle", label: "Case", type: "text" },
      {
        name: "content",
        label: "Handbook",
        type: "editor",
        colSpan: 2,
      },
      {
        name: "outline",
        label: "Outline (JSON)",
        type: "textarea",
        colSpan: 2,
        rows: 4,
      },
    ],
  },
  defaultHeaderActions: true,
  // Header action: open the Study generator (different route from the list).
  headerActions: [
    {
      id: "generate-handbook",
      label: "Generate Handbook",
      icon: React.createElement(Sparkles),
      variant: "primary",
      onClick: (context) => {
        const { router } = context!;
        router.push("/modules/bunny-case/study/generate");
      },
    },
  ],
  // Feature #4: each study record has a View action that opens the dedicated
  // viewer route (which renders the handbook with the Render module).
  defaultRowActions: false,
  rowActions: [
    {
      id: "view-study",
      label: "View",
      icon: React.createElement(Eye),
      onClick: async (row, context) => {
        const { router } = context!;
        const id = row.id;
        if (id == null) return;
        router.push(`/modules/bunny-case/study/view/${id}`);
      },
    },
    {
      id: "delete-study-row",
      label: "Delete",
      icon: React.createElement(Trash2),
      onClick: async (row, context) => {
        const { adminPanel } = context!;
        const id = row.id;
        if (id == null) return;
        await bcDatabase.studies.delete(id);
        await adminPanel.table.fetchData();
        adminPanel.notify.success(`Study #${id} deleted.`);
      },
    },
  ],
  modalHeaderActions: [],
  query: {
    getAll: async function (
      _options: AdminPanelQueryOptions,
      _overrideOptions?: AdminPanelQueryOptions,
    ): Promise<GetAllResponse<BCStudy>> {
      return adminPanelQueryResponseAll({
        data: (await bcDatabase.studies.toArray()).reverse(),
      });
    },
    getOne: async function (id: string | number): Promise<BCStudy | undefined> {
      return await bcDatabase.studies.get(Number(id));
    },
  },
  mutation: {
    create: async function (
      data: BCStudy,
    ): Promise<AdminPanelResult<BCStudy, unknown>> {
      const id = await bcDatabase.studies.add(data);
      return adminPanelResultSuccess<BCStudy>(
        (await bcDatabase.studies.get(id)) as BCStudy,
      );
    },
    update: async function (
      id: AdminPanelId,
      data: BCStudy,
    ): Promise<AdminPanelResult<BCStudy, unknown> | undefined> {
      if (typeof id !== "number") {
        throw new Error("Invalid ID type. Expected a number.");
      }
      await bcDatabase.studies.put({ ...data, id });
      return adminPanelResultSuccess<BCStudy>(
        (await bcDatabase.studies.get(id)) as BCStudy,
      );
    },
    delete: async function (
      iid: AdminPanelId,
    ): Promise<AdminPanelResult<BCStudy, unknown> | undefined> {
      const id = Number(iid);
      await bcDatabase.studies.delete(id);
      return adminPanelResultSuccess<BCStudy>({} as BCStudy);
    },
  },
};
