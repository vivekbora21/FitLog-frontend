'use client';

import React, { useState, useEffect } from 'react';
import { Building2, Shield, Plus, Mail, CheckCircle2, UserCheck, Flame, History, Clock } from 'lucide-react';
import { api } from '@/lib/api';
import { Gym, GymMembership, GymInvitation, AuditLog } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/lib/authContext';
import styles from './gym.module.css';

export default function GymAdminPage() {
  const { user } = useAuth();
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [memberships, setMemberships] = useState<GymMembership[]>([]);
  const [invitations, setInvitations] = useState<GymInvitation[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite Modal State
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'MEMBER' | 'TRAINER'>('MEMBER');
  const [inviting, setInviting] = useState(false);

  const loadGymData = async () => {
    try {
      const gData = await api.getGyms();
      const gymList: Gym[] = gData.results || gData;
      setGyms(gymList);

      if (gymList.length > 0) {
        const gymId = gymList[0].id;
        const [mList, invList, aList] = await Promise.all([
          api.getMembers(gymId),
          api.getInvitations(gymId),
          api.getAuditLogs(gymId),
        ]);
        setMemberships(mList.results || mList);
        setInvitations(invList.results || invList);
        setAuditLogs(aList.results || aList);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGymData();
  }, []);

  const handleSendInvite = async () => {
    if (!inviteEmail.trim() || gyms.length === 0) return;
    setInviting(true);
    try {
      await api.createInvitation(gyms[0].id, inviteEmail, inviteRole);
      setInviteModalOpen(false);
      setInviteEmail('');
      loadGymData();
    } catch (err) {
      console.error(err);
    } finally {
      setInviting(false);
    }
  };

  const currentGym = gyms[0];

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <div className={styles.headerMetaRow}>
            <Badge variant="violet">Gym Founder & Owner View</Badge>
            <span className={styles.dot}>•</span>
            <span className={styles.ownerName}>{user?.full_name || 'Gym Owner'}</span>
          </div>
          <h1 className={styles.title}>{currentGym?.name || 'Gym Admin Console'}</h1>
          <p className={styles.subtitle}>
            Tenant management, staff & member rosters, onboarding invitations, and compliance audit trail.
          </p>
        </div>

        <Button variant="primary" onClick={() => setInviteModalOpen(true)}>
          <Plus size={16} />
          <span>Invite Member / Coach</span>
        </Button>
      </div>

      {/* Facility & Branch Info */}
      {currentGym && (
        <Card elevated>
          <div className={styles.facilityRow}>
            <div>
              <div className={styles.facilityNameRow}>
                <Building2 size={24} color="var(--color-primary)" />
                <h2 className={styles.facilityName}>{currentGym.name}</h2>
              </div>
              <p className={styles.facilityDesc}>
                {currentGym.description}
              </p>
              <div className={styles.facilityAddress}>
                📍 {currentGym.address}, {currentGym.city} • 📞 {currentGym.phone}
              </div>
            </div>

            <div className={styles.statsRow}>
              <div className={styles.statBlock}>
                <div className={`${styles.statValue} ${styles.statValuePrimary}`}>
                  {memberships.length}
                </div>
                <div className={styles.statLabel}>Active Members</div>
              </div>

              <div className={styles.statBlock}>
                <div className={`${styles.statValue} ${styles.statValueCyan}`}>
                  {currentGym.branches?.length || 2}
                </div>
                <div className={styles.statLabel}>Branches</div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Roster: Members & Trainers */}
      <div>
        <div className={styles.sectionHeaderRow}>
          <h2 className={styles.sectionTitle}>Active Membership Roster</h2>
          <Badge variant="emerald">{memberships.length} Total Enrolled</Badge>
        </div>

        <Card>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr className={styles.tableHeadRow}>
                  <th className={styles.th}>Member / Staff</th>
                  <th className={styles.th}>Role</th>
                  <th className={styles.th}>Status</th>
                  <th className={styles.th}>Privacy & Data Sharing</th>
                  <th className={styles.th}>Enrolled Date</th>
                </tr>
              </thead>
              <tbody>
                {memberships.map((m) => (
                  <tr key={m.id} className={styles.tr}>
                    <td className={styles.td}>
                      <div className={styles.memberName}>{m.user?.full_name || 'Athlete'}</div>
                      <div className={styles.memberEmail}>{m.user?.email || ''}</div>
                    </td>
                    <td className={styles.td}>
                      <Badge
                        variant={
                          m.role === 'OWNER' ? 'violet' : m.role === 'TRAINER' ? 'amber' : 'emerald'
                        }
                      >
                        {m.role}
                      </Badge>
                    </td>
                    <td className={styles.td}>
                      <span className={styles.statusText}>
                        ● {m.status}
                      </span>
                    </td>
                    <td className={`${styles.td} ${styles.tdSecondary}`}>
                      {m.share_workouts_with_trainers ? '✓ Workouts Shared' : 'Private'}
                    </td>
                    <td className={`${styles.td} ${styles.tdMuted}`}>
                      {m.created_at ? new Date(m.created_at).toLocaleDateString() : 'Active'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Invitations Management */}
      <div>
        <div className={styles.sectionHeaderRow}>
          <h2 className={styles.sectionTitle}>Onboarding Invitations</h2>
          <Badge variant="amber">{invitations.length} Issued</Badge>
        </div>

        <Card>
          {invitations.length === 0 ? (
            <p className={styles.emptyText}>No pending invitations.</p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr className={styles.tableHeadRow}>
                    <th className={styles.th}>Recipient Email</th>
                    <th className={styles.th}>Target Role</th>
                    <th className={styles.th}>Invited By</th>
                    <th className={styles.th}>Status</th>
                    <th className={styles.th}>Expires</th>
                  </tr>
                </thead>
                <tbody>
                  {invitations.map((inv) => (
                    <tr key={inv.id} className={styles.tr}>
                      <td className={`${styles.td} ${styles.tdStrong}`}>
                        {inv.email}
                      </td>
                      <td className={styles.td}>
                        <Badge variant={inv.role === 'TRAINER' ? 'amber' : 'emerald'}>
                          {inv.role}
                        </Badge>
                      </td>
                      <td className={`${styles.td} ${styles.tdSecondary}`}>
                        {inv.invited_by_name}
                      </td>
                      <td className={styles.td}>
                        <span className={inv.status === 'PENDING' ? styles.statusPending : styles.statusActive}>
                          {inv.status}
                        </span>
                      </td>
                      <td className={`${styles.td} ${styles.tdMuted}`}>
                        {new Date(inv.expires_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Tenant Compliance Audit Log */}
      <div>
        <div className={styles.auditHeaderRow}>
          <History size={20} color="var(--color-violet)" />
          <h2 className={styles.sectionTitle}>Tenant Security & Audit Trail</h2>
          <Badge variant="violet">Compliance</Badge>
        </div>

        <Card>
          <div className={styles.auditList}>
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className={styles.auditItem}
              >
                <div>
                  <div className={styles.auditItemHeader}>
                    <span className={styles.auditAction}>{log.action}</span>
                    <Badge variant="emerald">{log.resource_type}</Badge>
                  </div>
                  <div className={styles.auditActor}>
                    By {log.actor_name}
                  </div>
                </div>

                <div className={styles.auditTime}>
                  {new Date(log.created_at).toLocaleTimeString()} • {new Date(log.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Send Invitation Modal */}
      <Modal isOpen={inviteModalOpen} onClose={() => setInviteModalOpen(false)} title="Issue Gym Invitation">
        <div className={styles.modalForm}>
          <div>
            <label className={styles.formLabel}>
              Candidate Email
            </label>
            <input
              type="email"
              placeholder="e.g. new.athlete@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className={styles.formInput}
            />
          </div>

          <div>
            <label className={styles.formLabel}>
              Assigned Role
            </label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as any)}
              className={styles.formSelect}
            >
              <option value="MEMBER">Gym Member</option>
              <option value="TRAINER">Trainer / Coach</option>
            </select>
          </div>

          <div className={styles.modalActions}>
            <Button variant="secondary" onClick={() => setInviteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSendInvite} disabled={inviting}>
              {inviting ? 'Issuing...' : 'Send Invitation'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
