import { useState } from 'react';
import Sheet from './Sheet.jsx';

const blankSet = () => ({ reps: '', weight: '' });

/**
 * Add or edit one exercise: a name, then a row per set.
 *
 * The name field is backed by a <datalist>, which gives a native autocomplete
 * dropdown of exercises you've logged before. That's not a convenience feature
 * — picking "Bench Press" from the list instead of retyping it is what keeps
 * one lift from splitting into three spellings, which is what makes progress
 * charts possible later.
 */
export default function ExerciseSheet({ initial, knownNames, unit, onSave, onDelete, onClose }) {
  const editing = Boolean(initial);
  const [name, setName] = useState(initial?.name ?? '');
  const [sets, setSets] = useState(
    initial?.sets?.length
      ? initial.sets.map((s) => ({ reps: String(s.reps), weight: String(s.weight) }))
      : [blankSet(), blankSet(), blankSet()],
  );

  const updateSet = (index, field, value) =>
    setSets((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));

  const addSet = () => setSets((prev) => [...prev, blankSet()]);

  const removeSet = (index) =>
    setSets((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));

  /**
   * Rows you left blank are dropped rather than saved as 0x0 — the sheet opens
   * with three rows because that's the common case, not because you owe it three.
   */
  const cleanSets = sets
    .map((s) => ({ reps: Number(s.reps) || 0, weight: Number(s.weight) || 0 }))
    .filter((s) => s.reps > 0);

  const canSave = name.trim().length > 0 && cleanSets.length > 0;

  return (
    <Sheet
      title={editing ? 'Edit exercise' : 'Add exercise'}
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
        <label htmlFor="ex-name">Exercise</label>
        <input
          id="ex-name"
          list="known-exercises"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Bench Press"
          autoComplete="off"
          autoCapitalize="words"
        />
        <datalist id="known-exercises">
          {knownNames.map((e) => (
            <option key={e.exerciseId} value={e.name} />
          ))}
        </datalist>
      </div>

      <div className="field">
        <label>Sets</label>
        {sets.map((s, i) => (
          <div className="set-editor-row" key={i}>
            <span className="n">{i + 1}</span>
            <input
              type="number"
              inputMode="numeric"
              placeholder="reps"
              value={s.reps}
              onChange={(e) => updateSet(i, 'reps', e.target.value)}
            />
            <input
              type="number"
              inputMode="decimal"
              placeholder={unit}
              value={s.weight}
              onChange={(e) => updateSet(i, 'weight', e.target.value)}
            />
            <button className="x" onClick={() => removeSet(i)} aria-label={`Remove set ${i + 1}`}>
              ×
            </button>
          </div>
        ))}
        <button className="btn btn-dashed" onClick={addSet} style={{ marginTop: 4 }}>
          + Add set
        </button>
      </div>

      <div className="spacer-sm" />

      <button
        className="btn btn-primary"
        disabled={!canSave}
        onClick={() => onSave({ name: name.trim(), sets: cleanSets })}
      >
        {editing ? 'Save changes' : 'Add exercise'}
      </button>

      <button className="btn btn-ghost" onClick={onClose}>
        Cancel
      </button>
    </Sheet>
  );
}
