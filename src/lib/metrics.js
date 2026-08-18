/**
 * All the ring math, in one place.
 *
 * Every function here is PURE — data in, number out. No React, no storage, no
 * browser APIs. Two reasons that matters:
 *
 *   1. It can be unit-tested with plain Node (see metrics.test.js). This is the
 *      only place in the app where a silent wrong-number bug could hide, so it's
 *      the only place worth testing.
 *   2. The big rings on Today and the tiny rings in the Timeline both call these
 *      functions, so the two can never disagree with each other.
 */

/** Clamp to the 0..1 range, treating null/undefined/NaN as 0. */
export function clamp01(n) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/** Sum up a day's food entries. */
export function nutritionTotals(day) {
  const entries = day?.nutrition?.entries ?? [];
  let calories = 0;
  let protein = 0;
  for (const e of entries) {
    calories += Number(e.calories) || 0;
    protein += Number(e.protein) || 0;
  }
  return { calories, protein };
}

/**
 * WORKOUT — binary. Either you trained or you didn't.
 *
 * Deliberately not volume-based: a "good workout" threshold varies far too much
 * between a heavy leg day and a 20-minute shoulder session, so any number we
 * picked would be arbitrary and would eventually feel wrong.
 */
export function workoutPct(day) {
  const w = day?.workout;
  if (!w) return 0;
  const hasExercise = (w.exercises ?? []).some((e) => (e.sets ?? []).length > 0);
  const hasNotes = (w.notes ?? '').trim().length > 0;
  return hasExercise || hasNotes ? 1 : 0;
}

/**
 * NUTRITION — two goals in different units, combined into one percentage.
 *
 * The trick is to convert each to a FRACTION OF ITS OWN GOAL first. That strips
 * the units off (1940 calories / 2500 calories = 0.776, a plain number), which
 * makes calories and grams comparable. Then we average them.
 *
 *   calPct     = 1940 / 2500 = 0.776
 *   proteinPct =  158 /  200 = 0.790
 *   nutrition  = (0.776 + 0.790) / 2 = 0.783  ->  78%
 *
 * `proteinWeight` lets you decide protein matters more than calories without
 * touching this code — set it in Settings. 0.5 = equal (the current setting),
 * 0.7 = protein is worth 70% of the ring.
 *
 * Overshooting: both metrics clamp at 100%. Eating 2,800 calories still counts
 * as hitting the 2,500 goal — going over does not reduce the ring. The raw
 * numbers on the Nutrition screen do the honest reporting; the ring is a
 * "did you get there" signal.
 */
export function nutritionPct(day, goals, proteinWeight = 0.5) {
  const { calories, protein } = nutritionTotals(day);
  const calPct = clamp01(calories / (goals.calorieGoal || 1));
  const proPct = clamp01(protein / (goals.proteinGoal || 1));
  const w = clamp01(proteinWeight);
  return w * proPct + (1 - w) * calPct;
}

/** WATER — bottles drunk over bottles targeted. */
export function waterPct(day, goals) {
  const count = day?.water?.count ?? 0;
  return clamp01(count / (goals.bottleGoal || 1));
}

/**
 * All three at once — this is what the ring components consume.
 * `goals` is the day's own goals snapshot (see schema.js), NOT current settings,
 * so bumping your protein target next year doesn't retroactively rewrite history.
 */
export function ringPercents(day, goals, proteinWeight = 0.5) {
  return {
    workout: workoutPct(day),
    nutrition: nutritionPct(day, goals, proteinWeight),
    water: waterPct(day, goals),
  };
}

/** The 0-100 headline number: the three rings averaged. */
export function dayScore(day, goals, proteinWeight = 0.5) {
  const p = ringPercents(day, goals, proteinWeight);
  return Math.round(((p.workout + p.nutrition + p.water) / 3) * 100);
}

/** A ring is "closed" at 100% or more. 8/8 bottles and 12/8 bottles both close it. */
export function isClosed(pct) {
  return pct >= 1;
}

/** Total pounds moved for one exercise: sum of reps x weight across its sets. */
export function exerciseVolume(exercise) {
  return (exercise?.sets ?? []).reduce(
    (sum, s) => sum + (Number(s.reps) || 0) * (Number(s.weight) || 0),
    0,
  );
}

/** Total sets logged across a whole day's workout. */
export function totalSets(day) {
  return (day?.workout?.exercises ?? []).reduce(
    (n, e) => n + (e.sets ?? []).length,
    0,
  );
}

/**
 * Has anything at all been logged for this day? Used to decide whether a
 * timeline cell shows empty tracks or real arcs.
 */
export function isEmptyDay(day) {
  if (!day) return true;
  return (
    workoutPct(day) === 0 &&
    (day.nutrition?.entries ?? []).length === 0 &&
    (day.water?.count ?? 0) === 0
  );
}

/** Fluid ounces drunk, for the Water screen's subtitle. */
export function waterOz(day, goals) {
  const count = day?.water?.count ?? 0;
  const oz = day?.water?.bottleOz ?? goals.bottleOz ?? 16.9;
  return Math.round(count * oz * 10) / 10;
}

/**
 * Estimated 1-rep max (Epley formula). Not used in v1 — this is here because
 * it is the thing progress tracking will be built on, and it belongs with the
 * rest of the math. It makes sets at different rep counts comparable:
 * 6 reps at 205 lb and 10 reps at 175 lb are roughly the same strength.
 */
export function estimated1RM(reps, weight) {
  const r = Number(reps) || 0;
  const w = Number(weight) || 0;
  if (r <= 0 || w <= 0) return 0;
  if (r === 1) return w;
  return Math.round(w * (1 + r / 30));
}
