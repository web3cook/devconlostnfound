-- Attendees no longer use the website to report losses: they go to an Info
-- Desk and a team member files the report for them. Only the team can read
-- or write lost reports. Non-team sign-ins are deleted by the app, so reports
-- must survive their (old) reporter account being deleted.

-- ---------------------------------------------------------------------------
-- user_id: legacy "reported online by" account. Optional now, and kept (set
-- to null) when that account is deleted.
-- ---------------------------------------------------------------------------
alter table public.lost_reports
  alter column user_id drop not null,
  alter column user_id drop default;

alter table public.lost_reports drop constraint lost_reports_user_id_fkey;
alter table public.lost_reports
  add constraint lost_reports_user_id_fkey
  foreign key (user_id) references auth.users (id) on delete set null;

-- Which team member filed the report. Set by the database, not the client.
alter table public.lost_reports
  add column filed_by text check (char_length(filed_by) <= 200);

create or replace function private.stamp_lost_report()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.filed_by := private.current_email();
  return new;
end;
$$;

create trigger lost_reports_stamp before insert on public.lost_reports
  for each row execute function private.stamp_lost_report();

-- Only the team writes reports now, so the owner-vs-team guard is obsolete.
drop trigger lost_reports_guard on public.lost_reports;
drop function private.guard_lost_report();

-- ---------------------------------------------------------------------------
-- RLS: team only.
-- ---------------------------------------------------------------------------
drop policy "lost_reports: owner or team read" on public.lost_reports;
drop policy "lost_reports: owner insert" on public.lost_reports;
drop policy "lost_reports: owner or team update" on public.lost_reports;
drop policy "lost_reports: owner or team delete" on public.lost_reports;

create policy "lost_reports: team read"
  on public.lost_reports for select to authenticated
  using ((select private.is_team()));

create policy "lost_reports: team insert"
  on public.lost_reports for insert to authenticated
  with check ((select private.is_team()));

create policy "lost_reports: team update"
  on public.lost_reports for update to authenticated
  using ((select private.is_team()))
  with check ((select private.is_team()));

create policy "lost_reports: team delete"
  on public.lost_reports for delete to authenticated
  using ((select private.is_team()));
