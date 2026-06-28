import { z } from "zod";
import { useBunnyZodAdapter } from "@/src/modules/bunny/adapters/BunnyZodAdapter";

export const bkThoughtPatternFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  group: z.string().optional(),
  description: z.string().optional(),
  slots: z.array(z.any()).optional(),
});

export const useBKThoughtPatternFormValidation = () =>
  useBunnyZodAdapter(bkThoughtPatternFormSchema);
