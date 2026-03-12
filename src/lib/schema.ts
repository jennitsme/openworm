import { z } from "zod";

export const SkillSchema = z.object({
  name: z.string(),
  package: z.string(),
  config: z.record(z.string(), z.any()).optional(),
});

export const PoliciesSchema = z.object({
  timeout: z.number().optional(),
  memory: z.number().optional(),
  cpu: z.number().optional(),
  pids: z.number().optional(),
  egress: z.enum(["allow", "deny", "restrict"]).optional(),
  allowHosts: z.array(z.string()).optional(),
});

export const ScheduleSchema = z.object({
  cron: z.string(),
});

export const SecretRefSchema = z.object({
  name: z.string(),
  env: z.string().optional(),
});

export const OrgSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
});

export const ManifestSchema = z.object({
  version: z.string(),
  name: z.string(),
  runtime: z.string(),
  entry: z.string(),
  org: OrgSchema.optional(),
  vars: z.record(z.string(), z.any()).optional(),
  policies: PoliciesSchema.optional(),
  schedule: ScheduleSchema.optional(),
  skills: z.array(SkillSchema).optional(),
  secrets: z.array(SecretRefSchema).optional(),
});

export type Manifest = z.infer<typeof ManifestSchema>;

export function loadManifest(content: string): Manifest {
  const yaml = require("yaml");
  const data = yaml.parse(content);
  return ManifestSchema.parse(data);
}
