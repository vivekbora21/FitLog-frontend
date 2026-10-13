'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Dumbbell,
  TrendingUp,
  Trophy,
  Flame,
  Target,
  Droplets,
  Scale,
  Plus,
  Compass,
  CheckCircle2,
  Calendar,
  Moon,
  Clock,
} from 'lucide-react';
import { api } from '@/lib/api';
import { DashboardStats as DashboardStatsBase, JourneyPacingData } from '@/lib/types';
import { DashboardCharts, DashboardTrends } from '@/components/DashboardCharts';
import { Card } from '@/components/ui/Card';
import { RightPathCard } from '@/components/RightPathCard';
import { PlanSelectorModal } from '@/components/PlanSelectorModal';
import { QuickCheckInModal } from '@/components/QuickCheckInModal';
import { WeeklyHealthStrip } from '@/components/WeeklyHealthStrip';
import { useAuth } from '@/lib/authContext';
import { onboardingSkipKey } from '@/lib/onboarding';
import styles from './page.module.css';

type DashboardStats = Partial<DashboardStatsBase> & { trends?: DashboardTrends };

type TodayPayload = {
  program?: {
    id?: string;
    name?: string;
    current_day: number;
    duration_days: number;
  } | null;
  today?: {
    id?: string;
    day_number: number;
    label: string;
    status: string;
    routine_details?: {
      id: string;
      name: string;
      exercises?: Array<{
        id: string;
        exercise_name: string;
        primary_muscle?: string;
        sets?: unknown[];
      }>;
    };
  } | null;
};

const num = (value: number | null | undefined) =>
  value == null ? '--' : Math.round(value).toLocaleString();

const localDateKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function SkeletonBlock({ width, height }: { width?: string | number; height?: string | number }) {
  return <div className="skeleton" style={{ width: width ?? '100%', height: height ?? 14 }} />;
}

function DashboardSkeleton() {
  return (
    <div className={styles.page}>
      <div className={styles.heroBanner}>
        <div className={styles.heroLeft}>
          <SkeletonBlock width={180} height={18} />
          <SkeletonBlock width={260} height={32} />
        </div>
        <SkeletonBlock width={140} height={40} />
      </div>
      <SkeletonBlock height={220} />
      <div className={styles.todayGrid}>
        <SkeletonBlock height={260} />
        <SkeletonBlock height={260} />
      </div>
      <SkeletonBlock height={140} />
      <SkeletonBlock height={320} />
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [today, setToday] = useState<TodayPayload | null>(null);
  const [pacingData, setPacingData] = useState<JourneyPacingData | null>(null);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isQuickCheckInOpen, setIsQuickCheckInOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [addingWater, setAddingWater] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [dashboard, current] = await Promise.all([
        api.getDashboardStats(),
        api.getTodaysWorkout(),
      ]);
      const pacing = dashboard.journey_pacing ?? null;
      setStats(dashboard);
      setToday(current);
      setPacingData(pacing);
      const skippedOnboarding =
        typeof window !== 'undefined' &&
        user?.id &&
        localStorage.getItem(onboardingSkipKey(user.id));
      if (pacing && !pacing.has_program && !skippedOnboarding) {
        setIsPlanModalOpen(true);
      }
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    let ignore = false;
    const fetchInitial = async () => {
      try {
        const [dashboard, current] = await Promise.all([
          api.getDashboardStats(),
          api.getTodaysWorkout(),
        ]);
        if (ignore) return;
        const pacing = dashboard.journey_pacing ?? null;
        setStats(dashboard);
        setToday(current);
        setPacingData(pacing);
        const skippedOnboarding =
          typeof window !== 'undefined' &&
          user?.id &&
          localStorage.getItem(onboardingSkipKey(user.id));
        if (pacing && !pacing.has_program && !skippedOnboarding) {
          setIsPlanModalOpen(true);
        }
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };
    void fetchInitial();
    return () => {
      ignore = true;
    };
  }, [user]);

  const journey = stats?.journey || {};
  const nutrition = stats?.nutrition;
  const dailyLog = stats?.daily_log;
  const routine = today?.today?.routine_details;
  const anchorLifts = useMemo(() => (stats?.recent_prs || []).slice(0, 5), [stats]);
  const programDay = pacingData?.current_day || today?.program?.current_day || 1;
  const programLength = Number(
    pacingData?.duration_days || journey.program_length || today?.program?.duration_days || 60
  );

  // Dynamic Greeting based on current local hour
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    if (hour < 22) return 'Good evening';
    return 'Good night';
  }, []);

  const formattedDate = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  // Quick 1-tap add water
  const handleQuickAddWater = async () => {
    if (addingWater) return;
    setAddingWater(true);
    try {
      const currentMl = nutrition?.water_consumed_ml || 0;
      const newMl = currentMl + 250;
      const todayStr = localDateKey();
      await api.updateWater(todayStr, newMl);
      // Optimistic state update
      setStats((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          nutrition: {
            ...(prev.nutrition || {
              calories_consumed: 0,
              calories_target: 2140,
              protein_consumed: 0,
              protein_target: 160,
              carbs_consumed: 0,
              carbs_target: 200,
              fat_consumed: 0,
              fat_target: 65,
              water_consumed_ml: 0,
              water_target_ml: 3000,
            }),
            water_consumed_ml: newMl,
          },
        };
      });
    } catch (err) {
      console.error('Failed to log water', err);
      loadData();
    } finally {
      setAddingWater(false);
    }
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  const exerciseCount = routine?.exercises?.length || 0;
  const workoutName = routine?.name || today?.today?.label || 'Rest & Recovery Day';
  const isRestDay =
    !routine &&
    (today?.today?.label?.toLowerCase().includes('rest') ||
      today?.today?.status?.toLowerCase() === 'rest' ||
      !today?.today);
  const isWorkoutCompleted = today?.today?.status?.toUpperCase() === 'COMPLETED';

  const caloriesConsumed = nutrition?.calories_consumed || 0;
  const caloriesTarget = nutrition?.calories_target || 2140;
  const caloriesPct = Math.min(100, Math.round((caloriesConsumed / Math.max(caloriesTarget, 1)) * 100));
  const caloriesLeft = Math.max(0, caloriesTarget - caloriesConsumed);

  const proteinConsumed = nutrition?.protein_consumed || 0;
  const proteinTarget = nutrition?.protein_target || 160;
  const proteinPct = Math.min(100, Math.round((proteinConsumed / Math.max(proteinTarget, 1)) * 100));

  const waterConsumedMl = nutrition?.water_consumed_ml || 0;
  const waterTargetMl = nutrition?.water_target_ml || 3000;
  const waterCups = Math.round(waterConsumedMl / 250);
  const waterTargetCups = Math.round(waterTargetMl / 250);
  const waterPct = Math.min(100, Math.round((waterConsumedMl / Math.max(waterTargetMl, 1)) * 100));

  const currentWeight = dailyLog?.weight_kg ?? stats?.journey?.current_weight ?? null;
  const userName = user?.full_name ? user.full_name.split(' ')[0] : (user?.username || 'Athlete');

  return (
    <div className={styles.page}>
      <h1 className={styles.srOnly}>Dashboard</h1>

      {/* 1. Executive Welcome & Command Header */}
      <div className={styles.heroBanner}>
        <div className={styles.heroLeft}>
          <div className={styles.heroBadges}>
            <span className={styles.dateBadge}>
              <Calendar size={13} /> {formattedDate}
            </span>
            {stats?.streak_days ? (
              <span className={styles.streakBadge}>
                <Flame size={13} className={styles.streakIcon} />
                {stats.streak_days} Day Streak
              </span>
            ) : null}
            {pacingData?.mode_label && (
              <span className={styles.programPill}>
                {pacingData.mode_label}
              </span>
            )}
          </div>
          <h2 className={styles.heroTitle}>
            {greeting}, {userName}
          </h2>
          <div className={styles.heroSubtitle}>
            Day {programDay} of {programLength} · {pacingData?.program_name || '60-Day Recomp & Shred'}
          </div>
        </div>

        <div className={styles.heroActions}>
          <button
            type="button"
            onClick={() => setIsQuickCheckInOpen(true)}
            className={styles.heroSecondaryBtn}
          >
            <Plus size={15} /> Quick Check-in
          </button>
          <Link href="/app/workouts/active" className={styles.heroPrimaryBtn}>
            <Dumbbell size={15} /> Launch Workout
          </Link>
        </div>
      </div>

      {/* 2. Right Path™ Status & Strategic Copilot Telemetry */}
      <RightPathCard
        pacing={pacingData}
        onOpenPlanSelector={() => setIsPlanModalOpen(true)}
      />

      {/* 3. Today's Command Center */}
      <div className={styles.todayGrid}>
        {/* Left: Today's Scheduled Workout Command */}
        <div className={styles.workoutCard}>
          <div>
            <div className={styles.workoutHeader}>
              <span className={styles.workoutEyebrow}>
                Today&apos;s Training Focus
              </span>
              <span
                className={`${styles.workoutStatusPill} ${
                  isWorkoutCompleted
                    ? styles.statusCompleted
                    : isRestDay
                    ? styles.statusRest
                    : styles.statusUpcoming
                }`}
              >
                {isWorkoutCompleted ? (
                  <>
                    <CheckCircle2 size={12} /> Completed
                  </>
                ) : isRestDay ? (
                  'Active Recovery'
                ) : (
                  'Ready To Start'
                )}
              </span>
            </div>

            <h3 className={styles.workoutName}>{workoutName}</h3>

            <div className={styles.workoutMetaRow}>
              {!isRestDay ? (
                <>
                  <span className={styles.workoutMetaItem}>
                    <Dumbbell size={14} /> {exerciseCount} Exercises
                  </span>
                  <span>·</span>
                  <span className={styles.workoutMetaItem}>
                    <Clock size={14} /> ~45-60 min
                  </span>
                  <span>·</span>
                  <span className={styles.workoutMetaItem}>
                    <Target size={14} /> Compound Anchors
                  </span>
                </>
              ) : (
                <span className={styles.workoutMetaItem}>
                  <Moon size={14} /> Prioritize sleep, tissue repair, and hydration
                </span>
              )}
            </div>

            {/* Exercise Preview Chips */}
            {routine?.exercises && routine.exercises.length > 0 && (
              <div className={styles.exercisePillsList}>
                {routine.exercises.slice(0, 4).map((ex) => (
                  <span key={ex.id || ex.exercise_name} className={styles.exercisePill}>
                    {ex.exercise_name}
                  </span>
                ))}
                {routine.exercises.length > 4 && (
                  <span className={styles.exercisePillMore}>
                    +{routine.exercises.length - 4} more
                  </span>
                )}
              </div>
            )}
          </div>

          <div className={styles.workoutFooter}>
            <Link
              href={isWorkoutCompleted ? '/app/workouts' : '/app/workouts/active'}
              className={styles.workoutLaunchBtn}
            >
              {isWorkoutCompleted ? 'Review Session' : 'Start Workout Session'} <ArrowRight size={15} />
            </Link>
            <Link href="/app/workouts/routines" className={styles.workoutRoutineLink}>
              View Split Routines
            </Link>
          </div>
        </div>

        {/* Right: Today's Fuel & Habit Biometrics Hub */}
        <div className={styles.fuelCard}>
          <div className={styles.fuelHeader}>
            <span className={styles.fuelEyebrow}>Today&apos;s Fuel &amp; Biomarkers</span>
            <Link href="/app/nutrition" className={styles.fuelActionLink}>
              Open Nutrition <ArrowRight size={13} />
            </Link>
          </div>

          <div className={styles.fuelTilesGrid}>
            {/* Calories Tile */}
            <div className={styles.fuelTile}>
              <div className={styles.fuelTileTop}>
                <span className={styles.fuelTileLabel}>
                  <Flame size={13} className={styles.tileIcon} /> Calories
                </span>
                <span className={styles.fuelSubtext}>{caloriesLeft} kcal left</span>
              </div>
              <div className={styles.fuelTileVal}>
                {num(caloriesConsumed)} / {num(caloriesTarget)}
              </div>
              <div className={styles.fuelProgressTrack}>
                <div
                  className={styles.fuelProgressFill}
                  style={{ width: `${caloriesPct}%` }}
                />
              </div>
            </div>

            {/* Protein Tile */}
            <div className={styles.fuelTile}>
              <div className={styles.fuelTileTop}>
                <span className={styles.fuelTileLabel}>
                  <Target size={13} className={styles.tileIcon} /> Protein
                </span>
                <span className={styles.fuelSubtext}>{proteinPct}%</span>
              </div>
              <div className={styles.fuelTileVal}>
                {num(proteinConsumed)} / {num(proteinTarget)} g
              </div>
              <div className={styles.fuelProgressTrack}>
                <div
                  className={styles.fuelProgressFill}
                  style={{ width: `${proteinPct}%` }}
                />
              </div>
            </div>

            {/* Hydration Tile with 1-click +1 cup button */}
            <div className={styles.fuelTile}>
              <div className={styles.fuelTileTop}>
                <span className={styles.fuelTileLabel}>
                  <Droplets size={13} className={styles.tileIcon} /> Water
                </span>
                <span className={styles.fuelSubtext}>{waterCups} / {waterTargetCups} cups</span>
              </div>
              <div className={styles.fuelTileVal}>
                {waterConsumedMl} / {waterTargetMl} ml
              </div>
              <div className={styles.waterTileActionRow}>
                <div className={styles.fuelProgressTrack} style={{ flex: 1 }}>
                  <div
                    className={styles.fuelProgressFill}
                    style={{ width: `${waterPct}%` }}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleQuickAddWater}
                  disabled={addingWater}
                  className={styles.waterQuickAddBtn}
                  title="Add 1 cup (250ml)"
                >
                  <Plus size={11} /> 1 Cup
                </button>
              </div>
            </div>

            {/* Fasted Weight & Lifestyle Tile */}
            <div className={styles.fuelTile}>
              <div className={styles.fuelTileTop}>
                <span className={styles.fuelTileLabel}>
                  <Scale size={13} className={styles.tileIcon} /> Scale Weight
                </span>
                <button
                  type="button"
                  onClick={() => setIsQuickCheckInOpen(true)}
                  className={styles.weightQuickLogBtn}
                  title="Log morning weight"
                >
                  <Plus size={11} /> Log
                </button>
              </div>
              <div className={styles.fuelTileVal}>
                {currentWeight != null ? `${currentWeight} kg` : 'Fasted: --'}
              </div>
              <div className={styles.fuelSubtext}>
                {dailyLog?.steps ? `${num(dailyLog.steps)} steps` : 'Steps not logged yet'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Strategic Focus Cue */}
      {stats?.weekly_health?.focus && (
        <div className={styles.focusStrip}>
          <Compass size={18} className={styles.focusIcon} />
          <div className={styles.focusBody}>
            <span className={styles.focusTag}>Weekly Strategic Protocol:</span>
            <span className={styles.focusMessage}>{stats.weekly_health.focus}</span>
          </div>
        </div>
      )}

      {/* 4. Weekly Health & Consistency Matrix */}
      <WeeklyHealthStrip health={stats?.weekly_health} />

      {/* 5. Performance Trends & Strength Progression */}
      <section className={styles.trends}>
        <DashboardCharts
          trends={stats?.trends}
          targetWeight={
            pacingData?.target_weight ||
            pacingData?.velocity?.expected_final_weight ||
            journey.target_weight ||
            74.0
          }
          dailyCaloriesTarget={nutrition?.calories_target ? Number(nutrition.calories_target) : undefined}
          weeklyCaloriesBurnedTarget={stats?.adherence?.calories_burned?.target}
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
                  <TrendingUp size={14} className={styles.sectionIcon} />
                </div>
                <div className={styles.anchorValue}>
                  {lift.max_weight_kg} kg &times; {lift.reps}
                </div>
                <div className={styles.anchorNote}>Est. 1RM {Math.round(lift.estimated_1rm)} kg</div>
              </Card>
            ))}
            {!anchorLifts.length && (
              <div className={styles.emptyState}>
                <div className={styles.emptyStateIcon}>
                  <Dumbbell size={22} />
                </div>
                <div className={styles.emptyStateTitle}>Compound Anchors Initializing</div>
                <p className={styles.emptyStateMessage}>
                  Complete your Day 1 workout session to lock in baseline 1RM estimates and strength progression curves.
                </p>
                <Link href="/app/workouts/active" className={styles.emptyStateAction}>
                  Launch Session <ArrowRight size={14} />
                </Link>
              </div>
            )}
          </div>
        </Card>
      </section>

      {/* Modals */}
      <PlanSelectorModal
        isOpen={isPlanModalOpen}
        dismissible={true}
        onClose={() => {
          setIsPlanModalOpen(false);
        }}
        onSuccess={() => {
          loadData();
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('fitlog:journey-updated'));
          }
        }}
        initialWeight={
          pacingData?.velocity?.rolling_7_avg ||
          Number(journey.current_weight) ||
          pacingData?.velocity?.start_weight ||
          75.0
        }
      />

      <QuickCheckInModal
        isOpen={isQuickCheckInOpen}
        onClose={() => setIsQuickCheckInOpen(false)}
        onSuccess={() => {
          loadData();
        }}
        initialWeight={currentWeight}
        initialWaterMl={nutrition?.water_consumed_ml}
        initialSteps={dailyLog?.steps}
        initialSleepHours={dailyLog?.sleep_hours}
        initialSleepQuality={dailyLog?.sleep_quality}
        initialEnergy={dailyLog?.energy_level}
      />
    </div>
  );
}
