-- Constituency/MP snapshot, refreshed daily from the Members API by /api/cron/refresh-mps.
-- Public MP data only: no personal data about site users lives here.
create table public.constituencies (
  ons_code      text primary key,
  name          text not null,
  slug          text not null unique,
  nation        text not null check (nation in ('england', 'scotland', 'wales', 'northern-ireland')),
  mp            jsonb,          -- null when the seat is vacant; shape: lib/constituencies/types.ts (Mp)
  refreshed_at  timestamptz not null
);

-- Row-level security on, with no policies: the anon and authenticated roles can't read
-- or write. The server uses the service role, which bypasses RLS.
alter table public.constituencies enable row level security;

-- Fixed-window rate limiting for public routes (e.g. the postcode lookup).
-- `key` is a salted hash of the route and client IP, never the raw IP.
create table public.rate_limits (
  key           text not null,
  window_start  timestamptz not null,
  hits          integer not null default 0,
  primary key (key, window_start)
);

alter table public.rate_limits enable row level security;

-- Records a hit and returns true if the caller is still within the limit.
create or replace function public.rate_limit_hit(p_key text, p_window_seconds integer, p_max integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits integer;
begin
  insert into rate_limits (key, window_start, hits)
  values (p_key, v_window, 1)
  on conflict (key, window_start) do update set hits = rate_limits.hits + 1
  returning hits into v_hits;

  -- Opportunistic clean-up of old windows.
  delete from rate_limits where window_start < now() - interval '1 day';

  return v_hits <= p_max;
end;
$$;

revoke all on function public.rate_limit_hit(text, integer, integer) from public, anon, authenticated;
