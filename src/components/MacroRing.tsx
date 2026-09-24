'use client';

import React from 'react';
import styles from './MacroRing.module.css';

interface MacroRingProps {
  label: string;
  current: number;
  target: number;
  unit?: string;
  color?: string;
  glowColor?: string;
  size?: number;
  strokeWidth?: number;
}

export const MacroRing: React.FC<MacroRingProps> = ({
  label,
  current,
  target,
  unit = 'g',
  color = '#10B981',
  glowColor = 'rgba(16, 185, 129, 0.3)',
  size = 120,
  strokeWidth = 9,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={styles.wrap}>
      <div className={styles.ringContainer} style={{ width: size, height: size }}>
        <svg width={size} height={size} className={styles.svgRotate}>
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            className={styles.trackCircle}
          />
          {/* Progress fill */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={styles.progressCircle}
            style={{ filter: `drop-shadow(0 0 6px ${glowColor})` }}
          />
        </svg>
        {/* Center Text */}
        <div className={styles.centerOverlay}>
          <span className={`${styles.currentValue} ${size <= 110 ? styles.currentValueSm : ''}`}>
            {current}
          </span>
          <span className={styles.targetLabel}>
            / {target}{unit}
          </span>
        </div>
      </div>
      <span className={styles.ringLabel}>
        {label}
      </span>
    </div>
  );
};
