'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FloorPlan } from '../art/FloorPlan';

/** Navy header above the form on phones. The login page also gets the headline and plan art. */
export function AuthMobileHeader() {
  const pathname = usePathname();
  const tall = pathname === '/login';
  return (
    <div
      className={`relative overflow-hidden px-5 pt-4 text-white lg:hidden ${tall ? 'h-[230px]' : 'h-[84px]'}`}
    >
      <div className="relative z-10 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex rounded-[10px] bg-white px-2 py-1.5"
          aria-label="NEXUS Estate home"
        >
          <Image src="/brand/nexus-logo.png" alt="NEXUS Estate" width={34} height={28} priority />
        </Link>
        <Link href="/" className="text-[13px] font-semibold text-slate-300 hover:text-white">
          Back to site
        </Link>
      </div>
      {tall && (
        <>
          <div className="absolute -right-[90px] top-[70px] w-[250px] text-blue-300 opacity-30 [&_.auth-stamp]:hidden">
            <FloorPlan />
          </div>
          <p className="relative mt-8 max-w-[230px] font-display text-[30px] leading-[1.1]">
            Every good home starts with a <em className="text-orange-300">plan.</em>
          </p>
        </>
      )}
    </div>
  );
}
