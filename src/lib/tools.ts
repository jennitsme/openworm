import { z } from "zod";

export const ToolSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  input: z.record(z.string(), z.any()).optional(),
  output: z.record(z.string(), z.any()).optional(),
});

export const SkillRegistryItemSchema = z.object({
  name: z.string(),
  package: z.string(),
  version: z.string().optional(),
  tools: z.array(ToolSchema).optional(),
  orgId: z.string().optional(),
});

export type Tool = z.infer<typeof ToolSchema>;
export type SkillRegistryItem = z.infer<typeof SkillRegistryItemSchema>;
