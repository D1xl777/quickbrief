import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <p className="text-sm font-semibold text-ink">Not found</p>
      <p className="max-w-sm text-sm text-ink-muted">
        This page does not exist, or you do not have access to it.
      </p>
      <ButtonLink href="/dashboard" variant="secondary">
        Back to dashboard
      </ButtonLink>
    </div>
  );
}
