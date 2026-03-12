# openworm Web UI (plan)

## Goals
- Developer-focused UI to edit manifest, view logs, runbooks, and trigger deploy.
- Parity with CLI: same manifest, templates, and tool definitions.

## Pages
- Dashboard: list agents (from control plane), statuses, recent runs.
- Editor: manifest editor (YAML with schema validation), template picker, save/apply.
- Logs/Runs: stream logs per agent, view run history, filter by status.
- Runbooks: curated recipes (RAG ingest, browser task, automation scheduling) with one-click apply.

## Components
- Monaco-based YAML editor with zod-driven validation feedback.
- Template gallery cards (rag, rag-emb, browser, browser-helper, automation).
- Deploy panel: select agent, target environment (local/cloud), trigger deploy (calls /deploy API).
- Logs viewer with follow mode; run detail panel.

## Backend expectations
- Control plane API: list agents, get manifest, update manifest, deploy, stream logs.
- Auth: bearer token (align with future OAuth/JWT).

## Next steps
- Scaffold Next.js app under `apps/web` with Tailwind + shadcn UI.
- Implement manifest editor with validation using ManifestSchema (shared via package export).
- Wire to server stub for deploy/list.
