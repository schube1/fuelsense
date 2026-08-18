/**
 * Run with:  npm test
 *
 * These use Node's built-in test runner — no extra packages needed. They cover
 * the ring math, which is the one place in the app where a wrong number would
 * be invisible (a broken screen you notice immediately; a ring that's 3% off
 * you never notice at all).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  clamp01,
  nutritionTotals,
  workoutPct,
  nutritionPct,
  waterPct,
  ringPercents,
  dayScore,
  exerciseVolume,
  isEmptyDay,
  estimated1RM,
} from './metrics.js';

import {
  localDateKey,
  parseDateKey,
  addDays,
  daysBetween,
  startOfWeek,
  weekDays,
  groupByWeek,
  isFuture,
  formatDayLong,
  formatWeekLabel,
  dowLabel,
} from './dates.js';

const GOALS = { calorieGoal: 2500, proteinGoal: 200, bottleGoal: 8, bottleOz: 16.9 };

/** The worked example from the architecture doc. */
const SAMPLE_DAY = {
  date: '2026-08-18',
  goals: GOALS,
  workout: {
    notes: 'Felt strong.',
    exercises: [
      {
        id: 'ex_1',
        exerciseId: 'bench-press',
        name: 'Bench Press',
        sets: [
          { reps: 10, weight: 135 },
          { reps: 8, weight: 185 },
          { reps: 6, weight: 205 },
        ],
      },
    ],
  },
  nutrition: {
    entries: [
      { id: 'n1', description: 'Greek yogurt + granola', calories: 420, protein: 38 },
      { id: 'n2', description: 'Chicken burrito bowl', calories: 760, protein: 52 },
      { id: 'n3', description: 'Protein shake', calories: 240, protein: 40 },
      { id: 'n4', description: 'Turkey sandwich', calories: 520, protein: 28 },
    ],
  },
  water: { count: 5, bottleOz: 16.9 },
};

// ---------------------------------------------------------------- clamp01

test('clamp01 pins to 0..1 and survives junk', () => {
  assert.equal(clamp01(0.5), 0.5);
  assert.equal(clamp01(1.4), 1);
  assert.equal(clamp01(-3), 0);
  assert.equal(clamp01(undefined), 0);
  assert.equal(clamp01(NaN), 0);
  assert.equal(clamp01(Infinity), 0);
});

// ---------------------------------------------------------------- nutrition

test('nutritionTotals sums entries', () => {
  assert.deepEqual(nutritionTotals(SAMPLE_DAY), { calories: 1940, protein: 158 });
});

test('nutritionTotals on an empty day is zero, not NaN', () => {
  assert.deepEqual(nutritionTotals({}), { calories: 0, protein: 0 });
});

test('nutritionPct averages the two fractions at 50/50', () => {
  // 1940/2500 = 0.776 ; 158/200 = 0.79 ; average = 0.783
  assert.equal(Math.round(nutritionPct(SAMPLE_DAY, GOALS) * 1000) / 1000, 0.783);
  assert.equal(Math.round(nutritionPct(SAMPLE_DAY, GOALS) * 100), 78);
});

test('nutritionPct honours the protein weighting', () => {
  const p = nutritionPct(SAMPLE_DAY, GOALS, 1);   // protein only
  const c = nutritionPct(SAMPLE_DAY, GOALS, 0);   // calories only
  assert.equal(Math.round(p * 1000) / 1000, 0.79);
  assert.equal(Math.round(c * 1000) / 1000, 0.776);
});

test('going over a goal still counts as reaching it — never more, never less', () => {
  const over = {
    nutrition: { entries: [{ calories: 4000, protein: 400 }] },
  };
  assert.equal(nutritionPct(over, GOALS), 1);
  // and specifically: overshooting calories does not PENALISE the ring
  const overCalsOnly = {
    nutrition: { entries: [{ calories: 4000, protein: 200 }] },
  };
  assert.equal(nutritionPct(overCalsOnly, GOALS), 1);
});

// ---------------------------------------------------------------- workout

test('workoutPct is binary', () => {
  assert.equal(workoutPct(SAMPLE_DAY), 1);
  assert.equal(workoutPct({ workout: { notes: '', exercises: [] } }), 0);
  assert.equal(workoutPct({}), 0);
});

test('notes alone count as a logged workout', () => {
  assert.equal(workoutPct({ workout: { notes: 'easy 3 mile run', exercises: [] } }), 1);
});

test('an exercise with no sets does not count', () => {
  // Guards against a half-filled "Add exercise" sheet closing the ring.
  assert.equal(
    workoutPct({ workout: { notes: '', exercises: [{ name: 'Bench Press', sets: [] }] } }),
    0,
  );
});

// ---------------------------------------------------------------- water

test('waterPct is bottles over goal, clamped', () => {
  assert.equal(waterPct(SAMPLE_DAY, GOALS), 0.625);
  assert.equal(waterPct({ water: { count: 8 } }, GOALS), 1);
  assert.equal(waterPct({ water: { count: 12 } }, GOALS), 1);
  assert.equal(waterPct({}, GOALS), 0);
});

// ---------------------------------------------------------------- combined

test('ringPercents returns all three', () => {
  const p = ringPercents(SAMPLE_DAY, GOALS);
  assert.equal(p.workout, 1);
  assert.equal(p.water, 0.625);
  assert.equal(Math.round(p.nutrition * 100), 78);
});

test('dayScore averages the three rings', () => {
  // (1 + 0.783 + 0.625) / 3 = 0.8027 -> 80
  assert.equal(dayScore(SAMPLE_DAY, GOALS), 80);
});

test('a blank day scores 0 and reads as empty', () => {
  assert.equal(dayScore({}, GOALS), 0);
  assert.equal(isEmptyDay({}), true);
  assert.equal(isEmptyDay(SAMPLE_DAY), false);
});

test('a day with only water logged is not empty', () => {
  assert.equal(isEmptyDay({ water: { count: 1 } }), false);
});

// ---------------------------------------------------------------- lifting

test('exerciseVolume is sum of reps x weight', () => {
  // 10*135 + 8*185 + 6*205 = 1350 + 1480 + 1230 = 4060
  assert.equal(exerciseVolume(SAMPLE_DAY.workout.exercises[0]), 4060);
  assert.equal(exerciseVolume({ sets: [] }), 0);
  assert.equal(exerciseVolume(undefined), 0);
});

test('estimated1RM uses Epley and leaves singles alone', () => {
  assert.equal(estimated1RM(1, 225), 225);
  assert.equal(estimated1RM(6, 205), Math.round(205 * (1 + 6 / 30))); // 246
  assert.equal(estimated1RM(0, 205), 0);
});

// ---------------------------------------------------------------- dates

test('localDateKey uses LOCAL time, not UTC', () => {
  // 11:30pm local on Aug 18. In UTC this is already Aug 19 in the Americas —
  // if this test ever returns '2026-08-19' the app is filing late-night logs
  // under the wrong day.
  const lateNight = new Date(2026, 7, 18, 23, 30, 0);
  assert.equal(localDateKey(lateNight), '2026-08-18');
});

test('parseDateKey round-trips', () => {
  assert.equal(localDateKey(parseDateKey('2026-08-18')), '2026-08-18');
});

test('addDays crosses month and year boundaries', () => {
  assert.equal(addDays('2026-08-18', 1), '2026-08-19');
  assert.equal(addDays('2026-08-31', 1), '2026-09-01');
  assert.equal(addDays('2026-01-01', -1), '2025-12-31');
  assert.equal(addDays('2026-08-18', -7), '2026-08-11');
});

test('daysBetween counts calendar days', () => {
  assert.equal(daysBetween('2026-08-11', '2026-08-18'), 7);
  assert.equal(daysBetween('2026-08-18', '2026-08-11'), -7);
  assert.equal(daysBetween('2026-08-18', '2026-08-18'), 0);
  // Across a US daylight-saving transition (Nov 1 2026), where one day is 25h.
  assert.equal(daysBetween('2026-10-31', '2026-11-02'), 2);
});

test('startOfWeek returns the Monday', () => {
  assert.equal(startOfWeek('2026-08-18'), '2026-08-17'); // Tuesday -> Monday
  assert.equal(startOfWeek('2026-08-17'), '2026-08-17'); // Monday  -> itself
  assert.equal(startOfWeek('2026-08-23'), '2026-08-17'); // Sunday  -> that Monday
});

test('weekDays gives Monday through Sunday', () => {
  assert.deepEqual(weekDays('2026-08-17'), [
    '2026-08-17','2026-08-18','2026-08-19','2026-08-20',
    '2026-08-21','2026-08-22','2026-08-23',
  ]);
});

test('groupByWeek buckets and orders newest first', () => {
  const groups = groupByWeek(['2026-08-11', '2026-08-18', '2026-08-12', '2026-08-04']);
  assert.deepEqual(groups.map((g) => g.weekStart), ['2026-08-17', '2026-08-10', '2026-08-03']);
  assert.deepEqual(groups[1].days, ['2026-08-11', '2026-08-12']);
});

test('isFuture compares against today', () => {
  const now = new Date(2026, 7, 18);
  assert.equal(isFuture('2026-08-19', now), true);
  assert.equal(isFuture('2026-08-18', now), false);
  assert.equal(isFuture('2026-08-17', now), false);
});

test('formatting helpers', () => {
  assert.equal(formatDayLong('2026-08-18'), 'Tue, Aug 18');
  assert.equal(formatWeekLabel('2026-08-17'), 'Week of Aug 17');
  assert.equal(dowLabel('2026-08-18'), 'TUE');
});
