import Link from "next/link";
import { BookOpen, Shield, Users, Lightbulb } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const values = [
  {
    icon: BookOpen,
    title: "Open Science",
    description:
      "Built on open data sources like OpenAlex. We believe research should be accessible to everyone, not locked behind paywalls.",
  },
  {
    icon: Lightbulb,
    title: "Researcher-First",
    description:
      "Every feature is designed around how researchers actually work — from citation graphs to paper annotations to lab collaboration.",
  },
  {
    icon: Shield,
    title: "Privacy",
    description:
      "Your research interests and saved papers are yours alone. We don't sell data or track your reading habits for advertising.",
  },
  {
    icon: Users,
    title: "Community-Driven",
    description:
      "Papertrail is shaped by its users. Vote on features, submit feedback, and help us build the tool researchers deserve.",
  },
];

export default function AboutPage() {
  return (
    <div className="space-y-8 max-w-3xl">
      <div className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">About Papertrail</h1>
        <p className="text-lg text-muted-foreground">
          Papertrail is a modern research tool that helps you explore, organize,
          and understand academic literature. Search across 250M+ papers, build
          citation graphs, annotate papers, and collaborate with your lab.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {values.map((v) => (
          <Card key={v.title}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <v.icon className="h-4 w-4 text-primary" />
                {v.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{v.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <Button asChild variant="outline">
          <Link href="/feedback">Share Feedback</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/pricing">View Plans</Link>
        </Button>
      </div>
    </div>
  );
}
