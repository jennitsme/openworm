import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { ManifestSchema } from "./lib/schema";
import { spawn } from "child_process";
import crypto from "crypto";

const API_KEY = process.env.OPENWORM_API_KEY || "";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

function authGuard(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!API_KEY) return next();
  const hdr = req.headers["authorization"];
  if (!hdr || hdr !== `Bearer ${API_KEY}`) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
}

const dataDir = path.join(process.cwd(), "data");
const deployFile = path.join(dataDir, "deployments.json");
const logsFile = path.join(dataDir, "logs.json");
const runsFile = path.join(dataDir, "runs.json");
const runLogsFile = path.join(dataDir, "runlogs.json");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
let deployments: { manifest: any; ts: number }[] = [];
let logs: { ts: number; level: string; message: string; manifest?: string | null }[] = [];
let runs: { id: string; manifest: any; ts: number; status: string; exitCode?: number | null; attempts: number; maxAttempts: number }[] = [];
let runLogs: { runId: string; ts: number; line: string }[] = [];
if (fs.existsSync(deployFile)) {
  try { deployments = JSON.parse(fs.readFileSync(deployFile, "utf-8")); } catch (_) { deployments = []; }
}
if (fs.existsSync(logsFile)) {
  try { logs = JSON.parse(fs.readFileSync(logsFile, "utf-8")); } catch (_) { logs = []; }
}
if (fs.existsSync(runsFile)) {
  try { runs = JSON.parse(fs.readFileSync(runsFile, "utf-8")); } catch (_) { runs = []; }
}
if (fs.existsSync(runLogsFile)) {
  try { runLogs = JSON.parse(fs.readFileSync(runLogsFile, "utf-8")); } catch (_) { runLogs = []; }
}

function persist() {
  fs.writeFileSync(deployFile, JSON.stringify(deployments, null, 2), "utf-8");
  fs.writeFileSync(logsFile, JSON.stringify(logs.slice(-500), null, 2), "utf-8");
  fs.writeFileSync(runsFile, JSON.stringify(runs.slice(-500), null, 2), "utf-8");
  fs.writeFileSync(runLogsFile, JSON.stringify(runLogs.slice(-2000), null, 2), "utf-8");
}

function addLog(level: string, message: string, manifest?: string | null) {
  logs.push({ ts: Date.now(), level, message, manifest: manifest ?? null });
  persist();
}

function addRunLog(runId: string, line: string) {
  runLogs.push({ runId, ts: Date.now(), line });
  persist();
}

function nextRunId() { return crypto.randomUUID(); }

app.get("/health", (_req, res) => {
  res.json({ status: "ok", deployments: deployments.length, runs: runs.length });
});
app.get("/deployments", (_req, res) => res.json({ deployments }));
app.get("/logs", (_req, res) => res.json({ logs }));
app.get("/runs", (_req, res) => res.json({ runs }));
app.get("/runlogs", (req, res) => {
  const runId = req.query.runId as string | undefined;
  const data = runId ? runLogs.filter((l) => l.runId === runId) : runLogs;
  res.json({ runLogs: data });
});
app.get("/skills", (_req, res) => {
  // stub registry
  res.json({ skills: [{ name: "rag-basic", package: "@openworm/skill-rag" }, { name: "browser-helper", package: "@openworm/skill-browser-helper" }] });
});

app.post("/deploy", authGuard, (req, res) => {
  try {
    const manifest = ManifestSchema.parse(req.body?.manifest || req.body);
    const record = { manifest, ts: Date.now() };
    deployments.push(record);
    addLog("info", `deploy ${manifest.name}`, manifest.name);
    persist();
    return res.json({ status: "ok", received: manifest.name, ts: record.ts });
  } catch (err: any) {
    addLog("error", `deploy failed: ${err.message}`);
    return res.status(400).json({ error: err.message, issues: err.issues || null });
  }
});

app.post("/run", authGuard, (req, res) => {
  try {
    const manifest = ManifestSchema.parse(req.body?.manifest || req.body);
    const id = nextRunId();
    const record = { id, manifest, ts: Date.now(), status: "queued", attempts: 0, maxAttempts: 2 };
    runs.push(record);
    addLog("info", `run queued ${manifest.name}`, manifest.name);
    persist();
    res.json({ status: "queued", id });
  } catch (err: any) {
    return res.status(400).json({ error: err.message, issues: err.issues || null });
  }
});

let running = false;
function processQueue() {
  if (running) return;
  const next = runs.find((r) => r.status === "queued");
  if (!next) return;
  running = true;
  next.status = "running";
  next.attempts += 1;
  const cwd = process.cwd();
  const entry = path.join(cwd, next.manifest.entry);
  const env = { ...process.env, ...(next.manifest.vars || {}) };
  // policy stub: egress allow/deny not enforced; TODO: add firewall/cgroup.
  const child = spawn("node", [entry], { env, cwd });
  addRunLog(next.id, `[start] ${next.manifest.name} attempt=${next.attempts}`);
  child.stdout.on("data", (d) => addRunLog(next.id, d.toString()));
  child.stderr.on("data", (d) => addRunLog(next.id, d.toString()));
  child.on("close", (code) => {
    next.status = code === 0 ? "completed" : "failed";
    next.exitCode = code;
    addRunLog(next.id, `[exit] code=${code}`);
    if (code !== 0 && next.attempts < next.maxAttempts) {
      next.status = "queued";
      addRunLog(next.id, `[retry] scheduling retry ${next.attempts + 1}/${next.maxAttempts}`);
    }
    persist();
    running = false;
  });
  persist();
}

setInterval(processQueue, 2000);

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`openworm control plane stub listening on ${port}`);
});
