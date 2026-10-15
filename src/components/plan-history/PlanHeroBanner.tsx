'use client';

import React from 'react';
import Link from 'next/link';
import {
  ChevronRight,
  SlidersHorizontal,
  Scale,
  Sparkles,
  Calendar,
  Clock,
  Target,
  ArrowRight,
} from 'lucide-react';
import { JourneyDetailProgram } from '@/lib/types';
import styles from './planHistory.module.css';

interface PlanHeroBannerProps {
  program: JourneyDetailProgram;
  onOpenPlanSelector: () => void;
  onOpenLogWeight: () => void;
}

/**
 * Safely parse YYYY-MM-DD strings to local Date object without UTC drift.
 */
function parseDateSafe(dateStr?: string | null): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = Number(parts[0]);
    const month = Number(parts[1]) - 1;
    const day = Number(parts[2]);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      return new Date(year, month, day);
    }
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Format a start and completion date range into clean, human-readable format.
 * e.g., "Sep 14 – Nov 12, 2026"
 */
function formatDateRange(startDateStr?: string, endDateStr?: string): string {
  const start = parseDateSafe(startDateStr);
  const end = parseDateSafe(endDateStr);

  if (start && end) {
    const startYear = start.getFullYear();
    const endYear = end.getFullYear();

    if (startYear === endYear) {
      const s = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const e = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return `${s} – ${e}`;
    } else {
      const s = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const e = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return `${s} – ${e}`;
    }
  }

  if (start && !end) {
    const s = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `Started ${s}`;
  }

  if (!start && end) {
    const e = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `Ends ${e}`;
  }

  return 'Active Journey';
}

export const PlanHeroBanner: React.FC<PlanHeroBannerProps> = ({
  program,
  onOpenPlanSelector,
  onOpenLogWeight,
}) => {
  const currentDay = program.current_day || 1;
  const totalDays = program.duration_days || 60;
  const modeLabel = program.mode_label || (program.mode ? `${program.mode} Mode` : 'Recomp Mode');

  const daysRemaining = Math.max(0, totalDays - currentDay);
  const dateRangeFormatted = formatDateRange(program.start_date, program.end_date);

  const startDateObj = parseDateSafe(program.start_date);
  const endDateObj = parseDateSafe(program.end_date);
  const completionDateFormatted = endDateObj
    ? endDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;
  const startDateFormatted = startDateObj
    ? startDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* Breadcrumb Navigation */}
      <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
        <Link href="/app" className={styles.breadcrumbLink}>
          Dashboard
        </Link>
        <ChevronRight size={13} />
        <Link href="/app/workouts/plan/history" className={styles.breadcrumbLink}>
          Workout Plan
        </Link>
        <ChevronRight size={13} />
        <span className={styles.breadcrumbCurrent}>History</span>
      </nav>

      {/* Main Hero Card Banner */}
      <div className={styles.heroBanner}>
        <div className={styles.heroLeft}>
          <div className={styles.heroBadgeRow}>
            <span className={styles.dayPill}>
              DAY {currentDay}/{totalDays}
            </span>
            <span className={styles.modePill}>
              <Sparkles size={13} /> {modeLabel}
            </span>
            <span className={styles.statusPill}>
              {program.active ? 'Active Journey' : 'Archived'}
            </span>
          </div>

          <h1 className={styles.heroTitle}>
            {program.name || '60-Day Fitness Journey'}
          </h1>

          <div className={styles.heroSubtitle}>
            {/* 1. Formatted Start -> Completion Date Range */}
            <div
              className={styles.heroMetaItem}
              title={
                completionDateFormatted
                  ? `Started: ${startDateFormatted || 'Day 1'} • Target Completion: ${completionDateFormatted}`
                  : undefined
              }
            >
              <Calendar size={14} className={styles.metaIcon} />
              <span>{dateRangeFormatted}</span>
            </div>

            <span className={styles.metaDot}>&bull;</span>

            {/* 2. Duration & Completion Time Remaining */}
            <div className={styles.heroMetaItem}>
              <Clock size={14} className={styles.metaIcon} />
              <span>{totalDays} Days Total</span>
              {program.active ? (
                daysRemaining > 0 ? (
                  <span className={styles.remainingBadge}>
                    {daysRemaining} days left
                  </span>
                ) : (
                  <span className={styles.remainingBadge}>Final Day</span>
                )
              ) : (
                <span className={styles.completedBadge}>Completed</span>
              )}
            </div>

            {/* 3. Target Corridor */}
            {program.start_weight_kg != null && program.target_weight_kg != null && (
              <>
                <span className={styles.metaDot}>&bull;</span>
                <div className={styles.heroMetaItem}>
                  <Target size={14} className={styles.metaIcon} />
                  <span>
                    Corridor: <strong>{program.start_weight_kg} kg</strong>
                    <ArrowRight size={12} className={styles.corridorArrow} />
                    <strong>{program.target_weight_kg} kg</strong>
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className={styles.heroActions}>
          <button
            type="button"
            className={styles.secondaryActionBtn}
            onClick={onOpenPlanSelector}
          >
            <SlidersHorizontal size={15} />
            <span>Change Plan</span>
          </button>

          <button
            type="button"
            className={styles.primaryActionBtn}
            onClick={onOpenLogWeight}
          >
            <Scale size={15} />
            <span>Log Fasted Weight</span>
          </button>
        </div>
      </div>
    </div>
  );
};
