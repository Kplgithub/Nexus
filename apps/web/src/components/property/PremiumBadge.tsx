/** Orange "Premium" pill for posters with an active paid plan. */
export function PremiumBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-accent to-orange-400 px-2 py-0.5 text-[11px] font-bold text-white ${className}`}
    >
      <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor" aria-hidden>
        <path d="m12 2.8 2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4L2.8 9.5l6.4-.8Z" />
      </svg>
      Premium
    </span>
  );
}
