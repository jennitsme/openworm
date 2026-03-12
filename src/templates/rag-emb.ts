export const ragEmbTemplate = {
  manifest: `version: v1
name: ${'${name}'}
runtime: node18
entry: agents/${'${name}'}/index.ts
policies:
  timeout: 180
  memory: 2048
vars:
  DATA_DIR: ./data
skills:
  - name: rag-embed
    package: "@openworm/skill-rag-embed"
    config:
      dataDir: ./data
      model: openai:text-embedding-3-small
`,
  code: `import { buildIndex, queryIndex } from "@openworm/skill-rag-embed";

async function main() {
  const mode = process.argv[2] || "query";
  const dataDir = process.env.DATA_DIR || "./data";
  if (mode === "ingest") {
    await buildIndex({ dataDir });
    console.log("index built");
    return;
  }
  const question = process.argv.slice(3).join(" ") || "What is in the docs?";
  const answer = await queryIndex({ dataDir, question });
  console.log("answer:", answer);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
`,
};
