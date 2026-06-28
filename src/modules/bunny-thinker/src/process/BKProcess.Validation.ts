// BKProcess.Validation.ts
//
// Form validation adapter for BKProcess using Zod schema via BunnyZodAdapter.

import { z } from "zod";
import { useBunnyZodAdapter } from "@/src/modules/bunny/adapters/BunnyZodAdapter";

export const bkProcessFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  associationId: z.string().min(1, "Association is required"),
  thoughtId: z.string().min(1, "Thought is required"),
  status: z.string().optional(),
});

export const useBKProcessFormValidation = () =>
  useBunnyZodAdapter(bkProcessFormSchema);
