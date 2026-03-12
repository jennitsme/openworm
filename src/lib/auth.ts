export type User = { token: string; role: "admin" | "user"; name?: string; orgId?: string };

export function loadUsers(): User[] {
  try {
    const raw = process.env.OPENWORM_USERS;
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as User[];
    return [];
  } catch (_) {
    return [];
  }
}
