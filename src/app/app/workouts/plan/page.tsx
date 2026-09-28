'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Circle, Flag, Play, SlidersHorizontal, Flame, Dumbbell, Target, Zap, Activity, Repeat2, RotateCcw } from 'lucide-react';
import { api } from '@/lib/api';
import { PlanSelectorModal } from '@/components/PlanSelectorModal';
import { ExerciseModal } from '@/components/ExerciseModal';
import { Badge } from '@/components/ui/Badge';
import { Exercise, ProgressionRecommendation, RoutineExerciseSwap } from '@/lib/types';
import styles from './plan.module.css';

type PlanExercise = {
  id: string;
  exercise: string;
  exercise_name: string;
  primary_muscle: string;
  focus?: string;
  target_sets: number;
  target_reps: string;
  rest_seconds: number;
  target_rpe?: number;
  suggested_weight_kg?: number;
  progression?: ProgressionRecommendation | null;
  notes?: string;
  swap?: RoutineExerciseSwap | null;
};

type ProgramDay = {
  id: string;
  day_number: number;
  label: string;
  is_optional: boolean;
  status: 'UPCOMING' | 'COMPLETED' | 'MISSED';
  routine_details?: {
    id: string;
    name: string;
    description?: string;
    exercises?: PlanExercise[];
  };
};

type WorkoutPlanPayload = {
  program: {
    id: string;
    name: string;
    mode?: string;
    mode_label?: string;
    start_date: string;
    current_day: number;
    duration_days: number;
    start_weight_kg?: number;
    target_weight_kg?: number;
    target_weekly_rate_kg?: number;
    target_cardio_minutes_early?: number;
    target_cardio_minutes_later?: number;
  } | null;
  days: ProgramDay[];
};

// Same source of truth as the Active Workout logger: server progression, then routine default.
function plannedLoad(exercise: { progression?: ProgressionRecommendation | null; suggested_weight_kg?: number }) {
  return exercise.progression?.recommended_weight_kg ?? exercise.suggested_weight_kg ?? null;
}

function statusTone(day: ProgramDay, currentDay: number) {
  if (day.status === 'COMPLETED') return { icon: <CheckCircle2 size={14} />, color: 'var(--color-primary)', label: 'Completed' };
  if (day.status === 'MISSED') return { icon: <Flag size={14} />, color: '#D97706', label: 'Resume' };
  if (day.day_number === currentDay) return { icon: <Play size={14} />, color: '#0EA5E9', label: 'Today' };
  return { icon: <Circle size={14} />, color: 'var(--text-muted)', label: 'Upcoming' };
}

export default function WorkoutPlanPage() {
  const [payload, setPayload] = useState<WorkoutPlanPayload | null>(null);
  const [selectedDay, setSelectedDay] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [swapTarget, setSwapTarget] = useState<{ dayNumber: number; routineExerciseId: string } | null>(null);
  const [swappingId, setSwappingId] = useState<string | null>(null);
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);

  const loadPlan = () => {
    api.getWorkoutPlan()
      .then((plan) => {
        setPayload(plan);
        setSelectedDay(plan.program?.current_day || 1);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPlan();
  }, []);

  // Merge a freshly-swapped ProgramDay (server response) back into local state without a refetch.
  const applyUpdatedDay = (updatedDay: ProgramDay) => {
    setPayload((prev) =>
      prev
        ? {
            ...prev,
            days: prev.days.map((d) => (d.day_number === updatedDay.day_number ? updatedDay : d)),
          }
        : prev
    );
  };

  const runSwap = async (routineExerciseId: string, dayNumber: number, exerciseId: string) => {
    setSwappingId(routineExerciseId);
    try {
      const updatedDay = await api.swapExercise({
        day_number: dayNumber,
        routine_exercise_id: routineExerciseId,
        exercise_id: exerciseId,
      });
      applyUpdatedDay(updatedDay);
    } catch (err) {
      console.error('Failed to swap exercise:', err);
      alert('Failed to swap exercise. Please try again.');
    } finally {
      setSwappingId(null);
      setSwapTarget(null);
    }
  };

  const handlePickReplacement = (ex: Exercise) => {
    if (!swapTarget) return;
    runSwap(swapTarget.routineExerciseId, swapTarget.dayNumber, ex.id);
  };

  const handleRevertSwap = (exercise: PlanExercise, dayNumber: number) => {
    runSwap(exercise.id, dayNumber, exercise.exercise);
  };

  const days = useMemo(() => payload?.days || [], [payload]);
  const program = payload?.program;
  const duration = program?.duration_days || 60;
  const currentDay = program?.current_day || 1;
  const day = useMemo(() => days.find((item) => item.day_number === selectedDay), [days, selectedDay]);
  const routine = day?.routine_details;
  const completed = days.filter((item) => item.status === 'COMPLETED').length;
  const selectedTone = day ? statusTone(day, currentDay) : null;

  // Dynamic milestones
  const milestones = useMemo(() => {
    const arr = [1, Math.round(duration * 0.25), Math.round(duration * 0.5), Math.round(duration * 0.75), duration];
    return Array.from(new Set(arr)).sort((a, b) => a - b);
  }, [duration]);

  if (loading) return <div className={styles.loading}>Loading workout plan...</div>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <div className={styles.headerEyebrowRow}>
            <span className={styles.modeLabel}>
              {program ? `${program.mode_label || 'Workout Plan'} · ${duration} Days` : 'Workout Plan'}
            </span>
            {program?.start_weight_kg && program?.target_weight_kg && (
              <span className={styles.weightRange}>
                ({program.start_weight_kg}kg → {program.target_weight_kg}kg)
              </span>
            )}
          </div>
          <h1 className={styles.headerTitle}>Program Day {selectedDay}</h1>
          <p className={styles.headerDesc}>
            Program day advances after completion. Calendar dates do not skip unfinished training.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className={styles.modeBtn}
          >
            <SlidersHorizontal size={16} /> Mode &amp; Plan
          </button>
          <Link
            href="/app/workouts/active"
            className={styles.startDayBtn}
          >
            <Play size={16} /> Start Current Day
          </Link>
        </div>
      </header>

      {!program ? (
        <section className={styles.emptyProgramCard}>
          <h2 className={styles.emptyTitle}>No enrolled journey program</h2>
          <p className={styles.emptyDesc}>
            Start a goal-oriented journey by selecting a mode (Cut, Bulk, Focus, Recomp) to schedule your training days.
          </p>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className={styles.selectPlanBtn}
          >
            <SlidersHorizontal size={15} /> Select a Plan Now
          </button>
        </section>
      ) : (
        <>
          <section className={styles.progressOverviewGrid}>
            <div className={styles.progressCard}>
              <div className={styles.progressHeader}>
                <strong className={styles.programTitle}>{program.name}</strong>
                <span>{completed} completed / {program.duration_days} days</span>
              </div>
              <div className={styles.progressBarTrack}>
                <div
                  className={styles.progressBarFill}
                  style={{ width: `${Math.round((completed / Math.max(program.duration_days, 1)) * 100)}%` }}
                />
              </div>
              <div
                className={styles.dayTrackGrid}
                style={{ gridTemplateColumns: `repeat(${duration}, minmax(4px, 1fr))` }}
              >
                {days.map((item) => {
                  const milestone = milestones.includes(item.day_number);
                  const isSelected = item.day_number === selectedDay;
                  const statusClass =
                    item.status === 'COMPLETED'
                      ? styles.dayStatusCompleted
                      : item.day_number === currentDay
                      ? styles.dayStatusToday
                      : item.is_optional
                      ? styles.dayStatusOptional
                      : styles.dayStatusUpcoming;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      title={`Day ${item.day_number}: ${item.label}`}
                      onClick={() => setSelectedDay(item.day_number)}
                      className={[
                        styles.dayTrackBtn,
                        milestone ? styles.dayTrackBtnMilestone : styles.dayTrackBtnStandard,
                        isSelected ? styles.dayTrackBtnSelected : styles.dayTrackBtnUnselected,
                        statusClass,
                      ].join(' ')}
                      aria-label={`Select day ${item.day_number}`}
                    />
                  );
                })}
              </div>
            </div>

            <aside className={styles.sidebarInfo}>
              <div className={styles.infoRow}><CalendarDays size={17} /> Start {program.start_date}</div>
              <div className={styles.infoRow}><Flag size={17} /> Milestones: {milestones.join(', ')}</div>
              <div className={styles.infoNote}>Dynamic plan cycle configured for {duration} days of programmed training and recovery.</div>
            </aside>
          </section>

          <section className={styles.navButtonsRow}>
            <button
              onClick={() => setSelectedDay(Math.max(1, selectedDay - 1))}
              className={styles.dayNavBtn}
            >
              <ChevronLeft size={15} /> Previous Day
            </button>
            <button
              onClick={() => setSelectedDay(currentDay)}
              className={styles.dayNavBtn}
            >
              Current Day
            </button>
            <button
              onClick={() => setSelectedDay(Math.min(program.duration_days, selectedDay + 1))}
              className={styles.dayNavBtn}
            >
              Next Day <ChevronRight size={15} />
            </button>
          </section>

          <section className={styles.dayCard}>
            <div className={styles.dayCardHeader}>
              <div>
                <div
                  className={styles.dayStatusPill}
                  style={{ color: selectedTone?.color || 'var(--text-muted)' }}
                >
                  {selectedTone?.icon} {selectedTone?.label || 'Unavailable'} {day?.is_optional ? ' / Optional' : ''}
                </div>
                <h2 className={styles.dayTitle}>{day?.label || routine?.name || 'Plan day unavailable'}</h2>
                <p className={styles.dayDesc}>{routine?.description || 'This day does not have a routine attached yet.'}</p>
              </div>
              {day?.day_number === currentDay && (
                <Link
                  href="/app/workouts/active"
                  className={styles.logWorkoutCta}
                >
                  Log this workout
                </Link>
              )}
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.exerciseTable}>
                <thead>
                  <tr>
                    <th className={styles.exerciseTh}>Exercise / focus</th>
                    <th className={styles.exerciseTh}>Sets</th>
                    <th className={styles.exerciseTh}>Target reps</th>
                    <th className={styles.exerciseTh}>Rest</th>
                    <th className={styles.exerciseTh}>RPE</th>
                    <th className={styles.exerciseTh}>Suggested load</th>
                    <th className={styles.exerciseTh}>Coaching note</th>
                    <th className={styles.exerciseTh}>Swap</th>
                  </tr>
                </thead>
                <tbody>
                  {(routine?.exercises || []).map((exercise) => (
                    <tr key={exercise.id} className={styles.exerciseTr}>
                      <td className={styles.exerciseTd}>
                        <div className={styles.exerciseNameRow}>
                          <strong>{exercise.swap ? exercise.swap.exercise_name : exercise.exercise_name}</strong>
                          {exercise.swap && <Badge variant="amber" size="sm">Swapped</Badge>}
                        </div>
                        <small className={styles.exerciseTdSecondary}>
                          {exercise.swap ? exercise.swap.primary_muscle : (exercise.focus || exercise.primary_muscle)}
                          {exercise.swap && (
                            <>
                              {' '}&middot; recommended: {exercise.exercise_name}
                            </>
                          )}
                        </small>
                      </td>
                      <td className={styles.exerciseTd}>{exercise.target_sets}</td>
                      <td className={styles.exerciseTd}>{exercise.target_reps}</td>
                      <td className={styles.exerciseTd}>{exercise.rest_seconds}s</td>
                      <td className={styles.exerciseTd}>{exercise.target_rpe || 8}</td>
                      <td className={styles.exerciseTd} title={exercise.progression?.note}>
                        {plannedLoad(exercise) ? `${plannedLoad(exercise)} kg` : '--'}
                      </td>
                      <td className={`${styles.exerciseTd} ${styles.exerciseTdSecondary}`}>{exercise.notes || '--'}</td>
                      <td className={styles.exerciseTd}>
                        <div className={styles.swapActions}>
                          <button
                            type="button"
                            className={styles.swapBtn}
                            disabled={swappingId === exercise.id}
                            onClick={() => {
                              setSwapTarget({ dayNumber: selectedDay, routineExerciseId: exercise.id });
                              setIsSwapModalOpen(true);
                            }}
                          >
                            <Repeat2 size={13} /> Swap
                          </button>
                          {exercise.swap && (
                            <button
                              type="button"
                              className={styles.swapBtn}
                              disabled={swappingId === exercise.id}
                              onClick={() => handleRevertSwap(exercise, selectedDay)}
                            >
                              <RotateCcw size={13} /> Revert
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!routine?.exercises?.length && (
                    <tr>
                      <td colSpan={8} className={styles.noExercisesTd}>No exercises configured for this day.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <PlanSelectorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          loadPlan();
        }}
        initialWeight={program?.start_weight_kg || 75.0}
      />

      <ExerciseModal
        isOpen={isSwapModalOpen}
        onClose={() => {
          setIsSwapModalOpen(false);
          setSwapTarget(null);
        }}
        onSelectExercise={handlePickReplacement}
      />
    </div>
  );
}
