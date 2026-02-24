-- Fix get_citation_graph: use jsonb instead of json for concatenation support

drop function if exists get_citation_graph(text, integer);

create or replace function get_citation_graph(target_work_id text, max_nodes integer default 40)
returns jsonb as $$
declare
  result jsonb;
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
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', id,
      'label', case when is_stub then id else left(title, 60) end,
      'type', 'paper',
      'year', year,
      'cited_by_count', cited_by_count
    )), '[]'::jsonb) as nodes
    from unique_papers
  ),
  topic_data as (
    select distinct t.id, t.name
    from work_topics wt
    join topics t on t.id = wt.topic_id
    where wt.work_id = target_work_id
  ),
  topic_nodes as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', id,
      'label', name,
      'type', 'topic',
      'year', null,
      'cited_by_count', null
    )), '[]'::jsonb) as nodes
    from topic_data
  ),
  cite_edges as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'source', citing_work_id,
      'target', cited_work_id,
      'type', 'cites'
    )), '[]'::jsonb) as edges
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
    select coalesce(jsonb_agg(jsonb_build_object(
      'source', target_work_id,
      'target', topic_id,
      'type', 'has_topic'
    )), '[]'::jsonb) as edges
    from work_topics
    where work_id = target_work_id
  )
  select jsonb_build_object(
    'nodes', pn.nodes || tn.nodes,
    'edges', ce.edges || te.edges
  ) into result
  from paper_nodes pn, topic_nodes tn, cite_edges ce, topic_edges te;

  return result;
end;
$$ language plpgsql stable;
