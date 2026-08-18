/**
 * The on-device implementation of the store, backed by IndexedDB.
 *
 * Nothing outside data/ should import this file directly — screens talk to
 * store.js, which is the seam that lets us swap or add a backend later without
 * touching a single component.
 */

import * as idb from '../lib/idb.js';
import {
  DEFAULT_SETTINGS,
  SETTINGS_KEY,
  SYNC_KEY,
  EXERCISES_KEY,
  emptyDay,
  normalizeDay,
} from './schema.js';
import { slugify } from '../lib/id.js';
import { localDateKey } from '../lib/dates.js';

// ---------------------------------------------------------------- settings

export async function getSettings() {
  const row = await idb.get(idb.META, SETTINGS_KEY);
  const merged = { ...DEFAULT_SETTINGS, ...(row?.value ?? {}) };

  // First ever run: stamp today as the start date and persist it, so the
  // Timeline has a floor to stop at instead of scrolling back forever.
  if (!merged.startDate) {
    merged.startDate = localDateKey();
    await idb.put(idb.META, { key: SETTINGS_KEY, value: merged });
  }

  return merged;
}

export async function saveSettings(patch) {
  const next = { ...(await getSettings()), ...patch };
  await idb.put(idb.META, { key: SETTINGS_KEY, value: next });
  return next;
}

// ---------------------------------------------------------------- days

export async function getDay(date) {
  const [row, settings] = await Promise.all([
    idb.get(idb.DAYS, date),
    getSettings(),
  ]);
  return normalizeDay(row, date, settings);
}

/** Inclusive on both ends. Returns a { "2026-08-18": day } map. */
export async function getDaysInRange(from, to) {
  const rows = await idb.getRange(idb.DAYS, from, to);
  const settings = await getSettings();
  const out = {};
  for (const row of rows) out[row.date] = normalizeDay(row, row.date, settings);
  return out;
}

/**
 * Read-modify-write one day.
 *
 * `mutate` receives the current day and returns the next one. Doing it this way
 * (rather than passing a finished object) means callers can't accidentally
 * clobber a field they didn't mean to touch.
 *
 * Every write stamps `updatedAt` and sets `dirty` — that flag is what the sync
 * engine looks for when deciding what to push.
 */
export async function updateDay(date, mutate) {
  const current = await getDay(date);
  const next = mutate(current);
  const record = {
    ...next,
    date,
    updatedAt: new Date().toISOString(),
    dirty: true,
  };
  await idb.put(idb.DAYS, record);
  return record;
}

/** Used by the sync engine when writing a record pulled from the cloud. */
export async function putDayRaw(record) {
  await idb.put(idb.DAYS, record);
  return record;
}

export async function getDirtyDays() {
  const all = await idb.getAll(idb.DAYS);
  return all.filter((d) => d.dirty);
}

export async function clearDirty(dates) {
  const all = await idb.getAll(idb.DAYS);
  const set = new Set(dates);
  const touched = all
    .filter((d) => set.has(d.date))
    .map((d) => ({ ...d, dirty: false }));
  if (touched.length) await idb.putMany(idb.DAYS, touched);
}

export async function getAllDays() {
  const rows = await idb.getAll(idb.DAYS);
  return rows.sort((a, b) => (a.date < b.date ? -1 : 1));
}

/** Oldest date we have anything for — the floor for the timeline's back-scroll. */
export async function getEarliestDate() {
  const rows = await idb.getAll(idb.DAYS);
  if (!rows.length) return null;
  return rows.reduce((min, r) => (r.date < min ? r.date : min), rows[0].date);
}

// ---------------------------------------------------------------- exercises

/**
 * The remembered list of exercise names, so the Add Exercise field can
 * autocomplete. This is what keeps "Bench Press" and "bench press" from
 * becoming two different lifts — you pick the existing one instead of retyping.
 */
export async function getExerciseNames() {
  const row = await idb.get(idb.META, EXERCISES_KEY);
  return row?.value ?? [];
}

export async function rememberExercise(name) {
  const clean = String(name).trim();
  if (!clean) return;
  const list = await getExerciseNames();
  const slug = slugify(clean);
  if (list.some((e) => e.exerciseId === slug)) return;
  const next = [...list, { exerciseId: slug, name: clean }].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  await idb.put(idb.META, { key: EXERCISES_KEY, value: next });
}

// ---------------------------------------------------------------- sync state

export async function getSyncState() {
  const row = await idb.get(idb.META, SYNC_KEY);
  return row?.value ?? { lastPulledAt: null, lastSyncedAt: null, session: null };
}

export async function saveSyncState(patch) {
  const next = { ...(await getSyncState()), ...patch };
  await idb.put(idb.META, { key: SYNC_KEY, value: next });
  return next;
}

// ---------------------------------------------------------------- backup

export async function replaceAll(days, settings) {
  await idb.clear(idb.DAYS);
  if (settings) await saveSettings(settings);
  const records = days.map((d) => ({ ...d, dirty: true }));
  if (records.length) await idb.putMany(idb.DAYS, records);
  return records.length;
}

export { emptyDay };
