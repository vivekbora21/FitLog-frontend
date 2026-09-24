'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Dumbbell, Trophy, Info, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import { Exercise, PersonalRecord } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

import styles from './exercises.module.css';

const PAGE_SIZE = 12;

export default function ExerciseLibraryPage() {
  const router = useRouter();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [prs, setPrs] = useState<Record<string, PersonalRecord>>({});
  const [search, setSearch] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState('all');
  const [activeExercise, setActiveExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const muscles = [
    { label: 'All', slug: 'all' },
    { label: 'Chest', slug: 'chest' },
    { label: 'Back', slug: 'back' },
    { label: 'Shoulders', slug: 'shoulders' },
    { label: 'Biceps', slug: 'biceps' },
    { label: 'Triceps', slug: 'triceps' },
    { label: 'Legs', slug: 'legs' },
    { label: 'Glutes', slug: 'glutes' },
    { label: 'Core', slug: 'core' },
    { label: 'Traps', slug: 'traps' },
    { label: 'Forearms', slug: 'forearms' },
    { label: 'Cardio', slug: 'cardio' },
  ];

  const LEG_MUSCLES = ['quadriceps', 'hamstrings', 'calves'];

  useEffect(() => {
    async function loadData() {
      try {
        const [exData, prData] = await Promise.all([
          api.getExercises(),
          api.getPersonalRecords(),
        ]);
        const exList = Array.isArray(exData) ? exData : (exData.results || []);
        const prList = Array.isArray(prData) ? prData : (prData.results || []);

        const prMap: Record<string, PersonalRecord> = {};
        prList.forEach((pr: PersonalRecord) => {
          prMap[pr.exercise] = pr;
        });

        setExercises(exList);
        setPrs(prMap);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filtered = exercises.filter((ex) => {
    const matchesSearch = ex.name.toLowerCase().includes(search.toLowerCase()) ||
      ex.primary_muscle_name?.toLowerCase().includes(search.toLowerCase()) ||
      ex.equipment_name?.toLowerCase().includes(search.toLowerCase());
    let matchesMuscle = selectedMuscle === 'all';
    if (!matchesMuscle) {
      const muscleLower = ex.primary_muscle_name?.toLowerCase() || '';
      if (selectedMuscle === 'legs') {
        matchesMuscle = LEG_MUSCLES.some(m => muscleLower === m);
      } else {
        matchesMuscle = muscleLower === selectedMuscle;
      }
    }
    return matchesSearch && matchesMuscle;
  }).sort((a, b) => {
    const aPr = prs[a.id];
    const bPr = prs[b.id];
    // PR exercises first, sorted by max weight descending
    if (aPr && !bPr) return -1;
    if (!aPr && bPr) return 1;
    if (aPr && bPr) return bPr.max_weight_kg - aPr.max_weight_kg;
    // Non-PR exercises alphabetically
    return a.name.localeCompare(b.name);
  });

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedMuscle]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * PAGE_SIZE;
  const paginatedExercises = filtered.slice(startIdx, startIdx + PAGE_SIZE);

  // Generate page numbers with ellipsis for large page counts
  const getPageNumbers = (): (number | '...')[] => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safePage > 3) pages.push('...');
      const start = Math.max(2, safePage - 1);
      const end = Math.min(totalPages - 1, safePage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (safePage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>Exercise Library</h1>
        <p className={styles.subtitle}>
          Explore {exercises.length > 0 ? `${exercises.length}` : '140+'} biomechanically vetted movements, proper execution cues, and personal records.
        </p>
      </div>

      {/* Search & Filters */}
      <div className={styles.searchAndFilters}>
        <div className={styles.searchWrap}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search exercises by name, muscle, or equipment..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        {/* Muscle group filter pills */}
        <div className={styles.filterScroll}>
          {muscles.map((m) => {
            const active = selectedMuscle === m.slug;
            return (
              <button
                key={m.slug}
                onClick={() => setSelectedMuscle(m.slug)}
                className={`${styles.filterPill} ${active ? styles.filterPillActive : ''}`}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Exercise Grid */}
      {loading ? (
        <div className={styles.loading}>Loading exercise catalog...</div>
      ) : (
        <>
          {/* Results summary */}
          <div className={styles.resultsSummary}>
            Showing {filtered.length === 0 ? 0 : startIdx + 1}–{Math.min(startIdx + PAGE_SIZE, filtered.length)} of {filtered.length} exercises
          </div>

          <div className={styles.exerciseGrid}>
            {paginatedExercises.map((ex) => {
              const userPr = prs[ex.id];
              return (
                <Card
                  key={ex.id}
                  hoverable
                  onClick={() => setActiveExercise(ex)}
                  className={styles.exerciseCard}
                >
                  <div>
                    <div className={styles.cardHeader}>
                      <h3 className={styles.exerciseName}>{ex.name}</h3>
                      {userPr && (
                        <Badge variant="amber">
                          <Trophy size={12} /> PR {userPr.max_weight_kg}kg
                        </Badge>
                      )}
                    </div>

                    <div className={styles.badgeRow}>
                      <Badge variant="emerald">{ex.primary_muscle_name}</Badge>
                      <Badge variant="cyan">{ex.equipment_name}</Badge>
                      {ex.gym_name && <Badge variant="violet">{ex.gym_name}</Badge>}
                    </div>

                    <p className={styles.instructions}>
                      {ex.instructions || 'Standard exercise cues and biomechanical execution.'}
                    </p>
                  </div>

                  <div className={styles.viewDetailsFooter}>
                    <Info size={14} />
                    <span>View Details &amp; Cues</span>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <nav className={styles.pagination} aria-label="Exercise pagination">
              <button
                className={styles.pageBtn}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
                <span className={styles.pageBtnLabel}>Prev</span>
              </button>

              <div className={styles.pageNumbers}>
                {getPageNumbers().map((page, i) =>
                  page === '...' ? (
                    <span key={`ellipsis-${i}`} className={styles.pageEllipsis}>…</span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`${styles.pageNumber} ${safePage === page ? styles.pageNumberActive : ''}`}
                      aria-current={safePage === page ? 'page' : undefined}
                    >
                      {page}
                    </button>
                  )
                )}
              </div>

              <button
                className={styles.pageBtn}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                aria-label="Next page"
              >
                <span className={styles.pageBtnLabel}>Next</span>
                <ChevronRight size={16} />
              </button>
            </nav>
          )}
        </>
      )}

      {/* Detail Modal */}
      {activeExercise && (
        <Modal isOpen={!!activeExercise} onClose={() => setActiveExercise(null)} title={activeExercise.name}>
          <div className={styles.modalBody}>
            <div className={styles.modalBadgeRow}>
              <Badge variant="emerald">{activeExercise.primary_muscle_name}</Badge>
              <Badge variant="cyan">{activeExercise.equipment_name}</Badge>
              {activeExercise.gym_name && <Badge variant="violet">{activeExercise.gym_name}</Badge>}
            </div>

            <div>
              <h4 className={styles.cuesHeading}>Execution & Form Cues</h4>
              <p className={styles.cuesBox}>
                {activeExercise.instructions}
              </p>
            </div>

            {prs[activeExercise.id] && (
              <div className={styles.prBanner}>
                <div>
                  <div className={styles.prLabel}>All-Time Personal Best</div>
                  <div className={styles.prValue}>
                    {prs[activeExercise.id].max_weight_kg}kg × {prs[activeExercise.id].reps} reps
                  </div>
                </div>
                <div className={styles.oneRmWrap}>
                  <div className={styles.oneRmLabel}>Estimated 1RM</div>
                  <div className={styles.oneRmValue}>
                    {prs[activeExercise.id].estimated_one_rep_max} kg
                  </div>
                </div>
              </div>
            )}

            <div className={styles.modalActions}>
              <Button variant="primary" onClick={() => router.push('/app/workouts/active')}>
                Log Workout with this Movement
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
