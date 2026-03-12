export type SecretSource = "env" | "file" | "vault";
export type SecretMap = Record<string, string>;

export function loadSecrets(): SecretMap {
  // Vault stub via env JSON
  const vaultJson = process.env.OPENWORM_VAULT_JSON;
  if (vaultJson) {
    try { return JSON.parse(vaultJson); } catch { return {}; }
  }
  const file = process.env.OPENWORM_SECRETS_FILE;
  if (file) {
    try { return JSON.parse(require("fs").readFileSync(file, "utf-8")); } catch { return {}; }
  }
  return {};
}
