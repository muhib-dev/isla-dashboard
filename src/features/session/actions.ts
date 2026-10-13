"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ROLE_COOKIE, RoleSchema, type Role } from "@/server/session";

export async function switchRole(role: Role) {
  const parsed = RoleSchema.parse(role);
  (await cookies()).set(ROLE_COOKIE, parsed, {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
  });
  redirect("/");
}
