-- Memecard Supabase schema.
-- Run this in your project's SQL Editor (Supabase dashboard → SQL Editor → New query).
-- Safe to re-run any time you pull in schema changes — every statement drops
-- its own policy/trigger first, so running it twice is a no-op, not an error.

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

drop policy if exists "profiles: read own row" on public.profiles;
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

drop policy if exists "global overrides: readable by everyone" on public.global_card_overrides;
create policy "global overrides: readable by everyone"
  on public.global_card_overrides for select
  using (true);

drop policy if exists "global overrides: admins can write" on public.global_card_overrides;
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

drop policy if exists "user cards: owner full access" on public.user_custom_cards;
create policy "user cards: owner full access"
  on public.user_custom_cards for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- user_card_overrides / user_category_overrides (below): NOT used by the app
-- anymore — kept only so existing rows aren't orphaned if you already ran an
-- earlier version of this schema. The app no longer lets a user patch a
-- shared card/category in place; they copy it to their own wall
-- (user_custom_cards) instead, which is fully theirs to edit. Safe to drop
-- both tables if you're setting this up fresh and don't need the history.
-- ---------------------------------------------------------------------------
create table if not exists public.user_card_overrides (
  user_id uuid not null references auth.users (id) on delete cascade,
  card_id text not null,
  patch jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, card_id)
);

alter table public.user_card_overrides enable row level security;

drop policy if exists "user overrides: owner full access" on public.user_card_overrides;
create policy "user overrides: owner full access"
  on public.user_card_overrides for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- global_category_overrides: admin edits to a category's own
-- title/emoji/description, applied for every visitor — same pattern as
-- global_card_overrides above. (user_category_overrides further down is the
-- category equivalent of user_card_overrides: no longer used, kept only for
-- compatibility with existing rows.)
-- ---------------------------------------------------------------------------
create table if not exists public.global_category_overrides (
  category_id text primary key,
  patch jsonb not null,
  updated_by uuid references auth.users (id),
  updated_at timestamptz not null default now()
);

alter table public.global_category_overrides enable row level security;

drop policy if exists "global category overrides: readable by everyone" on public.global_category_overrides;
create policy "global category overrides: readable by everyone"
  on public.global_category_overrides for select
  using (true);

drop policy if exists "global category overrides: admins can write" on public.global_category_overrides;
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

drop policy if exists "user category overrides: owner full access" on public.user_category_overrides;
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

drop policy if exists "global categories: readable by everyone" on public.global_categories;
create policy "global categories: readable by everyone"
  on public.global_categories for select
  using (true);

drop policy if exists "global categories: admins can write" on public.global_categories;
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

drop policy if exists "global cards: readable by everyone" on public.global_cards;
create policy "global cards: readable by everyone"
  on public.global_cards for select
  using (true);

drop policy if exists "global cards: admins can write" on public.global_cards;
create policy "global cards: admins can write"
  on public.global_cards for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
