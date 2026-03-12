#!/usr/bin/env node
import { Command } from "commander";
import path from "path";
import fs from "fs";
import { scaffold, TemplateName } from "./lib/templates";

const pkg = require("../package.json");

const program = new Command();
program.name("openworm").description("Developer-first agent CLI").version(pkg.version);

program
  .command("init")
  .description("Scaffold an agent")
  .requiredOption("--template <name>", "Template name (rag|browser|automation)")
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
  .description("Run local dev (stub)")
  .action(() => {
    console.log("[stub] Run docker compose up with your manifest. Coming soon.");
  });

program
  .command("deploy")
  .description("Deploy to cloud control plane (stub)")
  .action(() => {
    console.log("[stub] Deploy manifest to openworm control plane. Coming soon.");
  });

program.parse(process.argv);
