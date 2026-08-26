import { normalizeKey } from './food.js';

/**
 * Scan all day records, dedup titled workouts by normalized title (keeping
 * the most recent exercises for each), and return sorted most-recent first.
 *
 * Untitled days never show up here — a title is what makes a workout
 * "recognized" and reusable, the same way a description does for meals.
 *
 * @param {Array} days - raw day records (shape from getAllDays)
 * @returns {Array<{ key, title, exercises, notes, lastLoggedAt, count }>}
 */
export function buildWorkoutLibrary(days) {
  const map = new Map();

  for (const day of days) {
    const title = day.workout?.title?.trim();
    if (!title) continue;
    const exercises = day.workout?.exercises ?? [];
    if (exercises.length === 0) continue;

    const key = normalizeKey(title);
    const existing = map.get(key);
    const loggedAt = day.updatedAt ?? day.date;

    if (!existing) {
      map.set(key, { key, title, exercises, notes: day.workout?.notes ?? '', lastLoggedAt: loggedAt, count: 1 });
    } else {
      existing.count += 1;
      if (!existing.lastLoggedAt || loggedAt > existing.lastLoggedAt) {
        existing.title = title;
        existing.exercises = exercises;
        existing.notes = day.workout?.notes ?? '';
        existing.lastLoggedAt = loggedAt;
      }
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    (b.lastLoggedAt ?? '').localeCompare(a.lastLoggedAt ?? ''),
  );
}
