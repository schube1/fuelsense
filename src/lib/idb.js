/**
 * A very small wrapper around IndexedDB — the database that lives inside Safari
 * on your phone.
 *
 * IndexedDB's native API is callback-based and unpleasant to use directly, so
 * the usual move is to install a library (Dexie, idb). This file is ~90 lines
 * and does everything this app needs, which felt like a better trade than
 * another dependency. Every function returns a Promise so callers can `await`.
 *
 * Two object stores:
 *   days  — one record per date, keyed by "2026-08-18"
 *   meta  — a key/value bag for settings, sync bookkeeping, exercise names
 */

const DB_NAME = 'gym-food-water';
const DB_VERSION = 1;

export const DAYS = 'days';
export const META = 'meta';

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    // Runs the first time ever, and again whenever DB_VERSION goes up.
    // To add a store later: bump DB_VERSION and add another createObjectStore.
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DAYS)) {
        db.createObjectStore(DAYS, { keyPath: 'date' });
      }
      if (!db.objectStoreNames.contains(META)) {
        db.createObjectStore(META, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () =>
      reject(new Error('IndexedDB blocked — close other tabs of this app.'));
  });

  return dbPromise;
}

/** Wrap one IDBRequest in a Promise. */
function wrap(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function tx(storeName, mode) {
  const db = await openDB();
  return db.transaction(storeName, mode).objectStore(storeName);
}

export async function get(storeName, key) {
  const store = await tx(storeName, 'readonly');
  return wrap(store.get(key));
}

export async function put(storeName, value) {
  const store = await tx(storeName, 'readwrite');
  await wrap(store.put(value));
  return value;
}

export async function putMany(storeName, values) {
  const db = await openDB();
  const transaction = db.transaction(storeName, 'readwrite');
  const store = transaction.objectStore(storeName);
  for (const v of values) store.put(v);
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve(values.length);
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function del(storeName, key) {
  const store = await tx(storeName, 'readwrite');
  return wrap(store.delete(key));
}

export async function getAll(storeName) {
  const store = await tx(storeName, 'readonly');
  return wrap(store.getAll());
}

/** Inclusive range query. Works because our keys sort lexicographically. */
export async function getRange(storeName, lower, upper) {
  const store = await tx(storeName, 'readonly');
  return wrap(store.getAll(IDBKeyRange.bound(lower, upper)));
}

export async function clear(storeName) {
  const store = await tx(storeName, 'readwrite');
  return wrap(store.clear());
}

/** True if the browser supports IndexedDB at all. */
export function isSupported() {
  return typeof indexedDB !== 'undefined';
}
