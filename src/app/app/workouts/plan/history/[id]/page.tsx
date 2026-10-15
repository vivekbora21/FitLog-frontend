'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { JourneyDetail } from '@/lib/types';
import { PlanProgressDashboard } from '@/components/plan-history';
import styles from './detail.module.css';

export default function JourneyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [data, setData] = useState<JourneyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const detailRes = await api.getJourneyDetail(id);
      setData(detailRes);
    } catch (err) {
      console.error('Failed to load journey detail', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return <div className={styles.loading}>Loading journey progress &amp; analytics...</div>;
  }

  if (error || !data) {
    return (
      <div className={styles.loading}>
        <strong>Journey not found.</strong>
        <button
          type="button"
          className={styles.backBtn}
          onClick={() => router.push('/app/workouts/plan/history')}
        >
          <ArrowLeft size={16} /> Back to Plan History
        </button>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      <PlanProgressDashboard
        data={data}
        onRefresh={loadData}
      />
    </div>
  );
}
