/**
 * Demo data seed.
 *
 *   npm run seed
 *
 * Creates ONE fictional organisation with three demo users (Admin, Marketing,
 * Compliance). Safe to run once per database; if the demo organisation already
 * exists the script stops (evidence tables are append-only by design).
 * To start over: locally run `npx supabase db reset`; on a hosted project run
 * supabase/reset_demo.sql in the SQL Editor, then seed again.
 *
 * All brands, people and rules are fictional. Rules are DEMO POLICY RULES and
 * make no claim about real gambling law.
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/supabase/database.types";
import { DEMO_ACCOUNTS } from "../src/lib/demo";

config({ path: ".env.local" });
config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const password = process.env.DEMO_USER_PASSWORD;
if (!url || !secret || !password) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY or DEMO_USER_PASSWORD in .env.local",
  );
  process.exit(1);
}

const db = createClient<Database>(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export const ORG_SLUG = "northstar-demo";

function must<T>(
  result: { data: T; error: { message: string } | null },
  label: string,
): NonNullable<T> {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  if (result.data === null || result.data === undefined) {
    throw new Error(`${label}: no data returned`);
  }
  return result.data;
}

async function ensureUser(email: string, fullName: string): Promise<string> {
  const created = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (!created.error && created.data.user) return created.data.user.id;

  // Already exists: find it.
  const list = await db.auth.admin.listUsers({ perPage: 1000 });
  if (list.error) throw new Error(`listUsers: ${list.error.message}`);
  const existing = list.data.users.find((u) => u.email === email);
  if (!existing) throw new Error(`createUser ${email}: ${created.error?.message}`);
  await db.auth.admin.updateUserById(existing.id, { password });
  return existing.id;
}

async function main() {
  const existing = await db.from("organizations").select("id").eq("slug", ORG_SLUG).maybeSingle();
  if (existing.error) throw new Error(existing.error.message);
  if (existing.data) {
    console.log(
      `Demo organisation "${ORG_SLUG}" already exists. Nothing to do.\n` +
        "To start over: `npx supabase db reset` (local) or run supabase/reset_demo.sql (hosted).",
    );
    return;
  }

  console.log("Creating demo users…");
  const [adminAcc, marketingAcc, complianceAcc] = DEMO_ACCOUNTS;
  const adminId = await ensureUser(adminAcc.email, adminAcc.name);
  const marketingId = await ensureUser(marketingAcc.email, marketingAcc.name);
  const complianceId = await ensureUser(complianceAcc.email, complianceAcc.name);

  console.log("Creating organisation…");
  const org = must(
    await db
      .from("organizations")
      .insert({ name: "Northstar Gaming Group (Demo)", slug: ORG_SLUG })
      .select()
      .single(),
    "organization",
  );

  must(
    await db
      .from("organization_members")
      .insert([
        { organization_id: org.id, user_id: adminId, role: "admin" },
        { organization_id: org.id, user_id: marketingId, role: "marketing" },
        { organization_id: org.id, user_id: complianceId, role: "compliance" },
      ])
      .select(),
    "members",
  );

  console.log("\nDemo data created.");
  console.log(`Log in with any of these emails and the password from DEMO_USER_PASSWORD:`);
  for (const a of DEMO_ACCOUNTS) console.log(`  ${a.role.padEnd(20)} ${a.email}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
