#!/usr/bin/env node
import { Command } from "commander";
import path from "path";
import fs from "fs";
import { scaffold, TemplateName } from "./lib/templates";
import { ManifestSchema } from "./lib/schema";
import YAML from "yaml";
import { readFileSync, writeFileSync } from "fs";

const pkg = require("../package.json");

const program = new Command();
program.name("openworm").description("Developer-first agent CLI").version(pkg.version);

program
  .command("init")
  .description("Scaffold an agent")
  .requiredOption("--template <name>", "Template name (rag|rag-emb|browser|browser-helper|automation)")
  .requiredOption("--name <agent>", "Agent name")
  .option("--dir <path>", "Target directory", ".")
  .action((opts) => {
    const template = opts.template as TemplateName;
    const name = opts.name as string;
    const targetDir = path.resolve(process.cwd(), opts.dir);
    const { manifestPath, codePath } = scaffold(template, name, targetDir);
    console.log(`Scaffolded ${name} with template ${template}`);
    console.log(`- manifest: ${path.relative(process.cwd(), manifestPath)}`);
    console.log(`- code:     ${path.relative(process.cwd(), codePath)}`);
  });

program
  .command("dev")
  .description("Generate docker-compose for local parity")
  .option("--manifest <path>", "Path to openworm.yaml", "openworm.yaml")
  .option("--out <file>", "Output compose file", "docker-compose.openworm.yml")
  .action((opts) => {
    const manifestPath = path.resolve(process.cwd(), opts.manifest);
    if (!fs.existsSync(manifestPath)) {
      console.error(`manifest not found: ${manifestPath}`);
      process.exit(1);
    }
    const content = fs.readFileSync(manifestPath, "utf-8");
    const manifest = ManifestSchema.parse(YAML.parse(content));
    const serviceName = manifest.name.replace(/[^a-zA-Z0-9_-]/g, "-");
    const isTs = manifest.entry.endsWith(".ts");
    const cmd = isTs
      ? ["npx", "ts-node-dev", "--respawn", "--transpileOnly", manifest.entry]
      : ["node", manifest.entry];
    const compose = {
      version: "3.9",
      services: {
        [serviceName]: {
          image: "node:20",
          working_dir: "/app",
          volumes: ["./:/app"],
          command: cmd,
          environment: { NODE_ENV: "development", ...(manifest.vars || {}) },
        },
      },
    };
    const outPath = path.resolve(process.cwd(), opts.out);
    fs.writeFileSync(outPath, YAML.stringify(compose), "utf-8");
    console.log(`Generated ${opts.out} for service ${serviceName}`);
  });

program
  .command("deploy")
  .description("Deploy manifest to control plane (stub)")
  .option("--manifest <path>", "Path to openworm.yaml", "openworm.yaml")
  .option("--api <url>", "Control plane API", process.env.OPENWORM_API_URL || "http://localhost:8080")
  .action(async (opts) => {
    try {
      const manifestPath = path.resolve(process.cwd(), opts.manifest);
      if (!fs.existsSync(manifestPath)) {
        console.error(`manifest not found: ${manifestPath}`);
        process.exit(1);
      }
      const content = fs.readFileSync(manifestPath, "utf-8");
      const manifest = ManifestSchema.parse(YAML.parse(content));
      const payload = { manifest };
      const url = `${opts.api}/deploy`;
      console.log(`POST ${url}`);
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error(`deploy failed: ${res.status} ${res.statusText}`);
        if (data?.issues) console.error(JSON.stringify(data.issues, null, 2));
        else console.error(data);
        process.exit(1);
      }
      console.log("deploy ok", data);
    } catch (err: any) {
      if (err.issues) {
        console.error("Manifest validation failed:");
        console.error(JSON.stringify(err.issues, null, 2));
      } else {
        console.error(err.message || err);
      }
      process.exit(1);
    }
  });

program.parse(process.argv);
