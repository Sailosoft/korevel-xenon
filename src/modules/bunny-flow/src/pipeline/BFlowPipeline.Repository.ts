import { BunnySelectOption } from "@/src/modules/bunny/src/form/BunnyForm.Interface";
import { PhazeRepository } from "@/src/modules/phaze/src/PhazeRepository";
import { BFlowPipelineEntity } from "./BFlowPipeline.Types";

export class BFlowPipelineRepository extends PhazeRepository<BFlowPipelineEntity> {
  async toSelectOptions(): Promise<BunnySelectOption[]> {
    const items = await this.set.toArray();
    return items.map((item) => ({ label: item.name, value: item.id }));
  }
}
