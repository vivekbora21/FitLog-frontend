'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { useAuth } from '@/lib/authContext';
import { Blueprint, JourneyMode, PlanRequest, PlanRoadmap, TrainingSplit } from '@/lib/types';
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

/** Mirrors the backend's conservative first-goal guard for blueprint defaults. */
const conservativeGoalWeight = (mode: JourneyMode, currentWeight: number, height: number, duration: number, pacing?: number) => {
  if (currentWeight <= 0) return undefined;
  const direction = mode === 'CUT' || mode === 'RECOMP' ? -1 : mode === 'BULK' ? 1 : 0;
  if (direction === 0) return Math.round(currentWeight * 10) / 10;
  const pace = Math.abs(pacing ?? (mode === 'BULK' ? 0.75 : 0.75));
  const change = Math.min(pace * (duration / 7), currentWeight * 0.1);
  const candidate = currentWeight + direction * change;
  if (direction < 0 && height > 0) {
    const bmiFloor = 18.5 * (height / 100) ** 2;
    return Math.round(Math.max(candidate, bmiFloor) * 10) / 10;
  }
  return Math.round(candidate * 10) / 10;
};

/** Age in whole years from a stored `date_of_birth` (YYYY-MM-DD); undefined if absent/unparseable. */
const ageFromDateOfBirth = (dateOfBirth?: string | null): number | undefined => {
  if (!dateOfBirth) return undefined;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return undefined;
  const now = new Date();
  let years = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) years--;
  return years;
};

/** Backend only stores a date_of_birth, not a raw age, so a manually-entered age is
 * backed into an approximate birth date (Jan 1 of the implied birth year) for storage. */
const dateOfBirthFromAge = (ageYears: number): string => `${new Date().getFullYear() - ageYears}-01-01`;

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
  const { user, refreshUser } = useAuth();

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
  const [splitSlug, setSplitSlug] = useState<string | undefined>(undefined);
  const [trainingSplits, setTrainingSplits] = useState<TrainingSplit[]>([]);
  const [splitsLoading, setSplitsLoading] = useState(false);

  // Roadmap preview state
  const [roadmap, setRoadmap] = useState<PlanRoadmap | null>(null);
  const [roadmapLoading, setRoadmapLoading] = useState(false);
  const [roadmapError, setRoadmapError] = useState<string | null>(null);
  const [roadmapTab, setRoadmapTab] = useState<'workouts' | 'meals' | 'targets'>('workouts');
  const [roadmapAttempt, setRoadmapAttempt] = useState(0);

  const [submitting, setSubmitting] = useState(false);
  const [recommendingGoal, setRecommendingGoal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset the wizard to a fresh first step each time the modal is (re)opened, prefilling
  // height/age/sex from the user's profile when it's already on file.
  useEffect(() => {
    if (isOpen) {
      setStep(0);
      setError(null);
      setRoadmap(null);
      setRoadmapError(null);
      setSplitSlug(undefined);
      const w = initialWeight || 77.0;
      setCurrentWeight(w);
      if (w > 0) {
        const defaultDelta = -0.5 * (60 / 7);
        setGoalWeight(Math.round((w + defaultDelta) * 10) / 10);
      }
      if (user?.profile?.height_cm != null) setHeightCm(user.profile.height_cm);
      const profileAge = ageFromDateOfBirth(user?.profile?.date_of_birth);
      if (profileAge != null) setAge(profileAge);
      if (user?.profile?.sex === 'MALE' || user?.profile?.sex === 'FEMALE') setSex(user.profile.sex);
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
  // The in-flight guard lives in a ref (not state): if it were `blueprintsLoading` state,
  // calling setBlueprintsLoading(true) below would itself change this effect's own
  // dependency, tearing it down (cancelled = true) and re-running it before the fetch
  // resolves - permanently orphaning the request and leaving the UI stuck loading.
  const blueprintsFetchingRef = useRef(false);
  useEffect(() => {
    if (!isOpen || step !== 1 || path !== 'blueprint') return;
    if (blueprints || blueprintsFetchingRef.current) return;

    let cancelled = false;
    blueprintsFetchingRef.current = true;
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
        blueprintsFetchingRef.current = false;
        if (!cancelled) setBlueprintsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, step, path, blueprints]);

  useEffect(() => {
    if (!isOpen || step !== 2) return;
    let cancelled = false;
    setSplitsLoading(true);
    api.getTrainingSplits({ daysPerWeek, equipmentLevel: 'full_gym' })
      .then((data) => {
        if (!cancelled) {
          setTrainingSplits(data.splits);
          setSplitSlug((current) => data.splits.some((split) => split.slug === current) ? current : data.splits[0]?.slug);
        }
      })
      .catch(() => { if (!cancelled) setTrainingSplits([]); })
      .finally(() => { if (!cancelled) setSplitsLoading(false); });
    return () => { cancelled = true; };
  }, [isOpen, step, daysPerWeek]);

  const buildPlanRequest = (): PlanRequest => ({
    blueprint_slug: path === 'blueprint' ? selectedBlueprintSlug || undefined : undefined,
    mode,
    duration_days: durationDays,
    days_per_week: daysPerWeek,
    weekdays,
    current_weight_kg: currentWeight,
    goal_weight_kg: goalWeight,
    height_cm: heightCm,
    age,
    sex,
    split_slug: splitSlug,
    equipment_level: 'full_gym',
    experience: 'INTERMEDIATE',
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

  const needsGoalWeight = mode === 'CUT' || mode === 'BULK';

  const goalDeltaTooLarge = useMemo(() => {
    if ((mode !== 'FOCUS' && mode !== 'HABIT') || goalWeight == null) return false;
    return Math.abs(goalWeight - currentWeight) > 2;
  }, [mode, goalWeight, currentWeight]);

  const goalBelowHealthyBmi = useMemo(() => {
    if (mode !== 'CUT' || goalWeight == null || heightCm <= 0) return false;
    const minimumWeight = 18.5 * (heightCm / 100) ** 2;
    return goalWeight < minimumWeight;
  }, [mode, goalWeight, heightCm]);

  const healthyWeightRange = useMemo(() => {
    if (heightCm <= 0) return null;
    const heightM = heightCm / 100;
    return {
      min: Math.round(18.5 * heightM ** 2 * 10) / 10,
      max: Math.round(24.9 * heightM ** 2 * 10) / 10,
    };
  }, [heightCm]);

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
    !goalDeltaTooLarge &&
    !goalBelowHealthyBmi &&
    (!needsGoalWeight || goalWeight != null);

  if (!isOpen) return null;

  const toggleWeekday = (value: number) => {
    setWeekdays((prev) => (prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value].sort((a, b) => a - b)));
  };

  const selectMode = (m: JourneyMode) => {
    setMode(m);
    setSelectedBlueprintSlug(null);
    const days = MODE_CONFIG[m].defaultDays;
    setDurationDays(days);
    if (m === 'CUT' && currentWeight > 0) {
      const delta = -0.5 * (days / 7);
      setGoalWeight(Math.round((currentWeight + delta) * 10) / 10);
    } else if (m === 'BULK' && currentWeight > 0) {
      const delta = 0.25 * (days / 7);
      setGoalWeight(Math.round((currentWeight + delta) * 10) / 10);
    } else if (m === 'FOCUS' || m === 'HABIT') {
      setGoalWeight(currentWeight);
    }
  };

  const selectBlueprint = (bp: Blueprint) => {
    setMode(bp.mode);
    setSelectedBlueprintSlug(bp.slug);
    setDurationDays(bp.default_duration_days);
    setDaysPerWeek(bp.default_days_per_week);
    setWeekdays(defaultWeekdaysFor(bp.default_days_per_week));
    setGoalWeight(conservativeGoalWeight(
      bp.mode,
      currentWeight,
      heightCm,
      bp.default_duration_days,
      bp.pacing_kg_per_week,
    ));
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
      } else if (needsGoalWeight && goalWeight == null) {
        setError(`${MODE_CONFIG[mode].label} requires a goal weight.`);
      } else {
        setError('Please fill in your stats before continuing.');
      }
      return;
    }
    setStep(step + 1);
  };

  // Best-effort: if the user's profile was missing height/age, persist what they entered
  // here so future plans (and the rest of the app) don't need to ask again. Never blocks
  // or fails plan creation.
  const syncMissingProfileFields = async () => {
    const missingHeight = user?.profile?.height_cm == null;
    const missingDob = !user?.profile?.date_of_birth;
    if (!missingHeight && !missingDob) return;
    try {
      await api.updateMe({
        profile: {
          ...(missingHeight ? { height_cm: heightCm } : {}),
          ...(missingDob ? { date_of_birth: dateOfBirthFromAge(age) } : {}),
        },
      });
      await refreshUser();
    } catch {
      // Profile sync is a convenience, not a requirement for starting the plan.
    }
  };

  const handleStart = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await api.createPlan(buildPlanRequest());
      await syncMissingProfileFields();
      onSuccess();
      onClose();
    } catch (err: unknown) {
      console.error(err);
      setError(extractApiError(err, 'Failed to start plan. Please check your inputs.'));
    } finally {
      setSubmitting(false);
    }
  };

  const daysPerWeekOptions = [2, 3, 4, 5, 6];
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
                        {/* <div className={styles.bpFooter}>
                          {bp.pacing_kg_per_week > 0 ? '+' : ''}
                          {bp.pacing_kg_per_week} kg/week
                        </div> */}
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
                        setSplitSlug(undefined);
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
                  <label className={styles.label}>Goal Weight (kg{needsGoalWeight ? '' : ', optional'})</label>
                  <div className={styles.goalWeightRow}>
                    <input
                      type="number"
                      step="0.1"
                      className={styles.input}
                      value={goalWeight ?? ''}
                      onChange={(e) => setGoalWeight(e.target.value ? parseFloat(e.target.value) : undefined)}
                    />
                    <button
                      type="button"
                      className={styles.recommendBtn}
                      title="Suggest a goal weight at a safe pace for this mode and duration"
                      disabled={recommendingGoal}
                      onClick={async () => {
                        setRecommendingGoal(true);
                        setError(null);
                        try {
                          const { goal_weight_kg } = await api.recommendGoalWeight({
                            mode,
                            current_weight_kg: currentWeight,
                            height_cm: heightCm,
                            duration_days: durationDays,
                          });
                          setGoalWeight(goal_weight_kg);
                        } catch (err: unknown) {
                          setError(extractApiError(err, 'Could not get a recommendation. Please try again.'));
                        } finally {
                          setRecommendingGoal(false);
                        }
                      }}
                    >
                      <Sparkles size={13} /> {recommendingGoal ? 'Thinking…' : 'Recommend'}
                    </button>
                  </div>
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
                  {user?.profile?.height_cm == null && (
                    <small className={styles.inputHelpText}>Not on your profile yet — we&apos;ll save it there.</small>
                  )}
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Age</label>
                  <input
                    type="number"
                    className={styles.input}
                    value={age}
                    onChange={(e) => setAge(parseInt(e.target.value) || 0)}
                  />
                  {!user?.profile?.date_of_birth && (
                    <small className={styles.inputHelpText}>Not on your profile yet — we&apos;ll save it there.</small>
                  )}
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

              {healthyWeightRange && (
                <div className={styles.healthyRangeCard}>
                  <div>
                    <strong>Reference weight range</strong>
                    <span>
                      For {heightCm} cm, age {age}, and {sex === 'MALE' ? 'male' : 'female'} profile data, the standard adult BMI screening range (18.5–24.9) is approximately{' '}
                      <strong>{healthyWeightRange.min}–{healthyWeightRange.max} kg</strong>.
                    </span>
                  </div>
                  {(currentWeight < healthyWeightRange.min || currentWeight > healthyWeightRange.max) && (
                    <div className={styles.warningText}>
                      <AlertTriangle size={13} /> Current weight is outside this reference range.
                    </div>
                  )}
                  {goalWeight != null && (goalWeight < healthyWeightRange.min || goalWeight > healthyWeightRange.max) && (
                    <div className={styles.warningText}>
                      <AlertTriangle size={13} /> Goal weight is outside this reference range.
                    </div>
                  )}
                  <small>BMI is a screening estimate; it does not account for muscle mass or individual medical factors.</small>
                </div>
              )}

              <div className={styles.formGroup}>
                <label className={styles.label}>Training style</label>
                <small className={styles.inputHelpText}>Approved plans for your selected frequency. Your selection is previewed and validated server-side.</small>
                {splitsLoading ? <div className={`skeleton ${styles.blueprintSkeleton}`} /> : null}
                {!splitsLoading && trainingSplits.length === 0 ? (
                  <div className={styles.warningText}>No approved plan is available for this setup yet. Try another training frequency.</div>
                ) : null}
                {!splitsLoading && trainingSplits.map((split) => (
                  <button
                    key={split.slug}
                    type="button"
                    className={`${styles.blueprintCard} ${splitSlug === split.slug ? styles.blueprintCardSelected : ''}`}
                    onClick={() => setSplitSlug(split.slug)}
                  >
                    <div className={styles.bpHeader}>
                      <span className={styles.bpName}>{split.name}</span>
                      {splitSlug === split.slug && <CheckCircle2 size={16} color="#059669" />}
                    </div>
                    <div className={styles.bpDesc}>{split.description}</div>
                    <div className={styles.bpFooter}>{split.estimated_session_minutes} min · {split.experience_levels.join(', ').toLowerCase()}</div>
                  </button>
                ))}
              </div>

              {goalDeltaTooLarge && (
                <div className={styles.warningText}>
                  <AlertTriangle size={13} /> Focus/Habit plans keep goal weight within 2kg of your current weight.
                </div>
              )}

              {goalBelowHealthyBmi && (
                <div className={styles.warningText}>
                  <AlertTriangle size={13} /> This goal is below the standard healthy BMI floor for your height. Choose a higher target or speak with a clinician before proceeding.
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

                  {(roadmap as any)?.engine?.can_start === false && (
                    <div className={styles.errorNote}>
                      <AlertCircle size={15} />{' '}
                      {(roadmap as any)?.engine?.messages?.find((m: any) => m.severity === 'block')?.params?.detail ||
                        (roadmap as any)?.engine?.messages?.find((m: any) => m.severity === 'block')?.code ||
                        'Cannot start plan with the selected inputs. Please adjust your details.'}
                    </div>
                  )}

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
                  disabled={submitting || roadmapLoading || !roadmap || (roadmap as any)?.engine?.can_start === false}
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
