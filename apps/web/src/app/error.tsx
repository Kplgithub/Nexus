'use client';

import Link from 'next/link';

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main
      id="main"
      className="container-page grid min-h-[70dvh] place-items-center py-16 text-center"
    >
      <div>
        <h1 className="text-3xl font-bold">Something went wrong</h1>
        <p className="mx-auto mt-3 max-w-md text-ink-soft">
          Please try again. If the problem continues, call us and we’ll help directly.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" className="btn btn-primary" onClick={reset}>
            Try again
          </button>
          <Link href="/" className="btn btn-outline">
            Go to home
          </Link>
          <a href="tel:+919521750202" className="btn btn-ghost">
            Call +91 95217 50202
          </a>
        </div>
      </div>
    </main>
  );
}
