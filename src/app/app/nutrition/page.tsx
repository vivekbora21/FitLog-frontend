'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Plus, Droplets, Search, Calculator, RotateCcw, Trash2, Clock, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import {
  NutritionDayResponse,
  MacroTarget,
  Food,
  RecentFood,
  RecommendedTargets,
  JourneyPacingData,
  JourneyMode,
  MealEntry,
} from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { MacroRing } from '@/components/MacroRing';
import styles from './nutrition.module.css';

const MISSING_FIELD_LABELS: Record<string, string> = {
  weight: 'weight',
  height_cm: 'height',
  date_of_birth: 'date of birth',
  sex: 'sex',
};

function scaleFood(food: Food | RecentFood, quantity: number) {
  const q = Number(quantity) || 0;
  return {
    calories: Math.round(food.calories * q),
    protein: Math.round(food.protein_g * q * 10) / 10,
    carbs: Math.round(food.carbs_g * q * 10) / 10,
    fat: Math.round(food.fat_g * q * 10) / 10,
  };
}

function getAdjustmentProtocol(mode: JourneyMode) {
  if (mode === 'BULK') {
    return [
      ['Week 1–2 Baseline Check', 'Surplus adjustment & glycogen shift', 'Mild initial scale jump as glycogen & water increase with carbohydrates.', 'Hold calories steady. Verify gym energy and recovery before adjusting food.'],
      ['Week 3: Too Slow (<0.15 kg/wk)', 'Gaining less than 0.15 kg/week', 'High NEAT, fast metabolism, or calorie expenditure higher than estimated.', 'Add +150–200 kcal/day (extra 40g oats + 1 banana or 1 extra roti + ghee).'],
      ['Week 3: On Target (0.20–0.35 kg/wk)', 'Optimal clean surplus corridor', 'Maximizes myofibrillar hypertrophy with minimal adipose accumulation.', 'Maintain current intake — perfect balance of muscle accrual and leanness.'],
      ['Week 3: Too Fast (>0.50 kg/wk)', 'Weight climbing faster than 0.50 kg/week', 'Surplus exceeds maximum physiological rate of muscle protein synthesis.', 'Reduce daily intake by 100–150 kcal to preserve lean body composition.'],
    ] as const;
  }
  if (mode === 'FOCUS' || mode === 'HABIT') {
    return [
      ['Week 1–2 Baseline Check', 'Weigh-in consistency check', 'Establishing habitual morning weigh-ins and routine meal timing.', 'Focus on logging adherence and consistent meal windows rather than calorie tweaks.'],
      ['Week 3: Drifting Low', 'Weight dropping >0.25 kg/week', 'Calorie deficit unintentionally creeping in; can compromise workout energy.', 'Add +100–150 kcal/day to maintain energy and stable baseline weight.'],
      ['Week 3: On Target', 'Weight stable within ±0.20 kg/week', 'Optimal energy and hormonal baseline for habit building and compound strength.', 'Maintain steady daily nutrition and consistent hydration.'],
      ['Week 3: Drifting High', 'Weight climbing >0.25 kg/week', 'Snacking or liquid calories pushing energy balance above maintenance.', 'Trim 100–150 kcal/day (cut sugary beverages or reduce cooking oil).'],
    ] as const;
  }
  return [
    ['Week 1–2 Baseline Check', 'Drop of 1.0–2.0 kg in first 10 days', 'Expected initial glycogen, sodium, and water depletion — not all fat loss.', 'Hold calories steady. Do NOT increase food yet; allow water balance to normalize.'],
    ['Week 3: Too Slow (<0.30 kg/wk)', 'Weight loss stalled < 0.30 kg/week for 2 weeks', 'Metabolic adaptation, hidden cooking oils, or decreased daily steps.', 'Drop 100–150 kcal/day (cut 1 roti or 40g rice), or add 20 min cardio/week.'],
    ['Week 3: On Target (0.40–0.60 kg/wk)', 'Weight loss 0.40–0.60 kg/week', 'Optimal sweet spot: maximal fat oxidation with zero muscle wasting.', 'Change nothing — maintain identical nutrition, lifting intensity and cardio.'],
    ['Week 3: Too Fast (>0.80 kg/wk)', 'Weight loss > 0.80 kg/week for 2 weeks', 'Excessive deficit risking muscle loss, strength decline, and metabolic crash.', 'Increase daily intake by +150 kcal (add 35g oats or 1 banana + 100g curd).'],
  ] as const;
}

export default function NutritionPage() {
  const [data, setData] = useState<NutritionDayResponse | null>(null);
  const [pacing, setPacing] = useState<JourneyPacingData | null>(null);
  const [recommended, setRecommended] = useState<RecommendedTargets | null>(null);
  const [recentFoods, setRecentFoods] = useState<RecentFood[]>([]);
  const [applyingTargets, setApplyingTargets] = useState(false);
  const [loading, setLoading] = useState(true);
  const [repeatingMeal, setRepeatingMeal] = useState<string | null>(null);
  const [deletingMealId, setDeletingMealId] = useState<string | null>(null);
  const [addMealModal, setAddMealModal] = useState(false);

  // Add meal modal state
  const [mealType, setMealType] = useState<'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK'>('BREAKFAST');
  const [modalMode, setModalMode] = useState<'recent' | 'manual'>('recent');

  // Food picker state: Recent foods & search (primary)
  const [foodQuery, setFoodQuery] = useState('');
  const [foodResults, setFoodResults] = useState<Food[]>([]);
  const [selectedFood, setSelectedFood] = useState<Food | RecentFood | null>(null);
  const [quantity, setQuantity] = useState<number>(1);

  // 6-field manual form state (fallback)
  const [manualName, setManualName] = useState('');
  const [manualQuantity, setManualQuantity] = useState<number>(1);
  const [manualCalories, setManualCalories] = useState<number>(400);
  const [manualProtein, setManualProtein] = useState<number>(30);
  const [manualCarbs, setManualCarbs] = useState<number>(45);
  const [manualFat, setManualFat] = useState<number>(10);
  const [saveAsFood, setSaveAsFood] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadNutrition = async () => {
    try {
      const [res, pacingRes, recRes, recentsRes] = await Promise.all([
        api.getNutrition('today'),
        api.getJourneyPacingStatus().catch(() => null),
        api.getRecommendedTargets().catch(() => null),
        api.getRecentFoods().catch(() => []),
      ]);
      setData(res);
      setPacing(pacingRes);
      setRecommended(recRes);
      setRecentFoods(recentsRes || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNutrition();
  }, []);

  useEffect(() => {
    if (!addMealModal || modalMode === 'manual') return;
    const timer = setTimeout(() => {
      api.searchFoods(foodQuery.trim()).then(setFoodResults).catch(console.error);
    }, 200);
    return () => clearTimeout(timer);
  }, [foodQuery, addMealModal, modalMode]);

  const resetModalState = () => {
    setSelectedFood(null);
    setQuantity(1);
    setFoodQuery('');
    setManualName('');
    setManualQuantity(1);
    setManualCalories(400);
    setManualProtein(30);
    setManualCarbs(45);
    setManualFat(10);
    setSaveAsFood(false);
    setModalMode('recent');
  };

  const openLogModal = (type?: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK') => {
    if (type) setMealType(type);
    resetModalState();
    setAddMealModal(true);
  };

  const handleApplyTargets = async () => {
    setApplyingTargets(true);
    try {
      await api.applyRecommendedTargets();
      await loadNutrition();
    } catch (err) {
      console.error(err);
    } finally {
      setApplyingTargets(false);
    }
  };

  const handleRepeatYesterday = async (type?: string) => {
    setRepeatingMeal(type || 'ALL');
    try {
      await api.repeatYesterdayMeal(type);
      await loadNutrition();
      setAddMealModal(false);
    } catch (err: any) {
      alert(err.message || 'Could not repeat yesterday’s meal.');
    } finally {
      setRepeatingMeal(null);
    }
  };

  const handleDeleteMeal = async (mealId: string) => {
    if (!confirm('Remove this food item?')) return;
    setDeletingMealId(mealId);
    try {
      await api.deleteMeal(mealId);
      await loadNutrition();
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingMealId(null);
    }
  };

  const handleAddMeal = async () => {
    setSaving(true);
    try {
      if (modalMode === 'manual') {
        if (!manualName.trim()) {
          alert('Please enter a food or meal name');
          setSaving(false);
          return;
        }
        const qty = Number(manualQuantity) || 1;
        const totalCalories = Number(manualCalories) || 0;
        const totalProtein = Number(manualProtein) || 0;
        const totalCarbs = Number(manualCarbs) || 0;
        const totalFat = Number(manualFat) || 0;

        if (saveAsFood) {
          const unitKcal = Math.round(totalCalories / qty);
          const unitProt = Math.round((totalProtein / qty) * 10) / 10;
          const unitCarb = Math.round((totalCarbs / qty) * 10) / 10;
          const unitFat = Math.round((totalFat / qty) * 10) / 10;
          const food = await api.createFood({
            name: manualName.trim(),
            serving_label: '1 serving',
            calories: unitKcal,
            protein_g: unitProt,
            carbs_g: unitCarb,
            fat_g: unitFat,
          });
          await api.addMeal({
            meal_type: mealType,
            food: food.id,
            quantity: qty,
            servings: qty,
          });
        } else {
          await api.addMeal({
            name: manualName.trim(),
            meal_type: mealType,
            quantity: qty,
            servings: qty,
            calories: totalCalories,
            protein_g: totalProtein,
            carbs_g: totalCarbs,
            fat_g: totalFat,
          });
        }
      } else {
        if (!selectedFood) {
          alert('Pick a food from your recents or search results');
          setSaving(false);
          return;
        }
        const qty = Number(quantity) || 1;
        const foodId = ('food_id' in selectedFood && selectedFood.food_id) ? selectedFood.food_id : selectedFood.id;

        if ('is_custom' in selectedFood && !('food_id' in selectedFood && !selectedFood.food_id)) {
          await api.addMeal({
            meal_type: mealType,
            food: foodId,
            quantity: qty,
            servings: qty,
          });
        } else {
          const scaled = scaleFood(selectedFood, qty);
          await api.addMeal({
            name: selectedFood.name,
            meal_type: mealType,
            quantity: qty,
            servings: qty,
            ...scaled,
          });
        }
      }
      setAddMealModal(false);
      resetModalState();
      await loadNutrition();
    } catch (err: any) {
      alert(err.message || 'Error logging food');
    } finally {
      setSaving(false);
    }
  };

  const handleAddWater = async (amount: number) => {
    if (!data) return;
    const current = data.day.water_consumed_ml || 0;
    const updated = current + amount;
    try {
      await api.updateWater('today', updated);
      await loadNutrition();
    } catch (err) {
      console.error(err);
    }
  };

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

  const mode = (pacing?.mode || 'CUT') as JourneyMode;
  const targetKcal = data?.targets?.daily_calories;
  const targetProtein = data?.targets?.protein_g;
  const adjustmentRows = getAdjustmentProtocol(mode);

  const yesterdayMeals = data?.yesterday_meals || [];
  const modalYesterdayMeals = yesterdayMeals.filter((m) => m.meal_type === mealType);
  const modalYesterdayKcal = modalYesterdayMeals.reduce((acc, m) => acc + m.calories, 0);
  const modalYesterdayProtein = modalYesterdayMeals.reduce((acc, m) => acc + m.protein_g, 0);

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Nutrition & Macro Tracking</h1>
          <p className={styles.subtitle}>
            Maintain optimal caloric and macronutrient fuel for muscle recovery and performance.
          </p>
        </div>

        <Button variant="primary" onClick={() => openLogModal()}>
          <Plus size={16} />
          <span>Log Food</span>
        </Button>
      </div>

      {/* Macro Rings Summary Card */}
      <Card elevated className={styles.macroCard}>
        <div className={styles.macroRow}>
          <MacroRing
            label="Calories"
            current={data?.day.total_calories || 0}
            target={targetKcal ?? 0}
            unit=" kcal"
            color="#10B981"
            size={135}
            strokeWidth={11}
          />
          <MacroRing
            label="Protein"
            current={data?.day.total_protein || 0}
            target={targetProtein ?? 0}
            unit="g"
            color="#06B6D4"
            size={120}
            strokeWidth={10}
          />
          <MacroRing
            label="Carbs"
            current={data?.day.total_carbs || 0}
            target={data?.targets.carbs_g || 280}
            unit="g"
            color="#F59E0B"
            size={120}
            strokeWidth={10}
          />
          <MacroRing
            label="Fat"
            current={data?.day.total_fat || 0}
            target={data?.targets.fat_g || 75}
            unit="g"
            color="#8B5CF6"
            size={120}
            strokeWidth={10}
          />
        </div>
      </Card>

      {/* Where the calorie target comes from: BMR -> TDEE -> goal adjustment */}
      <Card className={styles.targetCard}>
        <div className={styles.targetHeader}>
          <div className={styles.targetHeaderLeft}>
            <Calculator size={20} color="var(--color-primary)" />
            <h3 className={styles.targetTitle}>Where your target comes from</h3>
          </div>
          <div className={styles.targetActions}>
            <Link href="/app/settings#targets" className={styles.targetLink}>Edit targets</Link>
            {recommended?.available && data && recommended.daily_calories !== data.targets.daily_calories && (
              <Button size="sm" variant="primary" onClick={handleApplyTargets} disabled={applyingTargets}>
                {applyingTargets ? 'Applying...' : `Use ${recommended.daily_calories.toLocaleString()} kcal`}
              </Button>
            )}
          </div>
        </div>

        {!recommended ? (
          <p className={styles.targetHint}>Loading…</p>
        ) : !recommended.available ? (
          <p className={styles.targetHint}>
            Your current targets were typed in by hand. Add your{' '}
            {recommended.missing.map((f) => MISSING_FIELD_LABELS[f] || f).join(', ')} in{' '}
            <Link href="/app/settings" className={styles.targetLink}>Settings</Link> to compute them from your BMR and goal.
          </p>
        ) : (
          <>
            <div className={styles.targetSteps}>
              <div className={styles.targetStep}>
                <small className={styles.targetStepLabel}>BMR (Mifflin-St Jeor)</small>
                <strong className={styles.targetStepValue}>{recommended.bmr.toLocaleString()} kcal</strong>
                <span className={styles.targetStepSub}>
                  {recommended.inputs.weight_kg} kg ({recommended.inputs.weight_source}) · {recommended.inputs.height_cm} cm · {recommended.inputs.age_years} y
                </span>
              </div>
              <div className={styles.targetStep}>
                <small className={styles.targetStepLabel}>Maintenance (TDEE)</small>
                <strong className={styles.targetStepValue}>{recommended.tdee.toLocaleString()} kcal</strong>
                <span className={styles.targetStepSub}>BMR × {recommended.activity_factor} ({recommended.inputs.activity_level.toLowerCase()} activity)</span>
              </div>
              <div className={styles.targetStep}>
                <small className={styles.targetStepLabel}>Goal adjustment</small>
                <strong className={styles.targetStepValue}>
                  {recommended.calorie_adjustment > 0 ? '+' : ''}{recommended.calorie_adjustment} kcal
                </strong>
                <span className={styles.targetStepSub}>{recommended.goal_source}</span>
              </div>
              <div className={`${styles.targetStep} ${styles.targetStepResult}`}>
                <small className={styles.targetStepLabel}>Recommended</small>
                <strong className={styles.targetStepValue}>{recommended.daily_calories.toLocaleString()} kcal</strong>
                <span className={styles.targetStepSub}>
                  P {recommended.protein_g}g ({recommended.protein_g_per_kg} g/kg) · C {recommended.carbs_g}g · F {recommended.fat_g}g
                </span>
              </div>
            </div>
            {data && recommended.daily_calories !== data.targets.daily_calories && (
              <p className={styles.targetHint}>
                Your saved target is {data.targets.daily_calories.toLocaleString()} kcal. Nothing changes until you choose to apply the recommendation.
              </p>
            )}
          </>
        )}
      </Card>

      {/* Water Hydration Tracker */}
      <Card className={styles.hydrationCard}>
        <div className={styles.hydrationLeft}>
          <div className={styles.hydrationIconWrap}>
            <Droplets size={26} color="var(--color-blue)" />
          </div>
          <div>
            <h3 className={styles.hydrationTitle}>Daily Hydration</h3>
            <div className={styles.hydrationTarget}>
              Target: {(data?.targets.water_ml || 3200) / 1000}L per day
            </div>
          </div>
        </div>

        <div className={styles.hydrationRight}>
          <div className={styles.hydrationValueWrap}>
            <div className={styles.hydrationValue}>
              {((data?.day.water_consumed_ml || 0) / 1000).toFixed(2)} L
            </div>
            <div className={styles.hydrationLabel}>Logged Today</div>
          </div>

          <div className={styles.hydrationButtons}>
            <Button size="sm" variant="secondary" onClick={() => handleAddWater(250)}>
              +250ml (Cup)
            </Button>
            <Button size="sm" variant="secondary" onClick={() => handleAddWater(500)}>
              +500ml (Bottle)
            </Button>
          </div>
        </div>
      </Card>

      {/* Daily Meals Breakdown */}
      <div className={styles.mealsList}>
        {mealCategories.map((cat) => {
          const categoryMeals = data?.day.meals.filter((m) => m.meal_type === cat) || [];
          const catCalories = categoryMeals.reduce((acc, m) => acc + m.calories, 0);

          const yesterdayCatMeals = yesterdayMeals.filter((m) => m.meal_type === cat);
          const yesterdayKcal = yesterdayCatMeals.reduce((acc, m) => acc + m.calories, 0);
          const yesterdayProt = yesterdayCatMeals.reduce((acc, m) => acc + m.protein_g, 0);

          return (
            <Card key={cat}>
              <div className={styles.mealCardHeader}>
                <div className={styles.mealCardHeaderLeft}>
                  <h3 className={styles.mealCardTitle}>{categoryTitles[cat]}</h3>
                  <Badge variant="emerald">{catCalories} kcal</Badge>
                </div>

                <div className={styles.mealCardHeaderRight}>
                  {yesterdayCatMeals.length > 0 && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleRepeatYesterday(cat)}
                      disabled={repeatingMeal === cat}
                    >
                      <RotateCcw size={13} />
                      <span>{repeatingMeal === cat ? 'Repeating...' : `Repeat Yesterday (${yesterdayKcal} kcal)`}</span>
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openLogModal(cat)}
                  >
                    <Plus size={14} /> Add Item
                  </Button>
                </div>
              </div>

              {categoryMeals.length === 0 ? (
                yesterdayCatMeals.length > 0 ? (
                  <div className={styles.emptyWithYesterday}>
                    <p className={styles.mealEmptyText}>Nothing logged yet today for {categoryTitles[cat]}.</p>
                    <div className={styles.yesterdayPreviewBox}>
                      <div className={styles.yesterdayPreviewText}>
                        <span className={styles.yesterdayBadge}>Yesterday</span>
                        <span>{yesterdayCatMeals.map((m) => m.name).join(' + ')}</span>
                        <span className={styles.yesterdayKcal}>({yesterdayKcal} kcal &middot; {Math.round(yesterdayProt)}g P)</span>
                      </div>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleRepeatYesterday(cat)}
                        disabled={repeatingMeal === cat}
                      >
                        <RotateCcw size={13} />
                        <span>{repeatingMeal === cat ? 'Copying...' : `Repeat Yesterday's ${categoryTitles[cat]}`}</span>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className={styles.mealEmpty}>No food items logged for this meal yet.</p>
                )
              ) : (
                <div className={styles.mealItemsList}>
                  {categoryMeals.map((meal) => {
                    const itemQty = meal.quantity ?? meal.servings ?? 1;
                    return (
                      <div key={meal.id} className={styles.mealItem}>
                        <div>
                          <div className={styles.mealItemName}>
                            {meal.name}
                            {itemQty !== 1 && (
                              <span className={styles.mealItemServings}> × {itemQty}</span>
                            )}
                          </div>
                          <div className={styles.mealItemMacros}>
                            <span>P: <strong className={styles.mealItemMacroProtein}>{meal.protein_g}g</strong></span>
                            <span>C: <strong className={styles.mealItemMacroCarbs}>{meal.carbs_g}g</strong></span>
                            <span>F: <strong className={styles.mealItemMacroFat}>{meal.fat_g}g</strong></span>
                          </div>
                        </div>

                        <div className={styles.mealItemActions}>
                          <div className={styles.mealItemCalories}>
                            {meal.calories} <span className={styles.mealItemCaloriesUnit}>kcal</span>
                          </div>
                          <button
                            type="button"
                            className={styles.deleteMealBtn}
                            title="Remove item"
                            onClick={() => handleDeleteMeal(meal.id)}
                            disabled={deletingMealId === meal.id}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* 2-3 week calorie & metabolic adjustment protocol */}
      <div>
        <h2 className={styles.protocolTitle}>
          The 2–3 Week Calorie &amp; Metabolic Adjustment Protocol — {pacing?.mode_label || 'Pacing Rules'}
        </h2>
        <Card>
          <div className={styles.protocolGrid}>
            {adjustmentRows.map((row) => (
              <div key={row[0]} className={styles.protocolRow}>
                <strong>{row[0]}</strong>
                <span className={styles.protocolRowMuted}>{row[1]}</span>
                <span className={styles.protocolRowMuted}>{row[2]}</span>
                <span>{row[3]}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Redesigned Log Food Modal */}
      <Modal isOpen={addMealModal} onClose={() => setAddMealModal(false)} title="Log Meal Entry">
        <div className={styles.formGroup}>
          {/* Meal Category Pill Tabs */}
          <div>
            <label className={styles.formLabel}>Meal Category</label>
            <div className={styles.modalMealTypeTabs}>
              {mealCategories.map((type) => (
                <button
                  key={type}
                  type="button"
                  className={`${styles.modalMealTypeTab} ${mealType === type ? styles.modalMealTypeTabActive : ''}`}
                  onClick={() => setMealType(type)}
                >
                  {categoryTitles[type]}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Replay Banner for Selected Meal Type */}
          {modalYesterdayMeals.length > 0 && (
            <div className={styles.modalYesterdayBanner}>
              <div>
                <div className={styles.modalYesterdayTitle}>
                  <RotateCcw size={14} /> Repeat Yesterday&apos;s {categoryTitles[mealType]}
                </div>
                <div className={styles.modalYesterdaySubtitle}>
                  {modalYesterdayMeals.map((m) => m.name).join(' + ')} &middot; <strong>{modalYesterdayKcal} kcal</strong> &middot; {Math.round(modalYesterdayProtein)}g protein
                </div>
              </div>
              <Button
                size="sm"
                variant="primary"
                onClick={() => handleRepeatYesterday(mealType)}
                disabled={repeatingMeal === mealType}
              >
                {repeatingMeal === mealType ? 'Logging...' : 'Repeat Meal'}
              </Button>
            </div>
          )}

          {/* Primary / Fallback Navigation */}
          <div className={styles.tabSwitch}>
            <button
              type="button"
              className={`${styles.tabSwitchBtn} ${modalMode === 'recent' ? styles.tabSwitchBtnActive : ''}`}
              onClick={() => setModalMode('recent')}
            >
              <Clock size={15} /> Recent Foods &amp; Search (Primary)
            </button>
            <button
              type="button"
              className={`${styles.tabSwitchBtn} ${modalMode === 'manual' ? styles.tabSwitchBtnActive : ''}`}
              onClick={() => setModalMode('manual')}
            >
              Enter manually (6 fields)
            </button>
          </div>

          {modalMode === 'recent' ? (
            <>
              {!selectedFood ? (
                <>
                  {/* Search input */}
                  <div>
                    <input
                      type="text"
                      placeholder="Search foods, oats, eggs, chicken, dahi..."
                      value={foodQuery}
                      onChange={(e) => setFoodQuery(e.target.value)}
                      className={styles.formInput}
                      autoFocus
                    />
                  </div>

                  {/* If user typed a search query, show filtered results */}
                  {foodQuery.trim() !== '' ? (
                    <div>
                      <div className={styles.sectionHeading}>Search Results</div>
                      <div className={styles.foodResults}>
                        {foodResults.length === 0 ? (
                          <p className={styles.mealEmpty}>
                            No foods match &quot;{foodQuery}&quot;. Switch to manual entry to log it!
                          </p>
                        ) : (
                          foodResults.map((food) => (
                            <button
                              key={food.id}
                              type="button"
                              className={styles.foodResult}
                              onClick={() => {
                                setSelectedFood(food);
                                setQuantity(1);
                              }}
                            >
                              <span className={styles.foodResultName}>
                                {food.name}
                                {food.is_custom && <Badge variant="cyan">Custom</Badge>}
                              </span>
                              <span className={styles.foodResultMeta}>
                                {food.serving_label} · {food.calories} kcal · P {food.protein_g}g
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Default state: Recent foods list */
                    <div className={styles.recentFoodsSection}>
                      <div className={styles.sectionHeading}>
                        {recentFoods.length > 0 ? 'Recently Logged Foods' : 'Suggested Staples'}
                      </div>

                      {recentFoods.length > 0 ? (
                        <div className={styles.recentFoodsGrid}>
                          {recentFoods.map((rf) => (
                            <button
                              key={rf.id}
                              type="button"
                              className={styles.recentFoodCard}
                              onClick={() => {
                                setSelectedFood(rf);
                                setQuantity(rf.quantity || 1);
                              }}
                            >
                              <div className={styles.recentFoodName}>{rf.name}</div>
                              <div className={styles.recentFoodPortion}>{rf.serving_label}</div>
                              <div className={styles.recentFoodMacros}>
                                <span>{rf.calories} kcal</span>
                                <span>&middot;</span>
                                <span>{rf.protein_g}g P</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className={styles.staplesList}>
                          {foodResults.slice(0, 8).map((food) => (
                            <button
                              key={food.id}
                              type="button"
                              className={styles.stapleChip}
                              onClick={() => {
                                setSelectedFood(food);
                                setQuantity(1);
                              }}
                            >
                              {food.name} ({food.calories} kcal)
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                /* Selected food configuration card */
                <div className={styles.selectedFoodBox}>
                  <div className={styles.selectedFoodTop}>
                    <div>
                      <div className={styles.mealItemName}>{selectedFood.name}</div>
                      <div className={styles.recentFoodPortion}>
                        1 serving = {selectedFood.serving_label} ({selectedFood.calories} kcal)
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => setSelectedFood(null)}>
                      Change Food
                    </Button>
                  </div>

                  {/* Quantity & Servings Controls */}
                  <div className={styles.quantityControl}>
                    <label className={styles.formLabel}>Quantity / Servings</label>
                    <div className={styles.quantityStepper}>
                      <button
                        type="button"
                        className={styles.stepperBtn}
                        onClick={() => setQuantity((q) => Math.max(0.25, Math.round((q - 0.25) * 100) / 100))}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="0.25"
                        step="0.25"
                        value={quantity}
                        onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                        className={styles.stepperInput}
                      />
                      <button
                        type="button"
                        className={styles.stepperBtn}
                        onClick={() => setQuantity((q) => Math.round((q + 0.25) * 100) / 100)}
                      >
                        +
                      </button>

                      <div className={styles.quantityChips}>
                        {[0.5, 1, 1.5, 2].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            className={`${styles.quantityChip} ${quantity === preset ? styles.quantityChipActive : ''}`}
                            onClick={() => setQuantity(preset)}
                          >
                            {preset}x
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Scaled Macro Display */}
                  {(() => {
                    const scaled = scaleFood(selectedFood, quantity);
                    return (
                      <div className={styles.macroSummaryPill}>
                        <strong>{scaled.calories} kcal</strong>
                        <span>P: <strong className={styles.mealItemMacroProtein}>{scaled.protein}g</strong></span>
                        <span>C: <strong className={styles.mealItemMacroCarbs}>{scaled.carbs}g</strong></span>
                        <span>F: <strong className={styles.mealItemMacroFat}>{scaled.fat}g</strong></span>
                      </div>
                    );
                  })()}
                </div>
              )}
            </>
          ) : (
            /* Fallback 6-Field Manual Form */
            <>
              <div className={styles.manualNotice}>
                <strong>Fallback Form:</strong> Use this manual form if the item is not in your recent foods or catalog.
              </div>

              <div>
                <label className={styles.formLabel}>Food / Meal Name</label>
                <input
                  type="text"
                  placeholder="e.g. Masala Omelette & Brown Toast"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  className={styles.formInput}
                />
              </div>

              <div>
                <label className={styles.formLabel}>Quantity / Servings</label>
                <input
                  type="number"
                  min="0.25"
                  step="0.25"
                  value={manualQuantity}
                  onChange={(e) => setManualQuantity(parseFloat(e.target.value) || 1)}
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formGrid2}>
                <div>
                  <label className={styles.formLabel}>Total Calories (kcal)</label>
                  <input
                    type="number"
                    value={manualCalories}
                    onChange={(e) => setManualCalories(parseFloat(e.target.value) || 0)}
                    className={styles.formInput}
                  />
                </div>
                <div>
                  <label className={styles.formLabel}>Total Protein (g)</label>
                  <input
                    type="number"
                    value={manualProtein}
                    onChange={(e) => setManualProtein(parseFloat(e.target.value) || 0)}
                    className={styles.formInput}
                  />
                </div>
              </div>

              <div className={styles.formGrid2}>
                <div>
                  <label className={styles.formLabel}>Total Carbs (g)</label>
                  <input
                    type="number"
                    value={manualCarbs}
                    onChange={(e) => setManualCarbs(parseFloat(e.target.value) || 0)}
                    className={styles.formInput}
                  />
                </div>
                <div>
                  <label className={styles.formLabel}>Total Fat (g)</label>
                  <input
                    type="number"
                    value={manualFat}
                    onChange={(e) => setManualFat(parseFloat(e.target.value) || 0)}
                    className={styles.formInput}
                  />
                </div>
              </div>

              <label className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={saveAsFood}
                  onChange={(e) => setSaveAsFood(e.target.checked)}
                />
                Save to My Foods for quick 1-click logging next time
              </label>
            </>
          )}

          <div className={styles.formActions}>
            <Button variant="secondary" onClick={() => setAddMealModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleAddMeal}
              disabled={saving || (modalMode === 'recent' && !selectedFood)}
            >
              {saving ? 'Adding...' : 'Log Food'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
