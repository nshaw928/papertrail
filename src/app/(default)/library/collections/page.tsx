import Link from "next/link";
import { FolderOpen } from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import NewCollectionButton from "@/components/new-collection-button";

export default async function CollectionsPage() {
  const { supabase, user } = await requireUser();

  const { data: collections } = await supabase
    .from("collections")
    .select("id, name, created_at, collection_works(count)")
    .eq("user_id", user.id)
    .order("name");

  const collectionsWithCounts = (collections ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    work_count: (c.collection_works as unknown as { count: number }[])?.[0]
      ?.count ?? 0,
  }));

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Collections</h1>
          <p className="text-muted-foreground">
            {collectionsWithCounts.length} collection
            {collectionsWithCounts.length !== 1 ? "s" : ""}
          </p>
        </div>
        <NewCollectionButton />
      </div>

      {collectionsWithCounts.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {collectionsWithCounts.map((c) => (
            <Link key={c.id} href={`/library/collections/${c.id}`}>
              <Card className="transition-colors hover:bg-accent/50">
                <CardContent className="flex items-center gap-3 p-4">
                  <FolderOpen className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{c.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {c.work_count} paper{c.work_count !== 1 ? "s" : ""}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">
          No collections yet. Create one to organize your papers.
        </p>
      )}
    </div>
  );
}
