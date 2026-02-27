create table search_cache (
  id uuid default gen_random_uuid() primary key,
  query_hash text not null unique,
  query text not null,
  from_year integer,
  to_year integer,
  sort text,
  result_count integer not null default 0,
  work_ids text[] not null default '{}',
  refreshed_at timestamptz not null default now()
);
-- No RLS — accessed only via admin/service-role client

alter table saved_searches
  add column cache_id uuid references search_cache(id) on delete set null;

create policy "Users can update own saved searches"
  on saved_searches for update using (auth.uid() = user_id);
