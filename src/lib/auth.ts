import fs from "fs";
import path from "path";

export type User = { token: string; role: "admin" | "user"; name?: string; orgId?: string };

export function loadUsers(): User[] {
  try {
    const rawEnv = process.env.OPENWORM_USERS;
    if (rawEnv) {
      const parsed = JSON.parse(rawEnv);
      if (Array.isArray(parsed)) return parsed as User[];
    }
  } catch (_) {}

  try {
    const file = process.env.OPENWORM_USERS_FILE || path.join(process.cwd(), "data", "users.json");
    if (fs.existsSync(file)) {
      const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
      if (Array.isArray(parsed)) return parsed as User[];
    }
  } catch (_) {}
  return [];
}
