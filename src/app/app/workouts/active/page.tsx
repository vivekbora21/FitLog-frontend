'use client';

import React, { useState, useEffect, useRef, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Plus, Trash2, Check, Trophy, X, Dumbbell, Sparkles, ArrowRight, CheckCircle2, Clock, Calendar } from 'lucide-react';
import { api } from '@/lib/api';
import { Exercise, ProgressionRecommendation, Routine, RoutineExerciseSwap } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { ExerciseModal } from '@/components/ExerciseModal';
import styles from './active.module.css';

interface ActiveSet {
  set_number: number;
  set_type: 'WARMUP' | 'NORMAL' | 'DROP' | 'FAILURE';
  weight_kg: number;
  reps: number;
  rpe?: number | null;
  completed: boolean;
  duration_seconds?: number | null;
  incline_percent?: number | null;
  speed_kmh?: number | null;
  intensity?: string;
}

interface ActiveExercise {
  exerciseId: string;
  name: string;
  primaryMuscle: string;
  restSeconds: number;
  notes: string;
  targetReps?: string;
  targetRpe?: number | null;
  progression?: ProgressionRecommendation | null;
  sets: ActiveSet[];
}

type RoutineExercisePayload = {
  exercise: string;
  exercise_name: string;
  primary_muscle: string;
  rest_seconds?: number;
  notes?: string;
  target_sets?: number;
  target_reps?: string;
  target_rpe?: number | null;
  suggested_weight_kg?: number | null;
  progression?: ProgressionRecommendation | null;
  // Per-day override of which exercise fills this slot; sets/reps/rest/RPE/load stay the original prescription.
  swap?: RoutineExerciseSwap | null;
};

// The load to prescribe: server progression first, routine default as fallback.
const plannedLoad = (re: RoutineExercisePayload) =>
  re.progression?.recommended_weight_kg ?? re.suggested_weight_kg ?? null;

// The exercise identity actually recommended for today: the swap replacement when one is set, else the routine default.
const effectiveExercise = (re: RoutineExercisePayload) => ({
  id: re.swap?.exercise ?? re.exercise,
  name: re.swap?.exercise_name ?? re.exercise_name,
  muscle: re.swap?.primary_muscle ?? re.primary_muscle,
});

type RoutinePayload = {
  id?: string;
  name: string;
  exercises?: RoutineExercisePayload[];
};

function ActiveWorkoutLoggerInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const routineId = searchParams.get('routine');
  const assignedId = searchParams.get('assigned');

  const [title, setTitle] = useState('Active Workout Session');
  const [exercises, setExercises] = useState<ActiveExercise[]>([]);
  const [routineExercises, setRoutineExercises] = useState<RoutineExercisePayload[]>([]);
  const [completedSession, setCompletedSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const startTimeRef = useRef<number>(Date.now());
  // Stable for the lifetime of this page so a retried "finish workout" submission
  // (double-click, request timeout + retry) is recognized by the backend as the same
  // attempt instead of creating a duplicate session. A lazy useState initializer (not
  // useRef, which re-evaluates its argument every render) runs this exactly once.
  const [idempotencyKey] = useState(
    () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [finishModalOpen, setFinishModalOpen] = useState(false);
  const [overallRpe, setOverallRpe] = useState<number>(8);
  const [workoutNotes, setWorkoutNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [activeRoutineId, setActiveRoutineId] = useState<string | null>(routineId);

  // Load routine details or completed workout for today
  useEffect(() => {
    const handleRoutine = (routine: RoutinePayload, workoutPayload?: any) => {
      if (routine.name) setTitle(routine.name);
      setActiveRoutineId(routine.id || routineId || null);
      let exList = routine.exercises && routine.exercises.length > 0 ? routine.exercises : [];
      if (exList.length === 0 && workoutPayload) {
        const rawList = Array.isArray(workoutPayload) ? workoutPayload : workoutPayload.exercises;
        if (Array.isArray(rawList)) {
          exList = rawList.map((item: any, idx: number) => ({
            id: item.id || `payload-${idx}`,
            exercise: item.exercise || '',
            exercise_name: item.exercise_name || item.name || `Exercise ${idx + 1}`,
            target_sets: Number(item.sets || item.target_sets || 3),
            target_reps: String(item.reps || item.target_reps || '8-12'),
            rest_seconds: Number(item.rest_seconds || 90),
            primary_muscle: item.primary_muscle || '',
            target_rpe: item.rpe,
            suggested_weight_kg: item.suggested_weight_kg,
            notes: item.notes || item.progression_rule || '',
          }));
        }
      }
      if (exList.length > 0) {
        setRoutineExercises(exList);
        // Automatically populate exercises so the user sees today's movements loaded ready to log
        setExercises((prev) => (prev.length === 0 ? exList.map(toActiveExercise) : prev));
      }
    };

    const loadWorkout = async () => {
      setLoading(true);
      try {
        const isForceNew = searchParams.get('new') === '1';

        if (routineId) {
          const routines = await api.getRoutines();
          const list = routines.results || routines;
          const found = list.find((r: Routine) => r.id === routineId);
          if (found) handleRoutine(found);
          return;
        }

        const current = await api.getTodaysWorkout();

        // If today's workout has already been completed, and user is not explicitly starting a new session:
        if (!isForceNew && (current?.today?.status === 'COMPLETED' || current?.today?.completed_session)) {
          if (current.today.completed_session) {
            setCompletedSession(current.today.completed_session);
            setTitle(current.today.completed_session.title || 'Workout Session');
            return;
          }
        }

        const routine = current?.today?.routine_details;
        const workoutPayload = current?.today?.workout_payload;
        if (routine || workoutPayload) {
          handleRoutine(routine || { name: current?.today?.label || 'Guided Workout' }, workoutPayload);
        }
      } catch (error) {
        console.error('Failed to load active workout', error);
      } finally {
        setLoading(false);
      }
    };

    loadWorkout();
  }, [routineId, searchParams]);

  // Add exercise from the full catalog modal
  const addExercise = (ex: Exercise) => {
    setExercises((prev) => [
      ...prev,
      {
        exerciseId: ex.id,
        name: ex.name,
        primaryMuscle: ex.primary_muscle_name,
        restSeconds: 90,
        notes: '',
        sets: [
          { set_number: 1, set_type: 'NORMAL', weight_kg: 50, reps: 10, completed: false },
          { set_number: 2, set_type: 'NORMAL', weight_kg: 50, reps: 10, completed: false },
          { set_number: 3, set_type: 'NORMAL', weight_kg: 50, reps: 10, completed: false },
        ],
      },
    ]);
  };

  // Build an active exercise from the routine prescription, pre-filling each set with
  // the server's progression recommendation so it matches what the Plan page shows.
  const toActiveExercise = (re: RoutineExercisePayload): ActiveExercise => {
    const setsCount = re.target_sets || 1;
    const targetRepMatch = re.target_reps?.match(/\d+/);
    const defaultReps = targetRepMatch ? parseInt(targetRepMatch[0], 10) : 8;
    const weight = plannedLoad(re) ?? 0;
    const effective = effectiveExercise(re);
    const isCardio = (effective.muscle || '').toLowerCase() === 'cardio' ||
      effective.name.toLowerCase().includes('treadmill') ||
      effective.name.toLowerCase().includes('incline') ||
      effective.name.toLowerCase().includes('bike') ||
      effective.name.toLowerCase().includes('rowing');

    let defaultDurationMins = 20;
    const durMatch = (re.target_reps || '').match(/(\d+)/);
    if (durMatch) defaultDurationMins = parseInt(durMatch[1], 10);

    let defaultIncline: number | null = null;
    const incMatch = effective.name.match(/(\d+(?:\.\d+)?)\s*%/);
    if (incMatch) defaultIncline = parseFloat(incMatch[1]);
    else if (effective.name.toLowerCase().includes('incline')) defaultIncline = 10;

    let defaultSpeed: number | null = null;
    const spdMatch = effective.name.match(/(\d+(?:\.\d+)?)\s*(?:km\/h|kmh)/i);
    if (spdMatch) defaultSpeed = parseFloat(spdMatch[1]);
    else if (effective.name.toLowerCase().includes('walk') || effective.name.toLowerCase().includes('treadmill')) defaultSpeed = 4.8;

    return {
      exerciseId: effective.id,
      name: effective.name,
      primaryMuscle: effective.muscle,
      restSeconds: re.rest_seconds || 90,
      notes: re.notes || '',
      targetReps: re.target_reps,
      targetRpe: re.target_rpe,
      progression: re.progression,
      sets: Array.from({ length: isCardio ? Math.max(1, re.target_sets || 1) : (re.target_sets || 3) }).map((_, sIdx) => ({
        set_number: sIdx + 1,
        set_type: 'NORMAL',
        weight_kg: weight,
        reps: re.progression?.target_reps[sIdx] ?? defaultReps,
        rpe: re.target_rpe || null,
        completed: false,
        duration_seconds: isCardio ? defaultDurationMins * 60 : null,
        incline_percent: defaultIncline,
        speed_kmh: defaultSpeed,
        intensity: isCardio ? 'Zone 2' : '',
      })),
    };
  };

  const addRoutineExercise = (re: RoutineExercisePayload) => {
    setExercises((prev) => [...prev, toActiveExercise(re)]);
  };

  const addAllRoutineExercises = () => {
    const unadded = routineExercises.filter(
      (re) => !exercises.some((ex) => ex.exerciseId === effectiveExercise(re).id)
    );
    setExercises((prev) => [...prev, ...unadded.map(toActiveExercise)]);
  };

  const removeExercise = (index: number) => {
    setExercises((prev) => prev.filter((_, i) => i !== index));
  };

  const addSet = (exIndex: number) => {
    setExercises((prev) =>
      prev.map((ex, i) => {
        if (i !== exIndex) return ex;
        const lastSet = ex.sets[ex.sets.length - 1];
        const nextNum = ex.sets.length + 1;
        return {
          ...ex,
          sets: [
            ...ex.sets,
            {
              set_number: nextNum,
              set_type: 'NORMAL',
              weight_kg: lastSet ? lastSet.weight_kg : 50,
              reps: lastSet ? lastSet.reps : 10,
              completed: false,
            },
          ],
        };
      })
    );
  };

  const removeSet = (exIndex: number, setIndex: number) => {
    setExercises((prev) =>
      prev.map((ex, i) => {
        if (i !== exIndex) return ex;
        const filtered = ex.sets.filter((_, idx) => idx !== setIndex);
        return {
          ...ex,
          sets: filtered.map((s, idx) => ({ ...s, set_number: idx + 1 })),
        };
      })
    );
  };

  const updateSet = <K extends keyof ActiveSet>(exIndex: number, setIndex: number, field: K, val: ActiveSet[K]) => {
    setExercises((prev) =>
      prev.map((ex, i) => {
        if (i !== exIndex) return ex;
        return {
          ...ex,
          sets: ex.sets.map((s, j) => (j === setIndex ? { ...s, [field]: val } : s)),
        };
      })
    );
  };

  const calculateTotalVolume = () => {
    let volume = 0;
    exercises.forEach((ex) => {
      ex.sets.forEach((s) => {
        if (s.completed && s.weight_kg && s.reps) {
          volume += s.weight_kg * s.reps;
        }
      });
    });
    return volume;
  };

  const handleFinishWorkout = async () => {
    setSaving(true);
    try {
      const now = Date.now();
      const durationSeconds = Math.max(1, Math.floor((now - startTimeRef.current) / 1000));

      const payload = {
        title,
        started_at: new Date(startTimeRef.current).toISOString(),
        completed_at: new Date(now).toISOString(),
        duration_seconds: durationSeconds,
        overall_rpe: overallRpe,
        notes: workoutNotes,
        routine: activeRoutineId,
        assigned_workout: assignedId || null,
        idempotency_key: idempotencyKey,
        exercises: exercises.map((ex, orderIdx) => ({
          exercise: ex.exerciseId,
          order: orderIdx + 1,
          rest_seconds: ex.restSeconds,
          notes: ex.notes,
          sets: ex.sets.map((s) => ({
            set_number: s.set_number,
            set_type: s.set_type,
            weight_kg: Number(s.weight_kg) || 0,
            reps: Number(s.reps) || 0,
            rpe: s.rpe ? Number(s.rpe) : null,
            completed: s.completed,
            duration_seconds: s.duration_seconds || null,
            incline_percent: s.incline_percent !== null && s.incline_percent !== undefined ? Number(s.incline_percent) : null,
            speed_kmh: s.speed_kmh !== null && s.speed_kmh !== undefined ? Number(s.speed_kmh) : null,
            intensity: s.intensity || '',
          })),
        })),
      };

      await api.createWorkoutSession(payload);
      setFinishModalOpen(false);
      router.push('/app/workouts');
    } catch (err) {
      console.error('Failed to save workout session:', err);
      alert('Failed to save workout session. Please verify inputs.');
    } finally {
      setSaving(false);
    }
  };

  const unaddedRoutineExercises = routineExercises.filter(
    (re) => !exercises.some((e) => e.exerciseId === effectiveExercise(re).id)
  );

  if (loading) {
    return (
      <div className={styles.loadingFallback}>
        <div className="skeleton" style={{ width: '40%', height: 28, margin: '0 auto 1rem auto' }} />
        <div className="skeleton" style={{ width: '100%', height: 180, borderRadius: 12 }} />
      </div>
    );
  }

  if (completedSession) {
    const startedDate = completedSession.started_at ? new Date(completedSession.started_at) : null;
    const totalCompletedSets = completedSession.exercises?.reduce(
      (n: number, ex: any) => n + (ex.sets?.length || 0),
      0
    ) ?? 0;

    let totalCardioSecs = 0;
    completedSession.exercises?.forEach((ex: any) => {
      const isCardio = (ex.primary_muscle || '').toLowerCase() === 'cardio' ||
        ex.exercise_name?.toLowerCase().includes('treadmill') ||
        ex.exercise_name?.toLowerCase().includes('cardio') ||
        ex.exercise_name?.toLowerCase().includes('bike') ||
        ex.exercise_name?.toLowerCase().includes('incline');
      if (isCardio) {
        ex.sets?.forEach((s: any) => {
          if (s.duration_seconds) totalCardioSecs += Number(s.duration_seconds);
        });
      }
    });
    const cardioMinutes = Math.round(totalCardioSecs / 60);
    const effectiveSecs = Math.max(completedSession.duration_seconds || 0, totalCardioSecs);

    const formatDuration = (seconds?: number | null) => {
      if (!seconds || seconds <= 0) return '0 min';
      const mins = Math.round(seconds / 60);
      const hrs = Math.floor(mins / 60);
      const remMins = mins % 60;
      if (hrs > 0) return `${hrs}h ${remMins}m`;
      return `${mins} min`;
    };

    return (
      <div className={styles.page}>
        {/* Completed Hero Banner */}
        <div className={styles.completedHeroCard}>
          <div className={styles.completedHeroTop}>
            <div className={styles.completedHeroLeft}>
              <div className={styles.completedHeroIcon}>
                <Check size={26} strokeWidth={3} />
              </div>
              <div className={styles.completedHeroTitleCol}>
                <div className={styles.completedHeroEyebrowRow}>
                  <span className={styles.completedHeroEyebrow}>Workout Completed Today</span>
                  <Badge variant="emerald" size="sm">Finished</Badge>
                </div>
                <h1 className={styles.completedHeroTitle}>
                  {completedSession.title || 'Workout Session'}
                </h1>
                {startedDate && (
                  <p className={styles.completedHeroDate}>
                    {startedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    {' · '}
                    {startedDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </p>
                )}
              </div>
            </div>

            <div className={styles.completedHeroActions}>
              <Button
                variant="secondary"
                onClick={() => {
                  setCompletedSession(null);
                  setExercises([]);
                  router.push('/app/workouts/active?new=1');
                }}
              >
                <Plus size={16} />
                <span>Log Another Workout</span>
              </Button>
              <Button
                variant="primary"
                onClick={() => router.push('/app/workouts/plan')}
              >
                <span>View in Plan</span>
                <ArrowRight size={16} />
              </Button>
            </div>
          </div>

          {/* Metrics summary */}
          <div className={styles.completedHeroStatsRow}>
            <div className={styles.completedStatTile}>
              <div className={styles.completedStatVal}>
                {completedSession.total_volume_kg ? `${Math.round(completedSession.total_volume_kg).toLocaleString()} kg` : '0 kg'}
              </div>
              <div className={styles.completedStatLbl}>Volume Lifted</div>
            </div>

            <div className={styles.completedStatTile}>
              <div className={styles.completedStatVal}>
                {formatDuration(effectiveSecs)}
              </div>
              <div className={styles.completedStatLbl}>Duration</div>
            </div>

            <div className={styles.completedStatTile}>
              <div className={styles.completedStatVal}>
                {totalCompletedSets}
              </div>
              <div className={styles.completedStatLbl}>Completed Sets</div>
            </div>

            {cardioMinutes > 0 && (
              <div className={styles.completedStatTile}>
                <div className={styles.completedStatVal}>
                  {cardioMinutes} min
                </div>
                <div className={styles.completedStatLbl}>Cardio Total</div>
              </div>
            )}

            {completedSession.total_calories ? (
              <div className={styles.completedStatTile}>
                <div className={styles.completedStatVal}>
                  {completedSession.total_calories} kcal
                </div>
                <div className={styles.completedStatLbl}>Calories Burned</div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Completed Exercises List */}
        <div className={styles.completedExercisesList}>
          <div className={styles.completedExercisesListHeader}>
            <h2 className={styles.completedSectionTitle}>Completed Movements</h2>
            <span className={styles.completedSectionCount}>
              {completedSession.exercises?.length || 0} movements logged
            </span>
          </div>

          {completedSession.exercises?.map((ex: any, idx: number) => {
            const isCardio = (ex.primary_muscle || '').toLowerCase() === 'cardio' ||
              ex.exercise_name?.toLowerCase().includes('treadmill') ||
              ex.exercise_name?.toLowerCase().includes('cardio') ||
              ex.exercise_name?.toLowerCase().includes('bike') ||
              ex.exercise_name?.toLowerCase().includes('incline');

            return (
              <Card key={ex.id || idx} className={styles.completedExerciseCard}>
                <div className={styles.completedExerciseHeader}>
                  <div className={styles.completedExerciseHeaderLeft}>
                    <div className={styles.completedCheckBadge}>
                      <Check size={14} strokeWidth={3} />
                    </div>
                    <div>
                      <h3 className={styles.completedExerciseName}>
                        #{idx + 1} {ex.exercise_name}
                      </h3>
                      <div className={styles.completedExerciseMeta}>
                        <Badge variant={isCardio ? 'cyan' : 'emerald'} size="sm">
                          {ex.primary_muscle || (isCardio ? 'Cardio' : 'Movement')}
                        </Badge>
                        {ex.sets?.length > 0 && (
                          <span className={styles.completedExerciseSetsSummary}>
                            {ex.sets.length} {ex.sets.length === 1 ? 'set' : 'sets'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className={styles.tableWrap}>
                  <table className={styles.setsTable}>
                    <thead>
                      <tr>
                        <th className={`${styles.th} ${styles.thSet}`}>Set</th>
                        <th className={styles.th}>Type</th>
                        <th className={styles.th}>{isCardio ? 'Duration' : 'Weight'}</th>
                        <th className={styles.th}>{isCardio ? 'Incline' : 'Reps'}</th>
                        {isCardio && <th className={styles.th}>Speed</th>}
                        {isCardio && <th className={styles.th}>Calories</th>}
                        <th className={`${styles.th} ${styles.thDone}`}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ex.sets?.map((set: any, sIdx: number) => (
                        <tr key={set.id || sIdx} className={styles.completedSetRow}>
                          <td className={`${styles.td} ${styles.tdSetNumber}`}>
                            {set.set_number || sIdx + 1}
                          </td>
                          <td className={styles.td}>
                            <span className={styles.setTypeText}>
                              {set.intensity || (set.set_type === 'WARMUP' ? 'Warmup' : isCardio ? 'Interval' : 'Normal')}
                            </span>
                          </td>
                          <td className={styles.td}>
                            <strong className={styles.setValueHighlight}>
                              {isCardio
                                ? `${Math.round((set.duration_seconds || 0) / 60)} min`
                                : `${set.weight_kg ?? 0} kg`}
                            </strong>
                          </td>
                          <td className={styles.td}>
                            {isCardio
                              ? (set.incline_percent !== null && set.incline_percent !== undefined ? `${set.incline_percent}%` : '—')
                              : `${set.reps ?? 0} reps`}
                          </td>
                          {isCardio && (
                            <td className={styles.td}>
                              {set.speed_kmh ? `${set.speed_kmh} km/h` : '—'}
                            </td>
                          )}
                          {isCardio && (
                            <td className={styles.td}>
                              {set.calories ? `${set.calories} kcal` : '—'}
                            </td>
                          )}
                          <td className={`${styles.td} ${styles.tdDone}`}>
                            <div className={styles.completedCheckIcon}>
                              <Check size={14} strokeWidth={3} />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Top Banner & Controls */}
      <div className={styles.banner}>
        <div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={styles.titleInput}
          />
          <div className={styles.statsRow}>
            <span className={styles.statLabel}>
              {exercises.length} {exercises.length === 1 ? 'Exercise' : 'Exercises'}
            </span>
            <span className={styles.dot}>•</span>
            <span className={styles.volumeText}>
              {calculateTotalVolume().toLocaleString()} kg lifted
            </span>
          </div>
        </div>

        <div className={styles.bannerActions}>
          <Button variant="secondary" onClick={() => setIsModalOpen(true)}>
            <Plus size={16} />
            <span>Add Movement</span>
          </Button>
          <Button variant="primary" onClick={() => setFinishModalOpen(true)} disabled={exercises.length === 0}>
            <Check size={16} strokeWidth={2.5} />
            <span>Finish Session</span>
          </Button>
        </div>
      </div>

      {/* Exercises Section */}
      {exercises.length === 0 ? (
        <div className={styles.stack125}>
          {/* Main Action Card */}
          <Card className={styles.emptyCard}>
            <div className={styles.emptyIconWrap}>
              <Dumbbell size={28} strokeWidth={2.2} />
            </div>
            <h3 className={styles.emptyTitle}>
              Add Exercises to Begin Session
            </h3>
            <p className={styles.emptyText}>
              {routineExercises.length > 0
                ? 'Select exercises from today’s routine below, or search any movement from the exercise library to start logging.'
                : 'Select movements from the exercise library to begin tracking your workout sets, reps, and weights.'}
            </p>
            <Button variant="primary" onClick={() => setIsModalOpen(true)}>
              <Plus size={16} />
              <span>Browse Exercise Library</span>
            </Button>
          </Card>

          {/* Routine Prescribed Exercises Options */}
          {routineExercises.length > 0 && (
            <Card className={styles.routineCard}>
              <div className={styles.routineCardHeader}>
                <div>
                  <div className={styles.routineCardHeaderTitleWrap}>
                    <Sparkles size={18} color="var(--color-primary)" />
                    <h4 className={styles.routineCardHeaderTitle}>
                      Prescribed for Today: {title}
                    </h4>
                  </div>
                  <p className={styles.routineCardHeaderSubtitle}>
                    Choose which movements you want to log in this session:
                  </p>
                </div>
                <Button size="sm" variant="secondary" onClick={addAllRoutineExercises}>
                  <Plus size={14} />
                  <span>Add All ({routineExercises.length})</span>
                </Button>
              </div>

              <div className={styles.routineGrid}>
                {routineExercises.map((re, idx) => {
                  const effective = effectiveExercise(re);
                  return (
                    <div key={idx} className={styles.routineItem}>
                      <div>
                        <div className={styles.routineItemTop}>
                          <span className={styles.routineItemName}>
                            {effective.name}
                          </span>
                          <Badge variant="emerald">{effective.muscle}</Badge>
                          {re.swap && <Badge variant="amber">Swapped</Badge>}
                        </div>
                        <div className={styles.routineItemMeta}>
                          Target: {re.target_sets || 3} sets × {re.target_reps || '8 reps'}
                          {plannedLoad(re) ? ` · ${plannedLoad(re)} kg` : ''}
                          {re.target_rpe ? ` @ RPE ${re.target_rpe}` : ''}
                          {re.swap ? ` · recommended: ${re.exercise_name}` : ''}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => addRoutineExercise(re)}
                        className={styles.routineItemAddBtn}
                      >
                        <Plus size={14} />
                        <span>Add Exercise</span>
                      </Button>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      ) : (
        <div className={styles.stack125}>
          {/* Active Exercises List */}
          {exercises.map((ex, exIdx) => (
            <Card key={exIdx} className={styles.exerciseCard}>
              {/* Exercise Header */}
              <div className={styles.exerciseCardHeader}>
                <div>
                  <div className={styles.exerciseNameRow}>
                    <span className={styles.exerciseName}>
                      #{exIdx + 1} {ex.name}
                    </span>
                    <Badge variant="emerald">{ex.primaryMuscle}</Badge>
                  </div>
                  <div className={styles.exerciseMeta}>
                    Target: {ex.sets.length} × {ex.targetReps || 'log reps'} @ RPE {ex.targetRpe || '8'} · Rest: {ex.restSeconds}s
                  </div>
                </div>

                <Button size="sm" variant="ghost" onClick={() => removeExercise(exIdx)} aria-label="Remove exercise">
                  <Trash2 size={16} color="var(--color-rose)" />
                </Button>
              </div>

              {ex.progression && (
                <div className={styles.progressionBox}>
                  <strong className={styles.progressionLabel}>PROGRESSION RECOMMENDATION · </strong>
                  {ex.progression.last_session && (
                    <>Last time {ex.progression.last_session.weight_kg} kg × {ex.progression.last_session.reps.join(' / ')}. </>
                  )}
                  {ex.progression.note}
                </div>
              )}

              {/* Set / Interval Table */}
              {(() => {
                const isCardio = (ex.primaryMuscle || '').toLowerCase() === 'cardio' ||
                  ex.name.toLowerCase().includes('treadmill') ||
                  ex.name.toLowerCase().includes('incline') ||
                  ex.name.toLowerCase().includes('bike') ||
                  ex.name.toLowerCase().includes('rowing');

                return (
                  <div>
                    {isCardio && (
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                          Incline Presets:
                        </span>
                        {[0, 4, 8, 10, 12, 15].map((inc) => (
                          <button
                            key={inc}
                            type="button"
                            onClick={() => {
                              ex.sets.forEach((_, sIdx) => updateSet(exIdx, sIdx, 'incline_percent', inc));
                            }}
                            style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '700',
                              border: '1px solid var(--color-border)',
                              background: 'var(--color-surface)',
                              color: 'var(--color-text-primary)',
                              cursor: 'pointer',
                            }}
                          >
                            {inc}%
                          </button>
                        ))}
                      </div>
                    )}
                    <div className={styles.tableWrap}>
                      <table className={styles.table}>
                        <thead>
                          <tr className={styles.theadRow}>
                            <th className={`${styles.th} ${styles.thSet}`}>{isCardio ? 'Int' : 'Set'}</th>
                            <th className={`${styles.th} ${styles.thType}`}>Type</th>
                            <th className={`${styles.th} ${styles.thWeight}`}>{isCardio ? 'Time (min)' : 'kg'}</th>
                            <th className={`${styles.th} ${styles.thReps}`}>{isCardio ? 'Incline %' : 'Reps'}</th>
                            {isCardio && <th className={styles.th}>Speed (km/h)</th>}
                            <th className={`${styles.th} ${styles.thDone}`}>Done</th>
                            <th className={`${styles.th} ${styles.thAction}`}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {ex.sets.map((set, sIdx) => (
                            <tr
                              key={sIdx}
                              className={`${styles.setRow} ${set.completed ? styles.setRowCompleted : ''}`}
                            >
                              <td className={`${styles.td} ${styles.tdSetNumber}`}>
                                {set.set_number}
                              </td>

                              <td className={styles.td}>
                                <select
                                  value={set.set_type}
                                  onChange={(e) => updateSet(exIdx, sIdx, 'set_type', e.target.value as ActiveSet['set_type'])}
                                  className={styles.setTypeSelect}
                                >
                                  <option value="NORMAL">{isCardio ? 'Interval' : 'Normal'}</option>
                                  <option value="WARMUP">Warmup</option>
                                  <option value="DROP">Cooldown</option>
                                  <option value="FAILURE">Max Effort</option>
                                </select>
                              </td>

                              {/* Weight / Duration */}
                              <td className={styles.td}>
                                {isCardio ? (
                                  <input
                                    type="number"
                                    min="1"
                                    value={set.duration_seconds ? Math.round(set.duration_seconds / 60) : 20}
                                    onChange={(e) => updateSet(exIdx, sIdx, 'duration_seconds', (parseInt(e.target.value, 10) || 0) * 60)}
                                    className={styles.weightInput}
                                  />
                                ) : (
                                  <input
                                    type="number"
                                    step="0.5"
                                    value={set.weight_kg}
                                    onChange={(e) => updateSet(exIdx, sIdx, 'weight_kg', parseFloat(e.target.value) || 0)}
                                    className={styles.weightInput}
                                  />
                                )}
                              </td>

                              {/* Reps / Incline */}
                              <td className={styles.td}>
                                {isCardio ? (
                                  <input
                                    type="number"
                                    step="0.5"
                                    value={set.incline_percent ?? 0}
                                    onChange={(e) => updateSet(exIdx, sIdx, 'incline_percent', parseFloat(e.target.value) || 0)}
                                    className={styles.repsInput}
                                  />
                                ) : (
                                  <input
                                    type="number"
                                    value={set.reps}
                                    onChange={(e) => updateSet(exIdx, sIdx, 'reps', parseInt(e.target.value, 10) || 0)}
                                    className={styles.repsInput}
                                  />
                                )}
                              </td>

                              {/* Cardio Speed */}
                              {isCardio && (
                                <td className={styles.td}>
                                  <input
                                    type="number"
                                    step="0.1"
                                    value={set.speed_kmh ?? 4.8}
                                    onChange={(e) => updateSet(exIdx, sIdx, 'speed_kmh', parseFloat(e.target.value) || 0)}
                                    className={styles.repsInput}
                                  />
                                </td>
                              )}

                              {/* Completed Checkbox */}
                              <td className={styles.td}>
                                <button
                                  type="button"
                                  onClick={() => updateSet(exIdx, sIdx, 'completed', !set.completed)}
                                  className={`${styles.completeToggle} ${set.completed ? styles.completeToggleActive : ''}`}
                                  aria-label={set.completed ? 'Mark incomplete' : 'Mark complete'}
                                >
                                  {set.completed && <Check size={18} color="#FFFFFF" strokeWidth={3} />}
                                </button>
                              </td>

                              {/* Remove Set */}
                              <td className={styles.td}>
                                {ex.sets.length > 1 && (
                                  <button
                                    onClick={() => removeSet(exIdx, sIdx)}
                                    className={styles.removeSetBtn}
                                    aria-label="Remove set"
                                  >
                                    <X size={14} />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}

              {/* Add Set Button */}
              <div className={styles.addSetWrap}>
                <Button size="sm" variant="secondary" onClick={() => addSet(exIdx)}>
                  <Plus size={14} />
                  <span>Add Set</span>
                </Button>
              </div>
            </Card>
          ))}

          {/* Quick-add unadded routine exercises if any remain */}
          {unaddedRoutineExercises.length > 0 && (
            <Card className={styles.moreRoutineCard}>
              <div className={styles.moreRoutineHeader}>
                <div className={styles.moreRoutineHeaderLeft}>
                  <Sparkles size={16} color="var(--color-primary)" />
                  <span className={styles.moreRoutineHeaderText}>
                    Add More from Today’s Routine ({title})
                  </span>
                </div>
                {unaddedRoutineExercises.length > 1 && (
                  <Button size="sm" variant="ghost" onClick={addAllRoutineExercises}>
                    <Plus size={14} />
                    <span>Add All Remaining ({unaddedRoutineExercises.length})</span>
                  </Button>
                )}
              </div>
              <div className={styles.moreRoutineChipsWrap}>
                {unaddedRoutineExercises.map((re, idx) => {
                  const effective = effectiveExercise(re);
                  return (
                    <button
                      key={idx}
                      onClick={() => addRoutineExercise(re)}
                      className={styles.routineChip}
                    >
                      <Plus size={14} color="var(--color-primary)" />
                      <span>{effective.name}</span>
                      <span className={styles.moreRoutineChipMeta}>({effective.muscle})</span>
                      {re.swap && <Badge variant="amber" size="sm">Swapped</Badge>}
                    </button>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Add Movement Button */}
          <div className={styles.addMovementWrap}>
            <Button variant="secondary" onClick={() => setIsModalOpen(true)}>
              <Plus size={16} />
              <span>Add Movement from Library</span>
            </Button>
          </div>
        </div>
      )}

      {/* Exercise Picker Modal */}
      <ExerciseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelectExercise={addExercise}
      />

      {/* Finish Session Summary Modal */}
      <Modal isOpen={finishModalOpen} onClose={() => setFinishModalOpen(false)} title="Complete Workout Session">
        <div className={styles.stack125}>
          <div className={styles.finishSummaryBox}>
            <Trophy size={36} color="var(--color-primary)" className={styles.finishTrophyIcon} />
            <h3 className={styles.finishTitle}>Outstanding Work!</h3>
            <p className={styles.finishSubtitle}>
              You moved <strong className={styles.finishVolumeHighlight}>{calculateTotalVolume().toLocaleString()} kg</strong> of total volume.
            </p>
          </div>

          <div>
            <label className={styles.formLabel}>
              Perceived Exertion (RPE 1-10)
            </label>
            <div className={styles.rpeRow}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setOverallRpe(num)}
                  className={`${styles.rpeBtn} ${overallRpe === num ? styles.rpeBtnActive : ''}`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={styles.formLabel}>
              Session Notes
            </label>
            <textarea
              rows={3}
              value={workoutNotes}
              onChange={(e) => setWorkoutNotes(e.target.value)}
              placeholder="How did the session feel? Energy levels, pumps, form cues..."
              className={styles.notesTextarea}
            />
          </div>

          <div className={styles.modalActions}>
            <Button variant="secondary" onClick={() => setFinishModalOpen(false)}>
              Keep Logging
            </Button>
            <Button variant="primary" onClick={handleFinishWorkout} disabled={saving}>
              {saving ? 'Saving...' : 'Save & Log Session'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function ActiveWorkoutLoggerPage() {
  return (
    <Suspense fallback={<div className={styles.loadingFallback}>Loading active session...</div>}>
      <ActiveWorkoutLoggerInner />
    </Suspense>
  );
}
