-- Paper annotations / margin notes
create table paper_notes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  work_id text not null references works(id) on delete cascade,
  content text not null check (char_length(content) <= 10000),
  anchor_page integer check (anchor_page >= 1),
  anchor_y float check (anchor_y >= 0 and anchor_y <= 1),
  anchor_quote text check (char_length(anchor_quote) <= 1000),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_paper_notes_user_work on paper_notes(user_id, work_id);

-- Reuse existing trigger function from migration 001
create trigger trg_paper_notes_updated_at before update on paper_notes
  for each row execute function update_updated_at();

alter table paper_notes enable row level security;

create policy "Users can view own notes"
  on paper_notes for select using (auth.uid() = user_id);
create policy "Users can insert own notes"
  on paper_notes for insert with check (auth.uid() = user_id);
create policy "Users can update own notes"
  on paper_notes for update using (auth.uid() = user_id);
create policy "Users can delete own notes"
  on paper_notes for delete using (auth.uid() = user_id);
