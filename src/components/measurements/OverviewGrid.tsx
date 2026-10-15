'use client';

import React from 'react';
import { Ruler, Shirt } from 'lucide-react';
import styles from '@/app/app/measurements/measurements.module.css';

export interface OverviewItem {
  key: string;
  label: string;
  category: string;
  target_type: 'hypertrophy' | 'reduction' | 'neutral';
  icon_type?: string;
  current_cm: number | null;
  baseline_cm: number | null;
  diff_cm: number | null;
  diff_pct: number | null;
}

interface OverviewGridProps {
  items: OverviewItem[];
  selectedKey: string;
  onSelectKey: (key: string) => void;
  unit: 'cm' | 'in';
  baselineDate?: string;
}

function AnatomicalIcon({ type, size = 15, color = 'currentColor' }: { type?: string; size?: number; color?: string }) {
  switch (type) {
    case 'shoulders':
      return <Shirt size={size} color={color} />;
    case 'chest':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 3h12l2 6-4 4-4-2-4 2-4-4 2-6z" />
          <path d="M12 11v10" />
        </svg>
      );
    case 'waist':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h16c-1 4-3 7-3 8s2 4 3 8H4c1-4 3-7 3-8s-2-4-3-8z" />
        </svg>
      );
    case 'hips':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 4h14l1 7-4 9h-2l-2-6-2 6H8L4 11l1-7z" />
        </svg>
      );
    case 'arms':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 16.5a3.5 3.5 0 0 0 5 0l1-1a3 3 0 0 0 4-4l-1-1a3.5 3.5 0 0 0-5 0l-4 4a2 2 0 0 0 0 2.8z" />
        </svg>
      );
    case 'thighs':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 3h12v7c0 4-2 7-3 11h-2l-1-9-1 9H9C8 17 6 14 6 10V3z" />
        </svg>
      );
    case 'calves':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 3h8c1 5 2 9 0 13l-1 5H9l-1-5c-2-4-1-8 0-13z" />
        </svg>
      );
    case 'neck':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 3h8v6a4 4 0 0 1-8 0V3z" />
        </svg>
      );
    default:
      return <Ruler size={size} color={color} />;
  }
}

export const OverviewGrid: React.FC<OverviewGridProps> = ({
  items,
  selectedKey,
  onSelectKey,
  unit,
  baselineDate = 'Sep 14, 2026',
}) => {
  const toDisplayValue = (valCm?: number | null) => {
    if (valCm === null || valCm === undefined || isNaN(valCm)) return '—';
    if (unit === 'cm') return valCm.toFixed(1);
    return (valCm / 2.54).toFixed(1);
  };

  return (
    <div className={styles.overviewSection}>
      <div className={styles.overviewHeader}>
        <div className={styles.overviewIcon}>
          <Ruler size={18} />
        </div>
        <div>
          <h3 className={styles.overviewTitle}>Body Measurement Overview</h3>
          <p className={styles.overviewSubtitle}>
            Latest measurements with change from baseline ({baselineDate}). Click on a metric to view detailed trend.
          </p>
        </div>
      </div>

      <div className={styles.overviewGrid}>
        {items.map((def) => {
          const isSelected = selectedKey === def.key;
          let deltaStr = '—';
          let deltaClass = styles.metricCardDeltaNeutral;

          if (def.diff_cm !== null && def.diff_cm !== undefined) {
            const diffDisp = toDisplayValue(Math.abs(def.diff_cm));
            if (def.diff_cm > 0) {
              deltaStr = `+${diffDisp} ${unit}`;
              deltaClass = styles.metricCardDeltaGreen;
            } else if (def.diff_cm < 0) {
              deltaStr = `-${diffDisp} ${unit}`;
              deltaClass = def.target_type === 'reduction' ? styles.metricCardDeltaTeal : styles.metricCardDeltaBlue;
            } else {
              deltaStr = `0.0 ${unit}`;
            }
          }

          return (
            <div
              key={def.key}
              onClick={() => onSelectKey(def.key)}
              className={`${styles.metricCard} ${isSelected ? styles.metricCardActive : ''}`}
            >
              <div className={styles.metricCardHeader}>
                <span className={styles.metricCardIcon}>
                  <AnatomicalIcon type={def.icon_type} size={15} color="#0f766e" />
                </span>
                <span className={styles.metricCardLabel}>{def.label}</span>
              </div>

              <div className={styles.metricCardValueRow}>
                <span className={styles.metricCardValue}>{toDisplayValue(def.current_cm)}</span>
                <span className={styles.metricCardUnit}>{unit}</span>
              </div>

              <div className={styles.metricCardFooter}>
                <span className={styles.metricCardBase}>Base: {toDisplayValue(def.baseline_cm)} {unit}</span>
                <span className={deltaClass}>{deltaStr}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
