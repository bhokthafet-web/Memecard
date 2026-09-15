-- Memecard Supabase schema.
-- Run this once in your project's SQL Editor (Supabase dashboard → SQL Editor → New query).

-- ---------------------------------------------------------------------------
-- profiles: one row per signed-up user, holds their role ('user' or 'admin').
-- Row is created automatically by the trigger below whenever someone signs up.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: read own row"
  on public.profiles for select
  using (auth.uid() = id);

-- No update/insert policy for regular users on purpose: role is not
-- self-service. Promote someone to admin from the SQL Editor:
--   update public.profiles set role = 'admin' where email = 'you@example.com';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- global_card_overrides: edits to the built-in cards (French/Spanish/English
-- Basics) that apply for every visitor. Only admins can write; anyone
-- (including signed-out visitors, via the anon key) can read, so the app can
-- render the shared curriculum without requiring login.
-- ---------------------------------------------------------------------------
create table if not exists public.global_card_overrides (
  card_id text primary key,
  patch jsonb not null,
  updated_by uuid references auth.users (id),
  updated_at timestamptz not null default now()
);

alter table public.global_card_overrides enable row level security;

create policy "global overrides: readable by everyone"
  on public.global_card_overrides for select
  using (true);

create policy "global overrides: admins can write"
  on public.global_card_overrides for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- ---------------------------------------------------------------------------
-- user_custom_cards: personal cards a signed-in user added themselves.
-- Private — only the owner can see or change their own rows.
-- ---------------------------------------------------------------------------
create table if not exists public.user_custom_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id text not null,
  title text not null,
  description text,
  image text,
  image_url text,
  audio_url text,
  created_at timestamptz not null default now()
);

alter table public.user_custom_cards enable row level security;

create policy "user cards: owner full access"
  on public.user_custom_cards for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- user_card_overrides: a signed-in user's personal edits to a built-in card.
-- Private — lets a user tweak their own copy without changing it for anyone
-- else (that's what global_card_overrides + the admin role is for).
-- ---------------------------------------------------------------------------
create table if not exists public.user_card_overrides (
  user_id uuid not null references auth.users (id) on delete cascade,
  card_id text not null,
  patch jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, card_id)
);

alter table public.user_card_overrides enable row level security;

create policy "user overrides: owner full access"
  on public.user_card_overrides for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- global_category_overrides / user_category_overrides: same admin-vs-personal
-- pattern as the card override tables above, but for editing a category's
-- own title/emoji/description instead of one card.
-- ---------------------------------------------------------------------------
create table if not exists public.global_category_overrides (
  category_id text primary key,
  patch jsonb not null,
  updated_by uuid references auth.users (id),
  updated_at timestamptz not null default now()
);

alter table public.global_category_overrides enable row level security;

create policy "global category overrides: readable by everyone"
  on public.global_category_overrides for select
  using (true);

create policy "global category overrides: admins can write"
  on public.global_category_overrides for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create table if not exists public.user_category_overrides (
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id text not null,
  patch jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, category_id)
);

alter table public.user_category_overrides enable row level security;

create policy "user category overrides: owner full access"
  on public.user_category_overrides for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- global_categories / global_cards: brand-new shared content an admin
-- creates — not edits to existing built-ins, but new "official" categories
-- and cards that appear for every visitor. This is what lets an admin build
-- out the curriculum over time, as opposed to user_custom_cards which stay
-- private to whoever added them.
--
-- Once created, a global category/card is treated exactly like a built-in
-- one for editing purposes: an admin's later edits to it go through
-- global_card_overrides/global_category_overrides above, and a regular
-- user's personal tweak to it goes through user_card_overrides/
-- user_category_overrides — no separate code path needed.
-- ---------------------------------------------------------------------------
create table if not exists public.global_categories (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  emoji text not null default '🗂️',
  description text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

alter table public.global_categories enable row level security;

create policy "global categories: readable by everyone"
  on public.global_categories for select
  using (true);

create policy "global categories: admins can write"
  on public.global_categories for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create table if not exists public.global_cards (
  id uuid primary key default gen_random_uuid(),
  category_id text not null,
  title text not null,
  description text,
  image text,
  image_url text,
  audio_url text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

alter table public.global_cards enable row level security;

create policy "global cards: readable by everyone"
  on public.global_cards for select
  using (true);

create policy "global cards: admins can write"
  on public.global_cards for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
