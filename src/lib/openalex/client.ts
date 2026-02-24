const OPENALEX_BASE = "https://api.openalex.org";

function buildParams(): Record<string, string> {
  const params: Record<string, string> = {};
  const email = process.env.OPENALEX_EMAIL;
  if (email) params.mailto = email;
  return params;
}

function toQueryString(params: Record<string, string>): string {
  return new URLSearchParams(params).toString();
}

export async function searchWorks(
  query: string,
  page = 1,
  perPage = 20
): Promise<{ results: Record<string, unknown>[]; meta: Record<string, unknown> }> {
  const params = buildParams();
  params.search = query;
  params.page = String(page);
  params.per_page = String(perPage);

  const resp = await fetch(`${OPENALEX_BASE}/works?${toQueryString(params)}`, {
    next: { revalidate: 0 },
  });
  if (!resp.ok) throw new Error(`OpenAlex search failed: ${resp.status}`);
  const data = await resp.json();
  return { results: data.results ?? [], meta: data.meta ?? {} };
}

export async function getWork(
  openalexId: string
): Promise<Record<string, unknown> | null> {
  const params = buildParams();
  const resp = await fetch(
    `${OPENALEX_BASE}/works/${openalexId}?${toQueryString(params)}`,
    { next: { revalidate: 0 } }
  );
  if (resp.status === 404) return null;
  if (!resp.ok) throw new Error(`OpenAlex get_work failed: ${resp.status}`);
  return resp.json();
}

export async function batchGetWorks(
  ids: string[]
): Promise<Record<string, unknown>[]> {
  if (ids.length === 0) return [];
  // OpenAlex supports pipe-separated filter
  const params = buildParams();
  params.filter = `openalex:${ids.join("|")}`;
  params.per_page = String(Math.min(ids.length, 50));

  const resp = await fetch(`${OPENALEX_BASE}/works?${toQueryString(params)}`, {
    next: { revalidate: 0 },
  });
  if (!resp.ok) throw new Error(`OpenAlex batch failed: ${resp.status}`);
  const data = await resp.json();
  return data.results ?? [];
}
