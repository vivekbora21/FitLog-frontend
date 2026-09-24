'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dumbbell, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/authContext';
import { GuestGuard } from '@/components/GuestGuard';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import uiStyles from '@/components/ui/ui.module.css';
import styles from '@/app/auth.module.css';

function extractErrorMessage(err: any): string {
  const response = err?.response;
  if (!response) return 'Something went wrong. Please try again.';
  if (response.detail) return response.detail;
  const firstField = Object.values(response)[0];
  if (Array.isArray(firstField)) return String(firstField[0]);
  return 'Something went wrong. Please try again.';
}

export default function SignupPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await register({ email, password, first_name: firstName, last_name: lastName });
      router.push('/app');
    } catch (err: any) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <GuestGuard>
      <div className={styles.shell}>
        <div className={styles.containerWide}>
          <div className={styles.logo} onClick={() => router.push('/')}>
            <div className={styles.logoIcon}>
              <Dumbbell size={22} color="#080B11" strokeWidth={2.5} />
            </div>
            <span>FIT<span className={styles.logoMark}>LOG</span></span>
          </div>

          <Card elevated className={styles.card}>
            <h1 className={styles.title}>Create your account</h1>
            <p className={styles.subtitle}>Start tracking your workouts, nutrition, and progress.</p>

            {error && (
              <div className={styles.errorBanner}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className={styles.nameRow}>
                <div className={uiStyles.inputGroup}>
                  <label className={uiStyles.label} htmlFor="firstName">First Name</label>
                  <input
                    id="firstName"
                    type="text"
                    className={uiStyles.input}
                    placeholder="Alex"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    autoComplete="given-name"
                  />
                </div>

                <div className={uiStyles.inputGroup}>
                  <label className={uiStyles.label} htmlFor="lastName">Last Name</label>
                  <input
                    id="lastName"
                    type="text"
                    className={uiStyles.input}
                    placeholder="Chen"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    autoComplete="family-name"
                  />
                </div>
              </div>

              <div className={uiStyles.inputGroup}>
                <label className={uiStyles.label} htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  className={uiStyles.input}
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div className={uiStyles.inputGroup}>
                <label className={uiStyles.label} htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  className={uiStyles.input}
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>

              <div className={uiStyles.inputGroup}>
                <label className={uiStyles.label} htmlFor="confirmPassword">Confirm Password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  className={uiStyles.input}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>

              <Button type="submit" variant="primary" disabled={submitting} className={styles.submitBtn}>
                <span>{submitting ? 'Creating account...' : 'Sign Up'}</span>
                {!submitting && <ArrowRight size={16} />}
              </Button>
            </form>

            <p className={styles.footer}>
              Already have an account?{' '}
              <button type="button" onClick={() => router.push('/login')} className={styles.footerLink}>
                Log in
              </button>
            </p>
          </Card>
        </div>
      </div>
    </GuestGuard>
  );
}
