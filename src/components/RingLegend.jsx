import { useNavigate } from 'react-router-dom';

/**
 * The three labelled rows under the rings.
 *
 * This isn't decoration — it's the accessibility requirement. The rings encode
 * three values by colour alone, which fails for anyone with a colour vision
 * deficiency and in bright sunlight. The legend restates every value as text,
 * so colour is never the only channel carrying meaning.
 */
export default function RingLegend({ date, percents, meta }) {
  const navigate = useNavigate();

  const rows = [
    { key: 'workout', color: 'var(--workout)', name: 'Workout', pct: percents.workout, meta: meta.workout },
    { key: 'nutrition', color: 'var(--nutrition)', name: 'Nutrition', pct: percents.nutrition, meta: meta.nutrition },
    { key: 'water', color: 'var(--water)', name: 'Water', pct: percents.water, meta: meta.water },
  ];

  return (
    <div className="legend">
      {rows.map((r) => (
        <button
          key={r.key}
          className="legend-row"
          onClick={() => navigate(`/day/${date}/${r.key}`)}
        >
          <i className="swatch" style={{ background: r.color }} />
          <span className="legend-name">{r.name}</span>
          <span className="legend-meta">{r.meta}</span>
        </button>
      ))}
    </div>
  );
}
