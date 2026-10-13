'use client';

import React from 'react';
import {
  Scale,
  CalendarCheck,
  SlidersHorizontal,
  Dumbbell,
  Info,
  MessageSquare,
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
  embedded = false,
}) => {
  if (!pacing || !pacing.has_program) {
    return (
      <div className={styles.card}>
        <div className={styles.emptyHeader}>
          <div>
            <div className={styles.inactivePill}>
              <Info size={13} /> No Active Plan
            </div>
            <h2 className={styles.planTitle}>Ready to begin a focused journey?</h2>
            <p className={styles.planSub}>
              Choose a goal-driven mode (Cut, Bulk, Focus, Recomp) to enable real-time right path tracking.
            </p>
          </div>
          {onOpenPlanSelector && (
            <button className={styles.adjustBtn} onClick={onOpenPlanSelector}>
              <SlidersHorizontal size={14} /> Select Plan &amp; Mode
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

  let statusClass = styles.tagOnTrack;
  let statusText = `On the Right Path · ${pacing.pacing_score}%`;

  if (isCalibrating) {
    statusClass = styles.tagCalibrating;
    statusText = `Calibrating · Day ${pacing.current_day} of 7`;
  } else if (status === 'PACING_ALERT') {
    statusClass = styles.tagAlert;
    statusText = `Pacing Alert · ${pacing.pacing_score}%`;
  } else if (status === 'OFF_TRACK') {
    statusClass = styles.tagOffTrack;
    statusText = `Off Track · ${pacing.pacing_score}%`;
  }

  const vel = pacing.velocity;
  const adh = pacing.adherence;
  const str = pacing.strength;
  const progressPct = Math.round(
    ((Math.max(1, pacing.current_day) - 1) / Math.max(pacing.duration_days, 1)) * 100
  );

  return (
    <div className={styles.card}>
      {/* Top Header */}
      <div className={styles.headerRow}>
        <div className={styles.headerInfo}>
          <div className={styles.metaRow}>
            {!embedded ? (
              <span className={styles.modeBadge}>
                <ModeIcon size={13} style={{ color: meta.color }} /> {meta.label}
              </span>
            ) : (
              <span className={styles.modeBadge}>Right Path Engine</span>
            )}
            <span className={`${styles.statusBadge} ${statusClass}`}>
              {statusText}
            </span>
          </div>

          {!embedded ? (
            <div className={styles.titleBlock}>
              <h2 className={styles.planTitle}>
                {pacing.program_name || `${pacing.duration_days}-Day Journey`}
              </h2>
              <div className={styles.progressContainer}>
                <span className={styles.planSub}>
                  Day {pacing.current_day} of {pacing.duration_days} · {progressPct}% Complete
                </span>
                <div className={styles.track}>
                  <div
                    className={styles.fill}
                    style={{ width: `${Math.min(100, Math.max(2, progressPct))}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <p className={styles.planSub}>
              Real-time calibration across biometrics, adherence, and load anchors for Day {pacing.current_day} of {pacing.duration_days}.
            </p>
          )}
        </div>

        <div className={styles.headerRight}>
          <div className={styles.scoreTile}>
            <div className={styles.scoreValueRow}>
              <span className={styles.scoreNumber}>{pacing.pacing_score}%</span>
              <span className={`${styles.scoreTag} ${statusClass}`}>
                {isCalibrating ? 'Calibrating' : status === 'ON_TRACK' ? 'Optimal' : 'Needs Focus'}
              </span>
            </div>
            <span className={styles.scoreLabel}>Journey Score</span>
          </div>

          {!embedded && onOpenPlanSelector && (
            <button className={styles.adjustBtn} onClick={onOpenPlanSelector} title="Switch mode or adjust duration">
              <SlidersHorizontal size={14} /> Adjust Plan
            </button>
          )}
        </div>
      </div>

      {/* Three Pillars Breakdown */}
      <div className={styles.pillarsGrid}>
        {/* Pillar 1: Weight Velocity */}
        <div className={styles.pillarCard}>
          <div className={styles.pillarHeader}>
            <span className={styles.pillarLabel}>
              <Scale size={13} className={styles.pillarIcon} /> Weight Velocity
            </span>
            <span className={`${styles.pillBadge} ${isCalibrating ? styles.pillSky : vel?.status === 'ON_TRACK' ? styles.pillEmerald : styles.pillAmber}`}>
              {isCalibrating ? 'Calibrating' : (vel?.status?.replace('_', ' ') || 'On Track')}
            </span>
          </div>

          <div className={styles.pillarMain}>
            <span className={styles.pillarValue}>
              {vel?.rolling_7_avg ? `${vel.rolling_7_avg} kg` : '--'}
            </span>
            {vel?.target_today && !isCalibrating && (
              <span className={styles.targetSubtext}>Target: {vel.target_today}kg</span>
            )}
          </div>

          <p className={styles.pillarDetail}>
            {vel?.message || 'Daily weigh-ins track trajectory against predicted velocity.'}
          </p>
        </div>

        {/* Pillar 2: Routine Adherence */}
        <div className={styles.pillarCard}>
          <div className={styles.pillarHeader}>
            <span className={styles.pillarLabel}>
              <CalendarCheck size={13} className={styles.pillarIcon} /> Workout Adherence
            </span>
            <span className={`${styles.pillBadge} ${adh?.adherence_pct && adh.adherence_pct >= 85 ? styles.pillEmerald : styles.pillAmber}`}>
              {adh?.adherence_pct ?? 100}%
            </span>
          </div>

          <div className={styles.pillarMain}>
            <span className={styles.pillarValue}>
              {adh?.completed_sessions ?? 0} / {adh?.scheduled_sessions ?? 0}
            </span>
            <span className={styles.targetSubtext}>Sessions</span>
          </div>

          <div className={styles.microTrack}>
            <div
              className={styles.microFill}
              style={{ width: `${Math.min(100, adh?.adherence_pct ?? 100)}%` }}
            />
          </div>

          <p className={styles.pillarDetail}>
            {adh?.message || 'Adherence tracks completed sessions up to current day.'}
          </p>
        </div>

        {/* Pillar 3: Strength Index */}
        <div className={styles.pillarCard}>
          <div className={styles.pillarHeader}>
            <span className={styles.pillarLabel}>
              <Dumbbell size={13} className={styles.pillarIcon} /> Strength Index
            </span>
            <span className={`${styles.pillBadge} ${str?.status === 'PROGRESSING' || str?.status === 'MAINTAINED' ? styles.pillEmerald : styles.pillSlate}`}>
              {str?.status?.replace('_', ' ') || 'Stable'}
            </span>
          </div>

          <div className={styles.pillarMain}>
            <span className={styles.pillarValue}>
              {str?.tracked_lifts && str.tracked_lifts.length > 0 ? (
                `${str.tracked_lifts[0].exercise}: ${str.tracked_lifts[0].estimated_1rm}kg`
              ) : (
                'Anchors Locked'
              )}
            </span>
          </div>

          <p className={styles.pillarDetail}>
            {str?.message || 'Monitors 1RM compound progression and strength preservation.'}
          </p>
        </div>
      </div>

      {/* Strategic Coach Insight */}
      {pacing.copilot_insight && (
        <div className={styles.coachCard}>
          <div className={styles.coachHeader}>
            <MessageSquare size={14} className={styles.coachIcon} />
            <span className={styles.coachTitle}>Coach Strategy Note</span>
          </div>
          <p className={styles.coachText}>{pacing.copilot_insight}</p>
        </div>
      )}
    </div>
  );
};
