export const ragTemplate = {
  manifest: `version: v1
name: ${'${name}'}
runtime: node18
entry: agents/${'${name}'}/index.ts
policies:
  timeout: 120
  memory: 1024
  egress: allow
vars:
  DATASET_PATH: ./data
skills:
  - name: rag-basic
    package: "@openworm/skill-rag"
    config:
      indexPath: ./data/index.json
  - name: web-search
    package: "@openworm/skill-websearch"
`,
  code: `import { runRag } from "@openworm/skill-rag";

async function main() {
  const question = process.argv.slice(2).join(" ") || "What is openworm?";
  const answer = await runRag({
    question,
    indexPath: process.env.DATASET_PATH || "./data/index.json",
  });
  console.log("answer:", answer);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
`,
};
