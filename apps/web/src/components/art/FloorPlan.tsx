/**
 * Line drawing of a 2BHK floor plan with a "Reviewed by NEXUS team" stamp,
 * used on the login and sign-up pages. Decorative only.
 */
export function FloorPlan({ className = '' }: { className?: string }) {
  return (
    <div className={`relative ${className}`} aria-hidden="true">
      <svg
        viewBox="0 0 520 400"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        className="h-auto w-full"
        focusable="false"
      >
        <rect x="20" y="20" width="480" height="340" strokeWidth={3} />
        <path d="M220 20v130M220 200v160M20 200h120M180 200h140M370 200h130M370 120h130M370 20v100M370 160v40" />
        <path d="M140 200a40 40 0 0 1 40-40" strokeDasharray="3 4" />
        <path d="M220 150a50 50 0 0 1 50 50" strokeDasharray="3 4" />
        <rect x="250" y="250" width="70" height="80" rx="4" strokeOpacity={0.6} />
        <circle cx="90" cy="110" r="30" strokeOpacity={0.5} />
        <rect x="50" y="250" width="120" height="70" rx="6" strokeOpacity={0.5} />
        <rect x="400" y="230" width="70" height="40" rx="3" strokeOpacity={0.5} />
        <path d="M400 40h70v50h-70z" strokeOpacity={0.5} />
        <g
          fontFamily="var(--font-body), sans-serif"
          fontSize="12"
          fill="currentColor"
          stroke="none"
          opacity={0.85}
        >
          <text x="70" y="70">
            LIVING
          </text>
          <text x="260" y="80">
            BEDROOM 1
          </text>
          <text x="390" y="150">
            BATH
          </text>
          <text x="60" y="235">
            KITCHEN
          </text>
          <text x="250" y="240">
            BEDROOM 2
          </text>
          <text x="395" y="220">
            BALCONY
          </text>
        </g>
        <path d="M20 372h480M20 366v12M500 366v12" strokeOpacity={0.6} />
        <text
          x="236"
          y="395"
          fontFamily="var(--font-body), sans-serif"
          fontSize="12"
          fill="currentColor"
          stroke="none"
          opacity={0.7}
        >
          32&apos; – 0&quot;
        </text>
      </svg>
      <div className="auth-stamp">
        Reviewed
        <br />
        by NEXUS
        <br />
        team
      </div>
    </div>
  );
}
