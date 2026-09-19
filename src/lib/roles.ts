/**
 * Deliberately its own module with no imports.
 *
 * `supabase/session.ts` reads request cookies, so anything importing it lands
 * server-only. The sidebar is a Client Component and needs the role type, so
 * the type lives here where both sides can reach it.
 */
export type UserRole = "admin" | "staff"

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrator",
  staff: "Staff",
}
