import { requireUser } from "@/lib/supabase/server";
import { getUserLab, loadLabCollections } from "@/lib/supabase/labs";
import CreateLabForm from "./create-lab-form";
import LabDashboard from "./lab-dashboard";

export default async function LabPage() {
  const { supabase, user } = await requireUser();
  const lab = await getUserLab(supabase, user.id);

  if (!lab) {
    return (
      <div className="space-y-6 max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight">Lab</h1>
        <p className="text-muted-foreground">
          Create a lab to collaborate with your research group. Share collections,
          see what your colleagues are reading, and manage access.
        </p>
        <CreateLabForm />
      </div>
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
