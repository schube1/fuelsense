import { useParams, Link } from 'react-router-dom';

import ScreenHeader from '../components/ScreenHeader.jsx';
import ProgressBar from '../components/ProgressBar.jsx';
import { useDay } from '../hooks/useDay.js';
import { useSettings } from '../state/SettingsContext.jsx';
import {
  ringPercents,
  nutritionTotals,
  dayScore,
  totalSets,
  waterOz,
} from '../lib/metrics.js';
import { formatDayLong, formatWeekLabel, startOfWeek } from '../lib/dates.js';

/** The three destinations for one day, each showing its own headline. */
export default function Day() {
  const { date } = useParams();
  const { settings } = useSettings();
  const { day, loading } = useDay(date);

  if (loading || !day) return <div className="loading">Loading…</div>;

  const percents = ringPercents(day, day.goals, settings.proteinWeight);
  const totals = nutritionTotals(day);
  const score = dayScore(day, day.goals, settings.proteinWeight);
  const sets = totalSets(day);
  const exercises = day.workout.exercises.length;

  const tiles = [
    {
      to: `/day/${date}/workout`,
      icon: '🏋️',
      wash: 'var(--workout-wash)',
      title: 'Workout',
      sub:
        exercises > 0
          ? `${exercises} exercise${exercises === 1 ? '' : 's'} · ${sets} sets`
          : day.workout.notes.trim()
            ? 'Notes only'
            : 'Nothing logged yet',
      badge: percents.workout === 1 ? 'Logged' : null,
      done: percents.workout === 1,
    },
    {
      to: `/day/${date}/nutrition`,
      icon: '🍽️',
      wash: 'var(--nutrition-wash)',
      title: 'Nutrition',
      sub: `${totals.calories.toLocaleString()} / ${day.goals.calorieGoal.toLocaleString()} cal · ${totals.protein} / ${day.goals.proteinGoal} g protein`,
      badge: `${Math.round(percents.nutrition * 100)}%`,
      done: percents.nutrition >= 1,
    },
    {
      to: `/day/${date}/water`,
      icon: '💧',
      wash: 'var(--water-wash)',
      title: 'Water',
      sub: `${day.water.count} of ${day.goals.bottleGoal} bottles · ${waterOz(day, day.goals)} fl oz`,
      badge: `${Math.round(percents.water * 100)}%`,
      done: percents.water >= 1,
    },
  ];

  return (
    <div className="screen">
      <ScreenHeader
        title={formatDayLong(date)}
        subtitle={formatWeekLabel(startOfWeek(date))}
        back="/"
      />
      <div className="body">
        <div className="stack">
          {tiles.map((t) => (
            <Link key={t.title} className="tile" to={t.to}>
              <span className="tile-ic" style={{ background: t.wash }}>
                {t.icon}
              </span>
              <span className="tile-t">
                <b>{t.title}</b>
                <span>{t.sub}</span>
              </span>
              {t.badge && (
                <span className={`pill${t.done ? ' done' : ''}`}>{t.badge}</span>
              )}
            </Link>
          ))}
        </div>

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
      </div>
    </div>
  );
}
