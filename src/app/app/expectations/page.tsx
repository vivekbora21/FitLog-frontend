'use client';

import { useEffect, useMemo, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { api } from '@/lib/api';
import { getModeMeta } from '@/lib/journeyModes';
import { JourneyMode, JourneyPacingData } from '@/lib/types';
import { PlanSelectorModal } from '@/components/PlanSelectorModal';
import styles from './expectations.module.css';

type Program = {
  mode?: JourneyMode;
  mode_label?: string;
  duration_days: number;
  current_day: number;
  start_weight_kg?: number;
  target_weight_kg?: number;
} | null;

type TrackedLift = {
  exercise: string;
  estimated_1rm: number;
  summary?: string;
};

function fmtDelta(delta: number, unit: string) {
  const rounded = Math.round(delta * 10) / 10;
  return `${rounded > 0 ? '+' : ''}${rounded}${unit}`;
}

function getBenchmarkRows(
  mode: JourneyMode,
  startWeight?: number,
  targetWeight?: number,
  currentWeight?: number | null,
  startWaist?: number | null,
  currentWaist?: number | null,
  focusLift?: TrackedLift | null
) {
  const hasWeights = startWeight != null && targetWeight != null;
  const change = hasWeights ? Math.round((targetWeight! - startWeight!) * 10) / 10 : null;
  const changeStr = change == null ? 'Set start & target weight to see this' : `${change > 0 ? '+' : ''}${change} kg`;
  const weightProgress = currentWeight != null && startWeight != null
    ? `${currentWeight} kg today (${fmtDelta(currentWeight - startWeight, ' kg')} vs Day 1)`
    : changeStr;

  const hasWaists = startWaist != null && currentWaist != null;
  const waistProgress = hasWaists
    ? `${currentWaist} cm today (${fmtDelta(currentWaist! - startWaist!, ' cm')} vs Day 1)`
    : 'Log a waist measurement to see this';

  const byMode: Record<JourneyMode, { composition: string; energy: string }> = {
    CUT: {
      composition: 'Body fat percentage trending down as the caloric deficit progresses.',
      energy: 'Occasional afternoon dips are normal; stabilizes as the body adapts to the deficit.',
    },
    BULK: {
      composition: 'Lean mass share increasing; some fat gain is expected with a clean surplus.',
      energy: 'Generally high with consistent fueling and recovery.',
    },
    FOCUS: {
      composition: 'Held steady — this mode optimizes the nervous system, not body composition.',
      energy: 'Peaks around scheduled heavy sessions; prioritize rest between them.',
    },
    RECOMP: {
      composition: 'Slow simultaneous shift: fat down, muscle steady or slightly up.',
      energy: 'Moderate; consistency matters more than any single day.',
    },
    HABIT: {
      composition: 'Not a primary target in this mode — the goal is showing up.',
      energy: 'Improves steadily as sleep, steps and attendance become routine.',
    },
  };

  const m = byMode[mode];

  const strengthBaseline = 'Not captured at journey start';
  const strengthTarget = focusLift?.summary?.includes('% of') ? 'Set in your plan' : 'Not set';
  const strengthProgress = focusLift ? (focusLift.summary || `1RM: ${focusLift.estimated_1rm}kg`) : 'Log a set on your focus lift to see this';
  const strengthMechanism = focusLift ? `Tracked via logged PRs on ${focusLift.exercise}` : 'Progressive overload + protein intake';

  return [
    ['Body Weight', hasWeights ? `${startWeight} kg` : '--', hasWeights ? `${targetWeight} kg` : 'Not set', weightProgress, 'Weekly rate paced from your plan', currentWeight != null ? 'Live' : 'Estimated'],
    ['Waist Circumference', startWaist != null ? `${startWaist} cm` : '--', 'Trending toward goal', waistProgress, m.composition, hasWaists ? 'Live' : 'Log measurements to enable'],
    ['Key Lift Strength', strengthBaseline, strengthTarget, strengthProgress, strengthMechanism, focusLift ? 'Live' : 'No PRs logged yet'],
    ['Energy & Recovery', 'Variable', 'Stable & consistent', m.energy, 'Sleep, hydration, and adherence', 'Estimated'],
  ] as const;
}

function getPhases(mode: JourneyMode, duration: number, currentDay: number) {
  const q1 = Math.max(1, Math.round(duration * 0.25));
  const q2 = Math.max(q1 + 1, Math.round(duration * 0.5));
  const q3 = Math.max(q2 + 1, Math.round(duration * 0.75));

  const verbs: Record<JourneyMode, [string, string, string, string]> = {
    CUT: [
      'Water weight drops, metabolic and hunger cues adjust to the initial caloric deficit.',
      'Visible waist and facial slimming begins; rolling 7-day average forms a clear downward corridor.',
      'Strength compound anchors hold steady while regional subcutaneous fat loss accelerates.',
      'Final definition sharpens; side-by-side photo comparison against Day 1 baseline.',
    ],
    BULK: [
      'Neuromuscular coordination builds on compound anchors; clean surplus adaptation.',
      'Working weights and reps climb; glycogen fullness increases throughout muscle bellies.',
      'Upper torso and lower body thickness visibly increases while maintaining clean waist corridor.',
      'Compare 1RMs and total lean mass accrual against Day 1 baseline; plan subsequent phase.',
    ],
    FOCUS: [
      'Setup mechanics, bar speed, and neural intent calibrated on primary compound anchors.',
      'Working load progression and volume density ramp up on specialization lifts.',
      'Peak week approaches; fatigue managed through extended set rest and pristine recovery.',
      'Test primary lift 1RMs and record verified all-time personal records.',
    ],
    RECOMP: [
      'Establishing a stable morning weigh-in baseline and training cadence.',
      'Waist tape measurement trends down while compound working weights remain steady or climb.',
      'Visual muscular density tightens with zero scale crash or energy depletion.',
      'Reassess full body composition via tape measurements and progress photo comparison.',
    ],
    HABIT: [
      'Building the daily morning weigh-in and weekly workout attendance rhythm.',
      'Gym attendance becomes an automated routine rather than a daily mental negotiation.',
      'Missed sessions become rare exceptions quickly recovered via the 2-day rule.',
      'Consistency streak locked in as an enduring, sustainable lifestyle habit.',
    ],
  };

  const v = verbs[mode] || verbs.CUT;
  return [
    { label: `Days 1–${q1}`, text: v[0], isCurrent: currentDay >= 1 && currentDay <= q1 },
    { label: `Days ${q1 + 1}–${q2}`, text: v[1], isCurrent: currentDay > q1 && currentDay <= q2 },
    { label: `Days ${q2 + 1}–${q3}`, text: v[2], isCurrent: currentDay > q2 && currentDay <= q3 },
    { label: `Days ${q3 + 1}–${duration} (Final)`, text: v[3], isCurrent: currentDay > q3 },
  ];
}

function getModeLaws(mode: JourneyMode) {
  if (mode === 'BULK') {
    return [
      {
        title: '1. The Hypertrophy Surplus Law',
        foundation: 'Muscle protein synthesis requires positive energy availability; an excessive deficit halts lean tissue accrual.',
        pitfall: 'Dirty bulking with excessive junk calories, resulting in unnecessary adipose tissue gain.',
        habit: 'Maintain a disciplined, clean +200–300 kcal surplus anchored around complete proteins and complex carbohydrates.',
      },
      {
        title: '2. The Mechanical Tension Law',
        foundation: 'Progressive overload in the 6–12 rep range is the primary mechanical trigger for myofibrillar hypertrophy.',
        pitfall: 'Chasing an exhausting "pump" or sweat rather than recording logbook progression on compound anchors.',
        habit: 'Fight for every clean rep and add weight or reps on compound movements every 1–2 weeks.',
      },
      {
        title: '3. The Leucine Trigger Law',
        foundation: 'Each main meal needs roughly 2.5–3.5g of leucine to fully activate the mTOR pathway for muscle repair.',
        pitfall: 'Grazing on small, incomplete protein snacks that never reach the threshold required for synthesis.',
        habit: 'Anchor 4 meals daily with 30–45g of complete bioavailable protein (chicken, eggs, soya, paneer, curd).',
      },
      {
        title: '4. The Sleep Anabolism Law',
        foundation: 'Deep slow-wave sleep is the primary physiological window for growth hormone and testosterone release.',
        pitfall: 'Trading sleep for late nights or overtraining without giving muscle tissue time to repair.',
        habit: 'Protect 7.5–8.5 hours in a cool, dark room — sleep is when actual muscle growth occurs.',
      },
    ];
  }
  if (mode === 'FOCUS') {
    return [
      {
        title: '1. The Neurological Adaptation Law',
        foundation: 'Strength gains are primarily driven by motor unit synchronization, rate coding, and movement efficiency.',
        pitfall: 'Changing exercises too frequently so the nervous system never masters the specific motor pattern.',
        habit: 'Keep compound anchors identical week-over-week and refine barbell setup mechanics.',
      },
      {
        title: '2. The Specificity & Intent Law',
        foundation: 'To maximize 1RM strength, you must practice the specific movement pattern with maximum explosive intent.',
        pitfall: 'Accumulating excessive fatigue-inducing junk volume that drains recovery without building strength.',
        habit: 'Treat every working set with RPE 8–9 focus and rest 2.5–3.5 minutes between heavy sets.',
      },
      {
        title: '3. The Central Nervous System Recovery Law',
        foundation: 'Heavy compound loads place demands on both muscular tissue and the central nervous system.',
        pitfall: 'Grinding sets to absolute failure on spinal lifts every workout, accumulating systemic burnout.',
        habit: 'End sets with 1–2 clean reps in reserve and deload immediately if bar speed drops across sessions.',
      },
      {
        title: '4. The Connective Tissue Preservation Law',
        foundation: 'Tendons and ligaments adapt slower than skeletal muscle; joint integrity requires consistent nutrition.',
        pitfall: 'Restricting calories or neglecting daily hydration, leading to joint aches and stalled lifts.',
        habit: 'Maintain energy balance and hit your daily protein and hydration targets consistently.',
      },
    ];
  }
  if (mode === 'HABIT') {
    return [
      {
        title: '1. The Two-Day Rule',
        foundation: 'Missing a single workout has negligible physiological impact; missing two consecutive sessions creates a negative trend.',
        pitfall: 'Letting one busy day turn into an entire skipped week of training and logging.',
        habit: 'If time is compressed, complete an abbreviated 15-minute session rather than skipping entirely.',
      },
      {
        title: '2. The Friction Minimization Law',
        foundation: 'The easiest habit to execute is the one with the fewest environmental obstacles.',
        pitfall: 'Relying on motivation and willpower in the early morning.',
        habit: 'Pack gym clothes and prepare your water and morning routine the night before.',
      },
      {
        title: '3. The Identity Loop Law',
        foundation: 'Every logged workout and weigh-in is an active vote for the healthy identity you are cultivating.',
        pitfall: 'Obsessing solely over distant physical outcomes rather than the satisfaction of showing up.',
        habit: 'Celebrate daily attendance streaks; physical transformation is a natural byproduct of consistency.',
      },
      {
        title: '4. The Recovery Baseline Law',
        foundation: 'Consistent sleep and hydration stabilize energy, mood, and daily self-discipline.',
        pitfall: 'Erratic sleep schedules that lead to morning exhaustion and missed gym visits.',
        habit: 'Protect a regular bedtime routine and drink a full glass of water immediately upon waking.',
      },
    ];
  }
  // Default CUT / RECOMP
  return [
    {
      title: '1. The Scale Lie Law',
      foundation: 'Muscle tissue is denser than fat. Your body can look meaningfully different while the scale barely moves.',
      pitfall: 'Panicking when the scale stalls for a few days due to water or sodium, then over-correcting with extreme cuts.',
      habit: 'Trust the 7-day rolling average and periodic measurements over any single day’s reading.',
    },
    {
      title: '2. The Mechanical Tension Law',
      foundation: 'Heavy resistance training signals your body that muscle tissue is worth keeping, regardless of calorie balance.',
      pitfall: 'Switching to light weights and high reps to "tone" — this accelerates muscle loss, not fat loss.',
      habit: 'Keep pushing heavy compound anchors at RPE 8–9; fight for every clean rep.',
    },
    {
      title: '3. The Leucine Trigger Law',
      foundation: 'Muscle protein synthesis needs a real dose of leucine (roughly 2.5–3g) per meal to switch on and prevent catabolism.',
      pitfall: 'Eating small, incomplete protein snacks that never actually trigger repair.',
      habit: 'Anchor every meal with 25–40g of complete protein (eggs, chicken, soy, paneer, dal).',
    },
    {
      title: '4. The Sleep Anabolism Law',
      foundation: 'Most nightly growth hormone and testosterone release happens during deep, slow-wave sleep.',
      pitfall: 'Trading sleep for a late-night scroll or an early cardio session without adequate rest.',
      habit: 'Protect 7.5–8.5 hours in a cool, dark room — sleep is when the actual adaptation happens.',
    },
  ];
}

export default function ExpectationsPage() {
  const [program, setProgram] = useState<Program>(null);
  const [pacing, setPacing] = useState<JourneyPacingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadData = () => {
    Promise.all([
      api.getWorkoutPlan().catch(() => null),
      api.getJourneyPacingStatus().catch(() => null),
    ])
      .then(([planRes, pacingRes]) => {
        if (planRes?.program) setProgram(planRes.program);
        if (pacingRes) setPacing(pacingRes);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const mode = (program?.mode || pacing?.mode || 'CUT') as JourneyMode;
  const meta = getModeMeta(mode);
  const duration = program?.duration_days || pacing?.duration_days || 60;
  const currentDay = pacing?.current_day || program?.current_day || 1;

  const startWeight = program?.start_weight_kg ?? pacing?.velocity?.start_weight;
  const targetWeight = program?.target_weight_kg ?? pacing?.target_weight ?? pacing?.velocity?.expected_final_weight;
  const currentWeight = pacing?.velocity?.rolling_7_avg;
  const startWaist = pacing?.starting_waist;
  const currentWaist = pacing?.current_waist;
  const focusLift = pacing?.strength?.tracked_lifts?.[0] || null;

  const benchmarks = useMemo(
    () => getBenchmarkRows(mode, startWeight, targetWeight, currentWeight, startWaist, currentWaist, focusLift),
    [mode, startWeight, targetWeight, currentWeight, startWaist, currentWaist, focusLift]
  );
  const phases = useMemo(() => getPhases(mode, duration, currentDay), [mode, duration, currentDay]);
  const laws = useMemo(() => getModeLaws(mode), [mode]);

  if (loading) return <p className={styles.subtitle}>Loading your plan expectations...</p>;

  if (!program && !pacing?.has_program) {
    return (
      <div className={styles.emptyState}>
        <div>
          <strong>No active plan yet.</strong>
          <p className={styles.emptyStateHint}>Start a journey to see milestones and expectations tailored to your mode and duration.</p>
        </div>
        <button type="button" className={styles.startBtn} onClick={() => setIsModalOpen(true)}>
          <SlidersHorizontal size={15} /> Select a Plan
        </button>
        <PlanSelectorModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={() => window.location.reload()} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header>
        <div className={styles.eyebrow} style={{ color: meta.color }}>
          {duration}-DAY {(program?.mode_label || pacing?.mode_label || meta.label).toUpperCase()} TRANSFORMATION BLUEPRINT
        </div>
        <h1 className={styles.title}>Realistic milestones, not a promise.</h1>
        <p className={styles.subtitle}>
          What this journey ({meta.focus}) looks and feels like, read alongside your weekly trends, measurements and photos.
        </p>
      </header>

      <section>
        <h2 className={styles.sectionTitle}>1. Benchmarks: Day 1 vs. Day {duration}</h2>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Metric</th>
                <th className={styles.th}>Day 1 Baseline</th>
                <th className={styles.th}>Day {duration} Target</th>
                <th className={styles.th}>Progress</th>
                <th className={styles.th}>Primary Mechanism</th>
                <th className={styles.th}>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {benchmarks.map(([metric, baseline, target, change, mechanism, confidence]) => (
                <tr key={metric}>
                  <td className={`${styles.td} ${styles.tdStrong}`}>{metric}</td>
                  <td className={styles.td}>{baseline}</td>
                  <td className={`${styles.td} ${styles.tdAccent}`}>{target}</td>
                  <td className={styles.td}>{change}</td>
                  <td className={`${styles.td} ${styles.tdMuted}`}>{mechanism}</td>
                  <td className={styles.td}>{confidence}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className={styles.timelineHeaderRow}>
          <h2 className={`${styles.sectionTitle} ${styles.timelineHeaderTitle}`}>2. Journey timeline</h2>
          <span className={styles.timelineMeta}>
            Current Progress: Day {currentDay} of {duration}
          </span>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                {phases.map((p) => (
                  <th
                    key={p.label}
                    className={`${styles.th} ${p.isCurrent ? styles.thCurrent : ''}`}
                  >
                    <div>{p.label}</div>
                    {p.isCurrent && (
                      <span className={styles.activeLabel}>● Active (Day {currentDay})</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {phases.map((p) => (
                  <td
                    key={p.label}
                    className={`${styles.td} ${p.isCurrent ? styles.tdCurrent : ''}`}
                  >
                    {p.text}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className={styles.sectionTitle}>3. The four scientific laws of {meta.label.toLowerCase()}</h2>
        <div className={styles.lawsGrid}>
          {laws.map((law) => (
            <div key={law.title} className={styles.lawCard}>
              <strong className={styles.lawTitle}>{law.title}</strong>
              <p className={styles.lawText}>{law.foundation}</p>
              <p className={styles.lawPitfall}><strong>Pitfall: </strong>{law.pitfall}</p>
              <p className={styles.lawHabit}><strong>Winning habit: </strong>{law.habit}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
