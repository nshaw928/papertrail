create table ai_jobs (
  id uuid default gen_random_uuid() primary key,
  work_id text not null references works(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  priority int not null default 0,        -- 0 = background batch, 10 = paid user request
  status text not null default 'pending', -- pending | processing | completed | failed
  source_url text,                        -- OA URL if available
  error text,
  created_at timestamptz default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create index idx_ai_jobs_pending on ai_jobs(status, priority desc, created_at)
  where status = 'pending';
create index idx_ai_jobs_work on ai_jobs(work_id);

alter table ai_jobs enable row level security;

create policy "Users see own jobs" on ai_jobs for select
  using (auth.uid() = user_id);
create policy "Users create own jobs" on ai_jobs for insert
  with check (auth.uid() = user_id);
