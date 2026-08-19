import { normalizeKey } from './food.js';

/**
 * Fuzzy-match a typed description against the user's food library (offline).
 *
 * Score = Jaccard word overlap: |intersection| / |union| on the normalized
 * word sets. Returns the best library item above `threshold`, or null.
 *
 * Caller must pass the already-loaded libraryItems array (same shape as
 * buildFoodLibrary returns) so this function stays pure and testable.
 */
export function archiveMatch(description, libraryItems, threshold = 0.55) {
  if (!description?.trim() || !libraryItems?.length) return null;

  const toWords = (s) =>
    new Set(normalizeKey(s).split(' ').map((w) => w.replace(/\W/g, '')).filter(Boolean));

  const queryWords = toWords(description);
  if (queryWords.size === 0) return null;

  let bestItem = null;
  let bestScore = -1;

  for (const item of libraryItems) {
    const itemWords = toWords(item.description);
    if (itemWords.size === 0) continue;

    let intersection = 0;
    for (const w of queryWords) {
      if (itemWords.has(w)) intersection++;
    }

    const union = queryWords.size + itemWords.size - intersection;
    const score = union > 0 ? intersection / union : 0;

    if (score > bestScore) {
      bestScore = score;
      bestItem = item;
    }
  }

  return bestScore >= threshold ? bestItem : null;
}
