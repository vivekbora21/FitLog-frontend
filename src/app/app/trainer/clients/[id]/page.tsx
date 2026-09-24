'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, UserCheck, Dumbbell, Trophy, Scale, Calendar } from 'lucide-react';
import { api } from '@/lib/api';
import { WorkoutSession, WeightEntry, PersonalRecord } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { MetricChart } from '@/components/MetricChart';

import styles from './clientDetail.module.css';

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;

  const [workouts, setWorkouts] = useState<WorkoutSession[]>([]);
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [prs, setPrs] = useState<PersonalRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadClientData() {
      try {
        const [wData, wtData, prData] = await Promise.all([
          api.getWorkouts(clientId),
          api.getWeights(clientId),
          api.getPersonalRecords(clientId),
        ]);
        setWorkouts(wData.results || wData);
        setWeights(wtData.results || wtData);
        setPrs(prData.results || prData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    if (clientId) {
      loadClientData();
    }
  }, [clientId]);

  const chartData = [...weights]
    .reverse()
    .map((w) => ({
      label: new Date(w.date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }),
      value: w.weight_kg,
    }));

  return (
    <div className={styles.container}>
      <button
        onClick={() => router.back()}
        className={styles.backButton}
      >
        <ArrowLeft size={16} />
        <span>Back to Client Roster</span>
      </button>

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <div className={styles.avatar}>
            <UserCheck size={28} className={styles.avatarIcon} />
          </div>
          <div>
            <div className={styles.titleRow}>
              <h1 className={styles.title}>Client Fitness Profile</h1>
              <Badge variant="emerald">Shared Workouts Active</Badge>
            </div>
            <p className={styles.subtitle}>
              Inspecting verified training volume, progressive overload, and weight trend.
            </p>
          </div>
        </div>
      </div>

      {/* Weight Trend */}
      <Card elevated>
        <MetricChart
          data={chartData}
          title="Client Body Weight Trend (kg)"
          unit="kg"
          type="line"
          color="#10B981"
          height={220}
        />
      </Card>

      {/* Personal Records */}
      <div>
        <h2 className={styles.sectionTitle}>Client Personal Records</h2>
        <div className={styles.prGrid}>
          {prs.map((pr) => (
            <Card key={pr.id}>
              <div className={styles.prExercise}>{pr.exercise_name}</div>
              <div className={styles.prWeight}>
                {pr.max_weight_kg}kg × {pr.reps}
              </div>
              <div className={styles.prEst1rm}>
                Est 1RM: {pr.estimated_one_rep_max} kg
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Completed Workout Logs */}
      <div>
        <h2 className={styles.sectionTitle}>Completed Workouts Log</h2>
        <div className={styles.workoutList}>
          {workouts.map((w) => (
            <Card key={w.id}>
              <div className={styles.workoutCardHeader}>
                <div>
                  <h3 className={styles.workoutTitle}>{w.title}</h3>
                  <div className={styles.workoutMeta}>
                    {new Date(w.started_at).toLocaleDateString()} • {Math.round(w.duration_seconds / 60)} mins
                    {w.overall_rpe && ` • RPE ${w.overall_rpe}/10`}
                  </div>
                </div>
                <div className={styles.volumeWrap}>
                  <div className={styles.volumeValue}>
                    {w.total_volume_kg.toLocaleString()} kg
                  </div>
                  <div className={styles.volumeLabel}>Volume</div>
                </div>
              </div>

              {w.notes && (
                <p className={styles.athleteNote}>
                  Athlete note: &ldquo;{w.notes}&rdquo;
                </p>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
