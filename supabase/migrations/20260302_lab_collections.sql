-- Lab collections: shared paper collections within a lab
create table lab_collections (
  id uuid default gen_random_uuid() primary key,
  lab_id uuid not null references labs(id) on delete cascade,
  name text not null check (char_length(name) <= 200),
  created_by uuid not null references auth.users(id),
  description text check (char_length(description) <= 1000),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table lab_collection_works (
  lab_collection_id uuid not null references lab_collections(id) on delete cascade,
  work_id text not null references works(id) on delete cascade,
  added_by uuid not null references auth.users(id),
  added_at timestamptz default now(),
  primary key (lab_collection_id, work_id)
);

-- Allow-list: who can add papers to a specific collection
-- Empty = only creator + admins can add
create table lab_collection_contributors (
  lab_collection_id uuid not null references lab_collections(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (lab_collection_id, user_id)
);

-- Indexes
create index idx_lab_collections_lab_id on lab_collections(lab_id);
create index idx_lab_collections_created_by on lab_collections(created_by);
create index idx_lab_collection_works_work_id on lab_collection_works(work_id);

-- RLS: lab_collections
alter table lab_collections enable row level security;

create policy "Lab members read collections" on lab_collections for select
  using (lab_id in (select auth_user_lab_ids()));

create policy "Lab members create collections" on lab_collections for insert
  with check (
    lab_id in (select auth_user_lab_ids())
    and created_by = auth.uid()
  );

create policy "Creator or admin updates collections" on lab_collections for update
  using (created_by = auth.uid() or lab_id in (select auth_user_admin_lab_ids()))
  with check (
    lab_id in (select auth_user_lab_ids())
    and created_by = (select created_by from lab_collections where id = lab_collections.id)
  );

create policy "Creator or admin deletes collections" on lab_collections for delete
  using (
    lab_id in (select auth_user_lab_ids())
    and (created_by = auth.uid() or lab_id in (select auth_user_admin_lab_ids()))
  );

-- RLS: lab_collection_works
alter table lab_collection_works enable row level security;

create policy "Lab members read collection works" on lab_collection_works for select
  using (lab_collection_id in (
    select id from lab_collections where lab_id in (select auth_user_lab_ids())
  ));

create policy "Authorized users add collection works" on lab_collection_works for insert
  with check (
    added_by = auth.uid()
    and lab_collection_id in (
      select id from lab_collections where lab_id in (select auth_user_lab_ids())
    )
  );

create policy "Adder or admin removes collection works" on lab_collection_works for delete
  using (
    added_by = auth.uid()
    or lab_collection_id in (
      select id from lab_collections where lab_id in (select auth_user_admin_lab_ids())
    )
  );

-- RLS: lab_collection_contributors
alter table lab_collection_contributors enable row level security;

create policy "Lab members read contributors" on lab_collection_contributors for select
  using (lab_collection_id in (
    select id from lab_collections where lab_id in (select auth_user_lab_ids())
  ));

create policy "Creator or admin manages contributors" on lab_collection_contributors for all
  using (lab_collection_id in (
    select id from lab_collections
    where (created_by = auth.uid() or lab_id in (select auth_user_admin_lab_ids()))
  ))
  with check (lab_collection_id in (
    select id from lab_collections
    where (created_by = auth.uid() or lab_id in (select auth_user_admin_lab_ids()))
  ));
