import { z } from "zod";

export const ToolSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  input: z.record(z.string(), z.any()).optional(),
  output: z.record(z.string(), z.any()).optional(),
});

export type Tool = z.infer<typeof ToolSchema>;
