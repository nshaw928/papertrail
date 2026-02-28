import { requireUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserLab } from "@/lib/supabase/labs";
import { notFound } from "next/navigation";
import LabMembers from "../lab-members";

export default async function MembersPage() {
  const { supabase, user } = await requireUser();
  const lab = await getUserLab(supabase, user.id);

  if (!lab) notFound();

  // Fetch members and invitations
  const [{ data: membersData }, { data: invitations }] = await Promise.all([
    supabase
      .from("lab_members")
      .select("user_id, role, invited_email, joined_at")
      .eq("lab_id", lab.lab_id),
    supabase
      .from("lab_invitations")
      .select("id, email, role, created_at, expires_at")
      .eq("lab_id", lab.lab_id),
  ]);

  // Resolve display names for just the lab members (not all platform users)
  const memberIds = (membersData ?? []).map((m) => m.user_id);
  const admin = createAdminClient();

  const userMap = new Map<string, { email: string | null; display_name: string | null }>();
  // Fetch users individually — admin.auth.admin.getUserById is more targeted than listUsers
  await Promise.all(
    memberIds.map(async (id) => {
      try {
        const { data } = await admin.auth.admin.getUserById(id);
        if (data?.user) {
          userMap.set(id, {
            email: data.user.email ?? null,
            display_name:
              data.user.user_metadata?.display_name ??
              data.user.user_metadata?.full_name ??
              null,
          });
        }
      } catch {
        // Skip users that can't be resolved
      }
    })
  );

  const members = (membersData ?? []).map((m) => {
    const authUser = userMap.get(m.user_id);
    return {
      user_id: m.user_id,
      role: m.role,
      email: authUser?.email ?? m.invited_email ?? null,
      display_name: authUser?.display_name ?? null,
      joined_at: m.joined_at,
    };
  });

  return (
    <LabMembers
      lab={{ id: lab.lab_id, name: lab.lab_name, role: lab.role }}
      members={members}
      invitations={invitations ?? []}
      currentUserId={user.id}
    />
  );
}
