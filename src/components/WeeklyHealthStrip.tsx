import React from 'react';
import {
  Dumbbell,
  Target,
  Flame,
  Footprints,
  Activity,
  Moon,
  Calendar,
} from 'lucide-react';
import type { WeeklyHealth, WeeklyHealthMetric, WeeklyHealthStatus } from '@/lib/types';
import styles from './WeeklyHealthStrip.module.css';

const STATUS_CLASS: Record<WeeklyHealthStatus, string> = {
  good: styles.good,
  warn: styles.warn,
  bad: styles.bad,
  pending: styles.pending,
};

const METRIC_ICONS: Record<WeeklyHealthMetric['key'], React.ComponentType<{ size?: number; className?: string }>> = {
  workouts: Dumbbell,
  protein: Target,
  calories: Flame,
  steps: Footprints,
  cardio: Activity,
  sleep: Moon,
};

// Totals for the week vs. per-day averages over logged days (see weekly_health.py).
const AVERAGED = new Set<WeeklyHealthMetric['key']>(['protein', 'calories', 'steps', 'sleep']);

const UNIT_SUFFIX: Record<string, string> = { sessions: '', g: ' g', kcal: ' kcal', steps: '', min: ' min', h: 'h' };

const num = (value: number) => value.toLocaleString();

function MetricCell({ metric }: { metric: WeeklyHealthMetric }) {
  const Icon = METRIC_ICONS[metric.key] || Dumbbell;
  const suffix = UNIT_SUFFIX[metric.unit] ?? ` ${metric.unit}`;
  const value = metric.actual == null
    ? '—'
    : metric.target != null
      ? `${num(metric.actual)} / ${num(metric.target)}${suffix}`
      : `${num(metric.actual)}${suffix}`;

  return (
    <div className={`${styles.cell} ${STATUS_CLASS[metric.status]}`}>
      <div className={styles.cellHeader}>
        <div className={styles.labelGroup}>
          <span className={styles.iconWrap}>
            <Icon size={14} />
          </span>
          <span className={styles.label}>{metric.label}</span>
        </div>
        {AVERAGED.has(metric.key) && <span className={styles.basis}>daily avg</span>}
      </div>

      <div className={styles.valueRow}>
        <span className={styles.value}>{value}</span>
      </div>

      <div className={styles.statusPill}>
        <span className={styles.dot} aria-hidden />
        <span className={styles.statusText}>{metric.status_label}</span>
      </div>
    </div>
  );
}

export function WeeklyHealthStrip({ health, title = 'Weekly Health & Consistency' }: { health?: WeeklyHealth | null; title?: string }) {
  if (!health) return null;
  return (
    <section className={styles.strip} aria-label={title}>
      <div className={styles.header}>
        <div className={styles.titleWrap}>
          <h2 className={styles.title}>{title}</h2>
          <span className={styles.subtitle}>7-Day Adherence &amp; Biomarkers</span>
        </div>
        <div className={styles.windowBadge}>
          <Calendar size={13} />
          <span>{health.window.label} · Day {health.window.days_elapsed} of {health.window.days_in_week}</span>
        </div>
      </div>
      <div className={styles.row}>
        {health.metrics.map((metric) => (
          <MetricCell key={metric.key} metric={metric} />
        ))}
      </div>
    </section>
  );
}
