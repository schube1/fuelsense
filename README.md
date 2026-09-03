# FuelSense

A personal workout / nutrition / water logger. Runs as a web app you add to your
iPhone home screen, stores everything on your device, and can optionally sync to
a free Supabase project so it survives a phone wipe.

---

## Run it

You need Node 18 or newer. Check with `node -v`; if that errors, install it from
[nodejs.org](https://nodejs.org) (take the LTS build) and reopen Terminal.

```bash
cd ~/Documents/fall26projects/fuelsense
npm install       # downloads the 6 dependencies. Once, ~30 seconds.
npm run dev       # starts the dev server
```

Open the printed `http://localhost:5173`. Edit any file, save, and the browser
updates in under a second — you don't restart anything.

**To try it on your actual phone while developing:**

```bash
npm run dev:phone
```

That prints a second address like `http://192.168.1.42:5173`. Open it in Safari
on your phone while you're on the same Wi-Fi. This is worth doing early — the
layout is built for a phone and looks odd in a wide desktop window.

**Other commands:**

```bash
npm test          # runs the unit tests: ring math, dates, schema, workout/food libraries
npm run build     # compiles into dist/ for deploying
npm run preview   # serves the built dist/ locally, to check it before deploying
```

---

## Deploy it and put it on your home screen

The app must be served over HTTPS for the service worker (offline support) to
work, so "open the file directly" won't do it. Vercel's free tier is the path of
least resistance:

1. Make it a git repo and push it to GitHub (a private repo is fine):

   ```bash
   git init
   git add .
   git commit -m "FuelSense v1"
   # create an empty repo on github.com, then:
   git remote add origin git@github.com:YOURNAME/fuelsense.git
   git push -u origin main
   ```

2. Go to [vercel.com](https://vercel.com), sign in with GitHub, **Add New →
   Project**, pick the repo. Vercel detects Vite on its own — accept the
   defaults and deploy. You get a `something.vercel.app` URL.

3. On your iPhone, open that URL **in Safari** (not Chrome — only Safari can
   install web apps on iOS). Tap the **Share** button, scroll down, tap **Add to
   Home Screen**.

Every `git push` from now on redeploys automatically.

---

## How the code is organised

```
src/
  main.jsx            entry point; registers the service worker
  App.jsx             routes + providers

  routes/             one file per screen
    Home.jsx            the Today / Timeline toggle
    TodayView.jsx       rings + quick add
    TimelineView.jsx    day icons grouped by week, infinite scroll back
    Day.jsx             the three tiles for one day
    Workout.jsx  Nutrition.jsx  Water.jsx  Settings.jsx

  components/         reusable pieces
    Rings.jsx           the three-ring SVG (used big AND tiny)
    RingLegend.jsx      the labelled rows under the rings
    DayIcon.jsx         one timeline cell
    Sheet.jsx           the bottom-sheet shell
    ExerciseSheet.jsx  FoodSheet.jsx   the two add/edit forms
    ProgressBar.jsx  ScreenHeader.jsx

  data/               ← everything about storage lives behind here
    store.js            THE SEAM. The only storage module screens may import.
    localStore.js       IndexedDB implementation
    cloudStore.js       Supabase over plain fetch
    sync.js             background push/pull engine
    schema.js           the shape of a day, and the defaults

  lib/
    metrics.js          all ring math — pure functions, unit-tested
    dates.js            local date keys, week grouping — pure, unit-tested
    idb.js              a ~90-line IndexedDB wrapper (so we don't need Dexie)
    id.js               id generation and the exercise-name slugifier
    metrics.test.js     25 tests, run with `npm test`

  styles/
    tokens.css          every colour in the app
    app.css             everything else
```

### The one architectural rule

**Only `data/store.js` may be imported by screens.** No component anywhere calls
IndexedDB or Supabase directly. That indirection is what makes "start local, add
cloud later" an afternoon of work instead of a rewrite — and it's why the sync
engine could be dropped in without touching a single screen.

If you find yourself importing `localStore` or `idb` from a component, that's the
signal you're about to make future-you's life hard.

### Where to look first

- **Want to change how a ring is calculated?** `src/lib/metrics.js`. Nothing else.
- **Want to change how a screen looks?** the matching file in `src/routes/`.
- **Want to change a colour?** `src/styles/tokens.css`.
- **Want to add a field to a day?** `src/data/schema.js`, then the screen.

---

## The decisions baked in

| Question | Answer |
|---|---|
| Home toggle | **Today** (rings) / **Timeline** (day icons by week) |
| Protein vs calories | 50/50 in the nutrition ring — change it in Settings |
| Going over 2,500 cal | Still counts as hitting the goal. Ring stays full; an "over" chip shows the number |
| Timeline | Infinite scroll backwards, 8 weeks at a time, capped at 5 years |
| Water goal | Fixed at 8 bottles × 16.9 fl oz (adjustable in Settings) |
| Workout ring | Binary — either you logged something or you didn't |
| Storage | Local-first (IndexedDB), with an optional Supabase sync layer |

Two behaviours worth knowing about:

- **Each day stores the goals you had at the time.** Raising your protein goal
  next year won't retroactively drop last month's rings.
- **Bottles past 8 keep counting.** The ring clamps at 100%, the number doesn't —
  drink ten and it says ten.

---

## Turning on cloud sync (~15 minutes, whenever you want)

The app works completely without this. Do it when you want your data to survive
losing the phone.

1. **Create a project** at [supabase.com](https://supabase.com) — free tier.
   (Note: free projects pause after a week of no activity and need a manual
   unpause in the dashboard. Daily use keeps it awake.)

2. **Create the tables.** In the Supabase dashboard open **SQL Editor**, paste
   the entire contents of `supabase/schema.sql`, and run it. This also enables
   Row Level Security, which is what stops the anon key in your app from being
   able to read anyone else's rows. Do not skip it.

3. **Create your user.** **Authentication → Users → Add user**, with your email
   and a password. Tick "auto confirm".

4. **Add the keys.** **Project Settings → API**, then in the project root:

   ```bash
   cp .env.example .env
   ```

   Paste the Project URL and the `anon` `public` key into `.env`. Restart
   `npm run dev` — Vite only reads `.env` at startup.

   If you deployed to Vercel, add the same two variables under **Settings →
   Environment Variables** and redeploy.

5. **Sign in.** In the app: **Settings → Cloud sync → Sign in**.

### How sync behaves

- Every write goes to IndexedDB first and returns immediately. **The UI never
  waits on the network** — logging a set in a basement gym with no signal works
  exactly as fast as anywhere else.
- Anything written while offline is flagged and pushed on the next sync.
- Sync runs at app start, when you bring the app to the foreground, when the
  network comes back, and 2 seconds after you stop making changes.
- Conflicts resolve last-write-wins on `updatedAt`. With one user on one phone,
  a real conflict is close to impossible.

---

## Backups

**Settings → Backup → Download backup** writes one JSON file with everything.

Until cloud sync is on, this is your only copy. Safari can evict a site's
storage, and "Clear Website Data" takes everything with it. Do this every few
weeks — it takes five seconds. **Restore from a backup** puts it all back.

---

## Adding progress tracking later

Nothing needs to be re-recorded — v1 already saves everything the charts will
need. Specifically:

- Each exercise stores an `exerciseId` slug (`"Bench Press"` → `bench-press`), so
  spelling variations don't split one lift into three.
- Sets are stored as `{ reps, weight }` objects, never as free text.
- `estimated1RM()` already exists in `metrics.js` (Epley), unused for now.

When you build it, add `src/lib/analytics.js` that reads through `store.js`, and
a route for the charts. The highest-value feature isn't a chart at all — it's
showing "last time: 3×8 @ 185" inside the Add Exercise sheet. Build that first.
