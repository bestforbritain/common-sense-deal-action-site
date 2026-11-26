-- Posted letters, admin settings and the audit log.

create type public.letter_status as enum (
  'awaiting_confirmation',  -- confirmation email sent; nothing queued until the link is clicked
  'awaiting_approval',      -- confirmed; waiting for staff approval (the default)
  'queued',                 -- approved (or auto-sent); waiting for postLetter()
  'sending',                -- postLetter() in progress
  'sent',                   -- accepted by Stannp
  'dispatched',             -- Stannp reports it posted (webhook, Phase 5)
  'returned',               -- returned undelivered (webhook, Phase 5)
  'failed',                 -- Stannp rejected it, or posting failed
  'rejected',               -- rejected by staff
  'expired'                 -- not confirmed within 48 hours
);

create table public.letters (
  id                    uuid primary key default gen_random_uuid(),
  status                public.letter_status not null default 'awaiting_confirmation',

  recipient_type        text not null check (recipient_type in ('mp', 'minister')),
  -- 'minister', or 'mp:{Members API id}': used for the one-letter-per-recipient rule.
  recipient_key         text not null,
  recipient_name        text not null,
  recipient_address     jsonb not null,   -- Stannp recipient fields

  ons_code              text not null references public.constituencies (ons_code),
  constituency_name     text not null,
  sector                text not null,

  -- Personal data: deleted by the retention job (Phase 5).
  sender_name           text not null,
  sender_role           text not null,
  business_name         text not null,
  business_address      text not null,
  email                 text not null,    -- confirmation only; never printed

  letter_text           text not null,
  pdf_sha256            text not null,
  pdf_path              text not null,    -- object in the private 'letters' storage bucket
  flags                 text[] not null default '{}',

  confirm_token_hash    text not null unique,
  confirm_expires_at    timestamptz not null,
  confirmed_at          timestamptz,

  approved_at           timestamptz,
  approved_by           text,
  rejected_at           timestamptz,
  rejected_by           text,
  rejection_reason      text,             -- internal only

  sent_at               timestamptz,
  stannp_id             bigint,
  stannp_test           boolean,
  stannp_cost_pence     integer,
  stannp_pdf_url        text,
  stannp_status         text,
  failure_reason        text,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index letters_status on public.letters (status, created_at);

-- One letter per email address per recipient (rejected and expired letters don't count).
create unique index letters_one_per_recipient
  on public.letters (lower(email), recipient_key)
  where status not in ('rejected', 'expired');

alter table public.letters enable row level security;

-- Admin settings: a single row.
create table public.settings (
  id                    integer primary key default 1 check (id = 1),
  auto_send             boolean not null default false,
  live_posting          boolean not null default false,
  daily_cap             integer check (daily_cap is null or daily_cap >= 0),
  total_budget_pence    integer check (total_budget_pence is null or total_budget_pence >= 0),
  updated_at            timestamptz not null default now(),
  updated_by            text,
  -- Auto-send can only be on once a total budget cap is set.
  constraint auto_send_needs_budget check (not auto_send or total_budget_pence is not null)
);

insert into public.settings (id) values (1);

alter table public.settings enable row level security;

-- Every admin action.
create table public.audit_log (
  id          bigint generated always as identity primary key,
  actor       text not null,
  action      text not null,
  target      text,
  details     jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

create index audit_log_created_at on public.audit_log (created_at desc);

alter table public.audit_log enable row level security;

-- Private bucket for letter PDFs. No public access; the server reads it with the service role.
insert into storage.buckets (id, name, public) values ('letters', 'letters', false);
