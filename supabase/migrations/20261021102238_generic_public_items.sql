-- Public sees only a generic label for items still at the Info Desk, so
-- claimants have to describe the real thing. Once returned, the photo and
-- description become public too. Location, finder and claimant stay team-only.
--
--   found_items         public          ref_no, public_label, category, found_at, status
--   found_item_details  team always;    title, description, color, photo_path
--                       public once claimed
--   found_item_private  team only       found_location, finder, verification, claimant

-- ---------------------------------------------------------------------------
-- Detailed description: new table, filled from the current public columns.
-- ---------------------------------------------------------------------------
create table public.found_item_details (
  item_id     uuid primary key references public.found_items (id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 120),
  description text check (char_length(description) <= 2000),
  color       text check (char_length(color) <= 60),
  photo_path  text,
  updated_at  timestamptz not null default now()
);
create index found_item_details_photo_path_idx on public.found_item_details (photo_path);

create trigger found_item_details_updated_at before update on public.found_item_details
  for each row execute function private.set_updated_at();

insert into public.found_item_details (item_id, title, description, color, photo_path)
select id, title, description, color, photo_path from public.found_items;

-- Location moves to the team-only table.
alter table public.found_item_private
  add column found_location text check (char_length(found_location) <= 200);

insert into public.found_item_private (item_id, found_location)
select id, found_location from public.found_items
on conflict (item_id) do update set found_location = excluded.found_location;

-- ---------------------------------------------------------------------------
-- found_items keeps only what is safe to show while the item is unclaimed.
-- Existing titles are detailed, so they are NOT copied into public_label; the
-- app shows the category until the team sets a label.
-- ---------------------------------------------------------------------------
alter table public.found_items
  add column public_label text check (char_length(public_label) <= 80);

-- The old photo policy references found_items.photo_path; replaced below.
drop policy if exists "item-photos: read public or team" on storage.objects;
drop index if exists public.found_items_photo_path_idx;
alter table public.found_items
  drop column title,
  drop column description,
  drop column color,
  drop column found_location,
  drop column photo_path,
  drop column photo_public;

-- ---------------------------------------------------------------------------
-- RLS for details: team always, everyone else only after hand-over.
-- found_items is publicly readable, so the EXISTS runs under the caller's RLS.
-- ---------------------------------------------------------------------------
alter table public.found_item_details enable row level security;

create policy "found_item_details: team, or public once claimed"
  on public.found_item_details for select to anon, authenticated
  using (
    (select private.is_team())
    or exists (
      select 1 from public.found_items f
      where f.id = found_item_details.item_id and f.status = 'claimed'
    )
  );

create policy "found_item_details: team insert"
  on public.found_item_details for insert to authenticated
  with check ((select private.is_team()));

create policy "found_item_details: team update"
  on public.found_item_details for update to authenticated
  using ((select private.is_team()))
  with check ((select private.is_team()));

create policy "found_item_details: team delete"
  on public.found_item_details for delete to authenticated
  using ((select private.is_team()));

revoke all on public.found_item_details from anon, authenticated;
grant select on public.found_item_details to anon, authenticated;
grant insert, update, delete on public.found_item_details to authenticated;

-- ---------------------------------------------------------------------------
-- Photos follow the same rule.
-- ---------------------------------------------------------------------------
create policy "item-photos: team, or public once claimed"
  on storage.objects for select to anon, authenticated
  using (
    bucket_id = 'item-photos'
    and (
      (select private.is_team())
      or exists (
        select 1
        from public.found_item_details d
        join public.found_items f on f.id = d.item_id
        where d.photo_path = storage.objects.name and f.status = 'claimed'
      )
    )
  );
