import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import SaveButton from "./save-button";
import AddToCollection from "./add-to-collection";
import type { WorkWithRelations } from "@/lib/types/app";

interface PaperCardProps {
  paper: WorkWithRelations;
}

export default function PaperCard({ paper }: PaperCardProps) {
  return (
    <Card className="transition-colors hover:bg-accent/50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/paper/${paper.id}`}
            className="text-base font-medium leading-snug hover:underline"
          >
            {paper.title}
          </Link>
          <div className="flex items-center gap-1">
            <AddToCollection workId={paper.id} />
            <SaveButton
              workId={paper.id}
              initialSaved={paper.is_saved}
              size="sm"
            />
          </div>
        </div>

        <p className="mt-1 text-sm text-muted-foreground">
          {paper.authors
            .slice(0, 3)
            .map((a) => a.display_name)
            .join(", ")}
          {paper.authors.length > 3 &&
            ` +${paper.authors.length - 3} more`}
          {paper.year && (
            <span className="ml-2 text-muted-foreground">
              {paper.year}
            </span>
          )}
          {paper.source_display_name && (
            <span className="ml-2 text-muted-foreground">
              · {paper.source_display_name}
            </span>
          )}
        </p>

        {paper.abstract && (
          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
            {paper.abstract}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1">
            {paper.topics.slice(0, 3).map((t) => (
              <Link key={t.id} href={`/topics/${t.id}`}>
                <Badge variant="secondary" className="text-xs">
                  {t.name}
                </Badge>
              </Link>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            <span>{(paper.cited_by_count ?? 0).toLocaleString()} cited</span>
            {paper.is_open_access && (
              <Badge
                variant="outline"
                className="text-xs border-green-600 text-green-600"
              >
                OA
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
