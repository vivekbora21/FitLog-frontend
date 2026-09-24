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

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      router.push('/app');
    } catch (err: any) {
      setError(extractErrorMessage(err) || 'Invalid email or password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <GuestGuard>
      <div className={styles.shell}>
        <div className={styles.container}>
          <div className={styles.logo} onClick={() => router.push('/')}>
            <div className={styles.logoIcon}>
              <Dumbbell size={22} color="#080B11" strokeWidth={2.5} />
            </div>
            <span>FIT<span className={styles.logoMark}>LOG</span></span>
          </div>

          <Card elevated className={styles.card}>
            <h1 className={styles.title}>Welcome back</h1>
            <p className={styles.subtitle}>Log in to continue your fitness journey.</p>

            {error && (
              <div className={styles.errorBanner}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
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
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>

              <Button type="submit" variant="primary" disabled={submitting} className={styles.submitBtn}>
                <span>{submitting ? 'Logging in...' : 'Log In'}</span>
                {!submitting && <ArrowRight size={16} />}
              </Button>
            </form>

            <p className={styles.footer}>
              Don&apos;t have an account?{' '}
              <button type="button" onClick={() => router.push('/signup')} className={styles.footerLink}>
                Sign up
              </button>
            </p>
          </Card>
        </div>
      </div>
    </GuestGuard>
  );
}
