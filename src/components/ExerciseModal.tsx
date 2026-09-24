'use client';

import React, { useState, useEffect } from 'react';
import { Search, Plus, Dumbbell, X } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Exercise } from '@/lib/types';
import { api } from '@/lib/api';
import styles from './ExerciseModal.module.css';

interface ExerciseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectExercise: (exercise: Exercise) => void;
}

export const ExerciseModal: React.FC<ExerciseModalProps> = ({ isOpen, onClose, onSelectExercise }) => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<string>('all');
  const [loading, setLoading] = useState(false);

  const muscles = [
    { label: 'All', slug: 'all' },
    { label: 'Chest', slug: 'chest' },
    { label: 'Back', slug: 'back' },
    { label: 'Legs', slug: 'quadriceps' },
    { label: 'Shoulders', slug: 'shoulders' },
    { label: 'Biceps', slug: 'biceps' },
    { label: 'Triceps', slug: 'triceps' },
    { label: 'Core', slug: 'core' },
    { label: 'Cardio', slug: 'cardio' },
  ];

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      api
        .getExercises()
        .then((data) => {
          setExercises(data.results || data);
        })
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  const filtered = exercises.filter((ex) => {
    const matchesSearch = ex.name.toLowerCase().includes(search.toLowerCase()) ||
      ex.primary_muscle_name.toLowerCase().includes(search.toLowerCase());
    const matchesMuscle = selectedMuscle === 'all' || ex.primary_muscle_name.toLowerCase().includes(selectedMuscle);
    return matchesSearch && matchesMuscle;
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Select Exercise">
      <div className={styles.wrap}>
        {/* Search Bar */}
        <div className={styles.searchWrap}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search exercise by name or muscle..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        {/* Muscle Category Filter Pills */}
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

        {/* Exercise List */}
        <div className={styles.listWrap}>
          {loading ? (
            <div className={styles.emptyState}>Loading catalog...</div>
          ) : filtered.length === 0 ? (
            <div className={styles.emptyState}>No matching exercises found.</div>
          ) : (
            filtered.map((ex) => (
              <div
                key={ex.id}
                onClick={() => {
                  onSelectExercise(ex);
                  onClose();
                }}
                className={styles.exerciseItem}
              >
                <div>
                  <div className={styles.exerciseName}>{ex.name}</div>
                  <div className={styles.badgeRow}>
                    <Badge variant="emerald" size="sm">{ex.primary_muscle_name}</Badge>
                    <Badge variant="cyan" size="sm">{ex.equipment_name}</Badge>
                    {ex.gym_name && <Badge variant="violet" size="sm">{ex.gym_name}</Badge>}
                  </div>
                </div>
                <Button size="sm" variant="secondary" iconOnly>
                  <Plus size={16} />
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
};
