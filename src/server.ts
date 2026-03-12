import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { ManifestSchema } from "./lib/schema";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const dataDir = path.join(process.cwd(), "data");
const dataFile = path.join(dataDir, "deployments.json");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
let deployments: { manifest: any; ts: number }[] = [];
if (fs.existsSync(dataFile)) {
  try {
    deployments = JSON.parse(fs.readFileSync(dataFile, "utf-8"));
  } catch (_) {
    deployments = [];
  }
}

function persist() {
  fs.writeFileSync(dataFile, JSON.stringify(deployments, null, 2), "utf-8");
}

app.get("/health", (_req, res) => {
  res.json({ status: "ok", deployments: deployments.length });
});

app.get("/deployments", (_req, res) => {
  res.json({ deployments });
});

app.get("/logs", (_req, res) => {
  res.json({ logs: deployments.map((d) => ({ name: d.manifest?.name, ts: d.ts })) });
});

app.post("/deploy", (req, res) => {
  try {
    const manifest = ManifestSchema.parse(req.body?.manifest || req.body);
    const record = { manifest, ts: Date.now() };
    deployments.push(record);
    persist();
    return res.json({ status: "ok", received: manifest.name, ts: record.ts });
  } catch (err: any) {
    return res.status(400).json({ error: err.message, issues: err.issues || null });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`openworm control plane stub listening on ${port}`);
});
