import { test } from 'node:test';
import assert from 'node:assert/strict';
import { archiveMatch } from './archiveMatch.js';

const LIBRARY = [
  { key: 'greek yogurt + granola', description: 'Greek yogurt + granola', calories: 420, protein: 38, lastLoggedAt: '2026-08-10T09:00:00Z', count: 3 },
  { key: 'chicken burrito bowl',   description: 'Chicken burrito bowl',   calories: 760, protein: 52, lastLoggedAt: '2026-08-09T13:00:00Z', count: 2 },
  { key: 'protein shake',          description: 'Protein shake',          calories: 240, protein: 40, lastLoggedAt: '2026-08-08T08:00:00Z', count: 5 },
];

test('exact description match returns item', () => {
  const result = archiveMatch('Chicken burrito bowl', LIBRARY);
  assert.ok(result);
  assert.equal(result.description, 'Chicken burrito bowl');
});

test('case-insensitive fuzzy match above threshold returns item', () => {
  const result = archiveMatch('chicken bowl', LIBRARY);
  assert.ok(result);
  assert.equal(result.description, 'Chicken burrito bowl');
});

test('partial word overlap below threshold returns null', () => {
  // "shake" alone shares 1 word with "Protein shake" (1/2 = 0.5 < 0.55)
  // but "protein" alone shares 1/2 = 0.5 as well — should return null
  const result = archiveMatch('shake bowl coffee', LIBRARY);
  // "shake bowl coffee" vs "Protein shake": intersection={shake}=1, union={shake,bowl,coffee,protein}=4 → 0.25
  // "shake bowl coffee" vs "Chicken burrito bowl": intersection={bowl}=1, union={shake,bowl,coffee,chicken,burrito}=5 → 0.2
  // all below 0.55
  assert.equal(result, null);
});

test('below-threshold description returns null', () => {
  const result = archiveMatch('pizza margherita', LIBRARY);
  assert.equal(result, null);
});

test('empty library returns null', () => {
  assert.equal(archiveMatch('anything', []), null);
});

test('empty description returns null', () => {
  assert.equal(archiveMatch('', LIBRARY), null);
  assert.equal(archiveMatch('   ', LIBRARY), null);
});

test('full overlap match (description is a subset of item words)', () => {
  // "yogurt granola" — 2 words, item has 3 words: greek yogurt granola
  // intersection=2, union=3 → 0.667 > 0.55
  const result = archiveMatch('yogurt granola', LIBRARY);
  assert.ok(result);
  assert.equal(result.description, 'Greek yogurt + granola');
});
