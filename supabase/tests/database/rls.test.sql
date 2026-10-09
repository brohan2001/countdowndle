begin;
select plan(27);

-- Fixtures (run as the postgres superuser, which bypasses RLS).
insert into auth.users (id, instance_id, aud, role, email, is_anonymous, raw_user_meta_data)
values
  ('a0000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', null, true, '{"display_name":"Alice"}'),
  ('b0000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', null, true, '{}'),
  ('c0000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', null, true, '{}');

insert into public.matches (id, code, host_id)
values ('11111111-1111-1111-1111-111111111111', 'ABC234', 'a0000000-0000-0000-0000-00000000000a');
insert into public.match_players (match_id, player_id, seat) values
  ('11111111-1111-1111-1111-111111111111', 'a0000000-0000-0000-0000-00000000000a', 0),
  ('11111111-1111-1111-1111-111111111111', 'b0000000-0000-0000-0000-00000000000b', 1);
insert into public.rounds (id, match_id, idx, kind, public_data, deadline_at)
values ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 2, 'conundrum', '{"scrambled":"nealtbsru"}', now() + interval '30 seconds');
insert into public.round_secrets (round_id, secret_data)
values ('22222222-2222-2222-2222-222222222222', '{"solution":"ratbleuns"}');
insert into public.round_submissions (round_id, player_id, payload, points) values
  ('22222222-2222-2222-2222-222222222222', 'a0000000-0000-0000-0000-00000000000a', '{"guess":"x"}', 0),
  ('22222222-2222-2222-2222-222222222222', 'b0000000-0000-0000-0000-00000000000b', '{"guess":"y"}', 0);

-- Profiles are created by trigger; default name used when none supplied.
select is((select display_name from public.profiles where id = 'a0000000-0000-0000-0000-00000000000a'), 'Alice', 'profile takes display_name from metadata');
select matches((select display_name from public.profiles where id = 'b0000000-0000-0000-0000-00000000000b'), '^Player [0-9a-f]{4}$', 'profile gets a default name');
select is((select is_anonymous from public.profiles where id = 'a0000000-0000-0000-0000-00000000000a'), true, 'anonymous flag mirrored');

-- ---- as Alice (a member) ----
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

select is((select count(*)::int from public.matches), 1, 'member sees own match');
select is((select count(*)::int from public.match_players), 2, 'member sees both players');
select is((select count(*)::int from public.rounds), 1, 'member sees the round');
select is((select count(*)::int from public.round_secrets), 0, 'member CANNOT see the solution before reveal');
select is((select count(*)::int from public.round_submissions), 1, 'member sees only their own submission before reveal');

select throws_ok($$insert into public.matches (code, host_id) values ('ZZZ234', 'a0000000-0000-0000-0000-00000000000a')$$, '42501', null, 'browser cannot create matches');
select throws_ok($$insert into public.round_submissions (round_id, player_id, payload) values ('22222222-2222-2222-2222-222222222222', 'a0000000-0000-0000-0000-00000000000a', '{}')$$, '42501', null, 'browser cannot write submissions');
select throws_ok($$insert into public.buzzes (round_id, attempt, player_id) values ('22222222-2222-2222-2222-222222222222', 0, 'a0000000-0000-0000-0000-00000000000a')$$, '42501', null, 'browser cannot buzz directly');
select throws_ok($$update public.rounds set status = 'revealed'$$, '42501', null, 'browser cannot reveal a round');
select throws_ok($$update public.match_players set score = 999$$, '42501', null, 'browser cannot edit scores');
select throws_ok($$update public.profiles set is_anonymous = false where id = 'a0000000-0000-0000-0000-00000000000a'$$, '42501', null, 'browser cannot edit is_anonymous');

update public.profiles set display_name = 'Alicia' where id = 'a0000000-0000-0000-0000-00000000000a';
select is((select display_name from public.profiles where id = 'a0000000-0000-0000-0000-00000000000a'), 'Alicia', 'user can rename themselves');
update public.profiles set display_name = 'Hacked' where id = 'b0000000-0000-0000-0000-00000000000b';
reset role;
select isnt((select display_name from public.profiles where id = 'b0000000-0000-0000-0000-00000000000b'), 'Hacked', 'user cannot rename someone else');

-- ---- as Carol (not a member) ----
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"c0000000-0000-0000-0000-00000000000c","role":"authenticated"}', true);
select is((select count(*)::int from public.matches), 0, 'outsider sees no matches');
select is((select count(*)::int from public.rounds), 0, 'outsider sees no rounds');
select is((select count(*)::int from public.round_submissions), 0, 'outsider sees no submissions');
reset role;

-- ---- reveal the round, then re-check ----
update public.rounds set status = 'revealed' where id = '22222222-2222-2222-2222-222222222222';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
select is((select count(*)::int from public.round_secrets), 1, 'member sees the solution after reveal');
select is((select count(*)::int from public.round_submissions), 2, 'member sees both submissions after reveal');
select set_config('request.jwt.claims', '{"sub":"c0000000-0000-0000-0000-00000000000c","role":"authenticated"}', true);
select is((select count(*)::int from public.round_secrets), 0, 'outsider still cannot see the solution after reveal');
reset role;

-- ---- buzzer atomicity + anon ----
insert into public.buzzes (round_id, attempt, player_id) values ('22222222-2222-2222-2222-222222222222', 0, 'a0000000-0000-0000-0000-00000000000a');
select throws_ok($$insert into public.buzzes (round_id, attempt, player_id) values ('22222222-2222-2222-2222-222222222222', 0, 'b0000000-0000-0000-0000-00000000000b')$$, '23505', null, 'second buzz for the same attempt loses (unique constraint)');

set local role anon;
select throws_ok($$select count(*) from public.matches$$, '42501', null, 'anon role has no access to matches');
select throws_ok($$insert into public.feedback (kind, message, client_hash) values ('bug', 'x', repeat('a', 64))$$, '42501', null, 'anon cannot write feedback directly');
reset role;

-- ---- feedback: server-only ----
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
select throws_ok($$insert into public.feedback (kind, message, client_hash) values ('bug', 'x', repeat('a', 64))$$, '42501', null, 'signed-in users cannot write feedback directly');
select throws_ok($$select count(*) from public.feedback$$, '42501', null, 'signed-in users cannot read feedback');

select * from finish();
rollback;
