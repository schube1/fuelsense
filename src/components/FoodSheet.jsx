import { useState } from 'react';
import Sheet from './Sheet.jsx';

/** Add or edit one food entry: description, calories, protein. Nothing else. */
export default function FoodSheet({ initial, onSave, onDelete, onClose }) {
  const editing = Boolean(initial);
  const [description, setDescription] = useState(initial?.description ?? '');
  const [calories, setCalories] = useState(
    initial ? String(initial.calories) : '',
  );
  const [protein, setProtein] = useState(initial ? String(initial.protein) : '');

  const canSave = description.trim().length > 0;

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
          })
        }
      >
        {editing ? 'Save changes' : 'Add entry'}
      </button>

      <button className="btn btn-ghost" onClick={onClose}>
        Cancel
      </button>
    </Sheet>
  );
}
