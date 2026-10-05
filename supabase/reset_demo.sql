-- Removes the DEMO organisation ("northstar-demo") and its three demo users so
-- that `npm run seed` can create fresh demo data.
--
-- Evidence tables are append-only. This script is the only intended way to
-- delete them, and only for the demo organisation. Run it in the Supabase
-- SQL Editor. Never run it against an organisation with real data.
begin;

set local app.allow_evidence_purge = 'on';

delete from public.organizations where slug = 'northstar-demo';

delete from auth.users
where email in (
  'admin@northstar.example.com',
  'marketing@northstar.example.com',
  'compliance@northstar.example.com'
);

commit;
-- Uploaded demo images remain in Storage (bucket "creatives") and are harmless.
-- You can delete the folder in Storage → creatives if you want to tidy up.
