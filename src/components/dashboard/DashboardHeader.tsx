'use client';

import React from 'react';
import Link from 'next/link';
import { Calendar, Flame, Bookmark, BarChart3, Plus, Play } from 'lucide-react';
import styles from '@/app/app/page.module.css';

interface DashboardHeaderProps {
  formattedDate: string;
  streakDays: number;
  greeting: string;
  userName: string;
  programName: string | null;
  programDay: number | null;
  programDuration: number | null;
  daysRemaining: number | null;
  programPct: number;
  onQuickCheckIn: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  formattedDate,
  streakDays,
  greeting,
  userName,
  programName,
  programDay,
  programDuration,
  daysRemaining,
  programPct,
  onQuickCheckIn,
}) => {
  return (
    <section className={styles.headerSection}>
      <div className={styles.headerLeft}>
        <div className={styles.dateAndStreak}>
          <Calendar size={14} className={styles.chevronIcon} />
          <span className={styles.dateText}>{formattedDate}</span>
          {streakDays > 0 && (
            <span className={styles.streakBadge}>
              <Flame size={12} className={styles.streakIcon} />
              +{streakDays} Day Streak
            </span>
          )}
        </div>

        <div className={styles.greetingRow}>
          <Bookmark size={22} className={styles.greetingIcon} />
          <h2 className={styles.greetingTitle}>
            {greeting}, {userName}
          </h2>
        </div>

        <div className={styles.greetingSubtitle}>
          {programName && programDay && programDuration ? (
            <>Stay consistent. Day {programDay} of {programDuration} — {programName}</>
          ) : (
            <>Stay consistent. Track your nutrition, workouts, and body metrics.</>
          )}
        </div>
      </div>

      <div className={styles.headerRight}>
        {/* Program Progress Card (Real DB) */}
        {programName && (
          <div className={styles.programCard}>
            <div className={styles.programIconCircle}>
              <BarChart3 size={20} />
            </div>
            <div className={styles.programInfo}>
              <span className={styles.programTitle}>{programName}</span>
              <span className={styles.programSubtitle}>
                {programDay && programDuration ? (
                  <>Day {programDay} of {programDuration}{daysRemaining != null ? ` · ${daysRemaining} days remaining` : ''}</>
                ) : (
                  <>Active Journey</>
                )}
              </span>
              <div className={styles.programBarRow}>
                <div className={styles.programBarTrack}>
                  <div className={styles.programBarFill} style={{ width: `${programPct}%` }} />
                </div>
                <span className={styles.programBarPercent}>{programPct}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Header Action Buttons */}
        <div className={styles.actionButtons}>
          <button
            type="button"
            onClick={onQuickCheckIn}
            className={styles.quickCheckInBtn}
          >
            <Plus size={14} />
            <span>Quick Check-in</span>
          </button>
          <Link href="/app/workouts/active" className={styles.startWorkoutBtn}>
            <Play size={13} fill="#FFFFFF" />
            <span>Start Workout</span>
          </Link>
        </div>
      </div>
    </section>
  );
};
