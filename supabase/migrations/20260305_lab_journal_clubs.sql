-- Journal clubs: scheduled paper discussion sessions
create table journal_clubs (
  id uuid default gen_random_uuid() primary key,
  lab_id uuid not null references labs(id) on delete cascade,
  work_id text not null references works(id),
  title text check (char_length(title) <= 200),
  scheduled_at timestamptz not null,
  presenter_id uuid references auth.users(id),
  notes text check (char_length(notes) <= 5000),
  created_by uuid not null references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table journal_club_files (
  id uuid default gen_random_uuid() primary key,
  journal_club_id uuid not null references journal_clubs(id) on delete cascade,
  file_name text not null check (char_length(file_name) <= 255),
  storage_path text not null check (storage_path ~ '^[a-zA-Z0-9/_.-]+$'),
  file_size bigint check (file_size > 0),
  mime_type text check (char_length(mime_type) <= 100),
  uploaded_by uuid not null references auth.users(id),
  uploaded_at timestamptz default now()
);

create index idx_journal_clubs_lab_scheduled on journal_clubs(lab_id, scheduled_at);
create index idx_journal_club_files_jc_id on journal_club_files(journal_club_id);

alter table journal_clubs enable row level security;
alter table journal_club_files enable row level security;

create policy "Lab members read journal clubs" on journal_clubs for select
  using (lab_id in (select auth_user_lab_ids()));

create policy "Lab members create journal clubs" on journal_clubs for insert
  with check (
    lab_id in (select auth_user_lab_ids())
    and created_by = auth.uid()
  );

create policy "Creator or admin updates journal clubs" on journal_clubs for update
  using (created_by = auth.uid() or lab_id in (select auth_user_admin_lab_ids()))
  with check (
    lab_id in (select auth_user_lab_ids())
    and created_by = (select created_by from journal_clubs where id = journal_clubs.id)
  );

create policy "Creator or admin deletes journal clubs" on journal_clubs for delete
  using (created_by = auth.uid() or lab_id in (select auth_user_admin_lab_ids()));

create policy "Lab members read journal club files" on journal_club_files for select
  using (journal_club_id in (
    select id from journal_clubs where lab_id in (select auth_user_lab_ids())
  ));

create policy "Lab members upload files" on journal_club_files for insert
  with check (
    uploaded_by = auth.uid()
    and journal_club_id in (
      select id from journal_clubs where lab_id in (select auth_user_lab_ids())
    )
  );

create policy "Uploader or admin deletes files" on journal_club_files for delete
  using (
    uploaded_by = auth.uid()
    or journal_club_id in (
      select id from journal_clubs where lab_id in (select auth_user_admin_lab_ids())
    )
  );
