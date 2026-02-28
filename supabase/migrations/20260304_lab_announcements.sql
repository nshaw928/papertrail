-- Lab announcements: short feed items within a lab
create table lab_announcements (
  id uuid default gen_random_uuid() primary key,
  lab_id uuid not null references labs(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  work_id text references works(id),
  content text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz default now()
);

create index idx_lab_announcements_lab_created on lab_announcements(lab_id, created_at desc);

alter table lab_announcements enable row level security;

create policy "Lab members read announcements" on lab_announcements for select
  using (lab_id in (select auth_user_lab_ids()));

create policy "Lab members post announcements" on lab_announcements for insert
  with check (
    lab_id in (select auth_user_lab_ids())
    and user_id = auth.uid()
  );

create policy "Author or admin deletes announcements" on lab_announcements for delete
  using (user_id = auth.uid() or lab_id in (select auth_user_admin_lab_ids()));
