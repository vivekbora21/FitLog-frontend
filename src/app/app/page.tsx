'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Dumbbell, TrendingUp, Trophy } from 'lucide-react';
import { api } from '@/lib/api';
import { DashboardStats as DashboardStatsBase, JourneyPacingData } from '@/lib/types';
import { DashboardCharts, DashboardTrends } from '@/components/DashboardCharts';
import { Card } from '@/components/ui/Card';
import { RightPathCard } from '@/components/RightPathCard';
import { PlanSelectorModal } from '@/components/PlanSelectorModal';
import { WeeklyHealthStrip } from '@/components/WeeklyHealthStrip';
import styles from './page.module.css';

type DashboardStats = Partial<DashboardStatsBase> & { trends?: DashboardTrends };

type TodayPayload = {
  program?: { current_day: number; duration_days: number } | null;
  today?: {
    day_number: number;
    label: string;
    status: string;
    routine_details?: {
      id: string;
      name: string;
      exercises?: Array<{ id: string; exercise_name: string }>;
    };
  } | null;
};

const num = (value: number | null | undefined) => (value == null ? '--' : Math.round(value).toLocaleString());

function SkeletonBlock({ width, height }: { width?: string | number; height?: string | number }) {
  return <div className="skeleton" style={{ width: width ?? '100%', height: height ?? 14 }} />;
}

function DashboardSkeleton() {
  return (
    <div className={styles.page}>
      <SkeletonBlock height={190} />
      <Card className={styles.todayCard}>
        <div className={styles.skeletonHeaderCol}>
          <SkeletonBlock width={140} height={10} />
          <SkeletonBlock width="70%" height={26} />
          <SkeletonBlock width="90%" height={14} />
        </div>
      </Card>
      <SkeletonBlock height={120} />
      <SkeletonBlock height={320} />
    </div>
  );
}

function TodayFact({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <li className={styles.fact}>
      <span className={styles.factLabel}>{label}</span>
      <span className={styles.factValue}>{value}</span>
      {note && <span className={styles.factNote}>{note}</span>}
    </li>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [today, setToday] = useState<TodayPayload | null>(null);
  const [pacingData, setPacingData] = useState<JourneyPacingData | null>(null);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [dashboard, current] = await Promise.all([
        api.getDashboardStats(),
        api.getTodaysWorkout(),
      ]);
      const pacing = dashboard.journey_pacing ?? null;
      setStats(dashboard);
      setToday(current);
      setPacingData(pacing);
      if (pacing && !pacing.has_program) {
        setIsPlanModalOpen(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const journey = stats?.journey || {};
  const nutrition = stats?.nutrition;
  const dailyLog = stats?.daily_log;
  const routine = today?.today?.routine_details;
  const anchorLifts = useMemo(() => (stats?.recent_prs || []).slice(0, 5), [stats]);
  const programDay = pacingData?.current_day || today?.program?.current_day;
  const programLength = Number(pacingData?.duration_days || journey.program_length || today?.program?.duration_days || 60);

  if (loading) {
    return <DashboardSkeleton />;
  }

  const exerciseCount = routine?.exercises?.length || 0;
  const workoutName = routine?.name || today?.today?.label || 'Rest / no session scheduled';
  const workoutNote = today?.today
    ? [today.today.status?.toLowerCase(), exerciseCount ? `${exerciseCount} exercises` : null].filter(Boolean).join(' · ')
    : undefined;

  return (
    <div className={styles.page}>
      <h1 className={styles.srOnly}>Dashboard</h1>

      {/* 1. Right Path status — the headline answer to "am I on track?" */}
      <RightPathCard pacing={pacingData} onOpenPlanSelector={() => setIsPlanModalOpen(true)} />

      {/* 2. Today, framed by the one thing to focus on this week */}
      <Card className={styles.todayCard}>
        <div className={styles.todayHeader}>
          <div className={styles.todayHeading}>
            <div className={styles.eyebrow}>
              Today{programDay ? ` · Day ${programDay} of ${programLength}` : ''}
            </div>
            <h2 className={styles.focus}>
              {stats?.weekly_health?.focus || 'Log today to see what to focus on this week.'}
            </h2>
          </div>
          <div className={styles.todayActions}>
            <Link href="/app/daily" className={styles.actionSecondary}>Log Daily</Link>
            <Link href="/app/workouts/active" className={styles.actionPrimary}>Start Today <ArrowRight size={15} /></Link>
          </div>
        </div>

        <ul className={styles.facts}>
          <TodayFact label="Workout" value={workoutName} note={workoutNote} />
          <TodayFact label="Calories" value={`${num(nutrition?.calories_consumed)} / ${num(nutrition?.calories_target)} kcal`} />
          <TodayFact label="Protein" value={`${num(nutrition?.protein_consumed)} / ${num(nutrition?.protein_target)} g`} />
          <TodayFact label="Steps" value={dailyLog?.steps ? num(dailyLog.steps) : 'Not logged'} />
          <TodayFact
            label="Water"
            value={`${num((nutrition?.water_consumed_ml || 0) / 250)} / ${num((nutrition?.water_target_ml || 0) / 250)} cups`}
          />
          {dailyLog?.weight_kg != null && <TodayFact label="Weight" value={`${dailyLog.weight_kg} kg`} />}
        </ul>
      </Card>

      {/* 3. Weekly health — same server object the Review page shows */}
      <WeeklyHealthStrip health={stats?.weekly_health} />

      {/* 4. Trends */}
      <section className={styles.trends}>
        <h2 className={styles.trendsHeading}>Trends</h2>

        <DashboardCharts
          trends={stats?.trends}
          targetWeight={pacingData?.target_weight || pacingData?.velocity?.expected_final_weight || journey.target_weight || 74.0}
          dailyCaloriesTarget={nutrition?.calories_target ? Number(nutrition.calories_target) : undefined}
          programDuration={programLength}
          modeLabel={pacingData?.mode_label || journey.mode_label || 'Goal'}
        />

        <Card className={styles.cardPad}>
          <div className={styles.sectionTitleRow}>
            <Trophy size={18} className={styles.sectionIcon} />
            <h3>Key Compound Strength Progression</h3>
          </div>
          <div className={styles.anchorGrid}>
            {anchorLifts.map((lift) => (
              <Card key={lift.exercise} hoverable className={styles.anchorCard}>
                <div className={styles.anchorCardHeader}>
                  <div className={styles.anchorName}>{lift.exercise}</div>
                  <TrendingUp size={15} className={styles.sectionIcon} />
                </div>
                <div className={styles.anchorValue}>{lift.max_weight_kg} kg &times; {lift.reps}</div>
                <div className={styles.anchorNote}>Est. 1RM {Math.round(lift.estimated_1rm)} kg</div>
              </Card>
            ))}
            {!anchorLifts.length && (
              <div className={styles.emptyState}>
                <div className={styles.emptyStateIcon}>
                  <Dumbbell size={22} />
                </div>
                <div className={styles.emptyStateTitle}>No lifts logged yet</div>
                <p className={styles.emptyStateMessage}>Complete a workout to start building your strength progression.</p>
                <Link href="/app/workouts/active" className={styles.emptyStateAction}>
                  Start Today <ArrowRight size={14} />
                </Link>
              </div>
            )}
          </div>
        </Card>
      </section>

      <PlanSelectorModal
        isOpen={isPlanModalOpen}
        dismissible={Boolean(pacingData?.has_program)}
        onClose={() => {
          if (pacingData?.has_program) {
            setIsPlanModalOpen(false);
          }
        }}
        onSuccess={() => {
          loadData();
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('fitlog:journey-updated'));
          }
        }}
        initialWeight={pacingData?.velocity?.rolling_7_avg || Number(journey.current_weight) || pacingData?.velocity?.start_weight || 75.0}
      />
    </div>
  );
}
