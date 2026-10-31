-- Keep the full track record:
--   * Nothing is hard-deleted any more. The superadmin can archive (soft delete)
--     and restore found items and lost reports; nobody else can.
--   * Every row records who logged / filed / last edited / archived it, as
--     "Name (email)", stamped by the database from the caller's JWT.
--   * public.activity_log keeps a timeline of every change, written only by
--     triggers.
--   * Claimed items stay listed publicly as "Returned", with no details: the
--     photo and description are now team-only for good.
--   * Separate phone / email fields for the finder and the claimant.

-- ---------------------------------------------------------------------------
-- Who is acting. The email comes from the verified JWT; the name is the Google
-- profile name, used for display only (never for authorization).
-- ---------------------------------------------------------------------------
create or replace function private.current_actor()
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when private.current_email() is null then null
    else coalesce(
      nullif(trim((select auth.jwt()) -> 'user_metadata' ->> 'full_name'), '') || ' (' || private.current_email() || ')',
      private.current_email()
    )
  end;
$$;

revoke all on function private.current_actor() from public;
grant execute on function private.current_actor() to anon, authenticated;

-- The superadmin is configured on the app server (SUPERADMIN env var), so the
-- database only accepts archive changes made with the server's secret key.
create or replace function private.is_server()
returns boolean
language sql
stable
set search_path = ''
as $$
  select current_user in ('service_role', 'postgres', 'supabase_admin');
$$;

revoke all on function private.is_server() from public;
grant execute on function private.is_server() to anon, authenticated, service_role;

-- The superadmin's archive/restore runs with the server's secret key
-- (service_role), which goes through the stamping trigger too.
grant usage on schema private to service_role;
grant execute on function private.current_email(), private.current_actor() to service_role;

-- ---------------------------------------------------------------------------
-- New columns
-- ---------------------------------------------------------------------------
alter table public.found_items
  add column logged_by   text,
  add column updated_by  text,
  add column archived_at timestamptz,
  add column archived_by text;

alter table public.lost_reports
  add column updated_by  text,
  add column archived_at timestamptz,
  add column archived_by text;

alter table public.found_item_private
  add column finder_phone   text check (char_length(finder_phone) <= 40),
  add column finder_email   text check (char_length(finder_email) <= 200),
  add column claimant_phone text check (char_length(claimant_phone) <= 40),
  add column claimant_email text check (char_length(claimant_email) <= 200);

create index found_items_archived_at_idx on public.found_items (archived_at);
create index lost_reports_archived_at_idx on public.lost_reports (archived_at);

-- ---------------------------------------------------------------------------
-- No hard deletes. (The database owner can still delete in the SQL editor.)
-- ---------------------------------------------------------------------------
drop policy "found_items: team delete" on public.found_items;
drop policy "found_item_details: team delete" on public.found_item_details;
drop policy "lost_reports: team delete" on public.lost_reports;
revoke delete on public.found_items, public.found_item_details, public.found_item_private, public.lost_reports
  from anon, authenticated;

-- found_item_private had a single "for all" policy; split it so DELETE has none.
drop policy "found_item_private: team all" on public.found_item_private;
create policy "found_item_private: team read"
  on public.found_item_private for select to authenticated
  using ((select private.is_team()));
create policy "found_item_private: team insert"
  on public.found_item_private for insert to authenticated
  with check ((select private.is_team()));
create policy "found_item_private: team update"
  on public.found_item_private for update to authenticated
  using ((select private.is_team()))
  with check ((select private.is_team()));

-- ---------------------------------------------------------------------------
-- Visibility: archived items are hidden from the public; photo and details are
-- team-only, including after hand-over.
-- ---------------------------------------------------------------------------
drop policy "found_items: public read" on public.found_items;
create policy "found_items: public read unarchived, team all"
  on public.found_items for select to anon, authenticated
  using (archived_at is null or (select private.is_team()));

drop policy "found_item_details: team, or public once claimed" on public.found_item_details;
create policy "found_item_details: team read"
  on public.found_item_details for select to authenticated
  using ((select private.is_team()));
revoke select on public.found_item_details from anon;

drop policy "item-photos: team, or public once claimed" on storage.objects;
create policy "item-photos: team read"
  on storage.objects for select to authenticated
  using (bucket_id = 'item-photos' and (select private.is_team()));

-- ---------------------------------------------------------------------------
-- Stamping (BEFORE triggers): who logged/filed, who last edited, and an
-- archive guard so only the server (superadmin action) can archive/restore.
-- ---------------------------------------------------------------------------
create or replace function private.stamp_row()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_actor text := private.current_actor();
begin
  if tg_op = 'INSERT' then
    if not private.is_server() then
      new.archived_at := null;
      new.archived_by := null;
    end if;
    if tg_table_name = 'found_items' then
      new.logged_by := coalesce(v_actor, new.logged_by);
    else
      new.filed_by := coalesce(v_actor, new.filed_by);
    end if;
    return new;
  end if;

  if (new.archived_at is distinct from old.archived_at or new.archived_by is distinct from old.archived_by)
     and not private.is_server() then
    raise exception 'Only the superadmin can archive or restore entries' using errcode = '42501';
  end if;

  -- Who created it never changes.
  if tg_table_name = 'found_items' then
    new.logged_by := old.logged_by;
  else
    new.filed_by := old.filed_by;
  end if;
  -- The server passes the superadmin's name explicitly; a team member's JWT wins otherwise.
  new.updated_by := coalesce(v_actor, case when private.is_server() then new.updated_by end, old.updated_by);
  return new;
end;
$$;

drop trigger lost_reports_stamp on public.lost_reports;
drop function private.stamp_lost_report();

create trigger found_items_stamp before insert or update on public.found_items
  for each row execute function private.stamp_row();
create trigger lost_reports_stamp before insert or update on public.lost_reports
  for each row execute function private.stamp_row();

-- ---------------------------------------------------------------------------
-- Activity log: written only by the triggers below (SECURITY DEFINER in the
-- unexposed private schema). Team can read it; nobody can edit it.
-- ---------------------------------------------------------------------------
create table public.activity_log (
  id         bigint generated always as identity primary key,
  item_id    uuid references public.found_items (id) on delete cascade,
  report_id  uuid references public.lost_reports (id) on delete cascade,
  action     text not null,
  summary    text,
  actor      text,
  created_at timestamptz not null default now(),
  check (item_id is not null or report_id is not null)
);
create index activity_log_item_idx on public.activity_log (item_id, created_at);
create index activity_log_report_idx on public.activity_log (report_id, created_at);

alter table public.activity_log enable row level security;
create policy "activity_log: team read"
  on public.activity_log for select to authenticated
  using ((select private.is_team()));
revoke all on public.activity_log from anon, authenticated;
grant select on public.activity_log to authenticated;

create or replace function private.log_found_item()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor text := coalesce(private.current_actor(), new.updated_by, new.logged_by, 'system');
  v_action text;
  v_summary text;
begin
  if tg_op = 'INSERT' then
    v_action := 'logged';
    v_summary := 'Logged at the Info Desk';
    v_actor := coalesce(new.logged_by, v_actor);
  elsif old.archived_at is null and new.archived_at is not null then
    v_action := 'archived';
    v_actor := coalesce(new.archived_by, v_actor);
  elsif old.archived_at is not null and new.archived_at is null then
    v_action := 'restored';
  elsif old.status = 'in_custody' and new.status = 'claimed' then
    v_action := 'claimed';
    select 'Handed over to ' || coalesce(p.claimant_name, 'claimant') into v_summary
      from public.found_item_private p where p.item_id = new.id;
  elsif old.status = 'claimed' and new.status = 'in_custody' then
    v_action := 'claim undone';
    v_summary := 'Back in custody';
  else
    v_action := 'edited';
  end if;

  insert into public.activity_log (item_id, action, summary, actor)
  values (new.id, v_action, v_summary, v_actor);
  return null;
end;
$$;

create or replace function private.log_lost_report()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor text := coalesce(private.current_actor(), new.updated_by, new.filed_by, 'system');
  v_action text;
  v_summary text;
  v_item_ref text;
  v_report_ref text := 'L-' || lpad(new.ref_no::text, 4, '0');
begin
  if new.matched_item_id is not null then
    select 'F-' || lpad(f.ref_no::text, 4, '0') into v_item_ref from public.found_items f where f.id = new.matched_item_id;
  end if;

  if tg_op = 'INSERT' then
    v_action := 'filed';
    v_summary := 'Filed at the Info Desk';
    v_actor := coalesce(new.filed_by, v_actor);
  elsif old.archived_at is null and new.archived_at is not null then
    v_action := 'archived';
    v_actor := coalesce(new.archived_by, v_actor);
  elsif old.archived_at is not null and new.archived_at is null then
    v_action := 'restored';
  elsif new.status = 'returned' and old.status is distinct from 'returned' then
    v_action := 'returned';
    v_summary := 'Item ' || coalesce(v_item_ref, '?') || ' handed over';
  elsif old.status = 'returned' and new.status <> 'returned' then
    v_action := 'hand-over undone';
  elsif new.matched_item_id is not null and new.matched_item_id is distinct from old.matched_item_id then
    v_action := 'linked';
    v_summary := 'Linked to item ' || v_item_ref;
    insert into public.activity_log (item_id, action, summary, actor)
    values (new.matched_item_id, 'linked', 'Linked to lost report ' || v_report_ref, v_actor);
  elsif new.matched_item_id is null and old.matched_item_id is not null then
    v_action := 'unlinked';
    insert into public.activity_log (item_id, action, summary, actor)
    values (old.matched_item_id, 'unlinked', 'Unlinked from lost report ' || v_report_ref, v_actor);
  elsif new.status = 'closed' and old.status <> 'closed' then
    v_action := 'closed';
  elsif old.status = 'closed' and new.status <> 'closed' then
    v_action := 'reopened';
  elsif new.team_note is distinct from old.team_note
        and (to_jsonb(new) - 'team_note' - 'updated_at' - 'updated_by') = (to_jsonb(old) - 'team_note' - 'updated_at' - 'updated_by') then
    v_action := 'note updated';
  else
    v_action := 'edited';
  end if;

  insert into public.activity_log (report_id, action, summary, actor)
  values (new.id, v_action, v_summary, v_actor);
  return null;
end;
$$;

revoke all on function private.log_found_item(), private.log_lost_report() from public;

create trigger found_items_log after insert or update on public.found_items
  for each row execute function private.log_found_item();
create trigger lost_reports_log after insert or update on public.lost_reports
  for each row execute function private.log_lost_report();

-- Backfill a starting point for existing rows so every timeline has an origin.
insert into public.activity_log (item_id, action, summary, actor, created_at)
select id, 'logged', 'Logged at the Info Desk (before history was recorded)', 'unknown', created_at
from public.found_items;
insert into public.activity_log (report_id, action, summary, actor, created_at)
select id, 'filed', 'Filed (before history was recorded)', coalesce(filed_by, 'reported online'), created_at
from public.lost_reports;

-- ---------------------------------------------------------------------------
-- Hand-over now records phone and email, and who did it as "Name (email)".
-- Claimant details are saved before the status flips, so the log can name them.
-- ---------------------------------------------------------------------------
drop function public.claim_item(uuid, text, text, text, uuid);

create function public.claim_item(
  p_item_id          uuid,
  p_claimant_name    text,
  p_claimant_phone   text,
  p_claimant_email   text,
  p_claimant_contact text,
  p_claim_notes      text,
  p_lost_report_id   uuid default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not private.is_team() then
    raise exception 'Only the Info Desk team can hand over items' using errcode = '42501';
  end if;
  if coalesce(nullif(trim(p_claimant_phone), ''), nullif(trim(p_claimant_email), ''), nullif(trim(p_claimant_contact), '')) is null then
    raise exception 'Record at least one way to contact the person collecting the item';
  end if;

  perform 1 from public.found_items
   where id = p_item_id and status = 'in_custody' and archived_at is null
   for update;
  if not found then
    raise exception 'Item is not in custody (already claimed, archived or missing)';
  end if;

  insert into public.found_item_private
    (item_id, claimant_name, claimant_phone, claimant_email, claimant_contact, claim_notes, claimed_by_team)
  values
    (p_item_id, p_claimant_name, nullif(p_claimant_phone, ''), nullif(p_claimant_email, ''),
     nullif(p_claimant_contact, ''), p_claim_notes, private.current_actor())
  on conflict (item_id) do update
     set claimant_name    = excluded.claimant_name,
         claimant_phone   = excluded.claimant_phone,
         claimant_email   = excluded.claimant_email,
         claimant_contact = excluded.claimant_contact,
         claim_notes      = excluded.claim_notes,
         claimed_by_team  = excluded.claimed_by_team;

  update public.found_items set status = 'claimed', claimed_at = now() where id = p_item_id;

  if p_lost_report_id is not null then
    update public.lost_reports
       set status = 'returned', matched_item_id = p_item_id
     where id = p_lost_report_id;
  end if;
end;
$$;

create or replace function public.unclaim_item(p_item_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not private.is_team() then
    raise exception 'Only the Info Desk team can undo a hand-over' using errcode = '42501';
  end if;

  update public.found_items set status = 'in_custody', claimed_at = null where id = p_item_id;
  update public.found_item_private
     set claimant_name = null, claimant_phone = null, claimant_email = null, claimant_contact = null,
         claim_notes = null, claimed_by_team = null
   where item_id = p_item_id;
  update public.lost_reports set status = 'matched'
   where matched_item_id = p_item_id and status = 'returned';
end;
$$;

revoke all on function public.claim_item(uuid, text, text, text, text, text, uuid) from public, anon;
grant execute on function public.claim_item(uuid, text, text, text, text, text, uuid) to authenticated;
