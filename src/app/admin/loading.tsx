export default function Memuat() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-4" aria-busy="true" aria-live="polite">
      <div className="h-7 w-1/3 animate-pulse rounded-lg bg-muted" />
      <div className="h-24 animate-pulse rounded-2xl bg-muted" />
      <div className="h-24 animate-pulse rounded-2xl bg-muted" />
      <span className="sr-only">Memuat…</span>
    </div>
  );
}
