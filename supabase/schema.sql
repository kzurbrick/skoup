-- Run this in Supabase SQL Editor (Dashboard → SQL → New query)

create table if not exists families (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users(id) on delete cascade not null unique,
  created_at timestamptz not null default now()
);

create table if not exists inbound_addresses (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references families(id) on delete cascade not null unique,
  mailbox_hash text not null unique,
  domain text not null default 'mailin.skoup.app',
  created_at timestamptz not null default now()
);

create table if not exists feed_items (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references families(id) on delete cascade not null,
  category text not null,
  title text not null,
  summary text not null,
  date date,
  start_time text,
  end_time text,
  location text,
  amount text,
  action_required text,
  links jsonb default '[]'::jsonb,
  source_excerpt text not null,
  confidence text not null,
  status text not null default 'new',
  email_subject text,
  email_sender text,
  email_received_date text,
  email_body text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists feed_items_family_id_idx on feed_items(family_id);
create index if not exists inbound_addresses_mailbox_hash_idx on inbound_addresses(mailbox_hash);

alter table families enable row level security;
alter table inbound_addresses enable row level security;
alter table feed_items enable row level security;

create policy "Users read own family"
  on families for select
  using (auth.uid() = owner_user_id);

create policy "Users insert own family"
  on families for insert
  with check (auth.uid() = owner_user_id);

create policy "Users read own inbound address"
  on inbound_addresses for select
  using (
    family_id in (
      select id from families where owner_user_id = auth.uid()
    )
  );

create policy "Users read own feed items"
  on feed_items for select
  using (
    family_id in (
      select id from families where owner_user_id = auth.uid()
    )
  );

create policy "Users insert own feed items"
  on feed_items for insert
  with check (
    family_id in (
      select id from families where owner_user_id = auth.uid()
    )
  );

create policy "Users update own feed items"
  on feed_items for update
  using (
    family_id in (
      select id from families where owner_user_id = auth.uid()
    )
  );
