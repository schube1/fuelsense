/**
 * Run with:  npm test
 *
 * Tests for the day/settings shape helpers — no IndexedDB, no React.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { emptyDay, normalizeDay, DEFAULT_SETTINGS } from './schema.js';

test('emptyDay falls back to the flat 8-bottle goal with no bodyweight set', () => {
  const day = emptyDay('2026-08-18', DEFAULT_SETTINGS);
  assert.equal(day.goals.bottleGoal, 8);
  assert.equal(day.goals.bottleOz, 16.9);
  assert.equal(day.water.bottleOz, null);
});

test('emptyDay sizes the bottle goal from bodyweight once it is set', () => {
  const settings = { ...DEFAULT_SETTINGS, bodyWeightLb: 180, bottleOz: 20 };
  const day = emptyDay('2026-08-18', settings);
  // target = 180 * 0.67 = 120.6oz ; 120.6 / 20 = 6.03 -> 7 bottles
  assert.equal(day.goals.bottleGoal, 7);
});

test('normalizeDay preserves an explicit "not asked yet" bottle size', () => {
  const stored = {
    date: '2026-08-18',
    goals: { calorieGoal: 2500, proteinGoal: 200, bottleGoal: 8, bottleOz: 16.9 },
    workout: { notes: '', exercises: [] },
    nutrition: { entries: [] },
    water: { count: 1, bottleOz: null },
  };
  const day = normalizeDay(stored, '2026-08-18', DEFAULT_SETTINGS);
  assert.equal(day.water.bottleOz, null);
  assert.equal(day.water.count, 1);
});

test('normalizeDay keeps a real answered bottle size', () => {
  const stored = {
    date: '2026-08-18',
    goals: { calorieGoal: 2500, proteinGoal: 200, bottleGoal: 8, bottleOz: 16.9 },
    workout: { notes: '', exercises: [] },
    nutrition: { entries: [] },
    water: { count: 1, bottleOz: 24 },
  };
  const day = normalizeDay(stored, '2026-08-18', DEFAULT_SETTINGS);
  assert.equal(day.water.bottleOz, 24);
});
