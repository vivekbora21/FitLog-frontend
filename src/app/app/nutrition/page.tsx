'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Activity } from 'lucide-react';
import { api } from '@/lib/api';
import { useDomainEvent } from '@/lib/events';
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

  // Reactive cross-view synchronization
  useDomainEvent('nutrition-updated', () => {
    loadNutrition();
  });
  useDomainEvent('plan-updated', () => {
    loadNutrition();
  });

  // Target values & resolved mode
  const mode = (pacing?.mode || 'RECOMP') as JourneyMode;
  const targetKcal = data?.targets?.daily_calories ?? 2160;
  const targetProtein = data?.targets?.protein_g ?? 165;
  const targetCarbs = data?.targets?.carbs_g ?? 264;
  const targetFat = data?.targets?.fat_g ?? 43;
  const targetWaterMl = data?.targets?.water_ml ?? 3500;

  // Logged values
  const loggedKcal = data?.day?.total_calories ?? 0;
  const loggedProtein = data?.day?.total_protein ?? 0;
  const loggedCarbs = data?.day?.total_carbs ?? 0;
  const loggedFat = data?.day?.total_fat ?? 0;
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
    return [];
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
