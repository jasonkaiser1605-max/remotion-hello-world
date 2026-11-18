import type { Sport } from '@/lib/types';

export const C = {
  bg: '#0B0F14',
  card: '#141A22',
  cardHi: '#1B232D',
  border: '#232C38',
  text: '#E9EEF4',
  muted: '#8B98A8',
  faint: '#5A6676',
  accent: '#FF6B3D',
  accentSoft: 'rgba(255,107,61,0.14)',
  green: '#4ADE80',
  yellow: '#FACC15',
  red: '#F87171',
  blue: '#60A5FA',
  protein: '#F472B6',
  carbs: '#FBBF24',
  fat: '#A78BFA',
  water: '#38BDF8',
};

export const SPORT: Record<Sport, { color: string; icon: string; label: string }> = {
  swim: { color: '#38BDF8', icon: 'swim', label: 'Swim' },
  bike: { color: '#4ADE80', icon: 'bike', label: 'Bike' },
  run: { color: '#FB923C', icon: 'run', label: 'Run' },
  strength: { color: '#A78BFA', icon: 'dumbbell', label: 'Strength' },
  soccer: { color: '#E5E7EB', icon: 'soccer', label: 'Soccer' },
  race: { color: '#FACC15', icon: 'trophy', label: 'Race' },
  mobility: { color: '#94A3B8', icon: 'yoga', label: 'Mobility' },
};

export const ZONE_COLORS = ['#94A3B8', '#60A5FA', '#4ADE80', '#FACC15', '#F87171'];

export const R = { sm: 8, md: 14, lg: 20 };
