import { NextRequest, NextResponse } from "next/server";
import { searchWorks } from "@/lib/openalex/client";
import { ingestWorks } from "@/lib/openalex/ingest";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { WorkWithRelations } from "@/lib/types/app";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const perPage = parseInt(searchParams.get("per_page") ?? "20", 10);

  if (!query) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  try {
    // Search OpenAlex
    const { results: openalexResults, meta } = await searchWorks(
      query,
      page,
      perPage
    );

    // Ingest all results into Supabase (cache them)
    const admin = createAdminClient();
    const ingested = await ingestWorks(admin, openalexResults);

    // Check which works are saved by the current user
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let savedIds = new Set<string>();
    if (user) {
      const { data: savedWorks } = await supabase
        .from("saved_works")
        .select("work_id")
        .eq("user_id", user.id)
        .in(
          "work_id",
          ingested.map((w) => w.id)
        );
      savedIds = new Set(savedWorks?.map((s) => s.work_id) ?? []);
    }

    // Load full work data with relations from DB
    const results = [];
    for (const work of ingested) {
      // Load authors
      const { data: authorLinks } = await supabase
        .from("work_authors")
        .select("author_id, position, is_corresponding")
        .eq("work_id", work.id)
        .order("position");

      const authors: WorkWithRelations["authors"] = [];
      if (authorLinks?.length) {
        const { data: authorRows } = await supabase
          .from("authors")
          .select("id, display_name, orcid")
          .in(
            "id",
            authorLinks.map((l) => l.author_id)
          );
        const authorMap = new Map(authorRows?.map((a) => [a.id, a]) ?? []);
        for (const link of authorLinks) {
          const a = authorMap.get(link.author_id);
          if (a)
            authors.push({
              id: a.id,
              display_name: a.display_name,
              orcid: a.orcid,
              position: link.position,
              is_corresponding: link.is_corresponding,
            });
        }
      }

      // Load topics
      const { data: topicLinks } = await supabase
        .from("work_topics")
        .select("topic_id, score, is_primary")
        .eq("work_id", work.id)
        .order("score", { ascending: false });

      const topics: WorkWithRelations["topics"] = [];
      if (topicLinks?.length) {
        const { data: topicRows } = await supabase
          .from("topics")
          .select("id, name, level")
          .in(
            "id",
            topicLinks.map((l) => l.topic_id)
          );
        const topicMap = new Map(topicRows?.map((t) => [t.id, t]) ?? []);
        for (const link of topicLinks) {
          const t = topicMap.get(link.topic_id);
          if (t)
            topics.push({
              id: t.id,
              name: t.name,
              level: t.level,
              score: link.score,
              is_primary: link.is_primary,
            });
        }
      }

      results.push({
        ...work,
        authors,
        topics,
        is_saved: savedIds.has(work.id),
      });
    }

    return NextResponse.json({
      results,
      count: (meta.count as number) ?? 0,
      page,
      per_page: perPage,
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}
