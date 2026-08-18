/**
 * THE SEAM.
 *
 * This is the only storage module the rest of the app is allowed to import.
 * Every screen calls these functions and has no idea whether the data landed in
 * IndexedDB, Postgres, or a text file. That indirection is what makes the
 * "start local, add cloud sync later" plan an afternoon of work instead of a
 * rewrite — the cloud lives behind these same function names.
 *
 * Two layers live here:
 *   - thin passthroughs to localStore (getDay, getSettings, ...)
 *   - domain operations (addExercise, logWaterBottle, ...) so that screens
 *     never hand-edit the nested day object and can't get its shape wrong.
 */

import * as local from './localStore.js';
import { scheduleSync } from './sync.js';
import { uid, slugify } from '../lib/id.js';
import { makeExport, DEFAULT_SETTINGS } from './schema.js';

/**
 * Wrap a write so that (a) it goes to the device immediately and (b) a
 * background sync gets queued. Callers just await and move on.
 */
async function write(date, mutate) {
  const record = await local.updateDay(date, mutate);
  scheduleSync();
  return record;
}

// ---------------------------------------------------------------- reads

export const getDay = local.getDay;
export const getDaysInRange = local.getDaysInRange;
export const getAllDays = local.getAllDays;
export const getEarliestDate = local.getEarliestDate;
export const getExerciseNames = local.getExerciseNames;
export const getSettings = local.getSettings;
export const getFoodLibrary = local.getFoodLibrary;

export async function saveSettings(patch) {
  const next = await local.saveSettings(patch);
  scheduleSync();
  return next;
}

// ---------------------------------------------------------------- workout

export function setWorkoutNotes(date, notes) {
  return write(date, (day) => ({
    ...day,
    workout: { ...day.workout, notes },
  }));
}

/** `sets` is [{ reps, weight }] — at least one, or the ring won't count it. */
export async function addExercise(date, { name, sets, unit = 'lb', bodyweight = false }) {
  await local.rememberExercise(name);
  return write(date, (day) => ({
    ...day,
    workout: {
      ...day.workout,
      exercises: [
        ...day.workout.exercises,
        {
          id: uid('ex'),
          exerciseId: slugify(name),   // the stable identity future charts need
          name: name.trim(),
          unit,
          bodyweight,
          sets: sets.map((s) => ({
            id: uid('set'),
            reps: Number(s.reps) || 0,
            weight: Number(s.weight) || 0,
          })),
        },
      ],
    },
  }));
}

export async function updateExercise(date, exerciseRowId, patch) {
  if (patch.name) await local.rememberExercise(patch.name);
  return write(date, (day) => ({
    ...day,
    workout: {
      ...day.workout,
      exercises: day.workout.exercises.map((e) =>
        e.id !== exerciseRowId
          ? e
          : {
              ...e,
              ...patch,
              // Keep the slug in step with a renamed exercise.
              exerciseId: patch.name ? slugify(patch.name) : e.exerciseId,
              sets: (patch.sets ?? e.sets).map((s) => ({
                id: s.id ?? uid('set'),
                reps: Number(s.reps) || 0,
                weight: Number(s.weight) || 0,
              })),
            },
      ),
    },
  }));
}

export function removeExercise(date, exerciseRowId) {
  return write(date, (day) => ({
    ...day,
    workout: {
      ...day.workout,
      exercises: day.workout.exercises.filter((e) => e.id !== exerciseRowId),
    },
  }));
}

// ---------------------------------------------------------------- nutrition

export function addFood(date, { description, calories, protein, source }) {
  return write(date, (day) => ({
    ...day,
    nutrition: {
      entries: [
        ...day.nutrition.entries,
        {
          id: uid('food'),
          description: description.trim(),
          calories: Number(calories) || 0,
          protein: Number(protein) || 0,
          loggedAt: new Date().toISOString(),
          ...(source ? { source } : {}),
        },
      ],
    },
  }));
}

export function updateFood(date, entryId, patch) {
  return write(date, (day) => ({
    ...day,
    nutrition: {
      entries: day.nutrition.entries.map((e) =>
        e.id !== entryId
          ? e
          : {
              ...e,
              ...patch,
              calories: Number(patch.calories ?? e.calories) || 0,
              protein: Number(patch.protein ?? e.protein) || 0,
            },
      ),
    },
  }));
}

export function removeFood(date, entryId) {
  return write(date, (day) => ({
    ...day,
    nutrition: { entries: day.nutrition.entries.filter((e) => e.id !== entryId) },
  }));
}

// ---------------------------------------------------------------- water

/** Set the count outright — used when you tap a specific bottle in the grid. */
export function setWaterCount(date, count) {
  return write(date, (day) => ({
    ...day,
    water: { ...day.water, count: Math.max(0, Math.round(count)) },
  }));
}

export function logWaterBottle(date) {
  return write(date, (day) => ({
    ...day,
    // No upper clamp: bottles 9 and 10 keep counting. The RING clamps at the
    // goal, the COUNT does not — you should be able to see you drank 10.
    water: { ...day.water, count: (day.water.count ?? 0) + 1 },
  }));
}

export function undoWaterBottle(date) {
  return write(date, (day) => ({
    ...day,
    water: { ...day.water, count: Math.max(0, (day.water.count ?? 0) - 1) },
  }));
}

// ---------------------------------------------------------------- backup

/** Everything, as a JSON string. This is your insurance policy — use it. */
export async function exportAll() {
  const [days, settings] = await Promise.all([local.getAllDays(), local.getSettings()]);
  const clean = days.map(({ dirty, ...rest }) => rest);
  return JSON.stringify(makeExport(clean, settings), null, 2);
}

export async function importAll(jsonText) {
  const parsed = JSON.parse(jsonText);
  if (parsed.app !== 'gym-food-water') {
    throw new Error("This doesn't look like a Gym Food Water backup.");
  }
  const days = parsed.days ?? [];
  const settings = { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) };

  // Pull the start date back if the backup contains days older than it,
  // otherwise the Timeline would refuse to scroll to data you just restored.
  settings.startDate = days.reduce(
    (earliest, d) => (!earliest || d.date < earliest ? d.date : earliest),
    settings.startDate ?? null,
  );

  const count = await local.replaceAll(days, settings);
  scheduleSync();
  return count;
}
