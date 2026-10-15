'use client';

import React from 'react';
import { Clock, Heart, Dumbbell } from 'lucide-react';
import styles from '@/app/app/page.module.css';

export interface RecentActivityItem {
  id: string;
  date: string;
  title: string;
  sub: string;
  volume: string;
  notes: string;
  status: string;
  icon: 'dumbbell' | 'heart';
}

interface RecentActivityCardProps {
  recentActivities: RecentActivityItem[];
  onNavigateToWorkouts: () => void;
}

export const RecentActivityCard: React.FC<RecentActivityCardProps> = ({
  recentActivities,
  onNavigateToWorkouts,
}) => {
  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>
          <Clock size={18} className={styles.cardIcon} />
          Recent Activity
        </span>

        <button
          type="button"
          onClick={onNavigateToWorkouts}
          className={styles.viewAllBtn}
        >
          View All
        </button>
      </div>

      {recentActivities.length > 0 ? (
        <div className={styles.tableWrap}>
          <table className={styles.customTable}>
            <thead>
              <tr>
                <th style={{ width: '120px' }}>Date</th>
                <th style={{ width: 'auto', minWidth: '200px' }}>Activity</th>
                <th style={{ width: '140px' }}>Volume / Calories</th>
                <th style={{ width: 'auto' }}>Notes</th>
                <th style={{ width: '110px' }}>Status</th>
                <th style={{ width: '36px', textAlign: 'center' }}></th>
              </tr>
            </thead>
            <tbody>
              {recentActivities.map((row) => (
                <tr key={row.id}>
                  <td style={{ color: '#475569', fontWeight: 500, whiteSpace: 'nowrap' }}>{row.date}</td>
                  <td>
                    <div className={styles.activityTitleGroup}>
                      <div className={row.icon === 'heart' ? styles.activityIconWrapRed : styles.activityIconWrapMint}>
                        {row.icon === 'heart' ? (
                          <Heart size={15} />
                        ) : (
                          <Dumbbell size={15} />
                        )}
                      </div>
                      <div>
                        <div className={styles.activityName}>{row.title}</div>
                        <div className={styles.activitySub}>{row.sub}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontWeight: 600, color: '#1E293B', whiteSpace: 'nowrap' }}>{row.volume}</td>
                  <td style={{ color: '#64748B' }}>{row.notes}</td>
                  <td>
                    <span className={styles.statusCompleted}>
                      <span className={styles.greenDot} />
                      {row.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button type="button" className={styles.moreDotsBtn} aria-label="Details">
                      ...
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={styles.emptyCardMessage}>
          <Clock size={28} className={styles.emptyIcon} />
          <h4 className={styles.emptyCardTitle}>No Recent Activities Logged</h4>
          <p className={styles.emptyCardSub}>
            Completed workout sessions and cardio will automatically appear here.
          </p>
        </div>
      )}
    </section>
  );
};
