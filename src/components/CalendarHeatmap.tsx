'use client';

import React from 'react';
import styles from './CalendarHeatmap.module.css';

interface CalendarHeatmapProps {
  activityDates: Record<string, number>;
}

export const CalendarHeatmap: React.FC<CalendarHeatmapProps> = ({ activityDates }) => {
  // Generate past 77 days (11 weeks x 7 days)
  const today = new Date();
  const days: { dateStr: string; count: number; dayOfWeek: number }[] = [];

  for (let i = 76; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const count = activityDates[dateStr] || 0;
    days.push({
      dateStr,
      count,
      dayOfWeek: d.getDay(),
    });
  }

  const getCountClass = (count: number) => {
    if (count === 0) return styles.count0;
    if (count === 1) return styles.count1;
    if (count === 2) return styles.count2;
    return styles.count3;
  };

  return (
    <div>
      <div className={styles.grid}>
        {days.map((d, idx) => (
          <div
            key={idx}
            title={`${d.dateStr}: ${d.count} workout(s)`}
            className={`${styles.dayCell} ${getCountClass(d.count)}`}
          />
        ))}
      </div>
      <div className={styles.legend}>
        <span>Less</span>
        <span className={`${styles.legendSwatch} ${styles.count0}`} />
        <span className={`${styles.legendSwatch} ${styles.count1}`} />
        <span className={`${styles.legendSwatch} ${styles.count2}`} />
        <span className={`${styles.legendSwatch} ${styles.count3}`} />
        <span>More</span>
      </div>
    </div>
  );
};
