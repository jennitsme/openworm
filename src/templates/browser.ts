export const browserTemplate = {
  manifest: `version: v1
name: ${'${name}'}
runtime: node18
entry: agents/${'${name}'}/index.ts
policies:
  timeout: 180
  memory: 1024
  egress: allow
skills:
  - name: browser-automation
    package: "@openworm/skill-browser"
`,
  code: `import { launch } from "playwright";

async function main() {
  const browser = await launch({ headless: true });
  const page = await browser.newPage();
  await page.goto("https://example.com");
  const title = await page.title();
  console.log("Title:", title);
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
`,
};
