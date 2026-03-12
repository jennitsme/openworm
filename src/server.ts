import express from "express";
import { ManifestSchema } from "./lib/schema";
import YAML from "yaml";

const app = express();
app.use(express.json({ limit: "2mb" }));

const manifests: any[] = [];

app.get("/health", (_req, res) => {
  res.json({ status: "ok", count: manifests.length });
});

app.post("/deploy", (req, res) => {
  try {
    const manifest = ManifestSchema.parse(req.body?.manifest || req.body);
    manifests.push({ manifest, ts: Date.now() });
    return res.json({ status: "ok", received: manifest.name });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`openworm control plane stub listening on ${port}`);
});
