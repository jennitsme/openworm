"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Page;
const jsx_runtime_1 = require("react/jsx-runtime");
const link_1 = __importDefault(require("next/link"));
const cards = [
    { title: "Manifest Editor", desc: "Edit openworm.yaml with schema validation", href: "#" },
    { title: "Templates", desc: "RAG, browser, automation", href: "#" },
    { title: "Runs & Logs", desc: "View logs and recent runs", href: "#" },
    { title: "Deploy", desc: "Trigger deploy to control plane", href: "#" },
];
function Page() {
    return ((0, jsx_runtime_1.jsxs)("div", { className: "container", children: [(0, jsx_runtime_1.jsx)("h1", { style: { fontSize: 32, marginBottom: 8 }, children: "openworm Web UI (stub)" }), (0, jsx_runtime_1.jsx)("p", { style: { color: "#9ca3af", marginBottom: 16 }, children: "Developer-focused UI per WEBUI.md: editor, templates, logs, runbooks." }), (0, jsx_runtime_1.jsx)("div", { style: { display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }, children: cards.map((c) => ((0, jsx_runtime_1.jsxs)("div", { className: "card", children: [(0, jsx_runtime_1.jsx)("div", { style: { fontWeight: 600 }, children: c.title }), (0, jsx_runtime_1.jsx)("div", { style: { color: "#9ca3af", margin: "6px 0" }, children: c.desc }), (0, jsx_runtime_1.jsx)(link_1.default, { href: c.href, style: { color: "#a855f7" }, children: "Coming soon" })] }, c.title))) })] }));
}
