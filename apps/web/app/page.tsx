import Link from "next/link";

const cards = [
  { title: "Manifest Editor", desc: "Edit openworm.yaml with schema validation", href: "#" },
  { title: "Templates", desc: "RAG, browser, automation", href: "#" },
  { title: "Runs & Logs", desc: "View logs and recent runs", href: "#" },
  { title: "Deploy", desc: "Trigger deploy to control plane", href: "#" },
];

export default function Page() {
  return (
    <div className="container">
      <h1 style={{ fontSize: 32, marginBottom: 8 }}>openworm Web UI (stub)</h1>
      <p style={{ color: "#9ca3af", marginBottom: 16 }}>
        Developer-focused UI per WEBUI.md: editor, templates, logs, runbooks.
      </p>
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
        {cards.map((c) => (
          <div key={c.title} className="card">
            <div style={{ fontWeight: 600 }}>{c.title}</div>
            <div style={{ color: "#9ca3af", margin: "6px 0" }}>{c.desc}</div>
            <Link href={c.href} style={{ color: "#a855f7" }}>
              Coming soon
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
