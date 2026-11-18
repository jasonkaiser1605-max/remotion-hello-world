import { addDays, localDateOf } from './dates';
import type { CompletedWorkout, Sport, Zone } from './types';

// Training Stress Score–style load. 100 ≈ one hour at threshold.

const ZONE_IF: Record<Zone, number> = { 1: 0.55, 2: 0.7, 3: 0.82, 4: 0.95, 5: 1.05 };

/** Load for a workout from average HR relative to LTHR (hrTSS approximation). */
export function hrLoad(minutes: number, avgHr: number, lthr: number): number {
  const intensity = Math.min(1.15, Math.max(0.4, avgHr / lthr));
  return Math.round((minutes / 60) * intensity * intensity * 100);
}

export function zoneLoad(minutes: number, zone: Zone): number {
  const i = ZONE_IF[zone];
  return Math.round((minutes / 60) * i * i * 100);
}

const DEFAULT_ZONE: Record<Sport, Zone> = {
  swim: 2,
  bike: 2,
  run: 2,
  strength: 3,
  soccer: 4,
  mobility: 1,
  race: 3,
};

export function workoutLoad(w: CompletedWorkout, lthr: number): number {
  if (w.sport === 'strength') return Math.round((w.minutes / 60) * 45);
  if (w.avgHr && w.avgHr > 60) return hrLoad(w.minutes, w.avgHr, lthr);
  return zoneLoad(w.minutes, DEFAULT_ZONE[w.sport]);
}

export interface LoadPoint {
  date: string;
  load: number;
  /** Fitness: 42-day exponentially weighted average */
  ctl: number;
  /** Fatigue: 7-day exponentially weighted average */
  atl: number;
  /** Form: fitness − fatigue (yesterday's values, as is conventional) */
  tsb: number;
}

export function loadSeries(
  workouts: CompletedWorkout[],
  lthr: number,
  endDate: string,
  days = 90,
): LoadPoint[] {
  const byDay = new Map<string, number>();
  for (const w of workouts) {
    const d = localDateOf(w.start);
    byDay.set(d, (byDay.get(d) ?? 0) + workoutLoad(w, lthr));
  }
  const kCtl = 1 - Math.exp(-1 / 42);
  const kAtl = 1 - Math.exp(-1 / 7);
  let ctl = 0;
  let atl = 0;
  const out: LoadPoint[] = [];
  const start = addDays(endDate, -(days - 1));
  for (let i = 0; i < days; i++) {
    const date = addDays(start, i);
    const load = byDay.get(date) ?? 0;
    const tsb = ctl - atl;
    ctl = ctl + kCtl * (load - ctl);
    atl = atl + kAtl * (load - atl);
    out.push({ date, load, ctl: Math.round(ctl * 10) / 10, atl: Math.round(atl * 10) / 10, tsb: Math.round(tsb * 10) / 10 });
  }
  return out;
}

/**
 * Ramp rate: change in fitness over the last 7 days. Above ~5–7 points/week the risk of
 * injury and illness climbs, especially for newer athletes.
 */
export function rampRate(series: LoadPoint[]): number {
  if (series.length < 8) return 0;
  const now = series[series.length - 1].ctl;
  const weekAgo = series[series.length - 8].ctl;
  return Math.round((now - weekAgo) * 10) / 10;
}
