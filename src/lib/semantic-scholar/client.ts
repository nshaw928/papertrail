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
