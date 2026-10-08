-- Countdown duels: core schema + row level security.
--
-- Security model
--   * The Next.js server (service role, bypasses RLS) is the ONLY writer of
--     matches / players / rounds / submissions / buzzes. Browsers get no
--     INSERT/UPDATE/DELETE policies on those tables, so they cannot cheat.
--   * Browsers may READ rows only for matches they belong to.
--   * Solutions live in `round_secrets`, which is readable only once the
--     round has been revealed. There is no policy for any earlier moment.
--   * RLS is row-level, so anything secret is in its own table, never a
--     hidden column of a readable table.

-- ---------------------------------------------------------------- profiles
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null
    check (char_length(display_name) between 1 and 24),
  is_anonymous boolean not null default true,
  created_at timestamptz not null default now()
);

-- Every auth user (anonymous or not) gets a profile.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, is_anonymous)
  values (
    new.id,
    coalesce(nullif(left(new.raw_user_meta_data ->> 'display_name', 24), ''),
             'Player ' || substr(replace(new.id::text, '-', ''), 1, 4)),
    coalesce(new.is_anonymous, false)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Linking an identity to an anonymous user flips is_anonymous; mirror it.
create function public.sync_profile_anonymity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set is_anonymous = coalesce(new.is_anonymous, false)
  where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_updated
  after update of is_anonymous on auth.users
  for each row execute function public.sync_profile_anonymity();

-- ----------------------------------------------------------------- matches
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z2-9]{6}$'),
  format text not null default 'quick' check (format in ('quick')),
  status text not null default 'lobby'
    check (status in ('lobby', 'playing', 'finished')),
  host_id uuid not null references public.profiles (id),
  -- Serialised lib/match engine state. Contains no solutions.
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.match_players (
  match_id uuid not null references public.matches (id) on delete cascade,
  player_id uuid not null references public.profiles (id),
  seat smallint not null check (seat in (0, 1)),
  score integer not null default 0,
  joined_at timestamptz not null default now(),
  primary key (match_id, player_id),
  unique (match_id, seat)
);

-- Membership test used by policies. SECURITY DEFINER so it can read
-- match_players without re-entering that table's own policy (which would
-- recurse).
create function public.is_match_member(p_match_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.match_players mp
    where mp.match_id = p_match_id and mp.player_id = (select auth.uid())
  );
$$;

-- ------------------------------------------------------------------ rounds
create table public.rounds (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  idx smallint not null check (idx >= 0),
  kind text not null check (kind in ('letters', 'numbers', 'conundrum')),
  -- What both players may see while playing: the letters board, the numbers
  -- and target, the SCRAMBLED conundrum. Never a solution.
  public_data jsonb not null,
  status text not null default 'playing'
    check (status in ('playing', 'revealed')),
  started_at timestamptz not null default now(),
  deadline_at timestamptz not null,
  unique (match_id, idx)
);

-- Solutions (conundrum answer, best-known solutions). Server-written.
create table public.round_secrets (
  round_id uuid primary key references public.rounds (id) on delete cascade,
  secret_data jsonb not null
);

create function public.round_match_id(p_round_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select match_id from public.rounds where id = p_round_id;
$$;

create function public.is_round_revealed(p_round_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select status = 'revealed' from public.rounds where id = p_round_id),
    false
  );
$$;

create table public.round_submissions (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds (id) on delete cascade,
  player_id uuid not null references public.profiles (id),
  payload jsonb not null,
  points integer not null default 0,
  received_at timestamptz not null default now(),
  unique (round_id, player_id)
);

-- Conundrum buzzer. unique (round_id, attempt) makes "first insert wins"
-- atomic: two simultaneous buzzes for the same attempt, one insert fails.
-- A wrong answer bumps the attempt so the opponent can buzz; a player buzzes
-- at most once per round (they are locked out after a wrong answer).
create table public.buzzes (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds (id) on delete cascade,
  attempt smallint not null check (attempt >= 0),
  player_id uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (round_id, attempt),
  unique (round_id, player_id)
);

-- --------------------------------------------------------------------- RLS
alter table public.profiles enable row level security;
alter table public.matches enable row level security;
alter table public.match_players enable row level security;
alter table public.rounds enable row level security;
alter table public.round_secrets enable row level security;
alter table public.round_submissions enable row level security;
alter table public.buzzes enable row level security;

-- profiles: display names are public to signed-in users (opponents need
-- them); a user edits only their own row.
create policy profiles_select on public.profiles
  for select to authenticated using (true);
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
-- is_anonymous is derived from auth; users may only change display_name.
revoke update on public.profiles from authenticated;
grant update (display_name) on public.profiles to authenticated;

-- matches / match_players / rounds / buzzes: members read; nobody writes.
create policy matches_select_member on public.matches
  for select to authenticated using (public.is_match_member(id));

create policy match_players_select_member on public.match_players
  for select to authenticated using (public.is_match_member(match_id));

create policy rounds_select_member on public.rounds
  for select to authenticated using (public.is_match_member(match_id));

create policy buzzes_select_member on public.buzzes
  for select to authenticated
  using (public.is_match_member(public.round_match_id(round_id)));

-- round_secrets: members, and ONLY after the round is revealed.
create policy round_secrets_select_after_reveal on public.round_secrets
  for select to authenticated
  using (
    public.is_match_member(public.round_match_id(round_id))
    and public.is_round_revealed(round_id)
  );

-- round_submissions: your own always; the opponent's only after reveal.
create policy round_submissions_select on public.round_submissions
  for select to authenticated
  using (
    public.is_match_member(public.round_match_id(round_id))
    and (
      player_id = (select auth.uid())
      or public.is_round_revealed(round_id)
    )
  );

-- Defence in depth: no direct writes from browser roles at all (except the
-- display_name grant above), and anon sees nothing.
revoke all on public.matches, public.match_players, public.rounds,
  public.round_secrets, public.round_submissions, public.buzzes
  from anon, authenticated;
grant select on public.matches, public.match_players, public.rounds,
  public.round_secrets, public.round_submissions, public.buzzes
  to authenticated;
revoke all on public.profiles from anon;
grant select on public.profiles to authenticated;

-- Realtime: subscribers receive only rows their RLS lets them select.
alter publication supabase_realtime add table
  public.matches, public.match_players, public.rounds,
  public.round_submissions, public.buzzes;
