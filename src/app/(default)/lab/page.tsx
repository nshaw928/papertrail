import { requireUser } from "@/lib/supabase/server";
import { getUserLab } from "@/lib/supabase/labs";
import LabLanding from "./lab-landing";
import LabDashboardOverview from "./lab-dashboard-overview";
import { untyped } from "@/lib/supabase/untyped";

export default async function LabPage() {
  const { supabase, user } = await requireUser();
  const lab = await getUserLab(supabase, user.id);

  if (!lab) {
    // Fetch pending invitations for this user
    const { data: invitations } = await supabase
      .from("lab_invitations")
      .select("id, lab_id, role")
      .eq("email", user.email!.toLowerCase())
      .gt("expires_at", new Date().toISOString());

    const labIds = [...new Set((invitations ?? []).map((inv) => inv.lab_id))];
    const { data: labs } =
      labIds.length > 0
        ? await supabase.from("labs").select("id, name").in("id", labIds)
        : { data: [] as { id: string; name: string }[] };

    const labMap = new Map((labs ?? []).map((l) => [l.id, l.name]));

    const pendingInvitations = (invitations ?? []).map((inv) => ({
      id: inv.id,
      lab_id: inv.lab_id,
      lab_name: labMap.get(inv.lab_id) ?? "",
      role: inv.role,
    }));

    return (
      <LabLanding
        invitations={pendingInvitations}
        userEmail={user.email ?? ""}
      />
    );
  }

  // Fetch recent announcements and upcoming journal club for dashboard
  const db = untyped(supabase);
  const [announcementsRes, journalClubRes, collectionsRes] = await Promise.all([
    db
      .from("lab_announcements")
      .select("id, user_id, work_id, content, created_at")
      .eq("lab_id", lab.lab_id)
      .order("created_at", { ascending: false })
      .limit(5),
    db
      .from("journal_clubs")
      .select("id, work_id, title, scheduled_at, presenter_id")
      .eq("lab_id", lab.lab_id)
      .gte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(1),
    db
      .from("lab_collections")
      .select("id, name, lab_collection_works(count)")
      .eq("lab_id", lab.lab_id)
      .order("created_at", { ascending: false })
      .limit(4),
  ]);

  // Get member count
  const { count: memberCount } = await supabase
    .from("lab_members")
    .select("*", { count: "exact", head: true })
    .eq("lab_id", lab.lab_id);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const collections = ((collectionsRes.data ?? []) as any[]).map((c: any) => ({
    id: c.id as string,
    name: c.name as string,
    work_count: (c.lab_collection_works as { count: number }[])?.[0]?.count ?? 0,
  }));

  return (
    <LabDashboardOverview
      lab={{ id: lab.lab_id, name: lab.lab_name, role: lab.role }}
      memberCount={memberCount ?? 0}
      recentAnnouncements={(announcementsRes.data ?? []) as {
        id: string;
        user_id: string;
        work_id: string | null;
        content: string;
        created_at: string;
      }[]}
      nextJournalClub={(journalClubRes.data?.[0] ?? null) as {
        id: string;
        work_id: string;
        title: string | null;
        scheduled_at: string;
        presenter_id: string | null;
      } | null}
      collections={collections}
    />
  );
}
