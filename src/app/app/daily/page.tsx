'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  Footprints,
  Flame,
  Moon,
  Droplets,
  Scale,
  Zap,
  Dumbbell,
  Timer,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  Calendar,
  Sparkles,
  Save,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { WeeklyHealth } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import styles from './daily.module.css';

export default function DailyLogPage() {
  const router = useRouter();
  const [nutrition, setNutrition] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);

  // Form State
  const [steps, setSteps] = useState('');
  const [sleepHours, setSleepHours] = useState('');
  const [sleepQuality, setSleepQuality] = useState<number | null>(null);
  const [energyLevel, setEnergyLevel] = useState<number | null>(null);
  const [recoveryNotes, setRecoveryNotes] = useState('');
  const [water, setWater] = useState('');
  const [cardioMinutes, setCardioMinutes] = useState('');
  const [cardioModality, setCardioModality] = useState('TREADMILL');

  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);
  const formattedTodayDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date());

  const loadData = async () => {
    try {
      const [n, s, dl] = await Promise.all([
        api.getNutrition(),
        api.getDashboardStats(),
        api.getDailyLogForDate(todayStr),
      ]);
      setNutrition(n);
      setStats(s);
      setWater(String(n?.day?.water_consumed_ml || ''));

      if (dl) {
        if (dl.steps != null) setSteps(String(dl.steps));
        if (dl.sleep_hours != null) setSleepHours(String(dl.sleep_hours));
        if (dl.sleep_quality != null) setSleepQuality(dl.sleep_quality);
        if (dl.energy_level != null) setEnergyLevel(dl.energy_level);
        if (dl.recovery_notes) setRecoveryNotes(dl.recovery_notes);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  async function save() {
    setSaving(true);
    setSavedNotice(false);
    try {
      await Promise.all([
        api.logDaily({
          date: todayStr,
          steps: steps !== '' ? Number(steps) : null,
          sleep_hours: sleepHours !== '' ? Number(sleepHours) : null,
          sleep_quality: sleepQuality,
          energy_level: energyLevel,
          recovery_notes: recoveryNotes,
        }),
        api.updateWater('today', Number(water) || 0),
        Number(cardioMinutes) > 0
          ? api.logCardio({
              date: todayStr,
              modality: cardioModality,
              duration_minutes: Number(cardioMinutes),
              intensity: 'Zone 2',
            })
          : Promise.resolve(),
      ]);

      await loadData();
      setCardioMinutes('');
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 4500);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  // Quick increment handlers
  const handleAddWater = (delta: number) => {
    const current = Number(water) || 0;
    setWater(String(Math.max(0, current + delta)));
  };

  const handleAddSteps = (delta: number) => {
    const current = Number(steps) || 0;
    setSteps(String(Math.max(0, current + delta)));
  };

  const handleAppendNoteTag = (tag: string) => {
    if (!recoveryNotes) {
      setRecoveryNotes(tag);
    } else if (!recoveryNotes.includes(tag)) {
      setRecoveryNotes(`${recoveryNotes.trim()}, ${tag}`);
    }
  };

  const weeklyWorkouts = (stats?.weekly_health as WeeklyHealth | undefined)?.metrics.find((m) => m.key === 'workouts');
  const targetCalories = nutrition?.targets?.daily_calories || 2160;
  const actualCalories = nutrition?.day?.total_calories || 0;
  const caloriePercent = Math.min(100, Math.round((actualCalories / targetCalories) * 100));

  const targetProtein = nutrition?.targets?.protein_g || 165;
  const actualProtein = nutrition?.day?.total_protein || 0;
  const proteinPercent = Math.min(100, Math.round((actualProtein / targetProtein) * 100));

  // Member-editable targets (Settings → Your Targets); defaults are the workbook's Pillar 9 / Pillar 7 floors.
  const stepsTarget: number = nutrition?.targets?.daily_steps || 8000;
  const sleepTarget: number = nutrition?.targets?.sleep_hours || 7.5;
  const stepsBadge = stepsTarget === 8000 ? 'Pillar 9 Target: 8,000–10,000 Steps' : `Your Target: ${stepsTarget.toLocaleString()} Steps`;
  const sleepBadge = sleepTarget === 7.5 ? 'Pillar 7 Target: 7.5–8.5 Hours' : `Your Target: ${sleepTarget} Hours`;

  const stepCount = Number(steps) || 0;
  const stepPercent = Math.min(100, Math.round((stepCount / stepsTarget) * 100));

  const sleepVal = Number(sleepHours) || 0;
  const sleepPercent = Math.min(100, Math.round((sleepVal / sleepTarget) * 100));

  const workoutsActual = weeklyWorkouts?.actual ?? 0;
  const workoutsTarget = weeklyWorkouts?.target ?? 7;
  const workoutPercent = Math.min(100, Math.round((workoutsActual / (workoutsTarget || 1)) * 100));

  const statCardsData = [
    {
      label: 'Morning Weight',
      value: stats?.journey?.current_weight ? `${stats.journey.current_weight} kg` : 'Not logged',
      href: '/app/workouts/plan/history',
      icon: Scale,
      iconClass: styles.iconCyan,
      percent: null,
    },
    {
      label: 'Steps (Today)',
      value: steps ? `${Number(steps).toLocaleString()} / 10k` : 'Not logged',
      href: '/app/daily',
      icon: Footprints,
      iconClass: styles.iconEmerald,
      percent: steps ? stepPercent : 0,
    },
    {
      label: 'Sleep (Nightly)',
      value: sleepHours ? `${sleepHours} / 8.0 hrs` : 'Not logged',
      href: '/app/daily',
      icon: Moon,
      iconClass: styles.iconViolet,
      percent: sleepHours ? sleepPercent : 0,
    },
    {
      label: 'Calories',
      value: `${actualCalories} / ${targetCalories}`,
      href: '/app/nutrition',
      icon: Flame,
      iconClass: styles.iconAmber,
      percent: caloriePercent,
    },
    {
      label: 'Protein',
      value: `${actualProtein} / ${targetProtein} g`,
      href: '/app/nutrition',
      icon: Zap,
      iconClass: styles.iconRose,
      percent: proteinPercent,
    },
    {
      label: 'Workouts',
      value: `${workoutsActual} / ${workoutsTarget} this week`,
      href: '/app/workouts/active',
      icon: Dumbbell,
      iconClass: styles.iconEmerald,
      percent: workoutPercent,
    },
  ];

  const ratingOptions = [
    { value: 1, label: '1 Low' },
    { value: 2, label: '2' },
    { value: 3, label: '3 Mid' },
    { value: 4, label: '4' },
    { value: 5, label: '5 High' },
  ];

  const getEnergyDescriptor = (val: number | null) => {
    switch (val) {
      case 1:
        return 'Low / Drained';
      case 2:
        return 'Sub-par / Fatigued';
      case 3:
        return 'Moderate / Baseline';
      case 4:
        return 'High / Ready';
      case 5:
        return 'Peak / Game Ready';
      default:
        return 'Select 1–5';
    }
  };

  const getSleepDescriptor = (val: number | null) => {
    switch (val) {
      case 1:
        return 'Restless / Broken';
      case 2:
        return 'Fragmented';
      case 3:
        return 'Fair / Normal';
      case 4:
        return 'Deep & Sound';
      case 5:
        return 'Optimal / Restorative';
      default:
        return 'Select 1–5';
    }
  };

  const waterInLitres = (Number(water) / 1000).toFixed(1);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.eyebrowRow}>
          <div className={styles.eyebrow}>
            <span className={styles.eyebrowDot} />
            DAILY LOG · 1–2 MINUTE CHECK-IN
          </div>
        </div>
        <h1 className={styles.title}>Record the essentials</h1>
        <p className={styles.subtitle}>
          Steps and sleep feed recovery-aware pacing and the automated weekly review. Body weight lives in Progress; meals and macros are tracked in Nutrition.
        </p>
      </header>

      {/* Top Metric Corridor */}
      <section className={styles.statGrid}>
        {statCardsData.map((item) => {
          const IconComp = item.icon;
          return (
            <Card key={item.label} className={styles.statCard} onClick={() => router.push(item.href)}>
              <div className={styles.statTopRow}>
                <div className={`${styles.statIconTile} ${item.iconClass}`}>
                  <IconComp size={18} strokeWidth={2.2} />
                </div>
                <ChevronRight size={14} className={styles.statChevron} />
              </div>
              <div>
                <small className={styles.statLabel}>{item.label}</small>
                <strong className={styles.statValue}>{item.value}</strong>
              </div>
              {item.percent !== null && (
                <div className={styles.progressBarContainer} title={`${item.percent}% of target`}>
                  <div className={styles.progressBarFill} style={{ width: `${item.percent}%` }} />
                </div>
              )}
            </Card>
          );
        })}
      </section>

      {/* Main Check-In Form */}
      <Card className={styles.formCard}>
        <div className={styles.formHeader}>
          <div className={styles.formTitleWrap}>
            <h2 className={styles.formTitle}>Daily Check-In &amp; Lifestyle Tracking</h2>
            <p className={styles.formHint}>
              Core inputs to the automated weekly review, fatigue debt detection, and adaptive decision protocol.
            </p>
          </div>
          <div className={styles.dateChip}>
            <Calendar size={14} color="var(--color-primary)" />
            <span>Today · {formattedTodayDate}</span>
            <span className={styles.dateChipDot} />
          </div>
        </div>

        {/* 1. Steps & Activity */}
        <div className={styles.sectionBlock}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitle}>
              <div className={`${styles.sectionIconTile} ${styles.iconEmerald}`}>
                <Flame size={17} strokeWidth={2.3} />
              </div>
              <span>1. NEAT Steps &amp; Cardio Activity</span>
            </div>
            <span className={styles.targetBadge}>
              <Sparkles size={12} />
              {stepsBadge}
            </span>
          </div>

          <div className={styles.inputGrid}>
            <div className={styles.field}>
              <div className={styles.fieldLabelRow}>
                <label className={styles.fieldLabel} htmlFor="daily-steps-input">
                  Daily Steps
                </label>
                {steps && Number(steps) >= stepsTarget && (
                  <span className={styles.fieldDescriptor}>✓ Target Met</span>
                )}
              </div>
              <div className={styles.inputWrapper}>
                <input
                  id="daily-steps-input"
                  className={styles.input}
                  value={steps}
                  onChange={(e) => setSteps(e.target.value)}
                  type="number"
                  placeholder="e.g. 8500"
                />
                <span className={styles.unitSuffix}>steps</span>
              </div>
              <div className={styles.chipsRow}>
                <button
                  type="button"
                  className={styles.quickChip}
                  onClick={() => handleAddSteps(1000)}
                >
                  +1k
                </button>
                <button
                  type="button"
                  className={styles.quickChip}
                  onClick={() => handleAddSteps(2500)}
                >
                  +2.5k
                </button>
                <button
                  type="button"
                  className={styles.quickChip}
                  onClick={() => handleAddSteps(5000)}
                >
                  +5k
                </button>
                <button
                  type="button"
                  className={styles.quickChip}
                  onClick={() => setSteps(String(stepsTarget))}
                >
                  {stepsTarget / 1000}k Goal
                </button>
              </div>
            </div>

            <div className={styles.field}>
              <div className={styles.fieldLabelRow}>
                <label className={styles.fieldLabel} htmlFor="cardio-duration-input">
                  Cardio Duration
                </label>
              </div>
              <div className={styles.inputWrapper}>
                <input
                  id="cardio-duration-input"
                  className={styles.input}
                  value={cardioMinutes}
                  onChange={(e) => setCardioMinutes(e.target.value)}
                  type="number"
                  placeholder="Optional (e.g. 25)"
                />
                <span className={styles.unitSuffix}>min</span>
              </div>
              <div className={styles.chipsRow}>
                <button
                  type="button"
                  className={styles.quickChip}
                  onClick={() => setCardioMinutes('15')}
                >
                  15m
                </button>
                <button
                  type="button"
                  className={styles.quickChip}
                  onClick={() => setCardioMinutes('30')}
                >
                  30m
                </button>
                <button
                  type="button"
                  className={styles.quickChip}
                  onClick={() => setCardioMinutes('45')}
                >
                  45m
                </button>
              </div>
            </div>

            <div className={styles.field}>
              <div className={styles.fieldLabelRow}>
                <label className={styles.fieldLabel} htmlFor="cardio-modality-select">
                  Cardio Modality
                </label>
              </div>
              <div className={styles.selectWrapper}>
                <select
                  id="cardio-modality-select"
                  className={styles.select}
                  value={cardioModality}
                  onChange={(e) => setCardioModality(e.target.value)}
                >
                  <option value="TREADMILL">Incline Treadmill Walk</option>
                  <option value="CYCLING">Stationary Bike</option>
                  <option value="CROSS_TRAINER">Cross Trainer / Elliptical</option>
                  <option value="ROWING">Rowing Ergometer</option>
                  <option value="OTHER">Outdoor Brisk Walk / Other</option>
                </select>
                <ChevronDown size={16} className={styles.selectChevron} />
              </div>
            </div>
          </div>
        </div>

        {/* 2. Sleep & Systemic Recovery */}
        <div className={styles.sectionBlock}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitle}>
              <div className={`${styles.sectionIconTile} ${styles.iconViolet}`}>
                <Moon size={17} strokeWidth={2.3} />
              </div>
              <span>2. Sleep &amp; Systemic Recovery</span>
            </div>
            <span className={`${styles.targetBadge} ${styles.targetBadgeViolet}`}>
              <Sparkles size={12} />
              {sleepBadge}
            </span>
          </div>

          <div className={styles.inputGrid}>
            <div className={styles.field}>
              <div className={styles.fieldLabelRow}>
                <label className={styles.fieldLabel} htmlFor="sleep-hours-input">
                  Sleep Duration
                </label>
                {sleepHours && Number(sleepHours) >= sleepTarget && (
                  <span className={styles.fieldDescriptor}>Optimal</span>
                )}
              </div>
              <div className={styles.inputWrapper}>
                <input
                  id="sleep-hours-input"
                  className={styles.input}
                  value={sleepHours}
                  onChange={(e) => setSleepHours(e.target.value)}
                  type="number"
                  step="0.5"
                  placeholder="e.g. 8.0"
                />
                <span className={styles.unitSuffix}>hrs</span>
              </div>
              <div className={styles.chipsRow}>
                {['6.5', '7.0', '7.5', '8.0', '8.5'].map((h) => (
                  <button
                    key={h}
                    type="button"
                    className={styles.quickChip}
                    onClick={() => setSleepHours(h)}
                  >
                    {h}h
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.field}>
              <div className={styles.fieldLabelRow}>
                <span className={styles.fieldLabel}>Energy &amp; Readiness</span>
                <span className={styles.fieldDescriptor}>{getEnergyDescriptor(energyLevel)}</span>
              </div>
              <div className={styles.ratingGroup}>
                {ratingOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`${styles.ratingBtn} ${energyLevel === opt.value ? styles.ratingBtnActive : ''}`}
                    onClick={() => setEnergyLevel(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.field}>
              <div className={styles.fieldLabelRow}>
                <span className={styles.fieldLabel}>Sleep Quality</span>
                <span className={styles.fieldDescriptor}>{getSleepDescriptor(sleepQuality)}</span>
              </div>
              <div className={styles.ratingGroup}>
                {ratingOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`${styles.ratingBtn} ${sleepQuality === opt.value ? styles.ratingBtnActive : ''}`}
                    onClick={() => setSleepQuality(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 3. Hydration & Subjective Notes */}
        <div className={styles.sectionBlock}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitle}>
              <div className={`${styles.sectionIconTile} ${styles.iconCyan}`}>
                <Droplets size={17} strokeWidth={2.3} />
              </div>
              <span>3. Hydration &amp; Subjective Notes</span>
            </div>
            <span className={`${styles.targetBadge} ${styles.targetBadgeCyan}`}>
              <Sparkles size={12} />
              Pillar 8 Target: 3.5–4.0 Litres
            </span>
          </div>

          <div className={styles.inputGrid}>
            <div className={styles.field}>
              <div className={styles.fieldLabelRow}>
                <label className={styles.fieldLabel} htmlFor="water-consumed-input">
                  Water Consumed
                </label>
                {water && Number(water) > 0 && (
                  <span className={styles.fieldDescriptor}>≈ {waterInLitres} L</span>
                )}
              </div>
              <div className={styles.inputWrapper}>
                <input
                  id="water-consumed-input"
                  className={styles.input}
                  value={water}
                  onChange={(e) => setWater(e.target.value)}
                  type="number"
                  placeholder="e.g. 3500"
                />
                <span className={styles.unitSuffix}>ml</span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Target intake: 3,500 – 4,000 ml
              </span>
            </div>

            <div className={styles.field}>
              <div className={styles.fieldLabelRow}>
                <span className={styles.fieldLabel}>Quick Hydration Boosters</span>
                <span className={styles.fieldDescriptor}>+ Click to add</span>
              </div>
              <div className={styles.boosterGrid}>
                <button
                  type="button"
                  className={styles.boosterBtn}
                  onClick={() => handleAddWater(250)}
                >
                  <span>+250 ml</span>
                  <span className={styles.boosterSub}>Glass</span>
                </button>
                <button
                  type="button"
                  className={styles.boosterBtn}
                  onClick={() => handleAddWater(500)}
                >
                  <span>+500 ml</span>
                  <span className={styles.boosterSub}>Bottle</span>
                </button>
                <button
                  type="button"
                  className={styles.boosterBtn}
                  onClick={() => handleAddWater(1000)}
                >
                  <span>+1,000 ml</span>
                  <span className={styles.boosterSub}>Shaker</span>
                </button>
              </div>
            </div>

            <div className={styles.field}>
              <div className={styles.fieldLabelRow}>
                <span className={styles.fieldLabel}>Hydration Pacing Status</span>
                <span className={styles.fieldDescriptor}>
                  {Number(water) >= 3500 ? 'Target Achieved' : `${Math.round(Math.min(100, ((Number(water) || 0) / 3500) * 100))}%`}
                </span>
              </div>
              <div className={styles.hydrationCardMini}>
                <div className={styles.hydrationCardHeader}>
                  <span className={styles.hydrationCardValue}>
                    {waterInLitres} / 3.5 L
                  </span>
                  <span className={styles.hydrationCardTarget}>Daily Goal</span>
                </div>
                <div className={styles.hydrationCardBar}>
                  <div
                    className={styles.hydrationCardFill}
                    style={{
                      width: `${Math.min(100, Math.round(((Number(water) || 0) / 3500) * 100))}%`,
                    }}
                  />
                </div>
                <span className={styles.hydrationCardStatus}>
                  {Number(water) >= 3500
                    ? '✓ Optimal hydration maintained'
                    : Number(water) >= 2000
                    ? 'Good hydration progress'
                    : 'Regular hydration supports joint & muscle recovery'}
                </span>
              </div>
            </div>

            <div className={`${styles.field} ${styles.fieldFullWidth}`}>
              <div className={styles.fieldLabelRow}>
                <label className={styles.fieldLabel} htmlFor="recovery-notes-input">
                  Recovery Notes &amp; Fatigue Feedback
                </label>
                <span className={styles.fieldDescriptor}>Click tags to quickly append</span>
              </div>
              <textarea
                id="recovery-notes-input"
                className={styles.textarea}
                value={recoveryNotes}
                onChange={(e) => setRecoveryNotes(e.target.value)}
                placeholder="Note muscle soreness, energy levels, training sensations or fatigue debt..."
              />
              <div className={styles.tagChipsRow}>
                {[
                  'DOMS / Soreness',
                  'High Energy',
                  'Joint Stiffness',
                  'Great Sleep',
                  'Mild Fatigue',
                  'Optimal Hydration',
                ].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className={styles.tagChip}
                    onClick={() => handleAppendNoteTag(tag)}
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Action Row */}
        <div className={styles.actionRow}>
          <div>
            {savedNotice ? (
              <span className={styles.saveNotice}>
                <span className={styles.saveNoticeDot} />
                Daily log successfully recorded!
              </span>
            ) : (
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Inputs automatically feed weekly recovery analytics and trend curves.
              </span>
            )}
          </div>
          <div className={styles.actionButtonWrap}>
            <Button
              size="lg"
              variant="primary"
              onClick={save}
              disabled={saving}
            >
              {saving ? (
                'Saving check-in…'
              ) : (
                <>
                  <Save size={16} />
                  <span>Save daily log</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
