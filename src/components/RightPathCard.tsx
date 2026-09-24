'use client';

import React from 'react';
import {
  Scale,
  CalendarCheck,
  Sparkles,
  SlidersHorizontal,
  Dumbbell,
  TrendingDown,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { JourneyPacingData, JourneyMode } from '@/lib/types';
import { getModeMeta } from '@/lib/journeyModes';
import styles from './RightPathCard.module.css';

interface RightPathCardProps {
  pacing: JourneyPacingData | null;
  onOpenPlanSelector?: () => void;
  compact?: boolean;
  embedded?: boolean;
}

export const RightPathCard: React.FC<RightPathCardProps> = ({
  pacing,
  onOpenPlanSelector,
  compact = false,
  embedded = false,
}) => {
  if (!pacing || !pacing.has_program) {
    return (
      <div className={`${styles.card} ${styles.cardAlert}`}>
        <div className={styles.headerRow}>
          <div>
            <div className={`${styles.statusPill} ${styles.statusPillInactive}`}>
              <Info size={14} /> NO ACTIVE PLAN
            </div>
            <h2 className={styles.planTitle}>Ready to begin a focused journey?</h2>
            <p className={styles.planSub}>
              Choose a goal-driven mode (Cut, Bulk, Focus, Recomp) to enable real-time right path tracking.
            </p>
          </div>
          {onOpenPlanSelector && (
            <button className={styles.switchBtn} onClick={onOpenPlanSelector}>
              <SlidersHorizontal size={14} /> Select Plan & Mode
            </button>
          )}
        </div>
      </div>
    );
  }

  const mode = (pacing.mode || 'CUT') as JourneyMode;
  const meta = getModeMeta(mode);
  const ModeIcon = meta.icon;

  const isCalibrating = pacing.is_calibrating;
  const status = pacing.pacing_status;

  let statusClass = styles.statusOnTrack;
  let pulseClass = styles.pulseOnTrack;
  let cardBorderClass = styles.cardOnTrack;
  let glowClass = styles.glowOnTrack;
  let statusText = `ON THE RIGHT PATH (${pacing.pacing_score}%)`;

  if (isCalibrating) {
    statusClass = styles.statusCalibrating;
    pulseClass = styles.pulseCalibrating;
    cardBorderClass = styles.cardCalibrating;
    glowClass = styles.glowCalibrating;
    statusText = `CALIBRATING (DAY ${pacing.current_day} OF 7)`;
  } else if (status === 'PACING_ALERT') {
    statusClass = styles.statusAlert;
    pulseClass = styles.pulseAlert;
    cardBorderClass = styles.cardAlert;
    glowClass = styles.glowAlert;
    statusText = `PACING ALERT (${pacing.pacing_score}%)`;
  } else if (status === 'OFF_TRACK') {
    statusClass = styles.statusOffTrack;
    pulseClass = styles.pulseOffTrack;
    cardBorderClass = styles.cardOffTrack;
    glowClass = styles.glowOffTrack;
    statusText = `OFF TRACK (${pacing.pacing_score}%)`;
  }

  const vel = pacing.velocity;
  const adh = pacing.adherence;
  const str = pacing.strength;

  return (
    <div className={`${styles.card} ${cardBorderClass}`}>
      <div className={`${styles.glowBlob} ${glowClass}`} />

      {/* Top Header */}
      <div className={styles.headerRow}>
        <div>
          <div className={styles.badgeStack}>
            {!embedded ? (
              <span className={styles.modeBadge} style={{ color: meta.color }}>
                <ModeIcon size={14} /> {meta.label}
              </span>
            ) : (
              <span className={styles.engineLabel}>
                <Sparkles size={14} /> Right Path Engine
              </span>
            )}
            <span className={`${styles.statusPill} ${statusClass}`}>
              <span className={`${styles.pulseDot} ${pulseClass}`} />
              {statusText}
            </span>
          </div>

          {!embedded ? (
            <>
              <h2 className={styles.planTitle}>{pacing.program_name || `${pacing.duration_days}-Day Journey`}</h2>
              <p className={styles.planSub}>
                Day {pacing.current_day} of {pacing.duration_days} · {Math.round(((pacing.current_day - 1) / Math.max(pacing.duration_days, 1)) * 100)}% Journey Progress
              </p>
            </>
          ) : (
            <p className={styles.planSubEmbedded}>
              Real-time calibration across biometrics, adherence, and load anchors for Day {pacing.current_day} of {pacing.duration_days}.
            </p>
          )}
        </div>

        <div className={styles.rightActions}>
          <div className={styles.scoreBox}>
            <div className={`${styles.scoreNum} ${
              status === 'ON_TRACK'
                ? styles.scoreNumOnTrack
                : status === 'PACING_ALERT'
                ? styles.scoreNumAlert
                : styles.scoreNumOffTrack
            }`}>
              {pacing.pacing_score}%
            </div>
            <div className={styles.scoreLabel}>Path Score</div>
          </div>

          {!embedded && onOpenPlanSelector && (
            <button className={styles.switchBtn} onClick={onOpenPlanSelector} title="Switch mode or adjust duration">
              <SlidersHorizontal size={14} /> Adjust Plan
            </button>
          )}
        </div>
      </div>

      {/* Three Pillars Breakdown */}
      <div className={styles.pillarsGrid}>
        {/* Pillar 1: Weight Velocity */}
        <div className={styles.pillarCard}>
          <div className={styles.pillarTop}>
            <span className={styles.pillarLabel}>
              <Scale size={14} /> Weight Velocity
            </span>
            <span
              className={`${styles.pillarBadge} ${
                isCalibrating
                  ? styles.badgeSky
                  : vel?.status === 'ON_TRACK'
                  ? styles.badgeEmerald
                  : styles.badgeAmber
              }`}
            >
              {isCalibrating ? 'Calibrating' : (vel?.status?.replace('_', ' ') || 'On Track')}
            </span>
          </div>

          <div className={styles.pillarValue}>
            {vel?.rolling_7_avg ? `${vel.rolling_7_avg} kg` : '--'}
            {vel?.target_today && !isCalibrating && (
              <small className={styles.targetSubtext}>
                (Target: {vel.target_today}kg)
              </small>
            )}
          </div>

          <div className={styles.pillarDetail}>
            {vel?.message || 'Daily weigh-ins track trajectory against predicted velocity.'}
          </div>
        </div>

        {/* Pillar 2: Routine Adherence */}
        <div className={styles.pillarCard}>
          <div className={styles.pillarTop}>
            <span className={styles.pillarLabel}>
              <CalendarCheck size={14} /> Workout Adherence
            </span>
            <span
              className={`${styles.pillarBadge} ${
                adh?.adherence_pct && adh.adherence_pct >= 85 ? styles.badgeEmerald : styles.badgeAmber
              }`}
            >
              {adh?.adherence_pct ?? 100}%
            </span>
          </div>

          <div className={styles.pillarValue}>
            {adh?.completed_sessions ?? 0} / {adh?.scheduled_sessions ?? 0} Sessions
          </div>

          <div className={styles.progressBarTrack}>
            <div
              className={`${styles.progressBarFill} ${
                adh?.adherence_pct && adh.adherence_pct >= 85 ? styles.barEmerald : styles.barAmber
              }`}
              style={{
                width: `${Math.min(100, adh?.adherence_pct ?? 100)}%`,
              }}
            />
          </div>

          <div className={styles.pillarDetail}>
            {adh?.message || 'Adherence tracks completed sessions up to current day.'}
          </div>
        </div>

        {/* Pillar 3: Strength Index */}
        <div className={styles.pillarCard}>
          <div className={styles.pillarTop}>
            <span className={styles.pillarLabel}>
              <Dumbbell size={14} /> Strength Index
            </span>
            <span
              className={`${styles.pillarBadge} ${
                str?.status === 'PROGRESSING' || str?.status === 'MAINTAINED' ? styles.badgeEmerald : styles.badgeSlate
              }`}
            >
              {str?.status?.replace('_', ' ') || 'Stable'}
            </span>
          </div>

          <div className={styles.pillarValue}>
            {str?.tracked_lifts && str.tracked_lifts.length > 0 ? (
              <span>{str.tracked_lifts[0].exercise}: {str.tracked_lifts[0].estimated_1rm}kg</span>
            ) : (
              <span>Anchors Locked</span>
            )}
          </div>

          <div className={styles.pillarDetail}>
            {str?.message || 'Monitors 1RM compound progression and strength preservation.'}
          </div>
        </div>
      </div>

      {/* Dynamic Copilot Insight */}
      <div className={styles.copilotBox}>
        <div className={styles.copilotIconCol}>
          <Sparkles size={18} />
        </div>
        <div className={styles.copilotContent}>
          <div className={styles.copilotTitle}>Copilot Strategic Recommendation</div>
          <div className={styles.copilotText}>{pacing.copilot_insight}</div>
        </div>
      </div>
    </div>
  );
};
