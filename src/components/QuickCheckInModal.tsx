'use client';

import React, { useState } from 'react';
import {
  Scale,
  Droplets,
  Footprints,
  Moon,
  Plus,
  Minus,
  Check,
  Loader2,
  Calendar,
} from 'lucide-react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { api } from '@/lib/api';
import styles from './QuickCheckInModal.module.css';

interface QuickCheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialWeight?: number | null;
  initialWaterMl?: number | null;
  initialSteps?: number | null;
  initialSleepHours?: number | null;
  initialSleepQuality?: number | null;
  initialEnergy?: number | null;
}

const localDateKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function QuickCheckInForm({
  onClose,
  onSuccess,
  initialWeight,
  initialWaterMl = 0,
  initialSteps,
  initialSleepHours,
  initialSleepQuality,
  initialEnergy,
}: Omit<QuickCheckInModalProps, 'isOpen'>) {
  const [weight, setWeight] = useState<string>(initialWeight ? String(initialWeight) : '');
  const [waterMl, setWaterMl] = useState<number>(initialWaterMl || 0);
  const [steps, setSteps] = useState<string>(initialSteps ? String(initialSteps) : '');
  const [sleepHours, setSleepHours] = useState<string>(initialSleepHours ? String(initialSleepHours) : '');
  const [sleepQuality, setSleepQuality] = useState<number>(initialSleepQuality || 4);
  const [energyLevel, setEnergyLevel] = useState<number>(initialEnergy || 4);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);

  const handleWaterDelta = (deltaCups: number) => {
    setWaterMl((prev) => Math.max(0, prev + deltaCups * 250));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const today = localDateKey();

    try {
      const promises: Promise<unknown>[] = [];

      // 1. Log weight if provided
      if (weight && !isNaN(Number(weight))) {
        promises.push(api.logWeight(Number(weight)));
      }

      // 2. Log water
      promises.push(api.updateWater(today, waterMl));

      // 3. Log daily lifestyle (steps, sleep, energy)
      promises.push(
        api.logDaily({
          date: today,
          steps: steps ? Number(steps) : null,
          sleep_hours: sleepHours ? Number(sleepHours) : null,
          sleep_quality: sleepQuality,
          energy_level: energyLevel,
        })
      );

      await Promise.all(promises);
      setSuccessMsg(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 600);
    } catch (err) {
      console.error('Failed to save quick check-in', err);
    } finally {
      setSaving(false);
    }
  };

  const cups = Math.round(waterMl / 250);

  return (
    <form onSubmit={handleSave} className={styles.form}>
      <div className={styles.introRow}>
        <div className={styles.introDate}>
          <Calendar size={14} /> Log Fasted Biometrics &amp; Daily Lifestyle
        </div>
      </div>

      {/* Section 1: Morning Fasted Weight */}
      <div className={styles.inputGroup}>
        <label className={styles.label}>
          <Scale size={16} className={styles.labelIcon} />
          <span>Fasted Scale Weight</span>
          <span className={styles.sublabel}>Morning after waking</span>
        </label>
        <div className={styles.weightInputWrap}>
          <input
            type="number"
            step="0.1"
            min="30"
            max="250"
            placeholder="e.g. 76.0"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className={styles.numInput}
          />
          <span className={styles.unitTag}>kg</span>
        </div>
      </div>

      {/* Section 2: Hydration Tracker */}
      <div className={styles.inputGroup}>
        <label className={styles.label}>
          <Droplets size={16} className={styles.labelIconWater} />
          <span>Hydration Today</span>
          <span className={styles.sublabel}>{cups} cups ({waterMl} ml)</span>
        </label>
        <div className={styles.waterControlRow}>
          <button
            type="button"
            onClick={() => handleWaterDelta(-1)}
            className={styles.waterStepBtn}
            title="Minus 1 cup (250ml)"
          >
            <Minus size={15} />
          </button>
          <div className={styles.waterDisplay}>
            <span className={styles.waterVal}>{cups}</span>
            <span className={styles.waterUnit}>cups</span>
          </div>
          <button
            type="button"
            onClick={() => handleWaterDelta(1)}
            className={styles.waterStepBtnPrimary}
            title="Add 1 cup (250ml)"
          >
            <Plus size={15} /> 1 Cup
          </button>
          <button
            type="button"
            onClick={() => handleWaterDelta(2)}
            className={styles.waterStepBtn}
            title="Add 2 cups (500ml)"
          >
            +2 Cups
          </button>
        </div>
      </div>

      {/* Section 3: Daily Steps & Sleep */}
      <div className={styles.gridTwo}>
        <div className={styles.inputGroup}>
          <label className={styles.label}>
            <Footprints size={15} className={styles.labelIconSteps} />
            <span>Daily Steps</span>
          </label>
          <div className={styles.weightInputWrap}>
            <input
              type="number"
              step="100"
              placeholder="e.g. 8500"
              value={steps}
              onChange={(e) => setSteps(e.target.value)}
              className={styles.numInput}
            />
            <span className={styles.unitTag}>steps</span>
          </div>
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label}>
            <Moon size={15} className={styles.labelIconSleep} />
            <span>Sleep Duration</span>
          </label>
          <div className={styles.weightInputWrap}>
            <input
              type="number"
              step="0.5"
              min="0"
              max="24"
              placeholder="e.g. 7.5"
              value={sleepHours}
              onChange={(e) => setSleepHours(e.target.value)}
              className={styles.numInput}
            />
            <span className={styles.unitTag}>hours</span>
          </div>
        </div>
      </div>

      {/* Section 4: Sleep Quality & Energy Ratings */}
      <div className={styles.gridTwo}>
        <div className={styles.ratingGroup}>
          <div className={styles.ratingHeader}>
            <span className={styles.ratingLabel}>Sleep Quality</span>
            <span className={styles.ratingValue}>{sleepQuality} / 5</span>
          </div>
          <div className={styles.ratingPills}>
            {[1, 2, 3, 4, 5].map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setSleepQuality(lvl)}
                className={`${styles.ratingPill} ${sleepQuality === lvl ? styles.ratingPillActive : ''}`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.ratingGroup}>
          <div className={styles.ratingHeader}>
            <span className={styles.ratingLabel}>Energy Level</span>
            <span className={styles.ratingValue}>{energyLevel} / 5</span>
          </div>
          <div className={styles.ratingPills}>
            {[1, 2, 3, 4, 5].map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setEnergyLevel(lvl)}
                className={`${styles.ratingPill} ${energyLevel === lvl ? styles.ratingPillActive : ''}`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className={styles.footerRow}>
        <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? (
            <>
              <Loader2 size={16} className={styles.spinner} /> Saving...
            </>
          ) : successMsg ? (
            <>
              <Check size={16} /> Saved!
            </>
          ) : (
            'Save Check-in'
          )}
        </Button>
      </div>
    </form>
  );
}

export const QuickCheckInModal: React.FC<QuickCheckInModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialWeight,
  initialWaterMl,
  initialSteps,
  initialSleepHours,
  initialSleepQuality,
  initialEnergy,
}) => {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Daily Quick Check-in" size="md">
      <QuickCheckInForm
        key={`${initialWeight}-${initialWaterMl}-${initialSteps}`}
        onClose={onClose}
        onSuccess={onSuccess}
        initialWeight={initialWeight}
        initialWaterMl={initialWaterMl}
        initialSteps={initialSteps}
        initialSleepHours={initialSleepHours}
        initialSleepQuality={initialSleepQuality}
        initialEnergy={initialEnergy}
      />
    </Modal>
  );
};
