'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Ruler,
  Plus,
  TrendingDown,
  TrendingUp,
  Sparkles,
  ArrowRight,
  ArrowLeftRight,
  Calendar,
  Layers,
  Activity,
  Edit2,
  Trash2,
  CheckCircle2,
  HelpCircle,
  Percent,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { api } from '@/lib/api';
import { BodyMeasurement } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { MetricChart } from '@/components/MetricChart';
import styles from './measurements.module.css';

type UnitMode = 'cm' | 'in';

interface MetricMeta {
  key: keyof BodyMeasurement;
  label: string;
  category: 'torso' | 'arms' | 'legs';
  targetType: 'hypertrophy' | 'reduction' | 'neutral'; // determines whether growth is green
  description: string;
}

const METRIC_DEFINITIONS: MetricMeta[] = [
  { key: 'shoulders_cm', label: 'Shoulders', category: 'torso', targetType: 'hypertrophy', description: 'Circumference across deltoids for V-taper frame' },
  { key: 'chest_cm', label: 'Chest', category: 'torso', targetType: 'hypertrophy', description: 'Measured across nipple line at normal exhale' },
  { key: 'waist_cm', label: 'Waist', category: 'torso', targetType: 'reduction', description: 'Narrowest point / navel level at morning fasting' },
  { key: 'hips_cm', label: 'Hips', category: 'torso', targetType: 'reduction', description: 'Widest point around glutes and pelvic crest' },
  { key: 'arms_cm', label: 'Arms / Biceps', category: 'arms', targetType: 'hypertrophy', description: 'Peak flexed bicep circumference' },
  { key: 'forearms_cm', label: 'Forearms', category: 'arms', targetType: 'hypertrophy', description: 'Widest flexed point below elbow' },
  { key: 'thighs_cm', label: 'Thighs', category: 'legs', targetType: 'hypertrophy', description: 'Midpoint between hip crease and top of knee' },
  { key: 'calves_cm', label: 'Calves', category: 'legs', targetType: 'hypertrophy', description: 'Widest point of the gastrocnemius' },
  { key: 'neck_cm', label: 'Neck', category: 'torso', targetType: 'neutral', description: 'Just below the larynx / Adam’s apple' },
];

export default function BodyMeasurementsPage() {
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [unit, setUnit] = useState<UnitMode>('cm');
  const [selectedMetricKey, setSelectedMetricKey] = useState<keyof BodyMeasurement>('waist_cm');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [historyWeek, setHistoryWeek] = useState(1);

  // Comparison State
  const [compareDateA, setCompareDateA] = useState<string>('');
  const [compareDateB, setCompareDateB] = useState<string>('');

  // Form State
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formNotes, setFormNotes] = useState<string>('');
  const [formValues, setFormValues] = useState<Record<string, string>>({
    neck_cm: '',
    shoulders_cm: '',
    chest_cm: '',
    waist_cm: '',
    hips_cm: '',
    arms_cm: '',
    biceps_left_cm: '',
    biceps_right_cm: '',
    forearms_cm: '',
    thighs_cm: '',
    thigh_left_cm: '',
    thigh_right_cm: '',
    calves_cm: '',
    calf_left_cm: '',
    calf_right_cm: '',
  });

  const loadData = async () => {
    try {
      const data = await api.getMeasurements();
      const list: BodyMeasurement[] = Array.isArray(data) ? data : data.results || [];
      // Sort oldest to newest for chronological calculations, but state will keep original order
      setMeasurements(list);
      if (list.length >= 2) {
        setCompareDateA(list[list.length - 1].date); // baseline (oldest)
        setCompareDateB(list[0].date); // latest
      } else if (list.length === 1) {
        setCompareDateA(list[0].date);
        setCompareDateB(list[0].date);
      }
    } catch (err) {
      console.error('Failed to load measurements', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Conversion Helpers
  const toDisplayValue = (valInCm?: number | null): string => {
    if (valInCm === undefined || valInCm === null || isNaN(valInCm)) return '—';
    if (unit === 'cm') return `${valInCm.toFixed(1)}`;
    const inches = valInCm / 2.54;
    return `${inches.toFixed(1)}`;
  };

  const toDisplayNumber = (valInCm?: number | null): number | null => {
    if (valInCm === undefined || valInCm === null || isNaN(valInCm)) return null;
    if (unit === 'cm') return Number(valInCm.toFixed(1));
    return Number((valInCm / 2.54).toFixed(1));
  };

  // Convert input value to CM for saving
  const inputToCm = (valStr: string): number | null => {
    const parsed = parseFloat(valStr);
    if (isNaN(parsed)) return null;
    if (unit === 'cm') return parsed;
    return parseFloat((parsed * 2.54).toFixed(2));
  };

  // Chronological list (oldest to newest)
  const chronological = useMemo(() => {
    return [...measurements].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [measurements]);

  const latest = chronological.length > 0 ? chronological[chronological.length - 1] : null;
  const baseline = chronological.length > 0 ? chronological[0] : null;

  // Key Ratios
  const vTaperRatio = useMemo(() => {
    if (!latest?.shoulders_cm || !latest?.waist_cm) return null;
    return Number((latest.shoulders_cm / latest.waist_cm).toFixed(2));
  }, [latest]);

  const chestToWaistRatio = useMemo(() => {
    if (!latest?.chest_cm || !latest?.waist_cm) return null;
    return Number((latest.chest_cm / latest.waist_cm).toFixed(2));
  }, [latest]);

  const waistToHipRatio = useMemo(() => {
    if (!latest?.waist_cm || !latest?.hips_cm) return null;
    return Number((latest.waist_cm / latest.hips_cm).toFixed(2));
  }, [latest]);

  // Chart Data for Selected Metric
  const selectedMetricMeta = METRIC_DEFINITIONS.find((m) => m.key === selectedMetricKey) || METRIC_DEFINITIONS[0];
  const chartData = useMemo(() => {
    return chronological
      .filter((m) => m[selectedMetricKey] !== undefined && m[selectedMetricKey] !== null)
      .map((m) => {
        const val = toDisplayNumber(m[selectedMetricKey] as number);
        return {
          label: new Date(m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          value: val || 0,
        };
      });
  }, [chronological, selectedMetricKey, unit]);

  // Bilateral Symmetry Data
  const symmetryData = useMemo(() => {
    if (!latest) return null;
    const compute = (left?: number | null, right?: number | null, label = '') => {
      if (!left || !right) return null;
      const diff = Math.abs(left - right);
      const avg = (left + right) / 2;
      const diffPct = ((diff / avg) * 100).toFixed(1);
      const isBalanced = diff <= 0.4;
      return {
        label,
        left: toDisplayValue(left),
        right: toDisplayValue(right),
        diff: toDisplayValue(diff),
        diffPct,
        isBalanced,
      };
    };
    return {
      arms: compute(latest.biceps_left_cm, latest.biceps_right_cm, 'Biceps / Arms'),
      thighs: compute(latest.thigh_left_cm, latest.thigh_right_cm, 'Thighs / Quads'),
      calves: compute(latest.calf_left_cm, latest.calf_right_cm, 'Calves'),
    };
  }, [latest, unit]);

  // Comparison calculation
  const measurementA = chronological.find((m) => m.date === compareDateA);
  const measurementB = chronological.find((m) => m.date === compareDateB);

  // Form Handlers
  const handleOpenNewModal = () => {
    setEditingId(null);
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormNotes('');
    setFormValues({
      neck_cm: '',
      shoulders_cm: '',
      chest_cm: '',
      waist_cm: '',
      hips_cm: '',
      arms_cm: '',
      biceps_left_cm: '',
      biceps_right_cm: '',
      forearms_cm: '',
      thighs_cm: '',
      thigh_left_cm: '',
      thigh_right_cm: '',
      calves_cm: '',
      calf_left_cm: '',
      calf_right_cm: '',
    });
    setModalOpen(true);
  };

  const handleOpenEditModal = (item: BodyMeasurement) => {
    setEditingId(item.id);
    setFormDate(item.date);
    setFormNotes(item.notes || '');
    const newVals: Record<string, string> = {};
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
      const val = item[k];
      if (typeof val === 'number') {
        newVals[k] = unit === 'cm' ? val.toString() : (val / 2.54).toFixed(1);
      } else {
        newVals[k] = '';
      }
    });
    setFormValues(newVals);
    setModalOpen(true);
  };

  const handleSaveMeasurement = async () => {
    setSubmitting(true);
    try {
      const payload: Record<string, any> = {
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

      if (editingId) {
        await api.updateMeasurement(editingId, payload);
      } else {
        await api.logMeasurement(payload);
      }
      setModalOpen(false);
      loadData();
    } catch (err) {
      console.error('Failed to save body measurement', err);
      alert('Failed to save body measurement. Please check your inputs and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // History log pagination: one page per 7-day window, counted back from the latest check-in
  const historyWeeks = useMemo(() => {
    const DAY_MS = 1000 * 60 * 60 * 24;
    const sortedDesc = [...measurements].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (sortedDesc.length === 0) return [];
    const latest = new Date(sortedDesc[0].date).getTime();
    const buckets = new Map<number, BodyMeasurement[]>();
    for (const m of sortedDesc) {
      const idx = Math.floor(Math.round((latest - new Date(m.date).getTime()) / DAY_MS) / 7);
      if (!buckets.has(idx)) buckets.set(idx, []);
      buckets.get(idx)!.push(m);
    }
    const fmt = (t: number) => new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
    return [...buckets.entries()]
      .sort(([a], [b]) => a - b)
      .map(([idx, rows]) => {
        const end = latest - idx * 7 * DAY_MS;
        return { rows, label: `${fmt(end - 6 * DAY_MS)} – ${fmt(end)}` };
      });
  }, [measurements]);

  const historyTotalPages = Math.max(1, historyWeeks.length);
  const historySafePage = Math.min(historyWeek, historyTotalPages);
  const historyRows = historyWeeks[historySafePage - 1]?.rows ?? [];

  const getHistoryPageNumbers = (): (number | '...')[] => {
    const pages: (number | '...')[] = [];
    if (historyTotalPages <= 7) {
      for (let i = 1; i <= historyTotalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (historySafePage > 3) pages.push('...');
      const start = Math.max(2, historySafePage - 1);
      const end = Math.min(historyTotalPages - 1, historySafePage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (historySafePage < historyTotalPages - 2) pages.push('...');
      pages.push(historyTotalPages);
    }
    return pages;
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteMeasurement(id);
      setDeleteConfirmId(null);
      loadData();
    } catch (err) {
      console.error('Failed to delete measurement', err);
      alert('Failed to delete measurement.');
    }
  };

  return (
    <div className={styles.page}>
      {/* Top Header & Action Row */}
      <div className={styles.header}>
        <div>
          <div className={styles.headerTitleWrap}>
            <div className={styles.headerIcon}>
              <Ruler size={22} color="var(--color-cyan)" />
            </div>
            <h1 className={styles.title}>Body Measurements</h1>
          </div>
          <p className={styles.subtitle}>
            Circumference metrics, V-taper symmetry ratios, and structural muscle hypertrophy progression.
          </p>
        </div>

        <div className={styles.headerActions}>
          {/* Unit Toggle Switch */}
          <div className={styles.unitToggle}>
            <button
              onClick={() => setUnit('cm')}
              className={`${styles.unitBtn} ${unit === 'cm' ? styles.unitBtnActive : ''}`}
            >
              CM
            </button>
            <button
              onClick={() => setUnit('in')}
              className={`${styles.unitBtn} ${unit === 'in' ? styles.unitBtnActive : ''}`}
            >
              INCHES
            </button>
          </div>

          <Button variant="primary" onClick={handleOpenNewModal}>
            <Plus size={16} />
            <span>Log Check-in</span>
          </Button>
        </div>
      </div>

      {/* KPI Aesthetic & Composition Cards */}
      <div className={styles.kpiGrid}>
        {/* V-Taper Card */}
        <Card hoverable className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>
              V-Taper (Adonis Ratio)
            </span>
            <Badge variant="cyan">Shoulder / Waist</Badge>
          </div>
          <div className={styles.kpiValueRow}>
            <span className={styles.kpiValue}>
              {vTaperRatio !== null ? vTaperRatio : '—'}
            </span>
            <span className={styles.kpiTarget}>Target: 1.618</span>
          </div>
          <p className={styles.kpiHint}>
            {vTaperRatio && vTaperRatio >= 1.5
              ? 'Excellent athletic V-taper taper aesthetic.'
              : 'Keep increasing shoulder width while tightening the midsection.'}
          </p>
        </Card>

        {/* Chest-to-Waist Ratio Card */}
        <Card hoverable className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>
              Chest-to-Waist Ratio
            </span>
            <Badge variant="emerald">Torso Taper</Badge>
          </div>
          <div className={styles.kpiValueRow}>
            <span className={styles.kpiValue}>
              {chestToWaistRatio !== null ? chestToWaistRatio : '—'}
            </span>
            <span className={styles.kpiTargetSecondary}>Target: &gt; 1.25</span>
          </div>
          <p className={styles.kpiHint}>
            Pectoral & lat mass expansion relative to abdominal circumference.
          </p>
        </Card>

        {/* Waist-to-Hip Ratio (WHR) */}
        <Card hoverable className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>
              Waist-to-Hip Ratio
            </span>
            <Badge variant="violet">Health &amp; Leanness</Badge>
          </div>
          <div className={styles.kpiValueRow}>
            <span className={styles.kpiValue}>
              {waistToHipRatio !== null ? waistToHipRatio : '—'}
            </span>
            <span className={styles.kpiTarget}>Healthy: &lt; 0.90</span>
          </div>
          <p className={styles.kpiHint}>
            Visceral abdominal fat distribution benchmark.
          </p>
        </Card>

        {/* Waist Tightening Delta */}
        <Card hoverable className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiLabel}>
              Total Waist Delta
            </span>
            <Badge variant="amber">Since Day 1</Badge>
          </div>
          <div className={styles.kpiValueRow}>
            {latest?.waist_cm && baseline?.waist_cm ? (
              (() => {
                const diffCm = latest.waist_cm - baseline.waist_cm;
                const diffDisp = unit === 'cm' ? diffCm.toFixed(1) : (diffCm / 2.54).toFixed(1);
                const isLoss = diffCm < 0;
                return (
                  <>
                    <span className={`${styles.kpiValue} ${isLoss ? styles.kpiValuePrimary : styles.kpiValueAmber}`}>
                      {diffCm > 0 ? `+${diffDisp}` : diffDisp} {unit}
                    </span>
                    <span className={styles.kpiDeltaPct}>
                      ({((diffCm / baseline.waist_cm) * 100).toFixed(1)}%)
                    </span>
                  </>
                );
              })()
            ) : (
              <span className={styles.kpiValue}>—</span>
            )}
          </div>
          <p className={styles.kpiHint}>
            Tightening midsection indicates core fat shedding while retaining muscle.
          </p>
        </Card>
      </div>

      {/* Main Grid: Body Part Anatomical Cards + Interactive Progression Chart */}
      <div className={styles.mainGrid}>
        {/* Anatomical Metric Selector Cards */}
        <div>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Tracked Anatomical Sites</h2>
              <p className={styles.sectionSubtitle}>
                Click any body part to visualize historical trends on the timeline chart below.
              </p>
            </div>
            <span className={styles.sectionMeta}>
              Showing {METRIC_DEFINITIONS.length} key points
            </span>
          </div>

          <div className={styles.anatomicalGrid}>
            {METRIC_DEFINITIONS.map((def) => {
              const isSelected = selectedMetricKey === def.key;
              const currentValCm = latest?.[def.key] as number | undefined | null;
              const baselineValCm = baseline?.[def.key] as number | undefined | null;

              let deltaStr = '—';
              let deltaClass = styles.deltaBoldMuted;
              if (currentValCm && baselineValCm && currentValCm !== baselineValCm) {
                const diffCm = currentValCm - baselineValCm;
                const diffDisp = unit === 'cm' ? diffCm.toFixed(1) : (diffCm / 2.54).toFixed(1);
                const isPositive = diffCm > 0;
                deltaStr = isPositive ? `+${diffDisp} ${unit}` : `${diffDisp} ${unit}`;

                if (def.targetType === 'hypertrophy') {
                  deltaClass = isPositive ? styles.deltaBoldPrimary : styles.deltaBoldAmber;
                } else if (def.targetType === 'reduction') {
                  deltaClass = !isPositive ? styles.deltaBoldPrimary : styles.deltaBoldAmber;
                } else {
                  deltaClass = styles.deltaBoldCyan;
                }
              }

              return (
                <div
                  key={def.key}
                  onClick={() => setSelectedMetricKey(def.key)}
                  className={`${styles.anatomicalCard} ${isSelected ? styles.anatomicalCardSelected : ''}`}
                >
                  <div className={styles.anatomicalHeader}>
                    <div>
                      <div className={`${styles.anatomicalName} ${isSelected ? styles.anatomicalNameSelected : ''}`}>
                        {def.label}
                      </div>
                      <div className={styles.anatomicalCategory}>
                        {def.category}
                      </div>
                    </div>
                    {isSelected && (
                      <Badge variant="emerald" className={styles.anatomicalActiveBadge}>
                        Active Chart
                      </Badge>
                    )}
                  </div>

                  <div>
                    <div className={styles.anatomicalValue}>
                      {toDisplayValue(currentValCm)}{' '}
                      <span className={styles.anatomicalUnit}>
                        {unit}
                      </span>
                    </div>
                    <div className={styles.anatomicalSubRow}>
                      <span className={styles.anatomicalBase}>
                        Base: {toDisplayValue(baselineValCm)} {unit}
                      </span>
                      <span className={deltaClass}>{deltaStr}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Interactive Progression Chart */}
        <Card elevated>
          <div className={styles.chartCardHeader}>
            <div>
              <div className={styles.chartTitleRow}>
                <Activity size={18} color="var(--color-primary)" />
                <h3 className={styles.chartTitle}>
                  {selectedMetricMeta.label} Progression Over Time
                </h3>
              </div>
              <p className={styles.chartSubtitle}>
                {selectedMetricMeta.description}
              </p>
            </div>

            <div className={styles.chartPointsWrap}>
              <span className={styles.chartPointsLabel}>
                Data Points:
              </span>
              <Badge variant="cyan">{chartData.length} Logs</Badge>
            </div>
          </div>

          <MetricChart
            data={chartData}
            title={`${selectedMetricMeta.label} (${unit.toUpperCase()})`}
            unit={unit}
            type="line"
            color={selectedMetricMeta.targetType === 'reduction' ? '#06B6D4' : '#10B981'}
            height={260}
            emptyMessage={`No measurements recorded yet for ${selectedMetricMeta.label}. Click "Log Check-in" above!`}
          />
        </Card>
      </div>

      {/* Bilateral Symmetry & Balance Analysis */}
      <div>
        <div className={styles.symmetryHeader}>
          <ArrowLeftRight size={20} color="var(--color-primary)" />
          <h2 className={styles.sectionTitle}>Bilateral Symmetry &amp; Muscular Balance</h2>
        </div>
        <p className={styles.symmetrySubtitle}>
          Comparing left vs. right limb development to catch imbalances before they cause injury or postural distortion.
        </p>

        <div className={styles.symmetryGrid}>
          {[
            { title: 'Arms / Biceps', data: symmetryData?.arms },
            { title: 'Thighs / Quads', data: symmetryData?.thighs },
            { title: 'Calves', data: symmetryData?.calves },
          ].map((item) => (
            <Card key={item.title} hoverable>
              <div className={styles.symmetryCardHeader}>
                <span className={styles.symmetryCardTitle}>{item.title}</span>
                {item.data ? (
                  item.data.isBalanced ? (
                    <Badge variant="emerald">Balanced</Badge>
                  ) : (
                    <Badge variant="amber">Slight Asymmetry</Badge>
                  )
                ) : (
                  <Badge variant="cyan">Unlogged</Badge>
                )}
              </div>

              {item.data ? (
                <div className={styles.symmetryBody}>
                  <div className={styles.symmetryLimbGrid}>
                    <div className={styles.symmetryLimbBox}>
                      <div className={styles.symmetryLimbTag}>LEFT</div>
                      <div className={styles.symmetryLimbVal}>
                        {item.data.left} <span className={styles.symmetryLimbUnit}>{unit}</span>
                      </div>
                    </div>
                    <div className={styles.symmetryLimbBox}>
                      <div className={styles.symmetryLimbTag}>RIGHT</div>
                      <div className={styles.symmetryLimbVal}>
                        {item.data.right} <span className={styles.symmetryLimbUnit}>{unit}</span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.symmetryStats}>
                    <span>Delta: {item.data.diff} {unit}</span>
                    <span>Variance: {item.data.diffPct}%</span>
                  </div>
                </div>
              ) : (
                <div className={styles.symmetryEmpty}>
                  Log both left &amp; right measurements during check-in to enable bilateral analysis.
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* Side-by-Side Date Comparison Tool */}
      {measurements.length >= 2 && (
        <Card elevated>
          <div className={styles.compareCardHeader}>
            <div>
              <div className={styles.chartTitleRow}>
                <Calendar size={18} color="var(--color-primary)" />
                <h3 className={styles.chartTitle}>Side-by-Side Milestone Comparison</h3>
              </div>
              <p className={styles.chartSubtitle}>
                Compare body metrics across any two checkpoint dates to evaluate phase transformations.
              </p>
            </div>

            <div className={styles.comparePickers}>
              <div className={styles.comparePicker}>
                <span className={styles.comparePickerLabel}>Baseline A:</span>
                <select
                  value={compareDateA}
                  onChange={(e) => setCompareDateA(e.target.value)}
                  className={styles.compareSelect}
                >
                  {chronological.map((m) => (
                    <option key={m.id} value={m.date}>
                      {m.date}
                    </option>
                  ))}
                </select>
              </div>

              <span className={styles.compareVs}>vs</span>

              <div className={styles.comparePicker}>
                <span className={styles.comparePickerLabel}>Checkpoint B:</span>
                <select
                  value={compareDateB}
                  onChange={(e) => setCompareDateB(e.target.value)}
                  className={styles.compareSelect}
                >
                  {chronological.map((m) => (
                    <option key={m.id} value={m.date}>
                      {m.date}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr className={styles.tableTheadRow}>
                  <th className={styles.tableTh}>Body Site</th>
                  <th className={styles.tableTh}>{compareDateA}</th>
                  <th className={styles.tableTh}>{compareDateB}</th>
                  <th className={styles.tableTh}>Net Delta</th>
                  <th className={styles.tableTh}>% Change</th>
                </tr>
              </thead>
              <tbody>
                {METRIC_DEFINITIONS.map((def) => {
                  const valA = measurementA?.[def.key] as number | undefined | null;
                  const valB = measurementB?.[def.key] as number | undefined | null;

                  let delta = '—';
                  let pct = '—';
                  let deltaBoldClass = styles.deltaBoldMuted;
                  let deltaSemiBoldClass = styles.deltaSemiBoldMuted;

                  if (valA && valB) {
                    const diffCm = valB - valA;
                    const diffDisp = unit === 'cm' ? diffCm.toFixed(1) : (diffCm / 2.54).toFixed(1);
                    delta = diffCm > 0 ? `+${diffDisp} ${unit}` : `${diffDisp} ${unit}`;
                    const pctVal = ((diffCm / valA) * 100).toFixed(1);
                    pct = `${diffCm > 0 ? `+${pctVal}` : pctVal}%`;

                    if (def.targetType === 'hypertrophy') {
                      deltaBoldClass = diffCm > 0 ? styles.deltaBoldPrimary : diffCm < 0 ? styles.deltaBoldAmber : styles.deltaBoldMuted;
                      deltaSemiBoldClass = diffCm > 0 ? styles.deltaSemiBoldPrimary : diffCm < 0 ? styles.deltaSemiBoldAmber : styles.deltaSemiBoldMuted;
                    } else if (def.targetType === 'reduction') {
                      deltaBoldClass = diffCm < 0 ? styles.deltaBoldPrimary : diffCm > 0 ? styles.deltaBoldAmber : styles.deltaBoldMuted;
                      deltaSemiBoldClass = diffCm < 0 ? styles.deltaSemiBoldPrimary : diffCm > 0 ? styles.deltaSemiBoldAmber : styles.deltaSemiBoldMuted;
                    } else {
                      deltaBoldClass = styles.deltaBoldCyan;
                      deltaSemiBoldClass = styles.deltaSemiBoldCyan;
                    }
                  }

                  return (
                    <tr key={def.key} className={styles.tableRow}>
                      <td className={styles.tableTdLabel}>{def.label}</td>
                      <td className={styles.tableTdSecondary}>
                        {toDisplayValue(valA)} {unit}
                      </td>
                      <td className={styles.tableTdBold}>
                        {toDisplayValue(valB)} {unit}
                      </td>
                      <td className={`${styles.tableTd} ${deltaBoldClass}`}>
                        {delta}
                      </td>
                      <td className={`${styles.tableTd} ${deltaSemiBoldClass}`}>
                        {pct}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* History Log Table */}
      <div>
        <div className={styles.historyHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Check-in History Log</h2>
            <p className={styles.sectionSubtitle}>
              Full chronological log of recorded body dimensions.
            </p>
          </div>
          <Button variant="outline" onClick={handleOpenNewModal}>
            <Plus size={14} />
            <span>Add Log</span>
          </Button>
        </div>

        <Card>
          {measurements.length === 0 ? (
            <div className={styles.historyEmpty}>
              <Ruler size={36} color="var(--border-subtle)" className={styles.historyEmptyIcon} />
              <p className={styles.historyEmptyTitle}>No measurement logs recorded yet</p>
              <p className={styles.historyEmptyText}>
                Log your first check-in to start mapping your muscular and body composition trajectory.
              </p>
              <Button variant="primary" onClick={handleOpenNewModal} className={styles.historyEmptyBtn}>
                <Plus size={16} />
                <span>Log Your Baseline Measurements</span>
              </Button>
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr className={styles.tableTheadRow}>
                    <th className={styles.tableThPad}>Date</th>
                    <th className={styles.tableThPad}>Shoulders</th>
                    <th className={styles.tableThPad}>Chest</th>
                    <th className={styles.tableThPad}>Waist</th>
                    <th className={styles.tableThPad}>Hips</th>
                    <th className={styles.tableThPad}>Arms</th>
                    <th className={styles.tableThPad}>Thighs</th>
                    <th className={styles.tableThPad}>Calves</th>
                    <th className={styles.tableThPad}>Notes</th>
                    <th className={styles.tableThRight}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {historyRows.map((m) => (
                    <tr key={m.id} className={styles.tableRow}>
                      <td className={styles.tableTdDate}>
                        {m.date}
                      </td>
                      <td className={styles.tableTd}>{toDisplayValue(m.shoulders_cm)}</td>
                      <td className={styles.tableTd}>{toDisplayValue(m.chest_cm)}</td>
                      <td className={styles.tableTdPrimary}>
                        {toDisplayValue(m.waist_cm)}
                      </td>
                      <td className={styles.tableTd}>{toDisplayValue(m.hips_cm)}</td>
                      <td className={styles.tableTd}>{toDisplayValue(m.arms_cm)}</td>
                      <td className={styles.tableTd}>{toDisplayValue(m.thighs_cm)}</td>
                      <td className={styles.tableTd}>{toDisplayValue(m.calves_cm)}</td>
                      <td className={styles.tableTdNotes}>
                        {m.notes || '—'}
                      </td>
                      <td className={styles.tableTdActions}>
                        <div className={styles.actionBtnGroup}>
                          <button
                            onClick={() => handleOpenEditModal(m)}
                            title="Edit log"
                            className={styles.actionIconBtn}
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(m.id)}
                            title="Delete log"
                            className={styles.actionDeleteBtn}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {historyTotalPages > 1 && (
            <nav className={styles.pagination} aria-label="Check-in history pagination">
              <span className={styles.pageSummary}>
                {historySafePage === 1 ? 'Latest week' : `Week ${historySafePage}`} · {historyWeeks[historySafePage - 1]?.label}
              </span>

              <div className={styles.pageControls}>
                <button
                  className={styles.pageBtn}
                  onClick={() => setHistoryWeek(p => Math.max(1, p - 1))}
                  disabled={historySafePage === 1}
                  aria-label="Newer week"
                >
                  <ChevronLeft size={16} />
                  <span className={styles.pageBtnLabel}>Newer</span>
                </button>

                <div className={styles.pageNumbers}>
                  {getHistoryPageNumbers().map((page, i) =>
                    page === '...' ? (
                      <span key={`ellipsis-${i}`} className={styles.pageEllipsis}>…</span>
                    ) : (
                      <button
                        key={page}
                        onClick={() => setHistoryWeek(page)}
                        className={`${styles.pageNumber} ${historySafePage === page ? styles.pageNumberActive : ''}`}
                        aria-current={historySafePage === page ? 'page' : undefined}
                        title={historyWeeks[page - 1]?.label}
                      >
                        {page}
                      </button>
                    )
                  )}
                </div>

                <button
                  className={styles.pageBtn}
                  onClick={() => setHistoryWeek(p => Math.min(historyTotalPages, p + 1))}
                  disabled={historySafePage === historyTotalPages}
                  aria-label="Older week"
                >
                  <span className={styles.pageBtnLabel}>Older</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </nav>
          )}
        </Card>
      </div>

      {/* Log / Edit Measurement Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Body Check-in' : 'Log New Body Measurements'}
      >
        <div className={styles.modalBody}>
          {/* Top Row: Date & Active Unit */}
          <div className={styles.modalTopGrid}>
            <div>
              <label className={styles.formLabel}>
                Check-in Date
              </label>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className={styles.formDateInput}
              />
            </div>
            <div>
              <label className={styles.formLabel}>
                Unit Mode
              </label>
              <div className={styles.unitBadgeWrap}>
                <Badge variant={unit === 'cm' ? 'emerald' : 'cyan'}>
                  Entering in {unit.toUpperCase()}
                </Badge>
                <span className={styles.unitHint}>
                  (Toggle on main page to switch)
                </span>
              </div>
            </div>
          </div>

          {/* Torso & Core Section */}
          <div>
            <div className={`${styles.formSectionTitle} ${styles.formSectionPrimary}`}>
              Torso &amp; Core
            </div>
            <div className={styles.formGrid}>
              <div>
                <label className={styles.formSubLabel}>
                  Waist ({unit})
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 82.5"
                  value={formValues.waist_cm}
                  onChange={(e) => setFormValues({ ...formValues, waist_cm: e.target.value })}
                  className={styles.formNumberInput}
                />
              </div>

              <div>
                <label className={styles.formSubLabel}>
                  Chest ({unit})
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 104.0"
                  value={formValues.chest_cm}
                  onChange={(e) => setFormValues({ ...formValues, chest_cm: e.target.value })}
                  className={styles.formNumberInput}
                />
              </div>

              <div>
                <label className={styles.formSubLabel}>
                  Shoulders ({unit})
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 120.0"
                  value={formValues.shoulders_cm}
                  onChange={(e) => setFormValues({ ...formValues, shoulders_cm: e.target.value })}
                  className={styles.formNumberInput}
                />
              </div>

              <div>
                <label className={styles.formSubLabel}>
                  Hips ({unit})
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 98.0"
                  value={formValues.hips_cm}
                  onChange={(e) => setFormValues({ ...formValues, hips_cm: e.target.value })}
                  className={styles.formNumberInput}
                />
              </div>

              <div>
                <label className={styles.formSubLabel}>
                  Neck ({unit})
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 38.5"
                  value={formValues.neck_cm}
                  onChange={(e) => setFormValues({ ...formValues, neck_cm: e.target.value })}
                  className={styles.formNumberInput}
                />
              </div>
            </div>
          </div>

          {/* Arms & Forearms Section */}
          <div>
            <div className={`${styles.formSectionTitle} ${styles.formSectionCyan}`}>
              Arms &amp; Forearms
            </div>
            <div className={styles.formGrid}>
              <div>
                <label className={styles.formSubLabel}>
                  Arms / Biceps ({unit})
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 38.0"
                  value={formValues.arms_cm}
                  onChange={(e) => setFormValues({ ...formValues, arms_cm: e.target.value })}
                  className={styles.formNumberInput}
                />
              </div>

              <div>
                <label className={styles.formSubLabel}>
                  Left Bicep ({unit})
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 37.8"
                  value={formValues.biceps_left_cm}
                  onChange={(e) => setFormValues({ ...formValues, biceps_left_cm: e.target.value })}
                  className={styles.formNumberInput}
                />
              </div>

              <div>
                <label className={styles.formSubLabel}>
                  Right Bicep ({unit})
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 38.0"
                  value={formValues.biceps_right_cm}
                  onChange={(e) => setFormValues({ ...formValues, biceps_right_cm: e.target.value })}
                  className={styles.formNumberInput}
                />
              </div>

              <div>
                <label className={styles.formSubLabel}>
                  Forearms ({unit})
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 31.5"
                  value={formValues.forearms_cm}
                  onChange={(e) => setFormValues({ ...formValues, forearms_cm: e.target.value })}
                  className={styles.formNumberInput}
                />
              </div>
            </div>
          </div>

          {/* Lower Body & Calves Section */}
          <div>
            <div className={`${styles.formSectionTitle} ${styles.formSectionViolet}`}>
              Lower Body &amp; Calves
            </div>
            <div className={styles.formGrid}>
              <div>
                <label className={styles.formSubLabel}>
                  Thighs ({unit})
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 58.5"
                  value={formValues.thighs_cm}
                  onChange={(e) => setFormValues({ ...formValues, thighs_cm: e.target.value })}
                  className={styles.formNumberInput}
                />
              </div>

              <div>
                <label className={styles.formSubLabel}>
                  Left Thigh ({unit})
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 58.5"
                  value={formValues.thigh_left_cm}
                  onChange={(e) => setFormValues({ ...formValues, thigh_left_cm: e.target.value })}
                  className={styles.formNumberInput}
                />
              </div>

              <div>
                <label className={styles.formSubLabel}>
                  Right Thigh ({unit})
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 58.7"
                  value={formValues.thigh_right_cm}
                  onChange={(e) => setFormValues({ ...formValues, thigh_right_cm: e.target.value })}
                  className={styles.formNumberInput}
                />
              </div>

              <div>
                <label className={styles.formSubLabel}>
                  Calves ({unit})
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 37.5"
                  value={formValues.calves_cm}
                  onChange={(e) => setFormValues({ ...formValues, calves_cm: e.target.value })}
                  className={styles.formNumberInput}
                />
              </div>

              <div>
                <label className={styles.formSubLabel}>
                  Left Calf ({unit})
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 37.5"
                  value={formValues.calf_left_cm}
                  onChange={(e) => setFormValues({ ...formValues, calf_left_cm: e.target.value })}
                  className={styles.formNumberInput}
                />
              </div>

              <div>
                <label className={styles.formSubLabel}>
                  Right Calf ({unit})
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 37.5"
                  value={formValues.calf_right_cm}
                  onChange={(e) => setFormValues({ ...formValues, calf_right_cm: e.target.value })}
                  className={styles.formNumberInput}
                />
              </div>
            </div>
          </div>

          {/* Notes Section */}
          <div>
            <label className={styles.formLabel}>
              Check-in Notes &amp; Observations
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Fasted morning check-in. Vascularity noticeable on shoulders."
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              className={styles.formNotesTextarea}
            />
          </div>

          {/* Action Buttons */}
          <div className={styles.modalActions}>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveMeasurement} disabled={submitting}>
              {submitting ? 'Saving...' : editingId ? 'Update Check-in' : 'Save Check-in'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title="Delete Measurement Entry"
      >
        <p className={styles.deleteConfirmText}>
          Are you sure you want to permanently delete this measurement check-in? This action cannot be undone.
        </p>
        <div className={styles.deleteConfirmActions}>
          <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
