'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Ruler, Scale, Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { BodyMeasurement, WeightEntry } from '@/lib/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { TrendChartCard, TrendAnalysis, MetricTabOption } from '@/components/common/TrendChartCard';
import {
  MeasurementsKpiGrid,
  OverviewGrid,
  OverviewItem,
  SymmetryCard,
  SymmetryItem,
  CheckpointComparisonCard,
  CheckpointRow,
  HistoryLogCard,
  MeasurementModal,
} from '@/components/measurements';
import styles from './measurements.module.css';

type UnitMode = 'cm' | 'in';
type TimeFilter = '7D' | '30D' | '60D';

const DEFAULT_OVERVIEW_SITES = [
  { key: 'shoulders_cm', label: 'Shoulders', category: 'torso', target_type: 'hypertrophy' as const, icon_type: 'shoulders' },
  { key: 'chest_cm', label: 'Chest', category: 'torso', target_type: 'hypertrophy' as const, icon_type: 'chest' },
  { key: 'waist_cm', label: 'Waist', category: 'torso', target_type: 'reduction' as const, icon_type: 'waist' },
  { key: 'hips_cm', label: 'Hips', category: 'torso', target_type: 'reduction' as const, icon_type: 'hips' },
  { key: 'arms_cm', label: 'Arms', category: 'arms', target_type: 'hypertrophy' as const, icon_type: 'arms' },
  { key: 'thighs_cm', label: 'Thighs', category: 'legs', target_type: 'hypertrophy' as const, icon_type: 'thighs' },
  { key: 'calves_cm', label: 'Calves', category: 'legs', target_type: 'hypertrophy' as const, icon_type: 'calves' },
  { key: 'neck_cm', label: 'Neck', category: 'torso', target_type: 'neutral' as const, icon_type: 'neck' },
];

interface MeasurementSummaryData {
  has_data: boolean;
  total_logs: number;
  kpis?: {
    waist_change?: {
      baseline_cm: number | null;
      current_cm: number | null;
      diff_cm: number | null;
      diff_pct: number | null;
      sparkline: number[];
    };
    shoulder_to_waist?: {
      ratio: number | null;
      target: number;
      progress_pct: number;
    };
    chest_to_waist?: {
      ratio: number | null;
      target: number;
      progress_pct: number;
    };
    measurements_logged?: {
      total: number;
      recent_pill: string;
    };
  };
  overview?: OverviewItem[];
  symmetry?: SymmetryItem[];
  baseline_date?: string;
  latest_date?: string;
  dates?: string[];
}

export default function BodyMeasurementsPage() {
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [backendSummary, setBackendSummary] = useState<MeasurementSummaryData | null>(null);
  const [checkpointData, setCheckpointData] = useState<CheckpointRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [unit, setUnit] = useState<UnitMode>('cm');

  // Interactive selection
  const [selectedMetricKey, setSelectedMetricKey] = useState<string>('waist_cm');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('30D');
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; date: string; value: number; unit: string } | null>(null);

  // Checkpoint Comparison Dates
  const [compareDateA, setCompareDateA] = useState<string>('');
  const [compareDateB, setCompareDateB] = useState<string>('');

  // Sorting state for Checkpoint Comparison
  const [sortField, setSortField] = useState<'site' | 'baseline' | 'latest' | 'change' | 'changePct'>('site');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // History Log pagination (6 per page)
  const [historyPage, setHistoryPage] = useState<number>(1);
  const itemsPerPage = 6;

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BodyMeasurement | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Load all measurements, weights, and backend-calculated summary
  const loadData = useCallback(async () => {
    try {
      const [mRes, wRes, summaryRes] = await Promise.allSettled([
        api.getMeasurements(),
        api.getWeights(),
        api.getMeasurementSummary(),
      ]);

      let mList: BodyMeasurement[] = [];
      if (mRes.status === 'fulfilled') {
        const val = mRes.value;
        mList = Array.isArray(val) ? val : (val as { results?: BodyMeasurement[] }).results || [];
      }

      let wList: WeightEntry[] = [];
      if (wRes.status === 'fulfilled') {
        const val = wRes.value;
        wList = Array.isArray(val) ? val : (val as { results?: WeightEntry[] }).results || [];
      }

      let summary = null;
      if (summaryRes.status === 'fulfilled') {
        summary = summaryRes.value;
        setBackendSummary(summary);
      }

      setMeasurements(mList);
      setWeights(wList);

      const dates = summary?.dates || mList.map((m) => m.date).sort();
      if (dates.length >= 2) {
        setCompareDateA(dates[0]);
        setCompareDateB(dates[dates.length - 1]);
      } else if (dates.length === 1) {
        setCompareDateA(dates[0]);
        setCompareDateB(dates[0]);
      }
    } catch (err) {
      console.error('Failed to load measurements', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    void (async () => {
      if (!ignore) {
        await loadData();
      }
    })();
    return () => {
      ignore = true;
    };
  }, [loadData]);

  // Load backend-calculated comparison whenever checkpoint dates change
  useEffect(() => {
    if (!compareDateA || !compareDateB) return;
    let ignore = false;
    async function fetchCompare() {
      try {
        const res = await api.compareMeasurements(compareDateA, compareDateB);
        if (!ignore && res?.rows) {
          setCheckpointData(res.rows);
        }
      } catch (err) {
        console.error('Failed to fetch checkpoint comparison from backend', err);
      }
    }
    fetchCompare();
    return () => {
      ignore = true;
    };
  }, [compareDateA, compareDateB]);

  // Conversion Helpers
  const toDisplayNumber = useCallback(
    (valInCm?: number | null): number | null => {
      if (valInCm === undefined || valInCm === null || isNaN(valInCm)) return null;
      if (unit === 'cm') return Number(valInCm.toFixed(1));
      return Number((valInCm / 2.54).toFixed(1));
    },
    [unit]
  );

  // Chronological list (oldest to newest)
  const chronological = useMemo(() => {
    return [...measurements].sort((a, b) => a.date.localeCompare(b.date));
  }, [measurements]);

  // Overview items from backend summary or fallback
  const overviewItems: OverviewItem[] = useMemo(() => {
    if (backendSummary?.overview && backendSummary.overview.length > 0) {
      return backendSummary.overview;
    }
    const latest = chronological.length > 0 ? chronological[chronological.length - 1] : null;
    const baseline = chronological.length > 0 ? chronological[0] : null;

    return DEFAULT_OVERVIEW_SITES.map((def) => {
      const key = def.key as keyof BodyMeasurement;
      const cur = latest?.[key] as number | undefined | null;
      const base = baseline?.[key] as number | undefined | null;
      const diff = cur !== undefined && cur !== null && base !== undefined && base !== null ? cur - base : null;
      const diffPct = diff !== null && base ? (diff / base) * 100 : null;
      return {
        key: def.key,
        label: def.label,
        category: def.category,
        target_type: def.target_type,
        icon_type: def.icon_type,
        current_cm: cur ?? null,
        baseline_cm: base ?? null,
        diff_cm: diff !== null ? Number(diff.toFixed(1)) : null,
        diff_pct: diffPct !== null ? Number(diffPct.toFixed(1)) : null,
      };
    });
  }, [backendSummary, chronological]);

  // Symmetry items from backend summary
  const symmetryItems: SymmetryItem[] = useMemo(() => {
    return backendSummary?.symmetry || [];
  }, [backendSummary]);

  // Trend Analysis calculation for the shared common TrendChartCard
  const trendAnalysis: TrendAnalysis = useMemo(() => {
    const isWeight = selectedMetricKey === 'weight_kg';
    const activeUnit = isWeight ? (unit === 'cm' ? 'kg' : 'lbs') : unit;

    let rawEntries: Array<{ date: string; val: number; label: string }> = [];

    if (isWeight) {
      rawEntries = weights
        .filter((w) => w.weight_kg != null)
        .map((w) => {
          const parts = w.date.split('-');
          const d = parts.length === 3 ? new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])) : new Date(w.date);
          const val = unit === 'cm' ? w.weight_kg : Number((w.weight_kg * 2.20462).toFixed(1));
          return {
            date: w.date,
            val,
            label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          };
        })
        .sort((a, b) => a.date.localeCompare(b.date));
    } else {
      const key = selectedMetricKey as keyof BodyMeasurement;
      rawEntries = chronological
        .filter((m) => m[key] != null && typeof m[key] === 'number')
        .map((m) => {
          const parts = m.date.split('-');
          const d = parts.length === 3 ? new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])) : new Date(m.date);
          const rawCm = m[key] as number;
          const val = toDisplayNumber(rawCm) || 0;
          return {
            date: m.date,
            val,
            label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          };
        })
        .sort((a, b) => a.date.localeCompare(b.date));
    }

    // Default Goal computation
    const isWaist = selectedMetricKey === 'waist_cm';
    const goalVal = isWeight
      ? (unit === 'cm' ? 75.0 : 165.0)
      : isWaist
      ? (toDisplayNumber(80.0) || 80.0)
      : (overviewItems.find((o) => o.key === selectedMetricKey)?.baseline_cm
          ? (toDisplayNumber(overviewItems.find((o) => o.key === selectedMetricKey)?.baseline_cm) || 0)
          : 0);

    const goalText = goalVal > 0 ? `${goalVal} ${activeUnit}` : '—';

    if (rawEntries.length === 0) {
      return {
        hasData: false,
        unit: activeUnit,
        currentText: '—',
        changeText: '—',
        isChangeNegative: true,
        goalText,
        points: [],
        pathD: '',
        goalY: 0,
        yTicks: [],
        minVal: 0,
        maxVal: 0,
        padTop: 0,
        usableH: 0,
        range: 1,
      };
    }

    const days = timeFilter === '7D' ? 7 : timeFilter === '30D' ? 30 : 60;
    const latestDate = new Date(rawEntries[rawEntries.length - 1].date + 'T00:00:00');
    const cutoffTimestamp = latestDate.getTime() - (days - 1) * 24 * 60 * 60 * 1000;

    let filtered = rawEntries.filter((e) => new Date(e.date + 'T00:00:00').getTime() >= cutoffTimestamp);
    if (filtered.length === 0) {
      filtered = [rawEntries[rawEntries.length - 1]];
    }

    const curr = filtered[filtered.length - 1].val;
    const initial = filtered[0].val;
    const diff = Number((curr - initial).toFixed(1));
    const diffPct = initial ? Math.abs((diff / initial) * 100).toFixed(1) : '0.0';
    const isChangeNegative = diff < 0;
    const changeSign = diff > 0 ? '+' : '';
    const changeText = `${isChangeNegative ? '↓' : '↑'} ${changeSign}${diff} ${activeUnit} (${diffPct}%)`;

    const vals = filtered.map((p) => p.val);
    const effectiveGoal = goalVal > 0 ? goalVal : curr;
    const minVal = Math.floor(Math.min(...vals, effectiveGoal) - 1);
    const maxVal = Math.ceil(Math.max(...vals, effectiveGoal) + 1);
    const range = maxVal - minVal || 1;

    const svgWidth = 740;
    const svgHeight = 190;
    const padLeft = 40;
    const padRight = 30;
    const padTop = 20;
    const padBottom = 30;
    const usableW = svgWidth - padLeft - padRight;
    const usableH = svgHeight - padTop - padBottom;

    const points = filtered.map((item, idx) => {
      const x = padLeft + (idx / Math.max(1, filtered.length - 1)) * usableW;
      const y = padTop + (1 - (item.val - minVal) / range) * usableH;
      return {
        x,
        y,
        val: item.val,
        date: item.label,
        rawDate: item.date,
      };
    });

    const pathD = points.reduce((acc, currPt, idx) => {
      return idx === 0 ? `M ${currPt.x} ${currPt.y}` : `${acc} L ${currPt.x} ${currPt.y}`;
    }, '');

    const goalY = goalVal > 0 ? padTop + (1 - (goalVal - minVal) / range) * usableH : 0;

    const step = Math.max(1, Math.round(range / 5));
    const yTicks: number[] = [];
    for (let t = minVal; t <= maxVal; t += step) {
      yTicks.push(t);
    }

    return {
      hasData: true,
      unit: activeUnit,
      currentText: `${curr} ${activeUnit}`,
      changeText,
      isChangeNegative,
      goalText,
      points,
      pathD,
      goalY,
      yTicks,
      minVal,
      maxVal,
      padTop,
      usableH,
      range,
    };
  }, [selectedMetricKey, weights, chronological, timeFilter, unit, toDisplayNumber, overviewItems]);

  const selectedMetricLabel = useMemo(() => {
    if (selectedMetricKey === 'weight_kg') return 'Weight';
    const site = DEFAULT_OVERVIEW_SITES.find((s) => s.key === selectedMetricKey);
    return site ? site.label : 'Measurement';
  }, [selectedMetricKey]);

  // Metric tab definitions for the trend chart with icons
  const metricTabs: MetricTabOption<string>[] = useMemo(() => [
    { key: 'weight_kg', label: 'Weight', icon: <Scale size={12} /> },
    { key: 'waist_cm', label: 'Waist', icon: <Ruler size={12} /> },
    ...(selectedMetricKey !== 'weight_kg' && selectedMetricKey !== 'waist_cm'
      ? [{ key: selectedMetricKey, label: selectedMetricLabel, icon: <Ruler size={12} /> }]
      : []),
  ], [selectedMetricKey, selectedMetricLabel]);

  // Handlers
  const handleOpenNewModal = () => {
    setEditingItem(null);
    setModalOpen(true);
  };

  const handleOpenEditModal = (item: BodyMeasurement) => {
    setEditingItem(item);
    setModalOpen(true);
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

  const handleSort = (field: 'site' | 'baseline' | 'latest' | 'change' | 'changePct') => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  if (loading && measurements.length === 0) {
    return (
      <div className={styles.page}>
        <div style={{ padding: '6rem 1rem', textAlign: 'center', color: '#64748b' }}>
          Loading body measurements...
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerTitleWrap}>
          <div className={styles.headerIcon}>
            <Ruler size={24} color="#0f766e" />
          </div>
          <div>
            <h1 className={styles.title}>Body Measurements</h1>
            <p className={styles.subtitle}>
              Track body composition, proportions and symmetry over time.
            </p>
          </div>
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

          <button className={styles.logCheckinBtn} onClick={handleOpenNewModal}>
            <Plus size={16} />
            <span>+ Log Check-in</span>
          </button>
        </div>
      </div>

      {/* 1. Top KPI Cards Row */}
      <MeasurementsKpiGrid kpis={backendSummary?.kpis} unit={unit} />

      {/* 2. Body Measurement Overview (8 Clickable Cards) */}
      <OverviewGrid
        items={overviewItems}
        selectedKey={selectedMetricKey}
        onSelectKey={setSelectedMetricKey}
        unit={unit}
        baselineDate={backendSummary?.baseline_date}
      />

      {/* 3. Middle Section Grid: Trend Chart & Left vs Right Symmetry */}
      <div className={styles.middleGrid}>
        {/* Reusable Common TrendChartCard (Identical to Dashboard Chart) */}
        <TrendChartCard
          title={selectedMetricKey === 'waist_cm' || selectedMetricKey === 'weight_kg' ? 'Bodyweight & Waist Trend' : `${selectedMetricLabel} Trend`}
          activeMetricTab={selectedMetricKey}
          onMetricTabChange={(tabKey) => setSelectedMetricKey(tabKey)}
          metricTabs={metricTabs}
          timeRange={timeFilter}
          onTimeRangeChange={setTimeFilter}
          trendAnalysis={trendAnalysis}
          hoveredPoint={hoveredPoint}
          onHoverPoint={setHoveredPoint}
          showGoal={true}
        />

        {/* Symmetry Comparison */}
        <SymmetryCard items={symmetryItems} unit={unit} />
      </div>

      {/* 4. Bottom Section Grid: Checkpoint Comparison & History Log */}
      <div className={styles.bottomGrid}>
        <CheckpointComparisonCard
          dates={backendSummary?.dates || measurements.map((m) => m.date)}
          dateA={compareDateA}
          dateB={compareDateB}
          onDateAChange={setCompareDateA}
          onDateBChange={setCompareDateB}
          rows={checkpointData}
          unit={unit}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleSort}
        />

        <HistoryLogCard
          measurements={measurements}
          page={historyPage}
          itemsPerPage={itemsPerPage}
          onPageChange={setHistoryPage}
          onAddLog={handleOpenNewModal}
          onEditLog={handleOpenEditModal}
          onDeleteLog={(id) => setDeleteConfirmId(id)}
          unit={unit}
        />
      </div>

      {/* Log / Edit Measurement Modal */}
      <MeasurementModal
        isOpen={modalOpen}
        editingItem={editingItem}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          setModalOpen(false);
          loadData();
        }}
        unit={unit}
      />

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
