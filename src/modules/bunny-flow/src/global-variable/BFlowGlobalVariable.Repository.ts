import { BunnySelectOption } from "@/src/modules/bunny/src/form/BunnyForm.Interface";
import { PhazeRepository } from "@/src/modules/phaze/src/PhazeRepository";
import { BFlowGlobalVariableEntity } from "./BFlowGlobalVariable.Types";

export class BFlowGlobalVariableRepository extends PhazeRepository<BFlowGlobalVariableEntity> {
  async toSelectOptions(): Promise<BunnySelectOption[]> {
    const items = await this.set.toArray();
    return items.map((item) => ({
      label: `${item.name} (${item.group ?? "ungrouped"})`,
      value: item.id,
    }));
  }
}
