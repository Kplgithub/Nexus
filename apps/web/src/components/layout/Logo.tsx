import Image from 'next/image';
import Link from 'next/link';

/** The supplied NEXUS logo, unaltered (trimmed of surrounding whitespace only). Intrinsic size 900×746. */
export function Logo({
  height = 56,
  priority = false,
  className = '',
}: {
  height?: number;
  priority?: boolean;
  className?: string;
}) {
  const width = Math.round((height * 900) / 746);
  return (
    <Link href="/" aria-label="NEXUS Estate — home" className={`inline-flex shrink-0 ${className}`}>
      <Image
        src="/brand/nexus-logo.png"
        alt="NEXUS Estate | Rentals | Properties"
        width={width}
        height={height}
        priority={priority}
        sizes={`${width}px`}
      />
    </Link>
  );
}
