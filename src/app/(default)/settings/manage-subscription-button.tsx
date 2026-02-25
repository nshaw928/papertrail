"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function ManageSubscriptionButton() {
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError("Could not open subscription portal.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Button variant="outline" onClick={handleClick} disabled={loading}>
        {loading ? "Loading..." : "Manage Subscription"}
      </Button>
      {error && <p className="text-sm text-destructive mt-2">{error}</p>}
    </div>
  );
}
