'use client';

import React, { useState } from 'react';
import { BarChart2 } from 'lucide-react';
import styles from './nutritionComponents.module.css';

export interface MacroBreakdownCardProps {
  totalCalories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
}

export const MacroBreakdownCard: React.FC<MacroBreakdownCardProps> = ({
  totalCalories,
  proteinG,
  carbsG,
  fatG,
  targetProtein,
  targetCarbs,
  targetFat,
}) => {
  const [breakdownUnit, setBreakdownUnit] = useState<'grams' | 'calories' | 'percent'>('grams');

  // Donut chart distribution calculations
  const proteinCals = Math.round(proteinG * 4);
  const carbsCals = Math.round(carbsG * 4);
  const fatCals = Math.round(fatG * 9);
  const totalMacroCals = proteinCals + carbsCals + fatCals || totalCalories || 1;

  const proteinDistPct = Math.round((proteinCals / totalMacroCals) * 100);
  const carbsDistPct = Math.round((carbsCals / totalMacroCals) * 100);
  const fatDistPct = 100 - proteinDistPct - carbsDistPct;

  // Donut SVG circumference math (r = 48)
  const donutRadius = 48;
  const donutCircumference = 2 * Math.PI * donutRadius; // ~301.59
  const proteinArc = (proteinDistPct / 100) * donutCircumference;
  const carbsArc = (carbsDistPct / 100) * donutCircumference;
  const fatArc = (fatDistPct / 100) * donutCircumference;

  // vs Target progress
  const proteinPct = targetProtein > 0 ? Math.round((proteinG / targetProtein) * 100) : 0;
  const carbsPct = targetCarbs > 0 ? Math.round((carbsG / targetCarbs) * 100) : 0;
  const fatPct = targetFat > 0 ? Math.round((fatG / targetFat) * 100) : 0;
  const fatDiff = fatG - targetFat;

  return (
    <div className={styles.cardSection}>
      <div className={styles.cardHeaderRow}>
        <div className={styles.cardHeaderTitleWrap}>
          <BarChart2 size={19} className={styles.sectionHeaderIcon} />
          <div>
            <h2 className={styles.cardTitle}>Today&apos;s Macro Breakdown</h2>
            <p className={styles.cardSubtitle}>
              Calorie distribution from your logged food today.
            </p>
          </div>
        </div>

        <select
          className={styles.dropdownSelect}
          value={breakdownUnit}
          onChange={(e) => setBreakdownUnit(e.target.value as any)}
        >
          <option value="grams">Grams</option>
          <option value="calories">Calories</option>
          <option value="percent">Percent (%)</option>
        </select>
      </div>

      <div className={styles.macroBreakdownBody}>
        {/* Donut and Legend */}
        <div className={styles.donutAndLegendWrap}>
          <div className={styles.donutSvgWrap}>
            <svg viewBox="0 0 120 120" className={styles.donutSvg}>
              {/* Background Track Circle */}
              <circle
                cx="60"
                cy="60"
                r={donutRadius}
                fill="none"
                stroke="#f1f5f9"
                strokeWidth="14"
              />
              {/* Protein Arc (Teal) */}
              <circle
                cx="60"
                cy="60"
                r={donutRadius}
                fill="none"
                stroke="#0d9488"
                strokeWidth="14"
                strokeDasharray={`${proteinArc} ${donutCircumference}`}
                strokeDashoffset="0"
              />
              {/* Carbs Arc (Amber) */}
              <circle
                cx="60"
                cy="60"
                r={donutRadius}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="14"
                strokeDasharray={`${carbsArc} ${donutCircumference}`}
                strokeDashoffset={-proteinArc}
              />
              {/* Fat Arc (Purple) */}
              <circle
                cx="60"
                cy="60"
                r={donutRadius}
                fill="none"
                stroke="#8b5cf6"
                strokeWidth="14"
                strokeDasharray={`${fatArc} ${donutCircumference}`}
                strokeDashoffset={-(proteinArc + carbsArc)}
              />
            </svg>
            <div className={styles.donutCenterText}>
              <div className={styles.donutCalories}>{totalCalories.toLocaleString()}</div>
              <div className={styles.donutKcalLabel}>kcal</div>
            </div>
          </div>

          {/* Legend List */}
          <div className={styles.macroLegendList}>
            {/* Protein */}
            <div className={styles.macroLegendItem}>
              <div className={styles.macroLegendLeft}>
                <span className={`${styles.legendDot} ${styles.dotProtein}`} />
                <div>
                  <div className={styles.legendName}>Protein</div>
                  <div className={styles.legendGrams}>
                    {proteinG} g ({proteinDistPct}%)
                  </div>
                </div>
              </div>
              <div className={styles.legendKcal}>{proteinCals} kcal</div>
            </div>

            {/* Carbs */}
            <div className={styles.macroLegendItem}>
              <div className={styles.macroLegendLeft}>
                <span className={`${styles.legendDot} ${styles.dotCarbs}`} />
                <div>
                  <div className={styles.legendName}>Carbs</div>
                  <div className={styles.legendGrams}>
                    {carbsG} g ({carbsDistPct}%)
                  </div>
                </div>
              </div>
              <div className={styles.legendKcal}>{carbsCals} kcal</div>
            </div>

            {/* Fat */}
            <div className={styles.macroLegendItem}>
              <div className={styles.macroLegendLeft}>
                <span className={`${styles.legendDot} ${styles.dotFat}`} />
                <div>
                  <div className={styles.legendName}>Fat</div>
                  <div className={styles.legendGrams}>
                    {fatG} g ({fatDistPct}%)
                  </div>
                </div>
              </div>
              <div className={styles.legendKcal}>{fatCals} kcal</div>
            </div>
          </div>
        </div>

        {/* vs Target Column */}
        <div className={styles.vsTargetColumn}>
          <div className={styles.vsTargetHeading}>vs Target</div>

          {/* Protein Target Bar */}
          <div className={styles.vsTargetRow}>
            <div className={styles.vsTargetRowHeader}>
              <span className={styles.vsTargetLabel}>Protein</span>
              <span className={styles.vsTargetNums}>
                {proteinG} / {targetProtein} g
              </span>
            </div>
            <div className={styles.vsTargetBarWrap}>
              <div className={styles.vsTargetBarTrack}>
                <div
                  className={styles.vsTargetBarFill}
                  style={{ width: `${Math.min(100, proteinPct)}%`, background: '#0d9488' }}
                />
              </div>
              <span className={styles.vsTargetPct}>{proteinPct}%</span>
            </div>
          </div>

          {/* Carbs Target Bar */}
          <div className={styles.vsTargetRow}>
            <div className={styles.vsTargetRowHeader}>
              <span className={styles.vsTargetLabel}>Carbs</span>
              <span className={styles.vsTargetNums}>
                {carbsG} / {targetCarbs} g
              </span>
            </div>
            <div className={styles.vsTargetBarWrap}>
              <div className={styles.vsTargetBarTrack}>
                <div
                  className={styles.vsTargetBarFill}
                  style={{ width: `${Math.min(100, carbsPct)}%`, background: '#f59e0b' }}
                />
              </div>
              <span className={styles.vsTargetPct}>{carbsPct}%</span>
            </div>
          </div>

            {/* Fat Target Bar */}
            <div className={styles.vsTargetRow}>
              <div className={styles.vsTargetRowHeader}>
                <span className={styles.vsTargetLabel}>Fat</span>
                <span className={styles.vsTargetNums}>
                  {fatG} / {targetFat} g
                </span>
              </div>
              <div className={styles.vsTargetBarWrap}>
                <div className={styles.vsTargetBarTrack}>
                  <div
                    className={styles.vsTargetBarFill}
                    style={{
                      width: `${Math.min(100, fatPct)}%`,
                      background: fatDiff > 0 ? '#a855f7' : '#8b5cf6',
                    }}
                  />
                </div>
                <span
                  className={styles.vsTargetPct}
                  style={{ color: fatDiff > 0 ? '#a855f7' : undefined, fontWeight: 700 }}
                >
                  {fatPct}%
                </span>
              </div>
              {fatDiff > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px', fontSize: '0.7rem' }}>
                  <span style={{ color: '#9333ea', fontWeight: 600 }}>
                    Exceeded target (+{fatDiff.toFixed(1)} g)
                  </span>
                  <span style={{ color: '#059669', fontWeight: 600, background: 'rgba(16, 185, 129, 0.1)', padding: '1px 6px', borderRadius: '9999px' }}>
                    Budget intact
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
    </div>
  );
};
