// bui.skills-market.module.ts
//
// BunnyConfig driving the Skills Market page. The market is a read-only
// catalog (see bui.skills-market.constant.ts) — skills are moved into the
// Author Skills registry only through the explicit row/header actions below.
// A warning dialog is shown whenever the registry already contains a
// same-named skill so the user can decide whether to override it.

import React from "react";
import { CirclePlus, PlusCircle, Store, Eye } from "lucide-react";
import {
  BunnyConfig,
  BunnyKernel,
} from "@/src/modules/bunny/src/Bunny.Interface";
import {
  AdminPanelQueryOptions,
  GetAllResponse,
} from "@/src/modules/admin-panel/features/query/admin-panel-query.interface";
import { AdminPanelId } from "@/src/modules/admin-panel/features/id/admin-panel-id.interface";
import {
  AdminPanelResult,
  adminPanelResultSuccess,
} from "@/src/modules/admin-panel/shared/admin-panel-result";
import { adminPanelQueryResponseAll } from "../../../../admin-panel/features/query/admin-panel-query.util";
import { AdminPanelDialogOption } from "@/src/modules/admin-panel/features/dialog/admin-panel-dialog.interface";
import { buiDatabase } from "../../database/bui.database";
import {
  BUISkillsMarketRow,
  BUISkillsMarketSkill,
} from "./bui.skills-market.entity";
import {
  buiSkillsMarketAddSkillsToAuthorSkills,
  buiSkillsMarketAddToAuthorSkills,
  buiSkillsMarketBuildRows,
  buiSkillsMarketFindAuthorSkill,
  buiSkillsMarketGetSkillsByNames,
  buiSkillsMarketNameKey,
  buiSkillsMarketSummarize,
} from "./bui.skills-market.lib";
import BUISkillsMarketSearchComponent from "./bui.skills-market.search.component";
import BUISkillsMarketViewBody, { StatusBadge } from "./bui.skills-market.view-skills";

export const buiSkillsMarketModule: BunnyConfig<
  BUISkillsMarketRow,
  BUISkillsMarketRow
> = {
  title: "Market Skill",
  titlePlural: "Skills Market",
  rowKey: "name",
  header: {
    variant: "detailed",
    icon: React.createElement(Store),
    description:
      "Browse the skill marketplace. Select skills and use the header action, or use the row action, to add them to Author Skills.",
  },
  // tableMode: "mobile",
  // defaultRowActions: true,
  columns: [
    {
      field: "name",
      header: "Skill",
      isRowHeader: true,
      sortable: true,
    },
    {
      field: "description",
      header: "Description",
    },
    {
      field: "added",
      header: "Status",
      render: (row: BUISkillsMarketRow) =>
        React.createElement(StatusBadge, { added: row.added }),
    },
  ],
  defaultHeaderActions: false,
  headerActions: [
    {
      id: "market_search",
      label: "Search",
      displayMode: "always",
      render: () => React.createElement(BUISkillsMarketSearchComponent),
    },
    {
      id: "add_selection_to_author_skills",
      label: "Add Selection to Author Skills",
      icon: React.createElement(CirclePlus),
      variant: "primary",
      onClick: async (context) => {
        const { adminPanel } = context!;

        const selected = buiSkillsMarketGetSkillsByNames(
          adminPanel.table.selection,
        );
        if (selected.length === 0) {
          adminPanel.notify.info(
            "Select one or more skills in the table first.",
          );
          return;
        }

        const option: AdminPanelDialogOption = {
          title: "Add Selected Skills to Author Skills",
          actionId: "market_add_selection",
          labelPositive: "Add Skills",
          message: `${selected.length} selected skill${selected.length > 1 ? "s" : ""} will be added to Author Skills. Same-named skills already present are skipped unless you choose to override them.`,
          fields: [
            {
              name: "override",
              label:
                "Override existing skills with the same name (update name and description)",
              type: "checkbox",
              defaultValue: "false",
            },
          ],
          onConfirm: async ({ form }) => {
            const formData = Object.fromEntries(
              form,
            ) as Record<string, string>;
            const override = formData.override === "true";

            adminPanel.dialog.setLoading(true);
            try {
              const results = await buiSkillsMarketAddSkillsToAuthorSkills(
                selected,
                { override },
              );
              const summary = buiSkillsMarketSummarize(results);
              await adminPanel.table.refresh();

              const parts: string[] = [];
              if (summary.added > 0) {
                parts.push(`${summary.added} skill(s) added.`);
              }
              if (summary.overridden > 0) {
                parts.push(`${summary.overridden} overridden.`);
              }
              if (summary.skipped > 0) {
                parts.push(
                  `${summary.skipped} skipped (already in Author Skills).`,
                );
              }
              return {
                success: true,
                message: parts.join(" ") || "No changes were made.",
              };
            } catch (error) {
              console.error(error);
              return {
                success: false,
                message: "Failed to add skills to Author Skills.",
              };
            } finally {
              adminPanel.dialog.setLoading(false);
            }
          },
        };
        adminPanel.dialog.openDialog(option);
      },
    },
  ],
  rowActions: [
    {
      id: "view_skill",
      label: "View",
      icon: React.createElement(Eye),
      variant: "secondary",
      onClick: (
        row: BUISkillsMarketRow,
        context: BunnyKernel<BUISkillsMarketRow, unknown>,
      ) => {
        const option: AdminPanelDialogOption = {
          title: row.name,
          actionId: "market_view",
          contentOnly: true,
          hideFooter: true,
          size: "lg",
          fullHeight: false,
          children: React.createElement(BUISkillsMarketViewBody, { row }),
          onConfirm: async () => ({ success: true }),
        };
        context.adminPanel.dialog.openDialog(option);
      },
    },
    {
      id: "add_to_author_skills",
      label: "Add to Author Skills",
      icon: React.createElement(PlusCircle),
      variant: "primary",
      onClick: async (
        row: BUISkillsMarketRow,
        context: BunnyKernel<BUISkillsMarketRow, unknown>,
      ) => {
        const { adminPanel } = context;

        const existing = await buiSkillsMarketFindAuthorSkill(row.name);

        const runAdd = async (override: boolean) => {
          adminPanel.dialog.setLoading(true);
          try {
            const result = await buiSkillsMarketAddToAuthorSkills(
              { name: row.name, description: row.description },
              { override },
            );
            await adminPanel.table.refresh();
            if (result.overridden) {
              adminPanel.notify.success(
                `"${row.name}" overridden in Author Skills.`,
              );
            } else {
              adminPanel.notify.success(
                `"${row.name}" added to Author Skills.`,
              );
            }
            return { success: true };
          } catch (error) {
            console.error(error);
            return {
              success: false,
              message: "Failed to add this skill to Author Skills.",
            };
          } finally {
            adminPanel.dialog.setLoading(false);
          }
        };

        // Warning: a same-named skill already exists in Author Skills —
        // adding it would override the existing name/description.
        if (existing) {
          const option: AdminPanelDialogOption = {
            title: "Skill Already Exists",
            actionId: "market_override",
            labelPositive: "Override",
            labelNegative: "Cancel",
            message: `"${row.name}" already exists in Author Skills. Adding it will override the existing record (current description: "${
              existing.description ?? "—"
            }").`,
            onConfirm: async () => runAdd(true),
          };
          adminPanel.dialog.openDialog(option);
          return;
        }

        await runAdd(false);
      },
    },
  ],
  query: {
    getAll: async function (
      options: AdminPanelQueryOptions,
    ): Promise<GetAllResponse<BUISkillsMarketRow>> {
      const rows = await buiSkillsMarketBuildRows();

      const query = (options?.search?.search ?? "").trim().toLowerCase();
      const filtered = query
        ? rows.filter(
            (row) =>
              row.name.toLowerCase().includes(query) ||
              (row.description ?? "").toLowerCase().includes(query),
          )
        : rows;

      return adminPanelQueryResponseAll({
        data: filtered,
      });
    },
    getOne: async function (
      id: string | number,
    ): Promise<BUISkillsMarketRow | undefined> {
      const rows = await buiSkillsMarketBuildRows();
      return rows.find(
        (row) =>
          buiSkillsMarketNameKey(row.name) ===
          buiSkillsMarketNameKey(String(id)),
      );
    },
  },
  mutation: {
    // Marketplace rows are constant catalog entries; these mutations are
    // safety nets only and are intentionally hidden behind no default actions.
    create: async function (
      data: BUISkillsMarketRow,
    ): Promise<AdminPanelResult<BUISkillsMarketRow, unknown>> {
      const skill: BUISkillsMarketSkill = {
        name: data.name,
        description: data.description,
      };
      await buiSkillsMarketAddToAuthorSkills(skill);
      return adminPanelResultSuccess<BUISkillsMarketRow>({
        ...skill,
        added: true,
      });
    },
    update: async function (
      id: AdminPanelId,
      data: BUISkillsMarketRow,
    ): Promise<AdminPanelResult<BUISkillsMarketRow, unknown> | undefined> {
      const result = await buiSkillsMarketAddToAuthorSkills(
        { name: data.name, description: data.description },
        { override: true },
      );
      return adminPanelResultSuccess<BUISkillsMarketRow>({
        name: data.name,
        description: data.description,
        added: result.added,
      });
    },
    delete: async function (
      iid: AdminPanelId,
    ): Promise<AdminPanelResult<BUISkillsMarketRow, unknown> | undefined> {
      const existing = await buiSkillsMarketFindAuthorSkill(String(iid));
      if (existing?.id !== undefined) {
        await buiDatabase.authorSkills.delete(existing.id);
      }
      return adminPanelResultSuccess<BUISkillsMarketRow>(
        {} as BUISkillsMarketRow,
      );
    },
  },
};