'use client';

import React, { useState } from 'react';
import styles from './MetricChart.module.css';

export interface DataPoint {
  label: string;
  value: number;
  sublabel?: string;
  extra?: string;
}

export interface MetricChartProps {
  data: DataPoint[];
  title?: string;
  subtitle?: string;
  unit?: string;
  type?: 'line' | 'bar';
  color?: string;
  height?: number;
  targetValue?: number;
  targetLabel?: string;
  targetColor?: string;
  emptyMessage?: string;
}

export const MetricChart: React.FC<MetricChartProps> = ({
  data,
  title,
  subtitle,
  unit = '',
  type = 'line',
  color = '#10B981',
  height = 220,
  targetValue,
  targetLabel,
  targetColor = '#F59E0B',
  emptyMessage = 'No data logged yet',
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className={styles.emptyState} style={{ height }}>
        <span className={styles.emptyMessage}>{emptyMessage}</span>
      </div>
    );
  }

  const values = data.map((d) => d.value);
  if (targetValue !== undefined && !isNaN(targetValue)) {
    values.push(targetValue);
  }

  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const paddingLeft = 36;
  const paddingRight = 36;
  const paddingTop = 24;
  const paddingBottom = 32;
  const chartWidth = 580;
  const chartHeight = height - paddingTop - paddingBottom;

  const yMin = type === 'bar' ? 0 : Math.floor(minVal * 0.985);
  const yMax = Math.ceil(maxVal * 1.015) || 10;
  const yRange = yMax - yMin || 1;

  const getY = (val: number) => height - paddingBottom - ((val - yMin) / yRange) * chartHeight;

  const points = data.map((d, index) => {
    const x = paddingLeft + (index / (data.length - 1 || 1)) * (chartWidth - paddingLeft - paddingRight);
    const y = getY(d.value);
    return { x, y, ...d };
  });

  const pathD = points.reduce((acc, curr, idx) => {
    return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
  }, '');

  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`
    : '';

  const targetY = targetValue !== undefined ? getY(targetValue) : null;
  const activePoint = hoverIndex !== null ? points[hoverIndex] : null;

  return (
    <div className={styles.wrap}>
      {(title || subtitle || activePoint) && (
        <div className={styles.header}>
          <div>
            {title && <h4 className={styles.title}>{title}</h4>}
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
          {activePoint ? (
            <div className={styles.tooltip}>
              <span className={styles.tooltipLabel}>{activePoint.label}:</span>
              <span className={styles.tooltipValue} style={{ color }}>{activePoint.value} {unit}</span>
              {activePoint.sublabel && (
                <span className={styles.tooltipSublabel}>
                  {activePoint.sublabel}
                </span>
              )}
            </div>
          ) : targetValue !== undefined && targetLabel ? (
            <div className={styles.legend}>
              <span className={styles.legendSwatch} style={{ background: targetColor, borderTop: '2px dashed ' + targetColor }} />
              <span>{targetLabel}: <strong>{targetValue} {unit}</strong></span>
            </div>
          ) : null}
        </div>
      )}

      <div className={styles.svgWrap}>
        <svg viewBox={`0 0 ${chartWidth} ${height}`} className={styles.svg} style={{ height }}>
          <defs>
            <linearGradient id={`grad-${color.replace(/[^a-zA-Z0-9]/g, '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.25" />
              <stop offset="100%" stopColor={color} stopOpacity="0.01" />
            </linearGradient>
            <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor={color} floodOpacity="0.3" />
            </filter>
          </defs>

          {/* Grid lines */}
          <line x1={paddingLeft} y1={paddingTop} x2={chartWidth - paddingRight} y2={paddingTop} stroke="rgba(0,0,0,0.05)" strokeDasharray="3 3" />
          <line x1={paddingLeft} y1={(paddingTop + height - paddingBottom) / 2} x2={chartWidth - paddingRight} y2={(paddingTop + height - paddingBottom) / 2} stroke="rgba(0,0,0,0.05)" strokeDasharray="3 3" />
          <line x1={paddingLeft} y1={height - paddingBottom} x2={chartWidth - paddingRight} y2={height - paddingBottom} stroke="#E2E8F0" strokeWidth="1.5" />

          {/* Target Reference Line */}
          {targetY !== null && targetY >= paddingTop && targetY <= height - paddingBottom && (
            <g>
              <line
                x1={paddingLeft}
                y1={targetY}
                x2={chartWidth - paddingRight}
                y2={targetY}
                stroke={targetColor}
                strokeWidth="1.75"
                strokeDasharray="4 4"
                opacity="0.85"
              />
              <text
                x={chartWidth - paddingRight + 4}
                y={targetY + 3.5}
                fontSize="9"
                fill={targetColor}
                fontWeight="700"
              >
                {targetValue}
              </text>
            </g>
          )}

          {type === 'line' ? (
            <>
              {/* Gradient fill */}
              <path d={areaD} fill={`url(#grad-${color.replace(/[^a-zA-Z0-9]/g, '')})`} />
              {/* Main Line */}
              <path
                d={pathD}
                fill="none"
                stroke={color}
                strokeWidth="2.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#shadow)"
              />
              {/* Hover guide vertical line */}
              {activePoint && (
                <line
                  x1={activePoint.x}
                  y1={paddingTop}
                  x2={activePoint.x}
                  y2={height - paddingBottom}
                  stroke={color}
                  strokeWidth="1.25"
                  strokeDasharray="2 2"
                  opacity="0.6"
                />
              )}
              {/* Data points */}
              {points.map((p, idx) => (
                <g key={idx}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={hoverIndex === idx ? 6.5 : 3.75}
                    fill="#FFFFFF"
                    stroke={color}
                    strokeWidth={hoverIndex === idx ? 3.5 : 2.2}
                    className={styles.dataPoint}
                    onMouseEnter={() => setHoverIndex(idx)}
                    onMouseLeave={() => setHoverIndex(null)}
                  />
                </g>
              ))}
            </>
          ) : (
            /* Bar Chart */
            points.map((p, idx) => {
              const availableWidth = chartWidth - paddingLeft - paddingRight;
              const barWidth = Math.min(36, Math.max(16, (availableWidth / (points.length * 1.5))));
              const barHeight = Math.max(4, height - paddingBottom - p.y);
              const isHovered = hoverIndex === idx;

              return (
                <g key={idx}>
                  <rect
                    x={p.x - barWidth / 2}
                    y={p.y}
                    width={barWidth}
                    height={barHeight}
                    rx="5"
                    fill={isHovered ? color : `${color}dd`}
                    className={styles.dataPoint}
                    onMouseEnter={() => setHoverIndex(idx)}
                    onMouseLeave={() => setHoverIndex(null)}
                  />
                  {isHovered && (
                    <text
                      x={p.x}
                      y={p.y - 6}
                      textAnchor="middle"
                      fontSize="10"
                      fill={color}
                      fontWeight="800"
                    >
                      {p.value}
                    </text>
                  )}
                </g>
              );
            })
          )}

          {/* Hover capture columns - wide invisible hit targets spanning the full chart height */}
          {points.map((p, idx) => {
            const prevX = idx > 0 ? (p.x + points[idx - 1].x) / 2 : paddingLeft;
            const nextX = idx < points.length - 1 ? (p.x + points[idx + 1].x) / 2 : chartWidth - paddingRight;
            return (
              <rect
                key={`hover-${idx}`}
                x={prevX}
                y={paddingTop}
                width={Math.max(0, nextX - prevX)}
                height={height - paddingTop - paddingBottom}
                fill="transparent"
                className={styles.hoverTarget}
                onMouseEnter={() => setHoverIndex(idx)}
                onMouseLeave={() => setHoverIndex(null)}
              />
            );
          })}

          {/* X Axis Labels */}
          {points.map((p, idx) => {
            const showLabel = points.length <= 8 || idx % Math.ceil(points.length / 7) === 0 || idx === points.length - 1;
            if (!showLabel) return null;
            return (
              <text
                key={idx}
                x={p.x}
                y={height - paddingBottom + 18}
                textAnchor="middle"
                fontSize="11"
                fill={hoverIndex === idx ? 'var(--text-primary)' : 'var(--text-muted)'}
                fontWeight={hoverIndex === idx ? '700' : '500'}
              >
                {p.label}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

