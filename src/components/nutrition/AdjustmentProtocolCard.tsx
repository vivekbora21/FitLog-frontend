'use client';

import React from 'react';
import { Target } from 'lucide-react';
import { JourneyMode } from '@/lib/types';
import styles from './nutritionComponents.module.css';

export interface AdjustmentProtocolCardProps {
  mode?: JourneyMode;
  modeLabel?: string;
}

export function getAdjustmentProtocolRows(mode: JourneyMode = 'RECOMP') {
  if (mode === 'BULK') {
    return [
      {
        phase: 'Week 1–2: Baseline Check',
        signal: 'Surplus adjustment & glycogen shift',
        interpretation: 'Mild initial scale jump as glycogen & water increase with carbohydrates.',
        action: 'Hold calories steady. Verify gym energy and recovery before adjusting food.',
      },
      {
        phase: 'Week 3: Too Slow (< 0.15 kg/wk)',
        signal: 'Gaining less than 0.15 kg/week',
        interpretation: 'High NEAT, fast metabolism, or calorie expenditure higher than estimated.',
        action: 'Add +150–200 kcal/day (extra 40 g oats + 1 banana or 1 extra roti + ghee).',
      },
      {
        phase: 'Week 3: On Target (0.20–0.35 kg/wk)',
        signal: 'Optimal clean surplus corridor',
        interpretation: 'Maximizes myofibrillar hypertrophy with minimal adipose accumulation.',
        action: 'Maintain current intake — perfect balance of muscle accrual and leanness.',
      },
      {
        phase: 'Week 3: Too Fast (> 0.50 kg/wk)',
        signal: 'Weight climbing faster than 0.50 kg/week',
        interpretation: 'Surplus exceeds maximum physiological rate of muscle protein synthesis.',
        action: 'Reduce daily intake by 100–150 kcal to preserve lean body composition.',
      },
    ];
  }
  if (mode === 'FOCUS' || mode === 'HABIT') {
    return [
      {
        phase: 'Week 1–2: Baseline Check',
        signal: 'Weigh-in consistency check',
        interpretation: 'Establishing habitual morning weigh-ins and routine meal timing.',
        action: 'Focus on logging adherence and consistent meal windows rather than calorie tweaks.',
      },
      {
        phase: 'Week 3: Drifting Low',
        signal: 'Weight dropping > 0.25 kg/week',
        interpretation: 'Calorie deficit unintentionally creeping in; can compromise workout energy.',
        action: 'Add +100–150 kcal/day to maintain energy and stable baseline weight.',
      },
      {
        phase: 'Week 3: On Target',
        signal: 'Weight stable within ±0.20 kg/week',
        interpretation: 'Optimal energy and hormonal baseline for habit building and compound strength.',
        action: 'Maintain steady daily nutrition and consistent hydration.',
      },
      {
        phase: 'Week 3: Drifting High',
        signal: 'Weight climbing > 0.25 kg/week',
        interpretation: 'Snacking or liquid calories pushing energy balance above maintenance.',
        action: 'Trim 100–150 kcal/day (cut sugary beverages or reduce cooking oil).',
      },
    ];
  }
  // Default: CUT or RECOMP
  return [
    {
      phase: 'Week 1–2: Baseline Check',
      signal: 'Drop of 1.0 – 2.0 kg in first 10 days',
      interpretation: 'Expected initial glycogen, sodium, and water depletion (not fat loss).',
      action: 'Hold calories steady. Do NOT increase food yet; allow water balance to normalize.',
    },
    {
      phase: 'Week 3: Too Slow (< 0.30 kg/wk)',
      signal: 'Weight loss < 0.30 kg/week for 2 weeks',
      interpretation: 'Metabolic adaptation, hidden calories, or decreased activity.',
      action: 'Drop 100–150 kcal/day (or cut 40 g rice) or add 20 min cardio/week.',
    },
    {
      phase: 'Week 3: On Target (0.40 – 0.60 kg/wk)',
      signal: 'Weight loss 0.40 – 0.60 kg/week',
      interpretation: 'Optimal pace: fat loss with muscle retention.',
      action: 'Keep current calories, maintain protein, strength training and cardio.',
    },
    {
      phase: 'Week 3: Too Fast (> 0.80 kg/wk)',
      signal: 'Weight loss > 0.80 kg/week for 2 weeks',
      interpretation: 'Too aggressive; risk of muscle loss, low energy, performance drop.',
      action: 'Increase daily intake by +150 kcal (add 35 g oats or 1 banana + 100 g curd).',
    },
  ];
}

export const AdjustmentProtocolCard: React.FC<AdjustmentProtocolCardProps> = ({
  mode = 'RECOMP',
  modeLabel = 'Recomp Mode',
}) => {
  const rows = getAdjustmentProtocolRows(mode);

  return (
    <div className={styles.protocolCard}>
      <div className={styles.cardHeaderRow}>
        <div className={styles.cardHeaderTitleWrap}>
          <Target size={19} className={styles.sectionHeaderIcon} />
          <div>
            <h2 className={styles.cardTitle}>
              The 2–3 Week Calorie &amp; Metabolic Adjustment Protocol — {modeLabel}
            </h2>
            <p className={styles.cardSubtitle}>
              Follow this protocol to adjust calories based on your progress and body feedback.
            </p>
          </div>
        </div>
      </div>

      <div className={styles.protocolTableWrap}>
        <table className={styles.protocolTable}>
          <thead>
            <tr>
              <th style={{ width: '22%' }}>Phase</th>
              <th style={{ width: '24%' }}>Signal</th>
              <th style={{ width: '28%' }}>Interpretation</th>
              <th style={{ width: '26%' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.phase}>
                <td className={styles.phaseCol}>{row.phase}</td>
                <td className={styles.signalCol}>{row.signal}</td>
                <td className={styles.interpCol}>{row.interpretation}</td>
                <td className={styles.actionCol}>{row.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
