import { BunnySelectOption } from "@/src/modules/bunny/src/form/BunnyForm.Interface";
import { PhazeRepository } from "@/src/modules/phaze/src/PhazeRepository";
import { BFlowReportTemplateEntity } from "./BFlowReport.Types";

export class BFlowReportRepository extends PhazeRepository<BFlowReportTemplateEntity> {
  async toSelectOptions(): Promise<BunnySelectOption[]> {
    const items = await this.set.toArray();
    return items.map((item) => ({ label: item.filename, value: item.id }));
  }
}
