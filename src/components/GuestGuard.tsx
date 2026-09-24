'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';

export function GuestGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/app');
    }
  }, [loading, user, router]);

  if (loading || user) {
    return <div className="full-page-loader">Loading...</div>;
  }

  return <>{children}</>;
}
