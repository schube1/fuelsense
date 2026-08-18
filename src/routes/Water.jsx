import { useParams } from 'react-router-dom';

import ScreenHeader from '../components/ScreenHeader.jsx';
import ProgressBar from '../components/ProgressBar.jsx';
import { useDay } from '../hooks/useDay.js';
import * as store from '../data/store.js';
import { waterPct, waterOz } from '../lib/metrics.js';
import { formatDayLong } from '../lib/dates.js';

export default function Water() {
  const { date } = useParams();
  const { day, loading, run } = useDay(date);

  if (loading || !day) return <div className="loading">Loading…</div>;

  const goal = day.goals.bottleGoal;
  const count = day.water.count;
  const pct = waterPct(day, day.goals);
  const met = count >= goal;
  const remaining = Math.max(0, goal - count);
  const ozLeft = Math.round(remaining * day.water.bottleOz * 10) / 10;

  /**
   * Tapping bottle #5 sets the count to 5. Tapping the last filled bottle sets
   * it back by one, so a mis-tap is fixable without hunting for undo.
   */
  const tapBottle = (index) => {
    const next = index + 1;
    run(() => store.setWaterCount(date, count === next ? next - 1 : next));
  };

  return (
    <div className="screen">
      <ScreenHeader title="Water" subtitle={formatDayLong(date)} back={`/day/${date}`} />

      <div className="body">
        <div className="water-hero">
          <div className="big tnum">
            {count}
            <em> / {goal}</em>
          </div>
          <div className="sub">
            {waterOz(day, day.goals)} of{' '}
            {Math.round(goal * day.water.bottleOz * 10) / 10} fl oz · {day.water.bottleOz} oz
            bottles
          </div>
        </div>

        <div className="spacer-sm" />
        <ProgressBar pct={pct} color="var(--water)" />
        <div className="spacer-md" />

        <div className="bottles">
          {Array.from({ length: goal }, (_, i) => (
            <button
              key={i}
              className={`bottle${i < count ? ' full' : ''}`}
              onClick={() => tapBottle(i)}
              aria-label={`Bottle ${i + 1}${i < count ? ', drunk' : ''}`}
              aria-pressed={i < count}
            >
              <span className="glyph">💧</span>
              <span className="idx tnum">{i + 1}</span>
            </button>
          ))}
        </div>

        {/* Bottles past the goal keep counting — the ring clamps, the count
            doesn't. You should be able to see that you drank ten. */}
        {count > goal && (
          <div className="banner-muted">
            +{count - goal} past the goal ({count} bottles total)
          </div>
        )}

        <div className="spacer-md" />

        <button className="btn btn-water" onClick={() => run(() => store.logWaterBottle(date))}>
          + Log a bottle
        </button>

        <button
          className="btn btn-ghost"
          disabled={count === 0}
          onClick={() => run(() => store.undoWaterBottle(date))}
        >
          Undo last
        </button>

        <div className="spacer-sm" />

        {met ? (
          <div className="banner-good">✓ Water intake met</div>
        ) : (
          <div className="banner-muted">
            {remaining} bottle{remaining === 1 ? '' : 's'} to go · {ozLeft} fl oz left
          </div>
        )}
      </div>
    </div>
  );
}
