-- ============================================================
-- Feedback Board, Waitlist & Invite System
-- ============================================================

-- ============================================================
-- Helper: is_admin()
-- ============================================================

create or replace function is_admin(check_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  -- Hardcoded admin UUID for alpha. Matches ADMIN_USER_ID env var.
  select check_user_id = '3b9f2967-81ef-457b-9c27-29e5c5addcde'::uuid;
$$;

-- ============================================================
-- Feature Status Enum
-- ============================================================

create type feature_status as enum ('planned', 'in_progress', 'shipped', 'considering');
create type feedback_category as enum ('general', 'bug', 'feature_request', 'other');

-- ============================================================
-- Features
-- ============================================================

create table features (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  status feature_status not null default 'planned',
  priority integer not null default 0,
  upvote_count integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create trigger trg_features_updated_at before update on features
  for each row execute function update_updated_at();

alter table features enable row level security;

create policy "Anyone can read features" on features for select
  using (true);

create policy "Admins manage features" on features for all
  using (is_admin(auth.uid()))
  with check (is_admin(auth.uid()));

-- ============================================================
-- Feature Upvotes
-- ============================================================

create table feature_upvotes (
  feature_id uuid not null references features(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (feature_id, user_id)
);

alter table feature_upvotes enable row level security;

create policy "Anyone can read upvotes" on feature_upvotes for select
  using (true);

create policy "Paid users can upvote" on feature_upvotes for insert
  with check (
    auth.uid() = user_id
    and public.get_user_plan(auth.uid()) in ('researcher', 'lab')
  );

create policy "Users delete own upvotes" on feature_upvotes for delete
  using (auth.uid() = user_id);

-- Trigger to keep denormalized upvote_count in sync
create or replace function update_feature_upvote_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (TG_OP = 'INSERT') then
    update public.features set upvote_count = upvote_count + 1 where id = NEW.feature_id;
    return NEW;
  elsif (TG_OP = 'DELETE') then
    update public.features set upvote_count = upvote_count - 1 where id = OLD.feature_id;
    return OLD;
  end if;
  return null;
end;
$$;

create trigger trg_feature_upvotes_count
  after insert or delete on feature_upvotes
  for each row execute function update_feature_upvote_count();

-- ============================================================
-- Feature Comments
-- ============================================================

create table feature_comments (
  id uuid default gen_random_uuid() primary key,
  feature_id uuid not null references features(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  user_email text not null,
  content text not null check (length(content) <= 2000),
  created_at timestamptz default now()
);

create index idx_feature_comments_feature on feature_comments(feature_id);

alter table feature_comments enable row level security;

create policy "Anyone can read comments" on feature_comments for select
  using (true);

create policy "Authenticated users add comments" on feature_comments for insert
  with check (auth.uid() = user_id);

create policy "Users delete own comments" on feature_comments for delete
  using (auth.uid() = user_id);

-- ============================================================
-- Feedback
-- ============================================================

create table feedback (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete set null,
  email text,
  category feedback_category not null default 'general',
  content text not null check (length(content) <= 5000),
  created_at timestamptz default now()
);

alter table feedback enable row level security;

create policy "Anyone can submit feedback" on feedback for insert
  with check (true);

create policy "Users read own feedback" on feedback for select
  using (auth.uid() = user_id);

create policy "Admins read all feedback" on feedback for select
  using (is_admin(auth.uid()));

-- ============================================================
-- Waitlist
-- ============================================================

create table waitlist (
  id uuid default gen_random_uuid() primary key,
  email text not null unique,
  source text,
  created_at timestamptz default now()
);

alter table waitlist enable row level security;

create policy "Anyone can join waitlist" on waitlist for insert
  with check (true);

create policy "Admins read waitlist" on waitlist for select
  using (is_admin(auth.uid()));

-- ============================================================
-- Invite Links
-- ============================================================

create table invite_links (
  id uuid default gen_random_uuid() primary key,
  code text not null unique default gen_random_uuid()::text,
  email text,
  created_by uuid not null references auth.users(id) on delete cascade,
  used_by uuid references auth.users(id) on delete set null,
  used_at timestamptz,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz default now()
);

create unique index idx_invite_links_code on invite_links(code);

alter table invite_links enable row level security;

create policy "Admins manage invite links" on invite_links for all
  using (is_admin(auth.uid()))
  with check (is_admin(auth.uid()));

create policy "Public validate invite by code" on invite_links for select
  using (true);

-- ============================================================
-- Reload PostgREST schema cache
-- ============================================================

notify pgrst, 'reload schema';
