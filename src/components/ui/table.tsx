import type { ComponentProps } from "react";
import { cn } from "./cn";

export function Table({ className, ...props }: ComponentProps<"table">) {
  return (
    <div className="overflow-x-auto">
      <table className={cn("w-full border-collapse text-left text-sm", className)} {...props} />
    </div>
  );
}

export function Th({ className, ...props }: ComponentProps<"th">) {
  return (
    <th
      className={cn(
        "border-b border-border bg-zinc-50/70 px-4 py-2 text-xs font-medium whitespace-nowrap text-ink-subtle first:pl-5 last:pr-5",
        className,
      )}
      {...props}
    />
  );
}

export function Td({ className, ...props }: ComponentProps<"td">) {
  return (
    <td
      className={cn(
        "border-b border-border px-4 py-3 align-middle text-ink first:pl-5 last:pr-5 [tr:last-child_&]:border-b-0",
        className,
      )}
      {...props}
    />
  );
}
