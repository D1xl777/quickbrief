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
import { DEMO_POLICIES } from "./demo/policies";

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

  console.log("Creating jurisdictions…");
  const jurisdictions = must(
    await db
      .from("jurisdictions")
      .insert([
        { organization_id: org.id, code: "UK", name: "United Kingdom" },
        { organization_id: org.id, code: "SE", name: "Sweden" },
        { organization_id: org.id, code: "NL", name: "Netherlands" },
      ])
      .select(),
    "jurisdictions",
  );
  const jByCode = new Map(jurisdictions.map((j) => [j.code, j]));

  console.log("Creating brands…");
  const brands = must(
    await db
      .from("brands")
      .insert([
        {
          organization_id: org.id,
          name: "NovaBet",
          description: "Sportsbook brand focused on football and tennis markets.",
          internal_notes:
            "All NovaBet creatives for UK go through second-line review when they mention odds.",
        },
        {
          organization_id: org.id,
          name: "Orbit Casino",
          description: "Online casino brand with slots and live casino tables.",
          internal_notes: "Follow the DEMO Orbit Casino Brand Guidelines in addition to market rules.",
        },
      ])
      .select(),
    "brands",
  );
  const bByName = new Map(brands.map((b) => [b.name, b]));
  must(
    await db
      .from("brand_jurisdictions")
      .insert([
        { brand_id: bByName.get("NovaBet")!.id, jurisdiction_id: jByCode.get("UK")!.id, organization_id: org.id },
        { brand_id: bByName.get("NovaBet")!.id, jurisdiction_id: jByCode.get("NL")!.id, organization_id: org.id },
        { brand_id: bByName.get("Orbit Casino")!.id, jurisdiction_id: jByCode.get("UK")!.id, organization_id: org.id },
        { brand_id: bByName.get("Orbit Casino")!.id, jurisdiction_id: jByCode.get("SE")!.id, organization_id: org.id },
      ])
      .select(),
    "brand jurisdictions",
  );

  console.log("Creating DEMO policies and rules…");
  for (const p of DEMO_POLICIES) {
    const policy = must(
      await db
        .from("policies")
        .insert({
          organization_id: org.id,
          name: p.name,
          description: p.description,
          jurisdiction_id: p.jurisdictionCode ? jByCode.get(p.jurisdictionCode)!.id : null,
          brand_id: p.brandName ? bByName.get(p.brandName)!.id : null,
          is_demo: true,
          created_by: adminId,
        })
        .select()
        .single(),
      `policy ${p.name}`,
    );
    must(
      await db
        .from("policy_rules")
        .insert(
          p.rules.map((r) => ({
            organization_id: org.id,
            policy_id: policy.id,
            code: r.code,
            title: r.title,
            rule_type: r.rule_type,
            category: r.category,
            severity: r.severity,
            config: { phrases: r.phrases ?? [], match: r.match ?? "any" },
            channels: r.channels ?? [],
            explanation: r.explanation,
          })),
        )
        .select(),
      `rules for ${p.name}`,
    );
  }

  console.log("\nDemo data created.");
  console.log(`Log in with any of these emails and the password from DEMO_USER_PASSWORD:`);
  for (const a of DEMO_ACCOUNTS) console.log(`  ${a.role.padEnd(20)} ${a.email}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
