"use client";
import { useEffect, useState } from "react";
import { ManifestSchema } from "../../../src/lib/schema";
import YAML from "yaml";

const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080";

type Deployment = { manifest: any; ts: number };
type LogEntry = { ts: number; level: string; message: string; manifest?: string | null };
type Run = { id: string; manifest: any; ts: number; status: string; exitCode?: number | null };
type RunLog = { runId: string; ts: number; line: string };

const templates: Record<string, string> = {
  rag: "version: v1\nname: rag-agent\nruntime: node18\nentry: agents/rag/index.ts\n",
  browser: "version: v1\nname: browser-agent\nruntime: node18\nentry: agents/browser/index.ts\n",
  automation: "version: v1\nname: automation-agent\nruntime: node18\nentry: agents/automation/index.ts\n",
};

export default function Page() {
  const [manifestText, setManifestText] = useState(templates.rag);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [runLogs, setRunLogs] = useState<RunLog[]>([]);
  const [selectedRun, setSelectedRun] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [errors, setErrors] = useState<{ path: string; message: string }[]>([]);

  const loadDeployments = async () => {
    const res = await fetch(`${apiBase}/deployments`);
    const data = await res.json();
    setDeployments(data.deployments || []);
  };
  const loadLogs = async () => {
    const res = await fetch(`${apiBase}/logs`);
    const data = await res.json();
    setLogs(data.logs || []);
  };
  const loadRuns = async () => {
    const res = await fetch(`${apiBase}/runs`);
    const data = await res.json();
    setRuns(data.runs || []);
  };
  const loadRunLogs = async (runId?: string | null) => {
    const res = await fetch(`${apiBase}/runlogs${runId ? `?runId=${runId}` : ""}`);
    const data = await res.json();
    setRunLogs(data.runLogs || []);
  };

  useEffect(() => {
    loadDeployments();
    loadLogs();
    loadRuns();
  }, []);

  useEffect(() => {
    const es = new EventSource(`${apiBase}/runlogs/stream${selectedRun ? `?runId=${selectedRun}` : ""}`);
    es.onmessage = (e) => {
      try {
        const parsed = JSON.parse(e.data || "[]");
        setRunLogs(parsed || []);
      } catch (_) {}
    };
    return () => es.close();
  }, [selectedRun]);

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
    loadLogs();
  };

  const run = async () => {
    const manifest = validate();
    if (!manifest) return;
    const res = await fetch(`${apiBase}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ manifest }),
    });
    const data = await res.json();
    if (!res.ok) {
      const issues = data?.issues?.map((i: any) => ({ path: i.path?.join?.(".") || "", message: i.message })) || [];
      setErrors(issues);
      setStatus("Run failed");
      return;
    }
    setStatus(`Run queued ${data.id}`);
    loadRuns();
  };

  const borderColor = errors.length > 0 ? "#f97316" : status === "Valid" ? "#22c55e" : "#1f2937";

  return (
    <div className="container">
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>openworm Web UI</h1>
      <p style={{ color: "#9ca3af" }}>Manifest editor + deployments + runs/logs.</p>
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "2fr 1fr" }}>
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div style={{ fontWeight: 600 }}>Manifest editor</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {Object.keys(templates).map((k) => (
                <button key={k} className="cta" style={{ padding: "6px 10px", background: "#1f2937", border: "1px solid #2f3847", borderRadius: 8, color: "white" }} onClick={() => setManifestText(templates[k])}>
                  Template: {k}
                </button>
              ))}
              <button className="cta" onClick={deploy} style={{ padding: "6px 10px", background: "#7c3aed", border: "none", borderRadius: 8, color: "white" }}>
                Deploy
              </button>
              <button className="cta" onClick={run} style={{ padding: "6px 10px", background: "#14b8a6", border: "none", borderRadius: 8, color: "white" }}>
                Run
              </button>
            </div>
          </div>
          <textarea
            value={manifestText}
            onChange={(e) => setManifestText(e.target.value)}
            style={{ width: "100%", height: 240, marginTop: 8, background: "#11172b", color: "#e9e9f1", borderRadius: 8, border: `2px solid ${borderColor}`, padding: 8 }}
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
                  <pre style={{ whiteSpace: "pre-wrap", color: "#9ca3af", fontSize: 12 }}>{JSON.stringify(d.manifest, null, 2)}</pre>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Runs</div>
        {runs.length === 0 ? (
          <div style={{ color: "#9ca3af" }}>No runs yet.</div>
        ) : (
          <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr" }}>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
              {runs.map((r) => (
                <li key={r.id} style={{ border: "1px solid #1f2937", borderRadius: 8, padding: 8, background: selectedRun === r.id ? "#1f2937" : "#0f162a", cursor: "pointer" }} onClick={() => setSelectedRun(r.id)}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontWeight: 600 }}>{r.manifest?.name}</span>
                    <span style={{ color: "#9ca3af", fontSize: 12 }}>{r.status}</span>
                  </div>
                  <div style={{ color: "#9ca3af", fontSize: 12 }}>{new Date(r.ts).toLocaleString()}</div>
                </li>
              ))}
            </ul>
            <div style={{ border: "1px solid #1f2937", borderRadius: 8, padding: 8, background: "#0f162a" }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Run logs {selectedRun ? `(runId=${selectedRun})` : ""}</div>
              <div style={{ maxHeight: 220, overflowY: "auto", fontSize: 12, color: "#e9e9f1" }}>
                {(runLogs || []).slice().reverse().map((l, idx) => (
                  <div key={idx} style={{ marginBottom: 4 }}>
                    <span style={{ color: "#9ca3af" }}>{new Date(l.ts).toLocaleTimeString()} </span>
                    <span>{l.line}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Logs</div>
        {logs.length === 0 ? (
          <div style={{ color: "#9ca3af" }}>No logs yet.</div>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
            {logs.slice().reverse().map((l, idx) => (
              <li key={idx} style={{ border: "1px solid #1f2937", borderRadius: 8, padding: 8, background: "#0f162a" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: l.level === "error" ? "#f87171" : "#a5f3fc" }}>{l.level}</span>
                  <span style={{ color: "#9ca3af", fontSize: 12 }}>{new Date(l.ts).toLocaleString()}</span>
                </div>
                <div style={{ color: "#e9e9f1" }}>{l.message}</div>
                {l.manifest && <div style={{ color: "#9ca3af", fontSize: 12 }}>manifest: {l.manifest}</div>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
