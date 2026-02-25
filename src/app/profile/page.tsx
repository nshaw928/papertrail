import { requireUser } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const { user } = await requireUser();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
      <dl className="space-y-4">
        <div>
          <dt className="text-sm text-muted-foreground">Email</dt>
          <dd className="text-sm">{user.email}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">User ID</dt>
          <dd className="text-sm font-mono">{user.id}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Joined</dt>
          <dd className="text-sm">
            {new Date(user.created_at).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </dd>
        </div>
      </dl>
    </div>
  );
}
