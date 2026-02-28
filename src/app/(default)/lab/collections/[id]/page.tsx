import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { getUserLab } from "@/lib/supabase/labs";
import { loadWorksWithRelations } from "@/lib/supabase/queries";
import LabCollectionDetail from "./lab-collection-detail";
import { untyped } from "@/lib/supabase/untyped";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function LabCollectionPage({ params }: PageProps) {
  const { id } = await params;
  const { supabase, user } = await requireUser();
  const lab = await getUserLab(supabase, user.id);

  if (!lab) notFound();

  // Fetch collection
  const db = untyped(supabase);
  const { data: collection } = await db
    .from("lab_collections")
    .select("id, name, description, created_by, created_at, lab_id")
    .eq("id", id)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const col = collection as any;
  if (!col || col.lab_id !== lab.lab_id) notFound();

  // Fetch works in collection
  const { data: collectionWorks } = await db
    .from("lab_collection_works")
    .select("work_id, added_by, added_at")
    .eq("lab_collection_id", id)
    .order("added_at", { ascending: false });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const workIds = ((collectionWorks ?? []) as any[]).map((cw: any) => cw.work_id as string);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let papers: any[] = [];
  if (workIds.length > 0) {
    const { data: works } = await supabase
      .from("works")
      .select("*")
      .in("id", workIds);
    papers = await loadWorksWithRelations(supabase, works ?? [], {
      userId: user.id,
    });
  }

  // Fetch contributors
  const { data: contributors } = await db
    .from("lab_collection_contributors")
    .select("user_id")
    .eq("lab_collection_id", id);

  return (
    <LabCollectionDetail
      collection={{
        id: col.id,
        name: col.name,
        description: col.description,
        created_by: col.created_by,
      }}
      papers={papers}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      contributors={((contributors ?? []) as any[]).map((c: any) => c.user_id as string)}
      labId={lab.lab_id}
      userRole={lab.role}
      userId={user.id}
    />
  );
}
