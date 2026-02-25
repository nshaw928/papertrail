import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { getUserPlan, getDailyUsage } from "@/lib/supabase/plans";
import { getUserLab } from "@/lib/supabase/labs";
import { PLAN_LIMITS, PLAN_DISPLAY, isPaid } from "@/lib/plans";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import ManageSubscriptionButton from "./manage-subscription-button";
import PasswordResetButton from "@/components/password-reset-button";

export default async function SettingsPage() {
  const { supabase, user } = await requireUser();
  const userPlan = await getUserPlan(supabase, user.id);
  const usage = await getDailyUsage(supabase, user.id);
  const limits = PLAN_LIMITS[userPlan.plan];
  const display = PLAN_DISPLAY[userPlan.plan];
  const lab = await getUserLab(supabase, user.id);

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Email</span>
            <span className="text-sm">{user.email}</span>
          </div>
          {lab && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Lab</span>
              <Link href="/lab" className="text-sm text-primary hover:underline">
                {lab.lab_name}
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Plan</CardTitle>
            <Badge variant={isPaid(userPlan.plan) ? "default" : "secondary"}>
              {display.name}
            </Badge>
          </div>
          <CardDescription>
            {isPaid(userPlan.plan) ? display.price : "Free forever"}
            {userPlan.cancelAtPeriodEnd && userPlan.currentPeriodEnd && (
              <span className="text-destructive">
                {" "}
                &middot; Cancels{" "}
                {new Date(userPlan.currentPeriodEnd).toLocaleDateString()}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isPaid(userPlan.plan) ? (
            <ManageSubscriptionButton />
          ) : (
            <Button asChild>
              <Link href="/pricing">Upgrade</Link>
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
        </CardHeader>
        <CardContent>
          <PasswordResetButton email={user.email!} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usage Today</CardTitle>
          <CardDescription>
            Resets daily at midnight UTC
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <UsageRow
            label="Searches"
            used={usage.search_count}
            limit={limits.searchesPerDay}
          />
          <UsageRow
            label="AI Summaries"
            used={usage.ai_summary_requests}
            limit={limits.aiSummariesOnDemand ? null : 0}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function UsageRow({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number | null;
}) {
  const limitText = limit === null ? "Unlimited" : `${limit}`;
  const percentage =
    limit === null || limit === 0 ? 0 : Math.min((used / limit) * 100, 100);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground">
          {used} / {limitText}
        </span>
      </div>
      {limit !== null && limit > 0 && (
        <div className="h-2 rounded-full bg-secondary">
          <div
            className={`h-full rounded-full transition-all ${
              percentage >= 90 ? "bg-destructive" : "bg-primary"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
}
