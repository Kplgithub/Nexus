/**
 * Line drawing of a Rajasthani facade: tiers of scalloped jharokha arches under
 * chhatri domes. Pure SVG in brand colours — decorative, so hidden from
 * assistive technology.
 */
export function JaipurFacade({
  className = '',
  stroke = 'currentColor',
  opacity = 1,
}: {
  className?: string;
  stroke?: string;
  opacity?: number;
}) {
  const W = 640;
  const cols = 8;
  const bay = W / cols; // 80
  const tiers = [
    { y: 446, h: 92 },
    { y: 342, h: 86 },
    { y: 250, h: 74 },
  ];

  // A cusped (multifoil) arch inside one bay.
  const arch = (x: number, y: number, h: number, w: number) => {
    const l = x + (bay - w) / 2;
    const r = l + w;
    const spring = y - h * 0.55;
    const top = y - h;
    const cusp = w / 6;
    return [
      `M${l} ${y}`,
      `L${l} ${spring}`,
      `Q${l} ${spring - cusp} ${l + cusp} ${spring - cusp * 1.2}`,
      `Q${l + cusp * 1.4} ${spring - cusp * 2.6} ${l + w / 2} ${top}`,
      `Q${r - cusp * 1.4} ${spring - cusp * 2.6} ${r - cusp} ${spring - cusp * 1.2}`,
      `Q${r} ${spring - cusp} ${r} ${spring}`,
      `L${r} ${y}`,
    ].join(' ');
  };

  const dome = (cx: number, base: number, w: number) =>
    `M${cx - w / 2} ${base} Q${cx - w / 2} ${base - w * 0.75} ${cx} ${base - w * 0.95} Q${cx + w / 2} ${base - w * 0.75} ${cx + w / 2} ${base} Z M${cx} ${base - w * 0.95} L${cx} ${base - w * 1.25}`;

  return (
    <svg
      viewBox={`0 0 ${W} 450`}
      className={className}
      fill="none"
      stroke={stroke}
      strokeWidth={1.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={opacity}
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMidYMax slice"
    >
      {tiers.map((t, ti) => (
        <g key={ti}>
          {/* cornice */}
          <path d={`M0 ${t.y + 2} H${W}`} />
          <path d={`M0 ${t.y - t.h - 14} H${W}`} strokeDasharray="2 6" />
          {Array.from({ length: cols }, (_, i) => {
            const x = i * bay;
            const w = bay * (ti === 0 ? 0.62 : 0.56);
            return (
              <g key={i}>
                <path d={arch(x, t.y, t.h, w)} />
                <path d={arch(x, t.y, t.h - 12, w - 16)} strokeOpacity={0.55} />
                {/* jharokha brackets */}
                <path d={`M${x + 8} ${t.y} l6 8 h${bay - 28} l6 -8`} strokeOpacity={0.6} />
                {/* jaali dots */}
                {ti === 2 &&
                  [0.35, 0.5, 0.65].map((f) => (
                    <circle
                      key={f}
                      cx={x + bay * f}
                      cy={t.y - t.h * 0.3}
                      r={1.6}
                      strokeOpacity={0.7}
                    />
                  ))}
              </g>
            );
          })}
        </g>
      ))}
      {/* roofline chhatris */}
      <path d={`M0 162 H${W}`} strokeOpacity={0.4} />
      {[1, 3, 5, 7].map((i) => (
        <path key={i} d={dome(i * bay, 162, 38)} />
      ))}
      {[2, 4, 6].map((i) => (
        <path key={i} d={dome(i * bay, 162, 22)} strokeOpacity={0.6} />
      ))}
    </svg>
  );
}
