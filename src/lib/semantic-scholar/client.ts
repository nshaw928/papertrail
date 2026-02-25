/** Fetch citation references from Semantic Scholar for a given OpenAlex work ID. */
export async function fetchCitations(
  openalexId: string
): Promise<string[]> {
  const resp = await fetch(
    `https://api.semanticscholar.org/graph/v1/paper/openalex:${openalexId}?fields=references.externalIds`,
    { next: { revalidate: 0 } }
  );

  if (!resp.ok) return [];

  const data = await resp.json();
  const oaIds: string[] = [];

  for (const ref of data.references ?? []) {
    const oaId = ref?.externalIds?.OpenAlex;
    if (oaId) oaIds.push(oaId);
  }

  return oaIds;
}

/** Fetch papers that cite the given work, using the paginated citations endpoint. */
export async function fetchCitedBy(
  openalexId: string
): Promise<string[]> {
  const oaIds: string[] = [];
  const limit = 1000;
  let offset = 0;

  while (offset < limit) {
    const batchSize = Math.min(1000, limit - offset);
    const resp = await fetch(
      `https://api.semanticscholar.org/graph/v1/paper/openalex:${openalexId}/citations?fields=externalIds&limit=${batchSize}&offset=${offset}`,
      { next: { revalidate: 0 } }
    );

    if (!resp.ok) break;

    const data = await resp.json();
    const batch = data.data ?? [];

    for (const entry of batch) {
      const oaId = entry?.citingPaper?.externalIds?.OpenAlex;
      if (oaId) oaIds.push(oaId);
    }

    // Stop if we got fewer than requested (no more pages)
    if (batch.length < batchSize) break;
    offset += batch.length;
  }

  return oaIds;
}
