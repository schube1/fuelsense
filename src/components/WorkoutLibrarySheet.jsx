import { useEffect, useMemo, useState } from 'react';
import Sheet from './Sheet.jsx';
import * as store from '../data/store.js';
import { filterLibrary } from '../lib/food.js';

/**
 * "Choose from past workouts" — pick a titled routine from history and hand
 * it back via onPick. Mirrors FoodSheet's "Past meals" mode.
 */
export default function WorkoutLibrarySheet({ onPick, onClose }) {
  const [library, setLibrary] = useState(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    store.getWorkoutLibrary().then(setLibrary);
  }, []);

  const filtered = useMemo(() => filterLibrary(library ?? [], query, 'title'), [library, query]);

  return (
    <Sheet title="Past workouts" onClose={onClose}>
      <div className="field">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search…"
          autoFocus
          autoComplete="off"
        />
      </div>

      <div
        style={{
          overflowY: 'auto',
          maxHeight: '55vh',
          marginTop: 4,
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {library === null && <div className="empty">Loading…</div>}

        {library !== null && library.length === 0 && (
          <div className="empty">
            No titled workouts yet — give today's workout a title to save it here.
          </div>
        )}

        {library !== null && library.length > 0 && filtered.length === 0 && (
          <div className="empty">No matches for "{query}"</div>
        )}

        <div className="stack">
          {filtered.map((item) => (
            <button key={item.key} className="meal-row" onClick={() => onPick(item)}>
              <span className="meal-desc">
                {item.title}
                <span>{item.exercises.map((e) => e.name).join(', ')}</span>
              </span>
              <span className="meal-nums">
                <b className="tnum">{item.exercises.length}</b>
                <span style={{ color: 'var(--workout)' }}>
                  {item.count}× done
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  );
}
