-- Warranty + Receipt Manager — V1 schema
-- Run this in the Supabase SQL editor (Database → SQL Editor → New query).
-- Safe to re-run: every statement is guarded.

-- ---------------------------------------------------------------- profiles --
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  name text,
  created_at timestamptz not null default now()
);

-- Mirror new auth users into profiles so the app has a place for app-level
-- user data without touching the auth schema.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    -- Password sign-up sends 'name'; Google sends 'full_name'.
    coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- --------------------------------------------------------------- purchases --
create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  product_name text not null,
  brand text,
  category text,
  price numeric(12, 2),
  currency text not null default 'INR',
  purchase_date date not null,
  seller text,
  warranty_months integer,
  warranty_start date,
  warranty_end date,
  invoice_number text,
  serial_number text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists purchases_user_warranty_end_idx
  on public.purchases (user_id, warranty_end);

-- ---------------------------------------------------------------- receipts --
create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  -- Path inside the `receipts` storage bucket, not a public URL.
  file_path text not null,
  file_type text,
  created_at timestamptz not null default now()
);

create index if not exists receipts_purchase_idx on public.receipts (purchase_id);

-- --------------------------------------------------------------- reminders --
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  reminder_date date not null,
  reminder_type text not null default 'warranty_expiry',
  is_sent boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists reminders_due_idx on public.reminders (reminder_date, is_sent);

-- -------------------------------------------------------------- updated_at --
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists purchases_touch_updated_at on public.purchases;
create trigger purchases_touch_updated_at
  before update on public.purchases
  for each row execute function public.touch_updated_at();

-- --------------------------------------------------------- row level security
alter table public.profiles  enable row level security;
alter table public.purchases enable row level security;
alter table public.receipts  enable row level security;
alter table public.reminders enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own purchases" on public.purchases;
create policy "own purchases" on public.purchases
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own receipts" on public.receipts;
create policy "own receipts" on public.receipts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own reminders" on public.reminders;
create policy "own reminders" on public.reminders
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ----------------------------------------------------------------- storage --
-- Private bucket for receipt images and PDF invoices (used from V2 onward).
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

-- Objects are stored under `<user_id>/<purchase_id>/<file>` so ownership can be
-- checked from the path.
drop policy if exists "own receipt files" on storage.objects;
create policy "own receipt files" on storage.objects
  for all
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);
