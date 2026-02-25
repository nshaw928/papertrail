import { requireUser } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const { user } = await requireUser();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      <div>
        <p className="text-sm text-muted-foreground">
          Signed in as {user.email}
        </p>
      </div>
    </div>
  );
}
