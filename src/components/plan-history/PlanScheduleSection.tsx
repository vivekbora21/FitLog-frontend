'use client';

import React, { useState } from 'react';
import { Calendar, CheckCircle2, Flag, Play, Circle, ChevronDown, Clock, Dumbbell, Sparkles } from 'lucide-react';
import { JourneyDay } from '@/lib/types';
import styles from './planHistory.module.css';

interface PlanScheduleSectionProps {
  days: JourneyDay[];
  currentDay: number;
}

type FilterState = 'ALL' | 'COMPLETED' | 'MISSED' | 'TODAY' | 'UPCOMING';

export const PlanScheduleSection: React.FC<PlanScheduleSectionProps> = ({ days, currentDay }) => {
  const [filter, setFilter] = useState<FilterState>('ALL');
  const [expandedDay, setExpandedDay] = useState<number | null>(currentDay);

  const filteredDays = days.filter((d) => {
    if (filter === 'COMPLETED') return d.status === 'COMPLETED';
    if (filter === 'MISSED') return d.status === 'MISSED';
    if (filter === 'TODAY') return d.day_number === currentDay;
    if (filter === 'UPCOMING') return d.status === 'UPCOMING';
    return true;
  });

  const getStatusBadge = (day: JourneyDay) => {
    if (day.status === 'COMPLETED') {
      return (
        <span className={`${styles.dayStatusPill} ${styles.statusCompleted}`}>
          <CheckCircle2 size={12} /> Completed
        </span>
      );
    }
    if (day.status === 'MISSED') {
      return (
        <span className={`${styles.dayStatusPill} ${styles.statusMissed}`}>
          <Flag size={12} /> Missed
        </span>
      );
    }
    if (day.day_number === currentDay) {
      return (
        <span className={`${styles.dayStatusPill} ${styles.statusToday}`}>
          <Play size={12} /> Today
        </span>
      );
    }
    return (
      <span className={`${styles.dayStatusPill} ${styles.statusUpcoming}`}>
        <Circle size={12} /> Upcoming
      </span>
    );
  };

  return (
    <div className={styles.scheduleSection}>
      <div className={styles.scheduleHeaderRow}>
        <div className={styles.panelTitleWrap}>
          <div className={styles.metricIconBox}>
            <Calendar size={18} />
          </div>
          <div>
            <h2 className={styles.panelTitle}>Plan Schedule &amp; Completed Workouts</h2>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Day-by-day workout logs, session duration, and exercise performance
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className={styles.filterTabs}>
          {(['ALL', 'COMPLETED', 'MISSED', 'TODAY', 'UPCOMING'] as FilterState[]).map((f) => (
            <button
              key={f}
              type="button"
              className={`${styles.filterBtn} ${filter === f ? styles.filterBtnActive : ''}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.daysGrid}>
        {filteredDays.slice(0, 15).map((d) => {
          const isCurrent = d.day_number === currentDay;
          const isExpanded = expandedDay === d.day_number;
          const session = d.completed_session;

          return (
            <div
              key={d.day_number}
              className={`${styles.dayCard} ${isCurrent ? styles.dayCardCurrent : ''} ${
                d.status === 'COMPLETED' ? styles.dayCardCompleted : d.status === 'MISSED' ? styles.dayCardMissed : ''
              }`}
            >
              <div
                className={styles.dayCardTop}
                onClick={() => setExpandedDay(isExpanded ? null : d.day_number)}
                style={{ cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className={styles.dayNumTitle}>Day {d.day_number}</span>
                  {getStatusBadge(d)}
                </div>
                <ChevronDown
                  size={16}
                  style={{
                    transform: isExpanded ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s ease',
                    color: '#64748b',
                  }}
                />
              </div>

              <h4 className={styles.routineTitle}>
                {session?.title || d.label || (d.routine_details ? d.routine_details.name : 'Rest & Recovery Day')}
              </h4>

              {session ? (
                <div className={styles.dayMetaInfo}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} /> {Math.round(session.duration_seconds / 60)} min
                  </span>
                  <span>&bull;</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Dumbbell size={12} /> {session.total_volume_kg.toLocaleString()} kg
                  </span>
                  {session.overall_rpe && (
                    <>
                      <span>&bull;</span>
                      <span>RPE {session.overall_rpe}/10</span>
                    </>
                  )}
                </div>
              ) : (
                <div className={styles.dayMetaInfo}>
                  <span>Scheduled routine</span>
                </div>
              )}

              {/* Collapsible Details */}
              {isExpanded && session && session.exercises && (
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.5rem' }}>
                    Exercises Performed:
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {session.exercises.map((ex) => (
                      <div
                        key={ex.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '0.75rem',
                          padding: '3px 0',
                          borderBottom: '1px dashed #f1f5f9',
                        }}
                      >
                        <span style={{ fontWeight: 600, color: '#0f172a' }}>{ex.exercise_name}</span>
                        <span style={{ color: '#059669', fontWeight: 600 }}>
                          {ex.sets.map((s) => `${s.weight_kg}k×${s.reps}`).join(', ')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
