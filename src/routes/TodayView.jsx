import { useNavigate } from 'react-router-dom';

import Rings from '../components/Rings.jsx';
import RingLegend from '../components/RingLegend.jsx';
import ProgressBar from '../components/ProgressBar.jsx';
import { useDay } from '../hooks/useDay.js';
import { useSettings } from '../state/SettingsContext.jsx';
import * as store from '../data/store.js';
import {
  ringPercents,
  nutritionTotals,
  dayScore,
  totalSets,
} from '../lib/metrics.js';

export default function TodayView({ date }) {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { day, loading, run } = useDay(date);

  if (loading || !day) return <div className="loading">Loading…</div>;

  const percents = ringPercents(day, day.goals, settings.proteinWeight);
  const totals = nutritionTotals(day);
  const score = dayScore(day, day.goals, settings.proteinWeight);
  const sets = totalSets(day);

  const meta = {
    workout:
      day.workout.exercises.length > 0
        ? `${day.workout.exercises.length} exercise${day.workout.exercises.length === 1 ? '' : 's'} · ${sets} sets`
        : day.workout.notes.trim()
          ? 'Notes logged'
          : 'Not logged',
    nutrition: `${totals.calories.toLocaleString()} cal · ${totals.protein} g`,
    water: `${day.water.count} of ${day.goals.bottleGoal} bottles`,
  };

  return (
    <div className="body">
      <div className="rings-wrap">
        <Rings percents={percents} size={200} layout="row" />
      </div>

      <RingLegend date={date} percents={percents} meta={meta} />

      <div className="spacer-md" />

      <div className="card">
        <div className="card-label">Day score</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
          <span
            className="tnum"
            style={{ fontSize: 32, fontWeight: 670, letterSpacing: '-0.03em' }}
          >
            {score}
          </span>
          <span style={{ color: 'var(--muted)', fontSize: 12 }}>
            / 100 · average of the three rings
          </span>
        </div>
        <ProgressBar
          pct={score / 100}
          color="linear-gradient(90deg, var(--workout), var(--nutrition) 55%, var(--water))"
        />
      </div>

      <div className="spacer-md" />

      {/* Quick add: the two things you log most often, one tap from the home
          screen. Water increments in place; food needs a form, so it navigates. */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          className="btn btn-water"
          onClick={() => run(() => store.logWaterBottle(date))}
        >
          + Water
        </button>
        <button
          className="btn btn-food"
          onClick={() => navigate(`/day/${date}/nutrition?add=1`)}
        >
          + Meal
        </button>
      </div>

      <div className="spacer-sm" />

      <button className="btn btn-ghost" onClick={() => navigate(`/day/${date}`)}>
        Open today in full
      </button>
    </div>
  );
}
