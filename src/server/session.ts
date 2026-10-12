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
  /** Shown in the top bar: the school a school admin works for, or ISLA itself for staff. */
  organization: string
  user: { name: string; title: string; initials: string }
}

const DEMO_SESSIONS: Record<Role, Session> = {
  school: {
    role: "school",
    schoolId: "al-noor-academy",
    organization: "Al-Noor Academy",
    user: { name: "Amina Rahman", title: "Principal · Al-Noor Academy", initials: "AR" },
  },
  isla: {
    role: "isla",
    schoolId: null,
    organization: "Islamic Schools League of America",
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

/** The signed-in session, or null for anonymous visitors (public pages use this to offer a dashboard link). */
export async function getOptionalSession(): Promise<Session | null> {
  const parsed = RoleSchema.safeParse((await cookies()).get(ROLE_COOKIE)?.value)
  return parsed.success ? DEMO_SESSIONS[parsed.data] : null
}
