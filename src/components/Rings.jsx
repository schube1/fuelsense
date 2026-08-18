/**
 * The three concentric progress rings.
 *
 * ONE component, used at two sizes — 196px on the Today screen and 34px in each
 * Timeline cell. Because both call the same code with the same percentages from
 * metrics.js, the big rings and the little rings can never disagree.
 *
 * How an SVG progress ring works, since it's non-obvious:
 *   - A circle's outline has a length: circumference = 2 * PI * radius.
 *   - `strokeDasharray = circumference` makes the dash exactly one full lap.
 *   - `strokeDashoffset` slides that dash backwards. At offset 0 you see the
 *     whole lap; at offset = circumference you see none of it.
 *   - So offset = circumference * (1 - percent) draws exactly `percent` of a lap.
 */

const FULL = { radii: [58, 45, 32], stroke: 11 };
const MINI = { radii: [58, 40, 22], stroke: 16 };

export default function Rings({ percents, size = 196, mini = false }) {
  const cfg = mini ? MINI : FULL;

  const series = [
    { key: 'workout', color: 'var(--workout)', label: 'Workout', pct: percents.workout },
    { key: 'nutrition', color: 'var(--nutrition)', label: 'Nutrition', pct: percents.nutrition },
    { key: 'water', color: 'var(--water)', label: 'Water', pct: percents.water },
  ];

  const description = series
    .map((s) => `${s.label} ${Math.round(Math.min(s.pct, 1) * 100)}%`)
    .join(', ');

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 140 140"
      role="img"
      aria-label={description}
    >
      {/* the grey grooves */}
      {series.map((s, i) => (
        <circle
          key={`${s.key}-track`}
          className="ring-track"
          cx="70"
          cy="70"
          r={cfg.radii[i]}
          strokeWidth={cfg.stroke}
        />
      ))}

      {/* the coloured arcs, rotated so 0% starts at 12 o'clock */}
      <g transform="rotate(-90 70 70)">
        {series.map((s, i) => {
          const pct = Math.max(0, Math.min(1, s.pct || 0));
          // At 0% a round line cap would still paint a visible dot, which reads
          // as "a little bit done". Draw nothing instead.
          if (pct === 0) return null;
          const circumference = 2 * Math.PI * cfg.radii[i];
          return (
            <circle
              key={s.key}
              className="ring-arc"
              cx="70"
              cy="70"
              r={cfg.radii[i]}
              strokeWidth={cfg.stroke}
              stroke={s.color}
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - pct)}
            />
          );
        })}
      </g>
    </svg>
  );
}
