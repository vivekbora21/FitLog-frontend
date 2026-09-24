'use client';

import React, { useState, useMemo } from 'react';
import { HelpCircle, TrendingUp, CheckCircle, Scale } from 'lucide-react';
import { TrajectoryPoint } from '@/lib/types';
import styles from './AnalyticsCharts.module.css';

export interface WeightLogEntryLike {
  date: string;
  weight_kg: number;
}

interface WeightTrajectoryChartProps {
  weights: WeightLogEntryLike[]; // chronological or reverse, will be sorted
  trajectoryCurve?: TrajectoryPoint[];
  startWeight: number;
  targetWeight: number;
  durationDays?: number;
  currentDay?: number;
  startDate?: string;
}

export const WeightTrajectoryChart: React.FC<WeightTrajectoryChartProps> = ({
  weights,
  trajectoryCurve = [],
  startWeight,
  targetWeight,
  durationDays = 60,
  currentDay = 1,
  startDate,
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Sort weights chronologically (oldest first)
  const sortedWeights = useMemo(() => {
    return [...weights].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [weights]);

  // Construct chart timeline points
  const points = useMemo(() => {
    if (sortedWeights.length === 0 && trajectoryCurve.length === 0) return [];

    // Map weights by date string
    const weightByDate = new Map<string, number>();
    sortedWeights.forEach((w) => {
      weightByDate.set(w.date, w.weight_kg);
    });

    // If trajectory curve is provided from backend, use it as baseline timeline
    // Otherwise construct linear timeline
    let timeline: Array<{
      date: string;
      day: number;
      actualWeight: number | null;
      targetWeight: number;
      label: string;
    }> = [];

    if (trajectoryCurve && trajectoryCurve.length > 0) {
      // Show up to current day + 7 (or whole program if <= 14 days)
      const maxDayToShow = Math.min(durationDays, Math.max(currentDay + 5, 10));
      timeline = trajectoryCurve.slice(0, maxDayToShow).map((tp) => {
        const actual = tp.actual_weight ?? weightByDate.get(tp.date) ?? null;
        return {
          date: tp.date,
          day: tp.day,
          actualWeight: actual != null ? Number(actual) : null,
          targetWeight: Number(tp.target_weight),
          label: `Day ${tp.day}`,
        };
      });
    } else {
      // Fallback: build from sorted weights
      timeline = sortedWeights.map((w, idx) => {
        const dayNum = idx + 1;
        const target = startWeight + ((targetWeight - startWeight) / Math.max(durationDays - 1, 1)) * idx;
        return {
          date: w.date,
          day: dayNum,
          actualWeight: w.weight_kg,
          targetWeight: Math.round(target * 100) / 100,
          label: new Date(w.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        };
      });
    }

    // Compute rolling 7-day average for each point
    const allLoggedValues: number[] = [];
    return timeline.map((p) => {
      if (p.actualWeight != null) {
        allLoggedValues.push(p.actualWeight);
      }
      const window = allLoggedValues.slice(-7);
      const rollingAvg = window.length > 0 ? Math.round((window.reduce((a, b) => a + b, 0) / window.length) * 100) / 100 : null;

      const dateObj = new Date(p.date + (p.date.includes('T') ? '' : 'T00:00:00Z'));
      const formattedDate = !isNaN(dateObj.getTime())
        ? dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
        : p.date;

      return {
        ...p,
        rollingAvg,
        displayDate: formattedDate,
      };
    });
  }, [sortedWeights, trajectoryCurve, startWeight, targetWeight, durationDays, currentDay]);

  if (points.length === 0) {
    return (
      <div className={styles.chartCard}>
        <div className={styles.questionHeader}>
          <div className={styles.questionContent}>
            <div className={styles.questionBadge}>
              <HelpCircle size={12} /> Stated Analytic Question
            </div>
            <h3 className={styles.questionTitle}>
              Is weight progressing along the planned trajectory once daily fluid fluctuations are smoothed?
            </h3>
            <p className={styles.questionSubtitle}>
              Daily scale weights bounce by 0.5–1.5 kg due to hydration and glycogen. Once weight is logged, this chart separates noise from true tissue change.
            </p>
          </div>
        </div>
        <div className={styles.emptyState}>
          <Scale size={32} color="var(--text-muted)" />
          <div className={styles.emptyText}>No weight logs recorded yet</div>
          <div className={styles.emptySubtext}>Log your first morning fasted weigh-in to begin tracking actual weight vs rolling average vs planned trajectory.</div>
        </div>
      </div>
    );
  }

  // Calculate SVG scales
  const allValues: number[] = [];
  points.forEach((p) => {
    if (p.actualWeight != null) allValues.push(p.actualWeight);
    if (p.rollingAvg != null) allValues.push(p.rollingAvg);
    allValues.push(p.targetWeight);
  });
  if (startWeight) allValues.push(startWeight);
  if (targetWeight) allValues.push(targetWeight);

  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);
  const yMin = Math.floor(minVal - 0.6);
  const yMax = Math.ceil(maxVal + 0.6);
  const yRange = Math.max(1, yMax - yMin);

  const width = 640;
  const height = 240;
  const paddingLeft = 40;
  const paddingRight = 44;
  const paddingTop = 26;
  const paddingBottom = 34;
  const chartHeight = height - paddingTop - paddingBottom;
  const chartWidth = width - paddingLeft - paddingRight;

  const getY = (val: number) => height - paddingBottom - ((val - yMin) / yRange) * chartHeight;
  const getX = (idx: number) => paddingLeft + (idx / Math.max(points.length - 1, 1)) * chartWidth;

  // Path for 7-day rolling average
  const rollingPoints = points
    .map((p, idx) => (p.rollingAvg != null ? { x: getX(idx), y: getY(p.rollingAvg) } : null))
    .filter(Boolean) as Array<{ x: number; y: number }>;

  const rollingPath = rollingPoints.reduce((acc, curr, idx) => {
    return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
  }, '');

  const areaPath = rollingPoints.length > 0
    ? `${rollingPath} L ${rollingPoints[rollingPoints.length - 1].x} ${height - paddingBottom} L ${rollingPoints[0].x} ${height - paddingBottom} Z`
    : '';

  // Path for Target Trajectory line
  const targetPath = points.reduce((acc, p, idx) => {
    const x = getX(idx);
    const y = getY(p.targetWeight);
    return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  // Path for Actual Weights line (only connecting logged points)
  const actualPoints = points
    .map((p, idx) => (p.actualWeight != null ? { x: getX(idx), y: getY(p.actualWeight), idx, val: p.actualWeight } : null))
    .filter(Boolean) as Array<{ x: number; y: number; idx: number; val: number }>;

  const actualPath = actualPoints.reduce((acc, curr, idx) => {
    return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
  }, '');

  const activePoint = hoverIndex !== null ? points[hoverIndex] : null;

  // Header metrics
  const latestLogged = actualPoints.length > 0 ? actualPoints[actualPoints.length - 1].val : null;
  const latestRolling = points.find((p) => p.day === currentDay)?.rollingAvg ?? points[points.length - 1]?.rollingAvg;
  const todayTarget = points.find((p) => p.day === currentDay)?.targetWeight ?? points[points.length - 1]?.targetWeight;

  return (
    <div className={`${styles.chartCard} ${styles.chartCardElevated}`}>
      {/* Question Header */}
      <div className={styles.questionHeader}>
        <div className={styles.questionContent}>
          <div className={styles.questionBadge}>
            <HelpCircle size={12} /> Stated Analytic Question
          </div>
          <h3 className={styles.questionTitle}>
            Is body weight following the planned trajectory once daily fluid and glycogen fluctuations are smoothed?
          </h3>
          <p className={styles.questionSubtitle}>
            Daily scale weigh-ins bounce by 0.5–1.5 kg due to hydration, digestion, and sodium. The <strong>7-Day Rolling Average</strong> separates daily noise from genuine tissue change, while the <strong>Target Trajectory Corridor</strong> validates adherence to your plan.
          </p>
        </div>

        <div className={styles.headerMetrics}>
          {latestLogged != null && (
            <div className={styles.metricChip}>
              <span className={styles.metricChipLabel}>Latest Weigh-in</span>
              <span className={styles.metricChipValue}>{latestLogged} kg</span>
            </div>
          )}
          {latestRolling != null && (
            <div className={styles.metricChip}>
              <span className={styles.metricChipLabel}>7-Day Rolling Avg</span>
              <span className={`${styles.metricChipValue} ${styles.textEmerald}`}>
                {latestRolling} kg
              </span>
            </div>
          )}
          {todayTarget != null && (
            <div className={styles.metricChip}>
              <span className={styles.metricChipLabel}>Target Today</span>
              <span className={`${styles.metricChipValue} ${styles.textSky}`}>
                {todayTarget} kg
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Legend & Dynamic Hover Readout */}
      <div className={styles.legendBar}>
        <div className={styles.legendItems}>
          <span className={styles.legendItem}>
            <span className={styles.legendLineEmerald} />
            <span>7-Day Rolling Avg</span>
          </span>
          <span className={styles.legendItem}>
            <span className={styles.legendDotActual} />
            <span>Actual Weigh-in</span>
          </span>
          <span className={styles.legendItem}>
            <span className={styles.legendDashedSky} />
            <span>Target Trajectory</span>
          </span>
        </div>

        {activePoint ? (
          <div className={styles.readoutTooltip}>
            <span className={styles.readoutTag}>{activePoint.displayDate} ({activePoint.label}):</span>
            {activePoint.actualWeight != null && (
              <span>Actual: <strong>{activePoint.actualWeight} kg</strong></span>
            )}
            {activePoint.rollingAvg != null && (
              <span className={styles.textEmerald}>7d Avg: <strong>{activePoint.rollingAvg} kg</strong></span>
            )}
            <span className={styles.textSky}>Target: <strong>{activePoint.targetWeight} kg</strong></span>
            {activePoint.rollingAvg != null && (
              <span className={styles.textMutedSmall}>
                ({activePoint.rollingAvg <= activePoint.targetWeight ? 'On Track' : `+${(activePoint.rollingAvg - activePoint.targetWeight).toFixed(1)}kg`})
              </span>
            )}
          </div>
        ) : (
          <span className={styles.textMutedSmall}>
            Hover over any day to inspect actual vs rolling-avg vs target
          </span>
        )}
      </div>

      {/* SVG Canvas */}
      <div className={styles.svgWrap}>
        <svg viewBox={`0 0 ${width} ${height}`} className={styles.svg}>
          <defs>
            <linearGradient id="rollingWeightGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.01" />
            </linearGradient>
            <filter id="emeraldShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#10B981" floodOpacity="0.25" />
            </filter>
          </defs>

          {/* Grid lines */}
          <line x1={paddingLeft} y1={paddingTop} x2={width - paddingRight} y2={paddingTop} className={styles.gridLine} />
          <line
            x1={paddingLeft}
            y1={(paddingTop + height - paddingBottom) / 2}
            x2={width - paddingRight}
            y2={(paddingTop + height - paddingBottom) / 2}
            className={styles.gridLine}
          />
          <line x1={paddingLeft} y1={height - paddingBottom} x2={width - paddingRight} y2={height - paddingBottom} className={styles.axisLine} />

          {/* Y Axis reference values */}
          <text x={paddingLeft - 8} y={paddingTop + 4} textAnchor="end" className={styles.axisText}>
            {yMax} kg
          </text>
          <text x={paddingLeft - 8} y={(paddingTop + height - paddingBottom) / 2 + 4} textAnchor="end" className={styles.axisText}>
            {((yMax + yMin) / 2).toFixed(1)} kg
          </text>
          <text x={paddingLeft - 8} y={height - paddingBottom} textAnchor="end" className={styles.axisText}>
            {yMin} kg
          </text>

          {/* 1. Target Trajectory Corridor (dashed blue/amber line) */}
          <path
            d={targetPath}
            fill="none"
            stroke="#0284C7"
            strokeWidth="2"
            strokeDasharray="5 4"
            opacity="0.8"
          />

          {/* 2. 7-Day Rolling Avg Gradient Area Fill */}
          {areaPath && <path d={areaPath} fill="url(#rollingWeightGrad)" />}

          {/* 3. 7-Day Rolling Avg Line */}
          {rollingPath && (
            <path
              d={rollingPath}
              fill="none"
              stroke="#10B981"
              strokeWidth="3.25"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#emeraldShadow)"
            />
          )}

          {/* 4. Actual Weights connecting line (light muted) */}
          {actualPath && (
            <path
              d={actualPath}
              fill="none"
              stroke="rgba(100, 116, 139, 0.45)"
              strokeWidth="1.5"
              strokeDasharray="2 2"
            />
          )}

          {/* 5. Actual weigh-in circles */}
          {actualPoints.map((ap) => {
            const isHovered = hoverIndex === ap.idx;
            return (
              <circle
                key={`actual-${ap.idx}`}
                cx={ap.x}
                cy={ap.y}
                r={isHovered ? 6 : 3.5}
                fill="#FFFFFF"
                stroke="#059669"
                strokeWidth={isHovered ? 3 : 2}
                className={styles.dataDot}
              />
            );
          })}

          {/* 6. Active hover vertical guideline */}
          {hoverIndex !== null && (
            <line
              x1={getX(hoverIndex)}
              y1={paddingTop}
              x2={getX(hoverIndex)}
              y2={height - paddingBottom}
              className={styles.hoverGuide}
            />
          )}

          {/* 7. Hover capture columns */}
          {points.map((p, idx) => {
            const prevX = idx > 0 ? (getX(idx) + getX(idx - 1)) / 2 : paddingLeft;
            const nextX = idx < points.length - 1 ? (getX(idx) + getX(idx + 1)) / 2 : width - paddingRight;
            return (
              <rect
                key={`col-${idx}`}
                x={prevX}
                y={paddingTop}
                width={Math.max(1, nextX - prevX)}
                height={chartHeight}
                className={styles.hoverColumn}
                onMouseEnter={() => setHoverIndex(idx)}
                onMouseLeave={() => setHoverIndex(null)}
              />
            );
          })}

          {/* 8. X Axis Labels */}
          {points.map((p, idx) => {
            const step = Math.max(1, Math.ceil(points.length / 7));
            const showLabel = idx % step === 0 || idx === points.length - 1;
            if (!showLabel) return null;
            return (
              <text
                key={`label-${idx}`}
                x={getX(idx)}
                y={height - paddingBottom + 18}
                textAnchor="middle"
                className={hoverIndex === idx ? styles.axisTextActive : styles.axisText}
              >
                {p.displayDate}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
