export const browserHelperTemplate = {
  manifest: `version: v1
name: ${'${name}'}
runtime: node18
entry: agents/${'${name}'}/index.ts
policies:
  timeout: 240
  memory: 1024
skills:
  - name: browser-helper
    package: "@openworm/skill-browser-helper"
`,
  code: `import { helper } from "@openworm/skill-browser-helper";

async function main() {
  const res = await helper.navigateAndExtract({
    url: "https://news.ycombinator.com",
    selector: "a.storylink",
    limit: 5,
  });
  console.log(res);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
`,
};
