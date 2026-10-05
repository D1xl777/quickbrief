import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv, serverEnv } from "@/lib/env";
import type { Database } from "./database.types";

/**
 * Supabase client with the SECRET (service-role) key. It bypasses Row Level Security.
 *
 * Only use it inside server actions / route handlers AFTER calling requireMember()
 * or requireRole(), and always scope queries with the caller's organization_id.
 */
export function createAdminClient() {
  return createClient<Database>(
    publicEnv.supabaseUrl(),
    serverEnv.supabaseSecretKey(),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
