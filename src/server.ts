import express from "express";
import { ManifestSchema } from "./lib/schema";

const app = express();
app.use(express.json({ limit: "2mb" }));

const deployments: { manifest: any; ts: number }[] = [];

app.get("/health", (_req, res) => {
  res.json({ status: "ok", deployments: deployments.length });
});

app.get("/deployments", (_req, res) => {
  res.json({ deployments });
});

app.post("/deploy", (req, res) => {
  try {
    const manifest = ManifestSchema.parse(req.body?.manifest || req.body);
    deployments.push({ manifest, ts: Date.now() });
    return res.json({ status: "ok", received: manifest.name });
  } catch (err: any) {
    return res.status(400).json({ error: err.message, issues: err.issues || null });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`openworm control plane stub listening on ${port}`);
});
