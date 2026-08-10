// bc.simulator-history.module.ts
//
// Simulator History — Bunny CRUD module that lists every persisted simulator
// run. Row actions let you reload (opens the simulator with the simulatorId
// query param) or delete a single record. Header actions let you delete all
// records or delete records for a specific simulatorId (feature #1).

import { BunnyConfig } from "@/src/modules/bunny/src/Bunny.Interface";
import type { BCSimulatorRecord } from "../simulator/bc.simulator.entity";
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
import { Trash2, ExternalLink } from "lucide-react";
import { AdminPanelDialogOption } from "@/src/modules/admin-panel/features/dialog/admin-panel-dialog.interface";

function formatDate(ts?: number): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleString();
}

// ── Module ─────────────────────────────────────────────────────────────────────

export const bcSimulatorHistoryModule: BunnyConfig<
  BCSimulatorRecord,
  BCSimulatorRecord
> = {
  title: "Simulator History",
  titlePlural: "Simulator History",
  rowKey: "id",
  onFormSuccess: { mode: "closeOnly" },
  columns: [
    {
      field: "caseTitle",
      header: "Case",
      isRowHeader: true,
      sortable: true,
      render: (row) => row.caseTitle ?? "—",
    },
    {
      field: "personaName",
      header: "Persona",
      render: (row) => row.personaName ?? "—",
    },
    {
      field: "agentPersonaName",
      header: "Agent",
      render: (row) => row.agentPersonaName ?? "Generic",
    },
    {
      field: "result",
      header: "Ending",
      render: (row) => row.result?.outcome ?? "—",
    },
    {
      field: "createdAt",
      header: "Created",
      render: (row) => formatDate(row.createdAt),
    },
  ],
  formConfig: {
    gridCols: 1,
    fields: [
      {
        name: "caseTitle",
        label: "Case",
        type: "text",
      },
      {
        name: "result",
        label: "Summary",
        type: "textarea",
        rows: 6,
      },
    ],
  },
  defaultHeaderActions: false,
  headerActions: [
    {
      id: "reload-simulator",
      label: "Open Selected in Simulator",
      icon: React.createElement(ExternalLink),
      variant: "primary",
      onClick: (context) => {
        const { adminPanel, router } = context!;
        const selection = adminPanel.table.selection as
          | Array<number | string>
          | undefined;
        const id = selection?.[0];
        if (id == null) {
          adminPanel.notify.error("Select a simulator record first.");
          return;
        }
        router.push(`/modules/bunny-case/simulator?simulatorId=${id}`);
      },
    },
    {
      id: "delete-by-simulator-id",
      label: "Delete by SimulatorId",
      icon: React.createElement(Trash2),
      variant: "danger",
      onClick: async (context) => {
        const { adminPanel } = context!;
        const action: AdminPanelDialogOption = {
          title: "Delete Simulator Records",
          actionId: "delete-simulator-by-id",
          fields: [
            {
              name: "simulatorId",
              label: "SimulatorId",
              type: "number",
            },
          ],
          async onConfirm({ form }) {
            adminPanel.dialog.setLoading(true);
            const { simulatorId } = Object.fromEntries(
              form,
            ) as Record<string, string>;
            const id = Number(simulatorId);
            if (!Number.isFinite(id) || id <= 0) {
              adminPanel.dialog.setLoading(false);
              return {
                success: false,
                message: "Enter a valid simulatorId.",
              };
            }
            await bcDatabase.simulators.delete(id);
            await adminPanel.table.fetchData();
            adminPanel.notify.success(
              `Simulator record #${id} deleted.`,
            );
            adminPanel.dialog.setLoading(false);
            return { success: true };
          },
        };
        adminPanel.dialog.openDialog(action);
      },
    },
    {
      id: "delete-all",
      label: "Delete All Simulators",
      icon: React.createElement(Trash2),
      variant: "danger",
      onClick: async (context) => {
        const { adminPanel } = context!;
        const action: AdminPanelDialogOption = {
          title: "Delete All Simulators",
          actionId: "delete-all-simulators",
          fields: [],
          async onConfirm() {
            adminPanel.dialog.setLoading(true);
            await bcDatabase.simulators.clear();
            await adminPanel.table.fetchData();
            adminPanel.notify.success("All simulator records deleted.");
            adminPanel.dialog.setLoading(false);
            return { success: true };
          },
        };
        adminPanel.dialog.openDialog(action);
      },
    },
  ],
  // Feature #1: per-row action that routes to the specific simulator request
  // id (`?simulatorId=<id>`) so the user can reopen a single run.
  defaultRowActions: false,
  rowActions: [
    {
      id: "open-in-simulator",
      label: "Open in Simulator",
      icon: React.createElement(ExternalLink),
      onClick: async (row, context) => {
        const { router } = context!;
        const id = row.id;
        if (id == null) return;
        router.push(`/modules/bunny-case/simulator?simulatorId=${id}`);
      },
    },
    {
      id: "delete-simulator-row",
      label: "Delete",
      icon: React.createElement(Trash2),
      onClick: async (row, context) => {
        const { adminPanel } = context!;
        const id = row.id;
        if (id == null) return;
        await bcDatabase.simulators.delete(id);
        await adminPanel.table.fetchData();
        adminPanel.notify.success(`Simulator record #${id} deleted.`);
      },
    },
  ],
  modalHeaderActions: [],
  query: {
    getAll: async function (
      _options: AdminPanelQueryOptions,
      _overrideOptions?: AdminPanelQueryOptions,
    ): Promise<GetAllResponse<BCSimulatorRecord>> {
      return adminPanelQueryResponseAll({
        data: (await bcDatabase.simulators.toArray()).reverse(),
      });
    },
    getOne: async function (
      id: string | number,
    ): Promise<BCSimulatorRecord | undefined> {
      return await bcDatabase.simulators.get(Number(id));
    },
  },
  mutation: {
    create: async function (
      data: BCSimulatorRecord,
    ): Promise<AdminPanelResult<BCSimulatorRecord, unknown>> {
      const id = await bcDatabase.simulators.add(data);
      return adminPanelResultSuccess<BCSimulatorRecord>(
        (await bcDatabase.simulators.get(id)) as BCSimulatorRecord,
      );
    },
    update: async function (
      id: AdminPanelId,
      data: BCSimulatorRecord,
    ): Promise<AdminPanelResult<BCSimulatorRecord, unknown> | undefined> {
      if (typeof id !== "number") {
        throw new Error("Invalid ID type. Expected a number.");
      }
      const existing = await bcDatabase.simulators.get(id);
      await bcDatabase.simulators.put({
        ...existing,
        ...data,
        id,
      } as BCSimulatorRecord);
      return adminPanelResultSuccess<BCSimulatorRecord>(
        (await bcDatabase.simulators.get(id)) as BCSimulatorRecord,
      );
    },
    delete: async function (
      iid: AdminPanelId,
    ): Promise<AdminPanelResult<BCSimulatorRecord, unknown> | undefined> {
      const id = Number(iid);
      await bcDatabase.simulators.delete(id);
      return adminPanelResultSuccess<BCSimulatorRecord>(
        {} as BCSimulatorRecord,
      );
    },
  },
};
