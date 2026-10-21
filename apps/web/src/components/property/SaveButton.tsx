'use client';

import { useSession } from '../session/SessionProvider';
import { HeartIcon } from '../icons';

/** Heart toggle for saving a property. Visitors who aren't signed in are sent to log in. */
export function SaveButton({
  propertyId,
  title,
  variant = 'overlay',
}: {
  propertyId: string;
  title: string;
  variant?: 'overlay' | 'button';
}) {
  const { savedIds, toggleSave } = useSession();
  const saved = savedIds.has(propertyId);
  const label = saved ? `Remove ${title} from saved` : `Save ${title}`;

  if (variant === 'button') {
    return (
      <button
        type="button"
        onClick={() => void toggleSave(propertyId)}
        aria-pressed={saved}
        className={`btn btn-outline ${saved ? 'border-brand text-brand' : ''}`}
      >
        <HeartIcon size={18} filled={saved} />
        {saved ? 'Saved' : 'Save'}
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={saved}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void toggleSave(propertyId);
      }}
      className={`relative z-10 grid size-10 place-items-center rounded-full bg-white/95 shadow-sm transition-colors hover:bg-white ${
        saved ? 'text-[#c2410c]' : 'text-ink-soft hover:text-brand'
      }`}
    >
      <HeartIcon size={19} filled={saved} />
    </button>
  );
}
