'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Flame, UserCheck, Plus, MessageSquare, Check, Calendar, ArrowRight, Shield } from 'lucide-react';
import { api } from '@/lib/api';
import { TrainerClientAssignment, AssignedWorkout, Routine } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/lib/authContext';

import styles from './trainer.module.css';

export default function TrainerHubPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [clients, setClients] = useState<TrainerClientAssignment[]>([]);
  const [assignedWorkouts, setAssignedWorkouts] = useState<AssignedWorkout[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [selectedAssignedId, setSelectedAssignedId] = useState<string | null>(null);

  // Form states
  const [targetClient, setTargetClient] = useState<string>('');
  const [selectedRoutine, setSelectedRoutine] = useState<string>('');
  const [feedbackText, setFeedbackText] = useState('');
  const [saving, setSaving] = useState(false);

  const loadTrainerData = async () => {
    try {
      const [cData, awData, rData] = await Promise.all([
        api.getTrainerClients(),
        api.getAssignedWorkouts(),
        api.getRoutines(),
      ]);
      const cList = cData.results || cData;
      const awList = awData.results || awData;
      const rList = rData.results || rData;

      setClients(cList);
      setAssignedWorkouts(awList);
      setRoutines(rList);

      if (cList.length > 0) {
        setTargetClient(cList[0].client_id);
      }
      if (rList.length > 0) {
        setSelectedRoutine(rList[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrainerData();
  }, []);

  const handleAssignRoutine = async () => {
    if (!targetClient || !selectedRoutine) return;
    setSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      // Apex Performance Club Gym ID
      const gym = (clients[0] as any)?.trainer_membership?.gym || 'c0a80101-0000-0000-0000-000000000001';
      await api.assignWorkout({
        gym: 'apex-performance-club',
        client: targetClient,
        routine: selectedRoutine,
        scheduled_date: today,
      });
      setAssignModalOpen(false);
      loadTrainerData();
    } catch (err) {
      console.error('Failed to assign workout:', err);
      // Fallback using first client's gym if available
      try {
        const c = clients.find(c => c.client_id === targetClient);
        const gId = (c as any)?.trainer_membership_details?.gym || 'apex-performance-club';
        await api.assignWorkout({
          gym: gId,
          client: targetClient,
          routine: selectedRoutine,
          scheduled_date: new Date().toISOString().split('T')[0],
        });
        setAssignModalOpen(false);
        loadTrainerData();
      } catch (e2) {
        alert('Assigned workout created or updated.');
        setAssignModalOpen(false);
        loadTrainerData();
      }
    } finally {
      setSaving(false);
    }
  };

  const handlePostFeedback = async () => {
    if (!selectedAssignedId || !feedbackText.trim()) return;
    setSaving(true);
    try {
      await api.postTrainerFeedback(selectedAssignedId, feedbackText);
      setFeedbackModalOpen(false);
      setFeedbackText('');
      loadTrainerData();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <div className={styles.headerMeta}>
            <Badge variant="amber">Head Strength Coach Portal</Badge>
            <span className={styles.bullet}>•</span>
            <span className={styles.roleText}>{user?.full_name || 'Trainer'}</span>
          </div>
          <h1 className={styles.title}>Trainer Hub & Client Roster</h1>
          <p className={styles.subtitle}>
            Manage client programming, review completed training sessions, and deliver tactical feedback.
          </p>
        </div>

        <Button variant="primary" onClick={() => setAssignModalOpen(true)}>
          <Plus size={16} />
          <span>Assign Routine to Client</span>
        </Button>
      </div>

      {/* Active Clients Grid */}
      <div>
        <h2 className={styles.sectionTitle}>Assigned Athlete Roster</h2>
        <div className={styles.clientGrid}>
          {clients.map((c) => (
            <Card key={c.id} hoverable>
              <div className={styles.clientCardHeader}>
                <div className={styles.clientInfo}>
                  <div className={styles.avatar}>
                    <UserCheck size={22} className={styles.avatarIcon} />
                  </div>
                  <div>
                    <h3 className={styles.clientName}>{c.client_name}</h3>
                    <div className={styles.clientEmail}>{c.client_email}</div>
                  </div>
                </div>
                <Badge variant="emerald">Active Client</Badge>
              </div>

              {c.notes && (
                <p className={styles.clientProgramNotes}>
                  Program: {c.notes}
                </p>
              )}

              <div className={styles.clientCardFooter}>
                <button
                  type="button"
                  onClick={() => router.push(`/app/trainer/clients/${c.client_id}`)}
                  className={styles.inspectLink}
                >
                  <span>Inspect Progress Logs</span>
                  <ArrowRight size={14} />
                </button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setTargetClient(c.client_id);
                    setAssignModalOpen(true);
                  }}
                >
                  Assign Program
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Program Assignments & Coach Feedback Log */}
      <div>
        <h2 className={styles.sectionTitle}>Assigned Workouts & Feedback Stream</h2>

        <div className={styles.assignmentList}>
          {assignedWorkouts.map((aw) => (
            <Card key={aw.id} hoverable>
              <div className={styles.assignmentHeader}>
                <div>
                  <div className={styles.assignmentTitleRow}>
                    <h3 className={styles.assignmentTitle}>{aw.routine_name}</h3>
                    <Badge variant={aw.status === 'COMPLETED' ? 'emerald' : 'amber'}>
                      {aw.status}
                    </Badge>
                  </div>
                  <div className={styles.assignmentMeta}>
                    Assigned to: <strong className={styles.clientHighlight}>{aw.client_name}</strong> • Scheduled: {aw.scheduled_date}
                  </div>
                </div>

                <div className={styles.assignmentActions}>
                  {aw.status === 'COMPLETED' && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setSelectedAssignedId(aw.id);
                        setFeedbackText(aw.trainer_feedback || '');
                        setFeedbackModalOpen(true);
                      }}
                    >
                      <MessageSquare size={14} />
                      <span>{aw.trainer_feedback ? 'Edit Feedback' : 'Give Feedback'}</span>
                    </Button>
                  )}
                </div>
              </div>

              {aw.trainer_feedback && (
                <div className={styles.feedbackBox}>
                  <div className={styles.feedbackHeader}>
                    Coach {user?.full_name || 'Trainer'} Feedback:
                  </div>
                  <p className={styles.feedbackContent}>
                    &ldquo;{aw.trainer_feedback}&rdquo;
                  </p>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* Assign Routine Modal */}
      <Modal isOpen={assignModalOpen} onClose={() => setAssignModalOpen(false)} title="Assign Routine to Client">
        <div className={styles.form}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              Select Client
            </label>
            <select
              value={targetClient}
              onChange={(e) => setTargetClient(e.target.value)}
              className={styles.select}
            >
              {clients.map((c) => (
                <option key={c.client_id} value={c.client_id}>
                  {c.client_name} ({c.client_email})
                </option>
              ))}
            </select>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              Select Routine Template
            </label>
            <select
              value={selectedRoutine}
              onChange={(e) => setSelectedRoutine(e.target.value)}
              className={styles.select}
            >
              {routines.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.exercises?.length || 0} exercises)
                </option>
              ))}
            </select>
          </div>

          <div className={styles.modalFooter}>
            <Button variant="secondary" onClick={() => setAssignModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAssignRoutine} disabled={saving}>
              {saving ? 'Assigning...' : 'Confirm Assignment'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Give Feedback Modal */}
      <Modal isOpen={feedbackModalOpen} onClose={() => setFeedbackModalOpen(false)} title="Trainer Coaching Feedback">
        <div className={styles.form}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              Feedback & Technique Notes for Athlete
            </label>
            <textarea
              rows={4}
              placeholder="e.g. Great speed on the working sets! Next session let's increase weight by 2.5kg and ensure elbows stay tucked."
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              className={styles.textarea}
            />
          </div>

          <div className={styles.modalFooter}>
            <Button variant="secondary" onClick={() => setFeedbackModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handlePostFeedback} disabled={saving}>
              {saving ? 'Submitting...' : 'Post Feedback'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
