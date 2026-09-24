'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, SlidersHorizontal } from 'lucide-react';
import { api } from '@/lib/api';
import { JourneyHistoryEntry } from '@/lib/types';
import { getModeMeta } from '@/lib/journeyModes';
import { PlanSelectorModal } from '@/components/PlanSelectorModal';
import styles from './history.module.css';

export default function PlanHistoryPage() {
  const [journeys, setJourneys] = useState<JourneyHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const load = () => {
    api.getJourneyHistory()
      .then((res) => setJourneys(res.journeys || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <div className={styles.loading}>Loading plan history...</div>;

  return (
    <div className={styles.page}>
      <header className={styles.headerRow}>
        <div>
          <div className={styles.eyebrow}>Journey Archive &amp; Analytics</div>
          <h1 className={styles.title}>Plan History &amp; Progress</h1>
          <p className={styles.subtitle}>Every mode you&apos;ve run, past and present, with empirical body composition tracking and pacing.</p>
        </div>
        <button type="button" className={styles.startBtn} onClick={() => setIsModalOpen(true)}>
          <SlidersHorizontal size={15} /> Select a Plan
        </button>
      </header>

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
      ) : (
        <>
          {(() => {
            const activeJourney = journeys.find((j) => j.active);
            if (!activeJourney) return null;
            const meta = getModeMeta(activeJourney.mode);
            const Icon = meta.icon;
            const pct = Math.min(100, Math.round((activeJourney.completed_days / Math.max(activeJourney.duration_days, 1)) * 100));

            return (
              <div className={styles.activeHero}>
                <div className={styles.activeHeroHeader}>
                  <div>
                    <div className={styles.cardTop}>
                      <span className={styles.modeBadge} style={{ background: `${meta.color}15`, color: meta.color }}>
                        <Icon size={13} /> {activeJourney.mode_label}
                      </span>
                      <span className={`${styles.statusTag} ${styles.statusTagActive}`}>
                        Active Journey
                      </span>
                    </div>
                    <h2 className={styles.activeHeroTitle}>{activeJourney.name}</h2>
                    <div className={styles.meta}>
                      Day {activeJourney.current_day} of {activeJourney.duration_days} · Started {activeJourney.start_date}
                    </div>
                  </div>

                  <div className={styles.activeHeroActions}>
                    <Link href={`/app/workouts/plan/history/${activeJourney.id}`} className={styles.viewAnalyticsBtn}>
                      View Progress &amp; Analytics &rarr;
                    </Link>
                  </div>
                </div>

                <div className={styles.progressTrack}>
                  <div className={styles.progressFill} style={{ width: `${pct}%`, background: meta.color }} />
                </div>

                <div className={styles.cardFooter}>
                  <span>{activeJourney.completed_days} / {activeJourney.duration_days} days completed ({pct}%)</span>
                  {activeJourney.start_weight_kg != null && activeJourney.target_weight_kg != null && (
                    <span className={styles.weightChip}>{activeJourney.start_weight_kg}kg &rarr; {activeJourney.target_weight_kg}kg</span>
                  )}
                </div>
              </div>
            );
          })()}

          {journeys.some((j) => !j.active) && (
            <h3 className={styles.sectionTitle}>Archived Journeys</h3>
          )}

          <div className={styles.grid}>
            {journeys.filter((j) => !j.active || journeys.length > 1).map((j) => {
              const meta = getModeMeta(j.mode);
              const Icon = meta.icon;
              const pct = Math.min(100, Math.round((j.completed_days / Math.max(j.duration_days, 1)) * 100));
              return (
                <Link key={j.id} href={`/app/workouts/plan/history/${j.id}`} className={`${styles.card} ${j.active ? styles.cardActive : ''}`}>
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
                    Started {j.start_date} · {j.duration_days} days
                    {j.archived_at && !j.active && <> · Archived {j.archived_at.slice(0, 10)}</>}
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
                </Link>
              );
            })}
          </div>
        </>
      )}

      <PlanSelectorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={load}
      />
    </div>
  );
}
