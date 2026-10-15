'use client';

import React from 'react';
import { Scale, Dumbbell, Utensils, CheckCircle2, TrendingUp, Sparkles } from 'lucide-react';
import { JourneySummary, JourneyDetailProgram } from '@/lib/types';
import styles from './planHistory.module.css';

interface PlanMetricCardsProps {
  summary: JourneySummary;
  program: JourneyDetailProgram;
}

export const PlanMetricCards: React.FC<PlanMetricCardsProps> = ({ summary, program }) => {
  const currentWeight = summary.current_weight_kg ?? program.start_weight_kg ?? 77.53;
  const startWeight = summary.start_weight_kg ?? program.start_weight_kg ?? 77.0;
  const targetWeight = program.target_weight_kg ?? 74.0;
  const weightChange = summary.weight_change_kg ?? (Math.round((currentWeight - startWeight) * 10) / 10);
  const weightChangeStr = weightChange > 0 ? `+${weightChange.toFixed(1)}` : `${weightChange.toFixed(1)}`;

  const totalSessions = program.duration_days || 60;
  const completedSessions = summary.total_workouts || program.completed_days || 6;
  const workoutPct = Math.min(100, Math.round((completedSessions / Math.max(1, totalSessions)) * 100));

  const nutritionStatus = summary.nutrition_status || {
    label: '95% Cal / 5 meals logged today',
    percentage: 95,
    is_on_track: true,
  };

  const consistencyPct = summary.consistency_pct ?? 97;
  // Circular gauge circumference for r=20: 2 * Math.PI * 20 = ~125.66
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (consistencyPct / 100) * circumference;

  return (
    <div className={styles.metricsGrid}>
      {/* Card 1: Current Weight */}
      <div className={styles.metricCard}>
        <div className={styles.metricCardHeader}>
          <div className={styles.metricCardTitleWrap}>
            <div className={styles.metricIconBox}>
              <Scale size={16} />
            </div>
            <span className={styles.metricCardLabel}>Current Weight</span>
          </div>
          <span className={styles.deltaBadgeGreen}>
            <TrendingUp size={11} /> {weightChangeStr} kg
          </span>
        </div>

        <div className={styles.metricBigNumberRow}>
          <span className={styles.metricBigNumber}>{currentWeight}</span>
          <span className={styles.metricUnit}>kg</span>
        </div>

        <div className={styles.metricCardFooter}>
          <span>Start: <strong>{startWeight} kg</strong></span>
          <span>Target: <strong>{targetWeight} kg</strong></span>
        </div>
      </div>

      {/* Card 2: Workouts Completed */}
      <div className={styles.metricCard}>
        <div className={styles.metricCardHeader}>
          <div className={styles.metricCardTitleWrap}>
            <div className={styles.metricIconBox}>
              <Dumbbell size={16} />
            </div>
            <span className={styles.metricCardLabel}>Workouts Completed</span>
          </div>
          <span className={styles.statusPill}>
            {workoutPct}% Done
          </span>
        </div>

        <div className={styles.metricBigNumberRow}>
          <span className={styles.metricBigNumber}>{completedSessions}</span>
          <span className={styles.metricUnit}>/ {totalSessions} sessions</span>
        </div>

        <div className={styles.metricProgressTrack}>
          <div className={styles.metricProgressFill} style={{ width: `${workoutPct}%` }} />
        </div>

        <div className={styles.metricCardFooter}>
          <span>{totalSessions - completedSessions} sessions remaining</span>
          <span>Day {program.current_day || 12}</span>
        </div>
      </div>

      {/* Card 3: Nutrition Status */}
      <div className={styles.metricCard}>
        <div className={styles.metricCardHeader}>
          <div className={styles.metricCardTitleWrap}>
            <div className={styles.metricIconBox}>
              <Utensils size={16} />
            </div>
            <span className={styles.metricCardLabel}>Nutrition Status</span>
          </div>
          <span className={styles.deltaBadgeGreen}>
            <CheckCircle2 size={11} /> On Track
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', fontFamily: 'Outfit, sans-serif' }}>
            {nutritionStatus.label}
          </span>
          <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
            Calorie budget intact &amp; protein on target
          </span>
        </div>

        <div className={styles.metricCardFooter}>
          <span>Empirical recomp adherence</span>
          <span>Optimal</span>
        </div>
      </div>

      {/* Card 4: Completion Rate / Consistency */}
      <div className={styles.metricCard}>
        <div className={styles.metricCardHeader}>
          <div className={styles.metricCardTitleWrap}>
            <div className={styles.metricIconBox}>
              <Sparkles size={16} />
            </div>
            <span className={styles.metricCardLabel}>Completion Rate</span>
          </div>
          <span className={styles.encouragementTag}>
            On track, great job!
          </span>
        </div>

        <div className={styles.circularMeterWrap}>
          <svg className={styles.circularMeterSvg} viewBox="0 0 52 52">
            <circle cx="26" cy="26" r={radius} className={styles.circularMeterBg} />
            <circle
              cx="26"
              cy="26"
              r={radius}
              className={styles.circularMeterFill}
              style={{
                strokeDasharray: circumference,
                strokeDashoffset: strokeDashoffset,
              }}
            />
          </svg>
          <div>
            <div className={styles.metricBigNumber}>{consistencyPct}%</div>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Workout Consistency</span>
          </div>
        </div>

        <div className={styles.metricCardFooter}>
          <span>Based on prescribed schedule</span>
          <span style={{ color: '#059669', fontWeight: 700 }}>Excellent</span>
        </div>
      </div>
    </div>
  );
};
