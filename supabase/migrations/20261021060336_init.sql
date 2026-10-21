-- Devcon Lost & Found — initial schema
--
-- Roles:
--   * public (anon)    : browse found items (safe columns only) and public photos
--   * signed-in user   : file and manage their own lost-item reports
--   * team             : whitelisted Google accounts in public.team_members
--
-- The whitelist is managed through the TEAM_EMAILS env var on the Next.js
-- server, which syncs it into public.team_members with the secret key. No
-- signed-in user can write that table.

-- ---------------------------------------------------------------------------
-- Helpers live in a schema that is NOT exposed through the Data API.
-- ---------------------------------------------------------------------------
create schema if not exists private;
grant usage on schema private to anon, authenticated;

create or replace function private.current_email()
returns text
language sql
stable
set search_path = ''
as $$
  select lower(nullif((select auth.jwt()) ->> 'email', ''));
$$;

-- ---------------------------------------------------------------------------
-- Team whitelist
-- ---------------------------------------------------------------------------
create table public.team_members (
  email      text primary key check (email = lower(email) and email like '%_@_%'),
  created_at timestamptz not null default now()
);
alter table public.team_members enable row level security;

-- Team membership requires a whitelisted email AND a Google sign-in. Provider
-- comes from app_metadata, which users cannot edit (unlike user_metadata).
create or replace function private.is_team()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select auth.jwt()) -> 'app_metadata' ->> 'provider', '') = 'google'
     and exists (
       select 1 from public.team_members
       where email = private.current_email()
     );
$$;

revoke all on function private.current_email(), private.is_team() from public;
grant execute on function private.current_email(), private.is_team() to anon, authenticated;

-- Anyone signed in can see their own row (so the app can tell if they're on
-- the team); team members can see the whole roster.
create policy "team_members: read own row or roster if team"
  on public.team_members for select to authenticated
  using (email = (select private.current_email()) or (select private.is_team()));

-- Read-only for everyone except the server's secret key (TEAM_EMAILS sync).
revoke all on public.team_members from anon, authenticated;
grant select on public.team_members to authenticated;

-- ---------------------------------------------------------------------------
-- Shared bits
-- ---------------------------------------------------------------------------
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Found items (logged by the team at the Info Desk). Publicly readable, so
-- only put information here that is safe for everyone to see.
-- ---------------------------------------------------------------------------
create table public.found_items (
  id             uuid primary key default gen_random_uuid(),
  ref_no         integer generated always as identity unique,
  title          text not null check (char_length(title) between 1 and 120),
  description    text check (char_length(description) <= 2000),
  category       text not null default 'other',
  color          text check (char_length(color) <= 60),
  found_location text check (char_length(found_location) <= 200),
  found_at       timestamptz not null default now(),
  photo_path     text,
  photo_public   boolean not null default true,
  status         text not null default 'in_custody' check (status in ('in_custody', 'claimed')),
  claimed_at     timestamptz,
  created_by     uuid default auth.uid() references auth.users (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index found_items_status_found_at_idx on public.found_items (status, found_at desc);
create index found_items_photo_path_idx on public.found_items (photo_path);

create trigger found_items_updated_at before update on public.found_items
  for each row execute function private.set_updated_at();

alter table public.found_items enable row level security;

create policy "found_items: public read"
  on public.found_items for select to anon, authenticated
  using (true);

create policy "found_items: team insert"
  on public.found_items for insert to authenticated
  with check ((select private.is_team()));

create policy "found_items: team update"
  on public.found_items for update to authenticated
  using ((select private.is_team()))
  with check ((select private.is_team()));

create policy "found_items: team delete"
  on public.found_items for delete to authenticated
  using ((select private.is_team()));

grant select on public.found_items to anon, authenticated;
grant insert, update, delete on public.found_items to authenticated;

-- ---------------------------------------------------------------------------
-- Team-only details for a found item: who handed it in, hidden identifying
-- details used to verify a claim, and who collected it.
-- ---------------------------------------------------------------------------
create table public.found_item_private (
  item_id              uuid primary key references public.found_items (id) on delete cascade,
  finder_name          text check (char_length(finder_name) <= 120),
  finder_contact       text check (char_length(finder_contact) <= 200),
  verification_details text check (char_length(verification_details) <= 2000),
  internal_notes       text check (char_length(internal_notes) <= 2000),
  claimant_name        text check (char_length(claimant_name) <= 120),
  claimant_contact     text check (char_length(claimant_contact) <= 200),
  claim_notes          text check (char_length(claim_notes) <= 2000),
  claimed_by_team      text,
  updated_at           timestamptz not null default now()
);

create trigger found_item_private_updated_at before update on public.found_item_private
  for each row execute function private.set_updated_at();

alter table public.found_item_private enable row level security;

create policy "found_item_private: team all"
  on public.found_item_private for all to authenticated
  using ((select private.is_team()))
  with check ((select private.is_team()));

grant select, insert, update, delete on public.found_item_private to authenticated;

-- ---------------------------------------------------------------------------
-- Lost reports (filed by attendees). Visible to the reporter and the team.
-- ---------------------------------------------------------------------------
create table public.lost_reports (
  id               uuid primary key default gen_random_uuid(),
  ref_no           integer generated always as identity unique,
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title            text not null check (char_length(title) between 1 and 120),
  description      text not null check (char_length(description) between 1 and 2000),
  category         text not null default 'other',
  color            text check (char_length(color) <= 60),
  lost_location    text check (char_length(lost_location) <= 200),
  lost_at          timestamptz,
  contact_name     text not null check (char_length(contact_name) between 1 and 120),
  contact_email    text check (char_length(contact_email) <= 200),
  contact_telegram text check (char_length(contact_telegram) <= 100),
  contact_phone    text check (char_length(contact_phone) <= 40),
  status           text not null default 'open' check (status in ('open', 'matched', 'returned', 'closed')),
  matched_item_id  uuid references public.found_items (id) on delete set null,
  team_note        text check (char_length(team_note) <= 1000),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index lost_reports_user_id_idx on public.lost_reports (user_id);
create index lost_reports_status_idx on public.lost_reports (status, created_at desc);
create index lost_reports_matched_item_id_idx on public.lost_reports (matched_item_id);

create trigger lost_reports_updated_at before update on public.lost_reports
  for each row execute function private.set_updated_at();

-- Reporters may edit their own report's content and close/reopen it, but only the
-- team may match it, mark it returned, or leave a team note.
create or replace function private.guard_lost_report()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if private.is_team() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.status := 'open';
    new.matched_item_id := null;
    new.team_note := null;
    return new;
  end if;

  if new.user_id is distinct from old.user_id
     or new.matched_item_id is distinct from old.matched_item_id
     or new.team_note is distinct from old.team_note
     or (new.status is distinct from old.status
         and not (new.status = 'closed' or (old.status = 'closed' and new.status = 'open'))) then
    raise exception 'Only the Info Desk team can change the match or status of a report'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger lost_reports_guard before insert or update on public.lost_reports
  for each row execute function private.guard_lost_report();

alter table public.lost_reports enable row level security;

create policy "lost_reports: owner or team read"
  on public.lost_reports for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_team()));

create policy "lost_reports: owner insert"
  on public.lost_reports for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "lost_reports: owner or team update"
  on public.lost_reports for update to authenticated
  using (user_id = (select auth.uid()) or (select private.is_team()))
  with check (user_id = (select auth.uid()) or (select private.is_team()));

create policy "lost_reports: owner or team delete"
  on public.lost_reports for delete to authenticated
  using (user_id = (select auth.uid()) or (select private.is_team()));

grant select, insert, update, delete on public.lost_reports to authenticated;

-- Defense in depth: anonymous visitors have no business with these tables even
-- if RLS were misconfigured (Supabase grants anon table access by default).
revoke all on public.team_members, public.found_item_private, public.lost_reports from anon;

-- ---------------------------------------------------------------------------
-- Hand an item over, atomically. SECURITY INVOKER, so the caller's RLS applies
-- (only the team can write these tables).
-- ---------------------------------------------------------------------------
create or replace function public.claim_item(
  p_item_id          uuid,
  p_claimant_name    text,
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

  update public.found_items
     set status = 'claimed', claimed_at = now()
   where id = p_item_id and status = 'in_custody';
  if not found then
    raise exception 'Item is not in custody (already claimed or missing)';
  end if;

  insert into public.found_item_private (item_id, claimant_name, claimant_contact, claim_notes, claimed_by_team)
  values (p_item_id, p_claimant_name, p_claimant_contact, p_claim_notes, private.current_email())
  on conflict (item_id) do update
     set claimant_name    = excluded.claimant_name,
         claimant_contact = excluded.claimant_contact,
         claim_notes      = excluded.claim_notes,
         claimed_by_team  = excluded.claimed_by_team;

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
     set claimant_name = null, claimant_contact = null, claim_notes = null, claimed_by_team = null
   where item_id = p_item_id;
  update public.lost_reports set status = 'matched'
   where matched_item_id = p_item_id and status = 'returned';
end;
$$;

revoke all on function public.claim_item(uuid, text, text, text, uuid), public.unclaim_item(uuid) from public, anon;
grant execute on function public.claim_item(uuid, text, text, text, uuid), public.unclaim_item(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: item photos. Private bucket; the app serves signed URLs.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('item-photos', 'item-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Public can read a photo only when its item is marked photo_public; the team
-- can read all of them. found_items is publicly readable, so the EXISTS runs
-- fine under the caller's own RLS.
create policy "item-photos: read public or team"
  on storage.objects for select to anon, authenticated
  using (
    bucket_id = 'item-photos'
    and (
      (select private.is_team())
      or exists (
        select 1 from public.found_items f
        where f.photo_path = storage.objects.name and f.photo_public
      )
    )
  );

create policy "item-photos: team insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'item-photos' and (select private.is_team()));

create policy "item-photos: team update"
  on storage.objects for update to authenticated
  using (bucket_id = 'item-photos' and (select private.is_team()))
  with check (bucket_id = 'item-photos' and (select private.is_team()));

create policy "item-photos: team delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'item-photos' and (select private.is_team()));
