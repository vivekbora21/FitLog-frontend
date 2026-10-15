'use client';

import React from 'react';
import Link from 'next/link';
import { ListChecks, Play, MoreVertical, Moon, Check, CheckCircle2, Dumbbell, Clock, Plus, ChevronRight } from 'lucide-react';
import styles from '@/app/app/page.module.css';

export interface TodayExerciseRow {
  num: number;
  name: string;
  sets: string;
  weight: string;
  status: string;
}

export interface CompletedWorkoutSummary {
  title: string;
  volumeKg?: number;
  durationMin?: number;
  exercisesCount?: number;
  sessionId?: string | null;
}

interface TodayWorkoutCardProps {
  todayWorkoutExercises: TodayExerciseRow[];
  onOpenPlanModal: () => void;
  isWorkoutDone?: boolean;
  completedWorkout?: CompletedWorkoutSummary | null;
  routineName?: string;
}

export const TodayWorkoutCard: React.FC<TodayWorkoutCardProps> = ({
  todayWorkoutExercises,
  onOpenPlanModal,
  isWorkoutDone = false,
  completedWorkout = null,
  routineName,
}) => {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span className={styles.cardTitle}>
            {isWorkoutDone ? (
              <CheckCircle2 size={18} className={styles.cardIcon} style={{ color: '#0A6C58' }} />
            ) : (
              <ListChecks size={18} className={styles.cardIcon} />
            )}
            Today&apos;s Workout
          </span>

          {isWorkoutDone ? (
            <span className={styles.completedBadge}>
              <Check size={11} strokeWidth={3} />
              Completed
            </span>
          ) : routineName ? (
            <span className={styles.routineBadge}>
              {routineName}
            </span>
          ) : null}
        </div>

        <div className={styles.cardHeaderActions}>
          {!isWorkoutDone && todayWorkoutExercises.length > 0 && (
            <Link href="/app/workouts/active" className={styles.startWorkoutBtnHeader}>
              <Play size={11} fill="#FFFFFF" />
              <span>Start Workout</span>
            </Link>
          )}

          <button
            type="button"
            onClick={onOpenPlanModal}
            className={styles.viewPlanLink}
          >
            View Full Plan
          </button>
        </div>
      </div>

      {isWorkoutDone ? (
        <div className={styles.completedWorkoutContainer}>
          <div className={styles.completedHero}>
            <div className={styles.completedHeroIcon}>
              <Check size={22} strokeWidth={2.8} />
            </div>
            <div className={styles.completedHeroBody}>
              <h4 className={styles.completedHeroTitle}>
                {completedWorkout?.title || routineName || "Today's Session"}
              </h4>
              <p className={styles.completedHeroSub}>
                Completed today — great work staying consistent! 🎉
              </p>
            </div>
          </div>

          <div className={styles.completedMetricsGrid}>
            <div className={styles.completedMetricTile}>
              <Dumbbell size={15} color="#0A6C58" />
              <div className={styles.completedMetricVal}>
                {(completedWorkout?.volumeKg ?? 0) > 0
                  ? `${Math.round(completedWorkout!.volumeKg!).toLocaleString()} kg`
                  : '—'}
              </div>
              <div className={styles.completedMetricLbl}>Volume Lifted</div>
            </div>

            <div className={styles.completedMetricTile}>
              <Clock size={15} color="#0284C7" />
              <div className={styles.completedMetricVal}>
                {(completedWorkout?.durationMin ?? 0) > 0
                  ? `${completedWorkout!.durationMin} min`
                  : '—'}
              </div>
              <div className={styles.completedMetricLbl}>Duration</div>
            </div>

            <div className={styles.completedMetricTile}>
              <CheckCircle2 size={15} color="#0A6C58" />
              <div className={styles.completedMetricVal}>
                {(completedWorkout?.exercisesCount ?? 0) > 0
                  ? `${completedWorkout!.exercisesCount} exercises`
                  : 'Completed'}
              </div>
              <div className={styles.completedMetricLbl}>Exercises</div>
            </div>
          </div>

          <div className={styles.completedActionsRow}>
            <Link href="/app/workouts/plan/history" className={styles.completedPrimaryBtn}>
              <CheckCircle2 size={14} />
              <span>View in Plan History</span>
            </Link>

            <Link href="/app/workouts/active" className={styles.completedSecondaryBtn}>
              <Plus size={14} />
              <span>Log Another Workout</span>
            </Link>
          </div>
        </div>
      ) : todayWorkoutExercises.length > 0 ? (
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
          <Link
            href="/app/workouts/active"
            className={styles.completedSecondaryBtn}
            style={{ marginTop: '0.75rem' }}
          >
            <Plus size={14} />
            <span>Log Custom Workout</span>
          </Link>
        </div>
      )}
    </div>
  );
};
