import { z } from "zod";

export const SkillSchema = z.object({
  name: z.string(),
  package: z.string(),
  config: z.record(z.string(), z.any()).optional(),
});

export const PoliciesSchema = z.object({
  timeout: z.number().optional(),
  memory: z.number().optional(),
  egress: z.enum(["allow", "deny", "restrict"]).optional(),
});

export const ScheduleSchema = z.object({
  cron: z.string(),
});

export const ManifestSchema = z.object({
  version: z.string(),
  name: z.string(),
  runtime: z.string(),
  entry: z.string(),
  vars: z.record(z.string(), z.any()).optional(),
  policies: PoliciesSchema.optional(),
  schedule: ScheduleSchema.optional(),
  skills: z.array(SkillSchema).optional(),
});

export type Manifest = z.infer<typeof ManifestSchema>;

export function loadManifest(content: string): Manifest {
  const yaml = require("yaml");
  const data = yaml.parse(content);
  return ManifestSchema.parse(data);
}
