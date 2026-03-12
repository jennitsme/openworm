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

async function provider1Password(ref: SecretRef): Promise<string | undefined> {
  const host = process.env.OP_CONNECT_HOST;
  const token = process.env.OP_CONNECT_TOKEN;
  if (!host || !token || !ref.path) return undefined;
  // path format: vault://op/<item>/<field>
  const parts = ref.path.replace("vault://op/", "").split("/");
  if (parts.length < 2) return undefined;
  const item = parts[0];
  const field = parts[1];
  try {
    const resp = await fetch(`${host}/v1/vaults/default/items/${item}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) return undefined;
    const data = await resp.json();
    const fields = data?.fields || [];
    const match = fields.find((f: any) => f.label === field || f.id === field);
    return match?.value;
  } catch {
    return undefined;
  }
}

async function providerHashiCorpVault(ref: SecretRef): Promise<string | undefined> {
  const addr = process.env.VAULT_ADDR;
  const token = process.env.VAULT_TOKEN;
  if (!addr || !token || !ref.path) return undefined;
  // path format: vault://hv/<path>#field
  const without = ref.path.replace("vault://hv/", "");
  const [p, field] = without.split("#");
  try {
    const resp = await fetch(`${addr}/v1/${p}`, { headers: { "X-Vault-Token": token } });
    if (!resp.ok) return undefined;
    const data = await resp.json();
    const secretData = data?.data?.data || data?.data;
    if (!secretData) return undefined;
    if (field) return secretData[field];
    return secretData[ref.name];
  } catch {
    return undefined;
  }
}

export async function resolveSecret(ref: SecretRef, secrets: SecretMap): Promise<string | undefined> {
  if (secrets[ref.name]) return secrets[ref.name];
  if (ref.path?.startsWith("vault://op/")) return provider1Password(ref);
  if (ref.path?.startsWith("vault://hv/")) return providerHashiCorpVault(ref);
  return undefined;
}
