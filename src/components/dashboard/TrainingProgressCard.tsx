'use client';

import React from 'react';
import { BarChart3, ChevronDown, Dumbbell } from 'lucide-react';
import styles from '@/app/app/page.module.css';

export interface TrainingExerciseProgression {
  exercise: string;
  curr: number;
  prev: number;
}

interface TrainingProgressCardProps {
  trainingProgressExercises: TrainingExerciseProgression[];
  trainingRange: 'Last 4 Weeks' | 'Last 8 Weeks';
  onTrainingRangeChange: (range: 'Last 4 Weeks' | 'Last 8 Weeks') => void;
  isDropdownOpen: boolean;
  onToggleDropdown: () => void;
}

export const TrainingProgressCard: React.FC<TrainingProgressCardProps> = ({
  trainingProgressExercises,
  trainingRange,
  onTrainingRangeChange,
  isDropdownOpen,
  onToggleDropdown,
}) => {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>
          <BarChart3 size={18} className={styles.cardIcon} />
          Training Progress
        </span>

        <div className={styles.cardHeaderLeft}>
          <div className={styles.trainingLegend}>
            <div className={styles.legendItem}>
              <span className={styles.mintDot} />
              <span>Previous</span>
            </div>
            <div className={styles.legendItem}>
              <span className={styles.tealDot} />
              <span>Current</span>
            </div>
          </div>

          {/* Time Range Dropdown for Training */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={onToggleDropdown}
              className={styles.timeDropdown}
            >
              <span>{trainingRange}</span>
              <ChevronDown size={13} />
            </button>

            {isDropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '115%',
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                  padding: '4px',
                  zIndex: 30,
                  minWidth: '130px',
                }}
              >
                {(['Last 4 Weeks', 'Last 8 Weeks'] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      onTrainingRangeChange(opt);
                      onToggleDropdown();
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '6px 10px',
                      border: 'none',
                      background: trainingRange === opt ? '#F1F5F9' : 'transparent',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: trainingRange === opt ? 700 : 500,
                      color: '#0F172A',
                      cursor: 'pointer',
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grouped Bar Chart or Clean Empty State */}
      {trainingProgressExercises.length > 0 ? (
        <div className={styles.chartContainer}>
          <svg viewBox="0 0 500 200" className={styles.chartSvg}>
            {/* Horizontal Gridlines */}
            {[120, 90, 60, 30, 0].map((tick) => {
              const y = 20 + (1 - tick / 120) * 140;
              return (
                <g key={tick}>
                  <line
                    x1="35"
                    y1={y}
                    x2="480"
                    y2={y}
                    stroke="#F1F5F9"
                    strokeWidth="1"
                  />
                  <text
                    x="28"
                    y={y + 4}
                    fill="#94A3B8"
                    fontSize="10"
                    textAnchor="end"
                    fontFamily="inherit"
                  >
                    {tick}
                  </text>
                </g>
              );
            })}

            {/* Grouped Bars */}
            {trainingProgressExercises.map((item, idx) => {
              const total = trainingProgressExercises.length;
              const colWidth = 435 / Math.max(1, total);
              const center = 45 + colWidth * idx + colWidth / 2;
              const barWidth = 26;
              const barGap = 4;
              const prevX = center - barWidth - barGap / 2;
              const currX = center + barGap / 2;
              const prevHeight = Math.min(140, (item.prev / 120) * 140);
              const currHeight = Math.min(140, (item.curr / 120) * 140);
              const prevY = 160 - prevHeight;
              const currY = 160 - currHeight;

              return (
                <g key={item.exercise}>
                  {/* Previous Bar (Mint) */}
                  <rect
                    x={prevX}
                    y={prevY}
                    width={barWidth}
                    height={prevHeight}
                    fill="#A7E2D1"
                    rx="4"
                  />
                  <text
                    x={prevX + barWidth / 2}
                    y={prevY - 6}
                    fill="#475569"
                    fontSize="10"
                    fontWeight="700"
                    textAnchor="middle"
                  >
                    {item.prev}
                  </text>

                  {/* Current Bar (Teal) */}
                  <rect
                    x={currX}
                    y={currY}
                    width={barWidth}
                    height={currHeight}
                    fill="#0B856D"
                    rx="4"
                  />
                  <text
                    x={currX + barWidth / 2}
                    y={currY - 6}
                    fill="#0F172A"
                    fontSize="10"
                    fontWeight="700"
                    textAnchor="middle"
                  >
                    {item.curr}
                  </text>

                  {/* Exercise Label */}
                  <text
                    x={center}
                    y="182"
                    fill="#475569"
                    fontSize="11"
                    fontWeight="600"
                    textAnchor="middle"
                    fontFamily="inherit"
                  >
                    {item.exercise}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      ) : (
        <div className={styles.emptyCardMessage}>
          <Dumbbell size={28} className={styles.emptyIcon} />
          <h4 className={styles.emptyCardTitle}>No Strength PRs Logged Yet</h4>
          <p className={styles.emptyCardSub}>
            Complete workout sessions to track your compound lift progression across cycles.
          </p>
        </div>
      )}
    </div>
  );
};
