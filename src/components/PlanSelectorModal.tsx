'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Flame,
  Dumbbell,
  Target,
  Zap,
  Activity,
  CheckCircle2,
  AlertCircle,
  Play,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { api } from '@/lib/api';
import { JourneyMode } from '@/lib/types';
import styles from './PlanSelectorModal.module.css';

interface PlanSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialWeight?: number;
  /** When false, the modal cannot be dismissed without starting a plan (no close button, backdrop click, or Cancel). Used for the mandatory onboarding gate. */
  dismissible?: boolean;
}

interface BlueprintOption {
  id: string;
  name: string;
  mode: JourneyMode;
  modeLabel: string;
  modeColor: string;
  icon: typeof Flame;
  durationDays: number;
  description: string;
  targetRateStr: string;
  targetDeltaKg: number;
}

const BLUEPRINTS: BlueprintOption[] = [
  {
    id: 'CUT_60',
    name: '60-Day Recomp & Shred',
    mode: 'CUT',
    modeLabel: 'Cut Mode',
    modeColor: '#EF4444',
    icon: Flame,
    durationDays: 60,
    description: 'Designed to strip body fat and reveal abdominal definition while locking in compound anchor strength.',
    targetRateStr: '-0.5 kg / week',
    targetDeltaKg: -4.3,
  },
  {
    id: 'BULK_90',
    name: '90-Day Mass Architecture',
    mode: 'BULK',
    modeLabel: 'Bulk Mode',
    modeColor: '#8B5CF6',
    icon: Dumbbell,
    durationDays: 90,
    description: 'Calculated clean surplus pacing to maximize muscular hypertrophy without accumulating excess adipose fat.',
    targetRateStr: '+0.3 kg / week',
    targetDeltaKg: +3.8,
  },
  {
    id: 'FOCUS_30',
    name: '30-Day Strength Peak',
    mode: 'FOCUS',
    modeLabel: 'Focus Mode',
    modeColor: '#0EA5E9',
    icon: Target,
    durationDays: 30,
    description: 'Heavy compound anchor progression (RPE 8.5–9.5) designed to smash plateaus and set all-time personal records.',
    targetRateStr: 'Weight Neutral (±0.0 kg)',
    targetDeltaKg: 0,
  },
  {
    id: 'HABIT_21',
    name: '21-Day Habit Lock-in',
    mode: 'HABIT',
    modeLabel: 'Habit Reset',
    modeColor: '#F59E0B',
    icon: Zap,
    durationDays: 21,
    description: '3 full-body sessions per week focused on consistency, unbroken attendance, and systemic routine momentum.',
    targetRateStr: 'Consistency First',
    targetDeltaKg: 0,
  },
];

// Mirrors JourneyProgram.MIN_DURATION_DAYS / MAX_DURATION_DAYS on the backend.
const MIN_PLAN_DAYS = 7;
const MAX_PLAN_DAYS = 365;

/** Local YYYY-MM-DD for today + offset days (plan day 1 is today). */
const isoDateFromToday = (offsetDays: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const daysUntil = (isoDate: string) => {
  const [y, m, d] = isoDate.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000) + 1;
};

export const PlanSelectorModal: React.FC<PlanSelectorModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialWeight = 77.0,
  dismissible = true,
}) => {
  const [activeTab, setActiveTab] = useState<'blueprints' | 'custom'>('blueprints');
  const [selectedBlueprintId, setSelectedBlueprintId] = useState<string>('CUT_60');

  // Custom form state
  const [customMode, setCustomMode] = useState<JourneyMode>('CUT');
  const [customDays, setCustomDays] = useState<number>(60);
  const [customName, setCustomName] = useState<string>('');
  const [startWeight, setStartWeight] = useState<number>(initialWeight);
  const [targetWeight, setTargetWeight] = useState<number>(initialWeight - 4.0);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Computed velocity for custom form
  const customVelocity = useMemo(() => {
    if (!customDays || customDays <= 0) return 0;
    const delta = (targetWeight || startWeight) - (startWeight || 75);
    const weeks = customDays / 7.0;
    return Number((delta / weeks).toFixed(2));
  }, [startWeight, targetWeight, customDays]);

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

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      if (activeTab === 'blueprints') {
        const bp = BLUEPRINTS.find((b) => b.id === selectedBlueprintId);
        if (!bp) return;

        const calculatedTarget = startWeight ? Number((startWeight + bp.targetDeltaKg).toFixed(1)) : undefined;

        await api.startJourney({
          blueprint: bp.id,
          name: bp.name,
          mode: bp.mode,
          duration_days: bp.durationDays,
          start_weight_kg: startWeight || undefined,
          target_weight_kg: calculatedTarget,
        });
      } else {
        if (!customDays || customDays < MIN_PLAN_DAYS || customDays > MAX_PLAN_DAYS) {
          setError(`Plan length must be between ${MIN_PLAN_DAYS} and ${MAX_PLAN_DAYS} days.`);
          return;
        }
        await api.startJourney({
          name: customName.trim() || `${customDays}-Day ${customMode} Plan`,
          mode: customMode,
          duration_days: customDays,
          start_weight_kg: startWeight || undefined,
          target_weight_kg: targetWeight || undefined,
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.detail || err?.message || 'Failed to start journey. Please check your inputs.');
    } finally {
      setSubmitting(false);
    }
  };

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
              {dismissible ? 'Choose Your Workout Plan & Mode' : 'Welcome to FitLog — Choose Your Journey Plan'}
            </h2>
            <p className={styles.subtitle}>
              {dismissible
                ? 'Align your training split, velocity corridor, and copilot tracking with your goal.'
                : 'Select an initial blueprint or configure custom goals to calibrate your workout routines, nutrition targets, and tracking.'}
            </p>
          </div>
          {dismissible && (
            <button className={styles.closeBtn} onClick={onClose} aria-label="Close modal">
              <X size={20} />
            </button>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className={styles.tabRow}>
          <button
            className={`${styles.tabBtn} ${activeTab === 'blueprints' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('blueprints')}
          >
            Pre-Configured Blueprints
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'custom' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('custom')}
          >
            Custom Duration & Goals
          </button>
        </div>

        {/* Content Body */}
        <div className={styles.body}>
          {error && (
            <div className={styles.errorNote}>
              <AlertCircle size={15} /> {error}
            </div>
          )}

          {activeTab === 'blueprints' ? (
            <>
              <div className={styles.blueprintsGrid}>
                {BLUEPRINTS.map((bp) => {
                  const Icon = bp.icon;
                  const isSelected = selectedBlueprintId === bp.id;

                  return (
                    <div
                      key={bp.id}
                      className={`${styles.blueprintCard} ${isSelected ? styles.blueprintCardSelected : ''}`}
                      onClick={() => setSelectedBlueprintId(bp.id)}
                    >
                      <div className={styles.bpHeader}>
                        <span
                          className={styles.bpModeBadge}
                          style={{ background: `${bp.modeColor}15`, color: bp.modeColor }}
                        >
                          <Icon size={13} /> {bp.modeLabel}
                        </span>
                        <span className={styles.bpDuration}>{bp.durationDays} Days</span>
                      </div>

                      <div>
                        <div className={styles.bpName}>{bp.name}</div>
                        <div className={styles.bpDesc}>{bp.description}</div>
                      </div>

                      <div className={styles.bpFooter}>
                        Pacing Benchmark: {bp.targetRateStr}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Start scale weight input */}
              <div className={`${styles.formGroup} ${styles.formGroupSpaced}`}>
                <label className={styles.label}>Your Current Scale Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  className={styles.input}
                  value={startWeight}
                  onChange={(e) => setStartWeight(parseFloat(e.target.value) || 0)}
                  placeholder="e.g. 77.5"
                />
                <small className={styles.inputHelpText}>
                  Entering today&apos;s scale weight automatically synchronizes your weight log and anchors your starting curve.
                </small>
              </div>
            </>
          ) : (
            /* Custom Tab */
            <>
              {/* Select Mode */}
              <div className={styles.formGroup}>
                <label className={styles.label}>Select Mode</label>
                <div className={styles.modePills}>
                  {(
                    [
                      { key: 'CUT', label: '🔥 Cut Mode' },
                      { key: 'BULK', label: '💪 Bulk Mode' },
                      { key: 'FOCUS', label: '🎯 Focus Mode' },
                      { key: 'RECOMP', label: '⚖️ Recomp Mode' },
                      { key: 'HABIT', label: '⚡ Habit Reset' },
                    ] as const
                  ).map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      className={`${styles.modePill} ${customMode === m.key ? styles.modePillSelected : ''}`}
                      onClick={() => {
                        setCustomMode(m.key);
                        if (m.key === 'CUT') setTargetWeight(Number((startWeight - 4.0).toFixed(1)));
                        if (m.key === 'BULK') setTargetWeight(Number((startWeight + 3.0).toFixed(1)));
                        if (m.key === 'FOCUS' || m.key === 'HABIT') setTargetWeight(startWeight);
                        if (m.key === 'RECOMP') setTargetWeight(Number((startWeight - 1.5).toFixed(1)));
                      }}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Plan Name */}
              <div className={styles.formGroup}>
                <label className={styles.label}>Plan Name (Optional)</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder={`e.g. My ${customDays}-Day ${customMode} Journey`}
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                />
              </div>

              {/* Target Duration: set a day count or a target end date; the two stay in sync */}
              <div className={styles.formGroup}>
                <div className={styles.inputRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Plan Length (Days)</label>
                    <input
                      type="number"
                      min={MIN_PLAN_DAYS}
                      max={MAX_PLAN_DAYS}
                      className={styles.input}
                      value={customDays || ''}
                      onChange={(e) => setCustomDays(parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Or Target End Date</label>
                    <input
                      type="date"
                      min={isoDateFromToday(MIN_PLAN_DAYS - 1)}
                      max={isoDateFromToday(MAX_PLAN_DAYS - 1)}
                      className={styles.input}
                      value={customDays > 0 ? isoDateFromToday(customDays - 1) : ''}
                      onChange={(e) => e.target.value && setCustomDays(daysUntil(e.target.value))}
                    />
                  </div>
                </div>
                <small className={styles.inputHelpText}>
                  Any length from {MIN_PLAN_DAYS} to {MAX_PLAN_DAYS} days. Pick an event date and the plan is sized to finish on it.
                </small>
                <div className={styles.durationPresets}>
                  {[21, 30, 45, 60, 90, 120].map((d) => (
                    <button
                      key={d}
                      type="button"
                      className={`${styles.durationPresetBtn} ${customDays === d ? styles.durationPresetBtnActive : ''}`}
                      onClick={() => setCustomDays(d)}
                    >
                      {d} Days
                    </button>
                  ))}
                </div>
              </div>

              {/* Starting & Target Weights */}
              <div className={styles.inputRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Start Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    className={styles.input}
                    value={startWeight}
                    onChange={(e) => setStartWeight(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Target Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    className={styles.input}
                    value={targetWeight}
                    onChange={(e) => setTargetWeight(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              {/* Velocity Live Preview */}
              <div className={styles.velocityPreview}>
                {customVelocity < 0 ? (
                  <TrendingDown size={18} color="#EF4444" />
                ) : customVelocity > 0 ? (
                  <TrendingUp size={18} color="#10B981" />
                ) : (
                  <Activity size={18} color="#0EA5E9" />
                )}
                <span>
                  Target Velocity: <strong>{customVelocity > 0 ? `+${customVelocity}` : customVelocity} kg/week</strong> over {customDays} days.
                  {customMode === 'CUT' && customVelocity < -1.0 && (
                    <span className={styles.warningText}>(⚠️ Fast pace; muscle catabolism risk)</span>
                  )}
                  {customMode === 'BULK' && customVelocity > 0.55 && (
                    <span className={styles.warningText}>(⚠️ High surplus; excess fat gain risk)</span>
                  )}
                </span>
              </div>
            </>
          )}

          {/* Non-destructive notice */}
          <div className={styles.archiveNote}>
            <strong>Safe Plan Transition:</strong> Switching plans will automatically archive your previous journey program. All your historical workouts, weigh-ins, personal records, and measurements remain fully preserved and available in your analytics.
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          {dismissible && (
            <button className={styles.cancelBtn} onClick={onClose} disabled={submitting}>
              Cancel
            </button>
          )}
          <button className={styles.submitBtn} onClick={handleSubmit} disabled={submitting}>
            <Play size={15} /> {submitting ? 'Starting Plan...' : 'Start This Journey'}
          </button>
        </div>
      </div>
    </div>
  );
};
