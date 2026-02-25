create table collections (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table collection_works (
  collection_id uuid not null references collections(id) on delete cascade,
  work_id text not null references works(id) on delete cascade,
  added_at timestamptz default now(),
  primary key (collection_id, work_id)
);

create index idx_collections_user on collections(user_id);
create index idx_collection_works_work on collection_works(work_id);

create trigger trg_collections_updated_at before update on collections
  for each row execute function update_updated_at();

alter table collections enable row level security;
alter table collection_works enable row level security;

-- Collections: owner-scoped
create policy "Users manage own collections" on collections for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Collection works: scoped via parent collection ownership
create policy "Users manage own collection works" on collection_works for all
  using (collection_id in (select id from collections where user_id = auth.uid()))
  with check (collection_id in (select id from collections where user_id = auth.uid()));
