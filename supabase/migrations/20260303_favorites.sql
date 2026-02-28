-- Collection favorites: pin personal or lab collections to the sidebar
create table collection_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  collection_type text not null check (collection_type in ('personal', 'lab')),
  collection_id uuid not null,
  created_at timestamptz default now(),
  primary key (user_id, collection_type, collection_id)
);

alter table collection_favorites enable row level security;

create policy "Users manage own favorites" on collection_favorites for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create index idx_collection_favorites_user on collection_favorites(user_id);

-- Cleanup trigger: remove lab favorites when a user leaves a lab
create or replace function cleanup_lab_favorites() returns trigger as $$
begin
  delete from public.collection_favorites
  where user_id = OLD.user_id
    and collection_type = 'lab'
    and collection_id in (
      select id from public.lab_collections where lab_id = OLD.lab_id
    );
  return OLD;
end;
$$ language plpgsql security definer set search_path = '';

create trigger trg_cleanup_lab_favorites
  after delete on lab_members
  for each row execute function cleanup_lab_favorites();

-- Single-query sidebar function
create or replace function get_sidebar_favorites()
returns table(collection_type text, collection_id uuid, name text)
language sql stable security definer set search_path = ''
as $$
  select cf.collection_type, cf.collection_id,
    coalesce(c.name, lc.name) as name
  from public.collection_favorites cf
  left join public.collections c
    on cf.collection_type = 'personal' and cf.collection_id = c.id
  left join public.lab_collections lc
    on cf.collection_type = 'lab' and cf.collection_id = lc.id
  where cf.user_id = auth.uid()
  order by cf.created_at;
$$;
