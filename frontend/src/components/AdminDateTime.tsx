import React, { useEffect, useState } from 'react';
import { CalendarDays, Clock3 } from 'lucide-react';

const CAIRO_TIME_ZONE = 'Africa/Cairo';

const timeFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: CAIRO_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: true,
});

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: CAIRO_TIME_ZONE,
  weekday: 'short',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const AdminDateTime: React.FC = () => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(new Date()), 1_000);
    return () => window.clearInterval(intervalId);
  }, []);

  const timeLabel = timeFormatter.format(now);
  const dateLabel = dateFormatter.format(now);

  return (
    <div className="admin-date-time" aria-label={`Current Cairo time: ${dateLabel}, ${timeLabel}`}>
      <div className="admin-clock-line">
        <Clock3 size={16} aria-hidden="true" />
        <time className="admin-clock-value" dateTime={now.toISOString()}>
          {timeLabel}
        </time>
      </div>
      <div className="admin-date-line">
        <CalendarDays size={15} aria-hidden="true" />
        <time dateTime={now.toISOString()}>{dateLabel}</time>
        <span className="admin-time-zone">Cairo</span>
      </div>
    </div>
  );
};

export default AdminDateTime;
