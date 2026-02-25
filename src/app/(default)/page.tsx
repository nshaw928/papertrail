import SearchForm from "@/components/search-form";

export default function SearchPage() {
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
      <SearchForm />
    </div>
  );
}
