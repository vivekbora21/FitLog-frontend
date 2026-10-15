'use client';

import React, { useState, useEffect } from 'react';
import { RotateCcw, Clock } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Food, RecentFood, MealEntry } from '@/lib/types';
import { api } from '@/lib/api';

export interface LogFoodModalProps {
  isOpen: boolean;
  onClose: () => void;
  mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
  setMealType: (type: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK') => void;
  recentFoods: RecentFood[];
  yesterdayMeals?: MealEntry[];
  onMealAdded: () => Promise<void>;
}

function scaleFood(food: Food | RecentFood, quantity: number) {
  const q = Number(quantity) || 0;
  return {
    calories: Math.round(food.calories * q),
    protein: Math.round(food.protein_g * q * 10) / 10,
    carbs: Math.round(food.carbs_g * q * 10) / 10,
    fat: Math.round(food.fat_g * q * 10) / 10,
  };
}

export const LogFoodModal: React.FC<LogFoodModalProps> = ({
  isOpen,
  onClose,
  mealType,
  setMealType,
  recentFoods,
  yesterdayMeals = [],
  onMealAdded,
}) => {
  const [modalMode, setModalMode] = useState<'recent' | 'manual'>('recent');
  const [foodQuery, setFoodQuery] = useState('');
  const [foodResults, setFoodResults] = useState<Food[]>([]);
  const [selectedFood, setSelectedFood] = useState<Food | RecentFood | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [repeating, setRepeating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Manual fields
  const [manualName, setManualName] = useState('');
  const [manualQuantity, setManualQuantity] = useState<number>(1);
  const [manualCalories, setManualCalories] = useState<number>(400);
  const [manualProtein, setManualProtein] = useState<number>(30);
  const [manualCarbs, setManualCarbs] = useState<number>(45);
  const [manualFat, setManualFat] = useState<number>(10);
  const [saveAsFood, setSaveAsFood] = useState(false);

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

  useEffect(() => {
    if (!isOpen || modalMode === 'manual') return;
    const timer = setTimeout(() => {
      api.searchFoods(foodQuery.trim()).then(setFoodResults).catch(console.error);
    }, 200);
    return () => clearTimeout(timer);
  }, [foodQuery, isOpen, modalMode]);

  const resetState = () => {
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

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleRepeatYesterday = async () => {
    setRepeating(true);
    try {
      await api.repeatYesterdayMeal(mealType);
      await onMealAdded();
      handleClose();
    } catch (err: any) {
      alert(err.message || 'Could not repeat yesterday’s meal.');
    } finally {
      setRepeating(false);
    }
  };

  const handleSubmit = async () => {
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
        const foodId = 'food_id' in selectedFood && selectedFood.food_id ? selectedFood.food_id : selectedFood.id;

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
      handleClose();
      await onMealAdded();
    } catch (err: any) {
      alert(err.message || 'Error logging food');
    } finally {
      setSaving(false);
    }
  };

  const yesterdayCategoryMeals = yesterdayMeals.filter((m) => m.meal_type === mealType);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Log Meal Entry">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Meal Category Pill Tabs */}
        <div>
          <label style={{ fontSize: '0.8125rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
            Meal Category
          </label>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {mealCategories.map((type) => (
              <button
                key={type}
                type="button"
                style={{
                  padding: '0.4rem 0.875rem',
                  borderRadius: '8px',
                  border: '1px solid',
                  borderColor: mealType === type ? '#0f766e' : '#e2e8f0',
                  background: mealType === type ? '#0f766e' : '#f8fafc',
                  color: mealType === type ? '#ffffff' : '#334155',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                }}
                onClick={() => setMealType(type)}
              >
                {categoryTitles[type]}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Repeat Yesterday Option */}
        {yesterdayCategoryMeals.length > 0 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.625rem 0.875rem',
              background: '#f0fdfa',
              border: '1px solid #99f6e4',
              borderRadius: '8px',
              gap: '8px',
            }}
          >
            <div style={{ fontSize: '0.8125rem', color: '#0f766e' }}>
              <strong style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <RotateCcw size={13} /> Repeat Yesterday&apos;s {categoryTitles[mealType]}
              </strong>
              <span style={{ fontSize: '0.75rem', color: '#115e59' }}>
                {yesterdayCategoryMeals.map((m) => m.name).join(' + ')}
              </span>
            </div>
            <Button
              size="sm"
              variant="primary"
              onClick={handleRepeatYesterday}
              disabled={repeating}
            >
              {repeating ? 'Copying...' : 'Repeat'}
            </Button>
          </div>
        )}

        {/* Tab Switcher: Recents / Search vs Manual */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
          <button
            type="button"
            style={{
              padding: '0.35rem 0.75rem',
              border: 'none',
              background: modalMode === 'recent' ? '#f1f5f9' : 'transparent',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '0.8125rem',
              color: modalMode === 'recent' ? '#0f172a' : '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
            onClick={() => setModalMode('recent')}
          >
            <Clock size={14} /> Recent &amp; Catalog Search
          </button>
          <button
            type="button"
            style={{
              padding: '0.35rem 0.75rem',
              border: 'none',
              background: modalMode === 'manual' ? '#f1f5f9' : 'transparent',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '0.8125rem',
              color: modalMode === 'manual' ? '#0f172a' : '#64748b',
              cursor: 'pointer',
            }}
            onClick={() => setModalMode('manual')}
          >
            Enter Manually (6 fields)
          </button>
        </div>

        {modalMode === 'recent' ? (
          <>
            {!selectedFood ? (
              <>
                <input
                  type="text"
                  placeholder="Search foods (eggs, chicken breast, oats, roti, dahi)..."
                  value={foodQuery}
                  onChange={(e) => setFoodQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                  autoFocus
                />

                {foodQuery.trim() !== '' ? (
                  <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {foodResults.length === 0 ? (
                      <p style={{ fontSize: '0.8125rem', color: '#64748b', padding: '8px 0' }}>
                        No foods match &quot;{foodQuery}&quot;. Switch to manual entry to log it!
                      </p>
                    ) : (
                      foodResults.map((food) => (
                        <button
                          key={food.id}
                          type="button"
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: '1px solid #e2e8f0',
                            background: '#ffffff',
                            textAlign: 'left',
                            cursor: 'pointer',
                          }}
                          onClick={() => {
                            setSelectedFood(food);
                            setQuantity(1);
                          }}
                        >
                          <div>
                            <strong style={{ fontSize: '0.875rem', color: '#0f172a' }}>{food.name}</strong>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              {food.serving_label} · {food.calories} kcal
                            </div>
                          </div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0f766e' }}>
                            P: {food.protein_g}g
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
                      {recentFoods.length > 0 ? 'Recently Logged Foods' : 'Suggested Staples'}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                      {recentFoods.slice(0, 6).map((rf) => (
                        <button
                          key={rf.id}
                          type="button"
                          style={{
                            padding: '8px 10px',
                            borderRadius: '6px',
                            border: '1px solid #e2e8f0',
                            background: '#f8fafc',
                            textAlign: 'left',
                            cursor: 'pointer',
                          }}
                          onClick={() => {
                            setSelectedFood(rf);
                            setQuantity(rf.quantity || 1);
                          }}
                        >
                          <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a' }}>{rf.name}</div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                            {rf.calories} kcal · {rf.protein_g}g P
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Selected food configuration */
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <strong style={{ fontSize: '0.9375rem', color: '#0f172a' }}>{selectedFood.name}</strong>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      1 serving = {selectedFood.serving_label} ({selectedFood.calories} kcal)
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedFood(null)}>
                    Change
                  </Button>
                </div>

                <div>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Quantity / Servings
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="number"
                      min="0.25"
                      step="0.25"
                      value={quantity}
                      onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                      style={{
                        width: '80px',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.875rem',
                        fontWeight: 700,
                      }}
                    />
                    {[0.5, 1, 1.5, 2].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          border: '1px solid #e2e8f0',
                          background: quantity === preset ? '#0f766e' : '#ffffff',
                          color: quantity === preset ? '#ffffff' : '#334155',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                        onClick={() => setQuantity(preset)}
                      >
                        {preset}x
                      </button>
                    ))}
                  </div>
                </div>

                {(() => {
                  const scaled = scaleFood(selectedFood, quantity);
                  return (
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 12px',
                        background: '#ffffff',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                        fontSize: '0.8125rem',
                      }}
                    >
                      <strong style={{ color: '#0f172a' }}>{scaled.calories} kcal</strong>
                      <span style={{ color: '#0f766e', fontWeight: 600 }}>P: {scaled.protein}g</span>
                      <span style={{ color: '#d97706', fontWeight: 600 }}>C: {scaled.carbs}g</span>
                      <span style={{ color: '#7c3aed', fontWeight: 600 }}>F: {scaled.fat}g</span>
                    </div>
                  );
                })()}
              </div>
            )}
          </>
        ) : (
          /* Manual Form */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Food / Meal Name
              </label>
              <input
                type="text"
                placeholder="e.g. Masala Omelette & Toast"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block' }}>Calories (kcal)</label>
                <input
                  type="number"
                  value={manualCalories}
                  onChange={(e) => setManualCalories(parseFloat(e.target.value) || 0)}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block' }}>Protein (g)</label>
                <input
                  type="number"
                  value={manualProtein}
                  onChange={(e) => setManualProtein(parseFloat(e.target.value) || 0)}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block' }}>Carbs (g)</label>
                <input
                  type="number"
                  value={manualCarbs}
                  onChange={(e) => setManualCarbs(parseFloat(e.target.value) || 0)}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block' }}>Fat (g)</label>
                <input
                  type="number"
                  value={manualFat}
                  onChange={(e) => setManualFat(parseFloat(e.target.value) || 0)}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={saving || (modalMode === 'recent' && !selectedFood)}
          >
            {saving ? 'Adding...' : 'Log Food'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
