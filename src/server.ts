import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { ManifestSchema } from "./lib/schema";
import { spawn } from "child_process";
import crypto from "crypto";
import { loadUsers } from "./lib/auth";
import { loadSecrets, resolveSecret } from "./lib/secrets";
import { SkillRegistryItemSchema } from "./lib/tools";

const users = loadUsers();
const secretsMap = loadSecrets();
const registry = [
  { name: "rag-basic", package: "@openworm/skill-rag", version: "0.0.1", orgId: "default" },
  { name: "browser-helper", package: "@openworm/skill-browser-helper", version: "0.0.1", orgId: "default" },
];
SkillRegistryItemSchema.array().parse(registry);

const useDocker = process.env.OPENWORM_USE_DOCKER === "1";
const dockerImage = process.env.OPENWORM_DOCKER_IMAGE || "node:20";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

function authGuard(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!users.length) return next();
  const hdr = req.headers["authorization"];
  const token = hdr?.replace("Bearer ", "");
  const user = users.find((u) => u.token === token);
  if (!user) return res.status(401).json({ error: "unauthorized" });
  (req as any).user = user;
  next();
}

function orgCheck(manifestOrg?: { id?: string }, user?: any) {
  if (!users.length) return true;
  if (!manifestOrg || !manifestOrg.id) return true;
  if (!user?.orgId) return false;
  return user.orgId === manifestOrg.id;
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
try { deployments = fs.existsSync(deployFile) ? JSON.parse(fs.readFileSync(deployFile, "utf-8")) : []; } catch { deployments = []; }
try { logs = fs.existsSync(logsFile) ? JSON.parse(fs.readFileSync(logsFile, "utf-8")) : []; } catch { logs = []; }
try { runs = fs.existsSync(runsFile) ? JSON.parse(fs.readFileSync(runsFile, "utf-8")) : []; } catch { runs = []; }
try { runLogs = fs.existsSync(runLogsFile) ? JSON.parse(fs.readFileSync(runLogsFile, "utf-8")) : []; } catch { runLogs = []; }

function persist() {
  fs.writeFileSync(deployments.length ? deployFile : deployFile, JSON.stringify(deployments, null, 2), "utf-8");
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
app.get("/deployments", authGuard, (req, res) => {
  const user = (req as any).user;
  const data = users.length && user?.role !== "admin"
    ? deployments.filter((d) => orgCheck(d.manifest.org, user))
    : deployments;
  res.json({ deployments: data });
});
app.get("/logs", authGuard, (req, res) => {
  const user = (req as any).user;
  const data = users.length && user?.role !== "admin"
    ? logs.filter((l) => !l.manifest || orgCheck({ id: l.manifest }, user))
    : logs;
  res.json({ logs: data });
});
app.get("/runs", authGuard, (req, res) => {
  const user = (req as any).user;
  const data = users.length && user?.role !== "admin"
    ? runs.filter((r) => orgCheck(r.manifest.org, user))
    : runs;
  res.json({ runs: data });
});
app.get("/runs/:id", authGuard, (req, res) => {
  const run = runs.find((r) => r.id === req.params.id);
  if (!run) return res.status(404).json({ error: "not found" });
  const user = (req as any).user;
  if (users.length && user?.role !== "admin" && !orgCheck(run.manifest.org, user)) return res.status(403).json({ error: "forbidden" });
  res.json(run);
});
app.get("/metrics", authGuard, (req, res) => {
  const user = (req as any).user;
  const filtered = users.length && user?.role !== "admin" ? runs.filter((r) => orgCheck(r.manifest.org, user)) : runs;
  const counts = filtered.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  res.json({ runs: filtered.length, statuses: counts });
});
app.get("/runlogs", authGuard, (req, res) => {
  const runId = req.query.runId as string | undefined;
  const user = (req as any).user;
  const data = runLogs.filter((l) => (!runId || l.runId === runId) && filterRunLogByOrg(l.runId, user));
  res.json({ runLogs: data });
});
app.get("/runlogs/stream", authGuard, (req, res) => {
  const runId = req.query.runId as string | undefined;
  const user = (req as any).user;
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  const send = () => {
    const data = runLogs.filter((l) => (!runId || l.runId === runId) && filterRunLogByOrg(l.runId, user));
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };
  const interval = setInterval(send, 2000);
  send();
  req.on("close", () => {
    clearInterval(interval);
  });
});
app.get("/skills", authGuard, (req, res) => {
  const user = (req as any).user;
  const data = users.length && user?.role !== "admin" ? registry.filter((r) => !r.orgId || r.orgId === user?.orgId) : registry;
  res.json({ skills: data });
});

app.get("/orgs", authGuard, (req, res) => {
  const user = (req as any).user;
  if (users.length && user?.role !== "admin") return res.status(403).json({ error: "forbidden" });
  const orgs = Array.from(new Set(registry.map((r) => r.orgId || "default"))).map((id) => ({ id }));
  res.json({ orgs });
});

app.post("/deploy", authGuard, (req, res) => {
  try {
    const user = (req as any).user;
    if (users.length && user?.role !== "admin") return res.status(403).json({ error: "forbidden" });
    const manifest = ManifestSchema.parse(req.body?.manifest || req.body);
    const mUser = (req as any).user;
    if (!orgCheck(manifest.org, mUser)) return res.status(403).json({ error: "org mismatch" });
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
    const mUser = (req as any).user;
    if (!orgCheck(manifest.org, mUser)) return res.status(403).json({ error: "org mismatch" });
    const id = nextRunId();
    const record = { id, manifest, ts: Date.now(), status: "queued", attempts: 0, maxAttempts: 2, user: mUser?.name || mUser?.token || null } as any;
    runs.push(record);
    addLog("info", `run queued ${manifest.name}`, manifest.name);
    persist();
    res.json({ status: "queued", id });
  } catch (err: any) {
    return res.status(400).json({ error: err.message, issues: err.issues || null });
  }
});

function filterRunLogByOrg(runId: string, user: any) {
  if (!users.length || user?.role === "admin") return true;
  const run = runs.find((r) => r.id === runId);
  if (!run) return false;
  return orgCheck(run.manifest.org, user);
}

let running = false;
async function processQueue() {
  if (running) return;
  const next = runs.find((r) => r.status === "queued");
  if (!next) return;
  running = true;
  next.status = "running";
  next.attempts += 1;
  const cwd = process.cwd();
  const entry = path.join(cwd, next.manifest.entry);
  const env = { ...process.env, ...(next.manifest.vars || {}) } as any;

  // secrets injection
  if (next.manifest.secrets) {
    for (const s of next.manifest.secrets) {
      const val = await resolveSecret(s, secretsMap);
      if (val) env[s.env || s.name] = val;
    }
  }

  // memory limit via NODE_OPTIONS
  if (next.manifest.policies?.memory) {
    const memMb = next.manifest.policies.memory;
    const existing = env.NODE_OPTIONS || "";
    env.NODE_OPTIONS = `${existing} --max-old-space-size=${memMb}`.trim();
  }

  // egress deny: if docker available and enabled, run with --network none
  if (next.manifest.policies?.egress === "deny" && useDocker) {
    // allowHosts stub: not enforced here; could map to extra --add-host if needed
    const args = ["run", "--rm", "--network", "none"];
    if (next.manifest.policies?.cpu) args.push("--cpus", String(next.manifest.policies.cpu));
    if (next.manifest.policies?.memory) args.push("--memory", `${next.manifest.policies.memory}m`);
    if (next.manifest.policies?.pids) args.push("--pids-limit", String(next.manifest.policies.pids));
    if (next.manifest.policies?.allowHosts) {
      next.manifest.policies.allowHosts.forEach((h: string) => args.push("--add-host", h));
    }
    args.push(
      "-v",
      `${cwd}:/app`,
      "-w",
      "/app",
      dockerImage,
      "node",
      entry.replace(cwd + "/", ""),
    );
    addRunLog(next.id, `[start] docker sandbox network=none attempt=${next.attempts}`);
    const child = spawn("docker", args, { env });
    const timeoutMs = (next.manifest.policies?.timeout || 300) * 1000;
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      addRunLog(next.id, `[timeout] killed after ${timeoutMs}ms`);
    }, timeoutMs);
    child.stdout.on("data", (d) => addRunLog(next.id, d.toString()));
    child.stderr.on("data", (d) => addRunLog(next.id, d.toString()));
    child.on("close", (code) => {
      clearTimeout(timer);
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
    return;
  }

  // fallback: native spawn
  const child = spawn("node", [entry], { env, cwd });
  const timeoutMs = (next.manifest.policies?.timeout || 300) * 1000;
  const timer = setTimeout(() => {
    child.kill("SIGKILL");
    addRunLog(next.id, `[timeout] killed after ${timeoutMs}ms`);
  }, timeoutMs);
  addRunLog(next.id, `[start] ${next.manifest.name} attempt=${next.attempts}`);
  child.stdout.on("data", (d) => addRunLog(next.id, d.toString()));
  child.stderr.on("data", (d) => addRunLog(next.id, d.toString()));
  child.on("close", (code) => {
    clearTimeout(timer);
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
