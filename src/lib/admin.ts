const ADMIN_USER_ID = process.env.ADMIN_USER_ID ?? "";

export function isAdmin(userId: string): boolean {
  return !!ADMIN_USER_ID && userId === ADMIN_USER_ID;
}
