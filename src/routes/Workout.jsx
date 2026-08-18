import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

import ScreenHeader from '../components/ScreenHeader.jsx';
import ExerciseSheet from '../components/ExerciseSheet.jsx';
import { useDay } from '../hooks/useDay.js';
import { useSettings } from '../state/SettingsContext.jsx';
import * as store from '../data/store.js';
import { exerciseVolume } from '../lib/metrics.js';
import { formatDayLong } from '../lib/dates.js';

export default function Workout() {
  const { date } = useParams();
  const { settings } = useSettings();
  const { day, loading, run } = useDay(date);

  const [sheet, setSheet] = useState(null); // null | 'new' | exercise row id
  const [knownNames, setKnownNames] = useState([]);
  const [notes, setNotes] = useState('');
  const notesLoaded = useRef(false);

  useEffect(() => {
    store.getExerciseNames().then(setKnownNames);
  }, [sheet]);

  // Seed the notes box once, when the day first arrives.
  useEffect(() => {
    if (day && !notesLoaded.current) {
      setNotes(day.workout.notes);
      notesLoaded.current = true;
    }
  }, [day]);

  /**
   * Save notes 700ms after you stop typing rather than on every keystroke.
   * Without the debounce this writes to IndexedDB (and queues a sync) on every
   * single character.
   */
  useEffect(() => {
    if (!notesLoaded.current || !day) return;
    if (notes === day.workout.notes) return;
    const timer = setTimeout(() => {
      run(() => store.setWorkoutNotes(date, notes));
    }, 700);
    return () => clearTimeout(timer);
  }, [notes, day, date, run]);

  if (loading || !day) return <div className="loading">Loading…</div>;

  const exercises = day.workout.exercises;
  const editing = exercises.find((e) => e.id === sheet) ?? null;

  const handleSave = async ({ name, sets }) => {
    if (editing) {
      await run(() => store.updateExercise(date, editing.id, { name, sets }));
    } else {
      await run(() => store.addExercise(date, { name, sets, unit: settings.weightUnit }));
    }
    setSheet(null);
  };

  const handleDelete = async () => {
    await run(() => store.removeExercise(date, editing.id));
    setSheet(null);
  };

  return (
    <div className="screen">
      <ScreenHeader
        title="Workout"
        subtitle={formatDayLong(date)}
        back={`/day/${date}`}
      />

      <div className="body">
        <div className="stack">
          {exercises.length === 0 && (
            <div className="empty">
              Nothing logged yet.
              <br />
              Add an exercise, or just write what you did in the notes below.
            </div>
          )}

          {exercises.map((ex) => (
            <button key={ex.id} className="ex-card" onClick={() => setSheet(ex.id)}>
              <div className="ex-head">
                <b>{ex.name}</b>
                <span className="tnum">
                  {ex.sets.length} set{ex.sets.length === 1 ? '' : 's'}
                  {exerciseVolume(ex) > 0 &&
                    ` · ${exerciseVolume(ex).toLocaleString()} ${ex.unit} vol`}
                </span>
              </div>
              <div className="sets-row">
                {ex.sets.map((s, i) => (
                  <span className="set-chip" key={s.id ?? i}>
                    <b className="tnum">
                      {s.reps}×{s.weight}
                    </b>
                    <span>set {i + 1}</span>
                  </span>
                ))}
              </div>
            </button>
          ))}

          <button className="btn btn-primary" onClick={() => setSheet('new')}>
            + Add exercise
          </button>

          <div className="card">
            <div className="card-label">Notes</div>
            <textarea
              className="notes-area"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How it felt, anything that hurt, what to change next time…"
            />
          </div>
        </div>
      </div>

      {sheet && (
        <ExerciseSheet
          initial={editing}
          knownNames={knownNames}
          unit={settings.weightUnit}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  );
}
