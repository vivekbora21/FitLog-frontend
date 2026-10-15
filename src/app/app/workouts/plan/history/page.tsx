'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { CalendarDays, SlidersHorizontal, ChevronRight, History, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { JourneyHistoryEntry, JourneyDetail } from '@/lib/types';
import { getModeMeta } from '@/lib/journeyModes';
import { PlanSelectorModal } from '@/components/PlanSelectorModal';
import { PlanProgressDashboard } from '@/components/plan-history';
import styles from './history.module.css';

export default function PlanHistoryPage() {
  const [journeys, setJourneys] = useState<JourneyHistoryEntry[]>([]);
  const [activeDetail, setActiveDetail] = useState<JourneyDetail | null>(null);
  const [selectedJourneyId, setSelectedJourneyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showArchive, setShowArchive] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getJourneyHistory();
      const list: JourneyHistoryEntry[] = res.journeys || [];
      setJourneys(list);

      const active = list.find((j) => j.active) || list[0];
      const targetId = selectedJourneyId || active?.id;

      if (targetId) {
        setSelectedJourneyId(targetId);
        const detail = await api.getJourneyDetail(targetId);
        setActiveDetail(detail);
      }
    } catch (err) {
      console.error('Failed to load plan history', err);
    } finally {
      setLoading(false);
    }
  }, [selectedJourneyId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSelectJourney = async (id: string) => {
    setSelectedJourneyId(id);
    try {
      const detail = await api.getJourneyDetail(id);
      setActiveDetail(detail);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error(err);
    }
  };

  if (loading && !activeDetail) {
    return <div className={styles.loading}>Loading plan history &amp; progress...</div>;
  }

  return (
    <div className={styles.page}>
      {journeys.length === 0 ? (
        <div className={styles.emptyState}>
          <CalendarDays size={28} color="var(--text-muted)" />
          <div>
            <strong>No journeys yet.</strong>
            <p className={styles.emptyPrompt}>Start your first plan to begin tracking history and progress here.</p>
          </div>
          <button type="button" className={styles.startBtn} onClick={() => setIsModalOpen(true)}>
            <SlidersHorizontal size={15} /> Select a Plan
          </button>
        </div>
      ) : activeDetail ? (
        <>
          {/* Main Plan Progress Dashboard (Image 1 replica) */}
          <PlanProgressDashboard
            data={activeDetail}
            onRefresh={load}
          />

          {/* Other / Archived Journeys Section */}
          {journeys.length > 1 && (
            <div style={{ marginTop: '2rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    All Journeys &amp; Plan Archive
                  </h3>
                  <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: '4px 0 0' }}>
                    Switch between active and past training plans
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowArchive(!showArchive)}
                  className={styles.startBtn}
                >
                  <History size={14} />
                  <span>{showArchive ? 'Hide Archive' : `View All (${journeys.length})`}</span>
                </button>
              </div>

              {showArchive && (
                <div className={styles.grid}>
                  {journeys.map((j) => {
                    const meta = getModeMeta(j.mode);
                    const Icon = meta.icon;
                    const isCurrent = j.id === activeDetail.program.id;
                    const pct = Math.min(100, Math.round((j.completed_days / Math.max(j.duration_days, 1)) * 100));

                    return (
                      <div
                        key={j.id}
                        onClick={() => handleSelectJourney(j.id)}
                        className={`${styles.card} ${isCurrent ? styles.cardActive : ''}`}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className={styles.cardTop}>
                          <span className={styles.modeBadge} style={{ background: `${meta.color}15`, color: meta.color }}>
                            <Icon size={13} /> {j.mode_label}
                          </span>
                          <span className={`${styles.statusTag} ${j.active ? styles.statusTagActive : styles.statusTagArchived}`}>
                            {j.active ? 'Active' : 'Archived'}
                          </span>
                        </div>

                        <h3 className={styles.name}>{j.name}</h3>
                        <div className={styles.meta}>
                          Started {(() => {
                            if (!j.start_date) return '';
                            const parts = j.start_date.split('-');
                            if (parts.length === 3) {
                              const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                              return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                            }
                            return j.start_date;
                          })()} &bull; {j.duration_days} days
                        </div>

                        <div className={styles.progressTrack}>
                          <div className={styles.progressFill} style={{ width: `${pct}%`, background: meta.color }} />
                        </div>

                        <div className={styles.cardFooter}>
                          <span>{j.completed_days} / {j.duration_days} days completed ({pct}%)</span>
                          {j.start_weight_kg != null && j.target_weight_kg != null && (
                            <span className={styles.weightChip}>{j.start_weight_kg}kg &rarr; {j.target_weight_kg}kg</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      ) : null}

      <PlanSelectorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={load}
      />
    </div>
  );
}
