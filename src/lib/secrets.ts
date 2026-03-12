import fs from "fs";
import path from "path";

export type SecretRef = { name: string; env?: string; source?: string; path?: string };
export type SecretMap = Record<string, string>;

function loadJsonFile(p: string): any {
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, "utf-8")); } catch { return null; }
}

function providerVaultEnv(): SecretMap {
  const vaultJson = process.env.OPENWORM_VAULT_JSON;
  if (!vaultJson) return {};
  try { return JSON.parse(vaultJson); } catch { return {}; }
}

function providerFile(): SecretMap {
  const file = process.env.OPENWORM_SECRETS_FILE || path.join(process.cwd(), "data", "secrets.json");
  const data = loadJsonFile(file);
  return data || {};
}

export function loadSecrets(): SecretMap {
  return {
    ...providerFile(),
    ...providerVaultEnv(),
  };
}

export async function resolveSecret(ref: SecretRef, secrets: SecretMap): Promise<string | undefined> {
  // basic: check map
  if (secrets[ref.name]) return secrets[ref.name];
  // future: check ref.source/path for external providers (1Password/HVault)
  // stub: not implemented
  return undefined;
}
