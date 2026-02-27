import { createClient } from "@/lib/supabase/server";
import SearchForm from "@/components/search-form";
import type { SavedSearch } from "@/lib/types/app";

export default async function SearchPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let savedSearches: SavedSearch[] = [];
  if (user) {
    const { data } = await supabase
      .from("saved_searches")
      .select("id, query, from_year, to_year, sort, result_count, cache_id, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);
    savedSearches = (data ?? []) as SavedSearch[];
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Explore Research
        </h1>
        <p className="text-muted-foreground">
          Search across 250M+ academic works. Results are cached for instant
          access.
        </p>
      </div>
      <SearchForm savedSearches={savedSearches} />
    </div>
  );
}
