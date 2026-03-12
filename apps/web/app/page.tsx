"use client";
import { useEffect, useState } from "react";
import { ManifestSchema } from "../../../src/lib/schema";
import YAML from "yaml";

const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";

type Deployment = { manifest: any; ts: number };

export default function Page() {
  const [manifestText, setManifestText] = useState("version: v1\nname: sample\nruntime: node18\nentry: agents/sample/index.ts\n");
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [status, setStatus] = useState<string>("");
  const [errors, setErrors] = useState<{ path: string; message: string }[]>([]);

  const loadDeployments = async () => {
    const res = await fetch(`${apiBase}/deployments`);
    const data = await res.json();
    setDeployments(data.deployments || []);
  };

  useEffect(() => {
    loadDeployments();
  }, []);

  const validate = () => {
    try {
      const parsed = YAML.parse(manifestText);
      ManifestSchema.parse(parsed);
      setErrors([]);
      setStatus("Valid");
      return parsed;
    } catch (err: any) {
      const issues = err.issues?.map((i: any) => ({ path: i.path?.join?.(".") || "", message: i.message })) || [];
      setErrors(issues);
      setStatus("Invalid");
      return null;
    }
  };

  const deploy = async () => {
    const manifest = validate();
    if (!manifest) return;
    const res = await fetch(`${apiBase}/deploy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ manifest }),
    });
    const data = await res.json();
    if (!res.ok) {
      const issues = data?.issues?.map((i: any) => ({ path: i.path?.join?.(".") || "", message: i.message })) || [];
      setErrors(issues);
      setStatus("Deploy failed");
      return;
    }
    setStatus(`Deployed ${data?.received}`);
    loadDeployments();
  };

  return (
    <div className="container">
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>openworm Web UI</h1>
      <p style={{ color: "#9ca3af" }}>Manifest editor + deployments list.</p>
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "2fr 1fr" }}>
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontWeight: 600 }}>Manifest editor</div>
            <button className="cta" onClick={deploy} style={{ padding: "6px 10px", background: "#7c3aed", border: "none", borderRadius: 8, color: "white" }}>
              Deploy
            </button>
          </div>
          <textarea
            value={manifestText}
            onChange={(e) => setManifestText(e.target.value)}
            style={{ width: "100%", height: 260, marginTop: 8, background: "#11172b", color: "#e9e9f1", borderRadius: 8, border: "1px solid #1f2937", padding: 8 }}
          />
          <div style={{ marginTop: 8, color: "#9ca3af" }}>Status: {status || "-"}</div>
          {errors.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ color: "#f97316", fontWeight: 600 }}>Errors:</div>
              <ul style={{ color: "#fca5a5" }}>
                {errors.map((e, idx) => (
                  <li key={idx}>{e.path}: {e.message}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Deployments</div>
          {deployments.length === 0 ? (
            <div style={{ color: "#9ca3af" }}>No deployments yet.</div>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {deployments.map((d, idx) => (
                <li key={idx} style={{ border: "1px solid #1f2937", borderRadius: 8, padding: 8, background: "#0f162a" }}>
                  <div style={{ fontWeight: 600 }}>{d.manifest?.name}</div>
                  <div style={{ color: "#9ca3af", fontSize: 12 }}>{new Date(d.ts).toLocaleString()}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
