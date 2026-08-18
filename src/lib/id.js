/**
 * Two tiny helpers.
 */

/** A short unique id for exercises, sets and food entries. */
export function uid(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
}

/**
 * Turn a typed exercise name into a stable identity.
 *
 *   "Bench Press"  -> "bench-press"
 *   "bench press"  -> "bench-press"
 *   "Bench  Press" -> "bench-press"
 *
 * This one line is the entire reason progress tracking will be possible later.
 * Without it, "Bench Press" and "bench press" are two different lifts and every
 * future chart is quietly wrong.
 */
export function slugify(name) {
  return String(name)
    .toLowerCase()
    .trim()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
