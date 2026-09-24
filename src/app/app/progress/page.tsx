'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function ProgressRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    api.getJourneyHistory()
      .then((res) => {
        if (!mounted) return;
        const active = (res.journeys || []).find((j: any) => j.active);
        if (active?.id) {
          router.replace(`/app/workouts/plan/history/${active.id}`);
        } else if (res.journeys && res.journeys.length > 0) {
          router.replace(`/app/workouts/plan/history/${res.journeys[0].id}`);
        } else {
          router.replace('/app/workouts/plan/history');
        }
      })
      .catch(() => {
        if (mounted) router.replace('/app/workouts/plan/history');
      });

    return () => {
      mounted = false;
    };
  }, [router]);

  return (
    <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
      Redirecting to Journey Progress &amp; Analytics...
    </div>
  );
}
