import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import SaveButton from "@/components/save-button";
import CitationColumns from "@/components/citation-columns";
import AISummarySection from "@/components/ai-summary-section";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrFetchWork } from "@/lib/openalex/get-or-fetch";
import { getUserPlan } from "@/lib/supabase/plans";
import { PLAN_LIMITS } from "@/lib/plans";
import { loadWorksWithRelations } from "@/lib/supabase/queries";
import { enrichCitations } from "@/lib/openalex/enrich-citations";
import { hydrateStubs } from "@/lib/openalex/hydrate";
import { isSafeUrl, levelName } from "@/lib/utils";
import PaperQuotes from "@/components/paper-quotes";
import ShareToLab from "@/components/share-to-lab";
import AddToCollection from "@/components/add-to-collection";
import LabPaperNotesLoader from "@/components/lab-paper-notes-loader";
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
  let canGenerate = false;
  if (user) {
    const { data: saved } = await supabase
      .from("saved_works")
      .select("id")
      .eq("user_id", user.id)
      .eq("work_id", id)
      .maybeSingle();
    isSaved = !!saved;

    const userPlan = await getUserPlan(supabase, user.id);
    canGenerate = PLAN_LIMITS[userPlan.plan].aiSummariesOnDemand;
  }

  // Enrich citations from Semantic Scholar if not yet fetched
  try {
    await enrichCitations(admin, id);
  } catch (e) {
    console.error(`Enrichment failed for ${id}:`, e);
  }

  // Load reference IDs and cited-by IDs
  const [{ data: refLinks }, { data: citedByLinks, count: citedByTotal }] =
    await Promise.all([
      supabase
        .from("work_citations")
        .select("cited_work_id")
        .eq("citing_work_id", id),
      supabase
        .from("work_citations")
        .select("citing_work_id", { count: "exact" })
        .eq("cited_work_id", id)
        .limit(20),
    ]);

  const refIds = refLinks?.map((l) => l.cited_work_id) ?? [];
  const displayedCitedByIds = citedByLinks?.map((l) => l.citing_work_id) ?? [];

  // Hydrate displayed stubs so users see real titles/authors
  const idsToHydrate = [...refIds, ...displayedCitedByIds];
  if (idsToHydrate.length > 0) {
    try {
      await hydrateStubs(admin, idsToHydrate);
    } catch (e) {
      console.error(`Hydration failed for ${id}:`, e);
    }
  }

  // Load full work rows for display
  let references: WorkWithRelations[] = [];
  if (refIds.length > 0) {
    const { data: refWorks } = await supabase
      .from("works")
      .select("*")
      .in("id", refIds);
    references = await loadWorksWithRelations(supabase, refWorks ?? [], {
      userId: user?.id,
    });
  }

  let citedBy: WorkWithRelations[] = [];
  if (displayedCitedByIds.length > 0) {
    const { data: citingWorks } = await supabase
      .from("works")
      .select("*")
      .in("id", displayedCitedByIds);
    citedBy = await loadWorksWithRelations(supabase, citingWorks ?? [], {
      userId: user?.id,
    });
  }

  // Background-hydrate remaining cited-by stubs beyond the displayed 20
  if ((citedByTotal ?? 0) > 20) {
    const { data: allCitedByLinks } = await admin
      .from("work_citations")
      .select("citing_work_id")
      .eq("cited_work_id", id);
    const allCitedByIds = allCitedByLinks?.map((l) => l.citing_work_id) ?? [];
    const displayedSet = new Set(displayedCitedByIds);
    const remainingIds = allCitedByIds.filter((cid) => !displayedSet.has(cid));
    if (remainingIds.length > 0) {
      // Fire-and-forget background hydration
      hydrateStubs(admin, remainingIds).catch((e) =>
        console.error(`Background hydration failed for ${id}:`, e)
      );
    }
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
        <div className="flex items-center gap-2 shrink-0">
          {user && <AddToCollection workId={id} />}
          {user && <ShareToLab workId={id} paperTitle={paper.title} />}
          <SaveButton workId={id} initialSaved={isSaved} size="lg" />
        </div>
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
        {paper.doi && isSafeUrl(paper.doi) && (
          <a href={paper.doi} target="_blank" rel="noopener noreferrer"
            className="text-sm text-primary underline">DOI</a>
        )}
        {paper.is_open_access && (
          paper.open_access_url && isSafeUrl(paper.open_access_url) ? (
            <a href={paper.open_access_url} target="_blank" rel="noopener noreferrer">
              <Badge variant="outline" className="border-green-600 text-green-600">
                Open Access
              </Badge>
            </a>
          ) : (
            <Badge variant="outline" className="border-green-600 text-green-600">
              Open Access
            </Badge>
          )
        )}
        {paper.is_retracted && (
          <Badge variant="destructive">Retracted</Badge>
        )}
      </div>

      {/* Topics */}
      <TopicBadges topics={topics} />

      {/* AI Summary */}
      <AISummarySection
        workId={id}
        initialSummary={paper.ai_summary}
        canGenerate={canGenerate}
        hasText={!!(paper.abstract || paper.open_access_url)}
      />

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

      <Separator />

      {/* Quotes & Notes */}
      {user && <PaperQuotes workId={id} />}

      {/* Lab Notes */}
      {user && <LabPaperNotesLoader workId={id} />}

      {/* Abstract */}
      {paper.abstract && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Abstract</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {paper.abstract}
          </p>
        </section>
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
