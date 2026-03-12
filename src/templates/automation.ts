export const automationTemplate = {
  manifest: `version: v1
name: ${'${name}'}
runtime: node18
entry: agents/${'${name}'}/index.ts
policies:
  timeout: 60
  memory: 512
  egress: allow
schedule:
  cron: "*/30 * * * *" # every 30 minutes
skills:
  - name: webhook
    package: "@openworm/skill-webhook"
`,
  code: `async function main() {
  console.log("automation tick", new Date().toISOString());
  // TODO: call APIs, process data, send webhook
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
`,
};
