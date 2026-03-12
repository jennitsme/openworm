# openworm

Developer-first agent framework (Node/TS) focused on DX:
- Template library: RAG, browser automation, scheduled automation (one-command scaffold)
- Local+cloud parity: develop in Docker, promote with the same manifest
- Strong SDK: TypeScript-first with type-safe tool definitions; Python SDK planned
- CLI + Web UI (planned): editor, logs, runbook recipes

## Quick Start
```bash
npm install -g openworm   # (or npm install && npm run build && npm link)
openworm init --template rag --name my-agent
```
This creates `openworm.yaml` manifest and starter code in `agents/my-agent`.

### Commands (skeleton)
- `openworm init --template <rag|browser|automation> --name <agent>`: scaffold agent + manifest
- `openworm dev`: run local dev (docker compose stub)
- `openworm deploy`: placeholder for pushing manifest to cloud control plane

## Manifest (openworm.yaml)
Example:
```yaml
version: v1
name: my-agent
runtime: node18
entry: agents/my-agent/index.ts
vars:
  DATASET_PATH: ./data
policies:
  timeout: 120
  memory: 512
  egress: allow
skills:
  - name: web-search
    package: "@openworm/skill-websearch"
  - name: rag-basic
    package: "@openworm/skill-rag"
    config:
      indexPath: ./data/index.json
```

## Templates
- **rag**: basic RAG skeleton (ingest + answer)
- **browser**: browser automation skeleton (playwright stub)
- **automation**: scheduled/cron style automation stub

## Roadmap
- Control plane API + deploy
- Web UI (editor, logs, runbooks)
- Python SDK
- Skill registry + signing
