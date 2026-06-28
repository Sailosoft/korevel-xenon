import { z } from "zod";
import { useBunnyZodAdapter } from "@/src/modules/bunny/adapters/BunnyZodAdapter";

export const bkThoughtFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  thought: z.string().min(1, "Thought content is required"),
  description: z.string().optional(),
  patternId: z.string().optional(),
  ideaIds: z.array(z.string()).optional(),
  craftId: z.string().optional(),
});

export const useBKThoughtFormValidation = () =>
  useBunnyZodAdapter(bkThoughtFormSchema);
