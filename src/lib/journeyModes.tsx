import { Flame, Dumbbell, Target, Activity, Zap, LucideIcon } from 'lucide-react';
import { JourneyMode } from './types';

export interface ModeMeta {
  label: string;
  icon: LucideIcon;
  color: string;
  focus: string;
  weightDirection: 'loss' | 'gain' | 'maintain';
  defaultCardioEarly: number;
  defaultCardioLater: number;
}

export const MODE_META: Record<JourneyMode, ModeMeta> = {
  CUT: {
    label: 'Cut Mode',
    icon: Flame,
    color: '#EF4444',
    focus: 'fat loss while preserving lean muscle',
    weightDirection: 'loss',
    defaultCardioEarly: 120,
    defaultCardioLater: 150,
  },
  BULK: {
    label: 'Bulk Mode',
    icon: Dumbbell,
    color: '#8B5CF6',
    focus: 'lean muscle hypertrophy through a clean surplus',
    weightDirection: 'gain',
    defaultCardioEarly: 60,
    defaultCardioLater: 75,
  },
  FOCUS: {
    label: 'Focus Mode',
    icon: Target,
    color: '#0EA5E9',
    focus: 'strength peaking and 1RM progression',
    weightDirection: 'maintain',
    defaultCardioEarly: 90,
    defaultCardioLater: 105,
  },
  RECOMP: {
    label: 'Recomp Mode',
    icon: Activity,
    color: '#10B981',
    focus: 'simultaneous fat loss and muscle retention',
    weightDirection: 'maintain',
    defaultCardioEarly: 120,
    defaultCardioLater: 150,
  },
  HABIT: {
    label: 'Habit Reset',
    icon: Zap,
    color: '#F59E0B',
    focus: 'training consistency and routine adherence',
    weightDirection: 'maintain',
    defaultCardioEarly: 120,
    defaultCardioLater: 150,
  },
};

export function getModeMeta(mode?: string | null): ModeMeta {
  return MODE_META[(mode as JourneyMode) || 'CUT'] || MODE_META.CUT;
}
