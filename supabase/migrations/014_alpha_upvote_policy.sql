-- ============================================================
-- Update upvote policy to allow alpha users to vote
-- (Separate migration because new enum values can't be used
--  in the same transaction they're added)
-- ============================================================

drop policy if exists "Paid users can upvote" on feature_upvotes;
create policy "Paid users can upvote" on feature_upvotes for insert
  with check (
    auth.uid() = user_id
    and public.get_user_plan(auth.uid()) in ('alpha', 'researcher', 'lab')
  );

notify pgrst, 'reload schema';
