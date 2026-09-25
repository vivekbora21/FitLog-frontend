'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { needsOnboarding, onboardingSkipKey } from '@/lib/onboarding';

export function GuestGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      const skipped = typeof window !== 'undefined' && localStorage.getItem(onboardingSkipKey(user.id));
      if (!skipped && needsOnboarding(user.profile)) {
        router.replace('/onboarding');
      } else {
        router.replace('/app');
      }
    }
  }, [loading, user, router]);

  if (loading || user) {
    return <div className="full-page-loader">Loading...</div>;
  }

  return <>{children}</>;
}
