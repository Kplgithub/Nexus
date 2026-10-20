import Link from 'next/link';
import Image from 'next/image';

export const metadata = { title: 'Page not found', robots: { index: false } };

export default function NotFound() {
  return (
    <main
      id="main"
      className="container-page grid min-h-[80dvh] place-items-center py-16 text-center"
    >
      <div>
        <Link href="/" aria-label="NEXUS Estate home" className="inline-block">
          <Image src="/brand/nexus-logo.png" alt="NEXUS Estate" width={120} height={100} />
        </Link>
        <p className="eyebrow mt-8">Error 404</p>
        <h1 className="mt-2 text-4xl font-bold">We couldn’t find that page</h1>
        <p className="mx-auto mt-3 max-w-md text-ink-soft">
          The property may have been rented out or the link may have changed. Try searching current
          listings instead.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/properties" className="btn btn-primary">
            Browse properties
          </Link>
          <Link href="/" className="btn btn-outline">
            Go to home
          </Link>
          <Link href="/contact" className="btn btn-ghost">
            Contact us
          </Link>
        </div>
      </div>
    </main>
  );
}
