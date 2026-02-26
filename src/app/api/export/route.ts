import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/supabase/server";
import { checkLimit } from "@/lib/supabase/plans";
import { loadWorksWithRelations } from "@/lib/supabase/queries";
import type { WorkWithRelations } from "@/lib/types/app";

function csvEscape(value: string | null | undefined): string {
  if (value == null) return "";
  let str = String(value);
  // Prevent CSV injection: prefix formula-triggering characters with a single quote
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function workToCsvRow(paper: WorkWithRelations): string {
  const authors = paper.authors.map((a) => a.display_name).join("; ");
  const topics = paper.topics.map((t) => t.name).join("; ");

  return [
    csvEscape(paper.title),
    csvEscape(authors),
    csvEscape(paper.year?.toString()),
    csvEscape(paper.doi),
    csvEscape(paper.source_display_name),
    csvEscape((paper.cited_by_count ?? 0).toString()),
    csvEscape(topics),
    csvEscape(paper.abstract),
    csvEscape(paper.open_access_url),
  ].join(",");
}

const CSV_HEADER = "Title,Authors,Year,DOI,Source,Cited By,Topics,Abstract,Open Access URL";

// ---- BibTeX helpers ----

const OPENALEX_TYPE_TO_BIBTEX: Record<string, string> = {
  "journal-article": "article",
  "book-chapter": "incollection",
  book: "book",
  "proceedings-article": "inproceedings",
  dissertation: "phdthesis",
  report: "techreport",
  dataset: "misc",
  preprint: "unpublished",
};

function bibtexEscape(value: string): string {
  return value.replace(/([&%$#_{}~^\\])/g, "\\$1");
}

function makeCiteKey(paper: WorkWithRelations, usedKeys: Set<string>): string {
  const surname =
    (paper.authors[0]?.display_name ?? "unknown").split(/\s+/).pop() ?? "unknown";
  const year = paper.year ?? "nd";
  let base = `${surname}${year}`.replace(/[^a-zA-Z0-9]/g, "");
  let key = base;
  let suffix = 97; // 'a'
  while (usedKeys.has(key)) {
    key = `${base}${String.fromCharCode(suffix++)}`;
  }
  usedKeys.add(key);
  return key;
}

function formatBibtex(papers: WorkWithRelations[]): string {
  const usedKeys = new Set<string>();

  return papers
    .map((paper) => {
      const entryType =
        OPENALEX_TYPE_TO_BIBTEX[paper.type ?? ""] ?? "misc";
      const key = makeCiteKey(paper, usedKeys);

      const fields: string[] = [];

      fields.push(`  title = {${bibtexEscape(paper.title)}}`);

      if (paper.authors.length) {
        fields.push(
          `  author = {${paper.authors.map((a) => bibtexEscape(a.display_name)).join(" and ")}}`
        );
      }

      if (paper.year) fields.push(`  year = {${paper.year}}`);
      if (paper.doi) fields.push(`  doi = {${bibtexEscape(paper.doi)}}`);
      if (paper.source_display_name) {
        const journalField =
          entryType === "inproceedings" ? "booktitle" : "journal";
        fields.push(
          `  ${journalField} = {${bibtexEscape(paper.source_display_name)}}`
        );
      }
      if (paper.open_access_url)
        fields.push(`  url = {${paper.open_access_url}}`);
      if (paper.abstract)
        fields.push(`  abstract = {${bibtexEscape(paper.abstract)}}`);

      return `@${entryType}{${key},\n${fields.join(",\n")}\n}`;
    })
    .join("\n\n");
}

export async function GET(request: NextRequest) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  // Check export plan limit
  const limit = await checkLimit(supabase, user.id, "export");
  if (!limit.allowed) {
    return NextResponse.json(
      { error: limit.reason, code: "LIMIT_REACHED" },
      { status: 429 }
    );
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") ?? "csv";
  const scope = searchParams.get("scope") ?? "library";
  const collectionId = searchParams.get("id");

  if (format !== "csv" && format !== "bibtex") {
    return NextResponse.json({ error: "Invalid format" }, { status: 400 });
  }
  if (scope !== "library" && scope !== "collection") {
    return NextResponse.json({ error: "Invalid scope" }, { status: 400 });
  }

  let papers: WorkWithRelations[] = [];

  if (scope === "collection" && collectionId) {
    // Verify ownership via RLS (query returns empty if not owned)
    const { data: collectionWorks } = await supabase
      .from("collection_works")
      .select("work_id")
      .eq("collection_id", collectionId);

    if (collectionWorks?.length) {
      const workIds = collectionWorks.map((cw) => cw.work_id);
      const { data: works } = await supabase
        .from("works")
        .select("*")
        .in("id", workIds);
      papers = await loadWorksWithRelations(supabase, works ?? [], {
        userId: user.id,
      });
    }
  } else {
    // Library scope
    const { data: savedWorks } = await supabase
      .from("saved_works")
      .select("work_id")
      .eq("user_id", user.id);

    if (savedWorks?.length) {
      const workIds = savedWorks.map((s) => s.work_id);
      const { data: works } = await supabase
        .from("works")
        .select("*")
        .in("id", workIds);
      papers = await loadWorksWithRelations(supabase, works ?? [], {
        userId: user.id,
      });
    }
  }

  if (format === "bibtex") {
    const bib = formatBibtex(papers);
    return new NextResponse(bib, {
      headers: {
        "Content-Type": "application/x-bibtex; charset=utf-8",
        "Content-Disposition": 'attachment; filename="papertrail-export.bib"',
      },
    });
  }

  const rows = [CSV_HEADER, ...papers.map(workToCsvRow)];
  const csv = rows.join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="papertrail-export.csv"',
    },
  });
}
