-- Papertrail: Full schema migration
-- Run this in the Supabase SQL editor

-- Enable required extensions
create extension if not exists pg_trgm;

-- ============================================================
-- Entity Tables
-- ============================================================

create table institutions (
  id text primary key,
  name text not null,
  type text,
  country_code text,
  ror_id text,
  homepage_url text,
  image_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table sources (
  id text primary key,
  name text not null,
  type text,
  issn text[],
  is_oa boolean default false,
  homepage_url text,
  host_organization_name text,
  apc_usd integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table funders (
  id text primary key,
  name text not null,
  country_code text,
  homepage_url text,
  grants_count integer default 0,
  works_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table authors (
  id text primary key,
  display_name text not null,
  orcid text,
  cited_by_count integer default 0,
  h_index integer default 0,
  i10_index integer default 0,
  two_yr_mean_citedness real default 0,
  counts_by_year jsonb,
  display_name_alternatives text[],
  scopus_id text,
  twitter text,
  wikipedia text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table topics (
  id text primary key,
  name text not null,
  level integer not null check (level between 0 and 3),
  parent_topic_id text references topics(id),
  description text,
  keywords jsonb,
  works_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table works (
  id text primary key,
  title text not null,
  abstract text,
  year integer,
  doi text,
  cited_by_count integer default 0,
  publication_date date,
  type text,
  language text,
  is_retracted boolean default false,
  is_open_access boolean default false,
  open_access_url text,
  fwci real,
  counts_by_year jsonb,
  biblio jsonb,
  keywords jsonb,
  sustainable_development_goals jsonb,
  related_work_ids text[],
  mesh jsonb,
  indexed_in text[],
  is_stub boolean default false,
  source_id text references sources(id),
  source_display_name text,
  summary text,
  ai_tags jsonb,
  citations_fetched boolean default false,
  summary_generated boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  fts tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(abstract, '')), 'B')
  ) stored
);

-- ============================================================
-- Junction Tables
-- ============================================================

create table work_authors (
  work_id text not null references works(id) on delete cascade,
  author_id text not null references authors(id) on delete cascade,
  position integer default 0,
  is_corresponding boolean default false,
  primary key (work_id, author_id)
);

create table work_topics (
  work_id text not null references works(id) on delete cascade,
  topic_id text not null references topics(id) on delete cascade,
  score real default 0,
  is_primary boolean default false,
  primary key (work_id, topic_id)
);

create table work_citations (
  citing_work_id text not null references works(id) on delete cascade,
  cited_work_id text not null references works(id) on delete cascade,
  primary key (citing_work_id, cited_work_id)
);

create table work_funders (
  work_id text not null references works(id) on delete cascade,
  funder_id text not null references funders(id) on delete cascade,
  award_id text,
  primary key (work_id, funder_id)
);

create table author_institutions (
  author_id text not null references authors(id) on delete cascade,
  institution_id text not null references institutions(id) on delete cascade,
  years jsonb,
  primary key (author_id, institution_id)
);

-- ============================================================
-- User Tables
-- ============================================================

create table saved_works (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  work_id text not null references works(id) on delete cascade,
  notes text,
  saved_at timestamptz default now(),
  unique (user_id, work_id)
);

-- ============================================================
-- Indexes
-- ============================================================

-- Works indexes
create index idx_works_year on works(year);
create index idx_works_doi on works(doi) where doi is not null;
create index idx_works_source_id on works(source_id) where source_id is not null;
create index idx_works_cited_by_count on works(cited_by_count desc);
create index idx_works_fts on works using gin(fts);
create index idx_works_is_stub on works(is_stub) where is_stub = true;
create index idx_works_citations_fetched on works(citations_fetched) where citations_fetched = false;

-- Name/title trigram indexes for search
create index idx_works_title_trgm on works using gin(title gin_trgm_ops);
create index idx_authors_name_trgm on authors using gin(display_name gin_trgm_ops);
create index idx_topics_name_trgm on topics using gin(name gin_trgm_ops);

-- Junction table indexes
create index idx_work_authors_author on work_authors(author_id);
create index idx_work_topics_topic on work_topics(topic_id);
create index idx_work_citations_cited on work_citations(cited_work_id);
create index idx_work_citations_citing on work_citations(citing_work_id);
create index idx_saved_works_user on saved_works(user_id);
create index idx_saved_works_work on saved_works(work_id);

-- Topics hierarchy
create index idx_topics_parent on topics(parent_topic_id) where parent_topic_id is not null;
create index idx_topics_level on topics(level);

-- ============================================================
-- Updated_at Triggers
-- ============================================================

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_institutions_updated_at before update on institutions
  for each row execute function update_updated_at();
create trigger trg_sources_updated_at before update on sources
  for each row execute function update_updated_at();
create trigger trg_funders_updated_at before update on funders
  for each row execute function update_updated_at();
create trigger trg_authors_updated_at before update on authors
  for each row execute function update_updated_at();
create trigger trg_topics_updated_at before update on topics
  for each row execute function update_updated_at();
create trigger trg_works_updated_at before update on works
  for each row execute function update_updated_at();

-- ============================================================
-- Row Level Security
-- ============================================================

-- Public read on all academic tables
alter table institutions enable row level security;
alter table sources enable row level security;
alter table funders enable row level security;
alter table authors enable row level security;
alter table topics enable row level security;
alter table works enable row level security;
alter table work_authors enable row level security;
alter table work_topics enable row level security;
alter table work_citations enable row level security;
alter table work_funders enable row level security;
alter table author_institutions enable row level security;
alter table saved_works enable row level security;

-- Anyone can read academic data
create policy "Public read" on institutions for select using (true);
create policy "Public read" on sources for select using (true);
create policy "Public read" on funders for select using (true);
create policy "Public read" on authors for select using (true);
create policy "Public read" on topics for select using (true);
create policy "Public read" on works for select using (true);
create policy "Public read" on work_authors for select using (true);
create policy "Public read" on work_topics for select using (true);
create policy "Public read" on work_citations for select using (true);
create policy "Public read" on work_funders for select using (true);
create policy "Public read" on author_institutions for select using (true);

-- Saved works: user-scoped CRUD
create policy "Users can view own saved works"
  on saved_works for select
  using (auth.uid() = user_id);

create policy "Users can insert own saved works"
  on saved_works for insert
  with check (auth.uid() = user_id);

create policy "Users can update own saved works"
  on saved_works for update
  using (auth.uid() = user_id);

create policy "Users can delete own saved works"
  on saved_works for delete
  using (auth.uid() = user_id);

-- ============================================================
-- RPC: Citation Graph
-- ============================================================

create or replace function get_citation_graph(target_work_id text, max_nodes integer default 40)
returns json as $$
declare
  result json;
begin
  with center as (
    select id, title, year, cited_by_count, is_stub
    from works
    where id = target_work_id
  ),
  cited_papers as (
    select w.id, w.title, w.year, w.cited_by_count, w.is_stub
    from work_citations wc
    join works w on w.id = wc.cited_work_id
    where wc.citing_work_id = target_work_id
    limit max_nodes / 2
  ),
  citing_papers as (
    select w.id, w.title, w.year, w.cited_by_count, w.is_stub
    from work_citations wc
    join works w on w.id = wc.citing_work_id
    where wc.cited_work_id = target_work_id
    limit max_nodes / 2
  ),
  all_papers as (
    select * from center
    union all
    select * from cited_papers
    union all
    select * from citing_papers
  ),
  unique_papers as (
    select distinct on (id) * from all_papers
  ),
  paper_nodes as (
    select json_agg(json_build_object(
      'id', id,
      'label', case when is_stub then id else left(title, 60) end,
      'type', 'paper',
      'year', year,
      'cited_by_count', cited_by_count
    )) as nodes
    from unique_papers
  ),
  topic_data as (
    select distinct t.id, t.name
    from work_topics wt
    join topics t on t.id = wt.topic_id
    where wt.work_id = target_work_id
  ),
  topic_nodes as (
    select json_agg(json_build_object(
      'id', id,
      'label', name,
      'type', 'topic',
      'year', null,
      'cited_by_count', null
    )) as nodes
    from topic_data
  ),
  cite_edges as (
    select json_agg(json_build_object(
      'source', citing_work_id,
      'target', cited_work_id,
      'type', 'cites'
    )) as edges
    from (
      select citing_work_id, cited_work_id
      from work_citations
      where citing_work_id = target_work_id
        and cited_work_id in (select id from unique_papers)
      union all
      select citing_work_id, cited_work_id
      from work_citations
      where cited_work_id = target_work_id
        and citing_work_id in (select id from unique_papers)
    ) ce
  ),
  topic_edges as (
    select json_agg(json_build_object(
      'source', target_work_id,
      'target', topic_id,
      'type', 'has_topic'
    )) as edges
    from work_topics
    where work_id = target_work_id
  )
  select json_build_object(
    'nodes', coalesce(pn.nodes, '[]'::json) || coalesce(tn.nodes, '[]'::json),
    'edges', coalesce(ce.edges, '[]'::json) || coalesce(te.edges, '[]'::json)
  ) into result
  from paper_nodes pn, topic_nodes tn, cite_edges ce, topic_edges te;

  return result;
end;
$$ language plpgsql stable;
