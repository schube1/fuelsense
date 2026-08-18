import { useCallback, useEffect, useState } from 'react';
import * as store from '../data/store.js';

/**
 * Load one day, and give back a `run` helper for writing to it.
 *
 * A "custom hook" is just a function that calls other hooks — it exists so that
 * five screens can share this loading logic instead of each repeating it.
 *
 * Usage:
 *   const { day, loading, run } = useDay(date);
 *   run(() => store.logWaterBottle(date));
 *
 * Every store write returns the updated record, so `run` can drop it straight
 * into state. No refetch, no flicker, and the screen updates the instant the
 * write lands on disk.
 */
export function useDay(date) {
  const [day, setDay] = useState(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const fresh = await store.getDay(date);
    setDay(fresh);
    setLoading(false);
    return fresh;
  }, [date]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    store.getDay(date).then((d) => {
      if (!alive) return;
      setDay(d);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [date]);

  // If a background sync pulled newer data while the app was in the background,
  // pick it up when the user comes back rather than showing a stale screen.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') reload();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [reload]);

  const run = useCallback(async (operation) => {
    const record = await operation();
    if (record) setDay(record);
    return record;
  }, []);

  return { day, loading, run, reload };
}
