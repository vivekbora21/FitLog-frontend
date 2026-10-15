'use client';

import React from 'react';
import { Flame, Dumbbell, Wheat, Droplets, ChevronRight } from 'lucide-react';
import styles from './nutritionComponents.module.css';

export interface MacroItemData {
  consumed: number;
  target: number;
}

export interface MacroSummaryData {
  calories: MacroItemData;
  protein: MacroItemData;
  carbs: MacroItemData;
  fat: MacroItemData;
}

export interface MacroSummaryCardsProps {
  data: MacroSummaryData;
  onCardClick?: (macro: 'calories' | 'protein' | 'carbs' | 'fat') => void;
}

export const MacroSummaryCards: React.FC<MacroSummaryCardsProps> = ({ data, onCardClick }) => {
  const { calories, protein, carbs, fat } = data;

  const calPct = calories.target > 0 ? Math.round((calories.consumed / calories.target) * 100) : 0;
  const proteinPct = protein.target > 0 ? Math.round((protein.consumed / protein.target) * 100) : 0;
  const carbsPct = carbs.target > 0 ? Math.round((carbs.consumed / carbs.target) * 100) : 0;
  const fatPct = fat.target > 0 ? Math.round((fat.consumed / fat.target) * 100) : 0;

  const calRemaining = calories.target - calories.consumed;
  const proteinRemaining = protein.target - protein.consumed;
  const carbsRemaining = carbs.target - carbs.consumed;
  const fatDiff = fat.consumed - fat.target;

  return (
    <div className={styles.macroCardsGrid}>
      {/* Calories Card */}
      <div className={styles.macroCard} onClick={() => onCardClick?.('calories')} style={{ cursor: onCardClick ? 'pointer' : 'default' }}>
        <div className={styles.macroCardTop}>
          <div className={styles.macroCardIconTitle}>
            <div className={`${styles.macroIconBadge} ${styles.macroIconCalories}`}>
              <Flame size={17} />
            </div>
            <span className={styles.macroCardLabel}>Calories</span>
          </div>
          <span className={styles.macroCardArrow}>
            <ChevronRight size={17} />
          </span>
        </div>

        <div className={styles.macroValuesRow}>
          <span className={styles.macroConsumed}>{calories.consumed.toLocaleString()}</span>
          <span className={styles.macroTarget}>/ {calories.target.toLocaleString()} kcal</span>
        </div>

        <div className={styles.macroProgressWrap}>
          <div className={styles.macroProgressBar}>
            <div
              className={`${styles.macroProgressFill} ${styles.fillCalories}`}
              style={{ width: `${Math.min(100, calPct)}%` }}
            />
          </div>
          <span className={styles.macroPercentage}>{calPct}%</span>
        </div>

        <div className={styles.macroCardFooter}>
          {calRemaining >= 0 ? (
            <span className={styles.macroRemainingText}>
              {calRemaining.toLocaleString()} kcal remaining
            </span>
          ) : (
            <span className={styles.macroExcessText}>
              {Math.abs(calRemaining).toLocaleString()} kcal over target
            </span>
          )}
        </div>
      </div>

      {/* Protein Card */}
      <div className={styles.macroCard} onClick={() => onCardClick?.('protein')} style={{ cursor: onCardClick ? 'pointer' : 'default' }}>
        <div className={styles.macroCardTop}>
          <div className={styles.macroCardIconTitle}>
            <div className={`${styles.macroIconBadge} ${styles.macroIconProtein}`}>
              <Dumbbell size={17} />
            </div>
            <span className={styles.macroCardLabel}>Protein</span>
          </div>
          <span className={styles.macroCardArrow}>
            <ChevronRight size={17} />
          </span>
        </div>

        <div className={styles.macroValuesRow}>
          <span className={styles.macroConsumed}>{protein.consumed}</span>
          <span className={styles.macroTarget}>/ {protein.target} g</span>
        </div>

        <div className={styles.macroProgressWrap}>
          <div className={styles.macroProgressBar}>
            <div
              className={`${styles.macroProgressFill} ${styles.fillProtein}`}
              style={{ width: `${Math.min(100, proteinPct)}%` }}
            />
          </div>
          <span className={styles.macroPercentage}>{proteinPct}%</span>
        </div>

        <div className={styles.macroCardFooter}>
          {proteinRemaining >= 0 ? (
            <span className={styles.macroRemainingText}>
              {Math.round(proteinRemaining)} g remaining
            </span>
          ) : (
            <span className={styles.macroExcessText}>
              {Math.abs(Math.round(proteinRemaining))} g over target
            </span>
          )}
        </div>
      </div>

      {/* Carbs Card */}
      <div className={styles.macroCard} onClick={() => onCardClick?.('carbs')} style={{ cursor: onCardClick ? 'pointer' : 'default' }}>
        <div className={styles.macroCardTop}>
          <div className={styles.macroCardIconTitle}>
            <div className={`${styles.macroIconBadge} ${styles.macroIconCarbs}`}>
              <Wheat size={17} />
            </div>
            <span className={styles.macroCardLabel}>Carbs</span>
          </div>
          <span className={styles.macroCardArrow}>
            <ChevronRight size={17} />
          </span>
        </div>

        <div className={styles.macroValuesRow}>
          <span className={styles.macroConsumed}>{carbs.consumed}</span>
          <span className={styles.macroTarget}>/ {carbs.target} g</span>
        </div>

        <div className={styles.macroProgressWrap}>
          <div className={styles.macroProgressBar}>
            <div
              className={`${styles.macroProgressFill} ${styles.fillCarbs}`}
              style={{ width: `${Math.min(100, carbsPct)}%` }}
            />
          </div>
          <span className={styles.macroPercentage}>{carbsPct}%</span>
        </div>

        <div className={styles.macroCardFooter}>
          {carbsRemaining >= 0 ? (
            <span className={styles.macroRemainingText}>
              {carbsRemaining.toFixed(1).replace(/\.0$/, '')} g remaining
            </span>
          ) : (
            <span className={styles.macroExcessText}>
              {Math.abs(carbsRemaining).toFixed(1)} g over target
            </span>
          )}
        </div>
      </div>

      {/* Fat Card */}
      <div className={styles.macroCard} onClick={() => onCardClick?.('fat')} style={{ cursor: onCardClick ? 'pointer' : 'default' }}>
        <div className={styles.macroCardTop}>
          <div className={styles.macroCardIconTitle}>
            <div className={`${styles.macroIconBadge} ${styles.macroIconFat}`}>
              <Droplets size={17} />
            </div>
            <span className={styles.macroCardLabel}>Fat</span>
          </div>
          <span className={styles.macroCardArrow}>
            <ChevronRight size={17} />
          </span>
        </div>

        <div className={styles.macroValuesRow}>
          <span className={styles.macroConsumed}>{fat.consumed}</span>
          <span className={styles.macroTarget}>/ {fat.target} g</span>
        </div>

        <div className={styles.macroProgressWrap}>
          <div className={styles.macroProgressBar}>
            <div
              className={`${styles.macroProgressFill} ${fatDiff > 0 ? styles.fillExcess : styles.fillFat}`}
              style={{ width: `${Math.min(100, fatPct)}%` }}
            />
          </div>
          <span className={`${styles.macroPercentage} ${fatDiff > 0 ? styles.macroPercentageExcess : ''}`}>
            {fatPct}%
          </span>
        </div>

        <div className={styles.macroCardFooter}>
          {fatDiff > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className={styles.macroExcessText}>
                {fatDiff.toFixed(1)} g over target
              </span>
              {calRemaining >= 0 && (
                <span className={styles.macroBudgetPill} title="Total calories are still within your daily target">
                  Calorie budget intact
                </span>
              )}
            </div>
          ) : (
            <span className={styles.macroRemainingText}>
              {Math.abs(fatDiff).toFixed(1)} g remaining
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
