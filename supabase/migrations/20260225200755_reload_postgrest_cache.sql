-- Reload PostgREST schema cache after migration 004 added new tables/columns
NOTIFY pgrst, 'reload schema';
