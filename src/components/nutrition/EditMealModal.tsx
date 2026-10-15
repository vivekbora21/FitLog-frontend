'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { MealEntry } from '@/lib/types';
import { api } from '@/lib/api';

export interface EditMealModalProps {
  meal: MealEntry | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}

export const EditMealModal: React.FC<EditMealModalProps> = ({
  meal,
  onClose,
  onSaved,
}) => {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [calories, setCalories] = useState<number>(0);
  const [protein, setProtein] = useState<number>(0);
  const [carbs, setCarbs] = useState<number>(0);
  const [fat, setFat] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (meal) {
      setName(meal.name);
      setQuantity(meal.quantity ?? meal.servings ?? 1);
      setCalories(meal.calories);
      setProtein(meal.protein_g);
      setCarbs(meal.carbs_g);
      setFat(meal.fat_g);
    }
  }, [meal]);

  if (!meal) return null;

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Please enter a food or meal name');
      return;
    }
    setSaving(true);
    try {
      await api.updateMeal(meal.id, {
        name: name.trim(),
        quantity: Number(quantity) || 1,
        servings: Number(quantity) || 1,
        calories: Number(calories) || 0,
        protein_g: Number(protein) || 0,
        carbs_g: Number(carbs) || 0,
        fat_g: Number(fat) || 0,
      });
      onClose();
      await onSaved();
    } catch (err: any) {
      alert(err.message || 'Error updating food');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={!!meal} onClose={onClose} title="Edit Logged Item">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div>
          <label style={{ fontSize: '0.8125rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
            Food / Meal Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
          />
        </div>

        <div>
          <label style={{ fontSize: '0.8125rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
            Quantity / Servings
          </label>
          <input
            type="number"
            min="0.25"
            step="0.25"
            value={quantity}
            onChange={(e) => setQuantity(parseFloat(e.target.value) || 1)}
            style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block' }}>Calories (kcal)</label>
            <input
              type="number"
              value={calories}
              onChange={(e) => setCalories(parseFloat(e.target.value) || 0)}
              style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block' }}>Protein (g)</label>
            <input
              type="number"
              value={protein}
              onChange={(e) => setProtein(parseFloat(e.target.value) || 0)}
              style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block' }}>Carbs (g)</label>
            <input
              type="number"
              value={carbs}
              onChange={(e) => setCarbs(parseFloat(e.target.value) || 0)}
              style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block' }}>Fat (g)</label>
            <input
              type="number"
              value={fat}
              onChange={(e) => setFat(parseFloat(e.target.value) || 0)}
              style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
