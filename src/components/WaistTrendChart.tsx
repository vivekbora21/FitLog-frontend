'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { HelpCircle, Ruler, ArrowRight, TrendingDown } from 'lucide-react';
import { BodyMeasurement } from '@/lib/types';
import styles from './AnalyticsCharts.module.css';

export interface WaistMeasurementLike {
  id?: string;
  date: string;
  waist_cm?: number | null;
  [key: string]: any;
}

interface WaistTrendChartProps {
  measurements: (WaistMeasurementLike | BodyMeasurement)[];
  startingWaist?: number | null;
  onOpenLogModal?: () => void;
}

export const WaistTrendChart: React.FC<WaistTrendChartProps> = ({
  measurements,
  startingWaist,
  onOpenLogModal,
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Extract measurements that have waist logged and sort chronologically
  const waistLogs = useMemo(() => {
    return [...measurements]
      .filter((m) => m.waist_cm != null && m.waist_cm > 0)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((m) => {
        const dateObj = new Date(m.date + (m.date.includes('T') ? '' : 'T00:00:00Z'));
        const formattedDate = !isNaN(dateObj.getTime())
          ? dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
          : m.date;
        return {
          id: m.id,
          date: m.date,
          displayDate: formattedDate,
          waist: Number(m.waist_cm),
        };
      });
  }, [measurements]);

  const baselineWaist = startingWaist ?? (waistLogs.length > 0 ? waistLogs[0].waist : null);
  const currentWaist = waistLogs.length > 0 ? waistLogs[waistLogs.length - 1].waist : null;
  const netChange = currentWaist != null && baselineWaist != null ? Math.round((currentWaist - baselineWaist) * 10) / 10 : null;

  if (waistLogs.length === 0) {
    return (
      <div className={styles.chartCard}>
        <div className={styles.questionHeader}>
          <div className={styles.questionContent}>
            <div className={`${styles.questionBadge} ${styles.questionBadgeCyan}`}>
              <HelpCircle size={12} /> Stated Analytic Question
            </div>
            <h3 className={styles.questionTitle}>
              Is central abdominal fat and waist circumference decreasing over the program?
            </h3>
            <p className={styles.questionSubtitle}>
              Scale weight often masks body recomposition due to muscle retention or glycogen hydration. Waist circumference is the single best physical biomarker of visceral fat reduction.
            </p>
          </div>
        </div>
        <div className={styles.emptyState}>
          <Ruler size={32} color="var(--color-cyan)" />
          <div className={styles.emptyText}>No waist circumference logs recorded yet</div>
          <div className={styles.emptySubtext}>
            Log your waist circumference across weekly checkpoints to verify central adipose tissue loss independent of scale fluctuations.
          </div>
          <Link
            href="/app/measurements"
            className={styles.emptyActionLink}
          >
            Go to Body Measurements <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    );
  }

  // Calculate SVG dimensions and scale
  const waistValues = waistLogs.map((l) => l.waist);
  if (baselineWaist != null) waistValues.push(baselineWaist);

  const minVal = Math.min(...waistValues);
  const maxVal = Math.max(...waistValues);
  const yMin = Math.floor(minVal - 0.5);
  const yMax = Math.ceil(maxVal + 0.5);
  const yRange = Math.max(1, yMax - yMin);

  const width = 640;
  const height = 230;
  const paddingLeft = 40;
  const paddingRight = 44;
  const paddingTop = 26;
  const paddingBottom = 34;
  const chartHeight = height - paddingTop - paddingBottom;
  const chartWidth = width - paddingLeft - paddingRight;

  const getY = (val: number) => height - paddingBottom - ((val - yMin) / yRange) * chartHeight;
  const getX = (idx: number) => paddingLeft + (idx / Math.max(waistLogs.length - 1, 1)) * chartWidth;

  const points = waistLogs.map((l, idx) => ({
    x: getX(idx),
    y: getY(l.waist),
    ...l,
  }));

  const pathD = points.reduce((acc, curr, idx) => {
    return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
  }, '');

  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`
    : '';

  const baselineY = baselineWaist != null ? getY(baselineWaist) : null;
  const activePoint = hoverIndex !== null ? points[hoverIndex] : null;

  return (
    <div className={styles.chartCard}>
      {/* Question Header */}
      <div className={styles.questionHeader}>
        <div className={styles.questionContent}>
          <div className={`${styles.questionBadge} ${styles.questionBadgeCyan}`}>
            <HelpCircle size={12} /> Stated Analytic Question
          </div>
          <h3 className={styles.questionTitle}>
            Is central abdominal fat and waist circumference decreasing over the program?
          </h3>
          <p className={styles.questionSubtitle}>
            During body recomposition, scale weight often stays steady while fat tissue is replaced by glycogen and muscle. <strong>Waist Circumference</strong> confirms true visceral and subcutaneous abdominal fat loss.
          </p>
        </div>

        <div className={styles.headerMetrics}>
          {baselineWaist != null && (
            <div className={styles.metricChip}>
              <span className={styles.metricChipLabel}>Starting Waist</span>
              <span className={styles.metricChipValue}>{baselineWaist} cm</span>
            </div>
          )}
          {currentWaist != null && (
            <div className={styles.metricChip}>
              <span className={styles.metricChipLabel}>Current Waist</span>
              <span className={`${styles.metricChipValue} ${styles.textCyan}`}>
                {currentWaist} cm
              </span>
            </div>
          )}
          {netChange != null && (
            <div className={styles.metricChip}>
              <span className={styles.metricChipLabel}>Total Change</span>
              <span
                className={`${styles.metricChipValue} ${netChange <= 0 ? styles.textEmerald : styles.textAmber}`}
              >
                {netChange > 0 ? `+${netChange}` : netChange} cm
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Legend & Hover Readout */}
      <div className={styles.legendBar}>
        <div className={styles.legendItems}>
          <span className={styles.legendItem}>
            <span className={styles.legendLineCyan} />
            <span>Waist Circumference (cm)</span>
          </span>
          {baselineWaist != null && (
            <span className={styles.legendItem}>
              <span className={styles.legendDashedSlate} />
              <span>Day 1 Baseline ({baselineWaist} cm)</span>
            </span>
          )}
        </div>

        {activePoint ? (
          <div className={styles.readoutTooltip}>
            <span className={styles.readoutTag}>{activePoint.displayDate}:</span>
            <span className={styles.textCyan}>Waist: <strong>{activePoint.waist} cm</strong></span>
            {baselineWaist != null && (
              <span className={activePoint.waist <= baselineWaist ? styles.textEmerald : styles.textAmber}>
                ({(activePoint.waist - baselineWaist) <= 0 ? '' : '+'}{(activePoint.waist - baselineWaist).toFixed(1)} cm vs baseline)
              </span>
            )}
          </div>
        ) : (
          <span className={styles.textMutedSmall}>
            Hover over any log point to inspect measurement &amp; change vs baseline
          </span>
        )}
      </div>

      {/* SVG Canvas */}
      <div className={styles.svgWrap}>
        <svg viewBox={`0 0 ${width} ${height}`} className={styles.svg}>
          <defs>
            <linearGradient id="waistGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.01" />
            </linearGradient>
            <filter id="cyanShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#06B6D4" floodOpacity="0.3" />
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

          {/* Y Axis text */}
          <text x={paddingLeft - 8} y={paddingTop + 4} textAnchor="end" className={styles.axisText}>
            {yMax} cm
          </text>
          <text x={paddingLeft - 8} y={(paddingTop + height - paddingBottom) / 2 + 4} textAnchor="end" className={styles.axisText}>
            {((yMax + yMin) / 2).toFixed(1)} cm
          </text>
          <text x={paddingLeft - 8} y={height - paddingBottom} textAnchor="end" className={styles.axisText}>
            {yMin} cm
          </text>

          {/* Baseline Reference Line (dashed) */}
          {baselineY != null && baselineY >= paddingTop && baselineY <= height - paddingBottom && (
            <g>
              <line
                x1={paddingLeft}
                y1={baselineY}
                x2={width - paddingRight}
                y2={baselineY}
                stroke="#64748B"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                opacity="0.75"
              />
              <text
                x={width - paddingRight + 4}
                y={baselineY + 3.5}
                fontSize="9"
                fill="#64748B"
                fontWeight="700"
              >
                {baselineWaist}
              </text>
            </g>
          )}

          {/* Area Fill */}
          {areaD && <path d={areaD} fill="url(#waistGrad)" />}

          {/* Main Waist Reduction Line */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="#06B6D4"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#cyanShadow)"
            />
          )}

          {/* Data Points */}
          {points.map((p, idx) => {
            const isHovered = hoverIndex === idx;
            return (
              <circle
                key={`point-${idx}`}
                cx={p.x}
                cy={p.y}
                r={isHovered ? 6 : 4}
                fill="#FFFFFF"
                stroke="#0891B2"
                strokeWidth={isHovered ? 3.5 : 2.5}
                className={styles.dataDot}
              />
            );
          })}

          {/* Active hover vertical guideline */}
          {activePoint && (
            <line
              x1={activePoint.x}
              y1={paddingTop}
              x2={activePoint.x}
              y2={height - paddingBottom}
              className={styles.hoverGuide}
            />
          )}

          {/* Hover capture columns */}
          {points.map((p, idx) => {
            const prevX = idx > 0 ? (p.x + points[idx - 1].x) / 2 : paddingLeft;
            const nextX = idx < points.length - 1 ? (p.x + points[idx + 1].x) / 2 : width - paddingRight;
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

          {/* X Axis Labels */}
          {points.map((p, idx) => {
            const step = Math.max(1, Math.ceil(points.length / 8));
            const showLabel = idx % step === 0 || idx === points.length - 1;
            if (!showLabel) return null;
            return (
              <text
                key={`label-${idx}`}
                x={p.x}
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
