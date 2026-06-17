import { BunnySelectOption } from "@/src/modules/bunny/src/form/BunnyForm.Interface";
import { PhazeRepository } from "@/src/modules/phaze/src/PhazeRepository";
import { BFlowDefinitionEntity } from "./BFlowDefinition.Types";

export class BFlowDefinitionRepository extends PhazeRepository<BFlowDefinitionEntity> {
  async toSelectOptions(): Promise<BunnySelectOption[]> {
    const items = await this.set.toArray();
    return items.map((item) => ({ label: item.name, value: item.id }));
  }
}
