-- Cloakroom: attendees leave bags with the Info Desk team.
--   * One deposit = one person, one physical token, one or more bags.
--   * Physical tokens are reused, so each deposit also gets a permanent ref_no
--     (shown as C-0001). A token can only be on one bag-in-storage deposit.
--   * Team-only. Same record-keeping as Lost & Found: no deletes, superadmin
--     archive/restore via the server, "Name (email)" stamps, History timeline.

create table public.cloak_deposits (
  id                 uuid primary key default gen_random_uuid(),
  ref_no             integer generated always as identity unique,
  token_no           text not null check (char_length(token_no) between 1 and 20),
  bag_count          integer not null check (bag_count between 1 and 50),
  bag_description    text check (char_length(bag_description) <= 1000),
  deposited_at       timestamptz not null default now(),

  depositor_name     text not null check (char_length(depositor_name) between 1 and 120),
  depositor_phone    text check (char_length(depositor_phone) <= 40),
  depositor_telegram text check (char_length(depositor_telegram) <= 100),
  depositor_email    text check (char_length(depositor_email) <= 200),
  notes              text check (char_length(notes) <= 2000),

  bag_photo_paths    text[] not null check (cardinality(bag_photo_paths) between 1 and 20),
  token_photo_path   text not null,

  status             text not null default 'stored' check (status in ('stored', 'collected')),
  collected_at       timestamptz,
  collector_name     text check (char_length(collector_name) <= 120),
  collector_phone    text check (char_length(collector_phone) <= 40),
  collector_telegram text check (char_length(collector_telegram) <= 100),
  collector_email    text check (char_length(collector_email) <= 200),
  collection_notes   text check (char_length(collection_notes) <= 2000),

  checked_in_by      text,
  collected_by_team  text,
  updated_by         text,
  archived_at        timestamptz,
  archived_by        text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  constraint cloak_depositor_contact check (
    coalesce(depositor_phone, depositor_telegram, depositor_email) is not null
  ),
  constraint cloak_collection_complete check (
    status = 'stored'
    or (collected_at is not null and collector_name is not null
        and coalesce(collector_phone, collector_telegram, collector_email) is not null)
  )
);

-- One physical token can't be on two deposits that are still in storage.
create unique index cloak_deposits_active_token
  on public.cloak_deposits (upper(token_no))
  where status = 'stored' and archived_at is null;
create index cloak_deposits_status_idx on public.cloak_deposits (status, deposited_at desc);

create trigger cloak_deposits_updated_at before update on public.cloak_deposits
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Stamping + archive guard (same rules as found items / lost reports).
-- ---------------------------------------------------------------------------
create or replace function private.stamp_cloak_deposit()
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
    new.token_no := upper(trim(new.token_no));
    new.checked_in_by := coalesce(v_actor, new.checked_in_by);
    return new;
  end if;

  if (new.archived_at is distinct from old.archived_at or new.archived_by is distinct from old.archived_by)
     and not private.is_server() then
    raise exception 'Only the superadmin can archive or restore entries' using errcode = '42501';
  end if;

  new.token_no := upper(trim(new.token_no));
  new.checked_in_by := old.checked_in_by;
  new.updated_by := coalesce(v_actor, case when private.is_server() then new.updated_by end, old.updated_by);
  return new;
end;
$$;

create trigger cloak_deposits_stamp before insert or update on public.cloak_deposits
  for each row execute function private.stamp_cloak_deposit();

-- ---------------------------------------------------------------------------
-- RLS: team only, no deletes.
-- ---------------------------------------------------------------------------
alter table public.cloak_deposits enable row level security;

create policy "cloak_deposits: team read"
  on public.cloak_deposits for select to authenticated
  using ((select private.is_team()));

create policy "cloak_deposits: team insert"
  on public.cloak_deposits for insert to authenticated
  with check ((select private.is_team()));

create policy "cloak_deposits: team update"
  on public.cloak_deposits for update to authenticated
  using ((select private.is_team()))
  with check ((select private.is_team()));

revoke all on public.cloak_deposits from anon, authenticated;
grant select, insert, update on public.cloak_deposits to authenticated;

-- ---------------------------------------------------------------------------
-- History: activity_log now also covers deposits.
-- ---------------------------------------------------------------------------
alter table public.activity_log
  add column deposit_id uuid references public.cloak_deposits (id) on delete cascade;
alter table public.activity_log drop constraint activity_log_check;
alter table public.activity_log
  add constraint activity_log_subject check (num_nonnulls(item_id, report_id, deposit_id) >= 1);
create index activity_log_deposit_idx on public.activity_log (deposit_id, created_at);

create or replace function private.log_cloak_deposit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor text := coalesce(private.current_actor(), new.updated_by, new.checked_in_by, 'system');
  v_action text;
  v_summary text;
begin
  if tg_op = 'INSERT' then
    v_action := 'checked in';
    v_summary := new.bag_count || case when new.bag_count = 1 then ' bag' else ' bags' end
                 || ', token ' || new.token_no || ', from ' || new.depositor_name;
    v_actor := coalesce(new.checked_in_by, v_actor);
  elsif old.archived_at is null and new.archived_at is not null then
    v_action := 'archived';
    v_actor := coalesce(new.archived_by, v_actor);
  elsif old.archived_at is not null and new.archived_at is null then
    v_action := 'restored';
  elsif old.status = 'stored' and new.status = 'collected' then
    v_action := 'collected';
    v_summary := 'Collected by ' || new.collector_name;
  elsif old.status = 'collected' and new.status = 'stored' then
    v_action := 'collection undone';
    v_summary := 'Back in the cloakroom';
  else
    v_action := 'edited';
  end if;

  insert into public.activity_log (deposit_id, action, summary, actor)
  values (new.id, v_action, v_summary, v_actor);
  return null;
end;
$$;

revoke all on function private.log_cloak_deposit() from public;

create trigger cloak_deposits_log after insert or update on public.cloak_deposits
  for each row execute function private.log_cloak_deposit();

-- ---------------------------------------------------------------------------
-- Pickup: whoever holds the token can collect. The token typed at the desk
-- must match. SECURITY INVOKER, so the caller's RLS applies.
-- ---------------------------------------------------------------------------
create function public.collect_deposit(
  p_deposit_id uuid,
  p_token_no   text,
  p_name       text,
  p_phone      text,
  p_telegram   text,
  p_email      text,
  p_notes      text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_token text;
begin
  if not private.is_team() then
    raise exception 'Only the Info Desk team can hand back bags' using errcode = '42501';
  end if;
  if nullif(trim(p_name), '') is null then
    raise exception 'Record the name of the person collecting';
  end if;
  if coalesce(nullif(trim(p_phone), ''), nullif(trim(p_telegram), ''), nullif(trim(p_email), '')) is null then
    raise exception 'Record at least one way to contact the person collecting';
  end if;

  select token_no into v_token from public.cloak_deposits
   where id = p_deposit_id and status = 'stored' and archived_at is null
   for update;
  if not found then
    raise exception 'This deposit is not in the cloakroom (already collected, archived or missing)';
  end if;
  if upper(trim(p_token_no)) <> v_token then
    raise exception 'Token number does not match this deposit (expected the token handed out at check-in)';
  end if;

  update public.cloak_deposits
     set status = 'collected',
         collected_at = now(),
         collector_name = trim(p_name),
         collector_phone = nullif(trim(p_phone), ''),
         collector_telegram = nullif(trim(p_telegram), ''),
         collector_email = nullif(trim(p_email), ''),
         collection_notes = nullif(trim(p_notes), ''),
         collected_by_team = private.current_actor()
   where id = p_deposit_id;
end;
$$;

-- Undo a pickup recorded by mistake. Fails if the token has been reused since.
create function public.uncollect_deposit(p_deposit_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not private.is_team() then
    raise exception 'Only the Info Desk team can undo a pickup' using errcode = '42501';
  end if;
  update public.cloak_deposits
     set status = 'stored', collected_at = null, collector_name = null, collector_phone = null,
         collector_telegram = null, collector_email = null, collection_notes = null, collected_by_team = null
   where id = p_deposit_id and status = 'collected' and archived_at is null;
end;
$$;

revoke all on function public.collect_deposit(uuid, text, text, text, text, text, text), public.uncollect_deposit(uuid)
  from public, anon;
grant execute on function public.collect_deposit(uuid, text, text, text, text, text, text), public.uncollect_deposit(uuid)
  to authenticated;
