import { archiveMatch } from './archiveMatch.js';

/**
 * Try the local archive first; only hit the network if nothing matches.
 *
 * @param {string} description - what the user typed
 * @param {Array}  libraryItems - from store.getFoodLibrary()
 * @returns {{ description, calories, protein, confidence, source }}
 */
export async function estimateFromText(description, libraryItems) {
  const hit = archiveMatch(description, libraryItems);
  if (hit) {
    return {
      description: hit.description,
      calories: hit.calories,
      protein: hit.protein,
      confidence: 'high',
      source: 'library',
    };
  }

  const res = await fetch('/api/estimate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description: description.slice(0, 500) }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Estimation failed (${res.status})`);
  }

  const data = await res.json();
  return {
    description: description.trim(),
    calories: data.calories,
    protein: data.protein,
    confidence: data.confidence ?? 'med',
    source: 'ai',
  };
}

/**
 * Look up a barcode via Open Food Facts.
 *
 * IMPORTANT footguns:
 *   - OFF returns HTTP 200 even for not-found; check body.status (0 = not found)
 *   - nutriments.energy is KILOJOULES — use energy-kcal_100g instead
 *
 * @returns {{ name, calories100g, protein100g, servingGrams, packageGrams }}
 *       OR {{ notFound: true }}
 */
export async function lookupBarcode(code) {
  const fields = 'product_name,brands,nutriments,serving_size,serving_quantity,product_quantity';
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${fields}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open Food Facts error (${res.status})`);

  const body = await res.json();

  // status: 0 = not found, even on HTTP 200
  if (body.status !== 1 || !body.product) return { notFound: true };

  const p = body.product;
  const n = p.nutriments ?? {};

  const calories100g = Number(n['energy-kcal_100g']) || 0;
  const protein100g  = Number(n['proteins_100g'])     || 0;

  const servingGrams  = Number(p.serving_quantity)  || null;
  const packageGrams  = Number(p.product_quantity)  || null;

  const brand = p.brands ? ` (${p.brands.split(',')[0].trim()})` : '';
  const name  = (p.product_name || 'Unknown product') + brand;

  return { name, calories100g, protein100g, servingGrams, packageGrams };
}

/**
 * Scale per-100g macros to a given gram weight.
 */
export function portionMath(per100g, grams) {
  return {
    calories: Math.round((per100g.calories100g * grams) / 100),
    protein:  Math.round((per100g.protein100g  * grams) / 100),
  };
}
