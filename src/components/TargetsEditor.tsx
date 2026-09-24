'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Target, CheckCircle2, AlertCircle, AlertTriangle, RotateCcw } from 'lucide-react';
import { api } from '@/lib/api';
import { TargetField, TargetsPayload } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import uiStyles from '@/components/ui/ui.module.css';
import styles from './TargetsEditor.module.css';

interface FieldDef {
  field: TargetField;
  label: string;
  unit: string;
  step: number;
  /** Empty means "follow the active plan". */
  followsPlan?: boolean;
}

const GROUPS: { title: string; hint: string; fields: FieldDef[] }[] = [
  {
    title: 'Nutrition',
    hint: 'Change protein, fat or calories and carbs rebalance so the macros still add up.',
    fields: [
      { field: 'daily_calories', label: 'Calories', unit: 'kcal / day', step: 10 },
      { field: 'protein_g', label: 'Protein', unit: 'g / day', step: 5 },
      { field: 'carbs_g', label: 'Carbs', unit: 'g / day', step: 5 },
      { field: 'fat_g', label: 'Fat', unit: 'g / day', step: 1 },
      { field: 'water_ml', label: 'Water', unit: 'ml / day', step: 250 },
    ],
  },
  {
    title: 'Recovery & activity',
    hint: 'Used to score sleep and steps on the dashboard, weekly review and pacing.',
    fields: [
      { field: 'daily_steps', label: 'Steps', unit: 'steps / day', step: 500 },
      { field: 'sleep_hours', label: 'Sleep', unit: 'hours / night', step: 0.5 },
    ],
  },
  {
    title: 'Training',
    hint: 'Leave empty to follow your active plan.',
    fields: [
      { field: 'weekly_workouts', label: 'Workouts', unit: 'sessions / week', step: 1, followsPlan: true },
      { field: 'weekly_cardio_minutes', label: 'Cardio', unit: 'min / week', step: 10, followsPlan: true },
    ],
  },
];

type Draft = Partial<Record<TargetField, string>>;

const toChanges = (draft: Draft) => {
  const changes: Partial<Record<TargetField, number | null>> = {};
  (Object.keys(draft) as TargetField[]).forEach((field) => {
    const raw = draft[field]?.trim() ?? '';
    if (raw === '') {
      changes[field] = null;
    } else if (!Number.isNaN(Number(raw))) {
      changes[field] = Number(raw);
    }
  });
  return changes;
};

const fmt = (n: number | null | undefined) => (n == null ? '—' : n.toLocaleString());

export const TargetsEditor: React.FC = () => {
  const [saved, setSaved] = useState<TargetsPayload | null>(null);
  const [preview, setPreview] = useState<TargetsPayload | null>(null);
  const [draft, setDraft] = useState<Draft>({});
  const [errors, setErrors] = useState<Partial<Record<TargetField, string>>>({});
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    api.getTargets().then(setSaved).catch(() => setLoadError('Could not load your targets.'));
  }, []);

  const changes = useMemo(() => toChanges(draft), [draft]);
  const hasChanges = Object.keys(changes).length > 0;

  // Ask the server what the edit resolves to (carb rebalancing, warnings) before saving.
  useEffect(() => {
    if (!hasChanges) return;
    const timer = setTimeout(() => {
      api.updateTargets(changes, true)
        .then((res) => {
          setPreview(res);
          setErrors({});
        })
        .catch((err) => setErrors(err?.response?.errors || {}));
    }, 300);
    return () => clearTimeout(timer);
  }, [changes, hasChanges]);

  // A stale preview is ignored once the draft is empty (discarded or saved).
  const shown = (hasChanges && preview) || saved;
  const activePreview = hasChanges ? preview : null;

  const setField = (field: TargetField, value: string) => {
    setSuccessMsg('');
    setDraft((d) => ({ ...d, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccessMsg('');
    try {
      const res = await api.updateTargets(changes);
      setSaved(res);
      setPreview(null);
      setDraft({});
      setSuccessMsg('Saved. New targets apply from today; past days keep the targets they had.');
    } catch (err) {
      setErrors((err as { response?: { errors?: typeof errors } })?.response?.errors || {});
    } finally {
      setSaving(false);
    }
  };

  if (loadError) {
    return (
      <Card className={styles.card} id="targets">
        <div className={`${styles.banner} ${styles.bannerError}`}>
          <AlertCircle size={16} /> <span>{loadError}</span>
        </div>
      </Card>
    );
  }

  if (!shown) {
    return <Card className={styles.card} id="targets"><p className={styles.hint}>Loading targets…</p></Card>;
  }

  const warningsFor = (field: TargetField) => shown.warnings.filter((w) => w.field === field);
  const carbsRebalanced = Boolean(activePreview?.adjustments.length) && !('carbs_g' in draft);

  return (
    <Card className={styles.card} id="targets">
      <div className={styles.cardHeader}>
        <div className={styles.cardIcon}>
          <Target size={17} />
        </div>
        <div>
          <h2 className={styles.cardTitle}>Your Targets</h2>
          <p className={styles.cardSubtitle}>
            Set your own numbers or use the suggested ones. Every score in FitLog is measured against these.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className={`${styles.banner} ${styles.bannerSuccess}`}>
          <CheckCircle2 size={16} /> <span>{successMsg}</span>
        </div>
      )}

      {GROUPS.map((group) => (
        <section key={group.title} className={styles.group}>
          <div className={styles.groupHeader}>
            <h3 className={styles.groupTitle}>{group.title}</h3>
            <span className={styles.hint}>{group.hint}</span>
          </div>

          <div className={styles.rows}>
            {group.fields.map((def) => {
              const { field } = def;
              const value = shown[field];
              const suggested = shown.suggested[field];
              const planValue = def.followsPlan ? shown.effective[field as 'weekly_workouts' | 'weekly_cardio_minutes'] : null;
              const inputValue = field in draft ? draft[field]! : value == null ? '' : String(value);
              const isCustom = def.followsPlan ? value != null : suggested != null && value !== suggested;
              const [min, max] = shown.limits[field];
              const inputId = `target-${field}`;

              return (
                <div key={field} className={styles.row}>
                  <div className={styles.rowMain}>
                    <label className={styles.rowLabel} htmlFor={inputId}>
                      {def.label}
                      {isCustom ? (
                        <span className={`${styles.chip} ${styles.chipCustom}`}>Custom</span>
                      ) : (
                        <span className={styles.chip}>{def.followsPlan ? 'From plan' : 'Suggested'}</span>
                      )}
                      {field === 'carbs_g' && carbsRebalanced && (
                        <span className={`${styles.chip} ${styles.chipAdjusted}`}>Rebalanced</span>
                      )}
                    </label>
                    <div className={styles.inputWrap}>
                      <input
                        id={inputId}
                        type="number"
                        inputMode="decimal"
                        className={`${uiStyles.input} ${styles.input}`}
                        min={min}
                        max={max}
                        step={def.step}
                        value={inputValue}
                        placeholder={planValue != null ? `Plan: ${planValue}` : undefined}
                        onChange={(e) => setField(field, e.target.value)}
                      />
                      <span className={styles.unit}>{def.unit}</span>
                    </div>
                  </div>

                  <div className={styles.rowMeta}>
                    {def.followsPlan ? (
                      value != null ? (
                        <button type="button" className={styles.linkBtn} onClick={() => setField(field, '')}>
                          Follow plan ({fmt(planValue)})
                        </button>
                      ) : (
                        <span className={styles.hint}>Your plan sets {fmt(planValue)}</span>
                      )
                    ) : suggested != null && isCustom ? (
                      <button type="button" className={styles.linkBtn} onClick={() => setField(field, String(suggested))}>
                        Use suggested ({fmt(suggested)})
                      </button>
                    ) : null}
                  </div>

                  {errors[field] && (
                    <div className={`${styles.note} ${styles.noteError}`}>
                      <AlertCircle size={14} /> {errors[field]}
                    </div>
                  )}
                  {warningsFor(field).map((w) => (
                    <div key={w.message} className={`${styles.note} ${styles.noteWarn}`}>
                      <AlertTriangle size={14} /> {w.message}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {activePreview?.adjustments.map((a) => (
        <p key={a} className={styles.hint}>{a}</p>
      ))}

      <div className={styles.actions}>
        {hasChanges && (
          <Button type="button" variant="ghost" onClick={() => { setDraft({}); setErrors({}); }} disabled={saving}>
            <RotateCcw size={14} /> Discard
          </Button>
        )}
        <Button
          type="button"
          variant="primary"
          onClick={handleSave}
          disabled={!hasChanges || saving || (hasChanges && Object.keys(errors).length > 0)}
        >
          {saving ? 'Saving...' : 'Save Targets'}
        </Button>
      </div>
    </Card>
  );
};
