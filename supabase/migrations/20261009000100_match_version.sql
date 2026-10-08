-- Optimistic concurrency for the authoritative match state: every write is
-- "update ... where id = $1 and version = $2", so two simultaneous requests
-- can't both apply on top of the same state.
alter table public.matches
  add column version integer not null default 0;
