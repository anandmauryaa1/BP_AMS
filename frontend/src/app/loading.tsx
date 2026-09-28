export default function GlobalLoading() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-zinc-950">
      {/* Navbar skeleton */}
      <div className="h-14 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 animate-pulse" />
      {/* Sub-nav skeleton */}
      <div className="h-10 bg-white dark:bg-zinc-900/60 border-b border-slate-100 dark:border-zinc-800 animate-pulse" />
      {/* Content skeleton */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <div className="h-8 w-48 bg-slate-200 dark:bg-zinc-800 rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-white dark:bg-zinc-900/50 rounded-xl border border-slate-200 dark:border-zinc-800 animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-white dark:bg-zinc-900/50 rounded-xl border border-slate-200 dark:border-zinc-800 animate-pulse" />
      </main>
    </div>
  );
}
