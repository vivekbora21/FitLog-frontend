'use client';

import React, { useState, useMemo } from 'react';
import { HelpCircle, CalendarCheck, CheckCircle2, AlertTriangle } from 'lucide-react';
import styles from './AnalyticsCharts.module.css';

export interface WeeklyReviewItem {
  week_number?: number;
  workout_pct?: number;
  completed?: number;
  workouts_target?: number;
  avg_weight?: number | null;
  avg_calories?: number | null;
  [key: string]: any;
}

interface AdherenceTrendChartProps {
  weeklyReview?: WeeklyReviewItem[];
  durationDays?: number;
  currentDay?: number;
  startDate?: string;
  adherencePct?: number;
}

export const AdherenceTrendChart: React.FC<AdherenceTrendChartProps> = ({
  weeklyReview = [],
  durationDays = 60,
  currentDay = 1,
  startDate,
  adherencePct = 100,
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const totalWeeks = Math.ceil(durationDays / 7);
  const currentWeekIdx = Math.min(totalWeeks - 1, Math.floor(Math.max(0, currentDay - 1) / 7));

  // Build week-by-week adherence series
  const weeks = useMemo(() => {
    return Array.from({ length: Math.min(totalWeeks, 12) }, (_, i) => {
      const reviewItem = weeklyReview.find((r, rIdx) => (r.week_number ? r.week_number === i + 1 : rIdx === i));
      const isPast = i < currentWeekIdx;
      const isCurrent = i === currentWeekIdx;
      const isFuture = i > currentWeekIdx;

      let pct = 100;
      let completed = 5;
      let target = 5;

      if (reviewItem) {
        pct = reviewItem.workout_pct != null ? Math.round(reviewItem.workout_pct * 100) : 100;
        completed = reviewItem.completed ?? 5;
        target = reviewItem.workouts_target ?? 5;
      } else if (isCurrent) {
        pct = adherencePct;
        completed = Math.min(target, Math.round((adherencePct / 100) * target));
      } else if (isFuture) {
        pct = 0;
        completed = 0;
      }

      // Compute approximate dates if startDate provided
      let dateLabel = `Week ${i + 1}`;
      if (startDate) {
        const [y, m, d] = startDate.split('-').map(Number);
        const wStart = new Date(Date.UTC(y, m - 1, d + i * 7));
        const wEnd = new Date(Date.UTC(y, m - 1, d + Math.min(i * 7 + 6, durationDays - 1)));
        const sStr = wStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
        const eStr = wEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
        dateLabel = `${sStr} – ${eStr}`;
      }

      return {
        weekNumber: i + 1,
        label: `W${i + 1}`,
        dateRange: dateLabel,
        pct: Math.min(100, Math.max(0, pct)),
        completed,
        target,
        isPast,
        isCurrent,
        isFuture,
      };
    });
  }, [weeklyReview, totalWeeks, currentWeekIdx, durationDays, startDate, adherencePct]);

  // SVG Chart Geometry
  const width = 640;
  const height = 230;
  const paddingLeft = 40;
  const paddingRight = 44;
  const paddingTop = 26;
  const paddingBottom = 34;
  const chartHeight = height - paddingTop - paddingBottom;
  const chartWidth = width - paddingLeft - paddingRight;

  const yMin = 0;
  const yMax = 100;
  const getY = (val: number) => height - paddingBottom - (val / 100) * chartHeight;

  // 85% Target Adherence Line Y
  const benchmarkY = getY(85);

  const activeWeek = hoverIndex !== null ? weeks[hoverIndex] : null;

  return (
    <div className={styles.chartCard}>
      {/* Question Header */}
      <div className={styles.questionHeader}>
        <div className={styles.questionContent}>
          <div className={`${styles.questionBadge} ${styles.questionBadgeAmber}`}>
            <HelpCircle size={12} /> Stated Analytic Question
          </div>
          <h3 className={styles.questionTitle}>
            Are you sustaining the weekly training and routine consistency needed to guarantee results?
          </h3>
          <p className={styles.questionSubtitle}>
            Transformations are governed by sustained weekly training stimulus. Hitting <strong>&ge;85% Adherence</strong> week-over-week produces reliable progressive overload and prevents metabolic adaptation stalls.
          </p>
        </div>

        <div className={styles.headerMetrics}>
          <div className={styles.metricChip}>
            <span className={styles.metricChipLabel}>Current Adherence</span>
            <span
              className={`${styles.metricChipValue} ${adherencePct >= 85 ? styles.textEmerald : styles.textAmber}`}
            >
              {adherencePct}%
            </span>
          </div>
          <div className={styles.metricChip}>
            <span className={styles.metricChipLabel}>Benchmark Target</span>
            <span className={`${styles.metricChipValue} ${styles.textEmerald}`}>
              &ge; 85%
            </span>
          </div>
          <div className={styles.metricChip}>
            <span className={styles.metricChipLabel}>Current Week</span>
            <span className={styles.metricChipValue}>
              Week {currentWeekIdx + 1} of {totalWeeks}
            </span>
          </div>
        </div>
      </div>

      {/* Legend & Hover Readout */}
      <div className={styles.legendBar}>
        <div className={styles.legendItems}>
          <span className={styles.legendItem}>
            <span className={styles.legendDotEmerald} />
            <span>Optimal Adherence (&ge;85%)</span>
          </span>
          <span className={styles.legendItem}>
            <span className={styles.legendDotAmber} />
            <span>Pacing Alert (&lt;85%)</span>
          </span>
          <span className={styles.legendItem}>
            <span className={styles.legendDashedEmerald} />
            <span>85% Consistency Benchmark</span>
          </span>
        </div>

        {activeWeek ? (
          <div className={styles.readoutTooltip}>
            <span className={styles.readoutTag}>Week {activeWeek.weekNumber} ({activeWeek.dateRange}):</span>
            {activeWeek.isFuture ? (
              <span className={styles.textMutedSmall}>Upcoming</span>
            ) : (
              <>
                <span>Completed: <strong>{activeWeek.completed}/{activeWeek.target} Sessions</strong></span>
                <span className={activeWeek.pct >= 85 ? styles.textEmerald : styles.textAmber}>
                  ({activeWeek.pct}% Adherence)
                </span>
                <span className={styles.readoutSubtext}>
                  {activeWeek.isCurrent ? '· Current Week' : activeWeek.pct >= 85 ? '· On Track' : '· Alert'}
                </span>
              </>
            )}
          </div>
        ) : (
          <span className={styles.textMutedSmall}>
            Hover over any week to review workout volume &amp; adherence rate
          </span>
        )}
      </div>

      {/* SVG Canvas */}
      <div className={styles.svgWrap}>
        <svg viewBox={`0 0 ${width} ${height}`} className={styles.svg}>
          {/* Grid lines */}
          <line x1={paddingLeft} y1={paddingTop} x2={width - paddingRight} y2={paddingTop} className={styles.gridLine} />
          <line x1={paddingLeft} y1={benchmarkY} x2={width - paddingRight} y2={benchmarkY} stroke="#10B981" strokeDasharray="4 4" strokeWidth="1.5" opacity="0.85" />
          <line
            x1={paddingLeft}
            y1={(paddingTop + height - paddingBottom) / 2}
            x2={width - paddingRight}
            y2={(paddingTop + height - paddingBottom) / 2}
            className={styles.gridLine}
          />
          <line x1={paddingLeft} y1={height - paddingBottom} x2={width - paddingRight} y2={height - paddingBottom} className={styles.axisLine} />

          {/* Y Axis text */}
          <text x={paddingLeft - 8} y={paddingTop + 4} textAnchor="end" className={styles.axisText}>
            100%
          </text>
          <text x={paddingLeft - 8} y={benchmarkY + 3.5} textAnchor="end" className={styles.axisText} fill="#059669" fontWeight="700">
            85%
          </text>
          <text x={paddingLeft - 8} y={(paddingTop + height - paddingBottom) / 2 + 4} textAnchor="end" className={styles.axisText}>
            50%
          </text>
          <text x={paddingLeft - 8} y={height - paddingBottom} textAnchor="end" className={styles.axisText}>
            0%
          </text>

          {/* 85% Benchmark Tag right side */}
          <text
            x={width - paddingRight + 4}
            y={benchmarkY + 3.5}
            fontSize="9"
            fill="#059669"
            fontWeight="700"
          >
            85% Target
          </text>

          {/* Weekly Bars */}
          {weeks.map((w, idx) => {
            const barCount = weeks.length;
            const slotWidth = chartWidth / barCount;
            const barWidth = Math.min(36, Math.max(16, slotWidth * 0.65));
            const centerX = paddingLeft + (idx + 0.5) * slotWidth;
            const barHeight = w.isFuture ? 4 : Math.max(4, (w.pct / 100) * chartHeight);
            const barY = height - paddingBottom - barHeight;

            let fillColor = '#10B981';
            if (w.isFuture) {
              fillColor = 'rgba(148, 163, 184, 0.2)';
            } else if (w.pct >= 85) {
              fillColor = '#10B981';
            } else if (w.pct >= 70) {
              fillColor = '#F59E0B';
            } else {
              fillColor = '#F43F5E';
            }

            const isHovered = hoverIndex === idx;

            return (
              <g key={`bar-${idx}`}>
                <rect
                  x={centerX - barWidth / 2}
                  y={barY}
                  width={barWidth}
                  height={barHeight}
                  rx="4"
                  fill={isHovered ? fillColor : `${fillColor}ee`}
                  stroke={w.isCurrent ? '#0ea5e9' : 'transparent'}
                  strokeWidth={w.isCurrent ? 2 : 0}
                  className={styles.dataDot}
                />

                {/* Percentage label on top of bar */}
                {!w.isFuture && (
                  <text
                    x={centerX}
                    y={barY - 5}
                    textAnchor="middle"
                    fontSize="10"
                    fill={fillColor}
                    fontWeight="800"
                  >
                    {w.pct}%
                  </text>
                )}

                {/* Current week indicator dot */}
                {w.isCurrent && (
                  <circle
                    cx={centerX}
                    cy={height - paddingBottom + 26}
                    r={2.5}
                    fill="#0ea5e9"
                  />
                )}
              </g>
            );
          })}

          {/* Hover capture columns */}
          {weeks.map((w, idx) => {
            const slotWidth = chartWidth / weeks.length;
            const x = paddingLeft + idx * slotWidth;
            return (
              <rect
                key={`hover-col-${idx}`}
                x={x}
                y={paddingTop}
                width={slotWidth}
                height={chartHeight}
                className={styles.hoverColumn}
                onMouseEnter={() => setHoverIndex(idx)}
                onMouseLeave={() => setHoverIndex(null)}
              />
            );
          })}

          {/* X Axis Labels */}
          {weeks.map((w, idx) => {
            const slotWidth = chartWidth / weeks.length;
            const centerX = paddingLeft + (idx + 0.5) * slotWidth;
            return (
              <text
                key={`label-${idx}`}
                x={centerX}
                y={height - paddingBottom + 16}
                textAnchor="middle"
                className={hoverIndex === idx ? styles.axisTextActive : styles.axisText}
              >
                {w.label}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
