import {
  CategoryValueSleepAnalysis,
  getMostRecentQuantitySample,
  isHealthDataAvailable,
  queryCategorySamples,
  queryQuantitySamples,
  queryStatisticsForQuantity,
  queryWorkoutSamples,
  requestAuthorization,
  saveQuantitySample,
  WorkoutActivityType,
} from '@kingstinct/react-native-healthkit';
import { Platform } from 'react-native';

import { addDays, localDateOf, todayLocal } from '@/lib/dates';
import { sumSleepHours } from '@/lib/readiness';
import type { CompletedWorkout, DailyHealth, FoodEntry, Sport } from '@/lib/types';

// Apple Health is the hub: Apple Watch writes to it natively, and Garmin Connect
// writes workouts, heart rate, sleep, steps and calories to it once you enable
// Garmin Connect → Settings → Connected Apps → Apple Health. Reading from Apple
// Health therefore covers both devices with one integration.

const READ_TYPES = [
  'HKWorkoutTypeIdentifier',
  'HKQuantityTypeIdentifierHeartRate',
  'HKQuantityTypeIdentifierRestingHeartRate',
  'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
  'HKQuantityTypeIdentifierActiveEnergyBurned',
  'HKQuantityTypeIdentifierStepCount',
  'HKQuantityTypeIdentifierVO2Max',
  'HKQuantityTypeIdentifierDistanceSwimming',
  'HKQuantityTypeIdentifierDistanceCycling',
  'HKQuantityTypeIdentifierDistanceWalkingRunning',
  'HKQuantityTypeIdentifierBodyMass',
  'HKCategoryTypeIdentifierSleepAnalysis',
] as const;

const SHARE_TYPES = [
  'HKQuantityTypeIdentifierDietaryWater',
  'HKQuantityTypeIdentifierDietaryEnergyConsumed',
  'HKQuantityTypeIdentifierDietaryProtein',
  'HKQuantityTypeIdentifierDietaryCarbohydrates',
  'HKQuantityTypeIdentifierDietaryFatTotal',
] as const;

export function healthSupported(): boolean {
  if (Platform.OS !== 'ios') return false;
  try {
    return isHealthDataAvailable();
  } catch {
    return false;
  }
}

/** Shows the iOS Health permission sheet (only the first time for each type). */
export async function connectHealth(): Promise<boolean> {
  if (!healthSupported()) return false;
  return requestAuthorization({ toRead: READ_TYPES, toShare: SHARE_TYPES });
}

const SPORT_FOR_ACTIVITY: Partial<Record<WorkoutActivityType, Sport>> = {
  [WorkoutActivityType.swimming]: 'swim',
  [WorkoutActivityType.cycling]: 'bike',
  [WorkoutActivityType.running]: 'run',
  [WorkoutActivityType.traditionalStrengthTraining]: 'strength',
  [WorkoutActivityType.functionalStrengthTraining]: 'strength',
  [WorkoutActivityType.coreTraining]: 'strength',
  [WorkoutActivityType.highIntensityIntervalTraining]: 'strength',
  [WorkoutActivityType.soccer]: 'soccer',
  [WorkoutActivityType.swimBikeRun]: 'race',
  [WorkoutActivityType.yoga]: 'mobility',
  [WorkoutActivityType.flexibility]: 'mobility',
  [WorkoutActivityType.cooldown]: 'mobility',
};

function toMinutes(q: { unit: string; quantity: number }): number {
  if (q.unit === 'min') return q.quantity;
  if (q.unit === 'hr') return q.quantity * 60;
  return q.quantity / 60; // seconds
}

function toMetres(q?: { unit: string; quantity: number }): number | undefined {
  if (!q) return undefined;
  switch (q.unit) {
    case 'km':
      return q.quantity * 1000;
    case 'mi':
      return q.quantity * 1609.344;
    case 'yd':
      return q.quantity * 0.9144;
    case 'ft':
      return q.quantity * 0.3048;
    default:
      return q.quantity;
  }
}

function toKcal(q?: { unit: string; quantity: number }): number | undefined {
  if (!q) return undefined;
  if (q.unit === 'kJ') return q.quantity / 4.184;
  if (q.unit === 'Cal') return q.quantity;
  return q.quantity;
}

/** Workouts since a date, from every source (Apple Watch, Garmin Connect, Strava…). */
export async function fetchWorkouts(sinceDays = 60): Promise<CompletedWorkout[]> {
  if (!healthSupported()) return [];
  const startDate = new Date(Date.now() - sinceDays * 86_400_000);
  const proxies = await queryWorkoutSamples({ limit: 0, ascending: false, filter: { date: { startDate } } });
  const out: CompletedWorkout[] = [];
  for (const w of proxies) {
    const sport = SPORT_FOR_ACTIVITY[w.workoutActivityType];
    if (!sport) {
      w.dispose?.();
      continue;
    }
    let avgHr: number | undefined;
    let maxHr: number | undefined;
    try {
      const stat = await w.getStatistic('HKQuantityTypeIdentifierHeartRate', 'count/min');
      avgHr = stat?.averageQuantity?.quantity;
      maxHr = stat?.maximumQuantity?.quantity;
    } catch {
      // Some sources (e.g. Garmin) don't attach HR samples to the workout object.
    }
    if (avgHr === undefined) {
      // Fall back to all heart-rate samples recorded during the workout window.
      try {
        const stat = await queryStatisticsForQuantity(
          'HKQuantityTypeIdentifierHeartRate',
          ['discreteAverage', 'discreteMax'],
          { filter: { date: { startDate: w.startDate, endDate: w.endDate } }, unit: 'count/min' },
        );
        avgHr = stat.averageQuantity?.quantity;
        maxHr = stat.maximumQuantity?.quantity;
      } catch {
        // no HR for this workout
      }
    }
    out.push({
      id: w.uuid,
      sport,
      start: w.startDate.toISOString(),
      minutes: Math.round(toMinutes(w.duration)),
      distanceM: toMetres(w.totalDistance),
      kcal: toKcal(w.totalEnergyBurned) !== undefined ? Math.round(toKcal(w.totalEnergyBurned)!) : undefined,
      avgHr: avgHr ? Math.round(avgHr) : undefined,
      maxHr: maxHr ? Math.round(maxHr) : undefined,
      source: w.sourceRevision?.source?.name ?? 'Apple Health',
    });
    w.dispose?.();
  }
  return out;
}

const ASLEEP = [
  CategoryValueSleepAnalysis.asleepUnspecified,
  CategoryValueSleepAnalysis.asleepCore,
  CategoryValueSleepAnalysis.asleepDeep,
  CategoryValueSleepAnalysis.asleepREM,
];

/** A night belongs to the morning you wake up: anything ending before 6 PM counts for that day. */
function nightKey(end: Date): string {
  const d = localDateOf(end);
  return end.getHours() >= 18 ? addDays(d, 1) : d;
}

/** Per-day sleep, resting HR, HRV, plus today's active energy & steps. */
export async function fetchDailyHealth(days = 45): Promise<DailyHealth[]> {
  if (!healthSupported()) return [];
  const startDate = new Date(Date.now() - days * 86_400_000);
  const byDate = new Map<string, DailyHealth>();
  const get = (date: string) => {
    let d = byDate.get(date);
    if (!d) {
      d = { date };
      byDate.set(date, d);
    }
    return d;
  };

  const [rhr, hrv, sleep] = await Promise.all([
    queryQuantitySamples('HKQuantityTypeIdentifierRestingHeartRate', {
      limit: 0,
      unit: 'count/min',
      filter: { date: { startDate } },
    }).catch(() => []),
    queryQuantitySamples('HKQuantityTypeIdentifierHeartRateVariabilitySDNN', {
      limit: 0,
      unit: 'ms',
      filter: { date: { startDate } },
    }).catch(() => []),
    queryCategorySamples('HKCategoryTypeIdentifierSleepAnalysis', {
      limit: 0,
      filter: { date: { startDate } },
    }).catch(() => []),
  ]);

  for (const s of rhr) get(localDateOf(s.startDate)).restingHr = Math.round(s.quantity);

  const hrvByDay = new Map<string, number[]>();
  for (const s of hrv) {
    const k = localDateOf(s.startDate);
    hrvByDay.set(k, [...(hrvByDay.get(k) ?? []), s.quantity]);
  }
  for (const [k, vals] of hrvByDay) get(k).hrvMs = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);

  const nights = new Map<string, { value: number; startDate: Date; endDate: Date }[]>();
  for (const s of sleep) {
    const k = nightKey(s.endDate);
    nights.set(k, [...(nights.get(k) ?? []), { value: s.value as number, startDate: s.startDate, endDate: s.endDate }]);
  }
  for (const [k, samples] of nights) {
    const d = get(k);
    d.sleepHours = sumSleepHours(samples, ASLEEP);
    d.sleepDeepHours = sumSleepHours(samples, [CategoryValueSleepAnalysis.asleepDeep]);
    d.sleepRemHours = sumSleepHours(samples, [CategoryValueSleepAnalysis.asleepREM]);
  }

  // Today's totals
  const today = todayLocal();
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);
  const [energy, steps, vo2] = await Promise.all([
    queryStatisticsForQuantity('HKQuantityTypeIdentifierActiveEnergyBurned', ['cumulativeSum'], {
      filter: { date: { startDate: midnight } },
      unit: 'kcal',
    }).catch(() => undefined),
    queryStatisticsForQuantity('HKQuantityTypeIdentifierStepCount', ['cumulativeSum'], {
      filter: { date: { startDate: midnight } },
      unit: 'count',
    }).catch(() => undefined),
    getMostRecentQuantitySample('HKQuantityTypeIdentifierVO2Max').catch(() => undefined),
  ]);
  const t = get(today);
  if (energy?.sumQuantity) t.activeKcal = Math.round(energy.sumQuantity.quantity);
  if (steps?.sumQuantity) t.steps = Math.round(steps.sumQuantity.quantity);
  if (vo2) t.vo2max = Math.round(vo2.quantity * 10) / 10;

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** Most recent body weight in kg, if any scale or app writes it. */
export async function fetchLatestWeightKg(): Promise<number | undefined> {
  if (!healthSupported()) return undefined;
  const s = await getMostRecentQuantitySample('HKQuantityTypeIdentifierBodyMass', 'kg').catch(() => undefined);
  return s ? Math.round(s.quantity * 10) / 10 : undefined;
}

export async function saveWater(ml: number, at = new Date()): Promise<void> {
  if (!healthSupported()) return;
  await saveQuantitySample('HKQuantityTypeIdentifierDietaryWater', 'mL', ml, at, at).catch(() => undefined);
}

export async function saveFood(entry: FoodEntry): Promise<void> {
  if (!healthSupported()) return;
  const at = new Date(entry.time);
  await Promise.all([
    saveQuantitySample('HKQuantityTypeIdentifierDietaryEnergyConsumed', 'kcal', entry.kcal, at, at),
    saveQuantitySample('HKQuantityTypeIdentifierDietaryProtein', 'g', entry.proteinG, at, at),
    saveQuantitySample('HKQuantityTypeIdentifierDietaryCarbohydrates', 'g', entry.carbsG, at, at),
    saveQuantitySample('HKQuantityTypeIdentifierDietaryFatTotal', 'g', entry.fatG, at, at),
  ]).catch(() => undefined);
}
