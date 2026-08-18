/**
 * The cloud half of the store — Supabase, over plain `fetch`.
 *
 * There is no Supabase SDK dependency here on purpose. Supabase is a normal
 * HTTP API (PostgREST for the database, GoTrue for auth), and talking to it
 * directly keeps the dependency list at six packages and means this file
 * always compiles whether or not you've set up an account yet.
 *
 * This file is INERT until you fill in .env — see cloudEnabled below. Until
 * then the app is 100% local and none of this code ever runs.
 *
 * Setup, when you're ready (about 15 minutes):
 *   1. supabase.com -> new project (free tier)
 *   2. SQL Editor -> paste and run supabase/schema.sql
 *   3. Authentication -> Users -> Add user -> your email + a password
 *   4. Project Settings -> API -> copy the URL and the `anon` key into .env
 *   5. In the app: Settings -> Cloud sync -> sign in
 */

import * as local from './localStore.js';

const URL_BASE = import.meta.env.VITE_SUPABASE_URL?.replace(/\/+$/, '') ?? '';

/**
 * Supabase renamed its browser-safe key from `anon` to `publishable`. Both do
 * the same job and both still work, so accept either variable name.
 * The value looks like `sb_publishable_...` (new) or `eyJ...` (legacy anon).
 * Never put a `sb_secret_...` / `service_role` key here — those bypass Row
 * Level Security and would be readable by anyone who opens the page source.
 */
const ANON_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  '';

/** If either value is missing, every function below no-ops. */
export const cloudEnabled = Boolean(URL_BASE && ANON_KEY);

// ---------------------------------------------------------------- session

/**
 * Read the `sub` (user id) claim out of a JWT without a library.
 * A JWT is three base64url chunks joined by dots; the middle one is JSON.
 * We are only reading it for convenience — the server verifies the signature,
 * we are not trusting anything security-relevant from this.
 */
function userIdFromToken(accessToken) {
  try {
    let payload = String(accessToken).split('.')[1];
    if (!payload) return null;
    payload = payload.replace(/-/g, '+').replace(/_/g, '/');
    // base64url drops the trailing '=' padding. Chrome's atob tolerates that;
    // Safari's does not, so put it back before decoding.
    payload = payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), '=');
    return JSON.parse(atob(payload)).sub ?? null;
  } catch {
    return null;
  }
}

async function loadSession() {
  const state = await local.getSyncState();
  return state.session ?? null;
}

async function storeSession(session) {
  await local.saveSyncState({ session });
  return session;
}

function sessionFromAuthResponse(body) {
  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    // expires_in is seconds from now; convert to an absolute epoch ms.
    expiresAt: Date.now() + (Number(body.expires_in) || 3600) * 1000,
    // The auth response already contains the user object, so prefer that and
    // only fall back to decoding the token ourselves.
    userId: body.user?.id ?? userIdFromToken(body.access_token),
    email: body.user?.email ?? null,
  };
}

/**
 * POST to the auth API and parse the body defensively. Same reasoning as
 * `rest()` below: a wrong URL returns an HTML error page, and calling
 * res.json() on that throws a error that names neither the URL nor the status.
 */
async function authPost(grantType, payload) {
  const res = await fetch(`${URL_BASE}/auth/v1/token?grant_type=${grantType}`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    /* leave body null */
  }

  if (!res.ok) {
    throw new Error(
      body?.error_description || body?.msg || body?.message ||
        `Sign in failed (${res.status}). Check the Supabase URL and key in .env.`,
    );
  }
  if (!body?.access_token) {
    throw new Error('Sign in returned no access token — check the project URL in .env.');
  }
  return body;
}

export async function signIn(email, password) {
  if (!cloudEnabled) throw new Error('Cloud sync is not configured.');
  const body = await authPost('password', { email, password });
  return storeSession(sessionFromAuthResponse(body));
}

export async function signOut() {
  await local.saveSyncState({ session: null, lastPulledAt: null });
}

async function refresh(session) {
  let body;
  try {
    body = await authPost('refresh_token', { refresh_token: session.refreshToken });
  } catch {
    await signOut();
    throw new Error('Session expired — sign in again.');
  }
  return storeSession(sessionFromAuthResponse(body));
}

/** Get a valid session, refreshing if it is within a minute of expiring. */
async function activeSession() {
  let session = await loadSession();
  if (!session) return null;
  if (Date.now() > session.expiresAt - 60_000) session = await refresh(session);
  return session;
}

export async function currentUser() {
  const session = await loadSession();
  return session ? { email: session.email, userId: session.userId } : null;
}

// ---------------------------------------------------------------- database

async function rest(path, options = {}) {
  const session = await activeSession();
  if (!session) throw new Error('Not signed in.');
  const res = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${session.accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });
  const text = await res.text();

  if (!res.ok) {
    // PostgREST returns a JSON error object; surface its message if there is one.
    let detail = text.slice(0, 200);
    try {
      const parsed = JSON.parse(text);
      detail = parsed.message || parsed.error_description || parsed.hint || detail;
    } catch {
      /* not JSON — use the raw text */
    }
    throw new Error(`Supabase ${res.status} on ${path.split('?')[0]}: ${detail}`);
  }

  /**
   * Never call res.json() blindly. A 204, or a 201 from a request that asked
   * for `return=minimal`, comes back with an EMPTY body — and res.json() on an
   * empty body throws. Safari's message for it is the famously unhelpful
   * "The string did not match the expected pattern."
   */
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      `Supabase returned a non-JSON body on ${path.split('?')[0]}: ${text.slice(0, 120)}`,
    );
  }
}

/**
 * Rows changed on the server since `sinceIso`. Passing null gets everything,
 * which is what happens on a fresh device.
 */
export async function pullDays(sinceIso) {
  const filter = sinceIso ? `&updated_at=gt.${encodeURIComponent(sinceIso)}` : '';
  const rows = await rest(`days?select=date,data,updated_at${filter}&order=updated_at.asc`);
  // A SELECT always returns an array, but never assume — an empty body here
  // would otherwise crash with "null is not an object".
  if (!Array.isArray(rows)) return [];
  return rows.map((r) => ({ ...r.data, date: r.date, updatedAt: r.updated_at, dirty: false }));
}

export async function pushDays(records) {
  if (!records.length) return 0;
  const session = await activeSession();
  const payload = records.map((day) => {
    // Strip local-only bookkeeping before it goes over the wire.
    const { dirty, updatedAt, ...data } = day;
    return {
      user_id: session.userId,
      date: day.date,
      data,
      updated_at: updatedAt ?? new Date().toISOString(),
    };
  });
  await rest('days?on_conflict=user_id,date', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(payload),
  });
  return payload.length;
}

export async function pullPrefs() {
  const rows = await rest('prefs?select=data,updated_at&limit=1');
  return rows[0] ?? null;
}

export async function pushPrefs(settings) {
  const session = await activeSession();
  await rest('prefs?on_conflict=user_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify([
      { user_id: session.userId, data: settings, updated_at: new Date().toISOString() },
    ]),
  });
}
