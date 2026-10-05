import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { MemberRole, Organization, Profile } from "@/lib/types";

export type CurrentMember = {
  userId: string;
  email: string;
  profile: Profile;
  organization: Organization;
  role: MemberRole;
};

export class PermissionError extends Error {
  constructor(message = "You do not have permission to do this.") {
    super(message);
    this.name = "PermissionError";
  }
}

/**
 * Returns the logged-in user with their organisation and role, or null.
 * Identity is verified via the auth server's signed JWT (getClaims), not just cookies.
 * Cached per request.
 */
export const getCurrentMember = cache(async (): Promise<CurrentMember | null> => {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (claimsError || !userId) return null;

  const { data: membership, error } = await supabase
    .from("organization_members")
    .select("role, organization:organizations(*), profile:profiles(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Could not load your membership: ${error.message}`);
  if (!membership?.organization || !membership.profile) return null;

  return {
    userId,
    email: membership.profile.email,
    profile: membership.profile,
    organization: membership.organization,
    role: membership.role,
  };
});

/** For pages: redirect to /login when there is no session or membership. */
export async function requirePageMember(): Promise<CurrentMember> {
  const member = await getCurrentMember();
  if (!member) redirect("/login?error=no-membership");
  return member;
}

/** For pages restricted to some roles. */
export async function requirePageRole(roles: MemberRole[]): Promise<CurrentMember> {
  const member = await requirePageMember();
  if (!roles.includes(member.role)) redirect("/dashboard?error=forbidden");
  return member;
}

/** For server actions: throws instead of redirecting. */
export async function requireMember(): Promise<CurrentMember> {
  const member = await getCurrentMember();
  if (!member) throw new PermissionError("Your session has expired. Please log in again.");
  return member;
}

export async function requireRole(roles: MemberRole[]): Promise<CurrentMember> {
  const member = await requireMember();
  if (!roles.includes(member.role)) throw new PermissionError();
  return member;
}

export const can = {
  manageOrganization: (role: MemberRole) => role === "admin",
  manageBrands: (role: MemberRole) => role === "admin",
  managePolicies: (role: MemberRole) => role === "admin",
  createSubmissions: (role: MemberRole) => role === "marketing" || role === "admin",
  // Separation of duties: only Compliance Reviewers decide; admins cannot approve.
  review: (role: MemberRole) => role === "compliance",
  viewAuditLog: (role: MemberRole) => role === "compliance" || role === "admin",
};
