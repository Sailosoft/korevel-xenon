import { z } from "zod";

// // 1. Define the Zod Schema for runtime validation
// export const UserEntitySchema = z.object({
//   id: z.string().uuid(),
//   name: z.string().min(2),
//   email: z.string().email(),
//   role: z.enum(['admin', 'user']),
//   createdAt: z.date().default(() => new Date()),
// });

// // 2. Infer the TypeScript type/interface from the schema
// export type UserEntity = z.infer<typeof UserEntitySchema>;

export const BFlowProjectSchema = z.object({
  id: z.number().int(),
  name: z.string().min(1),
});

export type BFlowProjectEntity = z.infer<typeof BFlowProjectSchema>;
