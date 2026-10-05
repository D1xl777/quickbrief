# Casino Creative Compliance Hub: MVP Plan

## 1. What was in the folder

The repository was **not empty**. It held a small, unrelated static web game called
"CLOSE ENOUGH" (`index.html`, `game.js`, `style.css`, `questions.json`).
Nothing was deleted: it now lives in `legacy/close-enough/`, and the new product
lives at the repository root.

## 2. Implementation plan (phases)

| Phase | Scope | How it is tested |
|---|---|---|
| 1 | Next.js + TypeScript + Tailwind setup, design system, database schema with RLS, Supabase Auth login/logout, protected app shell | typecheck, lint, build, RLS SQL tests, login smoke test |
| 2 | Dashboard, Brands, Jurisdictions, Policies & demo rules | typecheck, lint, build, page smoke tests |
| 3 | Submissions, image uploads (Supabase Storage), immutable versioning | typecheck, lint, build, end-to-end browser test |
| 4 | Rules engine (deterministic layer + AI adapter interface, mocked), findings | unit tests for the engine, browser test |
| 5 | Review workflow: approve / request changes / reject, comments | browser test of the full review loop |
| 6 | Audit log (append-only), approval record, PDF export | DB immutability tests, PDF download test |
| 7 | Demo data seed script, polish, responsive layout, bug fixing | full demo flow, automated with Playwright |

## 3. Architecture (simple on purpose)

```
 Browser (React pages)
      │  forms call "Server Actions" (functions that run only on the server)
      ▼
 Next.js app (one deployable app, e.g. on Vercel)
  ├─ Server Components: read data AS THE LOGGED-IN USER → Postgres Row Level Security decides what they may see
  ├─ Server Actions:    validate input (zod) → check role → write with the server-only key → write audit event
  ├─ Rules engine:      src/lib/compliance (pure TypeScript, unit-tested)
  │     ├─ Layer 1: deterministic rules (phrases, disclaimers, URLs…)
  │     └─ Layer 2: AI adapter interface (mock today, real LLM later)
  └─ PDF route:         /api/approval-records/[id]/pdf (generated on the server)
      │
      ▼
 Supabase (one project)
  ├─ Auth      (email + password logins)
  ├─ Postgres  (all data, RLS on every table, append-only evidence tables)
  └─ Storage   (private "creatives" bucket; images are shown via short-lived signed links)
```

Key decisions, in plain language:

- **One app, one database.** No microservices, no queues, no Redis. Cheap to host
  (Vercel free/hobby tier + Supabase free tier is enough for a demo).
- **Reads are protected by the database itself.** Every table has Row Level
  Security (RLS): even if someone bypassed our screens, Postgres only returns rows
  from their own organisation (and, for Marketing users, only their own submissions).
- **Writes only happen on the server.** Logged-in users cannot write directly to
  the database from the browser. Every change goes through a server action that
  checks who you are and what your role allows, then records an audit event.
  This makes it impossible to fake a finding, an approval or an audit entry
  from the browser.
- **Evidence can't be edited.** Versions, uploaded files, check results, findings,
  reviews, approval records and the audit log are *append-only*. A database
  trigger refuses updates and deletes, even from the server.
- **Policy rules are snapshotted.** Each automated check stores a copy of the rules
  and policy versions it used, so an approval record shows exactly which policy
  version was applied, even if the rules change later.

## 4. Folder structure

```
src/
  app/
    login/                    login page
    (app)/                    everything behind login (shared sidebar layout)
      dashboard/
      submissions/            list, new, [id] detail, [id]/approval record
      review-queue/
      brands/
      policies/
      audit-log/
      settings/               organisation, users, jurisdictions
    api/approval-records/[id]/pdf/   PDF export
  components/
    ui/                       buttons, badges, cards, inputs, tables, empty states
    layout/                   sidebar, page header
    …feature components
  lib/
    supabase/                 server / admin / proxy clients
    auth.ts                   "who is logged in and what is their role"
    compliance/               rules engine + AI adapter (no framework code)
    audit.ts                  write audit events
    validation.ts             zod input schemas
  actions/                    server actions (all writes)
  proxy.ts                    refreshes login session, redirects logged-out users
supabase/
  migrations/                 database schema (SQL)
  tests/                      SQL tests for RLS and immutability
scripts/seed.ts               creates the demo organisation, users and data
tests/                        unit tests (engine) and end-to-end browser test
```

## 5. Database schema

All IDs are UUIDs. Every business table has `organization_id`.

| Table | Purpose | Key columns |
|---|---|---|
| organizations | a customer (operator) | name, slug |
| profiles | a person (1:1 with Supabase login) | email, full_name |
| organization_members | person ↔ organisation + role | role: admin / marketing / compliance |
| jurisdictions | configurable markets | code, name, is_active |
| brands | operator brands | name, description, internal_notes, logo_path, status |
| brand_jurisdictions | which jurisdictions a brand is active in | brand_id, jurisdiction_id |
| policies | a set of rules, versioned | name, jurisdiction_id?, brand_id?, version, is_demo, status |
| policy_rules | one check | code, rule_type, category, severity, config (phrases), channels, explanation, is_active |
| submissions | a creative going through approval | campaign_name, brand, jurisdiction, channel, status, current_version_id |
| submission_versions | immutable creative versions | version_number, creative_text, destination_url |
| creative_files | uploaded image for a version | storage_path, file_name, mime_type, size_bytes |
| check_runs | one execution of the automated checks | outcome, summary, policy_snapshot (rules + versions used) |
| findings | one result of a check | category, status, severity, title, explanation, evidence, rule reference, policy version |
| reviews | reviewer decisions and comments | decision: approved / changes_requested / rejected / comment, comment |
| approval_records | frozen approval evidence | reference_code, snapshot (everything shown on the record) |
| audit_events | append-only activity log | actor, action, entity, submission, metadata, timestamp |

Statuses:
- Submission: `draft → checked → pending_review → changes_requested | approved | rejected`
- Finding: `pass`, `potential_issue`, `review_required`; Severity: `low`, `medium`, `high`
- Channels: social_media, display_advertising, email, sms, affiliate_creative, landing_page

## 6. What we build now vs. intentionally NOT yet

**Now (MVP):** everything in the "first MVP goal" demo flow: login, dashboard,
brands, jurisdictions, demo policies/rules, submissions with immutable versions and
image upload, deterministic checks + mocked AI layer, review workflow with required
comments, append-only audit log, approval record with PDF export, demo data.

**Not yet (on purpose):**
- Real LLM integration (interface exists; plugging in a provider is a small change).
- OCR / reading text inside images (images are flagged for manual visual review).
- Uploading policy documents (PDF/Word) and extracting rules from them.
- Multiple organisations per user / organisation switcher (schema supports it).
- Email notifications, Slack integration, SSO/SAML, 2FA enforcement.
- Billing, self-serve sign-up, white-labelling.
- Video creatives, multi-file creatives, side-by-side visual diff of versions.
- Any real legal rules: all rules are clearly labelled **DEMO POLICY RULES**.

## 7. Credentials / services you will eventually need

| Service | Needed when | Cost |
|---|---|---|
| Supabase project (URL, publishable/anon key, service-role key) | to run it anywhere other than my test environment | free tier is fine |
| Vercel account (connect GitHub repo) | to put it on the internet | free hobby tier for demos |
| LLM API key (optional, e.g. Anthropic) | only when we switch the AI adapter from mock to real | pay-per-use |

None of these are needed for me to build and test: I'm using a local Supabase
running inside my build environment.
