"use client";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg space-y-4 py-16">
      <Alert tone="error" title="Something went wrong">
        {error.message || "An unexpected error occurred."}
        {error.digest && <span className="block text-xs opacity-70">Reference: {error.digest}</span>}
      </Alert>
      <Button variant="secondary" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
