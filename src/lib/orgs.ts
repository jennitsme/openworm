export type Org = { id: string; name?: string };
export type UserOrg = { token: string; role: "admin" | "user"; name?: string; orgId?: string };

export function userCanAccessOrg(user: UserOrg | undefined, orgId?: string) {
  if (!orgId) return true;
  if (!user) return false;
  if (!user.orgId) return false;
  return user.orgId === orgId;
}

export function listOrgsFromUsers(users: UserOrg[]): Org[] {
  const ids = new Set<string>();
  users.forEach((u) => { if (u.orgId) ids.add(u.orgId); });
  if (!ids.size) ids.add("default");
  return Array.from(ids).map((id) => ({ id }));
}
