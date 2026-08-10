// bc.session-history.module.ts
//
// Session History — Bunny CRUD module that lists persisted trainer & gauntlet
// sessions. Header/row actions let you resume a session (opens the trainer or
// gauntlet with the `historyId` query parameter) or delete it (feature #7).

import { BunnyConfig } from "@/src/modules/bunny/src/Bunny.Interface";
import type { BCCaseSession } from "../trainer/bc.trainer.entity";
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
import { PlayCircle, Swords } from "lucide-react";

function formatDate(ts?: number): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleString();
}

function sessionHref(mode: string, id: number): string {
  const base =
    mode === "gauntlet"
      ? "/modules/bunny-case/gauntlet"
      : "/modules/bunny-case/trainer";
  return `${base}?historyId=${id}`;
}

export const bcSessionHistoryModule: BunnyConfig<BCCaseSession, BCCaseSession> = {
  title: "Session History",
  titlePlural: "Session History",
  rowKey: "id",
  onFormSuccess: { mode: "closeOnly" },
  columns: [
    {
      field: "id",
      header: "HistoryId",
      isRowHeader: true,
      sortable: true,
      render: (row) => `#${row.id}`,
    },
    {
      field: "mode",
      header: "Mode",
      render: (row) =>
        React.createElement(
          "span",
          { className: "flex items-center gap-1" },
          row.mode === "gauntlet"
            ? React.createElement(Swords, {
                className: "w-3.5 h-3.5 text-rose-500",
              })
            : React.createElement(PlayCircle, {
                className: "w-3.5 h-3.5 text-emerald-500",
              }),
          " ",
          row.mode,
        ),
    },
    {
      field: "status",
      header: "Status",
      render: (row) => row.status ?? "—",
    },
    {
      field: "startedAt",
      header: "Started",
      render: (row) => formatDate(row.startedAt),
    },
  ],
  formConfig: {
    gridCols: 1,
    fields: [
      { name: "mode", label: "Mode", type: "text" },
      { name: "status", label: "Status", type: "text" },
      { name: "summary", label: "Summary", type: "textarea", rows: 4 },
    ],
  },
  defaultHeaderActions: false,
  headerActions: [
    {
      id: "resume-session",
      label: "Resume Selected",
      icon: React.createElement(PlayCircle),
      variant: "primary",
      onClick: (context) => {
        const { adminPanel, router } = context!;
        const selection = adminPanel.table.selection as
          | Array<number | string>
          | undefined;
        const id = selection?.[0];
        if (id == null) {
          adminPanel.notify.error("Select a session first.");
          return;
        }
        const session = adminPanel.table.rows.find(
          (r) => r.id === Number(id),
        );
        const mode = session?.mode ?? "trainer";
        router.push(sessionHref(mode, Number(id)));
      },
    },
  ],
  defaultRowActions: true,
  rowActions: [
    {
      id: "resume",
      label: "Resume",
      icon: React.createElement(PlayCircle),
      onClick: async (row, context) => {
        const { router } = context!;
        const id = row.id;
        if (id == null) return;
        router.push(sessionHref(row.mode ?? "trainer", id));
      },
    },
  ],
  modalHeaderActions: [],
  query: {
    getAll: async function (
      _options: AdminPanelQueryOptions,
      _overrideOptions?: AdminPanelQueryOptions,
    ): Promise<GetAllResponse<BCCaseSession>> {
      return adminPanelQueryResponseAll({
        data: (await bcDatabase.sessions.toArray()).reverse(),
      });
    },
    getOne: async function (
      id: string | number,
    ): Promise<BCCaseSession | undefined> {
      return await bcDatabase.sessions.get(Number(id));
    },
  },
  mutation: {
    create: async function (
      data: BCCaseSession,
    ): Promise<AdminPanelResult<BCCaseSession, unknown>> {
      const id = await bcDatabase.sessions.add(data);
      return adminPanelResultSuccess<BCCaseSession>(
        (await bcDatabase.sessions.get(id)) as BCCaseSession,
      );
    },
    update: async function (
      id: AdminPanelId,
      data: BCCaseSession,
    ): Promise<AdminPanelResult<BCCaseSession, unknown> | undefined> {
      if (typeof id !== "number") {
        throw new Error("Invalid ID type. Expected a number.");
      }
      // Use `put` (merge) instead of `update` because BCCaseSession now has a
      // nested `summaryData` object which does not satisfy Dexie's UpdateSpec.
      const existing = await bcDatabase.sessions.get(id);
      await bcDatabase.sessions.put({
        ...existing,
        ...data,
        id,
      } as BCCaseSession);
      return adminPanelResultSuccess<BCCaseSession>(
        (await bcDatabase.sessions.get(id)) as BCCaseSession,
      );
    },
    delete: async function (
      iid: AdminPanelId,
    ): Promise<AdminPanelResult<BCCaseSession, unknown> | undefined> {
      const id = Number(iid);
      await bcDatabase.sessions.delete(id);
      return adminPanelResultSuccess<BCCaseSession>({} as BCCaseSession);
    },
  },
};
