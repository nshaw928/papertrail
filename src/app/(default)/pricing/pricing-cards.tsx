"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PlanType } from "@/lib/types/app";
import { cn } from "@/lib/utils";

interface PricingCardsProps {
  currentPlan: PlanType;
  isLoggedIn: boolean;
}

const tiers = [
  {
    plan: "free" as const,
    name: "Explorer",
    price: "$0",
    period: "forever",
    description: "Discover papers and build your first collection.",
    features: [
      { text: "50 searches/day", included: true },
      { text: "Paper details & metadata", included: true },
      { text: "Basic citation graph (1-hop)", included: true },
      { text: "View existing AI summaries", included: true },
      { text: "Up to 50 saved papers", included: true },
      { text: "1 collection", included: true },
      { text: "On-demand AI summaries", included: false },
      { text: "AI tags & categorization", included: false },
      { text: "Export (BibTeX, CSV)", included: false },
    ],
  },
  {
    plan: "researcher" as const,
    name: "Researcher",
    price: "$8",
    period: "/month",
    yearlyPrice: "$80/year",
    description: "For active researchers, grad students, and postdocs.",
    features: [
      { text: "Unlimited searches", included: true },
      { text: "Paper details & metadata", included: true },
      { text: "Full multi-hop citation graph", included: true },
      { text: "On-demand AI summaries", included: true },
      { text: "AI tags & categorization", included: true },
      { text: "Unlimited saved papers", included: true },
      { text: "Unlimited collections", included: true },
      { text: "Export (BibTeX, CSV)", included: true },
      { text: "Advanced filters", included: true },
    ],
    popular: true,
  },
  {
    plan: "lab" as const,
    name: "Lab",
    price: "$8",
    period: "/member/month",
    yearlyPrice: "$80/member/year",
    description: "For research groups. All Researcher features plus collaboration.",
    features: [
      { text: "Everything in Researcher", included: true },
      { text: "Shared collections", included: true },
      { text: "Pinned lab collections", included: true },
      { text: "Lab library feed", included: true },
      { text: "Member management", included: true },
      { text: "Admin dashboard", included: true },
      { text: "Lab notes on papers", included: true },
    ],
  },
];

export default function PricingCards({
  currentPlan,
  isLoggedIn,
}: PricingCardsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleUpgrade(plan: PlanType) {
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }
    if (plan === "free") return;

    setLoading(plan);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, billing: "monthly" }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError("Could not start checkout. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
      {error && <p className="col-span-full text-sm text-destructive text-center">{error}</p>}
      {tiers.map((tier) => (
        <Card
          key={tier.plan}
          className={cn(tier.popular && "border-primary relative")}
        >
          {tier.popular && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge>Most Popular</Badge>
            </div>
          )}
          <CardHeader>
            <CardTitle className="text-xl">{tier.name}</CardTitle>
            <CardDescription>{tier.description}</CardDescription>
            <div className="pt-2">
              <span className="text-3xl font-bold">{tier.price}</span>
              <span className="text-muted-foreground">{tier.period}</span>
              {tier.yearlyPrice && (
                <p className="text-sm text-muted-foreground mt-1">
                  or {tier.yearlyPrice} (save ~17%)
                </p>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {tier.features.map((feature) => (
                <li key={feature.text} className="flex items-center gap-2 text-sm">
                  {feature.included ? (
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                  ) : (
                    <X className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                  )}
                  <span
                    className={cn(!feature.included && "text-muted-foreground/50")}
                  >
                    {feature.text}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            {currentPlan === tier.plan ? (
              <Button variant="outline" className="w-full" disabled>
                Current Plan
              </Button>
            ) : tier.plan === "free" ? (
              <Button variant="outline" className="w-full" disabled>
                Free
              </Button>
            ) : (
              <Button
                className="w-full"
                onClick={() => handleUpgrade(tier.plan)}
                disabled={loading !== null}
              >
                {loading === tier.plan ? "Loading..." : `Upgrade to ${tier.name}`}
              </Button>
            )}
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
