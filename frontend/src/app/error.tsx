'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 p-6">
      <div className="max-w-md w-full bg-white dark:bg-zinc-900 border border-red-200 dark:border-red-900/50 rounded-2xl p-8 shadow-lg text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Something went wrong</h2>
        <p className="text-sm text-slate-500 dark:text-zinc-400">
          {error.message || 'An unexpected error occurred. Please try again.'}
        </p>
        {error.digest && (
          <p className="text-xs text-slate-400 dark:text-zinc-600 font-mono">Ref: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="mt-2 px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
