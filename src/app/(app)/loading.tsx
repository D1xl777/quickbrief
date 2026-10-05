export default function Loading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <div className="h-7 w-56 animate-pulse rounded bg-zinc-200" />
      <div className="h-4 w-80 animate-pulse rounded bg-zinc-200" />
      <div className="grid gap-4 pt-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-zinc-200/70" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-lg bg-zinc-200/70" />
    </div>
  );
}
