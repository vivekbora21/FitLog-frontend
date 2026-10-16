'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Flame,
  Dumbbell,
  Wheat,
  Droplets,
  Check,
  ChevronRight,
  ArrowRight,
  Utensils,
  Plus,
  Apple,
  Soup,
  Zap,
  FileText,
  Clock,
  Sparkles,
  RotateCcw,
  ChevronLeft,
  Calendar,
} from 'lucide-react';
import { api } from '@/lib/api';
import { NutritionDayResponse } from '@/lib/types';
import { useDomainEvent } from '@/lib/events';
import { Modal } from '@/components/ui/Modal';
import styles from './today.module.css';

interface ExerciseItem {
  id?: string;
  num: number;
  name: string;
  details: string;
  completed: boolean;
  muscle?: string;
  notes?: string;
  setsData?: Array<{ set_number: number; weight_kg: number; reps: number; completed: boolean }>;
}

interface RoutineExerciseRaw {
  id?: string;
  target_sets?: number;
  suggested_weight_kg?: number;
  target_reps?: string;
  exercise_name?: string;
  notes?: string;
  primary_muscle?: string;
  progression?: {
    note?: string;
    action?: string;
    recommended_weight_kg?: number;
  };
  exercise?: {
    id?: string;
    name?: string;
    primary_muscle?: {
      name?: string;
    };
    instructions?: string;
  };
}

interface CompletedExerciseRaw {
  id?: string;
  exercise_name?: string;
  primary_muscle?: string;
  notes?: string;
  exercise?: {
    id?: string;
    name?: string;
    primary_muscle?: {
      name?: string;
    };
    instructions?: string;
  };
  sets?: Array<{
    id?: string;
    set_number: number;
    weight_kg: number | string;
    reps: number;
    completed?: boolean;
    is_completed?: boolean;
  }>;
}

interface PlanDayItem {
  id: string;
  day_number: number;
  calendar_date?: string;
  label?: string;
  status: string;
  completed_session_id?: string | null;
}

function parseLocalNoon(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

function formatIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getShortTrainingFocus(label?: string): string {
  if (!label) return '';
  const lower = label.toLowerCase();
  if (lower.includes('rest')) return 'Rest';
  if (lower.includes('chest') || lower.includes('push')) return 'Push';
  if (lower.includes('back') || lower.includes('pull')) return 'Pull';
  if (lower.includes('leg') || lower.includes('quad')) return 'Legs';
  if (lower.includes('shoulder')) return 'Shoulders';
  if (lower.includes('upper')) return 'Upper';
  if (lower.includes('full body') || lower.includes('pump')) return 'Full Body';
  if (lower.includes('arm')) return 'Arms';
  return '';
}

function formatHumanDate(dateStr: string): string {
  try {
    const d = parseLocalNoon(dateStr);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function TodayContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Current real date (e.g. 2026-10-16)
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Selected date from URL query param, default to today
  const dateParam = searchParams.get('date');
  const targetDateStr = useMemo(() => {
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      return dateParam;
    }
    return todayStr;
  }, [dateParam, todayStr]);

  const isPastDate = targetDateStr < todayStr;
  const isViewingDifferentDate = targetDateStr !== todayStr;

  // Data states (100% Real from Django backend)
  const [journeyData, setJourneyData] = useState<Record<string, unknown> | null>(null);
  const [todaysWorkout, setTodaysWorkout] = useState<Record<string, unknown> | null>(null);
  const [nutritionData, setNutritionData] = useState<NutritionDayResponse | null>(null);
  const [planData, setPlanData] = useState<{ program?: Record<string, unknown>; days?: PlanDayItem[] } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Reactive cross-view synchronization
  useDomainEvent('workout-completed', () => setReloadKey((k) => k + 1));
  useDomainEvent('workout-deleted', () => setReloadKey((k) => k + 1));
  useDomainEvent('nutrition-updated', () => setReloadKey((k) => k + 1));
  useDomainEvent('measurement-updated', () => setReloadKey((k) => k + 1));
  useDomainEvent('plan-updated', () => setReloadKey((k) => k + 1));

  // Modals state
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseItem | null>(null);
  const [isLogFoodOpen, setIsLogFoodOpen] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<string>('DINNER');
  const [isLogWaterOpen, setIsLogWaterOpen] = useState(false);
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);

  // Form states for modals
  const [foodName, setFoodName] = useState('');
  const [foodCalories, setFoodCalories] = useState('');
  const [foodProtein, setFoodProtein] = useState('');
  const [foodCarbs, setFoodCarbs] = useState('');
  const [foodFat, setFoodFat] = useState('');
  const [waterCustomMl, setWaterCustomMl] = useState('');
  const [noteContent, setNoteContent] = useState('');

  // Daily checklist interactive overrides keyed by date (no effect setState needed)
  const [checklistOverrides, setChecklistOverrides] = useState<Record<string, Record<string, boolean>>>({});
  const dateOverrides = useMemo(() => checklistOverrides[targetDateStr] || {}, [checklistOverrides, targetDateStr]);

  // Load all real backend data for selected date
  useEffect(() => {
    let isMounted = true;

    async function fetchData() {
      try {
        const [journeyRes, workoutRes, nutritionRes, dailyRes, planRes] = await Promise.all([
          api.getJourneyPacingStatus().catch(() => null),
          api.getTodaysWorkout(targetDateStr).catch(() => null),
          api.getNutrition(targetDateStr).catch(() => null),
          api.getDailyLogForDate(targetDateStr).catch(() => null),
          api.getWorkoutPlan().catch(() => null),
        ]);

        if (!isMounted) return;
        if (journeyRes) setJourneyData(journeyRes);
        if (workoutRes) setTodaysWorkout(workoutRes);
        if (nutritionRes) setNutritionData(nutritionRes);
        if (planRes) setPlanData(planRes);

        if (dailyRes?.recovery_notes) {
          setNoteContent(dailyRes.recovery_notes);
        } else {
          setNoteContent('');
        }
      } catch (err) {
        console.error('Failed to load day data:', err);
      }
    }

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [targetDateStr, reloadKey]);

  // Derive Program Day information
  const todayRaw = (todaysWorkout?.today as Record<string, unknown> | undefined) || null;
  const programMeta = (todaysWorkout?.program as Record<string, unknown> | undefined) || null;

  const currentDay = (todayRaw?.day_number as number) || (journeyData?.current_day as number) || 1;
  const totalDays = (programMeta?.duration_days as number) || (journeyData?.duration_days as number) || 60;
  const progressPct = totalDays > 0 ? Math.min(100, Math.round((currentDay / totalDays) * 100)) : 0;
  const daysLeft = Math.max(0, totalDays - currentDay);

  // Status and completion of this day's workout
  const dayStatus = ((todayRaw?.status as string) || 'UPCOMING').toUpperCase();
  const completedSession = (todayRaw?.completed_session as Record<string, unknown> | undefined) || null;
  const hasCompletedSession = Boolean(todayRaw?.completed_session_id || completedSession);
  const isWorkoutCompleted = dayStatus === 'COMPLETED' || hasCompletedSession;

  // Determine if this day is a designated rest day
  const programStartDate = (programMeta?.start_date as string | undefined);
  const isPreStart = Boolean(
    (todaysWorkout as any)?.is_pre_start ||
    (programStartDate && programStartDate > (targetDateStr || new Date().toISOString().split('T')[0]))
  );
  const daysUntilStart = (todaysWorkout as any)?.days_until_start ?? 0;

  const isRestDay = useMemo(() => {
    if (isPreStart) return false;
    if (dayStatus === 'REST') return true;
    const label = ((todayRaw?.label as string) || '').toLowerCase();
    if (label.includes('rest')) return true;
    const routineDetails = todayRaw?.routine_details as Record<string, unknown> | undefined;
    if (!routineDetails && !completedSession && dayStatus !== 'COMPLETED') return false;
    return false;
  }, [dayStatus, todayRaw, completedSession]);

  // Workout Title
  const workoutTitle = useMemo(() => {
    if (isPreStart) {
      return `Plan Starts in ${daysUntilStart} Day${daysUntilStart === 1 ? '' : 's'}`;
    }
    if (todayRaw?.completed_session_title) {
      return String(todayRaw.completed_session_title);
    }
    if (completedSession?.title) {
      return String(completedSession.title);
    }
    if (todayRaw?.label) {
      return String(todayRaw.label);
    }
    const routine = todayRaw?.routine_details as Record<string, unknown> | undefined;
    if (routine?.name) {
      return String(routine.name);
    }
    if (isRestDay) {
      return 'Rest & Active Recovery';
    }
    return `Day ${currentDay} Workout`;
  }, [todayRaw, completedSession, isRestDay, currentDay]);

  // Extract Real Completed / Routine Exercises
  const exercises: ExerciseItem[] = useMemo(() => {
    // 1. If a completed session exists, show real completed exercises and sets
    const csExercises = (completedSession?.exercises as CompletedExerciseRaw[] | undefined) || [];
    if (csExercises.length > 0) {
      return csExercises.map((ex, idx) => {
        const sets = ex.sets || [];
        const completedSets = sets.filter((s) => s.completed !== false && s.is_completed !== false);
        const weight = sets[0]?.weight_kg ? `${Number(sets[0].weight_kg)} kg` : null;
        const repsSummary = sets.map((s) => s.reps).filter(Boolean).join('/');

        let detailsStr = `${completedSets.length || sets.length} sets`;
        if (weight) detailsStr += ` • ${weight}`;
        if (repsSummary) detailsStr += ` • ${repsSummary} reps`;

        const muscleName =
          ex.exercise?.primary_muscle?.name || ex.primary_muscle || 'Full Body';

        return {
          id: ex.id || String(idx),
          num: idx + 1,
          name: ex.exercise_name || ex.exercise?.name || `Exercise ${idx + 1}`,
          details: detailsStr,
          completed: true,
          muscle: muscleName,
          notes: ex.notes || ex.exercise?.instructions || 'Performed as prescribed.',
          setsData: sets.map((s) => ({
            set_number: s.set_number,
            weight_kg: Number(s.weight_kg) || 0,
            reps: s.reps || 0,
            completed: s.completed !== false && s.is_completed !== false,
          })),
        };
      });
    }

    // 2. If upcoming or unlogged scheduled workout, show routine exercises
    const routine = todayRaw?.routine_details as { exercises?: RoutineExerciseRaw[] } | undefined;
    if (routine?.exercises && routine.exercises.length > 0) {
      return routine.exercises.map((item, idx) => {
        const targetSets = item.target_sets || 3;
        const weightStr = item.suggested_weight_kg ? `${item.suggested_weight_kg} kg • ` : '';
        const repsStr = item.target_reps || '10-12 reps';
        const muscleName =
          item.primary_muscle || item.exercise?.primary_muscle?.name || 'Strength';

        return {
          id: item.exercise?.id || item.id || String(idx),
          num: idx + 1,
          name: item.exercise_name || item.exercise?.name || `Exercise ${idx + 1}`,
          details: `${targetSets} sets • ${weightStr}${repsStr}`,
          completed: isWorkoutCompleted,
          muscle: muscleName,
          notes:
            item.notes ||
            item.progression?.note ||
            item.exercise?.instructions ||
            'Focus on controlled tempo and clean execution.',
        };
      });
    }

    // 3. Fallback to workout_payload for guided plans
    const wp = (todayRaw as any)?.workout_payload;
    const rawPayloadList = Array.isArray(wp) ? wp : wp?.exercises;
    if (Array.isArray(rawPayloadList) && rawPayloadList.length > 0) {
      return rawPayloadList.map((item: any, idx: number) => {
        const targetSets = item.sets || item.target_sets || 3;
        const weightStr = item.suggested_weight_kg ? `${item.suggested_weight_kg} kg • ` : '';
        const repsStr = item.reps || item.target_reps || '8-12 reps';
        const muscleName = item.primary_muscle || 'Strength';

        return {
          id: item.id || String(idx),
          num: idx + 1,
          name: item.exercise_name || item.name || `Exercise ${idx + 1}`,
          details: `${targetSets} sets • ${weightStr}${repsStr}`,
          completed: isWorkoutCompleted,
          muscle: muscleName,
          notes: item.notes || item.progression_rule || 'Focus on controlled tempo and clean execution.',
        };
      });
    }

    return [];
  }, [completedSession, todayRaw, isWorkoutCompleted]);

  // Workout Summary Stats (Duration, Sets, Volume)
  const durationSec =
    (todayRaw?.completed_duration_seconds as number) ||
    (completedSession?.duration_seconds as number) ||
    0;
  const durationMin = durationSec > 0 ? Math.round(durationSec / 60) : 0;

  const totalVolumeKg =
    (todayRaw?.completed_volume_kg as number) ||
    (completedSession?.total_volume_kg as number) ||
    0;

  const totalSetsCount = useMemo(() => {
    if (exercises.length === 0) return 0;
    return exercises.reduce((acc, ex) => {
      if (ex.setsData && ex.setsData.length > 0) return acc + ex.setsData.length;
      const match = ex.details.match(/^(\d+)\s+sets/i);
      return acc + (match ? parseInt(match[1], 10) : 3);
    }, 0);
  }, [exercises]);

  const estimatedCaloriesBurned = useMemo(() => {
    if (completedSession?.total_calories) {
      return Number(completedSession.total_calories);
    }
    if (durationMin > 0) {
      return Math.round(durationMin * 6.5);
    }
    return 0;
  }, [completedSession, durationMin]);

  // Real Nutrition & Macros
  const day = nutritionData?.day;
  const targets = nutritionData?.targets;

  const calConsumed = day?.total_calories != null ? Math.round(day.total_calories) : 0;
  const calTarget = targets?.daily_calories != null ? Math.round(targets.daily_calories) : 2160;
  const calLeft = Math.max(0, calTarget - calConsumed);
  const calPct = calTarget > 0 ? Math.min(100, Math.round((calConsumed / calTarget) * 100)) : 0;

  const proConsumed = day?.total_protein != null ? Math.round(day.total_protein) : 0;
  const proTarget = targets?.protein_g != null ? Math.round(targets.protein_g) : 165;
  const proPct = proTarget > 0 ? Math.min(100, Math.round((proConsumed / proTarget) * 100)) : 0;

  const carbConsumed = day?.total_carbs != null ? Math.round(day.total_carbs) : 0;
  const carbTarget = targets?.carbs_g != null ? Math.round(targets.carbs_g) : 264;
  const carbPct = carbTarget > 0 ? Math.min(100, Math.round((carbConsumed / carbTarget) * 100)) : 0;

  const fatConsumed = day?.total_fat != null ? Math.round(day.total_fat) : 0;
  const fatTarget = targets?.fat_g != null ? Math.round(targets.fat_g) : 43;
  const fatPct = fatTarget > 0 ? Math.min(100, Math.round((fatConsumed / fatTarget) * 100)) : 0;

  // Donut SVG calculations
  const donutRadius = 45;
  const circumference = 2 * Math.PI * donutRadius;
  const donutOffset = circumference - (circumference * Math.min(100, calPct)) / 100;

  // Meals data mapping: 100% Real from day.meals
  const mealsMap = useMemo(() => {
    const map: Record<string, { calories: number; logged: boolean; count: number }> = {
      BREAKFAST: { calories: 0, logged: false, count: 0 },
      LUNCH: { calories: 0, logged: false, count: 0 },
      DINNER: { calories: 0, logged: false, count: 0 },
      SNACK: { calories: 0, logged: false, count: 0 },
    };

    const rawMeals = day?.meals;
    if (rawMeals && Array.isArray(rawMeals) && rawMeals.length > 0) {
      rawMeals.forEach((m) => {
        const type = (m.meal_type || 'SNACK').toUpperCase();
        if (map[type]) {
          map[type].calories += Math.round(Number(m.calories) || 0);
          map[type].logged = true;
          map[type].count += 1;
        }
      });
    }

    return map;
  }, [day]);

  // Dynamic daily checklist derived directly from real database values with optional user toggle
  const checklist = useMemo(() => {
    const hasWaterGoal = (day?.water_consumed_ml ?? 0) >= (targets?.water_ml ?? 3500);
    return {
      breakfast: dateOverrides.breakfast ?? mealsMap.BREAKFAST.logged,
      lunch: dateOverrides.lunch ?? mealsMap.LUNCH.logged,
      dinner: dateOverrides.dinner ?? mealsMap.DINNER.logged,
      snacks: dateOverrides.snacks ?? mealsMap.SNACK.logged,
      water: dateOverrides.water ?? hasWaterGoal,
      workout: dateOverrides.workout ?? isWorkoutCompleted,
    };
  }, [dateOverrides, mealsMap, day, targets, isWorkoutCompleted]);

  const completedChecklistCount = useMemo(() => {
    return Object.values(checklist).filter(Boolean).length;
  }, [checklist]);

  const checklistPct = Math.round((completedChecklistCount / 6) * 100);

  const toggleChecklist = (key: string) => {
    setChecklistOverrides((prev) => ({
      ...prev,
      [targetDateStr]: {
        ...(prev[targetDateStr] || {}),
        [key]: !checklist[key as keyof typeof checklist],
      },
    }));
  };

  // Fast lookup map of plan days by calendar_date
  const planDaysMap = useMemo(() => {
    const map: Record<string, PlanDayItem> = {};
    if (planData?.days) {
      planData.days.forEach((d) => {
        if (d.calendar_date) {
          map[d.calendar_date] = d;
        }
      });
    }
    return map;
  }, [planData]);

  // 7-Day Athletic Week Strip computation (Monday to Sunday) - Timezone-safe
  const { weekDays, weekNumber, formattedWeekRange, currentMondayIso } = useMemo(() => {
    const targetD = parseLocalNoon(targetDateStr);
    const dayOfWeek = targetD.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
    const diffToMonday = (dayOfWeek + 6) % 7;
    const monday = new Date(targetD);
    monday.setDate(targetD.getDate() - diffToMonday);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const cur = new Date(monday);
      cur.setDate(monday.getDate() + i);
      days.push({
        date: formatIso(cur),
        dayOfMonth: cur.getDate(),
        dayName: cur.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
      });
    }

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const startMonth = monday.toLocaleDateString('en-US', { month: 'short' });
    const endMonth = sunday.toLocaleDateString('en-US', { month: 'short' });
    const rangeStr =
      startMonth === endMonth
        ? `${startMonth} ${monday.getDate()} – ${sunday.getDate()}`
        : `${startMonth} ${monday.getDate()} – ${endMonth} ${sunday.getDate()}`;

    // Program week number
    const pStartDateStr = (programMeta?.start_date as string) || '2026-09-14';
    const pStart = parseLocalNoon(pStartDateStr);
    const diffDays = Math.floor((monday.getTime() - pStart.getTime()) / (1000 * 60 * 60 * 24));
    const weekNum = Math.max(1, Math.floor(diffDays / 7) + 1);

    return {
      weekDays: days,
      weekNumber: weekNum,
      formattedWeekRange: rangeStr,
      currentMondayIso: formatIso(monday),
    };
  }, [targetDateStr, programMeta]);

  const handlePrevWeek = () => {
    const mon = parseLocalNoon(currentMondayIso);
    mon.setDate(mon.getDate() - 7);
    router.push(`/app/today?date=${formatIso(mon)}`);
  };

  const handleNextWeek = () => {
    const mon = parseLocalNoon(currentMondayIso);
    mon.setDate(mon.getDate() + 7);
    router.push(`/app/today?date=${formatIso(mon)}`);
  };

  // Handle Save Meal Log
  const handleSaveMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    const cals = parseInt(foodCalories, 10) || 0;
    if (cals <= 0) return;

    try {
      await api.addMeal({
        meal_type: selectedMealType,
        name: foodName || `${selectedMealType} Log`,
        calories: cals,
        protein_g: parseFloat(foodProtein) || 0,
        carbs_g: parseFloat(foodCarbs) || 0,
        fat_g: parseFloat(foodFat) || 0,
        date: targetDateStr,
      });

      setIsLogFoodOpen(false);
      setFoodName('');
      setFoodCalories('');
      setFoodProtein('');
      setFoodCarbs('');
      setFoodFat('');

      setReloadKey((k) => k + 1);
    } catch (err) {
      console.error('Failed to log meal:', err);
    }
  };

  // Handle Water Quick Add
  const handleAddWater = async (amountMl: number) => {
    try {
      const currentWater = day?.water_consumed_ml || 0;
      const updated = currentWater + amountMl;
      await api.updateWater(targetDateStr, updated);
      setIsLogWaterOpen(false);
      setReloadKey((k) => k + 1);
    } catch (err) {
      console.error('Failed to update water:', err);
    }
  };

  // Handle Save Note
  const handleSaveNote = async () => {
    try {
      await api.logDaily({
        date: targetDateStr,
        recovery_notes: noteContent,
      });
      setIsAddNoteOpen(false);
      setReloadKey((k) => k + 1);
    } catch (err) {
      console.error('Failed to save daily note:', err);
    }
  };

  return (
    <div className={styles.container}>
      {/* ----------------------------------------------------------- */}
      {/* PAST DAY NOTIFICATION BANNER                                */}
      {/* ----------------------------------------------------------- */}
      {isViewingDifferentDate && (
        <aside className={styles.pastDayBanner} aria-label="Past Day Log Navigation">
          <div className={styles.pastDayBannerLeft}>
            <span className={styles.pastDayTag}>
              {isPastDate ? 'Historical Log' : 'Future Scheduled'}
            </span>
            <span>
              Viewing log for <strong>{formatHumanDate(targetDateStr)}</strong>
              {todayRaw?.label ? ` — ${todayRaw.label}` : ` (Day ${currentDay})`}
            </span>
          </div>
          <button
            type="button"
            onClick={() => router.push('/app/today')}
            className={styles.returnTodayBtn}
          >
            <span>Return to Today</span>
            <RotateCcw size={14} />
          </button>
        </aside>
      )}

      {/* ----------------------------------------------------------- */}
      {/* 7-DAY ATHLETIC WEEK CALENDAR STRIP (MON - SUN)              */}
      {/* ----------------------------------------------------------- */}
      <section className={styles.weekStripCard} aria-label="7-Day Athletic Week Calendar">
        <div className={styles.weekStripHeader}>
          <div className={styles.weekTitleInfo}>
            <span className={styles.weekBadge}>WEEK {weekNumber}</span>
            <span className={styles.weekRangeText}>{formattedWeekRange}</span>
          </div>

          <div className={styles.weekNavGroup}>
            <button
              type="button"
              onClick={handlePrevWeek}
              className={styles.weekNavBtn}
              title="Previous Week"
            >
              <ChevronLeft size={15} />
              <span>Prev Week</span>
            </button>

            {isViewingDifferentDate && (
              <button
                type="button"
                onClick={() => router.push('/app/today')}
                className={styles.weekJumpTodayBtn}
                title="Jump to Today"
              >
                <RotateCcw size={13} />
                <span>Today</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNextWeek}
              className={styles.weekNavBtn}
              title="Next Week"
            >
              <span>Next Week</span>
              <ChevronRight size={15} />
            </button>
          </div>
        </div>

        <div className={styles.weekDaysGrid}>
          {weekDays.map((wd) => {
            const planDay = planDaysMap[wd.date];
            const isCompleted = planDay?.status === 'COMPLETED' || Boolean(planDay?.completed_session_id);
            const isRest =
              planDay?.status === 'REST' || (planDay?.label && planDay.label.toLowerCase().includes('rest'));
            const isSelected = wd.date === targetDateStr;
            const isToday = wd.date === todayStr;
            const shortFocus = getShortTrainingFocus(planDay?.label);

            return (
              <div
                key={wd.date}
                onClick={() => router.push(`/app/today?date=${wd.date}`)}
                className={`${styles.weekDayCard} ${isSelected ? styles.weekDayCardActive : ''}`}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    router.push(`/app/today?date=${wd.date}`);
                  }
                }}
                title={`${wd.dayName}, ${wd.date} — ${planDay?.label || (isRest ? 'Rest Day' : 'Scheduled')}`}
              >
                {isToday && <span className={styles.todayIndicatorDot} title="Today" />}
                <span className={styles.dayCardName}>{wd.dayName}</span>
                <span className={styles.dayCardNumber}>{wd.dayOfMonth}</span>

                <div className={styles.dayCardStatus}>
                  {isCompleted ? (
                    <span className={styles.statusBadgeCompleted} title="Completed Workout">
                      <Check size={10} strokeWidth={3} />
                      <span>Done</span>
                    </span>
                  ) : isRest ? (
                    <span className={styles.statusBadgeRest} title="Rest & Active Recovery">
                      REST
                    </span>
                  ) : shortFocus ? (
                    <span className={styles.statusBadgeFocus} title={planDay?.label || 'Scheduled Workout'}>
                      {shortFocus}
                    </span>
                  ) : planDay?.day_number ? (
                    <span className={styles.statusBadgeFocus}>D{planDay.day_number}</span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ----------------------------------------------------------- */}
      {/* 1. TOP STATS ROW                                            */}
      {/* ----------------------------------------------------------- */}
      <section className={styles.statsRow} aria-label="Daily Overview Metrics">
        {/* Journey Progress Card */}
        <div className={styles.journeyCard}>
          <div>
            <h2 className={styles.journeyTitle}>
              Day {currentDay} of {totalDays}
            </h2>
            <div className={styles.journeyProgressRow}>
              <div className={styles.progressBarTrack}>
                <div
                  className={styles.progressBarFillTeal}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className={styles.journeyPctText}>{progressPct}%</span>
            </div>
          </div>
          <p className={styles.journeySubtext}>
            {daysLeft > 0 ? `${daysLeft} days left • Consistent progress!` : 'Program completed!'}
          </p>
        </div>

        {/* Calories Card */}
        <div className={styles.statCard}>
          <div className={styles.macroHeader}>
            <div className={`${styles.iconCircle} ${styles.iconCalories}`}>
              <Flame size={18} strokeWidth={2.4} />
            </div>
            <div className={styles.macroMeta}>
              <div className={styles.macroValues}>
                <span className={styles.macroCurrent}>{calConsumed.toLocaleString()}</span>
                <span className={styles.macroTarget}>/ {calTarget.toLocaleString()}</span>
              </div>
              <span className={styles.macroLabel}>Calories</span>
            </div>
          </div>
          <div className={styles.progressBarTrack}>
            <div
              className={styles.macroBarFillCalories}
              style={{ width: `${calPct}%` }}
            />
          </div>
        </div>

        {/* Protein Card */}
        <div className={styles.statCard}>
          <div className={styles.macroHeader}>
            <div className={`${styles.iconCircle} ${styles.iconProtein}`}>
              <Dumbbell size={18} strokeWidth={2.4} />
            </div>
            <div className={styles.macroMeta}>
              <div className={styles.macroValues}>
                <span className={styles.macroCurrent}>{proConsumed}</span>
                <span className={styles.macroTarget}>/ {proTarget} g</span>
              </div>
              <span className={styles.macroLabel}>Protein</span>
            </div>
          </div>
          <div className={styles.progressBarTrack}>
            <div
              className={styles.macroBarFillProtein}
              style={{ width: `${proPct}%` }}
            />
          </div>
        </div>

        {/* Carbs Card */}
        <div className={styles.statCard}>
          <div className={styles.macroHeader}>
            <div className={`${styles.iconCircle} ${styles.iconCarbs}`}>
              <Wheat size={18} strokeWidth={2.4} />
            </div>
            <div className={styles.macroMeta}>
              <div className={styles.macroValues}>
                <span className={styles.macroCurrent}>{carbConsumed}</span>
                <span className={styles.macroTarget}>/ {carbTarget} g</span>
              </div>
              <span className={styles.macroLabel}>Carbs</span>
            </div>
          </div>
          <div className={styles.progressBarTrack}>
            <div
              className={styles.macroBarFillCarbs}
              style={{ width: `${carbPct}%` }}
            />
          </div>
        </div>

        {/* Fat Card */}
        <div className={styles.statCard}>
          <div className={styles.macroHeader}>
            <div className={`${styles.iconCircle} ${styles.iconFat}`}>
              <Droplets size={18} strokeWidth={2.4} />
            </div>
            <div className={styles.macroMeta}>
              <div className={styles.macroValues}>
                <span className={styles.macroCurrent}>{fatConsumed}</span>
                <span className={styles.macroTarget}>/ {fatTarget} g</span>
              </div>
              <span className={styles.macroLabel}>Fat</span>
            </div>
          </div>
          <div className={styles.progressBarTrack}>
            <div
              className={styles.macroBarFillFat}
              style={{ width: `${fatPct}%` }}
            />
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- */}
      {/* 2. MAIN 2-COLUMN GRID (FULL WIDTH)                          */}
      {/* ----------------------------------------------------------- */}
      <section className={styles.mainGrid}>
        {/* LEFT COLUMN: WORKOUT CARD */}
        <div className={styles.leftColumn}>
          {/* Section Header */}
          <div className={styles.sectionHeaderRow}>
            <div className={styles.sectionTitleGroup}>
              <div className={styles.dumbbellIconWrap}>
                <Dumbbell size={16} strokeWidth={2.5} />
              </div>
              <h3 className={styles.sectionTitle}>
                {isViewingDifferentDate ? `${formatHumanDate(targetDateStr)} Workout` : "Today's Workout"}
              </h3>
              {isPreStart ? (
                <span className={styles.statusTagUpcoming} style={{ background: '#0284C7' }}>
                  Starts {programStartDate}
                </span>
              ) : isWorkoutCompleted ? (
                <span className={styles.statusTagCompleted}>Completed</span>
              ) : isRestDay ? (
                <span className={styles.statusTagRest}>Rest Day</span>
              ) : (
                <span className={styles.statusTagUpcoming}>Scheduled</span>
              )}
            </div>

            {exercises.length > 0 && (
              <button
                type="button"
                onClick={() => setIsSummaryModalOpen(true)}
                className={styles.viewDetailsLink}
              >
                <span>View Details</span>
                <ChevronRight size={14} />
              </button>
            )}
          </div>

          {/* Workout Card */}
          <div className={styles.workoutCard}>
            {/* Workout Hero Top */}
            <div className={styles.workoutCardTop}>
              <div className={styles.workoutHeroLeft}>
                {isWorkoutCompleted ? (
                  <div className={styles.heroCheckCircle}>
                    <Check size={20} strokeWidth={3} />
                  </div>
                ) : isRestDay ? (
                  <div className={styles.heroRestCircle}>
                    <Sparkles size={20} strokeWidth={2.5} />
                  </div>
                ) : (
                  <div className={styles.heroRestCircle} style={{ background: '#2563EB' }}>
                    <Dumbbell size={20} strokeWidth={2.5} />
                  </div>
                )}
                <div className={styles.workoutHeroInfo}>
                  <h4 className={styles.workoutHeroTitle}>{workoutTitle}</h4>
                  <div className={styles.workoutHeroMeta}>
                    {isPreStart ? (
                      <span>Plan begins in {daysUntilStart} day{daysUntilStart === 1 ? '' : 's'} • Rest & prepare</span>
                    ) : isWorkoutCompleted ? (
                      <>
                        {durationMin > 0 && (
                          <>
                            <span>⏱ {durationMin} min</span>
                            <span>•</span>
                          </>
                        )}
                        <span>☵ {totalSetsCount} sets</span>
                        {totalVolumeKg > 0 && (
                          <>
                            <span>•</span>
                            <span>⚡ {totalVolumeKg.toLocaleString()} kg volume</span>
                          </>
                        )}
                        {estimatedCaloriesBurned > 0 && (
                          <>
                            <span>•</span>
                            <span>🔥 {estimatedCaloriesBurned} kcal</span>
                          </>
                        )}
                      </>
                    ) : isRestDay ? (
                      <span>Active recovery • Muscle protein synthesis & hydration focus</span>
                    ) : (
                      <>
                        <span>☵ {totalSetsCount} planned sets</span>
                        <span>•</span>
                        <span>⏱ Est. ~45-50 min</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {isPreStart ? (
                <Link href="/app/workouts/plan" className={styles.viewSummaryBtn} style={{ background: '#0284C7' }}>
                  <span>View Roadmap</span>
                  <ChevronRight size={15} />
                </Link>
              ) : isWorkoutCompleted ? (
                <button
                  type="button"
                  onClick={() => setIsSummaryModalOpen(true)}
                  className={styles.viewSummaryBtn}
                >
                  <span>View Summary</span>
                  <ArrowRight size={15} strokeWidth={2.5} />
                </button>
              ) : isRestDay ? (
                <Link href="/app/workouts" className={styles.viewSummaryBtn} style={{ background: '#7C3AED' }}>
                  <span>Workout Hub</span>
                  <ChevronRight size={15} />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => router.push('/app/workouts/active')}
                  className={styles.viewSummaryBtn}
                  style={{ background: '#2563EB' }}
                >
                  <span>Start Session</span>
                  <ArrowRight size={15} strokeWidth={2.5} />
                </button>
              )}
            </div>

            {/* Pre-Start or Rest Day Box if no exercises */}
            {isPreStart && exercises.length === 0 ? (
              <div className={styles.restDayBox} style={{ borderColor: 'rgba(2, 132, 199, 0.3)', background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.08), rgba(2, 132, 199, 0.02))' }}>
                <div className={styles.restDayIconCircle} style={{ background: 'rgba(2, 132, 199, 0.15)', color: '#38BDF8' }}>
                  <Calendar size={24} />
                </div>
                <h5 className={styles.restDayTitle}>Training Plan Starts Soon</h5>
                <p className={styles.restDayText}>
                  Your program starts in <strong>{daysUntilStart} day{daysUntilStart === 1 ? '' : 's'}</strong> on <strong>{programStartDate}</strong>. Preview your upcoming workouts or explore the exercise library while you prepare for Day 1.
                </p>
              </div>
            ) : isRestDay && exercises.length === 0 ? (
              <div className={styles.restDayBox}>
                <div className={styles.restDayIconCircle}>
                  <Sparkles size={24} />
                </div>
                <h5 className={styles.restDayTitle}>Scheduled Rest & Growth Day</h5>
                <p className={styles.restDayText}>
                  Rest days are when muscle fibers adapt, repair, and grow stronger. Focus on reaching
                  your <strong>{targets?.water_ml || 3500} ml</strong> water intake, hitting protein targets, and getting 7-8 hours of restful sleep.
                </p>
              </div>
            ) : (
              /* Real Exercises List */
              <div className={styles.exerciseList}>
                {exercises.map((item) => (
                  <div
                    key={item.num}
                    className={styles.exerciseRow}
                    onClick={() => setSelectedExercise(item)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        setSelectedExercise(item);
                      }
                    }}
                    title="Click to view logged sets and cues"
                  >
                    <div className={styles.exerciseRowLeft}>
                      <div className={styles.exerciseIndexBadge}>{item.num}</div>
                      <div className={styles.exerciseDetails}>
                        <h5 className={styles.exerciseName}>{item.name}</h5>
                        <p className={styles.exerciseMeta}>{item.details}</p>
                      </div>
                    </div>

                    <div className={styles.exerciseRowRight}>
                      {item.completed ? (
                        <div className={styles.checkCircleIcon}>
                          <Check size={14} strokeWidth={3} />
                        </div>
                      ) : (
                        <div
                          style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            border: '2px solid #CBD5E1',
                          }}
                        />
                      )}
                      <ChevronRight size={16} className={styles.chevronRightIcon} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: NUTRITION, CHECKLIST, QUICK ACTIONS */}
        <div className={styles.rightColumn}>
          {/* Card 1: Nutrition */}
          <div className={styles.panelCard}>
            <div className={styles.panelCardHeader}>
              <div className={styles.panelTitleGroup}>
                <div className={`${styles.panelIconWrap} ${styles.panelIconNutrition}`}>
                  <Utensils size={16} strokeWidth={2.4} />
                </div>
                <h4 className={styles.panelTitle}>Nutrition</h4>
              </div>
              <Link href="/app/nutrition" className={styles.panelHeaderRight} title="Open Nutrition Hub">
                <ChevronRight size={18} />
              </Link>
            </div>

            {/* Donut Ring + Macro Mini Bars */}
            <div className={styles.nutritionSplit}>
              <div className={styles.donutContainer}>
                <svg className={styles.donutSvg} viewBox="0 0 100 100">
                  <circle
                    className={styles.donutBg}
                    cx="50"
                    cy="50"
                    r={donutRadius}
                    fill="transparent"
                    strokeWidth="10"
                  />
                  <circle
                    className={styles.donutProgress}
                    cx="50"
                    cy="50"
                    r={donutRadius}
                    fill="transparent"
                    strokeWidth="10"
                    strokeDasharray={circumference}
                    strokeDashoffset={donutOffset}
                  />
                </svg>
                <div className={styles.donutCenterText}>
                  <span className={styles.donutValue}>{calLeft.toLocaleString()}</span>
                  <span className={styles.donutLabel}>kcal left</span>
                </div>
              </div>

              {/* Macro Bars */}
              <div className={styles.macroBarsColumn}>
                {/* Protein */}
                <div className={styles.macroBarItem}>
                  <div className={styles.macroBarItemHeader}>
                    <span className={styles.macroBarItemLabel}>Protein</span>
                    <span className={styles.macroBarItemValue}>
                      {proConsumed} / {proTarget} g
                    </span>
                  </div>
                  <div className={styles.macroMiniTrack}>
                    <div className={styles.macroBarFillProtein} style={{ width: `${proPct}%` }} />
                  </div>
                </div>

                {/* Carbs */}
                <div className={styles.macroBarItem}>
                  <div className={styles.macroBarItemHeader}>
                    <span className={styles.macroBarItemLabel}>Carbs</span>
                    <span className={styles.macroBarItemValue}>
                      {carbConsumed} / {carbTarget} g
                    </span>
                  </div>
                  <div className={styles.macroMiniTrack}>
                    <div className={styles.macroBarFillCarbs} style={{ width: `${carbPct}%` }} />
                  </div>
                </div>

                {/* Fat */}
                <div className={styles.macroBarItem}>
                  <div className={styles.macroBarItemHeader}>
                    <span className={styles.macroBarItemLabel}>Fat</span>
                    <span className={styles.macroBarItemValue}>
                      {fatConsumed} / {fatTarget} g
                    </span>
                  </div>
                  <div className={styles.macroMiniTrack}>
                    <div className={styles.macroBarFillFat} style={{ width: `${fatPct}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Real Meals 4-Grid */}
            <div className={styles.mealsGrid}>
              {/* Breakfast */}
              <div
                className={styles.mealCard}
                onClick={() => {
                  setSelectedMealType('BREAKFAST');
                  setIsLogFoodOpen(true);
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setSelectedMealType('BREAKFAST');
                    setIsLogFoodOpen(true);
                  }
                }}
                title={mealsMap.BREAKFAST.logged ? 'View Breakfast details' : 'Log Breakfast'}
              >
                <div className={styles.mealIconWrap} style={{ background: '#FFF7ED', color: '#F97316' }}>
                  <Flame size={14} strokeWidth={2.4} />
                </div>
                <span className={styles.mealName}>Breakfast</span>
                <span className={styles.mealCalories}>{mealsMap.BREAKFAST.calories} kcal</span>
                <div
                  className={`${styles.mealStatusCircle} ${
                    mealsMap.BREAKFAST.logged ? styles.mealStatusLogged : styles.mealStatusAdd
                  }`}
                >
                  {mealsMap.BREAKFAST.logged ? <Check size={11} strokeWidth={3} /> : <Plus size={11} />}
                </div>
              </div>

              {/* Lunch */}
              <div
                className={styles.mealCard}
                onClick={() => {
                  setSelectedMealType('LUNCH');
                  setIsLogFoodOpen(true);
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setSelectedMealType('LUNCH');
                    setIsLogFoodOpen(true);
                  }
                }}
                title={mealsMap.LUNCH.logged ? 'View Lunch details' : 'Log Lunch'}
              >
                <div className={styles.mealIconWrap} style={{ background: '#E6F7F0', color: '#0A6C58' }}>
                  <Soup size={14} strokeWidth={2.4} />
                </div>
                <span className={styles.mealName}>Lunch</span>
                <span className={styles.mealCalories}>{mealsMap.LUNCH.calories} kcal</span>
                <div
                  className={`${styles.mealStatusCircle} ${
                    mealsMap.LUNCH.logged ? styles.mealStatusLogged : styles.mealStatusAdd
                  }`}
                >
                  {mealsMap.LUNCH.logged ? <Check size={11} strokeWidth={3} /> : <Plus size={11} />}
                </div>
              </div>

              {/* Dinner */}
              <div
                className={styles.mealCard}
                onClick={() => {
                  setSelectedMealType('DINNER');
                  setIsLogFoodOpen(true);
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setSelectedMealType('DINNER');
                    setIsLogFoodOpen(true);
                  }
                }}
                title={mealsMap.DINNER.logged ? 'View Dinner details' : 'Log Dinner'}
              >
                <div className={styles.mealIconWrap} style={{ background: '#FFF1F2', color: '#E11D48' }}>
                  <Soup size={14} strokeWidth={2.4} />
                </div>
                <span className={styles.mealName}>Dinner</span>
                <span className={styles.mealCalories}>{mealsMap.DINNER.calories} kcal</span>
                <div
                  className={`${styles.mealStatusCircle} ${
                    mealsMap.DINNER.logged ? styles.mealStatusLogged : styles.mealStatusAdd
                  }`}
                >
                  {mealsMap.DINNER.logged ? <Check size={11} strokeWidth={3} /> : <Plus size={11} />}
                </div>
              </div>

              {/* Snacks */}
              <div
                className={styles.mealCard}
                onClick={() => {
                  setSelectedMealType('SNACK');
                  setIsLogFoodOpen(true);
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setSelectedMealType('SNACK');
                    setIsLogFoodOpen(true);
                  }
                }}
                title={mealsMap.SNACK.logged ? 'View Snacks details' : 'Log Snacks'}
              >
                <div className={styles.mealIconWrap} style={{ background: '#FFF1F2', color: '#E11D48' }}>
                  <Apple size={14} strokeWidth={2.4} />
                </div>
                <span className={styles.mealName}>Snacks</span>
                <span className={styles.mealCalories}>{mealsMap.SNACK.calories} kcal</span>
                <div
                  className={`${styles.mealStatusCircle} ${
                    mealsMap.SNACK.logged ? styles.mealStatusLogged : styles.mealStatusAdd
                  }`}
                >
                  {mealsMap.SNACK.logged ? <Check size={11} strokeWidth={3} /> : <Plus size={11} />}
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Daily Checklist */}
          <div className={styles.panelCard}>
            <div className={styles.panelCardHeader}>
              <div className={styles.panelTitleGroup}>
                <div className={`${styles.panelIconWrap} ${styles.panelIconChecklist}`}>
                  <Clock size={16} strokeWidth={2.4} />
                </div>
                <h4 className={styles.panelTitle}>Daily Checklist</h4>
              </div>
              <div className={styles.checklistHeaderRight}>
                <span className={styles.checklistCount}>{completedChecklistCount} / 6</span>
                <div className={styles.checklistMiniBar}>
                  <div className={styles.checklistMiniFill} style={{ width: `${checklistPct}%` }} />
                </div>
                <Link href="/app/daily" title="View Daily Lifestyle Log">
                  <ChevronRight size={16} color="#94A3B8" />
                </Link>
              </div>
            </div>

            {/* Checklist 2-Column Grid */}
            <div className={styles.checklistGrid}>
              <div
                className={styles.checklistItem}
                onClick={() => toggleChecklist('breakfast')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') toggleChecklist('breakfast');
                }}
              >
                <div
                  className={`${styles.customCheckbox} ${
                    checklist.breakfast ? styles.checkboxChecked : styles.checkboxUnchecked
                  }`}
                >
                  {checklist.breakfast && <Check size={12} strokeWidth={3} />}
                </div>
                <span className={`${styles.checklistLabel} ${checklist.breakfast ? styles.checklistLabelChecked : ''}`}>
                  Log breakfast
                </span>
              </div>

              <div
                className={styles.checklistItem}
                onClick={() => toggleChecklist('snacks')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') toggleChecklist('snacks');
                }}
              >
                <div
                  className={`${styles.customCheckbox} ${
                    checklist.snacks ? styles.checkboxChecked : styles.checkboxUnchecked
                  }`}
                >
                  {checklist.snacks && <Check size={12} strokeWidth={3} />}
                </div>
                <span className={`${styles.checklistLabel} ${checklist.snacks ? styles.checklistLabelChecked : ''}`}>
                  Log snacks
                </span>
              </div>

              <div
                className={styles.checklistItem}
                onClick={() => toggleChecklist('lunch')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') toggleChecklist('lunch');
                }}
              >
                <div
                  className={`${styles.customCheckbox} ${
                    checklist.lunch ? styles.checkboxChecked : styles.checkboxUnchecked
                  }`}
                >
                  {checklist.lunch && <Check size={12} strokeWidth={3} />}
                </div>
                <span className={`${styles.checklistLabel} ${checklist.lunch ? styles.checklistLabelChecked : ''}`}>
                  Log lunch
                </span>
              </div>

              <div
                className={styles.checklistItem}
                onClick={() => toggleChecklist('water')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') toggleChecklist('water');
                }}
              >
                <div
                  className={`${styles.customCheckbox} ${
                    checklist.water ? styles.checkboxChecked : styles.checkboxUnchecked
                  }`}
                >
                  {checklist.water && <Check size={12} strokeWidth={3} />}
                </div>
                <span className={`${styles.checklistLabel} ${checklist.water ? styles.checklistLabelChecked : ''}`}>
                  Drink {targets?.water_ml ? `${targets.water_ml / 1000} L` : '3.5 L'} water
                </span>
              </div>

              <div
                className={styles.checklistItem}
                onClick={() => toggleChecklist('dinner')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') toggleChecklist('dinner');
                }}
              >
                <div
                  className={`${styles.customCheckbox} ${
                    checklist.dinner ? styles.checkboxChecked : styles.checkboxUnchecked
                  }`}
                >
                  {checklist.dinner && <Check size={12} strokeWidth={3} />}
                </div>
                <span className={`${styles.checklistLabel} ${checklist.dinner ? styles.checklistLabelChecked : ''}`}>
                  Log dinner
                </span>
              </div>

              <div
                className={styles.checklistItem}
                onClick={() => toggleChecklist('workout')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') toggleChecklist('workout');
                }}
              >
                <div
                  className={`${styles.customCheckbox} ${
                    checklist.workout ? styles.checkboxChecked : styles.checkboxUnchecked
                  }`}
                >
                  {checklist.workout && <Check size={12} strokeWidth={3} />}
                </div>
                <span className={`${styles.checklistLabel} ${checklist.workout ? styles.checklistLabelChecked : ''}`}>
                  Complete day workout
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Quick Actions */}
          <div className={styles.panelCard}>
            <div className={styles.panelCardHeader}>
              <div className={styles.panelTitleGroup}>
                <div className={`${styles.panelIconWrap} ${styles.panelIconQuickActions}`}>
                  <Zap size={16} strokeWidth={2.4} />
                </div>
                <h4 className={styles.panelTitle}>Quick Actions</h4>
              </div>
            </div>

            {/* 4 Interactive Buttons */}
            <div className={styles.quickActionsGrid}>
              {/* Log Food */}
              <button
                type="button"
                onClick={() => {
                  setSelectedMealType('LUNCH');
                  setIsLogFoodOpen(true);
                }}
                className={`${styles.actionTile} ${styles.actionFood}`}
                title="Log meal or food items"
              >
                <Utensils size={18} strokeWidth={2.5} />
                <span className={styles.actionTileLabel}>Log Food</span>
              </button>

              {/* Log Workout */}
              <button
                type="button"
                onClick={() => router.push('/app/workouts/active')}
                className={`${styles.actionTile} ${styles.actionWorkout}`}
                title="Open Active Workout Logger"
              >
                <Dumbbell size={18} strokeWidth={2.5} />
                <span className={styles.actionTileLabel}>Log Workout</span>
              </button>

              {/* Log Water */}
              <button
                type="button"
                onClick={() => setIsLogWaterOpen(true)}
                className={`${styles.actionTile} ${styles.actionWater}`}
                title="Quick Water Logger"
              >
                <Droplets size={18} strokeWidth={2.5} />
                <span className={styles.actionTileLabel}>Log Water</span>
              </button>

              {/* Add Note */}
              <button
                type="button"
                onClick={() => setIsAddNoteOpen(true)}
                className={`${styles.actionTile} ${styles.actionNote}`}
                title="Add Daily Note or Reflection"
              >
                <FileText size={18} strokeWidth={2.5} />
                <span className={styles.actionTileLabel}>Add Note</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- */}
      {/* 3. MODALS                                                   */}
      {/* ----------------------------------------------------------- */}

      {/* Workout Summary Modal */}
      <Modal
        isOpen={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
        title={`Workout Summary: ${workoutTitle}`}
        size="lg"
      >
        <div className={styles.modalBody}>
          <div className={styles.modalStatRow}>
            <div className={styles.modalStatBox}>
              <div className={styles.modalStatValue}>{durationMin > 0 ? `${durationMin} min` : 'Completed'}</div>
              <div className={styles.modalStatLabel}>Total Duration</div>
            </div>
            <div className={styles.modalStatBox}>
              <div className={styles.modalStatValue}>{totalSetsCount} sets</div>
              <div className={styles.modalStatLabel}>Total Sets</div>
            </div>
            <div className={styles.modalStatBox}>
              <div className={styles.modalStatValue}>
                {totalVolumeKg > 0 ? `${totalVolumeKg.toLocaleString()} kg` : `${estimatedCaloriesBurned} kcal`}
              </div>
              <div className={styles.modalStatLabel}>{totalVolumeKg > 0 ? 'Total Volume' : 'Est. Burn'}</div>
            </div>
          </div>

          <div>
            <h5 style={{ fontSize: '0.875rem', fontWeight: 700, margin: '0.5rem 0 0.75rem 0', color: '#0F172A' }}>
              Exercises ({exercises.length})
            </h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {exercises.map((ex) => (
                <div
                  key={ex.num}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem',
                    background: '#F8FAFC',
                    borderRadius: '8px',
                    border: '1px solid #EEF2F6',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0A6C58' }}>#{ex.num}</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0F172A' }}>{ex.name}</span>
                  </div>
                  <span style={{ fontSize: '0.775rem', color: '#64748B', fontWeight: 500 }}>{ex.details}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.modalActions}>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={() => setIsSummaryModalOpen(false)}
            >
              Close
            </button>
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={() => {
                setIsSummaryModalOpen(false);
                router.push('/app/workouts/active');
              }}
            >
              Start New Workout
            </button>
          </div>
        </div>
      </Modal>

      {/* Exercise Detail Modal */}
      {selectedExercise && (
        <Modal
          isOpen={Boolean(selectedExercise)}
          onClose={() => setSelectedExercise(null)}
          title={selectedExercise.name}
          size="md"
        >
          <div className={styles.modalBody}>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span className={styles.completedTag}>
                {selectedExercise.muscle || 'Strength'}
              </span>
              <span
                style={{
                  fontSize: '0.75rem',
                  padding: '0.15rem 0.5rem',
                  background: '#F1F5F9',
                  borderRadius: '9999px',
                  color: '#475569',
                  fontWeight: 600,
                }}
              >
                {selectedExercise.details}
              </span>
            </div>

            {selectedExercise.setsData && selectedExercise.setsData.length > 0 && (
              <div style={{ background: '#F8FAFC', padding: '0.85rem', borderRadius: '8px', border: '1px solid #EEF2F6' }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                  Logged Sets:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {selectedExercise.setsData.map((s) => (
                    <div
                      key={s.set_number}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.8125rem',
                        color: '#475569',
                      }}
                    >
                      <span>Set {s.set_number}</span>
                      <span>
                        {s.weight_kg ? `${s.weight_kg} kg × ` : ''}
                        {s.reps} reps {s.completed ? '✓' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ background: '#F8FAFC', padding: '0.85rem', borderRadius: '8px', border: '1px solid #EEF2F6' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#0A6C58',
                  fontWeight: 700,
                  fontSize: '0.8125rem',
                  marginBottom: '4px',
                }}
              >
                <Sparkles size={14} />
                <span>Form Cues & Instructions</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.8125rem', color: '#334155', lineHeight: 1.5 }}>
                {selectedExercise.notes}
              </p>
            </div>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={() => setSelectedExercise(null)}
              >
                Done
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Quick Meal Log Modal */}
      <Modal
        isOpen={isLogFoodOpen}
        onClose={() => setIsLogFoodOpen(false)}
        title={`Log ${selectedMealType.charAt(0) + selectedMealType.slice(1).toLowerCase()} for ${formatHumanDate(
          targetDateStr
        )}`}
        size="md"
      >
        <form onSubmit={handleSaveMeal} className={styles.modalBody}>
          <div className={styles.modalFormGroup}>
            <label className={styles.modalLabel}>Meal Type</label>
            <select
              className={styles.modalSelect}
              value={selectedMealType}
              onChange={(e) => setSelectedMealType(e.target.value)}
            >
              <option value="BREAKFAST">Breakfast</option>
              <option value="LUNCH">Lunch</option>
              <option value="DINNER">Dinner</option>
              <option value="SNACK">Snacks</option>
            </select>
          </div>

          <div className={styles.modalFormGroup}>
            <label className={styles.modalLabel}>Food / Meal Name</label>
            <input
              type="text"
              required
              placeholder="e.g., Grilled Chicken Bowl with Rice & Greens"
              className={styles.modalInput}
              value={foodName}
              onChange={(e) => setFoodName(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
            <div className={styles.modalFormGroup}>
              <label className={styles.modalLabel}>Calories (kcal)</label>
              <input
                type="number"
                required
                placeholder="450"
                className={styles.modalInput}
                value={foodCalories}
                onChange={(e) => setFoodCalories(e.target.value)}
              />
            </div>
            <div className={styles.modalFormGroup}>
              <label className={styles.modalLabel}>Protein (g)</label>
              <input
                type="number"
                placeholder="35"
                className={styles.modalInput}
                value={foodProtein}
                onChange={(e) => setFoodProtein(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
            <div className={styles.modalFormGroup}>
              <label className={styles.modalLabel}>Carbs (g)</label>
              <input
                type="number"
                placeholder="45"
                className={styles.modalInput}
                value={foodCarbs}
                onChange={(e) => setFoodCarbs(e.target.value)}
              />
            </div>
            <div className={styles.modalFormGroup}>
              <label className={styles.modalLabel}>Fat (g)</label>
              <input
                type="number"
                placeholder="12"
                className={styles.modalInput}
                value={foodFat}
                onChange={(e) => setFoodFat(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.modalActions}>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={() => setIsLogFoodOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className={styles.btnPrimary}>
              Save Food Log
            </button>
          </div>
        </form>
      </Modal>

      {/* Log Water Modal */}
      <Modal
        isOpen={isLogWaterOpen}
        onClose={() => setIsLogWaterOpen(false)}
        title={`Log Hydration (${day?.water_consumed_ml || 0} / ${targets?.water_ml || 3500} ml)`}
        size="sm"
      >
        <div className={styles.modalBody}>
          <p style={{ margin: 0, fontSize: '0.8125rem', color: '#64748B' }}>
            Current logged: <strong>{day?.water_consumed_ml || 0} ml</strong>. Target: {targets?.water_ml || 3500} ml. Tap a preset to add:
          </p>

          <div className={styles.waterPresets}>
            <button
              type="button"
              className={styles.waterPresetBtn}
              onClick={() => handleAddWater(250)}
            >
              +250 ml
            </button>
            <button
              type="button"
              className={styles.waterPresetBtn}
              onClick={() => handleAddWater(500)}
            >
              +500 ml
            </button>
            <button
              type="button"
              className={styles.waterPresetBtn}
              onClick={() => handleAddWater(750)}
            >
              +750 ml
            </button>
            <button
              type="button"
              className={styles.waterPresetBtn}
              onClick={() => handleAddWater(1000)}
            >
              +1.0 L
            </button>
          </div>

          <div className={styles.modalFormGroup} style={{ marginTop: '0.5rem' }}>
            <label className={styles.modalLabel}>Or add custom amount (ml)</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="number"
                placeholder="e.g. 350"
                className={styles.modalInput}
                value={waterCustomMl}
                onChange={(e) => setWaterCustomMl(e.target.value)}
              />
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={() => {
                  const val = parseInt(waterCustomMl, 10);
                  if (val > 0) {
                    handleAddWater(val);
                    setWaterCustomMl('');
                  }
                }}
              >
                Add
              </button>
            </div>
          </div>

          <div className={styles.modalActions}>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={() => setIsLogWaterOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Note Modal */}
      <Modal
        isOpen={isAddNoteOpen}
        onClose={() => setIsAddNoteOpen(false)}
        title={`Daily Note & Reflection: ${formatHumanDate(targetDateStr)}`}
        size="md"
      >
        <div className={styles.modalBody}>
          <div className={styles.modalFormGroup}>
            <label className={styles.modalLabel}>Daily Reflection or Workout Notes</label>
            <textarea
              className={styles.modalTextarea}
              placeholder="e.g. Great energy today. Hit clean reps on bench press. Recovery and sleep felt solid."
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
            />
          </div>

          <div className={styles.modalActions}>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={() => setIsAddNoteOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={handleSaveNote}
            >
              Save Note
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function TodayPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#64748B' }}>Loading Today...</div>}>
      <TodayContent />
    </Suspense>
  );
}
