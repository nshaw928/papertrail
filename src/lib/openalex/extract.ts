/* eslint-disable @typescript-eslint/no-explicit-any */

/** Reconstruct plain text from OpenAlex inverted-index abstract. */
export function parseAbstract(
  invertedIndex: Record<string, number[]> | null | undefined
): string | null {
  if (!invertedIndex) return null;
  const wordPositions: [number, string][] = [];
  for (const [word, positions] of Object.entries(invertedIndex)) {
    for (const pos of positions) {
      wordPositions.push([pos, word]);
    }
  }
  wordPositions.sort((a, b) => a[0] - b[0]);
  return wordPositions.map(([, w]) => w).join(" ");
}

function stripOAPrefix(id: string): string {
  return id.replace("https://openalex.org/", "");
}

/** Extract a normalized work dict from an OpenAlex work object. */
export function extractWork(work: any) {
  let oaUrl: string | null = null;
  let isOA = false;
  const oa = work.open_access;
  if (oa) {
    isOA = oa.is_oa ?? false;
    oaUrl = oa.oa_url ?? null;
  }

  let sourceId: string | null = null;
  let sourceDisplayName: string | null = null;
  const loc = work.primary_location;
  if (loc) {
    const src = loc.source;
    if (src) {
      sourceId = src.id ? stripOAPrefix(src.id) : null;
      sourceDisplayName = src.display_name ?? null;
    }
    if (!oaUrl && loc.is_oa) {
      oaUrl = loc.pdf_url ?? loc.landing_page_url ?? null;
    }
  }

  return {
    id: stripOAPrefix(work.id),
    title: work.title ?? "Untitled",
    abstract: parseAbstract(work.abstract_inverted_index),
    year: work.publication_year ?? null,
    doi: work.doi ?? null,
    cited_by_count: work.cited_by_count ?? 0,
    publication_date: work.publication_date ?? null,
    type: work.type ?? null,
    language: work.language ?? null,
    is_retracted: work.is_retracted ?? false,
    is_open_access: isOA,
    open_access_url: oaUrl,
    fwci: work.fwci ?? null,
    counts_by_year: work.counts_by_year ?? null,
    biblio: work.biblio ?? null,
    keywords: work.keywords ?? null,
    sustainable_development_goals:
      work.sustainable_development_goals ?? null,
    related_work_ids:
      work.related_works?.map((r: string) => stripOAPrefix(r)) ?? null,
    mesh: work.mesh ?? null,
    indexed_in: work.indexed_in ?? null,
    is_stub: false,
    source_id: sourceId,
    source_display_name: sourceDisplayName,
    referenced_works:
      work.referenced_works?.map((r: string) => stripOAPrefix(r)) ?? [],
  };
}

/** Extract authors with their institution info from an OpenAlex work. */
export function extractAuthors(work: any) {
  const authors: any[] = [];
  const institutions: any[] = [];
  const authorInstitutionLinks: any[] = [];

  for (let i = 0; i < (work.authorships?.length ?? 0); i++) {
    const authorship = work.authorships[i];
    const author = authorship.author;
    if (!author?.id) continue;

    const authorId = stripOAPrefix(author.id);
    authors.push({
      id: authorId,
      display_name: author.display_name ?? "Unknown",
      orcid: author.orcid ?? null,
      cited_by_count: author.cited_by_count ?? 0,
      position: i,
      is_corresponding: authorship.is_corresponding ?? false,
    });

    // Extract institutions from authorship
    for (const inst of authorship.institutions ?? []) {
      if (!inst?.id) continue;
      const instId = stripOAPrefix(inst.id);
      institutions.push({
        id: instId,
        name: inst.display_name ?? "Unknown",
        type: inst.type ?? null,
        country_code: inst.country_code ?? null,
        ror_id: inst.ror ?? null,
      });
      authorInstitutionLinks.push({
        author_id: authorId,
        institution_id: instId,
      });
    }
  }

  return { authors, institutions, authorInstitutionLinks };
}

/** Extract topics with their hierarchy from an OpenAlex work. */
export function extractTopics(work: any) {
  const topics: any[] = [];
  const allTopics: any[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < (work.topics?.length ?? 0); i++) {
    const t = work.topics[i];
    const topicId = stripOAPrefix(t.id);
    if (seen.has(topicId)) continue;
    seen.add(topicId);

    // Domain (level 0)
    const domain = t.domain;
    if (domain) {
      const dId = stripOAPrefix(domain.id);
      if (!seen.has(dId)) {
        seen.add(dId);
        allTopics.push({
          id: dId,
          name: domain.display_name,
          level: 0,
          parent_topic_id: null,
        });
      }
    }

    // Field (level 1)
    const field = t.field;
    if (field) {
      const fId = stripOAPrefix(field.id);
      if (!seen.has(fId)) {
        seen.add(fId);
        allTopics.push({
          id: fId,
          name: field.display_name,
          level: 1,
          parent_topic_id: domain ? stripOAPrefix(domain.id) : null,
        });
      }
    }

    // Subfield (level 2)
    const subfield = t.subfield;
    if (subfield) {
      const sfId = stripOAPrefix(subfield.id);
      if (!seen.has(sfId)) {
        seen.add(sfId);
        allTopics.push({
          id: sfId,
          name: subfield.display_name,
          level: 2,
          parent_topic_id: field ? stripOAPrefix(field.id) : null,
        });
      }
    }

    // Topic itself (level 3)
    allTopics.push({
      id: topicId,
      name: t.display_name ?? "Unknown",
      level: 3,
      parent_topic_id: subfield ? stripOAPrefix(subfield.id) : null,
      description: t.description ?? null,
      keywords: t.keywords ?? null,
      works_count: t.works_count ?? 0,
    });

    topics.push({
      topic_id: topicId,
      score: t.score ?? 0,
      is_primary: i === 0,
    });
  }

  return { allTopics, workTopicLinks: topics };
}

/** Extract source from primary_location. */
export function extractSource(work: any) {
  const loc = work.primary_location;
  if (!loc?.source?.id) return null;
  const src = loc.source;
  return {
    id: stripOAPrefix(src.id),
    name: src.display_name ?? "Unknown",
    type: src.type ?? null,
    issn: src.issn ?? null,
    is_oa: src.is_oa ?? false,
    homepage_url: src.homepage_url ?? null,
    host_organization_name: src.host_organization_name ?? null,
    apc_usd: src.apc_usd?.value ?? null,
  };
}

/** Extract funders from work.grants[]. */
export function extractFunders(work: any) {
  const funders: any[] = [];
  const workFunderLinks: any[] = [];
  const seen = new Set<string>();

  for (const grant of work.grants ?? []) {
    const funder = grant.funder;
    if (!funder?.id) continue;
    const funderId = stripOAPrefix(funder.id);
    if (!seen.has(funderId)) {
      seen.add(funderId);
      funders.push({
        id: funderId,
        name: funder.display_name ?? "Unknown",
        country_code: funder.country_code ?? null,
      });
    }
    workFunderLinks.push({
      funder_id: funderId,
      award_id: grant.award_id ?? null,
    });
  }

  return { funders, workFunderLinks };
}
