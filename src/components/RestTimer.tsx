'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, X, Bell } from 'lucide-react';
import { Button } from './ui/Button';
import styles from './RestTimer.module.css';

interface RestTimerContextType {
  startTimer: (seconds: number) => void;
  stopTimer: () => void;
  secondsRemaining: number;
  isActive: boolean;
}

const RestTimerContext = createContext<RestTimerContextType | undefined>(undefined);

export const RestTimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [totalSeconds, setTotalSeconds] = useState<number>(90);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    } catch (e) {
      // Ignore audio error
    }
  };

  const startTimer = React.useCallback((seconds: number) => {
    setTotalSeconds(seconds);
    setSecondsRemaining(seconds);
    setIsActive(true);
    setIsPaused(false);
  }, []);

  const stopTimer = React.useCallback(() => {
    setIsActive(false);
    setSecondsRemaining(0);
  }, []);

  const addTime = (seconds: number) => {
    setSecondsRemaining((prev) => prev + seconds);
    setTotalSeconds((prev) => prev + seconds);
  };

  useEffect(() => {
    let interval: any = null;
    if (isActive && !isPaused && secondsRemaining > 0) {
      interval = setInterval(() => {
        setSecondsRemaining((sec) => {
          if (sec <= 1) {
            playBeep();
            return 0;
          }
          return sec - 1;
        });
      }, 1000);
    } else if (secondsRemaining === 0 && isActive) {
      setIsActive(false);
    }
    return () => clearInterval(interval);
  }, [isActive, isPaused, secondsRemaining]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins}:${remainder < 10 ? '0' : ''}${remainder}`;
  };

  const progress = totalSeconds > 0 ? ((totalSeconds - secondsRemaining) / totalSeconds) * 100 : 0;
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const contextValue = React.useMemo(
    () => ({ startTimer, stopTimer, secondsRemaining, isActive }),
    [startTimer, stopTimer, secondsRemaining, isActive]
  );

  return (
    <RestTimerContext.Provider value={contextValue}>
      {children}
      {isActive && (
        <div className={styles.floatingToast}>
          {/* Circular Countdown Progress */}
          <div className={styles.circleWrap}>
            <svg width="64" height="64" className={styles.svgRotate}>
              <circle
                cx="32"
                cy="32"
                r={radius}
                stroke="rgba(0, 0, 0, 0.08)"
                strokeWidth="4"
                fill="none"
              />
              <circle
                cx="32"
                cy="32"
                r={radius}
                stroke="var(--color-primary)"
                strokeWidth="4"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className={styles.progressCircle}
              />
            </svg>
            <span className={styles.countdownText}>
              {formatTime(secondsRemaining)}
            </span>
          </div>

          <div className={styles.controlsBody}>
            <div className={styles.restLabel}>
              Rest Period
            </div>
            <div className={styles.actionRow}>
              <Button size="sm" variant="secondary" onClick={() => addTime(30)}>
                +30s
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setIsPaused(!isPaused)}>
                {isPaused ? <Play size={14} /> : <Pause size={14} />}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setSecondsRemaining(totalSeconds)}>
                <RotateCcw size={14} />
              </Button>
              <Button size="sm" variant="ghost" onClick={stopTimer}>
                <X size={16} />
              </Button>
            </div>
          </div>
        </div>
      )}
    </RestTimerContext.Provider>
  );
};

export const useRestTimer = () => {
  const context = useContext(RestTimerContext);
  if (!context) {
    throw new Error('useRestTimer must be used within a RestTimerProvider');
  }
  return context;
};
