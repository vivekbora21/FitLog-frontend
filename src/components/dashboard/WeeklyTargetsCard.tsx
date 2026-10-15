'use client';

import React from 'react';
import {
  BarChart2,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Utensils,
  Flame,
  Heart,
  Droplets,
  Footprints,
} from 'lucide-react';
import styles from '@/app/app/page.module.css';

interface WeeklyTargetsCardProps {
  currentWeekLabel: string;
  workoutsThisWeekActual: number;
  workoutsThisWeekTarget: number;
  workoutsThisWeekPct: number;
  proteinConsumed: number;
  proteinTarget: number;
  proteinPct: number;
  caloriesConsumed: number;
  caloriesTarget: number;
  caloriesPct: number;
  cardioActual: number;
  cardioTarget: number;
  cardioPct: number;
  waterConsumedMl: number;
  waterTargetMl: number;
  waterPct: number;
  dailySteps: number | null;
  stepsPct: number;
}

export const WeeklyTargetsCard: React.FC<WeeklyTargetsCardProps> = ({
  currentWeekLabel,
  workoutsThisWeekActual,
  workoutsThisWeekTarget,
  workoutsThisWeekPct,
  proteinConsumed,
  proteinTarget,
  proteinPct,
  caloriesConsumed,
  caloriesTarget,
  caloriesPct,
  cardioActual,
  cardioTarget,
  cardioPct,
  waterConsumedMl,
  waterTargetMl,
  waterPct,
  dailySteps,
  stepsPct,
}) => {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>
          <BarChart2 size={18} className={styles.cardIcon} />
          Weekly Targets
        </span>

        <div className={styles.weekSelector}>
          <span>{currentWeekLabel}</span>
          <button type="button" className={styles.arrowBtn} title="Previous week" aria-label="Previous week">
            <ChevronLeft size={13} />
          </button>
          <button type="button" className={styles.arrowBtn} title="Next week" aria-label="Next week">
            <ChevronRight size={13} />
          </button>
        </div>
      </div>

      <div className={styles.targetsList}>
        {/* Row 1: Workouts */}
        <div className={styles.targetRow}>
          <div className={styles.targetIcon}>
            <Dumbbell size={16} />
          </div>
          <span className={styles.targetName}>Workouts</span>
          <div className={styles.targetProgressTrack}>
            <div className={styles.targetProgressFill} style={{ width: `${workoutsThisWeekPct}%`, background: '#0A6C58' }} />
          </div>
          <span className={styles.targetValues}>{workoutsThisWeekActual} / {workoutsThisWeekTarget}</span>
          <span className={styles.targetPercent}>{workoutsThisWeekPct}%</span>
        </div>

        {/* Row 2: Protein */}
        <div className={styles.targetRow}>
          <div className={styles.targetIcon}>
            <Utensils size={16} />
          </div>
          <span className={styles.targetName}>Protein</span>
          <div className={styles.targetProgressTrack}>
            <div className={styles.targetProgressFill} style={{ width: `${proteinPct}%`, background: '#10B981' }} />
          </div>
          <span className={styles.targetValues}>{proteinConsumed} / {proteinTarget} g</span>
          <span className={styles.targetPercent}>{proteinPct}%</span>
        </div>

        {/* Row 3: Calories */}
        <div className={styles.targetRow}>
          <div className={styles.targetIcon}>
            <Flame size={16} />
          </div>
          <span className={styles.targetName}>Calories</span>
          <div className={styles.targetProgressTrack}>
            <div className={styles.targetProgressFill} style={{ width: `${caloriesPct}%`, background: '#F59E0B' }} />
          </div>
          <span className={styles.targetValues}>{caloriesConsumed.toLocaleString()} / {caloriesTarget.toLocaleString()} kcal</span>
          <span className={styles.targetPercent}>{caloriesPct}%</span>
        </div>

        {/* Row 4: Cardio */}
        <div className={styles.targetRow}>
          <div className={styles.targetIcon}>
            <Heart size={16} />
          </div>
          <span className={styles.targetName}>Cardio</span>
          <div className={styles.targetProgressTrack}>
            <div
              className={styles.targetProgressFill}
              style={{
                width: `${cardioPct}%`,
                background: '#EF4444',
              }}
            />
          </div>
          <span className={styles.targetValues}>
            {cardioActual} / {cardioTarget} min
          </span>
          <span className={styles.targetPercent}>{cardioPct}%</span>
        </div>

        {/* Row 5: Water */}
        <div className={styles.targetRow}>
          <div className={styles.targetIcon}>
            <Droplets size={16} />
          </div>
          <span className={styles.targetName}>Water</span>
          <div className={styles.targetProgressTrack}>
            <div
              className={styles.targetProgressFill}
              style={{
                width: `${waterPct}%`,
                background: '#0284C7',
              }}
            />
          </div>
          <span className={styles.targetValues}>
            {waterConsumedMl} / {waterTargetMl} ml
          </span>
          <span className={styles.targetPercent}>{waterPct}%</span>
        </div>

        {/* Row 6: Steps */}
        <div className={styles.targetRow}>
          <div className={styles.targetIcon}>
            <Footprints size={16} />
          </div>
          <span className={styles.targetName}>Steps</span>
          <div className={styles.targetProgressTrack}>
            <div
              className={styles.targetProgressFill}
              style={{
                width: `${stepsPct}%`,
                background: '#94A3B8',
              }}
            />
          </div>
          <span className={dailySteps ? styles.targetValues : styles.targetValuesMuted}>
            {dailySteps ? `${dailySteps.toLocaleString()} steps` : 'Not logged'}
          </span>
          <span className={styles.targetPercent}>
            {dailySteps ? `${stepsPct}%` : '—'}
          </span>
        </div>
      </div>
    </div>
  );
};
