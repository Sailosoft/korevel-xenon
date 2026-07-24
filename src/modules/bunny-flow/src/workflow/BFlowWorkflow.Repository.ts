import { BunnySelectOption } from "@/src/modules/bunny/src/form/BunnyForm.Interface";
import { PhazeRepository } from "@/src/modules/phaze/src/PhazeRepository";
import { parse as parseYaml } from "yaml";
import { AdminPanelId } from "@/src/modules/admin-panel/features/id/admin-panel-id.interface";
import { PhazeRepositoryResult } from "@/src/modules/phaze/src/types/PhazeResult.Types";
import { BFlowWorkflowSchema } from "./BFlowWorkflow.Types";
import {
  BFlowWorkflowTemplateEntity,
  BFlowWorkflowTemplateForm,
} from "./BFlowWorkflow.Entity";

export class BFlowWorkflowRepository extends PhazeRepository<
  BFlowWorkflowTemplateEntity,
  BFlowWorkflowTemplateForm
> {
  async toSelectOptions(): Promise<BunnySelectOption[]> {
    const items = await this.set.toArray();
    return items.map((item) => ({ label: item.name, value: item.id }));
  }

  /**
   * Returns select options for workflow templates filtered by flow ID.
   * Used by the variable group form to show only workflows belonging
   * to the current flow definition.
   */
  async toSelectOptionsByFlowId(flowId: string): Promise<BunnySelectOption[]> {
    const items = await this.set
      .filter((item) => item.flowId === flowId)
      .toArray();
    return items.map((item) => ({
      label: `${item.name}${item.version ? ` (v${item.version})` : ""}`,
      value: item.id,
    }));
  }

  private parseTemplate(
    data: BFlowWorkflowTemplateEntity,
  ): BFlowWorkflowTemplateEntity {
    if (!data.templateYaml) return data;

    try {
      const parsed = parseYaml(data.templateYaml);
      const template = BFlowWorkflowSchema.parse(parsed);
      return { ...data, template };
    } catch (e) {
      // If parsing or validation fails, return data without the template object
      // or handle as needed (e.g., log error)
      return data;
    }
  }

  async create(
    data: BFlowWorkflowTemplateEntity,
  ): Promise<PhazeRepositoryResult<BFlowWorkflowTemplateEntity>> {
    return super.create(this.parseTemplate(data));
  }

  async update(
    id: AdminPanelId,
    data: BFlowWorkflowTemplateEntity,
  ): Promise<PhazeRepositoryResult<BFlowWorkflowTemplateEntity>> {
    return super.update(id, this.parseTemplate(data));
  }
}
