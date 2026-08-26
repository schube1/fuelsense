export function normalizeKey(description) {
  return String(description).trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Scan all day records, flatten entries, dedup by normalized description key
 * keeping the most recent macros, and return sorted most-recently-eaten first.
 *
 * @param {Array} days - raw day records (shape from getAllDays)
 * @returns {Array<{ key, description, calories, protein, lastLoggedAt, count }>}
 */
export function buildFoodLibrary(days) {
  const map = new Map();

  for (const day of days) {
    const entries = day.nutrition?.entries ?? [];
    for (const entry of entries) {
      if (!entry.description?.trim()) continue;
      const key = normalizeKey(entry.description);
      const existing = map.get(key);

      if (!existing) {
        map.set(key, {
          key,
          description: entry.description.trim(),
          calories: Number(entry.calories) || 0,
          protein: Number(entry.protein) || 0,
          lastLoggedAt: entry.loggedAt ?? null,
          count: 1,
        });
      } else {
        existing.count += 1;
        // Keep the entry with the more recent loggedAt
        const existingTime = existing.lastLoggedAt ? new Date(existing.lastLoggedAt).getTime() : -Infinity;
        const entryTime = entry.loggedAt ? new Date(entry.loggedAt).getTime() : -Infinity;
        if (entryTime > existingTime) {
          existing.description = entry.description.trim();
          existing.calories = Number(entry.calories) || 0;
          existing.protein = Number(entry.protein) || 0;
          existing.lastLoggedAt = entry.loggedAt ?? null;
        }
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    if (!a.lastLoggedAt && !b.lastLoggedAt) return 0;
    if (!a.lastLoggedAt) return 1;
    if (!b.lastLoggedAt) return -1;
    return b.lastLoggedAt.localeCompare(a.lastLoggedAt);
  });
}

/**
 * Filter library items so that ALL words in query appear (case-insensitive
 * substring) in the item's `field`. Returns all items when query is empty.
 * Shared by the food library and the workout library (see lib/workout.js).
 */
export function filterLibrary(items, query, field = 'description') {
  const trimmed = (query ?? '').trim();
  if (!trimmed) return items;
  const words = trimmed.toLowerCase().split(/\s+/);
  return items.filter((item) => {
    const text = item[field].toLowerCase();
    return words.every((w) => text.includes(w));
  });
}
