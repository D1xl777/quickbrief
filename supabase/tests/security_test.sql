-- Security tests: multi-tenant isolation, role-based visibility, write lockdown,
-- append-only evidence. Runs inside a transaction that is always rolled back.
-- Usage: psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/security_test.sql
begin;

-- Fixtures (as superuser) ----------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data, aud, role)
values
  ('00000000-0000-0000-0000-0000000000a1', 'admin-a@test.local', '{"full_name":"Admin A"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a2', 'mkt-a@test.local',   '{"full_name":"Mkt A"}',   'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a3', 'mkt2-a@test.local',  '{"full_name":"Mkt2 A"}',  'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a4', 'comp-a@test.local',  '{"full_name":"Comp A"}',  'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000b1', 'admin-b@test.local', '{"full_name":"Admin B"}', 'authenticated', 'authenticated');

insert into public.organizations (id, name, slug) values
  ('10000000-0000-0000-0000-00000000000a', 'Org A', 'org-a'),
  ('10000000-0000-0000-0000-00000000000b', 'Org B', 'org-b');

insert into public.organization_members (organization_id, user_id, role) values
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', 'admin'),
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a2', 'marketing'),
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a3', 'marketing'),
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a4', 'compliance'),
  ('10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000b1', 'admin');

insert into public.jurisdictions (id, organization_id, code, name) values
  ('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'UK', 'United Kingdom'),
  ('20000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-00000000000b', 'UK', 'United Kingdom');

insert into public.brands (id, organization_id, name) values
  ('30000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'Brand A'),
  ('30000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-00000000000b', 'Brand B');

insert into public.submissions (id, organization_id, campaign_name, brand_id, jurisdiction_id, channel, created_by) values
  ('40000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-00000000000a', 'A by mkt',  '30000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-00000000000a', 'email', '00000000-0000-0000-0000-0000000000a2'),
  ('40000000-0000-0000-0000-0000000000a3', '10000000-0000-0000-0000-00000000000a', 'A by mkt2', '30000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-00000000000a', 'sms',   '00000000-0000-0000-0000-0000000000a3'),
  ('40000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-00000000000b', 'B',         '30000000-0000-0000-0000-00000000000b', '20000000-0000-0000-0000-00000000000b', 'email', '00000000-0000-0000-0000-0000000000b1');

insert into public.submission_versions (id, organization_id, submission_id, version_number, creative_text, created_by) values
  ('50000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-00000000000a', '40000000-0000-0000-0000-0000000000a2', 1, 'v1', '00000000-0000-0000-0000-0000000000a2');

insert into public.audit_events (organization_id, actor_id, action, entity_type, submission_id) values
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a2', 'submission.created', 'submission', '40000000-0000-0000-0000-0000000000a2'),
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a3', 'submission.created', 'submission', '40000000-0000-0000-0000-0000000000a3'),
  ('10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000b1', 'submission.created', 'submission', '40000000-0000-0000-0000-0000000000b1');

-- Helper to impersonate a user -------------------------------------------------
create or replace function pg_temp.login(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
end $$;

create or replace function pg_temp.expect(label text, actual bigint, expected bigint) returns void language plpgsql as $$
begin
  if actual is distinct from expected then
    raise exception 'FAIL %: expected %, got %', label, expected, actual;
  end if;
  raise notice 'ok - %', label;
end $$;

-- 1. Profiles trigger -----------------------------------------------------------
select pg_temp.expect('profiles auto-created', (select count(*) from public.profiles where email like '%@test.local'), 5);

-- 2. Admin of org A sees only org A ------------------------------------------------
select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
select pg_temp.expect('admin A sees 1 organisation', (select count(*) from public.organizations), 1);
select pg_temp.expect('admin A sees 1 brand', (select count(*) from public.brands), 1);
select pg_temp.expect('admin A sees both org A submissions', (select count(*) from public.submissions), 2);
select pg_temp.expect('admin A sees org A audit events only', (select count(*) from public.audit_events), 2);
select pg_temp.expect('admin A sees 4 colleague profiles', (select count(*) from public.profiles), 4);

-- 3. Marketing sees only own submissions -----------------------------------------
select pg_temp.login('00000000-0000-0000-0000-0000000000a2');
select pg_temp.expect('marketing sees only own submission', (select count(*) from public.submissions), 1);
select pg_temp.expect('marketing sees own version', (select count(*) from public.submission_versions), 1);
select pg_temp.expect('marketing sees own audit events only', (select count(*) from public.audit_events), 1);

select pg_temp.login('00000000-0000-0000-0000-0000000000a3');
select pg_temp.expect('other marketing user cannot see version of colleague', (select count(*) from public.submission_versions), 0);

-- 4. Compliance sees all org submissions -----------------------------------------
select pg_temp.login('00000000-0000-0000-0000-0000000000a4');
select pg_temp.expect('compliance sees all org A submissions', (select count(*) from public.submissions), 2);

-- 5. Org B admin cannot see org A ----------------------------------------------
select pg_temp.login('00000000-0000-0000-0000-0000000000b1');
select pg_temp.expect('admin B sees only org B submissions', (select count(*) from public.submissions), 1);
select pg_temp.expect('admin B cannot read org A versions', (select count(*) from public.submission_versions), 0);

-- 6. Direct writes from logged-in users are refused ------------------------------
select pg_temp.login('00000000-0000-0000-0000-0000000000a4');
do $$
begin
  begin
    insert into public.reviews (organization_id, submission_id, version_id, reviewer_id, decision)
    values ('10000000-0000-0000-0000-00000000000a', '40000000-0000-0000-0000-0000000000a2',
            '50000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a4', 'approved');
    raise exception 'FAIL: authenticated user could insert a review';
  exception when insufficient_privilege then
    raise notice 'ok - authenticated user cannot insert reviews';
  end;
  begin
    update public.submissions set status = 'approved';
    raise exception 'FAIL: authenticated user could update submissions';
  exception when insufficient_privilege then
    raise notice 'ok - authenticated user cannot update submissions';
  end;
  begin
    delete from public.audit_events;
    raise exception 'FAIL: authenticated user could delete audit events';
  exception when insufficient_privilege then
    raise notice 'ok - authenticated user cannot delete audit events';
  end;
end $$;

-- 7. Evidence is append-only even for the service role / superuser --------------
reset role;
select set_config('request.jwt.claims', '', true);
do $$
begin
  begin
    update public.audit_events set action = 'tampered';
    raise exception 'FAIL: audit event could be updated';
  exception when insufficient_privilege then
    raise notice 'ok - audit events cannot be updated';
  end;
  begin
    delete from public.audit_events;
    raise exception 'FAIL: audit event could be deleted';
  exception when insufficient_privilege then
    raise notice 'ok - audit events cannot be deleted';
  end;
  begin
    update public.submission_versions set creative_text = 'overwritten';
    raise exception 'FAIL: version could be overwritten';
  exception when insufficient_privilege then
    raise notice 'ok - versions cannot be overwritten';
  end;
end $$;

set local role service_role;
do $$
begin
  begin
    update public.audit_events set action = 'tampered';
    raise exception 'FAIL: service role could update audit events';
  exception when insufficient_privilege then
    raise notice 'ok - service role cannot update audit events';
  end;
end $$;
reset role;

-- 8. Reviews require a comment unless approving -----------------------------------
do $$
begin
  begin
    insert into public.reviews (organization_id, submission_id, version_id, reviewer_id, decision, comment)
    values ('10000000-0000-0000-0000-00000000000a', '40000000-0000-0000-0000-0000000000a2',
            '50000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a4', 'rejected', '  ');
    raise exception 'FAIL: rejection without comment accepted';
  exception when check_violation then
    raise notice 'ok - rejection requires a comment';
  end;
end $$;

-- 9. Anonymous visitors see nothing ------------------------------------------------
set local role anon;
do $$
begin
  begin
    perform count(*) from public.submissions;
    raise exception 'FAIL: anon could read submissions';
  exception when insufficient_privilege then
    raise notice 'ok - anonymous visitors cannot read submissions';
  end;
end $$;
reset role;

\echo 'ALL SECURITY TESTS PASSED'
rollback;
