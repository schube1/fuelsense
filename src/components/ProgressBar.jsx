/** A thin horizontal meter. `pct` is 0..1 and is clamped here. */
export default function ProgressBar({ pct, color }) {
  const width = `${Math.max(0, Math.min(1, pct || 0)) * 100}%`;
  return (
    <div className="bar">
      <i className="bar-fill" style={{ width, background: color }} />
    </div>
  );
}
