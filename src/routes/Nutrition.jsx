import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

import ScreenHeader from '../components/ScreenHeader.jsx';
import FoodSheet from '../components/FoodSheet.jsx';
import ProgressBar from '../components/ProgressBar.jsx';
import { useDay } from '../hooks/useDay.js';
import * as store from '../data/store.js';
import { nutritionTotals, clamp01 } from '../lib/metrics.js';
import { formatDayLong } from '../lib/dates.js';

function timeOf(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export default function Nutrition() {
  const { date } = useParams();
  const [params, setParams] = useSearchParams();
  const { day, loading, run } = useDay(date);

  // Arriving from the home screen's "+ Meal" button opens the sheet directly.
  const [sheet, setSheet] = useState(params.get('add') ? 'new' : null);

  if (loading || !day) return <div className="loading">Loading…</div>;

  const entries = day.nutrition.entries;
  const totals = nutritionTotals(day);
  const editing = entries.find((e) => e.id === sheet) ?? null;

  const calPct = clamp01(totals.calories / day.goals.calorieGoal);
  const proPct = clamp01(totals.protein / day.goals.proteinGoal);
  const overCal = totals.calories > day.goals.calorieGoal;

  const closeSheet = () => {
    setSheet(null);
    if (params.get('add')) {
      params.delete('add');
      setParams(params, { replace: true });
    }
  };

  const handleSave = async (values) => {
    if (editing) {
      await run(() => store.updateFood(date, editing.id, values));
    } else {
      await run(() => store.addFood(date, values));
    }
    closeSheet();
  };

  const handleDelete = async () => {
    await run(() => store.removeFood(date, editing.id));
    closeSheet();
  };

  return (
    <div className="screen">
      <ScreenHeader
        title="Nutrition"
        subtitle={formatDayLong(date)}
        back={`/day/${date}`}
      />

      <div className="body">
        <div className="goal-row">
          <div className="goal-card">
            <div className="card-label">Calories</div>
            <div className="goal-big tnum">
              {totals.calories.toLocaleString()}
              <em> / {day.goals.calorieGoal.toLocaleString()}</em>
            </div>
            <ProgressBar pct={calPct} color="var(--nutrition)" />
            {/* Going over still counts as hitting the goal — the ring stays
                full. This chip is the honest reporting the ring doesn't do. */}
            {overCal && (
              <span className="over-chip">
                +{(totals.calories - day.goals.calorieGoal).toLocaleString()} over
              </span>
            )}
          </div>

          <div className="goal-card">
            <div className="card-label">Protein</div>
            <div className="goal-big tnum">
              {totals.protein}
              <em> / {day.goals.proteinGoal} g</em>
            </div>
            <ProgressBar pct={proPct} color="var(--nutrition)" />
          </div>
        </div>

        <div className="stack">
          {entries.length === 0 && (
            <div className="empty">Nothing logged yet today.</div>
          )}

          {entries.map((e) => (
            <button key={e.id} className="meal-row" onClick={() => setSheet(e.id)}>
              <span className="meal-desc">
                {e.description}
                {timeOf(e.loggedAt) && <span>{timeOf(e.loggedAt)}</span>}
              </span>
              <span className="meal-nums">
                <b className="tnum">{e.calories.toLocaleString()}</b>
                <span className="tnum">{e.protein} g</span>
              </span>
            </button>
          ))}

          <button className="btn btn-dashed" onClick={() => setSheet('new')}>
            + Add entry
          </button>
        </div>
      </div>

      {sheet && (
        <FoodSheet
          initial={editing}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={closeSheet}
        />
      )}
    </div>
  );
}
