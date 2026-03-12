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

async function provider1Password(_ref: SecretRef): Promise<string | undefined> {
  // TODO: implement using OP_CONNECT_HOST + OP_CONNECT_TOKEN
  return undefined;
}

async function providerHashiCorpVault(_ref: SecretRef): Promise<string | undefined> {
  // TODO: implement using VAULT_ADDR + VAULT_TOKEN
  return undefined;
}

export async function resolveSecret(ref: SecretRef, secrets: SecretMap): Promise<string | undefined> {
  if (secrets[ref.name]) return secrets[ref.name];
  if (ref.path?.startsWith("vault://op/")) return provider1Password(ref);
  if (ref.path?.startsWith("vault://hv/")) return providerHashiCorpVault(ref);
  return undefined;
}
