import { createClient } from "@/lib/supabase/server";
import type { Tenant } from "@/lib/supabase/types";

/**
 * Resolves the current tenant for the logged-in user.
 * For this single-tenant deployment there's exactly one tenant
 * (Himkar International); this helper still goes through the
 * tenant_users membership so multi-tenant support later is a
 * matter of removing the .limit(1) assumption, not rewriting callers.
 */
export async function getCurrentTenant(): Promise<Tenant> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data: appUser, error: userErr } = await supabase
    .from("app_users")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  if (userErr || !appUser) {
    throw new Error("No app_users record linked to this auth account. Run onboarding first.");
  }

  const { data: membership, error: memErr } = await supabase
    .from("tenant_users")
    .select("tenant_id, tenants(*)")
    .eq("user_id", appUser.id)
    .eq("is_active", true)
    .limit(1)
    .single();

  if (memErr || !membership) {
    throw new Error("User is not a member of any tenant.");
  }

  return membership.tenants as unknown as Tenant;
}
