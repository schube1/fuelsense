/**
 * Date handling.
 *
 * THE ONE RULE: a day is identified by a "date key" — the string "2026-08-18" —
 * derived from LOCAL time, never UTC.
 *
 * If you use `new Date().toISOString().slice(0,10)` instead, then anything you
 * log after 5pm Pacific gets filed under tomorrow, because UTC is 7 hours ahead.
 * That bug is silent, it only shows up in the evening, and it corrupts history.
 * `toLocaleDateString('en-CA')` gives us YYYY-MM-DD in the user's own timezone,
 * which is exactly what we want.
 *
 * Every function here is pure: same input, same output, no side effects, no
 * browser APIs. That is why they can be unit-tested with plain Node.
 */

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

/** Today (or any Date) as a local "YYYY-MM-DD" key. */
export function localDateKey(date = new Date()) {
  return date.toLocaleDateString('en-CA');
}

/**
 * Turn "2026-08-18" back into a Date at LOCAL midnight.
 * Note we build it with (year, monthIndex, day) rather than `new Date(str)` —
 * passing a bare "2026-08-18" string to the Date constructor parses it as UTC,
 * which lands on the previous evening in any negative-offset timezone.
 */
export function parseDateKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Shift a date key by n days (n may be negative). */
export function addDays(key, n) {
  const d = parseDateKey(key);
  d.setDate(d.getDate() + n);
  return localDateKey(d);
}

/** How many days from a to b (b - a). Positive means b is later. */
export function daysBetween(a, b) {
  const MS = 24 * 60 * 60 * 1000;
  // Round because a DST transition makes one day 23 or 25 hours long.
  return Math.round((parseDateKey(b) - parseDateKey(a)) / MS);
}

/** Monday of the week containing this date key. */
export function startOfWeek(key) {
  const d = parseDateKey(key);
  const dow = d.getDay();           // 0 = Sunday
  const backToMonday = (dow + 6) % 7; // Sunday -> 6, Monday -> 0, Tuesday -> 1 ...
  d.setDate(d.getDate() - backToMonday);
  return localDateKey(d);
}

/** The 7 date keys of the week starting at this Monday. */
export function weekDays(mondayKey) {
  return Array.from({ length: 7 }, (_, i) => addDays(mondayKey, i));
}

/**
 * Group a flat list of date keys into weeks, newest week first.
 * Returns [{ weekStart: "2026-08-17", days: ["2026-08-17", ...] }, ...]
 */
export function groupByWeek(keys) {
  const buckets = new Map();
  for (const key of keys) {
    const ws = startOfWeek(key);
    if (!buckets.has(ws)) buckets.set(ws, []);
    buckets.get(ws).push(key);
  }
  return [...buckets.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))            // newest week first
    .map(([weekStart, days]) => ({ weekStart, days: days.sort() }));
}

export function isToday(key, now = new Date()) {
  return key === localDateKey(now);
}

export function isFuture(key, now = new Date()) {
  return key > localDateKey(now); // string compare works because of YYYY-MM-DD
}

/** "Tue, Aug 18" */
export function formatDayLong(key) {
  const d = parseDateKey(key);
  return `${DOW[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** "Week of Aug 17" */
export function formatWeekLabel(mondayKey) {
  const d = parseDateKey(mondayKey);
  return `Week of ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** "MON" — the little label above each timeline icon. */
export function dowLabel(key) {
  return DOW[parseDateKey(key).getDay()].toUpperCase();
}

/** "18" — day of month. */
export function dayOfMonth(key) {
  return parseDateKey(key).getDate();
}

/** "August 2026" */
export function formatMonthYear(key) {
  const d = parseDateKey(key);
  return `${['January','February','March','April','May','June','July','August','September','October','November','December'][d.getMonth()]} ${d.getFullYear()}`;
}
