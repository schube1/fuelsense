import { useEffect, useMemo, useRef, useState } from 'react';

import DayIcon from '../components/DayIcon.jsx';
import { useSettings } from '../state/SettingsContext.jsx';
import * as store from '../data/store.js';
import { ringPercents } from '../lib/metrics.js';
import {
  startOfWeek,
  addDays,
  daysBetween,
  weekDays,
  formatWeekLabel,
  formatDayLong,
  isFuture,
} from '../lib/dates.js';

const WEEKS_PER_PAGE = 8;

/**
 * The day-by-day view, grouped by week.
 *
 * It scrolls backwards to the week you started using the app and stops there —
 * there's no point showing empty rings for months that were never logged.
 * `settings.startDate` is stamped the first time the app runs, and you can move
 * it earlier in Settings if you ever want to backfill.
 *
 * "Infinite scroll" up to that floor is an IntersectionObserver: an invisible
 * sentinel sits at the bottom of the list, and when it scrolls into view we load
 * another eight weeks. That's cheaper and smoother than listening to scroll
 * events, because the browser tells us instead of us asking on every frame.
 */
export default function TimelineView({ today }) {
  const { settings } = useSettings();
  const [requestedWeeks, setRequestedWeeks] = useState(WEEKS_PER_PAGE);
  const [days, setDays] = useState({});
  const sentinelRef = useRef(null);

  const thisMonday = startOfWeek(today);

  // The oldest week we will ever show. Falls back to this week until settings
  // have loaded, so the first paint never reaches further back than it should.
  const firstMonday = startOfWeek(settings.startDate ?? today);
  const totalWeeks = Math.max(
    1,
    Math.floor(daysBetween(firstMonday, thisMonday) / 7) + 1,
  );

  const weeks = Math.min(requestedWeeks, totalWeeks);
  const atEnd = weeks >= totalWeeks;

  // The Mondays we're showing, newest first.
  const weekStarts = useMemo(
    () => Array.from({ length: weeks }, (_, i) => addDays(thisMonday, -7 * i)),
    [thisMonday, weeks],
  );

  const rangeFrom = weekStarts[weekStarts.length - 1];
  const rangeTo = addDays(thisMonday, 6);

  useEffect(() => {
    let alive = true;
    store.getDaysInRange(rangeFrom, rangeTo).then((map) => {
      if (alive) setDays(map);
    });
    return () => {
      alive = false;
    };
  }, [rangeFrom, rangeTo]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || atEnd) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setRequestedWeeks((w) => w + WEEKS_PER_PAGE);
      },
      { rootMargin: '300px' }, // start loading slightly before it's visible
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [atEnd]);

  return (
    <div className="body">
      {weekStarts.map((monday) => (
        <section key={monday}>
          <div className="week-head">
            {formatWeekLabel(monday)}
            <i className="rule" />
          </div>
          <div className="days-grid">
            {weekDays(monday).map((date) => {
              const day = days[date];
              // Days before you started are hidden the same way future days are:
              // dimmed and untappable. Only relevant in your very first week.
              const beforeStart = Boolean(settings.startDate) && date < settings.startDate;
              return (
                <DayIcon
                  key={date}
                  date={date}
                  isToday={date === today}
                  isFuture={isFuture(date) || beforeStart}
                  percents={
                    day
                      ? ringPercents(day, day.goals, settings.proteinWeight)
                      : { workout: 0, nutrition: 0, water: 0 }
                  }
                />
              );
            })}
          </div>
        </section>
      ))}

      {atEnd ? (
        <div className="timeline-end">
          {settings.startDate
            ? `You started logging on ${formatDayLong(settings.startDate)}.`
            : 'That’s the beginning.'}
        </div>
      ) : (
        <div ref={sentinelRef} />
      )}
    </div>
  );
}
