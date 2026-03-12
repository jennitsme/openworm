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
  .command("list")
  .description("List deployments from control plane")
  .option("--api <url>", "Control plane API", process.env.OPENWORM_API_URL || "http://localhost:8080")
  .action(async (opts) => {
    const url = `${opts.api}/deployments`;
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error(`list failed: ${res.status}`);
      console.error(data);
      process.exit(1);
    }
    const rows = (data.deployments || []).map((d: any) => ({ name: d.manifest?.name, ts: new Date(d.ts).toISOString() }));
    console.table(rows);
  });

program
  .command("run")
  .description("Queue a run")
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
      const url = `${opts.api}/run`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manifest }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error(`run failed: ${res.status}`);
        if (data?.issues) console.table(data.issues.map((i: any) => ({ path: i.path?.join?.(".") || "", message: i.message })));
        else console.error(data);
        process.exit(1);
      }
      console.log("run queued", data);
    } catch (err: any) {
      if (err.issues) console.table(err.issues.map((i: any) => ({ path: i.path?.join?.(".") || "", message: i.message })));
      else console.error(err.message || err);
      process.exit(1);
    }
  });

program
  .command("logs")
  .description("Fetch run logs")
  .option("--api <url>", "Control plane API", process.env.OPENWORM_API_URL || "http://localhost:8080")
  .option("--run <id>", "Run ID to filter")
  .action(async (opts) => {
    const url = `${opts.api}/runlogs${opts.run ? `?runId=${opts.run}` : ""}`;
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error(`logs failed: ${res.status}`);
      console.error(data);
      process.exit(1);
    }
    (data.runLogs || []).forEach((l: any) => {
      console.log(new Date(l.ts).toISOString(), l.runId, l.line.trim());
    });
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
        if (data?.issues) {
          const rows = data.issues.map((i: any) => ({ path: i.path?.join?.(".") || "", message: i.message }));
          console.table(rows);
        } else console.error(data);
        process.exit(1);
      }
      console.log("deploy ok", data);
    } catch (err: any) {
      if (err.issues) {
        const rows = err.issues.map((i: any) => ({ path: i.path?.join?.(".") || "", message: i.message }));
        console.error("Manifest validation failed:");
        console.table(rows);
      } else {
        console.error(err.message || err);
      }
      process.exit(1);
    }
  });

program.parse(process.argv);
