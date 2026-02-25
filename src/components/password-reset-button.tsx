"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

interface PasswordResetButtonProps {
  email: string;
}

export default function PasswordResetButton({ email }: PasswordResetButtonProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleReset() {
    setStatus("loading");
    const supabase = createClient();

    const redirectTo = `${window.location.origin}/settings/reset-callback`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      setStatus("error");
      setMessage("Failed to send reset email. Please try again.");
    } else {
      setStatus("sent");
      setMessage("Password reset email sent. Check your inbox.");
    }
  }

  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        onClick={handleReset}
        disabled={status === "loading" || status === "sent"}
      >
        <KeyRound className="mr-2 h-4 w-4" />
        {status === "loading" ? "Sending..." : "Reset Password"}
      </Button>
      {message && (
        <p
          className={`text-sm ${
            status === "error" ? "text-destructive" : "text-muted-foreground"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
