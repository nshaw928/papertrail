-- ============================================================
-- Subscriptions, Labs, and Usage Tracking
-- ============================================================

-- Plan enum for type safety
create type plan_type as enum ('free', 'researcher', 'lab');
create type subscription_status as enum ('active', 'canceled', 'past_due', 'trialing', 'incomplete');
create type lab_role as enum ('owner', 'admin', 'member');
create type collection_visibility as enum ('private', 'lab', 'public');

-- ============================================================
-- Subscriptions
-- ============================================================

create table subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  lab_id uuid, -- nullable: set for lab subscriptions, null for individual
  stripe_customer_id text,
  stripe_subscription_id text unique,
  plan plan_type not null default 'free',
  status subscription_status not null default 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index idx_subscriptions_user on subscriptions(user_id);
create index idx_subscriptions_stripe_customer on subscriptions(stripe_customer_id);
create index idx_subscriptions_stripe_sub on subscriptions(stripe_subscription_id);

create trigger trg_subscriptions_updated_at before update on subscriptions
  for each row execute function update_updated_at();

alter table subscriptions enable row level security;

-- Users can read their own subscription
create policy "Users read own subscription" on subscriptions for select
  using (auth.uid() = user_id);

-- Only service role can insert/update (via webhooks)
create policy "Service role manages subscriptions" on subscriptions for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ============================================================
-- Labs
-- ============================================================

create table labs (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_labs_owner on labs(owner_id);

create trigger trg_labs_updated_at before update on labs
  for each row execute function update_updated_at();

alter table labs enable row level security;

-- Lab members can read their lab
create policy "Lab members read lab" on labs for select
  using (
    id in (select lab_id from lab_members where user_id = auth.uid())
  );

-- Lab owners can update their lab
create policy "Lab owners update lab" on labs for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Any authenticated user can create a lab
create policy "Authenticated users create labs" on labs for insert
  with check (auth.uid() = owner_id);

-- ============================================================
-- Lab Members
-- ============================================================

create table lab_members (
  lab_id uuid not null references labs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role lab_role not null default 'member',
  invited_by uuid references auth.users(id),
  invited_email text, -- for pending invitations (user may not exist yet)
  invited_at timestamptz default now(),
  joined_at timestamptz,
  primary key (lab_id, user_id)
);

create index idx_lab_members_user on lab_members(user_id);
create index idx_lab_members_email on lab_members(invited_email);

alter table lab_members enable row level security;

-- Lab members can see other members in their lab
create policy "Lab members read members" on lab_members for select
  using (
    lab_id in (select lab_id from lab_members lm where lm.user_id = auth.uid())
  );

-- Lab owners/admins can insert members (invitations)
create policy "Lab admins invite members" on lab_members for insert
  with check (
    lab_id in (
      select lab_id from lab_members lm
      where lm.user_id = auth.uid() and lm.role in ('owner', 'admin')
    )
  );

-- Lab owners/admins can update member roles
create policy "Lab admins update members" on lab_members for update
  using (
    lab_id in (
      select lab_id from lab_members lm
      where lm.user_id = auth.uid() and lm.role in ('owner', 'admin')
    )
  );

-- Lab owners/admins can remove members
create policy "Lab admins remove members" on lab_members for delete
  using (
    lab_id in (
      select lab_id from lab_members lm
      where lm.user_id = auth.uid() and lm.role in ('owner', 'admin')
    )
    or user_id = auth.uid() -- members can leave
  );

-- ============================================================
-- Lab Collections (shared/pinned)
-- ============================================================

create table lab_collections (
  lab_id uuid not null references labs(id) on delete cascade,
  collection_id uuid not null references collections(id) on delete cascade,
  pinned boolean default false,
  pinned_by uuid references auth.users(id),
  pinned_at timestamptz,
  shared_at timestamptz default now(),
  primary key (lab_id, collection_id)
);

create index idx_lab_collections_lab on lab_collections(lab_id);

alter table lab_collections enable row level security;

-- Lab members can read shared collections
create policy "Lab members read shared collections" on lab_collections for select
  using (
    lab_id in (select lab_id from lab_members where user_id = auth.uid())
  );

-- Lab members can share their own collections
create policy "Lab members share collections" on lab_collections for insert
  with check (
    lab_id in (select lab_id from lab_members where user_id = auth.uid())
    and collection_id in (select id from collections where user_id = auth.uid())
  );

-- Lab owners/admins can pin/unpin and manage shared collections
create policy "Lab admins manage shared collections" on lab_collections for update
  using (
    lab_id in (
      select lab_id from lab_members lm
      where lm.user_id = auth.uid() and lm.role in ('owner', 'admin')
    )
  );

-- Collection owner or lab admin can remove
create policy "Remove shared collections" on lab_collections for delete
  using (
    lab_id in (
      select lab_id from lab_members lm
      where lm.user_id = auth.uid() and lm.role in ('owner', 'admin')
    )
    or collection_id in (select id from collections where user_id = auth.uid())
  );

-- ============================================================
-- Add visibility to collections
-- ============================================================

alter table collections add column visibility collection_visibility not null default 'private';

-- Update RLS on collections to allow lab members to read lab-visible collections
drop policy "Users manage own collections" on collections;

create policy "Users manage own collections" on collections for all
  using (
    auth.uid() = user_id
    or (
      visibility = 'lab'
      and id in (
        select collection_id from lab_collections lc
        where lc.lab_id in (select lab_id from lab_members where user_id = auth.uid())
      )
    )
  )
  with check (auth.uid() = user_id);

-- ============================================================
-- Usage Tracking (daily aggregates for rate limiting)
-- ============================================================

create table usage_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  search_count int not null default 0,
  ai_summary_requests int not null default 0,
  papers_saved int not null default 0,
  primary key (user_id, date)
);

alter table usage_daily enable row level security;

-- Users can read their own usage
create policy "Users read own usage" on usage_daily for select
  using (auth.uid() = user_id);

-- Service role manages usage (incremented by API routes)
create policy "Service role manages usage" on usage_daily for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ============================================================
-- Helper function: get user plan
-- ============================================================

create or replace function get_user_plan(target_user_id uuid)
returns plan_type
language sql
stable
security definer
as $$
  select coalesce(
    (select plan from subscriptions
     where user_id = target_user_id
       and status in ('active', 'trialing')
     limit 1),
    'free'::plan_type
  );
$$;

-- ============================================================
-- Helper function: increment daily usage
-- ============================================================

create or replace function increment_usage(
  target_user_id uuid,
  field text,
  amount int default 1
)
returns void
language plpgsql
security definer
as $$
begin
  if field not in ('search_count', 'ai_summary_requests', 'papers_saved') then
    raise exception 'Invalid usage field: %', field;
  end if;

  insert into usage_daily (user_id, date, search_count, ai_summary_requests, papers_saved)
  values (
    target_user_id,
    current_date,
    case when field = 'search_count' then amount else 0 end,
    case when field = 'ai_summary_requests' then amount else 0 end,
    case when field = 'papers_saved' then amount else 0 end
  )
  on conflict (user_id, date)
  do update set
    search_count = usage_daily.search_count + case when field = 'search_count' then amount else 0 end,
    ai_summary_requests = usage_daily.ai_summary_requests + case when field = 'ai_summary_requests' then amount else 0 end,
    papers_saved = usage_daily.papers_saved + case when field = 'papers_saved' then amount else 0 end;
end;
$$;

-- ============================================================
-- Pending invitations table (for email invites before user signs up)
-- ============================================================

create table lab_invitations (
  id uuid default gen_random_uuid() primary key,
  lab_id uuid not null references labs(id) on delete cascade,
  email text not null,
  role lab_role not null default 'member',
  invited_by uuid not null references auth.users(id),
  created_at timestamptz default now(),
  expires_at timestamptz default now() + interval '7 days',
  unique(lab_id, email)
);

create index idx_lab_invitations_email on lab_invitations(email);

alter table lab_invitations enable row level security;

-- Lab admins can manage invitations
create policy "Lab admins manage invitations" on lab_invitations for all
  using (
    lab_id in (
      select lab_id from lab_members lm
      where lm.user_id = auth.uid() and lm.role in ('owner', 'admin')
    )
  )
  with check (
    lab_id in (
      select lab_id from lab_members lm
      where lm.user_id = auth.uid() and lm.role in ('owner', 'admin')
    )
  );

-- Anyone can read invitations for their email (to accept them)
create policy "Users read own invitations" on lab_invitations for select
  using (
    email = (select email from auth.users where id = auth.uid())
  );

-- Add subscription reference to labs
alter table subscriptions add constraint subscriptions_lab_id_fkey
  foreign key (lab_id) references labs(id) on delete set null;
