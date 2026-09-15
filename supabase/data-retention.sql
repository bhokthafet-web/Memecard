-- Memecard data retention: auto-delete accounts inactive for 30+ days.
--
-- WARNING: this is a real, irreversible account + data deletion policy once
-- scheduled (see the bottom of this file). Read it fully before enabling.
-- Safe to re-run any time — every statement below is idempotent — but the
-- cron schedule itself is a separate, deliberate step you take manually.

-- ---------------------------------------------------------------------------
-- Step 1: let a stale account be deleted even if it created shared content
-- as an admin. auth.users already cascades into profiles/user_custom_cards/
-- user_card_overrides/user_category_overrides (declared ON DELETE CASCADE in
-- schema.sql), but global_card_overrides.updated_by, global_category_
-- overrides.updated_by, global_categories.created_by and
-- global_cards.created_by have no ON DELETE action, which means Postgres
-- would refuse to delete a user who ever touched shared content. Switch
-- those to SET NULL so the delete succeeds and just drops the attribution.
-- ---------------------------------------------------------------------------
alter table public.global_card_overrides drop constraint if exists global_card_overrides_updated_by_fkey;
alter table public.global_card_overrides
  add constraint global_card_overrides_updated_by_fkey
  foreign key (updated_by) references auth.users (id) on delete set null;

alter table public.global_category_overrides drop constraint if exists global_category_overrides_updated_by_fkey;
alter table public.global_category_overrides
  add constraint global_category_overrides_updated_by_fkey
  foreign key (updated_by) references auth.users (id) on delete set null;

alter table public.global_categories drop constraint if exists global_categories_created_by_fkey;
alter table public.global_categories
  add constraint global_categories_created_by_fkey
  foreign key (created_by) references auth.users (id) on delete set null;

alter table public.global_cards drop constraint if exists global_cards_created_by_fkey;
alter table public.global_cards
  add constraint global_cards_created_by_fkey
  foreign key (created_by) references auth.users (id) on delete set null;

-- ---------------------------------------------------------------------------
-- Step 2: the deletion function itself. Deletes any account whose most
-- recent sign-in (or sign-up, if they never came back) is older than
-- `inactive_days`. Admins are excluded on purpose — losing the account that
-- manages the shared curriculum to inactivity would be a bad surprise.
-- Delete the "and coalesce(p.role, 'user') <> 'admin'" line below if you
-- want admins included too.
-- ---------------------------------------------------------------------------
create or replace function public.delete_inactive_accounts(inactive_days int default 30)
returns int
language plpgsql
security definer set search_path = public
as $$
declare
  deleted_count int;
begin
  with stale as (
    select u.id
    from auth.users u
    left join public.profiles p on p.id = u.id
    where coalesce(u.last_sign_in_at, u.created_at) < now() - (inactive_days || ' days')::interval
      and coalesce(p.role, 'user') <> 'admin'
  )
  delete from auth.users where id in (select id from stale);

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- Step 3 (manual, do this yourself — not run by this file):
--
-- (a) PREVIEW who would be deleted, before touching anything:
--
--   select u.id, u.email, u.last_sign_in_at, u.created_at
--   from auth.users u
--   left join public.profiles p on p.id = u.id
--   where coalesce(u.last_sign_in_at, u.created_at) < now() - interval '30 days'
--     and coalesce(p.role, 'user') <> 'admin';
--
-- (b) Enable the pg_cron extension once per project: Supabase Dashboard →
--     Database → Extensions → search "pg_cron" → Enable.
--
-- (c) Schedule the daily sweep (03:00 UTC):
--
--   select cron.schedule(
--     'delete-inactive-accounts',
--     '0 3 * * *',
--     $$select public.delete_inactive_accounts(30)$$
--   );
--
-- (d) To stop it later:
--
--   select cron.unschedule('delete-inactive-accounts');
--
-- (e) To run it once by hand instead of waiting for the schedule:
--
--   select public.delete_inactive_accounts(30);
-- ---------------------------------------------------------------------------
