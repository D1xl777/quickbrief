<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Casino Creative Compliance Hub: agent guide

## Product purpose
B2B SaaS for regulated online casino / sportsbook operators. Marketing uploads
creatives **before publication**, an automated first pass checks them against the
operator's *configured* policies, and a human **Compliance Reviewer** makes the
final decision. Everything (versions, findings, reviews, actions) is kept as evidence.

### Hard product boundaries (never change)
- Never build features that optimise gambling ad conversion, make ads more
  persuasive, target audiences / vulnerable users, encourage gambling, operate
  gambling, accept bets or handle player funds.
- The system never makes legal decisions. Never output "legally compliant" or similar.
  Use only: "No potential issue detected under the configured automated checks." /
  "Potential issue detected. Human compliance review required." (see `OUTCOME_SUMMARIES`).
- Finding statuses are only PASS / POTENTIAL ISSUE / REVIEW REQUIRED.
- Never hardcode claims about real gambling law. Seeded rules are labelled
  **DEMO POLICY RULES**. No real casino brands, real support organisations or real
  people in demo data.
- Only Compliance Reviewers make review decisions (admins cannot approve; no one
  reviews their own submission).

## Architecture
- Next.js 16 App Router + TypeScript + Tailwind v4, Supabase (Auth, Postgres, Storage).
  Read the bundled Next.js docs (see the block above): `middleware` is now `src/proxy.ts`,
  request APIs (`params`, `searchParams`, `cookies()`) are async.
- `src/app/(app)/…`: authenticated pages (Server Components). `src/app/login`: public.
- `src/actions/*.ts`: **all writes** (Server Actions).
- `src/lib/compliance/`: checking engine. `deterministic.ts` (layer 1),
  `ai-adapter.ts` (layer 2 interface + mock), `engine.ts` (summary), `run-check.ts` (DB).
  Keep the engine free of framework code; unit tests in `tests/unit`.
- `src/lib/approval.ts`: frozen approval snapshot. `src/lib/pdf/`: PDF rendering.
- `supabase/migrations/`: schema. `supabase/tests/security_test.sql`: RLS/immutability tests.
- `scripts/seed.ts` + `scripts/demo/`: demo data (reuses the engine and snapshot code).

## Security rules (important)
1. **Reads** use `createClient()` from `@/lib/supabase/server` (acts as the user;
   RLS applies). Do not read with the admin client in pages unless the record was
   first loaded through RLS (e.g. signing a storage URL).
2. **Writes** happen only in server actions/route handlers: call `requireMember()` /
   `requireRole()` first, then use `createAdminClient()` and **always filter by
   `member.organization.id`**. Validate every input with zod (`src/lib/validation.ts`).
3. Logged-in users have SELECT-only RLS policies and no table write grants. Do not
   add insert/update/delete policies for `authenticated` without a security review.
4. Evidence tables are append-only (trigger `prevent_evidence_mutation`):
   `submission_versions, creative_files, check_runs, findings, reviews,
   approval_records, audit_events`. Never add update/delete paths for them. A new
   creative = a new version. Never overwrite storage objects (copy instead).
5. Every state-changing action writes an audit event via `recordAudit()`; it throws
   on failure. Do not swallow errors.
6. `SUPABASE_SECRET_KEY` is server-only. Never import `@/lib/supabase/admin` or
   `@/lib/env`'s `serverEnv` from client components.
7. Status transitions use conditional updates (`.in("status", from)`) to avoid races.

## Coding standards
- TypeScript strict; DB types are generated (`npm run db:types`) into
  `src/lib/supabase/database.types.ts`. Do not edit that file by hand.
- Reuse UI from `src/components/ui/*` and badges from `src/components/status-badges.tsx`.
  Keep the neutral enterprise look; no gambling imagery.
- Client forms use `useActionForm` (`src/components/use-action-form.ts`) so input
  is kept when an action fails. Server actions return `ActionResult` via `toActionError`.
- Provide loading, empty and error states. No TODO placeholders in core flows.
- Timestamps are shown in UTC (`src/lib/format.ts`).

## Do not change casually
- The migration's RLS policies, grants and append-only triggers.
- `OUTCOME_SUMMARIES` wording and finding statuses.
- The approval snapshot shape (`schema_version`), since stored records depend on it.
- Separation of duties in `can.review` and `reviewSubmission`.

## Checks to run before committing
```bash
npm run typecheck && npm run lint && npm test
npm run test:db          # needs `npx supabase start`
npm run e2e              # needs local Supabase + `npm run seed`; builds the app
```
