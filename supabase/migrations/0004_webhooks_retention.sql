-- Stannp webhook deliveries already processed (Stannp retries, and signatures have no
-- timestamp, so repeats are dropped by webhook_id).
create table public.webhook_events (
  webhook_id   text primary key,
  received_at  timestamptz not null default now()
);

alter table public.webhook_events enable row level security;

create index letters_stannp_id on public.letters (stannp_id) where stannp_id is not null and stannp_id <> 0;

-- Set when the retention job removes a letter's personal data. Counts survive.
alter table public.letters add column anonymised_at timestamptz;

-- The job blanks these, so they can no longer be required.
alter table public.letters alter column email drop not null;
alter table public.letters alter column letter_text drop not null;
