/**
 * The sync engine — the "local-first with background sync" half of the plan.
 *
 * The rule that makes this design work: THE UI NEVER WAITS ON THE NETWORK.
 * Every read and write in the app goes to IndexedDB and returns immediately.
 * This file runs afterwards, in the background, and reconciles with Supabase.
 * If you're in a basement with no signal, nothing here succeeds and nothing
 * here matters — your logs are already saved on the phone.
 *
 * Conflict resolution is last-write-wins, compared on `updatedAt`. That is
 * usually a naive choice, but here there is exactly one user and realistically
 * one device, so two genuinely conflicting edits to the same day essentially
 * never happen.
 */

import * as local from './localStore.js';
import * as cloud from './cloudStore.js';

const listeners = new Set();

let status = {
  enabled: cloud.cloudEnabled,
  signedIn: false,
  state: 'idle', // 'idle' | 'syncing' | 'error' | 'offline'
  lastSyncedAt: null,
  pending: 0,
  error: null,
};

function emit(patch) {
  status = { ...status, ...patch };
  for (const fn of listeners) fn(status);
}

export function subscribe(fn) {
  listeners.add(fn);
  fn(status);
  return () => listeners.delete(fn);
}

export function getStatus() {
  return status;
}

// ---------------------------------------------------------------- the sync

let running = null;

export async function syncNow({ silent = false } = {}) {
  if (!cloud.cloudEnabled) return status;
  if (running) return running; // never run two at once

  running = (async () => {
    const user = await cloud.currentUser();
    if (!user) {
      emit({ signedIn: false, state: 'idle' });
      return status;
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      emit({ signedIn: true, state: 'offline' });
      return status;
    }

    if (!silent) emit({ signedIn: true, state: 'syncing', error: null });

    try {
      // 1. PUSH everything written since the last successful sync.
      const dirty = await local.getDirtyDays();
      if (dirty.length) {
        await cloud.pushDays(dirty);
        await local.clearDirty(dirty.map((d) => d.date));
      }

      // 2. PULL anything the server has that we haven't seen.
      const syncState = await local.getSyncState();
      const remote = await cloud.pullDays(syncState.lastPulledAt);

      let newest = syncState.lastPulledAt;
      for (const remoteDay of remote) {
        const mine = await local.getDay(remoteDay.date);
        // Keep the local copy only if it is both unsynced AND newer.
        const localWins =
          mine.dirty && mine.updatedAt && mine.updatedAt > remoteDay.updatedAt;
        if (!localWins) await local.putDayRaw(remoteDay);
        if (!newest || remoteDay.updatedAt > newest) newest = remoteDay.updatedAt;
      }

      const now = new Date().toISOString();
      await local.saveSyncState({ lastPulledAt: newest, lastSyncedAt: now });
      emit({ signedIn: true, state: 'idle', lastSyncedAt: now, pending: 0, error: null });
    } catch (err) {
      emit({ signedIn: true, state: 'error', error: err.message });
    }

    return status;
  })();

  try {
    return await running;
  } finally {
    running = null;
  }
}

// ---------------------------------------------------------------- triggers

let timer = null;

/**
 * Called after every write. Debounced, so hammering the water button eight
 * times fires one sync two seconds after you stop, not eight syncs.
 */
export function scheduleSync() {
  if (!cloud.cloudEnabled) return;
  emit({ pending: status.pending + 1 });
  clearTimeout(timer);
  timer = setTimeout(() => syncNow({ silent: true }), 2000);
}

/** Wire up the automatic triggers. Called once from App.jsx. */
export function startAutoSync() {
  if (!cloud.cloudEnabled) return () => {};

  const onOnline = () => syncNow({ silent: true });
  const onVisible = () => {
    if (document.visibilityState === 'visible') syncNow({ silent: true });
  };

  window.addEventListener('online', onOnline);
  document.addEventListener('visibilitychange', onVisible);
  syncNow({ silent: true }); // and once at startup

  return () => {
    window.removeEventListener('online', onOnline);
    document.removeEventListener('visibilitychange', onVisible);
  };
}

export async function signIn(email, password) {
  await cloud.signIn(email, password);
  emit({ signedIn: true });
  // A fresh sign-in should pull the full history, not just recent changes.
  await local.saveSyncState({ lastPulledAt: null });
  return syncNow();
}

export async function signOut() {
  await cloud.signOut();
  emit({ signedIn: false, state: 'idle', lastSyncedAt: null });
}

export async function refreshStatus() {
  if (!cloud.cloudEnabled) return;
  const [user, state, dirty] = await Promise.all([
    cloud.currentUser(),
    local.getSyncState(),
    local.getDirtyDays(),
  ]);
  emit({
    signedIn: Boolean(user),
    lastSyncedAt: state.lastSyncedAt,
    pending: dirty.length,
  });
}

export { cloud };
