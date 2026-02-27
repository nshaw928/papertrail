-- ============================================================
-- Tighten RLS policies from security review
-- ============================================================

-- Remove redundant index (the UNIQUE constraint already creates one)
drop index if exists idx_invite_links_code;

-- Restrict invite_links SELECT to admin only.
-- Validation is done server-side via admin client, no need for public read.
drop policy if exists "Public validate invite by code" on invite_links;

-- Tighten feedback INSERT: require user_id = auth.uid() when authenticated,
-- but anon inserts go through admin client anyway so restrict to service_role.
drop policy if exists "Anyone can submit feedback" on feedback;
create policy "Service role inserts feedback" on feedback for insert
  with check (auth.role() = 'service_role');

-- Reload PostgREST schema cache
notify pgrst, 'reload schema';
