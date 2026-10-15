'use client';

import React from 'react';
import Link from 'next/link';
import { ListChecks, Play, MoreVertical, Moon } from 'lucide-react';
import styles from '@/app/app/page.module.css';

export interface TodayExerciseRow {
  num: number;
  name: string;
  sets: string;
  weight: string;
  status: string;
}

interface TodayWorkoutCardProps {
  todayWorkoutExercises: TodayExerciseRow[];
  onOpenPlanModal: () => void;
}

export const TodayWorkoutCard: React.FC<TodayWorkoutCardProps> = ({
  todayWorkoutExercises,
  onOpenPlanModal,
}) => {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>
          <ListChecks size={18} className={styles.cardIcon} />
          Today&apos;s Workout
        </span>

        <button
          type="button"
          onClick={onOpenPlanModal}
          className={styles.viewPlanLink}
        >
          View Full Plan
        </button>
      </div>

      {todayWorkoutExercises.length > 0 ? (
        <div className={styles.tableWrap}>
          <table className={styles.customTable}>
            <thead>
              <tr>
                <th style={{ width: '32px', textAlign: 'center' }}>#</th>
                <th style={{ width: 'auto' }}>Exercise</th>
                <th style={{ width: '95px' }}>Sets × Reps</th>
                <th style={{ width: '90px' }}>Last Weight</th>
                <th style={{ width: '110px' }}>Status</th>
                <th style={{ width: '85px', textAlign: 'center' }}>Action</th>
                <th style={{ width: '32px', textAlign: 'center' }}></th>
              </tr>
            </thead>
            <tbody>
              {todayWorkoutExercises.map((row) => (
                <tr key={row.num}>
                  <td style={{ textAlign: 'center', color: '#64748B', fontWeight: 600 }}>{row.num}</td>
                  <td className={styles.exerciseName}>{row.name}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{row.sets}</td>
                  <td style={{ whiteSpace: 'nowrap', fontWeight: 500 }}>{row.weight}</td>
                  <td>
                    <span className={styles.statusPillGray}>
                      <span className={styles.grayDot} />
                      {row.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <Link href="/app/workouts/active" className={styles.startBtnOutline}>
                      <Play size={10} fill="#0A6C58" />
                      <span>Start</span>
                    </Link>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button type="button" className={styles.moreDotsBtn} aria-label="More options">
                      <MoreVertical size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={styles.emptyCardMessage}>
          <Moon size={28} className={styles.emptyIcon} />
          <h4 className={styles.emptyCardTitle}>Rest &amp; Active Recovery Day</h4>
          <p className={styles.emptyCardSub}>
            No lifting scheduled for today. Focus on hydration, hitting your daily step target, and muscle recovery.
          </p>
        </div>
      )}
    </div>
  );
};
