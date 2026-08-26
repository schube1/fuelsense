/**
 * The shape of the data, and the defaults.
 */

import { waterTargetOz } from '../lib/metrics.js';

export const SETTINGS_KEY = 'settings';
export const SYNC_KEY = 'sync';
export const EXERCISES_KEY = 'exercises';

export const DEFAULT_SETTINGS = {
  /**
   * The first day the app knows about — set automatically to the day you first
   * open it. The Timeline stops here instead of scrolling back into a past that
   * was never logged. Editable in Settings if you want to backfill earlier.
   */
  startDate: null,
  calorieGoal: 2500,
  proteinGoal: 200,
  /**
   * The last bottle size you told the app, in fl oz. Used both as the prefill
   * default the next time it asks, and as the estimate a brand-new day's
   * bottle goal is computed from before that day's own question is answered.
   */
  bottleOz: 16.9,
  /** Bodyweight in lb, used to size the daily water target. Null until set. */
  bodyWeightLb: null,
  /** On creatine monohydrate? Adds a flat bump to the water target. */
  onCreatine: false,
  /**
   * How much of the nutrition ring protein is worth. 0.5 = equal split with
   * calories, which is what you chose. Bump toward 0.7 if you decide hitting
   * protein matters more than hitting calories.
   */
  proteinWeight: 0.5,
  weightUnit: 'lb',
};

/**
 * A blank day.
 *
 * Note that `goals` is COPIED onto the record. That's deliberate: if you raise
 * your protein goal to 220 next year, last March's rings should still reflect
 * the 200 you were actually chasing at the time — history shouldn't silently
 * rewrite itself.
 */
export function emptyDay(date, settings = DEFAULT_SETTINGS) {
  const bottleOz = settings.bottleOz || DEFAULT_SETTINGS.bottleOz;
  const bottleGoal = Math.max(1, Math.ceil(waterTargetOz(settings) / bottleOz));
  return {
    date,
    goals: {
      calorieGoal: settings.calorieGoal,
      proteinGoal: settings.proteinGoal,
      bottleGoal,
      bottleOz,
    },
    workout: { title: '', notes: '', exercises: [] },
    nutrition: { entries: [] },
    // bottleOz starts unset — the app asks again each day on your first log,
    // since bottle size is the one thing you told us should vary day to day.
    water: { count: 0, bottleOz: null },
    updatedAt: null,
    dirty: false,
  };
}

/**
 * Fill in anything missing on a record read from storage.
 *
 * Cheap insurance: if a future version adds a field, days written by an older
 * version still load without every screen needing null checks.
 */
export function normalizeDay(day, date, settings = DEFAULT_SETTINGS) {
  const base = emptyDay(date, settings);
  if (!day) return base;
  return {
    ...base,
    ...day,
    goals: { ...base.goals, ...(day.goals ?? {}) },
    workout: {
      title: day.workout?.title ?? '',
      notes: day.workout?.notes ?? '',
      exercises: (day.workout?.exercises ?? []).map((e) => ({
        id: e.id,
        exerciseId: e.exerciseId,
        name: e.name ?? '',
        unit: e.unit ?? settings.weightUnit,
        bodyweight: e.bodyweight ?? false,
        sets: (e.sets ?? []).map((s) => ({
          id: s.id,
          reps: Number(s.reps) || 0,
          weight: Number(s.weight) || 0,
        })),
      })),
    },
    nutrition: {
      entries: (day.nutrition?.entries ?? []).map((e) => ({
        id: e.id,
        description: e.description ?? '',
        calories: Number(e.calories) || 0,
        protein: Number(e.protein) || 0,
        loggedAt: e.loggedAt ?? null,
        source: e.source ?? 'manual',
      })),
    },
    water: {
      count: Number(day.water?.count) || 0,
      // `null` here is meaningful — it means "hasn't answered today's bottle
      // size question yet" — so it must survive a read, not get silently
      // replaced by the settings default the way every other field is.
      bottleOz: day.water?.bottleOz == null ? null : Number(day.water.bottleOz) || null,
    },
  };
}

/** Everything the export file contains. Bump `version` if the shape changes. */
export function makeExport(days, settings) {
  return {
    app: 'gym-food-water',
    version: 1,
    exportedAt: new Date().toISOString(),
    settings,
    days,
  };
}
