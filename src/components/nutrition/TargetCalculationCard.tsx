'use client';

import React from 'react';
import { Calculator, Info } from 'lucide-react';
import { RecommendedTargets } from '@/lib/types';
import styles from './nutritionComponents.module.css';

export interface TargetCalculationCardProps {
  savedTargetKcal: number;
  recommended: RecommendedTargets | null;
  onEditTargets: () => void;
  onApplyRecommended: () => void;
  applying?: boolean;
}

export const TargetCalculationCard: React.FC<TargetCalculationCardProps> = ({
  savedTargetKcal,
  recommended,
  onEditTargets,
  onApplyRecommended,
  applying = false,
}) => {
  const showApplyBtn =
    recommended?.available && recommended.daily_calories !== savedTargetKcal;

  return (
    <div className={styles.whereTargetCard}>
      <div className={styles.cardHeaderRow}>
        <div className={styles.cardHeaderTitleWrap}>
          <Calculator size={19} className={styles.sectionHeaderIcon} />
          <div>
            <h2 className={styles.cardTitle}>Where your target comes from</h2>
            <p className={styles.cardSubtitle}>
              Your energy needs and target calculation based on your profile and goal.
            </p>
          </div>
        </div>

        <div className={styles.targetActionsRow}>
          <button
            type="button"
            className={styles.editTargetsLink}
            onClick={onEditTargets}
          >
            Edit targets
          </button>

          {showApplyBtn && (
            <button
              type="button"
              className={styles.useTargetBtn}
              onClick={onApplyRecommended}
              disabled={applying}
            >
              {applying ? 'Applying...' : `Use ${recommended.daily_calories.toLocaleString()} kcal`}
            </button>
          )}
        </div>
      </div>

      {/* 5 Compact Cards */}
      <div className={styles.targetStepsGrid}>
        {/* Card 1: BMR */}
        <div className={styles.targetStepCard}>
          <div className={styles.targetStepCardLabel}>
            <span>BMR (Mifflin-St Jeor)</span>
          </div>
          <div className={styles.targetStepCardValue}>
            {recommended?.available ? `${recommended.bmr.toLocaleString()} kcal` : '1,712 kcal'}
          </div>
          <div className={styles.targetStepCardSub}>
            {recommended?.available
              ? `${recommended.inputs.weight_kg} kg, ${recommended.inputs.height_cm} cm, ${recommended.inputs.age_years} y (latest weight)`
              : '76.8 kg, 175 cm, 31 y (latest weight)'}
          </div>
        </div>

        {/* Card 2: Maintenance (TDEE) */}
        <div className={styles.targetStepCard}>
          <div className={styles.targetStepCardLabel}>
            <span>Maintenance (TDEE)</span>
          </div>
          <div className={styles.targetStepCardValue}>
            {recommended?.available ? `${recommended.tdee.toLocaleString()} kcal` : '2,653 kcal'}
          </div>
          <div className={styles.targetStepCardSub}>
            {recommended?.available
              ? `BMR × ${recommended.activity_factor} (${recommended.inputs.activity_level.toLowerCase()} activity)`
              : 'BMR × 1.55 (moderate activity)'}
          </div>
        </div>

        {/* Card 3: Goal Adjustment */}
        <div className={styles.targetStepCard}>
          <div className={styles.targetStepCardLabel}>
            <span>Goal Adjustment</span>
          </div>
          <div className={styles.targetStepCardValue}>
            {recommended?.available
              ? `${recommended.calorie_adjustment > 0 ? '+' : ''}${recommended.calorie_adjustment} kcal`
              : '-250 kcal'}
          </div>
          <div className={styles.targetStepCardSub}>
            {recommended?.available ? recommended.goal_source : 'Recomp Mode (active journey)'}
          </div>
        </div>

        {/* Card 4: Saved Target */}
        <div className={`${styles.targetStepCard} ${styles.targetStepSaved}`}>
          <div className={styles.targetStepCardLabel}>
            <span>Saved Target</span>
            <span className={`${styles.targetStepBadge} ${styles.badgeSaved}`}>Active</span>
          </div>
          <div className={styles.targetStepCardValue} style={{ color: '#047857' }}>
            {savedTargetKcal.toLocaleString()} kcal
          </div>
          <div className={styles.targetStepCardSub}>
            Your current daily target
          </div>
        </div>

        {/* Card 5: Recommended Target */}
        <div className={`${styles.targetStepCard} ${styles.targetStepRecommended}`}>
          <div className={styles.targetStepCardLabel}>
            <span>Recommended Target</span>
            <span className={`${styles.targetStepBadge} ${styles.badgeRec}`}>Rec</span>
          </div>
          <div className={styles.targetStepCardValue} style={{ color: '#0f766e' }}>
            {recommended?.available ? `${recommended.daily_calories.toLocaleString()} kcal` : '2,400 kcal'}
          </div>
          <div className={styles.targetStepCardSub}>
            {recommended?.available
              ? `P ${recommended.protein_g} g | C ${recommended.carbs_g} g | F ${recommended.fat_g} g`
              : 'P 161 g | C 288 g | F 67 g'}
          </div>
        </div>
      </div>

      {/* Informational banner */}
      <div className={styles.targetNoteFooter}>
        <Info size={15} color="#0f766e" style={{ flexShrink: 0 }} />
        <span>
          Your saved target is <strong>{savedTargetKcal.toLocaleString()} kcal</strong>. Nothing changes until you choose to apply the recommendation.
        </span>
      </div>
    </div>
  );
};
