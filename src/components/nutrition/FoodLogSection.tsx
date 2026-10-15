'use client';

import React, { useState } from 'react';
import { UtensilsCrossed, Plus, ChevronDown, Pencil, Trash2 } from 'lucide-react';
import { MealEntry } from '@/lib/types';
import styles from './nutritionComponents.module.css';

export interface FoodLogSectionProps {
  meals: MealEntry[];
  onAddItem: (mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK') => void;
  onEditItem: (meal: MealEntry) => void;
  onDeleteItem: (mealId: string) => void;
  deletingMealId?: string | null;
}

export const FoodLogSection: React.FC<FoodLogSectionProps> = ({
  meals,
  onAddItem,
  onEditItem,
  onDeleteItem,
  deletingMealId,
}) => {
  const mealCategories: ('BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK')[] = [
    'BREAKFAST',
    'LUNCH',
    'DINNER',
    'SNACK',
  ];

  const categoryTitles = {
    BREAKFAST: 'Breakfast',
    LUNCH: 'Lunch',
    DINNER: 'Dinner',
    SNACK: 'Snacks & Fuel',
  };

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    BREAKFAST: true,
    LUNCH: true,
    DINNER: true,
    SNACK: true,
  });

  const toggleSection = (cat: string) => {
    setOpenSections((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  return (
    <div className={styles.foodLogCard}>
      <div className={styles.cardHeaderRow}>
        <div className={styles.cardHeaderTitleWrap}>
          <UtensilsCrossed size={19} className={styles.sectionHeaderIcon} />
          <div>
            <h2 className={styles.cardTitle}>Today&apos;s Food Log</h2>
            <p className={styles.cardSubtitle}>
              Track everything you eat throughout the day.
            </p>
          </div>
        </div>
      </div>

      <div className={styles.mealSectionsList}>
        {mealCategories.map((cat) => {
          const categoryMeals = meals.filter((m) => m.meal_type === cat);
          const catCalories = categoryMeals.reduce((acc, m) => acc + m.calories, 0);
          const isOpen = openSections[cat] ?? true;

          return (
            <div key={cat} className={styles.mealSectionBox}>
              {/* Section Header */}
              <div
                className={`${styles.mealSectionHeader} ${isOpen ? styles.mealSectionHeaderOpen : ''}`}
                onClick={() => toggleSection(cat)}
              >
                <div className={styles.mealSectionTitleGroup}>
                  <span className={styles.mealSectionName}>{categoryTitles[cat]}</span>
                  <span
                    className={`${styles.mealKcalBadge} ${
                      catCalories > 0 ? styles.badgeActiveCalories : styles.badgeZeroCalories
                    }`}
                  >
                    {catCalories} KCAL
                  </span>
                </div>

                <div className={styles.mealSectionActions} onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className={styles.addItemBtn}
                    onClick={() => onAddItem(cat)}
                  >
                    <Plus size={12} /> Add item
                  </button>
                  <span
                    className={`${styles.collapseToggleIcon} ${isOpen ? styles.collapseToggleIconOpen : ''}`}
                    onClick={() => toggleSection(cat)}
                  >
                    <ChevronDown size={16} />
                  </span>
                </div>
              </div>

              {/* Items List */}
              {isOpen && (
                <div className={styles.mealItemsContainer}>
                  {categoryMeals.length === 0 ? (
                    <p className={styles.mealEmptyNotice}>
                      No food items logged for this meal yet.
                    </p>
                  ) : (
                    categoryMeals.map((meal) => {
                      const itemQty = meal.quantity ?? meal.servings ?? 1;
                      return (
                        <div key={meal.id} className={styles.mealRowItem}>
                          <div className={styles.mealRowLeft}>
                            <span className={styles.mealDotBullet} />
                            <div className={styles.mealRowTexts}>
                              <div className={styles.mealRowTitle}>
                                {meal.name}
                                {itemQty !== 1 && (
                                  <span className={styles.mealRowServings}> × {itemQty}</span>
                                )}
                              </div>
                              <div className={styles.mealRowMacrosLine}>
                                <span>
                                  P: <strong className={styles.macroP}>{meal.protein_g}g</strong>
                                </span>
                                <span>
                                  C: <strong className={styles.macroC}>{meal.carbs_g}g</strong>
                                </span>
                                <span>
                                  F: <strong className={styles.macroF}>{meal.fat_g}g</strong>
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className={styles.mealRowRight}>
                            <div className={styles.mealRowKcal}>
                              {meal.calories} kcal
                            </div>
                            <button
                              type="button"
                              className={styles.mealRowIconBtn}
                              title="Edit food item"
                              onClick={() => onEditItem(meal)}
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              className={`${styles.mealRowIconBtn} ${styles.mealRowDeleteBtn}`}
                              title="Remove item"
                              onClick={() => onDeleteItem(meal.id)}
                              disabled={deletingMealId === meal.id}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
