# Casino Creative Compliance Hub (MVP)

A B2B web app for regulated online casino / sportsbook operators. Marketing teams
upload creatives **before publication**; the app runs a first-pass automated check
against the operator's configured policies; a human **Compliance Reviewer** always
makes the final decision; every version, finding, review and action is stored as
evidence, ending in an exportable **Approval Record** (PDF).

> The product manages compliance workflow only. It never makes legal decisions,
> never says a creative is "legally compliant", and does not optimise, target or
> promote gambling. All rules shipped with the demo are **DEMO POLICY RULES**,
> written only to show how the product works. They are not statements of law.

---

## Contents

1. [What it does](#what-it-does)
2. [Architecture](#architecture)
3. [Run it on your computer](#run-it-on-your-computer)
4. [Set up a real (hosted) Supabase project](#set-up-a-hosted-supabase-project)
5. [Environment variables](#environment-variables)
6. [Database migrations](#database-migrations)
7. [Demo data](#demo-data)
8. [Deploy to the internet (Vercel)](#deploy-to-vercel)
9. [Tests](#tests)
10. [Known limitations](#known-limitations)

---

## What it does

| Role | Can |
|---|---|
| **Admin** | manage organisation, users, brands, jurisdictions, policies & rules; see everything |
| **Marketing** | create submissions, upload creatives and new versions, run checks, submit for review, see their own submissions |
| **Compliance Reviewer** | review queue, inspect creatives & findings, comment, approve / request changes / reject |

Workflow: **Draft → Checked → Pending Review → Changes Requested / Approved / Rejected**.
After "Changes Requested", marketing uploads a new version (old versions are never
overwritten), checks it again and resubmits.

Automated checks have two layers:

1. **Deterministic rules** (required phrase, required disclaimer, required terms
   reference, prohibited phrase, destination URL required, required brand text).
2. **AI adapter**: an interface for a future LLM. Today it is a transparent
   *mock* that flags uploaded images and comparative/superlative claims for human review.

Each finding has a category, status (PASS / POTENTIAL ISSUE / REVIEW REQUIRED),
severity (LOW / MEDIUM / HIGH), title, explanation, evidence, rule reference
(including the policy version) and timestamp.

## Architecture

```
Browser ──► Next.js app (one deployable app)
              ├─ Pages (Server Components) read data AS the logged-in user → Postgres RLS filters it
              ├─ Server Actions validate input, check the role, then write with the server-only key
              ├─ src/lib/compliance: checking engine (pure TypeScript, unit tested)
              └─ /api/approval-records/[id]/pdf: PDF generated on the server
                     │
                     ▼
            Supabase: Auth (logins) · Postgres (data + RLS) · Storage (private images)
```

- **Next.js 16** (App Router, TypeScript), **Tailwind CSS v4**, **Supabase** (Auth, Postgres, Storage).
- Few dependencies: `@supabase/ssr`, `@supabase/supabase-js`, `zod` (input validation),
  `lucide-react` (icons), `clsx`, `@react-pdf/renderer` (PDF, no headless browser needed).
- **Security model**
  - Every table has Row Level Security. Logged-in users can only *read* rows of
    their own organisation (Marketing: only their own submissions).
  - Logged-in users cannot write to the database directly. All writes go through
    server actions that check the user's role first, then use the secret key.
  - Versions, files, check runs, findings, reviews, approval records and the audit
    log are **append-only**: a database trigger rejects updates and deletes.
  - Images live in a private bucket and are shown through short-lived signed links.
  - Approval records store a frozen snapshot, so later changes to policies, brands
    or users never alter past evidence.

Folder overview: see [`docs/PLAN.md`](docs/PLAN.md) (plan, schema and scope) and [`AGENTS.md`](AGENTS.md).

---

## Run it on your computer

You need: **Node.js 20.9 or newer** and **Docker Desktop** (for the local database).

1. Install Node.js from <https://nodejs.org> (choose "LTS").
2. Install Docker Desktop from <https://www.docker.com/products/docker-desktop> and open it.
3. Open a terminal in this folder and run:

   ```bash
   npm install
   npx supabase start
   ```

   The second command downloads and starts a local Supabase. When it finishes it
   prints an **API URL**, a **Publishable key** and a **Secret key**.

4. Copy the example settings file:

   ```bash
   cp .env.example .env.local
   ```

   Open `.env.local` in a text editor and paste the values from step 3:
   `NEXT_PUBLIC_SUPABASE_URL` = API URL, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` =
   Publishable key, `SUPABASE_SECRET_KEY` = Secret key.

5. Create the demo data and start the app:

   ```bash
   npm run seed
   npm run dev
   ```

6. Open <http://localhost:3000> and sign in with a demo account (password: the
   value of `DEMO_USER_PASSWORD`, by default `DemoPass123!`).

The local database schema is applied automatically by `npx supabase start`.
To wipe everything and start over: `npx supabase db reset` then `npm run seed`.

## Set up a hosted Supabase project

Do this once, when you want the app on the internet.

1. Go to <https://supabase.com>, sign up and click **New project**. Pick a name
   (e.g. `compliance-hub`), a strong database password, and a region close to your
   users (e.g. *West EU (London)*). Click **Create new project** and wait ~2 minutes.
2. **Create the database tables:**
   1. In the left menu click **SQL Editor** → **New query**.
   2. Open the file `supabase/migrations/20261005000000_init.sql` from this
      repository, copy **all** of it, and paste it into the editor.
   3. Click **Run**. You should see "Success. No rows returned".
3. **Get your keys:** click **Project Settings** (gear icon) → **API Keys**.
   Copy the **Publishable key** and the **Secret key** (click *Reveal*).
   Then click **Data API** (or **API**) and copy the **Project URL**.
4. Put these three values into `.env.local` (for your computer) and into Vercel
   (see [Deploy](#deploy-to-vercel)).
5. (Optional, for demos) create the demo data from your computer:
   `npm run seed` with `.env.local` pointing at the hosted project.

> The **Secret key** can read and change everything. Never share it, never put it
> in a variable starting with `NEXT_PUBLIC_`, never commit it to Git.

Older Supabase projects show "anon" and "service_role" keys instead; they work the
same way (anon → publishable, service_role → secret).

## Environment variables

| Name | Where to find it | Secret? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → Data API → Project URL | no |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API Keys → Publishable key | no |
| `SUPABASE_SECRET_KEY` | Supabase → Project Settings → API Keys → Secret key | **yes, server only** |
| `NEXT_PUBLIC_SHOW_DEMO_LOGINS` | `true` shows demo account shortcuts on the login page | no |
| `DEMO_USER_PASSWORD` | password `npm run seed` gives the demo users | yes |
| `AI_PROVIDER` | `mock` (only option for now) | no |

## Database migrations

All schema lives in `supabase/migrations/`. The MVP has a single migration.

- **Local:** `npx supabase db reset` re-creates the database from the migrations.
- **Hosted:** paste new migration files into the SQL Editor in order and click
  Run, or use the Supabase CLI: `npx supabase link` then `npx supabase db push`.
- After changing the schema locally, regenerate TypeScript types: `npm run db:types`.

## Demo data

`npm run seed` creates (all fictional):

- Organisation **Northstar Gaming Group (Demo)**
- Brands **NovaBet** and **Orbit Casino**; jurisdictions **United Kingdom**, **Sweden**, **Netherlands**
- Users:

  | Role | Email |
  |---|---|
  | Admin | admin@northstar.example.com |
  | Marketing | marketing@northstar.example.com |
  | Compliance Reviewer | compliance@northstar.example.com |

- 5 policies of **DEMO POLICY RULES** (group, UK, Sweden, Netherlands, Orbit brand)
- 10 submissions covering every status: approved (incl. one with 3 versions:
  3 → 1 → 0 blocking findings), pending review, changes requested, rejected, checked, draft.

The seed stops if the demo organisation already exists. To re-create it:
locally `npx supabase db reset`; on a hosted project run
`supabase/reset_demo.sql` in the SQL Editor, then `npm run seed` again.

### The 3-minute demo script

1. Sign in as **Marketing** → Dashboard → **New submission**.
2. Campaign name, Brand *NovaBet*, Jurisdiction *United Kingdom*, Channel *Social Media*,
   text e.g. `NovaBet football: risk-free bets, act now!`, upload an image
   (samples in `scripts/demo/images/`). Click **Run Check** to see PASS /
   POTENTIAL ISSUE / REVIEW REQUIRED findings.
3. Click **Submit for Review**. Sign out, sign in as **Compliance Reviewer**.
4. **Review Queue** → open it → **Request Changes** with a comment.
5. Sign in as Marketing → open the submission → fix the text in **Upload version 2**
   (add `18+ | Please gamble responsibly | T&Cs apply` and a URL) → **Save & Run Check** → **Submit for Review**.
6. As Compliance Reviewer → **Approve**. Show **Version History** (click Version 1),
   the **Audit History**, the **Audit Log** page, then **Approval record → Export PDF**.

## Deploy to Vercel

1. Push this repository to GitHub (already done if you are reading it there).
2. Go to <https://vercel.com>, sign in with GitHub, click **Add New… → Project**,
   and **Import** this repository.
3. Before clicking Deploy, open **Environment Variables** and add the variables
   from the table above (use your hosted Supabase values). Set
   `NEXT_PUBLIC_SHOW_DEMO_LOGINS` to `false` for real customers.
4. Click **Deploy**. When it finishes, Vercel shows your URL.

Hosting costs: Vercel Hobby and the Supabase Free plan are enough for demos
(note: Supabase pauses free projects after a week of inactivity, and the Hobby
plan is for non-commercial use; move to paid plans for customers).

## Tests

| Command | What it checks |
|---|---|
| `npm run typecheck` | TypeScript types |
| `npm run lint` | code style / common mistakes |
| `npm test` | unit tests for the checking engine |
| `npm run test:db` | database security: tenant isolation, role visibility, write lock-down, append-only evidence (needs local Supabase) |
| `npm run e2e` | browser tests incl. the complete demo flow and PDF export (needs local Supabase + seeded data; builds and starts the app) |

## Known limitations

- **AI layer is a mock.** The interface (`src/lib/compliance/ai-adapter.ts`) is ready for a real LLM.
- **Images are not read automatically** (no OCR); every image is flagged for human review.
- No uploading of policy documents yet; rules are entered manually.
- Phrase matching is literal (case-insensitive, whole words); it does not understand meaning.
- One organisation per user (the schema supports more; there is no org switcher).
- Users are added by an admin with a temporary password; no invite emails, password reset emails, SSO or 2FA yet.
- Image uploads are limited to 4 MB (PNG, JPEG, WebP, GIF); no video.
- Multi-step writes are not wrapped in a single database transaction; a failure
  part-way through is reported to the user and may leave an extra audit/check entry.
- Timestamps are displayed in UTC.
- The PDF embeds PNG/JPEG images only (WebP/GIF are listed by file name).
- The legacy `legacy/close-enough/` folder contains an unrelated earlier project.
