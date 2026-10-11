import "server-only"
import { cookies } from "next/headers"
import { z } from "zod"

export const ROLE_COOKIE = "isla_demo_role"

export const RoleSchema = z.enum(["school", "isla"])
export type Role = z.infer<typeof RoleSchema>

export type Session = {
  role: Role
  /** The school a school admin manages. ISLA staff manage every school. */
  schoolId: string | null
  user: { name: string; title: string; initials: string }
}

const DEMO_SESSIONS: Record<Role, Session> = {
  school: {
    role: "school",
    schoolId: "al-noor-academy",
    user: { name: "Amina Rahman", title: "Principal · Al-Noor Academy", initials: "AR" },
  },
  isla: {
    role: "isla",
    schoolId: null,
    user: { name: "Sana Qureshi", title: "ISLA Program Staff", initials: "SQ" },
  },
}

/**
 * Prototype session: role comes from a cookie set by the role switcher.
 * Replace this one function with real auth (Auth.js, Clerk, ISLA SSO) later;
 * callers only depend on the Session shape.
 */
export async function getSession(): Promise<Session> {
  const value = (await cookies()).get(ROLE_COOKIE)?.value
  const role = RoleSchema.safeParse(value).data ?? "school"
  return DEMO_SESSIONS[role]
}

export function canManageSchool(session: Session, schoolId: string) {
  return session.role === "isla" || session.schoolId === schoolId
}
