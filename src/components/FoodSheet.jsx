import { useEffect, useMemo, useState } from 'react';
import Sheet from './Sheet.jsx';
import * as store from '../data/store.js';
import { filterLibrary } from '../lib/food.js';

/**
 * Add or edit one food entry.
 *
 * `draft` — optional pre-filled values from SmartAddSheet or "Choose from past meals".
 *            Only applied when creating a new entry (not when editing an existing one).
 * `onOpenSmart` — called when the user taps "✨ Describe / Scan".
 */
export default function FoodSheet({ initial, draft, onSave, onDelete, onClose, onOpenSmart }) {
  const editing = Boolean(initial);
  const [description, setDescription] = useState(draft?.description ?? initial?.description ?? '');
  const [calories, setCalories] = useState(
    draft ? String(draft.calories) : initial ? String(initial.calories) : '',
  );
  const [protein, setProtein] = useState(
    draft ? String(draft.protein) : initial ? String(initial.protein) : '',
  );
  const [source, setSource] = useState(draft?.source ?? 'manual');

  const [mode, setMode] = useState('form'); // 'form' | 'library'
  const [library, setLibrary] = useState(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (mode === 'library' && library === null) {
      store.getFoodLibrary().then(setLibrary);
    }
  }, [mode, library]);

  const filtered = useMemo(() => filterLibrary(library ?? [], query), [library, query]);

  const canSave = description.trim().length > 0;

  function pickItem(item) {
    setDescription(item.description);
    setCalories(String(item.calories));
    setProtein(String(item.protein));
    setSource('library');
    setMode('form');
  }

  if (mode === 'library') {
    return (
      <Sheet
        title="Past meals"
        onClose={onClose}
        action={
          <button
            className="btn-ghost"
            style={{ fontSize: 13 }}
            onClick={() => setMode('form')}
          >
            ← Back
          </button>
        }
      >
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
          {library === null && (
            <div className="empty">Loading…</div>
          )}

          {library !== null && library.length === 0 && (
            <div className="empty">
              No meals logged yet — add one manually!
            </div>
          )}

          {library !== null && library.length > 0 && filtered.length === 0 && (
            <div className="empty">No matches for "{query}"</div>
          )}

          <div className="stack">
            {filtered.map((item) => (
              <button
                key={item.key}
                className="meal-row"
                onClick={() => pickItem(item)}
              >
                <span className="meal-desc">{item.description}</span>
                <span className="meal-nums">
                  <b className="tnum">{item.calories.toLocaleString()}</b>
                  <span className="tnum">{item.protein} g</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet
      title={editing ? 'Edit entry' : 'Add entry'}
      onClose={onClose}
      action={
        editing ? (
          <button className="btn-danger" style={{ fontSize: 13 }} onClick={onDelete}>
            Delete
          </button>
        ) : null
      }
    >
      <div className="field">
        <label htmlFor="food-desc">Description</label>
        <input
          id="food-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Chicken burrito bowl"
          autoComplete="off"
        />
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="food-cal">Calories</label>
          <input
            id="food-cal"
            type="number"
            inputMode="numeric"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            placeholder="0"
          />
        </div>
        <div className="field">
          <label htmlFor="food-pro">Protein (g)</label>
          <input
            id="food-pro"
            type="number"
            inputMode="numeric"
            value={protein}
            onChange={(e) => setProtein(e.target.value)}
            placeholder="0"
          />
        </div>
      </div>

      <div className="spacer-sm" />

      <button
        className="btn btn-food"
        disabled={!canSave}
        onClick={() =>
          onSave({
            description: description.trim(),
            calories: Number(calories) || 0,
            protein: Number(protein) || 0,
            source,
          })
        }
      >
        {editing ? 'Save changes' : 'Add entry'}
      </button>

      {!editing && onOpenSmart && (
        <button className="btn btn-ghost" onClick={onOpenSmart}>
          ✨ Describe / Scan
        </button>
      )}

      {!editing && (
        <button className="btn btn-ghost" onClick={() => setMode('library')}>
          Choose from past meals
        </button>
      )}

      <button className="btn btn-ghost" onClick={onClose}>
        Cancel
      </button>
    </Sheet>
  );
}
