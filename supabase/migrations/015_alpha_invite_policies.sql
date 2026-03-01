-- ============================================================
-- Alpha users can read and create invite links (up to 2)
-- ============================================================

-- Alpha users can read their own invites
create policy "Alpha users read own invites" on invite_links for select
  using (
    auth.uid() = created_by
    and get_user_plan(auth.uid()) = 'alpha'
  );

-- Alpha users can create invites (max 2 total)
create policy "Alpha users create invites" on invite_links for insert
  with check (
    auth.uid() = created_by
    and get_user_plan(auth.uid()) = 'alpha'
    and (select count(*) from invite_links where created_by = auth.uid()) < 2
  );
