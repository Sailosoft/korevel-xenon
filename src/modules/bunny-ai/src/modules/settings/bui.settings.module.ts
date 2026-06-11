import { BunnyConfig } from "@/src/modules/bunny/src/Bunny.Interface";
import { BUISetting } from "./bui.settings.entity";
import {
  AdminPanelQueryOptions,
  GetAllResponse,
} from "@/src/modules/admin-panel/features/query/admin-panel-query.interface";
import { AdminPanelId } from "@/src/modules/admin-panel/features/id/admin-panel-id.interface";
import {
  AdminPanelResult,
  adminPanelResultSuccess,
} from "@/src/modules/admin-panel/shared/admin-panel-result";
import { buiDatabase } from "../../database/bui.database";
import { adminPanelQueryResponseAll } from "../../../../admin-panel/features/query/admin-panel-query.util";

const PREDEFINED_SETTINGS: BUISetting[] = [
  {
    id: "ai_provider",
    label: "AI Provider",
    value: "default",
    description: "The primary AI provider to use for text generation.",
  },
  {
    id: "default_ai_model",
    label: "Default AI Model",
    value: "default",
    description:
      "The default model identifier used for executing prompt templates.",
  },
];

export const buiSettingsModule: BunnyConfig<BUISetting, BUISetting> = {
  title: "Setting",
  titlePlural: "Settings",
  rowKey: "id",
  columns: [
    {
      field: "label",
      header: "Setting Name",
      sortable: true,
      isRowHeader: true,
    },
    {
      field: "value",
      header: "Value",
      sortable: true,
    },
    {
      field: "description",
      header: "Description",
    },
  ],
  // formConfig: {
  //   fields: [
  //     {
  //       name: "key",
  //       label: "Key",
  //       type: "text",
  //     },
  //     {
  //       name: "label",
  //       label: "Label",
  //       type: "text",
  //     },
  //     {
  //       name: "description",
  //       label: "Description",
  //       type: "text",
  //     },
  //     {
  //       name: "value",
  //       label: "Value",
  //       type: "text",
  //     },
  //   ],
  //   gridCols: 1,
  // },
  defaultHeaderActions: false,
  defaultRowActions: true,
  hideRowActions: ["delete"],
  query: {
    getAll: async function (
      _options: AdminPanelQueryOptions,
      _overrideOptions?: AdminPanelQueryOptions,
    ): Promise<GetAllResponse<BUISetting>> {
      const existing = await buiDatabase.settings.toArray();
      const existingMap = new Map(existing.map((s) => [s.id, s]));

      for (const preset of PREDEFINED_SETTINGS) {
        if (!existingMap.has(preset.id)) {
          await buiDatabase.settings.add(preset);
          existing.push(preset);
          existingMap.set(preset.id, preset);
        }
      }

      return adminPanelQueryResponseAll({
        data: existing,
      });
    },
    getOne: async function (
      key: string | number,
    ): Promise<BUISetting | undefined> {
      const data = await buiDatabase.settings.get(String(key));
      return data;
    },
  },
  mutation: {
    create: async function (
      data: BUISetting,
    ): Promise<AdminPanelResult<BUISetting, unknown>> {
      await buiDatabase.settings.add(data);
      return adminPanelResultSuccess<BUISetting>(
        (await buiDatabase.settings.get(data.id)) as BUISetting,
      );
    },
    update: async function (
      key: AdminPanelId,
      data: BUISetting,
    ): Promise<AdminPanelResult<BUISetting, unknown> | undefined> {
      await buiDatabase.settings.update(String(key), data);
      return adminPanelResultSuccess<BUISetting>(
        (await buiDatabase.settings.get(String(key))) as BUISetting,
      );
    },
    delete: async function (
      key: AdminPanelId,
    ): Promise<AdminPanelResult<BUISetting, unknown> | undefined> {
      const setting = await buiDatabase.settings.get(String(key));
      await buiDatabase.settings.delete(String(key));
      return adminPanelResultSuccess<BUISetting>(setting as BUISetting);
    },
  },
};
