import { z } from "zod";
import { useBunnyZodAdapter } from "@/src/modules/bunny/adapters/BunnyZodAdapter";

export const bkIdeaFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  idea: z.string().min(1, "Idea content is required"),
  tags: z.string().optional(),
});

export const useBKIdeaFormValidation = () =>
  useBunnyZodAdapter(bkIdeaFormSchema);
