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
    key: "ai_provider",
    label: "AI Provider",
    value: "google",
    description: "The primary AI provider to use for text generation.",
  },
  {
    key: "default_ai_model",
    label: "Default AI Model",
    value: "gemini-1.5-flash",
    description: "The default model identifier used for executing prompt templates.",
  },
];

export const buiSettingsModule: BunnyConfig<BUISetting, BUISetting> = {
  title: "Setting",
  titlePlural: "Settings",
  rowKey: "key",
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
  formConfig: {
    fields: [
      {
        name: "label",
        label: "Setting Name",
        type: "text",
        disabled: true,
      },
      {
        name: "value",
        label: "Value",
        type: "text",
        rules: [
          {
            rule: "required",
            message: "Value is required",
          },
        ],
      },
    ],
  },
  defaultHeaderActions: false,
  defaultRowActions: true,
  hideRowActions: ["delete"],
  query: {
    getAll: async function (
      _options: AdminPanelQueryOptions,
      _overrideOptions?: AdminPanelQueryOptions,
    ): Promise<GetAllResponse<BUISetting>> {
      const existing = await buiDatabase.settings.toArray();
      const existingMap = new Map(existing.map((s) => [s.key, s]));

      for (const preset of PREDEFINED_SETTINGS) {
        if (!existingMap.has(preset.key)) {
          await buiDatabase.settings.add(preset);
          existing.push(preset);
          existingMap.set(preset.key, preset);
        }
      }

      return adminPanelQueryResponseAll({
        data: existing,
      });
    },
    getOne: async function (
      key: string | number,
    ): Promise<BUISetting | undefined> {
      return await buiDatabase.settings.get(String(key));
    },
  },
  mutation: {
    create: async function (
      data: BUISetting,
    ): Promise<AdminPanelResult<BUISetting, unknown>> {
      await buiDatabase.settings.add(data);
      return adminPanelResultSuccess<BUISetting>(
        (await buiDatabase.settings.get(data.key)) as BUISetting,
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