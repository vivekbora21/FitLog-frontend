'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Dumbbell, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import styles from './page.module.css';

export default function LandingPage() {
  const router = useRouter();
  return (
    <div className="landing-page">
      {/* Top Bar */}
      <header className="landing-header">
        <div className="landing-logo">
          <div className={styles.logoIcon}>
            <Dumbbell size={22} color="#FFFFFF" strokeWidth={2.5} />
          </div>
          <span>FIT<span className={styles.logoMark}>LOG</span></span>
          <Badge variant="emerald">PostgreSQL Engine</Badge>
        </div>

        <div className="landing-header-actions">
          <Button variant="secondary" onClick={() => router.push('/login')}>Log In</Button>
          <Button variant="primary" onClick={() => router.push('/signup')}>
            <span>Sign Up</span>
            <ArrowRight size={16} />
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="landing-hero">
        <div className={styles.eyebrow}>
          <Sparkles size={16} color="var(--color-primary)" />
          <span className={styles.eyebrowText}>
            Domain-Driven Architecture • Lifetime Personal Data Ownership
          </span>
        </div>

        <h1 className={styles.heroTitle}>
          The High-Performance <br />
          <span className={styles.heroTitleGradient}>
            Gym & Fitness Platform
          </span>
        </h1>

        <p className={styles.heroSubtitle}>
          Relational multi-tenant workout tracking, rest timers, live set logging, nutrition macro rings, and seamless trainer-client assignments powered by Django & PostgreSQL.
        </p>

        {/* CTA */}
        <div className="landing-cta">
          <Button variant="primary" size="lg" onClick={() => router.push('/signup')}>
            <span>Get Started Free</span>
            <ArrowRight size={16} />
          </Button>
          <Button variant="secondary" size="lg" onClick={() => router.push('/login')}>
            <span>Log In</span>
          </Button>
        </div>
      </section>

      {/* Highlights Bar */}
      <section className="landing-highlights-section">
        <div className="landing-highlights-grid">
          <div>
            <div className={`${styles.highlightHeading} ${styles.emerald}`}>
              <CheckCircle2 size={20} />
              <h4>Lifetime History</h4>
            </div>
            <p className={styles.highlightBody}>
              Member workouts, weight, and nutrition remain personal and permanent, independent of gym tenure.
            </p>
          </div>

          <div>
            <div className={`${styles.highlightHeading} ${styles.cyan}`}>
              <CheckCircle2 size={20} />
              <h4>Workout Hierarchy</h4>
            </div>
            <p className={styles.highlightBody}>
              Session → WorkoutExercise → WorkoutSet structure supporting exact set types, RPE, and target reps.
            </p>
          </div>

          <div>
            <div className={`${styles.highlightHeading} ${styles.violet}`}>
              <CheckCircle2 size={20} />
              <h4>PostgreSQL Constraints</h4>
            </div>
            <p className={styles.highlightBody}>
              Database-enforced unique active owner, non-duplicating trainer assignments, and pending invitation integrity.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
