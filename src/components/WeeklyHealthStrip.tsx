import type { WeeklyHealth, WeeklyHealthMetric, WeeklyHealthStatus } from '@/lib/types';
import styles from './WeeklyHealthStrip.module.css';

const STATUS_CLASS: Record<WeeklyHealthStatus, string> = {
  good: styles.good,
  warn: styles.warn,
  bad: styles.bad,
  pending: styles.pending,
};

// Totals for the week vs. per-day averages over logged days (see weekly_health.py).
const AVERAGED = new Set<WeeklyHealthMetric['key']>(['protein', 'calories', 'steps', 'sleep']);

const UNIT_SUFFIX: Record<string, string> = { sessions: '', g: ' g', kcal: ' kcal', steps: '', min: ' min', h: 'h' };

const num = (value: number) => value.toLocaleString();

function MetricCell({ metric }: { metric: WeeklyHealthMetric }) {
  const suffix = UNIT_SUFFIX[metric.unit] ?? ` ${metric.unit}`;
  const value = metric.actual == null
    ? '—'
    : metric.target != null
      ? `${num(metric.actual)} / ${num(metric.target)}${suffix}`
      : `${num(metric.actual)}${suffix}`;

  return (
    <div className={`${styles.cell} ${STATUS_CLASS[metric.status]}`}>
      <div className={styles.label}>
        <span className={styles.dot} aria-hidden />
        {metric.label}
        {AVERAGED.has(metric.key) && <span className={styles.basis}>daily avg</span>}
      </div>
      <div className={styles.value}>{value}</div>
      <div className={styles.status}>{metric.status_label}</div>
    </div>
  );
}

export function WeeklyHealthStrip({ health, title = 'Weekly health' }: { health?: WeeklyHealth | null; title?: string }) {
  if (!health) return null;
  return (
    <section className={styles.strip} aria-label={title}>
      <div className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        <span className={styles.window}>
          {health.window.label} · day {health.window.days_elapsed} of {health.window.days_in_week}
        </span>
      </div>
      <div className={styles.row}>
        {health.metrics.map((metric) => (
          <MetricCell key={metric.key} metric={metric} />
        ))}
      </div>
    </section>
  );
}
