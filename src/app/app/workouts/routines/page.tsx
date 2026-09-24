'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Play, Dumbbell, Shield, UserCheck, Flame, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Routine, Exercise } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { ExerciseModal } from '@/components/ExerciseModal';
import styles from './routines.module.css';

export default function RoutinesPage() {
  const router = useRouter();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [exercisePickerOpen, setExercisePickerOpen] = useState(false);

  // New Routine Form State
  const [newRoutineName, setNewRoutineName] = useState('');
  const [newRoutineDesc, setNewRoutineDesc] = useState('');
  const [selectedExercises, setSelectedExercises] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const loadRoutines = async () => {
    try {
      const data = await api.getRoutines();
      setRoutines(data.results || data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoutines();
  }, []);

  const handleAddExerciseToRoutine = (ex: Exercise) => {
    setSelectedExercises((prev) => [
      ...prev,
      {
        exercise: ex.id,
        exercise_name: ex.name,
        primary_muscle: ex.primary_muscle_name,
        order: prev.length + 1,
        target_sets: 3,
        target_reps: '8-12',
        rest_seconds: 90,
      },
    ]);
  };

  const handleSaveRoutine = async () => {
    if (!newRoutineName.trim()) {
      alert('Please enter a routine name');
      return;
    }
    setSaving(true);
    try {
      await api.createRoutine({
        name: newRoutineName,
        description: newRoutineDesc,
        exercises: selectedExercises.map((e, idx) => ({
          exercise: e.exercise,
          order: idx + 1,
          target_sets: Number(e.target_sets) || 3,
          target_reps: e.target_reps || '8-12',
          rest_seconds: Number(e.rest_seconds) || 90,
        })),
      });
      setCreateModalOpen(false);
      setNewRoutineName('');
      setNewRoutineDesc('');
      setSelectedExercises([]);
      loadRoutines();
    } catch (err) {
      console.error('Failed to create routine:', err);
    } finally {
      setSaving(false);
    }
  };

  const gymTemplates = routines.filter((r) => r.is_gym_template);
  const personalRoutines = routines.filter((r) => !r.is_gym_template);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Workout Routines & Templates</h1>
          <p className={styles.subtitle}>
            Structured workout splits designed for progressive overload and muscle development.
          </p>
        </div>

        <Button variant="primary" onClick={() => setCreateModalOpen(true)}>
          <Plus size={16} />
          <span>Create New Routine</span>
        </Button>
      </div>

      {/* Gym Templates Section */}
      <div>
        <div className={styles.sectionHeader}>
          <Shield size={20} color="var(--color-primary)" />
          <h2 className={styles.sectionTitle}>Apex Gym Templates</h2>
          <Badge variant="emerald">Coach Verified</Badge>
        </div>

        <div className={styles.routineGrid}>
          {gymTemplates.map((routine) => (
            <Card key={routine.id} hoverable className={styles.routineCard}>
              <div>
                <div className={styles.routineCardHeader}>
                  <h3 className={styles.routineName}>{routine.name}</h3>
                  <Badge variant="amber">Template</Badge>
                </div>
                <p className={styles.routineDesc}>
                  {routine.description || 'Custom workout template.'}
                </p>

                {/* Exercises list */}
                <div className={styles.exerciseList}>
                  {routine.exercises.map((re, idx) => (
                    <div key={idx} className={styles.exerciseChip}>
                      <span className={styles.exerciseChipName}>
                        #{re.order} {re.exercise_name}
                      </span>
                      <span className={styles.exerciseChipSets}>
                        {re.target_sets} sets × {re.target_reps}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.routineFooter}>
                <span className={styles.authorLabel}>
                  By {routine.created_by_name || 'Coach'}
                </span>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => router.push(`/app/workouts/active?routine=${routine.id}`)}
                >
                  <Play size={14} fill="#080B11" />
                  <span>Start Workout</span>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Personal Member Routines Section */}
      <div>
        <div className={styles.sectionHeader}>
          <UserCheck size={20} color="var(--color-cyan)" />
          <h2 className={styles.sectionTitle}>Personal Routines</h2>
          <Badge variant="cyan">Member Owned</Badge>
        </div>

        {personalRoutines.length === 0 ? (
          <Card className={styles.emptyCard}>
            <p className={styles.emptyText}>
              You haven&apos;t built any personal routines yet. Create one tailored to your personal split!
            </p>
            <Button size="sm" variant="outline" onClick={() => setCreateModalOpen(true)}>
              <Plus size={14} /> Create Personal Routine
            </Button>
          </Card>
        ) : (
          <div className={styles.routineGrid}>
            {personalRoutines.map((routine) => (
              <Card key={routine.id} hoverable className={styles.routineCard}>
                <div>
                  <div className={styles.routineCardHeader}>
                    <h3 className={styles.routineName}>{routine.name}</h3>
                    <Badge variant="cyan">Personal</Badge>
                  </div>
                  <p className={styles.routineDesc}>
                    {routine.description || 'Personal routine.'}
                  </p>
                </div>

                <div className={`${styles.routineFooter} ${styles.routineFooterRight}`}>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => router.push(`/app/workouts/active?routine=${routine.id}`)}
                  >
                    <Play size={14} fill="#080B11" />
                    <span>Start Workout</span>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Routine Modal */}
      <Modal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Create New Routine">
        <div className={styles.modalForm}>
          <div>
            <label className={styles.formLabel}>
              Routine Title
            </label>
            <input
              type="text"
              placeholder="e.g. Upper Body Hypertrophy"
              value={newRoutineName}
              onChange={(e) => setNewRoutineName(e.target.value)}
              className={styles.formInput}
            />
          </div>

          <div>
            <label className={styles.formLabel}>
              Description
            </label>
            <textarea
              rows={2}
              placeholder="Focus areas, tempo cues, recommended split day..."
              value={newRoutineDesc}
              onChange={(e) => setNewRoutineDesc(e.target.value)}
              className={styles.formTextarea}
            />
          </div>

          <div>
            <div className={styles.exerciseSectionHeader}>
              <label className={styles.formLabel}>
                Routine Exercises ({selectedExercises.length})
              </label>
              <Button size="sm" variant="secondary" onClick={() => setExercisePickerOpen(true)}>
                <Plus size={14} /> Add Movement
              </Button>
            </div>

            <div className={styles.selectedExercisesList}>
              {selectedExercises.map((e, idx) => (
                <div key={idx} className={styles.selectedExerciseRow}>
                  <span className={styles.selectedExerciseName}>
                    #{idx + 1} {e.exercise_name}
                  </span>
                  <div className={styles.setsControls}>
                    <input
                      type="number"
                      value={e.target_sets}
                      onChange={(ev) => {
                        const copy = [...selectedExercises];
                        copy[idx].target_sets = parseInt(ev.target.value, 10) || 3;
                        setSelectedExercises(copy);
                      }}
                      className={styles.setsInput}
                    />
                    <span className={styles.setsLabel}>sets</span>
                    <button
                      onClick={() => setSelectedExercises((prev) => prev.filter((_, i) => i !== idx))}
                      className={styles.deleteBtn}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.modalActions}>
            <Button variant="secondary" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveRoutine} disabled={saving}>
              {saving ? 'Creating...' : 'Save Routine'}
            </Button>
          </div>
        </div>
      </Modal>

      <ExerciseModal
        isOpen={exercisePickerOpen}
        onClose={() => setExercisePickerOpen(false)}
        onSelectExercise={handleAddExerciseToRoutine}
      />
    </div>
  );
}
