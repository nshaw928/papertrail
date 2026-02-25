import { requireUser } from "@/lib/supabase/server";
import { getUserLab, loadLabCollections } from "@/lib/supabase/labs";
import LabLanding from "./lab-landing";
import LabDashboard from "./lab-dashboard";

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

  // Fetch members and invitations
  const { data: membersData } = await supabase
    .from("lab_members")
    .select("user_id, role, invited_email, joined_at")
    .eq("lab_id", lab.lab_id);

  const { data: invitations } = await supabase
    .from("lab_invitations")
    .select("id, email, role, created_at, expires_at")
    .eq("lab_id", lab.lab_id);

  const sharedCollections = await loadLabCollections(supabase, lab.lab_id);

  return (
    <LabDashboard
      lab={{ id: lab.lab_id, name: lab.lab_name, role: lab.role }}
      members={membersData ?? []}
      invitations={invitations ?? []}
      sharedCollections={sharedCollections}
    />
  );
}
