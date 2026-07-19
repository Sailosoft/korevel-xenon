import { PhazeRepository } from "@/src/modules/phaze/src/PhazeRepository";
import { BFlowPoolEntity, BFlowPoolForm } from "./BFlowPool.Types";

export class BFlowPoolRepository extends PhazeRepository<BFlowPoolEntity, string> {
  /**
   * Creates a new pool entity with default values
   */
  createDefault(): BFlowPoolEntity {
    const now = new Date();
    return {
      id: "",
      flowId: "",
      code: "",
      name: "",
      description: undefined,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Creates a new pool entity from form data
   */
  createFromForm(form: BFlowPoolForm): BFlowPoolEntity {
    const now = new Date();
    return {
      id: "",
      flowId: form.flowId,
      code: form.code,
      name: form.name,
      description: form.description,
      status: form.status || "draft",
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Updates an existing pool with form data
   */
  updateFromForm(
    existing: BFlowPoolEntity,
    form: BFlowPoolForm,
  ): BFlowPoolEntity {
    return {
      ...existing,
      flowId: form.flowId,
      code: form.code,
      name: form.name,
      description: form.description,
      status: form.status || existing.status,
      updatedAt: new Date(),
    };
  }
}
