import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import SaveButton from "@/components/save-button";
import CitationGraphWrapper from "./citation-graph-wrapper";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrFetchWork } from "@/lib/openalex/get-or-fetch";
import { isSafeUrl, levelName } from "@/lib/utils";
import type { GraphData } from "@/lib/types/app";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PaperPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const admin = createAdminClient();

  const paper = await getOrFetchWork(id, supabase, admin);
  if (!paper) notFound();

  // Load citation graph via RPC
  const { data: graphData } = await supabase.rpc("get_citation_graph", {
    target_work_id: id,
    max_nodes: 40,
  });
  const graph = graphData as unknown as GraphData | null;

  // Check saved status
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let isSaved = false;
  if (user) {
    const { data: saved } = await supabase
      .from("saved_works")
      .select("id")
      .eq("user_id", user.id)
      .eq("work_id", id)
      .maybeSingle();
    isSaved = !!saved;
  }

  // Fire non-blocking enrichment if needed
  if (!paper.citations_fetched) {
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      ? undefined
      : "http://localhost:3000";
    fetch(
      `${baseUrl ?? ""}/api/papers/${id}/enrich`,
      { method: "POST" }
    ).catch(() => {});
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-bold leading-tight">{paper.title}</h1>
        <SaveButton workId={id} initialSaved={isSaved} size="lg" />
      </div>

      {/* Authors */}
      <div className="text-sm text-muted-foreground">
        {paper.authors.map((a, i) => (
          <span key={a.id}>
            {a.display_name}
            {i < paper.authors.length - 1 && ", "}
          </span>
        ))}
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        {paper.year && (
          <span className="text-muted-foreground">{paper.year}</span>
        )}
        {paper.source_display_name && (
          <span className="text-muted-foreground">
            {paper.source_display_name}
          </span>
        )}
        <span className="text-muted-foreground">
          {paper.cited_by_count.toLocaleString()} citations
        </span>
        {paper.is_open_access && (
          <Badge
            variant="outline"
            className="border-green-600 text-green-600"
          >
            Open Access
          </Badge>
        )}
        {paper.is_retracted && (
          <Badge variant="destructive">Retracted</Badge>
        )}
      </div>

      {/* Links */}
      {(paper.doi || paper.open_access_url) && (
        <div className="flex gap-3">
          {paper.doi && isSafeUrl(paper.doi) && (
            <a
              href={paper.doi}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary underline"
            >
              DOI
            </a>
          )}
          {paper.open_access_url && isSafeUrl(paper.open_access_url) && (
            <a
              href={paper.open_access_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary underline"
            >
              Read Paper
            </a>
          )}
        </div>
      )}

      {/* Topics */}
      {paper.topics.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {paper.topics.map((t) => (
            <Link key={t.id} href={`/topics/${t.id}`}>
              <Badge variant="secondary">
                {t.name}
                {t.score != null && (
                  <span className="ml-1 opacity-60">
                    {(t.score * 100).toFixed(0)}%
                  </span>
                )}
              </Badge>
            </Link>
          ))}
        </div>
      )}

      <Separator />

      {/* Abstract */}
      {paper.abstract && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Abstract</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {paper.abstract}
          </p>
        </section>
      )}

      {/* AI Summary */}
      {paper.summary && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">AI Summary</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {paper.summary}
          </p>
        </section>
      )}

      {/* Details (expandable metadata) */}
      {(paper.fwci || paper.keywords || paper.biblio) && (
        <details className="space-y-2">
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
            More details
          </summary>
          <div className="mt-2 space-y-2 text-sm text-muted-foreground">
            {paper.fwci && <p>FWCI: {paper.fwci.toFixed(2)}</p>}
            {paper.type && <p>Type: {paper.type}</p>}
            {paper.language && <p>Language: {paper.language}</p>}
            {paper.keywords && Array.isArray(paper.keywords) && (
              <div>
                <p className="font-medium">Keywords:</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(paper.keywords as { display_name: string }[]).map(
                    (kw, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {kw.display_name}
                      </Badge>
                    )
                  )}
                </div>
              </div>
            )}
            {paper.topics.length > 0 && (
              <div>
                <p className="font-medium">Topic hierarchy:</p>
                <ul className="mt-1 space-y-1">
                  {paper.topics.map((t) => (
                    <li key={t.id}>
                      <span className="opacity-60">{levelName(t.level)}:</span>{" "}
                      {t.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </details>
      )}

      {/* Citation Graph */}
      {graph && graph.nodes && graph.nodes.length > 1 && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Citation Graph</h2>
          <CitationGraphWrapper data={graph} centerId={id} />
        </section>
      )}
    </div>
  );
}
