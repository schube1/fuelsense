/**
 * Run with:  npm test
 *
 * Tests for the pure workout-library helper (no IndexedDB, no React).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildWorkoutLibrary } from './workout.js';

const benchDay = (date, updatedAt, weight) => ({
  date,
  updatedAt,
  workout: {
    title: 'Push Day',
    notes: 'felt good',
    exercises: [{ id: 'ex1', name: 'Bench Press', sets: [{ reps: 5, weight }] }],
  },
});

test('empty history returns empty array', () => {
  assert.deepEqual(buildWorkoutLibrary([]), []);
  assert.deepEqual(buildWorkoutLibrary([{ workout: { title: '', exercises: [] } }]), []);
});

test('untitled days are excluded even with exercises logged', () => {
  const days = [
    { date: '2026-08-01', workout: { title: '', exercises: [{ id: 'e', name: 'Squat', sets: [{ reps: 5, weight: 200 }] }] } },
  ];
  assert.deepEqual(buildWorkoutLibrary(days), []);
});

test('a title with no exercises is excluded', () => {
  const days = [{ date: '2026-08-01', workout: { title: 'Push Day', exercises: [] } }];
  assert.deepEqual(buildWorkoutLibrary(days), []);
});

test('same title across two days: one entry, latest exercises, count 2', () => {
  const days = [
    benchDay('2026-08-01', '2026-08-01T08:00:00Z', 185),
    benchDay('2026-08-10', '2026-08-10T08:00:00Z', 205),
  ];
  const lib = buildWorkoutLibrary(days);
  assert.equal(lib.length, 1);
  assert.equal(lib[0].count, 2);
  assert.equal(lib[0].exercises[0].sets[0].weight, 205);
});

test('title case/whitespace variants collapse to one entry', () => {
  const days = [
    benchDay('2026-08-01', '2026-08-01T08:00:00Z', 185),
    {
      date: '2026-08-02',
      updatedAt: '2026-08-02T08:00:00Z',
      workout: {
        title: '  push  day ',
        exercises: [{ id: 'ex2', name: 'Bench Press', sets: [{ reps: 5, weight: 190 }] }],
      },
    },
  ];
  const lib = buildWorkoutLibrary(days);
  assert.equal(lib.length, 1);
  assert.equal(lib[0].count, 2);
});

test('distinct titles are sorted most-recent-first', () => {
  const days = [
    { date: '2026-08-01', updatedAt: '2026-08-01T08:00:00Z', workout: { title: 'Push Day', exercises: [{ id: 'a', name: 'Bench', sets: [{ reps: 5, weight: 185 }] }] } },
    { date: '2026-08-05', updatedAt: '2026-08-05T08:00:00Z', workout: { title: 'Leg Day', exercises: [{ id: 'b', name: 'Squat', sets: [{ reps: 5, weight: 225 }] }] } },
  ];
  const lib = buildWorkoutLibrary(days);
  assert.equal(lib.length, 2);
  assert.equal(lib[0].title, 'Leg Day');
  assert.equal(lib[1].title, 'Push Day');
});
