'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Dumbbell, Plus, Calendar, Clock, ChevronDown, ChevronUp, Flame, Play } from 'lucide-react';
import { api } from '@/lib/api';
import { WorkoutSession } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import styles from './workouts.module.css';

export default function WorkoutHistoryPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getWorkouts()
      .then((data) => {
        setSessions(data.results || data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedSessionId(expandedSessionId === id ? null : id);
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Workout History</h1>
          <p className={styles.subtitle}>
            Comprehensive log of all completed training sessions and progressive overload.
          </p>
        </div>

        <Button variant="primary" onClick={() => router.push('/app/workouts/active')}>
          <Play size={16} fill="#080B11" />
          <span>Start Empty Workout</span>
        </Button>
      </div>

      {/* Sessions List */}
      {loading ? (
        <div className={styles.loading}>Loading workout history...</div>
      ) : sessions.length === 0 ? (
        <Card className={styles.emptyCard}>
          <Dumbbell size={40} className={styles.emptyIcon} />
          <h3 className={styles.emptyTitle}>No workouts recorded yet</h3>
          <p className={styles.emptyDesc}>
            Start logging your workouts to build your lifetime training history.
          </p>
          <Button variant="primary" onClick={() => router.push('/app/workouts/active')}>
            Start Workout Now
          </Button>
        </Card>
      ) : (
        <div className={styles.sessionList}>
          {sessions.map((session) => {
            const isExpanded = expandedSessionId === session.id;
            return (
              <Card key={session.id} hoverable>
                {/* Header Row */}
                <div
                  onClick={() => toggleExpand(session.id)}
                  className={styles.sessionHeader}
                >
                  <div>
                    <div className={styles.titleRow}>
                      <h3 className={styles.sessionTitle}>{session.title}</h3>
                      {session.assigned_workout && <Badge variant="amber">Assigned Workout</Badge>}
                      {session.gym_name && <Badge variant="cyan">{session.gym_name}</Badge>}
                    </div>

                    <div className={styles.metaRow}>
                      <span className={styles.metaItem}>
                        <Calendar size={14} />
                        {new Date(session.started_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <span className={styles.metaSeparator}>•</span>
                      <span className={styles.metaItem}>
                        <Clock size={14} />
                        {Math.round(session.duration_seconds / 60)} mins
                      </span>
                      {session.overall_rpe && (
                        <>
                          <span className={styles.metaSeparator}>•</span>
                          <span>RPE {session.overall_rpe}/10</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className={styles.volumeSection}>
                    <div className={styles.volumeTextWrap}>
                      <div className={styles.volumeValue}>
                        {session.total_volume_kg.toLocaleString()} kg
                      </div>
                      <div className={styles.volumeLabel}>Total Volume</div>
                    </div>

                    <button
                      type="button"
                      className={styles.expandBtn}
                      aria-label={isExpanded ? 'Collapse session' : 'Expand session'}
                    >
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                  </div>
                </div>

                {/* Session Notes if any */}
                {session.notes && (
                  <p className={styles.sessionNotes}>
                    &ldquo;{session.notes}&rdquo;
                  </p>
                )}

                {/* Expanded Details: Exercises and Sets */}
                {isExpanded && session.exercises && session.exercises.length > 0 && (
                  <div className={styles.expandedSection}>
                    {session.exercises.map((we, idx) => (
                      <div key={idx} className={styles.exerciseBlock}>
                        <div className={styles.exerciseBlockHeader}>
                          <span className={styles.exerciseName}>
                            #{we.order} {we.exercise_name}
                          </span>
                          <Badge variant="emerald">{we.primary_muscle}</Badge>
                        </div>

                        <div className={styles.setsRow}>
                          {we.sets.map((s, sIdx) => (
                            <div key={sIdx} className={styles.setChip}>
                              <span className={styles.setNum}>#{s.set_number}</span>
                              <strong className={styles.setWeight}>{s.weight_kg}kg</strong> × {s.reps}
                              {s.set_type !== 'NORMAL' && (
                                <span className={styles.setTypeTag}>({s.set_type})</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
