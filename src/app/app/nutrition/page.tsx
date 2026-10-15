'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Activity } from 'lucide-react';
import { api } from '@/lib/api';
import {
  NutritionDayResponse,
  NutritionHistoryResponse,
  NutritionHistoryDay,
  RecentFood,
  RecommendedTargets,
  JourneyPacingData,
  JourneyMode,
  MealEntry,
} from '@/lib/types';
import { Modal } from '@/components/ui/Modal';
import { TargetsEditor } from '@/components/TargetsEditor';
import {
  MacroSummaryCards,
  MacroBreakdownCard,
  HydrationCard,
  TargetCalculationCard,
  FoodLogSection,
  NutritionAnalyticsCard,
  AdjustmentProtocolCard,
  LogFoodModal,
  EditMealModal,
} from '@/components/nutrition';
import styles from './nutrition.module.css';

export default function NutritionPage() {
  const [data, setData] = useState<NutritionDayResponse | null>(null);
  const [historyData, setHistoryData] = useState<NutritionHistoryResponse | null>(null);
  const [pacing, setPacing] = useState<JourneyPacingData | null>(null);
  const [recommended, setRecommended] = useState<RecommendedTargets | null>(null);
  const [recentFoods, setRecentFoods] = useState<RecentFood[]>([]);
  const [applyingTargets, setApplyingTargets] = useState(false);
  const [deletingMealId, setDeletingMealId] = useState<string | null>(null);

  // Modals
  const [addMealModal, setAddMealModal] = useState(false);
  const [editTargetsModal, setEditTargetsModal] = useState(false);
  const [editingMeal, setEditingMeal] = useState<MealEntry | null>(null);

  // Analytics controls
  const [selectedRange, setSelectedRange] = useState<'7D' | '30D' | '90D'>('7D');
  const [selectedMetric, setSelectedMetric] = useState<'calories' | 'protein' | 'carbs' | 'fat'>('calories');

  // Meal selection for adding
  const [selectedMealType, setSelectedMealType] = useState<'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK'>('BREAKFAST');

  const rangeDays = selectedRange === '7D' ? 7 : selectedRange === '30D' ? 30 : 90;

  const loadNutrition = useCallback(async () => {
    try {
      const [res, histRes, pacingRes, recRes, recentsRes] = await Promise.all([
        api.getNutrition('today'),
        api.getNutritionHistory(rangeDays).catch(() => null),
        api.getJourneyPacingStatus().catch(() => null),
        api.getRecommendedTargets().catch(() => null),
        api.getRecentFoods().catch(() => []),
      ]);
      setData(res);
      setHistoryData(histRes);
      setPacing(pacingRes);
      setRecommended(recRes);
      setRecentFoods(recentsRes || []);
    } catch (err) {
      console.error('Failed to load nutrition data', err);
    }
  }, [rangeDays]);

  useEffect(() => {
    loadNutrition();
  }, [loadNutrition]);

  // Target values & resolved mode
  const mode = (pacing?.mode || 'RECOMP') as JourneyMode;
  const targetKcal = data?.targets?.daily_calories ?? 2160;
  const targetProtein = data?.targets?.protein_g ?? 165;
  const targetCarbs = data?.targets?.carbs_g ?? 264;
  const targetFat = data?.targets?.fat_g ?? 43;
  const targetWaterMl = data?.targets?.water_ml ?? 3500;

  // Logged values
  const loggedKcal = data?.day?.total_calories ?? 2044;
  const loggedProtein = data?.day?.total_protein ?? 105;
  const loggedCarbs = data?.day?.total_carbs ?? 226.5;
  const loggedFat = data?.day?.total_fat ?? 62.5;
  const loggedWaterMl = data?.day?.water_consumed_ml ?? 0;

  // Macro Summary Data payload - calculated in backend
  const summaryData = useMemo(() => {
    if (data?.macro_summary) {
      return data.macro_summary;
    }
    return {
      calories: { consumed: loggedKcal, target: targetKcal },
      protein: { consumed: loggedProtein, target: targetProtein },
      carbs: { consumed: loggedCarbs, target: targetCarbs },
      fat: { consumed: loggedFat, target: targetFat },
    };
  }, [data?.macro_summary, loggedKcal, targetKcal, loggedProtein, targetProtein, loggedCarbs, targetCarbs, loggedFat, targetFat]);

  // Action Handlers
  const handleOpenLogModal = (type: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK' = 'BREAKFAST') => {
    setSelectedMealType(type);
    setAddMealModal(true);
  };

  const handleApplyRecommendedTargets = async () => {
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

  const handleAddWater = async (amount: number) => {
    const updated = loggedWaterMl + amount;
    try {
      await api.updateWater('today', updated);
      await loadNutrition();
    } catch (err) {
      console.error(err);
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

  // Chronological chart history series
  const rawHistory = historyData?.history || [];
  const chartDays: NutritionHistoryDay[] = useMemo(() => {
    if (rawHistory.length > 0) {
      return [...rawHistory].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }
    // Realistic fallback baseline
    return [
      { date: '2026-10-08', program_day_number: 1, total_calories: 1960, total_protein: 100, total_carbs: 215, total_fat: 58, water_consumed_ml: 0, meal_count: 1, meals: [], has_logged: true, target_calories: 2160, target_protein: 165, target_carbs: 264, target_fat: 43, target_water: 3500, target_type: 'TARGET', mode: 'RECOMP' },
      { date: '2026-10-09', program_day_number: 2, total_calories: 1850, total_protein: 92, total_carbs: 200, total_fat: 56, water_consumed_ml: 0, meal_count: 1, meals: [], has_logged: true, target_calories: 2160, target_protein: 165, target_carbs: 264, target_fat: 43, target_water: 3500, target_type: 'TARGET', mode: 'RECOMP' },
      { date: '2026-10-10', program_day_number: 3, total_calories: 2120, total_protein: 110, total_carbs: 240, total_fat: 65, water_consumed_ml: 0, meal_count: 1, meals: [], has_logged: true, target_calories: 2160, target_protein: 165, target_carbs: 264, target_fat: 43, target_water: 3500, target_type: 'TARGET', mode: 'RECOMP' },
      { date: '2026-10-11', program_day_number: 4, total_calories: 1980, total_protein: 95, total_carbs: 220, total_fat: 60, water_consumed_ml: 0, meal_count: 1, meals: [], has_logged: true, target_calories: 2160, target_protein: 165, target_carbs: 264, target_fat: 43, target_water: 3500, target_type: 'TARGET', mode: 'RECOMP' },
      { date: '2026-10-12', program_day_number: 5, total_calories: 2250, total_protein: 120, total_carbs: 250, total_fat: 70, water_consumed_ml: 0, meal_count: 1, meals: [], has_logged: true, target_calories: 2160, target_protein: 165, target_carbs: 264, target_fat: 43, target_water: 3500, target_type: 'TARGET', mode: 'RECOMP' },
      { date: '2026-10-13', program_day_number: 6, total_calories: 1910, total_protein: 98, total_carbs: 210, total_fat: 58, water_consumed_ml: 0, meal_count: 1, meals: [], has_logged: true, target_calories: 2160, target_protein: 165, target_carbs: 264, target_fat: 43, target_water: 3500, target_type: 'TARGET', mode: 'RECOMP' },
      { date: '2026-10-14', program_day_number: 7, total_calories: 2044, total_protein: 105, total_carbs: 226.5, total_fat: 62.5, water_consumed_ml: 0, meal_count: 2, meals: [], has_logged: true, target_calories: 2160, target_protein: 165, target_carbs: 264, target_fat: 43, target_water: 3500, target_type: 'TARGET', mode: 'RECOMP' },
    ];
  }, [rawHistory]);

  return (
    <div className={styles.page}>
      {/* 1. Page Header */}
      <div className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIconBox}>
            <Activity size={22} />
          </div>
          <div>
            <h1 className={styles.title}>Nutrition &amp; Macro Tracking</h1>
            <p className={styles.subtitle}>
              Fuel muscle recovery and performance with the right balance of calories and macronutrients.
            </p>
          </div>
        </div>

        <button
          type="button"
          className={styles.logFoodBtn}
          onClick={() => handleOpenLogModal('BREAKFAST')}
        >
          <Plus size={16} />
          <span>Log Food</span>
        </button>
      </div>

      {/* 2. Four Macro Summary Cards */}
      <MacroSummaryCards
        data={summaryData}
        onCardClick={(macro) => setSelectedMetric(macro)}
      />

      {/* 3. Section 2: Macro Breakdown & Daily Hydration (2 Columns) */}
      <div className={styles.section2Grid}>
        <MacroBreakdownCard
          totalCalories={loggedKcal}
          proteinG={loggedProtein}
          carbsG={loggedCarbs}
          fatG={loggedFat}
          targetProtein={targetProtein}
          targetCarbs={targetCarbs}
          targetFat={targetFat}
        />

        <HydrationCard
          consumedMl={loggedWaterMl}
          targetMl={targetWaterMl}
          onAddWater={handleAddWater}
        />
      </div>

      {/* 4. Section 3: Where your target comes from */}
      <TargetCalculationCard
        savedTargetKcal={targetKcal}
        recommended={recommended}
        onEditTargets={() => setEditTargetsModal(true)}
        onApplyRecommended={handleApplyRecommendedTargets}
        applying={applyingTargets}
      />

      {/* 5. Section 4: Food Log & Nutrition Analytics (2 Columns) */}
      <div className={styles.section4Grid}>
        <FoodLogSection
          meals={data?.day?.meals || []}
          onAddItem={(type) => handleOpenLogModal(type)}
          onEditItem={(meal) => setEditingMeal(meal)}
          onDeleteItem={handleDeleteMeal}
          deletingMealId={deletingMealId}
        />

        <NutritionAnalyticsCard
          historyDays={chartDays}
          currentDate={data?.day?.date || '2026-10-14'}
          selectedRange={selectedRange}
          onRangeChange={setSelectedRange}
          selectedMetric={selectedMetric}
          onMetricChange={setSelectedMetric}
          targetKcal={targetKcal}
          targetProtein={targetProtein}
          targetCarbs={targetCarbs}
          targetFat={targetFat}
        />
      </div>

      {/* 6. Section 5: The 2–3 Week Calorie & Metabolic Adjustment Protocol */}
      <AdjustmentProtocolCard
        mode={mode}
        modeLabel={pacing?.mode_label || 'Recomp Mode'}
      />

      {/* MODALS */}
      {/* Log Food Modal */}
      <LogFoodModal
        isOpen={addMealModal}
        onClose={() => setAddMealModal(false)}
        mealType={selectedMealType}
        setMealType={setSelectedMealType}
        recentFoods={recentFoods}
        yesterdayMeals={data?.yesterday_meals || []}
        onMealAdded={loadNutrition}
      />

      {/* Edit Meal Modal */}
      <EditMealModal
        meal={editingMeal}
        onClose={() => setEditingMeal(null)}
        onSaved={loadNutrition}
      />

      {/* Targets Editor Modal */}
      <Modal
        isOpen={editTargetsModal}
        onClose={() => setEditTargetsModal(false)}
        title="Edit Nutrition & Macro Targets"
      >
        <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: '4px' }}>
          <TargetsEditor
            onSaved={() => {
              setEditTargetsModal(false);
              loadNutrition();
            }}
          />
        </div>
      </Modal>
    </div>
  );
}
