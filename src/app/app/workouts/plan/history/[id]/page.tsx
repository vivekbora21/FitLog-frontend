'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  Flag,
  Play,
  Circle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  HeartPulse,
  Dumbbell,
  Clock,
  Scale,
  Flame,
  Award,
  Ruler,
  Utensils,
  Trophy,
  History,
  TrendingUp,
  Plus,
  SlidersHorizontal,
  Target,
  Calendar,
  ArrowRight,
  ArrowUpDown,
  Sparkles,
} from 'lucide-react';
import { api } from '@/lib/api';
import {
  JourneyDetail,
  JourneyDay,
  JourneyMeasurementEntry,
  JourneyMode,
  PersonalRecord,
  BodyMeasurement,
} from '@/lib/types';
import { getModeMeta } from '@/lib/journeyModes';
import { RightPathCard } from '@/components/RightPathCard';
import { MetricChart } from '@/components/MetricChart';
import { WeightTrajectoryChart } from '@/components/WeightTrajectoryChart';
import { WaistTrendChart } from '@/components/WaistTrendChart';
import { AdherenceTrendChart } from '@/components/AdherenceTrendChart';
import { PlanSelectorModal } from '@/components/PlanSelectorModal';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import styles from './detail.module.css';

const PR_PAGE_SIZE = 10;
const DAY_PAGE_SIZE = 5;

type DayFilter = 'ALL' | 'COMPLETED' | 'MISSED' | 'UPCOMING';
type SortOrder = 'desc' | 'asc';
type ViewScope = 'LATEST_5' | 'ALL';
type PrScope = 'JOURNEY' | 'ALL_TIME';

const MEASUREMENT_FIELDS: { key: keyof JourneyMeasurementEntry; label: string }[] = [
  { key: 'waist_cm', label: 'Waist' },
  { key: 'chest_cm', label: 'Chest' },
  { key: 'hips_cm', label: 'Hips' },
  { key: 'arms_cm', label: 'Arms' },
  { key: 'thighs_cm', label: 'Thighs' },
];

function measurementDelta(log: JourneyMeasurementEntry[], key: keyof JourneyMeasurementEntry) {
  const readings = log
    .map((m) => ({ date: m.date, value: m[key] as number | null | undefined }))
    .filter((r) => r.value != null) as { date: string; value: number }[];
  if (readings.length === 0) return null;
  const start = readings[0].value;
  const current = readings[readings.length - 1].value;
  return { start, current, delta: Math.round((current - start) * 10) / 10 };
}

function dayStatusTone(day: JourneyDay, currentDay: number) {
  if (day.status === 'COMPLETED') return { icon: <CheckCircle2 size={14} />, color: 'var(--color-primary)', label: 'Completed' };
  if (day.status === 'MISSED') return { icon: <Flag size={14} />, color: 'var(--color-amber)', label: 'Missed' };
  if (day.day_number === currentDay) return { icon: <Play size={14} />, color: '#0EA5E9', label: 'Today' };
  return { icon: <Circle size={14} />, color: 'var(--text-muted)', label: 'Upcoming' };
}

function DayRow({ day, currentDay }: { day: JourneyDay; currentDay: number }) {
  const tone = dayStatusTone(day, currentDay);
  const session = day.completed_session;
  const isCurrent = day.day_number === currentDay;

  return (
    <details className={`${styles.dayRow} ${isCurrent ? styles.dayRowCurrent : ''}`}>
      <summary className={styles.daySummary}>
        <span className={styles.dayNum}>Day {day.day_number}</span>
        <span className={styles.dayStatus} style={{ color: tone.color }}>{tone.icon} {tone.label}</span>
        <span className={styles.dayLabel}>{day.label}{day.is_optional ? ' · Optional' : ''}</span>
        {session ? (
          <span className={styles.dayVolume}>{session.total_volume_kg.toLocaleString()} kg</span>
        ) : <span />}
        <ChevronDown size={16} className={styles.chevron} />
      </summary>

      <div className={styles.dayDetail}>
        {session ? (
          <>
            <div className={styles.sessionMeta}>
              Completed {new Date(session.completed_at || session.started_at).toLocaleString()}
              {' · '}{Math.round(session.duration_seconds / 60)} min
              {session.overall_rpe ? ` · RPE ${session.overall_rpe}/10` : ''}
            </div>
            {session.notes && <p className={styles.sessionNotes}>&ldquo;{session.notes}&rdquo;</p>}
            <table className={styles.exerciseTable}>
              <thead>
                <tr><th>Exercise</th><th>Sets logged</th></tr>
              </thead>
              <tbody>
                {session.exercises.map((ex) => (
                  <tr key={ex.id}>
                    <td><strong>{ex.exercise_name}</strong><br /><small className={styles.exerciseMuscle}>{ex.primary_muscle}</small></td>
                    <td>
                      {ex.sets.map((s, idx) => (
                        <span key={s.id || idx} className={styles.setPill}>
                          {s.weight_kg}kg &times; {s.reps}{s.rpe ? ` @${s.rpe}` : ''}
                        </span>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : day.routine_details ? (
          <div className={styles.plannedGroup}>
            <span className={styles.plannedLabel}>Prescribed: {day.routine_details.name}</span>
            <ul className={styles.plannedList}>
              {(day.routine_details.exercises || []).map((ex) => (
                <li key={ex.id}>{ex.exercise_name} &mdash; {ex.target_sets} &times; {ex.target_reps}</li>
              ))}
            </ul>
          </div>
        ) : (
          <span className={styles.noRoutine}>No routine attached to this day.</span>
        )}
      </div>
    </details>
  );
}

export default function JourneyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [data, setData] = useState<JourneyDetail | null>(null);
  const [dashStats, setDashStats] = useState<any>(null);
  const [allPrs, setAllPrs] = useState<PersonalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Filters & Pagination
  const [dayFilter, setDayFilter] = useState<DayFilter>('ALL');
  const [dayPage, setDayPage] = useState(1);
  const [viewScope, setViewScope] = useState<ViewScope>('LATEST_5');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [prPage, setPrPage] = useState(1);
  const [prScope, setPrScope] = useState<PrScope>('JOURNEY');

  // Chart Tab Navigation ('WEIGHT' | 'WAIST' | 'ADHERENCE' | 'ALL')
  const [chartTab, setChartTab] = useState<'WEIGHT' | 'WAIST' | 'ADHERENCE' | 'ALL'>('WEIGHT');

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Modals
  const [logWeightModal, setLogWeightModal] = useState(false);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [newWeight, setNewWeight] = useState<number>(75.0);
  const [newBf, setNewBf] = useState<number>(15.0);
  const [newNotes, setNewNotes] = useState('');
  const [savingWeight, setSavingWeight] = useState(false);

  const loadData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [detailRes, dashRes, prRes] = await Promise.all([
        api.getJourneyDetail(id),
        api.getDashboardStats().catch(() => null),
        api.getPersonalRecords().catch(() => null),
      ]);
      setData(detailRes);
      setDashStats(dashRes);
      if (prRes) {
        setAllPrs(prRes.results || prRes);
      }

      // Initialize default weight for logging
      const latestW = detailRes.weight_log?.[detailRes.weight_log.length - 1]?.weight_kg
        ?? detailRes.summary?.current_weight_kg
        ?? detailRes.program.start_weight_kg;
      if (latestW) setNewWeight(latestW);
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleLogWeight = async () => {
    if (!newWeight) return;
    setSavingWeight(true);
    try {
      await api.logWeight(newWeight, newBf, newNotes);
      setLogWeightModal(false);
      setNewNotes('');
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setSavingWeight(false);
    }
  };

  if (loading) return <div className={styles.loading}>Loading journey progress &amp; analytics...</div>;

  if (error || !data) {
    return (
      <div className={styles.loading}>
        <strong>Journey not found.</strong>
        <button type="button" className={styles.backBtn} onClick={() => router.push('/app/workouts/plan/history')}>
          <ArrowLeft size={16} /> Back to Plan History
        </button>
      </div>
    );
  }

  const { program, pacing, summary, personal_records, volume_trend, days, weight_log, measurements_log, cardio_log, nutrition_summary } = data;
  const mode = (program.mode || pacing?.mode || 'CUT') as JourneyMode;
  const meta = getModeMeta(mode);
  const Icon = meta.icon;
  const completionPct = Math.min(100, Math.round((program.completed_days / Math.max(program.duration_days, 1)) * 100));

  // Resolved Weight & Velocity
  const currentWeight = summary.current_weight_kg
    ?? (weight_log.length > 0 ? weight_log[weight_log.length - 1].weight_kg : (program.start_weight_kg ?? pacing?.velocity?.start_weight ?? 0));

  const baselineWeight = program.start_weight_kg
    ?? summary.start_weight_kg
    ?? pacing?.velocity?.start_weight
    ?? (weight_log.length > 0 ? weight_log[0].weight_kg : currentWeight);

  const targetWeight = program.target_weight_kg
    ?? pacing?.target_weight
    ?? pacing?.velocity?.expected_final_weight
    ?? null;

  const rolling7Avg = pacing?.velocity?.rolling_7_avg
    ?? dashStats?.journey?.seven_day_average
    ?? currentWeight;

  // Change since baseline
  const changeSinceBaseline = summary.weight_change_kg
    ?? (currentWeight && baselineWeight ? Math.round((currentWeight - baselineWeight) * 10) / 10 : 0);
  const changeSinceBaselineStr = changeSinceBaseline > 0
    ? `+${changeSinceBaseline.toFixed(1)}`
    : changeSinceBaseline.toFixed(1);

  // Change since last week
  const weeklyChangeFromStats = dashStats?.journey?.weekly_weight_change;
  const computedWeeklyChange = (() => {
    if (weeklyChangeFromStats !== undefined && weeklyChangeFromStats !== null) return weeklyChangeFromStats;
    if (weight_log.length >= 2) {
      const latestDate = new Date(weight_log[weight_log.length - 1].date).getTime();
      const pastEntry = [...weight_log].reverse().find((w) => {
        const diffDays = Math.round((latestDate - new Date(w.date).getTime()) / (1000 * 60 * 60 * 24));
        return diffDays >= 6 && diffDays <= 8;
      });
      if (pastEntry) {
        return Math.round((weight_log[weight_log.length - 1].weight_kg - pastEntry.weight_kg) * 10) / 10;
      }
    }
    return null;
  })();

  let baselineToneClass = styles.deltaPositive;
  if (mode === 'CUT') {
    baselineToneClass = changeSinceBaseline <= 0 ? styles.deltaPositive : styles.deltaNegative;
  } else if (mode === 'BULK') {
    baselineToneClass = changeSinceBaseline >= 0 ? styles.deltaPositive : styles.deltaNegative;
  } else {
    baselineToneClass = Math.abs(changeSinceBaseline) <= 1.0 ? styles.deltaPositive : styles.deltaNeutral;
  }

  const weightDirectionGood = meta.weightDirection === 'loss' ? changeSinceBaseline <= 0
    : meta.weightDirection === 'gain' ? changeSinceBaseline >= 0
    : Math.abs(changeSinceBaseline) <= 0.5;

  const trainingHours = Math.floor(summary.total_training_minutes / 60);
  const trainingMins = summary.total_training_minutes % 60;

  const volumeChartData = volume_trend.map((v) => ({
    label: new Date(v.date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }),
    value: v.volume_kg,
    sublabel: v.title,
  }));

  const maxMuscleSets = Math.max(1, ...summary.muscle_breakdown.map((m) => m.sets));

  const measurementDeltas = MEASUREMENT_FIELDS
    .map((f) => ({ ...f, delta: measurementDelta(measurements_log, f.key) }))
    .filter((f) => f.delta !== null);

  const resolvedStartWaist = pacing?.starting_waist
    ?? summary.start_waist_cm
    ?? measurementDelta(measurements_log, 'waist_cm')?.start
    ?? null;

  // Day counts & filter pool
  const dayCounts = {
    ALL: days.length,
    COMPLETED: days.filter((d) => d.status === 'COMPLETED').length,
    MISSED: days.filter((d) => d.status === 'MISSED').length,
    UPCOMING: days.filter((d) => d.status === 'UPCOMING').length,
  };

  const currentDayNum = program.current_day || 1;
  const isProgramActive = program.active;

  let daysPool: JourneyDay[] = [];
  if (dayFilter === 'ALL') {
    if (viewScope === 'LATEST_5') {
      const elapsed = days.filter((d) => !isProgramActive || d.day_number <= currentDayNum);
      daysPool = elapsed.length > 0 ? elapsed : days;
    } else {
      daysPool = days;
    }
  } else {
    daysPool = days.filter((d) => d.status === dayFilter);
  }

  const sortedDays = [...daysPool].sort((a, b) => {
    if (sortOrder === 'desc') return b.day_number - a.day_number;
    return a.day_number - b.day_number;
  });

  const dayTotalPages = viewScope === 'ALL'
    ? 1
    : Math.max(1, Math.ceil(sortedDays.length / DAY_PAGE_SIZE));
  const daySafePage = Math.min(Math.max(1, dayPage), dayTotalPages);

  let displayedDays: JourneyDay[] = [];
  if (viewScope === 'ALL') {
    displayedDays = sortedDays;
  } else if (sortOrder === 'desc') {
    const start = (daySafePage - 1) * DAY_PAGE_SIZE;
    displayedDays = sortedDays.slice(start, start + DAY_PAGE_SIZE);
  } else {
    const total = sortedDays.length;
    const end = total - (daySafePage - 1) * DAY_PAGE_SIZE;
    const start = Math.max(0, end - DAY_PAGE_SIZE);
    displayedDays = sortedDays.slice(start, end);
  }

  const getDayPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (dayTotalPages <= 7) {
      for (let i = 1; i <= dayTotalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (daySafePage > 3) pages.push('...');
      const start = Math.max(2, daySafePage - 1);
      const end = Math.min(dayTotalPages - 1, daySafePage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (daySafePage < dayTotalPages - 2) pages.push('...');
      pages.push(dayTotalPages);
    }
    return pages;
  };

  // PR Selection and Pagination
  const activePrList = prScope === 'JOURNEY' ? personal_records : allPrs;
  const prTotalPages = Math.ceil(activePrList.length / PR_PAGE_SIZE);
  const prSafePage = Math.min(Math.max(1, prPage), prTotalPages || 1);
  const prStartIdx = (prSafePage - 1) * PR_PAGE_SIZE;
  const paginatedPrs = activePrList.slice(prStartIdx, prStartIdx + PR_PAGE_SIZE);

  const getPrPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (prTotalPages <= 7) {
      for (let i = 1; i <= prTotalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (prSafePage > 3) pages.push('...');
      const start = Math.max(2, prSafePage - 1);
      const end = Math.min(prTotalPages - 1, prSafePage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (prSafePage < prTotalPages - 2) pages.push('...');
      pages.push(prTotalPages);
    }
    return pages;
  };

  return (
    <div className={styles.page}>
      <button type="button" className={styles.backBtn} onClick={() => router.push('/app/workouts/plan/history')}>
        <ArrowLeft size={16} /> Back to Plan History
      </button>

      {/* Main Header with Actions */}
      <header className={styles.header}>
        <div>
          <div className={styles.badgeRow}>
            <span className={styles.modeBadge} style={{ background: `${meta.color}15`, color: meta.color }}>
              <Icon size={13} /> {program.mode_label}
            </span>
            <span className={`${styles.statusTag} ${program.active ? styles.statusActive : styles.statusArchived}`}>
              {program.active ? 'Active Journey' : 'Archived'}
            </span>
            {isProgramActive && (
              <span className={styles.kpiBadgeEmerald}>
                Day {program.current_day} of {program.duration_days} · {completionPct}% Progress
              </span>
            )}
          </div>
          <h1 className={styles.title}>{program.name}</h1>
          <p className={styles.subtitle}>
            {program.start_date} &rarr; {program.end_date} · {program.duration_days} days · Goal: {meta.focus}
            {program.focus_exercise_name && <> · Focus lift: {program.focus_exercise_name}{program.target_focus_1rm ? ` (target ${program.target_focus_1rm}kg 1RM)` : ''}</>}
            {program.archived_at && !program.active && <> · Archived {program.archived_at.slice(0, 10)}</>}
          </p>
        </div>

        <div className={styles.headerActions}>
          <Button variant="secondary" onClick={() => setPlanModalOpen(true)}>
            <SlidersHorizontal size={16} />
            <span>Mode &amp; Plan</span>
          </Button>
          <Button variant="primary" onClick={() => setLogWeightModal(true)}>
            <Plus size={16} />
            <span>Log Weight</span>
          </Button>
        </div>
      </header>

      {/* Quick-Jump Navigation Anchor Bar */}
      <nav className={styles.quickNav} aria-label="Section shortcuts">
        <button type="button" onClick={() => scrollToSection('sec-telemetry')} className={styles.quickNavBtn}>
          <Sparkles size={13} color="var(--color-primary)" /> Telemetry
        </button>
        <button type="button" onClick={() => scrollToSection('sec-biometrics')} className={styles.quickNavBtn}>
          <Scale size={13} color="var(--color-primary)" /> Biometrics
        </button>
        <button type="button" onClick={() => scrollToSection('sec-workload')} className={styles.quickNavBtn}>
          <Dumbbell size={13} color="#0284C7" /> Workload
        </button>
        <button type="button" onClick={() => scrollToSection('sec-trends')} className={styles.quickNavBtn}>
          <TrendingUp size={13} color="#059669" /> Trends
        </button>
        <button type="button" onClick={() => scrollToSection('sec-checkpoints')} className={styles.quickNavBtn}>
          <Target size={13} color="#D97706" /> Checkpoints
        </button>
        <button type="button" onClick={() => scrollToSection('sec-measurements')} className={styles.quickNavBtn}>
          <Ruler size={13} color="#0284C7" /> Circumference
        </button>
        <button type="button" onClick={() => scrollToSection('sec-records')} className={styles.quickNavBtn}>
          <Award size={13} color="#D97706" /> PRs
        </button>
        <button type="button" onClick={() => scrollToSection('sec-days')} className={styles.quickNavBtn}>
          <Calendar size={13} color="#64748B" /> Daily Log
        </button>
      </nav>

      {/* Right Path Mission Control Telemetry */}
      <div id="sec-telemetry">
        <RightPathCard
          pacing={pacing}
          onOpenPlanSelector={() => setPlanModalOpen(true)}
          embedded={true}
        />
      </div>

      {/* Domain 1: Biometric & Scale Dynamics */}
      <section id="sec-biometrics" className={styles.domainSection}>
        <div className={styles.domainHeader}>
          <div>
            <div className={styles.domainPretitle}>
              <Scale size={14} color="var(--color-primary)" /> Biometric Calibration
            </div>
            <h2 className={styles.domainTitle}>Body Composition &amp; Scale Trajectory</h2>
            <p className={styles.domainSubtitle}>
              Fasted morning weigh-ins, 7-day smoothed average, and goal corridor delta
            </p>
          </div>
        </div>

        <div className={styles.kpiGrid}>
          {/* Card 1: Current Scale Weight */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiCardTop}>
              <span className={`${styles.kpiIcon} ${weightDirectionGood ? styles.statIconEmerald : styles.statIconAmber}`}>
                <Scale size={18} />
              </span>
              <span className={styles.kpiBadgeNeutral}>Fasted Scale</span>
            </div>
            <span className={styles.kpiLabel}>Current Weight</span>
            <div className={styles.kpiValueRow}>
              <span className={styles.kpiValue}>{currentWeight}</span>
              <span className={styles.kpiUnit}>kg</span>
            </div>
            <div className={styles.kpiSubPill}>
              {rolling7Avg ? (
                <>7-Day Avg: <strong>{rolling7Avg} kg</strong></>
              ) : (
                'Establishing 7-day average'
              )}
            </div>
          </div>

          {/* Card 2: Net Change Since Baseline */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiCardTop}>
              <span className={`${styles.kpiIcon} ${styles.statIconSky}`}>
                <TrendingUp size={18} />
              </span>
              <span className={`${styles.kpiBadge} ${baselineToneClass}`}>
                {changeSinceBaselineStr} kg
              </span>
            </div>
            <span className={styles.kpiLabel}>Since Baseline</span>
            <div className={styles.kpiValueRow}>
              <span className={`${styles.kpiValue} ${baselineToneClass}`}>{changeSinceBaselineStr}</span>
              <span className={styles.kpiUnit}>kg</span>
            </div>
            <div className={styles.kpiSubPill}>
              vs Day 1 baseline ({baselineWeight} kg)
            </div>
          </div>

          {/* Card 3: Weekly Rate of Change */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiCardTop}>
              <span className={`${styles.kpiIcon} ${styles.statIconAmber}`}>
                <History size={18} />
              </span>
              <span className={styles.kpiBadgeNeutral}>7-Day Rate</span>
            </div>
            <span className={styles.kpiLabel}>Weekly Velocity</span>
            <div className={styles.kpiValueRow}>
              {computedWeeklyChange !== null ? (
                <>
                  <span className={`${styles.kpiValue} ${computedWeeklyChange <= 0 ? styles.deltaPositive : styles.deltaNegative}`}>
                    {computedWeeklyChange > 0 ? `+${computedWeeklyChange}` : computedWeeklyChange}
                  </span>
                  <span className={styles.kpiUnit}>kg/wk</span>
                </>
              ) : (
                <span className={`${styles.kpiValue} ${styles.deltaNeutral}`}>Calibrating</span>
              )}
            </div>
            <div className={styles.kpiSubPill}>
              {computedWeeklyChange !== null ? 'vs 7 days ago' : `Day ${program.current_day} of 7 calibration`}
            </div>
          </div>

          {/* Card 4: Target Trajectory Goal */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiCardTop}>
              <span className={`${styles.kpiIcon} ${styles.statIconEmerald}`}>
                <Target size={18} />
              </span>
              <span className={styles.kpiBadgeCyan}>{program.duration_days}-Day Target</span>
            </div>
            <span className={styles.kpiLabel}>Target Goal</span>
            <div className={styles.kpiValueRow}>
              <span className={styles.kpiValue}>{targetWeight ?? '—'}</span>
              <span className={styles.kpiUnit}>kg</span>
            </div>
            <div className={styles.kpiSubPill}>
              {targetWeight && baselineWeight
                ? `Planned Delta: ${targetWeight - baselineWeight > 0 ? '+' : ''}${(targetWeight - baselineWeight).toFixed(1)} kg`
                : 'Awaiting target'}
            </div>
          </div>
        </div>
      </section>

      {/* Domain 2: Training Workload & Adherence */}
      <section id="sec-workload" className={styles.domainSection}>
        <div className={styles.domainHeader}>
          <div>
            <div className={styles.domainPretitle}>
              <Dumbbell size={14} color="#0284C7" /> Training Output
            </div>
            <h2 className={styles.domainTitle}>Training Workload &amp; Adherence</h2>
            <p className={styles.domainSubtitle}>
              Program execution consistency, cumulative tonnage lifted, and cardiovascular endurance
            </p>
          </div>
        </div>

        <div className={styles.kpiGrid}>
          {/* Card 5: Completion */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiCardTop}>
              <span className={`${styles.kpiIcon} ${styles.statIconEmerald}`}>
                <CheckCircle2 size={18} />
              </span>
              <span className={styles.kpiBadgeEmerald}>{completionPct}% on track</span>
            </div>
            <span className={styles.kpiLabel}>Program Completion</span>
            <div className={styles.kpiValueRow}>
              <span className={styles.kpiValue}>{completionPct}</span>
              <span className={styles.kpiUnit}>%</span>
            </div>
            <div className={styles.kpiSubPill}>
              {program.completed_days} of {program.duration_days} days · {program.missed_days} missed
            </div>
          </div>

          {/* Card 6: Volume Lifted */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiCardTop}>
              <span className={`${styles.kpiIcon} ${styles.statIconSky}`}>
                <Dumbbell size={18} />
              </span>
              <span className={styles.kpiBadgeNeutral}>Total Tonnage</span>
            </div>
            <span className={styles.kpiLabel}>Volume Lifted</span>
            <div className={styles.kpiValueRow}>
              <span className={styles.kpiValue}>{summary.total_volume_kg.toLocaleString()}</span>
              <span className={styles.kpiUnit}>kg</span>
            </div>
            <div className={styles.kpiSubPill}>
              {summary.total_sets} sets across {summary.total_workouts} workouts
            </div>
          </div>

          {/* Card 7: Training Time */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiCardTop}>
              <span className={`${styles.kpiIcon} ${styles.statIconViolet}`}>
                <Clock size={18} />
              </span>
              <span className={styles.kpiBadgeNeutral}>Time Under Load</span>
            </div>
            <span className={styles.kpiLabel}>Training Duration</span>
            <div className={styles.kpiValueRow}>
              <span className={styles.kpiValue}>{trainingHours}h {trainingMins}m</span>
            </div>
            <div className={styles.kpiSubPill}>
              Session Intensity: Avg RPE {summary.avg_session_rpe ?? '--'}/10
            </div>
          </div>

          {/* Card 8: Cardio Logged */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiCardTop}>
              <span className={`${styles.kpiIcon} ${styles.statIconRose}`}>
                <HeartPulse size={18} />
              </span>
              <span className={styles.kpiBadgeNeutral}>Conditioning</span>
            </div>
            <span className={styles.kpiLabel}>Cardio Logged</span>
            <div className={styles.kpiValueRow}>
              <span className={styles.kpiValue}>{summary.total_cardio_minutes}</span>
              <span className={styles.kpiUnit}>min</span>
            </div>
            <div className={styles.kpiSubPill}>
              {summary.total_cardio_sessions} conditioning sessions logged
            </div>
          </div>
        </div>
      </section>

      {/* Visual Analytics Charts Stack: Answering Core Empirical Questions */}
      <section id="sec-trends" className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}><TrendingUp size={18} />Empirical Biometric &amp; Adherence Trends</h2>
            <p className={styles.sectionSubtitle}>
              Granular trajectory analysis separating daily fluid bounce from true tissue adaptation
            </p>
          </div>

          <div className={styles.chartTabs}>
            <button
              type="button"
              className={`${styles.chartTab} ${chartTab === 'WEIGHT' ? styles.chartTabActive : ''}`}
              onClick={() => setChartTab('WEIGHT')}
            >
              <TrendingUp size={14} /> Weight Trajectory
            </button>
            <button
              type="button"
              className={`${styles.chartTab} ${chartTab === 'WAIST' ? styles.chartTabActive : ''}`}
              onClick={() => setChartTab('WAIST')}
            >
              <Ruler size={14} /> Waist Circumference
            </button>
            <button
              type="button"
              className={`${styles.chartTab} ${chartTab === 'ADHERENCE' ? styles.chartTabActive : ''}`}
              onClick={() => setChartTab('ADHERENCE')}
            >
              <Calendar size={14} /> Routine Adherence
            </button>
            <button
              type="button"
              className={`${styles.chartTab} ${chartTab === 'ALL' ? styles.chartTabActive : ''}`}
              onClick={() => setChartTab('ALL')}
            >
              <SlidersHorizontal size={14} /> View All Trends
            </button>
          </div>
        </div>

        <div className={styles.chartsStack}>
          {/* Chart 1: Weight Actual vs Rolling-Avg vs Target Trajectory */}
          {(chartTab === 'WEIGHT' || chartTab === 'ALL') && (
            <WeightTrajectoryChart
              weights={weight_log.map((w) => ({ date: w.date, weight_kg: w.weight_kg }))}
              trajectoryCurve={pacing?.trajectory_curve}
              startWeight={baselineWeight}
              targetWeight={targetWeight ?? baselineWeight}
              durationDays={program.duration_days}
              currentDay={program.current_day}
              startDate={program.start_date}
            />
          )}

          {/* Chart 2: Waist Circumference Trend */}
          {(chartTab === 'WAIST' || chartTab === 'ALL') && (
            <WaistTrendChart
              measurements={measurements_log.map((m, idx) => ({ id: String(idx), date: m.date, waist_cm: m.waist_cm }))}
              startingWaist={resolvedStartWaist}
            />
          )}

          {/* Chart 3: Weekly Routine Adherence Over Time */}
          {(chartTab === 'ADHERENCE' || chartTab === 'ALL') && (
            <AdherenceTrendChart
              weeklyReview={dashStats?.weekly_review || []}
              durationDays={program.duration_days}
              currentDay={program.current_day}
              startDate={program.start_date}
              adherencePct={pacing?.adherence?.adherence_pct ?? 100}
            />
          )}
        </div>
      </section>

      {/* Target & Milestone Checkpoints: Quarter, Halfway, Three-Quarter, Final */}
      {(() => {
        let expectedDeltaStr = '--';
        let expectedDeltaLabel = 'Expected Change';
        if (mode === 'BULK') expectedDeltaLabel = 'Expected Gain';
        else if (mode === 'CUT') expectedDeltaLabel = 'Expected Loss';

        if (baselineWeight != null && targetWeight != null) {
          const d = Math.round((targetWeight - baselineWeight) * 10) / 10;
          expectedDeltaStr = `${d > 0 ? '+' : ''}${d} kg`;
        }

        const targetRangeStr = targetWeight != null
          ? `${(targetWeight - 0.5).toFixed(1)} – ${(targetWeight + 0.5).toFixed(1)} kg`
          : 'Awaiting target';

        const q1 = Math.max(1, Math.round(program.duration_days * 0.25));
        const q2 = Math.max(q1 + 1, Math.round(program.duration_days * 0.5));
        const q3 = Math.max(q2 + 1, Math.round(program.duration_days * 0.75));
        const q4 = program.duration_days;

        const formatMilestoneDate = (dayNum: number) => {
          if (!program.start_date) return null;
          const [y, m, d] = program.start_date.split('-').map(Number);
          const dateObj = new Date(Date.UTC(y, m - 1, d + (dayNum - 1)));
          return dateObj.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            timeZone: 'UTC',
          });
        };

        const getTargetWeightAtDay = (dayNum: number) => {
          if (baselineWeight == null || targetWeight == null) return null;
          const fraction = (dayNum - 1) / Math.max(program.duration_days - 1, 1);
          const w = baselineWeight + fraction * (targetWeight - baselineWeight);
          return Math.round(w * 10) / 10;
        };

        const milestoneCopy: Record<JourneyMode, Array<[string, string]>> = {
          CUT: [
            ['Quarter milestone check-in', 'Evaluate water flush, early fat loss, and midsection tightness.'],
            ['Halfway checkpoint', 'Assess abdominal fat reduction vs compound strength preservation.'],
            ['Three-quarter checkpoint', 'Shoulder/chest definition, vascularity, and visible waist taper.'],
            ['Final transformation reveal', 'Final measurement comparison against Day 1 baseline.'],
          ],
          BULK: [
            ['Early hypertrophy check-in', 'Neuromuscular efficiency and baseline surplus adaptation.'],
            ['Halfway mass checkpoint', 'Working weight progression on compound lifts with clean surplus.'],
            ['Three-quarter volume check', 'Muscle fullness and strength gains across primary compounds.'],
            ['Final surplus review', 'Evaluate total lean mass accrual and strength 1RMs vs Day 1.'],
          ],
          FOCUS: [
            ['Technique calibration check-in', 'Bar speed and clean setup locked in on primary compound anchors.'],
            ['Halfway strength anchor check', 'Intermediate load ramp-up on target compound exercise.'],
            ['Three-quarter peak check', 'Heavy single/triple readiness and neurological recovery assessment.'],
            ['Final 1RM test & reveal', 'Test primary lift maxes against target 1RM goal.'],
          ],
          RECOMP: [
            ['Metabolic stabilization check-in', 'Establish rolling weight corridor and waist tape baseline.'],
            ['Halfway recomposition check', 'Waist tightening while compound lifts remain steady or climb.'],
            ['Three-quarter density check', 'Visual conditioning tightening with stable scale bodyweight.'],
            ['Final recomposition review', 'Side-by-side tape and photo comparison against Day 1.'],
          ],
          HABIT: [
            ['Early rhythm check-in', 'Establishing consistent daily morning weigh-ins and workout attendance.'],
            ['Halfway routine checkpoint', 'Frictionless habit execution across training, hydration, and sleep.'],
            ['Three-quarter streak check', 'Automated consistency with high adherence score.'],
            ['Final habit mastery review', 'Sustainable lifestyle foundation established for long-term fitness.'],
          ],
        };

        const currentModeMilestones = milestoneCopy[mode] || milestoneCopy.CUT;

        const checkpointItems = [
          {
            day: 1,
            title: 'Day 1 Baseline Kickoff',
            note: 'Establish morning fasted weigh-in baseline, waist circumference, and initial baseline photos.',
            targetW: baselineWeight,
            dateStr: formatMilestoneDate(1),
          },
          {
            day: q1,
            title: currentModeMilestones[0][0],
            note: currentModeMilestones[0][1],
            targetW: getTargetWeightAtDay(q1),
            dateStr: formatMilestoneDate(q1),
          },
          {
            day: q2,
            title: currentModeMilestones[1][0],
            note: currentModeMilestones[1][1],
            targetW: getTargetWeightAtDay(q2),
            dateStr: formatMilestoneDate(q2),
          },
          {
            day: q3,
            title: currentModeMilestones[2][0],
            note: currentModeMilestones[2][1],
            targetW: getTargetWeightAtDay(q3),
            dateStr: formatMilestoneDate(q3),
          },
          {
            day: q4,
            title: currentModeMilestones[3][0],
            note: currentModeMilestones[3][1],
            targetW: targetWeight,
            dateStr: formatMilestoneDate(q4),
          },
        ];

        return (
          <section id="sec-checkpoints" className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>
                  <Calendar size={18} />
                  {program.duration_days}-Day Target &amp; Milestone Checkpoints
                </h2>
                <p className={styles.sectionSubtitle}>
                  Strategic evaluation gates across 25%, 50%, 75%, and final transformation reveals
                </p>
              </div>
            </div>
            <Card>
              <div className={styles.milestoneStatsGrid}>
                <div className={styles.milestoneStatCard}>
                  <span className={styles.milestoneStatLabel}>Starting Weight</span>
                  <span className={styles.milestoneStatValue}>{baselineWeight != null ? `${baselineWeight} kg` : '—'}</span>
                </div>
                <div className={styles.milestoneStatCard}>
                  <span className={styles.milestoneStatLabel}>{program.duration_days}-Day Target Range</span>
                  <span className={`${styles.milestoneStatValue} ${styles.cyanText}`}>{targetRangeStr}</span>
                </div>
                <div className={styles.milestoneStatCard}>
                  <span className={styles.milestoneStatLabel}>{expectedDeltaLabel}</span>
                  <span className={styles.milestoneStatValue}>{expectedDeltaStr}</span>
                </div>
                <div className={styles.milestoneStatCard}>
                  <span className={styles.milestoneStatLabel}>Starting Waist</span>
                  <span className={styles.milestoneStatValue}>{resolvedStartWaist != null ? `${resolvedStartWaist} cm` : '—'}</span>
                </div>
              </div>

              <div className={styles.checkpointList}>
                {checkpointItems.map(({ day, title, note, targetW, dateStr }, idx) => {
                  const isPast = program.current_day > day;
                  const isNext = !isPast && (day === 1 || (program.current_day <= day && (idx === 0 || program.current_day > checkpointItems[idx - 1].day)));

                  return (
                    <div key={day} className={`${styles.checkpointRow} ${isNext ? styles.checkpointRowNext : ''}`}>
                      <div className={styles.checkpointDayCol}>
                        <div className={styles.checkpointDayHeader}>
                          <strong className={isPast ? `${styles.checkpointDay} ${styles.checkpointDayPast}` : styles.checkpointDay}>
                            Day {day}
                          </strong>
                          {isPast && <span className={`${styles.statusBadge} ${styles.statusBadgePassed}`}>Passed</span>}
                          {isNext && <span className={`${styles.statusBadge} ${styles.statusBadgeNext}`}>Next</span>}
                          {!isPast && !isNext && <span className={`${styles.statusBadge} ${styles.statusBadgeUpcoming}`}>Upcoming</span>}
                        </div>
                        {dateStr && <div className={styles.checkpointCalendarDate}>{dateStr}</div>}
                      </div>

                      <div className={styles.checkpointTargetCol}>
                        <span className={styles.checkpointTargetLabel}>Milestone Target</span>
                        <span className={styles.checkpointTargetValue}>
                          {targetW != null ? `${targetW} kg` : '—'}
                        </span>
                      </div>

                      <div className={styles.checkpointDescCol}>
                        <span className={styles.checkpointTitle}>{title}</span>
                        <span className={styles.checkpointNote}>{note}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className={styles.photoNote}>
                Tip: Take front, side, and back photos on Days 1, {q1}, {q2}, {q3}, and {q4} under consistent morning lighting and relaxed posture.
              </p>
            </Card>
          </section>
        );
      })()}

      {/* Body Circumference Measurements & History */}
      <section id="sec-measurements" className={styles.section}>
        <div className={styles.sectionHeaderRow}>
          <div className={styles.sectionHeaderLeft}>
            <Ruler size={18} color="var(--color-primary)" />
            <h2 className={styles.sectionTitle}>Body Circumference Measurements</h2>
          </div>
          <Link href="/app/measurements" className={styles.fullMeasurementsLink}>
            <span>Full Measurements &amp; Analytics</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className={styles.reportGrid}>
          <div className={styles.chartCard}>
            <h3 className={styles.sidePanelTitle}>Measurement Deltas (Start &rarr; Current)</h3>
            {measurementDeltas.length === 0 ? (
              <div className={styles.emptyNote}>No measurements logged during this journey.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginTop: '0.75rem' }}>
                {measurementDeltas.map((m) => (
                  <div key={m.key} className={styles.deltaCard}>
                    <span className={styles.deltaLabel}>{m.label}</span>
                    <span
                      className={`${styles.deltaValue} ${
                        (m.delta!.delta) < 0
                          ? styles.deltaNegative
                          : (m.delta!.delta) > 0
                          ? styles.deltaPositive
                          : styles.deltaNeutral
                      }`}
                    >
                      {m.delta!.start}cm &rarr; {m.delta!.current}cm ({m.delta!.delta > 0 ? '+' : ''}{m.delta!.delta})
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Training Performance & Volume */}
      <section id="sec-performance" className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}><Trophy size={18} />Training Performance &amp; Volume</h2>
        </div>
        <div className={styles.perfGrid}>
          <div className={styles.chartCard}>
            <MetricChart
              data={volumeChartData}
              title="Session Volume Trend"
              unit="kg"
              type="bar"
              color={meta.color}
              emptyMessage="No workouts logged during this journey."
            />
          </div>
          <aside className={styles.sidePanel}>
            <h3 className={styles.sidePanelTitle}>Muscle Group Focus</h3>
            {summary.muscle_breakdown.length === 0 ? (
              <div className={styles.emptyNote}>No completed sets logged yet.</div>
            ) : (
              <div className={styles.muscleList}>
                {summary.muscle_breakdown.map((m) => (
                  <div key={m.muscle} className={styles.muscleRow}>
                    <span className={styles.muscleName}>{m.muscle}</span>
                    <span className={styles.muscleBarTrack}>
                      <span className={styles.muscleBarFill} style={{ width: `${Math.round((m.sets / maxMuscleSets) * 100)}%`, background: meta.color }} />
                    </span>
                    <span className={styles.muscleCount}>{m.sets}</span>
                  </div>
                ))}
              </div>
            )}
          </aside>
        </div>
      </section>

      {/* Personal Records & Estimated 1RMs Table */}
      <section id="sec-records" className={styles.section}>
        <div className={styles.sectionHeaderRow}>
          <div className={styles.sectionHeaderLeft}>
            <Award size={18} color={meta.color} />
            <h2 className={styles.sectionTitle}>Personal Records &amp; Estimated 1RMs</h2>
          </div>
          <div className={styles.scopeTabs}>
            <button
              type="button"
              className={`${styles.scopeTab} ${prScope === 'JOURNEY' ? styles.scopeTabActive : ''}`}
              onClick={() => {
                setPrScope('JOURNEY');
                setPrPage(1);
              }}
            >
              This Journey ({personal_records.length})
            </button>
            <button
              type="button"
              className={`${styles.scopeTab} ${prScope === 'ALL_TIME' ? styles.scopeTabActive : ''}`}
              onClick={() => {
                setPrScope('ALL_TIME');
                setPrPage(1);
              }}
            >
              All-Time Records ({allPrs.length})
            </button>
          </div>
        </div>

        <Card>
          {activePrList.length === 0 ? (
            <div className={styles.emptyNote}>
              {prScope === 'JOURNEY'
                ? 'No new personal records achieved yet during this journey.'
                : 'No personal records logged yet.'}
            </div>
          ) : (
            <>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr className={styles.theadRow}>
                      <th className={styles.th}>Exercise</th>
                      <th className={styles.th}>Muscle Group</th>
                      <th className={styles.th}>Best Lift</th>
                      <th className={styles.th}>Estimated 1RM</th>
                      <th className={styles.th}>Date Achieved</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedPrs.map((pr: any, idx: number) => {
                      const name = pr.exercise || pr.exercise_name;
                      const muscle = pr.primary_muscle;
                      return (
                        <tr key={pr.id || `${name}-${idx}`} className={styles.tr}>
                          <td className={styles.tdName}>{name}</td>
                          <td className={styles.td}>
                            {muscle ? <Badge variant="emerald">{muscle}</Badge> : '—'}
                          </td>
                          <td className={styles.tdLift}>
                            <span className={styles.cyanText}>{pr.max_weight_kg} kg</span> &times; {pr.reps} reps
                          </td>
                          <td className={styles.td1rm}>{pr.estimated_one_rep_max} kg</td>
                          <td className={styles.tdDate}>{pr.achieved_at}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {prTotalPages > 1 && (
                <nav className={styles.pagination} aria-label="Personal records pagination">
                  <span className={styles.pageSummary}>
                    Showing {prStartIdx + 1}–{Math.min(prStartIdx + PR_PAGE_SIZE, activePrList.length)} of {activePrList.length}
                  </span>

                  <div className={styles.pageControls}>
                    <button
                      type="button"
                      className={styles.pageBtn}
                      onClick={() => setPrPage((p) => Math.max(1, p - 1))}
                      disabled={prSafePage === 1}
                      aria-label="Previous page"
                    >
                      <ChevronLeft size={16} />
                      <span className={styles.pageBtnLabel}>Prev</span>
                    </button>

                    <div className={styles.pageNumbers}>
                      {getPrPageNumbers().map((page, i) =>
                        page === '...' ? (
                          <span key={`ellipsis-${i}`} className={styles.pageEllipsis}>…</span>
                        ) : (
                          <button
                            key={page}
                            type="button"
                            onClick={() => setPrPage(Number(page))}
                            className={`${styles.pageNumber} ${prSafePage === page ? styles.pageNumberActive : ''}`}
                            aria-current={prSafePage === page ? 'page' : undefined}
                          >
                            {page}
                          </button>
                        )
                      )}
                    </div>

                    <button
                      type="button"
                      className={styles.pageBtn}
                      onClick={() => setPrPage((p) => Math.min(prTotalPages, p + 1))}
                      disabled={prSafePage === prTotalPages}
                      aria-label="Next page"
                    >
                      <span className={styles.pageBtnLabel}>Next</span>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </nav>
              )}
            </>
          )}
        </Card>
      </section>

      {/* Nutrition Adherence Section */}
      {nutrition_summary && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}><Utensils size={18} />Nutrition Adherence</h2>
            <span className={styles.sectionMeta}>{nutrition_summary.days_logged} of {nutrition_summary.days_in_range} days logged</span>
          </div>
          <div className={styles.nutritionGrid}>
            <div className={styles.nutritionCard}>
              <div className={styles.nutritionTop}><span>Avg Daily Calories</span><span>Target {nutrition_summary.calories_target}</span></div>
              <div className={styles.nutritionValue}>{nutrition_summary.avg_calories} kcal</div>
              <div className={styles.progressBarTrackLocal}>
                <div className={styles.progressBarFillLocal} style={{ width: `${Math.min(100, Math.round((nutrition_summary.avg_calories / nutrition_summary.calories_target) * 100))}%`, background: meta.color }} />
              </div>
            </div>
            <div className={styles.nutritionCard}>
              <div className={styles.nutritionTop}><span>Avg Daily Protein</span><span>Target {nutrition_summary.protein_target_g}g</span></div>
              <div className={styles.nutritionValue}>{nutrition_summary.avg_protein_g} g</div>
              <div className={styles.progressBarTrackLocal}>
                <div className={styles.progressBarFillLocal} style={{ width: `${Math.min(100, Math.round((nutrition_summary.avg_protein_g / nutrition_summary.protein_target_g) * 100))}%`, background: meta.color }} />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Day-by-Day Training Log Section */}
      <section id="sec-days" className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Day-by-Day Training Log</h2>
            <p className={styles.sectionSubtitle}>
              Detailed breakdown of prescribed exercises, working sets, weights, and logged session notes
            </p>
          </div>
        </div>

        <div className={styles.dayToolbar}>
          <div className={styles.filterTabs}>
            {(['ALL', 'COMPLETED', 'MISSED', 'UPCOMING'] as DayFilter[]).map((f) => (
              <button
                key={f}
                type="button"
                className={`${styles.filterTab} ${dayFilter === f ? styles.filterTabActive : ''}`}
                onClick={() => {
                  setDayFilter(f);
                  setDayPage(1);
                }}
              >
                {f.charAt(0) + f.slice(1).toLowerCase()} ({dayCounts[f]})
              </button>
            ))}
          </div>

          <div className={styles.dayToolbarActions}>
            <div className={styles.scopeTabs}>
              <button
                type="button"
                className={`${styles.scopeTab} ${viewScope === 'LATEST_5' ? styles.scopeTabActive : ''}`}
                onClick={() => {
                  setViewScope('LATEST_5');
                  setDayPage(1);
                }}
              >
                Latest 5 Days
              </button>
              <button
                type="button"
                className={`${styles.scopeTab} ${viewScope === 'ALL' ? styles.scopeTabActive : ''}`}
                onClick={() => {
                  setViewScope('ALL');
                  setDayPage(1);
                }}
              >
                All Days ({dayCounts[dayFilter]})
              </button>
            </div>

            <button
              type="button"
              className={styles.sortToggleBtn}
              onClick={() => {
                setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
                setDayPage(1);
              }}
              title={sortOrder === 'desc' ? 'Showing newest days first. Click to reverse.' : 'Showing oldest days first. Click to reverse.'}
            >
              <ArrowUpDown size={14} />
              <span>{sortOrder === 'desc' ? 'Newest first' : 'Oldest first'}</span>
            </button>
          </div>
        </div>

        <div className={styles.dayList}>
          {displayedDays.length === 0 ? (
            <div className={styles.emptyNote}>No days match the selected filter.</div>
          ) : (
            displayedDays.map((d) => (
              <DayRow key={d.id} day={d} currentDay={program.current_day} />
            ))
          )}
        </div>

        {dayTotalPages > 1 && viewScope !== 'ALL' && (
          <nav className={styles.pagination} aria-label="Day log pagination">
            <span className={styles.pageSummary}>
              Showing page {daySafePage} of {dayTotalPages} ({sortedDays.length} days total)
            </span>

            <div className={styles.pageControls}>
              <button
                type="button"
                className={styles.pageBtn}
                onClick={() => setDayPage((p) => Math.max(1, p - 1))}
                disabled={daySafePage === 1}
                aria-label="Previous day log page"
              >
                <ChevronLeft size={16} />
                <span className={styles.pageBtnLabel}>Prev</span>
              </button>

              <div className={styles.pageNumbers}>
                {getDayPageNumbers().map((page, i) =>
                  page === '...' ? (
                    <span key={`ellipsis-${i}`} className={styles.pageEllipsis}>…</span>
                  ) : (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setDayPage(Number(page))}
                      className={`${styles.pageNumber} ${daySafePage === page ? styles.pageNumberActive : ''}`}
                      aria-current={daySafePage === page ? 'page' : undefined}
                    >
                      {page}
                    </button>
                  )
                )}
              </div>

              <button
                type="button"
                className={styles.pageBtn}
                onClick={() => setDayPage((p) => Math.min(dayTotalPages, p + 1))}
                disabled={daySafePage === dayTotalPages}
                aria-label="Next day log page"
              >
                <span className={styles.pageBtnLabel}>Next</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </nav>
        )}
      </section>

      {/* Log Weight Modal */}
      <Modal isOpen={logWeightModal} onClose={() => setLogWeightModal(false)} title="Log Daily Weight">
        <div className={styles.modalForm}>
          <div>
            <label className={styles.formLabel}>Weight (kg)</label>
            <input
              type="number"
              step="0.1"
              value={newWeight}
              onChange={(e) => setNewWeight(parseFloat(e.target.value) || 0)}
              className={`${styles.formInput} ${styles.formInputWeight}`}
            />
          </div>

          <div>
            <label className={styles.formLabel}>Body Fat % (Optional)</label>
            <input
              type="number"
              step="0.1"
              value={newBf}
              onChange={(e) => setNewBf(parseFloat(e.target.value) || 0)}
              className={styles.formInput}
            />
          </div>

          <div>
            <label className={styles.formLabel}>Notes</label>
            <textarea
              rows={2}
              placeholder="e.g. Morning weighed fasted after workout day..."
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              className={`${styles.formInput} ${styles.formTextarea}`}
            />
          </div>

          <div className={styles.formActions}>
            <Button variant="secondary" onClick={() => setLogWeightModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleLogWeight} disabled={savingWeight}>
              {savingWeight ? 'Logging...' : 'Save Entry'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Plan Selector Modal */}
      <PlanSelectorModal
        isOpen={planModalOpen}
        onClose={() => setPlanModalOpen(false)}
        onSuccess={() => loadData()}
        initialWeight={rolling7Avg || currentWeight || baselineWeight || 75.0}
      />
    </div>
  );
}
