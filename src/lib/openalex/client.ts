const OPENALEX_BASE = "https://api.openalex.org";

function buildParams(): Record<string, string> {
  const params: Record<string, string> = {};
  const apiKey = process.env.OPENALEX_API_KEY;
  if (apiKey) {
    params.api_key = apiKey;
  } else {
    const email = process.env.OPENALEX_EMAIL;
    if (email) params.mailto = email;
  }
  return params;
}

function toQueryString(params: Record<string, string>): string {
  return new URLSearchParams(params).toString();
}

export async function searchWorks(
  query: string,
  page = 1,
  perPage = 20,
  opts?: {
    fromYear?: number;
    toYear?: number;
    sort?: string;
  }
): Promise<{ results: Record<string, unknown>[]; meta: Record<string, unknown> }> {
  const params = buildParams();
  params.search = query;
  params.page = String(page);
  params.per_page = String(perPage);

  // Year filter
  const filters: string[] = [];
  if (opts?.fromYear) {
    filters.push(`publication_year:>${opts.fromYear - 1}`);
  }
  if (opts?.toYear) {
    filters.push(`publication_year:<${opts.toYear + 1}`);
  }
  if (filters.length > 0) {
    params.filter = filters.join(",");
  }

  // Sort
  if (opts?.sort) {
    switch (opts.sort) {
      case "cited_by_count":
        params.sort = "cited_by_count:desc";
        break;
      case "newest":
        params.sort = "publication_date:desc";
        break;
      case "oldest":
        params.sort = "publication_date:asc";
        break;
      // "relevance" is the default — no sort param needed
    }
  }

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
  const params = buildParams();
  params.filter = `openalex:${ids.join("|")}`;
  params.per_page = String(Math.min(ids.length, 100));

  const resp = await fetch(`${OPENALEX_BASE}/works?${toQueryString(params)}`, {
    next: { revalidate: 0 },
  });
  if (!resp.ok) throw new Error(`OpenAlex batch failed: ${resp.status}`);
  const data = await resp.json();
  return data.results ?? [];
}
