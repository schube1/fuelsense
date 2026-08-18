/**
 * The three progress rings.
 *
 * Two layouts:
 *   concentric (default) — nested rings sharing one center, used in the
 *     Timeline mini cells.
 *   row — three thin dial rings side by side, each showing one metric with
 *     its percentage centered inside the ring. Used on the Today screen.
 *
 * How an SVG progress ring works:
 *   - circumference = 2 * PI * radius
 *   - strokeDasharray = circumference → one full lap
 *   - strokeDashoffset = circumference * (1 - pct) → draws `pct` of a lap
 */

const FULL = { radii: [58, 45, 32], stroke: 11 };
const MINI = { radii: [58, 40, 22], stroke: 16 };

const SERIES_META = [
  { key: 'workout',   color: 'var(--workout)',   label: 'Workout'   },
  { key: 'nutrition', color: 'var(--nutrition)', label: 'Nutrition' },
  { key: 'water',     color: 'var(--water)',     label: 'Water'     },
];

// ---------------------------------------------------------------- thin dial ring (row layout)

function DialRing({ color, pct, label, size, showValue }) {
  const r = 44;
  const sw = 6;
  const circumference = 2 * Math.PI * r;
  const clamped  = Math.max(0, Math.min(1, pct || 0));
  const pctInt   = Math.round(clamped * 100);
  const is3Digit = pctInt === 100;

  // Font sizes in viewBox units (viewBox = 0 0 100 100)
  const numSize = is3Digit ? 18 : 22;
  const pctSize = is3Digit ? 11 : 13;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        aria-hidden="true"
      >
        {/* low-contrast track — same stroke width as the arc */}
        <circle
          cx="50" cy="50" r={r}
          fill="none"
          stroke="var(--track)"
          strokeWidth={sw}
          strokeLinecap="round"
        />

        {/* coloured progress arc, starting at 12 o'clock */}
        <g transform="rotate(-90 50 50)">
          {clamped > 0 && (
            <circle
              className="ring-arc"
              cx="50" cy="50" r={r}
              fill="none"
              stroke={color}
              strokeWidth={sw}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - clamped)}
            />
          )}
        </g>

        {/* value shifted slightly below center */}
        {showValue && (
          <text
            x="50"
            y="56"
            textAnchor="middle"
            dominantBaseline="central"
            fill="#f5f5f7"
            fontWeight="800"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            <tspan fontSize={numSize}>{pctInt}</tspan>
            <tspan fontSize={pctSize} dy={-(numSize * 0.18)}>%</tspan>
          </text>
        )}
      </svg>

      {/* muted uppercase caption below */}
      <span
        style={{
          fontSize: Math.max(9, Math.round(size * 0.115)),
          fontWeight: 600,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
        }}
      >
        {label}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------- main export

export default function Rings({ percents, size = 196, mini = false, layout = 'concentric' }) {
  const series = SERIES_META.map((s) => ({ ...s, pct: percents[s.key] }));

  // ---------------------------------------------------------------- row layout (Today screen)

  if (layout === 'row') {
    const ringSize  = Math.floor(size * 0.48);
    const showValue = size >= 80; // drop numbers at small sizes
    const description = series
      .map((s) => `${s.label} ${Math.round(Math.min(s.pct || 0, 1) * 100)}%`)
      .join(', ');

    return (
      <div
        style={{ display: 'flex', justifyContent: 'space-evenly', width: '100%' }}
        role="img"
        aria-label={description}
      >
        {series.map((s) => (
          <DialRing
            key={s.key}
            color={s.color}
            pct={s.pct}
            label={s.label}
            size={ringSize}
            showValue={showValue}
          />
        ))}
      </div>
    );
  }

  // ---------------------------------------------------------------- concentric layout (Timeline mini cells)

  const cfg = mini ? MINI : FULL;
  const description = series
    .map((s) => `${s.label} ${Math.round(Math.min(s.pct || 0, 1) * 100)}%`)
    .join(', ');

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 140 140"
      role="img"
      aria-label={description}
    >
      {series.map((s, i) => (
        <circle
          key={`${s.key}-track`}
          className="ring-track"
          cx="70" cy="70"
          r={cfg.radii[i]}
          strokeWidth={cfg.stroke}
        />
      ))}

      <g transform="rotate(-90 70 70)">
        {series.map((s, i) => {
          const pct = Math.max(0, Math.min(1, s.pct || 0));
          if (pct === 0) return null;
          const circumference = 2 * Math.PI * cfg.radii[i];
          return (
            <circle
              key={s.key}
              className="ring-arc"
              cx="70" cy="70"
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
