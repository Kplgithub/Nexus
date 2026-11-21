import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { FloorPlan } from '@/components/art/FloorPlan';
import { AuthMobileHeader } from '@/components/auth/AuthMobileHeader';
import { SessionProvider } from '@/components/session/SessionProvider';
import { BadgeCheckIcon, HeartIcon, InboxIcon } from '@/components/icons';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { robots: { index: false, follow: true } };

const POINTS = [
  { Icon: HeartIcon, text: 'Save homes' },
  { Icon: InboxIcon, text: 'Post free' },
  { Icon: BadgeCheckIcon, text: 'Verified listings' },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <div className="auth-b auth-blueprint min-h-dvh">
        <div className="mx-auto flex min-h-dvh max-w-[1440px] flex-col lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-center lg:gap-14 lg:px-20 lg:py-12">
          <aside className="hidden text-white lg:block">
            <Link
              href="/"
              className="inline-flex rounded-xl bg-white px-3 py-2"
              aria-label="NEXUS Estate home"
            >
              <Image
                src="/brand/nexus-logo.png"
                alt="NEXUS Estate"
                width={48}
                height={40}
                priority
              />
            </Link>
            <p className="mt-14 max-w-[560px] font-display text-[3.25rem] leading-[1.05]">
              Every good home starts with a <em className="text-orange-300">plan.</em>
            </p>
            <FloorPlan className="mt-9 w-full max-w-[440px] text-blue-300" />
            <ul className="mt-8 flex flex-wrap gap-x-7 gap-y-2 text-sm text-slate-300">
              {POINTS.map(({ Icon, text }) => (
                <li key={text} className="flex items-center gap-2">
                  <Icon size={18} className="text-orange-300" />
                  {text}
                </li>
              ))}
            </ul>
          </aside>
          <AuthMobileHeader />
          <main id="main" className="flex flex-1 flex-col lg:block">
            <div className="mb-3 hidden justify-end lg:flex lg:ml-auto lg:max-w-[470px]">
              <Link href="/" className="text-sm font-semibold text-slate-300 hover:text-white">
                ← Back to website
              </Link>
            </div>
            <div className="auth-card flex-1 rounded-t-3xl bg-white px-5 pb-10 pt-7 sm:px-8 lg:ml-auto lg:max-w-[470px] lg:flex-none lg:rounded-[22px] lg:px-10 lg:pb-9 lg:pt-10">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SessionProvider>
  );
}
