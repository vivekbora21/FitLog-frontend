'use client';

import React from 'react';
import { ArrowLeftRight, Dumbbell, Ruler, Info } from 'lucide-react';
import styles from '@/app/app/measurements/measurements.module.css';

export interface SymmetryItem {
  label: string;
  icon_type?: string;
  left_cm: number;
  right_cm: number;
  diff_cm: number;
  is_balanced: boolean;
  left_ratio: number;
  right_ratio: number;
}

interface SymmetryCardProps {
  items: SymmetryItem[];
  unit: 'cm' | 'in';
}

export const SymmetryCard: React.FC<SymmetryCardProps> = ({ items, unit }) => {
  const toDisplayValue = (valCm?: number | null) => {
    if (valCm === null || valCm === undefined || isNaN(valCm)) return '—';
    if (unit === 'cm') return valCm.toFixed(1);
    return (valCm / 2.54).toFixed(1);
  };

  return (
    <div className={styles.symmetryCard}>
      <div>
        <div className={styles.symmetryHeader}>
          <div className={styles.symmetryIcon}>
            <ArrowLeftRight size={18} color="#0f766e" />
          </div>
          <div>
            <h3 className={styles.symmetryTitle}>Left vs Right Symmetry</h3>
            <p className={styles.symmetrySubtitle}>
              Compare left and right measurements for balance.
            </p>
          </div>
        </div>

        {/* Informational Benchmark Note */}
        <div className={styles.symmetryBenchmarkNote}>
          <Info size={13} style={{ flexShrink: 0, color: '#0f766e' }} />
          <span>Informational benchmark · For muscular balance tracking, not medical diagnosis.</span>
        </div>

        <div className={styles.symmetryList}>
          {items && items.length > 0 ? (
            items.map((sym) => (
              <div key={sym.label} className={styles.symmetryRow}>
                <div className={styles.symmetryRowTop}>
                  <div className={styles.symmetryRowTitleWrap}>
                    <span className={styles.symmetryRowIcon}>
                      {sym.icon_type === 'arms' ? <Dumbbell size={14} /> : <Ruler size={14} />}
                    </span>
                    <span className={styles.symmetryRowTitle}>{sym.label}</span>
                  </div>
                  <span className={sym.is_balanced ? styles.symmetryStatusBadge : styles.symmetryStatusBadgeAmber}>
                    {sym.is_balanced ? 'Balanced' : 'Slight Variance'}
                  </span>
                </div>

                <div className={styles.symmetryValuesRow}>
                  <div className={styles.symmetrySideCol}>
                    <span className={styles.symmetrySideLabel}>Left:</span>
                    <span className={styles.symmetrySideVal}>{toDisplayValue(sym.left_cm)} {unit}</span>
                  </div>
                  <div className={styles.symmetryDeltaWrap}>
                    <span>Δ {toDisplayValue(sym.diff_cm)} {unit}</span>
                  </div>
                  <div className={styles.symmetrySideCol}>
                    <span className={styles.symmetrySideLabel}>Right:</span>
                    <span className={styles.symmetrySideVal}>{toDisplayValue(sym.right_cm)} {unit}</span>
                  </div>
                </div>

                {/* Proportional balance horizontal bars */}
                <div className={styles.symmetryBarContainer}>
                  <div
                    className={styles.symmetryBarLeft}
                    style={{ width: `${sym.left_ratio / 2}%` }}
                  />
                  <div
                    className={styles.symmetryBarRight}
                    style={{ width: `${sym.right_ratio / 2}%` }}
                  />
                </div>
              </div>
            ))
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.8125rem' }}>
              Log left and right bilateral limb data during check-in to view symmetry analysis.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
