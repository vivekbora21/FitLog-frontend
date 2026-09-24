'use client';
import { useEffect, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { api } from '@/lib/api';
import { PlanSelectorModal } from '@/components/PlanSelectorModal';
import { WeeklyHealthStrip } from '@/components/WeeklyHealthStrip';
import { Button } from '@/components/ui/Button';
import styles from './review.module.css';

function addDays(iso: string, days: number) {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}
function fmtDate(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', timeZone: 'UTC' });
}
function weekRange(startDateIso: string, weekIndex: number, duration: number) {
  const dayStart = weekIndex * 7;
  const dayEnd = Math.min(dayStart + 6, duration - 1);
  return `${fmtDate(addDays(startDateIso, dayStart))} – ${fmtDate(addDays(startDateIso, dayEnd))}`;
}
function weekNote(weekIndex: number, totalWeeks: number, duration: number): [string, string] {
  const dayStart = weekIndex * 7 + 1;
  const dayEnd = Math.min(dayStart + 6, duration);
  const contains = (d: number) => d >= dayStart && d <= dayEnd;
  const quarterDay = Math.round(duration * 0.25);
  const halfDay = Math.round(duration * 0.5);
  const threeQuarterDay = Math.round(duration * 0.75);

  if (weekIndex === 0) {
    return ['Return-to-training week; focus on clean form and consistent logging.', 'Lock in daily logging habit and baseline adherence.'];
  }
  if (weekIndex === totalWeeks - 1) {
    return [`Final days; prepare Day ${duration} measurements and photos.`, 'Awaiting final days daily entries and concluding assessment.'];
  }
  if (contains(quarterDay)) {
    return [`Day ${quarterDay} photo checkpoint; calibrate early trajectory.`, `Awaiting Week ${weekIndex + 1} daily entries`];
  }
  if (contains(halfDay)) {
    return [`Day ${halfDay} halfway checkpoint; assess strength and fatigue.`, `Awaiting Week ${weekIndex + 1} daily entries`];
  }
  if (contains(threeQuarterDay)) {
    return [`Day ${threeQuarterDay} milestone checkpoint; progressive adaptation check.`, `Awaiting Week ${weekIndex + 1} daily entries`];
  }
  return ['Log daily and track the week against the corridor below.', `Awaiting Week ${weekIndex + 1} daily entries`];
}

type Tone = 'good' | 'warn' | 'bad' | 'neutral';

const TONE_CLASS: Record<Tone, string> = {
  good: styles.toneGood,
  warn: styles.toneWarn,
  bad: styles.toneBad,
  neutral: styles.toneNeutral,
};

const STATUS_TONE: Record<string, Tone> = {
  ON_TRACK: 'good',
  OPTIMAL: 'good',
  ADEQUATE: 'good',
  MAINTAINED: 'good',
  PROGRESSING: 'good',
  EXCELLENT: 'good',
  GOOD: 'good',
  CALIBRATING: 'neutral',
  STARTING: 'neutral',
  NEUTRAL: 'neutral',
  SLIGHTLY_SLOW: 'warn',
  DRIFTING: 'warn',
  TOO_FAST: 'warn',
  LAGGING: 'warn',
  FATIGUE_RISK: 'warn',
  STALLED: 'bad',
  LOSING_WEIGHT: 'bad',
  CRITICAL: 'bad',
  DEFICIT: 'bad',
};

function toneFor(status?: string | null): Tone {
  if (!status) return 'neutral';
  return STATUS_TONE[status] || 'neutral';
}

// Rules 1–2 mean "keep going"; Rules 3–5 ask for an adjustment.
const RULE_TONE: Record<string, Tone> = {
  'Rule 1': 'good',
  'Rule 1 / 2': 'good',
  'Rule 3': 'warn',
  'Rule 4': 'warn',
  'Rule 5': 'bad',
};

function labelFor(status?: string | null): string {
  if (!status) return 'Pending';
  return status.replace(/_/g, ' ');
}

export default function ReviewPage() {
  const [s, setS] = useState<any>(null);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);

  const loadData = () => {
    api.getDashboardStats().then(setS).catch(console.error);
  };

  useEffect(() => {
    loadData();
  }, []);

  const j = s?.journey || {};
  const nutrition = s?.nutrition || {};
  const pacing = s?.journey_pacing;
  const duration = pacing?.duration_days || j.program_length || 60;
  const currentDay = pacing?.current_day || j.program_day || 1;
  const totalWeeks = Math.ceil(duration / 7);

  const startWeight = pacing?.velocity?.start_weight ?? j.starting_weight;
  const startWaist = pacing?.starting_waist ?? j.starting_waist;
  const weeklyWorkoutsTarget = s?.weekly_workouts_target || j.weekly_workouts_target || 5;

  const hasProgram = pacing?.has_program && pacing?.start_date;
  const currentWeekIndex = Math.min(totalWeeks - 1, Math.floor(Math.max(0, currentDay - 1) / 7));

  const weeks = hasProgram
    ? Array.from({ length: totalWeeks }, (_, i) => {
        const [note, action] = weekNote(i, totalWeeks, duration);
        return [`Week ${i + 1}`, weekRange(pacing.start_date!, i, duration), note, action] as const;
      })
    : [];

  const pacingLabel = pacing?.pacing_status ? pacing.pacing_status.replace(/_/g, ' ') : 'Awaiting enough data';
  const insightText = pacing?.copilot_insight || 'Log daily weight, waist, training, nutrition, steps, and sleep. FitLog never changes calories or workouts automatically — all recommendations are advisory.';

  const pillars = pacing?.has_program
    ? [
        ['Weight velocity', pacing.velocity],
        ['Routine adherence', pacing.adherence],
        ['Strength / overload', pacing.strength],
        ['Systemic recovery', pacing.recovery],
      ].filter(([, data]) => data) as Array<[string, { status: string; message: string; [key: string]: any }]>
    : [];

  return (
    <div className={styles.page}>
      <header>
        <div className={styles.eyebrow}>
          AUTOMATED {duration}-DAY WEEKLY REVIEW &amp; ADAPTIVE DECISION PROTOCOL
        </div>
        <h1 className={styles.title}>Review the trend, then decide.</h1>
        <p className={styles.subtitle}>
          Baseline: {startWeight != null ? `${startWeight} kg` : '—'} • {startWaist != null ? `${startWaist} cm waist` : '—'} &nbsp;|&nbsp; Nutrition: ~{nutrition.calories_target ?? '—'} kcal • {nutrition.protein_target ?? '—'}g protein anchor &nbsp;|&nbsp; Training: {weeklyWorkoutsTarget} days core &nbsp;|&nbsp; Cardio: {j.cardio_target ?? '—'} min target. Advisory only — no automatic calorie or training changes.
        </p>
      </header>

      <section className={styles.statsGrid}>
        {[
          ['7-day avg weight', j.seven_day_average ? `${j.seven_day_average} kg` : '—'],
          ['Weekly weight change', j.weekly_weight_change == null ? '—' : `${j.weekly_weight_change} kg`],
          ['Current waist', j.current_waist ? `${j.current_waist} cm` : '—'],
        ].map(([l, v]) => (
          <div key={l} className={styles.statCard}>
            <small className={styles.statLabel}>{l}</small>
            <strong className={styles.statValue}>{v}</strong>
          </div>
        ))}
      </section>

      <WeeklyHealthStrip health={s?.weekly_health} title="This week" />

      <section className={styles.insightBox}>
        <small className={styles.insightLabel}>{pacingLabel.toUpperCase()}</small>
        <h2 className={styles.insightHeadline}>{insightText}</h2>
        <p className={styles.insightHint}>
          Use two consecutive weeks before considering a calorie or activity adjustment.
        </p>
      </section>

      <section>
        <h2 className={styles.sectionTitle}>Pacing breakdown — {pacing?.mode_label || 'Current mode'}</h2>
        {pillars.length > 0 ? (
          <div className={styles.pillarGrid}>
            {pillars.map(([name, data]) => (
              <div key={name} className={styles.pillarCard}>
                <div className={styles.pillarHeader}>
                  <strong className={styles.pillarName}>{name}</strong>
                  <span className={`${styles.pillarBadge} ${TONE_CLASS[toneFor(data.status)]}`}>{labelFor(data.status)}</span>
                </div>
                <span className={styles.pillarMessage}>{data.message}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.insightHint}>Start a journey to see your live velocity, adherence, strength, and recovery pacing here.</p>
        )}
        <p className={styles.footnote}>
          Every status above is computed live from your logged data by the same engine that produces the insight above — nothing here is a separate estimate. All recommendations are advisory guidance; no automatic or irreversible calorie/workout changes are ever made.
        </p>
      </section>

      <section>
        <div className={styles.timelineHeader}>
          <h2 className={styles.sectionTitle}>Workbook Weekly Review &amp; Decision Protocol</h2>
          {hasProgram && (
            <span className={styles.timelineMeta}>
              Day {currentDay} of {duration} (Week {currentWeekIndex + 1})
            </span>
          )}
        </div>

        {!hasProgram ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyText}>
              No active program timeline detected. Select or assign a journey plan to see your personalized weekly schedule.
            </p>
            <Button variant="primary" onClick={() => setIsPlanModalOpen(true)}>
              <SlidersHorizontal size={15} className={styles.btnIcon} />
              Select a Plan
            </Button>
          </div>
        ) : s?.weekly_review && s.weekly_review.length > 0 ? (
          <div className={styles.tableContainer}>
            <table className={styles.reviewTable}>
              <thead>
                <tr>
                  <th>Week</th>
                  <th>Date Range</th>
                  <th>Avg Weight</th>
                  <th>Avg Nutrition</th>
                  <th>Avg Steps</th>
                  <th>Avg Sleep</th>
                  <th>Cardio</th>
                  <th>Workout %</th>
                  <th>Waist</th>
                  <th>Strength</th>
                  <th>Energy &amp; Recovery Notes</th>
                  <th>Automated Recommendation</th>
                  <th>Rule Triggered</th>
                </tr>
              </thead>
              <tbody>
                {s.weekly_review.map((row: any) => {
                  const isCurrent = row.is_current || row.week_index === currentWeekIndex;
                  const hasWeight = row.avg_weight != null;
                  const isRule = row.rule_triggered?.startsWith('Rule');
                  const isAwaiting = row.action_recommendation?.startsWith('Awaiting');
                  return (
                    <tr key={row.week} className={isCurrent ? styles.reviewRowCurrent : ''}>
                      <td>
                        <div className={styles.weekLabelWrap}>
                          <strong>{row.week}</strong>
                          {isCurrent && <span className={styles.currentBadge}>Current</span>}
                        </div>
                      </td>
                      <td className={styles.weekRange}>{row.date_range}</td>
                      <td>
                        {hasWeight ? (
                          <>
                            <span className={styles.primaryVal}>{row.avg_weight} kg</span>
                            {row.weight_change != null && (
                              <span
                                className={`${styles.deltaSub} ${
                                  row.weight_change <= 0 ? styles.deltaGreen : styles.deltaAmber
                                }`}
                              >
                                {row.weight_change > 0 ? `+${row.weight_change}` : row.weight_change} kg
                              </span>
                            )}
                          </>
                        ) : (
                          <span className={styles.deltaMuted}>—</span>
                        )}
                      </td>
                      <td>
                        {row.avg_calories != null ? (
                          <span>
                            {row.avg_calories} kcal · {row.avg_protein || '—'}g prot
                          </span>
                        ) : (
                          <span className={styles.deltaMuted}>—</span>
                        )}
                      </td>
                      <td>
                        {row.avg_steps != null ? (
                          <span className={styles.primaryVal}>{row.avg_steps.toLocaleString()}</span>
                        ) : (
                          <span className={styles.deltaMuted}>—</span>
                        )}
                      </td>
                      <td>
                        {row.avg_sleep != null ? (
                          <span className={styles.primaryVal}>{row.avg_sleep}h</span>
                        ) : (
                          <span className={styles.deltaMuted}>—</span>
                        )}
                      </td>
                      <td>
                        {row.cardio_minutes > 0 ? (
                          <span>{row.cardio_minutes} min</span>
                        ) : (
                          <span className={styles.deltaMuted}>0 min</span>
                        )}
                      </td>
                      <td>
                        {row.workout_pct != null ? (
                          <span>{Math.round(row.workout_pct * 100)}%</span>
                        ) : (
                          <span className={styles.deltaMuted}>0%</span>
                        )}
                      </td>
                      <td>
                        {row.waist != null ? (
                          <>
                            <span className={styles.primaryVal}>{row.waist} cm</span>
                            {row.waist_change != null && (
                              <span
                                className={`${styles.deltaSub} ${
                                  row.waist_change <= 0 ? styles.deltaGreen : styles.deltaAmber
                                }`}
                              >
                                {row.waist_change > 0 ? `+${row.waist_change}` : row.waist_change} cm
                              </span>
                            )}
                          </>
                        ) : (
                          <span className={styles.deltaMuted}>—</span>
                        )}
                      </td>
                      <td>
                        <span className={`${styles.deltaSub} ${row.strength_trend === 'Declining' ? styles.deltaAmber : ''}`}>
                          {row.strength_trend}
                        </span>
                      </td>
                      <td className={styles.notesCell}>{row.energy_notes}</td>
                      <td className={styles.actionCell}>
                        <span className={isRule ? styles.actionRule : isAwaiting ? styles.actionWait : ''}>
                          {row.action_recommendation}
                        </span>
                        {row.personal_note && <span className={styles.personalNote}>{row.personal_note}</span>}
                      </td>
                      <td>
                        {row.rule_triggered && row.rule_triggered !== '—' ? (
                          <span className={`${styles.pillarBadge} ${TONE_CLASS[RULE_TONE[row.rule_triggered] || 'neutral']}`}>
                            {row.rule_triggered}
                          </span>
                        ) : (
                          <span className={styles.deltaMuted}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.timelineTable}>
            {weeks.map(([w, range, note, action], idx) => {
              const isCurrentWeek = idx === currentWeekIndex;
              return (
                <div key={w} className={`${styles.weekRow} ${isCurrentWeek ? styles.weekRowCurrent : ''}`}>
                  <div className={styles.weekLabelWrap}>
                    <strong>{w}</strong>
                    {isCurrentWeek && <span className={styles.currentBadge}>Current</span>}
                  </div>
                  <span className={styles.weekRange}>{range}</span>
                  <span className={styles.weekNote}>{note}</span>
                  <span className={styles.weekAction}>{action}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <PlanSelectorModal
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        onSuccess={() => loadData()}
      />
    </div>
  );
}
