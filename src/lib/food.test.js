/**
 * Run with:  npm test
 *
 * Tests for the pure food-library helpers (no IndexedDB, no React).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { normalizeKey, buildFoodLibrary, filterLibrary } from './food.js';

// ---------------------------------------------------------------- normalizeKey

test('normalizeKey lowercases, trims, and collapses whitespace', () => {
  assert.equal(normalizeKey('  Greek  Yogurt '), 'greek yogurt');
  assert.equal(normalizeKey('CHICKEN BURRITO BOWL'), 'chicken burrito bowl');
  assert.equal(normalizeKey('a\t\tb'), 'a b');
});

// ---------------------------------------------------------------- buildFoodLibrary

test('empty history returns empty array', () => {
  assert.deepEqual(buildFoodLibrary([]), []);
  assert.deepEqual(buildFoodLibrary([{ nutrition: { entries: [] } }]), []);
});

test('same description across two days: one item with later macros, count 2', () => {
  const days = [
    {
      date: '2026-08-01',
      nutrition: {
        entries: [
          { id: 'a', description: 'Greek yogurt + granola', calories: 420, protein: 38, loggedAt: '2026-08-01T08:00:00Z' },
        ],
      },
    },
    {
      date: '2026-08-10',
      nutrition: {
        entries: [
          { id: 'b', description: 'Greek yogurt + granola', calories: 450, protein: 40, loggedAt: '2026-08-10T09:00:00Z' },
        ],
      },
    },
  ];
  const lib = buildFoodLibrary(days);
  assert.equal(lib.length, 1);
  assert.equal(lib[0].calories, 450);
  assert.equal(lib[0].protein, 40);
  assert.equal(lib[0].count, 2);
  assert.equal(lib[0].lastLoggedAt, '2026-08-10T09:00:00Z');
});

test('case and whitespace variants collapse to one item', () => {
  const days = [
    {
      date: '2026-08-01',
      nutrition: {
        entries: [
          { id: 'a', description: 'Greek Yogurt', calories: 150, protein: 10, loggedAt: '2026-08-01T08:00:00Z' },
          { id: 'b', description: '  greek  yogurt  ', calories: 160, protein: 11, loggedAt: '2026-08-01T12:00:00Z' },
        ],
      },
    },
  ];
  const lib = buildFoodLibrary(days);
  assert.equal(lib.length, 1);
  assert.equal(lib[0].count, 2);
  assert.equal(lib[0].calories, 160); // later one wins
});

test('distinct foods are sorted most-recent-first', () => {
  const days = [
    {
      date: '2026-08-01',
      nutrition: {
        entries: [
          { id: 'a', description: 'Oatmeal', calories: 300, protein: 10, loggedAt: '2026-08-01T07:00:00Z' },
          { id: 'b', description: 'Protein shake', calories: 240, protein: 40, loggedAt: '2026-08-01T15:00:00Z' },
        ],
      },
    },
    {
      date: '2026-08-05',
      nutrition: {
        entries: [
          { id: 'c', description: 'Chicken burrito bowl', calories: 760, protein: 52, loggedAt: '2026-08-05T13:00:00Z' },
        ],
      },
    },
  ];
  const lib = buildFoodLibrary(days);
  assert.equal(lib.length, 3);
  assert.equal(lib[0].description, 'Chicken burrito bowl'); // Aug 5 is most recent
  assert.equal(lib[1].description, 'Protein shake');        // Aug 1 15:00
  assert.equal(lib[2].description, 'Oatmeal');              // Aug 1 07:00
});

// ---------------------------------------------------------------- filterLibrary

test('"yogurt granola" matches "Greek yogurt + granola" but not plain "Greek yogurt"', () => {
  const lib = [
    { description: 'Greek yogurt + granola', calories: 420, protein: 38, lastLoggedAt: null, count: 1 },
    { description: 'Greek yogurt', calories: 150, protein: 10, lastLoggedAt: null, count: 1 },
  ];
  const results = filterLibrary(lib, 'yogurt granola');
  assert.equal(results.length, 1);
  assert.equal(results[0].description, 'Greek yogurt + granola');
});

test('filterLibrary is case-insensitive', () => {
  const lib = [
    { description: 'Greek yogurt + granola', calories: 420, protein: 38, lastLoggedAt: null, count: 1 },
  ];
  assert.equal(filterLibrary(lib, 'YOGURT').length, 1);
  assert.equal(filterLibrary(lib, 'Granola').length, 1);
});

test('empty query returns all items', () => {
  const lib = [
    { description: 'Oatmeal', calories: 300, protein: 10, lastLoggedAt: null, count: 1 },
    { description: 'Eggs', calories: 200, protein: 18, lastLoggedAt: null, count: 1 },
  ];
  assert.equal(filterLibrary(lib, '').length, 2);
  assert.equal(filterLibrary(lib, '   ').length, 2);
});
