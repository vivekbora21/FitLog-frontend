'use client';

import React, { useEffect, useState } from 'react';
import { UserCog, Dumbbell, KeyRound, Download, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/authContext';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TargetsEditor } from '@/components/TargetsEditor';
import uiStyles from '@/components/ui/ui.module.css';
import styles from './settings.module.css';

const FITNESS_GOALS = [
  { value: 'STRENGTH', label: 'Strength & Power' },
  { value: 'HYPERTROPHY', label: 'Muscle Hypertrophy' },
  { value: 'FAT_LOSS', label: 'Fat Loss & Conditioning' },
  { value: 'ENDURANCE', label: 'Endurance & Cardio' },
  { value: 'GENERAL_FITNESS', label: 'General Health & Fitness' },
];

const SEX_OPTIONS = [
  { value: '', label: 'Select…' },
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
];

const ACTIVITY_LEVELS = [
  { value: 'SEDENTARY', label: 'Sedentary (desk job, little exercise)' },
  { value: 'LIGHT', label: 'Light (1–3 sessions / week)' },
  { value: 'MODERATE', label: 'Moderate (3–5 sessions / week)' },
  { value: 'HIGH', label: 'High (6–7 sessions / week)' },
  { value: 'ATHLETE', label: 'Athlete (twice-daily or physical job)' },
];

const UNIT_PREFERENCES = [
  { value: 'METRIC', label: 'Metric (kg / cm)' },
  { value: 'IMPERIAL', label: 'Imperial (lbs / inches)' },
];

function extractErrorMessage(err: any): string {
  const response = err?.response;
  if (!response) return 'Something went wrong. Please try again.';
  if (response.detail) return response.detail;
  const firstField = Object.values(response)[0];
  if (Array.isArray(firstField)) return String(firstField[0]);
  return 'Something went wrong. Please try again.';
}

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bio, setBio] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [sex, setSex] = useState('');
  const [activityLevel, setActivityLevel] = useState('MODERATE');
  const [fitnessGoal, setFitnessGoal] = useState('HYPERTROPHY');
  const [unitPreference, setUnitPreference] = useState('METRIC');

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState('');
  const [passwordErrorMsg, setPasswordErrorMsg] = useState('');

  const [exporting, setExporting] = useState(false);
  const [exportErrorMsg, setExportErrorMsg] = useState('');

  useEffect(() => {
    if (!user) return;
    setFirstName(user.first_name || '');
    setLastName(user.last_name || '');
    setAvatarUrl(user.avatar_url || '');
    setBio(user.profile?.bio || '');
    setDateOfBirth(user.profile?.date_of_birth || '');
    setHeightCm(user.profile?.height_cm != null ? String(user.profile.height_cm) : '');
    setWeightKg(user.profile?.weight_kg != null ? String(user.profile.weight_kg) : '');
    setSex(user.profile?.sex || '');
    setActivityLevel(user.profile?.activity_level || 'MODERATE');
    setFitnessGoal(user.profile?.fitness_goal || 'HYPERTROPHY');
    setUnitPreference(user.profile?.unit_preference || 'METRIC');
  }, [user]);

  const userInitials = (user?.full_name || user?.email || 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');
    setSaving(true);
    try {
      await api.updateMe({
        first_name: firstName,
        last_name: lastName,
        avatar_url: avatarUrl || null,
        profile: {
          bio,
          date_of_birth: dateOfBirth || null,
          height_cm: heightCm ? parseFloat(heightCm) : null,
          weight_kg: weightKg ? parseFloat(weightKg) : null,
          sex,
          activity_level: activityLevel,
          fitness_goal: fitnessGoal,
          unit_preference: unitPreference,
        },
      });
      await refreshUser();
      setSuccessMsg('Your profile settings have been saved.');
    } catch (err: any) {
      setErrorMsg(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccessMsg('');
    setPasswordErrorMsg('');

    if (newPassword !== confirmNewPassword) {
      setPasswordErrorMsg('New passwords do not match.');
      return;
    }

    setChangingPassword(true);
    try {
      await api.changePassword(oldPassword, newPassword);
      setPasswordSuccessMsg('Your password has been updated.');
      setOldPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      setPasswordErrorMsg(extractErrorMessage(err));
    } finally {
      setChangingPassword(false);
    }
  };

  const handleExportData = async () => {
    setExportErrorMsg('');
    setExporting(true);
    try {
      const blob = await api.exportUserDataPdf();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `fitlog-export-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setExportErrorMsg(extractErrorMessage(err));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.eyebrow}>Account & Preferences</div>
          <h1 className={styles.title}>Settings</h1>
          <p className={styles.subtitle}>Manage your profile details, fitness targets, and account security.</p>
        </div>
        <div className={styles.headerActions}>
          <Button
            type="button"
            variant="secondary"
            onClick={handleExportData}
            disabled={exporting}
            className={styles.exportHeaderBtn}
          >
            <Download size={16} />
            {exporting ? 'Preparing export...' : 'Export Data (PDF)'}
          </Button>
        </div>
      </header>

      {successMsg && (
        <div className={`${styles.banner} ${styles.bannerSuccess}`}>
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className={`${styles.banner} ${styles.bannerError}`}>
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}
      {exportErrorMsg && (
        <div className={`${styles.banner} ${styles.bannerError}`}>
          <AlertCircle size={16} />
          <span>{exportErrorMsg}</span>
        </div>
      )}

      {/* 1. Profile & Biometrics Section */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Profile & Biometrics</h2>
          <p className={styles.sectionSubtitle}>
            Personal information and physical attributes used to calibrate your workouts, targets, and plans.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.twoColGrid}>
            {/* Card 1: Personal Information */}
            <Card className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardIcon}>
                  <UserCog size={18} />
                </div>
                <div>
                  <h3 className={styles.cardTitle}>Personal Information</h3>
                  <p className={styles.cardSubtitle}>Your identity and bio as shown across FitLog.</p>
                </div>
              </div>

              <div className={styles.cardBody}>
                <div className={styles.avatarRow}>
                  <div className={styles.avatarPreview}>
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Avatar preview"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      userInitials
                    )}
                  </div>
                  <div className={`${uiStyles.inputGroup} ${uiStyles.inputGroupFlex} ${styles.inputGroupReset}`}>
                    <label className={uiStyles.label} htmlFor="avatarUrl">Avatar URL</label>
                    <input
                      id="avatarUrl"
                      type="url"
                      className={uiStyles.input}
                      placeholder="https://example.com/avatar.jpg"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                    />
                  </div>
                </div>

                <div className={styles.fieldRow}>
                  <div className={`${uiStyles.inputGroup} ${styles.inputGroupReset}`}>
                    <label className={uiStyles.label} htmlFor="firstName">First Name</label>
                    <input
                      id="firstName"
                      type="text"
                      className={uiStyles.input}
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      autoComplete="given-name"
                    />
                  </div>
                  <div className={`${uiStyles.inputGroup} ${styles.inputGroupReset}`}>
                    <label className={uiStyles.label} htmlFor="lastName">Last Name</label>
                    <input
                      id="lastName"
                      type="text"
                      className={uiStyles.input}
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      autoComplete="family-name"
                    />
                  </div>
                </div>

                <div className={`${uiStyles.inputGroup} ${styles.inputGroupReset}`}>
                  <label className={uiStyles.label}>Email Address</label>
                  <div className={styles.readOnlyValue}>
                    <span className={styles.readOnlyEmail}>{user?.email || '—'}</span>
                    <span className={styles.readOnlyBadge}>Primary / Locked</span>
                  </div>
                </div>

                <div className={`${uiStyles.inputGroup} ${styles.inputGroupReset}`}>
                  <label className={uiStyles.label} htmlFor="bio">Bio</label>
                  <textarea
                    id="bio"
                    className={styles.textarea}
                    placeholder="Tell us a bit about your training background and goals..."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    maxLength={1000}
                    rows={3}
                  />
                </div>
              </div>
            </Card>

            {/* Card 2: Fitness Profile */}
            <Card className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardIcon}>
                  <Dumbbell size={18} />
                </div>
                <div>
                  <h3 className={styles.cardTitle}>Fitness Profile</h3>
                  <p className={styles.cardSubtitle}>Biometrics used to calculate your BMR, targets, and units.</p>
                </div>
              </div>

              <div className={styles.cardBody}>
                <div className={styles.fieldRow}>
                  <div className={`${uiStyles.inputGroup} ${styles.inputGroupReset}`}>
                    <label className={uiStyles.label} htmlFor="dateOfBirth">Date of Birth</label>
                    <input
                      id="dateOfBirth"
                      type="date"
                      className={uiStyles.input}
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                    />
                  </div>
                  <div className={`${uiStyles.inputGroup} ${styles.inputGroupReset}`}>
                    <label className={uiStyles.label} htmlFor="unitPreference">Unit Preference</label>
                    <select
                      id="unitPreference"
                      className={uiStyles.select}
                      value={unitPreference}
                      onChange={(e) => setUnitPreference(e.target.value)}
                    >
                      {UNIT_PREFERENCES.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className={styles.fieldRow}>
                  <div className={`${uiStyles.inputGroup} ${styles.inputGroupReset}`}>
                    <label className={uiStyles.label} htmlFor="heightCm">Height (cm)</label>
                    <input
                      id="heightCm"
                      type="number"
                      step="0.1"
                      min="0"
                      className={uiStyles.input}
                      value={heightCm}
                      onChange={(e) => setHeightCm(e.target.value)}
                    />
                  </div>
                  <div className={`${uiStyles.inputGroup} ${styles.inputGroupReset}`}>
                    <label className={uiStyles.label} htmlFor="weightKg">Weight (kg)</label>
                    <input
                      id="weightKg"
                      type="number"
                      step="0.1"
                      min="0"
                      className={uiStyles.input}
                      value={weightKg}
                      onChange={(e) => setWeightKg(e.target.value)}
                    />
                  </div>
                </div>

                <div className={styles.fieldRow}>
                  <div className={`${uiStyles.inputGroup} ${styles.inputGroupReset}`}>
                    <label className={uiStyles.label} htmlFor="sex">Sex (for BMR)</label>
                    <select id="sex" className={uiStyles.select} value={sex} onChange={(e) => setSex(e.target.value)}>
                      {SEX_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className={`${uiStyles.inputGroup} ${styles.inputGroupReset}`}>
                    <label className={uiStyles.label} htmlFor="activityLevel">Activity Level</label>
                    <select id="activityLevel" className={uiStyles.select} value={activityLevel} onChange={(e) => setActivityLevel(e.target.value)}>
                      {ACTIVITY_LEVELS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className={`${uiStyles.inputGroup} ${styles.inputGroupReset}`}>
                  <label className={uiStyles.label} htmlFor="fitnessGoal">Primary Fitness Goal</label>
                  <select
                    id="fitnessGoal"
                    className={uiStyles.select}
                    value={fitnessGoal}
                    onChange={(e) => setFitnessGoal(e.target.value)}
                  >
                    {FITNESS_GOALS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </Card>
          </div>

          <div className={styles.formFooter}>
            <div className={styles.formFooterMeta}>
              <span>Biometric changes automatically calibrate your calorie burn and pacing targets.</span>
            </div>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Saving changes...' : 'Save Profile Changes'}
            </Button>
          </div>
        </form>
      </section>

      {/* 2. Calibration & Targets Section */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Daily & Weekly Targets</h2>
          <p className={styles.sectionSubtitle}>
            Custom thresholds for nutrition, hydration, recovery, and workout frequency.
          </p>
        </div>
        <TargetsEditor />
      </section>

      {/* 3. Security & Data Management Section */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Security & Data</h2>
          <p className={styles.sectionSubtitle}>
            Manage your credentials and export your personal fitness records.
          </p>
        </div>

        <div className={styles.twoColGrid}>
          {/* Card 3: Change Password */}
          <form onSubmit={handlePasswordSubmit}>
            <Card className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardIcon}>
                  <KeyRound size={18} />
                </div>
                <div>
                  <h3 className={styles.cardTitle}>Change Password</h3>
                  <p className={styles.cardSubtitle}>Ensure your account is protected with a secure password.</p>
                </div>
              </div>

              {passwordSuccessMsg && (
                <div className={`${styles.banner} ${styles.bannerSuccess}`}>
                  <CheckCircle2 size={16} />
                  <span>{passwordSuccessMsg}</span>
                </div>
              )}
              {passwordErrorMsg && (
                <div className={`${styles.banner} ${styles.bannerError}`}>
                  <AlertCircle size={16} />
                  <span>{passwordErrorMsg}</span>
                </div>
              )}

              <div className={styles.cardBody}>
                <div className={`${uiStyles.inputGroup} ${styles.inputGroupReset}`}>
                  <label className={uiStyles.label} htmlFor="oldPassword">Current Password</label>
                  <input
                    id="oldPassword"
                    type="password"
                    className={uiStyles.input}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>

                <div className={`${uiStyles.inputGroup} ${styles.inputGroupReset}`}>
                  <label className={uiStyles.label} htmlFor="newPassword">New Password</label>
                  <input
                    id="newPassword"
                    type="password"
                    className={uiStyles.input}
                    placeholder="At least 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                </div>

                <div className={`${uiStyles.inputGroup} ${styles.inputGroupReset}`}>
                  <label className={uiStyles.label} htmlFor="confirmNewPassword">Confirm New Password</label>
                  <input
                    id="confirmNewPassword"
                    type="password"
                    className={uiStyles.input}
                    placeholder="Re-enter your new password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <div className={styles.cardFooter}>
                <Button type="submit" variant="primary" disabled={changingPassword}>
                  {changingPassword ? 'Updating...' : 'Update Password'}
                </Button>
              </div>
            </Card>
          </form>

          {/* Card 4: Export Data */}
          <div>
            <Card className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardIcon}>
                  <Download size={18} />
                </div>
                <div>
                  <h3 className={styles.cardTitle}>Export Data</h3>
                  <p className={styles.cardSubtitle}>Download a complete archive of your logs & records.</p>
                </div>
              </div>

              {exportErrorMsg && (
                <div className={`${styles.banner} ${styles.bannerError}`}>
                  <AlertCircle size={16} />
                  <span>{exportErrorMsg}</span>
                </div>
              )}

              <div className={styles.cardBody}>
                <div className={styles.exportDetails}>
                  <p className={styles.exportText}>
                    Generate a publication-grade, self-service PDF report containing your complete history:
                  </p>
                  <ul className={styles.exportList}>
                    <li className={styles.exportListItem}>
                      <span className={styles.exportListBullet} />
                      <span>Full profile configuration & biometric baseline</span>
                    </li>
                    <li className={styles.exportListItem}>
                      <span className={styles.exportListBullet} />
                      <span>Workout logs, sets, reps, and exercise history</span>
                    </li>
                    <li className={styles.exportListItem}>
                      <span className={styles.exportListBullet} />
                      <span>Daily nutrition records, calories & macro targets</span>
                    </li>
                    <li className={styles.exportListItem}>
                      <span className={styles.exportListBullet} />
                      <span>Body measurements, weight trends & milestone PRs</span>
                    </li>
                  </ul>
                  <div className={styles.exportMeta}>
                    <span className={styles.exportMetaBadge}>PDF Report</span>
                    <span className={styles.exportMetaText}>Archival copy for your personal records</span>
                  </div>
                </div>
              </div>

              <div className={styles.cardFooter}>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleExportData}
                  disabled={exporting}
                >
                  <Download size={16} />
                  {exporting ? 'Preparing export...' : 'Export My Data (PDF)'}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
