'use client';

import React from 'react';
import { Droplets } from 'lucide-react';
import styles from './nutritionComponents.module.css';

export interface HydrationCardProps {
  consumedMl: number;
  targetMl: number;
  onAddWater: (amountMl: number) => void;
}

export const HydrationCard: React.FC<HydrationCardProps> = ({
  consumedMl,
  targetMl,
  onAddWater,
}) => {
  const loggedWater = consumedMl / 1000;
  const targetWater = targetMl / 1000;
  const waterPct = targetWater > 0 ? Math.min(100, Math.round((loggedWater / targetWater) * 100)) : 0;
  const remainingWater = Math.max(0, targetWater - loggedWater);

  return (
    <div className={styles.hydrationCard}>
      <div className={styles.cardHeaderRow}>
        <div className={styles.cardHeaderTitleWrap}>
          <Droplets size={20} color="#2563eb" />
          <h2 className={styles.cardTitle}>Daily Hydration</h2>
        </div>
      </div>

      <div>
        <div className={styles.hydrationMainRow}>
          <div className={styles.hydrationValueBig}>
            {loggedWater.toFixed(1)}{' '}
            <span className={styles.hydrationTargetValue}>/ {targetWater.toFixed(1)} L</span>
          </div>
          <span className={styles.hydrationPctBadge}>{waterPct}%</span>
        </div>

        <div style={{ marginTop: '0.625rem' }}>
          <div className={styles.hydrationProgressBar}>
            <div
              className={styles.hydrationProgressFill}
              style={{ width: `${waterPct}%` }}
            />
          </div>
        </div>

        <div style={{ marginTop: '0.5rem' }}>
          <p className={styles.hydrationTargetSub}>
            Target: {targetWater.toFixed(1)} L per day ({remainingWater.toFixed(1)} L remaining)
          </p>
        </div>
      </div>

      <div className={styles.hydrationButtons}>
        <button
          type="button"
          className={styles.waterQuickBtn}
          onClick={() => onAddWater(250)}
        >
          +250 ml (Cup)
        </button>
        <button
          type="button"
          className={styles.waterQuickBtn}
          onClick={() => onAddWater(500)}
        >
          +500 ml (Bottle)
        </button>
        <button
          type="button"
          className={styles.waterQuickBtn}
          onClick={() => onAddWater(1000)}
        >
          +1,000 ml
        </button>
      </div>
    </div>
  );
};
