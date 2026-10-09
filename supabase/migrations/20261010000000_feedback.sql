-- In-app feedback (bug reports, ideas, messages). Written only by the
-- server route /api/feedback with the service role, which validates input and
-- rate-limits by a hashed client address. Browsers can neither read nor write.
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('bug', 'idea', 'other')),
  message text not null check (char_length(message) between 1 and 2000),
  contact text check (contact is null or char_length(contact) <= 200),
  page text check (page is null or char_length(page) <= 200),
  user_id uuid references auth.users (id) on delete set null,
  client_hash text not null check (char_length(client_hash) = 64)
);

create index feedback_rate_idx on public.feedback (client_hash, created_at desc);

alter table public.feedback enable row level security;
-- No policies: anon/authenticated get nothing even if a grant slipped in.
revoke all on public.feedback from anon, authenticated;
grant select, insert on public.feedback to service_role;
