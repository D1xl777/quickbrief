-- Casino Creative Compliance Hub: initial schema
--
-- Security model (read this before changing anything):
--   * Every business table carries organization_id and has Row Level Security enabled.
--   * Logged-in users (role "authenticated") may only SELECT, and only rows of their
--     own organisation (Marketing users: only their own submissions).
--   * There are NO insert/update/delete policies for "authenticated". All writes go
--     through Next.js server actions using the service-role key after an explicit
--     permission check. This prevents users from forging findings, reviews,
--     approvals or audit events from the browser.
--   * Evidence tables are append-only: a trigger rejects UPDATE and DELETE.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.member_role as enum ('admin', 'marketing', 'compliance');
create type public.channel as enum (
  'social_media', 'display_advertising', 'email', 'sms', 'affiliate_creative', 'landing_page'
);
create type public.submission_status as enum (
  'draft', 'checked', 'pending_review', 'changes_requested', 'approved', 'rejected'
);
create type public.finding_status as enum ('pass', 'potential_issue', 'review_required');
create type public.finding_severity as enum ('low', 'medium', 'high');
create type public.review_decision as enum ('approved', 'changes_requested', 'rejected', 'comment');
create type public.rule_type as enum (
  'required_phrase',
  'prohibited_phrase',
  'required_disclaimer',
  'required_terms_reference',
  'destination_url_required',
  'required_brand_text'
);
create type public.check_outcome as enum ('no_issue_detected', 'review_required', 'potential_issue');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 200),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,64}$'),
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  created_at timestamptz not null default now()
);

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.member_role not null,
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);
create index on public.organization_members (user_id);

create table public.jurisdictions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  code text not null check (code ~ '^[A-Z0-9-]{2,10}$'),
  name text not null check (char_length(name) between 1 and 120),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, code)
);

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  description text not null default '',
  internal_notes text not null default '',
  logo_path text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table public.brand_jurisdictions (
  brand_id uuid not null references public.brands (id) on delete cascade,
  jurisdiction_id uuid not null references public.jurisdictions (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  primary key (brand_id, jurisdiction_id)
);

create table public.policies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  description text not null default '',
  -- null jurisdiction / brand = applies to all
  jurisdiction_id uuid references public.jurisdictions (id),
  brand_id uuid references public.brands (id),
  version integer not null default 1 check (version >= 1),
  is_demo boolean not null default true,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.policies (organization_id);

create table public.policy_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  policy_id uuid not null references public.policies (id) on delete cascade,
  code text not null check (char_length(code) between 1 and 40),
  title text not null check (char_length(title) between 1 and 200),
  rule_type public.rule_type not null,
  category text not null default 'General',
  severity public.finding_severity not null default 'medium',
  -- { "phrases": ["18+"], "match": "any" | "all" }
  config jsonb not null default '{}'::jsonb,
  -- empty array = applies to every channel
  channels public.channel[] not null default '{}',
  explanation text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (policy_id, code)
);
create index on public.policy_rules (policy_id);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  campaign_name text not null check (char_length(campaign_name) between 1 and 200),
  brand_id uuid not null references public.brands (id),
  jurisdiction_id uuid not null references public.jurisdictions (id),
  channel public.channel not null,
  status public.submission_status not null default 'draft',
  internal_notes text not null default '',
  current_version_id uuid,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz,
  decided_at timestamptz
);
create index on public.submissions (organization_id, status);
create index on public.submissions (created_by);

create table public.submission_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  submission_id uuid not null references public.submissions (id) on delete cascade,
  version_number integer not null check (version_number >= 1),
  creative_text text not null default '',
  destination_url text,
  change_note text not null default '',
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (submission_id, version_number)
);

alter table public.submissions
  add constraint submissions_current_version_fk
  foreign key (current_version_id) references public.submission_versions (id) on delete set null;

create table public.creative_files (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  submission_id uuid not null references public.submissions (id) on delete cascade,
  version_id uuid not null references public.submission_versions (id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null,
  size_bytes integer not null check (size_bytes > 0),
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);
create index on public.creative_files (version_id);

create table public.check_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  submission_id uuid not null references public.submissions (id) on delete cascade,
  version_id uuid not null references public.submission_versions (id) on delete cascade,
  run_by uuid not null references public.profiles (id),
  outcome public.check_outcome not null,
  summary text not null,
  pass_count integer not null default 0,
  potential_issue_count integer not null default 0,
  review_required_count integer not null default 0,
  -- copy of the policies + rules used, so evidence survives later rule edits
  policy_snapshot jsonb not null default '[]'::jsonb,
  ai_provider text not null default 'mock',
  created_at timestamptz not null default now()
);
create index on public.check_runs (version_id, created_at desc);

create table public.findings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  submission_id uuid not null references public.submissions (id) on delete cascade,
  version_id uuid not null references public.submission_versions (id) on delete cascade,
  check_run_id uuid not null references public.check_runs (id) on delete cascade,
  source text not null check (source in ('rule', 'ai')),
  category text not null,
  status public.finding_status not null,
  severity public.finding_severity not null,
  title text not null,
  explanation text not null,
  evidence text not null default '',
  rule_id uuid references public.policy_rules (id) on delete set null,
  rule_reference text not null default '',
  policy_id uuid references public.policies (id) on delete set null,
  policy_version integer,
  created_at timestamptz not null default now()
);
create index on public.findings (check_run_id);
create index on public.findings (submission_id);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  submission_id uuid not null references public.submissions (id) on delete cascade,
  version_id uuid not null references public.submission_versions (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id),
  decision public.review_decision not null,
  comment text not null default '',
  created_at timestamptz not null default now(),
  constraint comment_required check (
    decision = 'approved' or char_length(btrim(comment)) > 0
  )
);
create index on public.reviews (submission_id, created_at);

create table public.approval_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  submission_id uuid not null references public.submissions (id) on delete cascade,
  version_id uuid not null references public.submission_versions (id) on delete cascade,
  review_id uuid not null unique references public.reviews (id) on delete cascade,
  reference_code text not null unique,
  approved_by uuid not null references public.profiles (id),
  approved_at timestamptz not null default now(),
  -- frozen copy of everything shown on the approval record
  snapshot jsonb not null
);
create index on public.approval_records (submission_id);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  actor_email text not null default '',
  action text not null,
  entity_type text not null,
  entity_id uuid,
  submission_id uuid references public.submissions (id) on delete cascade,
  description text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index on public.audit_events (organization_id, created_at desc);
create index on public.audit_events (submission_id, created_at);

-- ---------------------------------------------------------------------------
-- Profiles are created automatically for every new auth user
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Respect an explicitly provided value (used by the demo seed); otherwise stamp now().
  if new.updated_at is not distinct from old.updated_at then
    new.updated_at = now();
  end if;
  return new;
end;
$$;

create trigger brands_touch before update on public.brands
  for each row execute function public.touch_updated_at();
create trigger policies_touch before update on public.policies
  for each row execute function public.touch_updated_at();
create trigger policy_rules_touch before update on public.policy_rules
  for each row execute function public.touch_updated_at();
create trigger submissions_touch before update on public.submissions
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Append-only evidence tables
-- UPDATE and DELETE are rejected for everyone, including the service role.
-- The only escape hatch is an explicit, transaction-local setting used by the
-- demo reset script (supabase/reset_demo.sql); it is never used by the app.
-- ---------------------------------------------------------------------------
create or replace function public.prevent_evidence_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(current_setting('app.allow_evidence_purge', true), '') = 'on' and tg_op = 'DELETE' then
    return old;
  end if;
  raise exception 'Table % is append-only: % is not allowed', tg_table_name, tg_op
    using errcode = '42501';
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'submission_versions', 'creative_files', 'check_runs', 'findings',
    'reviews', 'approval_records', 'audit_events'
  ]
  loop
    execute format(
      'create trigger %I before update or delete on public.%I
         for each row execute function public.prevent_evidence_mutation()',
      t || '_append_only', t
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS helper functions (security definer so they can read memberships
-- without recursive policy evaluation). Kept in a private schema.
-- ---------------------------------------------------------------------------
create schema if not exists app;
grant usage on schema app to authenticated;

create or replace function app.member_role(org uuid)
returns public.member_role
language sql
stable
security definer
set search_path = ''
as $$
  select m.role
  from public.organization_members m
  where m.organization_id = org and m.user_id = auth.uid()
$$;

create or replace function app.is_member(org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = org and m.user_id = auth.uid()
  )
$$;

create or replace function app.can_view_submission(sub uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.submissions s
    join public.organization_members m
      on m.organization_id = s.organization_id and m.user_id = auth.uid()
    where s.id = sub
      and (m.role in ('admin', 'compliance') or s.created_by = auth.uid())
  )
$$;

create or replace function app.shares_org_with(other uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members a
    join public.organization_members b on a.organization_id = b.organization_id
    where a.user_id = auth.uid() and b.user_id = other
  )
$$;

revoke all on function app.member_role(uuid) from public;
revoke all on function app.is_member(uuid) from public;
revoke all on function app.can_view_submission(uuid) from public;
revoke all on function app.shares_org_with(uuid) from public;
grant execute on function app.member_role(uuid) to authenticated;
grant execute on function app.is_member(uuid) to authenticated;
grant execute on function app.can_view_submission(uuid) to authenticated;
grant execute on function app.shares_org_with(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security: SELECT-only policies for logged-in users
-- ---------------------------------------------------------------------------
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_members enable row level security;
alter table public.jurisdictions enable row level security;
alter table public.brands enable row level security;
alter table public.brand_jurisdictions enable row level security;
alter table public.policies enable row level security;
alter table public.policy_rules enable row level security;
alter table public.submissions enable row level security;
alter table public.submission_versions enable row level security;
alter table public.creative_files enable row level security;
alter table public.check_runs enable row level security;
alter table public.findings enable row level security;
alter table public.reviews enable row level security;
alter table public.approval_records enable row level security;
alter table public.audit_events enable row level security;

create policy "members read their organisation" on public.organizations
  for select to authenticated using (app.is_member(id));

create policy "read own and colleague profiles" on public.profiles
  for select to authenticated using (id = auth.uid() or app.shares_org_with(id));

create policy "members read memberships" on public.organization_members
  for select to authenticated using (app.is_member(organization_id));

create policy "members read jurisdictions" on public.jurisdictions
  for select to authenticated using (app.is_member(organization_id));

create policy "members read brands" on public.brands
  for select to authenticated using (app.is_member(organization_id));

create policy "members read brand jurisdictions" on public.brand_jurisdictions
  for select to authenticated using (app.is_member(organization_id));

create policy "members read policies" on public.policies
  for select to authenticated using (app.is_member(organization_id));

create policy "members read policy rules" on public.policy_rules
  for select to authenticated using (app.is_member(organization_id));

create policy "read permitted submissions" on public.submissions
  for select to authenticated using (
    app.member_role(organization_id) in ('admin', 'compliance')
    or (created_by = auth.uid() and app.is_member(organization_id))
  );

create policy "read versions of permitted submissions" on public.submission_versions
  for select to authenticated using (app.can_view_submission(submission_id));

create policy "read files of permitted submissions" on public.creative_files
  for select to authenticated using (app.can_view_submission(submission_id));

create policy "read check runs of permitted submissions" on public.check_runs
  for select to authenticated using (app.can_view_submission(submission_id));

create policy "read findings of permitted submissions" on public.findings
  for select to authenticated using (app.can_view_submission(submission_id));

create policy "read reviews of permitted submissions" on public.reviews
  for select to authenticated using (app.can_view_submission(submission_id));

create policy "read approval records of permitted submissions" on public.approval_records
  for select to authenticated using (app.can_view_submission(submission_id));

create policy "read audit events" on public.audit_events
  for select to authenticated using (
    app.member_role(organization_id) in ('admin', 'compliance')
    or (submission_id is not null and app.can_view_submission(submission_id))
  );

-- Logged-in users and anonymous visitors cannot write any table directly.
revoke insert, update, delete, truncate on all tables in schema public from anon, authenticated;
revoke all on all tables in schema public from anon;

-- ---------------------------------------------------------------------------
-- Storage: private bucket for creative images. No storage policies are granted
-- to logged-in users; the server uploads with the service role and hands out
-- short-lived signed URLs.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'creatives', 'creatives', false, 5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;
