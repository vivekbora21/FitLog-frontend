'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { BodyMeasurement } from '@/lib/types';
import styles from '@/app/app/measurements/measurements.module.css';

function localDateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

interface MeasurementModalProps {
  isOpen: boolean;
  editingItem: BodyMeasurement | null;
  onClose: () => void;
  onSuccess: () => void;
  unit: 'cm' | 'in';
}

interface ModalFormProps {
  editingItem: BodyMeasurement | null;
  onClose: () => void;
  onSuccess: () => void;
  unit: 'cm' | 'in';
}

const MeasurementModalForm: React.FC<ModalFormProps> = ({
  editingItem,
  onClose,
  onSuccess,
  unit,
}) => {
  const [formDate, setFormDate] = useState<string>(() => editingItem?.date || localDateKey());
  const [formNotes, setFormNotes] = useState<string>(() => editingItem?.notes || '');
  const [submitting, setSubmitting] = useState(false);

  const [formValues, setFormValues] = useState<Record<string, string>>(() => {
    const vals: Record<string, string> = {};
    const keys: (keyof BodyMeasurement)[] = [
      'neck_cm',
      'shoulders_cm',
      'chest_cm',
      'waist_cm',
      'hips_cm',
      'arms_cm',
      'biceps_left_cm',
      'biceps_right_cm',
      'forearms_cm',
      'thighs_cm',
      'thigh_left_cm',
      'thigh_right_cm',
      'calves_cm',
      'calf_left_cm',
      'calf_right_cm',
    ];
    keys.forEach((k) => {
      const val = editingItem ? editingItem[k] : undefined;
      if (typeof val === 'number') {
        vals[k] = unit === 'cm' ? val.toString() : (val / 2.54).toFixed(1);
      } else {
        vals[k] = '';
      }
    });
    return vals;
  });

  const inputToCm = (valStr: string): number | null => {
    const parsed = parseFloat(valStr);
    if (isNaN(parsed)) return null;
    if (unit === 'cm') return parsed;
    return parseFloat((parsed * 2.54).toFixed(2));
  };

  const handleSave = async () => {
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        date: formDate,
        notes: formNotes,
      };

      Object.entries(formValues).forEach(([key, strVal]) => {
        if (strVal.trim() !== '') {
          const valInCm = inputToCm(strVal);
          if (valInCm !== null) {
            payload[key] = valInCm;
          }
        } else {
          payload[key] = null;
        }
      });

      if (editingItem?.id) {
        await api.updateMeasurement(editingItem.id, payload);
      } else {
        await api.logMeasurement(payload);
      }
      onSuccess();
    } catch (err) {
      console.error('Failed to save body measurement', err);
      alert('Failed to save body measurement. Please check your inputs and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.modalBody}>
      <div className={styles.modalTopRow}>
        <div>
          <label className={styles.formLabel}>Check-in Date</label>
          <input
            type="date"
            value={formDate}
            onChange={(e) => setFormDate(e.target.value)}
            className={styles.formDateInput}
          />
        </div>
        <div>
          <label className={styles.formLabel}>Unit Mode</label>
          <div style={{ marginTop: '6px' }}>
            <span className={styles.kpiBadgeGreen}>
              Entering in {unit.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Torso & Core */}
      <div>
        <div className={styles.formSectionTitle}>Torso &amp; Core</div>
        <div className={styles.formGrid}>
          <div className={styles.formField}>
            <label className={styles.formSubLabel}>Waist ({unit})</label>
            <input
              type="number"
              step="0.1"
              placeholder="e.g. 90.5"
              value={formValues.waist_cm}
              onChange={(e) => setFormValues({ ...formValues, waist_cm: e.target.value })}
              className={styles.formInput}
            />
          </div>
          <div className={styles.formField}>
            <label className={styles.formSubLabel}>Chest ({unit})</label>
            <input
              type="number"
              step="0.1"
              placeholder="e.g. 102.0"
              value={formValues.chest_cm}
              onChange={(e) => setFormValues({ ...formValues, chest_cm: e.target.value })}
              className={styles.formInput}
            />
          </div>
          <div className={styles.formField}>
            <label className={styles.formSubLabel}>Shoulders ({unit})</label>
            <input
              type="number"
              step="0.1"
              placeholder="e.g. 120.0"
              value={formValues.shoulders_cm}
              onChange={(e) => setFormValues({ ...formValues, shoulders_cm: e.target.value })}
              className={styles.formInput}
            />
          </div>
          <div className={styles.formField}>
            <label className={styles.formSubLabel}>Hips ({unit})</label>
            <input
              type="number"
              step="0.1"
              placeholder="e.g. 98.0"
              value={formValues.hips_cm}
              onChange={(e) => setFormValues({ ...formValues, hips_cm: e.target.value })}
              className={styles.formInput}
            />
          </div>
          <div className={styles.formField}>
            <label className={styles.formSubLabel}>Neck ({unit})</label>
            <input
              type="number"
              step="0.1"
              placeholder="e.g. 36.0"
              value={formValues.neck_cm}
              onChange={(e) => setFormValues({ ...formValues, neck_cm: e.target.value })}
              className={styles.formInput}
            />
          </div>
        </div>
      </div>

      {/* Arms & Bilateral Biceps */}
      <div>
        <div className={styles.formSectionTitle}>Arms &amp; Bilateral Biceps</div>
        <div className={styles.formGrid}>
          <div className={styles.formField}>
            <label className={styles.formSubLabel}>Arms / Peak ({unit})</label>
            <input
              type="number"
              step="0.1"
              placeholder="e.g. 33.0"
              value={formValues.arms_cm}
              onChange={(e) => setFormValues({ ...formValues, arms_cm: e.target.value })}
              className={styles.formInput}
            />
          </div>
          <div className={styles.formField}>
            <label className={styles.formSubLabel}>Left Bicep ({unit})</label>
            <input
              type="number"
              step="0.1"
              placeholder="e.g. 32.9"
              value={formValues.biceps_left_cm}
              onChange={(e) => setFormValues({ ...formValues, biceps_left_cm: e.target.value })}
              className={styles.formInput}
            />
          </div>
          <div className={styles.formField}>
            <label className={styles.formSubLabel}>Right Bicep ({unit})</label>
            <input
              type="number"
              step="0.1"
              placeholder="e.g. 33.0"
              value={formValues.biceps_right_cm}
              onChange={(e) => setFormValues({ ...formValues, biceps_right_cm: e.target.value })}
              className={styles.formInput}
            />
          </div>
        </div>
      </div>

      {/* Legs & Bilateral Calves */}
      <div>
        <div className={styles.formSectionTitle}>Legs &amp; Calves</div>
        <div className={styles.formGrid}>
          <div className={styles.formField}>
            <label className={styles.formSubLabel}>Thighs ({unit})</label>
            <input
              type="number"
              step="0.1"
              placeholder="e.g. 58.0"
              value={formValues.thighs_cm}
              onChange={(e) => setFormValues({ ...formValues, thighs_cm: e.target.value })}
              className={styles.formInput}
            />
          </div>
          <div className={styles.formField}>
            <label className={styles.formSubLabel}>Left Thigh ({unit})</label>
            <input
              type="number"
              step="0.1"
              placeholder="e.g. 58.0"
              value={formValues.thigh_left_cm}
              onChange={(e) => setFormValues({ ...formValues, thigh_left_cm: e.target.value })}
              className={styles.formInput}
            />
          </div>
          <div className={styles.formField}>
            <label className={styles.formSubLabel}>Right Thigh ({unit})</label>
            <input
              type="number"
              step="0.1"
              placeholder="e.g. 58.2"
              value={formValues.thigh_right_cm}
              onChange={(e) => setFormValues({ ...formValues, thigh_right_cm: e.target.value })}
              className={styles.formInput}
            />
          </div>
          <div className={styles.formField}>
            <label className={styles.formSubLabel}>Calves ({unit})</label>
            <input
              type="number"
              step="0.1"
              placeholder="e.g. 37.5"
              value={formValues.calves_cm}
              onChange={(e) => setFormValues({ ...formValues, calves_cm: e.target.value })}
              className={styles.formInput}
            />
          </div>
          <div className={styles.formField}>
            <label className={styles.formSubLabel}>Left Calf ({unit})</label>
            <input
              type="number"
              step="0.1"
              placeholder="e.g. 37.5"
              value={formValues.calf_left_cm}
              onChange={(e) => setFormValues({ ...formValues, calf_left_cm: e.target.value })}
              className={styles.formInput}
            />
          </div>
          <div className={styles.formField}>
            <label className={styles.formSubLabel}>Right Calf ({unit})</label>
            <input
              type="number"
              step="0.1"
              placeholder="e.g. 37.5"
              value={formValues.calf_right_cm}
              onChange={(e) => setFormValues({ ...formValues, calf_right_cm: e.target.value })}
              className={styles.formInput}
            />
          </div>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className={styles.formLabel}>Notes</label>
        <textarea
          rows={2}
          placeholder="e.g. Morning fasted check-in. Solid waist reduction."
          value={formNotes}
          onChange={(e) => setFormNotes(e.target.value)}
          className={styles.formTextarea}
        />
      </div>

      <div className={styles.modalActions}>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={submitting}>
          {submitting ? 'Saving...' : editingItem ? 'Update Check-in' : 'Save Check-in'}
        </Button>
      </div>
    </div>
  );
};

export const MeasurementModal: React.FC<MeasurementModalProps> = ({
  isOpen,
  editingItem,
  onClose,
  onSuccess,
  unit,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingItem ? 'Edit Body Check-in' : 'Log New Body Measurements'}
    >
      {isOpen && (
        <MeasurementModalForm
          key={editingItem ? editingItem.id : 'new-measurement-form'}
          editingItem={editingItem}
          onClose={onClose}
          onSuccess={onSuccess}
          unit={unit}
        />
      )}
    </Modal>
  );
};
