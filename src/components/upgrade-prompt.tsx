"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface UpgradePromptProps {
  message: string;
  className?: string;
}

export default function UpgradePrompt({ message, className }: UpgradePromptProps) {
  return (
    <div
      className={cn("flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3", className)}
    >
      <p className="text-sm flex-1">{message}</p>
      <Button size="sm" asChild>
        <Link href="/pricing">Upgrade</Link>
      </Button>
    </div>
  );
}
