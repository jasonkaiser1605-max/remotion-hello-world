import { addDays } from './dates';
import type { CompletedWorkout, DailyHealth, PlannedSession } from './types';

/** Deterministic pseudo-random so demo data is stable between reloads. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/**
 * Sample data used only for the web preview / screenshots, where Apple Health
 * doesn't exist. It mimics a mix of Garmin and Apple Watch sources.
 */
export function demoData(today: string, sessions: PlannedSession[]) {
  const r = rng(42);
  const daily: DailyHealth[] = [];
  for (let i = 40; i >= 0; i--) {
    const date = addDays(today, -i);
    daily.push({
      date,
      sleepHours: Math.round((6.4 + r() * 2.2) * 100) / 100,
      sleepDeepHours: Math.round((0.9 + r() * 0.6) * 100) / 100,
      sleepRemHours: Math.round((1.3 + r() * 0.7) * 100) / 100,
      restingHr: Math.round(50 + r() * 6),
      hrvMs: Math.round(62 + r() * 18),
      activeKcal: i === 0 ? 420 : undefined,
      steps: i === 0 ? 7300 : undefined,
      vo2max: i === 0 ? 52.4 : undefined,
    });
  }
  // Slightly rough last night, to show the readiness logic.
  daily[daily.length - 1].sleepHours = 6.6;
  daily[daily.length - 1].hrvMs = 64;

  const workouts: CompletedWorkout[] = [];
  const past = sessions.filter((s) => s.date < today && s.sport !== 'race');
  past.forEach((s, i) => {
    if (r() < 0.12) return; // missed a few, like real life
    const hour = s.weekday >= 5 ? 9 : 18;
    workouts.push({
      id: `demo-${i}`,
      sport: s.sport,
      start: `${s.date}T${String(hour).padStart(2, '0')}:00:00`,
      minutes: Math.round(s.minutes * (0.9 + r() * 0.2)),
      distanceM:
        s.sport === 'swim'
          ? s.distanceM
          : s.sport === 'bike'
            ? Math.round(s.minutes * 470)
            : s.sport === 'run'
              ? Math.round(s.minutes * 165)
              : undefined,
      kcal: Math.round(s.minutes * (s.sport === 'run' ? 11 : s.sport === 'bike' ? 8.5 : 7.5)),
      avgHr: s.sport === 'strength' ? 112 : Math.round(132 + r() * 18),
      maxHr: Math.round(160 + r() * 20),
      source: i % 3 === 0 ? 'Apple Watch' : 'Connect',
    });
  });
  // Pre-2-week history so fitness isn't zero
  for (let i = 15; i <= 40; i++) {
    if (i % 2 === 0) continue;
    workouts.push({
      id: `demo-h${i}`,
      sport: i % 3 === 0 ? 'bike' : i % 3 === 1 ? 'run' : 'soccer',
      start: `${addDays(today, -i)}T17:30:00`,
      minutes: 50 + Math.round(r() * 30),
      avgHr: Math.round(138 + r() * 15),
      source: 'Connect',
    });
  }
  return { daily, workouts };
}
