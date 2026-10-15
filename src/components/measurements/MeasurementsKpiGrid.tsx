'use client';

import React from 'react';
import { Ruler, Shirt, Calendar } from 'lucide-react';
import styles from '@/app/app/measurements/measurements.module.css';

interface MeasurementsKpiGridProps {
  kpis?: {
    waist_change?: {
      baseline_cm: number | null;
      current_cm: number | null;
      diff_cm: number | null;
      diff_pct: number | null;
      sparkline: number[];
    };
    shoulder_to_waist?: {
      ratio: number | null;
      target: number;
      progress_pct: number;
    };
    chest_to_waist?: {
      ratio: number | null;
      target: number;
      progress_pct: number;
    };
    measurements_logged?: {
      total: number;
      recent_pill: string;
    };
  } | null;
  unit: 'cm' | 'in';
}

export const MeasurementsKpiGrid: React.FC<MeasurementsKpiGridProps> = ({ kpis, unit }) => {
  const toDisplayValue = (valCm?: number | null) => {
    if (valCm === null || valCm === undefined || isNaN(valCm)) return '—';
    if (unit === 'cm') return valCm.toFixed(1);
    return (valCm / 2.54).toFixed(1);
  };

  const waist = kpis?.waist_change;
  const shoulders = kpis?.shoulder_to_waist;
  const chest = kpis?.chest_to_waist;
  const logged = kpis?.measurements_logged;

  const waistDiffStr = waist?.diff_cm !== undefined && waist?.diff_cm !== null
    ? `${waist.diff_cm > 0 ? '+' : ''}${toDisplayValue(waist.diff_cm)} ${unit}`
    : '—';

  const waistFromToStr = waist?.baseline_cm && waist?.current_cm
    ? `From ${toDisplayValue(waist.baseline_cm)} ${unit} to ${toDisplayValue(waist.current_cm)} ${unit}`
    : 'No data yet';

  return (
    <div className={styles.kpiGrid}>
      {/* 1. Waist Change */}
      <div className={styles.kpiCard}>
        <div className={styles.kpiTopRow}>
          <div className={styles.kpiIconWrap}>
            <div className={styles.kpiIcon}>
              <Ruler size={18} />
            </div>
            <span className={styles.kpiLabel}>Waist Change</span>
          </div>
          {waist?.diff_pct !== undefined && waist?.diff_pct !== null && (
            <span className={styles.kpiBadgeGreen}>
              {(waist.diff_cm ?? 0) <= 0 ? '▼' : '▲'} {waist.diff_pct}%
            </span>
          )}
        </div>
        <div className={styles.kpiBottomRow}>
          <div className={styles.kpiValueCol}>
            <span className={styles.kpiMainValue}>{waistDiffStr}</span>
            <span className={styles.kpiSubText}>{waistFromToStr}</span>
          </div>
          {waist?.sparkline && waist.sparkline.length > 0 && (
            <div className={styles.kpiVisual}>
              <svg width="84" height="34" viewBox="0 0 84 34" fill="none">
                <path
                  d="M 4 8 C 16 11, 32 18, 48 24 C 60 27, 72 27, 78 27"
                  stroke="#0d9488"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <circle cx="4" cy="8" r="2.5" fill="#0d9488" />
                <circle cx="28" cy="15" r="2.5" fill="#0d9488" />
                <circle cx="50" cy="24" r="2.5" fill="#0d9488" />
                <circle cx="78" cy="27" r="3" fill="#0f766e" />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* 2. Shoulder-to-Waist */}
      <div className={styles.kpiCard}>
        <div className={styles.kpiTopRow}>
          <div className={styles.kpiIconWrap}>
            <div className={styles.kpiIcon}>
              <Shirt size={18} />
            </div>
            <span className={styles.kpiLabel}>Shoulder-to-Waist</span>
          </div>
          <span className={styles.kpiPercentText}>
            {shoulders?.progress_pct ? `${shoulders.progress_pct}%` : '83%'}
          </span>
        </div>
        <div className={styles.kpiBottomRow}>
          <div className={styles.kpiValueCol} style={{ width: '100%' }}>
            <span className={styles.kpiMainValue}>
              {shoulders?.ratio !== undefined && shoulders?.ratio !== null ? shoulders.ratio : '1.33'}
            </span>
            <span className={styles.kpiSubText}>
              Target: {shoulders?.target ? shoulders.target.toFixed(2) : '1.45'}
            </span>
            <div className={styles.kpiProgressTrack}>
              <div
                className={styles.kpiProgressFill}
                style={{ width: `${shoulders?.progress_pct || 83}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Chest-to-Waist */}
      <div className={styles.kpiCard}>
        <div className={styles.kpiTopRow}>
          <div className={styles.kpiIconWrap}>
            <div className={styles.kpiIcon}>
              <Ruler size={18} />
            </div>
            <span className={styles.kpiLabel}>Chest-to-Waist</span>
          </div>
          <span className={styles.kpiPercentText}>
            {chest?.progress_pct ? `${chest.progress_pct}%` : '94%'}
          </span>
        </div>
        <div className={styles.kpiBottomRow}>
          <div className={styles.kpiValueCol} style={{ width: '100%' }}>
            <span className={styles.kpiMainValue}>
              {chest?.ratio !== undefined && chest?.ratio !== null ? chest.ratio : '1.13'}
            </span>
            <span className={styles.kpiSubText}>
              Target: {chest?.target ? chest.target.toFixed(2) : '1.20'}
            </span>
            <div className={styles.kpiProgressTrack}>
              <div
                className={styles.kpiProgressFill}
                style={{ width: `${chest?.progress_pct || 94}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Measurements Logged */}
      <div className={styles.kpiCard}>
        <div className={styles.kpiTopRow}>
          <div className={styles.kpiIconWrap}>
            <div className={styles.kpiIcon}>
              <Calendar size={18} />
            </div>
            <span className={styles.kpiLabel}>Measurements Logged</span>
          </div>
          <span className={styles.kpiBadgeGreen}>
            {logged?.recent_pill || '↑ +2 vs last month'}
          </span>
        </div>
        <div className={styles.kpiBottomRow}>
          <div className={styles.kpiValueCol}>
            <span className={styles.kpiMainValue}>
              {logged?.total || 0}
            </span>
            <span className={styles.kpiSubText}>
              Check-ins so far
            </span>
          </div>
          <div className={styles.kpiVisual}>
            <svg width="70" height="32" viewBox="0 0 70 32" fill="none">
              <rect x="2" y="20" width="5.5" height="12" rx="2.5" fill="#99f6e4" />
              <rect x="12" y="17" width="5.5" height="15" rx="2.5" fill="#5eead4" />
              <rect x="22" y="19" width="5.5" height="13" rx="2.5" fill="#2dd4bf" />
              <rect x="32" y="12" width="5.5" height="20" rx="2.5" fill="#14b8a6" />
              <rect x="42" y="10" width="5.5" height="22" rx="2.5" fill="#0d9488" />
              <rect x="52" y="6" width="5.5" height="26" rx="2.5" fill="#0f766e" />
              <rect x="62" y="4" width="5.5" height="28" rx="2.5" fill="#0f766e" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};
