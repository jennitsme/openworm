import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { ManifestSchema } from "./lib/schema";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const dataDir = path.join(process.cwd(), "data");
const deployFile = path.join(dataDir, "deployments.json");
const logsFile = path.join(dataDir, "logs.json");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
let deployments: { manifest: any; ts: number }[] = [];
let logs: { ts: number; level: string; message: string; manifest?: string | null }[] = [];
if (fs.existsSync(deployFile)) {
  try {
    deployments = JSON.parse(fs.readFileSync(deployFile, "utf-8"));
  } catch (_) {
    deployments = [];
  }
}
if (fs.existsSync(logsFile)) {
  try {
    logs = JSON.parse(fs.readFileSync(logsFile, "utf-8"));
  } catch (_) {
    logs = [];
  }
}

function persist() {
  fs.writeFileSync(deployFile, JSON.stringify(deployments, null, 2), "utf-8");
  fs.writeFileSync(logsFile, JSON.stringify(logs.slice(-500), null, 2), "utf-8");
}

function addLog(level: string, message: string, manifest?: string | null) {
  logs.push({ ts: Date.now(), level, message, manifest: manifest ?? null });
  persist();
}

app.get("/health", (_req, res) => {
  res.json({ status: "ok", deployments: deployments.length });
});

app.get("/deployments", (_req, res) => {
  res.json({ deployments });
});

app.get("/logs", (_req, res) => {
  res.json({ logs });
});

app.post("/deploy", (req, res) => {
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

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`openworm control plane stub listening on ${port}`);
});
