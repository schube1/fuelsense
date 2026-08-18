import { Link } from 'react-router-dom';
import Rings from './Rings.jsx';
import { dowLabel, dayOfMonth, formatDayLong } from '../lib/dates.js';

/**
 * One cell in the Timeline grid: mini rings with the weekday above and the date
 * below. Future days render as empty grooves and aren't tappable — a day that
 * hasn't happened yet shouldn't look like a day you failed.
 */
export default function DayIcon({ date, percents, isToday, isFuture }) {
  const className = [
    'day-cell',
    isToday ? 'is-today' : '',
    isFuture ? 'is-future' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const inner = (
    <>
      <span className="day-dow">{dowLabel(date)}</span>
      <Rings percents={percents} size={34} mini />
      <span className="day-num tnum">{dayOfMonth(date)}</span>
    </>
  );

  if (isFuture) {
    return (
      <div className={className} aria-hidden="true">
        {inner}
      </div>
    );
  }

  return (
    <Link className={className} to={`/day/${date}`} aria-label={formatDayLong(date)}>
      {inner}
    </Link>
  );
}
