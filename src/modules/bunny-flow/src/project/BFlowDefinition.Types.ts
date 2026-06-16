import { z } from "zod";

export const BFlowDefinitionSchema = z.object({
  id: z.number().int(),
  name: z.string().min(1),
});

export type BFlowDefinitionEntity = z.infer<typeof BFlowDefinitionSchema>;
