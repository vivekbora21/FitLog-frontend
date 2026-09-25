/**
 * Client-side validation utilities for authentication and form fields.
 */

export interface PasswordStrength {
  score: number; // 0 to 4
  label: 'Weak' | 'Fair' | 'Good' | 'Strong';
  color: string;
  checks: {
    minLength: boolean;
    hasLetter: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
  };
}

export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export function validateEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) {
    return 'Email address is required.';
  }
  if (!EMAIL_REGEX.test(trimmed)) {
    return 'Please enter a valid email address (e.g. name@domain.com).';
  }
  if (trimmed.length > 254) {
    return 'Email address is too long.';
  }
  return null;
}

export function validateName(name: string, fieldLabel = 'Name'): string | null {
  const trimmed = name.trim();
  if (!trimmed) {
    return `${fieldLabel} is required.`;
  }
  if (trimmed.length < 2) {
    return `${fieldLabel} must be at least 2 characters.`;
  }
  if (trimmed.length > 50) {
    return `${fieldLabel} cannot exceed 50 characters.`;
  }
  if (/[0-9<>{}\[\]\\]/.test(trimmed)) {
    return `${fieldLabel} cannot contain numbers or special code characters.`;
  }
  return null;
}

export function validateLoginPassword(password: string): string | null {
  if (!password) {
    return 'Password is required.';
  }
  if (password.length < 6) {
    return 'Password must be at least 6 characters.';
  }
  return null;
}

export function validateSignupPassword(password: string): string | null {
  if (!password) {
    return 'Password is required.';
  }
  if (password.length < 8) {
    return 'Password must be at least 8 characters long.';
  }
  if (password.length > 128) {
    return 'Password cannot exceed 128 characters.';
  }
  if (!/[a-zA-Z]/.test(password)) {
    return 'Password must contain at least one letter.';
  }
  if (!/[0-9!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return 'Password must contain at least one number or special character.';
  }
  return null;
}

export function validateConfirmPassword(password: string, confirmPassword: string): string | null {
  if (!confirmPassword) {
    return 'Please confirm your password.';
  }
  if (password !== confirmPassword) {
    return 'Passwords do not match.';
  }
  return null;
}

export function getPasswordStrength(password: string): PasswordStrength {
  const checks = {
    minLength: password.length >= 8,
    hasLetter: /[a-zA-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  let score = 0;
  if (checks.minLength) score += 1;
  if (checks.hasLetter) score += 1;
  if (checks.hasNumber) score += 1;
  if (checks.hasSpecial) score += 1;

  if (password.length >= 12 && score >= 3) {
    score = 4;
  }

  if (score <= 1) {
    return { score: 1, label: 'Weak', color: '#EF4444', checks };
  } else if (score === 2) {
    return { score: 2, label: 'Fair', color: '#F59E0B', checks };
  } else if (score === 3) {
    return { score: 3, label: 'Good', color: '#3B82F6', checks };
  } else {
    return { score: 4, label: 'Strong', color: '#10B981', checks };
  }
}

export interface ParsedApiErrors {
  generalMessage: string | null;
  fieldErrors: Record<string, string>;
}

export function parseBackendError(err: any): ParsedApiErrors {
  const response = err?.response;
  if (!response) {
    return {
      generalMessage: err?.message || 'Unable to connect to the server. Please check your connection.',
      fieldErrors: {},
    };
  }

  const fieldErrors: Record<string, string> = {};
  let generalMessage: string | null = null;

  if (typeof response === 'string') {
    return { generalMessage: response, fieldErrors };
  }

  if (response.detail) {
    generalMessage = String(response.detail);
  }

  if (response.non_field_errors) {
    const nfe = Array.isArray(response.non_field_errors) ? response.non_field_errors[0] : response.non_field_errors;
    generalMessage = String(nfe);
  }

  for (const [key, val] of Object.entries(response)) {
    if (key === 'detail' || key === 'non_field_errors') continue;
    let message = '';
    if (Array.isArray(val) && val.length > 0) {
      message = String(val[0]);
    } else if (typeof val === 'string') {
      message = val;
    }
    if (message) {
      fieldErrors[key] = message;
    }
  }

  // If there is no explicit generalMessage, pick the first field error
  if (!generalMessage) {
    const firstFieldKey = Object.keys(fieldErrors)[0];
    if (firstFieldKey) {
      generalMessage = fieldErrors[firstFieldKey];
    } else {
      generalMessage = 'An unexpected error occurred. Please try again.';
    }
  }

  return { generalMessage, fieldErrors };
}
