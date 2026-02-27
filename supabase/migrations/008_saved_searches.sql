create table saved_searches (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  query text not null check (char_length(query) <= 500),
  from_year integer,
  to_year integer,
  sort text,
  result_count integer not null default 0,
  work_ids text[] not null default '{}',
  created_at timestamptz default now()
);

create index idx_saved_searches_user_recent
  on saved_searches(user_id, created_at desc);

alter table saved_searches enable row level security;

create policy "Users can view own saved searches"
  on saved_searches for select using (auth.uid() = user_id);
create policy "Users can insert own saved searches"
  on saved_searches for insert with check (auth.uid() = user_id);
create policy "Users can delete own saved searches"
  on saved_searches for delete using (auth.uid() = user_id);
