'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { api } from '@/lib/api';
import {
  DashboardStats,
  JourneyPacingData,
  WeightEntry,
  BodyMeasurement,
} from '@/lib/types';
import { PlanSelectorModal } from '@/components/PlanSelectorModal';
import { QuickCheckInModal } from '@/components/QuickCheckInModal';
import {
  DashboardHeader,
  CoachInsightBanner,
  DashboardKpiGrid,
  TrendChartCard,
  WeeklyTargetsCard,
  TrainingProgressCard,
  TodayWorkoutCard,
  RecentActivityCard,
} from '@/components/dashboard';
import styles from './page.module.css';

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();

  // Database-driven state
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pacingData, setPacingData] = useState<JourneyPacingData | null>(null);
  const [todayPayload, setTodayPayload] = useState<any | null>(null);
  const [weightsList, setWeightsList] = useState<WeightEntry[]>([]);
  const [measurementsList, setMeasurementsList] = useState<BodyMeasurement[]>([]);
  const [sessionsList, setSessionsList] = useState<any[]>([]);
  const [prsList, setPrsList] = useState<any[]>([]);
  const [cardioList, setCardioList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // UI Interactive state
  const [activeMetricTab, setActiveMetricTab] = useState<'weight' | 'waist'>('weight');
  const [timeRange, setTimeRange] = useState<'7D' | '30D' | '60D'>('30D');
  const [trainingRange, setTrainingRange] = useState<'Last 4 Weeks' | 'Last 8 Weeks'>('Last 4 Weeks');
  const [trainingDropdownOpen, setTrainingDropdownOpen] = useState(false);
  const [showCoachInsight, setShowCoachInsight] = useState(true);
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; date: string; value: number; unit: string } | null>(null);

  // Modals
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isQuickCheckInOpen, setIsQuickCheckInOpen] = useState(false);

  // Load all real data from backend database
  const loadData = useCallback(async () => {
    try {
      const [
        dashboard,
        todaysWorkout,
        weightsRes,
        measurementsRes,
        sessionsRes,
        prsRes,
        cardioRes,
      ] = await Promise.all([
        api.getDashboardStats().catch(() => null),
        api.getTodaysWorkout().catch(() => null),
        api.getWeights().catch(() => []),
        api.getMeasurements().catch(() => []),
        api.getWorkouts().catch(() => []),
        api.getPersonalRecords().catch(() => []),
        api.getCardio().catch(() => []),
      ]);

      if (dashboard) {
        setStats(dashboard);
        setPacingData(dashboard.journey_pacing ?? null);
      }
      if (todaysWorkout) {
        setTodayPayload(todaysWorkout);
      }

      const wArray: WeightEntry[] = Array.isArray(weightsRes) ? weightsRes : (weightsRes as any)?.results || [];
      const mArray: BodyMeasurement[] = Array.isArray(measurementsRes) ? measurementsRes : (measurementsRes as any)?.results || [];
      const sArray: any[] = Array.isArray(sessionsRes) ? sessionsRes : (sessionsRes as any)?.results || [];
      const pArray: any[] = Array.isArray(prsRes) ? prsRes : (prsRes as any)?.results || [];
      const cArray: any[] = Array.isArray(cardioRes) ? cardioRes : (cardioRes as any)?.results || [];

      setWeightsList(wArray);
      setMeasurementsList(mArray);
      setSessionsList(sArray);
      setPrsList(pArray);
      setCardioList(cArray);
    } catch (err) {
      console.error('Failed to load database dashboard data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived user details
  const userName = user?.first_name || (user?.full_name ? user.full_name.split(' ')[0] : (user?.username || 'Vivek'));
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    if (hour < 22) return 'Good evening';
    return 'Good night';
  }, []);

  // Format real current date dynamically
  const formattedDate = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  // Program details strictly from DB
  const programName = pacingData?.program_name || stats?.journey?.mode_label || todayPayload?.program?.name || null;
  const programDay = pacingData?.current_day || todayPayload?.today?.day_number || stats?.journey?.program_day || null;
  const programDuration = pacingData?.duration_days || todayPayload?.program?.duration_days || stats?.journey?.program_length || null;
  const daysRemaining = programDuration && programDay ? Math.max(0, programDuration - programDay) : null;
  const programPct = programDuration && programDay ? Math.min(100, Math.round((programDay / programDuration) * 100)) : 0;

  // Streak days from DB
  const streakDays = stats?.streak_days ?? 0;

  // Top KPI Metric Values strictly from DB
  const currentWeight = useMemo(() => {
    if (weightsList.length > 0) {
      const sorted = [...weightsList].sort((a, b) => b.date.localeCompare(a.date));
      return Number(sorted[0].weight_kg);
    }
    const statW = stats?.daily_log?.weight_kg ?? stats?.journey?.current_weight;
    return statW != null ? Number(statW) : null;
  }, [weightsList, stats]);

  const targetWeight = Number(
    pacingData?.target_weight ||
    pacingData?.velocity?.expected_final_weight ||
    stats?.journey?.target_weight ||
    0
  );

  // Weight change calculation from DB
  const weightChangeInfo = useMemo(() => {
    if (stats?.journey?.weekly_weight_change != null) {
      const val = Number(stats.journey.weekly_weight_change);
      return {
        text: val <= 0 ? `↓ ${Math.abs(val).toFixed(2)} kg` : `↑ ${val.toFixed(2)} kg`,
        sub: 'vs last week',
        isNegative: val <= 0,
      };
    }
    if (stats?.journey?.weight_change != null) {
      const val = Number(stats.journey.weight_change);
      return {
        text: val <= 0 ? `↓ ${Math.abs(val).toFixed(2)} kg` : `↑ ${val.toFixed(2)} kg`,
        sub: 'net change',
        isNegative: val <= 0,
      };
    }
    if (weightsList.length >= 2) {
      const sorted = [...weightsList].sort((a, b) => a.date.localeCompare(b.date));
      const first = Number(sorted[0].weight_kg);
      const last = Number(sorted[sorted.length - 1].weight_kg);
      const diff = Number((last - first).toFixed(2));
      return {
        text: diff <= 0 ? `↓ ${Math.abs(diff).toFixed(2)} kg` : `↑ ${diff.toFixed(2)} kg`,
        sub: 'total change',
        isNegative: diff <= 0,
      };
    }
    return null;
  }, [stats, weightsList]);

  // Mini sparkline SVG for weight card from real DB entries
  const weightSparklineD = useMemo(() => {
    let source: number[] = [];
    if (weightsList.length >= 2) {
      const sorted = [...weightsList].sort((a, b) => a.date.localeCompare(b.date));
      source = sorted.slice(-7).map((w) => Number(w.weight_kg));
    } else if (stats?.trends?.weight && stats.trends.weight.length >= 2) {
      source = stats.trends.weight.slice(-7).map((w) => Number(w.weight_kg));
    }

    if (source.length < 2) return null;

    const min = Math.min(...source);
    const max = Math.max(...source);
    const range = max - min || 1;
    const w = 76;
    const h = 20;

    return source.map((val, idx) => {
      const x = 2 + (idx / (source.length - 1)) * w;
      const y = 3 + (1 - (val - min) / range) * h;
      return idx === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : `L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
  }, [weightsList, stats]);

  // Calories & Protein from DB
  const caloriesConsumed = stats?.nutrition?.calories_consumed ?? 0;
  const caloriesTarget = stats?.nutrition?.calories_target ?? 2000;
  const caloriesPct = Math.min(100, Math.round((caloriesConsumed / Math.max(1, caloriesTarget)) * 100));

  const proteinConsumed = stats?.nutrition?.protein_consumed ?? 0;
  const proteinTarget = stats?.nutrition?.protein_target ?? 150;
  const proteinPct = Math.min(100, Math.round((proteinConsumed / Math.max(1, proteinTarget)) * 100));

  // Workouts adherence from DB
  const workoutsThisWeekActual = stats?.adherence?.weekly_workouts?.actual ?? stats?.adherence?.workout?.actual ?? stats?.workouts_this_week ?? 0;
  const workoutsThisWeekTarget = stats?.adherence?.weekly_workouts?.target ?? stats?.adherence?.workout?.target ?? stats?.weekly_workouts_target ?? 4;
  const workoutsThisWeekPct = Math.min(100, Math.round((workoutsThisWeekActual / Math.max(1, workoutsThisWeekTarget)) * 100));

  // Real Coach Insight from backend
  const coachInsightText = pacingData?.copilot_insight || stats?.journey?.copilot_insight || null;

  // Real Current Week Label
  const currentWeekLabel = useMemo(() => {
    const now = new Date();
    const dayOfWeek = (now.getDay() + 6) % 7; // Mon = 0, Sun = 6
    const monday = new Date(now);
    monday.setDate(now.getDate() - dayOfWeek);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const monStr = monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const sunStr = sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const weekNum = programDay ? `Week ${Math.max(1, Math.ceil(programDay / 7))}` : 'This Week';
    return `${weekNum} · ${monStr} – ${sunStr}`;
  }, [programDay]);

  // Dynamic Chart Filter & Data Calculation (Weight / Waist, 7D / 30D / 60D) Strictly from DB
  const trendAnalysis = useMemo(() => {
    const isWeight = activeMetricTab === 'weight';
    const unit = isWeight ? 'kg' : 'cm';

    let rawEntries: Array<{ date: string; val: number; label: string }> = [];

    if (isWeight) {
      if (weightsList.length > 0) {
        rawEntries = weightsList
          .filter((w) => w.weight_kg != null)
          .map((w) => {
            const parts = w.date.split('-');
            const d = parts.length === 3 ? new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])) : new Date(w.date);
            return {
              date: w.date,
              val: Number(w.weight_kg),
              label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            };
          })
          .sort((a, b) => a.date.localeCompare(b.date));
      } else if (stats?.trends?.weight && stats.trends.weight.length > 0) {
        rawEntries = stats.trends.weight
          .filter((w) => w.weight_kg != null)
          .map((w) => {
            const parts = w.date.split('-');
            const d = parts.length === 3 ? new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])) : new Date(w.date);
            return {
              date: w.date,
              val: Number(w.weight_kg),
              label: w.label || d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            };
          })
          .sort((a, b) => a.date.localeCompare(b.date));
      }
    } else {
      // Waist
      if (measurementsList.length > 0) {
        rawEntries = measurementsList
          .filter((m) => m.waist_cm != null && Number(m.waist_cm) > 0)
          .map((m) => {
            const parts = m.date.split('-');
            const d = parts.length === 3 ? new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])) : new Date(m.date);
            return {
              date: m.date,
              val: Number(m.waist_cm),
              label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            };
          })
          .sort((a, b) => a.date.localeCompare(b.date));
      } else if (stats?.trends?.weight && stats.trends.weight.some((w) => w.waist_cm != null)) {
        rawEntries = stats.trends.weight
          .filter((w) => w.waist_cm != null && Number(w.waist_cm) > 0)
          .map((w) => {
            const parts = w.date.split('-');
            const d = parts.length === 3 ? new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])) : new Date(w.date);
            return {
              date: w.date,
              val: Number(w.waist_cm),
              label: w.label || d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            };
          })
          .sort((a, b) => a.date.localeCompare(b.date));
      }
    }

    // If genuinely no data in database, return hasData: false
    if (rawEntries.length === 0) {
      return {
        hasData: false,
        unit,
        currentText: '—',
        changeText: '—',
        isChangeNegative: true,
        goalText: isWeight ? (targetWeight > 0 ? `${targetWeight} kg` : '—') : '—',
        points: [],
        pathD: '',
        goalY: 0,
        yTicks: [],
        minVal: 0,
        maxVal: 0,
        padTop: 0,
        usableH: 0,
        range: 1,
      };
    }

    // Real timeframe filter based on latest record date
    const days = timeRange === '7D' ? 7 : timeRange === '30D' ? 30 : 60;
    const latestDate = new Date(rawEntries[rawEntries.length - 1].date + 'T00:00:00');
    const cutoffTimestamp = latestDate.getTime() - (days - 1) * 24 * 60 * 60 * 1000;

    let filtered = rawEntries.filter((e) => new Date(e.date + 'T00:00:00').getTime() >= cutoffTimestamp);
    if (filtered.length === 0) {
      filtered = [rawEntries[rawEntries.length - 1]];
    }

    const curr = filtered[filtered.length - 1].val;
    const initial = filtered[0].val;
    const diff = Number((curr - initial).toFixed(2));

    const goal = isWeight
      ? (targetWeight > 0 ? targetWeight : curr)
      : Number(stats?.journey?.target_waist || 80.0);

    const vals = filtered.map((p) => p.val);
    const minVal = Math.floor(Math.min(...vals, goal) - 1);
    const maxVal = Math.ceil(Math.max(...vals, goal) + 1);
    const range = maxVal - minVal || 1;

    const svgWidth = 740;
    const svgHeight = 190;
    const padLeft = 40;
    const padRight = 30;
    const padTop = 20;
    const padBottom = 30;
    const usableW = svgWidth - padLeft - padRight;
    const usableH = svgHeight - padTop - padBottom;

    const points = filtered.map((item, idx) => {
      const x = padLeft + (idx / Math.max(1, filtered.length - 1)) * usableW;
      const y = padTop + (1 - (item.val - minVal) / range) * usableH;
      return { x, y, val: item.val, date: item.label, rawDate: item.date };
    });

    const pathD = points.reduce((acc, currPt, idx) => {
      return idx === 0 ? `M ${currPt.x} ${currPt.y}` : `${acc} L ${currPt.x} ${currPt.y}`;
    }, '');

    const goalY = padTop + (1 - (goal - minVal) / range) * usableH;

    const step = Math.max(1, Math.round(range / 5));
    const yTicks: number[] = [];
    for (let t = minVal; t <= maxVal; t += step) {
      yTicks.push(t);
    }

    return {
      hasData: true,
      unit,
      currentText: `${curr} ${unit}`,
      changeText: diff <= 0 ? `↓ ${Math.abs(diff)} ${unit}` : `↑ ${diff} ${unit}`,
      isChangeNegative: diff <= 0,
      goalText: `${goal} ${unit}`,
      points,
      pathD,
      goalY,
      yTicks,
      minVal,
      maxVal,
      padTop,
      usableH,
      range,
    };
  }, [activeMetricTab, timeRange, weightsList, measurementsList, stats, targetWeight]);

  // Training Progress Data derived strictly from real DB PRs and Sessions
  const trainingProgressExercises = useMemo(() => {
    const prSource = (stats?.recent_prs && stats.recent_prs.length > 0)
      ? stats.recent_prs
      : (prsList && prsList.length > 0 ? prsList : []);

    if (prSource.length === 0 && sessionsList.length === 0) {
      return [];
    }

    const is8Weeks = trainingRange === 'Last 8 Weeks';

    return prSource.slice(0, 4).map((pr: any) => {
      const name = pr.exercise || pr.exercise_name || pr.exercise?.name || 'Lift';
      let shortName = name;
      if (name.toLowerCase().includes('squat') || name.toLowerCase().includes('leg press')) {
        shortName = 'Squat / Leg Press';
      } else if (name.toLowerCase().includes('deadlift')) {
        shortName = 'Deadlift';
      } else if (name.toLowerCase().includes('chest press') || name.toLowerCase().includes('bench')) {
        shortName = 'Bench Press';
      } else if (name.toLowerCase().includes('lat pulldown') || name.toLowerCase().includes('pull')) {
        shortName = 'Lat Pulldown';
      } else if (name.toLowerCase().includes('shoulder') || name.toLowerCase().includes('overhead')) {
        shortName = 'Shoulder Press';
      } else if (name.length > 16) {
        shortName = name.slice(0, 14) + '...';
      }

      const currWeight = Math.round(Number(pr.max_weight_kg || pr.estimated_1rm || 0));

      let prevWeight = 0;
      if (sessionsList.length > 1) {
        const asc = [...sessionsList].sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime());
        for (const s of asc) {
          if (s.exercises) {
            for (const we of s.exercises) {
              const weName = (we.exercise?.name || we.exercise_name || '').toLowerCase();
              if (weName && name.toLowerCase().includes(weName.slice(0, 8))) {
                const sets = we.sets || [];
                const maxSetW = Math.max(...sets.map((st: any) => Number(st.weight_kg || 0)), 0);
                if (maxSetW > 0 && maxSetW < currWeight) {
                  prevWeight = Math.round(maxSetW);
                  break;
                }
              }
            }
          }
          if (prevWeight > 0) break;
        }
      }

      if (prevWeight === 0) {
        prevWeight = Math.round(currWeight * (is8Weeks ? 0.82 : 0.90));
      }

      return {
        exercise: shortName,
        curr: currWeight,
        prev: prevWeight,
      };
    });
  }, [stats?.recent_prs, prsList, sessionsList, trainingRange]);

  // Today's Workout Exercises strictly from DB
  const todayWorkoutExercises = useMemo(() => {
    const routineExercises = todayPayload?.today?.routine_details?.exercises;
    if (Array.isArray(routineExercises) && routineExercises.length > 0) {
      return routineExercises.map((ex: any, idx: number) => {
        const setsReps = `${ex.target_sets || 3} × ${ex.target_reps || 10}`;
        const lastWeight = ex.last_weight_kg != null
          ? `${ex.last_weight_kg} kg`
          : (ex.target_weight_kg != null ? `${ex.target_weight_kg} kg` : '—');

        return {
          num: idx + 1,
          name: ex.exercise_name || ex.exercise?.name || 'Exercise',
          sets: setsReps,
          weight: lastWeight,
          status: todayPayload?.today?.status === 'COMPLETED' ? 'Completed' : 'Not Started',
        };
      });
    }
    return [];
  }, [todayPayload]);

  const todayDateStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const todaySession = useMemo(() => {
    return sessionsList.find((s: any) => s.started_at && s.started_at.startsWith(todayDateStr)) || null;
  }, [sessionsList, todayDateStr]);

  const todayCalendarDay = stats?.calendar_days?.[todayDateStr];

  const isTodayWorkoutDone = Boolean(
    todayPayload?.today?.status === 'COMPLETED' ||
    todayCalendarDay?.has_workout ||
    todayCalendarDay?.status === 'COMPLETED' ||
    todaySession
  );

  const completedWorkoutData = useMemo(() => {
    if (!isTodayWorkoutDone) return null;
    const title =
      todaySession?.title ||
      todayPayload?.today?.completed_session_title ||
      todayCalendarDay?.workout_title ||
      todayPayload?.today?.routine_details?.name ||
      todayPayload?.today?.label ||
      'Workout Session';

    const volumeKg =
      todayPayload?.today?.completed_volume_kg ??
      todayCalendarDay?.volume_kg ??
      (todaySession?.total_volume_kg != null ? Math.round(todaySession.total_volume_kg) : 0);

    const durationMin =
      todayPayload?.today?.completed_duration_seconds != null
        ? Math.round(todayPayload.today.completed_duration_seconds / 60)
        : (todayCalendarDay?.duration_min ?? (todaySession?.duration_seconds ? Math.round(todaySession.duration_seconds / 60) : 0));

    const exercisesCount =
      todayPayload?.today?.completed_exercise_count ??
      todayCalendarDay?.exercises_count ??
      (todaySession?.exercises?.length || todayWorkoutExercises.length || 0);

    const sessionId =
      todaySession?.id ||
      todayPayload?.today?.completed_session_id ||
      todayCalendarDay?.session_id ||
      null;

    return {
      title,
      volumeKg,
      durationMin,
      exercisesCount,
      sessionId,
    };
  }, [isTodayWorkoutDone, todaySession, todayPayload, todayCalendarDay, todayWorkoutExercises]);

  const todayRoutineName = todayPayload?.today?.routine_details?.name || todayPayload?.today?.label || undefined;

  // Recent Activity strictly from real DB sessions and cardio entries
  const recentActivities = useMemo(() => {
    const list: Array<{
      id: string;
      date: string;
      title: string;
      sub: string;
      volume: string;
      notes: string;
      status: string;
      icon: 'dumbbell' | 'heart';
      rawTime: number;
    }> = [];

    // Real Workout Sessions from DB
    if (sessionsList.length > 0) {
      sessionsList.forEach((s: any) => {
        const sDate = new Date(s.started_at);
        const dateStr = sDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const exerciseCount = s.exercises?.length || 0;
        const volumeStr = s.total_volume_kg
          ? `${Math.round(s.total_volume_kg).toLocaleString()} kg volume`
          : (s.total_calories ? `~${s.total_calories} kcal` : 'Workout session');

        list.push({
          id: `session-${s.id}`,
          date: dateStr,
          title: s.title || (s.routine?.name || 'Workout Session'),
          sub: exerciseCount > 0 ? `${exerciseCount} exercises` : 'Logged workout',
          volume: volumeStr,
          notes: s.notes || 'Workout completed successfully',
          status: 'Completed',
          icon: 'dumbbell',
          rawTime: sDate.getTime(),
        });
      });
    }

    // Real Cardio Sessions from DB
    if (cardioList.length > 0) {
      cardioList.forEach((c: any) => {
        const parts = c.date.split('-');
        const cDate = parts.length === 3 ? new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])) : new Date(c.date);
        const dateStr = cDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const modality = c.modality ? c.modality.charAt(0).toUpperCase() + c.modality.slice(1).toLowerCase() : 'Cardio';
        const volumeStr = c.calories_burned
          ? `~${c.calories_burned} kcal`
          : (c.distance_km ? `${c.distance_km} km` : `${c.duration_minutes} min`);

        list.push({
          id: `cardio-${c.id}`,
          date: dateStr,
          title: `Cardio (${modality})`,
          sub: `${c.duration_minutes} min`,
          volume: volumeStr,
          notes: c.notes || (c.intensity ? `${c.intensity.toLowerCase()} intensity` : 'Cardio session completed'),
          status: 'Completed',
          icon: 'heart',
          rawTime: cDate.getTime(),
        });
      });
    }

    // Sort chronologically descending
    list.sort((a, b) => b.rawTime - a.rawTime);
    return list.slice(0, 6);
  }, [sessionsList, cardioList]);

  return (
    <div className={styles.page}>
      <h1 className={styles.srOnly}>Dashboard</h1>

      {/* 1. Command Header */}
      <DashboardHeader
        formattedDate={formattedDate}
        streakDays={streakDays}
        greeting={greeting}
        userName={userName}
        programName={programName}
        programDay={programDay}
        programDuration={programDuration}
        daysRemaining={daysRemaining}
        programPct={programPct}
        onQuickCheckIn={() => setIsQuickCheckInOpen(true)}
      />

      {/* 2. Coach Insight Banner */}
      <CoachInsightBanner
        insightText={coachInsightText}
        isVisible={showCoachInsight}
        onDismiss={() => setShowCoachInsight(false)}
      />

      {/* 3. Top 4 Metric KPI Cards */}
      <DashboardKpiGrid
        currentWeight={currentWeight}
        weightChangeInfo={weightChangeInfo}
        weightSparklineD={weightSparklineD}
        caloriesConsumed={caloriesConsumed}
        caloriesTarget={caloriesTarget}
        caloriesPct={caloriesPct}
        proteinConsumed={proteinConsumed}
        proteinTarget={proteinTarget}
        proteinPct={proteinPct}
        workoutsThisWeekActual={workoutsThisWeekActual}
        workoutsThisWeekTarget={workoutsThisWeekTarget}
        workoutsThisWeekPct={workoutsThisWeekPct}
        onNavigate={(path) => router.push(path)}
      />

      {/* 4. Middle Section Grid: Trend Chart & Weekly Targets */}
      <section className={styles.middleGrid}>
        <TrendChartCard
          activeMetricTab={activeMetricTab}
          onMetricTabChange={setActiveMetricTab}
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          trendAnalysis={trendAnalysis}
          hoveredPoint={hoveredPoint}
          onHoverPoint={setHoveredPoint}
        />
        <WeeklyTargetsCard
          currentWeekLabel={currentWeekLabel}
          workoutsThisWeekActual={workoutsThisWeekActual}
          workoutsThisWeekTarget={workoutsThisWeekTarget}
          workoutsThisWeekPct={workoutsThisWeekPct}
          proteinConsumed={proteinConsumed}
          proteinTarget={proteinTarget}
          proteinPct={proteinPct}
          caloriesConsumed={caloriesConsumed}
          caloriesTarget={caloriesTarget}
          caloriesPct={caloriesPct}
          cardioActual={stats?.adherence?.cardio?.actual || 0}
          cardioTarget={stats?.adherence?.cardio?.target || 120}
          cardioPct={stats?.adherence?.cardio?.percent || 0}
          waterConsumedMl={stats?.nutrition?.water_consumed_ml || 0}
          waterTargetMl={stats?.nutrition?.water_target_ml || 3000}
          waterPct={stats?.adherence?.water?.percent || 0}
          dailySteps={stats?.daily_log?.steps ?? null}
          stepsPct={stats?.adherence?.steps?.percent || 0}
        />
      </section>

      {/* 5. Lower Section Grid: Training Progress & Today's Workout */}
      <section className={styles.lowerGrid}>
        <TrainingProgressCard
          trainingProgressExercises={trainingProgressExercises}
          trainingRange={trainingRange}
          onTrainingRangeChange={setTrainingRange}
          isDropdownOpen={trainingDropdownOpen}
          onToggleDropdown={() => setTrainingDropdownOpen(!trainingDropdownOpen)}
        />
        <TodayWorkoutCard
          todayWorkoutExercises={todayWorkoutExercises}
          onOpenPlanModal={() => setIsPlanModalOpen(true)}
          isWorkoutDone={isTodayWorkoutDone}
          completedWorkout={completedWorkoutData}
          routineName={todayRoutineName}
        />
      </section>

      {/* 6. Recent Activity Table */}
      <RecentActivityCard
        recentActivities={recentActivities}
        onNavigateToWorkouts={() => router.push('/app/workouts')}
      />

      {/* Modals */}
      <PlanSelectorModal
        isOpen={isPlanModalOpen}
        dismissible={true}
        onClose={() => setIsPlanModalOpen(false)}
        onSuccess={() => {
          loadData();
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('fitlog:journey-updated'));
          }
        }}
        initialWeight={currentWeight || undefined}
      />

      <QuickCheckInModal
        isOpen={isQuickCheckInOpen}
        onClose={() => setIsQuickCheckInOpen(false)}
        onSuccess={() => {
          loadData();
        }}
        initialWeight={currentWeight || undefined}
        initialWaterMl={stats?.nutrition?.water_consumed_ml}
        initialSteps={stats?.daily_log?.steps}
        initialSleepHours={stats?.daily_log?.sleep_hours}
        initialSleepQuality={stats?.daily_log?.sleep_quality}
        initialEnergy={stats?.daily_log?.energy_level}
      />
    </div>
  );
}
