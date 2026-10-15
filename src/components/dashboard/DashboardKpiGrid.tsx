'use client';

import React from 'react';
import { Scale, ArrowRight, Flame, Beef, Dumbbell } from 'lucide-react';
import styles from '@/app/app/page.module.css';

interface DashboardKpiGridProps {
  currentWeight: number | null;
  weightChangeInfo: { text: string; sub: string; isNegative: boolean } | null;
  weightSparklineD: string | null;
  caloriesConsumed: number;
  caloriesTarget: number;
  caloriesPct: number;
  proteinConsumed: number;
  proteinTarget: number;
  proteinPct: number;
  workoutsThisWeekActual: number;
  workoutsThisWeekTarget: number;
  workoutsThisWeekPct: number;
  onNavigate: (path: string) => void;
}

export const DashboardKpiGrid: React.FC<DashboardKpiGridProps> = ({
  currentWeight,
  weightChangeInfo,
  weightSparklineD,
  caloriesConsumed,
  caloriesTarget,
  caloriesPct,
  proteinConsumed,
  proteinTarget,
  proteinPct,
  workoutsThisWeekActual,
  workoutsThisWeekTarget,
  workoutsThisWeekPct,
  onNavigate,
}) => {
  return (
    <section className={styles.kpiGrid}>
      {/* Card 1: Current Weight */}
      <div className={styles.kpiCard}>
        <div className={styles.kpiHeader}>
          <div className={styles.kpiHeaderLeft}>
            <div className={`${styles.kpiIconCircle} ${styles.iconMint}`}>
              <Scale size={17} />
            </div>
            <span className={styles.kpiTitle}>Current Weight</span>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('/app/measurements')}
            className={styles.kpiArrowBtn}
            title="View measurements"
            aria-label="View measurements"
          >
            <ArrowRight size={13} />
          </button>
        </div>
        <div className={styles.kpiBody}>
          <div className={styles.kpiBodyLeft}>
            <span className={styles.kpiValue}>
              {currentWeight != null ? `${currentWeight} kg` : '—'}
            </span>
            {weightChangeInfo && (
              <span className={styles.kpiBadge}>
                {weightChangeInfo.text} <span className={styles.kpiSubText}>{weightChangeInfo.sub}</span>
              </span>
            )}
          </div>
          {/* Real SVG Sparkline */}
          {weightSparklineD ? (
            <svg viewBox="0 0 80 26" className={styles.kpiSparkline}>
              <path
                d={weightSparklineD}
                fill="none"
                stroke="#0B856D"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : null}
        </div>
      </div>

      {/* Card 2: Calories */}
      <div className={styles.kpiCard}>
        <div className={styles.kpiHeader}>
          <div className={styles.kpiHeaderLeft}>
            <div className={`${styles.kpiIconCircle} ${styles.iconOrange}`}>
              <Flame size={17} />
            </div>
            <span className={styles.kpiTitle}>Calories</span>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('/app/nutrition')}
            className={styles.kpiArrowBtn}
            title="View nutrition"
            aria-label="View nutrition"
          >
            <ArrowRight size={13} />
          </button>
        </div>
        <div className={styles.kpiValue}>
          {caloriesConsumed.toLocaleString()} / {caloriesTarget.toLocaleString()} kcal
        </div>
        <div className={styles.kpiProgressRow}>
          <div className={styles.kpiProgressTrack}>
            <div className={styles.kpiProgressFill} style={{ width: `${caloriesPct}%` }} />
          </div>
          <span className={styles.kpiProgressPercent}>{caloriesPct}%</span>
        </div>
      </div>

      {/* Card 3: Protein */}
      <div className={styles.kpiCard}>
        <div className={styles.kpiHeader}>
          <div className={styles.kpiHeaderLeft}>
            <div className={`${styles.kpiIconCircle} ${styles.iconBlue}`}>
              <Beef size={17} />
            </div>
            <span className={styles.kpiTitle}>Protein</span>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('/app/nutrition')}
            className={styles.kpiArrowBtn}
            title="View protein macros"
            aria-label="View protein macros"
          >
            <ArrowRight size={13} />
          </button>
        </div>
        <div className={styles.kpiValue}>
          {proteinConsumed} / {proteinTarget} g
        </div>
        <div className={styles.kpiProgressRow}>
          <div className={styles.kpiProgressTrack}>
            <div className={styles.kpiProgressFill} style={{ width: `${proteinPct}%` }} />
          </div>
          <span className={styles.kpiProgressPercent}>{proteinPct}%</span>
        </div>
      </div>

      {/* Card 4: Workouts This Week */}
      <div className={styles.kpiCard}>
        <div className={styles.kpiHeader}>
          <div className={styles.kpiHeaderLeft}>
            <div className={`${styles.kpiIconCircle} ${styles.iconMint}`}>
              <Dumbbell size={17} />
            </div>
            <span className={styles.kpiTitle}>Workouts This Week</span>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('/app/workouts')}
            className={styles.kpiArrowBtn}
            title="View workouts"
            aria-label="View workouts"
          >
            <ArrowRight size={13} />
          </button>
        </div>
        <div className={styles.kpiValue}>
          {workoutsThisWeekActual} / {workoutsThisWeekTarget}
        </div>
        <div className={styles.kpiProgressRow}>
          <div className={styles.kpiProgressTrack}>
            <div className={styles.kpiProgressFill} style={{ width: `${workoutsThisWeekPct}%` }} />
          </div>
          <span className={styles.kpiProgressPercent}>{workoutsThisWeekPct}%</span>
        </div>
      </div>
    </section>
  );
};
