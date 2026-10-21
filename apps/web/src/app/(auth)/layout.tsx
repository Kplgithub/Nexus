import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { JaipurFacade } from '@/components/art/JaipurFacade';
import { SessionProvider } from '@/components/session/SessionProvider';
import { BadgeCheckIcon, HeartIcon, InboxIcon } from '@/components/icons';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { robots: { index: false, follow: true } };

const POINTS = [
  { Icon: HeartIcon, text: 'Save homes and get back to them from any device' },
  { Icon: InboxIcon, text: 'Post your property free and receive enquiries in one place' },
  { Icon: BadgeCheckIcon, text: 'Every listing is reviewed by our team before it goes live' },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <div className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <aside className="relative hidden overflow-hidden bg-brand-900 text-white lg:flex lg:flex-col">
          <Image
            src="/images/hero-skyline.jpg"
            alt=""
            fill
            sizes="40vw"
            className="object-cover opacity-20 mix-blend-luminosity"
            priority
          />
          <JaipurFacade
            className="absolute inset-x-0 bottom-0 h-[55%] w-full text-accent"
            opacity={0.35}
          />
          <div className="relative flex flex-1 flex-col justify-between p-12">
            <Link
              href="/"
              className="inline-flex w-fit rounded-xl bg-white p-3"
              aria-label="NEXUS Estate home"
            >
              <Image src="/brand/nexus-logo.png" alt="NEXUS Estate" width={92} height={76} />
            </Link>
            <div>
              <p className="max-w-md font-display text-[2.5rem] leading-[1.1]">
                One account for buying, renting and listing property.
              </p>
              <ul className="mt-8 space-y-4">
                {POINTS.map(({ Icon, text }) => (
                  <li key={text} className="flex items-start gap-3 text-white/85">
                    <Icon size={20} className="mt-0.5 shrink-0 text-accent" />
                    {text}
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-sm text-white/60">© {new Date().getFullYear()} NEXUS Estate</p>
          </div>
        </aside>
        <main id="main" className="flex flex-col">
          <div className="flex items-center justify-between px-6 py-5 lg:px-12">
            <Link href="/" className="lg:invisible" aria-label="NEXUS Estate home">
              <Image src="/brand/nexus-logo.png" alt="NEXUS Estate" width={64} height={53} />
            </Link>
            <Link href="/" className="text-sm font-medium text-ink-soft hover:text-brand">
              Back to website
            </Link>
          </div>
          <div className="flex flex-1 items-start justify-center px-6 pb-16 pt-4 lg:items-center lg:px-12">
            <div className="w-full max-w-[30rem]">{children}</div>
          </div>
        </main>
      </div>
    </SessionProvider>
  );
}
