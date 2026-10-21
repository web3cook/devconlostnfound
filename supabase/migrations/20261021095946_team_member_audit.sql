-- The team roster is now managed in the app by the superadmin (SUPERADMIN env
-- var on the Next.js server) instead of being synced from TEAM_EMAILS.
-- Writes still go through the server's secret key only; signed-in users keep
-- read-only access, exactly as before.

alter table public.team_members
  add column if not exists added_by text;

comment on table public.team_members is
  'Info Desk team whitelist. Managed by the superadmin through the app (server secret key). Read by private.is_team() for RLS.';
