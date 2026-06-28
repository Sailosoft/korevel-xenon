import { z } from "zod";
import { useBunnyZodAdapter } from "@/src/modules/bunny/adapters/BunnyZodAdapter";

export const bkThinkerFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  role: z.string().min(1, "Role is required"),
  specialization: z.string().optional(),
  rules: z.string().optional(),
});

export const useBKThinkerFormValidation = () =>
  useBunnyZodAdapter(bkThinkerFormSchema);
