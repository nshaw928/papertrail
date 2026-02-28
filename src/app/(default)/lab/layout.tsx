import { requireUser } from "@/lib/supabase/server";
import { getUserLab } from "@/lib/supabase/labs";
import { LabProvider } from "./lab-context";
import LabSubNav from "./lab-sub-nav";

export default async function LabLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { supabase, user } = await requireUser();
  const lab = await getUserLab(supabase, user.id);

  // If user has no lab, don't render sub-nav — the page.tsx will handle this
  if (!lab) {
    return <>{children}</>;
  }

  return (
    <LabProvider lab={{ id: lab.lab_id, name: lab.lab_name, role: lab.role }}>
      <LabSubNav role={lab.role} />
      <div className="py-6">{children}</div>
    </LabProvider>
  );
}
