import { useEffect, useRef, useState } from 'react';

import ScreenHeader from '../components/ScreenHeader.jsx';
import { useSettings } from '../state/SettingsContext.jsx';
import * as store from '../data/store.js';
import * as sync from '../data/sync.js';
import { cloudEnabled } from '../data/cloudStore.js';
import { localDateKey } from '../lib/dates.js';

export default function Settings() {
  const { settings, update } = useSettings();
  const [status, setStatus] = useState(sync.getStatus());
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const fileInput = useRef(null);

  useEffect(() => sync.subscribe(setStatus), []);

  const num = (value, fallback) => {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  };

  // -------------------------------------------------------------- backup

  const handleExport = async () => {
    const json = await store.exportAll();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gym-food-water-${localDateKey()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setMessage('Backup downloaded.');
  };

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const count = await store.importAll(await file.text());
      setMessage(`Restored ${count} days. Reloading…`);
      setTimeout(() => window.location.reload(), 800);
    } catch (err) {
      setError(err.message);
    } finally {
      event.target.value = '';
    }
  };

  // -------------------------------------------------------------- sync

  const handleSignIn = async () => {
    setBusy(true);
    setError(null);
    try {
      await sync.signIn(email.trim(), password);
      setPassword('');
      setMessage('Signed in and synced.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const dotClass =
    status.state === 'error' ? 'err' : status.state === 'syncing' ? 'busy' : status.signedIn ? 'ok' : '';

  return (
    <div className="screen">
      <ScreenHeader title="Settings" back="/" />

      <div className="body">
        <div className="section-head">Daily goals</div>
        <div className="card">
          <div className="setting-row">
            <label htmlFor="start">
              Start date
              <span>
                The Timeline stops here rather than scrolling back through days you never
                logged. Set it earlier if you want to backfill.
              </span>
            </label>
            <input
              id="start"
              type="date"
              max={localDateKey()}
              defaultValue={settings.startDate ?? localDateKey()}
              onBlur={(e) => e.target.value && update({ startDate: e.target.value })}
            />
          </div>

          <div className="setting-row">
            <label htmlFor="cal">
              Calories
              <span>Your daily target.</span>
            </label>
            <input
              id="cal"
              type="number"
              inputMode="numeric"
              defaultValue={settings.calorieGoal}
              onBlur={(e) => update({ calorieGoal: num(e.target.value, settings.calorieGoal) })}
            />
          </div>

          <div className="setting-row">
            <label htmlFor="pro">
              Protein (g)
              <span>Your daily target.</span>
            </label>
            <input
              id="pro"
              type="number"
              inputMode="numeric"
              defaultValue={settings.proteinGoal}
              onBlur={(e) => update({ proteinGoal: num(e.target.value, settings.proteinGoal) })}
            />
          </div>

          <div className="setting-row">
            <label htmlFor="bottles">
              Water bottles
              <span>{settings.bottleOz} fl oz each.</span>
            </label>
            <input
              id="bottles"
              type="number"
              inputMode="numeric"
              defaultValue={settings.bottleGoal}
              onBlur={(e) => update({ bottleGoal: num(e.target.value, settings.bottleGoal) })}
            />
          </div>

          <div className="setting-row">
            <label htmlFor="weight">
              Protein weighting
              <span>
                How much of the nutrition ring protein is worth. 0.5 splits it evenly with
                calories; 0.7 makes protein the bigger half.
              </span>
            </label>
            <input
              id="weight"
              type="number"
              step="0.1"
              min="0"
              max="1"
              inputMode="decimal"
              defaultValue={settings.proteinWeight}
              onBlur={(e) => {
                const n = Number(e.target.value);
                update({
                  proteinWeight: Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0.5,
                });
              }}
            />
          </div>
        </div>

        <p className="empty" style={{ padding: '12px 2px', textAlign: 'left' }}>
          Changing a goal only affects days from here on. Each day stores the goals you were
          chasing at the time, so last month's rings don't rewrite themselves.
        </p>

        {/* ------------------------------------------------------ backup */}

        <div className="section-head">Backup</div>
        <div className="card">
          <div className="setting-row">
            <label>
              Export everything
              <span>
                One JSON file with every day you've logged. Until cloud sync is on, this is your
                only copy — do it every so often.
              </span>
            </label>
          </div>
          <button className="btn" onClick={handleExport}>
            Download backup
          </button>
          <div className="spacer-sm" />
          <button className="btn btn-dashed" onClick={() => fileInput.current?.click()}>
            Restore from a backup
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            style={{ display: 'none' }}
            onChange={handleImport}
          />
        </div>

        {/* ------------------------------------------------------ sync */}

        <div className="section-head">Cloud sync</div>

        {!cloudEnabled ? (
          <div className="card">
            <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6 }}>
              Not configured. The app is running entirely on this device, which works fine — it
              just means this phone holds the only copy.
              <br />
              <br />
              To turn sync on: create a free Supabase project, run{' '}
              <code>supabase/schema.sql</code> in its SQL editor, then put the project URL and
              anon key in a <code>.env</code> file and redeploy. Full steps are in the README.
            </p>
          </div>
        ) : (
          <div className="card">
            <div className="setting-row" style={{ gap: 10 }}>
              <i className={`sync-dot ${dotClass}`} />
              <label>
                {status.signedIn ? 'Connected' : 'Not signed in'}
                <span>
                  {status.state === 'error'
                    ? status.error
                    : status.state === 'offline'
                      ? 'Offline — will sync when you reconnect.'
                      : status.lastSyncedAt
                        ? `Last synced ${new Date(status.lastSyncedAt).toLocaleString()}`
                        : 'Never synced.'}
                </span>
              </label>
            </div>

            {status.signedIn ? (
              <>
                <button
                  className="btn"
                  disabled={status.state === 'syncing'}
                  onClick={() => sync.syncNow()}
                >
                  {status.state === 'syncing' ? 'Syncing…' : 'Sync now'}
                </button>
                <div className="spacer-sm" />
                <button className="btn btn-ghost" onClick={() => sync.signOut()}>
                  Sign out
                </button>
              </>
            ) : (
              <>
                <div className="field">
                  <label htmlFor="sync-email">Email</label>
                  <input
                    id="sync-email"
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="sync-pass">Password</label>
                  <input
                    id="sync-pass"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <button
                  className="btn btn-primary"
                  disabled={busy || !email || !password}
                  onClick={handleSignIn}
                >
                  {busy ? 'Signing in…' : 'Sign in'}
                </button>
              </>
            )}
          </div>
        )}

        {message && (
          <p style={{ color: 'var(--good-ink)', fontSize: 12.5, marginTop: 12 }}>{message}</p>
        )}
        {error && <p className="error-text">{error}</p>}

        <div className="spacer-lg" />
      </div>
    </div>
  );
}
