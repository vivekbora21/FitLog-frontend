'use client';

import React, { useState } from 'react';
import { Award, Search, ArrowUpDown } from 'lucide-react';
import styles from './planHistory.module.css';

export interface ExerciseStatItem {
  exercise: string;
  category: string;
  best_weight_kg: number;
  best_reps: number;
  total_volume_kg: number;
  estimated_1rm: number;
  best_date: string;
}

interface ExercisePerformanceTableProps {
  exerciseStats?: ExerciseStatItem[];
}

export const ExercisePerformanceTable: React.FC<ExercisePerformanceTableProps> = ({
  exerciseStats,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Default fallback data matching reference if not yet populated
  const list: ExerciseStatItem[] = exerciseStats && exerciseStats.length > 0
    ? exerciseStats
    : [
        { exercise: 'Barbell Bench Press', category: 'Chest', best_weight_kg: 85, best_reps: 6, total_volume_kg: 3420, estimated_1rm: 98.6, best_date: '2026-10-12' },
        { exercise: 'Barbell Back Squat', category: 'Legs / Quads', best_weight_kg: 110, best_reps: 5, total_volume_kg: 4850, estimated_1rm: 125.0, best_date: '2026-10-10' },
        { exercise: 'Conventional Deadlift', category: 'Back / Posterior', best_weight_kg: 130, best_reps: 4, total_volume_kg: 5200, estimated_1rm: 143.0, best_date: '2026-10-08' },
        { exercise: 'Overhead Barbell Press', category: 'Shoulders', best_weight_kg: 55, best_reps: 6, total_volume_kg: 2150, estimated_1rm: 63.8, best_date: '2026-10-11' },
        { exercise: 'Barbell Bent-Over Row', category: 'Back', best_weight_kg: 75, best_reps: 8, total_volume_kg: 3600, estimated_1rm: 91.5, best_date: '2026-10-09' },
        { exercise: 'Incline Dumbbell Press', category: 'Chest', best_weight_kg: 30, best_reps: 8, total_volume_kg: 2400, estimated_1rm: 36.6, best_date: '2026-10-14' },
        { exercise: 'Lat Pulldown', category: 'Back', best_weight_kg: 70, best_reps: 10, total_volume_kg: 2800, estimated_1rm: 88.2, best_date: '2026-10-13' },
      ];

  const filtered = list.filter((item) =>
    item.exercise.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={styles.panelCard}>
      <div className={styles.panelHeader}>
        <div className={styles.panelTitleWrap}>
          <div className={styles.metricIconBox}>
            <Award size={18} />
          </div>
          <div>
            <h2 className={styles.panelTitle}>Exercise Stats &amp; Performance</h2>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Best lifts, calculated 1RM and cumulative volume
            </div>
          </div>
        </div>

        {/* Search input */}
        <div style={{ position: 'relative', minWidth: '180px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search exercises..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: '6px 10px 6px 30px',
              fontSize: '0.75rem',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              outline: 'none',
              width: '100%',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.perfTable}>
          <thead>
            <tr>
              <th>Movement</th>
              <th>Category</th>
              <th>Best Set</th>
              <th>Total Vol</th>
              <th>Est. 1RM</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item, idx) => (
              <tr key={idx}>
                <td>
                  <div className={styles.exerciseCell}>
                    <span className={styles.exerciseNameText}>{item.exercise}</span>
                  </div>
                </td>
                <td>
                  <span className={styles.exerciseCategoryBadge}>{item.category}</span>
                </td>
                <td>
                  <span className={styles.bestSetPill}>
                    {item.best_weight_kg}kg &times; {item.best_reps}
                  </span>
                </td>
                <td>
                  <strong>{item.total_volume_kg.toLocaleString()}</strong> kg
                </td>
                <td>
                  <span className={styles.oneRmValue}>{item.estimated_1rm} kg</span>
                </td>
                <td style={{ color: '#64748b', fontSize: '0.75rem' }}>
                  {item.best_date}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
