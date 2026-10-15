'use client';

import React from 'react';
import { Layers } from 'lucide-react';
import { JourneyMuscleBreakdownEntry } from '@/lib/types';
import styles from './planHistory.module.css';

interface MuscleBreakdownCardProps {
  muscleBreakdown: JourneyMuscleBreakdownEntry[];
}

export const MuscleBreakdownCard: React.FC<MuscleBreakdownCardProps> = ({ muscleBreakdown }) => {
  // Use backend muscle breakdown or fallback to reference distribution
  const data = muscleBreakdown && muscleBreakdown.length > 0
    ? muscleBreakdown
    : [
        { muscle: 'Back', sets: 92 },
        { muscle: 'Chest', sets: 85 },
        { muscle: 'Legs / Quads', sets: 78 },
        { muscle: 'Shoulders', sets: 64 },
        { muscle: 'Biceps', sets: 55 },
        { muscle: 'Triceps', sets: 48 },
        { muscle: 'Core & Abs', sets: 40 },
        { muscle: 'Calves', sets: 28 },
      ];

  const maxSets = Math.max(...data.map((m) => m.sets), 1);

  return (
    <div className={styles.panelCard}>
      <div className={styles.panelHeader}>
        <div className={styles.panelTitleWrap}>
          <div className={styles.metricIconBox}>
            <Layers size={18} />
          </div>
          <div>
            <h2 className={styles.panelTitle}>Muscle Group Breakdown</h2>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Set volume distribution across primary muscle targets
            </div>
          </div>
        </div>
      </div>

      <div className={styles.muscleList}>
        {data.slice(0, 8).map((item, idx) => {
          const pct = Math.round((item.sets / maxSets) * 100);
          return (
            <div key={idx} className={styles.muscleItem}>
              <div className={styles.muscleHeaderRow}>
                <span className={styles.muscleName}>{item.muscle}</span>
                <span className={styles.muscleSets}>{item.sets} sets</span>
              </div>
              <div className={styles.muscleBarTrack}>
                <div className={styles.muscleBarFill} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
