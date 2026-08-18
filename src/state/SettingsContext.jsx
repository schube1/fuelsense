import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as store from '../data/store.js';
import { DEFAULT_SETTINGS } from '../data/schema.js';

/**
 * Settings (your goals) loaded once at startup and shared with every screen.
 *
 * React Context is the built-in way to hand a value to deeply nested components
 * without passing it through every layer by hand. It's the right tool when the
 * value is small, read often, and written rarely — which describes goals
 * exactly. Anything bigger and you'd reach for a state library; this app never
 * needs to.
 */
const SettingsContext = createContext({
  settings: DEFAULT_SETTINGS,
  ready: false,
  update: async () => {},
});

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    store.getSettings().then((s) => {
      if (!alive) return;
      setSettings(s);
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  const update = useCallback(async (patch) => {
    const next = await store.saveSettings(patch);
    setSettings(next);
    return next;
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, ready, update }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
