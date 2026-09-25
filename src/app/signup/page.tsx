'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dumbbell,
  ArrowRight,
  AlertCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import { useAuth } from '@/lib/authContext';
import { GuestGuard } from '@/components/GuestGuard';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  validateEmail,
  validateName,
  validateSignupPassword,
  validateConfirmPassword,
  getPasswordStrength,
  parseBackendError,
} from '@/lib/validation';
import styles from '@/app/auth.module.css';

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

type FieldName = keyof FormState;

export default function SignupPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [formData, setFormData] = useState<FormState>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const passwordStrength = useMemo(() => {
    return getPasswordStrength(formData.password);
  }, [formData.password]);

  const passwordsMatch = formData.password && formData.confirmPassword && formData.password === formData.confirmPassword;

  // Single field validation
  const validateField = (field: FieldName, values: FormState): string | null => {
    let err: string | null = null;
    switch (field) {
      case 'firstName':
        err = validateName(values.firstName, 'First name');
        break;
      case 'lastName':
        err = validateName(values.lastName, 'Last name');
        break;
      case 'email':
        err = validateEmail(values.email);
        break;
      case 'password':
        err = validateSignupPassword(values.password);
        break;
      case 'confirmPassword':
        err = validateConfirmPassword(values.password, values.confirmPassword);
        break;
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

  const handleChange = (field: FieldName, value: string) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    if (generalError) setGeneralError(null);

    // If already touched, validate live
    if (touched[field]) {
      validateField(field, updated);
    }

    // If editing password, re-validate confirmPassword if it was touched
    if (field === 'password' && touched.confirmPassword) {
      validateField('confirmPassword', updated);
    }
  };

  const handleBlur = (field: FieldName) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field, formData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    // Mark all fields touched
    const allTouched: Record<FieldName, boolean> = {
      firstName: true,
      lastName: true,
      email: true,
      password: true,
      confirmPassword: true,
    };
    setTouched(allTouched);

    // Validate all fields
    const fnErr = validateField('firstName', formData);
    const lnErr = validateField('lastName', formData);
    const emErr = validateField('email', formData);
    const pwErr = validateField('password', formData);
    const cpErr = validateField('confirmPassword', formData);

    const hasErrors = !!(fnErr || lnErr || emErr || pwErr || cpErr);
    if (hasErrors) {
      setFieldErrors({
        ...(fnErr ? { firstName: fnErr } : {}),
        ...(lnErr ? { lastName: lnErr } : {}),
        ...(emErr ? { email: emErr } : {}),
        ...(pwErr ? { password: pwErr } : {}),
        ...(cpErr ? { confirmPassword: cpErr } : {}),
      });
      return;
    }

    setSubmitting(true);
    try {
      await register({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
      });
      router.push('/onboarding');
    } catch (err: any) {
      const { generalMessage, fieldErrors: serverFieldErrors } = parseBackendError(err);
      setGeneralError(generalMessage);

      const mappedErrors: Partial<Record<FieldName, string>> = {};
      if (serverFieldErrors.first_name) mappedErrors.firstName = serverFieldErrors.first_name;
      if (serverFieldErrors.last_name) mappedErrors.lastName = serverFieldErrors.last_name;
      if (serverFieldErrors.email) mappedErrors.email = serverFieldErrors.email;
      if (serverFieldErrors.password) mappedErrors.password = serverFieldErrors.password;
      if (serverFieldErrors.confirm_password) mappedErrors.confirmPassword = serverFieldErrors.confirm_password;

      if (Object.keys(mappedErrors).length > 0) {
        setFieldErrors((prev) => ({
          ...prev,
          ...mappedErrors,
        }));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <GuestGuard>
      <div className={styles.shell}>
        <div className={styles.containerWide}>
          <div className={styles.logo} onClick={() => router.push('/')} role="button" tabIndex={0}>
            <div className={styles.logoIcon}>
              <Dumbbell size={22} color="#080B11" strokeWidth={2.5} />
            </div>
            <span>FIT<span className={styles.logoMark}>LOG</span></span>
          </div>

          <Card elevated className={styles.card}>
            <h1 className={styles.title}>Create your account</h1>
            <p className={styles.subtitle}>Start tracking your workouts, nutrition, and progress.</p>

            {generalError && (
              <div className={styles.errorBanner} role="alert">
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{generalError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              {/* First & Last Name */}
              <div className={styles.nameRow}>
                <div className={styles.inputGroup}>
                  <label className={styles.label} htmlFor="firstName">
                    <span>First Name</span>
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    className={`${styles.input} ${touched.firstName && fieldErrors.firstName ? styles.inputError : ''}`}
                    placeholder="Alex"
                    value={formData.firstName}
                    onChange={(e) => handleChange('firstName', e.target.value)}
                    onBlur={() => handleBlur('firstName')}
                    autoComplete="given-name"
                    aria-invalid={touched.firstName && !!fieldErrors.firstName}
                    aria-describedby={fieldErrors.firstName ? 'first-name-error' : undefined}
                  />
                  {touched.firstName && fieldErrors.firstName && (
                    <div className={styles.fieldError} id="first-name-error">
                      <AlertTriangle size={13} style={{ flexShrink: 0 }} />
                      <span>{fieldErrors.firstName}</span>
                    </div>
                  )}
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label} htmlFor="lastName">
                    <span>Last Name</span>
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    className={`${styles.input} ${touched.lastName && fieldErrors.lastName ? styles.inputError : ''}`}
                    placeholder="Chen"
                    value={formData.lastName}
                    onChange={(e) => handleChange('lastName', e.target.value)}
                    onBlur={() => handleBlur('lastName')}
                    autoComplete="family-name"
                    aria-invalid={touched.lastName && !!fieldErrors.lastName}
                    aria-describedby={fieldErrors.lastName ? 'last-name-error' : undefined}
                  />
                  {touched.lastName && fieldErrors.lastName && (
                    <div className={styles.fieldError} id="last-name-error">
                      <AlertTriangle size={13} style={{ flexShrink: 0 }} />
                      <span>{fieldErrors.lastName}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Email */}
              <div className={styles.inputGroup}>
                <label className={styles.label} htmlFor="email">
                  <span>Email</span>
                </label>
                <input
                  id="email"
                  type="email"
                  className={`${styles.input} ${touched.email && fieldErrors.email ? styles.inputError : ''}`}
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
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

              {/* Password */}
              <div className={styles.inputGroup}>
                <label className={styles.label} htmlFor="password">
                  <span>Password</span>
                </label>
                <div className={styles.passwordWrapper}>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className={`${styles.passwordInput} ${touched.password && fieldErrors.password ? styles.inputError : ''}`}
                    placeholder="At least 8 characters"
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    onBlur={() => handleBlur('password')}
                    autoComplete="new-password"
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

                {/* Password strength & requirements checklist */}
                {formData.password.length > 0 && (
                  <div className={styles.strengthSection}>
                    <div className={styles.strengthHeader}>
                      <span className={styles.strengthLabel}>Password Strength</span>
                      <span className={styles.strengthValue} style={{ color: passwordStrength.color }}>
                        {passwordStrength.label}
                      </span>
                    </div>
                    <div className={styles.strengthBarBackground}>
                      <div
                        className={styles.strengthBarFill}
                        style={{
                          width: `${(passwordStrength.score / 4) * 100}%`,
                          backgroundColor: passwordStrength.color,
                        }}
                      />
                    </div>
                    <ul className={styles.reqList}>
                      <li className={`${styles.reqItem} ${passwordStrength.checks.minLength ? styles.reqItemValid : ''}`}>
                        {passwordStrength.checks.minLength ? <CheckCircle2 size={12} /> : <Circle size={12} />}
                        <span>At least 8 characters</span>
                      </li>
                      <li className={`${styles.reqItem} ${passwordStrength.checks.hasLetter ? styles.reqItemValid : ''}`}>
                        {passwordStrength.checks.hasLetter ? <CheckCircle2 size={12} /> : <Circle size={12} />}
                        <span>Contains letters</span>
                      </li>
                      <li className={`${styles.reqItem} ${passwordStrength.checks.hasNumber || passwordStrength.checks.hasSpecial ? styles.reqItemValid : ''}`}>
                        {passwordStrength.checks.hasNumber || passwordStrength.checks.hasSpecial ? <CheckCircle2 size={12} /> : <Circle size={12} />}
                        <span>Numbers or symbols</span>
                      </li>
                      <li className={`${styles.reqItem} ${passwordsMatch ? styles.reqItemValid : ''}`}>
                        {passwordsMatch ? <CheckCircle2 size={12} /> : <Circle size={12} />}
                        <span>Passwords match</span>
                      </li>
                    </ul>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className={styles.inputGroup}>
                <label className={styles.label} htmlFor="confirmPassword">
                  <span>Confirm Password</span>
                </label>
                <div className={styles.passwordWrapper}>
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    className={`${styles.passwordInput} ${touched.confirmPassword && fieldErrors.confirmPassword ? styles.inputError : ''}`}
                    placeholder="Re-enter your password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange('confirmPassword', e.target.value)}
                    onBlur={() => handleBlur('confirmPassword')}
                    autoComplete="new-password"
                    aria-invalid={touched.confirmPassword && !!fieldErrors.confirmPassword}
                    aria-describedby={fieldErrors.confirmPassword ? 'confirm-password-error' : undefined}
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {touched.confirmPassword && fieldErrors.confirmPassword && (
                  <div className={styles.fieldError} id="confirm-password-error">
                    <AlertTriangle size={13} style={{ flexShrink: 0 }} />
                    <span>{fieldErrors.confirmPassword}</span>
                  </div>
                )}
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={submitting}
                className={styles.submitBtn}
              >
                <span>{submitting ? 'Creating account...' : 'Sign Up'}</span>
                {!submitting && <ArrowRight size={16} />}
              </Button>
            </form>

            <p className={styles.footer}>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => router.push('/login')}
                className={styles.footerLink}
              >
                Log in
              </button>
            </p>
          </Card>
        </div>
      </div>
    </GuestGuard>
  );
}
