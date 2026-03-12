import fs from "fs";
import path from "path";

export type SecretMap = Record<string, string>;

export function loadSecrets(): SecretMap {
  const secretsPath = process.env.OPENWORM_SECRETS_FILE || path.join(process.cwd(), "data", "secrets.json");
  if (!fs.existsSync(secretsPath)) return {};
  try {
    const data = JSON.parse(fs.readFileSync(secretsPath, "utf-8"));
    return data;
  } catch (_) {
    return {};
  }
}
