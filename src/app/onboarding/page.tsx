'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Dumbbell,
  Flame,
  Scale,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/lib/authContext';
import { api } from '@/lib/api';
import { onboardingSkipKey } from '@/lib/onboarding';
import { JourneyMode } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import styles from './onboarding.module.css';

interface BlueprintOption {
  id: string;
  name: string;
  mode: JourneyMode;
  modeLabel: string;
  color: string;
  Icon: typeof Flame;
  durationDays: number;
  description: string;
  pacing: string;
  targetDeltaKg: number;
  matchingGoal: string;
}

const BLUEPRINTS: BlueprintOption[] = [
  {
    id: 'CUT_60',
    name: '60-Day Recomp & Shred',
    mode: 'CUT',
    modeLabel: 'Cut',
    color: '#EF4444',
    Icon: Flame,
    durationDays: 60,
    description: 'Strip body fat and reveal muscle definition while locking in compound anchor strength.',
    pacing: '-0.5 kg / week',
    targetDeltaKg: -4.3,
    matchingGoal: 'FAT_LOSS',
  },
  {
    id: 'BULK_90',
    name: '90-Day Mass Architecture',
    mode: 'BULK',
    modeLabel: 'Bulk',
    color: '#8B5CF6',
    Icon: Dumbbell,
    durationDays: 90,
    description: 'Clean surplus pacing to maximize hypertrophy without accumulating excess body fat.',
    pacing: '+0.3 kg / week',
    targetDeltaKg: 3.8,
    matchingGoal: 'HYPERTROPHY',
  },
  {
    id: 'FOCUS_30',
    name: '30-Day Strength Peak',
    mode: 'FOCUS',
    modeLabel: 'Focus',
    color: '#0EA5E9',
    Icon: Target,
    durationDays: 30,
    description: 'Heavy compound progression (RPE 8.5–9.5) to break plateaus and set new all-time PRs.',
    pacing: 'Weight neutral',
    targetDeltaKg: 0,
    matchingGoal: 'STRENGTH',
  },
  {
    id: 'HABIT_21',
    name: '21-Day Habit Lock-in',
    mode: 'HABIT',
    modeLabel: 'Habit',
    color: '#F59E0B',
    Icon: Zap,
    durationDays: 21,
    description: '3 full-body sessions per week focused on consistency and building routine momentum.',
    pacing: 'Consistency first',
    targetDeltaKg: 0,
    matchingGoal: 'GENERAL_FITNESS',
  },
];

const SEX_OPTIONS = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
];

const ACTIVITY_OPTIONS = [
  { value: 'SEDENTARY', label: 'Sedentary' },
  { value: 'LIGHT', label: 'Light' },
  { value: 'MODERATE', label: 'Moderate' },
  { value: 'HIGH', label: 'High' },
  { value: 'ATHLETE', label: 'Athlete' },
];

const GOAL_OPTIONS = [
  { value: 'HYPERTROPHY', label: 'Muscle gain' },
  { value: 'FAT_LOSS', label: 'Fat loss' },
  { value: 'STRENGTH', label: 'Strength' },
  { value: 'ENDURANCE', label: 'Endurance' },
  { value: 'GENERAL_FITNESS', label: 'General fitness' },
];

const WORKOUT_OPTIONS = [2, 3, 4, 5, 6];

function dobFromAge(age: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - age);
  return d.toISOString().split('T')[0];
}

function ageFromDob(dob?: string | null): string {
  if (!dob) return '';
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (now < new Date(now.getFullYear(), birth.getMonth(), birth.getDate())) age -= 1;
  return age > 0 ? String(age) : '';
}

const round1 = (n: number) => Number(n.toFixed(1));

export default function WebOnboardingPage() {
  const router = useRouter();
  const { user, loading, refreshUser } = useAuth();

  const [step, setStep] = useState<0 | 1 | 2>(0);

  // Step 0: Profile
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [sex, setSex] = useState<string>('MALE');
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');

  // Step 1: Goals
  const [goal, setGoal] = useState('HYPERTROPHY');
  const [activity, setActivity] = useState('MODERATE');
  const [workouts, setWorkouts] = useState(4);

  // Step 2: Plan
  const [selectedPlanId, setSelectedPlanId] = useState('CUT_60');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Guard: if unauthenticated, redirect to /login
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  // Pre-fill existing user info if available
  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      if (user.profile?.sex) setSex(user.profile.sex);
      if (user.profile?.date_of_birth) setAge(ageFromDob(user.profile.date_of_birth));
      if (user.profile?.height_cm) setHeight(String(user.profile.height_cm));
      if (user.profile?.weight_kg) setWeight(String(user.profile.weight_kg));
      if (user.profile?.fitness_goal) setGoal(user.profile.fitness_goal);
      if (user.profile?.activity_level) setActivity(user.profile.activity_level);
    }
  }, [user]);

  const recommendedPlanId = useMemo(() => {
    if (goal === 'FAT_LOSS') return 'CUT_60';
    if (goal === 'HYPERTROPHY') return 'BULK_90';
    if (goal === 'STRENGTH') return 'FOCUS_30';
    return 'HABIT_21';
  }, [goal]);

  const ageVal = age ? Number(age) : null;
  const heightVal = height ? Number(height) : null;
  const weightVal = weight ? Number(weight) : null;

  const validateStep0 = () => {
    const next: Record<string, string> = {};
    if (!sex) next.sex = 'Please select biological sex';
    if (ageVal == null || isNaN(ageVal) || ageVal < 13 || ageVal > 100) next.age = 'Age must be 13–100';
    if (heightVal == null || isNaN(heightVal) || heightVal < 100 || heightVal > 250) next.height = 'Height must be 100–250 cm';
    if (weightVal == null || isNaN(weightVal) || weightVal < 30 || weightVal > 300) next.weight = 'Weight must be 30–300 kg';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSkip = () => {
    if (user?.id) {
      localStorage.setItem(onboardingSkipKey(user.id), 'true');
    }
    router.push('/app');
  };

  const handleNext = () => {
    if (step === 0) {
      if (validateStep0()) {
        setStep(1);
      }
    } else if (step === 1) {
      setSelectedPlanId(recommendedPlanId);
      setStep(2);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (step === 2) setStep(1);
    else if (step === 1) setStep(0);
  };

  const handleFinish = async () => {
    setSubmitting(true);
    try {
      // 1. Update Profile details
      await api.updateMe({
        first_name: firstName.trim() || undefined,
        last_name: lastName.trim() || undefined,
        profile: {
          sex: sex || undefined,
          date_of_birth: ageVal ? dobFromAge(Math.round(ageVal)) : undefined,
          height_cm: heightVal || undefined,
          weight_kg: weightVal || undefined,
          activity_level: activity,
          fitness_goal: goal,
        },
      });

      // 2. Initial weight log
      if (weightVal && weightVal > 0) {
        await api.logWeight(weightVal);
      }

      // 3. Update Targets & apply recommendations
      try {
        await api.updateTargets({ weekly_workouts: workouts });
        await api.applyRecommendedTargets();
      } catch (targetErr) {
        console.warn('Macro target calibration warning:', targetErr);
      }

      // 4. Start journey plan if chosen
      if (selectedPlanId && selectedPlanId !== 'LATER') {
        const bp = BLUEPRINTS.find((b) => b.id === selectedPlanId);
        if (bp) {
          const calcTarget = weightVal ? round1(weightVal + bp.targetDeltaKg) : undefined;
          await api.startJourney({
            blueprint: bp.id,
            name: bp.name,
            mode: bp.mode,
            duration_days: bp.durationDays,
            start_weight_kg: weightVal || undefined,
            target_weight_kg: calcTarget,
          });
        }
      }

      // 5. Notify app layout & set skip/complete flag
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fitlog:journey-updated'));
        if (user?.id) {
          localStorage.setItem(onboardingSkipKey(user.id), 'true');
        }
      }

      await refreshUser();
      router.push('/app');
    } catch (err: any) {
      console.error('Failed to complete onboarding:', err);
      alert('Unable to complete setup. Please check your network and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user) {
    return <div className="full-page-loader">Loading...</div>;
  }

  const userDisplayName = firstName.trim() || user?.first_name?.trim();

  const stepSubtitles = [
    'Step 1 of 3: Profile & Measurements',
    'Step 2 of 3: Fitness Goals & Routine',
    'Step 3 of 3: Choose Starting Plan',
  ];

  return (
    <div className={styles.shell}>
      <div className={styles.container}>
        {/* Brand Logo */}
        <div className={styles.logoRow}>
          <div className={styles.logoIcon}>
            <Dumbbell size={22} color="#FFFFFF" strokeWidth={2.5} />
          </div>
          <span>FIT<span className={styles.logoMark}>LOG</span></span>
        </div>

        <div className={styles.card}>
          {/* Header row with Skip Button */}
          <div className={styles.headerRow}>
            <div>
              <h1 className={styles.title}>
                {userDisplayName ? `Welcome, ${userDisplayName}` : 'Welcome to FitLog'}
              </h1>
              <p className={styles.subtitle}>{stepSubtitles[step]}</p>
            </div>

            <button
              type="button"
              onClick={handleSkip}
              className={styles.skipBtn}
              title="Skip setup for now"
            >
              Skip
              <ChevronRight size={15} />
            </button>
          </div>

          {/* Progress Bar & Step Badges */}
          <div className={styles.progressTrack}>
            <div
              className={styles.progressBar}
              style={{ width: `${step === 0 ? 33 : step === 1 ? 66 : 100}%` }}
            />
          </div>

          <div className={styles.stepsRow}>
            <span className={`${styles.stepPill} ${step >= 0 ? styles.stepPillActive : ''}`}>
              1. Profile
            </span>
            <div className={styles.stepDivider} />
            <span className={`${styles.stepPill} ${step >= 1 ? styles.stepPillActive : ''}`}>
              2. Goals
            </span>
            <div className={styles.stepDivider} />
            <span className={`${styles.stepPill} ${step >= 2 ? styles.stepPillActive : ''}`}>
              3. Plan
            </span>
          </div>

          {/* STEP 0: PROFILE & MEASUREMENTS */}
          {step === 0 && (
            <div>
              <h2 className={styles.sectionHeading}>Tell us about yourself</h2>
              <p className={styles.sectionDesc}>
                We use these baseline measurements to calibrate your metabolic rate, target macros, and volume.
              </p>

              <div className={styles.formGrid}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>First Name</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Alex"
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Last Name</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="e.g. Miller"
                  />
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>Biological Sex</label>
                <div className={styles.chipGrid}>
                  {SEX_OPTIONS.map((opt) => (
                    <button
                      type="button"
                      key={opt.value}
                      className={`${styles.chipBtn} ${sex === opt.value ? styles.chipBtnActive : ''}`}
                      onClick={() => setSex(opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {errors.sex && <span className={styles.fieldError}>{errors.sex}</span>}
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>Age</label>
                <input
                  type="number"
                  className={`${styles.input} ${errors.age ? styles.inputError : ''}`}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="e.g. 26"
                  min="13"
                  max="100"
                />
                {errors.age && <span className={styles.fieldError}>{errors.age}</span>}
              </div>

              <div className={styles.formGrid}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Height (cm)</label>
                  <input
                    type="number"
                    step="0.5"
                    className={`${styles.input} ${errors.height ? styles.inputError : ''}`}
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    placeholder="178"
                    min="100"
                    max="250"
                  />
                  {errors.height && <span className={styles.fieldError}>{errors.height}</span>}
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Weight (kg)</label>
                  <input
                    type="number"
                    step="0.5"
                    className={`${styles.input} ${errors.weight ? styles.inputError : ''}`}
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="75.0"
                    min="30"
                    max="300"
                  />
                  {errors.weight && <span className={styles.fieldError}>{errors.weight}</span>}
                </div>
              </div>
            </div>
          )}

          {/* STEP 1: GOALS & ACTIVITY */}
          {step === 1 && (
            <div>
              <h2 className={styles.sectionHeading}>Your goals & routine</h2>
              <p className={styles.sectionDesc}>
                Set your primary training focus so we can tailor weekly workout schedules and nutritional pacing.
              </p>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>Primary Fitness Goal</label>
                <div className={styles.chipGrid}>
                  {GOAL_OPTIONS.map((g) => (
                    <button
                      type="button"
                      key={g.value}
                      className={`${styles.chipBtn} ${goal === g.value ? styles.chipBtnActive : ''}`}
                      onClick={() => setGoal(g.value)}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>Daily Activity Level (outside training)</label>
                <div className={styles.chipGrid}>
                  {ACTIVITY_OPTIONS.map((a) => (
                    <button
                      type="button"
                      key={a.value}
                      className={`${styles.chipBtn} ${activity === a.value ? styles.chipBtnActive : ''}`}
                      onClick={() => setActivity(a.value)}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>Planned Workouts Per Week</label>
                <div className={styles.chipGrid}>
                  {WORKOUT_OPTIONS.map((num) => (
                    <button
                      type="button"
                      key={num}
                      className={`${styles.chipBtn} ${workouts === num ? styles.chipBtnActive : ''}`}
                      onClick={() => setWorkouts(num)}
                    >
                      {num}× sessions
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: CHOOSE PLAN */}
          {step === 2 && (
            <div>
              <h2 className={styles.sectionHeading}>Choose your starting plan</h2>
              <p className={styles.sectionDesc}>
                Select the structured blueprint you will be working towards. You can switch or adjust your plan anytime.
              </p>

              <div className={styles.bpList}>
                {BLUEPRINTS.map((bp) => {
                  const isSelected = selectedPlanId === bp.id;
                  const isRecommended = bp.id === recommendedPlanId;
                  const projectedWeight =
                    weightVal && bp.targetDeltaKg !== 0 ? round1(weightVal + bp.targetDeltaKg) : null;

                  return (
                    <div
                      key={bp.id}
                      className={`${styles.bpCard} ${isSelected ? styles.bpCardSelected : ''}`}
                      onClick={() => setSelectedPlanId(bp.id)}
                      role="radio"
                      aria-checked={isSelected}
                    >
                      <div className={styles.bpTopRow}>
                        <div className={styles.bpBadgeRow}>
                          <span
                            className={styles.bpModeBadge}
                            style={{
                              backgroundColor: `${bp.color}22`,
                              color: bp.color,
                            }}
                          >
                            <bp.Icon size={13} color={bp.color} />
                            {bp.modeLabel}
                          </span>
                          <span className={styles.bpDurationBadge}>
                            <Clock size={12} />
                            {bp.durationDays} days
                          </span>
                        </div>

                        <div className={styles.bpRightRow}>
                          {isRecommended && (
                            <span className={styles.recommendedBadge}>
                              <Sparkles size={12} />
                              Recommended
                            </span>
                          )}
                          <div className={`${styles.radioCircle} ${isSelected ? styles.radioCircleActive : ''}`}>
                            {isSelected && <Check size={14} strokeWidth={3} />}
                          </div>
                        </div>
                      </div>

                      <div className={styles.bpTitle}>{bp.name}</div>
                      <p className={styles.bpDesc}>{bp.description}</p>

                      <div className={styles.bpFooterRow}>
                        <span className={styles.bpPacing}>Pacing: {bp.pacing}</span>
                        {projectedWeight ? (
                          <span className={styles.bpTargetWeight}>
                            Target ~{projectedWeight} kg ({bp.targetDeltaKg > 0 ? `+${bp.targetDeltaKg}` : bp.targetDeltaKg} kg)
                          </span>
                        ) : (
                          <span className={styles.bpTargetWeight}>Target: Performance & Routine</span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Option to choose plan later */}
                <div
                  className={`${styles.bpLaterCard} ${selectedPlanId === 'LATER' ? styles.bpCardSelected : ''}`}
                  onClick={() => setSelectedPlanId('LATER')}
                  role="radio"
                  aria-checked={selectedPlanId === 'LATER'}
                >
                  <div>
                    <div className={styles.bpLaterTitle}>I&apos;ll choose a plan later</div>
                    <div className={styles.bpLaterDesc}>
                      Finish setting up profile now and choose or build a routine later in the Workouts tab.
                    </div>
                  </div>
                  <div className={`${styles.radioCircle} ${selectedPlanId === 'LATER' ? styles.radioCircleActive : ''}`}>
                    {selectedPlanId === 'LATER' && <Check size={14} strokeWidth={3} />}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Row */}
          <div className={styles.actionRow}>
            {step > 0 && (
              <Button
                variant="secondary"
                size="lg"
                onClick={handleBack}
                className={styles.backBtn}
              >
                <ChevronLeft size={18} />
                Back
              </Button>
            )}

            <Button
              variant="primary"
              size="lg"
              onClick={handleNext}
              disabled={submitting}
              className={styles.submitBtn}
            >
              {submitting
                ? 'Saving setup...'
                : step === 0
                ? 'Continue'
                : step === 1
                ? 'Next: Choose Plan'
                : selectedPlanId === 'LATER'
                ? 'Finish Setup'
                : 'Start Plan & Go to Dashboard'}
              {step < 2 ? <ArrowRight size={18} /> : <Check size={18} />}
            </Button>
          </div>

          {/* Bottom Skip Link */}
          <div className={styles.skipFooterWrapper}>
            <button
              type="button"
              onClick={handleSkip}
              className={styles.skipFooterLink}
            >
              Skip setup for now (you can fill this anytime in Settings)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
