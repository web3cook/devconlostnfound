#!/usr/bin/env bash
# RLS smoke test against the LOCAL Supabase stack. Run after `npx supabase db reset`.
# Usage: bash supabase/tests/rls_smoke.sh
set -u
export PGPASSWORD=postgres
P() { psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -q -X -t -A "$@" 2>&1; }
claims() { echo "set local role authenticated; set local request.jwt.claims = '{\"sub\":\"$1\",\"email\":\"$2\",\"role\":\"authenticated\",\"app_metadata\":{\"provider\":\"$3\"}}';"; }
pass=0; fail=0
check() { # name, expected substring, actual
  if [[ "$3" == *"$2"* ]]; then echo "PASS  $1"; pass=$((pass+1)); else echo "FAIL  $1 — expected '$2', got: $3"; fail=$((fail+1)); fi
}

P -c "insert into auth.users (id, email, raw_app_meta_data) values
 ('22222222-2222-2222-2222-222222222222','team@x.org','{\"provider\":\"google\"}'),
 ('33333333-3333-3333-3333-333333333333','user@gmail.com','{\"provider\":\"google\"}'),
 ('99999999-9999-9999-9999-999999999999','other@gmail.com','{\"provider\":\"google\"}');
 insert into public.team_members(email) values ('team@x.org');" >/dev/null

T=$(claims 22222222-2222-2222-2222-222222222222 team@x.org google)
U=$(claims 33333333-3333-3333-3333-333333333333 user@gmail.com google)
O=$(claims 99999999-9999-9999-9999-999999999999 other@gmail.com google)
F=$(claims 44444444-4444-4444-4444-444444444444 team@x.org email)
ITEM="(select id from found_items limit 1)"

check "team can log an item" "INSERT" "$(P -c "begin; $T insert into found_items(public_label,category) values ('Earbuds','audio'); insert into found_item_details(item_id,title,description,color,photo_path) select id,'AirPods Pro','scratched lid','white','a.jpg' from found_items; insert into found_item_private(item_id, found_location, finder_name, verification_details) select id,'XL Room','Matteus','engraved DEV' from found_items; commit;" ; echo INSERT)"
check "non-team user cannot log an item" "row-level security" "$(P -c "begin; $U insert into found_items(public_label) values ('hack'); commit;")"
check "non-team user cannot add details" "row-level security" "$(P -c "begin; $U insert into found_item_details(item_id,title) select id,'hack' from found_items; commit;")"
check "non-Google login with team email is not team" "row-level security" "$(P -c "begin; $F insert into found_items(public_label) values ('hack2'); commit;")"
check "anon can browse generic label" "Earbuds" "$(P -c "begin; set local role anon; select public_label from found_items; commit;")"
check "anon cannot see details while in custody" "0" "$(P -c "begin; set local role anon; select count(*) from found_item_details; commit;")"
check "user cannot see details while in custody" "0" "$(P -c "begin; $U select count(*) from found_item_details; commit;")"
check "team sees details" "AirPods Pro" "$(P -c "begin; $T select title from found_item_details; commit;")"
P -c "insert into storage.objects(bucket_id,name) values ('item-photos','a.jpg');" >/dev/null
check "anon cannot see photo while in custody" "0" "$(P -c "begin; set local role anon; select count(*) from storage.objects; commit;")"
check "team sees photo while in custody" "1" "$(P -c "begin; $T select count(*) from storage.objects; commit;")"
check "anon cannot read private details" "permission denied" "$(P -c "begin; set local role anon; select * from found_item_private; commit;")"
check "user cannot read private details" "0" "$(P -c "begin; $U select count(*) from found_item_private; commit;")"
check "user cannot file a report" "row-level security" "$(P -c "begin; $U insert into lost_reports(title,description,category,contact_name) values ('x','x','other','x'); commit;")"
check "team files report, stamped with filer" "open|team@x.org|" "$(P -c "begin; $T insert into lost_reports(title,description,category,contact_name,contact_telegram,filed_by) values ('My airpods','white airpods pro, engraved','audio','Sam','sam','spoofed@x.org') returning status, filed_by, coalesce(user_id::text,''); commit;")"
check "user cannot see reports" "0" "$(P -c "begin; $U select count(*) from lost_reports; commit;")"
check "user cannot edit reports" "0" "$(P -c "begin; $U with u as (update lost_reports set contact_phone='1' returning 1) select count(*) from u; commit;")"
check "user cannot delete reports" "1" "$(P -c "begin; $O delete from lost_reports; commit;" >/dev/null; P -c "select count(*) from lost_reports;")"
check "team can edit report" "+911" "$(P -c "begin; $T update lost_reports set contact_phone='+911' returning contact_phone; rollback;")"
check "team sees all reports" "1" "$(P -c "begin; $T select count(*) from lost_reports; commit;")"
check "team can match report" "matched" "$(P -c "begin; $T update lost_reports set status='matched', matched_item_id=$ITEM, team_note='Come to desk' returning status; commit;")"
check "user cannot call claim_item" "Only the Info Desk team" "$(P -c "begin; $U select claim_item($ITEM,'x','x','x'); commit;")"
check "team claim is atomic" "claimed|Sam|team@x.org|returned" "$(P -c "begin; $T select claim_item($ITEM,'Sam','@sam','described engraving',(select id from lost_reports limit 1)); select f.status, p.claimant_name, p.claimed_by_team, r.status from found_items f join found_item_private p on p.item_id=f.id, lost_reports r; commit;")"
check "anon sees details once claimed" "AirPods Pro" "$(P -c "begin; set local role anon; select title from found_item_details; commit;")"
check "anon sees photo once claimed" "1" "$(P -c "begin; set local role anon; select count(*) from storage.objects; commit;")"
check "claimant and location stay private after claim" "0" "$(P -c "begin; $U select count(*) from found_item_private; commit;")"
check "double claim rejected" "not in custody" "$(P -c "begin; $T select claim_item($ITEM,'Eve','x','x'); commit;")"
check "unclaim restores state" "in_custody|matched" "$(P -c "begin; $T select unclaim_item($ITEM); select f.status, r.status from found_items f, lost_reports r; rollback;")"
check "team can read roster" "team@x.org" "$(P -c "begin; $T select email from team_members; commit;")"
check "team cannot add members" "permission denied" "$(P -c "begin; $T insert into team_members(email) values ('new@x.org'); commit;")"
check "team cannot remove members" "permission denied" "$(P -c "begin; $T delete from team_members; commit;")"
check "user sees no roster" "0" "$(P -c "begin; $U select count(*) from team_members; commit;")"
check "user cannot upload photos" "row-level security" "$(P -c "begin; $U insert into storage.objects(bucket_id,name) values ('item-photos','evil.jpg'); commit;")"

P -c "insert into lost_reports(user_id,title,description,category,contact_name) values ('33333333-3333-3333-3333-333333333333','old online report','x','other','Uma');" >/dev/null
check "deleting reporter account keeps their report" "old online report|" "$(P -c "delete from auth.users where id='33333333-3333-3333-3333-333333333333'; select title, coalesce(user_id::text,'') from lost_reports where title='old online report';")"

echo "---- $pass passed, $fail failed"
[[ $fail -eq 0 ]]
