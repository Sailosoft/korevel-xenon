import { PhazeRepository } from "@/src/modules/phaze/src/PhazeRepository";
import { BFlowPoolAgentEntity } from "./BFlowPoolAgent.Types";

export class BFlowPoolAgentRepository extends PhazeRepository<BFlowPoolAgentEntity> {
  async findByPoolId(poolId: string): Promise<BFlowPoolAgentEntity[]> {
    return this.set.where("poolId").equals(poolId).toArray();
  }
}
