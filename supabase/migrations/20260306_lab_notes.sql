-- Lab paper notes: shared, attributed notes on papers
create table lab_paper_notes (
  id uuid default gen_random_uuid() primary key,
  lab_id uuid not null references labs(id) on delete cascade,
  work_id text not null references works(id),
  user_id uuid not null references auth.users(id),
  content text not null check (char_length(content) between 1 and 5000),
  anchor_quote text check (char_length(anchor_quote) <= 500),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_lab_paper_notes_lab_work on lab_paper_notes(lab_id, work_id);

alter table lab_paper_notes enable row level security;

create policy "Lab members read notes" on lab_paper_notes for select
  using (lab_id in (select auth_user_lab_ids()));

create policy "Lab members create notes" on lab_paper_notes for insert
  with check (lab_id in (select auth_user_lab_ids()) and user_id = auth.uid());

create policy "Authors update own notes" on lab_paper_notes for update
  using (user_id = auth.uid() and lab_id in (select auth_user_lab_ids()))
  with check (user_id = auth.uid() and lab_id in (select auth_user_lab_ids()));

create policy "Author or admin deletes notes" on lab_paper_notes for delete
  using (
    lab_id in (select auth_user_lab_ids())
    and (user_id = auth.uid() or lab_id in (select auth_user_admin_lab_ids()))
  );
