'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { SlidersHorizontal, AlertCircle, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { getModeMeta } from '@/lib/journeyModes';
import { JourneyMode } from '@/lib/types';
import { PlanSelectorModal } from '@/components/PlanSelectorModal';
import { Badge } from '@/components/ui/Badge';
import styles from './guidelines.module.css';

// Reference Material: Sourced from the user's "New start.xlsx" Diet Plan sheet — content kept verbatim.
const optionA = [
  ['Meal 1: Pre-Workout', 'Black Coffee + Soaked Almonds + Banana', '1 mug coffee + 6 almonds + 1 banana', 150, 3, 28, 4],
  ['Meal 2: Breakfast', 'Rolled Oats with Toned Milk & Cinnamon', '65g oats + 200ml toned milk', 340, 14, 54, 6],
  ['Meal 2: Breakfast', 'Whole Boiled Eggs + Steamed Egg Whites', '2 whole eggs + 3 egg whites', 230, 23, 2, 11],
  ['Meal 3: Mid-Morning', 'Green Tea & Roasted Chana (Phutana)', '1 cup tea + 35g roasted chana', 125, 8, 19, 2],
  ['Meal 4: Lunch', 'Soya Chunks Bhurji / Chicken Curry + Dal + Rotis', '50g soya (or 120g chicken) + dal + 2 rotis + salad', 630, 50, 82, 8],
  ['Meal 5: Evening Snack', 'Homemade Low-Fat Curd (Dahi) + Roasted Chana', '200g dahi + 35g roasted chana', 240, 17, 27, 6],
  ['Meal 6: Dinner', 'Pan-Seared Chicken Breast / Paneer + Rice + Sabzi', '150g chicken (or 130g paneer) + 160g rice + sabzi', 445, 50, 52, 6],
] as const;

const optionATotal = optionA.reduce(
  (t, [, , , calories, protein, carbs, fat]) => ({
    calories: t.calories + calories,
    protein: t.protein + protein,
    carbs: t.carbs + carbs,
    fat: t.fat + fat,
  }),
  { calories: 0, protein: 0, carbs: 0, fat: 0 }
);

const optionB = [
  ['Meal 1: Pre-Workout', 'Black Coffee + 5 Soaked Almonds', '1 mug coffee + 5 almonds', 40, 1, 1, 3],
  ['Meal 2: Breakfast', 'Rolled Oats with Toned Milk & Boiled Eggs', '55g oats + 180ml milk + 2 whole eggs', 450, 26, 49, 16],
  ['Meal 3: Mid-Morning', 'Fresh Ripe Banana + Green Tea', '1 medium banana + 1 cup green tea', 100, 1, 25, 0],
  ['Meal 4: Lunch', 'Spiced Chicken Breast Curry / Soya + Dal + Rotis', '65g chicken (or 45g soya) + dal + 2 rotis + salad', 515, 40, 77, 6],
  ['Meal 5: Evening Snack', 'Dry Roasted Chana + Low-Fat Dahi', '45g roasted chana + 180g homemade curd', 280, 19, 33, 6],
  ['Meal 6: Dinner', 'Chicken & Egg / Soya Bhurji + Rice + Sabzi', '65g chicken + egg white (or soya + paneer) + 200g rice + sabzi', 535, 44, 70, 10],
] as const;

const optionBTotal = { calories: 1920, protein: 131, carbs: 255, fat: 41 };

const staples = [
  ['Soya Chunks (Dry)', '40g dry weighed', '21g', 138, 'Tier 1: 52% protein (soak & squeeze)'],
  ['Whole Farm Eggs', '3 large eggs', '19g', 210, 'Tier 1: bioavailable complete protein'],
  ['Skinless Chicken Breast', '100g raw weighed', '31g', 120, 'Tier 1: high leucine lean muscle anchor'],
  ['Yellow Moong / Masoor Dal', '60g raw (1 cup cooked)', '14g', 205, 'Tier 2: essential daily amino pulse'],
  ['Homemade Low-Fat Dahi', '200g set curd', '9g', 120, 'Tier 2: slow-release casein & gut probiotic'],
  ['Roasted Chana (Bengal Gram)', '50g dry weighed', '11g', 180, 'Tier 2: low-GI high-fiber portable snack'],
  ['Rolled Oats (Plain)', '60g dry weighed', '8g', 230, 'Tier 3: beta-glucan heart & sustained energy'],
] as const;

type Program = {
  mode?: JourneyMode;
  mode_label?: string;
  duration_days: number;
  target_cardio_minutes_early?: number;
  target_cardio_minutes_later?: number;
  focus_exercise?: { name: string };
  target_focus_1rm?: number;
} | null;

function buildGuides(
  duration: number,
  cardioEarly: number,
  cardioLater: number,
  mode: JourneyMode,
  waterMl: number | null,
  proteinG: number | null,
  caloriesKcal: number | null
) {
  const photoDays = Array.from(
    new Set([1, Math.round(duration * 0.25), Math.round(duration * 0.5), Math.round(duration * 0.75), duration])
  ).sort((a, b) => a - b);
  const photoInterval = Math.max(7, Math.round(duration / (photoDays.length - 1)));

  const waterL = waterMl != null ? (waterMl / 1000).toFixed(1) : '—';
  const waterUpperL = waterMl != null ? ((waterMl + 500) / 1000).toFixed(1) : '—';

  const stepProtocol = mode === 'BULK'
    ? ['6,000–8,000 Steps Daily', 'Maintain baseline cardiovascular health and digestive motility without creating excessive caloric expenditure that opposes your muscle-building surplus.', 'Preserves surplus calories for muscle tissue accrual while sustaining insulin sensitivity.']
    : mode === 'FOCUS' || mode === 'HABIT'
    ? ['7,000–9,000 Steps Daily', 'Accumulate steady daily baseline activity via post-meal walks and stairs to improve systemic recovery and movement quality.', 'Maintains metabolic health without accumulating systemic fatigue.']
    : ['8,000–10,000 Steps Daily', 'Accumulate daily steps via post-meal walks, stairs, and regular standing breaks during desk hours. Log the daily step count in the Daily Log.', 'Burns non-fatiguing baseline energy without spiking appetite or interfering with gym recovery.'];

  const rirProtocol = mode === 'HABIT'
    ? ['RPE 6–7 (2–3 Reps in Reserve)', 'Prioritize showing up and building flawless movement patterns. Stop well short of muscular failure to minimize soreness and lock in training consistency.', 'Prevents excessive delayed-onset muscle soreness so workout frequency remains frictionless.']
    : ['RPE 8–9 (1–2 Reps in Reserve)', 'Finish compound sets with 1–2 clean reps in reserve. Avoid muscular failure on heavy spinal lifts (squat, deadlift). End the set immediately if form breaks down.', 'Maximizes muscle stimulation while minimizing excessive fatigue that compromises recovery.'];

  const overloadProtocol = mode === 'FOCUS'
    ? ['Compound Anchor Specialization', 'Prioritize technical bar speed and perfect setup on your target compound lifts. Add load only when bar path is crisp and all prescribed reps are clean.', 'Builds high-threshold motor unit recruitment and neurological coordination.']
    : ['Double Progression Logic', 'When all prescribed sets hit the top rep target with clean form, increase weight by 1.25–2.5 kg. If reps are not achieved, hold the weight and build reps. Never force weight.', 'Provides the mechanical-tension stimulus the body needs to build or preserve muscle.'];

  return [
    ['1. Morning Weigh-In Consistency', 'Daily Fasted Weigh-In', 'Step on the scale every morning after the bathroom, before food or water. Enter it in the Daily Log. Prioritize the 7-day average rather than reacting to daily fluctuations.', 'Filters out normal sodium and water shifts to reveal the true biological trend.'],
    ['2. Weekly Waist Measurement', 'Sunday Fasted Tape Check', 'Measure once per week at the navel on a relaxed breath. Keep the tape level and avoid pulling it tight. Log it in the Progress Tracker.', 'Provides evidence of body composition change that scale weight alone cannot show.'],
    [`3. Progress Photos Every ~${photoInterval} Days`, `Days ${photoDays.join(', ')}`, 'Take front, side, and back photos under consistent lighting and a relaxed posture. Store links in the Progress Tracker photo section.', 'Visual evidence of change that scale weight alone cannot show.'],
    ['4. Progressive Overload Framework', overloadProtocol[0], overloadProtocol[1], overloadProtocol[2]],
    ['5. RIR / RPE Set Intensity', rirProtocol[0], rirProtocol[1], rirProtocol[2]],
    ['6. Rest Periods Between Sets', '2–3m Compounds • 60–90s Isolations', 'Rest 2–3 minutes on heavy compound lifts (bench, deadlift, leg press) and 60–90 seconds on isolation and core movements.', 'Allows full muscular and neurological recovery so each working set stays high quality.'],
    ['7. Sleep & Physical Recovery', '7.5–8.5 Hours Nightly', 'Aim for 7.5–8.5 hours in a cool, dark room. Maintain a consistent bedtime routine. If unusually exhausted, prioritize extra sleep over pushing volume.', 'The foundational window for muscle repair, hormonal balance, appetite regulation, and energy.'],
    ['8. Hydration & Daily Fluids', `${waterL}–${waterUpperL} Litres Water Daily`, `Drink 500ml upon waking, sip steadily during workouts, and keep a water bottle nearby to reach your personalized ${waterMl?.toLocaleString() ?? '—'}ml daily target.`, 'Supports cellular hydration, muscular stamina, nutrient transport, and efficient digestion.'],
    ['9. Nutrition & Protein Anchor', `~${proteinG ?? '—'}g Protein • ~${caloriesKcal?.toLocaleString() ?? '—'} kcal`, `Anchor every main meal with 25–40g of high-quality complete protein (eggs, chicken, soy, curd, paneer) to protect or build muscle while honoring your calorie goal.`, 'Ensures adequate leucine threshold triggering muscle protein synthesis.'],
    ['10. Daily Steps & NEAT Activity', stepProtocol[0], stepProtocol[1], stepProtocol[2]],
    ['11. Cardio Progression Protocol', `${cardioEarly}min/wk (early) → ${cardioLater}min/wk (later)`, `Start at roughly ${cardioEarly} min/week of Zone 2 cardio (incline treadmill, bike, cross trainer). Gradually build toward ${cardioLater} min/week only if recovery and energy remain high.`, 'Builds aerobic base and recovery capacity without compromising strength or training recovery.'],
    ['12. Deload & Fatigue Management', 'Proactive Recovery Management', 'If strength drops across 2+ workouts or joints feel beat up: hold weights, halve volume, and assess calories/sleep. Do not force volume when recovery is poor.', 'Prevents overtraining and systemic burnout, resetting the body for sustainable progress.'],
  ] as const;
}

export default function GuidelinesPage() {
  const [program, setProgram] = useState<Program>(null);
  const [nutritionTarget, setNutritionTarget] = useState<{ water_ml: number; protein_g: number; daily_calories: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      api.getWorkoutPlan().catch(() => null),
      api.getNutrition('today').catch(() => null),
    ])
      .then(([planRes, nutRes]) => {
        if (planRes?.program) setProgram(planRes.program);
        if (nutRes?.targets) {
          setNutritionTarget({
            water_ml: nutRes.targets.water_ml,
            protein_g: nutRes.targets.protein_g,
            daily_calories: nutRes.targets.daily_calories,
          });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const mode = (program?.mode || 'CUT') as JourneyMode;
  const meta = getModeMeta(mode);
  const duration = program?.duration_days || 60;
  const cardioEarly = program?.target_cardio_minutes_early ?? meta.defaultCardioEarly;
  const cardioLater = program?.target_cardio_minutes_later ?? meta.defaultCardioLater;
  const waterMl = nutritionTarget?.water_ml ?? null;
  const proteinG = nutritionTarget?.protein_g ?? null;
  const caloriesKcal = nutritionTarget?.daily_calories ?? null;

  const guides = useMemo(
    () => buildGuides(duration, cardioEarly, cardioLater, mode, waterMl, proteinG, caloriesKcal),
    [duration, cardioEarly, cardioLater, mode, waterMl, proteinG, caloriesKcal]
  );

  if (loading) return <p className={styles.loading}>Loading guidelines...</p>;

  return (
    <div className={styles.page}>
      <header>
        <div className={styles.eyebrow} style={{ color: meta.color }}>
          {program ? `${duration}-DAY ${(program.mode_label || meta.label).toUpperCase()} EXECUTION GUIDELINES` : 'EXECUTION GUIDELINES'}
        </div>
        <h1 className={styles.title}>Core principles for training, nutrition, and recovery.</h1>
        {!program && (
          <div className={`${styles.emptyState} ${styles.emptyStateSpaced}`}>
            <p className={styles.emptyStatePrompt}>Start a plan to personalize cardio targets and photo cadence to your mode and duration.</p>
            <button type="button" className={styles.startBtn} onClick={() => setIsModalOpen(true)}>
              <SlidersHorizontal size={15} /> Select a Plan
            </button>
          </div>
        )}
      </header>

      <div className={styles.grid}>
        {guides.map(([pillar, protocol, instructions, why]) => (
          <details key={pillar} className={styles.item}>
            <summary className={styles.summary}>
              {pillar}
              <span className={styles.protocol}>{protocol}</span>
            </summary>
            <p className={styles.instructions}>{instructions}</p>
            <p className={styles.why}><strong className={styles.whyLabel}>Why: </strong>{why}</p>
          </details>
        ))}
      </div>

      {/* Reference Diet Blueprint Section */}
      <section className={styles.referenceSection}>
        <div className={styles.referenceNotice}>
          <div className={styles.referenceNoticeTitle}>
            <AlertCircle size={18} />
            <span>Reference Material: Illustrative Diet Blueprint (Sample Meal Frameworks)</span>
          </div>
          <p className={styles.referenceNoticeText}>
            The frameworks below are reference meal templates from nutrition coaching guidelines for meal timing, portion examples, and food combinations. <strong>They are reference material, not your personalized daily plan.</strong> Your live daily calorie and macronutrient targets are calculated dynamically on your <Link href="/app/nutrition" className={styles.dashboardLink}>Nutrition dashboard</Link> based on your BMR, TDEE, and active fitness goal. Use these tables purely as qualitative inspiration for structuring high-protein meals.
          </p>
        </div>

        {/* Option A card */}
        <div className={styles.blueprintCard}>
          <div className={styles.blueprintCardHeader}>
            <div>
              <div className={styles.blueprintCardTitle}>Option A: High-Volume Training Day Fueling Template</div>
              <small className={styles.blueprintSubtitle}>Illustrative 6-meal structure for heavy lifting days</small>
            </div>
            <Badge variant="emerald">{optionATotal.calories.toLocaleString()} kcal &middot; {optionATotal.protein}g protein</Badge>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th className={styles.th}>Meal Window</th><th className={styles.th}>Food &amp; Recipe</th><th className={styles.th}>Portion</th><th className={styles.th}>Kcal</th><th className={styles.th}>P</th><th className={styles.th}>C</th><th className={styles.th}>F</th></tr></thead>
              <tbody>
                {optionA.map((row, i) => (
                  <tr key={i}>
                    <td className={`${styles.td} ${styles.tdStrong}`}>{row[0]}</td>
                    <td className={styles.td}>{row[1]}</td>
                    <td className={`${styles.td} ${styles.tdMuted}`}>{row[2]}</td>
                    <td className={styles.td}>{row[3]}</td>
                    <td className={styles.td}>{row[4]}g</td>
                    <td className={styles.td}>{row[5]}g</td>
                    <td className={styles.td}>{row[6]}g</td>
                  </tr>
                ))}
                <tr>
                  <td className={`${styles.td} ${styles.tdTotal}`}>Reference Total</td>
                  <td className={styles.td} colSpan={2} />
                  <td className={`${styles.td} ${styles.tdTotal} ${styles.tdTotalPrimary}`}>{optionATotal.calories.toLocaleString()}</td>
                  <td className={`${styles.td} ${styles.tdTotal}`}>{optionATotal.protein}g</td>
                  <td className={`${styles.td} ${styles.tdTotal}`}>{optionATotal.carbs}g</td>
                  <td className={`${styles.td} ${styles.tdTotal}`}>{optionATotal.fat}g</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Option B card */}
        <div className={styles.blueprintCard}>
          <div className={styles.blueprintCardHeader}>
            <div>
              <div className={styles.blueprintCardTitle}>Option B: Lower-Activity &amp; Budget Fueling Template</div>
              <small className={styles.blueprintSubtitle}>Cost-efficient lean template with whole eggs &amp; roasted chana</small>
            </div>
            <Badge variant="cyan">{optionBTotal.calories.toLocaleString()} kcal &middot; {optionBTotal.protein}g protein</Badge>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th className={styles.th}>Meal Window</th><th className={styles.th}>Food &amp; Recipe</th><th className={styles.th}>Portion</th><th className={styles.th}>Kcal</th><th className={styles.th}>P</th><th className={styles.th}>C</th><th className={styles.th}>F</th></tr></thead>
              <tbody>
                {optionB.map((row, i) => (
                  <tr key={i}>
                    <td className={`${styles.td} ${styles.tdStrong}`}>{row[0]}</td>
                    <td className={styles.td}>{row[1]}</td>
                    <td className={`${styles.td} ${styles.tdMuted}`}>{row[2]}</td>
                    <td className={styles.td}>{row[3]}</td>
                    <td className={styles.td}>{row[4]}g</td>
                    <td className={styles.td}>{row[5]}g</td>
                    <td className={styles.td}>{row[6]}g</td>
                  </tr>
                ))}
                <tr>
                  <td className={`${styles.td} ${styles.tdTotal}`}>Reference Total</td>
                  <td className={styles.td} colSpan={2} />
                  <td className={`${styles.td} ${styles.tdTotal} ${styles.tdTotalCyan}`}>{optionBTotal.calories.toLocaleString()}</td>
                  <td className={`${styles.td} ${styles.tdTotal}`}>{optionBTotal.protein}g</td>
                  <td className={`${styles.td} ${styles.tdTotal}`}>{optionBTotal.carbs}g</td>
                  <td className={`${styles.td} ${styles.tdTotal}`}>{optionBTotal.fat}g</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* High-protein budget food staples cheat sheet */}
        <div className={styles.blueprintCard}>
          <div className={styles.blueprintCardHeader}>
            <div>
              <div className={styles.blueprintCardTitle}>High-Protein Budget Indian Food Staples</div>
              <small className={styles.blueprintSubtitle}>Reference grocery staples for hitting protein goals efficiently</small>
            </div>
            <Badge variant="emerald">Protein Staples</Badge>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th className={styles.th}>Food Staple</th><th className={styles.th}>Typical Serving</th><th className={styles.th}>Protein</th><th className={styles.th}>Calories</th><th className={styles.th}>Efficiency Tier &amp; Prep Cue</th></tr></thead>
              <tbody>
                {staples.map((row) => (
                  <tr key={row[0]}>
                    <td className={`${styles.td} ${styles.tdStrong}`}>{row[0]}</td>
                    <td className={styles.td}>{row[1]}</td>
                    <td className={`${styles.td} ${styles.tdProtein}`}>{row[2]}</td>
                    <td className={styles.td}>{row[3]}</td>
                    <td className={`${styles.td} ${styles.tdMuted}`}>{row[4]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <PlanSelectorModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={() => window.location.reload()} />
    </div>
  );
}
