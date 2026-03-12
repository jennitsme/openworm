import fs from "fs";
import path from "path";
import { ragTemplate } from "../templates/rag";
import { browserTemplate } from "../templates/browser";
import { automationTemplate } from "../templates/automation";
import { ragEmbTemplate } from "../templates/rag-emb";
import { browserHelperTemplate } from "../templates/browser-helper";

export type TemplateName = "rag" | "rag-emb" | "browser" | "browser-helper" | "automation";

type TemplateDef = { manifest: string; code: string };

const registry: Record<TemplateName, TemplateDef> = {
  rag: ragTemplate,
  "rag-emb": ragEmbTemplate,
  browser: browserTemplate,
  "browser-helper": browserHelperTemplate,
  automation: automationTemplate,
};

export function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

export function scaffold(template: TemplateName, name: string, targetDir: string) {
  const tpl = registry[template];
  if (!tpl) throw new Error(`Unknown template ${template}`);

  const manifestPath = path.join(targetDir, "openworm.yaml");
  const agentDir = path.join(targetDir, "agents", name);
  ensureDir(agentDir);

  const manifestContent = tpl.manifest.replace(/\$\{name\}/g, name);
  fs.writeFileSync(manifestPath, manifestContent, "utf-8");

  const codePath = path.join(agentDir, "index.ts");
  fs.writeFileSync(codePath, tpl.code, "utf-8");

  return { manifestPath, codePath };
}
