'use client';

import React from 'react';
import { Sparkles, X } from 'lucide-react';
import styles from '@/app/app/page.module.css';

interface CoachInsightBannerProps {
  insightText: string | null;
  isVisible: boolean;
  onDismiss: () => void;
}

export const CoachInsightBanner: React.FC<CoachInsightBannerProps> = ({
  insightText,
  isVisible,
  onDismiss,
}) => {
  if (!isVisible || !insightText) return null;

  return (
    <section className={styles.coachBanner}>
      <div className={styles.coachBannerLeft}>
        <Sparkles size={17} className={styles.coachIcon} />
        <span className={styles.coachLabel}>Coach Insight</span>
        <span className={styles.coachDivider}>|</span>
        <span className={styles.coachText}>{insightText}</span>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className={styles.coachCloseBtn}
        title="Dismiss insight"
        aria-label="Dismiss insight"
      >
        <X size={16} />
      </button>
    </section>
  );
};
