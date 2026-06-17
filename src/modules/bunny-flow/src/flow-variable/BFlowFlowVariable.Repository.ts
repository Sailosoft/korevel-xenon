import { PhazeRepository } from "@/src/modules/phaze/src/PhazeRepository";
import { BFlowFlowVariableEntity } from "./BFlowFlowVariable.Types";

export class BFlowFlowVariableRepository extends PhazeRepository<BFlowFlowVariableEntity> {
  async findByGroupId(groupId: string): Promise<BFlowFlowVariableEntity[]> {
    return this.set.where("groupId").equals(groupId).toArray();
  }
}
