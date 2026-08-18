import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import TodayView from './TodayView.jsx';
import TimelineView from './TimelineView.jsx';
import { localDateKey, formatDayLong, formatMonthYear } from '../lib/dates.js';

const STORAGE_KEY = 'gfw:home-view';

/**
 * The home screen. Holds the Today / Timeline toggle and remembers which one
 * you last used, so the app opens where you left it.
 */
export default function Home() {
  const [view, setView] = useState(
    () => localStorage.getItem(STORAGE_KEY) ?? 'today',
  );
  const [today, setToday] = useState(localDateKey());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, view);
  }, [view]);

  // If the app sat open past midnight, "today" needs to roll over when you
  // come back to it. Without this you'd log Tuesday's dinner into Monday.
  useEffect(() => {
    const check = () => {
      const now = localDateKey();
      setToday((prev) => (prev === now ? prev : now));
    };
    const onVisible = () => document.visibilityState === 'visible' && check();
    document.addEventListener('visibilitychange', onVisible);
    const interval = setInterval(check, 60_000);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="screen">
      <div className="topbar">
        <div className="topbar-main">
          <h1 className="title">{view === 'today' ? 'Today' : 'Timeline'}</h1>
          <div className="subtitle">
            {view === 'today' ? formatDayLong(today) : formatMonthYear(today)}
          </div>
        </div>
        <Link to="/settings" className="pill" aria-label="Settings">
          Settings
        </Link>
      </div>

      <div className="seg" role="tablist" aria-label="Home view">
        <button
          role="tab"
          aria-selected={view === 'today'}
          onClick={() => setView('today')}
        >
          Today
        </button>
        <button
          role="tab"
          aria-selected={view === 'timeline'}
          onClick={() => setView('timeline')}
        >
          Timeline
        </button>
      </div>

      {view === 'today' ? <TodayView date={today} /> : <TimelineView today={today} />}
    </div>
  );
}
