'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  Flame,
  Dumbbell,
  Target,
  Zap,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Play,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Wrench,
  Utensils,
  Gauge,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Blueprint, JourneyMode, PlanRequest, PlanRoadmap } from '@/lib/types';
import styles from './PlanSelectorModal.module.css';

interface PlanSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialWeight?: number;
  /** When false, the modal cannot be dismissed without starting a plan (no close button, backdrop click, or Cancel). Used for the mandatory onboarding gate. */
  dismissible?: boolean;
}

// Mirrors JourneyProgram.MIN_DURATION_DAYS / MAX_DURATION_DAYS on the backend.
const MIN_PLAN_DAYS = 7;
const MAX_PLAN_DAYS = 365;

const WEEKDAYS: { value: number; label: string }[] = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 7, label: 'Sun' },
];

const MODE_CONFIG: Record<JourneyMode, { label: string; icon: typeof Flame; color: string; defaultDays: number }> = {
  CUT: { label: 'Cut Mode', icon: Flame, color: '#EF4444', defaultDays: 60 },
  BULK: { label: 'Bulk Mode', icon: Dumbbell, color: '#8B5CF6', defaultDays: 90 },
  FOCUS: { label: 'Focus Mode', icon: Target, color: '#0EA5E9', defaultDays: 30 },
  RECOMP: { label: 'Recomp Mode', icon: RefreshCw, color: '#059669', defaultDays: 45 },
  HABIT: { label: 'Habit Reset', icon: Zap, color: '#F59E0B', defaultDays: 21 },
};

const MODE_ORDER: JourneyMode[] = ['CUT', 'BULK', 'RECOMP', 'FOCUS', 'HABIT'];

const STEP_LABELS = ['Path', 'Mode', 'Details', 'Preview'];

/** First N weekday ints (1=Mon..7=Sun), a simple sensible default spread across the week. */
const defaultWeekdaysFor = (count: number): number[] => {
  const n = Math.max(1, Math.min(7, count));
  return WEEKDAYS.slice(0, n).map((w) => w.value);
};

/** Pulls a human-readable message out of an ApiClient error (DRF-style {field: [msgs]} / {non_field_errors: [...]} / {detail}). */
const extractApiError = (err: unknown, fallback: string): string => {
  const response = (err as { response?: unknown })?.response;
  if (response && typeof response === 'object') {
    const r = response as Record<string, unknown>;
    if (typeof r.detail === 'string') return r.detail;
    const nonField = r.non_field_errors;
    if (Array.isArray(nonField) && typeof nonField[0] === 'string') return nonField[0];
    for (const value of Object.values(r)) {
      if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
    }
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
};

const feasibilityColor = (status: PlanRoadmap['feasibility']['status']) => {
  if (status === 'safe') return '#059669';
  if (status === 'aggressive') return '#D97706';
  return '#E11D48';
};

export const PlanSelectorModal: React.FC<PlanSelectorModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialWeight = 77.0,
  dismissible = true,
}) => {
  const [step, setStep] = useState(0);
  const [path, setPath] = useState<'blueprint' | 'custom'>('blueprint');
  const [mode, setMode] = useState<JourneyMode>('CUT');

  // Blueprint fetch state
  const [blueprints, setBlueprints] = useState<Blueprint[] | null>(null);
  const [blueprintsLoading, setBlueprintsLoading] = useState(false);
  const [blueprintsError, setBlueprintsError] = useState<string | null>(null);
  const [selectedBlueprintSlug, setSelectedBlueprintSlug] = useState<string | null>(null);

  // Details form state
  const [durationDays, setDurationDays] = useState<number>(60);
  const [daysPerWeek, setDaysPerWeek] = useState<number>(4);
  const [weekdays, setWeekdays] = useState<number[]>(defaultWeekdaysFor(4));
  const [currentWeight, setCurrentWeight] = useState<number>(initialWeight);
  const [goalWeight, setGoalWeight] = useState<number | undefined>(undefined);
  const [heightCm, setHeightCm] = useState<number>(175);
  const [age, setAge] = useState<number>(28);
  const [sex, setSex] = useState<'MALE' | 'FEMALE'>('MALE');

  // Roadmap preview state
  const [roadmap, setRoadmap] = useState<PlanRoadmap | null>(null);
  const [roadmapLoading, setRoadmapLoading] = useState(false);
  const [roadmapError, setRoadmapError] = useState<string | null>(null);
  const [roadmapTab, setRoadmapTab] = useState<'workouts' | 'meals' | 'targets'>('workouts');
  const [roadmapAttempt, setRoadmapAttempt] = useState(0);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset the wizard to a fresh first step each time the modal is (re)opened.
  useEffect(() => {
    if (isOpen) {
      setStep(0);
      setError(null);
      setRoadmap(null);
      setRoadmapError(null);
      setCurrentWeight(initialWeight);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Close on Escape only if dismissible
  useEffect(() => {
    if (!isOpen || !dismissible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, dismissible, onClose]);

  // Fetch blueprints once, when the "ready-made plan" mode-selection step is reached.
  useEffect(() => {
    if (!isOpen || step !== 1 || path !== 'blueprint') return;
    if (blueprints || blueprintsLoading) return;

    let cancelled = false;
    setBlueprintsLoading(true);
    setBlueprintsError(null);
    api
      .getBlueprints()
      .then((data) => {
        if (cancelled) return;
        setBlueprints(data.blueprints);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setBlueprintsError(extractApiError(err, 'Failed to load blueprints.'));
      })
      .finally(() => {
        if (!cancelled) setBlueprintsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, step, path, blueprints, blueprintsLoading]);

  const buildPlanRequest = (): PlanRequest => ({
    blueprint_slug: path === 'blueprint' ? selectedBlueprintSlug || undefined : undefined,
    mode: path === 'custom' ? mode : undefined,
    duration_days: durationDays,
    days_per_week: daysPerWeek,
    weekdays,
    current_weight_kg: currentWeight,
    goal_weight_kg: goalWeight,
    height_cm: heightCm,
    age,
    sex,
  });

  // Fetch (or re-fetch, via roadmapAttempt) the roadmap preview when the preview step is reached.
  useEffect(() => {
    if (!isOpen || step !== 3) return;

    let cancelled = false;
    setRoadmapLoading(true);
    setRoadmapError(null);
    api
      .previewPlan(buildPlanRequest())
      .then((data) => {
        if (cancelled) return;
        setRoadmap(data);
        setRoadmapTab('workouts');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setRoadmapError(extractApiError(err, 'Failed to build a preview for this plan.'));
      })
      .finally(() => {
        if (!cancelled) setRoadmapLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, step, roadmapAttempt]);

  const goalDeltaTooLarge = useMemo(() => {
    if ((mode !== 'FOCUS' && mode !== 'HABIT') || goalWeight == null) return false;
    return Math.abs(goalWeight - currentWeight) > 2;
  }, [mode, goalWeight, currentWeight]);

  const weekdayCountMismatch = weekdays.length !== daysPerWeek;

  const detailsValid =
    durationDays >= MIN_PLAN_DAYS &&
    durationDays <= MAX_PLAN_DAYS &&
    daysPerWeek >= 3 &&
    daysPerWeek <= 6 &&
    !weekdayCountMismatch &&
    currentWeight > 0 &&
    heightCm > 0 &&
    age > 0 &&
    !goalDeltaTooLarge;

  if (!isOpen) return null;

  const toggleWeekday = (value: number) => {
    setWeekdays((prev) => (prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value].sort((a, b) => a - b)));
  };

  const selectMode = (m: JourneyMode) => {
    setMode(m);
    setSelectedBlueprintSlug(null);
    setDurationDays(MODE_CONFIG[m].defaultDays);
    if ((m === 'FOCUS' || m === 'HABIT') && goalWeight != null) {
      setGoalWeight(currentWeight);
    }
  };

  const selectBlueprint = (bp: Blueprint) => {
    setMode(bp.mode);
    setSelectedBlueprintSlug(bp.slug);
    setDurationDays(bp.default_duration_days);
    setDaysPerWeek(bp.default_days_per_week);
    setWeekdays(defaultWeekdaysFor(bp.default_days_per_week));
  };

  const goBack = () => {
    if (step > 0) {
      setStep(step - 1);
    } else if (dismissible) {
      onClose();
    }
  };

  const goNext = () => {
    setError(null);
    if (step === 1) {
      if (path === 'blueprint' && !selectedBlueprintSlug) {
        setError('Pick a ready-made plan to continue.');
        return;
      }
    }
    if (step === 2 && !detailsValid) {
      if (weekdayCountMismatch) {
        setError(`Select exactly ${daysPerWeek} workout day${daysPerWeek === 1 ? '' : 's'} to match your chosen frequency.`);
      } else if (goalDeltaTooLarge) {
        setError('For Focus/Habit plans, goal weight must stay within 2kg of your current weight.');
      } else {
        setError('Please fill in your stats before continuing.');
      }
      return;
    }
    setStep(step + 1);
  };

  const handleStart = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await api.createPlan(buildPlanRequest());
      onSuccess();
      onClose();
    } catch (err: unknown) {
      console.error(err);
      setError(extractApiError(err, 'Failed to start plan. Please check your inputs.'));
    } finally {
      setSubmitting(false);
    }
  };

  const daysPerWeekOptions = [3, 4, 5, 6];
  const durationPresets = [21, 30, 60, 90];

  return (
    <div className={styles.overlay} onClick={dismissible ? onClose : undefined}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            {!dismissible && (
              <span className={`${styles.bpModeBadge} ${styles.initialBadge}`}>
                INITIAL JOURNEY SETUP
              </span>
            )}
            <h2 className={styles.title}>
              {dismissible ? 'Build Your Guided Plan' : 'Welcome to FitLog — Build Your Plan'}
            </h2>
            <p className={styles.subtitle}>
              {dismissible
                ? 'Pick a path, choose your mode, and preview the full roadmap before you commit.'
                : 'Choose a ready-made plan or build your own, then preview the roadmap before it starts calibrating your tracking.'}
            </p>
          </div>
          {dismissible && (
            <button className={styles.closeBtn} onClick={onClose} aria-label="Close modal">
              <X size={20} />
            </button>
          )}
        </div>

        {/* Step progress indicator */}
        <div className={styles.stepRow}>
          {STEP_LABELS.map((label, idx) => (
            <div key={label} className={styles.stepItem}>
              <span
                className={`${styles.stepDot} ${idx === step ? styles.stepDotActive : ''} ${idx < step ? styles.stepDotDone : ''}`}
              >
                {idx < step ? <CheckCircle2 size={13} /> : idx + 1}
              </span>
              <span className={`${styles.stepLabel} ${idx === step ? styles.stepLabelActive : ''}`}>{label}</span>
              {idx < STEP_LABELS.length - 1 && <span className={styles.stepConnector} />}
            </div>
          ))}
        </div>

        {/* Content Body */}
        <div className={styles.body}>
          {error && (
            <div className={styles.errorNote}>
              <AlertCircle size={15} /> {error}
            </div>
          )}

          {/* Step 0: path choice */}
          {step === 0 && (
            <div className={styles.pathGrid}>
              <div
                className={`${styles.pathCard} ${path === 'blueprint' ? styles.pathCardSelected : ''}`}
                onClick={() => setPath('blueprint')}
              >
                <Sparkles size={22} color="#059669" />
                <div className={styles.pathTitle}>Use a ready-made plan</div>
                <div className={styles.pathDesc}>
                  Pick one of our tested blueprints — training split, nutrition, and pacing already dialed in.
                </div>
              </div>
              <div
                className={`${styles.pathCard} ${path === 'custom' ? styles.pathCardSelected : ''}`}
                onClick={() => setPath('custom')}
              >
                <Wrench size={22} color="#0EA5E9" />
                <div className={styles.pathTitle}>Build my own</div>
                <div className={styles.pathDesc}>
                  Choose your mode, duration, and schedule yourself — we calculate the targets around it.
                </div>
              </div>
            </div>
          )}

          {/* Step 1: mode / blueprint selection */}
          {step === 1 && path === 'blueprint' && (
            <>
              {blueprintsLoading && (
                <div className={styles.blueprintsGrid}>
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className={`skeleton ${styles.blueprintSkeleton}`} />
                  ))}
                </div>
              )}
              {!blueprintsLoading && blueprintsError && (
                <div className={styles.errorNote}>
                  <AlertCircle size={15} /> {blueprintsError}
                  <button
                    type="button"
                    className={styles.retryBtn}
                    onClick={() => {
                      setBlueprints(null);
                      setBlueprintsError(null);
                    }}
                  >
                    Retry
                  </button>
                </div>
              )}
              {!blueprintsLoading && !blueprintsError && blueprints && (
                <div className={styles.blueprintsGrid}>
                  {blueprints.map((bp) => {
                    const cfg = MODE_CONFIG[bp.mode];
                    const Icon = cfg.icon;
                    const isSelected = selectedBlueprintSlug === bp.slug;
                    return (
                      <div
                        key={bp.slug}
                        className={`${styles.blueprintCard} ${isSelected ? styles.blueprintCardSelected : ''}`}
                        onClick={() => selectBlueprint(bp)}
                      >
                        <div className={styles.bpHeader}>
                          <span className={styles.bpModeBadge} style={{ background: `${cfg.color}15`, color: cfg.color }}>
                            <Icon size={13} /> {cfg.label}
                          </span>
                          <span className={styles.bpDuration}>{bp.default_duration_days} Days</span>
                        </div>
                        <div>
                          <div className={styles.bpName}>{bp.name}</div>
                          <div className={styles.bpDesc}>{bp.description}</div>
                        </div>
                        <div className={styles.bpFooter}>
                          {bp.default_days_per_week}x/week &middot; {bp.pacing_kg_per_week > 0 ? '+' : ''}
                          {bp.pacing_kg_per_week} kg/week
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {step === 1 && path === 'custom' && (
            <div className={styles.formGroup}>
              <label className={styles.label}>Select Mode</label>
              <div className={styles.modePills}>
                {MODE_ORDER.map((m) => {
                  const cfg = MODE_CONFIG[m];
                  const Icon = cfg.icon;
                  return (
                    <button
                      key={m}
                      type="button"
                      className={`${styles.modePill} ${mode === m ? styles.modePillSelected : ''}`}
                      onClick={() => selectMode(m)}
                    >
                      <Icon size={15} color={cfg.color} /> {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: details form */}
          {step === 2 && (
            <>
              <div className={styles.formGroup}>
                <label className={styles.label}>Plan Length (Days)</label>
                <div className={styles.durationPresets}>
                  {durationPresets.map((d) => (
                    <button
                      key={d}
                      type="button"
                      className={`${styles.durationPresetBtn} ${durationDays === d ? styles.durationPresetBtnActive : ''}`}
                      onClick={() => setDurationDays(d)}
                    >
                      {d} Days
                    </button>
                  ))}
                  <input
                    type="number"
                    min={MIN_PLAN_DAYS}
                    max={MAX_PLAN_DAYS}
                    className={`${styles.input} ${styles.durationCustomInput}`}
                    value={durationDays || ''}
                    onChange={(e) => setDurationDays(parseInt(e.target.value) || 0)}
                  />
                </div>
                <small className={styles.inputHelpText}>
                  Any length from {MIN_PLAN_DAYS} to {MAX_PLAN_DAYS} days.
                </small>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Workout Days / Week</label>
                <div className={styles.modePills}>
                  {daysPerWeekOptions.map((d) => (
                    <button
                      key={d}
                      type="button"
                      className={`${styles.durationPresetBtn} ${daysPerWeek === d ? styles.durationPresetBtnActive : ''}`}
                      onClick={() => {
                        setDaysPerWeek(d);
                        setWeekdays(defaultWeekdaysFor(d));
                      }}
                    >
                      {d}x/week
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Which Days</label>
                <div className={styles.weekdayRow}>
                  {WEEKDAYS.map((w) => (
                    <button
                      key={w.value}
                      type="button"
                      className={`${styles.weekdayBtn} ${weekdays.includes(w.value) ? styles.weekdayBtnSelected : ''}`}
                      onClick={() => toggleWeekday(w.value)}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
                <small className={weekdayCountMismatch ? styles.warningText : styles.inputHelpText}>
                  {weekdays.length} of {daysPerWeek} selected
                  {weekdayCountMismatch ? ` — select exactly ${daysPerWeek}.` : '.'}
                </small>
              </div>

              <div className={styles.inputRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Current Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    className={styles.input}
                    value={currentWeight}
                    onChange={(e) => setCurrentWeight(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Goal Weight (kg, optional)</label>
                  <input
                    type="number"
                    step="0.1"
                    className={styles.input}
                    value={goalWeight ?? ''}
                    onChange={(e) => setGoalWeight(e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                </div>
              </div>

              <div className={styles.inputRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Height (cm)</label>
                  <input
                    type="number"
                    className={styles.input}
                    value={heightCm}
                    onChange={(e) => setHeightCm(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Age</label>
                  <input
                    type="number"
                    className={styles.input}
                    value={age}
                    onChange={(e) => setAge(parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Sex</label>
                <div className={styles.modePills}>
                  {(['MALE', 'FEMALE'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`${styles.durationPresetBtn} ${sex === s ? styles.durationPresetBtnActive : ''}`}
                      onClick={() => setSex(s)}
                    >
                      {s === 'MALE' ? 'Male' : 'Female'}
                    </button>
                  ))}
                </div>
              </div>

              {goalDeltaTooLarge && (
                <div className={styles.warningText}>
                  <AlertTriangle size={13} /> Focus/Habit plans keep goal weight within 2kg of your current weight.
                </div>
              )}

              <div className={styles.archiveNote}>
                <strong>Safe Plan Transition:</strong> Switching plans will automatically archive your previous journey
                program. All your historical workouts, weigh-ins, personal records, and measurements remain fully
                preserved and available in your analytics.
              </div>
            </>
          )}

          {/* Step 3: roadmap preview */}
          {step === 3 && (
            <>
              {roadmapLoading && (
                <div className={styles.roadmapSkeletonWrap}>
                  <div className={`skeleton ${styles.roadmapSkeletonLine}`} />
                  <div className={`skeleton ${styles.roadmapSkeletonLine}`} />
                  <div className={`skeleton ${styles.roadmapSkeletonBlock}`} />
                </div>
              )}

              {!roadmapLoading && roadmapError && (
                <div className={styles.errorNote}>
                  <AlertCircle size={15} /> {roadmapError}
                  <button type="button" className={styles.retryBtn} onClick={() => setRoadmapAttempt((a) => a + 1)}>
                    Retry
                  </button>
                </div>
              )}

              {!roadmapLoading && !roadmapError && roadmap && (
                <>
                  <div className={styles.roadmapSummary}>
                    {roadmap.summary.duration_days} days &middot; {roadmap.summary.workouts_per_week} workouts/week
                    &middot; {roadmap.summary.start_weight_kg} &rarr;{' '}
                    {roadmap.summary.goal_weight_kg ?? roadmap.summary.start_weight_kg} kg &middot;{' '}
                    {roadmap.summary.daily_calories} kcal/day
                  </div>

                  <div
                    className={styles.feasibilityBadge}
                    style={{
                      background: `${feasibilityColor(roadmap.feasibility.status)}15`,
                      color: feasibilityColor(roadmap.feasibility.status),
                      borderColor: `${feasibilityColor(roadmap.feasibility.status)}40`,
                    }}
                  >
                    <Gauge size={14} />
                    <div>
                      <div className={styles.feasibilityStatus}>{roadmap.feasibility.status.toUpperCase()}</div>
                      <div className={styles.feasibilityMessage}>{roadmap.feasibility.message}</div>
                    </div>
                  </div>

                  {roadmap.warnings.length > 0 && (
                    <div className={styles.warningsList}>
                      {roadmap.warnings.map((w, i) => (
                        <div key={i} className={styles.warningText}>
                          <AlertTriangle size={13} /> {w}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Phase timeline */}
                  <div className={styles.phaseTimeline}>
                    {roadmap.phases.map((phase) => {
                      const span = phase.end_day - phase.start_day + 1;
                      const pct = (span / roadmap.summary.duration_days) * 100;
                      return (
                        <div key={phase.name} className={styles.phaseSegment} style={{ flexGrow: pct || 1 }}>
                          <div className={styles.phaseSegmentBar} />
                          <div className={styles.phaseSegmentLabel}>
                            {phase.name} <span>Day {phase.start_day}-{phase.end_day}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Tabs */}
                  <div className={styles.tabRow}>
                    <button
                      className={`${styles.tabBtn} ${roadmapTab === 'workouts' ? styles.tabBtnActive : ''}`}
                      onClick={() => setRoadmapTab('workouts')}
                    >
                      <Dumbbell size={14} /> Workouts
                    </button>
                    <button
                      className={`${styles.tabBtn} ${roadmapTab === 'meals' ? styles.tabBtnActive : ''}`}
                      onClick={() => setRoadmapTab('meals')}
                    >
                      <Utensils size={14} /> Meals
                    </button>
                    <button
                      className={`${styles.tabBtn} ${roadmapTab === 'targets' ? styles.tabBtnActive : ''}`}
                      onClick={() => setRoadmapTab('targets')}
                    >
                      <Gauge size={14} /> Targets
                    </button>
                  </div>

                  {roadmapTab === 'workouts' && (
                    <div className={styles.roadmapScrollList}>
                      {roadmap.days
                        .filter((d) => !d.is_rest)
                        .map((day) => (
                          <div key={day.day_number} className={styles.dayCard}>
                            <div className={styles.dayCardHeader}>
                              <strong>Day {day.day_number}</strong>
                              <span className={styles.bpDuration}>{day.phase}</span>
                            </div>
                            {day.workout?.map((ex, i) => (
                              <div key={i} className={styles.exerciseRow}>
                                <span className={styles.exerciseName}>{ex.exercise_name}</span>
                                <span className={styles.exerciseMeta}>
                                  {ex.sets}&times;{ex.reps}
                                  {ex.rpe ? ` @RPE ${ex.rpe}` : ''} &middot; {ex.rest_seconds}s rest
                                </span>
                                {ex.progression_rule && (
                                  <span className={styles.exerciseProgression}>{ex.progression_rule}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        ))}
                    </div>
                  )}

                  {roadmapTab === 'meals' && (
                    <div className={styles.mealsGrid}>
                      {Object.entries(roadmap.meal_template).map(([slot, meal]) => (
                        <div key={slot} className={styles.mealCard}>
                          <div className={styles.mealSlotName}>{slot}</div>
                          <div className={styles.bpDuration}>
                            {meal.kcal} kcal &middot; {meal.protein_g}g protein &middot; {meal.fat_g}g fat
                          </div>
                          <div className={styles.mealFoods}>{meal.sample_foods.join(', ')}</div>
                          {meal.swap_options.length > 0 && (
                            <div className={styles.mealSwaps}>Swaps: {meal.swap_options.join(', ')}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {roadmapTab === 'targets' && (
                    <div className={styles.targetsGrid}>
                      <div className={styles.targetCard}>
                        <div className={styles.mealSlotName}>Training Day</div>
                        <div className={styles.targetRow}>Calories: {roadmap.targets.training_day.daily_calories}</div>
                        <div className={styles.targetRow}>Protein: {roadmap.targets.training_day.protein_g}g</div>
                        <div className={styles.targetRow}>Carbs: {roadmap.targets.training_day.carbs_g}g</div>
                        <div className={styles.targetRow}>Fat: {roadmap.targets.training_day.fat_g}g</div>
                      </div>
                      <div className={styles.targetCard}>
                        <div className={styles.mealSlotName}>Rest Day</div>
                        <div className={styles.targetRow}>Calories: {roadmap.targets.rest_day.daily_calories}</div>
                        <div className={styles.targetRow}>Protein: {roadmap.targets.rest_day.protein_g}g</div>
                        <div className={styles.targetRow}>Carbs: {roadmap.targets.rest_day.carbs_g}g</div>
                        <div className={styles.targetRow}>Fat: {roadmap.targets.rest_day.fat_g}g</div>
                      </div>
                    </div>
                  )}

                  <div className={styles.archiveNote}>
                    <strong>Safe Plan Transition:</strong> Switching plans will automatically archive your previous
                    journey program. All your historical workouts, weigh-ins, personal records, and measurements
                    remain fully preserved and available in your analytics.
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <div className={styles.footerLeft}>
            {(step > 0 || dismissible) && (
              <button className={styles.cancelBtn} onClick={goBack} disabled={submitting}>
                <ArrowLeft size={14} /> {step === 0 ? 'Cancel' : 'Back'}
              </button>
            )}
          </div>
          <div className={styles.footerRight}>
            {step < 3 && (
              <button className={styles.submitBtn} onClick={goNext}>
                Next <ArrowRight size={15} />
              </button>
            )}
            {step === 3 && (
              <>
                <button className={styles.cancelBtn} onClick={() => setStep(2)} disabled={submitting}>
                  Edit
                </button>
                <button
                  className={styles.submitBtn}
                  onClick={handleStart}
                  disabled={submitting || roadmapLoading || !roadmap}
                >
                  <Play size={15} /> {submitting ? 'Starting Plan...' : 'Start This Plan'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
