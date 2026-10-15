'use client';

import React, { useState, useMemo } from 'react';
import { BarChart2 } from 'lucide-react';
import { NutritionHistoryDay } from '@/lib/types';
import styles from './nutritionComponents.module.css';

export interface NutritionAnalyticsCardProps {
  historyDays: NutritionHistoryDay[];
  currentDate?: string;
  selectedRange: '7D' | '30D' | '90D';
  onRangeChange: (range: '7D' | '30D' | '90D') => void;
  selectedMetric: 'calories' | 'protein' | 'carbs' | 'fat';
  onMetricChange: (metric: 'calories' | 'protein' | 'carbs' | 'fat') => void;
  targetKcal: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
}

export const NutritionAnalyticsCard: React.FC<NutritionAnalyticsCardProps> = ({
  historyDays,
  currentDate = '2026-10-14',
  selectedRange,
  onRangeChange,
  selectedMetric,
  onMetricChange,
  targetKcal,
  targetProtein,
  targetCarbs,
  targetFat,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Reverse list for the Daily Macro Summary Table (newest first)
  const tableRows = useMemo(() => {
    return [...historyDays].reverse();
  }, [historyDays]);

  const getMetricValue = (d: NutritionHistoryDay) => {
    if (selectedMetric === 'protein') return d.total_protein;
    if (selectedMetric === 'carbs') return d.total_carbs;
    if (selectedMetric === 'fat') return d.total_fat;
    return d.total_calories;
  };

  const getMetricTarget = () => {
    if (selectedMetric === 'protein') return targetProtein;
    if (selectedMetric === 'carbs') return targetCarbs;
    if (selectedMetric === 'fat') return targetFat;
    return targetKcal;
  };

  const currentTargetValue = getMetricTarget();

  // SVG dimensions
  const chartHeight = 160;
  const chartWidth = 520;
  const paddingLeft = 46;
  const paddingRight = 36;
  const paddingTop = 22;
  const paddingBottom = 26;

  const yMax = useMemo(() => {
    const vals = historyDays.map(getMetricValue);
    vals.push(currentTargetValue);
    const maxVal = Math.max(...vals);
    if (selectedMetric === 'calories') {
      return Math.max(3000, Math.ceil(maxVal / 500) * 500);
    }
    return Math.max(100, Math.ceil(maxVal / 50) * 50);
  }, [historyDays, selectedMetric, currentTargetValue]);

  const getYCoord = (val: number) => {
    const usableH = chartHeight - paddingTop - paddingBottom;
    return chartHeight - paddingBottom - (val / yMax) * usableH;
  };

  const targetY = getYCoord(currentTargetValue);

  return (
    <div className={styles.analyticsCard}>
      <div className={styles.cardHeaderRow}>
        <div className={styles.cardHeaderTitleWrap}>
          <BarChart2 size={19} className={styles.sectionHeaderIcon} />
          <div>
            <h2 className={styles.cardTitle}>
              {selectedMetric === 'calories'
                ? 'Calorie Intake This Week'
                : `${selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)} Intake (${selectedRange})`}
            </h2>
          </div>
        </div>

        {/* Selectable Date Range */}
        <div className={styles.analyticsHeaderRight}>
          <div className={styles.rangePillsGroup}>
            {(['7D', '30D', '90D'] as const).map((r) => (
              <button
                key={r}
                type="button"
                className={`${styles.rangePillBtn} ${selectedRange === r ? styles.rangePillBtnActive : ''}`}
                onClick={() => onRangeChange(r)}
              >
                {r === '7D' ? 'Last 7 Days' : r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Macro Metric Tabs */}
      <div className={styles.metricTabsWrap}>
        {(['calories', 'protein', 'carbs', 'fat'] as const).map((m) => (
          <button
            key={m}
            type="button"
            className={`${styles.metricTabBtn} ${
              selectedMetric === m
                ? m === 'calories'
                  ? styles.metricTabBtnActiveCalories
                  : m === 'protein'
                  ? styles.metricTabBtnActiveProtein
                  : m === 'carbs'
                  ? styles.metricTabBtnActiveCarbs
                  : styles.metricTabBtnActiveFat
                : ''
            }`}
            onClick={() => onMetricChange(m)}
          >
            {m.charAt(0).toUpperCase() + m.slice(1)}
          </button>
        ))}
      </div>

      {/* Interactive SVG Bar Chart with Target Reference Line */}
      <div className={styles.chartContainer}>
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className={styles.chartSvg}>
          {/* Y Axis Guide Lines */}
          {[0, 0.2, 0.4, 0.6, 0.8, 1].map((pct) => {
            const val = Math.round(yMax * pct);
            const y = getYCoord(val);
            return (
              <g key={pct}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={chartWidth - paddingRight}
                  y2={y}
                  className={styles.gridLine}
                />
                <text x={paddingLeft - 6} y={y + 3} className={styles.yAxisLabel}>
                  {val.toLocaleString()}
                </text>
              </g>
            );
          })}

          {/* Target Reference Line */}
          {targetY >= paddingTop && targetY <= chartHeight - paddingBottom && (
            <g>
              <line
                x1={paddingLeft}
                y1={targetY}
                x2={chartWidth - paddingRight}
                y2={targetY}
                className={styles.refLine}
              />
              <text
                x={chartWidth - paddingRight + 3}
                y={targetY + 3.5}
                className={styles.refLineLabel}
              >
                -- {currentTargetValue}
              </text>
            </g>
          )}

          {/* Day Bars */}
          {historyDays.map((d, idx) => {
            const totalBars = historyDays.length;
            const availableW = chartWidth - paddingLeft - paddingRight;
            const slotW = availableW / totalBars;
            const barW = Math.min(26, Math.max(10, slotW * 0.58));
            const xCenter = paddingLeft + slotW * idx + slotW / 2;
            const val = getMetricValue(d);
            const barTopY = getYCoord(val);
            const barHeight = Math.max(3, chartHeight - paddingBottom - barTopY);
            const isHovered = hoveredIndex === idx;

            const dateObj = new Date(d.date + 'T00:00:00');
            const dateLabel = isNaN(dateObj.getTime())
              ? d.date.slice(5)
              : dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            return (
              <g
                key={d.date}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <rect
                  x={xCenter - barW / 2}
                  y={barTopY}
                  width={barW}
                  height={barHeight}
                  rx="4"
                  className={`${styles.chartBar} ${
                    selectedMetric === 'protein'
                      ? styles.chartBarProtein
                      : selectedMetric === 'carbs'
                      ? styles.chartBarCarbs
                      : selectedMetric === 'fat'
                      ? styles.chartBarFat
                      : ''
                  }`}
                  opacity={isHovered ? 1 : 0.9}
                />

                {totalBars <= 14 && (
                  <text
                    x={xCenter}
                    y={barTopY - 5}
                    className={styles.barValueLabel}
                  >
                    {val.toLocaleString()}
                  </text>
                )}

                {(totalBars <= 14 || idx % Math.ceil(totalBars / 10) === 0) && (
                  <text
                    x={xCenter}
                    y={chartHeight - 6}
                    className={styles.barDateLabel}
                  >
                    {dateLabel}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Daily Macro Summary Table */}
      <div className={styles.summaryTableSection}>
        <div className={styles.summaryTableTitle}>Daily Macro Summary</div>
        <div className={styles.tableScrollWrap}>
          <table className={styles.macroSummaryTable}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Calories</th>
                <th>Protein (g)</th>
                <th>Carbs (g)</th>
                <th>Fat (g)</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((r) => {
                const dateObj = new Date(r.date + 'T00:00:00');
                const formatted = isNaN(dateObj.getTime())
                  ? r.date
                  : dateObj.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    });
                const isToday = r.date === currentDate;

                return (
                  <tr key={r.date} className={isToday ? styles.activeDayRow : ''}>
                    <td>
                      {formatted} {isToday && <span style={{ color: '#059669', fontSize: '0.72rem' }}>(Today)</span>}
                    </td>
                    <td>{r.total_calories.toLocaleString()}</td>
                    <td>{r.total_protein}</td>
                    <td>{r.total_carbs}</td>
                    <td>{r.total_fat}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
