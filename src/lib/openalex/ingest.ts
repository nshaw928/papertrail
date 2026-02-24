/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import {
  extractWork,
  extractAuthors,
  extractTopics,
  extractSource,
  extractFunders,
} from "./extract";

type AdminClient = SupabaseClient<Database>;

/** Ingest a single OpenAlex work and all its relations into Supabase. */
export async function ingestWork(admin: AdminClient, openalexWork: any) {
  const work = extractWork(openalexWork);
  const { authors, institutions, authorInstitutionLinks } =
    extractAuthors(openalexWork);
  const { allTopics, workTopicLinks } = extractTopics(openalexWork);
  const source = extractSource(openalexWork);
  const { funders, workFunderLinks } = extractFunders(openalexWork);

  // Upsert source
  if (source) {
    await admin.from("sources").upsert(source, { onConflict: "id" });
  }

  // Upsert institutions
  if (institutions.length > 0) {
    const unique = dedupeById(institutions);
    await admin.from("institutions").upsert(unique, { onConflict: "id" });
  }

  // Upsert funders
  if (funders.length > 0) {
    await admin.from("funders").upsert(funders, { onConflict: "id" });
  }

  // Upsert topics (parents first, then children — sorted by level)
  if (allTopics.length > 0) {
    const sorted = [...allTopics].sort((a, b) => a.level - b.level);
    // Insert level by level to satisfy FK constraints
    const byLevel = new Map<number, any[]>();
    for (const t of sorted) {
      const level = t.level;
      if (!byLevel.has(level)) byLevel.set(level, []);
      byLevel.get(level)!.push({
        id: t.id,
        name: t.name,
        level: t.level,
        parent_topic_id: t.parent_topic_id,
        description: t.description ?? null,
        keywords: t.keywords ?? null,
        works_count: t.works_count ?? 0,
      });
    }
    for (const level of [0, 1, 2, 3]) {
      const batch = byLevel.get(level);
      if (batch?.length) {
        await admin.from("topics").upsert(dedupeById(batch), { onConflict: "id" });
      }
    }
  }

  // Upsert authors
  if (authors.length > 0) {
    const authorRows = authors.map((a) => ({
      id: a.id,
      display_name: a.display_name,
      orcid: a.orcid,
      cited_by_count: a.cited_by_count,
    }));
    await admin.from("authors").upsert(dedupeById(authorRows), { onConflict: "id" });
  }

  // Upsert the work itself
  const workRow = {
    id: work.id,
    title: work.title,
    abstract: work.abstract,
    year: work.year,
    doi: work.doi,
    cited_by_count: work.cited_by_count,
    publication_date: work.publication_date,
    type: work.type,
    language: work.language,
    is_retracted: work.is_retracted,
    is_open_access: work.is_open_access,
    open_access_url: work.open_access_url,
    fwci: work.fwci,
    counts_by_year: work.counts_by_year,
    biblio: work.biblio,
    keywords: work.keywords,
    sustainable_development_goals: work.sustainable_development_goals,
    related_work_ids: work.related_work_ids,
    mesh: work.mesh,
    indexed_in: work.indexed_in,
    is_stub: false,
    source_id: work.source_id,
    source_display_name: work.source_display_name,
  };
  await admin.from("works").upsert(workRow, { onConflict: "id" });

  // Link work ↔ authors
  if (authors.length > 0) {
    const links = authors.map((a) => ({
      work_id: work.id,
      author_id: a.id,
      position: a.position,
      is_corresponding: a.is_corresponding,
    }));
    await admin
      .from("work_authors")
      .upsert(links, { onConflict: "work_id,author_id" });
  }

  // Link work ↔ topics
  if (workTopicLinks.length > 0) {
    const links = workTopicLinks.map((t) => ({
      work_id: work.id,
      topic_id: t.topic_id,
      score: t.score,
      is_primary: t.is_primary,
    }));
    await admin
      .from("work_topics")
      .upsert(links, { onConflict: "work_id,topic_id" });
  }

  // Link work ↔ funders
  if (workFunderLinks.length > 0) {
    const links = workFunderLinks.map((f) => ({
      work_id: work.id,
      funder_id: f.funder_id,
      award_id: f.award_id,
    }));
    await admin
      .from("work_funders")
      .upsert(links, { onConflict: "work_id,funder_id" });
  }

  // Link author ↔ institutions
  if (authorInstitutionLinks.length > 0) {
    const unique = authorInstitutionLinks.filter(
      (link, index, self) =>
        index ===
        self.findIndex(
          (l) =>
            l.author_id === link.author_id &&
            l.institution_id === link.institution_id
        )
    );
    await admin
      .from("author_institutions")
      .upsert(unique, { onConflict: "author_id,institution_id" });
  }

  // Create stubs for referenced works + citation edges
  if (work.referenced_works?.length > 0) {
    const stubs = work.referenced_works.map((id: string) => ({
      id,
      title: "Unknown",
      is_stub: true,
    }));
    // Upsert stubs (ignoreDuplicates = don't overwrite existing full records)
    await admin
      .from("works")
      .upsert(stubs, { onConflict: "id", ignoreDuplicates: true });

    const citationEdges = work.referenced_works.map((citedId: string) => ({
      citing_work_id: work.id,
      cited_work_id: citedId,
    }));
    await admin
      .from("work_citations")
      .upsert(citationEdges, {
        onConflict: "citing_work_id,cited_work_id",
        ignoreDuplicates: true,
      });
  }

  return work;
}

/** Ingest multiple OpenAlex works in sequence. */
export async function ingestWorks(admin: AdminClient, openalexWorks: any[]) {
  const results = [];
  for (const work of openalexWorks) {
    results.push(await ingestWork(admin, work));
  }
  return results;
}

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}
