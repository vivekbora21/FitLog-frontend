'use client';

import React, { useState } from 'react';
import { JourneyDetail } from '@/lib/types';
import { api } from '@/lib/api';
import { PlanSelectorModal } from '@/components/PlanSelectorModal';
import { Modal } from '@/components/ui/Modal';
import { PlanHeroBanner } from './PlanHeroBanner';
import { PlanMetricCards } from './PlanMetricCards';
import { WorkoutTrendsChart } from './WorkoutTrendsChart';
import { TrainingFrequencyCard } from './TrainingFrequencyCard';
import { MuscleBreakdownCard } from './MuscleBreakdownCard';
import { ExercisePerformanceTable } from './ExercisePerformanceTable';
import { PlanScheduleSection } from './PlanScheduleSection';
import styles from './planHistory.module.css';

interface PlanProgressDashboardProps {
  data: JourneyDetail;
  onRefresh?: () => void;
}

export const PlanProgressDashboard: React.FC<PlanProgressDashboardProps> = ({ data, onRefresh }) => {
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
  const [newWeight, setNewWeight] = useState<number>(data.summary?.current_weight_kg || 77.53);
  const [newBf, setNewBf] = useState<number>(15.0);
  const [savingWeight, setSavingWeight] = useState(false);

  const { program, summary, days, weight_log, volume_trend, measurements_log, cardio_log } = data;

  const handleSaveWeight = async () => {
    if (!newWeight) return;
    setSavingWeight(true);
    try {
      await api.logWeight(newWeight, newBf);
      setIsWeightModalOpen(false);
      onRefresh?.();
    } catch (err) {
      console.error('Failed to log weight', err);
    } finally {
      setSavingWeight(false);
    }
  };

  return (
    <div className={styles.dashboard}>
      {/* 1. Top Hero Banner */}
      <PlanHeroBanner
        program={program}
        onOpenPlanSelector={() => setIsPlanModalOpen(true)}
        onOpenLogWeight={() => setIsWeightModalOpen(true)}
      />

      {/* 2. Top 4 Metric Cards */}
      <PlanMetricCards
        summary={summary}
        program={program}
      />

      {/* 3. Middle Section: Weekly Trends Chart + Training Frequency */}
      <div className={styles.midSectionGrid}>
        <WorkoutTrendsChart
          weightLog={weight_log || []}
          volumeTrend={volume_trend || []}
          measurementsLog={measurements_log || []}
          cardioLog={cardio_log || []}
          days={days || []}
          startWeight={program.start_weight_kg}
          targetWeight={program.target_weight_kg}
        />

        <TrainingFrequencyCard
          summary={summary}
        />
      </div>

      {/* 4. Bottom Section: Muscle Group Breakdown + Exercise Stats & Performance Table */}
      <div className={styles.botSectionGrid}>
        <MuscleBreakdownCard
          muscleBreakdown={summary.muscle_breakdown || []}
        />

        <ExercisePerformanceTable
          exerciseStats={summary.exercise_stats || []}
        />
      </div>

      {/* 5. Day by Day Plan Schedule & Completed Workouts */}
      <PlanScheduleSection
        days={days || []}
        currentDay={program.current_day || 1}
      />

      {/* Modal: Change Plan */}
      <PlanSelectorModal
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        onSuccess={() => {
          setIsPlanModalOpen(false);
          onRefresh?.();
        }}
      />

      {/* Modal: Log Fasted Weight */}
      <Modal
        isOpen={isWeightModalOpen}
        onClose={() => setIsWeightModalOpen(false)}
        title="Log Morning Fasted Weigh-In"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem 0' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>
              Scale Weight (kg)
            </label>
            <input
              type="number"
              step="0.05"
              value={newWeight}
              onChange={(e) => setNewWeight(parseFloat(e.target.value) || 0)}
              style={{
                width: '100%',
                padding: '0.625rem 0.75rem',
                border: '1px solid #cbd5e1',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                fontWeight: 600,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>
              Body Fat % (Optional)
            </label>
            <input
              type="number"
              step="0.1"
              value={newBf}
              onChange={(e) => setNewBf(parseFloat(e.target.value) || 0)}
              style={{
                width: '100%',
                padding: '0.625rem 0.75rem',
                border: '1px solid #cbd5e1',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                fontWeight: 600,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              className={styles.secondaryActionBtn}
              onClick={() => setIsWeightModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className={styles.primaryActionBtn}
              onClick={handleSaveWeight}
              disabled={savingWeight}
            >
              {savingWeight ? 'Saving...' : 'Save Weigh-In'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
