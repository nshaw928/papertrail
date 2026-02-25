import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import SaveButton from "@/components/save-button";
import CitationColumns from "@/components/citation-columns";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrFetchWork } from "@/lib/openalex/get-or-fetch";
import { loadWorksWithRelations } from "@/lib/supabase/queries";
import { fetchCitations, fetchCitedBy } from "@/lib/semantic-scholar/client";
import { isSafeUrl, levelName } from "@/lib/utils";
import type { WorkWithRelations } from "@/lib/types/app";

function TopicBadges({ topics }: { topics: { id: string; name: string; score: number | null }[] }) {
  if (topics.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {topics.map((t) => (
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
  );
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PaperPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const admin = createAdminClient();

  const paper = await getOrFetchWork(id, supabase, admin);
  if (!paper) notFound();

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

  // Enrich citations from Semantic Scholar if not yet fetched
  if (!paper.citations_fetched) {
    try {
      const [citedIds, citingIds] = await Promise.all([
        fetchCitations(id),
        fetchCitedBy(id),
      ]);

      if (citedIds.length > 0) {
        const stubs = citedIds.map((cid) => ({ id: cid, title: "Unknown", is_stub: true }));
        await admin.from("works").upsert(stubs, { onConflict: "id", ignoreDuplicates: true });
        const edges = citedIds.map((cid) => ({ citing_work_id: id, cited_work_id: cid }));
        await admin.from("work_citations").upsert(edges, {
          onConflict: "citing_work_id,cited_work_id", ignoreDuplicates: true,
        });
      }

      if (citingIds.length > 0) {
        const stubs = citingIds.map((cid) => ({ id: cid, title: "Unknown", is_stub: true }));
        await admin.from("works").upsert(stubs, { onConflict: "id", ignoreDuplicates: true });
        const edges = citingIds.map((cid) => ({ citing_work_id: cid, cited_work_id: id }));
        await admin.from("work_citations").upsert(edges, {
          onConflict: "citing_work_id,cited_work_id", ignoreDuplicates: true,
        });
      }

      await admin.from("works").update({ citations_fetched: true }).eq("id", id);
    } catch (e) {
      console.error(`Enrichment failed for ${id}:`, e);
    }
  }

  // Load references (this paper cites)
  const { data: refLinks } = await supabase
    .from("work_citations")
    .select("cited_work_id")
    .eq("citing_work_id", id);

  let references: WorkWithRelations[] = [];
  if (refLinks?.length) {
    const refIds = refLinks.map((l) => l.cited_work_id);
    const { data: refWorks } = await supabase
      .from("works")
      .select("*")
      .in("id", refIds);
    references = await loadWorksWithRelations(supabase, refWorks ?? [], {
      userId: user?.id,
    });
  }

  // Load cited by (papers citing this one) — limit 20
  const { data: citedByLinks, count: citedByTotal } = await supabase
    .from("work_citations")
    .select("citing_work_id", { count: "exact" })
    .eq("cited_work_id", id)
    .limit(20);

  let citedBy: WorkWithRelations[] = [];
  if (citedByLinks?.length) {
    const citingIds = citedByLinks.map((l) => l.citing_work_id);
    const { data: citingWorks } = await supabase
      .from("works")
      .select("*")
      .in("id", citingIds);
    citedBy = await loadWorksWithRelations(supabase, citingWorks ?? [], {
      userId: user?.id,
    });
  }

  const { authors, topics } = paper;
  const paperKeywords = Array.isArray(paper.keywords)
    ? (paper.keywords as { display_name: string }[])
    : null;
  const paperFwci = typeof paper.fwci === "number" ? paper.fwci : null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-bold leading-tight">{paper.title}</h1>
        <SaveButton workId={id} initialSaved={isSaved} size="lg" />
      </div>

      {/* Authors */}
      <div className="text-sm text-muted-foreground">
        {authors.map((a, i) => (
          <span key={a.id}>
            {a.display_name}
            {i < authors.length - 1 && ", "}
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
          {(paper.cited_by_count ?? 0).toLocaleString()} citations
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
      <TopicBadges topics={topics} />

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
      {(paperFwci || paperKeywords || !!paper.biblio) && (
        <details className="space-y-2">
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
            More details
          </summary>
          <div className="mt-2 space-y-2 text-sm text-muted-foreground">
            {paperFwci != null && <p>FWCI: {paperFwci.toFixed(2)}</p>}
            {paper.type && <p>Type: {paper.type}</p>}
            {paper.language && <p>Language: {paper.language}</p>}
            {paperKeywords && paperKeywords.length > 0 ? (
              <div>
                <p className="font-medium">Keywords:</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {paperKeywords.map((kw, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {kw.display_name}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
            {topics.length > 0 && (
              <div>
                <p className="font-medium">Topic hierarchy:</p>
                <ul className="mt-1 space-y-1">
                  {topics.map((t) => (
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

      {/* Citations */}
      {(references.length > 0 || citedBy.length > 0) && (
        <section className="space-y-4">
          <Separator />
          <h2 className="text-lg font-semibold">Citations</h2>
          <CitationColumns
            references={references}
            citedBy={citedBy}
            citedByTotal={citedByTotal ?? 0}
          />
        </section>
      )}
    </div>
  );
}
