-- Self-reported "I've sent it" clicks from the Email your MP action.
-- No personal data: sector, constituency and time only.
create table public.email_sends (
  id          uuid primary key default gen_random_uuid(),
  ons_code    text not null references public.constituencies (ons_code),
  sector      text not null,
  created_at  timestamptz not null default now()
);

create index email_sends_created_at on public.email_sends (created_at);

alter table public.email_sends enable row level security;

-- Marketing opt-ins, kept separate from letters and email counts.
-- Stores the exact wording the person saw, and its version, at the time they opted in.
create table public.marketing_optins (
  id               uuid primary key default gen_random_uuid(),
  email            text not null,
  opted_in_at      timestamptz not null default now(),
  wording_version  text not null,
  wording          text not null,
  source           text not null      -- e.g. 'email-mp', 'posted-letter'
);

create index marketing_optins_email on public.marketing_optins (lower(email));

alter table public.marketing_optins enable row level security;
