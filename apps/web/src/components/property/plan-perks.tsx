/** Small pieces a poster's plan adds to their listing cards. */

const DAY = 86_400_000;

/** "Updated today" when the plan moved the listing back to the top after it was posted. */
export function refreshedLabel(refreshedAt: string | null, publishedAt: string | null) {
  if (!refreshedAt || !publishedAt) return null;
  const r = new Date(refreshedAt).getTime();
  if (r - new Date(publishedAt).getTime() < DAY) return null;
  const days = Math.floor((Date.now() - r) / DAY);
  if (days < 1) return 'Updated today';
  if (days === 1) return 'Updated yesterday';
  return `Updated ${days} days ago`;
}

export function PartnerBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-brand-900 px-2.5 py-1 text-xs font-semibold text-white shadow-sm ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        width="13"
        height="13"
        fill="none"
        stroke="#fbbf24"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M12 2.5 14.6 4.4 17.8 4.3 18.8 7.3 21.4 9.2 20.4 12.2 21.4 15.2 18.8 17.1 17.8 20.1 14.6 20 12 21.9 9.4 20 6.2 20.1 5.2 17.1 2.6 15.2 3.6 12.2 2.6 9.2 5.2 7.3 6.2 4.3 9.4 4.4z" />
        <path d="m8.5 12 2.5 2.5 4.5-5" />
      </svg>
      Premium Partner
    </span>
  );
}

export function RefreshedChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-success-50 px-2 py-0.5 text-xs font-semibold text-success">
      <svg
        viewBox="0 0 24 24"
        width="12"
        height="12"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M20 11a8 8 0 0 0-14.8-4M4 5v4h4M4 13a8 8 0 0 0 14.8 4M20 19v-4h-4" />
      </svg>
      {label}
    </span>
  );
}
