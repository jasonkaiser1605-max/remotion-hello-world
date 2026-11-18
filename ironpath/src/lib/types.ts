// Core domain types. This folder (src/lib) is pure TypeScript with no React Native
// imports, so it can be unit-tested with plain Node.

export type Sport = 'swim' | 'bike' | 'run' | 'strength' | 'soccer' | 'race' | 'mobility';

export type Phase = 'foundation' | 'base' | 'build' | 'peak' | 'taper' | 'race';

export type Zone = 1 | 2 | 3 | 4 | 5;

export type SkillLevel = 'new' | 'weak' | 'okay' | 'decent' | 'strong';

export type Sex = 'male' | 'female';

export type Lifestyle = 'desk' | 'onFeet' | 'physical';

export type TrainingTime = 'morning' | 'midday' | 'evening';

/** Monday = 0 … Sunday = 6 */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface Profile {
  name: string;
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  units: 'imperial' | 'metric';
  levels: { swim: SkillLevel; bike: SkillLevel; run: SkillLevel };
  lifestyle: Lifestyle;
  playsSoccer: boolean;
  lifts: boolean;
}

export interface PlanSettings {
  /** Monday the plan starts, YYYY-MM-DD */
  startDate: string;
  /** Race day, YYYY-MM-DD */
  raceDate: string;
  raceName: string;
  /** Minutes available per weekday, Monday..Sunday. 0 = rest day. */
  availability: number[];
  /** Which day carries the long ride (the other weekend day gets the long run). */
  longRideDay: Weekday;
  soccerDays: Weekday[];
  soccerMinutes: number;
  strengthPerWeek: number;
  includeTuneUpRace: boolean;
  include703: boolean;
  trainingTime: TrainingTime;
  /** 1-based plan week numbers flagged as busy (exams, work crunch) → reduced volume. */
  busyWeeks: number[];
}

/** Physiological markers. Anything undefined falls back to an age-based estimate. */
export interface Markers {
  maxHr?: number;
  restingHr?: number;
  /** Lactate-threshold heart rate (bpm) from a 30-min run test. */
  lthr?: number;
  /** Functional threshold power (W), only if you ride with a power meter / smart trainer. */
  ftp?: number;
  /** Critical swim speed pace, seconds per 100 m. */
  cssSecPer100?: number;
  /** Measured sweat rate in mL per hour. */
  sweatRateMlPerHr?: number;
}

export interface WorkoutStep {
  label: string;
  /** Free text like "10 min", "4 × 50 m", "3 × 8 min" */
  amount: string;
  detail?: string;
  zone?: Zone;
}

export type SessionKind =
  | 'swim-technique'
  | 'swim-endurance'
  | 'swim-css'
  | 'swim-openwater'
  | 'swim-test'
  | 'bike-long'
  | 'bike-quality'
  | 'bike-easy'
  | 'bike-test'
  | 'run-long'
  | 'run-quality'
  | 'run-easy'
  | 'run-brick'
  | 'run-test'
  | 'strength'
  | 'soccer'
  | 'race'
  | 'mobility';

export interface PlannedSession {
  /** Stable id: derived from week + kind + slot so completion state survives regeneration. */
  id: string;
  week: number;
  date: string;
  weekday: Weekday;
  sport: Sport;
  kind: SessionKind;
  title: string;
  summary: string;
  minutes: number;
  /** Target distance in metres when meaningful (swims, races). */
  distanceM?: number;
  zone: Zone;
  key: boolean;
  steps: WorkoutStep[];
  /** Coach notes (fuel, form cues). */
  notes: string[];
}

export interface PlanWeek {
  week: number;
  startDate: string;
  phase: Phase;
  focus: string;
  isRecovery: boolean;
  isBusy: boolean;
  raceLabel?: string;
  sessions: PlannedSession[];
  plannedMinutes: number;
  /** Minutes the ideal week wanted but your availability could not fit. */
  unscheduledMinutes: number;
  warnings: string[];
}

export interface CompletedWorkout {
  id: string;
  sport: Sport;
  start: string; // ISO datetime
  minutes: number;
  distanceM?: number;
  kcal?: number;
  avgHr?: number;
  maxHr?: number;
  source: string; // e.g. "Apple Watch", "Connect" (Garmin)
}

export interface DailyHealth {
  date: string;
  sleepHours?: number;
  sleepDeepHours?: number;
  sleepRemHours?: number;
  restingHr?: number;
  hrvMs?: number;
  activeKcal?: number;
  steps?: number;
  vo2max?: number;
}

export interface CheckIn {
  date: string;
  /** 1 (wrecked) … 5 (great) */
  energy: number;
  /** 1 (none) … 5 (very sore) */
  soreness: number;
  /** 1 (calm) … 5 (very stressed: exams, work) */
  stress: number;
  /** 1 … 5 */
  motivation: number;
}

export interface FoodEntry {
  id: string;
  date: string;
  time: string; // ISO datetime
  name: string;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG?: number;
  source: 'photo' | 'manual' | 'quick';
  photoUri?: string;
  note?: string;
}

export interface WaterEntry {
  id: string;
  date: string;
  time: string;
  ml: number;
}
