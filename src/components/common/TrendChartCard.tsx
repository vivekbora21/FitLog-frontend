'use client';

import React from 'react';
import { TrendingUp, Scale, Ruler, Target } from 'lucide-react';
import styles from './TrendChartCard.module.css';

export interface TrendAnalysis {
  hasData: boolean;
  unit: string;
  currentText: string;
  changeText: string;
  isChangeNegative: boolean;
  goalText: string;
  points: Array<{ x: number; y: number; val: number; date: string; rawDate: string }>;
  pathD: string;
  goalY: number;
  yTicks: number[];
  minVal: number;
  maxVal: number;
  padTop: number;
  usableH: number;
  range: number;
}

export interface MetricTabOption<T extends string = string> {
  key: T;
  label: string;
  icon?: React.ReactNode;
}

export interface TrendChartCardProps<T extends string = string> {
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  activeMetricTab: T;
  onMetricTabChange: (tab: T) => void;
  metricTabs?: MetricTabOption<T>[];
  timeRange: '7D' | '30D' | '60D';
  onTimeRangeChange: (range: '7D' | '30D' | '60D') => void;
  trendAnalysis: TrendAnalysis;
  hoveredPoint: { x: number; y: number; date: string; value: number; unit: string } | null;
  onHoverPoint: (pt: { x: number; y: number; date: string; value: number; unit: string } | null) => void;
  showGoal?: boolean;
  showLatestBadge?: boolean;
}

export function TrendChartCard<T extends string = string>({
  title = 'Bodyweight & Waist Trend',
  subtitle,
  icon,
  activeMetricTab,
  onMetricTabChange,
  metricTabs,
  timeRange,
  onTimeRangeChange,
  trendAnalysis,
  hoveredPoint,
  onHoverPoint,
  showGoal = true,
  showLatestBadge = false,
}: TrendChartCardProps<T>) {
  const tabs: MetricTabOption<T>[] = metricTabs || [
    { key: 'weight' as unknown as T, label: 'Weight', icon: <Scale size={12} /> },
    { key: 'waist' as unknown as T, label: 'Waist', icon: <Ruler size={12} /> },
  ];

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.cardHeaderLeft}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span className={styles.cardTitle}>
              {icon || <TrendingUp size={18} className={styles.cardIcon} />}
              {title}
            </span>
            {subtitle && (
              <span style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '2px' }}>
                {subtitle}
              </span>
            )}
          </div>

          {/* Metric Mode Toggle */}
          <div className={styles.pillGroup}>
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => onMetricTabChange(tab.key)}
                className={`${styles.pillBtn} ${activeMetricTab === tab.key ? styles.pillBtnActive : ''}`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Timeframe Toggle (7D / 30D / 60D) */}
          <div className={styles.pillGroup}>
            {(['7D', '30D', '60D'] as const).map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => onTimeRangeChange(range)}
                className={`${styles.pillBtn} ${timeRange === range ? styles.pillBtnActive : ''}`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        {/* Stat Summary Right */}
        {trendAnalysis.hasData && (
          <div className={styles.trendStatsRight}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Latest</span>
              <span className={styles.statValue}>{trendAnalysis.currentText}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Change ({timeRange.toLowerCase()})</span>
              <span className={trendAnalysis.isChangeNegative ? styles.statValueGreen : styles.statValue}>
                {trendAnalysis.changeText}
              </span>
            </div>
            {showGoal && (
              <div className={styles.statItem}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <Target size={11} className={styles.cardIcon} />
                  <span className={styles.statLabel}>Goal</span>
                </div>
                <span className={styles.statValue}>{trendAnalysis.goalText}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dynamic SVG Line Chart or Clean Empty State */}
      {trendAnalysis.hasData ? (
        <div className={styles.chartContainer}>
          <svg viewBox="0 0 740 190" className={styles.chartSvg}>
            <defs>
              <linearGradient id="trendAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0B856D" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#0B856D" stopOpacity="0.01" />
              </linearGradient>
            </defs>

            {/* Horizontal Gridlines based on Y-ticks */}
            {trendAnalysis.yTicks.map((tickVal) => {
              const y = trendAnalysis.padTop + (1 - (tickVal - trendAnalysis.minVal) / trendAnalysis.range) * trendAnalysis.usableH;
              return (
                <g key={tickVal}>
                  <line
                    x1="40"
                    y1={y}
                    x2="710"
                    y2={y}
                    stroke="#F1F5F9"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                  <text
                    x="32"
                    y={y + 4}
                    fill="#94A3B8"
                    fontSize="10"
                    textAnchor="end"
                    fontFamily="inherit"
                  >
                    {tickVal}
                  </text>
                </g>
              );
            })}

            {/* Goal Line */}
            {showGoal && trendAnalysis.goalY > 0 && (
              <line
                x1="40"
                y1={trendAnalysis.goalY}
                x2="710"
                y2={trendAnalysis.goalY}
                stroke="#10B981"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
            )}

            {/* Gradient Area Fill under trend curve */}
            {trendAnalysis.points.length >= 2 && (
              <path
                d={`${trendAnalysis.pathD} L ${trendAnalysis.points[trendAnalysis.points.length - 1].x} ${trendAnalysis.padTop + trendAnalysis.usableH} L ${trendAnalysis.points[0].x} ${trendAnalysis.padTop + trendAnalysis.usableH} Z`}
                fill="url(#trendAreaGradient)"
              />
            )}

            {/* Trend Polyline */}
            {trendAnalysis.pathD && (
              <path
                d={trendAnalysis.pathD}
                fill="none"
                stroke="#0B856D"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Interactive Data Dots */}
            {trendAnalysis.points.map((pt, idx) => {
              const isLast = idx === trendAnalysis.points.length - 1;
              const isHovered = hoveredPoint?.date === pt.date;
              return (
                <g key={idx}>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isHovered ? 6 : isLast ? 5 : 3.5}
                    fill={isHovered ? '#0A6C58' : '#0B856D'}
                    stroke="#FFFFFF"
                    strokeWidth="1.8"
                    style={{ cursor: 'pointer', transition: 'all 150ms ease' }}
                    onMouseEnter={() => onHoverPoint({ x: pt.x, y: pt.y, date: pt.date, value: pt.val, unit: trendAnalysis.unit })}
                    onMouseLeave={() => onHoverPoint(null)}
                  />

                  {/* Floating badge over latest point */}
                  {showLatestBadge && isLast && (
                    <g transform={`translate(${pt.x}, ${pt.y - 12})`}>
                      <rect
                        x="-16"
                        y="-13"
                        width="32"
                        height="16"
                        rx="8"
                        fill="#0F766E"
                      />
                      <text
                        x="0"
                        y="-2"
                        textAnchor="middle"
                        fill="#FFFFFF"
                        fontSize="9"
                        fontWeight="700"
                        fontFamily="Outfit, sans-serif"
                      >
                        {pt.val}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* X-axis Date Labels */}
            {trendAnalysis.points.map((pt, idx) => {
              const totalPoints = trendAnalysis.points.length;
              const shouldShow = totalPoints <= 16 || idx === 0 || idx === totalPoints - 1 || idx % Math.ceil(totalPoints / 16) === 0;
              if (!shouldShow) return null;

              return (
                <text
                  key={idx}
                  x={pt.x}
                  y="180"
                  fill="#94A3B8"
                  fontSize="9.5"
                  textAnchor="middle"
                  fontFamily="inherit"
                >
                  {pt.date}
                </text>
              );
            })}
          </svg>

          {/* Tooltip */}
          {hoveredPoint && (
            <div
              className={styles.tooltip}
              style={{
                left: `${(hoveredPoint.x / 740) * 100}%`,
                top: `${(hoveredPoint.y / 190) * 100}%`,
              }}
            >
              {hoveredPoint.date}: <strong>{hoveredPoint.value} {hoveredPoint.unit}</strong>
            </div>
          )}
        </div>
      ) : (
        <div className={styles.emptyCardMessage}>
          <Scale size={28} className={styles.emptyIcon} />
          <h4 className={styles.emptyCardTitle}>No {activeMetricTab} Entries Found</h4>
          <p className={styles.emptyCardSub}>
            Log your check-in to track your physical transformation trend.
          </p>
        </div>
      )}

      {/* Chart Legend */}
      {trendAnalysis.hasData && (
        <div className={styles.chartLegend}>
          <div className={styles.legendItem}>
            <span className={styles.legendDotGreen} />
            <span>{String(activeMetricTab).toUpperCase()} ({trendAnalysis.unit})</span>
          </div>
          {showGoal && trendAnalysis.goalText !== '—' && (
            <div className={styles.legendItem}>
              <span className={styles.legendDashedGreen} />
              <span>Goal ({trendAnalysis.goalText})</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
