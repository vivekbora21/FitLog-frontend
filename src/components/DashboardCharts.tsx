'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Scale, Dumbbell, Flame, TrendingDown, TrendingUp, Target, ArrowRight, Ruler, Zap, ListChecks, Percent } from 'lucide-react';
import { MetricChart, DataPoint } from './MetricChart';
import { Card } from './ui/Card';
import styles from './DashboardCharts.module.css';

type Tone = 'slate' | 'emerald' | 'cyan' | 'amber';

function StatTile({
  icon: Icon,
  tone,
  label,
  value,
  unit,
  trend,
}: {
  icon: typeof Scale;
  tone: Tone;
  label: string;
  value: React.ReactNode;
  unit?: string;
  trend?: 'up' | 'down';
}) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : null;
  return (
    <Card hoverable className={styles.statTile}>
      <div className={`${styles.statIcon} ${styles[tone]}`}>
        <Icon size={17} />
      </div>
      <div className={styles.statBody}>
        <div className={styles.statLabel}>{label}</div>
        <div className={`${styles.statValue} ${styles[tone]}`}>
          {TrendIcon && <TrendIcon size={14} />}
          {value} {unit && <span className={styles.statUnit}>{unit}</span>}
        </div>
      </div>
    </Card>
  );
}

export interface WeightTrendPoint {
  date: string;
  label: string;
  weight_kg: number;
  waist_cm?: number | null;
}

export interface VolumeTrendPoint {
  date: string;
  label: string;
  title: string;
  volume_kg: number;
}

export interface NutritionTrendPoint {
  date: string;
  label: string;
  calories: number;
  calories_target: number;
  protein: number;
  protein_target: number;
}

export interface DashboardTrends {
  weight?: WeightTrendPoint[];
  volume?: VolumeTrendPoint[];
  nutrition?: NutritionTrendPoint[];
}

interface DashboardChartsProps {
  trends?: DashboardTrends;
  targetWeight?: number;
  dailyCaloriesTarget?: number;
  programDuration?: number;
  modeLabel?: string;
}

export function DashboardCharts({
  trends,
  targetWeight = 74.0,
  dailyCaloriesTarget,
  programDuration = 60,
  modeLabel = 'Goal',
}: DashboardChartsProps) {
  const [activeTab, setActiveTab] = useState<'weight' | 'volume' | 'nutrition'>('weight');

  const weightPoints = trends?.weight || [];
  const volumePoints = trends?.volume || [];
  const nutritionPoints = trends?.nutrition || [];

  // Weight metrics calculations
  const weightMetrics = useMemo(() => {
    if (!weightPoints.length) return null;
    const latest = weightPoints[weightPoints.length - 1];
    const initial = weightPoints[0];
    const netChange = (latest.weight_kg - initial.weight_kg).toFixed(2);
    const toGoal = (latest.weight_kg - targetWeight).toFixed(1);
    const latestWaist = [...weightPoints].reverse().find((p) => p.waist_cm !== undefined && p.waist_cm !== null)?.waist_cm;

    return {
      current: latest.weight_kg,
      initial: initial.weight_kg,
      netChange: Number(netChange),
      toGoal: Number(toGoal),
      latestWaist,
    };
  }, [weightPoints, targetWeight]);

  // Volume metrics calculations
  const volumeMetrics = useMemo(() => {
    if (!volumePoints.length) return null;
    const totalVolume = volumePoints.reduce((acc, p) => acc + p.volume_kg, 0);
    const avgVolume = Math.round(totalVolume / volumePoints.length);
    const maxVolume = Math.max(...volumePoints.map((p) => p.volume_kg));
    const latest = volumePoints[volumePoints.length - 1];

    return {
      latest: latest.volume_kg,
      avg: avgVolume,
      max: maxVolume,
      sessionsCount: volumePoints.length,
      total: totalVolume,
    };
  }, [volumePoints]);

  // Nutrition metrics calculations
  const nutritionMetrics = useMemo(() => {
    if (!nutritionPoints.length) return null;
    const loggedDays = nutritionPoints.filter((p) => p.calories > 0);
    const avgCalories = loggedDays.length
      ? Math.round(loggedDays.reduce((acc, p) => acc + p.calories, 0) / loggedDays.length)
      : 0;
    const latest = nutritionPoints[nutritionPoints.length - 1];

    return {
      latestCalories: latest.calories,
      latestProtein: latest.protein,
      avgCalories,
      targetCalories: dailyCaloriesTarget,
    };
  }, [nutritionPoints, dailyCaloriesTarget]);

  // Formatted chart series
  const weightChartData: DataPoint[] = useMemo(() => {
    return weightPoints.map((p) => ({
      label: p.label,
      value: p.weight_kg,
      sublabel: p.waist_cm ? `Waist: ${p.waist_cm} cm` : undefined,
    }));
  }, [weightPoints]);

  const volumeChartData: DataPoint[] = useMemo(() => {
    return volumePoints.map((p) => ({
      label: p.label,
      value: p.volume_kg,
      sublabel: p.title,
    }));
  }, [volumePoints]);

  const nutritionChartData: DataPoint[] = useMemo(() => {
    return nutritionPoints.map((p) => ({
      label: p.label,
      value: p.calories,
      sublabel: p.protein ? `Protein: ${p.protein}g` : undefined,
    }));
  }, [nutritionPoints]);

  return (
    <Card className={styles.card}>
      {/* Top Header & Tab Controls */}
      <div className={styles.header}>
        <div>
          <div className={styles.headerEyebrow}>Analytics & Progression</div>
          <h2 className={styles.headerTitle}>Performance Trends</h2>
        </div>

        {/* View Switcher Tabs */}
        <div className={styles.tabList}>
          <button
            type="button"
            onClick={() => setActiveTab('weight')}
            className={`${styles.tab} ${activeTab === 'weight' ? `${styles.tabActive} ${styles.emerald}` : ''}`}
          >
            <Scale size={14} />
            <span>Weight & Waist</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('volume')}
            className={`${styles.tab} ${activeTab === 'volume' ? `${styles.tabActive} ${styles.cyan}` : ''}`}
          >
            <Dumbbell size={14} />
            <span>Workout Volume</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('nutrition')}
            className={`${styles.tab} ${activeTab === 'nutrition' ? `${styles.tabActive} ${styles.amber}` : ''}`}
          >
            <Flame size={14} />
            <span>Calorie Intake</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Badges Row */}
      {activeTab === 'weight' && weightMetrics && (
        <div className={styles.summaryGrid}>
          <StatTile icon={Scale} tone="slate" label="Current Weight" value={weightMetrics.current} unit="kg" />
          <StatTile
            icon={weightMetrics.netChange <= 0 ? TrendingDown : TrendingUp}
            tone={weightMetrics.netChange <= 0 ? 'emerald' : 'amber'}
            label="Net Change"
            value={weightMetrics.netChange > 0 ? `+${weightMetrics.netChange}` : weightMetrics.netChange}
            unit="kg"
            trend={weightMetrics.netChange <= 0 ? 'down' : 'up'}
          />
          <StatTile icon={Target} tone="emerald" label={`${programDuration}-Day Goal`} value={targetWeight} unit="kg" />
          <StatTile icon={Ruler} tone="cyan" label="Current Waist" value={weightMetrics.latestWaist ? weightMetrics.latestWaist : '--'} unit={weightMetrics.latestWaist ? 'cm' : undefined} />
        </div>
      )}

      {activeTab === 'volume' && volumeMetrics && (
        <div className={styles.summaryGrid}>
          <StatTile icon={Zap} tone="cyan" label="Latest Session" value={volumeMetrics.latest.toLocaleString()} unit="kg" />
          <StatTile icon={Dumbbell} tone="slate" label="Avg / Session" value={volumeMetrics.avg.toLocaleString()} unit="kg" />
          <StatTile icon={ListChecks} tone="emerald" label="Sessions Tracked" value={volumeMetrics.sessionsCount} unit="workouts" />
          <StatTile icon={TrendingUp} tone="emerald" label="Total Volume" value={Math.round(volumeMetrics.total).toLocaleString()} unit="kg" trend="up" />
        </div>
      )}

      {activeTab === 'nutrition' && nutritionMetrics && (
        <div className={styles.summaryGrid}>
          <StatTile icon={Target} tone="amber" label="Daily Target" value={nutritionMetrics.targetCalories} unit="kcal" />
          <StatTile icon={Flame} tone="slate" label="Latest Intake" value={nutritionMetrics.latestCalories} unit="kcal" />
          <StatTile icon={Dumbbell} tone="emerald" label="Latest Protein" value={nutritionMetrics.latestProtein} unit="g" />
          <StatTile icon={Percent} tone="emerald" label="7-Day Avg" value={nutritionMetrics.avgCalories.toLocaleString()} unit="kcal" />
        </div>
      )}

      {/* Main Chart Canvas */}
      <div className={styles.chartArea}>
        {activeTab === 'weight' && (
          weightChartData.length > 0 ? (
            <MetricChart
              data={weightChartData}
              title="Bodyweight Progression Trend"
              subtitle={`Daily scale weight logged fasted vs ${programDuration}-day goal trajectory`}
              unit="kg"
              type="line"
              color="#059669"
              height={220}
              targetValue={targetWeight}
              targetLabel={`${programDuration}-Day Goal`}
              targetColor="#0284C7"
            />
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyStateText}>No weight logs found yet.</div>
              <Link href="/app/daily" className={`${styles.emptyStateLink} ${styles.emerald}`}>
                Log Morning Weight <ArrowRight size={14} />
              </Link>
            </div>
          )
        )}

        {activeTab === 'volume' && (
          volumeChartData.length > 0 ? (
            <MetricChart
              data={volumeChartData}
              title="Training Volume Progression (kg)"
              subtitle="Total tonnage lifted per session across completed workouts"
              unit="kg"
              type="bar"
              color="#0284C7"
              height={220}
              targetValue={volumeMetrics ? volumeMetrics.avg : undefined}
              targetLabel="Avg Volume"
              targetColor="#D97706"
            />
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyStateText}>No workout sessions completed yet.</div>
              <Link href="/app/workouts/active" className={`${styles.emptyStateLink} ${styles.cyan}`}>
                Start Workout Session <ArrowRight size={14} />
              </Link>
            </div>
          )
        )}

        {activeTab === 'nutrition' && (
          nutritionChartData.length > 0 ? (
            <MetricChart
              data={nutritionChartData}
              title="Daily Caloric Intake vs Target"
              subtitle={dailyCaloriesTarget ? `Daily calories consumed vs ${dailyCaloriesTarget.toLocaleString()} kcal target` : 'Daily calories consumed'}
              unit="kcal"
              type="bar"
              color="#D97706"
              height={220}
              targetValue={dailyCaloriesTarget}
              targetLabel="Target"
              targetColor="#059669"
            />
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyStateText}>No nutrition logs recorded this week.</div>
              <Link href="/app/daily" className={`${styles.emptyStateLink} ${styles.amber}`}>
                Log Today&apos;s Meals <ArrowRight size={14} />
              </Link>
            </div>
          )
        )}
      </div>
    </Card>
  );
}
