'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dumbbell,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  AlertTriangle,
  Sparkles,
  Users,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { useAuth } from '@/lib/authContext';
import { GuestGuard } from '@/components/GuestGuard';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  validateEmail,
  validateLoginPassword,
  parseBackendError,
} from '@/lib/validation';
import { needsOnboarding, onboardingSkipKey } from '@/lib/onboarding';
import styles from '@/app/auth.module.css';

const DEMO_PERSONAS = [
  {
    id: 'alex',
    name: 'Alex',
    role: 'Member',
    email: 'alex.member@example.com',
    IconComponent: Dumbbell,
  },
  {
    id: 'marcus',
    name: 'Marcus',
    role: 'Coach',
    email: 'coach.marcus@apexfit.com',
    IconComponent: Users,
  },
  {
    id: 'david',
    name: 'David',
    role: 'Owner',
    email: 'owner@apexfit.com',
    IconComponent: ShieldCheck,
  },
];

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null);

  // Field validation and touched states
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [touched, setTouched] = useState<{ email?: boolean; password?: boolean }>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Validate a single field
  const validateField = (field: 'email' | 'password', val: string) => {
    let err: string | null = null;
    if (field === 'email') {
      err = validateEmail(val);
    } else if (field === 'password') {
      err = validateLoginPassword(val);
    }

    setFieldErrors((prev) => {
      const next = { ...prev };
      if (err) {
        next[field] = err;
      } else {
        delete next[field];
      }
      return next;
    });

    return err;
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEmail(val);
    if (generalError) setGeneralError(null);
    if (touched.email) {
      validateField('email', val);
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPassword(val);
    if (generalError) setGeneralError(null);
    if (touched.password) {
      validateField('password', val);
    }
  };

  const handleBlur = (field: 'email' | 'password') => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    if (field === 'email') {
      validateField('email', email);
    } else if (field === 'password') {
      validateField('password', password);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    // Mark all as touched
    setTouched({ email: true, password: true });

    // Client-side validation
    const emailErr = validateField('email', email);
    const passwordErr = validateField('password', password);

    if (emailErr || passwordErr) {
      setFieldErrors({
        ...(emailErr ? { email: emailErr } : {}),
        ...(passwordErr ? { password: passwordErr } : {}),
      });
      return;
    }

    setSubmitting(true);
    try {
      const loggedUser = await login(email.trim(), password);
      const skipped = typeof window !== 'undefined' && localStorage.getItem(onboardingSkipKey(loggedUser.id));
      if (!skipped && needsOnboarding(loggedUser.profile)) {
        router.push('/onboarding');
      } else {
        router.push('/app');
      }
    } catch (err: any) {
      const { generalMessage, fieldErrors: serverFieldErrors } = parseBackendError(err);
      setGeneralError(generalMessage);
      if (Object.keys(serverFieldErrors).length > 0) {
        setFieldErrors((prev) => ({
          ...prev,
          ...serverFieldErrors,
        }));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleFillDemo = (persona: (typeof DEMO_PERSONAS)[0]) => {
    setSelectedPersona(persona.id);
    setEmail(persona.email);
    setPassword('fitlog123');
    setFieldErrors({});
    setGeneralError(null);
  };

  return (
    <GuestGuard>
      <div className={styles.shell}>
        <div className={styles.container}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div className={styles.badgePill}>
              <div className={styles.badgeDot} />
              <span className={styles.badgeText}>ATHLETIC PERFORMANCE SYSTEM</span>
            </div>
          </div>

          <div className={styles.logo} onClick={() => router.push('/')} role="button" tabIndex={0}>
            <div className={styles.logoIcon}>
              <Dumbbell size={22} color="#080B11" strokeWidth={2.5} />
            </div>
            <span>FIT<span className={styles.logoMark}>LOG</span></span>
          </div>

          <Card elevated className={styles.card}>
            {/* Top Segmented Tab Switcher */}
            <div className={styles.segmentedControl}>
              <button type="button" className={`${styles.segmentBtn} ${styles.segmentBtnActive}`}>
                Log In
              </button>
              <button
                type="button"
                className={styles.segmentBtn}
                onClick={() => router.push('/signup')}
              >
                Sign Up
              </button>
            </div>

            <h1 className={styles.title}>Welcome back</h1>
            <p className={styles.subtitle}>Log in to synchronize your workouts, macros, and pacing.</p>

            {generalError && (
              <div className={styles.errorBanner} role="alert">
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{generalError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              {/* Email Field */}
              <div className={styles.inputGroup}>
                <label className={styles.label} htmlFor="email">
                  <span>Email</span>
                  {touched.email && fieldErrors.email && (
                    <span style={{ color: '#F87171', fontSize: '0.75rem', textTransform: 'none' }}>
                      Required
                    </span>
                  )}
                </label>
                <input
                  id="email"
                  type="email"
                  className={`${styles.input} ${touched.email && fieldErrors.email ? styles.inputError : ''}`}
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    setSelectedPersona(null);
                    handleEmailChange(e);
                  }}
                  onBlur={() => handleBlur('email')}
                  autoComplete="email"
                  aria-invalid={touched.email && !!fieldErrors.email}
                  aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                />
                {touched.email && fieldErrors.email && (
                  <div className={styles.fieldError} id="email-error">
                    <AlertTriangle size={13} style={{ flexShrink: 0 }} />
                    <span>{fieldErrors.email}</span>
                  </div>
                )}
              </div>

              {/* Password Field */}
              <div className={styles.inputGroup}>
                <label className={styles.label} htmlFor="password">
                  <span>Password</span>
                </label>
                <div className={styles.passwordWrapper}>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className={`${styles.passwordInput} ${touched.password && fieldErrors.password ? styles.inputError : ''}`}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setSelectedPersona(null);
                      handlePasswordChange(e);
                    }}
                    onBlur={() => handleBlur('password')}
                    autoComplete="current-password"
                    aria-invalid={touched.password && !!fieldErrors.password}
                    aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {touched.password && fieldErrors.password && (
                  <div className={styles.fieldError} id="password-error">
                    <AlertTriangle size={13} style={{ flexShrink: 0 }} />
                    <span>{fieldErrors.password}</span>
                  </div>
                )}
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={submitting}
                className={styles.submitBtn}
              >
                <span>{submitting ? 'Logging in...' : 'Log In'}</span>
                {!submitting && <ArrowRight size={16} />}
              </Button>
            </form>

            {/* Quick Demo Access */}
            <div className={styles.demoSection}>
              <div className={styles.demoDividerRow}>
                <div className={styles.demoDividerLine} />
                <div className={styles.demoDividerBadge}>
                  <Sparkles size={12} color="#10B981" />
                  <span>QUICK DEMO LOGIN</span>
                </div>
                <div className={styles.demoDividerLine} />
              </div>
              <div className={styles.demoCardsRow}>
                {DEMO_PERSONAS.map((p) => {
                  const isSelected = selectedPersona === p.id;
                  const Icon = p.IconComponent;
                  return (
                    <div
                      key={p.id}
                      className={`${styles.demoCard} ${isSelected ? styles.demoCardActive : ''}`}
                      onClick={() => handleFillDemo(p)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className={styles.demoCardIconWrap}>
                        {isSelected ? (
                          <Check size={13} color="#10B981" strokeWidth={2.5} />
                        ) : (
                          <Icon size={13} color="#94A3B8" />
                        )}
                      </div>
                      <span className={styles.demoCardName}>{p.name}</span>
                      <span className={styles.demoCardRolePill}>{p.role}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <p className={styles.footer}>
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={() => router.push('/signup')}
                className={styles.footerLink}
              >
                Sign up
              </button>
            </p>
          </Card>
        </div>
      </div>
    </GuestGuard>
  );
}
