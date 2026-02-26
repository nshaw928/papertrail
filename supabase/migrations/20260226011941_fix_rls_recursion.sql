-- ============================================================
-- Fix RLS infinite recursion on collections
--
-- The lab_members SELECT policy references lab_members itself,
-- causing 42P17 whenever any policy chains through lab_members.
-- Migration 004 added a collections policy that chains through
-- lab_collections → lab_members, triggering the recursion on
-- every collection query.
--
-- Fix:
--   1. Revert collections policy to owner-only (migration 003)
--   2. Drop unused visibility column and lab_collections table
--   3. Replace self-referential lab_members policies with a
--      SECURITY DEFINER helper function
-- ============================================================

-- ============================================================
-- 1. Fix collections: revert to owner-only policy
-- ============================================================

drop policy if exists "Users manage own collections" on collections;

create policy "Users manage own collections" on collections for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- 2. Drop unused visibility column
-- ============================================================

alter table collections drop column if exists visibility;

-- ============================================================
-- 3. Drop unused lab_collections table
-- ============================================================

drop table if exists lab_collections;

-- ============================================================
-- 4. Fix lab_members self-referential policies
--
-- A SECURITY DEFINER function bypasses RLS, breaking the
-- recursion cycle. It returns the set of lab_ids the current
-- user belongs to.
-- ============================================================

create or replace function auth_user_lab_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select lm.lab_id
  from public.lab_members lm
  where lm.user_id = auth.uid();
$$;

-- Also need: lab_ids where current user is owner or admin
create or replace function auth_user_admin_lab_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select lm.lab_id
  from public.lab_members lm
  where lm.user_id = auth.uid()
    and lm.role in ('owner', 'admin');
$$;

-- -- lab_members policies --

drop policy if exists "Lab members read members" on lab_members;
create policy "Lab members read members" on lab_members for select
  using (lab_id in (select auth_user_lab_ids()));

drop policy if exists "Lab admins invite members" on lab_members;
create policy "Lab admins invite members" on lab_members for insert
  with check (lab_id in (select auth_user_admin_lab_ids()));

drop policy if exists "Lab admins update members" on lab_members;
create policy "Lab admins update members" on lab_members for update
  using (lab_id in (select auth_user_admin_lab_ids()));

drop policy if exists "Lab admins remove members" on lab_members;
create policy "Lab admins remove members" on lab_members for delete
  using (
    lab_id in (select auth_user_admin_lab_ids())
    or user_id = auth.uid() -- members can leave
  );

-- -- labs read policy --

drop policy if exists "Lab members read lab" on labs;
create policy "Lab members read lab" on labs for select
  using (id in (select auth_user_lab_ids()));

-- -- lab_invitations policies --

drop policy if exists "Lab admins manage invitations" on lab_invitations;
create policy "Lab admins manage invitations" on lab_invitations for all
  using (lab_id in (select auth_user_admin_lab_ids()))
  with check (lab_id in (select auth_user_admin_lab_ids()));

-- "Users read own invitations" doesn't touch lab_members, leave it alone.

-- ============================================================
-- 5. Drop the collection_visibility enum (no longer used)
-- ============================================================

drop type if exists collection_visibility;

-- ============================================================
-- 6. Reload PostgREST schema cache
-- ============================================================

notify pgrst, 'reload schema';
